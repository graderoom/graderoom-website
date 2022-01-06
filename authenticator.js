const _ = require("lodash");
const bcrypt = require("bcryptjs");
const scraper = require("./scrape");
const chroma = require("chroma-js");
const crypto = require("crypto");
const SunCalc = require("suncalc");
const stream = require("stream");
const socketManager = require("./socketManager");
const db = require("./dbClient");

module.exports = {
    setRemoteAccess: function (username, allowed) {
        let lc_username = username.toLowerCase();
        let userRef = db.get("users").find({username: lc_username});
        userRef.get("alerts").set("remoteAccess", allowed).write();
    }, //TODO


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
    }, //TODO


    setNonAcademic: function (username, value) {
        let lc_username = username.toLowerCase();
        let userRef = db.get("users").find({username: lc_username});
        userRef.get("appearance").set("showNonAcademic", value).write();
    }, //TODO


    setRegularizeClassGraphs: function (username, value) {
        let lc_username = username.toLowerCase();
        let userRef = db.get("users").find({username: lc_username});
        userRef.get("appearance").set("regularizeClassGraphs", value).write();
    }, //TODO


    setWeightedGPA: function (username, value) {
        let lc_username = username.toLowerCase();
        let userRef = db.get("users").find({username: lc_username});
        userRef.get("appearance").set("weightedGPA", value).write();
    }, //TODO


    leaveBeta: function (username) {
        let lc_username = username.toLowerCase();
        let userRef = db.get("users").find({username: lc_username});
        userRef.set("betaFeatures", {"active": false}).write();
    }, //TODO


    /* class database */
    getAllClassData: function () {
        let classes = Object.assign({}, db.get("classes").value());
        delete classes["version"];
        return classes;
    }, //TODO


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

        function saveUpdate(_version) {
            classRef.set("version", _version).write();
            console.log("Updated classdb to version " + _version);
        }

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
            saveUpdate(++version);
        }
        //Clear classes to migrate to semester system
        if (version === 1) {
            db.set("classes", {}).write();
            // Update class db version
            saveUpdate(++version);
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
            saveUpdate(++version);
        }

        if (version === 3) {
            // Fix summer 2021 issues
            let classes = classRef.value();
            if ("SS2021" in classes) {
                let temp = classRef.get("SS2021").value();
                if ("S1" in temp) {
                    classRef.get("20-21").set("S3", temp.S1).write();
                }
                classRef.unset("SS2021").write();
            }
            saveUpdate(++version);
        }


        let users = db.get("users").value();
        for (let i = 0; i < users.length; i++) {
            console.log("" + Date.now() + " | Updating User: " + (i + 1) + " of " + users.length);
            this.updateDB(users[i].username);
        }

        let endTime = Date.now();
        console.log("" + endTime + " | Database Updated in " + (endTime - startTime) + "ms");
    }, //TODO


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

        function saveUpdate(_version) {
            userRef.set("version", _version).write();
            console.log("Updated user to version " + _version);
        }

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
            saveUpdate(++version);
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
            saveUpdate(++version);
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
            saveUpdate(++version);
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
            saveUpdate(++version);
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
            saveUpdate(++version);
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
            saveUpdate(++version);
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
            saveUpdate(++version);
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
            saveUpdate(++version);
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
            saveUpdate(++version);
        }

        if (version === 9) {
            // Fix lastupdated ps_locked issue
            let lastUpdated = userRef.get("alerts").get("lastUpdated").value();
            let lastUpdatedRef = userRef.get("alerts").get("lastUpdated");
            for (let i = 0; i < lastUpdated.length; i++) {
                let cutoff = new Date(2021, 4, 20).getTime(); // May 20, 2021 is when grades locked in 2021
                if (lastUpdated[i].timestamp < cutoff) {
                    continue;
                }
                let changeData = lastUpdated[i].changeData;
                let hasOverallChanges = Object.values(changeData.overall).filter(o => Object.keys(o).length > 1).length > 0;
                if (!("overall" in changeData) || hasOverallChanges) {
                    continue;
                }
                lastUpdatedRef.nth(i).get("changeData").set("overall", {}).write();
                lastUpdatedRef.nth(i).set("ps_locked", true).write();
            }


            // Save update
            saveUpdate(++version);
        }

        if (version === 10) {
            // Add notifications dict
            userRef.set("notifications", {
                important: [buildStarterNotification(Date.now())], unread: [], dismissed: []
            }).write();

            // Save update
            saveUpdate(++version);
        }

        if (version === 11) {
            // Fix SS2021
            let grades = user.grades;
            let weights = user.weights;
            let added = user.addedAssignments;
            let edited = user.editedAssignments;

            let gradesRef = userRef.get("grades");
            let weightsRef = userRef.get("weights");
            let addedRef = userRef.get("addedAssignments");
            let editedRef = userRef.get("editedAssignments");

            let badObjects = [[grades, gradesRef], [weights, weightsRef], [added, addedRef], [edited, editedRef]];

            for (let [object, ref] of badObjects) {
                for (let key in object) {
                    if (key.startsWith("SS")) {
                        let S3;
                        if ("S1" in object[key]) {
                            S3 = object[key]["S1"];
                        }
                        let start_year = parseInt(key.substring(4)) - 1;
                        let end_year = start_year + 1;
                        let real_key = start_year + "-" + end_year;
                        ref.get(real_key).set("S3", S3).write();
                        ref.unset(key).write();
                    }
                }
            }
            // Save update
            saveUpdate(++version);
        }

        if (version === 12) {
            // Add logging var
            userRef.set("enableLogging", true).write();

            // Save update
            saveUpdate(++version);
        }

        if (version === 13) {
            // Fix 21-22 data
            let grades = user.grades;

            let gradesRef = userRef.get("grades");
            let weightsRef = userRef.get("weights");
            let addedRef = userRef.get("addedAssignments");
            let editedRef = userRef.get("editedAssignments");

            let realGrades;
            if ("S1" in grades) {
                realGrades = Object.values(Object.values(grades.S1)[0])[0];
                gradesRef.set("21-22", {"S1": realGrades}).write();
                gradesRef.unset("S1").write();

                let _weights = {};
                let _added = {};
                let _edited = {};
                for (let c of realGrades) {
                    _weights[c.class_name] = {"weights": {}, hasWeights: false, custom: false};
                    _added[c.class_name] = [];
                    _edited[c.class_name] = [];
                }
                weightsRef.set("21-22", {"S1": _weights}).write();
                addedRef.set("21-22", {"S1": _added}).write();
                editedRef.set("21-22", {"S1": _edited}).write();
            }

            saveUpdate(++version);
        }

        if (version === 14) {
            // Fix 21-22 data
            let addedRef = userRef.get("addedAssignments");
            let editedRef = userRef.get("editedAssignments");

            let added = user.addedAssignments;
            let edited = user.editedAssignments;

            let badObjects = [[added, addedRef], [edited, editedRef]];

            for (let [obj, ref] of badObjects) {
                if ("21-22" in obj && "S1" in obj["21-22"]) {
                    let entries = Object.entries(obj["21-22"]["S1"]);
                    for (let [key, value] of entries) {
                        if (Array.isArray(value)) {
                            ref.get("21-22").get("S1").set(key, {}).write();
                        }
                    }
                }
            }

            saveUpdate(++version);
        }

        if (version === 15) {
            userRef.get("appearance").set("animateWhenUnfocused", false).write();

            saveUpdate(++version);
        }

        if (version === 16) {
            userRef.get("appearance").set("seasonalEffects", user.appearance.holidayEffects).write();
            userRef.get("appearance").unset("holidayEffects").write();

            saveUpdate(++version);
        }

        if (version === 17) {
            userRef.get("appearance").set("showFps", false).write();

            saveUpdate(++version);
        }

        if (version === 18) {
            // Multischool support
            userRef.set("school", "bellarmine").write();

            saveUpdate(++version);
        }

        if (version === 19) {
            if (user.school !== "basis") {
                let email = user.schoolUsername;
                if (!("lastName" in user.personalInfo)) {
                    // Last Name
                    let lastName = email.indexOf(".") === -1 ? "" : email.indexOf(email.match(/\d/)) === -1 ? email.substring(email.indexOf(".") + 1) : email.substring(email.indexOf(".") + 1, email.indexOf(email.match(/\d/)));
                    lastName = lastName[0].toUpperCase() + lastName.substring(1).toLowerCase();
                    userRef.get("personalInfo").set("lastName", lastName).write();
                }

                if (!("graduationYear" in user.personalInfo)) {
                    // Graduation Year
                    let graduationYear = email.indexOf(email.match(/\d/)) === -1 ? "" : email.indexOf("@") === -1 ? email.substring(email.indexOf(email.match(/\d/))) : email.substring(email.indexOf(email.match(/\d/)), email.indexOf("@"));
                    if (graduationYear) {
                        graduationYear = parseInt(graduationYear);
                        graduationYear += 2000;
                    }
                    userRef.get("personalInfo").set("graduationYear", graduationYear).write();
                }
            }

            saveUpdate(++version);
        }

        /** Stuff that happens no matter what */
            // Remove any extra tutorial keys
        let existingKeys = Object.keys(userRef.get("alerts").get("tutorialStatus").value());
        for (let i = 0; i < existingKeys.length; i++) {
            if (!_tutorialKeys.includes(existingKeys[i])) {
                userRef.get("alerts").get("tutorialStatus").unset(existingKeys[i]).write();
            }
        }

        // Add tutorial keys
        for (let i = 0; i < _tutorialKeys.length; i++) {
            if (!userRef.get("alerts").get("tutorialStatus").get(_tutorialKeys[i]).value()) {
                userRef.get("alerts").get("tutorialStatus").set(_tutorialKeys[i], false).write();
            }
        }

        // Remove extra beta features
        let existingFeatures = Object.keys(userRef.get("betaFeatures").value());
        for (let i = 0; i < existingFeatures.length; i++) {
            if (existingFeatures[i] === "active") {
                continue;
            }
            if (!_betaFeatureKeys.includes(existingFeatures[i])) {
                userRef.get("betaFeatures").unset(existingFeatures[i]).write();
            }
        }

        // Set all new beta features to true
        let betaFeatures = userRef.get("betaFeatures").value();
        if (betaFeatures.active) {
            for (let i = 0; i < _betaFeatureKeys.length; i++) {
                if (!(_betaFeatureKeys[i] in betaFeatures)) {
                    betaFeatures[_betaFeatureKeys[i]] = true;
                }
            }
            userRef.set("betaFeatures", betaFeatures).write();
        }

        // This is unnecessary and increases startup time by a lot
        // this.bringUpToDate(username);

    }, //TODO
    bringUpToDate: function (username, term, semester, className) {
        let lc_username = username.toLowerCase();
        let userRef = db.get("users").find({username: lc_username});
        let user = userRef.value();
        let classes = db.get("classes").value();

        for (let g = 0; g < Object.keys(user.grades).length; g++) {
            let _term = Object.keys(user.grades)[g];
            if (term && _term !== term) {
                continue;
            }
            for (let h = 0; h < Object.keys(user.grades[_term]).length; h++) {
                let _semester = Object.keys(user.grades[_term])[h];
                if (semester && _semester !== semester) {
                    continue;
                }
                for (let i = 0; i < user.grades[_term][_semester].length; i++) {
                    let _className = user.grades[_term][_semester][i].class_name;
                    if (className && _className !== className) {
                        continue;
                    }
                    console.log("" + Date.now() + " | Bringing class up to date: " + (i + 1) + " of " + user.grades[_term][_semester].length + " in " + _term + " " + _semester);
                    let teacherName = user.grades[_term][_semester][i].teacher_name;

                    //Add all semesters to db
                    if (!dbContainsTerm(_term, _semester)) {
                        this.addDbTerm(_term, _semester);
                        console.log("adding term");
                    }
                    //Add all classes to db
                    if (!dbContainsClass(_term, _semester, _className, teacherName)) {
                        this.addDbClass(_term, _semester, _className, teacherName);
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
                    if (!Object.keys(user.weights[_term][_semester][_className]["weights"]).length) {
                        userRef.get("weights").get(_term).get(_semester).get(_className).set("hasWeights", false).write();
                    }

                    // Add all weights that exist in user grades
                    for (let j = 0; j < goodWeights.length; j++) {
                        if (!Object.keys(user.weights[_term][_semester][_className]["weights"]).includes(goodWeights[j])) {
                            user.weights[_term][_semester][_className]["weights"][goodWeights[j]] = null;
                        }
                    }

                    //Updates weights from classes db
                    if (userRef.get("weights").get(_term).get(_semester).get(_className).get("custom").value() === false && dbContainsClass(_term, _semester, _className, teacherName)) {
                        if (classes[_term][_semester][_className][teacherName]["hasWeights"] == "false" || Object.keys(classes[_term][_semester][_className][teacherName]["weights"]).length > 0) {
                            this.updateWeightsForClass(username, _term, _semester, _className, classes[_term][_semester][_className][teacherName]["hasWeights"], classes[_term][_semester][_className][teacherName]["weights"], false, false);
                        }
                    }

                    //Remove any weights that don't exist in user grades
                    let max = Object.keys(user.weights[_term][_semester][_className]["weights"]).length;
                    for (let j = 0; j < max; j++) {
                        if (!goodWeights.includes(Object.keys(user.weights[_term][_semester][_className]["weights"])[j])) {
                            delete user.weights[_term][_semester][_className]["weights"][Object.keys(user.weights[_term][_semester][_className]["weights"])[j--]];
                            max--;
                        }
                    }

                    //Set to point-based if only one category exists (& category is null)
                    if (Object.keys(user.weights[_term][_semester][_className]["weights"]).length === 1) {
                        if (user.weights[_term][_semester][_className]["weights"][Object.keys(user.weights[_term][_semester][_className]["weights"])[0]] == null) {
                            user.weights[_term][_semester][_className]["hasWeights"] = "false";
                        }
                    }

                    //Add user's weights as suggestions
                    this.addWeightsSuggestion(lc_username, _term, _semester, _className, teacherName, user.weights[_term][_semester][_className]["hasWeights"], user.weights[_term][_semester][_className]["weights"]);

                    //Set custom to not custom if it is same as classes db
                    if (user.weights[_term][_semester][_className]["custom"] && dbContainsClass(_term, _semester, _className, teacherName)) {
                        user.weights[_term][_semester][_className]["custom"] = isCustom({
                                                                                            "weights": user.weights[_term][_semester][_className]["weights"],
                                                                                            "hasWeights": user.weights[_term][_semester][_className]["hasWeights"]
                                                                                        }, {
                                                                                            "weights": classes[_term][_semester][_className][teacherName]["weights"],
                                                                                            "hasWeights": classes[_term][_semester][_className][teacherName]["hasWeights"]
                                                                                        });
                    }
                }
            }
        }
    }, //TODO


    semesterExists: function (username, term, semester) {
        let userRef = db.get("users").find({username: username.toLowerCase()});
        return (term in userRef.get("grades").value() && semester in userRef.get("grades").get(term).value());
    }, //TODO


    classesSemesterExists: function (term, semester) {
        let classes = this.getAllClassData();
        return (term in classes && semester in classes[term]);
    }, //TODO


    getMostRecentTermData: function (username) {
        let userRef = db.get("users").find({username: username.toLowerCase()});
        if (!Object.keys(userRef.get("grades").value()).length) {
            // Don't give data if new acc
            return {term: false, semester: false};
        }
        let terms = Object.keys(userRef.get("grades").value());
        let term = terms[terms.map(t => parseInt(t.substring(0, 2))).reduce((maxIndex, term, index, arr) => term > arr[maxIndex] ? index : maxIndex, 0)];
        if (userRef.get("school").value() === "basis") {
            return {term: term, semester: "_"};
        }
        let semesters = Object.keys(userRef.get("grades").get(term).value());
        let semester = semesters[semesters.map(s => parseInt(s.substring(1))).reduce((maxIndex, semester, index, arr) => semester > arr[maxIndex] ? index : maxIndex, 0)];
        return {term: term, semester: semester};
    }, //TODO


    getClassesMostRecentTermData: function () {
        let terms = Object.keys(this.getAllClassData());
        let term = terms[terms.map(t => parseInt(t.substring(0, 2))).reduce((maxIndex, term, index, arr) => term > arr[maxIndex] ? index : maxIndex, 0)];
        let semesters = Object.keys(this.getAllClassData()[term]);
        let semester = semesters[semesters.map(s => parseInt(s.substring(1))).reduce((maxIndex, semester, index, arr) => semester > arr[maxIndex] ? index : maxIndex, 0)];
        return {term: term, semester: semester};
    }, //TODO


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
    }, //TODO


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
    }, //TODO

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
    }, //TODO


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
    }, //TODO


    updateClassTypeInClassDb: function (term, semester, className, classType) {
        let classDb = db.get("classes");
        classDb.get(term).get(semester).get(className).set("classType", classType).write();
        return {success: true, message: "Set class type of " + className + " to " + classType};
    }, //TODO


    updateUCCSUClassTypeInClassDb: function (term, semester, className, classType) {
        let classDb = db.get("classes");
        classDb.get(term).get(semester).get(className).set("uc_csuClassType", classType).write();
        return {success: true, message: "Set uc class type of " + className + " to " + classType};
    }, //TODO

    addNewUser: function (school, username, password, schoolUsername, isAdmin, beta = false) {
        // Convert username to lowercase

        return new Promise(resolve => {
                // Actually add the user to the collection
                db.addUser(school, username, password, schoolUsername, isAdmin, beta).then((result) => {
                    return resolve(result);
                });
        });

    },

    login: function (username, password) {
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
    },  //TODO
    changePassword: async function (username, oldPassword, password) {
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
    }, //TODO

    changeSchoolEmail: function (username, schoolUsername) {
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
    }, //TODO

    setTheme: function (username, theme, darkModeStart, darkModeFinish, seasonalEffects, blurEffects) {
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
        if (seasonalEffects !== user.get("appearance").get("seasonalEffects").value()) {
            message = "Seasonal effects " + (seasonalEffects ? "enabled" : "disabled") + "!";
            user.get("appearance").set("seasonalEffects", seasonalEffects).write();
        }
        if (blurEffects !== user.get("appearance").get("blurEffects").value()) {
            message = this.setBlur(lc_username, blurEffects).message;
        }
        return {success: true, message: message};
    }, //TODO

    getUser: function (usernameOrEmail) {
        let isEmail = validateEmail(usernameOrEmail);
        let lc_username = usernameOrEmail.toLowerCase();
        if (isEmail) {
            return db.get("users").find({schoolUsername: lc_username}).value();
        }
        return db.get("users").find({username: lc_username}).value();
    }, //TODO

    getUserRef: function (username) {
        return db.get("users").find({username: username.toLowerCase()});
    }, //TODO

    setShowMaxGPA: function (username, value) {
        let lc_username = username.toLowerCase();
        let user = db.get("users").find({username: lc_username});
        if ([true, false].includes(value)) {
            user.get("appearance").set("showMaxGPA", value).write();
            return {success: true};
        } else {
            return {success: false};
        }
    }, //TODO

    checkUpdateBackground: function (username) {
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
        } else if (syncStatus === "account-inactive") {
            return {success: false, message: "Your PowerSchool account is no longer active."};
        } else {
            return {success: false, message: "Not syncing"};
        }
    }, //TODO

    disableGradeSync: function (username) {
        let lc_username = username.toLowerCase();
        let user = db.get("users").find({username: lc_username});
        user.unset("schoolPassword").write();
    }, //TODO

    updateGradeHistory: function (acc_username, school_password) {
        console.log("Updating grade history...");
        let lc_username = acc_username.toLowerCase();
        let userRef = db.get("users").find({username: lc_username});
        let _stream = new stream.Readable({
                                              objectMode: true, read: () => {
            }
                                          });

        _stream.on("data", (data) => {
            console.log(data);
            let changeData = {};
            if ("success" in data) {
                if (data.success) {
                    let current_years = Object.keys(userRef.get("grades").value());
                    let years = Object.keys(data.new_grades);
                    let school = userRef.get("school").value();
                    switch (school) {
                        case "basis":
                            let new_weights = data.new_weights;
                            let term = Object.keys(new_weights)[0];
                            userRef.get("weights").set(term, {"_": new_weights[term]._}).write();
                            break;
                        default:
                            let weights = userRef.get("weights").value();
                            for (let i = 0; i < years.length; i++) {
                                if (!(years[i] in weights)) {
                                    weights[years[i]] = {};
                                    let semesters = Object.keys(data.new_grades[years[i]]);
                                    for (let j = 0; j < semesters.length; j++) {
                                        weights[years[i]][semesters[j]] = {};
                                    }
                                } else {
                                    let current_semesters = Object.keys(weights[years[i]]);
                                    let semesters = Object.keys(data.new_grades[years[i]]);
                                    for (let j = 0; j < semesters.length; j++) {
                                        if (!current_semesters.includes(semesters[j])) {
                                            weights[years[i]][semesters[j]] = {};
                                        }
                                    }
                                }
                                if (!current_years.includes(years[i])) {
                                    userRef.get("grades").set(years[i], data.new_grades[years[i]]).write();
                                } else {
                                    let current_semesters = Object.keys(userRef.get("grades").get(years[i]).value());
                                    let semesters = Object.keys(data.new_grades[years[i]]);
                                    for (let j = 0; j < semesters.length; j++) {
                                        if (!current_semesters.includes(semesters[j])) {
                                            userRef.get("grades").get(years[i]).set(semesters[j], data.new_grades[years[i]][semesters[j]]).write();
                                        } else {
                                            let classes = data.new_grades[years[i]][semesters[j]];
                                            let oldGrades = userRef.get("grades").get(years[i]).get(semesters[j]).cloneDeep().value();
                                            for (let k = 0; k < classes.length; k++) {
                                                let oldRef = userRef.get("grades").get(years[i]).get(semesters[j]).nth(k);
                                                if (!oldRef.value()) {
                                                    userRef.get("grades").get(years[i]).get(semesters[j]).splice(k, 0, data.new_grades[years[i]][semesters[j]][k]).write();
                                                } else if (classes[k].grades.length) {
                                                    userRef.get("grades").get(years[i]).get(semesters[j]).splice(k, 1, data.new_grades[years[i]][semesters[j]][k]).write();
                                                } else {
                                                    oldRef.set("overall_percent", data.new_grades[years[i]][semesters[j]][k].overall_percent).write();
                                                    oldRef.set("overall_letter", data.new_grades[years[i]][semesters[j]][k].overall_letter).write();
                                                }
                                            }
                                            let newGrades = userRef.get("grades").get(years[i]).get(semesters[j]).value();
                                            let overall = {};
                                            if (oldGrades) {
                                                overall = Object.fromEntries(oldGrades.map((classData) => {
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
                            this.initWeights(lc_username);

                    }
                    let time = Date.now();
                    userRef.get("alerts").get("lastUpdated").push({
                                                                      timestamp: time,
                                                                      changeData: changeData,
                                                                      ps_locked: false
                                                                  }).write();
                    this.initAddedAssignments(lc_username);
                    this.initEditedAssignments(lc_username);
                    this.bringUpToDate(lc_username);
                    userRef.get("updatedGradeHistory").push(Date.now()).write();
                    socketManager.emitToRoom(lc_username, "sync", "success-history", data.message);
                } else {
                    socketManager.emitToRoom(lc_username, "sync", "fail-history", data.message);
                }
            } else {
                socketManager.emitToRoom(lc_username, "sync", "progress-history", data);
            }
        });

        scraper.loginAndScrapeGrades(_stream, userRef.value().school, userRef.value().schoolUsername, school_password, "", "", "true");
    }, //TODO

    updateGrades: function (acc_username, school_password) {
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

        let _stream = new stream.Readable({
                                              objectMode: true, read: () => {
            }
                                          });

        _stream.on("data", (data) => {
            console.log(data);

            if ("success" in data) {
                if (!data.success) {
                    socketManager.emitToRoom(lc_username, "sync", "fail", data.message);
                } else {
                    let newTerm = Object.keys(data.new_grades)[0];
                    let newSemester = Object.keys(data.new_grades[newTerm])[0];
                    if (!(newTerm in userRef.get("grades").value())) {
                        userRef.get("grades").set(newTerm, {}).write();
                    }
                    let oldGrades = userRef.get("grades").get(newTerm).get(newSemester).value();
                    let oldPSAIDs = [];
                    if (oldGrades) {
                        oldPSAIDs = oldGrades.map(x => x.grades.map(y => y.psaid)).filter(id => !!id); // Remove
                                                                                                       // undefined
                                                                                                       // (before we
                                                                                                       // scraped
                                                                                                       // psaids)
                    }
                    let newGrades = data.new_grades[newTerm][newSemester];
                    let newClasses = newGrades.map(x => x.class_name);
                    if (oldGrades) {
                        oldGrades = oldGrades.filter(x => newClasses.includes(x.class_name));
                    }
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
                            clone.ps_locked = newClone.ps_locked;
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
                    if (userRef.get("school").value() === "basis") {
                        let newWeights = data.new_weights[newTerm][newSemester];
                        userRef.get("weights").get(newTerm).set(newSemester, newWeights).write();
                    }
                    this.initAddedAssignments(lc_username);
                    this.initWeights(lc_username);
                    this.initEditedAssignments(lc_username);
                    this.bringUpToDate(lc_username, newTerm, newSemester);
                    let updateHistory = false;
                    if ((newTerm !== oldTerm || newSemester !== oldSemester) || !userRef.get("updatedGradeHistory").value().length || userRef.get("updatedGradeHistory").value().slice(-1)[0] < new Date(2021, 0, 11).getTime()) {
                        this.resetSortData(lc_username);
                        updateHistory = true;
                    }

                    let time = Date.now();
                    userRef.get("alerts").get("lastUpdated").push({
                                                                      timestamp: time,
                                                                      changeData: changeData,
                                                                      ps_locked: ps_locked
                                                                  }).write();
                    userRef.set("updatedInBackground", "already done").write();
                    if (updateHistory) {
                        this.updateGradeHistory(lc_username, school_password);
                    }
                    socketManager.emitToRoom(lc_username, "sync", "success", {
                        message: "Updated grades!"
                    });
                }
            } else {
                socketManager.emitToRoom(lc_username, "sync", "progress", data);
            }

        });

        scraper.loginAndScrapeGrades(_stream, userRef.value().school, userRef.value().schoolUsername, school_password, data_if_locked, term_data_if_locked);

        return _stream;
    }, //TODO

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
    }, //TODO

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
    }, //TODO

    setColorPalette: function (username, preset, shuffle) {
        let light, saturation,
            hues = [0, 30, 60, 120, 180, 240, 270, 300, 330, 15, 45, 90, 150, 210, 255, 285, 315, 345];
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
    }, //TODO

    getAllUsers: function () {
        return db.get("users").value();
    }, //TODO

    getDeletedUsers: function () {
        return db.get("deletedUsers").value();
    }, //TODO

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
    }, //TODO

    prepForDeletion: function (username) {
        let lc_username = username.toLowerCase();
        db.get("users").find({username: lc_username}).set("deletedTime", Date.now()).write();
        //`TODO maybe get rid of some info when deleting
    }, //TODO

    restoreUser: function (username) {
        let lc_username = username.toLowerCase();
        if (this.userDeleted(lc_username)) {
            //TODO do the inverse of whatever prepForDeletion does
            db.get("users").push(db.get("deletedUsers").find({username: lc_username}).value()).write();
            this.updateDB(lc_username);
            db.get("deletedUsers").remove({username: lc_username}).write();
            return {success: true, message: "Restored " + lc_username};
        }
        return {success: false, message: "User does not exist in deleted users."};
    }, //TODO

    makeAdmin: function (username) {
        let lc_username = username.toLowerCase();
        if (this.userExists(lc_username)) {
            db.get("users").find({username: lc_username}).assign({isAdmin: true}).write();
            return {success: true, message: "Made user admin."};
        }
        return {success: false, message: "User does not exist."};
    }, //TODO

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
    }, //TODO

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

        let grades = userRef.get("grades").value();
        if (!(term in grades) || !(semester in grades[term])) {
            return {success: false, message: "Invalid term or semester."};
        }
        let clsRef = userRef.get("grades").get(term).get(semester).find({class_name: className});
        if (clsRef.value()) {
            teacherName = clsRef.value().teacher_name;

            if (addSuggestion && teacherName) {
                this.addWeightsSuggestion(username, term, semester, className, teacherName, hasWeights, weights);
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
    }, //TODO

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
    }, //TODO

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
    }, //TODO

    whatsNew: function (username, beta) {
        let lc_username = username.toLowerCase();
        let user = db.get("users").find({username: lc_username}).value();
        let end = _versionNameArray.indexOf(_versionNameArray.find(v => v[1] === user.alerts.latestSeen));
        if (end < 2) {
            end = 2;
        }
        if (beta) {
            return _betaChangelogArray.slice(1, end).join("");
        } else {
            let result = "";
            for (let i = 1; i < _versionNameArray.length; i++) {
                if (_versionNameArray[i][0] !== "Beta") {
                    if (i >= end && result) {
                        break;
                    }
                    result += _changelogArray[i];
                }
            }
            return result;
        }
    }, //TODO

    latestVersionSeen: function (username, beta) {
        let lc_username = username.toLowerCase();
        let alertsRef = db.get("users").find({username: lc_username}).get("alerts");
        if (beta) {
            alertsRef.set("latestSeen", _versionNameArray[1][1]).write();
        } else {
            alertsRef.set("latestSeen", _versionNameArray.find(v => v[0] !== "Beta" && v[0] !== "Known Issues")[1]).write();
        }
    }, //TODO

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
    }, //TODO

    emailAvailable: function (schoolUsername) {
        if (!!db.get("users").find({schoolUsername: schoolUsername.toLowerCase()}).value()) {
            return {success: false, message: "This email address is already associated with an account."};
        }
        return {success: true, message: "Valid email!"};
    }, //TODO

    setLoggedIn: function (username) {
        let userRef = db.get("users").find({username: username.toLowerCase()});
        userRef.get("loggedIn").push(Date.now()).write();
    }, //TODO

    updateTutorial: function (username, action) {
        let userRef = db.get("users").find({username: username.toLowerCase()});
        if (_tutorialKeys.includes(action + "Seen")) {
            userRef.get("alerts").get("tutorialStatus").set(action + "Seen", true).write();
            return {success: true, message: userRef.get("alerts").get("tutorialStatus").value()};
        } else {
            return {success: false, message: "Invalid action: " + action};
        }
    }, //TODO

    resetTutorial: function (username) {
        let userRef = db.get("users").find({username: username.toLowerCase()});
        let tutorialStatus = userRef.get("alerts").get("tutorialStatus").value();
        for (let key of Object.keys(tutorialStatus)) {
            tutorialStatus[key] = false;
        }
        return userRef.get("alerts").get("tutorialStatus").value();
    }, //TODO

    updateSortData: function (username, sortData) {
        let userRef = db.get("users").find({username: username.toLowerCase()});
        let {dateSort, categorySort} = sortData;
        let sortDataRef = userRef.get("sortingData");
        sortDataRef.set("dateSort", dateSort).write();
        sortDataRef.set("categorySort", categorySort).write();
    }, //TODO

    updateAddedAssignments: function (username, addedAssignments, term, semester) {
        let userRef = db.get("users").find({username: username.toLowerCase()});
        let added = userRef.get("addedAssignments").value();
        if (term in added && semester in added[term]) {
            userRef.get("addedAssignments").get(term).set(semester, addedAssignments).write();
            return {success: true, message: "Successfully updated added assignments"};
        } else {
            return {success: false, message: "Invalid term or semester"};
        }
    }, //TODO

    updateEditedAssignments: function (username, editedAssignments, term, semester) {
        let userRef = db.get("users").find({username: username.toLowerCase()});
        let edited = userRef.get("editedAssignments").value();
        if (term in edited && semester in edited[term]) {
            userRef.get("editedAssignments").get(term).set(semester, editedAssignments).write();
            return {success: true, message: "Successfully updated edited assignments"};
        } else {
            return {success: false, message: "Invalid term or semester"};
        }
    }, //TODO

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
    }, //TODO

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
    }, //TODO

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
    }, //TODO

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
    }, //TODO

    resetSortData: function (username) {
        let userRef = db.get("users").find({username: username.toLowerCase()});
        if (!userRef.get("sortingData").value()) {
            userRef.set("sortingData", {
                dateSort: [], categorySort: []
            }).write();
        }
    }, //TODO

    // password reset stuff
    checkToken: function (token, user = undefined) {
        if (!token) {
            return {valid: false, gradeSync: null};
        }
        if (!user) {
            user = db.get("users").find({passwordResetToken: token}).value();
        }

        return {valid: user && (user.passwordResetTokenExpire > Date.now()), gradeSync: user && !!user.schoolPassword};
    }, //TODO

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
    }, //TODO

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
        user.unset("passwordResetToken").write();

        return {success: true, message: "Password updated."};
    }, //TODO

    setBlur: function (username, enabled) {
        let user = db.get("users").find({username: username.toLowerCase()});
        user.get("appearance").set("blurEffects", enabled).write();
        return {success: true, message: "Blur effects " + (enabled ? "enabled" : "disabled") + "!"};
    }, //TODO

    getSunriseAndSunset: function () {
        const SAN_JOSE_CA = {lat: 37, lng: -122};
        let times = SunCalc.getTimes(new Date(), SAN_JOSE_CA.lat, SAN_JOSE_CA.lng);
        let sunrise = new Date("0/" + times.sunrise.getHours() + ":" + times.sunrise.getMinutes());
        let sunset = new Date("0/" + times.sunset.getHours() + ":" + times.sunset.getMinutes());
        return {sunrise: sunrise, sunset: sunset};
    }, //TODO

    setEnableLogging: function (username, value) {
        if (!this.userExists(username)) {
            return {success: false, message: "Invalid user"};
        }
        let user = db.get("users").find({username: username.toLowerCase()});
        if (typeof value != "boolean") {
            return {success: false, message: "Invalid value", settings: {enableLogging: value}};
        }
        user.set("enableLogging", value).write();
        return {
            success: true,
            message: "Logging " + (value ? "enabled" : "disabled") + "!",
            settings: {enableLogging: value}
        };
    }, //TODO

    setAnimateWhenUnfocused: function (username, value) {
        if (!this.userExists(username)) {
            return {success: false, message: "Invalid user"};
        }
        let user = db.get("users").find({username: username.toLowerCase()});
        if (typeof value != "boolean") {
            return {success: false, message: "Invalid value", settings: {animateWhenUnfocused: value}};
        }
        user.get("appearance").set("animateWhenUnfocused", value).write();
        return {
            success: true,
            message: "Animation " + (value ? "enabled" : "disabled") + " when window is not in focus!",
            settings: {animateWhenUnfocused: value},
            refresh: true
        };
    }, //TODO

    setShowFps: function (username, value) {
        if (!this.userExists(username)) {
            return {success: false, message: "Invalid user"};
        }
        let user = db.get("users").find({username: username.toLowerCase()});
        if (typeof value != "boolean") {
            return {success: false, message: "Invalid value", settings: {showFps: value}};
        }
        user.get("appearance").set("showFps", value).write();
        return {
            success: true,
            message: "Refresh Rate Display " + (value ? "enabled" : "disabled") + "!",
            settings: {showFps: value},
            refresh: true
        };
    } //TODO

};

function dbContainsClass(school, term, semester, class_name, teacher_name) {
    let classes = db.getClasses(school);
    if (classes[term] && classes[term][semester] && classes[term][semester][class_name] && classes[term][semester][class_name][teacher_name]) {
        return true;
    }
    return false;
} //TODO

function dbContainsTerm(school, term, semester) {
    let classes = db.getClasses(school);
    if (classes[term] && classes[term][semester]) {
        return true;
    }
    return false;
} //TODO

function getSuggestionIndex(term, semester, class_name, teacher_name, weight) {
    // Returns index if suggestion with same weight found, else returns -1
    let classes = db.get("classes").value();
    for (let i = 0; i < classes[term][semester][class_name][teacher_name]["suggestions"].length; i++) {
        if (compareWeights(weight, classes[term][semester][class_name][teacher_name]["suggestions"][i])) {
            return i;
        }
    }
    return -1;
} //TODO

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
} //TODO

/**
 * Determines if two weights are identical (Both are point-based or have same weight names & values)
 * @returns {boolean} true if both weights are identical
 */
function compareWeights(weight1, weight2) {
    if (weight1["hasWeights"] !== weight2["hasWeights"]) {
        return false;
    } else if (weight1["hasWeights"] === false) {
        return true;
    } else {
        return _.isEqual(weight1["weights"], weight2["weights"]);
    }
}

/**
 * Determines if given weight is custom in comparison to verifiedWeight. (Allows verified weight to have additional
 * weights.)
 * @returns {boolean} true if given weight is custom
 */
function isCustom(weight, verifiedWeight) {
    if (weight["hasWeights"] !== verifiedWeight["hasWeights"]) {
        return true;
    } else if (weight["hasWeights"] === false) {
        return false;
    }
    let keys = Object.keys(weight["weights"]);
    for (let i = 0; i < keys.length; i++) {
        if ((!keys[i] in verifiedWeight["weights"]) || weight["weights"][keys[i]] !== verifiedWeight["weights"][keys[i]]) {
            return true;
        }
    }
    return false;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}
