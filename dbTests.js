const db = require("./dbClient");
const _ = require("lodash");
const assert = require("assert");
const bcrypt = require("bcryptjs");
const {makeUser} = require("./dbHelpers");
const { getMostRecentTermData } = require("./dbClient");

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
        return {success: passCount === runCount};
    }, testInit: async () => {
        let result = await db.init();
        customAssert(_.isEqual(result, {success: true, data: {}}), "init");
    }, testUserFunctions: async () => {
        let now = new Date();
        let username = randomString(16);
        let password = randomString(1).toUpperCase() + randomString(5).toLowerCase() + randomInt(3);
        let [firstName, lastName] = [randomString(8), randomString(8)];
        let graduationYear = now.getFullYear();
        let schoolUsername = firstName + "." + lastName + graduationYear.toString().slice(2) + "@bcp.org";
        schoolUsername = schoolUsername.toLowerCase();
        let school = "bellarmine";

        customAssert(_.isEqual(await db.addUser(school, username, password, schoolUsername, false), {success: true, data: {message: "User Created"}}), "User created");
        customAssert(await db.userExists({username: username}), "User exists with username");
        customAssert(await db.userExists({schoolUsername: schoolUsername}), "User exists with schoolUsername");
        customAssert(await db.userExists({username, schoolUsername}), "User exists with both");
        customAssert((await db.getUser({username, schoolUsername})).success, "Get user");
        customAssert(!(await db.removeUser("")).success, "Invalid user removal");
        customAssert((await db.removeUser(username)).success, "Valid user removal");
    }, testBetaKeyFunctions: async () => {
        let res = await db.addBetaKey();
        customAssert(res.success, "Add beta key");
        let betaKey = res.data.value.betaKey;
        customAssert((await db.betaKeyExists(betaKey)).success, "Beta key exists");
        customAssert(_.isEqual(await db.getBetaKey(betaKey),{success: true, data: {value: {betaKey: betaKey, claimed: false, claimedBy: ""}}}), "Get beta key");
        let username = randomString(8).toLowerCase();
        customAssert((await db.claimBetaKey(betaKey, username)).success, "Beta key claiming");
        customAssert(_.isEqual(await db.getBetaKey(betaKey),{success: true, data: {value: {betaKey: betaKey, claimed: true, claimedBy: username}}}), "Get claimed beta key");
        customAssert(!(await db.removeBetaKey("")).success, "Invalid beta key removal");
        await db.removeBetaKey(betaKey);
        customAssert(!(await db.betaKeyExists(betaKey)).success, "Valid beta key removal");
    }, testClassesFunctions: async() => {
        await db.addUser("bellarmine", "hippityhop", "123ThisIsAPassword", "hippity.hop22@bcp.org", false);
        await db.addUser("bellarmine", "hoppityhip", "123ThisIsAPassword", "hoppity.hip22@bcp.org", false);

        await db.addDbClass("bellarmine", "21-22", "S2", "Science", "Alex Smith");
        await db.addDbClass("bellarmine", "21-22", "S2", "Science", "Alex Smith");
        await db.addDbClass("basis", "21-22", "S2", "Science", "Alex Smith");
        await db.addDbClass("bellarmine", "21-22", "S2", "Science", "Bob Jones");
        await db.addDbClass("bellarmine", "21-22", "S2", "Math", "Sally G");

        await db.addWeightsSuggestion("hippityhop", "21-22", "S2", "Science", "Alex Smith", true, {"Tests": 100});
        await db.addWeightsSuggestion("hoppityhip", "21-22", "S2", "Science", "Alex Smith", true, {"Tests": 100});
        await db.addWeightsSuggestion("hoppityhip", "21-22", "S2", "Science", "Bob Jones", true, {"Projects": 100});
        await db.addWeightsSuggestion("hoppityhip", "21-22", "S2", "Math", "Sally G", true, {"Quizzes": 100});
        await db.addWeightsSuggestion("hoppityhip", "21-22", "S2", "Math", "Sally G", true, {"Sleep": 100});

        console.log(await db.getMostRecentTermDataInClassDb("bellarmine"));
        console.log(await db.dbContainsSemester("bellarmine", "21-22", "S2"));
        console.log(await db.dbContainsSemester("bellarmine", "21-22", "S1"));
        console.log(await db.dbContainsClass("bellarmine", "21-22", "S2", "Math", "Sally G"));
        console.log(await db.dbContainsClass("bellarmine", "21-22", "S2", "Math", "Joel J"));
    }
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
