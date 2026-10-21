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

