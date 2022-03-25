//setup lowDB
const low = require("lowdb");
const Memory = require("lowdb/adapters/Memory");
const FileSync = require("lowdb/adapters/FileSync");

const filedb = low(new FileSync("user_db.json"));
const db = low(new Memory());
db.defaults({
    users: [], keys: [], classes: {}, deletedUsers: []
}).write();
db.set("users", filedb.get("users").value()).write();
db.set("keys", filedb.get("keys").value()).write();
db.set("classes", filedb.get("classes").value()).write();
db.set("deletedUsers", filedb.get("deletedUsers").value()).write();

//setup mongodb
const {MongoClient} = require("mongodb");
mongoUrl = process.env.NODE_ENV === "production" ? process.env.DB_URL : "mongodb://localhost:27017";

const DATABASE_NAME = process.env.port === "5998" ? "beta" : "stable";

const SCHOOL_NAMES = ["bellarmine", "basis"];
const USERS_COLLECTION_NAME = "users";
const CLASSES_COLLECTION_NAME = "classes";
const COMMON_DATABASE_NAME = "common";
const CATALOG_COLLECTION_NAME = "catalog";

const classesCollection = (school) => {
    return school + "_" + CLASSES_COLLECTION_NAME;
};

//connection & migrate
MongoClient.connect(mongoUrl).then((client) => {
    migrate(client).then(() => {
        // Don't update db to prevent bad data from being written
        // console.log("Updating lowDB json file . . .");
        // filedb.set("users", db.get("users").value()).write();
        // filedb.set("keys", db.get("keys").value()).write();
        // filedb.set("classes", db.get("classes").value()).write();
        // filedb.set("deletedUsers", db.get("deletedUsers").value()).write();
        console.log("Finished!");
    }).catch((err) => {
        console.log(err);
    }).finally(async () => {
        await client.close();
    });
});

//migrate function
async function migrate(client) {
    const catalog = () => client.db(COMMON_DATABASE_NAME).collection(CATALOG_COLLECTION_NAME);

    console.log("Migrating . . .");

    // CREATE DATABASE
    console.log("Creating MongoDB Database . . .");
    let dbNames = await client.db().admin().listDatabases();
    dbNames = dbNames.databases.map(x => x.name);
    if (dbNames.includes(DATABASE_NAME)) {
        throw "Migration Failed. Database Already Exists: " + DATABASE_NAME; //throw error if db with chosen name already exists
    }
    const mongodb = await client.db(DATABASE_NAME); //create db

    // BACKUP MONGODB DATABASE
    console.log("Backing up lowDB Database . . .");
    backupdb();

    // RESTORE DELETED USERS
    console.log("Restoring deleted users . . .");
    let usernames = db.get("users").value().map(x => x["username"]);
    let deletedUsernames = db.get("deletedUsers").value().map(x => x["username"]);
    for (let username of deletedUsernames) {
        if (usernames.includes(username)) {
            throw "Migration Failed. Deleted User with Duplicate Username:  " + username;
        }
        restoreUser(username);
    }
    db.write();

    // TRANSFER USERS
    console.log("Migrating users . . .");
    let users = db.get("users").value();

    await mongodb.createCollection(USERS_COLLECTION_NAME); //create users collection

    for (let user of users) {
        let school = user["school"];
        if (!SCHOOL_NAMES.includes(school)) {
            console.log(user["username"] + " " + school);
            throw "Migration Failed. Invalid School: " + school; //throw error if school is invalid
        }
        user["version"] = 0; //reset version number
        delete user["deletedTime"];

        //convert string "true" and "false" to booleans
        user["appearance"]["weightedGPA"] = user["appearance"]["weightedGPA"].toString() === "true";
        for (let term in user["weights"]) {
            for (let semester in user["weights"][term]) {
                for (let className in user["weights"][term][semester]) {
                    try {
                        user["weights"][term][semester][className]["hasWeights"] = user["weights"][term][semester][className]["hasWeights"].toString() === "true";
                    } catch (e) {
                        let weightValues = Object.values(user["weights"][term][semester][className]["weights"]);
                        weightValues = weightValues.filter(x => x !== null)
                        user["weights"][term][semester][className]["hasWeights"] = weightValues.length !== 0;
                    }
                }
            }
        }

        await mongodb.collection(USERS_COLLECTION_NAME).insertOne(user); //add user
    }

    // TRANSFER CLASSES
    console.log("Migrating classes . . .");
    let classes = db.get("classes").value();

    for (let school of SCHOOL_NAMES) {
        await mongodb.createCollection(classesCollection(school)); //create school collection
    }

    for (let term in classes) {
        for (let semester in classes[term]) {
            for (let className in classes[term][semester]) {
                let catalogData = await catalog().findOne({class_name: className});
                let classData = classes[term][semester][className];
                classData["teachers"] = [];
                //Add teachers, term, semester, and className as fields of each class entry
                for (let teacherName in classData) {
                    // Clear these fields if they match the catalog so we can fallback to catalog
                    if (catalogData != null) {
                        if (classData.classType === catalogData.classType) {
                            classData.classType = null;
                        }
                        if (classData.uc_csuClassType === catalogData.uc_csuClassType) {
                            classData.uc_csuClassType = null;
                        }
                    }
                    if (!["teachers", "classType", "credits", "department", "description", "terms", "uc_csuClassType", "grade_levels"].includes(teacherName)) { //filter for teachers
                        //convert string "true" and "false" to booleans
                        if (classData[teacherName]["hasWeights"] !== null) {
                            classData[teacherName]["hasWeights"] = classData[teacherName]["hasWeights"].toString() === "true";
                        }
                        for (let suggestion of classData[teacherName]["suggestions"]) {
                            try {
                                suggestion["hasWeights"] = suggestion["hasWeights"].toString() === "true";
                            } catch (e) {
                                let weightValues = Object.values(suggestion["weights"]);
                                weightValues = weightValues.filter(x => x !== null)
                                suggestion["hasWeights"] = weightValues.length !== 0;
                            }
                        }

                        //move data for each teacher into an array with key "teachers"
                        classData[teacherName]["teacherName"] = teacherName;
                        classData["teachers"].push(classData[teacherName]);
                        delete classData[teacherName];
                    }
                }
                classData["term"] = term;
                classData["semester"] = semester;
                classData["className"] = className;
                classData["version"] = 0; //reset version number

                let school;
                if (semester === "_") {
                    school = "basis";
                } else {
                    school = "bellarmine";
                }
                await mongodb.collection(classesCollection(school)).insertOne(classData); //add class to collection
            }
        }
    }

}

// LOWDB AUTHENTICATOR FUNCTIONS

function backupdb () {
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
}

function updateDB (username) {
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

    // Remove extra beta features
    let existingFeatures = Object.keys(userRef.get("betaFeatures").value());
    for (let i = 0; i < existingFeatures.length; i++) {
        if (existingFeatures[i] === "active") {
            continue;
        }
        if (!betaFeatureKeys.includes(existingFeatures[i])) {
            userRef.get("betaFeatures").unset(existingFeatures[i]).write();
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

    // This is unnecessary and increases startup time by a lot
    // this.bringUpToDate(username);

}

function restoreUser (username) {
    let lc_username = username.toLowerCase();
    if (userDeleted(lc_username)) {
        console.log("Restoring " + username);
        //TODO do the inverse of whatever prepForDeletion does
        db.get("users").push(db.get("deletedUsers").find({username: lc_username}).value()).write();
        updateDB(lc_username);
        db.get("deletedUsers").remove({username: lc_username}).write();
        return {success: true, message: "Restored " + lc_username};
    }
    return {success: false, message: "User does not exist in deleted users."};
}

let tutorialKeys = ["homeSeen", "navinfoSeen", "moreSeen", "settingsSeen", "legendSeen", "zoomSeen"];
let betaFeatureKeys = ["showNotificationPanel"];

function userDeleted (username) {
    let isEmail = validateEmail(username);
    let lc_username = username.toLowerCase();
    let user;
    if (isEmail) {
        user = db.get("deletedUsers").find({schoolUsername: lc_username}).value();
    } else {
        user = db.get("deletedUsers").find({username: lc_username}).value();
    }
    return !!user;
}

function validateEmail(email, school) {
    let re;
    switch (school) {
        case "basis":
            re = /^[a-z]+_[0-9]{5}@basisindependent.com$/i;
            break;
        default:
            re = /^[a-z]+\.[a-z]+[0-9]{2}@bcp.org$/i;
    }
    return re.test(email);
}

function buildStarterNotification(now) {
    return {
        type: "announcement",
        title: "Welcome to your Notification Center",
        message: "All future notifications will be found here. You can configure this area however you'd like, using the notification settings accessible from the top right of this panel.",
        dismissible: true,
        dismissed: false,
        pinnable: true,
        pinned: true,
        createdDate: [now],
        dismissedDates: [],
        pinnedDates: [now],
        unDismissedDates: [],
        unPinnedDates: []
    };
}
