const server = require("./graderoom.js");
const dbClient = require("./dbClient.js");
const emailSender = require("./emailSender.js");
const _ = require("lodash");

module.exports = function (app, passport) {

    // normal routes ===============================================================

    // show the home page (will also have our login links)
    app.get("/", async (req, res) => {

        let {sunrise: sunrise, sunset: sunset} = authenticator.getSunriseAndSunset();

        if (req.isAuthenticated()) {

            let returnTo = req.session.returnTo;
            delete req.session.returnTo;
            if (returnTo) {
                res.redirect(returnTo);
                return;
            }

            let gradeHistoryLetters = {};
            let {term, semester} = (await dbClient.getMostRecentTermData(req.user.username)).data;
            if (req.query.term && req.query.semester) {
                if ((term === req.query.term && semester === req.query.semester) ||
                    !authenticator.semesterExists(req.user.username, req.query.term, req.query.semester)) {
                    res.redirect("/");
                    return;
                }
                term = req.query.term;
                semester = req.query.semester;
            }
            for (let i = 0; i < Object.keys(req.user.grades).length; i++) {
                let t = Object.keys(req.user.grades)[i];
                gradeHistoryLetters[t] = {};
                for (let j = 0; j < Object.keys(req.user.grades[t]).length; j++) {
                    let s = Object.keys(req.user.grades[t])[j];
                    if (t.substring(0, 2) > term.substring(0, 2) || (t.substring(0, 2) === term.substring(0, 2) && s.substring(1) > semester.substring(1) && semester !== "_")) {
                        continue;
                    }
                    gradeHistoryLetters[t][s] = [];
                    for (let k = 0; k < req.user.grades[t][s].length; k++) {
                        let next = {};
                        next[req.user.grades[t][s][k].class_name] = req.user.grades[t][s][k].overall_letter;
                        gradeHistoryLetters[t][s].push(next);
                    }
                }
            }

            if (term && semester) {
                res.render("user/authorized_index.ejs", {
                    page: "home",
                    school: req.user.school,
                    username: req.user.username,
                    schoolUsername: req.user.schoolUsername,
                    isAdmin: req.user.isAdmin,
                    personalInfo: JSON.stringify(req.user.personalInfo),
                    appearance: JSON.stringify(req.user.appearance),
                    alerts: JSON.stringify(req.user.alerts),
                    gradeSync: !!req.user.schoolPassword,
                    gradeData: JSON.stringify(req.user.grades[term][semester].filter(grades => !(["CR", false]).includes(grades.overall_letter) || grades.grades.length)),
                    weightData: JSON.stringify(req.user.weights[term][semester]),
                    addedAssignments: JSON.stringify(req.user.addedAssignments[term][semester]),
                    editedAssignments: JSON.stringify(req.user.editedAssignments[term][semester]),
                    gradeHistory: JSON.stringify(gradeHistoryLetters),
                    relevantClassData: JSON.stringify(authenticator.getRelClassData(req.user.username, term, semester)),
                    sortingData: JSON.stringify(req.user.sortingData),
                    sessionTimeout: Date.parse(req.session.cookie._expires),
                    beta: JSON.stringify(server.beta),
                    betaFeatures: JSON.stringify(req.user.betaFeatures),
                    term: term,
                    semester: semester,
                    termsAndSemesters: JSON.stringify(Object.keys(req.user.grades).map(x => [x,
                        Object.keys(req.user.grades[x]).sort((a, b) => a.substring(1) < b.substring(1) ? -1 : 1)]).sort((a, b) => a[0].substring(3) < b[0].substring(3) ? -1 : 1)),
                    _: _,
                    sunset: sunset,
                    sunrise: sunrise,
                    enableLogging: req.user.enableLogging,
                });
            } else {
                res.render("user/authorized_index.ejs", {
                    page: "home",
                    school: req.user.school,
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
                    editedAssignments: JSON.stringify({}),
                    gradeHistory: JSON.stringify([]),
                    relevantClassData: JSON.stringify({}),
                    sortingData: JSON.stringify(req.user.sortingData),
                    sessionTimeout: Date.parse(req.session.cookie._expires),
                    beta: JSON.stringify(server.beta),
                    betaFeatures: JSON.stringify(req.user.betaFeatures),
                    term: "",
                    semester: "",
                    termsAndSemesters: JSON.stringify([]),
                    _: _,
                    sunset: sunset,
                    sunrise: sunrise,
                    enableLogging: req.user.enableLogging,
                });
            }
            return;
        }
        res.render("viewer/index.ejs", {
            message: req.flash("loginMessage"),
            beta: server.beta,
            appearance: JSON.stringify({seasonalEffects: true}),
            page: "login",
            sunset: sunset,
            sunrise: sunrise
        });
    });

    app.post("/joinbeta", [isLoggedIn], (req, res) => {
        dbClient.joinBeta(req.user.username);
        authenticator.setRemoteAccess(req.user.username, req.body.activateWithRemoteAccess === "on" ? "allowed" : "denied");
        res.redirect("/");
    });

    app.post("/betafeatures", [isLoggedIn], (req, res) => {
        dbClient.updateBetaFeatures(req.user.school, req.user.username, req.body);
        res.redirect("/");
    });

    app.post("/leavebeta", [isLoggedIn], (req, res) => {
        dbClient.leaveBeta(req.user.school, req.user.username);
        res.redirect("/");
    });

    app.post("/advancedAppearance", [isLoggedIn], (req, res) => {
        let show = req.body.showNonAcademic === "on";
        authenticator.setNonAcademic(req.user.username, show);
        let regularize = req.body.regularizeClassGraphs === "on";
        authenticator.setRegularizeClassGraphs(req.user.username, regularize);
        res.redirect("/");
    });

    app.post("/weightedGPA", [isLoggedIn], (req, res) => {
        let weightedGPA = req.body.weightedGPA;
        authenticator.setWeightedGPA(req.user.username, weightedGPA);
        res.sendStatus(200);
    });

    app.get("/viewuser", [isAdmin], async (req, res) => {
        if (req.query.usernameToRender) {
            let user = (await dbClient.getUser({username: req.query.usernameToRender})).data.value;
            if (user.alerts.remoteAccess === "denied") {
                res.redirect("/");
                return;
            }

            let gradeHistoryLetters = {};
            let {term, semester} = (await dbClient.getMostRecentTermData(req.query.usernameToRender)).data;
            if (req.query.term && req.query.semester) {
                if ((term === req.query.term && semester === req.query.semester) || !authenticator.semesterExists(user.username, req.query.term, req.query.semester)) {
                    res.redirect("/viewuser?usernameToRender=" + req.query.usernameToRender);
                    return;
                }
                term = req.query.term;
                semester = req.query.semester;
            }
            for (let i = 0; i < Object.keys(user.grades).length; i++) {
                let t = Object.keys(user.grades)[i];
                gradeHistoryLetters[t] = {};
                for (let j = 0; j < Object.keys(user.grades[t]).length; j++) {
                    let s = Object.keys(user.grades[t])[j];
                    if (t.substring(0, 2) > term.substring(0, 2) || (t.substring(0, 2) === term.substring(0, 2) && s.substring(1) > semester.substring(1) && semester !== "_")) {
                        continue;
                    }
                    gradeHistoryLetters[t][s] = [];
                    for (let k = 0; k < user.grades[t][s].length; k++) {
                        let next = {};
                        next[user.grades[t][s][k].class_name] = user.grades[t][s][k].overall_letter;
                        gradeHistoryLetters[t][s].push(next);
                    }
                }
            }

            let {sunrise: sunrise, sunset: sunset} = authenticator.getSunriseAndSunset();

            if (term && semester) {
                res.render("user/authorized_index.ejs", {
                    page: "home",
                    school: user.school,
                    username: user.username,
                    schoolUsername: user.schoolUsername,
                    isAdmin: user.isAdmin,
                    personalInfo: JSON.stringify(user.personalInfo),
                    appearance: JSON.stringify(user.appearance),
                    alerts: JSON.stringify(user.alerts),
                    gradeSync: !!user.schoolPassword,
                    gradeData: JSON.stringify(user.grades[term][semester].filter(grades => !(["CR", false]).includes(grades.overall_letter) || grades.grades.length)),
                    weightData: JSON.stringify(user.weights[term][semester]),
                    addedAssignments: JSON.stringify(user.addedAssignments[term][semester]),
                    editedAssignments: JSON.stringify(user.editedAssignments[term][semester]),
                    gradeHistory: JSON.stringify(gradeHistoryLetters),
                    relevantClassData: JSON.stringify(authenticator.getRelClassData(req.query.usernameToRender, term, semester)),
                    sortingData: JSON.stringify(user.sortingData),
                    sessionTimeout: Date.parse(req.session.cookie._expires),
                    beta: server.beta,
                    betaFeatures: JSON.stringify(user.betaFeatures),
                    term: term,
                    semester: semester,
                    termsAndSemesters: JSON.stringify(Object.keys(user.grades).map(x => [x,
                        Object.keys(user.grades[x]).sort((a, b) => a.substring(1) < b.substring(1) ? -1 : 1)]).sort((a, b) => a[0].substring(3) < b[0].substring(3) ? -1 : 1)),
                    sunset: sunset,
                    sunrise: sunrise,
                    _: _,
                    enableLogging: true,
                });
            } else {
                res.render("user/authorized_index.ejs", {
                    page: "home",
                    school: user.school,
                    username: user.username,
                    schoolUsername: user.schoolUsername,
                    isAdmin: user.isAdmin,
                    personalInfo: JSON.stringify(user.personalInfo),
                    appearance: JSON.stringify(user.appearance),
                    alerts: JSON.stringify(user.alerts),
                    gradeSync: !!user.schoolPassword,
                    gradeData: JSON.stringify([]),
                    weightData: JSON.stringify({}),
                    addedAssignments: JSON.stringify({}),
                    editedAssignments: JSON.stringify({}),
                    gradeHistory: JSON.stringify([]),
                    relevantClassData: JSON.stringify({}),
                    sortingData: JSON.stringify(user.sortingData),
                    sessionTimeout: Date.parse(req.session.cookie._expires),
                    beta: server.beta,
                    betaFeatures: JSON.stringify(user.betaFeatures),
                    term: "",
                    semester: "",
                    termsAndSemesters: JSON.stringify([]),
                    sunset: sunset,
                    sunrise: sunrise,
                    _: _,
                    enableLogging: true,
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

    app.post("/deleteUser", [isAdmin], async (req, res) => {
        let username = req.body.deleteUser;
        console.log("Got request to delete: " + username);

        let resp = await dbClient.archiveUser(username);
        console.log(resp);
        if (resp.success) {
            req.flash("adminSuccessMessage", resp.data.message);
        } else {
            req.flash("adminFailMessage", resp.data.message);
        }

        res.redirect("/admin");
    });

    app.post("/restoreUser", [isAdmin], async (req, res) => {
        let username = req.body.restoreUser;
        let resp = await dbClient.unarchiveUser(username);
        if (resp.success) {
            req.flash("adminSuccessMessage", resp.data.message);
        } else {
            req.flash("adminFailMessage", resp.data.message);
        }

        res.redirect("/admin");
    });

    app.post("/makeadmin", [isAdmin], async (req, res) => {
        let username = req.body.newAdminUser;
        console.log("Got request to make admin: " + username);

        let resp = await dbClient.makeAdmin(username);
        console.log(resp);
        if (resp.success) {
            req.flash("adminSuccessMessage", resp.data.message);
        } else {
            req.flash("adminFailMessage", resp.data.message);
        }

        res.redirect("/admin");
    });

    app.post("/removeadmin", [isAdmin], async (req, res) => {
        let username = req.body.removeAdminUser;
        console.log("Got request to remove admin: " + username);

        let resp = await dbClient.removeAdmin(username, req.user.username);
        console.log(resp);
        if (resp.success) {
            req.flash("adminSuccessMessage", resp.data.message);
        } else {
            req.flash("adminFailMessage", resp.data.message);
        }

        res.redirect("/admin");
    });

    app.get("/admin", [isAdmin], async (req, res) => {
        // admin panel TODO
        let allUsers = (await dbClient.getAllUsers()).data.value;
        let deletedUsers = (await dbClient.getAllArchivedUsers()).data.value;
        let {sunrise: sunrise, sunset: sunset} = authenticator.getSunriseAndSunset();
        res.render("admin/admin.ejs", {
            page: "admin",
            username: req.user.username,
            userList: allUsers,
            deletedUserList: deletedUsers,
            adminSuccessMessage: req.flash("adminSuccessMessage"),
            adminFailMessage: req.flash("adminFailMessage"),
            sessionTimeout: Date.parse(req.session.cookie._expires),
            appearance: JSON.stringify(req.user.appearance),
            beta: server.beta,
            sunset: sunset,
            sunrise: sunrise

        });
    });

    app.get("/changelog", [isLoggedIn], async (req, res) => {
        let result = authenticator.changelog(server.beta);
        res.status(200).send(result);
    });

    app.post("/updateAppearance", [isLoggedIn], (req, res) => {
        let resp = authenticator.setTheme(req.user.username, req.body.theme, req.body.darkModeStart, req.body.darkModeFinish, req.body.enableSeasonalEffects === "on", req.body.blurEffects === "on");
        if (resp.success) {
            res.status(200).send(resp.message);
        } else {
            res.status(400).send(resp.message);
        }
    });

    app.post("/updateShowMaxGPA", [isLoggedIn], (req, res) => {
        let resp = authenticator.setShowMaxGPA(req.user.username, JSON.parse(req.body.showMaxGPA));
        if (resp.success) {
            res.sendStatus(200);
        } else {
            res.sendStatus(400);
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
        dbClient.acceptPrivacyPolicy(req.user.username);
        res.redirect("/");
    });

    app.post("/acceptTerms", [isLoggedIn], (req, res) => {
        dbClient.acceptTerms(req.user.username);
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

        let old_pass = req.body.oldPass;
        let new_pass = req.body.password;
        let resp = await dbClient.changePassword(req.user.username, old_pass, new_pass);
        if (resp.success) {
            res.status(200).send(resp.data.message);
        } else {
            res.status(400).send(resp.data.message);
        }
    });

    app.post("/changeschoolemail", [isLoggedIn], (req, res) => {
        let new_school_email = req.body.school_email;
        let resp = dbClient.changeSchoolEmail(req.user.username, new_school_email);
        if (resp.success) {
            res.status(200).send(resp.message);
        } else {
            res.status(400).send(resp.message);
        }
    });

    app.post("/updateAddedAssignments", [isLoggedIn], (req, res) => {
        let data = req.body.data;
        let term = req.body.term;
        let semester = req.body.semester;
        let resp = authenticator.updateAddedAssignments(req.user.username, JSON.parse(data), term, semester);
        if (resp.success) {
            res.status(200).send(resp.message);
        } else {
            res.status(400).send(resp.message);
        }
    });

    app.post("/updateEditedAssignments", [isLoggedIn], (req, res) => {
        let data = req.body.data;
        let term = req.body.term;
        let semester = req.body.semester;
        let resp = authenticator.updateEditedAssignments(req.user.username, JSON.parse(data), term, semester);
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
        let {sunrise: sunrise, sunset: sunset} = authenticator.getSunriseAndSunset();

        res.render("viewer/signup.ejs", {
            message: req.flash("signupMessage"),
            beta: server.beta,
            appearance: JSON.stringify({seasonalEffects: true}),
            page: "signup",
            sunset: sunset,
            sunrise: sunrise
        });
    });

    app.post("/signup", async (req, res, next) => {

        let school = req.body.school;
        let username = req.body.username;
        let password = req.body.password;
        let s_email = req.body.school_email;

        console.log("Trying to create user: " + username);

        let resp;
        if (server.beta) {
            let bk = req.body.beta_key;
            resp = await dbClient.addUser(school, username, password, s_email, false, server.beta, bk);
            console.log("beta: " + resp);
        } else {
            resp = await dbClient.addUser(school, username, password, s_email, false);
            console.log("nonbeta: " + resp);
        }
        authenticator.setColorPalette(username, "clear", false);

        if (!resp.success) {
            req.flash("signupMessage", resp.data.message);
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

    app.post("/update", [isLoggedIn, inRecentTerm], async (req, res) => {

        let gradeSync = req.body.savePassword === "on";
        let pass = req.body.school_password;
        let user = req.user.username;
        let userPass = req.body.user_password;
        if (userPass) {
            if (!gradeSync) {
                let resp = await dbClient.decryptAndGetSchoolPassword(user, userPass);
                if (resp.success) {
                    pass = resp.data.value;
                } else {
                    res.status(400).send(resp.data.message);
                    return;
                }
            } else {
                let resp = await dbClient.login(user, userPass);
                if (!resp.success) {
                    res.status(400).send(resp.data.message);
                    return;
                }
            }
        }
        let _stream = (await dbClient.updateGrades(req.user.username, pass)).data.stream;
        let {term, semester} = (await dbClient.getMostRecentTermData(req.user.username)).data;

        _stream.on("data", async (data) => {
            if (!('success' in data)) return;
            if (data.success || data.message === "No class data." || data.message === "An Unknown Error occurred. Contact support." || data.message === "PowerSchool is locked.") {
                if (term && semester) {
                    if (gradeSync) {
                        let encryptResp = await dbClient.encryptAndStoreSchoolPassword(user, pass, userPass);
                        if (!encryptResp.success) {
                            res.status(400).send(encryptResp.data.message);
                            return;
                        }
                        res.status(200).send({
                            gradeSyncEnabled: true,
                            message: data.message,
                            grades: JSON.stringify(req.user.grades[term][semester].filter(grades => !(["CR", false]).includes(grades.overall_letter) || grades.grades.length)),
                            weights: JSON.stringify(req.user.weights[term][semester]),
                            updateData: JSON.stringify(req.user.alerts.lastUpdated.slice(-1)[0])
                        });
                    } else {
                        res.status(200).send({
                            gradeSyncEnabled: false,
                            message: data.message,
                            grades: JSON.stringify(req.user.grades[term][semester].filter(grades => !(["CR", false]).includes(grades.overall_letter) || grades.grades.length)),
                            weights: JSON.stringify(req.user.weights[term][semester]),
                            updateData: JSON.stringify(req.user.alerts.lastUpdated.slice(-1)[0])
                        });
                    }
                } else {
                    res.status(400).send(data.message);
                }
            } else {
                res.status(400).send(data.message);
            }
        });

    });


    //FIX THIS TO LET ANY WEIGHTS BE
    // EDITED!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    // must be called via client side ajax+js
    app.post("/updateweights", [isLoggedIn], async (req, res) => {
        let className = req.body.className;
        let hasWeights = req.body.hasWeights;
        let newWeights = JSON.parse(req.body.newWeights);
        let term = req.body.term;
        let semester = req.body.semester;
        let resp = authenticator.updateWeightsForClass(req.user.username, term, semester, className, hasWeights, newWeights);
        if (resp.success) {
            res.status(200).send(resp.message);
            authenticator.bringUpToDate(req.user.username, term, semester, className);
        } else {
            res.status(400).send(resp.message);
        }
    });

    app.post("/updateclassweights", [isAdmin], (req, res) => {
        let resp = authenticator.updateWeightsInClassDb(req.body.term, req.body.semester, req.body.className, req.body.teacherName, req.body.hasWeights, req.body.weights);
        if (resp.success) {
            res.status(200).send(resp);
        } else {
            res.status(400).send(resp);
        }
    });

    app.post("/updateclasstype", [isAdmin], (req, res) => {
        let resp = authenticator.updateClassTypeInClassDb(req.body.term, req.body.semester, req.body.className, req.body.classType);
        if (resp.success) {
            res.status(200).send(resp);
        } else {
            res.status(400).send(resp);
        }
    });

    app.post("/updateuccsuclasstype", [isAdmin], (req, res) => {
        let resp = authenticator.updateUCCSUClassTypeInClassDb(req.body.term, req.body.semester, req.body.className, req.body.classType);
        if (resp.success) {
            res.status(200).send(resp);
        } else {
            res.status(400).send(resp);
        }
    });

    app.post("/setColorPalette", [isLoggedIn], (req, res) => {
        let resp = authenticator.setColorPalette(req.user.username, req.body.preset, JSON.parse(req.body.shuffleColors));
        if (resp.success) {
            res.status(200).send(resp.message);
        } else {
            res.status(400).send(resp.message);
        }
    });

    app.get("/finalgradecalculator", async (req, res) => {

        let {sunrise: sunrise, sunset: sunset} = authenticator.getSunriseAndSunset();

        if (req.isAuthenticated()) {

            let {term, semester} = (await dbClient.getMostRecentTermData(req.user.username)).data;
            if (term && semester) {
                res.render("user/final_grade_calculator.ejs", {
                    page: "calc",
                    username: req.user.username,
                    schoolUsername: req.user.schoolUsername,
                    isAdmin: req.user.isAdmin,
                    personalInfo: JSON.stringify(req.user.personalInfo),
                    appearance: JSON.stringify(req.user.appearance),
                    alerts: JSON.stringify(req.user.alerts),
                    gradeSync: !!req.user.schoolPassword,
                    gradeData: JSON.stringify(req.user.grades[term][semester].filter(grades => !(["CR", false]).includes(grades.overall_letter) || grades.grades.length)),
                    weightData: JSON.stringify(req.user.weights[term][semester]),
                    sessionTimeout: Date.parse(req.session.cookie._expires),
                    beta: JSON.stringify(server.beta),
                    sunset: sunset,
                    sunrise: sunrise

                });
            } else {
                res.render("user/final_grade_calculator.ejs", {
                    page: "calc",
                    username: req.user.username,
                    schoolUsername: req.user.schoolUsername,
                    isAdmin: req.user.isAdmin,
                    personalInfo: JSON.stringify(req.user.personalInfo),
                    appearance: JSON.stringify(req.user.appearance),
                    alerts: JSON.stringify(req.user.alerts),
                    gradeSync: !!req.user.schoolPassword,
                    gradeData: JSON.stringify({}),
                    weightData: JSON.stringify({}),
                    sessionTimeout: Date.parse(req.session.cookie._expires),
                    beta: JSON.stringify(server.beta),
                    sunset: sunset,
                    sunrise: sunrise

                });
            }
        } else {
            req.session.returnTo = req.originalUrl;
            res.render("viewer/final_grade_calculator_logged_out.ejs", {
                appearance: JSON.stringify({seasonalEffects: true}),
                page: "logged_out_calc",
                beta: JSON.stringify(server.beta),
                sunset: sunset,
                sunrise: sunrise

            });
        }

    });

    app.post("/setRemoteAccess", [isLoggedIn], (req, res) => {
        let allowed = req.body.remoteAccess === "on" ? "allowed" : "denied";
        authenticator.setRemoteAccess(req.user.username, allowed);
        res.status(200).send(allowed[0].toUpperCase() + allowed.substring(1) + " remote access.");
    });

    app.post("/setFirstName", [isLoggedIn], (req, res) => {
        let resp = authenticator.setFirstName(req.user.username, req.body.firstName);
        res.status(resp.success ? 200 : 400).send(resp.message);
    });

    app.get("/betakeys", [isAdmin], async (req, res) => {

        let {sunrise: sunrise, sunset: sunset} = authenticator.getSunriseAndSunset();

        res.render("admin/betakeys.ejs", {
            betaKeyData: (await dbClient.getAllBetaKeys()).data.value,
            betaKeySuccessMessage: req.flash("betaKeySuccessMessage"),
            betaKeyFailMessage: req.flash("betaKeyFailMessage"),
            page: "keys",
            sessionTimeout: Date.parse(req.session.cookie._expires),
            appearance: JSON.stringify(req.user.appearance),
            beta: server.beta,
            sunset: sunset,
            sunrise: sunrise,
            username: req.user.username
        });

    });

    app.get("/latestVersion", [isLoggedIn], (req, res) => {
        res.status(200).send(authenticator.whatsNew(req.user.username, server.beta));
    });

    app.post("/latestVersionSeen", [isLoggedIn], (req, res) => {
        authenticator.latestVersionSeen(req.user.username, server.beta);
        res.sendStatus(200);
    });

    app.post("/newbetakey", [isAdmin], (req, res) => {
        let resp = authenticator.addNewBetaKey();

        if (resp.success) {
            req.flash("betaKeySuccessMessage", resp.data.message);
        } else {
            req.flash("betaKeyFailMessage", resp.data.message);
        }

        res.redirect("/betakeys");

    });

    app.post("/deletebetakey", [isAdmin], async (req, res) => {

        let bk = req.body.beta_key;
        let resp = await dbClient.removeBetaKey(bk);

        if (resp.success) {
            req.flash("betaKeySuccessMessage", resp.data.message);
        } else {
            req.flash("betaKeyFailMessage", resp.data.message);
        }

        res.redirect("/betakeys");

    });

    app.get("/classes", [isAdmin], (req, res) => {
        let {sunrise: sunrise, sunset: sunset} = authenticator.getSunriseAndSunset();

        let {term, semester} = authenticator.getClassesMostRecentTermData();
        if (req.query.term && req.query.semester) {
            if ((term === req.query.term && semester === req.query.semester) || !req.user.betaFeatures.active || !authenticator.classesSemesterExists(req.query.term, req.query.semester)) {
                res.redirect("/classes");
                return;
            }
            term = req.query.term;
            semester = req.query.semester;
        }

        res.render("admin/classes.ejs", {
            username: req.user.username,
            page: "classes",
            classData: authenticator.getAllClassData()[term][semester],
            sessionTimeout: Date.parse(req.session.cookie._expires),
            appearance: JSON.stringify(req.user.appearance),
            beta: server.beta,
            term: term,
            semester: semester,
            termsAndSemesters: JSON.stringify(Object.keys(authenticator.getAllClassData()).map(x => [x,
                Object.keys(authenticator.getAllClassData()[x]).sort((a, b) => a.substring(1) < b.substring(1) ? -1 : 1)]).sort((a, b) => a[0].substring(3) < b[0].substring(3) ? -1 : 1)),
            sunset: sunset,
            sunrise: sunrise,
            _: _
        });
    });

    app.get("/charts", [isAdmin], async (req, res) => {
        let {sunrise: sunrise, sunset: sunset} = authenticator.getSunriseAndSunset();
        let allUsers = (await dbClient.getAllUsers()).data.value;
        res.render("admin/cool_charts.ejs", {
            username: req.user.username,
            appearance: JSON.stringify(req.user.appearance),
            sessionTimeout: Date.parse(req.session.cookie._expires),
            page: "charts",
            userList: JSON.stringify(allUsers),
            sunset: sunset,
            sunrise: sunrise,
            _: _
        });
    });

    app.post("/updateSortData", [isLoggedIn, inRecentTerm], (req, res) => {
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

    app.post("/emailAvailable", (req, res) => {
        let schoolUsername = req.body.schoolUsername.toLowerCase();
        let resp = authenticator.emailAvailable(schoolUsername);
        if (resp.success) {
            res.status(200).send(resp.message);
        } else {
            res.status(400).send(resp.message);
        }
    });

    app.post("/betakeyValid", async (req, res) => {
        let betaKeyValid = await dbClient.betaKeyValid(req.body.betaKey);
        if (!betaKeyValid.success) {
            res.status(400).send(betaKeyValid.data.message);
        } else {
            res.status(200).send(betaKeyValid.data.message);
        }
    });

    /**
     * END GENERAL USER MANAGEMENT
     */


    // password reset

    app.get("/reset_password", (req, res) => {

        let resetToken = req.query.token;
        let {sunrise: sunrise, sunset: sunset} = authenticator.getSunriseAndSunset();

        let {valid: validToken, gradeSync: gradeSync} = authenticator.checkToken(resetToken);
        if (!validToken) {

            // req.flash('forgotPasswordMsg', 'Invalid token.')
            res.status(404).render("password_reset/reset_password_404.ejs", {
                sunset: sunset,
                appearance: JSON.stringify({seasonalEffects: true}),
                sunrise: sunrise,
                page: "password404"
            });
            return;
        }

        res.status(200).render("password_reset/reset_password.ejs", {
            message: req.flash("resetPasswordMsg"),
            token: resetToken,
            gradeSync: gradeSync,
            appearance: JSON.stringify({seasonalEffects: true}),
            sunset: sunset,
            sunrise: sunrise,
            page: "passwordReset"
        });
    });

    app.post("/reset_password", (req, res) => {

        let resetToken = req.body.token;
        if (!resetToken) {
            res.redirect("/");
            return;
        }

        let {sunrise: sunrise, sunset: sunset} = authenticator.getSunriseAndSunset();
        let newPass = req.body.password;
        let resp = authenticator.resetPassword(resetToken, newPass);
        if (!resp.success && resp.message === "Invalid token.") {
            res.status(404).render("password_reset/reset_password_404.ejs", {
                sunset: sunset,
                appearance: JSON.stringify({seasonalEffects: true}),
                sunrise: sunrise,
                page: "password404"
            });
            return;
        }
        if (!resp.success) {
            req.flash("resetPasswordMsg", resp.message);
            res.redirect("/reset_password?token=" + resetToken);
            return;
        }
        res.render("password_reset/reset_password_success.ejs", {
            appearance: JSON.stringify({seasonalEffects: true}),
            sunset: sunset,
            sunrise: sunrise,
            page: "passwordResetSuccess"
        });

    });

    app.get("/forgot_password", (req, res) => {
        // dont allow while logged in
        if (req.user) {
            res.redirect("/");
            return;
        }

        let {sunrise: sunrise, sunset: sunset} = authenticator.getSunriseAndSunset();
        res.status(200).render("password_reset/forgot_password.ejs", {
            message: req.flash("forgotPasswordMsg"),
            sunset: sunset,
            appearance: JSON.stringify({seasonalEffects: true}),
            page: "passwordForgot",
            sunrise: sunrise
        });
    });

    app.post("/forgot_password", (req, res) => {
        let email = req.body.email;
        let resp = authenticator.resetPasswordRequest(email);

        if (resp.user) {
            emailSender.sendPasswordResetToAccountOwner(email, "https://" + req.headers.host + "/reset_password?token=" + resp.token, resp.user.personalInfo.firstName);
        } else {
            // this doesn't do anything
            emailSender.sendPasswordResetToNonUser(email, "https://" + req.headers.host + "/reset_password?token=" + resp.token);
        }
        req.flash("forgotPasswordMsg", "If the email address you entered is associated with an account, you should receive an email containing a link to reset your password. Please make sure to check your spam folder. If you run into any issues, contact <b><a href='mailto:support@graderoom.me'>support@graderoom.me</a></b>.");
        res.redirect("/forgot_password");
    });

    /** Api stuff (maybe temp) */
    app.get("/api/status", [isApiLoggedIn], (req, res) => {
        res.sendStatus(200);
    });

    app.get("/api/settings", [isApiLoggedIn], (req, res) => {
        let {sunrise: sunrise, sunset: sunset} = authenticator.getSunriseAndSunset();
        sunrise = sunrise.getTime();
        sunset = sunset.getTime();
        let settings = {
            username: req.user.username,
            schoolUsername: req.user.schoolUsername,
            isAdmin: req.user.isAdmin,
            personalInfo: JSON.stringify(req.user.personalInfo),
            appearance: JSON.stringify(req.user.appearance),
            alerts: JSON.stringify(req.user.alerts),
            gradeSync: !!req.user.schoolPassword,
            sortingData: JSON.stringify(req.user.sortingData),
            beta: server.beta,
            betaFeatures: JSON.stringify(req.user.betaFeatures),
            sunset: sunset,
            sunrise: sunrise
        };
        res.status(200).send(JSON.stringify(settings));
    });

    app.get("/api/general", [isApiLoggedIn], async (req, res) => {
        let gradeHistoryLetters = {};
        let {term, semester} = (await dbClient.getMostRecentTermData(req.user.username)).data;
        for (let i = 0; i < Object.keys(req.user.grades).length; i++) {
            let t = Object.keys(req.user.grades)[i];
            gradeHistoryLetters[t] = {};
            for (let j = 0; j < Object.keys(req.user.grades[t]).length; j++) {
                let s = Object.keys(req.user.grades[t])[j];
                if (t.substring(0, 2) > term.substring(0, 2) || (t.substring(0, 2) === term.substring(0, 2) && s.substring(1) > semester.substring(1))) {
                    continue;
                }
                gradeHistoryLetters[t][s] = [];
                for (let k = 0; k < req.user.grades[t][s].length; k++) {
                    let next = {};
                    next[req.user.grades[t][s][k].class_name] = req.user.grades[t][s][k].overall_letter;
                    gradeHistoryLetters[t][s].push(next);
                }
            }
        }
        let data = {
            termsAndSemesters: JSON.stringify(Object.keys(req.user.grades).map(term => {
                let semesters = Object.keys(req.user.grades[term]);
                let sortedSemesters = semesters.sort((a, b) => {
                    return a.substring(1) < b.substring(1) ? -1 : 1;
                });
                return [term, sortedSemesters];
            }).sort((a, b) => a[0].substring(3) < b[0].substring(3) ? -1 : 1)),
            term: term,
            semester: semester,
            gradeData: JSON.stringify(req.user.grades[term][semester].filter(grades => !(["CR", false]).includes(grades.overall_letter) || grades.grades.length)),
            weightData: JSON.stringify(req.user.weights[term][semester]),
            addedAssignments: JSON.stringify(req.user.addedAssignments[term][semester]),
            editedAssignments: JSON.stringify(req.user.editedAssignments[term][semester]),
            gradeHistory: JSON.stringify(gradeHistoryLetters),
            relevantClassData: JSON.stringify(authenticator.getRelClassData(req.user.username, term, semester))
        };
        res.status(200).send(JSON.stringify(data));
    });

    app.get("/api/grades", [isApiLoggedIn], async (req, res) => {
        let {term, semester} = (await dbClient.getMostRecentTermData(req.user.username)).data;
        res.status(200).send(JSON.stringify(req.user.grades[term][semester].filter(grades => !(["CR", false]).includes(grades.overall_letter) || grades.grades.length)));
    });

    app.get("/api/checkUpdateBackground", [isApiLoggedIn], async (req, res) => {
        let resp = await dbClient.getSyncStatus(req.user.username);
        let user = (await dbClient.getUser({username: req.user.username})).data.value;
        let {term, semester} = (await dbClient.getMostRecentTermData(req.user.username)).data;
        if (term && semester && resp.data.message === "Sync Complete!") {
            res.status(200).send({
                message: resp.data.message,
                grades: JSON.stringify(user.grades[term][semester].filter(grades => !(["CR", false]).includes(grades.overall_letter) || grades.grades.length)),
                weights: JSON.stringify(user.weights[term][semester]),
                updateData: JSON.stringify(user.alerts.lastUpdated.slice(-1)[0])
            });
        } else if (term && semester && resp.data.message === "Already Synced!") {
            res.status(200).send({
                message: resp.data.message,
                updateData: JSON.stringify(user.alerts.lastUpdated.slice(-1)[0])
            });
        } else {
            res.status(200).send({
                message: resp.data.message
            });
        }
    });

    function isApiLoggedIn(req, res, next) {
        if (req.isAuthenticated()) {
            return next();
        }
        res.sendStatus(401);
    }

    app.post("/api/login", (req, res, next) => {
        passport.authenticate("local-login", (err, user) => {
            if (err) {
                return next(err);
            }
            if (!user) {
                return res.sendStatus(401);
            }
            req.logIn(user, (err) => {
                if (err) {
                    return next(err);
                }
                return res.sendStatus(200);
            });
        })(req, res, next);
    });

    app.get("/api/logout", (req, res) => {
        req.logout();
        res.sendStatus(200);
    });
    /** End api stuff */

    // general web app

    app.get("/*", (req, res) => {
        req.session.returnTo = req.originalUrl;
        res.redirect("/");
    });

    // route middleware to ensure user is logged in
    function isLoggedIn(req, res, next) {
        if (!(["/", "/admin"]).includes(req._parsedOriginalUrl.path) && req.headers.referer && req.headers.referer.includes("viewuser")) {
            res.sendStatus(405);
            return;
        }
        if (req.isAuthenticated()) {
            return next();
        }
        res.redirect("/");
    }

    function notSupportedOutsideBell(req, res, next) {
        if (req.user.school !== "bellarmine") {
            res.sendStatus(501);
            return;
        }
        return next();
    }

    // temp middleware to prevent routes from happening if using query to view old semesters
    function inRecentTerm(req, res, next) {
        let url = req.headers.referer;
        let props = Object.fromEntries(url.includes("?") ? url.split("?")[1].split("&").map(prop => prop.split("=")) : []);
        if (props.term && props.semester && !authenticator.semesterExists(req.user.username, props.term, props.semester)) {
            delete props.term;
            delete props.semester;
        }
        if (!props.term && !props.semester) {
            return next();
        }
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
    return Math.max(new Date(new Date(Date.now()).getFullYear(), 0, 1).getTimezoneOffset(), new Date(new Date(Date.now()).getFullYear(), 6, 1).getTimezoneOffset()) !==
        new Date(Date.now()).getTimezoneOffset();
}
