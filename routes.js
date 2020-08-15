let server = require("./graderoom.js");
let authenticator = require("./authenticator.js");
let emailSender = require('./emailSender.js');

module.exports = function (app, passport) {

    // normal routes ===============================================================

    // show the home page (will also have our login links)
    app.get("/", (req, res) => {

        if (req.isAuthenticated()) {

            let returnTo = req.session.returnTo;
            delete req.session.returnTo;
            if (returnTo) {
                res.redirect(returnTo);
                return;
            }
            authenticator.bringUpToDate(req.user.username);

            let {term, semester} = authenticator.getMostRecentTermData(req.user.username);
            if (term && semester) {
                res.render("authorized_index.ejs", {
                    page: "home",
                    username: req.user.username,
                    schoolUsername: req.user.schoolUsername,
                    isAdmin: req.user.isAdmin,
                    personalInfo: JSON.stringify(req.user.personalInfo),
                    appearance: JSON.stringify(req.user.appearance),
                    alerts: JSON.stringify(req.user.alerts),
                    gradeSync: !!req.user.schoolPassword,
                    gradeData: JSON.stringify(req.user.grades[term][semester]),
                    weightData: JSON.stringify(req.user.weights[term][semester]),
                    addedAssignments: JSON.stringify(req.user.addedAssignments[term][semester]),
                    relevantClassData: JSON.stringify(authenticator.getRelClassData(req.user.username)),
                    sortingData: JSON.stringify(req.user.sortingData),
                    sessionTimeout: Date.parse(req.session.cookie._expires),
                    dst: isDST(),
                });
            } else {
                res.render("authorized_index.ejs", {
                    page: "home",
                    username: req.user.username,
                    schoolUsername: req.user.schoolUsername,
                    isAdmin: req.user.isAdmin,
                    personalInfo: JSON.stringify(req.user.personalInfo),
                    appearance: JSON.stringify(req.user.appearance),
                    alerts: JSON.stringify(req.user.alerts),
                    gradeSync: !!req.user.schoolPassword,
                    gradeData: JSON.stringify([]),
                    weightData: JSON.stringify({}),
                    addedAssignments: JSON.stringify({}),
                    relevantClassData: JSON.stringify({}),
                    sortingData: JSON.stringify(req.user.sortingData),
                    sessionTimeout: Date.parse(req.session.cookie._expires),
                    dst: isDST(),
                });
            }
            return;
        }
        res.render("index.ejs", {
            message: req.flash("loginMessage"),
            dst: isDST(),
        });
    });

    app.post("/setShowNonAcademic", [isLoggedIn], (req, res) => {
        let show = req.body.showNonAcademic === "on";
        authenticator.setNonAcademic(req.user.username, show);
        res.status(200).send("Non-academic classes will be " + (show ? "shown" : "hidden"));
    });

    app.get("/viewuser", [isAdmin], (req, res) => {
        if (req.query.usernameToRender) {
            let user = authenticator.getUser(req.query.usernameToRender);
            if (user.alerts.remoteAccess === "denied") {
                res.redirect("/");
                return;
            }
            let {term, semester} = authenticator.getMostRecentTermData(req.query.usernameToRender);

            if (term && semester) {
                res.render("authorized_index.ejs", {
                    page: "home",
                    username: user.username,
                    schoolUsername: user.schoolUsername,
                    isAdmin: user.isAdmin,
                    personalInfo: JSON.stringify(user.personalInfo),
                    appearance: JSON.stringify(user.appearance),
                    alerts: JSON.stringify(user.alerts),
                    gradeSync: !!user.schoolPassword,
                    gradeData: JSON.stringify(user.grades[term][semester]),
                    weightData: JSON.stringify(user.weights[term][semester]),
                    addedAssignments: JSON.stringify(req.user.addedAssignments[term][semester]),
                    relevantClassData: JSON.stringify(authenticator.getRelClassData(req.query.usernameToRender)),
                    sortingData: JSON.stringify(user.sortingData),
                    sessionTimeout: Date.parse(req.session.cookie._expires),
                    dst: isDST(),
                });
            } else {
                res.render("authorized_index.ejs", {
                    page: "home",
                    username: req.user.username,
                    schoolUsername: req.user.schoolUsername,
                    isAdmin: req.user.isAdmin,
                    personalInfo: JSON.stringify(req.user.personalInfo),
                    appearance: JSON.stringify(req.user.appearance),
                    alerts: JSON.stringify(req.user.alerts),
                    gradeSync: !!req.user.schoolPassword,
                    gradeData: JSON.stringify([]),
                    weightData: JSON.stringify({}),
                    addedAssignments: JSON.stringify({}),
                    relevantClassData: JSON.stringify({}),
                    sortingData: JSON.stringify(req.user.sortingData),
                    sessionTimeout: Date.parse(req.session.cookie._expires),
                    dst: isDST(),
                });
            }
            return;
        }
        res.redirect("/");
    });

    app.get("/logout", [isLoggedIn], (req, res) => {
        req.logout();
        res.redirect("/");
    });

    app.post("/bringAllUpToDate", [isAdmin], (req, res) => {
        authenticator.updateAllDB();
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

    app.post("/restoreUser", [isAdmin], (req, res) => {
        let username = req.body.restoreUser;
        let resp = authenticator.restoreUser(username);
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
        let deletedUsers = authenticator.getDeletedUsers();
        res.render("admin.ejs", {
            user: req.user,
            theme: JSON.stringify(authenticator.getUser(req.user.username).appearance.theme),
            darkModeStart: JSON.stringify(authenticator.getUser(req.user.username).appearance.darkModeStart),
            darkModeFinish: JSON.stringify(authenticator.getUser(req.user.username).appearance.darkModeFinish),
            page: "admin",
            userList: allUsers,
            deletedUserList: deletedUsers,
            adminSuccessMessage: req.flash("adminSuccessMessage"),
            adminFailMessage: req.flash("adminFailMessage"),
            sessionTimeout: Date.parse(req.session.cookie._expires),
            dst: isDST(),
        });
    });

    app.get("/update", [isLoggedIn], (req, res) => {

        //todo rate limits
        //todo use axios to contact python api and update data.

        res.redirect("/");
    });

    app.get("/checkUpdateBackground", [isLoggedIn], (req, res) => {
        let resp = authenticator.checkUpdateBackground(req.user.username);
        let user = authenticator.getUser(req.user.username);
        res.status(200).send({
                                 message: resp.message,
                                 grades: JSON.stringify(user.grades),
                                 time: user.alerts.lastUpdated.slice(-1)[0]
                             });
    });

    app.get("/changelog", [isLoggedIn], async (req, res) => {
        let result = authenticator.changelog(server.needsBetaKeyToSignUp);
        res.status(200).send(result);
    });

    app.post("/updateAppearance", [isLoggedIn], (req, res) => {
        let resp = authenticator.setTheme(req.user.username, req.body.theme, req.body.darkModeStart, req.body.darkModeStartAmPm, req.body.darkModeFinish, req.body.darkModeFinishAmPm);
        if (resp.success) {
            res.status(200).send(resp.message);
        } else {
            res.status(400).send(resp.message);
        }
    });

    app.post("/updateTutorialStatus", [isLoggedIn], (req, res) => {
        let resp = authenticator.updateTutorial(req.user.username, req.body.action);
        if (resp.success) {
            res.status(200).send(JSON.stringify(resp.message));
        } else {
            res.sendStatus(400);
        }
    });

    app.post("/resetTutorial", [isLoggedIn], (req, res) => {
        res.status(200).send(JSON.stringify(authenticator.resetTutorial(req.user.username)));
    });

    app.post("/acceptPrivacyPolicy", [isLoggedIn], (req, res) => {
        authenticator.acceptPrivacyPolicy(req.user.username);
        res.redirect("/");
    });

    app.post("/acceptTerms", [isLoggedIn], (req, res) => {
        authenticator.acceptTerms(req.user.username);
        res.redirect("/");
    });

    app.post("/disableGradeSync", [isLoggedIn], (req, res) => {
        try {
            authenticator.disableGradeSync(req.user.username);
            res.sendStatus(200);
        } catch {
            res.sendStatus(400);
        }
    });

    app.post("/changepassword", [isLoggedIn], async (req, res) => {

        console.table(req.body);
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

    app.post("/updateAddedAssignments", [isLoggedIn], (req, res) => {
        let data = req.body.data;
        let resp = authenticator.updateAddedAssignments(req.user.username, JSON.parse(data));
        if (resp.success) {
            res.status(200).send(resp.message);
        } else {
            res.status(400).send(resp.messgae);
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
            message: req.flash("signupMessage"),
            needsBeta: server.needsBetaKeyToSignUp,
            dst: isDST(),
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
            } else {
                let resp = authenticator.login(user, userPass);
                if (!resp.success) {
                    res.status(400).send(resp.message);
                    return;
                }
            }
        }
        let resp = await authenticator.updateGrades(req.user.username, pass);
        if (resp.success || resp.message === "No class data." || resp.message === "Error scraping grades.") {
            if (gradeSync) {
                let encryptResp = authenticator.encryptAndStore(user, pass, userPass);
                if (!encryptResp.success) {
                    res.status(400).send(encryptResp.message);
                    return;
                }
                res.status(200).send({
                                         message: "GradeSync Enabled. " + resp.message,
                                         grades: resp.grades,
                                         time: resp.time
                                     });
            } else {
                res.status(200).send({message: resp.message, grades: resp.grades, time: resp.time});
            }
        } else {
            res.status(400).send(resp.message);
        }

        // Grade history
        //TODO
        // let scrapeGradeHistory = req.body.scrape_grade_history === "on";
        // if (scrapeGradeHistory || true) {
        //     let resp = await authenticator.updateGradeHistory(req.user.username, pass);
        // }

    });

    //must be called via client side ajax+js
    app.post("/updateweights", [isLoggedIn], async (req, res) => {
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
        let className = req.body.className;
        let teacherName = req.body.teacherName;
        let hasWeights = req.body.hasWeights;
        let weights = req.body.weights;
        let resp = authenticator.updateWeightsInClassDb(className, teacherName, hasWeights, weights);
        if (resp.success) {
            res.status(200).send(resp);
        } else {
            res.status(400).send(resp);
        }
    });

    app.post("/updateclasstype", [isAdmin], (req, res) => {
        let resp = authenticator.updateClassTypeInClassDb(req.body.className, req.body.classType);
        if (resp.success) {
            res.status(200).send(resp);
        } else {
            res.status(400).send(resp);
        }
    });

    app.post("/setColorPalette", [isLoggedIn], (req, res) => {
        let resp = authenticator.setColorPalette(req.user.username, req.body.preset);
        if (resp.success) {
            res.status(200).send(resp.message);
        } else {
            res.status(400).send(resp.message);
        }
    });

    app.get("/finalgradecalculator", (req, res) => {

        let {term, semester} = authenticator.getMostRecentTermData(req.user.username);
        if (req.isAuthenticated()) {
            res.render("final_grade_calculator.ejs", {
                page: "calc",
                username: req.user.username,
                schoolUsername: req.user.schoolUsername,
                isAdmin: req.user.isAdmin,
                personalInfo: JSON.stringify(req.user.personalInfo),
                appearance: JSON.stringify(req.user.appearance),
                alerts: JSON.stringify(req.user.alerts),
                gradeSync: !!req.user.schoolPassword,
                gradeData: JSON.stringify(req.user.grades[term][semester]),
                weightData: JSON.stringify(req.user.weights[term][semester]),
                sessionTimeout: Date.parse(req.session.cookie._expires),
                dst: isDST(),
            });
        } else {
            req.session.returnTo = req.originalUrl;
            res.render("final_grade_calculator_logged_out.ejs", {
                dst: isDST(),
            });
        }

    });

    app.post("/setRemoteAccess", [isLoggedIn], (req, res) => {
        let allowed = req.body.remoteAccess === "on" ? "allowed" : "denied";
        authenticator.setRemoteAccess(req.user.username, allowed);
        res.status(200).send(allowed.substring(0, 1).toUpperCase() + allowed.substring(1) + " remote access.");
    });

    app.post("/setFirstName", [isLoggedIn], (req, res) => {
        let resp = authenticator.setFirstName(req.user.username, req.body.firstName);
        res.status(resp.success ? 200 : 400).send(resp.message);
    });

    app.get("/betakeys", [isAdmin], (req, res) => {

        res.render("betakeys.ejs", {
            betaKeyData: authenticator.getAllBetaKeyData(),
            betaKeySuccessMessage: req.flash("betaKeySuccessMessage"),
            betaKeyFailMessage: req.flash("betaKeyFailMessage"),
            user: req.user,
            theme: JSON.stringify(authenticator.getUser(req.user.username).appearance.theme),
            darkModeStart: JSON.stringify(authenticator.getUser(req.user.username).appearance.darkModeStart),
            darkModeFinish: JSON.stringify(authenticator.getUser(req.user.username).appearance.darkModeFinish),
            page: "keys",
            sessionTimeout: Date.parse(req.session.cookie._expires),
            dst: isDST(),
        });

    });

    app.get("/latestVersion", [isLoggedIn], (req, res) => {
        res.status(200).send(authenticator.whatsNew(req.user.username, server.needsBetaKeyToSignUp));
    });

    app.post("/latestVersionSeen", [isLoggedIn], (req, res) => {
        authenticator.latestVersionSeen(req.user.username, server.needsBetaKeyToSignUp);
        res.sendStatus(200);
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
        let user = authenticator.getUser(req.user.username);
        res.render("classes.ejs", {
            user: req.user,
            userRef: JSON.stringify(user),
            page: "classes",
            classData: authenticator.getAllClassData(),
            theme: JSON.stringify(authenticator.getUser(req.user.username).appearance.theme),
            darkModeStart: JSON.stringify(authenticator.getUser(req.user.username).appearance.darkModeStart),
            darkModeFinish: JSON.stringify(authenticator.getUser(req.user.username).appearance.darkModeFinish),
            sessionTimeout: Date.parse(req.session.cookie._expires),
            dst: isDST(),
        });
    });

    app.post("/updateSortData", [isLoggedIn], (req, res) => {
        let username = req.user.username;
        let sortData = JSON.parse(req.body.sortingData);
        authenticator.updateSortData(username, sortData);
        res.sendStatus(200);
    });

    app.post("/usernameAvailable", (req, res) => {
        let username = req.body.username.toLowerCase();
        let resp = authenticator.usernameAvailable(username);
        if (resp.success) {
            res.status(200).send(resp.message);
        } else {
            res.status(400).send(resp.message);
        }
    });

    app.post("/betakeyValid", (req, res) => {
        let betakeys = authenticator.getAllBetaKeyData();

        if (betakeys.filter(o => o.betaKey === req.body.betaKey).length === 0) {
            res.status(400).send("Invalid beta key!");
        } else if (betakeys.filter(o => o.betaKey === req.body.betaKey && !o.claimed).length === 0) {
            res.status(400).send("Beta key already claimed!");
        } else {
            res.status(200).send("Valid Key!");
        }
    });

    /**
     * END GENERAL USER MANAGEMENT
     */


    // password reset

    app.get('/reset_password', (req, res) => {

        let resetToken = req.query.token;

        let invalidToken = !authenticator.checkToken(resetToken);
        if (invalidToken) {
            // req.flash('forgotPasswordMsg', 'Invalid token.')
            res.status(404).render('password_reset/reset_password_404.ejs')
            return
        }

        res.status(404).render('password_reset/reset_password.ejs', {
            message: req.flash('resetPasswordMsg'),
            token: resetToken,
            dst: isDST(),
        })
    });

    app.post('/reset_password', (req, res) => {

        let resetToken = req.body.token;
        if (!resetToken) {
            res.redirect('/')
            return
        }

        let newPass = req.body.password;
        let resp = authenticator.resetPassword(resetToken, newPass);
        console.log(resp); // todo remove
        req.flash('resetPasswordMsg', resp.message); // todo fix
        res.render('password_reset/reset_password_success.ejs')

    });

    app.get('/forgot_password', (req, res) => {
        // dont allow while logged in
        if (req.user) {
            res.redirect('/');
            return
        }
        res.status(200).render('password_reset/forgot_password.ejs', {
            message: req.flash('forgotPasswordMsg'),
            dst: isDST(),
        });
    });

    app.post('/forgot_password', (req, res) => {
        let email = req.body.email;
        let resp = authenticator.resetPasswordRequest(email);

        if (resp.user) {
            emailSender.sendPasswordResetToAccountOwner(email, "https://" + req.headers.host + "/reset_password?token=" + resp.token, resp.user.personalInfo.firstName);
        } else {
            // todo replace with sending email to non account holder
            emailSender.sendPasswordResetToAccountOwner(email, "https://" + req.headers.host + "/reset_password?token=" + resp.token, "non");
        }
        req.flash('forgotPasswordMsg', "A link has been sent to your email to reset your password.")
        res.redirect('/forgot_password')
    })


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

function isDST() {
    return Math.max(new Date(new Date(Date.now()).getFullYear(), 0, 1).getTimezoneOffset(), new Date(new Date(Date.now()).getFullYear(), 6, 1).getTimezoneOffset()) !== new Date(Date.now()).getTimezoneOffset();
}