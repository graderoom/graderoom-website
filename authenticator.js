const low = require("lowdb");
const _ = require("lodash");
const FileSync = require("lowdb/adapters/FileSync");
const adapter = new FileSync("user_db.json");
const db = low(adapter);
const bcrypt = require("bcryptjs");
const scraper = require("./scrape");
const distinctColors = require("distinct-colors").default;
const chroma = require("chroma-js");
const crypto = require("crypto");
const readline = require("readline");
const fs = require("fs");

db.defaults({versions: {stable: "", beta: ""}, users: [], keys: [], classes: {}, deletedUsers: []}).write();

let changelogArray = "";
let betaChangelogArray = "";
let versionNameArray = [];

module.exports = {

    backupdb: function () {
        let today = Date.now();
        let filename = "user_db_backup" + today + ".json";
        const backupAdapter = new FileSync(filename);
        const backupDb = low(backupAdapter);
        backupDb.defaults({
                              versions: {stable: "", beta: ""}, users: [], keys: [], classes: {}, deletedUsers: []
                          }).write();
        backupDb.set("versions", db.get("versions").value()).write();
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

            let r = await this.addNewUser(username, password, schoolUsername, isAdmin);
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

    /* class database */
    getAllClassData: function () {
        return db.get("classes").value();
    },

    /* user functions
     */

    updateAllDB: function () {
        let startTime = Date.now();
        console.log("" + startTime + " | Started Database Update");
        let users = db.get("users").value();

        for (let i = 0; i < users.length; i++) {
            console.log("" + Date.now() + " | Updating User: " + (i + 1) + " of " + users.length);
            this.updateDB(users[i].username);
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
    }, updateDB: function (username) {
        let lc_username = username.toLowerCase();
        let userRef = db.get("users").find({username: lc_username});
        let user = userRef.value();

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

        // Fixes weights
        for (let i = 0; i < Object.keys(user.weights).length; i++) {
            console.log("" + Date.now() + " | Updating weight: " + (i + 1) + " of " + Object.keys(user.weights).length);
            let className = Object.keys(user.weights)[i];
            //Add custom weight tag
            if (!("custom" in user.weights[className])) {
                userRef.get("weights").get("className").set("custom", false).write();
            }

            //Move weights to new storage system
            let weights = Object.assign({}, user.weights[className]); // get weights from old storage
            let hasWeights = "true";
            let custom = false;
            if (weights.hasOwnProperty("hasWeights")) {
                hasWeights = weights["hasWeights"];
                delete weights["hasWeights"];
            }
            if (weights.hasOwnProperty("custom")) {
                custom = weights["custom"];
                delete weights["custom"];
            }
            delete weights["weights"];

            this.updateWeightsForClass(username, className, hasWeights, weights, custom, false); // put weights in new
                                                                                                 // storage

            for (var key in weights) {
                if (weights.hasOwnProperty(key)) {
                    delete user.weights[className][key]; // delete weights in old storage
                }
            }
        }

        // After all db stuff is done
        this.bringUpToDate(username);
    }, bringUpToDate: function (username) {
        let lc_username = username.toLowerCase();
        let userRef = db.get("users").find({username: lc_username});
        let user = userRef.value();
        let classes = db.get("classes").value();

        for (let i = 0; i < user.grades.length; i++) {
            console.log("" + Date.now() + " | Bringing class up to date: " + (i + 1) + " of " + user.grades.length);
            let className = user.grades[i].class_name;
            let teacherName = user.grades[i].teacher_name;

            // Add empty weight dict to all classes
            if (!(user.weights[className])) {
                this.addNewWeightDict(lc_username, className);
            }

            // Determine needed weights
            let goodWeights = [];
            for (let j = 0; j < user.grades[i].grades.length; j++) {
                if (!goodWeights.includes(user.grades[i].grades[j].category)) {
                    goodWeights.push(user.grades[i].grades[j].category);
                }
            }

            // Add all weights that exist in user grades
            for (let j = 0; j < goodWeights.length; j++) {
                if (!Object.keys(user.weights[className]["weights"]).includes(goodWeights[j])) {
                    user.weights[className]["weights"][goodWeights[j]] = null;
                }
            }

            //Add all classes to db
            if (!dbContainsClass(className, teacherName)) {
                this.addDbClass(className, teacherName);
            }

            //Updates weights from classes db
            if (user.weights[className]["custom"] == false && dbContainsClass(className, teacherName)) {
                if (classes[className][teacherName]["hasWeights"] == "false" || Object.keys(classes[className][teacherName]["weights"]).length > 0) {
                    this.updateWeightsForClass(username, className, classes[className][teacherName]["hasWeights"], classes[className][teacherName]["weights"], false, false);
                }
            }

            //Remove any weights that don't exist in user grades
            for (let j = 0; j < Object.keys(user.weights[className]["weights"]).length; j++) {
                if (!goodWeights.includes(Object.keys(user.weights[className]["weights"])[j])) {
                    delete user.weights[className]["weights"][Object.keys(user.weights[className]["weights"])[j]];
                }
            }

            //Set to point-based if only one category exists (& category is null)
            if (Object.keys(user.weights[className]["weights"]).length == 1) {
                if (user.weights[className]["weights"][Object.keys(user.weights[className]["weights"])[0]] == null) {
                    user.weights[className]["hasWeights"] = "false";
                }
            }

            //Add user's weights as suggestions
            this.addWeightsSuggestion(lc_username, className, teacherName, user.weights[className]["hasWeights"], user.weights[className]["weights"]);

            //Set custom to not custom if it is same as classes db
            if (user.weights[className]["custom"] && dbContainsClass(className, teacherName)) {
                user.weights[className]["custom"] = isCustom({
                                                                 "weights": user.weights[className]["weights"],
                                                                 "hasWeights": user.weights[className]["hasWeights"]
                                                             }, {
                                                                 "weights": classes[className][teacherName]["weights"],
                                                                 "hasWeights": classes[className][teacherName]["hasWeights"]
                                                             });
            }
        }
    },

    getRelClassData: function (username) {
        //TODO
        let lc_username = username.toLowerCase();
        let userRef = db.get("users").find({username: lc_username});
        let userClasses = [];
        userRef.get("grades").value().forEach(classRef => userClasses.push([classRef.class_name, classRef.teacher_name]));
        let classes = db.get("classes").value();
        let relClasses = {};
        for (let i = 0; i < userClasses.length; i++) {
            relClasses[userClasses[i][0]] = {
                "classType": classes[userClasses[i][0]]["classType"],
                "weights": classes[userClasses[i][0]][userClasses[i][1]]["weights"],
                "hasWeights": classes[userClasses[i][0]][userClasses[i][1]]["hasWeights"]
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
    , addNewUser: function (username, password, schoolUsername, isAdmin) {

        let lc_username = username.toLowerCase();
        return new Promise((resolve, reject) => {

            if (this.userExists(lc_username)) {
                return resolve({success: false, message: "Username already in use."});
            }

            if (this.userDeleted(lc_username)) {
                return resolve({
                                   success: false,
                                   message: "This account has been deleted. Email graderoom@gmail.com to recover your account."
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

            const roundsToGenerateSalt = 10;
            bcrypt.hash(password, roundsToGenerateSalt, function (err, hash) {
                db.get("users").push({
                                         username: lc_username,
                                         password: hash,
                                         schoolUsername: schoolUsername,
                                         personalInfo: {
                                             firstName: firstName, lastName: lastName, graduationYear: graduationYear
                                         },
                                         isAdmin: isAdmin,
                                         appearance: {
                                             theme: "auto",
                                             accentColor: null,
                                             classColors: [],
                                             showNonAcademic: true,
                                             darkModeStart: 19,
                                             darkModeFinish: 6
                                         },
                                         alerts: {
                                             lastUpdated: [],
                                             updateGradesReminder: "daily",
                                             latestSeen: "1.0.0",
                                             policyLastSeen: "never",
                                             termsLastSeen: "never",
                                             remoteAccess: "denied"
                                         },
                                         weights: {},
                                         grades: [],
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
        let roundsToGenerateSalt = 10;
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
        userRef.assign({schoolUsername: schoolUsername}).write();
        let {firstName, lastName, graduationYear} = getPersonalInfo(schoolUsername);
        userRef.get("personalInfo").set("firstName", firstName).write();
        userRef.get("personalInfo").set("lastName", lastName).write();
        userRef.get("personalInfo").set("graduationYear", graduationYear).write();
        return {success: true, message: "School Email Updated"};
    }, userExists: function (username) {
        let lc_username = username.toLowerCase();
        let user = db.get("users").find({username: lc_username}).value();
        return !!user;
    }, userDeleted: function (username) {
        let lc_username = username.toLowerCase();
        let user = db.get("deletedUsers").find({username: lc_username}).value();
        return !!user;
    }, setTheme: function (username, theme, darkModeStart, darkModeStartAmPm, darkModeFinish, darkModeFinishAmPm) {
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
        return {success: true, message: message};
    }, getUser: function (username) {
        let lc_username = username.toLowerCase();
        let user = db.get("users").find({username: lc_username}).value();
        if (user) {
            if (!user.weights) {
                user.weights = {};
            }
        }
        return user;
    },

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
        } else {
            return {success: false, message: "Did not sync"};
        }
    },

    disableGradeSync: function (username) {
        let lc_username = username.toLowerCase();
        let user = db.get("users").find({username: lc_username});
        user.unset("schoolPassword").write();
    },

    updateGradesBackground: function (acc_username, school_password) {
        let lc_username = acc_username.toLowerCase();
        let user = db.get("users").find({username: lc_username});
        user.set("updatedInBackground", "").write();
        this.updateGrades(acc_username, school_password).then(function (resp) {
            lc_username = acc_username.toLowerCase();
            user = db.get("users").find({username: lc_username});
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
        let grade_update_status = await scraper.loginAndScrapeGrades(userRef.value().schoolUsername, school_password);
        if (!grade_update_status.success) {
            //error updating grades
            return grade_update_status;
        }
        for (let i = 0; i < grade_update_status.new_grades.length; i++) {
            if (!(userRef.value().weights[grade_update_status.new_grades[i].class_name])) {
                this.addNewWeightDict(lc_username, grade_update_status.new_grades[i].class_name);
            }
            //Add class to classes db
            if (!dbContainsClass(grade_update_status.new_grades[i].class_name, grade_update_status.new_grades[i].teacher_name)) {
                this.addDbClass(grade_update_status.new_grades[i].class_name, grade_update_status.new_grades[i].teacher_name);
            }
        }
        for (let i = grade_update_status.new_grades.length; i < userRef.value().appearance.classColors.length; i++) {
            userRef.value().appearance.classColors.pop();
        }

        userRef.assign({grades: grade_update_status.new_grades}).write();
        if (userRef.value().appearance.classColors.length !== grade_update_status.new_grades.length) {
            this.randomizeClassColors(lc_username);
        }
        userRef.get("alerts").get("lastUpdated").push(Date.now()).write();
        userRef.set("updatedInBackground", "already done").write();
        return {success: true, message: "Updated grades!"};
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
        classesRef.get(modClassName).set(teacherName, {
            weights: {}, //TODO Weights
            hasWeights: null, //TODO Has weights
            suggestions: [] // assignments: {}, //TODO populate assignments by some kind of identifier (points
            // possible + assignment name
            // should be enough to differentiate assignments)
            // overallGrades: [] //TODO populate with overall grades of users (for average) length will give # in class
        }).write();
    },

    addNewWeightDict: function (username, className) {
        let lc_username = username.toLowerCase();
        let userRef = db.get("users").find({username: lc_username});
        let weights = userRef.value().weights;

        weights[className] = {"weights": {}, "hasWeights": "true", "custom": false};
        //userRef.set("weights", weights).write();
        return {success: true, message: weights};
    },

    randomizeClassColors: function (username) {
        let lc_username = username.toLowerCase();
        let userRef = db.get("users").find({username: lc_username});
        let numColors = userRef.get("grades").value().length;
        let classColors = distinctColors({
                                             count: numColors,
                                             lightMin: 25,
                                             lightMax: 100,
                                             chromaMin: 25,
                                             samples: Math.floor(Math.random() * 10000 + numColors)
                                         }).map(color => {
            return chroma(color["_rgb"][0], color["_rgb"][1], color["_rgb"][2]).hex();
        }).sort(() => Math.random() - 0.5);
        userRef.get("appearance").set("classColors", classColors).write();
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
        //TODO maybe get rid of some info when deleting
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

    updateWeightsForClass: function (username, className, hasWeights, weights, custom = null, addSuggestion = true) {

        //default update, not override
        let lc_username = username.toLowerCase();
        let userRef = db.get("users").find({username: lc_username});
        let classes = db.get("classes").value();
        //console.log(weights);
        if (!userRef.value()) {
            return {success: false, message: "User does not exist."};
        }
        let teacherName;
        let clsRef = userRef.get("grades").find({class_name: className});
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

        let weightsRef = userRef.get("weights");

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
        if (end === -1) {
            end = 1;
        }
        if (beta) {
            return betaChangelogArray.slice(1, end + 1).join("");
        } else {
            let result = "";
            for (let i = 1; i < versionNameArray.length; i++) {
                if (versionNameArray[i][0] !== "Beta") {
                    result += changelogArray[i];
                    if (i > end) {
                        break;
                    }
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
            return betaChangelogArray.join("");
        } else {
            return changelogArray.join("");
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
                        item.title = "This shouldn't have happened. Send a bug report in Settings > Help > Feedback Form. ERR #" + lineno;
                        item.content["Unfiled"] = [];
                    }
                    item.content["Unfiled"].push(line.substring(2));
                }
            }
        }).on("close", () => {
            items.push(item);
            let currentVersionFound = false;
            let betaCurrentVersionFound = false;
            for (let i = 0; i < items.length; i++) {
                resultHTML += "<div class=\"changelog-item";
                betaResultHTML += "<div class=\"changelog-item";
                if (!betaCurrentVersionFound) {
                    if (items[i].title.substring(0, 4) === "Beta" || items[i].title.substring(0, 6) === "Stable") {
                        betaResultHTML += " current\">";
                        db.get("versions").set("beta", items[i].title.substring(items[i].title.indexOf(" ") + 1)).write();
                        betaCurrentVersionFound = true;
                    } else if (items[i].title.substring(0, 12) === "Announcement") {
                        betaResultHTML += " announcement\">";
                    } else {
                        betaResultHTML += "\">";
                    }
                } else if (items[i].title.substring(0, 12) === "Announcement") {
                    betaResultHTML += " announcement\">";
                } else {
                    betaResultHTML += "\">";
                }
                if (!currentVersionFound) {
                    if (items[i].title.substring(0, 6) === "Stable") {
                        resultHTML += " current\">";
                        db.get("versions").set("stable", items[i].title.substring(items[i].title.indexOf(" ") + 1)).write();
                        currentVersionFound = true;
                    } else if (items[i].title.substring(0, 12) === "Announcement") {
                        resultHTML += " announcement\">";
                    } else {
                        resultHTML += "\">";
                    }
                } else if (items[i].title.substring(0, 12) === "Announcement") {
                    resultHTML += " announcement\">";
                } else {
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
                message: "This account has been deleted! Email graderoom@gmail.com to recover your account."
            };
        }
        return {success: true, message: "Valid Username!"};
    },

    setLoggedIn: function (username) {
        let userRef = db.get("users").find({username: username.toLowerCase()});
        userRef.get("loggedIn").push(Date.now()).write();
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
