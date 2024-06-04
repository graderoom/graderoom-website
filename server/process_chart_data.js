const {MongoClient} = require("mongodb");
const {
    BETA_DATABASE_NAME,
    STABLE_DATABASE_NAME,
    ARCHIVED_USERS_COLLECTION_NAME,
    CHARTS_COLLECTION_NAME,
    isNotToday
} = require("./dbHelpers");
const {
    _getAllUsers
} = require("./dbClient");

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
    let {loginData, uniqueLoginData, syncData, schoolData, lastUpdated: lastUpdatedCharts} = data;
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
    let allUsers = (await _getAllUsers(db, projection, query)).data.value
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

        // Sort
        time = Date.now();
        loginDates = loginDates.sort((a, b) => a.getTime() - b.getTime());
        syncDates = syncDates.sort((a, b) => a.getTime() - b.getTime());
        console.log(`Sorted login and sync dates in ${Date.now() - time}ms!`);

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
    let actualAllUsers = (await _getAllUsers(db, {"loggedIn": 1, 'personalInfo.graduationYear': 1}, {"alerts.lastUpdated": {$not: {$size: 0}}})).data.value
        .concat(await db.collection(ARCHIVED_USERS_COLLECTION_NAME).find({"alerts.lastUpdated": {$not: {$size: 0}}}, {projection: {"loggedIn": 1, 'personalInfo.graduationYear': 1}}).toArray());

    // Might be workaround for this, but I can't figure it out at the moment
    let userData = loginData.map(t => ({
        x: t.x, y: actualAllUsers.filter(u => {
            return Date.parse(new Date(u.loggedIn[0]).toDateString()) <= t.x.getTime();
        }).map(u => getGradYear(u.personalInfo?.graduationYear ?? null, t.x)).reduce((a, b) => {
            if (a[b]) {
                a[b]++;
            } else {
                a[b] = 1;
            }
            return a;
        }, {
            "Freshman": 0,
            "Sophomore": 0,
            "Junior": 0,
            "Senior": 0,
            "Graduate": 0,
            "Other": 0,
            "Unknown": 0
        })
    }));
    console.log(`Calculated user data in ${Date.now() - time}ms!`);

    time = Date.now();
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

    lastUpdatedCharts = new Date(dayStart);

    let value = {
        loginData: loginData,
        uniqueLoginData: uniqueLoginData,
        syncData: syncData,
        userData: userData,
        schoolData: schoolData,
        lastUpdated: lastUpdatedCharts
    };

    await db.collection(CHARTS_COLLECTION_NAME).updateOne({}, {$set: value, $unset: {updating: ""}}, {upsert: true});
    console.log(`Finished in ${Date.now() - start}ms!`);
}

function getGradYear(year, today = null) {
    if (year === null) {
        return "Unknown";
    }
    if (today === null) {
        today = new Date();
    }
    let seniorYear = today.getFullYear() + (today.getMonth() > 4 ? 1 : 0);
    let hsYear = seniorYear - year + 4;
    if (hsYear === 1) {
        return "Freshman";
    } else if (hsYear === 2) {
        return "Sophomore";
    } else if (hsYear === 3) {
        return "Junior";
    } else if (hsYear === 4) {
        return "Senior";
    } else if (hsYear > 4) {
        return "Graduate";
    } else {
        return "Other";
    }
}
