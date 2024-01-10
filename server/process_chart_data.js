const {MongoClient} = require("mongodb");
const {
    BETA_DATABASE_NAME,
    STABLE_DATABASE_NAME,
    USERS_COLLECTION_NAME,
    ARCHIVED_USERS_COLLECTION_NAME,
    CHARTS_COLLECTION_NAME,
    isNotToday
} = require("./dbHelpers");

let url = process.argv[2];
let beta = process.argv[3] === "true";

run();

async function run() {
    let time = Date.now();
    let start = time;
    let client = await MongoClient.connect(url);
    console.log(`Connected in ${Date.now() - time}ms!`);
    let db = client.db(beta ? BETA_DATABASE_NAME : STABLE_DATABASE_NAME);

    let data = await db.collection(CHARTS_COLLECTION_NAME).findOne();
    if (!data) {
        data = {
            loginData: [],
            uniqueLoginData: [],
            syncData: [],
            userData: [],
            activeUsersData: [],
            gradData: [],
            schoolData: [],
            lastUpdated: new Date(0)
        };
    }
    if (!data.updating) {
        await db.collection(CHARTS_COLLECTION_NAME).updateOne({}, {$set: {updating: true}}, {upsert: true});
    } else {
        console.log("Already updating!");
        return;
    }
    let {loginData, uniqueLoginData, syncData, gradData, schoolData, lastUpdated: lastUpdatedCharts} = data;
    let projection = {
        loggedIn: 1, "alerts.lastUpdated": 1, "personalInfo.graduationYear": 1, school: 1, username: 1
    };
    let dayStart = Date.parse(new Date().toDateString());
    let query = {
        $or: [
            {
                "alerts.lastUpdated.timestamp": {
                    $gte: lastUpdatedCharts.getTime(), $lt: dayStart
                }
            }, {"loggedIn": {$gt: lastUpdatedCharts.getTime(), $lt: dayStart}}
        ]
    };
// All users with new data since lastUpdatedCharts but before today
    let allUsers = (await db.collection(USERS_COLLECTION_NAME).find(query, {projection: projection}).toArray())
        .concat(await db.collection(ARCHIVED_USERS_COLLECTION_NAME).find(query, {projection: projection}).toArray());
    console.log(`${allUsers.length} users!`);
    if (allUsers.length > 0) {
// List of new loginDates after lastUpdatedCharts but not today
        time = Date.now();
        let loginDates = allUsers.map(u => u.loggedIn.map(d => {
            let date = new Date(d);
            return new Date(date.getFullYear(), date.getMonth(), date.getDate());
        })).reduce((a, b) => a.concat(b)).filter(d => d.getTime() >= lastUpdatedCharts.getTime() && isNotToday(d));
        console.log(`Calculated login dates in ${Date.now() - time}ms!`);
// List of new syncDates after lastUpdatedCharts but not today
        time = Date.now();
        let syncDates = allUsers.map(u => u.alerts.lastUpdated.map(d => {
            let date = new Date(d.timestamp);
            return new Date(date.getFullYear(), date.getMonth(), date.getDate());
        })).reduce((a, b) => a.concat(b)).filter(d => d.getTime() >= lastUpdatedCharts.getTime() && isNotToday(d));
        console.log(`Calculated sync dates in ${Date.now() - time}ms!`);
// Add days that don't exist in loginDates that are in sync dates and vice versa and sort them
        time = Date.now();
        loginDates =
            loginDates.concat(syncDates.filter(t => !loginDates.find(u => u.getTime() === t.getTime()))).sort((a, b) => a.getTime() - b.getTime());
        syncDates =
            syncDates.concat(loginDates.filter(t => !syncDates.find(u => u.getTime() === t.getTime()))).sort((a, b) => a.getTime() - b.getTime());
        console.log(`Consolidated login and sync dates in ${Date.now() - time}ms!`);

        time = Date.now();
        loginData = loginData ?? [];
        for (let j = 0; j < loginDates.length; j++) {
            let r = loginData.find(d => d.x.getTime() === loginDates[j].getTime());
            if (r) {
                r.y++;
            } else {
                loginData.push({x: loginDates[j], y: 1});
            }
        }
        console.log(`Calculated login data in ${Date.now() - time}ms!`);

        time = Date.now();
        let uniqueLoginDates = allUsers.map(user => [
            ...new Set(user.loggedIn.filter(d => d >= lastUpdatedCharts.getTime() && d < dayStart).map(loggedIn => {
                let date = new Date(loggedIn);
                return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
            }))
        ].map(loggedIn => new Date(loggedIn))).reduce((a, b) => a.concat(b));
        uniqueLoginDates =
            uniqueLoginDates.concat(loginDates.filter(time => !uniqueLoginDates.find(anotherTime => anotherTime.getTime() === time.getTime())));
        uniqueLoginDates.sort((a, b) => a.getTime() - b.getTime());
        uniqueLoginData = uniqueLoginData ?? [];
        for (let j = 0; j < uniqueLoginDates.length; j++) {
            let r = uniqueLoginData.find(d => d.x.getTime() === uniqueLoginDates[j].getTime());
            if (r) {
                r.y++;
            } else {
                uniqueLoginData.push({x: uniqueLoginDates[j], y: 1});
            }
        }
        console.log(`Calculated unique login data in ${Date.now() - time}ms!`);

        time = Date.now();
        syncData = syncData ?? [];
        for (let j = 0; j < syncDates.length; j++) {
            let r = syncData.find(d => d.x.getTime() === syncDates[j].getTime());
            if (r) {
                r.y++;
            } else {
                syncData.push({x: syncDates[j], y: 1});
            }
        }
        console.log(`Calculated sync data in ${Date.now() - time}ms!`);
    }

    time = Date.now();
    let actualAllUsers = (await db.collection(USERS_COLLECTION_NAME).find({}, {projection: {"loggedIn": 1}}).toArray())
        .concat(await db.collection(ARCHIVED_USERS_COLLECTION_NAME).find({}, {projection: {"loggedIn": 1}}).toArray());

// Might be workaround for this, but I can't figure it out at the moment
    let userData = loginData.map(t => ({
        x: t.x, y: actualAllUsers.filter(u => {
            return Date.parse(new Date(u.loggedIn[0]).toDateString()) <= t.x.getTime();
        }).length
    }));
    console.log(`Calculated user data in ${Date.now() - time}ms!`);

// No workaround for this. Need all users as far as I can tell
//     time = Date.now();
//     let activeUsersData = loginData.map(t => ({
//         x: t.x, y: actualAllUsers.filter(u => u.loggedIn.some(v => {
//             let vTime = Date.parse(new Date(v).toDateString());
//             return (vTime <= t.x.getTime()) && (vTime >= (t.x.getTime() - (14 * 24 * 60 * 60 * 1000)));
//         })).length
//     }));
//     console.log(`Calculated active user data in ${Date.now() - time}ms!`);

    time = Date.now();
    let today = new Date();
    let seniorYear = today.getFullYear() + (today.getMonth() > 4 ? 1 : 0);
    let schools = allUsers.filter(u => u.loggedIn[0] >= lastUpdatedCharts.getTime() && u.loggedIn[0] < dayStart).map(u => u.school);
    schoolData = schoolData ?? [];
    for (let j = 0; j < schools.length; j++) {
        let school = schools[j];
        let index = schoolData.findIndex(d => d.x === `${school}`);
        if (index === -1) {
            index = schoolData.length;
            schoolData.push({x: `${school}`, y: 0});
        }
        schoolData[index].y++;
    }
    console.log(`Calculated school data in ${Date.now() - time}ms!`);

    time = Date.now();
    allUsers = (await db.collection(USERS_COLLECTION_NAME).find({}, {projection: {"personalInfo.graduationYear": 1}}).toArray())
        .concat(await db.collection(ARCHIVED_USERS_COLLECTION_NAME).find({}, {projection: {"personalInfo.graduationYear": 1}}).toArray());
    let gradYears = allUsers.map(u => u.personalInfo.graduationYear ?? null);
    gradData = [];
    for (let j = 0; j < gradYears.length; j++) {
        let year = gradYears[j];
        if (year) {
            let hsYear = seniorYear - year + 4;
            if (hsYear === 1) {
                year = "Freshman";
            } else if (hsYear === 2) {
                year = "Sophomore";
            } else if (hsYear === 3) {
                year = "Junior";
            } else if (hsYear === 4) {
                year = "Senior";
            } else if (hsYear > 4) {
                year = "Graduate";
            } else {
                year = "Other";
            }
            let index = gradData.findIndex(d => d.x === `${year}`);
            if (index === -1) {
                index = gradData.length;
                gradData.push({x: `${year}`, y: 0});
            }
            gradData[index].y++;
        } else {
            let unknownIndex = gradData.findIndex(d => d.x === "Unknown");
            if (unknownIndex === -1) {
                unknownIndex = gradData.length;
                gradData.push({x: "Unknown", y: 0});
            }
            gradData[unknownIndex].y++;
        }
    }
    let sortMap = {
        "Freshman": seniorYear - 3,
        "Sophomore": seniorYear - 2,
        "Junior": seniorYear - 1,
        "Senior": seniorYear,
        "Graduate": seniorYear + 1,
        "Unknown": seniorYear + 2
    };
    gradData.sort((a, b) => sortMap[a.x] - sortMap[b.x]);
    console.log(`Calculated grad data in ${Date.now() - time}ms!`);

    lastUpdatedCharts = new Date(dayStart);

    let value = {
        loginData: loginData,
        uniqueLoginData: uniqueLoginData,
        syncData: syncData,
        userData: userData,
        gradData: gradData,
        schoolData: schoolData,
        lastUpdated: lastUpdatedCharts
    };

    await db.collection(CHARTS_COLLECTION_NAME).updateOne({}, {$set: value, $unset: {updating: ""}}, {upsert: true});
    console.log(`Finished in ${Date.now() - start}ms!`);
}