const server = require("./graderoom.js");
const dbClient = require("./dbClient.js");
const emailSender = require("./emailSender.js");
const _ = require("lodash");
const SunCalc = require("suncalc");
const {changelog} = require("./dbHelpers");
const {Schools, PrettySchools, SchoolAbbr} = require("./enums");

module.exports = function (app, passport) {

    // normal routes ===============================================================

    // show the home page (will also have our login links)
    app.get("/", async (req, res) => {

        let {sunrise: sunrise, sunset: sunset} = getSunriseAndSunset();

        if (req.isAuthenticated()) {

            let returnTo = req.session.returnTo;
            delete req.session.returnTo;
            if (returnTo) {
                res.redirect(returnTo);
                return;
            }

            let gradeHistoryLetters = {};
            let {term, semester} = (await dbClient.getMostRecentTermData(req.user.username)).data.value;
            if (req.query.term && req.query.semester) {
                if ((term === req.query.term && semester === req.query.semester) || !(await dbClient.userHasSemester(req.user.username, req.query.term, req.query.semester)).data.value) {
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
                let filteredGrades = req.user.appearance.showEmpty ? req.user.grades[term][semester] : req.user.grades[term][semester].filter(grades => !(["CR", false]).includes(grades.overall_letter) || grades.grades.length);
                let filteredWeights = req.user.weights[term][semester].filter(weights => filteredGrades.map(g => g.class_name).includes(weights.className));

                let {plus, premium} = (await dbClient.getDonoAttributes(req.user.username)).data.value;

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
                    gradeData: JSON.stringify(filteredGrades),
                    weightData: JSON.stringify(filteredWeights),
                    emptyCount: req.user.grades[term][semester].length - filteredGrades.length,
                    addedAssignments: JSON.stringify(req.user.addedAssignments[term][semester]),
                    editedAssignments: JSON.stringify(req.user.editedAssignments[term][semester]),
                    gradeHistory: JSON.stringify(gradeHistoryLetters),
                    relevantClassData: JSON.stringify((await dbClient.getRelevantClassData(req.user.username, term, semester)).data.value),
                    donoData: JSON.stringify(req.user.donoData),
                    sortingData: JSON.stringify(req.user.sortingData),
                    sessionTimeout: Date.parse(req.session.cookie._expires),
                    beta: JSON.stringify(server.beta),
                    betaFeatures: JSON.stringify(req.user.betaFeatures),
                    term: term,
                    semester: semester,
                    termsAndSemesters: JSON.stringify(Object.keys(req.user.grades).map(term => {
                        let semesters = Object.keys(req.user.grades[term]).filter(s => req.user.grades[term][s].filter(grades => !(["CR", false]).includes(grades.overall_letter) ||
                            grades.grades.length).length);
                        let sortedSemesters = semesters.sort((a, b) => {
                            return a.substring(1) < b.substring(1) ? -1 : 1;
                        });
                        return [term, sortedSemesters];
                    }).sort((a, b) => a[0].substring(3) < b[0].substring(3) ? -1 : 1)),
                    _: _,
                    sunset: sunset,
                    sunrise: sunrise,
                    premium: premium,
                    enableLogging: req.user.enableLogging,
                    pairKey: req.user.api.pairKey ?? "",
                    pairKeyExpire: req.user.api.pairKeyExpire ?? "",
                    apiKey: req.user.api.apiKey ?? "",
                    plus: plus
                });
            } else {
                let {plus, premium} = (await dbClient.getDonoAttributes(req.user.username)).data.value;
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
                    emptyCount: 0,
                    addedAssignments: JSON.stringify({}),
                    editedAssignments: JSON.stringify({}),
                    gradeHistory: JSON.stringify([]),
                    relevantClassData: JSON.stringify({}),
                    donoData: JSON.stringify((await dbClient.getDonoData(req.user.username)).data.value),
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
                    premium: premium,
                    plus: plus,
                    enableLogging: req.user.enableLogging,
                    pairKey: req.user.api.pairKey ?? "",
                    pairKeyExpire: req.user.api.pairKeyExpire ?? "",
                    apiKey: req.user.api.apiKey ?? "",
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
            sunrise: sunrise,
        });
    });

    app.get("/about", async (req, res) => {
        let {sunrise: sunrise, sunset: sunset} = getSunriseAndSunset();

        res.render("viewer/about.ejs", {
            appearance: JSON.stringify({seasonalEffects: true}),
            page: "logged-out-home",
            sunset: sunset,
            sunrise: sunrise
        });
    });

    app.post("/joinbeta", [isLoggedIn], async (req, res) => {
        await dbClient.joinBeta(req.user.username);
        await dbClient.setRemoteAccess(req.user.username, req.body.activateWithRemoteAccess === "on" ? "allowed" : "denied");
        res.redirect(req.headers.referer);
    });

    app.post("/betafeatures", [isLoggedIn], async (req, res) => {
        await dbClient.updateBetaFeatures(req.user.username, Object.keys(req.body));
        res.redirect(req.headers.referer);
    });

    app.post("/leavebeta", [isLoggedIn], async (req, res) => {
        await dbClient.leaveBeta(req.user.username);
        res.redirect(req.headers.referer);
    });

    app.post("/setShowNonAcademic", [isLoggedIn], async (req, res) => {
        let show = req.body.showNonAcademic === "on";
        await dbClient.setShowNonAcademic(req.user.username, show);
        res.redirect(req.headers.referer);
    });

    app.post("/setShowEmpty", [isLoggedIn], async (req, res) => {
        let show = req.body.showEmpty === "on";
        await dbClient.setShowEmpty(req.user.username, show);
        console.log(req);
        res.redirect(req.headers.referer);
    })

    app.post("/weightedGPA", [isLoggedIn], async (req, res) => {
        let weightedGPA = JSON.parse(req.body.weightedGPA);
        await dbClient.setWeightedGPA(req.user.username, weightedGPA);
        res.sendStatus(200);
    });

    app.get("/viewuser", [isAdmin], async (req, res) => {
        if (req.query.usernameToRender) {
            let gradeHistoryLetters = {};
            let {term, semester} = (await dbClient.getMostRecentTermData(req.query.usernameToRender)).data.value;
            if (req.query.term && req.query.semester) {
                if ((term === req.query.term && semester === req.query.semester) || !(await dbClient.userHasSemester(req.query.usernameToRender, req.query.term, req.query.semester)).data.value) {
                    res.redirect("/viewuser?usernameToRender=" + req.query.usernameToRender);
                    return;
                }
                term = req.query.term;
                semester = req.query.semester;
            }
            let projection = {
                school: 1,
                schoolUsername: 1,
                isAdmin: 1,
                personalInfo: 1,
                appearance: 1,
                alerts: 1,
                schoolPassword: 1,
                grades: 1,
                [`weights.${term}.${semester}`]: 1,
                [`addedAssignments.${term}.${semester}`]: 1,
                [`editedAssignments.${term}.${semester}`]: 1,
                sortingData: 1,
                betaFeatures: 1,
                donoData: 1,
            };
            let user = (await dbClient.getUser(req.query.usernameToRender, projection)).data.value;
            if (user.alerts.remoteAccess === "denied") {
                res.redirect(req.headers.referer);
                return;
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

            let {sunrise: sunrise, sunset: sunset} = getSunriseAndSunset();

            if (term && semester) {
                let filteredGrades = user.appearance.showEmpty ? user.grades[term][semester] : user.grades[term][semester].filter(grades => !(["CR", false]).includes(grades.overall_letter) || grades.grades.length);
                let filteredWeights = user.weights[term][semester].filter(weights => !weights.className ? true : filteredGrades.map(g => g.class_name).includes(weights.className));

                let {plus, premium} = (await dbClient.getDonoAttributes(user.username)).data.value;
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
                    gradeData: JSON.stringify(filteredGrades),
                    weightData: JSON.stringify(filteredWeights),
                    emptyCount: user.grades[term][semester].length - filteredGrades.length,
                    addedAssignments: JSON.stringify(user.addedAssignments[term][semester]),
                    editedAssignments: JSON.stringify(user.editedAssignments[term][semester]),
                    gradeHistory: JSON.stringify(gradeHistoryLetters),
                    relevantClassData: JSON.stringify((await dbClient.getRelevantClassData(req.query.usernameToRender, term, semester)).data.value),
                    donoData: JSON.stringify(user.donoData),
                    sortingData: JSON.stringify(user.sortingData),
                    sessionTimeout: Date.parse(req.session.cookie._expires),
                    beta: server.beta,
                    betaFeatures: JSON.stringify(user.betaFeatures),
                    term: term,
                    semester: semester,
                    termsAndSemesters: JSON.stringify(Object.keys(user.grades).map(term => {
                        let semesters = Object.keys(user.grades[term]).filter(s => user.grades[term][s].filter(grades => !(["CR", false]).includes(grades.overall_letter) ||
                            grades.grades.length).length);
                        let sortedSemesters = semesters.sort((a, b) => {
                            return a.substring(1) < b.substring(1) ? -1 : 1;
                        });
                        return [term, sortedSemesters];
                    }).sort((a, b) => a[0].substring(3) < b[0].substring(3) ? -1 : 1)),
                    sunset: sunset,
                    sunrise: sunrise,
                    plus: plus,
                    premium: premium,
                    _: _,
                    enableLogging: true,
                    pairKey: user.api.pairKey ?? "",
                    pairKeyExpire: user.api.pairKeyExpire ?? "",
                    apiKey: user.api.apiKey ?? "",
                });
            } else {
                let {plus, premium} = (await dbClient.getDonoAttributes(user.username)).data.value;
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
                    emptyCount: 0,
                    addedAssignments: JSON.stringify({}),
                    editedAssignments: JSON.stringify({}),
                    gradeHistory: JSON.stringify([]),
                    relevantClassData: JSON.stringify({}),
                    donoData: JSON.stringify(user.donoData),
                    sortingData: JSON.stringify(user.sortingData),
                    sessionTimeout: Date.parse(req.session.cookie._expires),
                    beta: server.beta,
                    betaFeatures: JSON.stringify(user.betaFeatures),
                    term: "",
                    semester: "",
                    termsAndSemesters: JSON.stringify([]),
                    sunset: sunset,
                    sunrise: sunrise,
                    plus: plus,
                    premium: premium,
                    _: _,
                    enableLogging: true,
                    pairKey: user.api.pairKey ?? "",
                    pairKeyExpire: user.api.pairKeyExpire ?? "",
                    apiKey: user.api.apiKey ?? "",
                });
            }
            return;
        }
        res.redirect(req.headers.referer);
    });

    app.get("/logout", [isLoggedIn], (req, res) => {
        req.logout();
        res.redirect(req.headers.referer);
    });

    app.post("/archiveUser", [isAdmin], async (req, res) => {
        let username = req.body.deleteUser;
        console.log("Got request to archive: " + username);

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
        let resp = await dbClient.unArchiveUser(username);
        if (resp.success) {
            req.flash("adminSuccessMessage", resp.data.message);
        } else {
            req.flash("adminFailMessage", resp.data.message);
        }

        res.redirect("/admin");
    });

    app.post("/deleteUser", [isAdmin], async (req, res) => {
        let username = req.body.deleteUser;
        console.log("Got request to permanently delete: " + username);

        let resp = await dbClient.removeUserFromArchive(username);
        console.log(resp);
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
        let projection = {
            username: 1,
            schoolUsername: 1,
            personalInfo: 1,
            loggedIn: 1,
            'alerts.termsLastSeen': 1,
            'alerts.policyLastSeen': 1,
            'alerts.lastUpdated': 1,
            'alerts.remoteAccess': 1,
            'betaFeatures.active': 1,
            donoData: 1
        };
        let allUsers = (await dbClient.getAllUsers(projection)).data.value;
        let deletedUsers = (await dbClient.getAllArchivedUsers(projection)).data.value;
        let {sunrise: sunrise, sunset: sunset} = getSunriseAndSunset();
        res.render("admin/admin.ejs", {
            page: "admin",
            username: req.user.username,
            userList: JSON.stringify(allUsers),
            deletedUserList: JSON.stringify(deletedUsers),
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
        let result = changelog(server.beta);
        res.status(200).send(result);
    });

    app.get("/createPairingKey", [isLoggedIn], async (req, res) => {
        let resp = await dbClient.createPairingKey(req.user.username);
        if (resp.success) {
            res.status(200).send(resp.data.value);
        } else {
            res.status(400).send(resp.data.message);
        }
    });

    app.get("/deletePairingKey", [isLoggedIn], async (req, res) => {
        let resp = await dbClient.deletePairingKey(req.user.username);
        if (resp.success) {
            res.sendStatus(200);
        } else {
            res.status(400).send(resp.data.message);
        }
    });

    app.get("/deleteApiKey", [isLoggedIn], async (req, res) => {
        let resp = await dbClient.deleteApiKey(req.user.username);
        if (resp.success) {
            res.sendStatus(200);
        } else {
            res.status(400).send(resp.data.message);
        }
    });

    app.post("/updateShowMaxGPA", [isLoggedIn], async (req, res) => {
        let resp = await dbClient.setShowMaxGPA(req.user.username, JSON.parse(req.body.showMaxGPA));
        if (resp.success) {
            res.sendStatus(200);
        } else {
            res.sendStatus(400);
        }
    });

    app.post("/updateTutorialStatus", [isLoggedIn], async (req, res) => {
        let resp = await dbClient.updateTutorial(req.user.username, req.body.action + "Seen");
        if (resp.success) {
            res.status(200).send(JSON.stringify(resp.data.value));
        } else {
            res.sendStatus(400);
        }
    });

    app.post("/resetTutorial", [isLoggedIn], async (req, res) => {
        res.status(200).send(JSON.stringify((await dbClient.resetTutorial(req.user.username)).data.value));
    });

    app.post("/acceptPrivacyPolicy", [isLoggedIn], async (req, res) => {
        await dbClient.acceptPrivacyPolicy(req.user.username);
        res.redirect(req.headers.referer);
    });

    app.post("/acceptTerms", [isLoggedIn], async (req, res) => {
        await dbClient.acceptTerms(req.user.username);
        res.redirect(req.headers.referer);
    });

    app.post("/disableGradeSync", [isLoggedIn], async (req, res) => {
        let resp = await dbClient.disableGradeSync(req.user.username);
        if (resp.success) {
            res.sendStatus(200);
        } else {
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

    app.post("/changeschoolemail", [isLoggedIn], async (req, res) => {
        let new_school_email = req.body.school_email;
        let resp = await dbClient.changeSchoolEmail(req.user.username, new_school_email);
        if (resp.success) {
            res.status(200).send(resp.data.message);
        } else {
            res.status(400).send(resp.data.message);
        }
    });

    app.post("/updateAddedAssignments", [isLoggedIn], async (req, res) => {
        let data = req.body.data;
        let term = req.body.term;
        let semester = req.body.semester;
        let resp = await dbClient.updateAddedAssignments(req.user.username, JSON.parse(data), term, semester);
        if (resp.success) {
            res.sendStatus(200);
        } else {
            res.sendStatus(400);
        }
    });

    app.post("/updateEditedAssignments", [isLoggedIn], async (req, res) => {
        let data = req.body.data;
        let term = req.body.term;
        let semester = req.body.semester;
        let resp = await dbClient.updateEditedAssignments(req.user.username, JSON.parse(data), term, semester);
        if (resp.success) {
            res.sendStatus(200);
        } else {
            res.sendStatus(400);
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
        let {sunrise: sunrise, sunset: sunset} = getSunriseAndSunset();

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
        await dbClient.setColorPalette(username, "clear", false);

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

    app.post("/updateweights", [isLoggedIn], async (req, res) => {
        let className = req.body.className;
        let hasWeights = JSON.parse(req.body.hasWeights);
        let newWeights = JSON.parse(req.body.newWeights);
        let term = req.body.term;
        let semester = req.body.semester;
        let resp = await dbClient.updateWeightsForClass(req.user.username, term, semester, className, hasWeights, newWeights);
        if (resp.success) {
            res.status(200).send(resp.data.message);
            await dbClient.updateClassesForUser(req.user.username, term, semester, className);
        } else {
            res.status(400).send(resp.data.message);
        }
    });

    app.post("/updateclassweights", [isAdmin], async (req, res) => {
        let school = req.query.school ?? "bellarmine";
        let resp = await dbClient.updateWeightsInClassDb(school, req.body.term, req.body.semester, req.body.className, req.body.teacherName, JSON.parse(req.body.hasWeights), req.body.weights);
        if (resp.success) {
            res.status(200).send(resp.data);
        } else {
            res.status(400).send(resp.data);
        }
    });

    app.post("/updateclasstype", [isAdmin], async (req, res) => {
        let school = req.query.school ?? "bellarmine";
        let resp = await dbClient.updateClassTypeInClassDb(school, req.body.term, req.body.semester, req.body.className, req.body.classType);
        if (resp.success) {
            res.status(200).send(resp.data);
        } else {
            res.status(400).send(resp.data);
        }
    });

    app.post("/updateuccsuclasstype", [isAdmin], async (req, res) => {
        let school = req.query.school ?? "bellarmine";
        let resp = await dbClient.updateUCCSUClassTypeInClassDb(school, req.body.term, req.body.semester, req.body.className, req.body.classType);
        if (resp.success) {
            res.status(200).send(resp.data);
        } else {
            res.status(400).send(resp.data);
        }
    });

    app.post("/addDonation", [isAdmin], async (req, res) => {
        let data = JSON.parse(req.body.data);
        let resp = await dbClient.addDonation(data.username, data.platform, data.paidValue, data.receivedValue, data.dateDonated);
        if (resp.success) {
            res.status(200).send(resp.data);
        } else {
            res.status(400).send(resp.data);
        }
    });

    app.post("/removeDonation", [isAdmin], async (req, res) => {
        let data = req.body;
        let resp = await dbClient.removeDonation(data.username, data.index);
        if (resp.success) {
            res.status(200).send(resp.data);
        } else {
            res.status(400).send(resp.data);
        }
    });

    app.post("/setColorPalette", [isLoggedIn], async (req, res) => {
        let resp = await dbClient.setColorPalette(req.user.username, req.body.preset, JSON.parse(req.body.shuffleColors));
        if (resp.success) {
            res.status(200).send(resp.data.colors);
        } else {
            res.sendStatus(400);
        }
    });

    app.get("/finalgradecalculator", async (req, res) => {

        let {sunrise: sunrise, sunset: sunset} = getSunriseAndSunset();

        if (req.isAuthenticated()) {

            let {term, semester} = (await dbClient.getMostRecentTermData(req.user.username)).data.value;
            let {plus, premium} = (await dbClient.getDonoAttributes(req.user.username)).data.value;
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
                    sunrise: sunrise,
                    plus: plus,
                    premium: premium,
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
                    sunrise: sunrise,
                    plus: plus,
                    premium: premium,
                });
            }
        } else {
            req.session.returnTo = req.originalUrl;
            res.render("viewer/final_grade_calculator_logged_out.ejs", {
                appearance: JSON.stringify({seasonalEffects: true}),
                page: "logged_out_calc",
                beta: JSON.stringify(server.beta),
                sunset: sunset,
                sunrise: sunrise,
            });
        }

    });

    app.post("/setRemoteAccess", [isLoggedIn], async (req, res) => {
        let allowed = req.body.remoteAccess === "on" ? "allowed" : "denied";
        await dbClient.setRemoteAccess(req.user.username, allowed);
        res.status(200).send(allowed[0].toUpperCase() + allowed.substring(1) + " remote access.");
    });

    app.post("/setPersonalInfo", [isLoggedIn], async (req, res) => {
        let resp = await dbClient.setPersonalInfo(req.user.username, req.body.firstName, req.body.lastName, req.body.graduationYear);
        res.status(resp.success ? 200 : 400).send(resp.data.message);
    });

    app.get("/betakeys", [isAdmin], async (req, res) => {

        let {sunrise: sunrise, sunset: sunset} = getSunriseAndSunset();

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

    app.get("/latestVersion", [isLoggedIn], async (req, res) => {
        res.status(200).send((await dbClient.getWhatsNew(req.user.username)).data.value);
    });

    app.post("/latestVersionSeen", [isLoggedIn], async (req, res) => {
        await dbClient.latestVersionSeen(req.user.username, server.beta);
        res.sendStatus(200);
    });

    app.post("/newbetakey", [isAdmin], async (req, res) => {
        let resp = await dbClient.addBetaKey();

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

    app.get("/classes", [isAdmin], async (req, res) => {
        let {sunrise: sunrise, sunset: sunset} = getSunriseAndSunset();

        let school = req.query.school ?? "bellarmine";
        if (!Object.values(Schools).includes(school)) {
            res.redirect("/classes");
            return;
        }

        let termsRes = (await (dbClient.getMostRecentTermDataInClassDb(school)));
        if (!termsRes.success) {
            res.redirect("/classes");
            return;
        }
        let {term, semester} = termsRes.data.value;

        if (req.query.term && req.query.semester) {
            let dbContainsSemester = (await dbClient.dbContainsSemester(school, req.query.term, req.query.semester)).success;
            if ((term === req.query.term && semester === req.query.semester) || !dbContainsSemester) {
                res.redirect("/classes");
                return;
            }
            term = req.query.term;
            semester = req.query.semester;
        }

        let {classData, catalogData} = (await dbClient.getAllClassData(school, term, semester)).data;

        res.render("admin/classes.ejs", {
            username: req.user.username,
            page: "classes",
            classData: classData,
            catalogData: catalogData,
            sessionTimeout: Date.parse(req.session.cookie._expires),
            appearance: JSON.stringify(req.user.appearance),
            beta: server.beta,
            schools: Object.values(Schools),
            school: school,
            term: term,
            semester: semester,
            termsAndSemesters: JSON.stringify((await dbClient.getTermsAndSemestersInClassDb(school)).data.value),
            sunset: sunset,
            sunrise: sunrise,
            _: _
        });
    });

    app.get("/charts", async (req, res) => {
        let {sunrise: sunrise, sunset: sunset} = getSunriseAndSunset();
        let {data: {loginData, uniqueLoginData, syncData, userData, activeUsersData, gradData, schoolData, lastUpdated}} = await dbClient.getChartData();
        if (req.isAuthenticated()) {
            let {plus, premium} = (await dbClient.getDonoAttributes(req.user.username)).data.value;
            res.render("viewer/cool_charts.ejs", {
                username: req.user.username,
                personalInfo: JSON.stringify(req.user.personalInfo),
                appearance: JSON.stringify(req.user.appearance),
                sessionTimeout: Date.parse(req.session.cookie._expires),
                page: "charts",
                loginData: JSON.stringify(loginData),
                uniqueLoginData: JSON.stringify(uniqueLoginData),
                syncData: JSON.stringify(syncData),
                userData: JSON.stringify(userData),
                activeUsersData: JSON.stringify(activeUsersData),
                schoolData: JSON.stringify(schoolData),
                gradData: JSON.stringify(gradData),
                sunset: sunset,
                sunrise: sunrise,
                plus: plus,
                premium: premium,
                lastUpdated: lastUpdated.getTime(),
                SchoolAbbr: JSON.stringify(SchoolAbbr),
                PrettySchools: JSON.stringify(PrettySchools),
                _: _
            });
        } else {
            res.render("viewer/cool_charts.ejs", {
                page: "charts-logged-out",
                appearance: JSON.stringify({seasonalEffects: true, theme: 'sun'}),
                loginData: JSON.stringify(loginData),
                uniqueLoginData: JSON.stringify(uniqueLoginData),
                syncData: JSON.stringify(syncData),
                userData: JSON.stringify(userData),
                activeUsersData: JSON.stringify(activeUsersData),
                schoolData: JSON.stringify(schoolData),
                gradData: JSON.stringify(gradData),
                sunset: sunset,
                sunrise: sunrise,
                lastUpdated: lastUpdated.getTime(),
                SchoolAbbr: JSON.stringify(SchoolAbbr),
                PrettySchools: JSON.stringify(PrettySchools),
                premium: false,
                _: _
            });
        }
    });

    app.post("/updateSortData", [isLoggedIn, inRecentTerm], async (req, res) => {
        let username = req.user.username;
        let sortData = JSON.parse(req.body.sortingData);
        await dbClient.updateSortData(username, sortData);
        res.sendStatus(200);
    });

    app.post("/usernameAvailable", async (req, res) => {
        let username = req.body.username.toLowerCase();
        let resp = await dbClient.usernameAvailable(username);
        if (resp.success) {
            res.status(200).send(resp.data.message);
        } else {
            res.status(400).send(resp.data.message);
        }
    });

    app.post("/emailAvailable", async (req, res) => {
        let schoolUsername = req.body.schoolUsername.toLowerCase();
        let resp = await dbClient.schoolUsernameAvailable(schoolUsername);
        if (resp.success) {
            res.status(200).send(resp.data.message);
        } else {
            res.status(400).send(resp.data.message);
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

    app.get("/reset_password", async (req, res) => {

        let resetToken = req.query.token;
        let {sunrise: sunrise, sunset: sunset} = getSunriseAndSunset();

        let {user, valid: validToken, gradeSync: gradeSync} = (await dbClient.checkPasswordResetToken(resetToken)).data;
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
            page: "passwordReset",
            school: user.school,
        });
    });

    app.post("/reset_password", async (req, res) => {

        let resetToken = req.body.token;
        if (!resetToken) {
            res.redirect(req.headers.referer);
            return;
        }

        let {sunrise: sunrise, sunset: sunset} = getSunriseAndSunset();
        let newPass = req.body.password;
        let resp = await dbClient.resetPassword(resetToken, newPass);
        if (!resp.success && resp.data.message === "Invalid token.") {
            res.status(404).render("password_reset/reset_password_404.ejs", {
                sunset: sunset,
                appearance: JSON.stringify({seasonalEffects: true}),
                sunrise: sunrise,
                page: "password404"
            });
            return;
        }
        if (!resp.success) {
            req.flash("resetPasswordMsg", resp.data.message);
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
            res.redirect(req.headers.referer);
            return;
        }

        let {sunrise: sunrise, sunset: sunset} = getSunriseAndSunset();
        res.status(200).render("password_reset/forgot_password.ejs", {
            message: req.flash("forgotPasswordMsg"),
            sunset: sunset,
            appearance: JSON.stringify({seasonalEffects: true}),
            page: "passwordForgot",
            sunrise: sunrise
        });
    });

    app.post("/forgot_password", async (req, res) => {
        let email = req.body.email;
        let {user, token} = (await dbClient.resetPasswordRequest(email)).data;

        if (user) {
            emailSender.sendPasswordResetToAccountOwner(email, "https://" + req.headers.host + "/reset_password?token=" + token, user.personalInfo.firstName);
        } else {
            // this doesn't do anything
            emailSender.sendPasswordResetToNonUser(email, "https://" + req.headers.host + "/reset_password?token=" + token);
        }
        req.flash("forgotPasswordMsg", "If the email address you entered is associated with an account, you should receive an email containing a link to reset your password. Please make sure to check your spam folder. If you run into any issues, contact <b><a href='mailto:support@graderoom.me'>support@graderoom.me</a></b>.");
        res.redirect("/forgot_password");
    });

    /** Api stuff (maybe temp) */
    // app.get("/api/status", [isApiLoggedIn], (req, res) => {
    //     res.sendStatus(200);
    // });
    //
    // app.get("/api/settings", [isApiLoggedIn], (req, res) => {
    //     let {sunrise: sunrise, sunset: sunset} = getSunriseAndSunset();
    //     sunrise = sunrise.getTime();
    //     sunset = sunset.getTime();
    //     let settings = {
    //         username: req.user.username,
    //         schoolUsername: req.user.schoolUsername,
    //         isAdmin: req.user.isAdmin,
    //         personalInfo: JSON.stringify(req.user.personalInfo),
    //         appearance: JSON.stringify(req.user.appearance),
    //         alerts: JSON.stringify(req.user.alerts),
    //         gradeSync: !!req.user.schoolPassword,
    //         sortingData: JSON.stringify(req.user.sortingData),
    //         beta: server.beta,
    //         betaFeatures: JSON.stringify(req.user.betaFeatures),
    //         sunset: sunset,
    //         sunrise: sunrise
    //     };
    //     res.status(200).send(JSON.stringify(settings));
    // });

    // app.get("/api/general", [isApiLoggedIn], async (req, res) => {
    //     let gradeHistoryLetters = {};
    //     let {term, semester} = (await dbClient.getMostRecentTermData(req.user.username)).data.value;
    //     for (let i = 0; i < Object.keys(req.user.grades).length; i++) {
    //         let t = Object.keys(req.user.grades)[i];
    //         gradeHistoryLetters[t] = {};
    //         for (let j = 0; j < Object.keys(req.user.grades[t]).length; j++) {
    //             let s = Object.keys(req.user.grades[t])[j];
    //             if (t.substring(0, 2) > term.substring(0, 2) || (t.substring(0, 2) === term.substring(0, 2) && s.substring(1) > semester.substring(1))) {
    //                 continue;
    //             }
    //             gradeHistoryLetters[t][s] = [];
    //             for (let k = 0; k < req.user.grades[t][s].length; k++) {
    //                 let next = {};
    //                 next[req.user.grades[t][s][k].class_name] = req.user.grades[t][s][k].overall_letter;
    //                 gradeHistoryLetters[t][s].push(next);
    //             }
    //         }
    //     }
    //     let data = {
    //         termsAndSemesters: JSON.stringify(Object.keys(req.user.grades).map(term => {
    //             let semesters = Object.keys(req.user.grades[term]).filter(s => req.user.grades[term][s].filter(grades => !(["CR", false]).includes(grades.overall_letter) ||
    // grades.grades.length).length); let sortedSemesters = semesters.sort((a, b) => { return a.substring(1) < b.substring(1) ? -1 : 1; }); return [term, sortedSemesters]; }).sort((a, b) =>
    // a[0].substring(3) < b[0].substring(3) ? -1 : 1)), term: term, semester: semester, gradeData: JSON.stringify(req.user.grades[term][semester].filter(grades => !(["CR",
    // false]).includes(grades.overall_letter) || grades.grades.length)), weightData: JSON.stringify(req.user.weights[term][semester]), addedAssignments:
    // JSON.stringify(req.user.addedAssignments[term][semester]), editedAssignments: JSON.stringify(req.user.editedAssignments[term][semester]), gradeHistory: JSON.stringify(gradeHistoryLetters),
    // relevantClassData: JSON.stringify((await dbClient.getRelevantClassData(req.user.username, term, semester)).data.value) }; res.status(200).send(JSON.stringify(data)); });

    // app.get("/api/grades", [isApiLoggedIn], async (req, res) => {
    //     let {term, semester} = (await dbClient.getMostRecentTermData(req.user.username)).data.value;
    //     res.status(200).send(JSON.stringify(req.user.grades[term][semester].filter(grades => !(["CR", false]).includes(grades.overall_letter) || grades.grades.length)));
    // });

    // app.get("/api/checkUpdateBackground", [isApiLoggedIn], async (req, res) => {
    //     let resp = await dbClient.getSyncStatus(req.user.username);
    //     let user = (await dbClient.getUser(req.user.username)).data.value;
    //     let {term, semester} = (await dbClient.getMostRecentTermData(req.user.username)).data.value;
    //     if (term && semester && resp.data.message === "Sync Complete!") {
    //         res.status(200).send({
    //                                  message: resp.data.message,
    //                                  grades: JSON.stringify(user.grades[term][semester].filter(grades => !(["CR", false]).includes(grades.overall_letter) || grades.grades.length)),
    //                                  weights: JSON.stringify(user.weights[term][semester]),
    //                                  updateData: JSON.stringify(user.alerts.lastUpdated.slice(-1)[0])
    //                              });
    //     } else if (term && semester && resp.data.message === "Already Synced!") {
    //         res.status(200).send({
    //                                  message: resp.data.message,
    //                                  updateData: JSON.stringify(user.alerts.lastUpdated.slice(-1)[0])
    //                              });
    //     } else {
    //         res.status(200).send({
    //                                  message: resp.data.message
    //                              });
    //     }
    // });

    // function isApiLoggedIn(req, res, next) {
    //     if (req.isAuthenticated()) {
    //         return next();
    //     }
    //     res.sendStatus(401);
    // }

    // app.post("/api/login", (req, res, next) => {
    //     passport.authenticate("local-login", (err, user) => {
    //         if (err) {
    //             return next(err);
    //         }
    //         if (!user) {
    //             return res.sendStatus(401);
    //         }
    //         req.logIn(user, (err) => {
    //             if (err) {
    //                 return next(err);
    //             }
    //             return res.sendStatus(200);
    //         });
    //     })(req, res, next);
    // });

    // app.get("/api/logout", (req, res) => {
    //     req.logout();
    //     res.sendStatus(200);
    // });
    /** End api stuff */

    // Actual api stuff?
    app.post("/api/pair", async (req, res) => {
        let pairingKey = req.body.pairingKey;
        let resp = await dbClient.apiPair(pairingKey);
        if (!resp.success) {
            res.status(400).send(resp.data.message);
        } else {
            res.status(200).send(resp.data.value);
        }
    });

    app.get("/api/info", async (req, res) => {
        let apiKey = req.headers['x-api-key'];
        let resp = await dbClient.apiInfo(apiKey);
        if (!resp.success) {
            if (resp.data.message === "Authentication failed") {
                res.status(401).send(resp.data.message);
            } else {
                res.status(400).send(resp.data.message);
            }
        } else {
            res.status(200).send(resp.data);
        }
    });

    app.get("/api/*", (req, res) => {
        res.sendStatus(404);
    });

    app.post("/api/*", (req, res) => {
        res.sendStatus(404);
    });

    // general web app

    app.get("/*", (req, res) => {
        req.session.returnTo = req.originalUrl;
        res.redirect(req.headers.referer);
    });

    // route middleware to ensure user is logged in
    function isLoggedIn(req, res, next) {
        if (!(["/", "/admin", "/logout"]).includes(req._parsedOriginalUrl.path) && req.headers.referer && req.headers.referer.includes("viewuser")) {
            res.sendStatus(405);
            return;
        }
        if (req.isAuthenticated()) {
            return next();
        }
        res.redirect("/");
    }

    // temp middleware to prevent routes from happening if using query to view old semesters
    async function inRecentTerm(req, res, next) {
        let url = req.headers.referer;
        let props = Object.fromEntries(url.includes("?") ? url.split("?")[1].split("&").map(prop => prop.split("=")) : []);
        if (props.term && props.semester && !(await dbClient.userHasSemester(req.user.username, props.term, props.semester)).data.value) {
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

function getSunriseAndSunset() {
    const SAN_JOSE_CA = {lat: 37, lng: -122};
    let times = SunCalc.getTimes(new Date(), SAN_JOSE_CA.lat, SAN_JOSE_CA.lng);
    let sunrise = new Date("0/" + times.sunrise.getHours() + ":" + times.sunrise.getMinutes());
    let sunset = new Date("0/" + times.sunset.getHours() + ":" + times.sunset.getMinutes());
    return {sunrise: sunrise, sunset: sunset};
}
