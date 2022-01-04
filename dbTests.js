const db = require("./dbClient");
const _ = require("lodash");
const assert = require("assert");
const bcrypt = require("bcryptjs");

let passCount = 0;
let runCount = 0;

module.exports = {
    runAll: async () => {
        await db.config(null, null, null, true);
        await db.clearTestDatabase();
        let functions = Object.values(module.exports).slice(1);
        passCount = 0;
        runCount = 0;
        for (let func of functions) {
            await func();
        }
        await db.config(); // This just sets testing to false
    }, testInit: async () => {
        let result = await db.init();
        customAssert(_.isEqual(result, {success: true, data: {}}), "init");
    }, testUserFunctions: async () => {
        // Get current timestamp for user creation timestamp
        let now = new Date();
        let lc_username = randomString(16).toLowerCase();
        let hash = randomString(60)
        let [firstName, lastName] = [randomString(8), randomString(8)];
        let graduationYear = now.getFullYear();
        let schoolUsername = firstName + "." + lastName + graduationYear.toString().slice(2) + "@bcp.org";
        schoolUsername = schoolUsername.toLowerCase();
        let school = "bellarmine";

        // Create the user json
        let user = {
            version: 0,
            username: lc_username,
            password: hash,
            schoolUsername: schoolUsername,
            personalInfo: {
                firstName: firstName, lastName: lastName, graduationYear: graduationYear
            },
            isAdmin: false,
            betaFeatures: {
                active: false
            },
            appearance: {
                theme: "sun",
                classColors: [],
                colorPalette: "clear",
                shuffleColors: false,
                seasonalEffects: true,
                showNonAcademic: true,
                darkModeStart: 946778400000,
                darkModeFinish: 946738800000,
                weightedGPA: true,
                regularizeClassGraphs: true,
                showMaxGPA: false,
                animateWhenUnfocused: false,
                showFps: false
            },
            alerts: {
                lastUpdated: [],
                updateGradesReminder: "daily",
                latestSeen: "1.0.0",
                policyLastSeen: "never",
                termsLastSeen: "never",
                remoteAccess: "denied",
                tutorialStatus: {},
                notifications: {
                    important: [], unread: [], dismissed: []
                }
            },
            weights: {},
            grades: {},
            updatedGradeHistory: [],
            addedAssignments: {},
            editedAssignments: {},
            sortingData: {
                dateSort: [], categorySort: []
            },
            loggedIn: [],
            enableLogging: true
        };

        customAssert(_.isEqual(await db.addUser(school, user), {success: true, data: {message: "User Created"}}), "User created");
        customAssert(await db.userExists(school, {username: lc_username}), "User exists with username");
        customAssert(await db.userExists(school, {schoolUsername: schoolUsername}), "User exists with schoolUsername");
        customAssert(await db.userExists(school, {lc_username, schoolUsername}), "User exists with both");
        delete user._id;
        customAssert(_.isEqual(await db.getUser(school, {lc_username, schoolUsername}),{success: true, data: {value: user}}), "Get user");
        customAssert(!(await db.removeUser(school, {username: "", schoolUsername: ""})).success, "Invalid user removal");
        await db.removeUser(school, {lc_username, schoolUsername});
    }, testBetaKeyFunctions: async () => {
        let betaKey = randomString(7);
        customAssert(_.isEqual(await db.addBetaKey(betaKey), {success: true, data: {message: "Beta Key Added"}}), "Add beta key");
        customAssert((await db.betaKeyExists(betaKey)).success, "Beta key exists");
        customAssert(_.isEqual(await db.getBetaKey(betaKey),{success: true, data: {value: {betaKey: betaKey, claimed: false, claimedBy: ""}}}), "Get beta key");
        let username = randomString(8).toLowerCase();
        customAssert((await db.claimBetaKey(betaKey, username)).success, "Beta key claiming");
        customAssert(_.isEqual(await db.getBetaKey(betaKey),{success: true, data: {value: {betaKey: betaKey, claimed: true, claimedBy: username}}}), "Get claimed beta key");
        customAssert(!(await db.removeBetaKey("")).success, "Invalid beta key removal");
        await db.removeBetaKey(betaKey);
        customAssert(!(await db.betaKeyExists(betaKey)).success, "Valid beta key removal");
    },
};

// Helpers
function customAssert(value, testName) {
    try {
        assert(value);
        passCount++;
    } catch (e) {
        console.error(`${testName} FAILED`);
    } finally {
        runCount++;
        console.log(`${passCount} tests passed of ${runCount} tests run.`);
    }
}

function randomString(length) {
    let result = "";
    let characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    let charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

function randomInt(length) {
    let result = "";
    let characters = "0123456789";
    let charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return parseInt(result);
}

function randomBool() {
    return Math.floor(Math.random() * 2) === 0;
}
