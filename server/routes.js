const server = require("./graderoom.js");
const dbClient = require("./dbClient.js");
const emailSender = require("./emailSender.js");
const _ = require("lodash");

const https = require("https");
const {changelog, changelogLegend, latestVersion, donoAttributes, effectiveSyncPeriod, minSyncPeriod, syncPeriodOptions, sessionRememberPeriod} = require("./dbHelpers");
const {Schools, PrettySchools, SchoolAbbr, Constants} = require("./enums");
const {checkReturnTo, isLoggedIn, isAdmin, isInternalApiAuthenticated, inRecentTerm} = require("./middleware");

function verifyRecaptcha(token) {
    return new Promise((resolve) => {
        const params = new URLSearchParams({
            secret: process.env.RECAPTCHA_SECRET_KEY,
            response: token
        }).toString();
        const options = {
            hostname: "www.google.com",
            path: "/recaptcha/api/siteverify",
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Content-Length": Buffer.byteLength(params)
            }
        };
        const req = https.request(options, (res) => {
            let data = "";
            res.on("data", (chunk) => data += chunk);
            res.on("end", () => {
                try {
                    resolve(JSON.parse(data).success === true);
                } catch {
                    resolve(false);
                }
            });
        });
        req.on("error", () => resolve(false));
        req.write(params);
        req.end();
    });
}

// Every key authorized_index.ejs renders with. Also served as JSON to the app
async function buildUserPayload(req, term, semester, gradeSync, history) {
    let user = req.user;
    let {plus, premium} = donoAttributes(user.donoData);
    let hasTerm = !!(term && semester);

    let grades = hasTerm ? (await dbClient.getAllGrades(user.username)).data.value : {};
    let relevantClassData = hasTerm ? (await dbClient.getRelevantClassData(user.username, term, semester)).data.value : {};
    let gradeData = hasTerm ? grades[term][semester] : [];

    let termsAndSemesters = Object.keys(grades).map(term => {
        let semesters = Object.keys(grades[term]);
        let sortedSemesters = semesters.sort((a, b) => {
            return a.substring(1) < b.substring(1) ? -1 : 1;
        });
        return [term, sortedSemesters];
    }).sort((a, b) => a[0].substring(3) < b[0].substring(3) ? -1 : 1);

    return {
        page: "home",
        syncInterval: effectiveSyncPeriod(user.donoData, user.syncPeriod),
        syncMinInterval: minSyncPeriod(user.donoData),
        _syncPeriodOptions: syncPeriodOptions.filter(o => o >= minSyncPeriod(user.donoData)),
        history: hasTerm ? history : false,
        school: user.school,
        username: user.username,
        schoolUsername: user.schoolUsername,
        isAdmin: user.isAdmin,
        _personalInfo: user.personalInfo,
        _appearance: user.appearance,
        _alerts: hasTerm ? (await dbClient.getTrimmedAlerts(user.username, term, semester)).data.value : (await dbClient.getAllAlerts(user.username)).data.value,
        _updatedGradeHistory: user.updatedGradeHistory,
        discordID: user.discord.discordID,
        gradeSync: gradeSync,
        _gradeData: gradeData,
        _weightData: hasTerm ? (await dbClient.getSemesterWeights(user.username, term, semester)).data.value : {},
        _addedWeights: hasTerm ? (await dbClient.getSemesterAddedWeights(user.username, term, semester)).data.value : {},
        nonAcademicCount: Object.entries(relevantClassData).filter(([k, v]) => gradeData.find(c => c.class_name === k) && v.classType === "non-academic").length,
        _addedAssignments: hasTerm ? (await dbClient.getSemesterAddedAssignments(user.username, term, semester)).data.value : {},
        _editedAssignments: hasTerm ? (await dbClient.getSemesterEditedAssignments(user.username, term, semester)).data.value : {},
        _gradeHistory: hasTerm ? (await dbClient.getGradeHistoryLetters(user.username, term, semester)).data.value : [],
        _relevantClassData: relevantClassData,
        _donoData: user.donoData,
        _sortingData: user.sortingData,
        sessionTimeout: Date.parse(req.session.cookie._expires),
        beta: server.beta,
        _betaFeatures: user.betaFeatures,
        _SchoolAbbr: SchoolAbbr,
        _noGpaLetters: Constants.noGpaLetters,
        term: hasTerm ? term : "",
        semester: hasTerm ? semester : "",
        _termsAndSemesters: termsAndSemesters,
        _: _,
        premium: premium,
        plus: plus,
        enableLogging: user.enableLogging,
    };
}

const allowedBackgrounds = Constants.themes.backgrounds.names.all;

function getDailyLoggedOutBackground() {
    const backgrounds = allowedBackgrounds.filter(b => b !== "default");
    const today = new Date();
    const dayIndex = Math.floor(today.getTime() / (24 * 60 * 60 * 1000));
    return backgrounds[dayIndex % backgrounds.length] ?? "default";
}

function loggedOutAppearance(extra) {
    const bg = getDailyLoggedOutBackground();
    return Object.assign({seasonalEffects: true, background: bg, allowPaidBackgrounds: true}, extra);
}

function appearanceForRender(appearance, attrs = {}) {
    const copy = Object.assign({}, appearance);
    const {plus: plusThemes, premium: premiumThemes} = Constants.themes.names;
    const {plus: plusBackgrounds, premium: premiumBackgrounds} = Constants.themes.backgrounds.names;
    const allowPaidBackgrounds = copy.allowPaidBackgrounds === true;
    delete copy.allowPaidBackgrounds;

    if (!attrs.premium) {
        if (premiumThemes.includes(copy.lightTheme)) {
            copy.lightTheme = "light";
        }
        if (premiumThemes.includes(copy.darkTheme)) {
            copy.darkTheme = "dark";
        }
    }
    if (!attrs.plus) {
        if (plusThemes.includes(copy.lightTheme)) {
            copy.lightTheme = "light";
        }
        if (plusThemes.includes(copy.darkTheme)) {
            copy.darkTheme = "dark";
        }
        if (!allowPaidBackgrounds && plusBackgrounds.includes(copy.background)) {
            copy.background = "default";
        }
    }
    if (!allowPaidBackgrounds && !attrs.premium && premiumBackgrounds.includes(copy.background)) {
        copy.background = attrs.plus ? "aurora" : "default";
    }

    return copy;
}

function renderWithConstants(res, view, data = {}) {
    const renderData = Object.assign({_themeConstants: Constants.themes, testExtensionID: process.env.TEST_EXTENSION_ID || ''}, data);
    if (renderData._appearance) {
        renderData._appearance = appearanceForRender(renderData._appearance, {plus: renderData.plus === true, premium: renderData.premium === true});
    }
    res.render(view, renderData);
}

module.exports = function (app, passport) {

    // normal routes ===============================================================

    // show the home page (will also have our login links)
    app.get("/", [checkReturnTo], async (req, res) => {


        if (req.isAuthenticated()) {
            req.session.touch();
            if (req.session.returnTo) {
                res.redirect(req.session.returnTo);
                delete req.session.returnTo;
                return;
            }

            let {term, semester} = (await dbClient.getMostRecentTermData(req.user.username)).data.value;
            if (req.query.term && req.query.semester) {
                if ((term === req.query.term && semester === req.query.semester) || !(await dbClient.userHasSemester(req.user.username, req.query.term, req.query.semester)).data.value) {
                    res.redirect("/");
                    return;
                }
                term = req.query.term;
                semester = req.query.semester;
            }

            let gradeSync = (await dbClient.getGradeSync(req.user.username)).data.value;

            renderWithConstants(res, "user/authorized_index.ejs", await buildUserPayload(req, term, semester, gradeSync, req.query.term || req.query.semester));
            return;
        }
        renderWithConstants(res, "viewer/index.ejs", {
            message: req.flash("loginMessage"),
            beta: server.beta,
            _appearance: loggedOutAppearance(),
            page: "login",
        });
    });

    app.get("/apple-touch-icon.png", (req, res) => {
        res.sendFile("/public/resources/common/pwa-icon-120.png", {root: "./"});
    });

    app.get("/theme/background.css", async (req, res) => {
        const allowedThemes = Constants.themes.names.fixed;
        const theme = allowedThemes.includes(req.query.theme) ? req.query.theme : null;
        if (!theme) {
            return res.sendStatus(404);
        }
        if (Constants.themes.names.paid.includes(theme)) {
            if (!req.user) {
                return res.sendStatus(403);
            }
            const attrs = donoAttributes(req.user.donoData);
            if (Constants.themes.names.premium.includes(theme) && !attrs.premium) {
                return res.sendStatus(403);
            }
            if (Constants.themes.names.plus.includes(theme) && !attrs.plus) {
                return res.sendStatus(403);
            }
        }

        const appearance = req.user?.appearance;
        const background = req.user ? appearance.background : req.query.background;
        if (!allowedBackgrounds.includes(background)) {
            return res.sendStatus(404);
        }
        if (Constants.themes.backgrounds.names.paid.includes(background)) {
            if (req.user) {
                const attrs = donoAttributes(req.user.donoData);
                if (Constants.themes.backgrounds.names.premium.includes(background) && !attrs.premium) {
                    return res.sendStatus(403);
                }
                if (Constants.themes.backgrounds.names.plus.includes(background) && !attrs.plus) {
                    return res.sendStatus(403);
                }
            }
        }
        if (background === "default") {
            return res.type("text/css").send("");
        }

        res.sendFile(`/public/css/themes/${theme}/backgrounds/${background}.css`, {root: "./"});
    });

    app.post("/assignmentAverage", [isLoggedIn], async (req, res) => {
        let resp = await dbClient.getAssignmentAverage(req.user.username, req.body.term, req.body.semester, req.body.className, req.body.assignmentPSAID);
        if (!resp.success) {
            return res.sendStatus(400);
        }

        res.status(200).send(resp.data.value);
    });

    app.post("/userCounts", [isLoggedIn], async (req, res) => {
        let resp = await dbClient.getUserCounts(req.user.username, req.body.term, req.body.semester, req.body.className);
        if (!resp.success) {
            return res.sendStatus(400);
        }

        res.status(200).send(resp.data.value);
    });

    app.get("/terms", async (req, res) => {
        renderWithConstants(res, "viewer/terms_and_conditions.ejs");
    });

    app.get("/privacy", async (req, res) => {
        renderWithConstants(res, "viewer/privacy_policy.ejs");
    });

    app.get("/about", async (req, res) => {


        renderWithConstants(res, "viewer/about.ejs", {
            _appearance: loggedOutAppearance(),
            page: "logged-out-home",
        });
    });

    app.post("/joinbeta", [isLoggedIn], async (req, res) => {
        await dbClient.joinBeta(req.user.username, req.user.school);
        await dbClient.setRemoteAccess(req.user.username, req.body.activateWithRemoteAccess === "on" ? "allowed" : "denied");
        res.redirect(req.headers.referer ?? "/");
    });

    app.post("/betafeatures", [isLoggedIn], async (req, res) => {
        await dbClient.updateBetaFeatures(req.user.username, req.user.school, Object.keys(req.body));
        res.redirect(req.headers.referer ?? "/");
    });

    app.post("/leavebeta", [isLoggedIn], async (req, res) => {
        await dbClient.leaveBeta(req.user.username);
        res.redirect(req.headers.referer ?? "/");
    });

    app.post("/setShowNonAcademic", [isLoggedIn], async (req, res) => {
        let show = req.body.showNonAcademic === "on";
        await dbClient.setShowNonAcademic(req.user.username, show);
        res.redirect(req.headers.referer ?? "/");
    });

    app.post("/weightedGPA", [isLoggedIn], async (req, res) => {
        await dbClient.setWeightedGPA(req.user.username, req.body.weightedGPA);
        res.sendStatus(200);
    });

    app.get("/viewuser", [isAdmin], async (req, res) => {
        if (req.query.usernameToRender) {
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
                "alerts.remoteAccess": 1,
            };
            let user = (await dbClient.getUser(req.query.usernameToRender, projection)).data.value;
            if (user.alerts.remoteAccess === "denied") {
                res.redirect(req.headers.referer ?? "/");
                return;
            }

            projection = {
                school: 1,
                schoolUsername: 1,
                isAdmin: 1,
                personalInfo: 1,
                appearance: 1,
                schoolPassword: 1,
                grades: 1,
                "alerts.latestSeen": 1,
                "alerts.policyLastSeen": 1,
                "alerts.termsLastSeen": 1,
                "alerts.remoteAccess": 1,
                "alerts.tutorialStatus": 1,
                "alerts.notifications": 1,
                "alerts.notificationSettings": 1,
                [`weights.${term}.${semester}`]: 1,
                [`addedAssignments.${term}.${semester}`]: 1,
                [`editedAssignments.${term}.${semester}`]: 1,
                [`addedWeights.${term}.${semester}`]: 1,
                sortingData: 1,
                betaFeatures: 1,
                donoData: 1,
                syncPeriod: 1,
                "discord.discordID": 1,
                updatedGradeHistory: 1
            };
            user = (await dbClient.getUser(req.query.usernameToRender, projection)).data.value;

    

            if (term && semester) {
                let {plus, premium} = donoAttributes(user.donoData);
                let relevantClassData = (await dbClient.getRelevantClassData(user.username, term, semester)).data.value;
                let gradeHistoryLetters = (await dbClient.getGradeHistoryLetters(user.username, term, semester)).data.value;
                let trimmedAlerts = (await dbClient.getTrimmedAlerts(user.username, term, semester)).data.value;

                let termsAndSemesters = Object.keys(user.grades).map(term => {
                    let semesters = Object.keys(user.grades[term]);
                    let sortedSemesters = semesters.sort((a, b) => {
                        return a.substring(1) < b.substring(1) ? -1 : 1;
                    });
                    return [term, sortedSemesters];
                }).sort((a, b) => a[0].substring(3) < b[0].substring(3) ? -1 : 1);
                renderWithConstants(res, "user/authorized_index.ejs", {
                    page: "home",
                    syncInterval: effectiveSyncPeriod(user.donoData, user.syncPeriod),
                    syncMinInterval: minSyncPeriod(user.donoData),
                    _syncPeriodOptions: syncPeriodOptions.filter(o => o >= minSyncPeriod(user.donoData)),
                    history: req.query.term || req.query.semester,
                    school: user.school,
                    username: user.username,
                    schoolUsername: user.schoolUsername,
                    isAdmin: user.isAdmin,
                    _personalInfo: user.personalInfo,
                    _appearance: user.appearance,
                    _alerts: trimmedAlerts,
                    _updatedGradeHistory: user.updatedGradeHistory,
                    discordID: user.discord.discordID,
                    gradeSync: user.school === Schools.BELL || user.schoolPassword,
                    _gradeData: user.grades[term][semester],
                    _weightData: user.weights[term][semester],
                    _addedWeights: user.addedWeights[term][semester],
                    nonAcademicCount: Object.entries(relevantClassData).filter(([k, v]) => user.grades[term][semester].find(c => c.class_name === k) && v.classType === "non-academic").length,
                    _addedAssignments: user.addedAssignments[term][semester],
                    _editedAssignments: user.editedAssignments[term][semester] ,
                    _gradeHistory: gradeHistoryLetters,
                    _relevantClassData: relevantClassData,
                    _donoData: user.donoData,
                    _sortingData: user.sortingData,
                    sessionTimeout: Date.parse(req.session.cookie._expires),
                    beta: server.beta,
                    _betaFeatures: user.betaFeatures,
                    _SchoolAbbr: SchoolAbbr,
                    _noGpaLetters: Constants.noGpaLetters,
                    term: term,
                    semester: semester,
                    _termsAndSemesters: termsAndSemesters,
                    plus: plus,
                    premium: premium,
                    _: _,
                    enableLogging: true,
                });
            } else {
                let {plus, premium} = donoAttributes(user.donoData);
                renderWithConstants(res, "user/authorized_index.ejs", {
                    page: "home",
                    history: false,
                    school: user.school,
                    username: user.username,
                    schoolUsername: user.schoolUsername,
                    isAdmin: user.isAdmin,
                    _personalInfo: user.personalInfo,
                    _appearance: user.appearance,
                    _alerts: user.alerts,
                    _updatedGradeHistory: user.updatedGradeHistory,
                    discord: user.discord.discordID,
                    gradeSync: user.school === Schools.BELL || user.schoolPassword,
                    _gradeData: [],
                    _weightData: {},
                    _addedWeights: {},
                    nonAcademicCount: 0,
                    _addedAssignments: {},
                    _editedAssignments: {},
                    _gradeHistory: [],
                    _relevantClassData: {},
                    _donoData: user.donoData,
                    _sortingData: user.sortingData,
                    sessionTimeout: Date.parse(req.session.cookie._expires),
                    beta: server.beta,
                    _betaFeatures: user.betaFeatures,
                    _SchoolAbbr: SchoolAbbr,
                    _noGpaLetters: Constants.noGpaLetters,
                    term: "",
                    semester: "",
                    _termsAndSemesters: [],
                    plus: plus,
                    premium: premium,
                    _: _,
                    enableLogging: true,
                });
            }
            return;
        }
        res.redirect(req.headers.referer ?? "/");
    });

    app.get("/logout", [isLoggedIn], (req, res) => {
        req.logout(() => res.redirect(req.headers.referer ?? "/"));
    });

    app.post("/archiveOldUsers", [isAdmin], async (req, res) => {
        let resp = await dbClient.archiveOldUsers();

        if (resp.success) {
            req.flash("adminSuccessMessage", resp.data.message);
        } else {
            req.flash("adminFailMessage", resp.data.message);
        }

        res.redirect("/admin");
    });

    app.post("/unArchiveNonGraduatedUsers", [isAdmin], async (req, res) => {
        let resp = await dbClient.unArchiveNonGraduatedUsers();

        if (resp.success) {
            req.flash("adminSuccessMessage", resp.data.message);
        } else {
            req.flash("adminFailMessage", resp.data.message);
        }

        res.redirect("/admin");
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
        let {plus, premium} = donoAttributes(req.user.donoData);

        renderWithConstants(res, "admin/admin.ejs", {
            page: "admin",
            username: req.user.username,
            adminSuccessMessage: req.flash("adminSuccessMessage"),
            adminFailMessage: req.flash("adminFailMessage"),
            sessionTimeout: Date.parse(req.session.cookie._expires),
            _appearance: req.user.appearance,
            beta: server.beta,
            plus: plus,
            premium: premium,
        });
    });

    app.post("/users", [isAdmin], async (req, res) => {
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
        let page = parseInt(req.body.page);
        let count = parseInt(req.body.count);
        let redirect = !page || !count;
        if (page < 0) {
            page = 1;
        }
        if (count < 0) {
            count = 10;
        }
        page ||= 1;
        count ||= 10;
        if (!redirect && count > 20) {
            count = 20;
        }
        let query = queryHelper(req.body.query);
        let sort = sortHelper(req.body.sort);
        if (req.body.archived === 'false') {
            let {
                value: allUsers,
                actualCount,
                total
            } = (await dbClient.getAllUsers(projection, query, sort, page, count)).data;
            let maxPage = Math.ceil(total / count);
            let deletedUsers = [];

            return res.status(200).send({success: page <= maxPage, userList: allUsers, deletedUserList: deletedUsers, total: total, actualCount: actualCount, maxPage: maxPage});
        } else {
            let {
                value: deletedUsers,
                actualCount,
                total
            } = (await dbClient.getAllArchivedUsers(projection, query, sort, page, count)).data;
            let maxPage = Math.ceil(total / count);
            let allUsers = [];

            return res.status(200).send({success: page <= maxPage, userList: allUsers, deletedUserList: deletedUsers, total: total, actualCount: actualCount, maxPage: maxPage});
        }
    });

    app.get("/changelog", async (req, res) => {
        let result = changelog(server.beta, req.query.versionName);
        if (result === null) return res.sendStatus(400);
        res.status(200).send(result);
    });

    app.get("/changelogLegend", [isLoggedIn], async (req, res) => {
        let result = changelogLegend(server.beta);
        res.status(200).send(result);
    });

    app.get("/donoData", [isLoggedIn], async (req, res) => {
        let resp = await dbClient.getAllDonoData();
        if (resp.success) {
            res.status(200).send(resp.data.value);
        } else {
            res.sendStatus(400);
        }
    });

    app.post("/updateShowMaxGPA", [isLoggedIn], async (req, res) => {
        let resp = await dbClient.setShowMaxGPA(req.user.username, req.body.showMaxGPA);
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
        res.redirect(req.headers.referer ?? "/");
    });

    app.post("/acceptTerms", [isLoggedIn], async (req, res) => {
        await dbClient.acceptTerms(req.user.username);
        res.redirect(req.headers.referer ?? "/");
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
        let resp = await dbClient.updateAddedAssignments(req.user.username, data, term, semester);
        if (resp.success) {
            res.status(200).send(resp.data.addedWeights);
        } else {
            res.sendStatus(400);
        }
    });

    app.post("/updateEditedAssignments", [isLoggedIn], async (req, res) => {
        let data = req.body.data;
        let term = req.body.term;
        let semester = req.body.semester;
        let resp = await dbClient.updateEditedAssignments(req.user.username, data, term, semester);
        if (resp.success) {
            res.sendStatus(200);
        } else {
            res.sendStatus(400);
        }
    });

    // process the login form
    app.post("/login", passport.authenticate("local-login", {
        failureRedirect: "/",
        failureFlash: true
    }), (req, res) => {
        if (req.body.rememberMe) {
            req.session.cookie.maxAge = sessionRememberPeriod;
        }
        res.redirect("/");
    });

    // SIGNUP =================================
    // show the signup form
    app.get("/signup", (req, res) => {


        renderWithConstants(res, "viewer/signup.ejs", {
            message: req.flash("signupMessage"),
            beta: server.beta,
            _appearance: loggedOutAppearance(),
            page: "signup",
            recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY,
        });
    });

    app.post("/signup", async (req, res, next) => {
        const token = req.body["g-recaptcha-response"];
        if (!token || !(await verifyRecaptcha(token))) {
            req.flash("signupMessage", "Please complete the reCAPTCHA.");
            return res.redirect("/signup");
        }

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
        let term = req.body.term;
        let semester = req.body.semester;
        let resp = await dbClient.updateWeightsForClass(req.user.username, term, semester, className, req.body.hasWeights, req.body.newWeights, req.body.addedWeights);
        if (resp.success) {
            res.status(200).send(resp.data.message);
            await dbClient.updateClassesForUser(req.user.username, term, semester, className);
        } else {
            res.status(400).send(resp.data.message);
        }
    });

    app.post("/updateclassweights", [isAdmin], async (req, res) => {
        let school = req.query.school ?? "bellarmine";
        let resp = await dbClient.updateWeightsInClassDb(school, req.body.term, req.body.semester, req.body.className, req.body.teacherName, req.body.hasWeights, req.body.weights);
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
        let resp = await dbClient.addDonation(req.body.data);
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

    app.get("/donationProgress", [isLoggedIn], async (req, res) => {
        let resp = await dbClient.getDonationProgress();
        if (resp.success) {
            let donoResp = await dbClient.getDonoData(req.user.username);
            let userHasDonated = donoResp.success && donoResp.data.value.some(d => d.platform !== "gift");
            res.status(200).json({...resp.data.value, userHasDonated});
        } else {
            res.sendStatus(400);
        }
    });

    app.get("/getCosts", [isAdmin], async (req, res) => {
        let resp = await dbClient.getCosts();
        if (resp.success) {
            res.status(200).json(resp.data.value);
        } else {
            res.sendStatus(400);
        }
    });

    app.post("/addCost", [isAdmin], async (req, res) => {
        let {name, type, amount, billingPeriod, date, endDate} = req.body;
        let resp = await dbClient.addCost(name, type, parseFloat(amount), billingPeriod || null, parseInt(date), endDate ? parseInt(endDate) : null);
        if (resp.success) {
            res.status(200).send(resp.data);
        } else {
            res.status(400).send(resp.data);
        }
    });

    app.post("/removeCost", [isAdmin], async (req, res) => {
        let resp = await dbClient.removeCost(req.body.id);
        if (resp.success) {
            res.status(200).send(resp.data);
        } else {
            res.status(400).send(resp.data);
        }
    });

    app.post("/editCost", [isAdmin], async (req, res) => {
        let {id, name, type, amount, billingPeriod, date, endDate} = req.body;
        let resp = await dbClient.editCost(id, name, type, parseFloat(amount), billingPeriod || null, parseInt(date), endDate ? parseInt(endDate) : null);
        if (resp.success) {
            res.status(200).send(resp.data);
        } else {
            res.status(400).send(resp.data);
        }
    });

    app.post("/setColorPalette", [isLoggedIn], async (req, res) => {
        let resp = await dbClient.setColorPalette(req.user.username, req.body.preset, req.body.shuffleColors);
        if (resp.success) {
            res.status(200).send(resp.data.colors);
        } else {
            res.sendStatus(400);
        }
    });

    app.post("/updateCustomColor", [isLoggedIn], async (req, res) => {
        let resp = await dbClient.updateCustomColor(req.user.username, req.body.index, req.body.color);
        if (resp.success) {
            res.status(200).send(resp.data.colors);
        } else {
            res.sendStatus(400);
        }
    });

    app.get("/finalgradecalculator", async (req, res) => {



        if (req.isAuthenticated()) {

            let {term, semester} = (await dbClient.getMostRecentTermData(req.user.username)).data.value;
            let {plus, premium} = donoAttributes(req.user.donoData);
            let alerts = (await dbClient.getSpecificAlerts(req.user.username, ["tutorialStatus"])).data.value;

            if (term && semester) {
                let grades = (await dbClient.getSemesterGrades(req.user.username, term, semester)).data.value;
                let weights = (await dbClient.getSemesterWeights(req.user.username, term, semester)).data.value;
                renderWithConstants(res, "user/final_grade_calculator.ejs", {
                    page: "calc",
                    username: req.user.username,
                    schoolUsername: req.user.schoolUsername,
                    isAdmin: req.user.isAdmin,
                    _personalInfo: req.user.personalInfo,
                    _appearance: req.user.appearance,
                    _alerts: alerts,
                    _gradeData: grades.filter(grade => !Constants.noGpaLetters.includes(grade.overall_letter) || grade.grades.length),
                    _weightData: weights.filter((_, i) => !Constants.noGpaLetters.includes(grades[i].overall_letter) || grades[i].grades.length),
                    sessionTimeout: Date.parse(req.session.cookie._expires),
                    beta: server.beta,
                    plus: plus,
                    premium: premium,
                });
            } else {
                renderWithConstants(res, "user/final_grade_calculator.ejs", {
                    page: "calc",
                    username: req.user.username,
                    schoolUsername: req.user.schoolUsername,
                    isAdmin: req.user.isAdmin,
                    _personalInfo: req.user.personalInfo,
                    _appearance: req.user.appearance,
                    _alerts: alerts,
                    _gradeData: {},
                    _weightData: {},
                    sessionTimeout: Date.parse(req.session.cookie._expires),
                    beta: server.beta,
                    plus: plus,
                    premium: premium,
                });
            }
        } else {
            renderWithConstants(res, "viewer/final_grade_calculator_logged_out.ejs", {
                _appearance: loggedOutAppearance(),
                page: "logged_out_calc",
                beta: server.beta,
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
        let {plus, premium} = donoAttributes(req.user.donoData);



        renderWithConstants(res, "admin/betakeys.ejs", {
            betaKeyData: (await dbClient.getAllBetaKeys()).data.value,
            betaKeySuccessMessage: req.flash("betaKeySuccessMessage"),
            betaKeyFailMessage: req.flash("betaKeyFailMessage"),
            page: "keys",
            sessionTimeout: Date.parse(req.session.cookie._expires),
            _appearance: req.user.appearance,
            beta: server.beta,
            username: req.user.username,
            plus: plus,
            premium: premium
        });

    });

    app.get("/latestVersion", [isLoggedIn], async (req, res) => {
        res.status(200).send(latestVersion(server.beta));
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
        let {plus, premium} = donoAttributes(req.user.donoData);


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

        renderWithConstants(res, "admin/classes.ejs", {
            username: req.user.username,
            page: "classes",
            classData: classData,
            catalogData: catalogData,
            sessionTimeout: Date.parse(req.session.cookie._expires),
            _appearance: req.user.appearance,
            beta: server.beta,
            schools: Object.values(Schools),
            school: school,
            term: term,
            semester: semester,
            _termsAndSemesters: (await dbClient.getTermsAndSemestersInClassDb(school)).data.value,
            _: _,
            plus: plus,
            premium: premium
        });
    });

    app.get("/charts", async (req, res) => {

        let {success, data: {loginData, uniqueLoginData, syncData, userData, activeUsersData, schoolData, lastUpdated}} = await dbClient.getChartData();
        if (!success) {
            return renderWithConstants(res, "viewer/loading_charts.ejs", {page: "charts-logged-out",
                _appearance: loggedOutAppearance(),
                _: _
            });
        }
        if (req.isAuthenticated()) {
            let {plus, premium} = donoAttributes(req.user.donoData);
            let alerts = (await dbClient.getSpecificAlerts(req.user.username, ["tutorialStatus"])).data.value;
            renderWithConstants(res, "viewer/cool_charts.ejs", {
                username: req.user.username,
                _personalInfo: req.user.personalInfo,
                _appearance: req.user.appearance,
                sessionTimeout: Date.parse(req.session.cookie._expires),
                page: "charts",
                _alerts: alerts,
                _loginData: loginData,
                _uniqueLoginData: uniqueLoginData,
                _syncData: syncData,
                _userData: userData,
                _activeUsersData: activeUsersData,
                _schoolData: schoolData,
                _loggedInData: await dbClient.getLoggedInData(true, req.user.username),
                plus: plus,
                premium: premium,
                lastUpdated: lastUpdated.getTime(),
                _SchoolAbbr: SchoolAbbr,
                _PrettySchools: PrettySchools,
                _: _
            });
        } else {
            renderWithConstants(res, "viewer/cool_charts.ejs", {
                page: "charts-logged-out",
                _appearance: loggedOutAppearance(),
                _loginData: loginData,
                _uniqueLoginData: uniqueLoginData,
                _syncData: syncData,
                _userData: userData,
                _activeUsersData: activeUsersData,
                _schoolData: schoolData,
                _loggedInData: await dbClient.getLoggedInData(false, null),
                lastUpdated: lastUpdated.getTime(),
                _SchoolAbbr: SchoolAbbr,
                _PrettySchools: PrettySchools,
                _: _
            });
        }
    });

    app.post("/updateSortData", [isLoggedIn, inRecentTerm], async (req, res) => {
        let username = req.user.username;
        await dbClient.updateSortData(username, req.body.sortingData);
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
        if (req.user) {
            res.redirect(req.headers.referer ?? "/");
            return;
        }

        let resetToken = req.query.token;


        let {school: school, valid: validToken, gradeSync: gradeSync} = (await dbClient.checkPasswordResetToken(resetToken)).data;
        if (!validToken) {
            renderWithConstants(res.status(404), "password_reset/reset_password_404.ejs", {
                _appearance: loggedOutAppearance(),
                page: "password404"
            });
            return;
        }

        renderWithConstants(res.status(200), "password_reset/reset_password.ejs", {
            message: req.flash("resetPasswordMsg"),
            token: resetToken,
            gradeSync: gradeSync,
            _appearance: loggedOutAppearance(),
            page: "passwordReset",
            school: school,
        });
    });

    app.post("/reset_password", async (req, res) => {

        let resetToken = req.body.token;
        if (!resetToken) {
            res.redirect(req.headers.referer ?? "/");
            return;
        }


        let newPass = req.body.password;
        let resp = await dbClient.resetPassword(resetToken, newPass);
        if (!resp.success && resp.data.message === "Invalid token.") {
            renderWithConstants(res.status(404), "password_reset/reset_password_404.ejs", {
                _appearance: loggedOutAppearance(),
                page: "password404"
            });
            return;
        }
        if (!resp.success) {
            req.flash("resetPasswordMsg", resp.data.message);
            res.redirect("/reset_password?token=" + resetToken);
            return;
        }
        renderWithConstants(res, "password_reset/reset_password_success.ejs", {
            _appearance: loggedOutAppearance(),
            page: "passwordResetSuccess"
        });

    });

    app.get("/forgot_password", (req, res) => {
        // don't allow while logged in
        if (req.user) {
            res.redirect(req.headers.referer ?? "/");
            return;
        }


        renderWithConstants(res, "password_reset/forgot_password.ejs", {
            message: req.flash("forgotPasswordMsg"),
            _appearance: loggedOutAppearance(),
            page: "passwordForgot",
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

    app.post("/discord-disconnect", [isLoggedIn], async (req, res) => {
        let resp = await dbClient.discordUnverify(req.user.username);
        if (!resp.success) {
            res.status(400).send(resp.data.message);
        } else {
            res.status(200).send(resp.data.message);
        }
    });

    // JSON login for the app. POST /login 302s either way, which the app can't tell apart
    app.post("/api/app/login", (req, res, next) => {
        passport.authenticate("local-login", (err, user, info) => {
            if (err) return next(err);
            if (!user) {
                // info is whatever req.flash("loginMessage", ...) returned
                let message = (Array.isArray(info) ? info.join(" ") : info?.message) || "Invalid Credentials";
                return res.status(401).json({message: message.replace(/<[^>]*>/g, "")});
            }
            // The app only syncs by scraping PowerSchool, so other schools have nothing to drive
            if (user.school !== Schools.BELL) {
                return res.status(403).json({
                    message: `The Graderoom app currently supports ${PrettySchools.BELL} accounts only. Please use the website.`
                });
            }
            req.logIn(user, (err) => {
                if (err) return next(err);
                if (req.body.rememberMe) {
                    req.session.cookie.maxAge = sessionRememberPeriod;
                }
                res.json({username: user.username, school: user.school});
            });
        })(req, res, next);
    });

    // The app's read path. Not isLoggedIn, that 302s to "/" and does a referer check the app would trip
    app.get("/api/app/data", async (req, res) => {
        if (!req.isAuthenticated()) return res.sendStatus(401);
        req.session.touch();

        let {term, semester} = (await dbClient.getMostRecentTermData(req.user.username)).data.value;
        if (req.query.term && req.query.semester) {
            if (!(await dbClient.userHasSemester(req.user.username, req.query.term, req.query.semester)).data.value) {
                return res.status(404).json({message: "No such semester"});
            }
            term = req.query.term;
            semester = req.query.semester;
        }

        let gradeSync = (await dbClient.getGradeSync(req.user.username)).data.value;
        let payload = await buildUserPayload(req, term, semester, gradeSync, false);
        delete payload._;           // lodash, for EJS only
        delete payload._SchoolAbbr; // static enum, app has its own copy
        delete payload.page;
        res.json(payload);
    });

    app.post("/api/internal/discord/connect", [isInternalApiAuthenticated], async (req, res) => {
        let {username, discordID} = req.body;
        let resp = await dbClient.internalApiDiscordConnect(username, discordID);
        if (!resp.success) {
            res.status(400).send(resp.data);
        } else {
            res.status(200).send(resp.data);
        }
    });

    app.get("/api/internal/discord/user-info", [isInternalApiAuthenticated], async (req, res) => {
        let {discordID} = req.body;
        let resp = await dbClient.internalApiDiscordUserInfo(discordID);
        if (!resp.success) {
            res.status(400).send(resp.data);
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
        res.redirect(req.headers.referer ?? "/");
    });
};

function sortHelper(sortQuery) {
    let _sort = {};
    try {
        let sort = JSON.parse(sortQuery);
        for (let key in sort) {
            switch (key) {
                case "username":
                    if (([1, -1]).includes(sort[key])) {
                        _sort[key] = sort[key];
                    }
                    break;
                case "schoolUsername":
                    if (([1, -1]).includes(sort[key])) {
                        _sort[key] = sort[key];
                    }
                    break;
                case "personalInfo.firstName":
                    if (([1, -1]).includes(sort[key])) {
                        _sort[key] = sort[key];
                    }
                    break;
                case "loggedIn.0":
                    if (([1, -1]).includes(sort[key])) {
                        _sort[key] = sort[key];
                    }
                    break;
            }
        }
    } catch {}
    return _sort;
}

function queryHelper(queryQuery) {
    let _query = {};
    try {
        let query = JSON.parse(queryQuery);
        for (let key in query) {
            switch (key) {
                case "username":
                    if (typeof query[key] === "string") {
                        _query[key] = query[key];
                    } else if ("$regex" in query[key] && typeof query[key]["$regex"] === "string") {
                        _query[key] = query[key];
                    }
                    break;
                case "donoData":
                    // Queries those that have donations of any amount
                    _query[key] = {$ne: []};
                    break;
            }
        }
    } catch {}
    return _query;
}
