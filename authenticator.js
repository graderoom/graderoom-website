const low = require("lowdb");
const _ = require("lodash");
const FileSync = require("lowdb/adapters/FileSync");
const adapter = new FileSync("user_db.json");
const db = low(adapter);
const catalogAdapter = new FileSync("catalog.json");
const catalog = low(catalogAdapter);
const bcrypt = require("bcryptjs");
const scraper = require("./scrape");
const chroma = require("chroma-js");
const crypto = require("crypto");
const readline = require("readline");
const fs = require("fs");
const SunCalc = require("suncalc");
const md5 = require("md5");

const roundsToGenerateSalt = 10;

// Change this when updateDB changes
const dbUserVersion = 9;

// Change this when updateAllDB changes
const dbClassVersion = 2;

db.defaults({users: [], keys: [], classes: {}, deletedUsers: []}).write();

let changelogArray = [];
let betaChangelogArray = [];
let versionNameArray = [];

// Update this list with new tutorial keys
let tutorialKeys = ["homeSeen", "navinfoSeen", "moreSeen", "settingsSeen"];

// Update this list with new beta features
let betaFeatureKeys = ["showTermSwitcher", "showFps", "showNotificationPanel"];

module.exports = {

    db: db,

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
        betaFeatureKeys.forEach(feature => {
            if (Object.keys(features).includes(feature)) {
                userRef.get("betaFeatures").set(feature, true).write();
            } else {
                userRef.get("betaFeatures").set(feature, false).write();
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
        let classes = Object.assign({}, db.get("classes").value());
        delete classes["version"];
        return classes;
    },

    /* user functions
     */

    /**
     * CHANGE dbClassVersion whenever you add to this
     */
    updateAllDB: function () {
        let startTime = Date.now();
        console.log("" + startTime + " | Started Database Update");

        let classRef = db.get("classes");
        let classes = db.get("classes").value();

        if (!("version" in classes)) {
            classRef.set("version", 0).write();
        }
        let version = classRef.get("version").value();

        if (version === 0) {

            // Fix Calculus BC AP with space
            let badData = classRef.get("Calculus BC AP ").value();
            if (badData) {
                let temp = badData["Reyerson, Hardy"];
                classRef.get("Calculus BC AP").set("Reyerson, Hardy", temp).write();
                classRef.unset("Calculus BC AP ").write();
            }

            for (let i = 0; i < Object.keys(classes).length; i++) {
                console.log("" + Date.now() + " | Updating Class: " + (i + 1) + " of " + Object.keys(classes).length);
                let className = Object.keys(classes)[i];
                for (let j = 0; j < Object.keys(classes[className]).length; j++) {
                    let teacherName = Object.keys((classes)[className])[j];
                    if (_.isObject(classes[className][teacherName]) && !Array.isArray(classes[className][teacherName])) {
                        if (!("suggestions" in classes[className][teacherName])) {
                            classRef.get(className).get(teacherName).set("suggestions", []).write();
                        }
                        if (!("assignments" in classes[className][teacherName])) {
                            classRef.get(className).get(teacherName).set("assignments", {}).write();
                        }
                        if (!("overall_grades" in classes[className][teacherName])) {
                            classRef.get(className).get(teacherName).set("overall_grades", []).write();
                        }
                        // Remove suggestions without usernames
                        classRef.get(className).get(teacherName).get("suggestions").remove(function (e) {
                            return !("usernames" in e);
                        }).write();
                    }
                    if (!("department" in classes[className])) {
                        // Update classes from catalog
                        let catalogClass = catalog.find({class_name: className}).value();
                        if (catalogClass) {
                            classRef.get(className).set("department", catalogClass.department).write();
                            classRef.get(className).set("grade_levels", catalogClass.grade_levels).write();
                            classRef.get(className).set("credits", catalogClass.credits).write();
                            classRef.get(className).set("terms", catalogClass.terms).write();
                            classRef.get(className).set("description", catalogClass.description).write();
                            classRef.get(className).set("uc_csuClassType", catalogClass.uc_csuClassType).write();
                            classRef.get(className).set("classType", catalogClass.classType).write();
                        } else {
                            classRef.get(className).set("department", "").write();
                            classRef.get(className).set("credits", "").write();
                            classRef.get(className).set("terms", "").write();
                            classRef.get(className).set("description", "").write();
                            classRef.get(className).set("uc_csuClassType", "").write();
                            classRef.get(className).set("classType", "").write();
                        }
                    }
                    if ("ClassType" in classes[className]) {
                        classRef.get(className).set("classType", classRef.get(className).get("ClassType").value()).write();
                        classRef.get(className).unset("ClassType").write();
                    }
                }
            }

            // Update class db version
            console.log("Updated classdb to version 1");
            classRef.set("version", 1).write();
            version = 1;
        }
        //Clear classes to migrate to semester system
        if (version === 1) {
            db.set("classes", {}).write();
            // Update class db version
            classRef.set("version", 2).write();
            version = 2;
            console.log("Updated classdb to version 2");
        }

        if (version === 2) {
            let classesToFix = classRef.value();
            let terms = Object.keys(classesToFix);
            for (let i = 0; i < terms.length; i++) {
                if (!terms[i].includes("\n\n")) {
                    continue;
                }
                let oldTerm;
                let realTerm = terms[i].substring(2, 4);
                realTerm = realTerm + "-" + (parseInt(realTerm) + 1);

                oldTerm = classesToFix[terms[i]];
                classRef.set(realTerm, oldTerm).write();
                classRef.unset(terms[i]).write();
            }
            // Do the thing to make it work
            classRef.set("version", 3).write();
            version = 3;
            console.log("Updated classdb to version 3");
        }


        let users = db.get("users").value();
        for (let i = 0; i < users.length; i++) {
            console.log("" + Date.now() + " | Updating User: " + (i + 1) + " of " + users.length);
            this.updateDB(users[i].username);
        }

        let endTime = Date.now();
        console.log("" + endTime + " | Database Updated in " + (endTime - startTime) + "ms");
    },

    /**
     * CHANGE dbUserVersion whenever you change this function
     * @param username user to update
     */
    updateDB: function (username) {
        let lc_username = username.toLowerCase();
        let userRef = db.get("users").find({username: lc_username});
        let user = userRef.value();

        // Add db versioning
        if (!("version" in user)) {
            userRef.set("version", 0).write();
        }
        let version = userRef.get("version").value();
        if (version === 0) {

            // Update change data with ps_locked
            let lastUpdateds = userRef.get("alerts").get("lastUpdated").value();
            for (let i = 0; i < lastUpdateds.length; i++) {
                if ("ps_locked" in lastUpdateds[i]) {
                    continue;
                }
                // This is really sketch but it should work
                let cutoff = new Date(2020, 11, 18).getTime(); // Dec 18, 2020 is when grades locked in 2020
                lastUpdateds[i].ps_locked = lastUpdateds[i].timestamp >= cutoff; // Hopefully pushed before grades
                                                                                 // unlocked
            }

            if (!Array.isArray(userRef.get("updatedGradeHistory").value())) {
                userRef.set("updatedGradeHistory", []).write();
            }

            // Update darkModeStart/Finish
            if (userRef.get("appearance").get("darkModeStart").value() === null) {
                userRef.get("appearance").set("darkModeStart", 18).write();
                userRef.get("appearance").set("darkModeFinish", 7).write();
            }

            if (userRef.get("appearance").get("darkModeStart").value() <= 24) {
                let _start = userRef.get("appearance").get("darkModeStart").value();
                _start = new Date("0/" + _start + ":00").getTime();
                let _finish = userRef.get("appearance").get("darkModeFinish").value();
                _finish = new Date("0/" + (_finish % 24) + ":00").getTime();
                userRef.get("appearance").set("darkModeStart", _start).write();
                userRef.get("appearance").set("darkModeFinish", _finish).write();

                // Force old auto mode to sunrise/sunset which is objectively better
                if (userRef.get("appearance").get("theme").value() === "auto") {
                    userRef.get("appearance").set("theme", "sun").write();
                }
            }

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
            }

            badData = userRef.get("weights").get("19-20").get("S1").get("Calculus BC AP ").value();
            if (badData) {
                userRef.get("weights").get("19-20").get("S1").set("Calculus BC AP", userRef.get("weights").get("19-20").get("S1").get("Calculus BC AP ").value()).write();
                userRef.get("weights").get("19-20").get("S1").unset("Calculus BC AP ").write();
            }

            badData = userRef.get("weights").get("19-20").get("S2").get("Calculus BC AP ").value();
            if (badData) {
                userRef.get("weights").get("19-20").get("S2").set("Calculus BC AP", userRef.get("weights").get("19-20").get("S2").get("Calculus BC AP ").value()).write();
                userRef.get("weights").get("19-20").get("S2").unset("Calculus BC AP ").write();
            }

            badData = userRef.get("addedAssignments").get("19-20").get("S1").get("Calculus BC AP ");
            if (badData) {
                userRef.get("addedAssignments").get("19-20").get("S1").set("Calculus BC AP", userRef.get("addedAssignments").get("19-20").get("S1").get("Calculus BC AP ").value()).write();
                userRef.get("addedAssignments").get("19-20").get("S1").unset("Calculus BC AP ").write();
            }

            // Migrate lastupdated
            this.migrateLastUpdated(user.username);

            // Add editedAssignments dict
            if (!userRef.get("editedAssignments").value()) {
                userRef.set("editedAssignments", {}).write();
            }

            // Add sorting data
            this.resetSortData(user.username);

            // Fix dicts
            this.initAddedAssignments(lc_username);
            this.initWeights(lc_username);
            this.initEditedAssignments(lc_username);

            // Change S0s to S3s
            // Use existence of accentColor to know db version
            // TODO maybe add some sort of db versioning to make this easier in the future
            if (user.appearance.accentColor === null) {
                let gradesToFix = user.grades;
                let terms = Object.keys(gradesToFix);
                for (let i = 0; i < terms.length; i++) {
                    let old_S0;
                    if ("S0" in user.grades[terms[i]]) {
                        old_S0 = user.grades[terms[i]]["S0"];
                        userRef.get("grades").get(terms[i]).set("S3", old_S0).write();
                        userRef.get("grades").get(terms[i]).unset("S0").write();
                    }
                    if ("S0" in user.weights[terms[i]]) {
                        old_S0 = user.weights[terms[i]]["S0"];
                        userRef.get("weights").get(terms[i]).set("S3", old_S0).write();
                        userRef.get("weights").get(terms[i]).unset("S0").write();
                    }
                    if ("S0" in user.addedAssignments[terms[i]]) {
                        old_S0 = user.addedAssignments[terms[i]]["S0"];
                        userRef.get("addedAssignments").get(terms[i]).set("S3", old_S0).write();
                        userRef.get("addedAssignments").get(terms[i]).unset("S0").write();
                    }
                    if ("S0" in user.editedAssignments[terms[i]]) {
                        old_S0 = user.editedAssignments[terms[i]]["S0"];
                        userRef.get("editedAssignments").get(terms[i]).set("S3", old_S0).write();
                        userRef.get("editedAssignments").get(terms[i]).unset("S0").write();
                    }
                }
                userRef.get("appearance").unset("accentColor").write();
            }

            // Save update
            console.log("Updated user to version 1");
            userRef.set("version", 1).write();
            version = 1;

        }

        if (version === 1) {

            // Fix lastupdated ps_locked issue
            let lastUpdated = userRef.get("alerts").get("lastUpdated").value();
            let lastUpdatedRef = userRef.get("alerts").get("lastUpdated");
            for (let i = 0; i < lastUpdated.length; i++) {
                let cutoff = new Date(2020, 11, 18).getTime(); // Dec 18, 2020 is when grades locked in 2020
                lastUpdated[i].ps_locked = lastUpdated[i].timestamp >= cutoff;
                let changeData = lastUpdated[i].changeData;
                if (!("overall" in changeData)) {
                    continue;
                } // Skip these too
                let bad_version = Object.values(changeData.overall).filter(o => o.ps_locked === true || Object.keys(o).length === 0).length !== 0;
                if (bad_version) {
                    lastUpdatedRef.nth(i).get("changeData").set("overall", {}).write(); // Deletes ps_locked from wrong
                                                                                        // place
                }
            }

            // Save update
            console.log("Updated user to version 2");
            userRef.set("version", 2).write();
            version = 2;
        }

        if (version === 2) {
            // Fix lastupdated ps_locked issue
            let lastUpdated = userRef.get("alerts").get("lastUpdated").value();
            let lastUpdatedRef = userRef.get("alerts").get("lastUpdated");
            for (let i = 0; i < lastUpdated.length; i++) {
                let changeData = lastUpdated[i].changeData;
                if (("overall" in changeData) && "ps_locked" in changeData.overall) {
                    lastUpdatedRef.get("changeData").get("overall").unset("ps_locked").write();
                }
            }


            // Save update
            console.log("Updated user to version 3");
            userRef.set("version", 3).write();
            version = 3;
        }

        if (version === 3) {

            // Fix class db
            let gradesToFix = user.grades;
            let terms = Object.keys(gradesToFix);
            for (let i = 0; i < terms.length; i++) {
                if (!terms[i].includes("\n\n")) {
                    continue;
                }
                let oldTerm;
                let realTerm = terms[i].substring(2, 4);
                realTerm = realTerm + "-" + (parseInt(realTerm) + 1);

                oldTerm = user.grades[terms[i]];
                userRef.get("grades").set(realTerm, oldTerm).write();
                userRef.get("grades").unset(terms[i]).write();
                if (terms[i] in user.weights) {
                    oldTerm = user.weights[terms[i]];
                    userRef.get("weights").set(realTerm, oldTerm).write();
                    userRef.get("weights").unset(terms[i]).write();
                }
                if (terms[i] in user.addedAssignments) {
                    oldTerm = user.addedAssignments[terms[i]];
                    userRef.get("addedAssignments").set(realTerm, oldTerm).write();
                    userRef.get("addedAssignments").unset(terms[i]).write();
                }
                if (terms[i] in user.editedAssignments) {
                    oldTerm = user.editedAssignments[terms[i]];
                    userRef.get("editedAssignments").set(realTerm, oldTerm).write();
                    userRef.get("editedAssignments").unset(terms[i]).write();
                }
            }

            // Save update
            console.log("Updated user to version 4");
            userRef.set("version", 4).write();
            version = 4;
        }

        if (version === 4) {
            // Fix lastupdated ps_locked issue
            let lastUpdated = userRef.get("alerts").get("lastUpdated").value();
            let lastUpdatedRef = userRef.get("alerts").get("lastUpdated");
            for (let i = 0; i < lastUpdated.length; i++) {
                let changeData = lastUpdated[i].changeData;
                if (("overall" in changeData)) {
                    let classes = Object.keys(changeData.overall);
                    for (let j = 0; j < classes.length; j++) {
                        lastUpdatedRef.get("changeData").get("overall").get(classes[j]).unset("ps_locked").write();
                    }
                }
            }


            // Save update
            console.log("Updated user to version 5");
            userRef.set("version", 5).write();
            version = 5;
        }

        if (version === 5) {
            // Fix lastupdated ps_locked issue
            let lastUpdated = userRef.get("alerts").get("lastUpdated").value();
            let lastUpdatedRef = userRef.get("alerts").get("lastUpdated");
            for (let i = 0; i < lastUpdated.length; i++) {
                let changeData = lastUpdated[i].changeData;
                if (("overall" in changeData)) {
                    let classes = Object.keys(changeData.overall);
                    for (let j = 0; j < classes.length; j++) {
                        if ("ps_locked" in changeData.overall[classes[j]]) {
                            lastUpdatedRef.nth(i).get("changeData").get("overall").get(classes[j]).unset("ps_locked").write();
                        }
                    }
                }
            }


            // Save update
            console.log("Updated user to version 6");
            userRef.set("version", 6).write();
            version = 6;
        }

        if (version === 6) {
            // Fix lastupdated ps_locked issue
            let lastUpdated = userRef.get("alerts").get("lastUpdated").value();
            let lastUpdatedRef = userRef.get("alerts").get("lastUpdated");
            for (let i = 0; i < lastUpdated.length; i++) {
                let changeData = lastUpdated[i].changeData;
                if (("overall" in changeData)) {
                    let classes = Object.keys(changeData.overall);
                    for (let j = 0; j < classes.length; j++) {
                        if (!Object.keys(changeData.overall[classes[j]]).length) {
                            lastUpdatedRef.nth(i).get("changeData").get("overall").unset(classes[j]).write();
                        }
                    }
                }
            }


            // Save update
            console.log("Updated user to version 7");
            userRef.set("version", 7).write();
            version = 7;
        }

        if (version === 7) {
            // Fix lastupdated ps_locked issue
            let lastUpdated = userRef.get("alerts").get("lastUpdated").value();
            let lastUpdatedRef = userRef.get("alerts").get("lastUpdated");
            for (let i = 0; i < lastUpdated.length; i++) {
                let changeData = lastUpdated[i].changeData;
                if (("overall" in changeData)) {
                    let classes = Object.keys(changeData.overall);
                    for (let j = 0; j < classes.length; j++) {
                        if (!Object.keys(changeData.overall[classes[j]]).length) {
                            lastUpdatedRef.nth(i).get("changeData").get("overall").unset(classes[j]).write();
                        }
                    }
                }
            }


            // Save update
            console.log("Updated user to version 8");
            userRef.set("version", 8).write();
            version = 8;
        }

        if (version === 8) {
            // Fix lastupdated ps_locked issue
            let lastUpdated = userRef.get("alerts").get("lastUpdated").value();
            let lastUpdatedRef = userRef.get("alerts").get("lastUpdated");
            for (let i = 0; i < lastUpdated.length; i++) {
                let changeData = lastUpdated[i].changeData;
                if (("overall" in changeData)) {
                    let classes = Object.keys(changeData.overall);
                    for (let j = 0; j < classes.length; j++) {
                        if ("ps_locked" in changeData.overall[classes[j]]) {
                            lastUpdatedRef.nth(i).get("changeData").get("overall").get(classes[j]).unset("ps_locked").write();
                        }
                        if (!Object.keys(changeData.overall[classes[j]]).length) {
                            lastUpdatedRef.nth(i).get("changeData").get("overall").unset(classes[j]).write();
                        }
                    }
                }
            }


            // Save update
            console.log("Updated user to version 9");
            userRef.set("version", 9).write();
            version = 9;
        }

        // if (version === 9) {
        //     // Add notifications dict
        //     // userRef.set("notifications", {"Important": [], "Unread": [], "All": []}).write();
        //
        //     // Notification format in backend (for reference)
        //     // {
        //     //     "type": "announcement"/"stable"/"beta"/"sync"/"empty-sync"/"error"
        //     //     "id": For changelog stuff, the version code, for everything else, the timestamp doubles as an id
        //     //     "timestamp": ,
        //     //     "read": false/true
        //     // }
        //
        //     // Add all changelog notifications and read them until changeloglastseen
        //
        //
        //     // Save update
        //     console.log("Updated user to version 10");
        //     userRef.set("version", 10).write();
        //     version = 10;
        // }


        /** Stuff that happens no matter what */
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

        // Set all new beta features to true
        let betaFeatures = userRef.get("betaFeatures").value();
        if (betaFeatures.active) {
            for (let i = 0; i < betaFeatureKeys.length; i++) {
                if (!(betaFeatureKeys[i] in betaFeatures)) {
                    betaFeatures[betaFeatureKeys[i]] = true;
                }
            }
            userRef.set("betaFeatures", betaFeatures).write();
        }

        this.bringUpToDate(username, false);

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
                    console.log("" + Date.now() + " | Bringing class up to date: " + (i + 1) + " of " + user.grades[_term][_semester].length + " in " + _term + " " + _semester);
                    let className = user.grades[_term][_semester][i].class_name;
                    let teacherName = user.grades[_term][_semester][i].teacher_name;

                    //Add all semesters to db
                    if (!dbContainsTerm(_term, _semester)) {
                        this.addDbTerm(_term, _semester);
                        console.log("adding term");
                    }
                    //Add all classes to db
                    if (!dbContainsClass(_term, _semester, className, teacherName)) {
                        this.addDbClass(_term, _semester, className, teacherName);
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

                    // Add hasWeights: false
                    if (!Object.keys(user.weights[_term][_semester][className]["weights"]).length) {
                        userRef.get("weights").get(_term).get(_semester).get(className).set("hasWeights", false).write();
                    }

                    // Add all weights that exist in user grades
                    for (let j = 0; j < goodWeights.length; j++) {
                        if (!Object.keys(user.weights[_term][_semester][className]["weights"]).includes(goodWeights[j])) {
                            user.weights[_term][_semester][className]["weights"][goodWeights[j]] = null;
                        }
                    }

                    //Updates weights from classes db
                    if (userRef.get("weights").get(_term).get(_semester).get(className).get("custom").value() === false && dbContainsClass(_term, _semester, className, teacherName)) {
                        if (classes[_term][_semester][className][teacherName]["hasWeights"] == "false" || Object.keys(classes[_term][_semester][className][teacherName]["weights"]).length > 0) {
                            this.updateWeightsForClass(username, _term, _semester, className, classes[_term][_semester][className][teacherName]["hasWeights"], classes[_term][_semester][className][teacherName]["weights"], false, false);
                        }
                    }

                    //Remove any weights that don't exist in user grades
                    let max = Object.keys(user.weights[_term][_semester][className]["weights"]).length;
                    for (let j = 0; j < max; j++) {
                        if (!goodWeights.includes(Object.keys(user.weights[_term][_semester][className]["weights"])[j])) {
                            delete user.weights[_term][_semester][className]["weights"][Object.keys(user.weights[_term][_semester][className]["weights"])[j--]];
                            max--;
                        }
                    }

                    //Set to point-based if only one category exists (& category is null)
                    if (Object.keys(user.weights[_term][_semester][className]["weights"]).length === 1) {
                        if (user.weights[_term][_semester][className]["weights"][Object.keys(user.weights[_term][_semester][className]["weights"])[0]] == null) {
                            user.weights[_term][_semester][className]["hasWeights"] = "false";
                        }
                    }

                    //Add user's weights as suggestions
                    this.addWeightsSuggestion(lc_username, _term, _semester, className, teacherName, user.weights[_term][_semester][className]["hasWeights"], user.weights[_term][_semester][className]["weights"]);

                    //Set custom to not custom if it is same as classes db
                    if (user.weights[_term][_semester][className]["custom"] && dbContainsClass(_term, _semester, className, teacherName)) {
                        user.weights[_term][_semester][className]["custom"] = isCustom({
                                                                                           "weights": user.weights[_term][_semester][className]["weights"],
                                                                                           "hasWeights": user.weights[_term][_semester][className]["hasWeights"]
                                                                                       }, {
                                                                                           "weights": classes[_term][_semester][className][teacherName]["weights"],
                                                                                           "hasWeights": classes[_term][_semester][className][teacherName]["hasWeights"]
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

    getClassesMostRecentTermData: function () {
        let terms = Object.keys(this.getAllClassData());
        let term = terms[terms.map(t => parseInt(t.substring(0, 2))).reduce((maxIndex, term, index, arr) => term > arr[maxIndex] ? index : maxIndex, 0)];
        let semesters = Object.keys(this.getAllClassData()[term]);
        let semester = semesters[semesters.map(s => parseInt(s.substring(1))).reduce((maxIndex, semester, index, arr) => semester > arr[maxIndex] ? index : maxIndex, 0)];
        return {term: term, semester: semester};
    },

    getRelClassData: function (username, term, semester) {
        let lc_username = username.toLowerCase();
        let userRef = db.get("users").find({username: lc_username});
        let userClasses = [];
        for (let i = 0; i < Object.keys(userRef.get("grades").value()).length; i++) {
            let t = Object.keys(userRef.get("grades").value())[i];
            for (let j = 0; j < Object.keys(userRef.get("grades").value()[t]).length; j++) {
                let s = Object.keys(userRef.get("grades").value()[t])[j];
                userRef.get("grades").get(t).get(s).value().forEach(classRef => userClasses.push([t, s, classRef.class_name, classRef.teacher_name]));
            }
        }

        let classes = db.get("classes").value();
        let relClasses = {};
        for (let i = 0; i < userClasses.length; i++) {
            //Give priority for data from target term & semester, in case class is in multiple semesters
            if ((userClasses[i][0] === term && userClasses[i][1] === semester) || !relClasses.hasOwnProperty(userClasses[i][2])) {
                relClasses[userClasses[i][2]] = {
                    "department": classes[userClasses[i][0]][userClasses[i][1]][userClasses[i][2]]["department"],
                    "classType": classes[userClasses[i][0]][userClasses[i][1]][userClasses[i][2]]["classType"],
                    "uc_csuClassType": classes[userClasses[i][0]][userClasses[i][1]][userClasses[i][2]]["uc_csuClassType"],
                    "weights": userClasses[i][3] ? classes[userClasses[i][0]][userClasses[i][1]][userClasses[i][2]][userClasses[i][3]]["weights"] : null,
                    "hasWeights": userClasses[i][3] ? classes[userClasses[i][0]][userClasses[i][1]][userClasses[i][2]][userClasses[i][3]]["hasWeights"] : null,
                    "credits": classes[userClasses[i][0]][userClasses[i][1]][userClasses[i][2]]["credits"],
                    "terms": classes[userClasses[i][0]][userClasses[i][1]][userClasses[i][2]]["terms"]
                };
            }
        }
        return relClasses;
    },

    updateWeightsInClassDb: function (term, semester, className, teacherName, hasWeights, weights) {
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
            classDb.get(term).get(semester).get(className).get(teacherName).set("weights", modWeights).write(); //Overwrites
                                                                                                                // existing
                                                                                                                // weights
            classDb.get(term).get(semester).get(className).get(teacherName).set("hasWeights", hasWeights).write();
        } else {
            return {success: false, message: "One weight required!"};
        }
        let suggestionNum = this.deleteSuggestionInClassDb(term, semester, className, teacherName, hasWeights, weights).suggestion;
        return {
            success: true, message: "Updated weights for " + className + " | " + teacherName, suggestion: suggestionNum
        };
    },

    deleteSuggestionInClassDb: function (term, semester, className, teacherName, hasWeights, weights) {
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

        classRef.get(term).get(semester).get(className).get(teacherName).get("suggestions").remove(function (e) {
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
    },

    addWeightsSuggestion: function (username, term, semester, className, teacherName, hasWeights, weights) {
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
        // console.log(classDb.get(term).get(semester).get(className).get(teacherName).get("suggestions").value());
        //delete any old suggestions for user
        deleteUserSuggestion(lc_username, term, semester, className, teacherName);
        let suggestionIndex = getSuggestionIndex(term, semester, className, teacherName, {
            "weights": modWeights, "hasWeights": hasWeights
        });
        if (suggestionIndex != -1) {
            //Add username to existing suggestion
            classDb.get(term).get(semester).get(className).get(teacherName).get("suggestions").nth(suggestionIndex).get("usernames").push(lc_username).write();
        } else {
            //Add suggestion if doesn't already exist
            let classWeights = classDb.get(term).get(semester).get(className).get(teacherName).get("weights").value();
            let classHasWeights = classDb.get(term).get(semester).get(className).get(teacherName).get("hasWeights").value();
            //Test if same as class weights
            if (!compareWeights({"weights": classWeights, "hasWeights": classHasWeights}, {
                "weights": modWeights, "hasWeights": hasWeights
            })) {
                //Test if all weights are null
                if (!Object.values(modWeights).every(x => x === null) || hasWeights == "false") {
                    classDb.get(term).get(semester).get(className).get(teacherName).get("suggestions").push({
                                                                                                                "usernames": [lc_username],
                                                                                                                "weights": modWeights,
                                                                                                                "hasWeights": hasWeights
                                                                                                            }).write();
                }
            }
        }
        // console.log(classDb.get(term).get(semester).get(className).get(teacherName).get("suggestions").value());
    },

    updateClassTypeInClassDb: function (term, semester, className, classType) {
        let classDb = db.get("classes");
        classDb.get(term).get(semester).get(className).set("classType", classType).write();
        return {success: true, message: "Set class type of " + className + " to " + classType};
    },

    updateUCCSUClassTypeInClassDb: function (term, semester, className, classType) {
        let classDb = db.get("classes");
        classDb.get(term).get(semester).get(className).set("uc_csuClassType", classType).write();
        return {success: true, message: "Set uc class type of " + className + " to " + classType};
    },

    //Need to add Try Catches to error check when updating db values
    addNewUser: function (username, password, schoolUsername, isAdmin, beta = false) {

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
                                         version: dbUserVersion,
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
                                             theme: "sun",
                                             classColors: [],
                                             colorPalette: "clear",
                                             shuffleColors: false,
                                             holidayEffects: true,
                                             showNonAcademic: true,
                                             darkModeStart: 946778400000,
                                             darkModeFinish: 946738800000,
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
                                         updatedGradeHistory: [],
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
        let user;
        if (this.userExists(username) || this.emailExists(username)) {
            user = this.getUser(username);
            if (bcrypt.compareSync(password, user.password)) {
                return {success: true, message: "Login Successful"};
            } else {
                return {success: false, message: "Incorrect Graderoom password."};
            }
        }
        return {success: false, message: "Invalid credentials."};
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
    }, emailExists: function (email) {
        let lc_email = email.toLowerCase();
        let user = db.get("users").find({schoolUsername: lc_email}).value();
        return !!user;
    }, userDeleted: function (username) {
        let isEmail = validateEmail(username);
        let lc_username = username.toLowerCase();
        let user;
        if (isEmail) {
            user = db.get("deletedUsers").find({schoolUsername: lc_username}).value();
        } else {
            user = db.get("deletedUsers").find({username: lc_username}).value();
        }
        return !!user;
    }, setTheme: function (username, theme, darkModeStart, darkModeFinish, holidayEffects, blurEffects) {
        let lc_username = username.toLowerCase();
        let user = db.get("users").find({username: lc_username});
        user.get("appearance").set("theme", theme).write();
        let message = theme.replace(/^\w/, c => c.toUpperCase()) + " theme enabled!";
        if (theme === "auto") {
            darkModeStart = new Date("0/" + darkModeStart);
            darkModeFinish = new Date("0/" + darkModeFinish);
            user.get("appearance").set("darkModeStart", darkModeStart.getTime()).write();
            user.get("appearance").set("darkModeFinish", darkModeFinish.getTime()).write();
            message = "Dark theme enabled from " + darkModeStart.toLocaleTimeString() + " to " + darkModeFinish.toLocaleTimeString() + ".";
        }
        if (theme === "sun") {
            message = "Dark theme enabled from sunset to sunrise.";
        }
        if (holidayEffects !== user.get("appearance").get("holidayEffects").value()) {
            message = "Holiday effects " + (holidayEffects ? "enabled" : "disabled") + "!";
            user.get("appearance").set("holidayEffects", holidayEffects).write();
        }
        if (blurEffects !== user.get("appearance").get("blurEffects").value()) {
            message = this.setBlur(lc_username, blurEffects).message;
        }
        return {success: true, message: message};
    }, getUser: function (username) {
        let isEmail = validateEmail(username);
        let lc_username = username.toLowerCase();
        if (isEmail) {
            return db.get("users").find({schoolUsername: lc_username}).value();
        }
        return db.get("users").find({username: lc_username}).value();
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
        } else if (syncStatus === "history") {
            return {success: false, message: "Syncing History..."};
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
        console.log("Updating grade history...");
        let lc_username = acc_username.toLowerCase();
        let userRef = db.get("users").find({username: lc_username});
        let grade_history_update_status = await scraper.loginAndScrapeGrades(userRef.value().schoolUsername, school_password, "", "", "true");
        let changeData = {};
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
                            let oldGrades = userRef.get("grades").get(years[i]).get(semesters[j]).cloneDeep().value();
                            for (let k = 0; k < classes.length; k++) {
                                let oldRef = userRef.get("grades").get(years[i]).get(semesters[j]).nth(k);
                                if (!oldRef.value()) {
                                    userRef.get("grades").get(years[i]).get(semesters[j]).splice(k, 0, grade_history_update_status.new_grades[years[i]][semesters[j]][k]).write();
                                } else if (classes[k].grades.length) {
                                    userRef.get("grades").get(years[i]).get(semesters[j]).splice(k, 1, grade_history_update_status.new_grades[years[i]][semesters[j]][k]).write();
                                } else {
                                    oldRef.set("overall_percent", grade_history_update_status.new_grades[years[i]][semesters[j]][k].overall_percent).write();
                                    oldRef.set("overall_letter", grade_history_update_status.new_grades[years[i]][semesters[j]][k].overall_letter).write();
                                }
                            }
                            let newGrades = userRef.get("grades").get(years[i]).get(semesters[j]).value();
                            let overall = {};
                            if (oldGrades) {
                                overall = Object.fromEntries(oldGrades.map((classData, index) => {
                                    let clone = Object.assign({}, classData);
                                    delete clone.grades;
                                    delete clone.class_name;
                                    delete clone.ps_locked;
                                    delete clone.student_id;
                                    delete clone.section_id;
                                    delete clone.teacher_name;
                                    let newClone = Object.assign({}, newGrades.find(g => g.class_name === classData.class_name));
                                    delete newClone.grades;
                                    delete newClone.class_name;
                                    delete newClone.ps_locked;
                                    delete newClone.teacher_name;
                                    return [classData.class_name, Object.fromEntries(Object.entries(clone).filter(([k, v]) => newClone[k] !== v))];
                                }).filter(data => Object.keys(data[1]).length));
                            }
                            changeData = {
                                added: {}, modified: {}, removed: {}, overall: overall
                            };
                        }
                    }
                }
            }

            let time = Date.now();
            userRef.get("alerts").get("lastUpdated").push({
                                                              timestamp: time, changeData: changeData, ps_locked: false
                                                          }).write();
            this.initAddedAssignments(lc_username);
            this.initWeights(lc_username);
            this.initEditedAssignments(lc_username);
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
            if (resp.updateHistory) {
                user.set("updatedInBackground", "history").write();
                resp = await this.updateGradeHistory(acc_username, school_password);
            }
            if (resp.success) {
                user.set("updatedInBackground", "complete").write();
            } else if (resp.message === "No class data.") {
                user.set("updatedInBackground", "no data").write();
            } else {
                user.set("updatedInBackground", "failed").write();
            }
        });
    },

    updateGrades: async function (acc_username, school_password) {
        let lc_username = acc_username.toLowerCase();
        let userRef = db.get("users").find({username: lc_username});

        let {term: oldTerm, semester: oldSemester} = this.getMostRecentTermData(lc_username);
        let term_data_if_locked = {term: oldTerm, semester: oldSemester};
        let data_if_locked = "";
        if (oldTerm && oldSemester) {
            data_if_locked = userRef.get("grades").value()[oldTerm][oldSemester].map(class_data => _.omit(class_data, ["grades"]));
        } else {
            term_data_if_locked = "";
        }

        let grade_update_status = await scraper.loginAndScrapeGrades(userRef.value().schoolUsername, school_password, data_if_locked, term_data_if_locked);
        if (!grade_update_status.success) {
            //error updating grades
            this.resetSortData(lc_username);
            return Object.assign({}, grade_update_status, {updateHistory: true});
        }

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
        let add = newPSAIDs.length - oldPSAIDs.length;
        for (let i = 0; i < add; i++) {
            oldPSAIDs.push([]);
        }
        let added = Object.fromEntries(newPSAIDs.map((classPSAIDs, index) => [newGrades[index].class_name, newPSAIDs[index]]).filter(data => data[1].length));
        let modified = {};
        let removed = {};
        let overall = {};
        if (oldGrades) {
            added = Object.fromEntries(newPSAIDs.map((classPSAIDs, index) => [newGrades[index].class_name, newPSAIDs[index].filter(psaid => !oldPSAIDs[index].includes(psaid))]).filter(data => data[1].length));
            modified = Object.fromEntries(oldGrades.map((classData, index) => [classData.class_name, classData.grades.filter(assignmentData => newPSAIDs[index].includes(assignmentData.psaid) && !_.isEqual(assignmentData, newGrades[index].grades.find(assignment => assignment.psaid === assignmentData.psaid)))]).filter(data => data[1].length));
            removed = Object.fromEntries(oldGrades.map((classData, index) => [classData.class_name, classData.grades.filter(assignmentData => assignmentData.psaid && !newPSAIDs[index].includes(assignmentData.psaid))]).filter(data => data[1].length));
            overall = Object.fromEntries(oldGrades.map((classData, index) => {
                let clone = Object.assign({}, classData);
                delete clone.grades;
                delete clone.class_name;
                let newClone = Object.assign({}, newGrades[index]);
                delete newClone.grades;
                delete newClone.class_name;
                return [classData.class_name, Object.fromEntries(Object.entries(clone).filter(([k, v]) => newClone[k] !== v || k === "ps_locked"))];
            }).filter(data => Object.keys(data[1]).length));
        }
        let ps_locked = Object.values(overall).filter(o => o.ps_locked === true).length !== 0;
        if (ps_locked) {
            overall = {}; // It's not possible to get this data when PowerSchool is locked
        } else {
            for (let i = 0; i < Object.keys(overall).length; i++) {
                delete overall[Object.keys(overall)[i]].ps_locked;
                if (!Object.keys(overall[Object.keys(overall)[i]]).length) {
                    delete overall[Object.keys(overall)[i--]];
                }
            }
        }
        let changeData = {
            added: added, modified: modified, removed: removed, overall: overall
        };
        userRef.get("grades").get(newTerm).set(newSemester, newGrades).write();
        this.initAddedAssignments(lc_username);
        this.initWeights(lc_username);
        this.initEditedAssignments(lc_username);
        this.bringUpToDate(lc_username);
        let updateHistory = false;
        if ((newTerm !== oldTerm || newSemester !== oldSemester) || !userRef.get("updatedGradeHistory").value().length || userRef.get("updatedGradeHistory").value().slice(-1)[0] < new Date(2021, 0, 11).getTime()) {
            this.resetSortData(lc_username);
            updateHistory = true;
        }

        let time = Date.now();
        userRef.get("alerts").get("lastUpdated").push({
                                                          timestamp: time, changeData: changeData, ps_locked: ps_locked
                                                      }).write();
        userRef.set("updatedInBackground", "already done").write();
        return {
            success: true,
            message: "Updated grades!",
            grades: grade_update_status.new_grades,
            updateHistory: updateHistory,
            updateData: {timestamp: time, changeData: changeData}
        };
    },

    addDbClass: function (term, semester, className, teacherName) {
        let classesSemesterRef = db.get("classes").get(term).get(semester);
        let modClassName = "[\"" + className + "\"]";

        if (!Object.keys(classesSemesterRef.value()).includes(className)) {
            // Update classes from catalog
            let catalogClass = catalog.find({class_name: className}).value();
            classesSemesterRef.set(modClassName, {}).write();
            if (catalogClass) {
                classesSemesterRef.get(modClassName).set("department", catalogClass.department).write();
                classesSemesterRef.get(modClassName).set("grade_levels", catalogClass.grade_levels).write();
                classesSemesterRef.get(modClassName).set("credits", catalogClass.credits).write();
                classesSemesterRef.get(modClassName).set("terms", catalogClass.terms).write();
                classesSemesterRef.get(modClassName).set("description", catalogClass.description).write();
                classesSemesterRef.get(modClassName).set("uc_csuClassType", catalogClass.uc_csuClassType).write();
                classesSemesterRef.get(modClassName).set("classType", catalogClass.classType).write();
            } else {
                classesSemesterRef.get(modClassName).set("department", "").write();
                classesSemesterRef.get(modClassName).set("credits", "").write();
                classesSemesterRef.get(modClassName).set("terms", "").write();
                classesSemesterRef.get(modClassName).set("description", "").write();
                classesSemesterRef.get(modClassName).set("uc_csuClassType", "").write();
                classesSemesterRef.get(modClassName).set("classType", "").write();
            }
        }
        if (!teacherName) {
            return;
        }
        classesSemesterRef.get(modClassName).set(teacherName, {
            weights: {}, hasWeights: null, suggestions: [], assignments: {}, overall_grades: []
        }).write();
    },

    addDbTerm: function (term, semester) {
        let classesRef = db.get("classes");
        if (!classesRef.has(term).value()) {
            classesRef.set(term, {[semester]: {}}).write();
        } else if (classesRef.get(term).has("S1").value() && semester == "S2") {
            classesRef.get(term).set(semester, classesRef.get(term).get("S1").value()).write();
        } else if (classesRef.get(term).has("S2").value() && semester == "S1") {
            classesRef.get(term).set(semester, classesRef.get(term).get("S2").value()).write();
        } else {
            classesRef.get(term).set(semester, {}).write();
        }
        ``;
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
        if (this.userExists(lc_username) && !this.getUser(lc_username).isAdmin) {
            this.prepForDeletion(lc_username);
            db.get("deletedUsers").push(db.get("users").find({username: lc_username}).value()).write();
            db.get("users").remove({username: lc_username}).write();
            return {success: true, message: "Moved " + lc_username + " to deleted users"};
        } else if (this.userDeleted(lc_username)) {
            db.get("deletedUsers").remove({username: lc_username}).write();
            return {success: true, message: "Deleted " + lc_username + " forever"};
        }
        return {success: false, message: "User could not be deleted."};
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

    removeAdmin: function (username, requester) {
        let lc_username = username.toLowerCase();
        if (lc_username === requester) {
            return {success: false, message: "Could not remove admin privileges."};
        }
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

        let clsRef = userRef.get("grades").get(term).get(semester).find({class_name: className});
        if (clsRef.value()) {
            teacherName = clsRef.value().teacher_name;

            if (addSuggestion && teacherName) {
                this.addWeightsSuggestion(username, term, semester, className, teacherName, hasWeights, weights);
                console.log("ran");
            }
        }

        if (custom == null) {
            if (teacherName != null && dbContainsClass(term, semester, className, teacherName)) {
                custom = isCustom({
                                      "weights": weights, "hasWeights": hasWeights
                                  }, {
                                      "weights": classes[term][semester][className][teacherName]["weights"],
                                      "hasWeights": classes[term][semester][className][teacherName]["hasWeights"]
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

    readChangelog: function (filename) {
        async function read() {
            let resultHTML = "";
            let betaResultHTML = "";
            let items = [];
            let bodyCount = -1;
            let item = {title: "", date: "", content: {}};
            versionNameArray = [];
            const line_counter = ((i = 0) => () => ++i)();
            let lineReader = readline.createInterface({
                                                          input: fs.createReadStream(filename)
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
                                resultHTML += "<span class=\"body\">" + items[i].content[Object.keys(items[i].content)[j]][k] + "</span>";
                                betaResultHTML += "<span class=\"body\">" + items[i].content[Object.keys(items[i].content)[j]][k] + "</span>";
                            }
                            resultHTML += "</div>";
                            betaResultHTML += "</div>";
                        }
                    } else {
                        if (!items[i].content["Default"]) {
                            items[i].content["Default"] = [];
                        }
                        for (let j = 0; j < items[i].content["Default"].length; j++) {
                            resultHTML += "<span class=\"body\">" + items[i].content["Default"][j] + "</span>";
                            betaResultHTML += "<span class=\"body\">" + items[i].content["Default"][j] + "</span>";
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
        }

        read().then(() => {
            console.log(`${filename} parsed`);
        });
    },

    watchChangelog: function () {
        let md5Previous = null;
        let fsWait = false;
        fs.watch("CHANGELOG.md", (event, filename) => {
            if (filename) {
                if (fsWait) {
                    return;
                }
                fsWait = setTimeout(() => {
                    fsWait = false;
                }, 100);
                fs.access(filename, fs.F_OK, (err) => {
                    const _readChangelog = this.readChangelog;
                    let waiting;
                    let read = function () {
                        if (waiting) {
                            clearTimeout(waiting);
                        }
                        const md5Current = md5(fs.readFileSync(filename));
                        if (md5Current === md5Previous) {
                            return;
                        }
                        md5Previous = md5Current;
                        console.log(`${filename} modified, reading...`);
                        _readChangelog(filename);
                    };
                    if (err) {
                        if (fs.existsSync(filename)) {
                            read();
                        }
                        console.log(`${filename} not found`);
                        let waitFormula = function (index) {
                            return 500 * Math.ceil(-(40 / (index + 4)) + 10);
                        };
                        let wait = function () {
                            let waitTime = waitFormula(waitIndex) / 1000;
                            waitIndex++;
                            if (!fs.existsSync(filename)) {
                                if (waiting) {
                                    clearTimeout(waiting);
                                }
                                console.log(`Try ${waitIndex} | Waiting for ${waitTime} seconds...`);
                                waiting = setTimeout(wait, waitFormula(waitIndex));
                            }
                        };
                        let waitIndex = 1;
                        let waitTime = waitFormula(waitIndex) / 1000;
                        if (waiting) {
                            clearTimeout(waiting);
                        }
                        console.log(`Try ${waitIndex} | Waiting for ${waitTime} seconds...`);
                        waiting = setTimeout(wait, waitFormula(waitIndex));
                    } else {
                        read();
                    }
                });
            }
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
        if (!current) {
            userRef.set("addedAssignments", {}).write();
            current = userRef.get("addedAssignments").value();
        }
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
        if (!current) {
            userRef.set("weights", {}).write();
            current = userRef.get("weights").value();
        }
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
        if (!current) {
            userRef.set("editedAssignments", {}).write();
            current = userRef.get("editedAssignments").value();
        }
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
    },

    getSunriseAndSunset: function () {
        const SAN_JOSE_CA = {lat: 37, lng: -122};
        let times = SunCalc.getTimes(new Date(), SAN_JOSE_CA.lat, SAN_JOSE_CA.lng);
        let sunrise = new Date("0/" + times.sunrise.getHours() + ":" + times.sunrise.getMinutes());
        let sunset = new Date("0/" + times.sunset.getHours() + ":" + times.sunset.getMinutes());
        return {sunrise: sunrise, sunset: sunset};
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

function dbContainsClass(term, semester, class_name, teacher_name) {
    if (dbContainsTerm(term, semester)) {
        let classes = db.get("classes").value();
        if (classes[term][semester][class_name] && classes[term][semester][class_name][teacher_name]) {
            return true;
        }
    }
    return false;
}

function dbContainsTerm(term, semester) {
    let classes = db.get("classes").value();
    if (classes[term] && classes[term][semester]) {
        return true;
    }
    return false;
}

function getSuggestionIndex(term, semester, class_name, teacher_name, weight) {
    // Returns index if suggestion with same weight found, else returns -1
    let classes = db.get("classes").value();
    for (let i = 0; i < classes[term][semester][class_name][teacher_name]["suggestions"].length; i++) {
        if (compareWeights(weight, classes[term][semester][class_name][teacher_name]["suggestions"][i])) {
            return i;
        }
    }
    return -1;
}

function deleteUserSuggestion(username, term, semester, class_name, teacher_name) {
    let lc_username = username.toLowerCase();
    let classes = db.get("classes").value();
    let classRef = db.get("classes");
    for (let i = 0; i < classes[term][semester][class_name][teacher_name]["suggestions"].length; i++) {
        let usernames = classes[term][semester][class_name][teacher_name]["suggestions"][i].usernames;
        //remove user from list of usernames
        if (usernames.includes(lc_username)) {
            classRef.get(term).get(semester).get(class_name).get(teacher_name).get("suggestions").nth(i).get("usernames").pull(lc_username).write();
            //remove suggestions if no other users suggested it
            if (usernames.length <= 1) {
                classRef.get(term).get(semester).get(class_name).get(teacher_name).get("suggestions").pullAt(i).write();
            }
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
    if (eval(weight["hasWeights"]) != eval(defWeight["hasWeights"])) {
        return true;
    }
    if ((eval(weight["hasWeights"]) == eval(defWeight["hasWeights"])) && (eval(defWeight["hasWeights"]) == false)) {
        return false;
    }
    let keys = Object.keys(weight["weights"]);
    for (let i = 0; i < keys.length; i++) {
        if ((!keys[i] in defWeight["weights"]) || weight["weights"][keys[i]] != defWeight["weights"][keys[i]]) {
            return true;
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
