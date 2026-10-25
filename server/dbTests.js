const db = require("./dbClient");
const _ = require("lodash");
const assert = require("assert");
const {deviceOf} = require("./middleware");

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
        return passCount === runCount;
    }, testInit: async () => {
        let result = await db.init();
        customAssert(result, {success: true, data: {}}, "init");
    }, testUserFunctions: async () => {
        let now = new Date();
        let username = randomString(16);
        let password = randomString(1).toUpperCase() + randomString(5).toLowerCase() + randomInt(3);
        let [firstName, lastName] = [randomString(8), randomString(8)];
        let graduationYear = now.getFullYear();
        let schoolUsername = firstName + "." + lastName + graduationYear.toString().slice(2) + "@bcp.org";
        schoolUsername = schoolUsername.toLowerCase();
        let school = "bellarmine";

        customAssert(await db.addUser(school, username, password, schoolUsername, false), {
            success: true,
            data: {message: "User Created"}
        }, "User created");
        customAssert((await db.userExists({username: username})).success, true, "User exists with username");
        customAssert((await db.userExists({schoolUsername: schoolUsername})).success, true, "User exists with schoolUsername");
        customAssert((await db.userExists({username, schoolUsername})).success, true, "User exists with both");
        customAssert((await db.getUser(username, {})).success, true, "Get user");
        // Every key a new user is made with must survive the startup cleanup
        await db.removeUnknownAppearanceKeys();
        customAssert((await db.getUser(username, {appearance: 1})).data.value.appearance,
            require("./dbHelpers").appearanceDefaults, "Startup cleanup keeps known appearance keys");
        customAssert((await db.archiveUser(username)).success, true, "Archive user");
        customAssert((await db.userExists({username})).success, false, "Archived user no longer exists");
        customAssert((await db.unArchiveUser(username)).success, true, "Unarchive user");
        customAssert((await db.userExists({username})).success, true, "Unarchived user exists again");
        customAssert((await db.userArchived({username})).success, false, "Unarchived user left the archive");
        customAssert((await db.removeUser("")).success, false, "Invalid user removal");
        customAssert((await db.removeUser(username)).success, true, "Valid user removal");
    }, testSyncPeriod: async () => {
        const {effectiveSyncPeriod, minSyncPeriod, nextSyncWhen, defaultSyncPeriod} = require("./dbHelpers");
        const free = [];
        customAssert(effectiveSyncPeriod(free, defaultSyncPeriod), defaultSyncPeriod, "Sync period default");
        customAssert(effectiveSyncPeriod(free, 15 * 60 * 1000), minSyncPeriod(free), "Sync period floors at plan minimum");
        customAssert(effectiveSyncPeriod(free, 24 * 60 * 60 * 1000), 24 * 60 * 60 * 1000, "Sync period honors longer choice");
        customAssert(effectiveSyncPeriod(free, undefined), minSyncPeriod(free), "Sync period without a setting");
        customAssert(nextSyncWhen(0, free), minSyncPeriod(free), "Server allowance ignores syncPeriod");
    }, testBetaKeyFunctions: async () => {
        let res = await db.addBetaKey();
        customAssert(res.success, true, "Add beta key");
        let betaKey = res.data.value.betaKey;
        customAssert((await db.betaKeyExists(betaKey)).success, true, "Beta key exists");
        customAssert((await db.betaKeyExists({$ne: null})).success, false, "A beta key must be a string");
        customAssert(await db.getBetaKey(betaKey), {
            success: true,
            data: {value: {betaKey: betaKey, claimed: false, claimedBy: ""}}
        }, "Get beta key");
        let username = randomString(8).toLowerCase();
        customAssert((await db.claimBetaKey(betaKey, username)).success, true, "Beta key claiming");
        customAssert(await db.getBetaKey(betaKey), {
            success: true,
            data: {value: {betaKey: betaKey, claimed: true, claimedBy: username}}
        }, "Get claimed beta key");
        customAssert((await db.removeBetaKey("")).success, false, "Invalid beta key removal");
        await db.removeBetaKey(betaKey);
        customAssert((await db.betaKeyExists(betaKey)).success, false, "Valid beta key removal");
    }, testClassesFunctions: async () => {
        await db.addUser("bellarmine", "hippityhop", "123ThisIsAPassword", "hippity.hop22@bcp.org", false);
        await db.addUser("bellarmine", "hoppityhip", "123ThisIsAPassword", "hoppity.hip22@bcp.org", false);

        await db.addDbClass("bellarmine", "21-22", "S2", "Science", "Alex Smith");
        await db.addDbClass("bellarmine", "21-22", "S2", "Science", "Alex Smith");
        await db.addDbClass("basis", "21-22", "S2", "Science", "Alex Smith");
        await db.addDbClass("bellarmine", "21-22", "S2", "Science", "Bob Jones");
        await db.addDbClass("bellarmine", "21-22", "S2", "Math", "Sally G");

        customAssert(Object.keys((await db.getAllClassData("bellarmine", "21-22", "S2")).data.classData), ["Science", "Math"], "Add db classes");
        customAssert(Object.keys((await db.getAllClassData("basis", "21-22", "S2")).data.classData), ["Science"], "Add db classes");

        await db.addWeightsSuggestion("hippityhop", "21-22", "S2", "Science", "Alex Smith", true, {"Tests": 100});
        await db.addWeightsSuggestion("hoppityhip", "21-22", "S2", "Science", "Alex Smith", true, {"Tests": 100});
        await db.addWeightsSuggestion("hoppityhip", "21-22", "S2", "Science", "Bob Jones", true, {"Projects": 100});
        await db.addWeightsSuggestion("hoppityhip", "21-22", "S2", "Math", "Sally G", true, {"Quizzes": 100});
        await db.addWeightsSuggestion("hoppityhip", "21-22", "S2", "Math", "Sally G", true, {"Sleep": 100});

        console.log(await db.getMostRecentTermDataInClassDb("bellarmine"));
        customAssert((await db.dbContainsSemester("bellarmine", "21-22", "S2")).success, true, "Valid contained semester");
        customAssert((await db.dbContainsSemester("bellarmine", "21-22", "S1")).success, false, "Invalid contained semester");
        customAssert((await db.dbContainsClass("bellarmine", "21-22", "S2", "Math", "Sally G")).success, true, "Valid contained class");
        customAssert((await db.dbContainsClass("bellarmine", "21-22", "S2", "Math", "Joel J")).success, false, "Invalid contained class");
    }, testDeviceOf: async () => {
        // A phone that reads as a desktop keeps the effects running on it, and a desktop that
        // reads as a phone loses them, so the two headers this picks between are worth pinning
        let req = (ua, hint) => ({get: header => header === "user-agent" ? ua : hint});
        let iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1";
        let android = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36";
        let windows = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36";
        let mac = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15";
        customAssert(deviceOf(req(iphone)), {os: "ios", mobile: true, key: "ios-mobile"}, "iPhone");
        customAssert(deviceOf(req(android, "?1")), {os: "android", mobile: true, key: "android-mobile"}, "Android");
        customAssert(deviceOf(req(windows, "?0")), {os: "windows", mobile: false, key: "windows"}, "Windows");
        customAssert(deviceOf(req(mac)), {os: "macos", mobile: false, key: "macos"}, "Mac with no hint");
        // The hint is the browser answering the question, so it beats anything read off the string
        customAssert(deviceOf(req(android, "?0")), {os: "android", mobile: false, key: "android"}, "Android asking for the desktop site");
        customAssert(deviceOf(req("")), {os: "other", mobile: false, key: "other"}, "No User-Agent at all");
    }, testSocketMalformedPayload: async () => {
        // A handler that throws on a bad payload is an unhandled rejection, which kills the process
        let handlers = {};
        let socket = {on: (event, fn) => handlers[event] = fn, onAny: () => {}, request: {user: {username: "x"}, headers: {}}};
        require("./socket").setupSocket(socket);
        let rejections = 0;
        let count = () => rejections++;
        process.on("unhandledRejection", count);
        handlers["settings-change"]({unknownKey: 1});
        handlers["settings-change"](null);
        handlers["start-update"](undefined);
        await new Promise(resolve => setTimeout(resolve, 100));
        process.off("unhandledRejection", count);
        customAssert(rejections, 0, "Malformed socket payloads do not crash the server");
    }, testScraperQueuePositions: async () => {
        // Only waiting users hear their place in line, never the one whose sync is running
        const {ScraperAutoQueue} = require("./data_structures/queue/scraper_auto_queue");
        let queue = new ScraperAutoQueue();
        let heard = {a: [], b: [], c: []};
        let release;
        let gate = new Promise(resolve => release = resolve);
        queue.enqueue(() => gate, m => heard.a.push(m.message));
        queue.enqueue(async () => {}, m => heard.b.push(m.message));
        queue.enqueue(async () => {}, m => heard.c.push(m.message));
        customAssert(heard, {
            a: [],
            b: ["Waiting in queue. You are next in line."],
            c: ["Waiting in queue. You are number 2 in line."]
        }, "Queue positions go to the waiting users");
        release();
        await new Promise(resolve => setTimeout(resolve, 50));
        customAssert(heard.c[1], "Waiting in queue. You are next in line.", "Queue moves up when a sync finishes");
    }, testEmitToRoomRetry: async () => {
        // A user whose room isn't ready on the first try (mid-reload) must still get the message
        const socketManager = require("./socketManager");
        let rooms = new Map();
        let sent = [];
        socketManager.setIo({sockets: {adapter: {rooms}}, to: () => ({emit: (event) => sent.push(event)})});
        socketManager.emitToRoom("late", "hello");
        rooms.set("late", new Set());
        await new Promise(resolve => setTimeout(resolve, 1600));
        socketManager.setIo(undefined);
        customAssert(sent, ["hello"], "Message sent after the room appears on a retry");
    }, testConcurrentUploads: async () => {
        // Two tabs uploading the same scrape at once must only spend, and record, one sync
        let username = randomString(16).toLowerCase();
        await db.addUser("bellarmine", username, "123ThisIsAPassword", `${randomString(8)}.${randomString(8)}22@bcp.org`.toLowerCase(), false);
        let upload = {
            term: "25-26", semester: "S1", grades: [{
                extension_version: "1.7.3", class_name: "Math", teacher_name: "Sally G", overall_percent: 95,
                overall_letter: "A", student_id: "1", section_id: "2", ps_locked: false, grades: [{
                    date: "10/01/2025", category: "Tests", assignment_name: "Test 1", exclude: false,
                    points_possible: 10, points_gotten: 9, grade_percent: 90, psaid: 1, late: false, missing: false
                }]
            }]
        };
        let handlers = {};
        let socket = {on: (event, fn) => handlers[event] = fn, onAny: () => {}, request: {user: {username}, headers: {}}};
        require("./socket").setupSocket(socket);
        await Promise.all([handlers["start-update-from-user"](upload), handlers["start-update-from-user"](upload)]);
        let lastUpdated = (await db.getUser(username, {"alerts.lastUpdated": 1})).data.value.alerts.lastUpdated;
        customAssert(lastUpdated.length, 1, "Concurrent uploads record one sync");
        await db.removeUser(username);
    }, testResetTokenMustBeString: async () => {
        let username = randomString(16).toLowerCase();
        let schoolUsername = `${randomString(8)}.${randomString(8)}22@bcp.org`.toLowerCase();
        await db.addUser("bellarmine", username, "123ThisIsAPassword", schoolUsername, false);
        let token = (await db.resetPasswordRequest(schoolUsername)).data.token;
        customAssert((await db.checkPasswordResetToken(token)).data.valid, true, "A real reset token is valid");
        customAssert((await db.checkPasswordResetToken({$exists: true})).data.valid, false, "A reset token must be a string");
        customAssert((await db.checkPasswordResetToken({$regex: "^" + token[0]})).data.valid, false, "A reset token can't be a pattern");
        await db.removeUser(username);
    }, testRemoveDonationKeepsPalette: async () => {
        // Removing one donation must not clear a custom palette while the user is still Plus
        let username = randomString(16).toLowerCase();
        await db.addUser("bellarmine", username, "123ThisIsAPassword", `${randomString(8)}.${randomString(8)}22@bcp.org`.toLowerCase(), false);
        let donation = {username, platform: "cash", paidValue: 3, receivedValue: 3, dateDonated: Date.now()};
        await db.addDonation(JSON.stringify(donation));
        await db.addDonation(JSON.stringify(donation));
        customAssert((await db.setColorPalette(username, "custom", false)).success, true, "Plus user sets a custom palette");
        customAssert((await db.removeDonation(username, 0)).success, true, "Remove one of two donations");
        customAssert((await db.getUser(username, {"appearance.colorPalette": 1})).data.value.appearance.colorPalette, "custom", "Still Plus keeps the custom palette");
        await db.removeDonation(username, 0);
        customAssert((await db.getUser(username, {"appearance.colorPalette": 1})).data.value.appearance.colorPalette !== "custom", true, "No longer Plus clears the custom palette");
        await db.removeUser(username);
    }, testChangeSchoolEmail: async () => {
        // Changing to a new, unused school email must work; a taken one must be refused
        let [a, b] = [randomString(16).toLowerCase(), randomString(16).toLowerCase()];
        let email = () => `${randomString(8)}.${randomString(8)}22@bcp.org`.toLowerCase();
        let [emailA, emailB, emailNew] = [email(), email(), email()];
        await db.addUser("bellarmine", a, "123ThisIsAPassword", emailA, false);
        await db.addUser("bellarmine", b, "123ThisIsAPassword", emailB, false);
        customAssert((await db.changeSchoolEmail(a, emailNew)).success, true, "Change to an unused school email");
        customAssert((await db.getUser(a, {schoolUsername: 1})).data.value.schoolUsername, emailNew, "School email was updated");
        customAssert((await db.changeSchoolEmail(a, emailB)).success, false, "Cannot take another user's school email");
        await db.removeUser(a);
        await db.removeUser(b);
    }, testSetGraduationYear: async () => {
        // The settings page posts the year form-encoded, so it arrives as a string
        let username = randomString(16).toLowerCase();
        await db.addUser("basis", username, "123ThisIsAPassword", `ab${String(randomInt(5)).padStart(5, "0")}@basisindependent.com`, false);
        customAssert((await db.setPersonalInfo(username, undefined, undefined, "2027")).success, true, "Numeric string accepted");
        customAssert((await db.getUser(username, {personalInfo: 1})).data.value.personalInfo.graduationYear, 2027, "Stored as a number");
        customAssert((await db.setPersonalInfo(username, undefined, undefined, "20x7")).success, false, "Non-numeric string refused");
        await db.removeUser(username);
    }, testResetLink: async () => {
        // The link is built from which server this is, never from anything the requester sends
        const {resetLink} = require("./dbHelpers");
        customAssert(resetLink("abc", false), "https://graderoom.me/reset_password?token=abc", "Stable reset links go to stable");
        customAssert(resetLink("abc", true), "https://beta.graderoom.me/reset_password?token=abc", "Beta reset links go to beta");
    }
};

// Helpers
function customAssert(value1, value2, testName) {
    try {
        assert(_.isEqual(value1, value2));
        passCount++;
    } catch (e) {
        console.error(`${testName} FAILED`);
        console.log(value1);
        console.log(value2);
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

