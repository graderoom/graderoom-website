const low = require("lowdb");
const _ = require("lodash");
const FileSync = require("lowdb/adapters/FileSync");
const adapter = new FileSync("user_db.json");
const db = low(adapter);
const bcrypt = require("bcryptjs");
const scraper = require("./scrape");
const chroma = require("chroma-js");
const crypto = require("crypto");
const readline = require("readline");
const fs = require("fs");

const roundsToGenerateSalt = 10;


db.defaults({users: [], keys: [], classes: {}, deletedUsers: []}).write();

let changelogArray = [];
let betaChangelogArray = [];
let versionNameArray = [];

// Update this list with new tutorial keys
let tutorialKeys = ["changelogLegendSeen", "homeSeen", "navinfoSeen"];

// Update this list with new beta features
let betaFeatureKeys = ["showTermSwitcher"];

module.exports = {

    backupdb: function () {
        let today = Date.now();
        let filename = "user_db_backup" + today + ".json";
        const backupAdapter = new FileSync(filename);
        const backupDb = low(backupAdapter);
        backupDb.defaults({
                              users: [], keys: [], classes: {}, deletedUsers: []
                          }).write();
        backupDb.set("users", db.get("users").value()).write();
        backupDb.set("keys", db.get("keys").value()).write();
        backupDb.set("classes", db.get("classes").value()).write();
        backupDb.set("deletedUsers", db.get("deletedUsers").value()).write();
        console.log("" + Date.now() + " | Backed up to " + filename);
    },

    /* beta key functions */

    betaAddNewUser: async function (betaKey, username, password, schoolUsername, isAdmin) {
        let asbk = db.get("keys").find({betaKey: betaKey}).value();
        if (asbk) {

            if (asbk.claimed) {
                return {success: false, message: "Beta key already claimed."};
            }

            let r = await this.addNewUser(username, password, schoolUsername, isAdmin, true);
            if (r.success === true) {
                db.get("keys").find({betaKey: betaKey}).set("claimed", true).write();
                db.get("keys").find({betaKey: betaKey}).set("claimedBy", username).write();
            }
            return r;
        }
        return {success: false, message: "Invalid beta key."};

    },

    addNewBetaKey: function (betaKey) {
        db.get("keys").push({
                                betaKey: betaKey, claimed: false, claimedBy: ""
                            }).write();
        return {success: true, message: "Added beta key: " + betaKey + "."};
    },

    getAllBetaKeyData: function () {
        return db.get("keys").value();
    },

    removeBetaKey: function (betaKey) {
        db.get("keys").remove({
                                  betaKey: betaKey
                              }).write();
        return {success: true, message: "Removed beta key."};
    },

    acceptTerms: function (username) {
        let lc_username = username.toLowerCase();
        let userRef = db.get("users").find({username: lc_username});
        userRef.get("alerts").set("termsLastSeen", Date.now()).write();
    },

    acceptPrivacyPolicy: function (username) {
        let lc_username = username.toLowerCase();
        let userRef = db.get("users").find({username: lc_username});
        userRef.get("alerts").set("policyLastSeen", Date.now()).write();
    },

    setRemoteAccess: function (username, allowed) {
        let lc_username = username.toLowerCase();
        let userRef = db.get("users").find({username: lc_username});
        userRef.get("alerts").set("remoteAccess", allowed).write();
    },

    setFirstName: function (username, firstName) {
        // Test it
        let firstNameRegex = new RegExp("^[a-zA-Z]*$");
        if (firstNameRegex.test(firstName)) {
            let lc_username = username.toLowerCase();
            let userRef = db.get("users").find({username: lc_username});
            userRef.get("personalInfo").set("firstName", firstName).write();
            return {success: true, message: "Updated first name"};
        } else {
            return {success: false, message: "First name must contain only letters"};
        }
    },

    setNonAcademic: function (username, value) {
        let lc_username = username.toLowerCase();
        let userRef = db.get("users").find({username: lc_username});
        userRef.get("appearance").set("showNonAcademic", value).write();
    },

    setRegularizeClassGraphs: function (username, value) {
        let lc_username = username.toLowerCase();
        let userRef = db.get("users").find({username: lc_username});
        userRef.get("appearance").set("regularizeClassGraphs", value).write();
    },

    setWeightedGPA: function (username, value) {
        let lc_username = username.toLowerCase();
        let userRef = db.get("users").find({username: lc_username});
        userRef.get("appearance").set("weightedGPA", value).write();
    },

    joinBeta: function (username) {
        let lc_username = username.toLowerCase();
        let userRef = db.get("users").find({username: lc_username});
        userRef.get("betaFeatures").set("active", true).write();
        betaFeatureKeys.forEach(feature => userRef.get("betaFeatures").set(feature, true).write());
    },

    addBetaFeature: function (username, features) {
        let lc_username = username.toLowerCase();
        let userRef = db.get("users").find({username: lc_username});
        userRef.set("betaFeatures", {active: true}).write();
        Object.keys(features).forEach(feature => {
            if (betaFeatureKeys.includes(feature)) {
                userRef.get("betaFeatures").set(feature, true).write();
            }
        });
    },

    leaveBeta: function (username) {
        let lc_username = username.toLowerCase();
        let userRef = db.get("users").find({username: lc_username});
        userRef.set("betaFeatures", {"active": false}).write();
    },

    /* class database */
    getAllClassData: function () {
        return db.get("classes").value();
    },

    /* user functions
     */

    updateAllDB: function (beta = false) {
        let startTime = Date.now();
        console.log("" + startTime + " | Started Database Update");

        // Remove version object
        if (db.get("versions").value()) {
            db.unset("versions").write();
        }

        let users = db.get("users").value();

        for (let i = 0; i < users.length; i++) {
            console.log("" + Date.now() + " | Updating User: " + (i + 1) + " of " + users.length);
            this.updateDB(users[i].username, beta);
        }

        //Update classes to include suggestions key
        let classRef = db.get("classes");
        let classes = db.get("classes").value();
        for (let i = 0; i < Object.keys(classes).length; i++) {
            console.log("" + Date.now() + " | Updating Class: " + (i + 1) + " of " + Object.keys(classes).length);
            let className = Object.keys(classes)[i];
            for (let j = 0; j < Object.keys(classes[className]).length; j++) {
                let teacherName = Object.keys((classes)[className])[j];
                if (teacherName !== "classType") { //one of the keys is classtype, so ignore that
                    if (!("suggestions" in classes[className][teacherName])) {
                        classRef.get(className).get(teacherName).set("suggestions", []).write();
                    }
                    // Remove suggestions without usernames
                    classRef.get(className).get(teacherName).get("suggestions").remove(function (e) {
                        return !("usernames" in e);
                    }).write();
                }
            }
        }

        let endTime = Date.now();
        console.log("" + endTime + " | Database Updated in " + (endTime - startTime) + "ms");
    }, updateDB: function (username, beta = false) {
        let lc_username = username.toLowerCase();
        let userRef = db.get("users").find({username: lc_username});
        let user = userRef.value();

        // Add holiday effects var
        if (!([true, false].includes(userRef.get("appearance").get("holidayEffects").value()))) {
            userRef.get("appearance").set("holidayEffects", true).write();
        }

        // Migrate to new color scheme system
        if (!([true, false].includes(userRef.get("appearance").get("shuffleColors").value()))) {
            let oldScheme = userRef.get("appearance").get("colorPalette").value();
            let newScheme, shuffle;
            switch (oldScheme) {
                case "default":
                    newScheme = "bright";
                    shuffle = true;
                    break;
                case "pastel":
                    newScheme = "pastel";
                    shuffle = true;
                    break;
                case "dark":
                    newScheme = "dull";
                    shuffle = true;
                    break;
                case "rainbow":
                    newScheme = "clear";
                    shuffle = false;
                    break;
                default:
                    newScheme = "clear";
                    shuffle = false;
                    break;
            }
            this.setColorPalette(lc_username, newScheme, shuffle);
        }

        // Add show max gpa preference
        if (!userRef.get("appearance").get("showMaxGPA").value()) {
            userRef.get("appearance").set("showMaxGPA", false).write();
        }

        // Remove blur amount preference
        if (userRef.get("appearance").get("blurAmount").value()) {
            userRef.get("appearance").unset("blurAmount").write();
        }

        // Move blur out of beta
        if (userRef.get("betaFeatures").get("blurEffects").value()) {
            userRef.get("appearance").set("blurEffects", true).write();
            userRef.get("betaFeatures").unset("blurEffects").write();
        }

        // Add blur var
        if (!([true, false]).includes(userRef.get("appearance").get("blurEffects").value())) {
            userRef.get("appearance").set("blurEffects", false).write();
        }

        // Fix calc bc ap with space
        let badData = userRef.get("grades").get("19-20").get("S1").find({class_name: "Calculus BC AP "}).value();
        if (badData) {
            userRef.get("grades").get("19-20").get("S1").remove({class_name: "Calculus BC AP"}).write();
            userRef.get("grades").get("19-20").get("S1").find({class_name: "Calculus BC AP "}).set("class_name", "Calculus BC AP").write();
            userRef.get("grades").get("19-20").get("S1").remove({class_name: "Calculus BC AP "}).write();
            userRef.get("weights").get("19-20").get("S1").set("Calculus BC AP", userRef.get("weights").get("19-20").get("S1").get("Calculus BC AP ").value()).write();
            userRef.get("weights").get("19-20").get("S1").unset("Calculus BC AP ").write();
            userRef.get("addedAssignments").get("19-20").get("S1").set("Calculus BC AP", userRef.get("addedAssignments").get("19-20").get("S1").get("Calculus BC AP ").value()).write();
            userRef.get("addedAssignments").get("19-20").get("S1").unset("Calculus BC AP ").write();
        }

        // Remove changedata
        if (userRef.get("changeData").value()) {
            userRef.unset("changeData").write();
        }

        // Migrate lastupdated
        this.migrateLastUpdated(user.username);

        // Add betaFeatures activation
        if (!userRef.get("betaFeatures").value()) {
            userRef.set("betaFeatures", {"active": beta}).write();
        }

        // Add weightedGPA option
        if (!userRef.get("appearance").get("weightedGPA").value() && userRef.get("appearance").get("weightedGPA").value() !== false) {
            userRef.get("appearance").set("weightedGPA", true).write();
        }

        // Add regularizeClassGraphs
        if (!userRef.get("appearance").get("regularizeClassGraphs").value() && userRef.get("appearance").get("regularizeClassGraphs").value() !== false) {
            userRef.get("appearance").set("regularizeClassGraphs", true).write();
        }

        // Make all school emails lowercase
        let email = user.schoolUsername;
        userRef.set("schoolUsername", email.toLowerCase()).write();

        // Fix error in weight storage
        if (userRef.get("grades").get("grades").value()) {
            userRef.get("grades").unset("grades").write();
        }

        // Add color palette
        if (!userRef.get("appearance").get("colorPalette").value()) {
            userRef.get("appearance").set("colorPalette", "default").write();
            this.setColorPalette(lc_username, "clear", false);
        }

        // Migrate to new grade and weight storage (any data found in old storage *must* be from 19-20 S2)
        if (Array.isArray(userRef.get("grades").value())) {
            userRef.set("grades", {"19-20": {"S2": user.grades}}).write();
            userRef.set("weights", {"19-20": {"S2": user.weights}}).write();
        }

        // I didn't realize that some people have 2019 grades
        if (userRef.get("grades").get("19-20").get("S2").value() && userRef.get("grades").get("19-20").get("S2").value().filter(c => c.grades.filter(a => a.date.slice(-4) === "2019").length).length) {
            userRef.get("grades").get("19-20").set("S1", userRef.get("grades").get("19-20").get("S2").value()).write();
            userRef.get("grades").get("19-20").unset("S2").write();
            userRef.get("weights").get("19-20").set("S1", userRef.get("weights").get("19-20").get("S2").value()).write();
            userRef.get("weights").get("19-20").unset("S2").write();
        }

        // Add editedAssignments dict
        if (!userRef.get("editedAssignments").value()) {
            userRef.set("editedAssignments", {}).write();
            this.initEditedAssignments(user.username);
        }

        // Add addedAssignments dict
        if (!userRef.get("addedAssignments").value()) {
            userRef.set("addedAssignments", {}).write();
            this.initAddedAssignments(user.username);
        }

        // Fix -1 and Â  values in 19-20 S2
        if (userRef.get("grades").value() && userRef.get("grades").get("19-20").value() && userRef.get("grades").get("19-20").get("S2").value()) {
            for (let i = 0; i < userRef.get("grades").get("19-20").get("S2").value().length; i++) {
                let classGrades = userRef.get("grades").get("19-20").get("S2").value()[i].grades;
                for (let j = 0; j < classGrades.length; j++) {
                    if (classGrades[j].grade_percent === -1) {
                        userRef.get("grades").get("19-20").get("S2").nth(i).get("grades").nth(j).set("grade_percent", false).write();
                    }
                    if (classGrades[j].grade_percent === "Â ") {
                        userRef.get("grades").get("19-20").get("S2").nth(i).get("grades").nth(j).set("grade_percent", false).write();
                    }
                }
            }
        }
        // Fix -1 and Â  values in 19-20 S1
        if (userRef.get("grades").value() && userRef.get("grades").get("19-20").value() && userRef.get("grades").get("19-20").get("S1").value()) {
            for (let i = 0; i < userRef.get("grades").get("19-20").get("S1").value().length; i++) {
                let classGrades = userRef.get("grades").get("19-20").get("S1").value()[i].grades;
                for (let j = 0; j < classGrades.length; j++) {
                    if (classGrades[j].grade_percent === -1) {
                        userRef.get("grades").get("19-20").get("S1").nth(i).get("grades").nth(j).set("grade_percent", false).write();
                    }
                    if (classGrades[j].grade_percent === "Â ") {
                        userRef.get("grades").get("19-20").get("S1").nth(i).get("grades").nth(j).set("grade_percent", false).write();
                    }
                }
            }
        }

        // Remove old grade_history storage (This should be empty anyway)
        if (userRef.get("grade_history").value()) {
            userRef.unset("grade_history").write();
            userRef.unset("grade_history_weights").write();
        }

        // Add grade history tracker
        if (!userRef.get("updatedGradeHistory").value()) {
            userRef.set("updatedGradeHistory", []).write();
        }

        // Add sorting data
        this.resetSortData(user.username);

        // Add tutorial status
        if (!user.alerts.tutorialStatus) {
            userRef.get("alerts").set("tutorialStatus", {}).write();
        }

        // Remove any extra tutorial keys
        let existingKeys = Object.keys(userRef.get("alerts").get("tutorialStatus").value());
        for (let i = 0; i < existingKeys.length; i++) {
            if (!tutorialKeys.includes(existingKeys[i])) {
                userRef.get("alerts").get("tutorialStatus").unset(existingKeys[i]).write();
            }
        }

        // Add tutorial keys
        for (let i = 0; i < tutorialKeys.length; i++) {
            if (!userRef.get("alerts").get("tutorialStatus").get(tutorialKeys[i]).value()) {
                userRef.get("alerts").get("tutorialStatus").set(tutorialKeys[i], false).write();
            }
        }

        // Add personal info
        if (!user.personalInfo) {
            let {firstName, lastName, graduationYear} = getPersonalInfo(user.schoolUsername);
            userRef.set("personalInfo", {
                firstName: firstName, lastName: lastName, graduationYear: graduationYear
            }).write();
        }

        // Remove grade update reminder
        if (user.alerts.updateGradesReminder) {
            delete user.alerts.updateGradesReminder;
        }

        // Make lastupdated an array
        if (!Array.isArray(user.alerts.lastUpdated)) {
            if (user.alerts.lastUpdated === "never") {
                userRef.get("alerts").set("lastUpdated", []).write();
            } else {
                userRef.get("alerts").set("lastUpdated", [user.alerts.lastUpdated]).write();
            }
        }

        // Get back lastUpdated data
        if (userRef.get("alerts").get("lastUpdated").value().length === 1 && userRef.get("updatedGradeHistory").value().length > 1) {
            userRef.get("alerts").set("lastUpdated", userRef.get("updatedGradeHistory").value()).write();
        }

        // Add loggedIn vars
        if (!Object.keys(user).includes("loggedIn") || userRef.get("loggedIn").value() === "never") {
            userRef.set("loggedIn", []).write();
        }
        // Make loggedIn an array
        if (!Array.isArray(user.loggedIn)) {
            userRef.set("loggedIn", [user.loggedIn]).write();
        }
        if (user.alerts.lastUpdated.length !== 0 && userRef.get("loggedIn").value().length === 0) {
            userRef.set("loggedIn", [user.alerts.lastUpdated.slice(-1)[0]]).write();
        }

        // Add privacy policy and terms vars
        if (!Object.keys(user.alerts).includes("policyLastSeen")) {
            userRef.get("alerts").set("policyLastSeen", "never").write();
        }
        if (!Object.keys(userRef.value().alerts).includes("termsLastSeen")) {
            userRef.get("alerts").set("termsLastSeen", "never").write();
        }
        if (!Object.keys(user.alerts).includes("remoteAccess")) {
            userRef.get("alerts").set("remoteAccess", "denied").write();
        }

        // Add nonacademic vars
        if (!Object.keys(user.appearance).includes("showNonAcademic")) {
            userRef.get("appearance").set("showNonAcademic", true).write();
        }

        // Fix theme for old users
        if (Object.keys(user.appearance).includes("darkMode")) {
            userRef.get("appearance").unset("darkMode").write();
            this.setTheme(user.username, "auto", 7, "PM", 6, "AM");
        }

        // Setup autotheme for old users
        if (user.appearance.theme === "auto" && !user.appearance.darkModeStart) {
            this.setTheme(user.username, "auto", 7, "PM", 6, "AM");
        }

        // Remove show changelog variables for old users
        if (Object.keys(user.alerts).includes("showChangelog")) {
            delete user.alerts.showChangelog;
        }
        if (Object.keys(userRef.value().alerts).includes("changelogLastShown")) {
            delete user.alerts.changelogLastShown;
            userRef.get("alerts").set("latestSeen", "1.0.0").write();
        }

        // Remove autorefresh var
        if (Object.keys(userRef.value()).includes("autoRefresh")) {
            delete user.autoRefresh;
        }

        // Fix dicts
        this.initAddedAssignments(lc_username);
        this.initWeights(lc_username);
        this.initEditedAssignments(lc_username);

    }, bringUpToDate: function (username, onlyLatest = true) {
        let lc_username = username.toLowerCase();
        let userRef = db.get("users").find({username: lc_username});
        let user = userRef.value();
        let classes = db.get("classes").value();

        let {term, semester} = this.getMostRecentTermData(lc_username);

        for (let g = 0; g < Object.keys(user.grades).length; g++) {
            let _term = Object.keys(user.grades)[g];
            if (onlyLatest && _term !== term) {
                continue;
            }
            for (let h = 0; h < Object.keys(user.grades[_term]).length; h++) {
                let _semester = Object.keys(user.grades[_term])[h];
                if (onlyLatest && _semester !== semester) {
                    continue;
                }
                for (let i = 0; i < user.grades[_term][_semester].length; i++) {
                    console.log("" + Date.now() + " | Bringing class up to date: " + (i + 1) + " of " + user.grades[_term][_semester].length);
                    let className = user.grades[_term][_semester][i].class_name;
                    let teacherName = user.grades[_term][_semester][i].teacher_name;

                    //Add all classes to db
                    if (!dbContainsClass(className, teacherName)) {
                        this.addDbClass(className, teacherName);
                    }

                    // Ignore if no teacher (means no assignments)
                    if (!teacherName) {
                        continue;
                    }

                    // Determine needed weights
                    let goodWeights = [];
                    for (let j = 0; j < user.grades[_term][_semester][i].grades.length; j++) {
                        if (!goodWeights.includes(user.grades[_term][_semester][i].grades[j].category)) {
                            goodWeights.push(user.grades[_term][_semester][i].grades[j].category);
                        }
                    }

                    // Add custom: false
                    if (!Object.keys(user.weights[_term][_semester][className]["weights"]).length) {
                        userRef.get("weights").get(_term).get(_semester).get(className).set("custom", false).write();
                    }

                    // Add all weights that exist in user grades
                    for (let j = 0; j < goodWeights.length; j++) {
                        if (!Object.keys(user.weights[_term][_semester][className]["weights"]).includes(goodWeights[j])) {
                            user.weights[_term][_semester][className]["weights"][goodWeights[j]] = null;
                        }
                    }

                    //Updates weights from classes db
                    if (userRef.get("weights").get(_term).get(_semester).get(className).get("custom").value() === false && dbContainsClass(className, teacherName)) {
                        if (classes[className][teacherName]["hasWeights"] == "false" || Object.keys(classes[className][teacherName]["weights"]).length > 0) {
                            this.updateWeightsForClass(username, _term, _semester, className, classes[className][teacherName]["hasWeights"], classes[className][teacherName]["weights"], false, false);
                        }
                    }

                    //Remove any weights that don't exist in user grades
                    for (let j = 0; j < Object.keys(user.weights[_term][_semester][className]["weights"]).length; j++) {
                        if (!goodWeights.includes(Object.keys(user.weights[_term][_semester][className]["weights"])[j])) {
                            delete user.weights[_term][_semester][className]["weights"][Object.keys(user.weights[_term][_semester][className]["weights"])[j]];
                        }
                    }

                    //Set to point-based if only one category exists (& category is null)
                    if (Object.keys(user.weights[_term][_semester][className]["weights"]).length == 1) {
                        if (user.weights[_term][_semester][className]["weights"][Object.keys(user.weights[_term][_semester][className]["weights"])[0]] == null) {
                            user.weights[_term][_semester][className]["hasWeights"] = "false";
                        }
                    }

                    //Add user's weights as suggestions
                    this.addWeightsSuggestion(lc_username, className, teacherName, user.weights[_term][_semester][className]["hasWeights"], user.weights[_term][_semester][className]["weights"]);

                    //Set custom to not custom if it is same as classes db
                    if (user.weights[_term][_semester][className]["custom"] && dbContainsClass(className, teacherName)) {
                        user.weights[_term][_semester][className]["custom"] = isCustom({
                                                                                           "weights": user.weights[_term][_semester][className]["weights"],
                                                                                           "hasWeights": user.weights[_term][_semester][className]["hasWeights"]
                                                                                       }, {
                                                                                           "weights": classes[className][teacherName]["weights"],
                                                                                           "hasWeights": classes[className][teacherName]["hasWeights"]
                                                                                       });
                    }
                }
            }
        }
    },

    semesterExists: function (username, term, semester) {
        let userRef = db.get("users").find({username: username.toLowerCase()});
        return (term in userRef.get("grades").value() && semester in userRef.get("grades").get(term).value());
    },

    getMostRecentTermData: function (username) {
        let userRef = db.get("users").find({username: username.toLowerCase()});
        if (!Object.keys(userRef.get("grades").value()).length) {
            // Don't give data if new acc
            return {term: false, semester: false};
        }
        let terms = Object.keys(userRef.get("grades").value());
        let term = terms[terms.map(t => parseInt(t.substring(0, 2))).reduce((maxIndex, term, index, arr) => term > arr[maxIndex] ? index : maxIndex, 0)];
        let semesters = Object.keys(userRef.get("grades").get(term).value());
        let semester = semesters[semesters.map(s => parseInt(s.substring(1))).reduce((maxIndex, semester, index, arr) => semester > arr[maxIndex] ? index : maxIndex, 0)];
        return {term: term, semester: semester};
    },

    getRelClassData: function (username) {
        //TODO
        let lc_username = username.toLowerCase();
        let userRef = db.get("users").find({username: lc_username});
        let userClasses = [];
        for (let i = 0; i < Object.keys(userRef.get("grades").value()).length; i++) {
            let term = Object.keys(userRef.get("grades").value())[i];
            for (let j = 0; j < Object.keys(userRef.get("grades").value()[term]).length; j++) {
                let semester = Object.keys(userRef.get("grades").value()[term])[j];
                userRef.get("grades").get(term).get(semester).value().forEach(classRef => userClasses.push([classRef.class_name, classRef.teacher_name]));
            }
        }
        let classes = db.get("classes").value();
        let relClasses = {};
        for (let i = 0; i < userClasses.length; i++) {
            relClasses[userClasses[i][0]] = {
                "classType": classes[userClasses[i][0]]["classType"],
                "weights": userClasses[i][1] ? classes[userClasses[i][0]][userClasses[i][1]]["weights"] : null,
                "hasWeights": userClasses[i][1] ? classes[userClasses[i][0]][userClasses[i][1]]["hasWeights"] : null
            };
        }
        return relClasses;
    }, updateWeightsInClassDb: function (className, teacherName, hasWeights, weights) {
        let classDb = db.get("classes");
        if (weights || hasWeights === "false") {
            if (hasWeights === "false") {
                if (!weights) {
                    weights = {};
                }
                for (let i = 0; i < Object.keys(weights).length; i++) {
                    weights[Object.keys(weights)[i]] = null;
                }
            }
            let modWeights = {};
            for (let i = 0; i < Object.keys(weights).length; i++) {
                modWeights[Object.keys(weights)[i]] = parseFloat(Object.values(weights)[i]);
            }
            classDb.get(className).get(teacherName).set("weights", modWeights).write(); //Overwrites existing weights
            classDb.get(className).get(teacherName).set("hasWeights", hasWeights).write();
        } else {
            return {success: false, message: "One weight required!"};
        }
        let suggestionNum = this.deleteSuggestionInClassDb(className, teacherName, hasWeights, weights).suggestion;
        return {
            success: true, message: "Updated weights for " + className + " | " + teacherName, suggestion: suggestionNum
        };
    }, deleteSuggestionInClassDb: function (className, teacherName, hasWeights, weights) {
        let deleted = false;
        let classRef = db.get("classes");
        let suggestionNum = 0;

        //Process Weights
        if (!weights) {
            weights = {};
        }
        if (hasWeights === "false") {

            for (let i = 0; i < Object.keys(weights).length; i++) {
                weights[Object.keys(weights)[i]] = null;
            }
        }
        let modWeights = {};
        for (let i = 0; i < Object.keys(weights).length; i++) {
            modWeights[Object.keys(weights)[i]] = isNaN(parseFloat(Object.values(weights)[i])) ? null : parseFloat(Object.values(weights)[i]);
        }

        classRef.get(className).get(teacherName).get("suggestions").remove(function (e) {
            let shouldDelete = compareWeights({
                                                  "weights": e.weights, "hasWeights": e.hasWeights
                                              }, {"weights": modWeights, "hasWeights": hasWeights});
            deleted = deleted || shouldDelete;
            if (!deleted) {
                suggestionNum++;
            }
            return shouldDelete;
        }).write();
        if (deleted) {
            return {success: true, suggestion: suggestionNum};
        }
        return {success: false, suggestion: null};
    }, addWeightsSuggestion: function (username, className, teacherName, hasWeights, weights) {
        let lc_username = username.toLowerCase();
        let classDb = db.get("classes");

        //Process weights
        if (hasWeights === "false") {
            for (let i = 0; i < Object.keys(weights).length; i++) {
                weights[Object.keys(weights)[i]] = null;
            }
        }
        let modWeights = {};
        for (let i = 0; i < Object.keys(weights).length; i++) {
            modWeights[Object.keys(weights)[i]] = isNaN(parseFloat(Object.values(weights)[i])) ? null : parseFloat(Object.values(weights)[i]);
        }

        //delete any old suggestions for user
        deleteUserSuggestion(lc_username, className, teacherName);

        let suggestionIndex = getSuggestionIndex(className, teacherName, {
            "weights": modWeights, "hasWeights": hasWeights
        });
        if (suggestionIndex != -1) {
            //Add username to existing suggestion
            classDb.get(className).get(teacherName).get("suggestions").nth(suggestionIndex).get("usernames").push(lc_username).write();
        } else {
            //Add suggestion if doesn't already exist
            let classWeights = classDb.get(className).get(teacherName).get("weights").value();
            let classHasWeights = classDb.get(className).get(teacherName).get("hasWeights").value();
            //Test if same as class weights
            if (!compareWeights({"weights": classWeights, "hasWeights": classHasWeights}, {
                "weights": modWeights, "hasWeights": hasWeights
            })) {
                //Test if all weights are null
                if (!Object.values(modWeights).every(x => x === null) || hasWeights == "false") {
                    classDb.get(className).get(teacherName).get("suggestions").push({
                                                                                        "usernames": [lc_username],
                                                                                        "weights": modWeights,
                                                                                        "hasWeights": hasWeights
                                                                                    }).write();
                }
            }
        }
    }, updateClassTypeInClassDb: function (className, classType) {
        let classDb = db.get("classes");
        classDb.get(className).set("classType", classType).write();
        return {success: true, message: "Set class type of " + className + " to " + classType};
    }

    //Need to add Try Catches to error check when updating db values
    , addNewUser: function (username, password, schoolUsername, isAdmin, beta = false) {

        let lc_username = username.toLowerCase();
        return new Promise((resolve, reject) => {

            if (this.userExists(lc_username)) {
                return resolve({success: false, message: "Username already in use."});
            }

            if (this.emailExists(schoolUsername)) {
                return resolve({success: false, message: "This email address is already associated with an account."});
            }

            if (this.userDeleted(lc_username)) {
                return resolve({
                                   success: false,
                                   message: "This account has been deleted. Email <a href='mailto:support@graderoom.me'>support@graderoom.me</a> to recover your account."
                               });
            }

            // Don't check when creating an admin acc
            if (!isAdmin) {
                if (!isAlphaNumeric(username)) {
                    return resolve({
                                       success: false,
                                       message: "Username must contain only lowercase letters and numbers."
                                   });
                }

                if (username.length > 16) {
                    return resolve({success: false, message: "Username must contain 16 or fewer characters."});
                }

                let message = validatePassword(password);
                if (message) {
                    return {success: false, message: message};
                }

                if (!validateEmail(schoolUsername)) {
                    return resolve({success: false, message: "This must be your Bellarmine school email."});
                }
            }
            // Set up personal info with EXACT same algorithm as on signup page
            let {firstName, lastName, graduationYear} = getPersonalInfo(schoolUsername);

            bcrypt.hash(password, roundsToGenerateSalt, function (err, hash) {
                db.get("users").push({
                                         username: lc_username,
                                         password: hash,
                                         schoolUsername: schoolUsername.toLowerCase(),
                                         personalInfo: {
                                             firstName: firstName, lastName: lastName, graduationYear: graduationYear
                                         },
                                         isAdmin: isAdmin,
                                         betaFeatures: {
                                             active: beta
                                         },
                                         appearance: {
                                             theme: "auto",
                                             accentColor: null,
                                             classColors: [],
                                             colorPalette: "clear",
                                             shuffleColors: false,
                                             holidayEffects: true,
                                             showNonAcademic: true,
                                             darkModeStart: 18,
                                             darkModeFinish: 7,
                                             weightedGPA: true,
                                             regularizeClassGraphs: true,
                                             showMaxGPA: false
                                         },
                                         alerts: {
                                             lastUpdated: [],
                                             updateGradesReminder: "daily",
                                             latestSeen: versionNameArray[1] ? beta ? versionNameArray[1][1] : versionNameArray.find(v => v[0] !== "Beta" && v[0] !== "Known Issues")[1] : "1.0.0",
                                             policyLastSeen: "never",
                                             termsLastSeen: "never",
                                             remoteAccess: "denied",
                                             tutorialStatus: Object.fromEntries(tutorialKeys.map(k => [k, false]))
                                         },
                                         weights: {},
                                         grades: {},
                                         addedAssignments: {},
                                         editedAssignments: {},
                                         sortingData: {
                                             dateSort: [], categorySort: []
                                         },
                                         loggedIn: []
                                     }).write();

                return resolve({success: true, message: "User Created"});
            });
        });

    }, login: function (username, password) {
        let lc_username = username.toLowerCase();
        let user = db.get("users").find({username: lc_username}).value();
        if (bcrypt.compareSync(password, user.password)) {
            return {success: true, message: "Login Successful"};
        } else {
            return {success: false, message: "Incorrect Graderoom password."};
        }

    }, changePassword: async function (username, oldPassword, password) {
        let lc_username = username.toLowerCase();
        if (!this.login(username, oldPassword).success) {
            return {success: false, message: "Old Password is Incorrect"};
        }

        let message = validatePassword(password);
        if (message) {
            return {success: false, message: message};
        }
        let user = db.get("users").find({username: lc_username});
        let schoolPass;
        if (user.get("schoolPassword").value()) {
            schoolPass = this.decryptAndGet(username, oldPassword).message;
        }
        let hashedPass = bcrypt.hashSync(password, roundsToGenerateSalt);
        user.assign({password: hashedPass}).write();
        if (schoolPass) {
            this.encryptAndStore(username, schoolPass, password);
        }
        return {success: true, message: "Password Updated"};
    }, changeSchoolEmail: function (username, schoolUsername) {
        let lc_username = username.toLowerCase();
        if (!validateEmail(schoolUsername)) {
            return {success: false, message: "This must be your Bellarmine College Preparatory school email."};
        }
        let userRef = db.get("users").find({username: lc_username});
        if (userRef.get("schoolUsername").value() !== schoolUsername && this.emailExists(schoolUsername)) {
            return {success: false, message: "This email is already associated with an account."};
        }
        userRef.assign({schoolUsername: schoolUsername.toLowerCase()}).write();
        let {firstName, lastName, graduationYear} = getPersonalInfo(schoolUsername);
        userRef.get("personalInfo").set("firstName", firstName).write();
        userRef.get("personalInfo").set("lastName", lastName).write();
        userRef.get("personalInfo").set("graduationYear", graduationYear).write();
        return {success: true, message: "School Email Updated"};
    }, userExists: function (username) {
        let lc_username = username.toLowerCase();
        let user = db.get("users").find({username: lc_username}).value();
        return !!user;
    },
    emailExists: function (email) {
        let lc_email = email.toLowerCase();
        let user = db.get("users").find({schoolUsername: lc_email}).value();
        return !!user;
    },
    userDeleted: function (username) {
        let lc_username = username.toLowerCase();
        let user = db.get("deletedUsers").find({username: lc_username}).value();
        return !!user;
    },
    setTheme: function (username, theme, darkModeStart, darkModeStartAmPm, darkModeFinish, darkModeFinishAmPm, holidayEffects) {
        let lc_username = username.toLowerCase();
        let user = db.get("users").find({username: lc_username});
        user.get("appearance").set("theme", theme).write();
        let message = theme.replace(/^\w/, c => c.toUpperCase()) + " theme enabled!";
        if (theme === "auto") {
            darkModeStart = parseInt(darkModeStart);
            darkModeFinish = parseInt(darkModeFinish);
            if (darkModeStartAmPm === "PM") {
                if (darkModeStart !== 12) {
                    darkModeStart += 12;
                }
            } else if (darkModeStart === 12) {
                darkModeStart -= 12;
            }
            if (darkModeFinishAmPm === "PM") {
                if (darkModeFinish !== 12) {
                    darkModeFinish += 12;
                }
            } else if (darkModeFinish === 12) {
                darkModeFinish += 12;
            }
            if (darkModeStart === darkModeFinish) {
                user.get("appearance").set("theme", "light").write();
                return {success: true, message: "Light theme enabled!"};
            }
            if ((darkModeStart < 0 || darkModeStart > 24) && (darkModeFinish < 0 || darkModeFinish > 24)) {
                return {success: false, message: "Invalid Start and End Time"};
            }
            if (darkModeStart < 0 || darkModeStart > 24) {
                return {success: false, message: "Invalid Start Time"};
            }
            if (darkModeFinish < 0 || darkModeFinish > 24) {
                return {success: false, message: "Invalid Finish Time"};
            }
            user.get("appearance").set("darkModeStart", parseInt(darkModeStart)).write();
            user.get("appearance").set("darkModeFinish", parseInt(darkModeFinish)).write();
            if (darkModeStartAmPm === "PM") {
                if (darkModeStart !== 12) {
                    darkModeStart -= 12;
                }
            }
            if (darkModeFinishAmPm === "PM") {
                if (darkModeFinish !== 12) {
                    darkModeFinish -= 12;
                }
            }
            if (darkModeStart === 0) {
                darkModeStart = 12;
            }
            if (darkModeFinish === 24) {
                darkModeFinish = 12;
            }
            message = "Dark theme enabled from " + darkModeStart + " " + darkModeStartAmPm + " to " + darkModeFinish + " " + darkModeFinishAmPm + ".";
        }
        if (holidayEffects !== user.get("appearance").get("holidayEffects").value()) {
            message = "Holiday effects " + (holidayEffects ? "enabled" : "disabled") + "!";
            user.get("appearance").set("holidayEffects", holidayEffects).write();
        }
        return {success: true, message: message};
    }, getUser: function (username) {
        let lc_username = username.toLowerCase();
        let user = db.get("users").find({username: lc_username}).value();
        return user;
    }, setShowMaxGPA: function (username, value) {
        let lc_username = username.toLowerCase();
        let user = db.get("users").find({username: lc_username});
        if ([true, false].includes(value)) {
            user.get("appearance").set("showMaxGPA", value).write();
            return {success: true};
        } else {
            return {success: false};
        }
    }, checkUpdateBackground: function (username) {
        let lc_username = username.toLowerCase();
        let user = db.get("users").find({username: lc_username});
        let syncStatus = user.get("updatedInBackground").value();
        if (syncStatus === "complete") {
            user.set("updatedInBackground", "already done").write();
            return {success: true, message: "Sync Complete!"};
        } else if (syncStatus === "already done") {
            return {success: true, message: "Already Synced!"};
        } else if (syncStatus === "no data") {
            return {success: false, message: "Cannot access grades."};
        } else if (syncStatus === "failed") {
            return {success: false, message: "Sync Failed."};
        } else if (syncStatus === "updating") {
            return {success: false, message: "Did not sync"};
        } else {
            return {success: false, message: "Not syncing"};
        }
    },

    disableGradeSync: function (username) {
        let lc_username = username.toLowerCase();
        let user = db.get("users").find({username: lc_username});
        user.unset("schoolPassword").write();
    },

    updateGradeHistory: async function (acc_username, school_password) {
        let lc_username = acc_username.toLowerCase();
        let userRef = db.get("users").find({username: lc_username});
        let grade_history_update_status = await scraper.loginAndScrapeGrades(userRef.value().schoolUsername, school_password, true);
        if (grade_history_update_status.success) {
            let current_years = Object.keys(userRef.get("grades").value());
            let years = Object.keys(grade_history_update_status.new_grades);
            let weights = userRef.get("weights").value();
            for (let i = 0; i < years.length; i++) {
                if (!(years[i] in weights)) {
                    weights[years[i]] = {};
                    let semesters = Object.keys(grade_history_update_status.new_grades[years[i]]);
                    for (let j = 0; j < semesters.length; j++) {
                        weights[years[i]][semesters[j]] = {};
                    }
                } else {
                    let current_semesters = Object.keys(weights[years[i]]);
                    let semesters = Object.keys(grade_history_update_status.new_grades[years[i]]);
                    for (let j = 0; j < semesters.length; j++) {
                        if (!current_semesters.includes(semesters[j])) {
                            weights[years[i]][semesters[j]] = {};
                        }
                    }
                }
                if (!current_years.includes(years[i])) {
                    userRef.get("grades").set(years[i], grade_history_update_status.new_grades[years[i]]).write();
                } else {
                    let current_semesters = Object.keys(userRef.get("grades").get(years[i]).value());
                    let semesters = Object.keys(grade_history_update_status.new_grades[years[i]]);
                    for (let j = 0; j < semesters.length; j++) {
                        if (!current_semesters.includes(semesters[j])) {
                            userRef.get("grades").get(years[i]).set(semesters[j], grade_history_update_status.new_grades[years[i]][semesters[j]]).write();
                        } else {
                            let classes = grade_history_update_status.new_grades[years[i]][semesters[j]];
                            for (let k = 0; k < classes.length; k++) {
                                let oldRef = userRef.get("grades").get(years[i]).get(semesters[j]).find({class_name: classes[k].class_name}).value();
                                if (!oldRef) {
                                    let temp = userRef.get("grades").get(years[i]).get(semesters[j]).value();
                                    temp = temp.splice(k, 0, grade_history_update_status.new_grades[years[i]][semesters[j]][k]);
                                } else if (classes[k].grades.length) {
                                    oldRef = grade_history_update_status.new_grades[years[i]][semesters[j]][k];
                                } else {
                                    oldRef.overall_percent = grade_history_update_status.new_grades[years[i]][semesters[j]][k].overall_percent;
                                    oldRef.overall_letter = grade_history_update_status.new_grades[years[i]][semesters[j]][k].overall_letter;
                                }
                            }
                        }
                    }
                }
            }
            this.bringUpToDate(lc_username, false);
            userRef.get("updatedGradeHistory").push(Date.now()).write();
            return {success: true, message: "Updated grade history!"};
        }
        return {success: false, message: "Error scraping grade history!"};
    },

    updateGradesBackground: function (acc_username, school_password) {
        let lc_username = acc_username.toLowerCase();
        let user = db.get("users").find({username: lc_username});
        user.set("updatedInBackground", "updating").write();
        this.updateGrades(acc_username, school_password).then(async (resp) => {
            lc_username = acc_username.toLowerCase();
            user = db.get("users").find({username: lc_username});
            if (resp.success) {
                user.set("updatedInBackground", "complete").write();
            } else if (resp.message === "No class data.") {
                user.set("updatedInBackground", "no data").write();
            } else {
                user.set("updatedInBackground", "failed").write();
            }

            if (resp.updateHistory) {
                await this.updateGradeHistory(acc_username, school_password);
            }
        });
    },

    updateGrades: async function (acc_username, school_password) {
        let lc_username = acc_username.toLowerCase();
        let userRef = db.get("users").find({username: lc_username});

        let grade_update_status = await scraper.loginAndScrapeGrades(userRef.value().schoolUsername, school_password);
        if (!grade_update_status.success) {
            //error updating grades
            return grade_update_status;
        }
        for (let i = grade_update_status.new_grades.length; i < userRef.value().appearance.classColors.length; i++) {
            userRef.value().appearance.classColors.pop();
        }

        let {term: oldTerm, semester: oldSemester} = this.getMostRecentTermData(lc_username);
        let newTerm = Object.keys(grade_update_status.new_grades)[0];
        let newSemester = Object.keys(grade_update_status.new_grades[newTerm])[0];
        if (!(newTerm in userRef.get("grades").value())) {
            userRef.get("grades").set(newTerm, {}).write();
        }
        let oldGrades = userRef.get("grades").get(newTerm).get(newSemester).value();
        let oldPSAIDs = [];
        if (oldGrades) {
            oldPSAIDs = oldGrades.map(x => x.grades.map(y => y.psaid)).filter(id => !!id); // Remove undefined (before
                                                                                           // we scraped psaids)
        }
        let newGrades = grade_update_status.new_grades[newTerm][newSemester];
        let newPSAIDs = newGrades.map(x => x.grades.map(y => y.psaid));
        let fixDicts = false;
        for (let i = 0; i < newPSAIDs.length - oldPSAIDs.length; i++) {
            oldPSAIDs.push([]);
            fixDicts = true;
        }
        let added = Object.fromEntries(newPSAIDs.map((classPSAIDs, index) => [newGrades[index].class_name, newPSAIDs[index]]).filter(data => data[1].length));
        let modified = {};
        let removed = {};
        let overall = {};
        if (oldGrades) {
            added = Object.fromEntries(newPSAIDs.map((classPSAIDs, index) => [newGrades[index].class_name, newPSAIDs[index].filter(psaid => !oldPSAIDs[index].includes(psaid))]).filter(data => data[1].length));
            modified = Object.fromEntries(oldGrades.map((classData, index) => [classData.class_name, classData.grades.filter(assignmentData => newPSAIDs[index].includes(assignmentData.psaid) && !_.isEqual(assignmentData, newGrades[index].grades.find(assignment => assignment.psaid === assignmentData.psaid)))]).filter(data => data[1].length));
            removed = Object.fromEntries(oldGrades.map((classData, index) => [classData.class_name, classData.grades.filter(assignmentData => !newPSAIDs[index].includes(assignmentData.psaid))]).filter(data => data[1].length));
            overall = Object.fromEntries(oldGrades.map((classData, index) => {
                let clone = Object.assign({}, classData);
                delete clone.grades;
                delete clone.class_name;
                let newClone = Object.assign({}, newGrades[index]);
                delete newClone.grades;
                delete newClone.class_name;
                return [classData.class_name, Object.fromEntries(Object.entries(clone).filter(([k, v]) => newClone[k] !== v))];
            }).filter(data => Object.keys(data[1]).length));
        }
        let changeData = {
            added: added, modified: modified, removed: removed, overall: overall
        };
        userRef.get("grades").get(newTerm).set(newSemester, newGrades).write();
        if (fixDicts) {
            this.initAddedAssignments(lc_username);
            this.initWeights(lc_username);
            this.initEditedAssignments(lc_username);
        }
        this.bringUpToDate(lc_username);
        let updateHistory = false;
        if (newTerm !== oldTerm && newSemester !== oldSemester) {
            this.setColorPalette(lc_username, "clear", false);
            this.resetSortData(lc_username);
            updateHistory = true;
        }

        let time = Date.now();
        userRef.get("alerts").get("lastUpdated").push({timestamp: time, changeData: changeData}).write();
        userRef.set("updatedInBackground", "already done").write();
        return {
            success: true,
            message: "Updated grades!",
            grades: grade_update_status.new_grades,
            updateHistory: updateHistory,
            updateData: {timestamp: time, changeData: changeData}
        };
    },

    addDbClass: function (className, teacherName) {
        let classesRef = db.get("classes");
        let modClassName = "[\"" + className + "\"]";

        if (!Object.keys(classesRef.value()).includes(className)) {
            // Set default AP/Honors to classes with names that suggest it
            let classtype = "none";
            if (className.includes("AP")) {
                classtype = "ap";
            } else if (className.includes("Honors")) {
                classtype = "honors";
            } else if (className === "Teaching Assistant") {
                classtype = "non-academic";
            }

            classesRef.set(modClassName, {
                classType: classtype
            }).write();
        }
        if (!teacherName) {
            return;
        }
        classesRef.get(modClassName).set(teacherName, {
            weights: {}, //TODO Weights
            hasWeights: null, //TODO Has weights
            suggestions: [] // assignments: {}, //TODO populate assignments by some kind of identifier (points
            // possible + assignment name
            // should be enough to differentiate assignments)
            // overallGrades: [] //TODO populate with overall grades of users (for average) length will give # in class
        }).write();
    },

    setColorPalette: function (username, preset, shuffle) {
        let light, saturation, hues = [0, 30, 60, 120, 180, 240, 270, 300];
        switch (preset) {
            case "pale":
                light = 0.8;
                saturation = 0.7;
                break;
            case "pastel":
                light = 0.7;
                saturation = 0.8;
                break;
            case "clear":
                light = 0.6;
                saturation = 0.7;
                break;
            case "bright":
                light = 0.5;
                saturation = 0.8;
                break;
            case "dull":
                light = 0.4;
                saturation = 0.7;
                break;
            default:
                return {success: false, message: "Invalid preset"};
        }

        let lc_username = username.toLowerCase();
        let userRef = db.get("users").find({username: lc_username});
        let classColors = hues.map(h => chroma({h: h, s: saturation, l: light}).hex());
        if (shuffle) {
            shuffleArray(classColors);
        }
        userRef.get("appearance").set("classColors", classColors).write();
        userRef.get("appearance").set("colorPalette", preset).write();
        userRef.get("appearance").set("shuffleColors", shuffle).write();
        return {success: true, message: classColors};
    },

    getAllUsers: function () {
        return db.get("users").value();
    },

    getDeletedUsers: function () {
        return db.get("deletedUsers").value();
    },

    deleteUser: function (username) {
        let lc_username = username.toLowerCase();
        if (this.userExists(lc_username)) {
            this.prepForDeletion(lc_username);
            db.get("deletedUsers").push(db.get("users").find({username: lc_username}).value()).write();
            db.get("users").remove({username: lc_username}).write();
            return {success: true, message: "Moved " + lc_username + " to deleted users"};
        } else if (this.userDeleted(lc_username)) {
            db.get("deletedUsers").remove({username: lc_username}).write();
            return {success: true, message: "Deleted " + lc_username + " forever"};
        }
        return {success: false, message: "User does not exist."};
    },

    prepForDeletion: function (username) {
        let lc_username = username.toLowerCase();
        db.get("users").find({username: lc_username}).set("deletedTime", Date.now()).write();
        //`TODO maybe get rid of some info when deleting
    },

    restoreUser: function (username) {
        let lc_username = username.toLowerCase();
        if (this.userDeleted(lc_username)) {
            //TODO do the inverse of whatever prepForDeletion does
            db.get("users").push(db.get("deletedUsers").find({username: lc_username}).value()).write();
            db.get("deletedUsers").remove({username: lc_username}).write();
            return {success: true, message: "Restored " + lc_username};
        }
        return {success: false, message: "User does not exist in deleted users."};
    },

    makeAdmin: function (username) {
        let lc_username = username.toLowerCase();
        if (this.userExists(lc_username)) {
            db.get("users").find({username: lc_username}).assign({isAdmin: true}).write();
            return {success: true, message: "Made user admin."};
        }
        return {success: false, message: "User does not exist."};
    },

    removeAdmin: function (username) {
        let lc_username = username.toLowerCase();
        if (this.userExists(lc_username)) {
            db.get("users").find({username: lc_username}).assign({isAdmin: false}).write();
            return {success: true, message: "Removed admin privileges."};
        }
        return {success: false, message: "User does not exist."};
    },

    updateWeightsForClass: function (username, term, semester, className, hasWeights, weights, custom = null, addSuggestion = true) {

        //default update, not override
        let lc_username = username.toLowerCase();
        let userRef = db.get("users").find({username: lc_username});
        let classes = db.get("classes").value();
        //console.log(weights);
        if (!userRef.value()) {
            return {success: false, message: "User does not exist."};
        }
        let teacherName;

        let clsRef = userRef.get("grades").get(term).get(semester).get("grades").find({class_name: className});
        if (clsRef.value()) {
            teacherName = clsRef.value().teacher_name;

            if (addSuggestion && teacherName) {
                this.addWeightsSuggestion(username, className, teacherName, hasWeights, weights);
            }
        }

        if (custom == null) {
            if (teacherName != null && dbContainsClass(className, teacherName)) {
                custom = isCustom({
                                      "weights": weights, "hasWeights": hasWeights
                                  }, {
                                      "weights": classes[className][teacherName]["weights"],
                                      "hasWeights": classes[className][teacherName]["hasWeights"]
                                  });
            } else {
                custom = true;
            }
        }

        let weightsRef = userRef.get("weights").get(term).get(semester);

        //Replace dots(.) with unicode escape sequence
        let modClassName = "[\"" + className + "\"]";
        let currentWeights = weightsRef.get(modClassName).get("weights").value();
        let newWeights = Object.assign({}, currentWeights, weights);
        if (hasWeights === "false") {
            for (let i = 0; i < Object.keys(newWeights).length; i++) {
                newWeights[Object.keys(newWeights)[i]] = null;
            }
        } else {
            for (let i = 0; i < Object.keys(newWeights).length; i++) {
                if (newWeights[Object.keys(newWeights)[i]] === "") {
                    newWeights[Object.keys(newWeights)[i]] = null;
                }
            }
        }

        weightsRef.set(modClassName + ".weights", newWeights).write(); //Replace weights inside of specific class
        weightsRef.set(modClassName + ".hasWeights", hasWeights).write();
        weightsRef.set(modClassName + ".custom", custom).write();
        if (custom) {
            console.log("Custom weight set for " + className + ".");
            return {success: true, message: "Custom weight set for " + className + "."};
        }
        return {success: true, message: "Reset weight for " + className + "."};
        //Important: Do not change first word of message. It is used in frontend to determine if it is custom.
    },

    encryptAndStore: function (username, schoolPass, userPass) {
        let lc_username = username.toLowerCase();
        let user = db.get("users").find({username: lc_username});

        let resp = this.login(username, userPass);
        if (!resp.success) {
            return {success: false, message: resp.message};
        }

        let resizedIV = Buffer.allocUnsafe(16);
        let iv = crypto.createHash("sha256").update("myHashedIV").digest();
        iv.copy(resizedIV);
        let key = crypto.createHash("sha256").update(userPass).digest();
        let cipher = crypto.createCipheriv("aes256", key, resizedIV);
        let encryptedPass = cipher.update(schoolPass, "utf8", "hex");
        encryptedPass += cipher.final("hex");

        user.set("schoolPassword", encryptedPass).write();
        return {success: true, message: encryptedPass};
    },

    decryptAndGet: function (username, userPass) {
        let lc_username = username.toLowerCase();
        let user = db.get("users").find({username: lc_username});

        let resp = this.login(username, userPass);
        if (!resp.success) {
            return {success: false, message: resp.message};
        }

        let resizedIV = Buffer.allocUnsafe(16);
        let iv = crypto.createHash("sha256").update("myHashedIV").digest();
        iv.copy(resizedIV);
        let key = crypto.createHash("sha256").update(userPass).digest();
        let decipher = crypto.createDecipheriv("aes256", key, resizedIV);

        let schoolPass = user.get("schoolPassword").value();

        let decryptedPass = decipher.update(schoolPass, "hex", "utf8");
        decryptedPass += decipher.final("utf8");
        return {success: true, message: decryptedPass};
    },

    whatsNew: function (username, beta) {
        let lc_username = username.toLowerCase();
        let user = db.get("users").find({username: lc_username}).value();
        let end = versionNameArray.indexOf(versionNameArray.find(v => v[1] === user.alerts.latestSeen));
        if (end < 2) {
            end = 2;
        }
        if (beta) {
            return betaChangelogArray.slice(1, end).join("");
        } else {
            let result = "";
            for (let i = 1; i < versionNameArray.length; i++) {
                if (versionNameArray[i][0] !== "Beta") {
                    if (i >= end && result) {
                        break;
                    }
                    result += changelogArray[i];
                }
            }
            return result;
        }
    },

    latestVersionSeen: function (username, beta) {
        let lc_username = username.toLowerCase();
        let alertsRef = db.get("users").find({username: lc_username}).get("alerts");
        if (beta) {
            alertsRef.set("latestSeen", versionNameArray[1][1]).write();
        } else {
            alertsRef.set("latestSeen", versionNameArray.find(v => v[0] !== "Beta" && v[0] !== "Known Issues")[1]).write();
        }
    },

    changelog: function (beta) {
        if (beta) {
            return betaChangelogArray;
        } else {
            return changelogArray;
        }
    },

    watchChangelog: function () {
        // Check for changelog updates every second (This should be light)
        let lastUpdated = Date.now();
        const checking = () => {
            let _lastUpdated = Date.parse(fs.statSync("CHANGELOG.md").mtime);
            if (lastUpdated < _lastUpdated) {
                lastUpdated = _lastUpdated;
                console.log("Updating changelog.");
                this.readChangelog();
            }
        };
        // Do it once
        this.readChangelog().then(() => {
            setInterval(checking, 1000);
        });
    },

    readChangelog: async function () {
        let resultHTML = "";
        let betaResultHTML = "";
        let items = [];
        let bodyCount = -1;
        let item = {title: "", date: "", content: {}};
        versionNameArray = [];
        const line_counter = ((i = 0) => () => ++i)();
        let lineReader = readline.createInterface({
                                                      input: fs.createReadStream("CHANGELOG.md")
                                                  });
        lineReader.on("line", (line, lineno = line_counter()) => {
            if (line.substring(0, 3) === "###") {
                item.content[line.substring(4)] = [];
                bodyCount++;
            } else if (line.substring(0, 2) === "##") {
                if (item.title !== "") {
                    if (item.title !== "Known Issues") {
                        versionNameArray.push(item.title.split(" "));
                    } else {
                        versionNameArray.push(["Known Issues", ""]);
                    }
                    items.push(item);
                    item = {title: "", date: "", content: {}};
                    bodyCount = -1;
                }
                item.title = line.substring(4, line.indexOf("]"));
                item.date = line.substring(line.indexOf("-") + 2);
            } else if (line.substring(0, 1) === "-") {
                if (item.title === "Known Issues" || item.title.substring(0, 12) === "Announcement") {
                    if (!item.content["Default"]) {
                        item.content["Default"] = [];
                    }
                    item.content["Default"].push(line.substring(2));
                } else if (item.content[Object.keys(item.content)[bodyCount]]) {
                    item.content[Object.keys(item.content)[bodyCount]].push(line.substring(2));
                } else {
                    // Prevents changelog file errors from crashing server
                    if (!item.content["Unfiled"]) {
                        item.title = "This shouldn't have happened. Send a bug report in More > Send Feedback. ERR #" + lineno;
                        item.content["Unfiled"] = [];
                    }
                    item.content["Unfiled"].push(line.substring(2));
                }
            }
        }).on("close", () => {
            items.push(item);
            versionNameArray.push(item.title.split(" "));
            let currentVersionFound = false;
            let betaCurrentVersionFound = false;
            for (let i = 0; i < items.length; i++) {
                resultHTML += "<div class=\"changelog-item";
                betaResultHTML += "<div class=\"changelog-item";
                if (items[i].title.substring(0, 4) === "Beta") {
                    if (!betaCurrentVersionFound) {
                        betaResultHTML += " current";
                        betaCurrentVersionFound = true;
                    }
                    resultHTML += "\">";
                    betaResultHTML += "\">";
                } else if (items[i].title.substring(0, 6) === "Stable") {
                    if (!currentVersionFound) {
                        resultHTML += " current\">";
                        currentVersionFound = true;
                    } else {
                        resultHTML += " stable\">";
                    }
                    if (!betaCurrentVersionFound) {
                        betaResultHTML += " current\">";
                        betaCurrentVersionFound = true;
                    } else {
                        betaResultHTML += " stable\">";
                    }
                } else if (items[i].title.substring(0, 12) === "Announcement") {
                    betaResultHTML += " announcement\">";
                    resultHTML += " announcement\">";
                } else if (items[i].title.substring(0, 12) === "Known Issues") {
                    betaResultHTML += " known-issues\">";
                    resultHTML += " known-issues\">";
                } else {
                    betaResultHTML += "\">";
                    resultHTML += "\">";
                }
                resultHTML += "<div class=\"header\">";
                resultHTML += "<div class=\"title\">" + items[i].title + "</div>";
                resultHTML += "<div class=\"date\">" + items[i].date + "</div>";
                resultHTML += "</div>";
                resultHTML += "<div class=\"content\">";
                betaResultHTML += "<div class=\"header\">";
                betaResultHTML += "<div class=\"title\">" + items[i].title + "</div>";
                betaResultHTML += "<div class=\"date\">" + items[i].date + "</div>";
                betaResultHTML += "</div>";
                betaResultHTML += "<div class=\"content\">";
                if (items[i].title !== "Known Issues" && items[i].title.substring(0, 12) !== "Announcement") {
                    for (let j = 0; j < Object.keys(items[i].content).length; j++) {
                        resultHTML += "<div class=\"type " + Object.keys(items[i].content)[j].toLowerCase() + "\">" + Object.keys(items[i].content)[j];
                        betaResultHTML += "<div class=\"type " + Object.keys(items[i].content)[j].toLowerCase() + "\">" + Object.keys(items[i].content)[j];
                        for (let k = 0; k < items[i].content[Object.keys(items[i].content)[j]].length; k++) {
                            resultHTML += "<ul class=\"body\">" + items[i].content[Object.keys(items[i].content)[j]][k] + "</ul>";
                            betaResultHTML += "<ul class=\"body\">" + items[i].content[Object.keys(items[i].content)[j]][k] + "</ul>";
                        }
                        resultHTML += "</div>";
                        betaResultHTML += "</div>";
                    }
                } else {
                    for (let j = 0; j < items[i].content["Default"].length; j++) {
                        resultHTML += "<ul class=\"body\">" + items[i].content["Default"][j] + "</ul>";
                        betaResultHTML += "<ul class=\"body\">" + items[i].content["Default"][j] + "</ul>";
                    }
                }
                resultHTML += "</div>";
                resultHTML += "</div>|";
                betaResultHTML += "</div>";
                betaResultHTML += "</div>|";
            }
            changelogArray = resultHTML.split("|");
            betaChangelogArray = betaResultHTML.split("|");
        });
    },

    usernameAvailable: function (username) {
        if (!!db.get("users").find({username: username.toLowerCase()}).value()) {
            return {success: false, message: "This username is already taken!"};
        } else if (!!db.get("deletedUsers").find({username: username.toLowerCase()}).value()) {
            return {
                success: false,
                message: "This account has been deleted! Email <a href='support@graderoom.me'>support@graderoom.me</a> to recover your account."
            };
        }
        return {success: true, message: "Valid Username!"};
    },

    emailAvailable: function (schoolUsername) {
        if (!!db.get("users").find({schoolUsername: schoolUsername.toLowerCase()}).value()) {
            return {success: false, message: "This email address is already associated with an account."};
        }
        return {success: true, message: "Valid email!"};
    },

    setLoggedIn: function (username) {
        let userRef = db.get("users").find({username: username.toLowerCase()});
        userRef.get("loggedIn").push(Date.now()).write();
    },

    updateTutorial: function (username, action) {
        let userRef = db.get("users").find({username: username.toLowerCase()});
        if (tutorialKeys.includes(action + "Seen")) {
            userRef.get("alerts").get("tutorialStatus").set(action + "Seen", true).write();
            return {success: true, message: userRef.get("alerts").get("tutorialStatus").value()};
        } else {
            return {success: false, message: "Invalid action: " + action};
        }
    },

    resetTutorial: function (username) {
        let userRef = db.get("users").find({username: username.toLowerCase()});
        let tutorialStatus = userRef.get("alerts").get("tutorialStatus").value();
        for (let key of Object.keys(tutorialStatus)) {
            tutorialStatus[key] = false;
        }
        return userRef.get("alerts").get("tutorialStatus").value();
    },

    updateSortData: function (username, sortData) {
        let userRef = db.get("users").find({username: username.toLowerCase()});
        let {dateSort, categorySort} = sortData;
        let sortDataRef = userRef.get("sortingData");
        sortDataRef.set("dateSort", dateSort).write();
        sortDataRef.set("categorySort", categorySort).write();
    },

    updateAddedAssignments: function (username, addedAssignments) {
        let userRef = db.get("users").find({username: username.toLowerCase()});
        let {term, semester} = this.getMostRecentTermData(username);
        userRef.get("addedAssignments").get(term).set(semester, addedAssignments).write();
        return {success: true, message: "Successfully updated added assignments"};
    },

    updateEditedAssignments: function (username, editedAssignments) {
        let userRef = db.get("users").find({username: username.toLowerCase()});
        let {term, semester} = this.getMostRecentTermData(username);
        userRef.get("editedAssignments").get(term).set(semester, editedAssignments).write();
        return {success: true, message: "Successfully updated edited assignments"};
    },

    migrateLastUpdated: function (username) {
        let userRef = db.get("users").find({username: username.toLowerCase()});

        // Migrate
        let copy = JSON.parse(JSON.stringify(userRef.get("alerts").get("lastUpdated").value()));
        if (copy.filter(d => typeof d === "number").length) {
            let updated = [];
            for (let i = 0; i < copy.length; i++) {
                if (typeof copy[i] === "number") {
                    updated.push({timestamp: copy[i], changeData: {}});
                } else {
                    updated.push(copy[i]);
                }
            }
            userRef.get("alerts").set("lastUpdated", updated).write();
        }
    },

    initAddedAssignments: function (username) {
        let temp = {};
        let userRef = db.get("users").find({username: username.toLowerCase()});
        let current = userRef.get("addedAssignments").value();
        let years = Object.keys(userRef.get("grades").value());
        for (let i = 0; i < years.length; i++) {
            let semesters = Object.keys(userRef.get("grades").get(years[i]).value());
            temp[years[i]] = {};
            for (let j = 0; j < semesters.length; j++) {
                temp[years[i]][semesters[j]] = current[years[i]] ? current[years[i]][semesters[j]] || {} : {};
                let classes = userRef.get("grades").get(years[i]).get(semesters[j]).map(d => d.class_name).value();
                for (let k = 0; k < classes.length; k++) {
                    temp[years[i]][semesters[j]][classes[k]] = [];
                }
            }
        }
        userRef.set("addedAssignments", temp).write();
    },

    initWeights: function (username) {
        let temp = {};
        let userRef = db.get("users").find({username: username.toLowerCase()});
        let current = userRef.get("weights").value();
        let reference = userRef.get("grades").value();
        let years = Object.keys(reference);
        for (let i = 0; i < years.length; i++) {
            let semesters = Object.keys(reference[years[i]]);
            temp[years[i]] = current[years[i]] || {};
            for (let j = 0; j < semesters.length; j++) {
                temp[years[i]][semesters[j]] = current[years[i]] ? current[years[i]][semesters[j]] || {} : {};
                let classes = reference[years[i]][semesters[j]].map(d => d.class_name);
                for (let k = 0; k < classes.length; k++) {
                    temp[years[i]][semesters[j]][classes[k]] = current[years[i]] ? current[years[i]][semesters[j]] ? current[years[i]][semesters[j]][classes[k]] || {
                        weights: {}, hasWeights: false
                    } : {weights: {}, hasWeights: false} : {weights: {}, hasWeights: false};
                }
            }
        }
        userRef.set("weights", temp).write();
    },

    initEditedAssignments: function (username) {
        let temp = {};
        let userRef = db.get("users").find({username: username.toLowerCase()});
        let current = userRef.get("editedAssignments").value();
        let years = Object.keys(userRef.get("grades").value());
        for (let i = 0; i < years.length; i++) {
            let semesters = Object.keys(userRef.get("grades").get(years[i]).value());
            temp[years[i]] = {};
            for (let j = 0; j < semesters.length; j++) {
                temp[years[i]][semesters[j]] = current[years[i]] ? current[years[i]][semesters[j]] || {} : {};
                let classes = userRef.get("grades").get(years[i]).get(semesters[j]).map(d => d.class_name).value();
                for (let k = 0; k < classes.length; k++) {
                    temp[years[i]][semesters[j]][classes[k]] = {};
                }
            }
        }
        userRef.set("editedAssignments", temp).write();
    },

    resetSortData: function (username) {
        let userRef = db.get("users").find({username: username.toLowerCase()});
        if (!userRef.get("sortingData").value()) {
            userRef.set("sortingData", {
                dateSort: [], categorySort: []
            }).write();
        }
    },

    // password reset stuff
    checkToken: function (token, user = undefined) {
        if (!token) {
            return {valid: false, gradeSync: null};
        }
        if (!user) {
            user = db.get("users").find({passwordResetToken: token}).value();
        }

        return {valid: user && (user.passwordResetTokenExpire > Date.now()), gradeSync: user && !!user.schoolPassword};
    },

    resetPasswordRequest: function (email) {

        let userRef = db.get("users").find({schoolUsername: email.toLowerCase()});
        let user = userRef.value();

        let token = makeKey(20);
        if (user) {
            userRef.set("passwordResetToken", token).write();
            // expire after 1 hr
            userRef.set("passwordResetTokenExpire", Date.now() + 1000 * 60 * 60 * 24).write();
        }

        return {user: user, token: token}; // determines which email to send
    },

    resetPassword: function (token, newPassword) {

        let user = db.get("users").find({passwordResetToken: token});

        let {valid: validToken, gradeSync: gradeSync} = this.checkToken(token, user.value());

        if (!validToken) {
            return {success: false, message: "Invalid token."};
        }

        let message = validatePassword(newPassword);
        if (message) {
            return {success: false, message: message};
        }

        // since no "old password", just disable gradesync if they have it
        // otherwise decryption won't work

        if (gradeSync) {
            this.disableGradeSync(user.value().username);
        }

        let hashedPass = bcrypt.hashSync(newPassword, roundsToGenerateSalt);
        user.assign({"password": hashedPass}).write();

        user.unset("passwordResetTokenExpire").write();
        // apparently the "reference" continuously runs the intial query?
        // when unsetting the token first, nothing else will write
        user.unset("passwordResetToken").write();

        return {success: true, message: "Password updated."};
    },

    setBlur: function (username, enabled) {
        let user = db.get("users").find({username: username.toLowerCase()});
        user.get("appearance").set("blurEffects", enabled).write();
        return {success: true, message: "Blur effects " + (enabled ? "enabled" : "disabled") + "!"};
    }

};


function isAlphaNumeric(str) {
    let code, i, len;

    for (i = 0, len = str.length; i < len; i++) {
        code = str.charCodeAt(i);
        if (!(code > 47 && code < 58) && // numeric (0-9)
            !(code > 64 && code < 91) && // upper alpha (A-Z)
            !(code > 96 && code < 123)) { // lower alpha (a-z)
            return false;
        }
    }
    return true;
}

function validateEmail(email) {
    let re = /^[a-z]+\.[a-z]+[0-9]{2}@bcp.org$/i;
    return re.test(email);
}

function containsClass(obj, list) {
    for (let i = 0; i < list.length; i++) {
        if (list[i].class_name === obj.class_name) {
            return true;
        }
    }
    return false;
}

function dbContainsClass(class_name, teacher_name) {
    let classes = db.get("classes").value();
    if (classes[class_name] && classes[class_name][teacher_name]) {
        return true;
    }
    return false;
}

function getSuggestionIndex(class_name, teacher_name, weight) {
    // Returns index if suggestion with same weight found, else returns -1
    let classes = db.get("classes").value();
    for (let i = 0; i < classes[class_name][teacher_name]["suggestions"].length; i++) {
        if (compareWeights(weight, classes[class_name][teacher_name]["suggestions"][i])) {
            return i;
        }
    }
    return -1;
}

function deleteUserSuggestion(username, class_name, teacher_name) {
    let lc_username = username.toLowerCase();
    let classes = db.get("classes").value();
    let classRef = db.get("classes");
    for (let i = 0; i < classes[class_name][teacher_name]["suggestions"].length; i++) {
        let usernames = classes[class_name][teacher_name]["suggestions"][i].usernames;
        //remove user from list of usernames
        if (usernames.includes(lc_username)) {
            classRef.get(class_name).get(teacher_name).get("suggestions").nth(i).get("usernames").pull(lc_username).write();
        }
        //remove suggestions if no other users suggested it
        if (usernames.length < 1) {
            classRef.get(class_name).get(teacher_name).get("suggestions").pullAt(i).write();
        }
    }
}

function compareWeights(weight1, weight2) {
    if (weight1["hasWeights"] != weight2["hasWeights"]) {
        return false;
    } else if ((eval(weight1["hasWeights"]) == eval(weight2["hasWeights"])) && (eval(weight2["hasWeights"]) == false)) {
        return true;
    } else {
        return _.isEqual(weight1["weights"], weight2["weights"]);
    }
}

function isCustom(weight, defWeight) {
    //Only checks if weight 2 has the same values for all keys in weight 1
    //Returns true even if weight 2 has extra weights
    if (weight["hasWeights"] != defWeight["hasWeights"]) {
        return true;
    } else if ((eval(weight["hasWeights"]) == eval(defWeight["hasWeights"])) && (eval(defWeight["hasWeights"]) == false)) {
        return false;
    } else {
        let keys = Object.keys(weight["weights"]);
        for (let i = 0; i < keys.length; i++) {
            if ((!keys[i] in defWeight["weights"]) || weight["weights"][keys[i]] != defWeight["weights"][keys[i]]) {
                return true;
            }
        }
    }
    return false;
}

function validatePassword(password) {
    const lowerCaseRegex = new RegExp("^(?=.*[a-z])");
    const upperCaseRegex = new RegExp("^(?=.*[A-Z])");
    const numericRegex = new RegExp("^(?=.*[0-9])");
    let message;
    if (password.length < 6) {
        message = "Your password must be at least 6 characters long.";
    } else if (password.length > 64) {
        message = "Your password must be fewer than 64 characters long.";
    } else if (!lowerCaseRegex.test(password)) {
        message = "Your password must include at least one lowercase character.";
    } else if (!upperCaseRegex.test(password)) {
        message = "Your password must include at least one uppercase character.";
    } else if (!numericRegex.test(password)) {
        message = "Your password must include at least one number.";
    }
    return message;
}

function getPersonalInfo(bcpEmail) {
    // First Name
    let firstName = bcpEmail.indexOf(".") === -1 ? bcpEmail : bcpEmail.substring(0, bcpEmail.indexOf("."));
    firstName = firstName.substring(0, 1).toUpperCase() + firstName.substring(1).toLowerCase();

    // Last Name
    let lastName = bcpEmail.indexOf(".") === -1 ? "" : bcpEmail.indexOf(bcpEmail.match(/\d/)) === -1 ? bcpEmail.substring(bcpEmail.indexOf(".") + 1) : bcpEmail.substring(bcpEmail.indexOf(".") + 1, bcpEmail.indexOf(bcpEmail.match(/\d/)));
    lastName = lastName.substring(0, 1).toUpperCase() + lastName.substring(1).toLowerCase();

    // Graduation Year
    let graduationYear = bcpEmail.indexOf(bcpEmail.match(/\d/)) === -1 ? "" : bcpEmail.indexOf("@") === -1 ? bcpEmail.substring(bcpEmail.indexOf(bcpEmail.match(/\d/))) : bcpEmail.substring(bcpEmail.indexOf(bcpEmail.match(/\d/)), bcpEmail.indexOf("@"));
    if (graduationYear) {
        graduationYear = parseInt(graduationYear);
        graduationYear += 2000;
    }

    return {firstName, lastName, graduationYear};
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function makeKey(length) {
    let result = "";
    let characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

