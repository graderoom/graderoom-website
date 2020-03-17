let server = require("./graderoom.js");
let authenticator = require("./authenticator.js");

module.exports = function (app, passport) {

    // normal routes ===============================================================

    // show the home page (will also have our login links)
    app.get("/", (req, res) => {

        if (req.isAuthenticated()) {

            authenticator.bringUpToDate(req.user.username);
            let user = authenticator.getUser(req.user.username);
            let gradeDat = JSON.stringify(user.grades);
            let weightData = JSON.stringify(user.weights);

            res.render("authorized_index.ejs", {
                user: req.user,
                current: "home",
                userRef: JSON.stringify(user),
                schoolUsername: req.user.schoolUsername,
                gradeData: gradeDat,
                weightData: weightData
            });
            return;
        }
        res.render("index.ejs", {
            message: req.flash("loginMessage")
        });
    });

    app.get("/viewuser", [isAdmin], (req, res) => {
        if (req.query.usernameToRender) {
            let user = authenticator.getUser(req.query.usernameToRender);
            let weightData = JSON.stringify(user.weights);
            let gradeData = JSON.stringify(user.grades);

            res.render("authorized_index.ejs", {
                user: user, current: "home", userRef: JSON.stringify(user), schoolUsername: user.schoolUsername,
                gradeData: gradeData,
                weightData: weightData,
                updateGradesMessageSuccess: req.flash("updateGradesMessageSuccess"),
                updateGradesMessageFail: req.flash("updateGradesMessageFail"),
                settingsChangeMessageSuccess: req.flash("settingsChangeMessageSuccess"),
                settingsChangeMessageFail: req.flash("settingsChangeMessageFail")
            });
            return;
        }
        res.redirect("/");
    });

    app.get("/logout", [isLoggedIn], (req, res) => {
        req.logout();
        res.redirect("/");
    });

    app.post("/bringAllUpToDate", [isAdmin], (req, res) => {
        authenticator.bringAllUpToDate();
        req.flash("adminSuccessMessage", "Brought all users up to date");
        res.redirect("/admin");
    });

    app.post("/deleteUser", [isAdmin], (req, res) => {
        let username = req.body.deleteUser;
        console.log("Got request to delete: " + username);

        let resp = authenticator.deleteUser(username);
        console.log(resp);
        if (resp.success) {
            req.flash("adminSuccessMessage", resp.message);
        } else {
            req.flash("adminFailMessage", resp.message);
        }

        res.redirect("/admin");
    });

    app.post("/makeadmin", [isAdmin], (req, res) => {
        let username = req.body.newAdminUser;
        console.log("Got request to make admin: " + username);

        let resp = authenticator.makeAdmin(username);
        console.log(resp);
        if (resp.success) {
            req.flash("adminSuccessMessage", resp.message);
        } else {
            req.flash("adminFailMessage", resp.message);
        }

        res.redirect("/admin");
    });

    app.post("/removeadmin", [isAdmin], (req, res) => {
        let username = req.body.removeAdminUser;
        console.log("Got request to remove admin: " + username);

        let resp = authenticator.removeAdmin(username);
        console.log(resp);
        if (resp.success) {
            req.flash("adminSuccessMessage", resp.message);
        } else {
            req.flash("adminFailMessage", resp.message);
        }

        res.redirect("/admin");
    });

    app.get("/admin", [isAdmin], (req, res) => {
        // admin panel TODO
        let allUsers = authenticator.getAllUsers();
        res.render("admin.ejs", {
            user: req.user,
            page: "admin",
            userList: allUsers,
            adminSuccessMessage: req.flash("adminSuccessMessage"),
            adminFailMessage: req.flash("adminFailMessage")
        });
    });

    app.get("/update", [isLoggedIn], (req, res) => {

        //todo rate limits
        //todo use axios to contact python api and update data.

        res.redirect("/");
    });

    app.get("/checkUpdateBackground", [isLoggedIn], (req, res) => {
        let resp = authenticator.checkUpdateBackground(req.user.username);
        res.status(200).send(resp.message);
    });

    app.get("/changelog", [isLoggedIn], async (req, res) => {
        await authenticator.readChangelog(server.needsBetaKeyToSignUp, result => {
            res.status(200).send(result);
        });
    });

    app.post("/updateAppearance", [isLoggedIn], (req, res) => {
        let resp = authenticator.setTheme(req.user.username, req.body.theme, req.body.darkModeStart, req.body.darkModeStartAmPm, req.body.darkModeFinish, req.body.darkModeFinishAmPm);
        if (resp.success) {
            res.status(200).send(resp.message);
        } else {
            res.status(400).send(resp.message);
        }
    });

    app.post("/updateGradeSync", [isLoggedIn], (req, res) => {
        let gradeSync;
        gradeSync = req.body.gradeSync === "on";
        if (!gradeSync) {
            authenticator.disableGradeSync(req.user.username);
        }
        let autoRefresh;
        autoRefresh = req.body.autoRefresh === "on";
        if (autoRefresh !== null) {
            authenticator.setAutoRefresh(req.user.username, autoRefresh);
        }
        res.redirect("/");
    });

    app.post("/changepassword", [isLoggedIn], async (req, res) => {

        let old_pass = req.body.oldPass;
        let new_pass = req.body.password;
        let resp = await authenticator.changePassword(req.user.username, old_pass, new_pass);
        if (resp.success) {
            res.status(200).send(resp.message);
        } else {
            res.status(400).send(resp.message);
        }
    });

    app.post("/changeschoolemail", [isLoggedIn], (req, res) => {

        let new_school_email = req.body.school_email;
        let resp = authenticator.changeSchoolEmail(req.user.username, new_school_email);
        if (resp.success) {
            res.status(200).send(resp.message);
        } else {
            res.status(400).send(resp.message);
        }
    });

    // process the login form
    app.post("/login", passport.authenticate("local-login", {
        successRedirect: "/", // redirect to the secure profile section
        failureRedirect: "/", // redirect back to the signup page if there is an error
        failureFlash: true // allow flash messages
    }));

    // SIGNUP =================================
    // show the signup form
    app.get("/signup", (req, res) => {
        res.render("signup.ejs", {
            message: req.flash("signupMessage"), needsBeta: server.needsBetaKeyToSignUp
        });
    });

    // app.post('/signup', isAdmin, passport.authenticate('local-signup', {
    //     successRedirect : '/', // redirect to the secure profile section
    //     failureRedirect : '/signup', // redirect back to the signup page if there is an error
    //     failureFlash : true // allow flash messages
    // }));

    app.post("/signup", async (req, res, next) => {

        let username = req.body.username;
        let password = req.body.password;
        let s_email = req.body.school_email;

        console.log("Trying to create user: " + username);

        //check if can create here (i.e. username not in use)

        let resp;
        if (server.needsBetaKeyToSignUp) {

            let bk = req.body.beta_key;
            resp = await authenticator.betaAddNewUser(bk, username, password, s_email, false);
            console.log("beta: " + resp);

        } else {

            resp = await authenticator.addNewUser(username, password, s_email, false);
            console.log("nonbeta: " + resp);

        }

        if (!resp.success) {
            req.flash("signupMessage", resp.message);
            res.redirect("/signup");
        } else {
            passport.authenticate("local-login", {
                successRedirect: "/", // redirect to the secure profile section
                failureRedirect: "/signup", // redirect back to the signup page if there is an error
                failureFlash: false // Don't want to flash messages to login page when using signup
                                    // page
            })(req, res, next); // this was hard :(
        }
    });

    app.post("/update", [isLoggedIn], async (req, res) => {

        let gradeSync = req.body.savePassword === "on";
        let pass = req.body.school_password;
        let user = req.user.username;
        let userPass = req.body.user_password;
        if (userPass) {
            if (!gradeSync) {
                let resp = authenticator.decryptAndGet(user, userPass);
                if (resp.success) {
                    pass = resp.message;
                } else {
                    res.status(400).send(resp.message);
                    return;
                }
            }
        }
        let resp = await authenticator.updateGrades(req.user.username, pass);
        if (resp.success) {
            if (gradeSync) {
                let encryptResp = authenticator.encryptAndStore(user, pass, userPass);
                if (!encryptResp.success) {
                    res.status(400).send(encryptResp.message);
                    return;
                }
                res.status(200).send("GradeSync Enabled. " + resp.message);
            } else {
                res.status(200).send(resp.message);
            }
        } else {
            res.status(400).send(resp.message);
        }

    });

    //must be called via client side ajax+js
    app.post("/updateweights", [isLoggedIn], async (req, res) => {
        console.log(req.body);
        let className = req.body.className;
        let hasWeights = req.body.hasWeights;
        let newWeights = JSON.parse(req.body.newWeights);

        let resp = authenticator.updateWeightsForClass(req.user.username, className, hasWeights, newWeights);
        if (resp.success) {
            res.status(200).send(resp.message);
        } else {
            res.status(400).send(resp.message);
        }
    });

    app.post("/updateclassweights", [isAdmin], (req, res) => {
        authenticator.updateWeightsInClassDb(req.body);
        res.status(200).send("Updated weights for " + req.body.className + " | " + req.body.teacherName);
    });

    app.post("/changealertsettings", [isLoggedIn], (req, res) => {
        let resp = authenticator.updateAlerts(req.user.username, req.body.updateGradesReminder, req.body.showChangelog);
        if (resp.success) {
            res.status(200).send(resp.message);
        } else {
            res.status(400).send(resp.message);
        }
    });

    app.post("/changelogseen", [isLoggedIn], (req, res) => {
        authenticator.changelogSeen(req.user.username);
        res.sendStatus(200);
    });

    app.post("/randomizeclasscolors", [isLoggedIn], (req, res) => {
        let resp = authenticator.setRandomClassColor(req.user.username, req.body.index);
        if (resp.success) {
            res.status(200).send(resp.message);
        } else {
            res.status(400).send(resp.message);
        }
    });

    app.get("/finalgradecalculator", (req, res) => {

        if (req.isAuthenticated()) {
            res.render("final_grade_calculator.ejs", {
                current: "calc",
                calculatorSuccessMessage: req.flash("calculatorSuccessMessage"),
                calculatorFailMessage: req.flash("calculatorFailMessage"),
                user: req.user,
                gradeData: JSON.stringify(req.user.grades),
                userRef: JSON.stringify(req.user),
                schoolUsername: req.user.schoolUsername
            });
        } else {
            res.render("final_grade_calculator_logged_out.ejs", {
                calculatorSuccessMessage: req.flash("calculatorSuccessMessage"),
                calculatorFailMessage: req.flash("calculatorFailMessage")
            });
        }

    });

    app.post("/calculate", [isLoggedIn], (req, res) => {
        let resp = authenticator.calculate(req.user.username, req.body.currentGrade, req.body.classIndex, req.body.categoryName, req.body.categoryWeight, req.body.goal);
        if (resp.success) {
            res.status(200).send(resp.message);
        } else {
            res.status(400).send(resp.message);
        }
    });

    app.get("/betakeys", [isAdmin], (req, res) => {

        res.render("betakeys.ejs", {
            betaKeyData: authenticator.getAllBetaKeyData(),
            betaKeySuccessMessage: req.flash("betaKeySuccessMessage"),
            betaKeyFailMessage: req.flash("betaKeyFailMessage"),
            user: req.user,
            page: "keys"
        });

    });

    app.post("/newbetakey", [isAdmin], (req, res) => {

        // let bk = req.body.beta_key;
        let bk = makeKey(7);
        let resp = authenticator.addNewBetaKey(bk);

        if (resp.success) {
            req.flash("betaKeySuccessMessage", resp.message);
        } else {
            req.flash("betaKeyFailMessage", resp.message);
        }

        res.redirect("/betakeys");

    });

    app.post("/deletebetakey", [isAdmin], (req, res) => {

        let bk = req.body.beta_key;
        let resp = authenticator.removeBetaKey(bk);

        if (resp.success) {
            req.flash("betaKeySuccessMessage", resp.message);
        } else {
            req.flash("betaKeyFailMessage", resp.message);
        }

        res.redirect("/betakeys");

    });

    app.get("/classes", [isAdmin], (req, res) => {
        res.render("classes.ejs", {
            user: req.user, page: "classes", classData: authenticator.getAllClassData()
        });
    });

    /**
     * END GENERAL USER MANAGEMENT
     */

    // general web app
    app.get("/*", (req, res) => {
        res.redirect("/");
    });

    // route middleware to ensure user is logged in
    function isLoggedIn(req, res, next) {
        if (req.isAuthenticated()) {
            return next();
        }

        res.redirect("/");
    }

    function isAdmin(req, res, next) {
        if (req.isAuthenticated() && req.user.isAdmin) {
            return next();
        }
        res.redirect("/");
    }
};


function makeKey(length) {
    let result = "";
    let characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}
