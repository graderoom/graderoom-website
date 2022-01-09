const _ = require("lodash");
const bcrypt = require("bcryptjs");
const SunCalc = require("suncalc");
const db = require("./dbClient");

module.exports = {

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


    classesSemesterExists: function (term, semester) {
        let classes = this.getAllClassData();
        return (term in classes && semester in classes[term]);
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

};

function dbContainsClass(school, term, semester, class_name, teacher_name) {
    let classes = db.getClasses(school);
    if (classes[term] && classes[term][semester] && classes[term][semester][class_name] && classes[term][semester][class_name][teacher_name]) {
        return true;
    }
    return false;
} //TODO

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
