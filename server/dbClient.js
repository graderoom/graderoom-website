const {MongoClient} = require("mongodb");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const chroma = require("chroma-js");
const _ = require("lodash");
const {fork} = require("node:child_process");
const socketManager = require("./socketManager");
const scraper = require("./scrape");
const {SyncStatus, Schools, Constants, ColorPresets} = require("./enums");

let _url;
let _prod;
let _beta;
let _testing;
let _client;

const {
    makeUser,
    validatePassword,
    makeKey,
    lower,
    removeId,
    classesCollection,
    ROUNDS_TO_GENERATE_SALT,
    validateEmail,
    getPersonalInfo,
    tutorialKeys,
    shuffleArray,
    betaFeatures,
    compareWeights,
    isCustom,
    fixWeights,
    makeTeacher,
    makeClass,
    COMMON_DATABASE_NAME,
    CATALOG_COLLECTION_NAME,
    BETAKEYS_COLLECTION_NAME,
    TEST_DATABASE_NAME,
    BETA_DATABASE_NAME,
    USERS_COLLECTION_NAME,
    ARCHIVED_USERS_COLLECTION_NAME,
    STABLE_DATABASE_NAME,
    CHARTS_COLLECTION_NAME,
    INTERNAL_API_KEYS_COLLECTION_NAME,
    betaFeatureKeys,
    isNotToday,
    dbUserVersion,
    dbClassVersion,
    latestVersion,
    buildStarterNotifications,
    notificationButton,
    notificationTextField,
    donoAttributes,
    nextSyncAllowed,
    ERRORS_COLLECTION_NAME,
    GENERAL_ERRORS_COLLECTION_NAME, minUsersForAverageCalc, SCHOOL_USERNAME_LOOKUP_COLLECTION_NAME, hash,
    checkValidMMDDYYYY
} = require("./dbHelpers");

const config = async (url, prod, beta, testing = false) => {
    _url = url ?? _url;
    _prod = prod ?? _prod;
    _beta = beta ?? _beta;
    _testing = testing ?? _testing;
    _client?.close();
    _client = await MongoClient.connect(_url);
    console.log(`Connected to mongodb at url: ${_url}`);
};

/**
 * Executes the given function.
 * Passes in db and given args.
 * Asynchronously returns the success and data returned by the called function,
 * ensuring return value is in the given format.
 *
 * @param func function to be called
 * @param args args to pass into the provided function
 * @returns {Promise<{success: boolean, data: Object}>}
 */
const safe = (func, ...args) => {
    return new Promise(resolve => {
        func(db(_client), ...args).then(async (_data) => {
            _data = _data ?? {};
            let success = "success" in _data && typeof _data.success === "boolean" ? _data.success : false;
            let data = "data" in _data && _data.data.constructor === Object ? _data.data : {};
            if ("log" in data) {
                if (!_prod) {
                    console.log(data.log);
                }
                delete data.log;
            }
            if ("prodLog" in data) {
                console.log(data.prodLog);
                delete data.prodLog;
            }
            if ("value" in data) {
                if (data.value === null) {
                    delete data.value;
                } else {
                    // Remove the _id attribute of the value if it exists
                    data.value = removeId(data.value);
                }
            }
            return resolve({success: success, data: data});
        }).catch(e => {
            console.log("ERROR");
            console.log(e);
            console.log(e.stack);
            logGeneralError(e.toString()).then(({data}) => {
                resolve({success: false, data: {message: `Something went wrong. Error ${data.value}.`}});
            });
        });
    });
};

const db = client => client.db(_testing ? TEST_DATABASE_NAME : _beta ? BETA_DATABASE_NAME : STABLE_DATABASE_NAME);

const _users = (db, username) => db.collection(`${USERS_COLLECTION_NAME}_${hash(username)}`);

const _usernames = (db) => db.collection(SCHOOL_USERNAME_LOOKUP_COLLECTION_NAME);

const _catalog = () => _client.db(COMMON_DATABASE_NAME).collection(CATALOG_COLLECTION_NAME);

const _errors = () => _client.db(COMMON_DATABASE_NAME).collection(ERRORS_COLLECTION_NAME);

const _generalErrors = () => _client.db(COMMON_DATABASE_NAME).collection(GENERAL_ERRORS_COLLECTION_NAME);

const init = () => safe(_init);
const _init = async (db) => {
    // Get list of names of existing collections
    let collections = await db.listCollections().toArray();
    let collectionNames = collections.map((c) => c.name);

    if (_beta) {
        if (!collectionNames.includes(BETAKEYS_COLLECTION_NAME)) {
            await db.createCollection(BETAKEYS_COLLECTION_NAME);
        }
    }
    // Create the user collection if it doesn't exist
    if (collectionNames.includes(USERS_COLLECTION_NAME)) {
        // Split users into multiple collections based on username
        if (!collectionNames.includes(`${USERS_COLLECTION_NAME}_0`)) {
            await db.createCollection(SCHOOL_USERNAME_LOOKUP_COLLECTION_NAME);
            await db.collection(SCHOOL_USERNAME_LOOKUP_COLLECTION_NAME).createIndex({schoolUsername: 1}, {
                unique: true,
                name: "schoolUsername_1"
            });

            for (let i = 0; i < 10; i++) {
                let collectionName = `${USERS_COLLECTION_NAME}_${i}`;
                await db.createCollection(collectionName);
                await db.collection(collectionName).createIndex({username: 1}, {unique: true, name: "username_1"});
            }

            let users = await db.collection(USERS_COLLECTION_NAME).find().toArray();
            for (let user of users) {
                await db.collection(SCHOOL_USERNAME_LOOKUP_COLLECTION_NAME).insertOne({
                    username: user.username,
                    schoolUsername: user.schoolUsername,
                    hash: hash(user.username)
                });
                await _users(db, user.username).insertOne(user);
            }
        }
    } else if (!collectionNames.includes(`${USERS_COLLECTION_NAME}_0`)) {
        for (let i = 0; i < 10; i++) {
            let collectionName = `${USERS_COLLECTION_NAME}_${i}`;
            await db.createCollection(collectionName);
            await db.collection(collectionName).createIndex({username: 1}, {unique: true, name: "username_1"});
        }

        await db.createCollection(SCHOOL_USERNAME_LOOKUP_COLLECTION_NAME);
        await db.collection(SCHOOL_USERNAME_LOOKUP_COLLECTION_NAME).createIndex({schoolUsername: 1}, {
            unique: true,
            name: "schoolUsername_1"
        });

        await addUser(Schools.BELL, "admin", "Pa5sw0rd", "change.me21@bcp.org", true);
    }

    // Create the deleted user collection if it doesn't exist
    if (!collectionNames.includes(ARCHIVED_USERS_COLLECTION_NAME)) {
        await db.createCollection(ARCHIVED_USERS_COLLECTION_NAME);
    }
    // Create the charts collection if it doesn't exist
    if (!collectionNames.includes(CHARTS_COLLECTION_NAME)) {
        await db.createCollection(CHARTS_COLLECTION_NAME);
    }
    let data = await db.collection(CHARTS_COLLECTION_NAME).findOne();
    if (data && data.updating) {
        await db.collection(CHARTS_COLLECTION_NAME).updateOne({}, {$unset: {updating: ""}})
    }
    // Create the internal collection if it doesn't exist
    if (!collectionNames.includes(INTERNAL_API_KEYS_COLLECTION_NAME)) {
        await db.createCollection(INTERNAL_API_KEYS_COLLECTION_NAME);
    }

    for (let school of Object.values(Schools)) {
        // Create the classes collection if it doesn't exist
        if (!collectionNames.includes(classesCollection(school))) {
            await db.createCollection(classesCollection(school));
        }
    }

    return {success: true};
};

const usernameAvailable = (username) => safe(_usernameAvailable, lower(username));
const _usernameAvailable = async (db, username) => {
    let res = await userExists({username: username});
    if (res.success) {
        return {
            success: false, data: {log: `${username} is already taken`, message: "This username is already taken!"}
        };
    }
    let res2 = await userArchived({username: username});
    if (res2.success) {
        return {
            success: false, data: {
                log: `${username} is archived`,
                message: "This account has been archived! Email <a href='mailto:support@graderoom.me'>support@graderoom.me</a> to recover your account."
            }
        };
    }
    return {success: true, data: {message: "Valid Username!"}};
};

const schoolUsernameAvailable = (schoolUsername) => safe(_schoolUsernameAvailable, lower(schoolUsername));
const _schoolUsernameAvailable = async (db, schoolUsername) => {
    let res = await userExists({schoolUsername: schoolUsername});
    if (res.success) {
        return {
            success: false, data: {
                log: `${schoolUsername} is already taken`,
                message: "This email address is already associated with an account!"
            }
        };
    }
    let res2 = await userArchived({schoolUsername: schoolUsername});
    if (res2.success) {
        return {
            success: false, data: {
                log: `${schoolUsername} is archived`,
                message: "The account associated with this email address has been archived! Email <a href='mailto:support@graderoom.me'>support@graderoom.me</a> to recover your account."
            }
        };
    }
    return {success: true, data: {message: "Valid Email!"}};
};

const addUser = (school, username, password, schoolUsername, isAdmin, beta = false, betaKey) => safe(_addUser, lower(school), lower(username), password, lower(schoolUsername), isAdmin, beta, betaKey);
const _addUser = async (db, school, username, password, schoolUsername, isAdmin, beta, betaKey) => {
    if (beta) {
        let res = await claimBetaKey(betaKey, username);
        if (!res.success) {
            return res;
        }
    }
    let createUser = await makeUser(school, username, password, schoolUsername, isAdmin, beta);
    if (!createUser.success) {
        console.log(createUser.message);
        return createUser;
    }
    let user = createUser.data.value;
    return await safe(__addUser, user);
};

const __addUser = async (db, user) => {
    if (!(await userExists({username: user.username, schoolUsername: user.schoolUsername})).success &&
        !(await userArchived({username: user.username, schoolUsername: user.schoolUsername})).success) {
        await _usernames(db).insertOne({
            username: user.username,
            schoolUsername: user.schoolUsername,
            api: user.api,
            discord: user.discord,
            hash: hash(user.username)
        });
        await _users(db, user.username).insertOne(user);
        return {success: true, data: {log: `Created user ${user.username}`, message: "User Created"}};
    } else {
        return {
            success: false, data: {
                log: `User already exists with username=${user.username} or schoolUsername=${user.schoolUsername}`,
                message: "This username or email address is already in use."
            }
        };
    }
};

const userExists = ({
                        username, schoolUsername
                    }, includeFullUser = false) => safe(_userExists, {
    username: lower(username), schoolUsername: lower(schoolUsername)
}, includeFullUser);
const _userExists = async (db, {username, schoolUsername}, includeFullUser = false) => {
    let query = {$or: [{username: username}, {schoolUsername: schoolUsername}]};
    let userExists = await _usernames(db).findOne(query);
    if (userExists) {
        if (includeFullUser) {
            userExists = await _users(db, userExists.username).findOne({username: userExists.username});
        }
        return {
            success: true,
            data: {log: `User with username=${username}, schoolUsername=${schoolUsername} found`, value: userExists}
        };
    }
    return {
        success: false,
        data: {log: `No user found with given parameters: username=${username}, schoolUsername=${schoolUsername}`}
    };
};
const _version1 = async (db, username) => {
    let res = await getUser(username, {version: 1, weights: 1, addedAssignments: 1, editedAssignments: 1});
    if (!res.success) {
        return res;
    }

    let user = res.data.value;
    await safe(__version1, user);

    return {success: true, data: {log: `Updated ${username} to version 1`}};
};

const __version1 = async (db, user) => {
    if (user.version === 0) {
        // Change weights to new structure
        let weights = user.weights;
        let grades = user.grades;
        let years = Object.keys(weights);
        for (let i = 0; i < years.length; i++) {
            let year = years[i];
            let semesters = Object.keys(weights[year]);
            for (let j = 0; j < semesters.length; j++) {
                let semester = semesters[j];
                let temp = [];
                let orderedClasses = grades[year][semester].map(g => g.class_name);
                for (let k = 0; k < orderedClasses.length; k++) {
                    let className = orderedClasses[k];
                    temp.push({
                        className: className,
                        weights: weights?.[year]?.[semester]?.[className]?.weights ?? {},
                        hasWeights: weights?.[year]?.[semester]?.[className]?.hasWeights ?? false
                    });
                }
                weights[year][semester] = temp;
            }
        }

        // Change addedAssignments to new structure
        let addedAssignments = user.addedAssignments;
        years = Object.keys(addedAssignments);
        for (let i = 0; i < years.length; i++) {
            let year = years[i];
            let semesters = Object.keys(addedAssignments[year]);
            for (let j = 0; j < semesters.length; j++) {
                let semester = semesters[j];
                let temp = [];
                let orderedClasses = grades[year][semester].map(g => g.class_name);
                for (let k = 0; k < orderedClasses.length; k++) {
                    let className = orderedClasses[k];
                    temp.push(Object.assign({className: className}, {data: addedAssignments[year][semester][className]}));
                }
                addedAssignments[year][semester] = temp;
            }
        }

        // Change editedAssignments to new structure
        let editedAssignments = user.editedAssignments;
        years = Object.keys(editedAssignments);
        for (let i = 0; i < years.length; i++) {
            let year = years[i];
            let semesters = Object.keys(editedAssignments[year]);
            for (let j = 0; j < semesters.length; j++) {
                let semester = semesters[j];
                let temp = [];
                let orderedClasses = grades[year][semester].map(g => g.class_name);
                for (let k = 0; k < orderedClasses.length; k++) {
                    let className = orderedClasses[k];
                    temp.push(Object.assign({className: className}, {data: editedAssignments[year][semester][className]}));
                }
                editedAssignments[year][semester] = temp;
            }
        }

        await _users(db, user.username).updateOne({username: user.username}, {
            $set: {
                "weights": weights, "addedAssignments": addedAssignments, "editedAssignments": editedAssignments
            }
        });

        // Run init weights to clean up bad weights (dots causing stuff)
        await initAddedWeights(user.username);
        await initWeights(user.username);
        await initAddedAssignments(user.username);
        await initEditedAssignments(user.username);

        await _users(db, user.username).updateOne({username: user.username}, {$set: {version: 1}});
    }
};

const _version2 = async (db, username) => {
    let res = await getUser(username, {version: 1, addedAssignments: 1});
    if (!res.success) {
        return res;
    }

    let user = res.data.value;
    await safe(__version2, user);

    return {success: true, data: {log: `Updated ${username} to version 2`}};
};

const __version2 = async (db, user) => {
    if (user.version === 1) {
        // Make sure exclude property is in addedAssignments
        let addedAssignments = user.addedAssignments;
        let years = Object.keys(addedAssignments);
        for (let i = 0; i < years.length; i++) {
            let year = years[i];
            let semesters = Object.keys(addedAssignments[year]);
            for (let j = 0; j < semesters.length; j++) {
                let semester = semesters[j];
                for (let k = 0; k < addedAssignments[year][semester].length; k++) {
                    let data = addedAssignments[year][semester][k].data;
                    if (!data) {
                        data = [];
                    }
                    for (let l = 0; l < data.length; l++) {
                        if (!("exclude" in data[l])) {
                            addedAssignments[year][semester][k].data[l].exclude = false;
                        }
                    }
                }
            }
        }

        await _users(db, user.username).updateOne({username: user.username}, {$set: {addedAssignments: addedAssignments}});

        await _users(db, user.username).updateOne({username: user.username}, {$set: {version: 2}});
    }
};

const _version3 = async (db, username) => {
    let res = await getUser(username, {
        version: 1, grades: 1, weights: 1, addedAssignments: 1, editedAssignments: 1
    });
    if (!res.success) {
        return res;
    }

    let user = res.data.value;
    await safe(__version3, user);

    return {success: true, data: {log: `Updated ${username} to version 3`}};
};

const __version3 = async (db, user) => {
    // Fix weight data
    if (user.version === 2) {
        let weights = user.weights;
        let years = Object.keys(user.grades);
        for (let i = 0; i < years.length; i++) {
            let year = years[i];
            let semesters = Object.keys(user.grades[year]);
            for (let j = 0; j < semesters.length; j++) {
                let semester = semesters[j];
                let matchedIndices = [];
                for (let k = 0; k < user.grades[year][semester].length; k++) {
                    let actualClassName = user.grades[year][semester][k].class_name;
                    let actualWeights = user.grades[year][semester][k].grades.map(g => g.category);
                    // Find matching weights
                    for (let l = 0; l < weights[year][semester].length; l++) {
                        let _weights = Object.keys(weights[year][semester][l].weights);
                        if (_.isEmpty(_.xor(_weights, actualWeights)) && !matchedIndices.includes(l)) {
                            matchedIndices.push(l);
                            weights[year][semester][l].className = actualClassName;
                            break;
                        }
                    }
                }
                // Sort them
                weights[year][semester] =
                    user.grades[year][semester].map(g => weights[year][semester].find(w => w.className === g.class_name) ?? {
                        className: g.class_name, weights: {}, hasWeights: false, custom: false
                    });
            }
        }

        let addedAssignments = user.addedAssignments;
        years = Object.keys(addedAssignments);
        for (let i = 0; i < years.length; i++) {
            let year = years[i];
            let semesters = Object.keys(addedAssignments[year]);
            for (let j = 0; j < semesters.length; j++) {
                let semester = semesters[j];
                for (let k = 0; k < addedAssignments[year][semester].length; k++) {
                    let data = addedAssignments[year][semester][k];
                    if (!("data" in data)) {
                        addedAssignments[year][semester][k].data = [];
                    }
                    if ("assignments" in data) {
                        delete addedAssignments[year][semester][k].assignments;
                    }
                }
            }
        }

        // Fix edited assignment data
        let editedAssignments = user.editedAssignments;
        years = Object.keys(editedAssignments);
        for (let i = 0; i < years.length; i++) {
            let year = years[i];
            let semesters = Object.keys(editedAssignments[year]);
            for (let j = 0; j < semesters.length; j++) {
                let semester = semesters[j];
                for (let k = 0; k < editedAssignments[year][semester].length; k++) {
                    let data = editedAssignments[year][semester][k];
                    if (!("data" in data)) {
                        editedAssignments[year][semester][k].data = [];
                    }
                    if ("assignments" in data) {
                        delete editedAssignments[year][semester][k].assignments;
                    }
                }
            }
        }

        await _users(db, user.username).updateOne({username: user.username}, {
            $set: {
                weights: weights, editedAssignments: editedAssignments, addedAssignments: addedAssignments
            }
        });

        await _users(db, user.username).updateOne({username: user.username}, {$set: {version: 3}});
    }
};

const _version4 = async (db, username) => {
    let res = await getUser(username, {version: 1, addedAssignments: 1, editedAssignments: 1});
    if (!res.success) {
        return res;
    }

    let user = res.data.value;
    await safe(__version4, user);

    return {success: true, data: {log: `Updated ${username} to version 4`}};
};

const __version4 = async (db, user) => {
    if (user.version === 3) {
        await initAddedAssignments(user.username);
        await initEditedAssignments(user.username);

        await _users(db, user.username).updateOne({username: user.username}, {$set: {version: 4}});
    }
};

const _version5 = async (db, username) => {
    let res = await getUser(username, {version: 1});
    if (!res.success) {
        return res;
    }

    let user = res.data.value;
    await safe(__version5, user);

    return {success: true, data: {log: `Updated ${username} to version 5`}};
};

const __version5 = async (db, user) => {
    if (user.version === 4) {
        await _users(db, user.username).updateOne({username: user.username}, {
            $set: {
                donoData: [], version: 5
            }
        });
    }
};

const _version6 = async (db, username) => {
    let res = await getUser(username, {version: 1});
    if (!res.success) {
        return res;
    }

    let user = res.data.value;
    await safe(__version6, user);

    return {success: true, data: {log: `Updated ${username} to version 6`}};
};

const __version6 = async (db, user) => {
    if (user.version === 5) {
        await _users(db, user.username).updateOne({username: user.username}, {$set: {api: {}, version: 6}});
    }
};

const _version7 = async (db, username) => {
    let res = await getUser(username, {version: 1});
    if (!res.success) {
        return res;
    }

    let user = res.data.value;
    await safe(__version7, user);

    return {success: true, data: {log: `Updated ${username} to version 7`}};
};

const __version7 = async (db, user) => {
    if (user.version === 6) {
        await _users(db, user.username).updateOne({username: user.username}, {
            $set: {
                "appearance.showPlusMinusLines": false, version: 7
            }
        });
    }
};

const _version8 = async (db, username) => {
    let res = await getUser(username, {version: 1});
    if (!res.success) {
        return res;
    }

    let user = res.data.value;
    await safe(__version8, user);

    return {success: true, data: {log: `Updated ${username} to version 8`}};
};

const __version8 = async (db, user) => {
    if (user.version === 7) {
        await initEditedAssignments(user.username);
        await initAddedAssignments(user.username);

        await _users(db, user.username).updateOne({username: user.username}, {$set: {version: 8}});
    }
};

const _version9 = async (db, username) => {
    let res = await getUser(username, {version: 1});
    if (!res.success) {
        return res;
    }

    let user = res.data.value;
    await safe(__version9, user);

    return {success: true, data: {log: `Updated ${username} to version 9`}};
};

const __version9 = async (db, user) => {
    if (user.version === 8) {
        await _users(db, user.username).updateOne({username: user.username}, {
            $set: {
                "appearance.reduceMotion": false, "appearance.showEmpty": true, version: 9
            }
        });
    }
};

const _version10 = async (db, username) => {
    let res = await getUser(username, {version: 1});
    if (!res.success) {
        return res;
    }

    let user = res.data.value;
    await safe(__version10, user);

    return {success: true, data: {log: `Updated ${username} to version 10`}};
};

const __version10 = async (db, user) => {
    if (user.version === 9) {
        await _users(db, user.username).updateOne({username: user.username}, {
            $unset: {"notifications": ""}, $set: {
                "alerts.notificationSettings": {showUpdatePopup: false},
                "alerts.notifications": buildStarterNotifications(),
                version: 10
            }
        });
    }
};

const _version11 = async (db, username) => {
    let res = await getUser(username, {version: 1});
    if (!res.success) {
        return res;
    }

    let user = res.data.value;
    await safe(__version11, user);

    return {success: true, data: {log: `Updated ${username} to version 11`}};
};

const __version11 = async (db, user) => {
    if (user.version === 10) {
        await _users(db, user.username).updateOne({username: user.username}, {
            $unset: {"notifications": ""}, $set: {"alerts.notifications": buildStarterNotifications(), version: 11}
        });
    }
};

const _version12 = async (db, username) => {
    let res = await getUser(username, {version: 1, school: 1, grades: 1, weights: 1});
    if (!res.success) {
        return res;
    }

    let user = res.data.value;
    await safe(__version12, user);

    return {success: true, data: {log: `Updated ${username} to version 12`}};
};

const __version12 = async (db, user) => {
    if (user.version === 11) {
        if (user.school !== Schools.BISV) {
            await _users(db, user.username).updateOne({username: user.username}, {$set: {version: 12}});
        } else {
            let grades = user.grades;
            let weights = user.weights;
            let terms = Object.keys(grades);
            for (let term of terms) {
                let oldGrades = grades[term]._;
                let oldWeights = weights[term]._;
                if (oldGrades) {
                    grades[term].T1 = oldGrades;
                    delete grades[term]._;
                }
                if (oldWeights) {
                    weights[term].T1 = oldWeights;
                    delete weights[term]._;
                }
                for (let course of grades[term].T1) {
                    if (course.overall_percent === null) {
                        course.overall_percent = false;
                    } else if (typeof course.overall_percent === "string" && course.overall_percent.slice(-1)[0] === "%") {
                        course.overall_percent = parseFloat(course.overall_percent.slice(0, -1));
                    }
                }
            }

            await _users(db, user.username).updateOne({username: user.username}, {
                $set: {
                    grades: grades, weights: weights, version: 12
                }
            });

            await initAddedAssignments(user.username);
            await initEditedAssignments(user.username);
        }
    }
};

const _version13 = async (db, username) => {
    let res = await getUser(username, {version: 1});
    if (!res.success) {
        return res;
    }

    let user = res.data.value;
    await safe(__version13, user);

    return {success: true, data: {log: `Updated ${username} to version 13`}};
};

const __version13 = async (db, user) => {
    if (user.version === 12) {
        await _users(db, user.username).updateOne({username: user.username}, {
            $set: {
                discord: {}, version: 13
            }
        });
    }
};

const _version14 = async (db, username) => {
    let res = await getUser(username, {
        version: 1, grades: 1, weights: 1, editedAssignments: 1, addedAssignments: 1
    });
    if (!res.success) {
        return res;
    }

    let user = res.data.value;
    await safe(__version14, user);

    return {success: true, data: {log: `Updated ${username} to version 14`}};
};

const __version14 = async (db, user) => {
    if (user.version === 13) {
        let addedAssignments = _.clone(user.addedAssignments);
        let editedAssignments = _.clone(user.editedAssignments);
        let terms = Object.keys(user.grades);
        for (let term of terms) {
            let semesters = Object.keys(user.grades[term]);
            for (let semester of semesters) {
                for (let i = 0; i < user.grades[term][semester].length; i++) {
                    for (let psaid of Object.keys(user.editedAssignments[term][semester][i].data)) {
                        if (user.grades[term][semester][i].grades.findIndex(a => `${a["psaid"]}` === psaid) === -1) {
                            delete editedAssignments[term][semester][i].data[psaid];
                        }
                    }
                    for (let assignment of user.addedAssignments[term][semester][i].data) {
                        if (!Object.keys(user.weights[term][semester][i].weights).includes(assignment.category)) {
                            _.remove(addedAssignments[term][semester][i].data, assignment);
                        }
                    }
                }
            }
        }

        await _users(db, user.username).updateOne({username: user.username}, {
            $set: {
                addedAssignments: addedAssignments, editedAssignments, version: 14
            }
        });
    }
};

const _version15 = async (db, username) => {
    let res = await getUser(username, {version: 1});
    if (!res.success) {
        return res;
    }

    let user = res.data.value;
    await safe(__version15, user);

    return {success: true, data: {log: `Updated ${username} to version 15`}};
};

const __version15 = async (db, user) => {
    if (user.version === 14) {
        await _users(db, user.username).updateOne({username: user.username}, {$set: {errors: [], version: 15}});
    }
};

const _version16 = async (db, username) => {
    let res = await getUser(username, {version: 1});
    if (!res.success) {
        return res;
    }

    let user = res.data.value;
    await safe(__version16, user);

    return {success: true, data: {log: `Updated ${username} to version 16`}};
};

const __version16 = async (db, user) => {
    if (user.version === 15) {
        await _users(db, user.username).updateOne({username: user.username}, {
            $unset: {"appearance.showEmpty": ""}, $set: {version: 16}
        });
    }
};

const _version17 = async (db, username) => {
    let res = await getUser(username, {version: 1, "appearance.classColors": 1});
    if (!res.success) {
        return res;
    }

    let user = res.data.value;
    await safe(__version17, user);

    return {success: true, data: {log: `Updated ${username} to version 17`}};
};

const __version17 = async (db, user) => {
    if (user.version === 16) {
        if (user.appearance.classColors.length !== 18) {
            await setColorPalette(user.username);
        }
        await _users(db, user.username).updateOne({username: user.username}, {
            $set: {version: 17}
        });
    }
};

const _version18 = async (db, username) => {
    let res = await getUser(username, {version: 1, discord: 1});
    if (!res.success) {
        return res;
    }

    let user = res.data.value;
    await safe(__version18, user);

    return {success: true, data: {log: `Updated ${username} to version 18`}};
};

const __version18 = async (db, user) => {
    if (user.version === 17) {
        if (!user.discord) {
            await _users(db, user.username).updateOne({username: user.username}, {
                $set: {
                    discord: {}
                }
            });
        }
        await _users(db, user.username).updateOne({username: user.username}, {
            $set: {version: 18}
        });
    }
};

const _version19 = async (db, username) => {
    let res = await getUser(username, {version: 1, grades: 1, "alerts.lastUpdated": 1});
    if (!res.success) {
        return res;
    }

    let user = res.data.value;
    await safe(__version19, user);

    return {success: true, data: {log: `Updated ${username} to version 19`}};
};

const __version19 = async (db, user) => {
    if (user.version === 18) {
        let years = Object.keys(user.grades);
        if (years.length === 0) {
            await _users(db, user.username).updateOne({username: user.username}, {
                $set: {
                    updateStartTimestamps: {}, version: 19
                }
            });
            return;
        }

        years.sort();
        let yearIndex = 0;
        let currentYear = years[yearIndex];

        let semesters = Object.keys(user.grades[currentYear]);

        semesters.sort();
        let semesterIndex = 0;
        let currentSemester = semesters[semesterIndex];

        let classNames = user.grades[currentYear][currentSemester].map(c => c.class_name);
        let nextYear = semesterIndex + 1 > semesters.length - 1 && yearIndex + 1 < years.length ? years[yearIndex + 1] : currentYear;
        let nextSemester = nextYear === currentYear ? semesterIndex + 1 < semesters.length ? semesters[semesterIndex + 1] : currentSemester : Object.keys(user.grades[nextYear])[0];
        let nextPSAIDs = user.grades[nextYear][nextSemester].map(c => c.grades.map(g => g.psaid).filter(g => g)).flat();

        let updateStartTimestamps = {[currentYear]: {[currentSemester]: 0}};

        // We are going in order and flagging the lastUpdated data with semester changes
        // the updateGrades function should be modified to automatically add this information when applicable
        // I am writing comments wow!
        let lastUpdated = user.alerts.lastUpdated.filter(c => Object.keys(c.changeData).length !== 0);

        for (let i = 0; i < lastUpdated.length; i++) {
            let obj = lastUpdated[i];
            /**
             * Alright I'm exhausted so writing stuff out is probably a good idea
             * There are a few formats for these objects. The goal is to make it easy to
             * query only the updateData for a single semester.
             * mongo lets me do this with a filter, so I *could* add a semester tag to every single
             * update entry but that seems inefficient space-wise. Another option is to
             * save the start timestamps of each semester for each user. I think I'll do that.
             * Then, we can use that to set bounds for the timestamps in the aggregate filter
             * when we query
             *
             * We'll add this map to the user object with the structure:
             * updateStartTimestamps: { "21-22": { "S1": <timestamp>, "S2": <timestamp> }, "20-21": <obj>, ...}
             */

            let changeData = obj.changeData;

            /**
             * Ok now there are a few ways we can detect a semester change. If we get to a class that's not
             * in the current semester, then we should go to the next semester until we find one that has this class.
             * All four subdictionaries have keys that are class names, so we can check these first.
             */
            let classes = Object.keys(Object.assign({}, changeData.added, changeData.modified, changeData.removed, changeData.overall));

            // We can also track what assignments get added/modified
            // We need to get rid of assignments that have been removed or we'll have bugs
            let PSAIDs = [
                ...Object.values(changeData.added).flat(),
                ...Object.values(changeData.modified).map(a => a.psaid).filter(g => g).flat()
            ];

            while (classes.filter(n => !classNames.includes(n)).length > 0 || PSAIDs.filter(p => nextPSAIDs.includes(p)).length > 0) {
                if (semesterIndex < semesters.length - 1) {
                    if (!(currentSemester in updateStartTimestamps[currentYear])) {
                        updateStartTimestamps[currentYear][currentSemester] = 0;
                    }
                    semesterIndex++;
                } else {
                    if (yearIndex < years.length - 1) {
                        if (!(currentSemester in updateStartTimestamps[currentYear])) {
                            updateStartTimestamps[currentYear][currentSemester] = 0;
                        }
                        semesterIndex = 0;
                        yearIndex++;
                        currentYear = years[yearIndex];
                        semesters = Object.keys(user.grades[currentYear]);

                        updateStartTimestamps[currentYear] = {};
                    } else {
                        // This shouldn't be possible
                        break;
                    }
                }
                currentSemester = semesters[semesterIndex];
                classNames = user.grades[currentYear][currentSemester].map(c => c.class_name);
                if (semesterIndex < semesters.length - 1) {
                    nextPSAIDs =
                        user.grades[currentYear][semesters[semesterIndex + 1]].map(c => c.grades.map(g => g.psaid).filter(g => g)).flat();
                } else if (yearIndex < years.length - 1) {
                    nextPSAIDs =
                        user.grades[years[yearIndex + 1]][Object.keys(user.grades[years[yearIndex + 1]])[0]].map(c => c.grades.map(g => g.psaid).filter(g => g)).flat();
                }
            }
            if (!(currentSemester in updateStartTimestamps[currentYear])) {
                updateStartTimestamps[currentYear][currentSemester] = obj.timestamp;
            }
        }

        if (lastUpdated.length) {
            for (let j = yearIndex; j < years.length; j++) {
                semesters = Object.keys(user.grades[currentYear]);
                for (let k = semesterIndex + 1; k < semesters.length; k++) {
                    updateStartTimestamps[years[j]][semesters[k]] = lastUpdated.slice(-1)[0].timestamp;
                }
                semesterIndex = 0;
            }
        }

        // Make sure the map has all the years/semesters
        for (let year of years) {
            if (!(year in updateStartTimestamps)) {
                updateStartTimestamps[year] = {};
            }
            for (let semester of semesters) {
                if (!(semester in updateStartTimestamps[year])) {
                    updateStartTimestamps[year][semester] = 0;
                }
            }
        }

        await _users(db, user.username).updateOne({username: user.username}, {
            $set: {
                updateStartTimestamps: updateStartTimestamps, version: 19
            }
        });
    }
};

const _version20 = async (db, username) => {
    let res = await getUser(username, {version: 1, grades: 1});
    if (!res.success) {
        return res;
    }

    let user = res.data.value;
    await safe(__version20, user);

    return {success: true, data: {log: `Updated ${username} to version 20`}};
};

const __version20 = async (db, user) => {
    if (user.version === 19) {
        let fakePSAID = 1;
        let years = Object.keys(user.grades);
        for (let i = 0; i < years.length; i++) {
            let year = years[i];
            let semesters = Object.keys(user.grades[year]);
            for (let j = 0; j < semesters.length; j++) {
                let semester = semesters[j];
                let classes = user.grades[year][semester];
                for (let _class of classes) {
                    let grades = _class.grades;
                    for (let assignment of grades) {
                        if ("psaid" in assignment) {
                            continue;
                        } // Could optimize but whatever
                        assignment["psaid"] = `F-${fakePSAID++}`;
                    }
                }
            }
        }

        await _users(db, user.username).updateOne({username: user.username}, {
            $set: {
                grades: user.grades, nextAvailableFakePSAID: fakePSAID, version: 20
            }
        });
    }
};

const _version21 = async (db, username) => {
    let res = await getUser(username, {version: 1});
    if (!res.success) {
        return res;
    }

    let user = res.data.value;
    await safe(__version21, user);

    return {success: true, data: {log: `Updated ${username} to version 21`}};
};

const __version21 = async (db, user) => {
    if (user.version === 20) {
        await initAddedWeights(user.username);
        await _users(db, user.username).updateOne({username: user.username}, {$set: {version: 21}});
    }
};

const _version22 = async (db, username) => {
    let res = await getUser(username, {version: 1, grades: 1});
    if (!res.success) {
        return res;
    }

    let user = res.data.value;
    await safe(__version22, user);

    return {success: true, data: {log: `Updated ${username} to version 22`}};
};

const __version22 = async (db, user) => {
    if (user.version === 21) {
        let grades = user.grades;
        let years = Object.keys(grades);
        for (let year of years) {
            let semesters = Object.keys(grades[year]);
            for (let semester of semesters) {
                let classes = grades[year][semester];
                for (let i = 0; i < classes.length; i++) {
                    let assignments = classes[i].grades;
                    for (let assignment of assignments) {
                        if (assignment.grade_percent === -1) {
                            assignment.grade_percent = false;
                        }
                    }
                }
            }
        }

        await _users(db, user.username).updateOne({username: user.username}, {$set: {grades: grades, version: 22}});
    }
};

const _version23 = async (db, username) => {
    let res = await getUser(username, {version: 1, donoData: 1, "alerts.notifications": 1});
    if (!res.success) {
        return res;
    }

    let user = res.data.value;
    await safe(__version23, user);

    return {success: true, data: {log: `Updated ${username} to version 23`}};
}

const __version23 = async (db, user) => {
    if (user.version === 22) {
        let donoData = user.donoData;
        let notifications = user.alerts.notifications;

        for (let dono of donoData) {
            let notifId = `${dono.platform}-${dono.dateDonated}-${dono.paidValue}-${dono.receivedValue}`;
            if (!("dateEntered" in dono)) {
                dono["dateEntered"] = dono["dateDonated"];
            }
            let idx = notifications.findIndex(n => n.id === notifId);
            if (idx !== -1) {
                notifications[idx].id = `${notifId}-${dono.dateDonated}`;
            }
        }

        await _users(db, user.username).updateOne({username: user.username}, {
            $set: {
                donoData: donoData,
                "alerts.notifications": notifications,
                version: 23
            }
        });
    }
}

const _version24 = async (db, username) => {
    let res = await getUser(username, {version: 1});
    if (!res.success) {
        return res;
    }

    let user = res.data.value;
    await safe(__version24, user);

    return {success: true, data: {log: `Updated ${username} to version 24`}};
};

const __version24 = async (db, user) => {
    if (user.version === 23) {
        await _users(db, user.username).updateOne({username: user.username}, {
            $unset: {
                updateStartTimestamps: ""
            },
            $set: {
                version: 24
            }
        })
    }
};
const _version25 = async (db, username) => {
    let res = await getUser(username, {version: 1, donoData: 1, "alerts.notifications": 1});
    if (!res.success) {
        return res;
    }

    let user = res.data.value;
    await safe(__version25, user);

    return {success: true, data: {log: `Updated ${username} to version 25`}};
}

const __version25 = async (db, user) => {
    if (user.version === 24) {
        let donoData = user.donoData;
        let notifications = user.alerts.notifications;

        for (let dono of donoData) {
            let notifId = `${dono.platform}-${dono.dateDonated}-${dono.paidValue}-${dono.receivedValue}`;
            if (!("dateEntered" in dono)) {
                dono["dateEntered"] = dono["dateDonated"];
            }
            let idx = notifications.findIndex(n => n.id === notifId);
            if (idx !== -1) {
                notifications[idx].id = `${notifId}-${dono.dateDonated}`;
            }
        }

        await _users(db, user.username).updateOne({username: user.username}, {
            $set: {
                donoData: donoData,
                "alerts.notifications": notifications,
                version: 25
            }
        });
    }
}

const _version26 = async (db, username) => {
    let res = await getUser(username, {version: 1, discord: 1, api: 1});
    if (!res.success) {
        return res;
    }

    let user = res.data.value;
    await safe(__version26, user);

    return {success: true, data: {log: `Updated ${username} to version 26`}};
};

const __version26 = async (db, user) => {
    if (user.version === 25) {
        let set = {};
        if ("discordID" in user.discord) {
            set["discord.discordID"] = user.discord.discordID;
        } else {
            set["discord"] = {};
        }
        if ("apiKey" in user.api) {
            set["api.apiKey"] = user.api.apiKey;
        } else if ("pairKey" in user.api) {
            set["api.pairKey"] = user.api.pairKey;
        } else {
            set["api"] = {};
        }
        await _usernames(db).updateOne({username: user.username}, {
            $set: set
        });
        await _users(db, user.username).updateOne({username: user.username}, {
            $set: {version: 26}
        });
    }
};

const _version27 = async (db, username) => {
    let res = await getUser(username, {version: 1});
    if (!res.success) {
        return res;
    }

    let user = res.data.value;
    await safe(__version27, user);

    return {success: true, data: {log: `Updated ${username} to version 27`}};
}

const __version27 = async (db, user) => {
    if (user.version === 26) {
        await _usernames(db).updateOne({username: user.username}, {
            $set: {
                hash: hash(user.username)
            }
        });
        await _users(db, user.username).updateOne({username: user.username}, {
            $set: {version: 27}
        });
    }
}

const _version28 = async (db, username) => {
    let res = await getUser(username, {version: 1, discord: 1});
    if (!res.success) {
        return res;
    }

    let user = res.data.value;
    await safe(__version28, user);

    return {success: true, data: {log: `Updated ${username} to version 28`}};
}

const __version28 = async (db, user) => {
    if (user.version === 27) {
        // Save discordIDs as strings
        if (user.discord.discordID) {
            await _usernames(db).updateOne({username: user.username}, {
                $set: {
                    'discord.discordID': `${user.discord.discordID}`
                }
            });
            await _users(db, user.username).updateOne({username: user.username}, {
                $set: {
                    'discord.discordID': `${user.discord.discordID}`,
                    version: 28
                }
            });
        } else if (user.discord.unverifiedDiscordID) {
            await _users(db, user.username).updateOne({username: user.username}, {
                $set: {
                    'discord.unverifiedDiscordID': `${user.discord.unverifiedDiscordID}`,
                    version: 28
                }
            });
        } else {
            await _users(db, user.username).updateOne({username: user.username}, {
                $set: {version: 28}
            });
        }
    }
}

const _version29 = async (db, username) => {
    let res = await getUser(username, {version: 1, alerts: 1});
    if (!res.success) {
        return res;
    }

    let user = res.data.value;
    await safe(__version29, user);

    return {success: true, data: {log: `Updated ${username} to version 29`}};
}

const __version29 = async (db, user) => {
    if (user.version === 28) {
        await _users(db, user.username).updateOne({username: user.username}, {
            $unset: {"alerts.updateGradesReminder": ""},
            $set: {version: 29}
        });
    }
}

const initUser = (username) => safe(_initUser, lower(username));
const _initUser = async (db, username) => {
    let res = await getUser(username, {school: 1, "alerts.tutorialStatus": 1, betaFeatures: 1});
    if (!res.success) {
        return res;
    }

    let user = res.data.value;
    await safe(__initUser, user);

    return {success: true, data: {log: `Initialized ${username}`}};
};

const __initUser = async (db, user) => {
    //Remove old & add missing tutorial keys
    let existingKeys = Object.keys(user.alerts.tutorialStatus);
    let temp = {};
    for (let tutorialKey of tutorialKeys) {
        if (existingKeys.includes(tutorialKey)) {
            temp[tutorialKey] = user.alerts.tutorialStatus[tutorialKey];
        } else {
            temp[tutorialKey] = false;
        }
    }

    if (!_.isEqual(temp, user.alerts.tutorialStatus)) {
        await _users(db, user.username).updateOne({username: user.username}, {
            $set: {
                "alerts.tutorialStatus": temp
            }
        });
    }

    // Remove extra beta features
    let betaFeatures = user.betaFeatures;
    let existingFeatures = Object.keys(betaFeatures);
    let features = [];

    // Set all new beta features to true
    if (betaFeatures.active) {
        for (let i = 0; i < betaFeatureKeys.length; i++) {
            if (!existingFeatures.includes(betaFeatureKeys[i])) {
                features.push(betaFeatureKeys[i]);
            } else if (betaFeatures[betaFeatureKeys[i]]) {
                features.push(betaFeatureKeys[i]);
            }
        }
    }

    await updateBetaFeatures(user.username, user.school, features);
};

const updateAllUsers = () => safe(_updateAllUsers);
const _updateAllUsers = async () => {
    let {data: {value: users}} = await getAllUsers({username: 1, version: 1});
    for (let i = 0; i < users.length; i++) {
        let user = users[i];
        if (user.version < dbUserVersion) {
            console.log(`Updating ${user.username} (${i + 1} of ${users.length})`);
            await updateUser(user);
        }
        await initUser(user.username);
    }
    return {success: true};
};

const updateUser = async (user) => {
    if (user.version < 1) {
        await safe(_version1, user.username);
    }
    if (user.version < 2) {
        await safe(_version2, user.username);
    }
    if (user.version < 3) {
        await safe(_version3, user.username);
    }
    if (user.version < 4) {
        await safe(_version4, user.username);
    }
    if (user.version < 5) {
        await safe(_version5, user.username);
    }
    if (user.version < 6) {
        await safe(_version6, user.username);
    }
    if (user.version < 7) {
        await safe(_version7, user.username);
    }
    if (user.version < 8) {
        await safe(_version8, user.username);
    }
    if (user.version < 9) {
        await safe(_version9, user.username);
    }
    if (user.version < 10) {
        await safe(_version10, user.username);
    }
    if (user.version < 11) {
        await safe(_version11, user.username);
    }
    if (user.version < 12) {
        await safe(_version12, user.username);
    }
    if (user.version < 13) {
        await safe(_version13, user.username);
    }
    if (user.version < 14) {
        await safe(_version14, user.username);
    }
    if (user.version < 15) {
        await safe(_version15, user.username);
    }
    if (user.version < 16) {
        await safe(_version16, user.username);
    }
    if (user.version < 17) {
        await safe(_version17, user.username);
    }
    if (user.version < 18) {
        await safe(_version18, user.username);
    }
    if (user.version < 19) {
        await safe(_version19, user.username);
    }
    if (user.version < 20) {
        await safe(_version20, user.username);
    }
    if (user.version < 21) {
        await safe(_version21, user.username);
    }
    if (user.version < 22) {
        await safe(_version22, user.username);
    }
    if (user.version < 23) {
        await safe(_version23, user.username);
    }
    if (user.version < 24) {
        await safe(_version24, user.username);
    }
    if (user.version < 25) {
        await safe(_version25, user.username);
    }
    if (user.version < 26) {
        await safe(_version26, user.username);
    }
    if (user.version < 27) {
        await safe(_version27, user.username);
    }
    if (user.version < 28) {
        await safe(_version28, user.username);
    }
    if (user.version < 29) {
        await safe(_version29, user.username);
    }
};

const _classVersion1 = async (db, school, className, term, semester) => {
    let res = await getClass(school, className, term, semester, {
        version: 1, department: 1, classType: 1, uc_csuClassType: 1, credits: 1, terms: 1
    });
    if (!res.success) {
        return res;
    }

    let class_ = res.data.value;
    await safe(__classVersion1, school, class_);

    return {success: true, data: {log: `Updated ${className} in ${school} ${term} ${semester} to version 1`}};
};

const __classVersion1 = async (db, school, class_) => {
    if (class_.version === 0) {
        let rawData = await _catalog().findOne({class_name: class_.className, school: school});
        let update = {};
        if (rawData != null) {
            if (class_.department === rawData.department || class_.department === "") {
                update.department = null;
            }
            if (class_.classType === rawData.classType || class_.classType === "") {
                update.classType = null;
            }
            if (class_.uc_csuClassType === rawData.uc_csuClassType || class_.uc_csuClassType === "") {
                update.uc_csuClassType = null;
            }
            if (class_.credits === rawData.credits || !([1, 2, 5, 10]).includes(class_.terms)) {
                update.credits = null;
            }
            if (_.isEqual(class_.terms, rawData.terms) || !([1, 2]).includes(class_.terms)) {
                update.terms = null;
            }
        }
        await db.collection(classesCollection(school)).updateOne({
            className: class_.className,
            term: class_.term,
            semester: class_.semester
        }, {
            $set: update,
            $unset: {grade_levels: "", description: ""}
        });

        await db.collection(classesCollection(school)).updateOne({
            className: class_.className,
            term: class_.term,
            semester: class_.semester
        }, {$set: {version: 1}});
    }
};

const _classVersion2 = async (db, school, className, term, semester) => {
    let res = await getClass(school, className, term, semester, {
        version: 1, teachers: 1
    });
    if (!res.success) {
        return res;
    }

    let class_ = res.data.value;
    await safe(__classVersion2, school, class_);

    return {success: true, data: {log: `Updated ${className} in ${school} ${term} ${semester} to version 2`}};
};

const __classVersion2 = async (db, school, class_) => {
    if (class_.version === 1) {
        let teachers = class_.teachers;
        for (let i = 0; i < teachers.length; i++) {
            let teacher = teachers[i];
            let suggestions = teacher.suggestions;
            for (let j = 0; j < suggestions.length; j++) {
                let suggestion = suggestions[j];
                let usernames = suggestion.usernames;
                let filteredUsernames = [...new Set(usernames)];

                await db.collection(classesCollection(school)).updateOne({
                    className: class_.className,
                    term: class_.term,
                    semester: class_.semester
                }, {$set: {[`teachers.${i}.suggestions.${j}.usernames`]: filteredUsernames}});
            }
        }

        await db.collection(classesCollection(school)).updateOne({
            className: class_.className,
            term: class_.term,
            semester: class_.semester
        }, {$set: {version: 2}});
    }
};

const _classVersion3 = async (db, school, className, term, semester) => {
    let res = await getClass(school, className, term, semester, {
        version: 1, department: 1, classType: 1, uc_csuClassType: 1, credits: 1, terms: 1
    });
    if (!res.success) {
        return res;
    }

    let class_ = res.data.value;
    await safe(__classVersion3, school, class_);

    return {success: true, data: {log: `Updated ${className} in ${school} ${term} ${semester} to version 3`}};
};

const __classVersion3 = async (db, school, class_) => {
    if (class_.version === 2) {
        let rawData = await _catalog().findOne({class_name: class_.className, school: school});
        let update = {};
        if (rawData != null) {
            if (class_.department === rawData.department || class_.department === "") {
                update.department = null;
            }
            if (class_.classType === rawData.classType || class_.classType === "") {
                update.classType = null;
            }
            if (class_.uc_csuClassType === rawData.uc_csuClassType || class_.uc_csuClassType === "") {
                update.uc_csuClassType = null;
            }
            if (class_.credits === rawData.credits || !([1, 2, 5, 10]).includes(class_.credits)) {
                update.credits = null;
            }
            if (_.isEqual(class_.terms, rawData.terms) || !([1, 2]).includes(class_.terms)) {
                update.terms = null;
            }
        }
        update.version = 3;
        await db.collection(classesCollection(school)).updateOne({
            className: class_.className,
            term: class_.term,
            semester: class_.semester
        }, {
            $set: update,
            $unset: {grade_levels: "", description: ""}
        });
    }
};

const _classVersion4 = async (db, school, className, term, semester) => {
    let res = await getClass(school, className, term, semester, {
        version: 1, department: 1, classType: 1, uc_csuClassType: 1, credits: 1, terms: 1
    });
    if (!res.success) {
        return res;
    }

    let class_ = res.data.value;
    await safe(__classVersion4, school, class_);

    return {success: true, data: {log: `Updated ${className} in ${school} ${term} ${semester} to version 4`}};
};

const __classVersion4 = async (db, school, class_) => {
    if (class_.version === 3) {
        let rawData = await _catalog().findOne({class_name: class_.className, school: school});
        let update = {};
        if (rawData != null || (class_.classType === "" && class_.uc_csuClassType === "")) {
            update.department = null;
            update.classType = null;
            update.uc_csuClassType = null;
            update.credits = null;
            update.terms = null;
        }
        update.version = 4;
        await db.collection(classesCollection(school)).updateOne({
            className: class_.className,
            term: class_.term,
            semester: class_.semester
        }, {
            $set: update
        });
    }
};

const updateAllClasses = () => safe(_updateAllClasses);
const _updateAllClasses = async (db) => {
    for (let school of Object.values(Schools)) {
        let {data: {value: classes}} = await getAllClasses(school, {
            className: 1, term: 1, semester: 1, version: 1
        });
        for (let i = 0; i < classes.length; i++) {
            let class_ = classes[i];
            if (class_.version < dbClassVersion) {
                console.log(`Updating ${school} class ${class_.className} (${i + 1} of ${classes.length})`);
                if (class_.version < 1) {
                    await safe(_classVersion1, school, class_.className, class_.term, class_.semester);
                }
                if (class_.version < 2) {
                    await safe(_classVersion2, school, class_.className, class_.term, class_.semester);
                }
                if (class_.version < 3) {
                    await safe(_classVersion3, school, class_.className, class_.term, class_.semester);
                }
                if (class_.version < 4) {
                    await safe(_classVersion4, school, class_.className, class_.term, class_.semester);
                }
            }
        }
    }

    return {success: true};
};

const getUser = (username, projection, additionalQuery) => safe(_getUser, lower(username), projection, additionalQuery);
const _getUser = async (db, username, projection, additionalQuery) => {
    let query = {username: username};
    if (additionalQuery) {
        Object.assign(query, additionalQuery);
    }
    projection ??= {};
    if (Object.keys(projection).length !== 0) {
        projection.username = 1;
    }
    let user = await _users(db, username).findOne(query, {projection: projection});
    if (!user) {
        return {
            success: false,
            data: {log: `No user found with given parameters: username=${username}${!!additionalQuery ? `, additionalQuery=${JSON.stringify(additionalQuery)}` : ``}`}
        };
    }
    return {success: true, data: {value: user}};
};

const getClass = (school, className, term, semester, projection, additionalQuery) => safe(_getClass, lower(school), className, term, semester, projection, additionalQuery);
const _getClass = async (db, school, className, term, semester, projection, additionalQuery) => {
    if (!Object.values(Schools).includes(school)) {
        return {success: false, data: {log: `Invalid school ${school}`}};
    }
    let query = {className: className, term: term, semester: semester};
    if (!!additionalQuery) {
        Object.assign(query, additionalQuery);
    }
    if (!!projection) {
        projection.className = 1;
        projection.term = 1;
        projection.semester = 1;
    }
    let class_ = await db.collection(classesCollection(school)).findOne(query, projection);
    if (!class_) {
        return {
            success: false,
            data: {log: `No class found with given parameters: school=${school}, className=${className}, term=${term}, semester=${semester}${!!additionalQuery ? `, additionalQuery=${JSON.stringify(additionalQuery)}` : ``}`}
        };
    }
    return {success: true, data: {value: class_}};
};

const getAllUsers = (projection, query, sort, page, count) => safe(_getAllUsers, projection, query, sort, page, count);
const _getAllUsers = async (db, projection, query, sort, page, count) => {
    query = query ?? {};

    let aggregation = [{
        $match: query,
    }, {
        $project: projection
    }];
    let sections = "123456789";
    for (let section of sections) {
        let union = {
            $unionWith: {
                coll: `${USERS_COLLECTION_NAME}_${section}`,
                pipeline: [{
                    $match: query
                }, {
                    $project: projection
                }]
            }
        };
        aggregation.push(union);
    }
    if (sort && Object.keys(sort).length > 0) {
        aggregation.push({$sort: sort});
    }
    if (page && count) {
        aggregation.push({$skip: (page - 1) * count});
        aggregation.push({$limit: count});
    }

    let value = await db.collection(`${USERS_COLLECTION_NAME}_0`).aggregate(aggregation).toArray();
    return {
        success: true,
        data: {value: value, actualCount: value.length, total: await _usernames(db).estimatedDocumentCount()}
    };
};

const getAllClasses = (school, projection) => safe(_getAllClasses, lower(school), projection);
const _getAllClasses = async (db, school, projection) => {
    if (!Object.values(Schools).includes(school)) {
        return {success: false, data: {log: `Invalid school ${school}`}};
    }
    return {
        success: true, data: {value: await db.collection(classesCollection(school)).find({}, projection).toArray()}
    };
};

const getChartData = () => safe(_getChartData);
const _getChartData = async (db) => {
    let data = await db.collection(CHARTS_COLLECTION_NAME).findOne();
    if (!data || !("lastUpdated" in data)) {
        fork("process_chart_data.js", [_url, _beta ? "true" : "false"], {cwd: "server"});
        return new Promise(resolve => resolve({success: false}));
    } else if (isNotToday(data.lastUpdated)) {
        fork("process_chart_data.js", [_url, _beta ? "true" : "false"], {cwd: "server"});
    }
    return new Promise(resolve => resolve({
        success: true, data: data
    }));
};

const getLoggedInData = (isLoggedIn, username) => safe(_getLoggedInData, isLoggedIn, lower(username));
const _getLoggedInData = async (db, isLoggedIn, username) => {
    return {
        success: true, data: {
            value: {
                count: socketManager.count() + (isLoggedIn ? 1 : 0), uniqueCount: socketManager.uniqueCount(username)
            }
        }
    };
};

const getGradeHistoryLetters = (username, term, semester) => safe(_getGradeHistoryLetters, lower(username), term, semester);
const _getGradeHistoryLetters = async (db, username, term, semester) => {
    let res = await getUser(username, {grades: 1});
    if (!res.success) {
        return res;
    }

    let user = res.data.value;
    let grades = user.grades;

    if (!(term in user.grades) || !(semester in user.grades[term])) {
        return {success: false, log: `Invalid term=${term} or semester=${semester}`};
    }

    let gradeHistoryLetters = {};

    for (let i = 0; i < Object.keys(grades).length; i++) {
        let t = Object.keys(grades)[i];
        gradeHistoryLetters[t] = {};
        for (let j = 0; j < Object.keys(grades[t]).length; j++) {
            let s = Object.keys(grades[t])[j];
            if (t.substring(0, 2) > term.substring(0, 2) || (t.substring(0, 2) === term.substring(0, 2) && s.substring(1) >= semester.substring(1))) {
                continue;
            }
            gradeHistoryLetters[t][s] = [];
            for (let k = 0; k < grades[t][s].length; k++) {
                let next = {};
                next[grades[t][s][k].class_name] = grades[t][s][k].overall_letter;
                gradeHistoryLetters[t][s].push(next);
            }
        }
    }

    return {success: true, data: {value: gradeHistoryLetters}};
};

const userArchived = ({username, schoolUsername}) => safe(_userArchived, {
    username: lower(username), schoolUsername: lower(schoolUsername)
});
const _userArchived = async (db, {username, schoolUsername}, includeFullUser = false) => {
    let projection = includeFullUser ? {} : {username: 1};
    let userExists = await db.collection(ARCHIVED_USERS_COLLECTION_NAME).findOne({
        $or: [
            {username: username},
            {schoolUsername: schoolUsername}
        ]
    }, {projection: projection});
    if (userExists) {
        return {
            success: true, data: {
                log: `Archived user with username=${username}, schoolUsername=${schoolUsername} found`,
                value: userExists
            }
        };
    }
    return {
        success: false,
        data: {log: `No archived user found with given parameters: username=${username}, schoolUsername=${schoolUsername}`}
    };
};

const unArchiveNonGraduatedUsers = () => safe(_unArchiveNonGraduatedUsers);
const _unArchiveNonGraduatedUsers = async (db) => {
    // One-time use function for when archiveOldUsers didn't check for grad year
    let date = new Date();
    let year = date.getFullYear();
    if (date.getMonth() < 6) {
        year -= 1;
    }
    let users = await db.collection(ARCHIVED_USERS_COLLECTION_NAME).find({
        "personalInfo.graduationYear": {$gt: year}
    }).toArray();
    for (let user of users) {
        await unArchiveUser(user.username);
    }
    return {
        success: true,
        data: {
            log: `Unarchived ${users.length} users that have not graduated yet`,
            message: `Unarchived ${users.length} users`
        }
    };
}

const archiveOldUsers = () => safe(_archiveOldUsers);
const _archiveOldUsers = async (db) => {
    let beforeDate = new Date();
    let year = beforeDate.getFullYear();
    if (beforeDate.getMonth() < 6) {
        beforeDate.setFullYear(year - 1);
        year -= 1;
    }
    beforeDate.setMonth(6); // July
    beforeDate.setDate(1); // 1st
    let oldUsers = (await getAllUsers({username: 1},
        {
            loggedIn: {$not: {$gt: beforeDate.getTime()}},
            "personalInfo.graduationYear": {$lte: year}
        },)).data.value;
    for (let user of oldUsers) {
        await archiveUser(user.username);
    }

    return {
        success: true,
        data: {
            log: `Archived ${oldUsers.length} users that haven't logged in since ${beforeDate.toDateString()}`,
            message: `Archived ${oldUsers.length} users that haven't logged in since ${beforeDate.toDateString()}`
        }
    };
};

const archiveUser = (username) => safe(_archiveUser, lower(username));
const _archiveUser = async (db, username) => {
    let res = await getUser(username);
    if (!res.success) {
        return res;
    }
    await db.collection(ARCHIVED_USERS_COLLECTION_NAME).insertOne(res.data.value);
    let res2 = await removeUser(username);
    if (!res2.success) {
        return res2;
    }
    return {success: true, data: {log: `Archived user ${username}.`, message: "Archived user."}};
};

const getAllArchivedUsers = (projection, query, sort, page, count) => safe(_getAllArchivedUsers, projection, query, sort, page, count);
const _getAllArchivedUsers = async (db, projection, query, sort, page, count) => {
    query = query ?? {};
    let value = db.collection(ARCHIVED_USERS_COLLECTION_NAME).find(query, {projection: projection});
    if (sort) {
        value = value.sort(sort);
    }
    if (page && count) {
        value = value.skip((page - 1) * count).limit(count);
    }
    value = await value.toArray();
    return {
        success: true,
        data: {
            value: value,
            actualCount: value.length,
            total: await db.collection(ARCHIVED_USERS_COLLECTION_NAME).estimatedDocumentCount()
        }
    };
};

const unArchiveUser = (username) => safe(_unArchiveUser, lower(username));
const _unArchiveUser = async (db, username) => {
    let res = await safe(_userArchived, {username: username}, true); // Internal call because special param
    if (!res.success) {
        return res;
    }
    let res2 = await safe(__addUser, res.data.value);
    if (!res2.success) {
        return res2;
    }
    await updateUser(res.data.value);
    await initUser(username);
    let res3 = await removeUserFromArchive(username);
    if (!res3.success) {
        return res3;
    }
    return {success: true, data: {log: `Unarchived user ${username}.`, message: "Unarchived user."}};
};

const removeUser = (username) => safe(_removeUser, lower(username));
const _removeUser = async (db, username) => {
    let res = await _users(db, username).deleteOne({
        username: username
    });
    if (res.deletedCount !== 1) {
        return {
            success: false, data: {
                log: `Could not delete user with given parameters: username=${username}`,
                message: "User could not be deleted"
            }
        };
    }

    res = await _usernames(db).deleteOne({
        username: username
    });
    if (res.deletedCount !== 1) {
        return {
            success: false, data: {
                log: `Could not delete user with given parameters: username=${username}`,
                message: "User could not be deleted"
            }
        };
    }

    return {success: true, data: {log: `Deleted user ${username}.`, message: "Deleted user."}};
};

const removeUserFromArchive = (username) => safe(_removeUserFromArchive, lower(username));
const _removeUserFromArchive = async (db, username) => {
    let res = await db.collection(ARCHIVED_USERS_COLLECTION_NAME).deleteOne({
        username: username
    });
    if (res.deletedCount === 1) {
        return {
            success: true,
            data: {log: `Deleted archived user ${username}.`, message: "Deleted archived user."}
        };
    }
    return {
        success: false, data: {
            log: `Could not delete archived user with given parameters: username=${username}`,
            message: "Archived user could not be deleted"
        }
    };
};

const getMostRecentTermData = (username) => safe(_getMostRecentTermData, lower(username));
const _getMostRecentTermData = async (db, username) => {
    let res = await getUser(username, {grades: 1, school: 1});
    if (!res.success) {
        return res;
    }
    let user = res.data.value;
    return __getMostRecentTermData(user);
};

const __getMostRecentTermData = (user) => {
    let grades = user.grades;
    let terms = Object.keys(grades);
    if (terms.length === 0) {
        return {
            success: false,
            data: {value: {term: false, semester: false}, log: `User ${user.username} has no grades!`}
        };
    }
    let term = Math.max(...terms.map(t => parseInt(t.substring(0, 2))));
    term = `${term}-${term + 1}`;
    let semesters = Object.keys(grades[term]);
    let semester = Math.max(...semesters.map(s => parseInt(s.substring(1))));
    semester = `${user.school === Schools.BISV ? "T" : "S"}${semester}`;
    return {success: true, data: {value: {term: term, semester: semester}}};
};

const login = (username, password) => safe(_login, lower(username), password);
const _login = async (db, username, password) => {
    return new Promise(async resolve => {
        let res = await getUser(username, {password: 1, schoolPassword: 1});
        if (!res.success) {
            let res2 = await userArchived({username: username});
            if (res2.success) {
                return resolve({
                    success: false, data: {
                        log: `${username} is archived`,
                        message: "This account has been archived! Email <a href='mailto:support@graderoom.me'>support@graderoom.me</a> to recover your account."
                    }
                });
            }
            return resolve({success: false, data: {message: "Invalid credentials."}});
        }
        let user = res.data.value;
        bcrypt.compare(password, user.password, async (err, success) => {
            if (err) {
                return resolve({success: false, data: {log: err, message: "Something went wrong"}});
            }
            if (!success) {
                return resolve({
                    success: false,
                    data: {
                        log: `Login failed for ${username}`,
                        message: "Incorrect Graderoom password."
                    }
                });
            }
            await deleteNotification(username, "rate-limit");
            return resolve({
                success: true,
                data: {
                    log: `Login success for ${username}`,
                    message: "Login Successful",
                    value: user
                }
            });
        });
    });
};

const setLoggedIn = (username) => safe(_setLoggedIn, lower(username));
const _setLoggedIn = async (db, username) => {
    let res = await _users(db, username).updateOne({username: username}, {$push: {loggedIn: Date.now()}});
    if (res.matchedCount === 1) {
        return {success: true};
    }
    return {success: false};
};

const encryptAndStoreSchoolPassword = (username, schoolPassword, password) => safe(_encryptAndStoreSchoolPassword, lower(username), schoolPassword, password);
const _encryptAndStoreSchoolPassword = async (db, username, schoolPassword, password) => {
    let res = await login(username, password);
    if (!res.success) {
        return res;
    }

    let resizedIV = Buffer.allocUnsafe(16);
    let iv = crypto.createHash("sha256").update("myHashedIV").digest();
    iv.copy(resizedIV);
    let key = crypto.createHash("sha256").update(password).digest();
    let cipher = crypto.createCipheriv("aes256", key, resizedIV);
    let encryptedPass = cipher.update(schoolPassword, "utf8", "hex");
    encryptedPass += cipher.final("hex");

    await _users(db, username).updateOne({username: username}, {$set: {schoolPassword: encryptedPass}});
    return {success: true, data: {log: `Stored school password for ${username}`}};
};

const decryptAndGetSchoolPassword = (username, password) => safe(_decryptAndGetSchoolPassword, lower(username), password);
const _decryptAndGetSchoolPassword = async (db, username, password) => {
    let res = await login(username, password);
    if (!res.success) {
        return res;
    }

    let user = res.data.value;

    let resizedIV = Buffer.allocUnsafe(16);
    let iv = crypto.createHash("sha256").update("myHashedIV").digest();
    iv.copy(resizedIV);
    let key = crypto.createHash("sha256").update(password).digest();
    let decipher = crypto.createDecipheriv("aes256", key, resizedIV);

    let schoolPassword = user.schoolPassword;

    let decryptedPass = decipher.update(schoolPassword, "hex", "utf8");
    decryptedPass += decipher.final("utf8");

    return {success: true, data: {value: decryptedPass}};
};

const acceptTerms = (username) => safe(_acceptTerms, lower(username));
const _acceptTerms = async (db, username) => {
    let res = await _users(db, username).updateOne({username: username}, {$set: {"alerts.termsLastSeen": Date.now()}});
    if (res.matchedCount === 1) {
        return {success: true, data: {log: `Accepted terms for ${username}`}};
    }
    return {success: false, data: {log: `Error accepting terms for ${username}`}};
};

const acceptPrivacyPolicy = (username) => safe(_acceptPrivacyPolicy, lower(username));
const _acceptPrivacyPolicy = async (db, username) => {
    let res = await _users(db, username).updateOne({username: username}, {$set: {"alerts.policyLastSeen": Date.now()}});
    if (res.matchedCount === 1) {
        return {success: true, data: {log: `Accepted policy for ${username}`}};
    }
    return {success: false, data: {log: `Error accepting policy for ${username}`}};
};

const setRemoteAccess = (username, value) => safe(_setRemoteAccess, lower(username), lower(value));
const _setRemoteAccess = async (db, username, value) => {
    let allowedValues = ["allowed", "denied"];
    if (!allowedValues.includes(value)) {
        return {
            success: false,
            data: {message: "Something went wrong", log: `Invalid remote access value: ${value}`}
        };
    }
    let res = await _users(db, username).updateOne({username: username}, {$set: {"alerts.remoteAccess": value}});
    if (res.matchedCount === 1) {
        return {success: true, data: {log: `Set remote access for ${username} to ${value}`}};
    }
    return {success: false, data: {log: `Error setting remote access for ${username} to ${value}`}};
};

const setPersonalInfo = (username, firstName, lastName, graduationYear) => safe(_setPersonalInfo, lower(username), firstName, lastName, graduationYear);
const _setPersonalInfo = async (db, username, firstName, lastName, graduationYear) => {
    let school = (await getUser(username, {school: 1})).data.value.school;
    if (([
        !!firstName, !!lastName || (school === Schools.BISV && lastName === ""),
        !!graduationYear || graduationYear === 0
    ]).filter(a => a).length !== 1) {
        return {success: false, data: {log: `Invalid personal info for ${username}`, message: "Something went wrong"}};
    }
    let nameRegex = new RegExp(/^[a-z]+(?:-[a-z]+)*$/i);
    if (!!firstName) {
        if (nameRegex.test(firstName)) {
            let res = await _users(db, username).updateOne({username: username}, {$set: {"personalInfo.firstName": firstName}});
            if (res.matchedCount === 1) {
                return {success: true, data: {message: "Updated first name"}};
            }
            return {
                success: false,
                data: {
                    log: `Failed to set ${firstName} as first name for ${username}`,
                    message: "Something went wrong"
                }
            };
        }
        return {success: false, data: {message: "First name can only contain letters and/or hyphens."}};
    } else if (!!lastName || (school === Schools.BISV && lastName === "")) {
        if (nameRegex.test(lastName)) {
            let res = await _users(db, username).updateOne({username: username}, {$set: {"personalInfo.lastName": lastName}});
            if (res.matchedCount === 1) {
                return {success: true, data: {message: "Updated last name"}};
            }
            return {
                success: false,
                data: {
                    log: `Failed to set ${lastName} as last name for ${username}`,
                    message: "Something went wrong"
                }
            };
        }
        return {success: false, data: {message: "Last name can only contain letters and/or hyphens."}};
    } else if (!!graduationYear || graduationYear === 0) {
        if (school !== Schools.BISV) {
            return {success: false, data: {message: "Changing graduation year is not supported"}};
        }

        if (typeof graduationYear !== "number") {
            return {success: false, data: {message: "Graduation year must be a number"}};
        }
        let res = await _users(db, username).updateOne({username: username}, {$set: {"personalInfo.graduationYear": graduationYear}});
        if (res.matchedCount === 1) {
            return {success: true, data: {message: "Updated graduation year"}};
        }
        return {
            success: false, data: {
                log: `Failed to set ${graduationYear} as graduation year for ${username}`,
                message: "Something went wrong"
            }
        };
    }
};

const setShowNonAcademic = (username, value) => safe(_setShowNonAcademic, lower(username), value);
const _setShowNonAcademic = async (db, username, value) => {
    if (typeof value !== "boolean") {
        return {
            success: false, data: {message: "Something went wrong", log: `Invalid showNonAcademic value: ${value}`}
        };
    }
    let res = await _users(db, username).updateOne({username: username}, {$set: {"appearance.showNonAcademic": value}});
    if (res.matchedCount === 1) {
        return {success: true, data: {log: `Set showNonAcademic to ${value} for ${username}`}};
    }
    return {success: false, data: {log: `Error setting showNonAcademic to ${value} for ${username}`}};
};

const setRegularizeClassGraphs = (username, value) => safe(_setRegularizeClassGraphs, lower(username), value);
const _setRegularizeClassGraphs = async (db, username, value) => {
    if (typeof value !== "boolean") {
        return {
            success: false,
            data: {message: "Something went wrong", log: `Invalid regularizeClassGraphs value: ${value}`}
        };
    }
    let res = await _users(db, username).updateOne({username: username}, {$set: {"appearance.regularizeClassGraphs": value}});
    if (res.matchedCount === 1) {
        return {
            success: true, data: {
                settings: {regularizeClassGraphs: value},
                log: `Set regularizeClassGraphs to ${value} for ${username}`
            }
        };
    }
    return {success: false, data: {log: `Error setting regularizeClassGraphs to ${value} for ${username}`}};
};

const setShowPlusMinusLines = (username, value) => safe(_setShowPlusMinusLines, lower(username), value);
const _setShowPlusMinusLines = async (db, username, value) => {
    if (typeof value !== "boolean") {
        return {
            success: false,
            data: {message: "Something went wrong", log: `Invalid showPlusMinusLines value: ${value}`}
        };
    }
    let res = await _users(db, username).updateOne({username: username}, {$set: {"appearance.showPlusMinusLines": value}});
    if (res.matchedCount === 1) {
        return {
            success: true,
            data: {settings: {showPlusMinusLines: value}, log: `Set showPlusMinusLines to ${value} for ${username}`}
        };
    }
    return {success: false, data: {log: `Error settings showPlusMinusLines to ${value} for ${username}`}};
};

const setReduceMotion = (username, value) => safe(_setReduceMotion, lower(username), value);
const _setReduceMotion = async (db, username, value) => {
    if (typeof value !== "boolean") {
        return {
            success: false, data: {message: "Something went wrong", log: `Invalid reduceMotion value: ${value}`}
        };
    }
    let res = await _users(db, username).updateOne({username: username}, {$set: {"appearance.reduceMotion": value}});
    if (res.matchedCount === 1) {
        return {
            success: true,
            data: {settings: {reduceMotion: value}, log: `Set reduceMotion to ${value} for ${username}`}
        };
    }
    return {success: false, data: {log: `Error settings reduceMotion to ${value} for ${username}`}};
};

const setWeightedGPA = (username, value) => safe(_setWeightedGPA, lower(username), value);
const _setWeightedGPA = async (db, username, value) => {
    if (typeof value === "string") {
        try {
            value = JSON.parse(value);
        } catch (e) {
        }
    }
    if (typeof value !== "boolean") {
        return {
            success: false,
            data: {message: "Something went wrong", log: `Invalid weightedGPA value: ${value}`}
        };
    }
    let res = await _users(db, username).updateOne({username: username}, {$set: {"appearance.weightedGPA": value}});
    if (res.matchedCount === 1) {
        return {success: true, data: {log: `Set weightedGPA to ${value} for ${username}`}};
    }
    return {success: false, data: {log: `Error setting weightedGPA to ${value} for ${username}`}};
};

const setTheme = (username, theme, darkModeStart, darkModeFinish, seasonalEffects, blurEffects) => safe(_setTheme, lower(username), lower(theme), darkModeStart, darkModeFinish, seasonalEffects, blurEffects);
const _setTheme = async (db, username, theme, darkModeStart, darkModeFinish, seasonalEffects, blurEffects) => {
    let res = await getUser(username, {appearance: 1});
    if (!res.success) {
        return res;
    }
    let user = res.data.value;
    let allowedValues = ["auto", "sun", "dark", "light", "system"];
    if (!allowedValues.includes(theme)) {
        return {success: false, data: {message: "Something went wrong", log: `Invalid theme: ${theme}`}};
    }
    if (typeof seasonalEffects !== "boolean") {
        seasonalEffects = user.appearance.seasonalEffects;
    }
    if (typeof blurEffects !== "boolean") {
        blurEffects = user.appearance.blurEffects;
    }
    if (typeof darkModeStart !== "number") {
        darkModeStart = user.appearance.darkModeStart;
    }
    if (typeof darkModeFinish !== "number") {
        darkModeFinish = user.appearance.darkModeFinish;
    }
    let data = {theme: theme};
    let setMap = {"appearance.theme": theme};
    let message = theme.replace(/^\w/, c => c.toUpperCase()) + " theme enabled!";
    if (theme === "auto") {
        darkModeStart = new Date(darkModeStart);
        darkModeFinish = new Date(darkModeFinish);
        message =
            "Dark theme enabled from " + darkModeStart.toLocaleTimeString() + " to " + darkModeFinish.toLocaleTimeString() + ".";
        darkModeStart = darkModeStart.getTime();
        darkModeFinish = darkModeFinish.getTime();
        data.darkModeStart = darkModeStart;
        data.darkModeFinish = darkModeFinish;
        setMap["appearance.darkModeStart"] = darkModeStart;
        setMap["appearance.darkModeFinish"] = darkModeFinish;
    }
    if (theme === "sun") {
        message = "Dark theme enabled from sunset to sunrise.";
    }
    if (seasonalEffects !== user.appearance.seasonalEffects) {
        data = {seasonalEffects: seasonalEffects};
        setMap = {"appearance.seasonalEffects": seasonalEffects};
        message = "Seasonal effects " + (seasonalEffects ? "enabled" : "disabled") + "!";
    }
    if (blurEffects !== user.appearance.blurEffects) {
        data = {blurEffects: blurEffects};
        setMap = {"appearance.blurEffects": blurEffects};
        message = "Blur effects " + (blurEffects ? "enabled" : "disabled") + "!";
    }
    let res2 = await _users(db, username).updateOne({username: username}, {
        $set: setMap
    });
    if (res2.matchedCount === 1) {
        return {
            success: true, data: {
                settings: data, message: message, log: `Updated appearance for ${username}`
            }
        };
    }
    return {
        success: false, data: {
            message: "Something went wrong",
            log: `Error updating appearance for ${username} with parameters theme=${theme}, darkModeStart=${darkModeStart}, darkModeFinish=${darkModeFinish}, seasonalEffects=${seasonalEffects}, blurEffects=${blurEffects}`
        }
    };
};

const setShowMaxGPA = (username, value) => safe(_setShowMaxGPA, lower(username), value);
const _setShowMaxGPA = async (db, username, value) => {
    if (typeof value === "string") {
        value = JSON.parse(value);
    }
    if (typeof value !== "boolean") {
        return {success: false, data: {message: "Something went wrong", log: `Invalid showMaxGPA value: ${value}`}};
    }
    let res = await _users(db, username).updateOne({username: username}, {$set: {"appearance.showMaxGPA": value}});
    if (res.matchedCount === 1) {
        return {success: true, data: {log: `Set showMaxGPA to ${value} for ${username}`}};
    }
    return {success: false, data: {log: `Error setting showMaxGPA to ${value} for ${username}`}};
};

const setColorPalette = (username, preset, shuffle) => safe(_setColorPalette, lower(username), lower(preset), shuffle);
const _setColorPalette = async (db, username, preset, shuffle) => {
    let user = (await getUser(username, {"appearance.colorPalette": 1, "appearance.shuffleColors": 1})).data.value;
    if (typeof shuffle === "string") {
        shuffle = JSON.parse(shuffle);
    }
    if (typeof shuffle !== "boolean") {
        shuffle = user.appearance.shuffleColors;
    }
    if (!(Object.values(ColorPresets).includes(preset))) {
        preset = user.appearance.colorPalette;
    }
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
        case "custom":
            if ((await getDonoAttributes(username)).data.value.plus) {
                let res = await _users(db, username).updateOne({username: username}, {
                    $set: {
                        "appearance.colorPalette": preset,
                    }
                });
                if (res.matchedCount === 1) {
                    return {success: true, data: {log: `Updated color palette for ${username}`}};
                }
            } else {
                return {success: false};
            }
            break;
    }
    let classColors = hues.map(h => chroma({h: h, s: saturation, l: light}).hex());
    if (shuffle) {
        shuffleArray(classColors);
    }
    let res = await _users(db, username).updateOne({username: username}, {
        $set: {
            "appearance.classColors": classColors,
            "appearance.colorPalette": preset,
            "appearance.shuffleColors": shuffle
        }
    });
    if (res.matchedCount === 1) {
        return {success: true, data: {log: `Updated color palette for ${username}`, colors: classColors}};
    }
    return {
        success: false,
        data: {log: `Error updating color palette for ${username} with parameters username=${username}, preset=${preset}, shuffle=${shuffle}`}
    };
};

const updateCustomColor = (username, index, color) => safe(_updateCustomColor, lower(username), index, lower(color));
const _updateCustomColor = async (db, username, index, color) => {
    if (!(await getDonoAttributes(username)).data.value.plus) {
        return {success: false};
    }
    if (typeof index === "string") {
        index = JSON.parse(index);
    }
    if (typeof index !== "number" || index < 0 || index > 17) {
        return {success: false, data: {log: `Invalid index: ${index}`}};
    }
    if (!color.startsWith("#")) color = `#${color}`;
    if (!chroma.valid(color)) {
        return {success: false, data: {log: `Invalid color: ${color}`}};
    }
    let res = await _users(db, username).findOneAndUpdate({username: username}, {$set: {[`appearance.classColors.${index}`]: color}}, {
        projection: {"appearance.classColors": 1},
        returnDocument: "after"
    });

    return {success: true, data: {log: `Updated color for ${username}`, colors: res.appearance.classColors}};
}

const setEnableLogging = (username, value) => safe(_setEnableLogging, lower(username), value);
const _setEnableLogging = async (db, username, value) => {
    if (typeof value !== "boolean") {
        return {
            success: false, data: {
                message: "Invalid value",
                log: `Invalid enableLogging value: ${value}`,
                settings: {enableLogging: value}
            }
        };
    }
    let res = await _users(db, username).updateOne({username: username}, {$set: {enableLogging: value}});
    if (res.matchedCount === 1) {
        return {
            success: true,
            data: {message: "Logging " + (value ? "enabled" : "disabled") + "!", settings: {enableLogging: value}}
        };
    }
    return {success: false, data: {message: "Invalid user"}};
};

const setAnimateWhenUnfocused = (username, value) => safe(_setAnimateWhenUnfocused, lower(username), value);
const _setAnimateWhenUnfocused = async (db, username, value) => {
    if (typeof value !== "boolean") {
        return {
            success: false, data: {
                message: "Invalid value",
                log: `Invalid animateWhenUnfocused value: ${value}`,
                settings: {animateWhenUnfocused: value}
            }
        };
    }
    let res = await _users(db, username).updateOne({username: username}, {$set: {"appearance.animateWhenUnfocused": value}});
    if (res.matchedCount === 1) {
        return {
            success: true, data: {
                message: "Animation " + (value ? "enabled" : "disabled") + " when window is not in focus!",
                settings: {animateWhenUnfocused: value},
                refresh: true
            }
        };
    }
    return {success: false, data: {message: "Invalid user"}};
};

const setShowFps = (username, value) => safe(_setShowFps, lower(username), value);
const _setShowFps = async (db, username, value) => {
    if (typeof value !== "boolean") {
        return {
            success: false, data: {
                message: "Invalid value", log: `Invalid showFps value: ${value}`, settings: {showFps: value}
            }
        };
    }
    let res = await _users(db, username).updateOne({username: username}, {$set: {"appearance.showFps": value}});
    if (res.matchedCount === 1) {
        return {
            success: true, data: {
                message: "Refresh Rate Display " + (value ? "enabled" : "disabled") + "!",
                settings: {showFps: value},
                refresh: true
            }
        };
    }
    return {success: false, data: {message: "Invalid user"}};
};

const setShowUpdatePopup = (username, value) => safe(_setShowUpdatePopup, lower(username), value);
const _setShowUpdatePopup = async (db, username, value) => {
    if (typeof value !== "boolean") {
        return {
            success: false, data: {
                message: "Invalid value",
                log: `Invalid showUpdatePopup value: ${value}`,
                settings: {showUpdatePopup: value}
            }
        };
    }
    let res = await _users(db, username).updateOne({username: username}, {$set: {"alerts.notificationSettings.showUpdatePopup": value}});
    if (res.matchedCount === 1) {
        return {
            success: true, data: {
                settings: {showUpdatePopup: value}
            }
        };
    }
};

const createNotification = (username, id, type, title, message, dismissible = true, dismissed = false, pinnable = false, pinned = false, important = false, timestamp) => safe(_createNotification, lower(username), id, type, title, message, dismissible, dismissed, pinnable, pinned, important, timestamp);

const _createNotification = async (db, username, id, type, title, message, dismissible, dismissed, pinnable, pinned, important, timestamp) => {
    let notification = {
        id: id,
        type: type,
        title: title,
        message: message,
        dismissible: dismissible,
        dismissed: dismissed,
        important: important,
        pinnable: pinnable,
        pinned: pinned,
        createdDate: timestamp
    };
    let res = await getUser(username, {
        "alerts.notifications.id": 1
    });
    if (!res.success) {
        return res;
    }
    let user = res.data.value;
    let trimmed = user.alerts.notifications;
    let index = trimmed.findIndex(i => i.id === id);
    if (index !== -1) {
        return {success: false, data: {message: "Invalid ID", log: `Invalid createNotification id=${id}`}};
    }
    res = await _users(db, username).updateOne({
        username: username
    }, {
        $push: {
            "alerts.notifications": notification
        }
    });

    if (res.matchedCount === 1) {
        socketManager.emitToRoom(username, "notification-new", notification);
        return {success: true, data: {value: notification}};
    }

    return {success: false};
};

const updateNotification = (username, id, update) => safe(_updateNotification, lower(username), id, update);
const _updateNotification = async (db, username, id, update) => {
    if (typeof id !== "string" || Object.keys(update).filter(k => !(["pinned", "dismissed"]).includes(k)).length) {
        return {
            success: false,
            data: {
                message: "Invalid value",
                log: `Invalid updateNotification parameters id=${id}, update=${update}`
            }
        };
    }
    let res = await getUser(username, {
        "alerts.notifications.id": 1, "alerts.notifications.pinned": 1, "alerts.notifications.dismissed": 1
    });
    if (!res.success) {
        return res;
    }
    let user = res.data.value;
    let trimmed = user.alerts.notifications;
    let index = trimmed.findIndex(i => i.id === id);
    if (index === -1) {
        return {success: false, data: {message: "Invalid ID", log: `Invalid updateNotification id=${id}`}};
    }

    let realUpdate = {};
    let set = {};
    if ("pinned" in update && update.pinned !== trimmed[index].pinned) {
        set[`alerts.notifications.${index}.pinned`] = update.pinned;
        realUpdate.pinned = update.pinned;
    }
    if ("dismissed" in update && update.dismissed !== trimmed[index].dismissed) {
        set[`alerts.notifications.${index}.dismissed`] = update.dismissed;
        realUpdate.dismissed = update.dismissed;
    }

    res = await _users(db, username).updateOne({username: username}, {$set: set});
    if (res.matchedCount === 1) {
        return {
            success: true, data: {
                id: id, update: realUpdate
            }
        };
    }
};

const deleteNotification = (username, id) => safe(_deleteNotification, lower(username), id);
const _deleteNotification = async (db, username, id) => {
    let res = await _users(db, username).updateOne({username: username}, {$pull: {"alerts.notifications": {id: id}}});
    if (res.matchedCount === 1) {
        socketManager.emitToRoom(username, "notification-delete", {id: id});
        return {
            success: true, data: {
                id: id
            }
        };
    }
    return {success: false};
};

const changePassword = (username, oldPassword, newPassword) => safe(_changePassword, lower(username), oldPassword, newPassword);
const _changePassword = async (db, username, oldPassword, newPassword) => {
    return new Promise(async resolve => {
        let res = await login(username, oldPassword);
        if (!res.success) {
            return resolve(res);
        }
        let message = validatePassword(newPassword);
        if (message) {
            return resolve({success: false, data: {message: message}});
        }
        let user = res.data.value;
        let schoolPassword;
        if ("schoolPassword" in user) {
            let res2 = await decryptAndGetSchoolPassword(username, oldPassword);
            if (!res2.success) {
                return resolve(res2);
            }
            schoolPassword = res2.data.value;
        }
        bcrypt.hash(newPassword, ROUNDS_TO_GENERATE_SALT, async (err, hash) => {
            if (err) {
                return resolve({success: false, data: {log: err, message: "Something went wrong"}});
            }
            let res3 = await _users(db, username).updateOne({username: username}, {$set: {password: hash}});
            if (res3.matchedCount === 0) {
                return resolve({
                    success: false,
                    data: {log: `Error updating password`, message: "Something went wrong"}
                });
            }
            if (schoolPassword) {
                let res4 = await encryptAndStoreSchoolPassword(username, schoolPassword, newPassword);
                if (!res4.success) {
                    return resolve(res4);
                }
            }
            return resolve({
                success: true,
                data: {log: `Changed password for ${username}`, message: "Password Updated"}
            });
        });
    });
};

const changeSchoolEmail = (username, schoolUsername) => safe(_changeSchoolEmail, lower(username), lower(schoolUsername));
const _changeSchoolEmail = async (db, username, schoolUsername) => {
    let res = await getUser(username, {school: 1, schoolUsername: 1});
    if (!res.success) {
        return res;
    }
    let user = res.data.value;
    if (!validateEmail(schoolUsername, user.school)) {
        return {success: false, data: {message: "This must be your school email."}};
    }
    if ((user.schoolUsername !== schoolUsername && await userExists({schoolUsername: schoolUsername})) ||
        (await userArchived({schoolUsername: schoolUsername})).success) {
        return {success: false, data: {message: "This email is already associated with an account."}};
    }
    let {firstName, lastName, graduationYear} = getPersonalInfo(schoolUsername, user.school);
    let res2 = await _users(db, username).updateOne({username: username}, {
        $set: {
            schoolUsername: schoolUsername,
            personalInfo: {firstName: firstName, lastName: lastName, graduationYear: graduationYear}
        }
    });
    if (res2.matchedCount === 0) {
        return {success: false, data: {log: `Error updating school email`, message: "Something went wrong"}};
    }
    await _usernames(db).updateOne({username: username}, {$set: {schoolUsername: schoolUsername}});
    return {success: true, data: {log: `Changed school username for ${username}`, message: "School Email Updated"}};
};

const disableGradeSync = (username) => safe(_disableGradeSync, lower(username));
const _disableGradeSync = async (db, username) => {
    let res = await _users(db, username).updateOne({username: username}, {$unset: {schoolPassword: ""}});
    if (res.matchedCount === 1) {
        return {success: true, data: {log: `Disabled GradeSync for ${username}`}};
    }
    return {success: false, data: {log: `Error disabling GradeSync for ${username}`}};
};

const makeAdmin = (username) => safe(_makeAdmin, lower(username));
const _makeAdmin = async (db, username) => {
    let res = await _users(db, username).updateOne({username: username}, {$set: {isAdmin: true}});
    if (res.matchedCount === 1) {
        return {success: true, data: {log: `Made ${username} admin`, message: "Made user admin"}};
    }
    return {success: false, data: {log: `Error making ${username} admin`, message: "Something went wrong"}};
};

const removeAdmin = (username, requester) => safe(_removeAdmin, lower(username), lower(requester));
const _removeAdmin = async (db, username, requester) => {
    if (username === requester) {
        return {
            success: false,
            data: {log: `Cannot remove own admin for ${username}`, message: "Cannot remove own admin"}
        };
    }
    let res = await _users(db, username).updateOne({username: username}, {$set: {isAdmin: false}});
    if (res) {
        return {success: true, data: {log: `Made ${username} not admin`, message: "Made user not admin"}};
    }
    return {success: false, data: {log: `Error making ${username} not admin`, message: "Something went wrong"}};
};

const logError = (username, errorString) => safe(_logError, lower(username), errorString);
const _logError = async (db, username, errorString) => {
    let exists = await _errors().findOne({username: username, error: errorString}, {errorCode: 1});
    let errorCode;
    if (exists) {
        errorCode = exists.errorCode;
    } else {
        do {
            errorCode = Math.floor(Math.random() * 900) + 100;
            exists = await _errors().findOne({username: username, errorCode: errorCode});
        } while (exists);
        await _errors().insertOne({username: username, errorCode: errorCode, error: errorString});
        await _users(db, username).updateOne({username: username}, {$push: {errors: errorCode}});
    }
    return {success: true, data: {value: errorCode}};
};

// This shouldn't be in safe() to avoid infinite loop
const logGeneralError = (errorString) => _logGeneralError(errorString);
const _logGeneralError = async (db, errorString) => {
    let exists = await _generalErrors().findOne({error: errorString}, {errorCode: 1});
    let errorCode;
    if (exists) {
        errorCode = exists.errorCode;
    } else {
        do {
            errorCode = Math.floor(Math.random() * 900000) + 100000;
            exists = await _generalErrors().findOne({errorCode: errorCode});
        } while (exists);
        await _generalErrors().insertOne({errorCode: errorCode, error: errorString});
    }
    return {success: true, data: {value: errorCode}};
};

const updateGradesFromUser = (username, data) => safe(_updateGradesFromUser, lower(username), data);
const _updateGradesFromUser = async (db, username, data) => {
    let res = await getUser(username, {"alerts.lastUpdated": {$slice: -1}, betaFeatures: 1, grades: 1, donoData: 1});
    if (!res.success) {
        return res;
    }
    let user = res.data.value;

    if (!user.betaFeatures.localScraping) {
        return {success: false, data: {message: 'Local scraping is not enabled'}};
    }

    let lastUpdated = user.alerts.lastUpdated;
    if (lastUpdated.length) {
        if (!nextSyncAllowed(lastUpdated[0].timestamp, user.donoData)) {
            await setSyncStatus(username, SyncStatus.LIMIT);
            socketManager.emitToRoom(username, "sync-limit", {message: "You need to wait before syncing again."})
            return {success: false};
        }
    }

    let {term: oldTerm, semester: oldSemester} = __getMostRecentTermData(user).data.value;

    if (!data || typeof data !== "object") {
        return {success: false, data: {message: 'Invalid data', log: 'Invalid data'}};
    }

    let {term, semester, grades: classes} = data;
    if (typeof term !== "string" || typeof semester !== "string" || !Array.isArray(classes)) {
        return {success: false, data: {message: 'Invalid data', log: 'Invalid data entries'}};
    }

    if (!/^\d{2}-\d{2}$/.test(term) || !/^S[0-2]$/.test(semester)) {
        return {success: false, data: {message: 'Invalid term or semester', log: 'Invalid term or semester'}};
    }

    let [startYear, endYear] = term.split('-').map(x => parseInt(x, 10));
    if ((endYear === 0 ? 100 : endYear) - startYear !== 1) {
        return {success: false, data: {message: 'Invalid term', log: 'Malformed term'}};
    }

    if (classes.length > 20) {
        return {success: false, data: {message: 'Too many classes', log: 'Too many classes'}};
    }

    // We're not use the data directly from client because we don't trust it
    let newGrades = [];
    for (let class_ of classes) {
        if (typeof class_ !== 'object') {
            return {success: false, data: {message: 'Invalid classes', log: JSON.stringify(class_)}};
        }

        let {class_name, teacher_name, overall_percent, overall_letter, student_id, section_id, ps_locked, grades} = class_;
        if (typeof class_name !== 'string' || typeof teacher_name !== 'string') {
            return {success: false, data: {message: 'Invalid classes', log: 'Invalid class/teacher name'}};
        }
        if (typeof overall_percent !== 'number' && overall_percent !== false) {
            return {success: false, data: {message: 'Invalid classes', log: 'Invalid overall_percent'}};
        }
        if (overall_letter !== false  && (typeof overall_letter !== 'string' || !/^[A-DF][+\-]?$/.test(overall_letter))) {
            return {success: false, data: {message: 'Invalid classes', log: 'Invalid overall_letter'}};
        }
        if (typeof student_id !== 'string' || typeof section_id !== 'string') {
            return {success: false, data: {message: 'Invalid classes', log: 'Invalid student/section id'}};
        }
        if (typeof ps_locked !== 'boolean') {
            return {success: false, data: {message: 'Invalid classes', log: 'Invalid ps_locked'}};
        }
        if (!Array.isArray(grades)) {
            return {success: false, data: {message: 'Invalid classes', log: 'Invalid grades'}};
        }

        if (grades.length > 200) {
            return {success: false, data: {message: 'Too many grades', log: 'Too many grades'}};
        }

        let cleanGrades = [];

        for (let grade of grades) {
            let {date, category, assignment_name, exclude, points_possible, points_gotten, grade_percent, psaid} = grade;

            // Make sure date is MM/DD/YYYY
            if (typeof date !== 'string') {
                return {success: false, data: {message: 'Invalid grades', log: 'Invalid date'}};
            }
            if (!checkValidMMDDYYYY(date)) {
                return {success: false, data: {message: 'Invalid grades', log: `Invalid date ${date}`}};
            }

            if (typeof category !== 'string' || typeof assignment_name !== 'string' || typeof exclude !== 'boolean') {
                return {success: false, data: {message: 'Invalid grades', log: 'Invalid category/assignment name/exclude'}};
            }

            if (points_possible !== false && typeof points_possible !== 'number') {
                return {success: false, data: {message: 'Invalid grades', log: 'Invalid points_possible'}};
            }
            if (points_gotten !== false && typeof points_possible !== 'number') {
                return {success: false, data: {message: 'Invalid grades', log: 'Invalid points_gotten'}};
            }
            if (points_gotten !== false && points_possible === false) {
                return {success: false, data: {message: 'Invalid grades', log: 'Points possible cannot be empty if points gotten is not empty'}}
            }

            if (grade_percent !== false && typeof grade_percent !== 'number') {
                return {success: false, data: {message: 'Invalid grades', log: 'Invalid grade_percent'}};
            }
            if (typeof psaid !== 'number') {
                return {success: false, data: {message: 'Invalid grades', log: 'Invalid psaid'}};
            }

            cleanGrades.push({
                assignment_name: assignment_name,
                date: date,
                category: category,
                grade_percent: grade_percent,
                points_gotten: points_gotten,
                points_possible: points_possible,
                exclude: exclude,
                psaid: psaid,
            });
        }

        newGrades.push({
            class_name: class_name,
            teacher_name: teacher_name,
            overall_percent: overall_percent,
            overall_letter: overall_letter,
            student_id: student_id,
            section_id: section_id,
            ps_locked: ps_locked,
            local_scrape: true,
            grades: cleanGrades,
        });
    }

    if (!(term in user.grades)) {
        await _users(db, username).updateOne({username: username}, {$set: {[`grades.${term}`]: {}}});
    }
    let newClasses = newGrades.map(c => c.class_name);
    let oldPSAIDs = [];
    let oldGrades;
    if (term in user.grades && semester in user.grades[term]) {
        oldGrades = user.grades[term][semester];
        oldGrades = oldGrades.filter(c => newClasses.includes(c.class_name));
        oldPSAIDs = oldGrades.map(c => c.grades.map(g => g.psaid)).filter(id => !!id);
    }
    let newPSAIDs = newGrades.map(c => c.grades.map(g => g.psaid));

    oldPSAIDs.push(...Array(newPSAIDs.length - oldPSAIDs.length).fill([]));

    let added = Object.fromEntries(newPSAIDs.map((classPSAIDs, index) => [
        newGrades[index].class_name, newPSAIDs[index]
    ]).filter(data => data[1].length));
    let modified = {};
    let removed = {};
    let overall = {};

    if (oldGrades) {
        let newToOldIndex = newGrades.map(n => oldGrades.findIndex(o => o.class_name === n.class_name));
        let oldToNewIndex = oldGrades.map(o => newGrades.findIndex(n => n.class_name === o.class_name));
        added = Object.fromEntries(newPSAIDs.map((classPSAIDs, index) => [
            newGrades[index].class_name,
            newPSAIDs[index].filter(psaid => newToOldIndex[index] === -1 ? false : !oldPSAIDs[newToOldIndex[index]].includes(psaid))
        ]).filter(data => data[1].length));
        modified = Object.fromEntries(oldGrades.map((classData, index) => [
            classData.class_name,
            classData.grades.filter(assignmentData => oldToNewIndex[index] === -1 ? false : newPSAIDs[oldToNewIndex[index]].includes(assignmentData['psaid']) && oldToNewIndex[index] !== -1 && !_.isEqual(assignmentData, newGrades[oldToNewIndex[index]].grades.find(assignment => assignment['psaid'] === assignmentData['psaid'])))
        ]).filter(data => data[1].length));
        removed = Object.fromEntries(oldGrades.map((classData, index) => [
            classData.class_name,
            classData.grades.filter(assignmentData => assignmentData['psaid'] && oldToNewIndex[index] === -1 ? false : !newPSAIDs[oldToNewIndex[index]].includes(assignmentData['psaid']))
        ]).filter(data => data[1].length));
        overall = Object.fromEntries(oldGrades.map((classData, index) => {
            if (oldToNewIndex[index] === -1) {
                return [[], []];
            }
            let clone = Object.assign({}, classData);
            delete clone.grades;
            delete clone.class_name;
            let newClone = Object.assign({}, newGrades[oldToNewIndex[index]]);
            delete newClone.grades;
            delete newClone.class_name;
            clone.ps_locked = newClone.ps_locked;
            return [
                classData.class_name,
                Object.fromEntries(Object.entries(clone).filter(([k, v]) => newClone[k] !== v || k === 'ps_locked'))
            ];
        }).filter(data => Object.keys(data[1]).length));
    }

    // Make sure any removed items don't get to have edits
    if (Object.keys(removed).length > 0) {
        let editedAssignments = (await getUser(username, {[`editedAssignments.${term}.${semester}`]: 1})).data.value.editedAssignments[term][semester];
        for (let class_name in removed) {
            let assignments = removed[class_name];
            for (let assignment of assignments) {
                delete editedAssignments.find(e => e.className === class_name).data[assignment.psaid];
            }
        }
        await _users(db, username).updateOne({username: username}, {$set: {[`editedAssignments.${term}.${semester}`]: editedAssignments}});
    }

    let ps_locked = newGrades.filter(o => o.ps_locked === true).length !== 0;
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

    await _users(db, username).updateOne({username: username}, {$set: {[`grades.${term}.${semester}`]: newGrades}});

    await initAddedAssignments(username);
    await initAddedWeights(username);
    await initWeights(username);
    await initEditedAssignments(username);
    await updateClassesForUser(username, term, semester);

    let time = Date.now();
    let updateHistory = false;
    if (term !== oldTerm || semester !== oldSemester) {
        await resetSortData(username);
        if (!ps_locked) {
            updateHistory = true;
        }
    }

    await _users(db, username).updateOne({username: username}, {
        $set: {updatedInBackground: SyncStatus.ALREADY_DONE},
        $push: {"alerts.lastUpdated": {timestamp: time, changeData: changeData, ps_locked: ps_locked}}
    });

    if (updateHistory) {
        await setSyncStatus(username, SyncStatus.HISTORY);
    }

    let _res = await getUser(username, {
        [`grades.${term}.${semester}`]: 1,
        [`weights.${term}.${semester}`]: 1,
        "alerts.lastUpdated": {$slice: -1},
        "appearance.showNonAcademic": 1
    });
    let _user = _res.data.value;

    socketManager.emitToRoom(username, "sync-success", {
        gradeSyncEnabled: false,
        message: data.message,
        grades: JSON.stringify(_user.grades[term][semester]),
        weights: JSON.stringify(_user.weights[term][semester]),
        updateData: JSON.stringify(_user.alerts.lastUpdated.slice(-1)[0])
    });

    return {success: true};
}

const updateGrades = (username, schoolPassword, userPassword, gradeSync) => safe(_updateGrades, lower(username), schoolPassword, userPassword, gradeSync);
const _updateGrades = async (db, username, schoolPassword, userPassword, gradeSync) => {
    let res = await getUser(username, {"alerts.lastUpdated": {$slice: -1}, betaFeatures: 1, grades: 1, school: 1, updatedGradeHistory: 1, schoolUsername: 1, donoData: 1});
    if (!res.success) {
        return res;
    }
    let user = res.data.value;

    if (user.betaFeatures.localScraping) {
        socketManager.emitToRoom(username, "sync-local", {message: "Remote scraping is disabled if local scraping is enabled."});
        return {success: false};  // Disable remote scraping if local scraping is enabled
    }

    let lastUpdated = user.alerts.lastUpdated;
    if (lastUpdated.length) {
        if (!nextSyncAllowed(lastUpdated[0].timestamp, user.donoData)) {
            await setSyncStatus(username, SyncStatus.LIMIT);
            socketManager.emitToRoom(username, "sync-limit", {message: "You need to wait before syncing again."})
            return {success: false}
        }
    }

    let {term: oldTerm, semester: oldSemester} = __getMostRecentTermData(user).data.value;
    let termDataIfLocked = {term: oldTerm, semester: oldSemester};
    let dataIfLocked = [];
    if (oldTerm && oldSemester) {
        dataIfLocked = user.grades[oldTerm][oldSemester].map(class_data => _.omit(class_data, ["grades"]));
    } else {
        termDataIfLocked = {};
    }

    const processor = async (data) => {
        if (data.progress !== undefined) {
            let _data = {progress: data.progress, message: data.message};
            await setSyncStatus(username, SyncStatus.UPDATING);
            socketManager.emitToRoom(username, "sync-progress", _data);
        } else if (!data.success) {
            if (data.message === `Your ${user.school === Schools.BISV ? "Schoology" : "PowerSchool"} account is no longer active.`) {
                await setSyncStatus(username, SyncStatus.ACCOUNT_INACTIVE);
            } else if (data.message === "No class data.") {
                await setSyncStatus(username, SyncStatus.NO_DATA);
                if (gradeSync) {
                    let encryptResp = await encryptAndStoreSchoolPassword(username, schoolPassword, userPassword);
                    if (!encryptResp.success) {
                        await setSyncStatus(username, SyncStatus.FAILED);
                        socketManager.emitToRoom(username, "sync-fail", encryptResp.data.message);
                        return;
                    }
                }
                data.message =
                    `No ${user.school === Schools.BISV ? "Schoology" : "PowerSchool"} grades found for this term.`;
                // Check if we were previously locked
                let _user = (await getUser(username, {'alerts.lastUpdated': {$slice: -1}})).data.value;
                if (_user.alerts.lastUpdated.length && 'ps_locked' in _user.alerts.lastUpdated[0]) {
                    if (_user.alerts.lastUpdated[0].ps_locked) {
                        await updateGradeHistory(username, schoolPassword);
                    }
                }
            } else if (data.message === `Could not connect to ${user.school === Schools.BISV ? "Schoology" : "PowerSchool"}.`) {
                await setSyncStatus(username, SyncStatus.FAILED);
            } else if (data.message === "Something went wrong.") {
                await setSyncStatus(username, SyncStatus.FAILED);
            } else if (data.message.startsWith("Error: ")) {
                let code = (await logError(username, data.message.substring(7))).data.value;
                await setSyncStatus(username, `${SyncStatus.FAILED}-${code}`);
                socketManager.emitToRoom(username, "sync-fail", {
                    gradeSyncEnabled: gradeSync, message: `Sync Error (${code}). Contact Support.`
                });
                return;
            } else {
                await setSyncStatus(username, SyncStatus.LOGIN_FAILED);
            }
            socketManager.emitToRoom(username, "sync-fail", {
                gradeSyncEnabled: data.message === "No class data." && gradeSync, message: data.message
            });
        } else {
            let newTerm = Object.keys(data["new_grades"])[0];
            let newSemester = Object.keys(data["new_grades"][newTerm]);
            newSemester = newSemester[newSemester.length - 1]; // this should prob be another variable
            let newGrades = data["new_grades"][newTerm][newSemester];
            let newClasses = newGrades.map(c => c.class_name);
            let oldPSAIDs = [];
            let oldGrades;
            if (newTerm in user.grades && newSemester in user.grades[newTerm]) {
                oldGrades = user.grades[newTerm][newSemester];
                // Filter out classes that we don't have anymore
                // IDK how this would happen, but it was in the code
                oldGrades = oldGrades.filter(c => newClasses.includes(c.class_name));

                // filtering id => !!id removes undefined psaids (before we scraped them)
                // Idk if this is relevant but I'm keeping it for now TODO
                oldPSAIDs = oldGrades.map(c => c.grades.map(g => g["psaid"])).filter(id => !!id);
            }
            let newPSAIDs = newGrades.map(c => c.grades.map(g => g["psaid"]));

            // Make the two arrays the same length
            oldPSAIDs.push(...Array(newPSAIDs.length - oldPSAIDs.length).fill([]));

            // Calculate changes
            let added = Object.fromEntries(newPSAIDs.map((classPSAIDs, index) => [
                newGrades[index].class_name, newPSAIDs[index]
            ]).filter(data => data[1].length));
            let modified = {};
            let removed = {};
            let overall = {};

            if (oldGrades) {
                let newToOldIndex = newGrades.map(n => oldGrades.findIndex(o => o.class_name === n.class_name));
                let oldToNewIndex = oldGrades.map(o => newGrades.findIndex(n => n.class_name === o.class_name));
                added = Object.fromEntries(newPSAIDs.map((classPSAIDs, index) => [
                    newGrades[index].class_name,
                    newPSAIDs[index].filter(psaid => newToOldIndex[index] === -1 ? false : !oldPSAIDs[newToOldIndex[index]].includes(psaid))
                ]).filter(data => data[1].length));
                modified = Object.fromEntries(oldGrades.map((classData, index) => [
                    classData.class_name,
                    classData.grades.filter(assignmentData => oldToNewIndex[index] === -1 ? false : newPSAIDs[oldToNewIndex[index]].includes(assignmentData["psaid"]) && oldToNewIndex[index] !== -1 && !_.isEqual(assignmentData, newGrades[oldToNewIndex[index]].grades.find(assignment => assignment["psaid"] === assignmentData["psaid"])))
                ]).filter(data => data[1].length));
                removed = Object.fromEntries(oldGrades.map((classData, index) => [
                    classData.class_name,
                    classData.grades.filter(assignmentData => assignmentData["psaid"] && oldToNewIndex[index] === -1 ? false : !newPSAIDs[oldToNewIndex[index]].includes(assignmentData["psaid"]))
                ]).filter(data => data[1].length));
                overall = Object.fromEntries(oldGrades.map((classData, index) => {
                    if (oldToNewIndex[index] === -1) {
                        return [[], []];
                    }
                    let clone = Object.assign({}, classData);
                    delete clone.grades;
                    delete clone.class_name;
                    let newClone = Object.assign({}, newGrades[oldToNewIndex[index]]);
                    delete newClone.grades;
                    delete newClone.class_name;
                    clone.ps_locked = newClone.ps_locked;
                    return [
                        classData.class_name,
                        Object.fromEntries(Object.entries(clone).filter(([k, v]) => newClone[k] !== v || k === "ps_locked"))
                    ];
                }).filter(data => Object.keys(data[1]).length));
            }

            if (!(newTerm in user.grades)) {
                await _users(db, username).updateOne({username: username}, {$set: {[`grades.${newTerm}`]: {}}});
            }

            // Make sure any removed items don't get to have edits
            if (Object.keys(removed).length > 0) {
                let editedAssignments = (await getUser(username, {[`editedAssignments.${newTerm}.${newSemester}`]: 1})).data.value.editedAssignments[newTerm][newSemester];
                for (let class_name in removed) {
                    let assignments = removed[class_name];
                    for (let assignment of assignments) {
                        delete editedAssignments.find(e => e.className === class_name).data[assignment.psaid];
                    }
                }
                await _users(db, username).updateOne({username: username}, {$set: {[`editedAssignments.${newTerm}.${newSemester}`]: editedAssignments}});
            }

            let ps_locked = newGrades.filter(o => o.ps_locked === true).length !== 0;
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
            if (user.school === Schools.BISV) {
                newGrades = data["new_grades"][newTerm];
                await _users(db, username).updateOne({username: username}, {$set: {[`grades.${newTerm}`]: newGrades}});
                let newWeights = data["new_weights"][newTerm];
                await _users(db, username).updateOne({username: username}, {$set: {[`weights.${newTerm}`]: newWeights}});
            } else {
                await _users(db, username).updateOne({username: username}, {$set: {[`grades.${newTerm}.${newSemester}`]: newGrades}});
            }
            await initAddedAssignments(username);
            await initAddedWeights(username);
            await initWeights(username);
            await initEditedAssignments(username);
            await updateClassesForUser(username, newTerm, newSemester);

            let time = Date.now();
            let updateHistory = false;
            if (newTerm !== oldTerm || newSemester !== oldSemester) {
                await resetSortData(username);
                if (!ps_locked) {
                    updateHistory = true;
                }
            }

            await _users(db, username).updateOne({username: username}, {
                $set: {updatedInBackground: SyncStatus.ALREADY_DONE},
                $push: {"alerts.lastUpdated": {timestamp: time, changeData: changeData, ps_locked: ps_locked}}
            });

            if (user.school !== Schools.BISV && updateHistory) {
                await setSyncStatus(username, SyncStatus.HISTORY);
                await updateGradeHistory(username, schoolPassword);
            }

            await setSyncStatus(username, SyncStatus.COMPLETE);
            socketManager.emitToRoom(username, "sync-success", {message: "Updated grades!"});

            let _res = await getUser(username, {
                [`grades.${newTerm}.${newSemester}`]: 1,
                [`weights.${newTerm}.${newSemester}`]: 1,
                "alerts.lastUpdated": {$slice: -1},
                "appearance.showNonAcademic": 1
            });
            let _user = _res.data.value;

            if (gradeSync) {
                let encryptResp = await encryptAndStoreSchoolPassword(username, schoolPassword, userPassword);
                if (!encryptResp.success) {
                    socketManager.emitToRoom(username, "sync-fail-general", {gradeSyncEnabled: false});
                    return {success: false};
                }
            }

            socketManager.emitToRoom(username, "sync-success", {
                gradeSyncEnabled: gradeSync,
                message: data.message,
                grades: JSON.stringify(_user.grades[newTerm][newSemester]),
                weights: JSON.stringify(_user.weights[newTerm][newSemester]),
                updateData: JSON.stringify(_user.alerts.lastUpdated.slice(-1)[0])
            });
        }
    };

    let ignoreQueue = (await getDonoAttributes(username)).data.value.plus;
    scraper.loginAndScrapeGrades(processor, user.school, user.schoolUsername, schoolPassword, dataIfLocked, termDataIfLocked, 'false', ignoreQueue);

    return {success: true};
};

const updateGradeHistory = (username, schoolPassword) => safe(_updateGradeHistory, lower(username), schoolPassword);
const _updateGradeHistory = async (db, username, schoolPassword) => {
    let res = await getUser(username, {grades: 1, weights: 1, school: 1, schoolUsername: 1});
    if (!res.success) {
        return res;
    }
    let user = res.data.value;
    const processor = async (data) => {
        let changeData = {};
        if ("success" in data) {
            if (data.success) {
                let currentYears = Object.keys(user.grades);
                let newYears = Object.keys(data["new_grades"]);
                let school = user.school;
                switch (school) {
                    case Schools.BISV:
                        let newWeights = data["new_weights"];
                        let term = Object.keys(newWeights)[0];
                        await _users(db, username).updateOne({username: username}, {$set: {[`weights.${term}._`]: newWeights[term]._}});
                        break;
                    case Schools.BELL:
                    case Schools.NDSJ:
                        let currentWeights = user.weights;
                        for (let i = 0; i < newYears.length; i++) {
                            if (!(newYears[i] in currentWeights)) {
                                currentWeights[newYears[i]] = {};
                                let newSemesters = Object.keys(data["new_grades"][newYears[i]]);
                                for (let j = 0; j < newSemesters.length; j++) {
                                    currentWeights[newYears[i]][newSemesters[j]] = [];
                                }
                            } else {
                                let currentSemesters = Object.keys(currentWeights[newYears[i]]);
                                let newSemesters = Object.keys(data["new_grades"][newYears[i]]);
                                for (let j = 0; j < newSemesters.length; j++) {
                                    if (!currentSemesters.includes(newSemesters[j])) {
                                        currentWeights[newYears[i]][newSemesters[j]] = [];
                                    }
                                }
                            }
                            if (!currentYears.includes(newYears[i])) {
                                await _users(db, username).updateOne({username: username}, {$set: {[`grades.${newYears[i]}`]: data["new_grades"][newYears[i]]}});
                            } else {
                                let currentSemesters = Object.keys(user.grades[newYears[i]]);
                                let newSemesters = Object.keys(data["new_grades"][newYears[i]]);
                                for (let j = 0; j < newSemesters.length; j++) {
                                    if (!currentSemesters.includes(newSemesters[j])) {
                                        await _users(db, username).updateOne({username: username}, {$set: {[`grades.${newYears[i]}.${newSemesters[j]}`]: data["new_grades"][newYears[i]][newSemesters[j]]}});
                                    } else {
                                        let newClasses = data["new_grades"][newYears[i]][newSemesters[j]];
                                        if (newClasses.length === 0) {
                                            continue;
                                        }
                                        let oldClasses = user.grades[newYears[i]][newSemesters[j]];
                                        for (let k = 0; k < newClasses.length; k++) {
                                            let className = newClasses[k].class_name;
                                            let oldClass = oldClasses?.find(c => c.class_name === className);
                                            if (oldClass && !newClasses[k].grades.length) {
                                                newClasses[k].grades = oldClass.grades;
                                            }
                                            if (oldClass && oldClass.teacher_name && !newClasses[k].teacher_name) {
                                                newClasses[k].teacher_name = oldClass.teacher_name;
                                            }
                                        }
                                        await _users(db, username).updateOne({username: username}, {$set: {[`grades.${newYears[i]}.${newSemesters[j]}`]: newClasses}});

                                        let overall = {};
                                        if (oldClasses) {
                                            overall = Object.fromEntries(oldClasses.map((classData) => {
                                                let clone = Object.assign({}, classData);
                                                delete clone.grades;
                                                delete clone.class_name;
                                                delete clone.ps_locked;
                                                delete clone["student_id"];
                                                delete clone["section_id"];
                                                delete clone.teacher_name;
                                                let newClone = Object.assign({}, newClasses.find(g => g.class_name === classData.class_name));
                                                delete newClone.grades;
                                                delete newClone.class_name;
                                                delete newClone.ps_locked;
                                                delete newClone.teacher_name;
                                                return [
                                                    classData.class_name,
                                                    Object.fromEntries(Object.entries(clone).filter(([k, v]) => newClone[k] !== v))
                                                ];
                                            }).filter(data => Object.keys(data[1]).length));
                                        }
                                        changeData = {
                                            added: {}, modified: {}, removed: {}, overall: overall
                                        };
                                    }
                                }
                            }
                        }
                        await initAddedWeights(username);
                        await initWeights(username);
                }
                let time = Date.now();
                await _users(db, username).updateOne({username: username}, {
                    $push: {
                        updatedGradeHistory: time,
                        "alerts.lastUpdated": {timestamp: time, changeData: changeData, ps_locked: false}
                    }
                });
                await initAddedAssignments(username);
                await initEditedAssignments(username);
                await updateClassesForUser(username);

                socketManager.emitToRoom(username, "sync-success-history", {});
            } else {
                socketManager.emitToRoom(username, "sync-fail-history", {message: data.message});
            }
        } else {
            socketManager.emitToRoom(username, "sync-progress-history");
        }
    };

    scraper.loginAndScrapeGrades(processor, user.school, user.schoolUsername, schoolPassword, [],{}, "true");
};

const updateSortData = (username, sortData) => safe(_updateSortData, lower(username), sortData);
const _updateSortData = async (db, username, sortData) => {
    sortData = JSON.parse(sortData);
    let {dateSort, categorySort} = sortData;
    if (!dateSort || !categorySort) {
        return {success: false, data: {log: `Invalid sortData`}};
    }
    if (!Array.isArray(dateSort) || !Array.isArray(categorySort)) {
        return {success: false, data: {log: `dateSort or categorySort is not an array`}};
    }
    if (dateSort.filter((e) => typeof e !== "boolean").length !== 0 || categorySort.filter((e) => typeof e !== "boolean").length !== 0) {
        return {success: false, data: {log: `Invalid arrays dateSort or categorySort`}};
    }
    let res = await _users(db, username).updateOne({username: username}, {
        $set: {
            "sortingData": {dateSort: dateSort, categorySort: categorySort}
        }
    });
    if (res.matchedCount === 1) {
        return {success: true};
    }
    return {success: false};
};

const resetSortData = (username) => safe(_resetSortData, lower(username));
const _resetSortData = async (db, username) => {
    await _users(db, username).updateOne({username: username}, {
        $set: {
            sortingData: {
                dateSort: [], categorySort: []
            }
        }
    });

    return {success: true};
};

const userHasSemester = (username, term, semester) => safe(_userHasSemester, lower(username), term, semester);
const _userHasSemester = async (db, username, term, semester) => {
    let res = await getUser(username, {username: 1}, {[`grades.${term}.${semester}`]: {$exists: true}});

    return {
        success: true,
        data: {value: res.success}
    };
};

const initAddedAssignments = (username) => safe(_initAddedAssignments, lower(username));
const _initAddedAssignments = async (db, username) => {
    let res = await getUser(username, {addedAssignments: 1, grades: 1});
    if (!res.success) {
        return res;
    }

    let user = res.data.value;
    let current = user.addedAssignments ?? {};

    let temp = {};
    let years = Object.keys(user.grades);
    for (let i = 0; i < years.length; i++) {
        let semesters = Object.keys(user.grades[years[i]]);
        temp[years[i]] = {};
        for (let j = 0; j < semesters.length; j++) {
            temp[years[i]][semesters[j]] = current[years[i]]?.[semesters[j]] ?? [];
            let classes = user.grades[years[i]][semesters[j]].map(c => c.class_name);
            for (let k = 0; k < classes.length; k++) {
                if (k >= temp[years[i]][semesters[j]].length) {
                    temp[years[i]][semesters[j]].push({});
                }
                let existing = current[years[i]]?.[semesters[j]]?.findIndex((c) => c.className === classes[k]) ?? -1;
                if (existing === -1) {
                    temp[years[i]][semesters[j]][k] = {className: classes[k], data: []};
                } else {
                    temp[years[i]][semesters[j]][k] = current[years[i]][semesters[j]][existing];
                    if (!Array.isArray(temp[years[i]][semesters[j]][k].data)) {
                        temp[years[i]][semesters[j]][k].data = [];
                    }
                    if ("assignments" in temp[years[i]][semesters[j]][k]) {
                        delete temp[years[i]][semesters[j]][k].assignments;
                    }
                }
            }
        }
    }

    await _users(db, username).updateOne({username: username}, {$set: {addedAssignments: temp}});
    return {success: true};
};

const initEditedAssignments = (username) => safe(_initEditedAssignments, lower(username));
const _initEditedAssignments = async (db, username) => {
    let res = await getUser(username, {editedAssignments: 1, grades: 1});
    if (!res.success) {
        return res;
    }

    let user = res.data.value;
    let current = user.editedAssignments ?? {};

    let temp = {};
    let years = Object.keys(user.grades);
    for (let i = 0; i < years.length; i++) {
        let semesters = Object.keys(user.grades[years[i]]);
        temp[years[i]] = {};
        for (let j = 0; j < semesters.length; j++) {
            temp[years[i]][semesters[j]] = current[years[i]]?.[semesters[j]] ?? [];
            let classes = user.grades[years[i]][semesters[j]].map(c => c.class_name);
            for (let k = 0; k < classes.length; k++) {
                if (k >= temp[years[i]][semesters[j]].length) {
                    temp[years[i]][semesters[j]].push({});
                }
                let existing = current[years[i]]?.[semesters[j]]?.findIndex((c) => c.className === classes[k]) ?? -1;
                if (existing === -1) {
                    temp[years[i]][semesters[j]][k] = {className: classes[k], data: {}};
                } else {
                    temp[years[i]][semesters[j]][k] = current[years[i]][semesters[j]][existing];
                    if (Array.isArray(temp[years[i]][semesters[j]][k].data)) {
                        temp[years[i]][semesters[j]][k].data = {};
                    }
                    if ("assignments" in temp[years[i]][semesters[j]][k]) {
                        delete temp[years[i]][semesters[j]][k].assignments;
                    }
                }
            }
        }
    }

    await _users(db, username).updateOne({username: username}, {$set: {editedAssignments: temp}});
    return {success: true};
};

const initWeights = (username) => safe(_initWeights, lower(username));
const _initWeights = async (db, username) => {
    let res = await getUser(username, {weights: 1, grades: 1});
    if (!res.success) {
        return res;
    }

    let user = res.data.value;
    let current = user.weights ?? {};

    let temp = {};
    let years = Object.keys(user.grades);
    for (let i = 0; i < years.length; i++) {
        let semesters = Object.keys(user.grades[years[i]]);
        temp[years[i]] = {};
        for (let j = 0; j < semesters.length; j++) {
            temp[years[i]][semesters[j]] = current[years[i]]?.[semesters[j]] ?? [];
            let classes = user.grades[years[i]][semesters[j]].map(c => c.class_name);
            for (let k = 0; k < classes.length; k++) {
                if (k >= temp[years[i]][semesters[j]].length) {
                    temp[years[i]][semesters[j]].push({});
                }
                let existing = current[years[i]]?.[semesters[j]]?.findIndex((c) => c.className === classes[k]) ?? -1;
                if (existing === -1) {
                    temp[years[i]][semesters[j]][k] = {className: classes[k], weights: {}, hasWeights: false};
                } else {
                    temp[years[i]][semesters[j]][k].className = classes[k];
                    temp[years[i]][semesters[j]][k].weights =
                        _.clone(current[years[i]][semesters[j]][existing].weights);
                    temp[years[i]][semesters[j]][k].hasWeights = current[years[i]][semesters[j]][existing].hasWeights;
                }

                let categories = user.grades[years[i]][semesters[j]][k].grades.map(g => g.category);
                let goodWeights = new Set(categories);
                // Make sure weights match grades
                let weightKeys = Object.keys(temp[years[i]][semesters[j]][k].weights);
                for (let l = 0; l < weightKeys.length; l++) {
                    if (!goodWeights.has(weightKeys[l])) {
                        delete temp[years[i]][semesters[j]][k].weights[weightKeys[l]];
                    }
                }
                weightKeys = Object.keys(temp[years[i]][semesters[j]][k].weights);
                goodWeights.forEach((w) => {
                    if (!weightKeys.includes(w)) {
                        temp[years[i]][semesters[j]][k].weights[w] = null;
                    }
                });
            }

            // Make sure it's the right length
            temp[years[i]][semesters[j]] = temp[years[i]][semesters[j]].slice(0, classes.length);
        }
    }

    await _users(db, username).updateOne({username: username}, {$set: {weights: temp}});
    return {success: true};
};

const initAddedWeights = (username) => safe(_initAddedWeights, lower(username));
const _initAddedWeights = async (db, username) => {
    let res = await getUser(username, {addedWeights: 1, grades: 1});
    if (!res.success) {
        return res;
    }

    let user = res.data.value;
    let current = user.addedWeights ?? {};

    let temp = {};
    let years = Object.keys(user.grades);
    for (let i = 0; i < years.length; i++) {
        let semesters = Object.keys(user.grades[years[i]]);
        temp[years[i]] = {};
        for (let j = 0; j < semesters.length; j++) {
            temp[years[i]][semesters[j]] = current[years[i]]?.[semesters[j]] ?? [];
            let classes = user.grades[years[i]][semesters[j]].map(c => c.class_name);
            for (let k = 0; k < classes.length; k++) {
                if (k >= temp[years[i]][semesters[j]].length) {
                    temp[years[i]][semesters[j]].push({});
                }
                let existing = current[years[i]]?.[semesters[j]]?.findIndex((c) => c.className === classes[k]) ?? -1;
                if (existing === -1) {
                    temp[years[i]][semesters[j]][k] = {className: classes[k], weights: {}};
                } else {
                    temp[years[i]][semesters[j]][k] = current[years[i]][semesters[j]][existing];
                }
            }
        }
    }

    await _users(db, username).updateOne({username: username}, {$set: {addedWeights: temp}});
    return {success: true};
};

const updateClassesForUser = (username, term, semester, className) => safe(_updateClassesForUser, lower(username), term, semester, className);
const _updateClassesForUser = async (db, username, term, semester, className) => {
    let res = await getUser(username, {grades: 1, school: 1, weights: 1, addedWeights: 1});
    if (!res.success) {
        return res;
    }

    let user = res.data.value;
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

                //Add all classes to db
                if (!(await dbContainsClass(user.school, _term, _semester, _className, teacherName)).success) {
                    await addDbClass(user.school, _term, _semester, _className, teacherName);
                }

                // Ignore if no teacher (means no assignments)
                if (!teacherName) {
                    continue;
                }

                // Determine needed weights
                let neededWeights = []; // All weights from the users grades
                for (let j = 0; j < user.grades[_term][_semester][i].grades.length; j++) {
                    if (!neededWeights.includes(user.grades[_term][_semester][i].grades[j].category)) {
                        neededWeights.push(user.grades[_term][_semester][i].grades[j].category);
                    }
                }

                // Add hasWeights: false
                let hasWeights = user.weights[_term][_semester][i].hasWeights;
                if (neededWeights.length === 1) {
                    hasWeights = false;
                }
                let currentWeights = user.weights[_term][_semester][i];
                let newWeights = currentWeights;
                let custom = currentWeights.custom;

                let res2 = await dbContainsClass(user.school, _term, _semester, _className, teacherName);
                if (res2.success) {
                    let dbClass = res2.data.value;
                    let dbTeacher = dbClass.teachers.find(teacher => teacher.teacherName === teacherName);
                    // Update weights from classes db if not custom
                    if (!custom && _.isEqual(neededWeights, Object.keys(dbTeacher.weights))) {
                        newWeights = dbTeacher.weights;
                        hasWeights = dbTeacher.hasWeights ?? false;
                    } else {
                        newWeights = Object.fromEntries(neededWeights.map((neededWeight) => [
                            neededWeight, currentWeights.weights[neededWeight] ?? null
                        ]));

                        //Set to point-based if only one category exists (& category is null)
                        let values = Object.values(newWeights);
                        if (values.length === 1 && values[0] == null) {
                            hasWeights = false;
                        }

                        //Add user's weights as suggestions
                        await addWeightsSuggestion(username, _term, _semester, _className, teacherName, hasWeights, newWeights);

                        //Set custom to not custom if it is same as classes db
                        if (custom) {
                            custom = isCustom({
                                "weights": newWeights, "hasWeights": hasWeights
                            }, {
                                "weights": dbTeacher.weights, "hasWeights": dbTeacher.hasWeights
                            });
                        }
                    }
                }

                let addedWeights = user.addedWeights[_term][_semester][i].weights;
                for (let weight in addedWeights) {
                    if (weight in newWeights) {
                        delete addedWeights[weight];
                    }
                }

                await updateWeightsForClass(username, _term, _semester, _className, hasWeights, newWeights, addedWeights, custom, false);
            }
        }
    }

    return {success: true};
};

const updateAddedAssignments = (username, addedAssignments, term, semester) => safe(_updateAddedAssignments, lower(username), addedAssignments, term, semester);
const _updateAddedAssignments = async (db, username, addedAssignments, term, semester) => {
    let res = await getUser(username, {
        [`addedWeights.${term}.${semester}`]: 1,
        [`weights.${term}.${semester}`]: 1,
        [`grades.${term}.${semester}`]: 1
    });
    if (!res.success) {
        return res;
    }

    if (typeof addedAssignments === "string") {
        addedAssignments = JSON.parse(addedAssignments);
    }
    if (!Array.isArray(addedAssignments)) {
        return {
            success: false,
            data: {prodLog: `Invalid parameters for updateAddedAssignments. username=${username} addedAssignments is not an array.`}
        };
    }

    let user = res.data.value;

    let grades = user.grades;
    if (!grades?.[term]?.[semester]) {
        return {
            success: false,
            data: {prodLog: `Invalid parameters for updateAddedAssignments: username=${username}, term=${term}, semester=${semester}`}
        };
    }

    let allowedKeys = [
        "assignment_name", "date", "category", "grade_percent", "points_gotten", "points_possible", "exclude"
    ];
    let allowedTypes = {
        "assignment_name": ["string"],
        "date": ["string"],
        "category": ["string"],
        "grade_percent": ["number", "boolean"],
        "points_gotten": ["number", "boolean"],
        "points_possible": ["number", "boolean"],
        "exclude": ["boolean"]
    };

    let returnAddedWeights = false;
    // Iterate each school class
    for (let i = 0; i < addedAssignments.length; i++) {
        let className = addedAssignments[i].className;
        let index = grades[term][semester].findIndex(c => c.class_name === className);
        if (index === -1) {
            return {
                success: false,
                data: {prodLog: `Invalid class ${className} for updateAddedAssignments: username=${username}`}
            };
        }
        let weights = user.weights[term][semester][index].weights;
        let addedWeights = user.addedWeights[term][semester][index].weights;
        let actualAddedWeights = new Set();
        // Iterate each assignment in the school class
        for (let j = 0; j < addedAssignments[i].data.length; j++) {
            let assignment = addedAssignments[i].data[j];
            // Validate the data
            if (Object.keys(assignment).length !== allowedKeys.length) {
                return {success: false, data: {prodLog: `addedAssignments has the wrong number of keys`}};
            }
            if (!Object.keys(assignment).every((k) => allowedKeys.includes(k))) {
                return {success: false, data: {prodLog: `addedAssignments has invalid keys`}};
            }
            if (!Object.entries(assignment).every(([h, k]) => allowedTypes[h].includes(typeof k))) {
                return {success: false, data: {prodLog: `addedAssignments has invalid values`}};
            }
            // Discard HTML tags
            assignment.category = assignment.category.replace(/(<([^>]+)>)/gi, "");
            assignment.assignment_name = assignment.assignment_name.replace(/(<([^>]+)>)/gi, "");
            // Add new categories
            if (assignment.category in weights) {
                continue;
            }
            actualAddedWeights.add(assignment.category);
            if (assignment.category in addedWeights) {
                continue;
            }
            user.addedWeights[term][semester][index].weights[assignment.category] = null;
        }
        // Remove weights by ???
        let updateAddedWeights = actualAddedWeights.size !== Object.keys(addedWeights).length;
        for (let w of Object.keys(addedWeights)) {
            if (!actualAddedWeights.has(w)) {
                delete addedWeights[w];
            }
            updateAddedWeights = true;
        }
        // Update Database
        let set = {$set: {[`addedAssignments.${term}.${semester}.${index}`]: addedAssignments[i]}};
        if (updateAddedWeights) {
            returnAddedWeights = true;
            set["$set"][`addedWeights.${term}.${semester}.${index}.weights`] = addedWeights;
            user.addedWeights[term][semester][index].weights = addedWeights;
        }
        await _users(db, username).updateOne({username: username}, set);
    }

    return {success: true, data: !returnAddedWeights ? {} : {addedWeights: user.addedWeights[term][semester]}};
};

const updateEditedAssignments = (username, editedAssignments, term, semester) => safe(_updateEditedAssignments, lower(username), editedAssignments, term, semester);
const _updateEditedAssignments = async (db, username, editedAssignments, term, semester) => {
    let res = await getUser(username, {editedAssignments: 1, [`grades.${term}.${semester}`]: 1});
    if (!res.success) {
        return res;
    }

    if (typeof editedAssignments === "string") {
        editedAssignments = JSON.parse(editedAssignments);
    }
    if (!Array.isArray(editedAssignments)) {
        return {
            success: false,
            data: {prodLog: `Invalid parameters for updateEditedAssignments. username=${username} editedAssignments is not an array.`}
        };
    }

    let user = res.data.value;

    let grades = user.grades;
    if (!grades?.[term]?.[semester]) {
        return {
            success: false,
            data: {prodLog: `Invalid parameters for updateEditedAssignments: username=${username}, term=${term}, semester=${semester}`}
        };
    }

    let oldEditedAssignments = user.editedAssignments;
    if (!(term in oldEditedAssignments) || !(semester in oldEditedAssignments[term])) {
        return {
            success: false,
            data: {log: `Invalid parameters for updateEditedAssignments: username=${username}, term=${term}, semester=${semester}`}
        };
    }

    let allowedKeys = [
        "assignment_name", "date", "category", "grade_percent", "points_gotten", "points_possible", "exclude"
    ];
    let allowedTypes = {
        "assignment_name": ["string"],
        "category": ["string"],
        "grade_percent": ["number", "boolean"],
        "points_gotten": ["number", "boolean"],
        "points_possible": ["number", "boolean"],
        "exclude": ["boolean"]
    };

    for (let i = 0; i < editedAssignments.length; i++) {
        let className = editedAssignments[i].className;
        let index = grades[term][semester].findIndex(c => c.class_name === className);
        if (index === -1) {
            return {
                success: false,
                data: {prodLog: `Invalid class ${className} for updateEditedAssignments: username=${username}`}
            };
        }
        let psaids = Object.keys(editedAssignments[i].data);
        for (let j = 0; j < psaids.length; j++) {
            if (grades[term][semester][index].grades.findIndex(g => `${g.psaid}` === psaids[j]) === -1) {
                return {success: false, data: {prodLog: `editedAssignments has invalid psaid`}};
            }
        }
        let assignments = Object.values(editedAssignments[i].data);
        for (let j = 0; j < assignments.length; j++) {
            let assignment = assignments[j];
            if (!Object.keys(assignment).every((k) => allowedKeys.includes(k))) {
                return {success: false, data: {prodLog: `editedAssignments has invalid keys`}};
            }
            if (!Object.entries(assignment).every(([h, k]) => allowedTypes[h].includes(typeof k) || k === null)) {
                return {success: false, data: {prodLog: `editedAssignments has invalid values`}};
            }
        }
        await _users(db, username).updateOne({username: username}, {$set: {[`editedAssignments.${term}.${semester}.${index}`]: editedAssignments[i]}});
    }

    return {success: true};
};

const getSyncStatus = (username) => safe(_getSyncStatus, lower(username));
const _getSyncStatus = async (db, username) => {
    let res = await getUser(username, {updatedInBackground: 1, school: 1});
    if (!res.success) {
        return res;
    }
    let user = res.data.value;
    let syncStatus = user.updatedInBackground;
    if (syncStatus === SyncStatus.COMPLETE) {
        await _users(db, username).updateOne({username: username}, {$set: {updatedInBackground: SyncStatus.ALREADY_DONE}});
        return {success: true, data: {message: "Sync Complete!"}};
    } else if (syncStatus === SyncStatus.ALREADY_DONE) {
        return {success: true, data: {message: "Already Synced!"}};
    } else if (syncStatus === SyncStatus.NO_DATA) {
        return {
            success: false,
            data: {message: `No ${user.school === Schools.BISV ? "Schoology" : "PowerSchool"} grades found for this term.`}
        };
    } else if (syncStatus === SyncStatus.LOGIN_FAILED) {
        return {
            success: false,
            data: {message: `Invalid ${user.school === Schools.BISV ? "Schoology" : "PowerSchool"} credentials.`}
        };
    } else if (syncStatus === SyncStatus.FAILED) {
        return {
            success: false,
            data: {message: `Could not connect to ${user.school === Schools.BISV ? "Schoology" : "PowerSchool"}.`}
        };
    } else if (syncStatus === undefined || syncStatus === SyncStatus.UPDATING) {
        return {success: false, data: {message: "Did not sync"}};
    } else if (syncStatus === SyncStatus.HISTORY) {
        return {success: false, data: {message: "Syncing History..."}};
    } else if (syncStatus === SyncStatus.ACCOUNT_INACTIVE) {
        return {
            success: false,
            data: {message: `Your ${user.school === Schools.BISV ? "Schoology" : "PowerSchool"} account is no longer active.`}
        };
    } else if (syncStatus === SyncStatus.NOT_SYNCING) {
        return {success: false, data: {message: "Not syncing"}};
    } else if (syncStatus === SyncStatus.LIMIT) {
        return {success: false, data: {message: "You need to wait before syncing again."}}
    } else if (syncStatus.startsWith(`${SyncStatus.FAILED}-`)) {
        let errorCode = parseInt(syncStatus.substring(SyncStatus.FAILED.length + 1));
        return {success: false, data: {message: `Sync Failed. Error ${errorCode}.`}};
    }
};

const setSyncStatus = (username, value) => safe(_setSyncStatus, lower(username), value);
const _setSyncStatus = async (db, username, value) => {
    if (!Object.values(SyncStatus).includes(value) && !value.startsWith(`${SyncStatus.FAILED}-`)) {
        return {success: false, data: {log: `Invalid sync status: ${value}`}};
    }
    let res = await _users(db, username).updateOne({username: username}, {$set: {updatedInBackground: value}});
    if (res.matchedCount === 1) {
        return {success: true, data: {log: `Set sync status for ${username} to ${value}`}};
    }
    return {success: false, data: {log: `Error setting sync status for ${username} to ${value}`}};
};

const latestVersionSeen = (username) => safe(_latestVersionSeen, lower(username));
const _latestVersionSeen = async (db, username) => {
    let version = latestVersion(_beta);
    let res = await _users(db, username).updateOne({username: username}, {$set: {"alerts.latestSeen": version}});
    if (res.matchedCount === 1) {
        return {success: true, data: {log: `Set latest seen for ${username} to ${version}`}};
    }
    return {success: false, data: {log: `Error setting latest seen for ${username} to ${version}`}};
};

const updateTutorial = (username, action) => safe(_updateTutorial, lower(username), action);
const _updateTutorial = async (db, username, action) => {
    if (!tutorialKeys.includes(action)) {
        return {success: false, data: {log: `Invalid action: ${action}`}};
    }

    let res = await _users(db, username).findOneAndUpdate({username: username}, {$set: {[`alerts.tutorialStatus.${action}`]: true}}, {returnDocument: "after"});
    return {success: true, data: {value: res.alerts.tutorialStatus}};
};

const resetTutorial = (username) => safe(_resetTutorial, lower(username));
const _resetTutorial = async (db, username) => {
    let res = await _users(db, username).findOneAndUpdate({username: username}, {
        $set: {
            "alerts.tutorialStatus": Object.fromEntries(tutorialKeys.map(key => [key, false]))
        }
    }, {returnDocument: "after"});
    return {success: true, data: {value: res.alerts.tutorialStatus}};
};

const addBetaKey = () => safe(_addBetaKey);
const _addBetaKey = async (db) => {
    let betaKey = makeKey(7);
    if ((await betaKeyExists(betaKey)).success) {
        return {
            success: false, data: {log: `Beta key ${betaKey} already exists.`, message: "Beta key already exists."}
        };
    }
    let document = {
        betaKey: betaKey, claimed: false, claimedBy: ""
    };
    await db.collection(BETAKEYS_COLLECTION_NAME).insertOne(document);
    return {
        success: true,
        data: {log: `Added betaKey ${betaKey}`, message: `Beta Key ${betaKey} Added`, value: document}
    };
};

const betaKeyExists = (betaKey) => safe(_betaKeyExists, betaKey);
const _betaKeyExists = async (db, betaKey) => {
    let betaKeyExists = await db.collection(BETAKEYS_COLLECTION_NAME).findOne({betaKey: betaKey});
    if (!!betaKeyExists) {
        return {success: true, data: {log: `BetaKey ${betaKey} found`, value: betaKeyExists}};
    }
    return {
        success: false, data: {log: `No betaKey found with given parameters: betaKey=${betaKey}`}
    };
};

const betaKeyValid = (betaKey) => safe(_betaKeyValid, betaKey);
const _betaKeyValid = async (db, betaKey) => {
    let exists = await betaKeyExists(betaKey);
    if (!exists.success) {
        return {success: false, data: {message: "Invalid beta key!"}};
    }
    if (exists.data.value.claimed) {
        return {success: false, data: {message: "Beta key already claimed!"}};
    }
    return {success: true, data: {message: "Valid key!"}};
};

const getBetaKey = (betaKey) => safe(_getBetaKey, betaKey);
const _getBetaKey = async (db, betaKey) => {
    let _betaKey = await db.collection(BETAKEYS_COLLECTION_NAME).findOne({betaKey: betaKey});
    if (!_betaKey) {
        return {success: false, data: {log: `Key not found: ${betaKey}`}};
    }
    return {success: true, data: {value: _betaKey}};
};

const getAllBetaKeys = () => safe(_getAllBetaKeys);
const _getAllBetaKeys = async (db) => {
    return {success: true, data: {value: await db.collection(BETAKEYS_COLLECTION_NAME).find({}).toArray()}};
};

const claimBetaKey = (betaKey, username) => safe(_claimBetaKey, betaKey, lower(username));
const _claimBetaKey = async (db, betaKey, username) => {
    let res = await getBetaKey(betaKey);
    if (!res.success) {
        return {success: false, data: {message: "Invalid beta key."}};
    }
    if (res.data.value.claimed) {
        return {
            success: false,
            data: {log: `Beta key ${betaKey} already claimed.`, message: "Beta key already claimed."}
        };
    }
    let res2 = await db.collection(BETAKEYS_COLLECTION_NAME).updateOne({
        $and: [
            {betaKey: betaKey}, {claimed: false}
        ]
    }, {
        $set: {
            claimed: true, claimedBy: username
        }
    });
    if (res2.matchedCount === 1) {
        return {success: true, data: {log: `${betaKey} successfully claimed by ${username}`}};
    }
    return {
        success: false, data: {
            log: `Could not claim betaKey with given parameters: betaKey=${betaKey}, username=${username}`,
            message: "Beta key could not be claimed"
        }
    };
};

const removeBetaKey = (betaKey) => safe(_removeBetaKey, betaKey);
const _removeBetaKey = async (db, betaKey) => {
    let res = await db.collection(BETAKEYS_COLLECTION_NAME).deleteOne({betaKey: betaKey});
    if (res.deletedCount === 1) {
        return {success: true, data: {log: `Deleted betaKey ${betaKey}.`, message: "Removed beta key."}};
    }
    return {
        success: false, data: {
            log: `Could not delete betaKey with given parameters: betaKey=${betaKey}`,
            message: "Beta key could not be deleted"
        }
    };
};

const joinBeta = (username, school) => safe(_joinBeta, lower(username), lower(school));
const _joinBeta = async (db, username, school) => {
    let featureObject = betaFeatures([], school);
    let res = await _users(db, username).updateOne({username: username}, {$set: {betaFeatures: featureObject}});
    if (res.matchedCount === 1) {
        return {success: true, data: {log: `Joined beta for ${username}`}};
    }
    return {success: false, data: {log: `Error joining beta for ${username}`}};
};

const updateBetaFeatures = (username, school, features) => safe(_updateBetaFeatures, lower(username), lower(school), features);
const _updateBetaFeatures = async (db, username, school, features) => {
    let featureObject = betaFeatures(features, school);
    let res = await _users(db, username).updateOne({username: username}, {$set: {betaFeatures: featureObject}});
    if (res.matchedCount === 1) {
        return {success: true, data: {log: `Updated beta features for ${username}`}};
    }
    return {success: false, data: {log: `Updated beta features for ${username}`}};
};

const leaveBeta = (username) => safe(_leaveBeta, lower(username));
const _leaveBeta = async (db, username) => {
    let res = await _users(db, username).updateOne({username: username}, {$set: {betaFeatures: {active: false}}});
    if (res.matchedCount === 1) {
        return {success: true, data: {log: `Left beta for ${username}`}};
    }
    return {success: false, data: {log: `Error leaving beta for ${username}`}};
};

const checkPasswordResetToken = (token) => safe(_checkPasswordResetToken, token);
const _checkPasswordResetToken = async (db, token) => {
    let res = await getAllUsers({
        schoolPassword: 1,
        passwordResetTokenExpire: 1,
        username: 1,
        school: 1
    }, {passwordResetToken: token});
    if (!res.success || res.data.actualCount !== 1) {
        return {success: true, data: {username: null, school: null, valid: false, gradeSync: false}};
    }
    let user = res.data.value[0];
    let valid = user && user.passwordResetTokenExpire > Date.now();
    let gradeSync = !!user.schoolPassword;
    return {success: true, data: {username: user?.username, school: user?.school, valid: valid, gradeSync: gradeSync}};
};

const resetPasswordRequest = (schoolUsername) => safe(_resetPasswordRequest, lower(schoolUsername));
const _resetPasswordRequest = async (db, schoolUsername) => {
    let token = makeKey(20);

    let username = await _usernames(db).findOne({schoolUsername: schoolUsername});
    if (!username) {
        return {success: false}
    }
    let res = await _users(db, username.username).findOneAndUpdate({schoolUsername: schoolUsername}, {
        $set: {
            passwordResetToken: token, passwordResetTokenExpire: Date.now() + 1000 * 60 * 60 * 24
        }
    }, {returnDocument: "after"});

    return {success: true, data: {user: res, token: token}};
};

const resetPassword = (token, newPassword) => safe(_resetPassword, token, newPassword);
const _resetPassword = async (db, token, newPassword) => {
    return new Promise(async resolve => {
        let res = await checkPasswordResetToken(token);
        let {username, valid, gradeSync} = res.data;
        if (!valid) {
            return resolve({success: false, data: {message: "Invalid token."}});
        }

        let message = validatePassword(newPassword);
        if (message) {
            return resolve({success: false, data: {message: message}});
        }

        if (gradeSync) {
            await disableGradeSync(username);
        }

        bcrypt.hash(newPassword, ROUNDS_TO_GENERATE_SALT, async (err, hash) => {
            if (err) {
                return resolve({success: false, data: {log: err, message: "Something went wrong"}});
            }
            let res3 = await _users(db, username).updateOne({username: username}, {
                $set: {password: hash}, $unset: {passwordResetTokenExpire: "", passwordResetToken: ""}
            });
            if (res3.matchedCount === 0) {
                return resolve({
                    success: false,
                    data: {log: `Error resetting password`, message: "Something went wrong"}
                });
            }
            return resolve({
                success: true,
                data: {log: `Reset password for ${username}`, message: "Password updated."}
            });
        });
    });
};

const clearTestDatabase = () => safe(_clearTestDatabase);
const _clearTestDatabase = async (db) => {
    if (!_testing) {
        return {success: false, data: {log: `Cannot drop non-testing databases`}};
    }
    return {success: await db.dropDatabase(), data: {log: `Dropped test database`}};
};

const addDbClass = (school, term, semester, className, teacherName) => safe(_addDbClass, lower(school), term, semester, className, teacherName);
const _addDbClass = async (db, school, term, semester, className, teacherName) => {
    if (!Object.values(Schools).includes(school)) {
        return {success: false, data: {log: `Invalid school ${school}`}};
    }
    let classData = await db.collection(classesCollection(school)).findOne({
        term: term,
        semester: semester,
        className: className
    }, {
        projection: {
            "teachers": 1,
            "_id": 1
        }
    });
    if (classData) { // class already exists
        if (classData.teachers.every(x => x.teacherName !== teacherName)) {
            await db.collection(classesCollection(school)).updateOne({_id: classData._id}, {$push: {"teachers": makeTeacher(teacherName)}});
        }
    } else { //class doesn't exist
        await db.collection(classesCollection(school)).insertOne(makeClass(term, semester, className, teacherName));
    }

    return {success: true, data: {log: `Added class ${term} / ${semester} / ${className} / ${teacherName}.`}};
};

const addWeightsSuggestion = (username, term, semester, className, teacherName, hasWeights, weights) => safe(_addWeightsSuggestion, lower(username), term, semester, className, teacherName, hasWeights, weights);
const _addWeightsSuggestion = async (db, username, term, semester, className, teacherName, hasWeights, weights) => {
    let modWeights;
    try {
        [hasWeights, modWeights] = fixWeights(hasWeights, weights);
    } catch (e) {
        return {
            success: false, data: {message: "Something went wrong", log: e.message}
        };
    }

    if ((Object.values(modWeights).every(x => x === null) || Object.keys(weights).length === 0) && hasWeights) {
        return {
            success: false, data: {
                message: "Something went wrong",
                log: `Invalid weights. One weight required. hasWeights: ${hasWeights} weights: ${weights}`
            }
        };
    }

    //Get school
    let res = await getUser(username, {school: 1});
    if (!res.success) {
        return res;
    }
    let school = res.data.value.school;

    //Remove & add username from existing suggestions
    let classData = await db.collection(classesCollection(school)).findOne({
        term: term,
        semester: semester,
        className: className,
        "teachers.teacherName": teacherName
    }, {
        projection: {
            "teachers.$": 1, "_id": 1
        }
    });
    let teacherData = classData.teachers[0];
    let suggestions = teacherData.suggestions;
    let suggestionAdded = false;
    for (let i = 0; i < suggestions.length; i++) {
        if (compareWeights({
            "weights": suggestions[i].weights, "hasWeights": suggestions[i].hasWeights
        }, {"weights": modWeights, "hasWeights": hasWeights})) {
            if (!suggestions[i].usernames.includes(username)) {
                suggestions[i].usernames.push(username);
            }
            suggestionAdded = true;
        } else if (suggestions[i].usernames.includes(username)) {
            if (suggestions[i].usernames.length === 1) {
                suggestions.splice(i, 1);
            } else {
                suggestions[i].usernames.splice(suggestions.indexOf(username), 1);
            }
        }
    }

    //Add new suggestion if not already added & different from verified weights
    if (!suggestionAdded) {
        if (!compareWeights({
            "weights": teacherData.weights, "hasWeights": teacherData.hasWeights
        }, {"weights": modWeights, "hasWeights": hasWeights})) {
            suggestions.push({
                "usernames": [username], "weights": modWeights, "hasWeights": hasWeights
            });
        }
    }

    await db.collection(classesCollection(school)).updateOne({
        _id: classData._id,
        "teachers.teacherName": teacherName
    }, {
        $set: {"teachers.$.suggestions": suggestions}
    });

    return {
        success: true,
        data: {log: `Added suggestion from ${username} to ${term} / ${semester} / ${className} / ${teacherName}.`}
    };
};

const updateWeightsInClassDb = (school, term, semester, className, teacherName, hasWeights, weights) => safe(_updateWeightsInClassDb, lower(school), term, semester, className, teacherName, hasWeights, weights);
const _updateWeightsInClassDb = async (db, school, term, semester, className, teacherName, hasWeights, weights) => {
    if (!Object.values(Schools).includes(school)) {
        return {
            success: false, data: {message: "Something went wrong", log: `Invalid school ${school}`}
        };
    }

    if (typeof hasWeights === "string") {
        hasWeights = JSON.parse(hasWeights);
    }

    let modWeights;
    try {
        [hasWeights, modWeights] = fixWeights(hasWeights, weights);
    } catch (e) {
        return {
            success: false, data: {message: "Something went wrong", log: e}
        };
    }

    if ((Object.values(modWeights).every(x => x === null) || Object.keys(weights).length === 0) && hasWeights) {
        return {
            success: false, data: {
                message: "Something went wrong",
                log: `Invalid weights. One weight required. hasWeights: ${hasWeights} weights: ${weights}`
            }
        };
    }

    //Update weights for teacher
    let classData = (await db.collection(classesCollection(school)).findOneAndUpdate({
        term: term,
        semester: semester,
        className: className,
        "teachers.teacherName": teacherName
    }, {
        $set: {
            "teachers.$.hasWeights": hasWeights,
            "teachers.$.weights": modWeights
        }
    }, {
        projection: {
            "teachers.$": 1,
            "_id": 1
        }
    }));

    //Delete any suggestion with same weights
    let suggestionIndex = null;
    let suggestions = classData.teachers[0].suggestions;
    for (let i = 0; i < suggestions.length; i++) {
        if (compareWeights({
            "weights": suggestions[i].weights, "hasWeights": suggestions[i].hasWeights
        }, {"weights": modWeights, "hasWeights": hasWeights})) {
            suggestions.splice(i, 1);
            suggestionIndex = i;
        }
    }
    await db.collection(classesCollection(school)).updateOne({
        _id: classData._id,
        "teachers.teacherName": teacherName
    }, {
        $set: {"teachers.$.suggestions": suggestions}
    });

    return {
        success: true, data: {
            suggestion: suggestionIndex,
            message: `Updated weights for ${className} | ${teacherName}`,
            log: `Updated weights for ${term} / ${semester} / ${className} / ${teacherName}`
        }
    };
};

const updateClassTypeInClassDb = (school, term, semester, className, classType) => safe(_updateClassTypeInClassDb, lower(school), term, semester, className, classType);
const _updateClassTypeInClassDb = async (db, school, term, semester, className, classType) => {
    if (!Object.values(Schools).includes(school)) {
        return {
            success: false, data: {message: "Something went wrong", log: `Invalid school ${school}`}
        };
    }
    if (!Constants.classTypes.includes(classType)) {
        classType = null;
    }
    let res = await db.collection(classesCollection(school)).updateOne({
        term: term,
        semester: semester,
        className: className
    }, {$set: {"classType": classType}});
    if (res.matchedCount === 0) {
        return {
            success: false,
            data: {message: "Something went wrong", log: `Failed to set class type of ${className} to ${classType}`}
        };
    }
    return {
        success: true, data: {
            message: `Set class type of ${className} to ${classType}`,
            log: `Set class type of ${className} to ${classType}`
        }
    };
};

const updateUCCSUClassTypeInClassDb = (school, term, semester, className, classType) => safe(_updateUCCSUClassTypeInClassDb, lower(school), term, semester, className, classType);
const _updateUCCSUClassTypeInClassDb = async (db, school, term, semester, className, classType) => {
    if (!Object.values(Schools).includes(school)) {
        return {
            success: false, data: {message: "Something went wrong", log: `Invalid school ${school}`}
        };
    }
    if (!Constants.uc_csuClassTypes.includes(classType)) {
        classType = null;
    }
    let res = await db.collection(classesCollection(school)).updateOne({
        term: term,
        semester: semester,
        className: className
    }, {$set: {"uc_csuClassType": classType}});
    if (res.matchedCount === 0) {
        return {
            success: false, data: {
                message: "Something went wrong",
                log: `Failed to set UC/CSU class type of ${className} to ${classType}`
            }
        };
    }
    return {
        success: true, data: {
            message: `Set UC/CSU class type of ${className} to ${classType}`,
            log: `Set UC/CSU class type of ${className} to ${classType}`
        }
    };
};

const getMostRecentTermDataInClassDb = (school) => safe(_getMostRecentTermDataInClassDb, lower(school));
const _getMostRecentTermDataInClassDb = async (db, school) => {
    if (!Object.values(Schools).includes(school)) {
        return {success: false, data: {log: `Invalid school ${school}`}};
    }
    let res = (await db.collection(classesCollection(school)).find().sort({
        term: -1, semester: -1
    }).limit(1).toArray())[0];
    if (!res) {
        return {success: false, data: {message: "No class data"}};
    }
    return {success: true, data: {value: {term: res.term, semester: res.semester}}};
};

const dbContainsSemester = (school, term, semester) => safe(_dbContainsSemester, lower(school), term, semester);
const _dbContainsSemester = async (db, school, term, semester) => {
    if (!Object.values(Schools).includes(school)) {
        return {success: false, data: {log: `Invalid school ${school}`}};
    }
    let res = await db.collection(classesCollection(school)).findOne({term: term, semester: semester});
    return {success: res !== null, data: {value: res}};
};

const dbContainsClass = (school, term, semester, className, teacherName) => safe(_dbContainsClass, lower(school), term, semester, className, teacherName);
const _dbContainsClass = async (db, school, term, semester, className, teacherName) => {
    if (!Object.values(Schools).includes(school)) {
        return {success: false, data: {log: `Invalid school ${school}`}};
    }
    let res = await db.collection(classesCollection(school)).findOne({
        term: term,
        semester: semester,
        className: className,
        "teachers.teacherName": teacherName
    });
    return {success: res !== null, data: {value: res}};
};

const getAllClassData = (school, term, semester) => safe(_getAllClassData, lower(school), term, semester);
const _getAllClassData = async (db, school, term, semester) => {
    if (!Object.values(Schools).includes(school)) {
        return {success: false, data: {log: `Invalid school ${school}`}};
    }
    let res = await db.collection(classesCollection(school)).find({term: term, semester: semester}).toArray();
    let classNames = [];
    let allData = {};
    for (let data of res) {
        for (let teacherData of data.teachers) {
            data[teacherData.teacherName] = teacherData;
        }
        delete data._id;
        delete data.teachers;
        delete data.version;
        delete data.term;
        delete data.semester;
        classNames.push(data.className);
        allData[data.className] = data;
        delete allData[data.className].className;
    }
    let res2 = await _catalog().find({class_name: {$in: classNames}, school: school}).toArray();
    let catalogData = {};
    for (let data of res2) {
        catalogData[data.class_name] = data;
        delete data._id;
        delete catalogData[data.class_name].class_name;
    }
    return {success: true, data: {classData: allData, catalogData: catalogData}};
};

const getTermsAndSemestersInClassDb = (school) => safe(_getTermsAndSemestersInClassDb, lower(school));
const _getTermsAndSemestersInClassDb = async (db, school) => {
    if (!Object.values(Schools).includes(school)) {
        return {success: false, data: {log: `Invalid school ${school}`}};
    }
    let termsAndSemesters = await db.collection(classesCollection(school)).aggregate([
        {
            $group: {
                _id: "$term",
                semesters: {$addToSet: "$semester"}
            }
        }, {$sort: {_id: 1}}
    ]).toArray();
    termsAndSemesters = termsAndSemesters.map(x => [x._id, x.semesters.sort()]);
    return {success: true, data: {value: termsAndSemesters}};
};

const updateWeightsForClass = (username, term, semester, className, hasWeights, weights, addedWeights) => safe(_updateWeightsForClass, lower(username), term, semester, className, hasWeights, weights, addedWeights);
const _updateWeightsForClass = async (db, username, term, semester, className, hasWeights, weights, addedWeights, custom = null, addSuggestion = true) => {
    //Get user
    let query = {[`grades.${term}.${semester}.class_name`]: className};
    let projection = {school: 1, [`grades.${term}.${semester}`]: 1, [`weights.${term}.${semester}`]: 1};
    let res = await getUser(username, projection, query);
    if (!res.success) {
        return res;
    }

    let user = res.data.value;
    let school = user.school;
    let teacherName, currentWeights, teacherData;

    //Verify term, semester, & className exist in grades
    if (!term in user.grades || !semester in user.grades[term]) {
        return {
            success: false,
            data: {message: "Something went wrong", prodLog: `Failed to update weights for ${username}. (1)`}
        };
    }
    let classIndex = user.grades[term][semester].findIndex(g => g.class_name === className);
    if (classIndex === -1) { //className in grades?
        return {
            success: false,
            data: {message: "Something went wrong", prodLog: `Failed to update weights for ${username}. (2)`}
        };
    }
    teacherName = user.grades[term][semester][classIndex].teacher_name;

    //Verify term, semester, & className exist in weights
    if (!term in user.weights || !semester in user.weights[term] || user.weights[term][semester].length <= classIndex || user.weights[term][semester][classIndex].className !== className) { //term, semester, className in weights?
        return {
            success: false,
            data: {message: "Something went wrong", prodLog: `Failed to update weights for ${username}. (3)`}
        };
    }
    currentWeights = user.weights[term][semester][classIndex].weights;

    if (typeof hasWeights === "string") {
        hasWeights = JSON.parse(hasWeights);
    }
    if (typeof weights === "string") {
        weights = JSON.parse(weights);
    }
    if (typeof addedWeights === "string") {
        addedWeights = JSON.parse(addedWeights);
    }

    // Verify all weight keys already exist
    for (let weight in weights) {
        if (!(weight in currentWeights)) {
            return {
                success: false,
                data: {
                    message: "Something went wrong",
                    prodLog: `Failed to update weights for ${username}. (4) ${weight}`
                }
            };
        }
    }

    // Verify no weights missing
    for (let weight in currentWeights) {
        if (!(weight in weights)) {
            return {
                success: false,
                data: {
                    message: "Something went wrong",
                    prodLog: `Failed to update weights for ${username}. (5) ${weight}`
                }
            };
        }
    }

    // Verify no added weights in real weights
    for (let weight in addedWeights) {
        if (weight in weights) {
            return {
                success: false,
                data: {
                    message: "Something went wrong",
                    prodLog: `Failed to update weights for ${username}. (6) ${weight}`
                }
            };
        }
    }

    //Verify classesDB contains class
    let res2 = await dbContainsClass(school, term, semester, className, teacherName);
    if (!res2.success) {
        // If it doesn't, add it
        let res3 = await addDbClass(school, term, semester, className, teacherName);

        if (!res3.success) {
            return {
                success: false,
                data: {message: "Something went wrong", prodLog: `Failed to update weights for ${username}. (7)`}
            };
        }
    }
    let classData = await db.collection(classesCollection(school)).findOne({
        term: term,
        semester: semester,
        className: className,
        "teachers.teacherName": teacherName
    }, {projection: {"teachers.$": 1}});
    teacherData = classData.teachers[0];

    //Add Suggestion
    if (addSuggestion) {
        await addWeightsSuggestion(username, term, semester, className, teacherName, hasWeights, weights);
    }

    //Validate & Modify Weights
    let modWeights;
    try {
        [hasWeights, modWeights] = fixWeights(hasWeights, Object.assign({}, currentWeights, weights));
    } catch (e) {
        return {
            success: false,
            data: {message: "Something went wrong", prodLog: `Failed to update weights for ${username}. (8) ${e}`}
        };
    }

    //Determine Custom
    if (custom === null) {
        custom = isCustom({"weights": modWeights, "hasWeights": hasWeights}, {
            "weights": teacherData.weights, "hasWeights": teacherData.hasWeights
        });
    }

    //Update weights
    let temp = {className: className, weights: modWeights, hasWeights: hasWeights, custom: custom};
    let temp2 = {className: className, weights: addedWeights};
    await _users(db, username).updateOne({
        username: username, [`weights.${term}.${semester}.className`]: className
    }, {
        $set: {
            [`weights.${term}.${semester}.$`]: temp,
            [`addedWeights.${term}.${semester}.$`]: temp2
        }
    });

    if (custom) {
        return {
            success: true,
            data: {message: `Custom weight set for ${className}.`, log: `Custom weight set for ${className}.`}
        };
    }
    return {
        success: true,
        data: {message: `Reset weight for ${className}.`, log: `Reset weight for ${className}.`}
    };
    //Important: Do not change first word of message. It is used in frontend to determine if it is custom.
};

const getRelevantClassData = (username, term, semester) => safe(_getRelevantClassData, lower(username), term, semester);
const _getRelevantClassData = async (db, username, term, semester) => {
    let res = await getUser(username, {grades: 1, school: 1});
    if (!res.success) {
        return res;
    }

    let user = res.data.value;
    let userClasses = [];
    for (let _term in user.grades) {
        for (let _semester in user.grades[_term]) {
            user.grades[_term][_semester].forEach(c => userClasses.push({
                term: _term,
                semester: _semester,
                className: c.class_name,
                teacherName: c.teacher_name,
                overallPercent: c.overall_percent,
                grades: c.grades,
            }));
        }
    }

    let school = user.school;
    let relClasses = {};
    for (let userClass of userClasses) {
        //Prioritizes data from specified term & semester for multi-semester classes
        if ((userClass.term === term && userClass.semester === semester) || !relClasses.hasOwnProperty(userClass.className)) {
            let query = {term: userClass.term, semester: userClass.semester, className: userClass.className};
            let projection = {
                "department": 1,
                "classType": 1,
                "uc_csuClassType": 1,
                "weights": 1,
                "hasWeights": 1,
                "credits": 1,
                "terms": 1,
                "description": 1
            };
            if (userClass.teacherName) {
                query["teachers.teacherName"] = userClass.teacherName;
                projection["teachers.$"] = 1;
            }

            let rawData = await _catalog().findOne({class_name: userClass.className, school: school});

            let classData = await db.collection(classesCollection(school)).findOne(query, {
                projection: projection
            });

            let nonAcademicOverride = userClass.className.startsWith("Cura");
            nonAcademicOverride ||= userClass.className.endsWith("Cross Country");
            nonAcademicOverride ||= userClass.className.endsWith("Track");
            nonAcademicOverride ||= userClass.className.endsWith("Water Polo");
            nonAcademicOverride ||= userClass.className.endsWith("Football");
            nonAcademicOverride ||= userClass.className.endsWith("Swimming");
            nonAcademicOverride ||= userClass.className.endsWith("Baseball");
            nonAcademicOverride ||= userClass.className.endsWith("Volleyball");
            nonAcademicOverride ||= userClass.className.endsWith("Tennis");
            nonAcademicOverride ||= userClass.className.endsWith("Lacrosse");
            nonAcademicOverride ||= userClass.className.endsWith("Golf");
            nonAcademicOverride ||= userClass.className.endsWith("Soccer");
            nonAcademicOverride ||= userClass.className.endsWith("Basketball");
            nonAcademicOverride ||= userClass.className === "Study Hall";
            nonAcademicOverride ||= userClass.className === "Free Period";
            nonAcademicOverride ||= userClass.className.startsWith("Study Center");
            nonAcademicOverride ||= userClass.className === "Preparedness/Summit";

            relClasses[userClass.className] = {
                "department": classData?.department ?? rawData?.department ?? "",
                "classType": nonAcademicOverride ? "non-academic" : (classData?.classType ?? rawData?.classType ?? ""),
                "uc_csuClassType": classData?.uc_csuClassType ?? rawData?.uc_csuClassType ?? "",
                "uc_csuOnlyIf": rawData?.uc_csuOnlyIf ?? "",
                "weights": userClass.teacherName ? classData?.teachers[0]?.weights ?? {} : {},
                "hasWeights": userClass.teacherName ? classData?.teachers[0]?.hasWeights ?? null : null,
                "credits": classData?.credits ?? rawData?.credits,
                "terms": classData?.terms ?? rawData?.terms,
                "description": rawData?.description,
                "prereq": rawData?.prereq,
                "review": rawData?.review,
                "gradeLevels": rawData?.grade_levels
            };
        }
    }

    return {success: true, data: {value: relClasses}};
};

const getUserCounts = (username, term, semester, className) => safe(_getUserCounts, lower(username), term, semester, className);
const _getUserCounts = async (db, username, term, semester, className) => {
    let res = await getUser(username, {school: 1, donoData: 1});
    if (!res.success) {
        return res;
    }
    let {plus} = donoAttributes(res.data.value.donoData);
    let teachers;

    if (plus) {
        teachers = (await db.collection(classesCollection(res.data.value.school)).findOne({
            term: term,
            semester: semester,
            className: className
        }, {
            projection: {teachers: {teacherName: 1}}
        }))?.teachers.map(t => t.teacherName).filter(t => t) ?? [];
    } else {
        let res = (await getUser(username, {[`grades.${term}.${semester}`]: 1}));
        if (!res.success) {
            return res;
        }
        teachers = res.data.value.grades[term][semester].filter(c => c.class_name === className).map(c => c.teacher_name).filter(t => t !== false);
        if (!teachers.length) {
            return {success: true, data: {value: {}}};
        }
    }

    let userCounts = {};
    for (let teacher of teachers) {
        let userCountQuery = {
            [`grades.${term}.${semester}`]: {
                $elemMatch: {
                    class_name: className, teacher_name: teacher
                }
            }
        };
        let users = (await getAllUsers({username: 1}, userCountQuery)).data.value;

        userCounts[teacher] = users.length;
    }

    return {success: true, data: {value: userCounts}};
}

const getAssignmentAverage = (username, term, semester, className, assignmentPSAID) => safe(_getAssignmentAverage, lower(username), term, semester, className, assignmentPSAID);
const _getAssignmentAverage = async (db, username, term, semester, className, assignmentPSAID) => {
    let donoAttr = (await getDonoAttributes(username)).data.value;

    let res = await getUser(username, {grades: 1});
    if (!res.success) {
        return res;
    }

    let grades = res.data.value.grades;
    if (!(term in grades) || !(semester in grades[term])) {
        return {success: false};
    }

    grades = grades[term][semester];

    let classIndex = grades.findIndex(g => g.class_name === className);
    if (classIndex === -1) {
        return {success: false};
    }

    let teacherName = grades[classIndex].teacher_name;
    if (teacherName === false) {
        return {success: false};
    }
    grades = grades[classIndex].grades;

    if (grades.length === 0) {
        return {success: false};
    }

    if (typeof assignmentPSAID === "string") {
        try {
            assignmentPSAID = JSON.parse(assignmentPSAID);
        } catch (e) {
        }
    }

    let assignmentIndex = grades.findIndex(g => g.psaid === assignmentPSAID);
    if (assignmentIndex === -1) {
        return {success: false};
    }

    if (assignmentIndex !== grades.length - 1 && !donoAttr.premium) return {success: false}; // Only the first average can be viewed without premium

    let assignmentAverageQuery = {
        [`grades.${term}.${semester}`]: {
            $elemMatch: {
                class_name: className,
                teacher_name: teacherName,
                grades: {
                    $elemMatch: {
                        psaid: assignmentPSAID
                    }
                }
            }
        }
    };

    let users = (await getAllUsers({[`grades.${term}.${semester}`]: 1}, assignmentAverageQuery)).data.value;

    let validScores = users.map(u => {
        let grade = u.grades[term][semester].find(c => c.class_name === className).grades.find(g => g.psaid === assignmentPSAID && g.points_gotten !== false);
        if (grade && grade.grade_percent !== false) {
            return grade.grade_percent;
        } else if (grade) {
            return grade.points_gotten;
        } else {
            return false;
        }
    }).filter(s => s !== false).map(s => parseFloat(s));

    let assignmentAverage = {};
    if (validScores.length >= minUsersForAverageCalc) {
        assignmentAverage.average = validScores.reduce((a, b) => a + b, 0) / validScores.length;
    }
    assignmentAverage.numUsers = validScores.length;

    return {success: true, data: {value: assignmentAverage}};
}

const addDonation = (data) => safe(_addDonation, data);
const _addDonation = async (db, data) => {
    data = JSON.parse(data);
    let {username, platform, paidValue, receivedValue, dateDonated} = data;

    if (!Constants.donoPlatforms.includes(platform)) {
        return {
            success: false, data: {message: "Invalid Platform", log: `Invalid platform ${platform}`}
        };
    }
    if (typeof paidValue !== "number" || typeof receivedValue !== "number") {
        return {
            success: false, data: {
                message: "Invalid payment amounts",
                log: `Invalid payment amounts paid=${paidValue} received=${receivedValue}`
            }
        };
    }
    if (typeof dateDonated !== "number") {
        return {
            success: false, data: {message: "Invalid date", log: `Invalid date ${dateDonated}`}
        };
    }

    let now = Date.now();
    let res = await createNotification(username, `${platform}-${dateDonated}-${paidValue}-${receivedValue}-${now}`, "donation", "Thank You!", `We received your donation of $${receivedValue.toFixed(2)}! ${notificationButton(`showCard('#settingsCardDisplay'); openTab(2)`, `View in your Account`)}`, true, false, true, true, true, dateDonated);
    if (!res.success) {
        return res;
    }
    res = await _users(db, username).updateOne({
        username: username
    }, {
        $push: {
            donoData: {
                platform: platform,
                paidValue: paidValue,
                receivedValue: receivedValue,
                dateDonated: dateDonated,
                dateEntered: now,
            }
        }
    });

    if (res.matchedCount === 1) {
        socketManager.emitToRoom(username, "donation-new", {
            platform: platform,
            paidValue: paidValue,
            receivedValue: receivedValue,
            dateDonated: dateDonated,
        });
        return {success: true, data: {message: `Added donation for ${username}`}};
    }

    return {
        success: false,
        data: {log: `Error adding donation for ${username}`, message: `Error adding donation for ${username}`}
    };
};

const removeDonation = (username, index) => safe(_removeDonation, lower(username), index);
const _removeDonation = async (db, username, index) => {
    let res = await getUser(username, {donoData: 1, "appearance.colorPalette": 1});
    if (!res.success) {
        return res;
    }

    let donoData = res.data.value.donoData;
    let donation;
    if (index >= 0 && index < donoData.length) {
        donation = donoData.splice(index, 1)[0];
    } else {
        return {
            success: false, data: {
                message: `Failed to remove donation for ${username}`,
                log: `Index ${index} out of bounds for removing donation for ${username}`
            }
        };
    }

    let id = `${donation.platform}-${donation.dateDonated}-${donation.paidValue}-${donation.receivedValue}-${donation.dateEntered}`;
    await _users(db, username).updateOne({username: username}, {
        $set: {donoData: donoData}, $pull: {"alerts.notifications": {id: id}}
    });

    if (res.data.value.appearance.colorPalette === "custom") {
        if (!(await getDonoAttributes(username)).data.plus) {
            await setColorPalette(username, "clear", false);
        }
    }

    socketManager.emitToRoom(username, "notification-delete", {id: id});
    socketManager.emitToRoom(username, "donation-delete", donation);

    return {
        success: true, data: {message: `Removed donation for ${username}`, log: `Removed donation for ${username}`}
    };
};

const getDonoData = (username) => safe(_getDonoData, lower(username));
const _getDonoData = async (db, username) => {
    let res = await getUser(username, {donoData: 1});
    if (!res.success) {
        return res;
    }

    return {success: true, data: {value: res.data.value.donoData}};
};

const getDonoAttributes = (username) => safe(_getDonoAttributes, lower(username));
const _getDonoAttributes = async (db, username) => {
    let res = await getDonoData(username);
    if (!res.success) {
        return res;
    }

    let donos = res.data.value;
    return {success: true, data: {value: donoAttributes(donos)}};
};

const getAllAlerts = (username) => safe(_getAllAlerts, lower(username));
const _getAllAlerts = async (db, username) => {
    let res = await getUser(username, {alerts: 1});
    if (!res.success) {
        return res;
    }

    return {success: true, data: {value: res.data.value.alerts}}
}

const getSpecificAlerts = (username, keys) => safe(_getSpecificAlerts, lower(username), keys);
const _getSpecificAlerts = async (db, username, keys) => {
    let projection = Object.fromEntries(keys.map(k => [`alerts.${k}`, 1]));
    let res = await getUser(username, projection);
    if (!res.success) {
        return res;
    }

    return {success: true, data: {value: res.data.value.alerts}};
}

const getTrimmedAlerts = (username, term, semester) => safe(_getTrimmedAlerts, lower(username), term, semester);
const _getTrimmedAlerts = async (db, username, term, semester) => {
    let res = await getUser(username, {"alerts.lastUpdated": 1});
    if (!res.success) {
        return res;
    }

    let {term: latestTerm, semester: latestSemester} = (await _getMostRecentTermData(db, username)).data.value;

    let exists = res.data.value.alerts.lastUpdated.length > 0;
    let aggregation;
    if (term !== latestTerm || semester !== latestSemester || !exists) {
        aggregation = [
            {
                $match: {
                    username: username
                },
            }, {
                $project: {
                    alerts: 1
                }
            }, {
                $addFields: {
                    "alerts.lastUpdated": {
                        $slice: ["$alerts.lastUpdated", -1]
                    }
                }
            }
        ]
    } else {
        let end = res.data.value.alerts.lastUpdated.slice(-1)[0].timestamp;
        let start = end - 1000 * 60 * 60 * 24 * 14; // 14 days

        let cond = {$gte: ["$$updateObj.timestamp", start]};
        if (end !== undefined) {
            cond = {$and: [cond, {$lte: ["$$updateObj.timestamp", end]}]};
        }

        aggregation = [
            {
                $match: {
                    username: username
                }
            }, {
                $project: {
                    alerts: 1
                }
            }, {
                $addFields: {
                    "alerts.lastUpdated": {
                        $filter: {
                            input: "$alerts.lastUpdated", as: "updateObj", cond: cond
                        }
                    }
                }
            }
        ];
    }

    res = (await _users(db, username).aggregate(aggregation).toArray())[0].alerts;

    return {success: true, data: {value: res}};
};

const getAllGrades = (username) => safe(_getAllGrades, lower(username));
const _getAllGrades = async (db, username) => {
    let res = await getUser(username, {grades: 1});
    if (!res.success) {
        return res;
    }

    return {success: true, data: {value: res.data.value.grades}};
}

const getSemesterGrades = (username, term, semester) => safe(_getSemesterGrades, lower(username), term, semester);
const _getSemesterGrades = async (db, username, term, semester) => {
    let res = await getUser(username, {[`grades.${term}.${semester}`]: 1}, {[`grades.${term}.${semester}`]: {$exists: true}});
    if (!res.success) {
        return res;
    }

    return {success: true, data: {value: res.data.value.grades[term][semester]}};
}

const getSemesterWeights = (username, term, semester) => safe(_getSemesterWeights, lower(username), term, semester);
const _getSemesterWeights = async (db, username, term, semester) => {
    let res = await getUser(username, {[`weights.${term}.${semester}`]: 1}, {[`weights.${term}.${semester}`]: {$exists: true}});
    if (!res.success) {
        return res;
    }

    return {success: true, data: {value: res.data.value.weights[term][semester]}};
}

const getSemesterAddedAssignments = (username, term, semester) => safe(_getSemesterAddedAssignments, lower(username), term, semester);
const _getSemesterAddedAssignments = async (db, username, term, semester) => {
    let res = await getUser(username, {[`addedAssignments.${term}.${semester}`]: 1}, {[`addedAssignments.${term}.${semester}`]: {$exists: true}});
    if (!res.success) {
        return res;
    }

    return {success: true, data: {value: res.data.value.addedAssignments[term][semester]}};
}

const getSemesterEditedAssignments = (username, term, semester) => safe(_getSemesterEditedAssignments, lower(username), term, semester);
const _getSemesterEditedAssignments = async (db, username, term, semester) => {
    let res = await getUser(username, {[`editedAssignments.${term}.${semester}`]: 1}, {[`editedAssignments.${term}.${semester}`]: {$exists: true}});
    if (!res.success) {
        return res;
    }

    return {success: true, data: {value: res.data.value.editedAssignments[term][semester]}};
}

const getSemesterAddedWeights = (username, term, semester) => safe(_getSemesterAddedWeights, lower(username), term, semester);
const _getSemesterAddedWeights = async (db, username, term, semester) => {
    let res = await getUser(username, {[`addedWeights.${term}.${semester}`]: 1}, {[`addedWeights.${term}.${semester}`]: {$exists: true}});
    if (!res.success) {
        return res;
    }

    return {success: true, data: {value: res.data.value.addedWeights[term][semester]}};
}

const getGradeSync = (username) => safe(_getGradeSync, lower(username));
const _getGradeSync = async (db, username) => {
    let res = await getUser(username, {username: 1}, {schoolPassword: {$exists: true}});
    return {success: true, data: {value: res.success}};
}

const createPairingKey = (username) => safe(_createPairingKey, lower(username));
const _createPairingKey = async (db, username) => {
    let res = await getUser(username, {"alerts.lastUpdated": {$slice: -1}});
    if (!res.success) {
        return res;
    }
    let valid = res.data.value.alerts.lastUpdated.length > 0;
    if (!valid) {
        return {success: false, data: {message: "You must sync once successfully to use the API"}};
    }
    let pairKey;
    do {
        pairKey = makeKey(6);
    } while ((await apiPairExists(pairKey)).success);
    let pairKeyExpire = Date.now() + 1000 * 60 * 10;
    await _users(db, username).updateOne({username: username}, {
        $unset: {
            "api.apiKey": "", "api.apiKeyCreated": ""
        }, $set: {"api.pairKey": pairKey, "api.pairKeyExpire": pairKeyExpire}
    });
    await _usernames(db).updateOne({username: username}, {
        $unset: {
            "api.apiKey": "",
        }, $set: {"api.pairKey": pairKey}
    })
    return {success: true, data: {value: {pairKey: pairKey, pairKeyExpire: pairKeyExpire}}};
};

const deletePairingKey = (username) => safe(_deletePairingKey, lower(username));
const _deletePairingKey = async (db, username) => {
    let res = await userExists({username: username});
    if (!res.success) {
        return res;
    }

    await _users(db, username).updateOne({username: username}, {
        $unset: {
            "api.pairKey": "", "api.pairKeyExpire": ""
        }
    });
    await _usernames(db).updateOne({username: username}, {
        $unset: {
            "api.pairKey": "",
        }
    });
    return {success: true};
};

const deleteApiKey = (username) => safe(_deleteApiKey, lower(username));
const _deleteApiKey = async (db, username) => {
    let res = await userExists({username: username});
    if (!res.success) {
        return res;
    }

    await _users(db, username).updateOne({username: username}, {
        $unset: {
            "api.apiKey": "", "api.apiKeyCreated": ""
        }
    });
    await _usernames(db).updateOne({username: username}, {
        $unset: {
            "api.apiKey": ""
        }
    });
    return {success: true};
};

const discordVerify = (username, verificationCode) => safe(_discordVerify, lower(username), verificationCode);
/**
 * Function to link a Discord ID to a Graderoom account if the code is correct
 * @param db
 * @param {string} username - Graderoom username to link to
 * @param {number} verificationCode - Verification code given by user
 */
const _discordVerify = async (db, username, verificationCode) => {
    let res = await getUser(username, {discord: 1});
    if (!res.success) {
        return res;
    }

    // Case where user has not initialized the verification process
    let user = res.data.value;
    if (!user.discord) {
        return {success: false, data: {message: "Why have you done .."}};
    }

    // Handle cases where verification should fail
    let now = Date.now();
    if (!user.discord.expires || now >= user.discord.expires) {
        return {
            success: false,
            data: {message: "This code is no longer valid. Please restart the verification process."}
        };
    }

    if (!user.discord.verificationCode || verificationCode !== user.discord.verificationCode) {
        return {success: false, data: {message: "Incorrect code. Please restart the verification process."}};
    }

    // Update account with verified ID and remove verification process data
    await _users(db, username).updateOne({
        username: username
    }, {
        $set: {
            "discord.discordID": user.discord.unverifiedDiscordID
        }, $unset: {
            "discord.unverifiedDiscordID": "", "discord.verificationCode": "", "discord.expires": ""
        }
    });
    await _usernames(db).updateOne({username: username}, {$set: {"discord.discordID": user.discord.unverifiedDiscordID}});

    return {success: true, data: {message: "Successfully linked Discord account"}};
};

const discordUnverify = (username) => safe(_discordUnverify, lower(username));
const _discordUnverify = async (db, username) => {
    let res = await getUser(username, {discord: 1});
    if (!res.success) {
        return res;
    }

    if (res.data.value.discord.discordID) {
        await _users(db, username).updateOne({username: username}, {
            $unset: {
                "discord.discordID": ""
            }
        });
        await _usernames(db).updateOne({username: username}, {$unset: {"discord.discordID": ""}});

        return {success: true, data: {message: "Succefully unlinked Discord account"}};
    }

    return {success: false, data: {message: "No linked Discord account"}};
}

const apiPair = (pairKey) => safe(_apiPair, pairKey);
const _apiPair = async (db, pairKey) => {
    if (typeof pairKey !== "string" && !(pairKey instanceof String) || pairKey.length !== 6) {
        return {success: false, data: {message: "Invalid pairing key"}};
    }
    let res = await _usernames(db).findOne({"api.pairKey": pairKey}, {projection: {username: 1}});
    if (!res) {
        return {success: false, data: {message: "Invalid pairing key"}};
    }
    let user = await _users(db, res.username).findOne({"api.pairKey": pairKey});
    if (user.api.pairKeyExpire > Date.now()) {
        let apiKey;
        do {
            apiKey = makeKey(24);
        } while ((await apiAuthenticate(apiKey)).success);
        await _users(db, res.username).updateOne({"api.pairKey": pairKey}, {
            $unset: {
                "api.pairKey": "", "api.pairKeyExpire": ""
            }, $set: {"api.apiKey": apiKey, "api.apiKeyCreated": Date.now()}
        });
        await _usernames(db).updateOne({username: res.username}, {$set: {"api.apiKey": apiKey}});
        return {success: true, data: {value: apiKey}};
    }
    return {success: false, data: {message: "This pairing key has expired"}};
};

const apiPairExists = (pairKey) => safe(_apiPairExists, pairKey);
const _apiPairExists = async (db, pairKey) => {
    let res = await _usernames(db).findOne({"api.pairKey": pairKey}, {projection: {username: 1}});
    if (!res) {
        return {success: false, data: {message: "Invalid pairing key"}};
    }
    let user = await _users(db, res.username).findOne({"api.pairKey": pairKey});
    if (user) {
        return {success: true};
    }
    return {success: false};
};

const apiAuthenticate = (apiKey) => safe(_apiAuthenticate, apiKey);
const _apiAuthenticate = async (db, apiKey) => {
    if (typeof apiKey !== "string" && !(apiKey instanceof String) || apiKey.length !== 24) {
        return {success: false, data: {message: "Invalid API key"}};
    }
    let res = await _usernames(db).findOne({"api.apiKey": apiKey}, {projection: {username: 1}});
    if (!res) {
        return {success: false, data: {message: "Invalid pairing key"}};
    }
    let user = await _users(db, res.username).findOne({"api.apiKey": apiKey});
    if (user) {
        return {success: true};
    }
    return {success: false};
};

const apiGetUser = (apiKey, projection) => safe(_apiGetUser, apiKey, projection);
const _apiGetUser = async (db, apiKey, projection) => {
    let query = {"api.apiKey": apiKey};
    if (!!projection) {
        projection["api.apiKey"] = 1;
    }

    let res = await _usernames(db).findOne(query, {projection: {username: 1}});
    if (!res) {
        return {success: false, data: {message: "Invalid api key"}};
    }
    let user = await _users(db, res.username).findOne(query, {projection: projection});
    if (!user) {
        return {
            success: false, data: {log: `No user found with given parameters: apiKey=${apiKey}`}
        };
    }
    return {success: true, data: {value: user}};
};

const apiInfo = (apiKey) => safe(_apiInfo, apiKey);
const _apiInfo = async (db, apiKey) => {
    let user = (await apiGetUser(apiKey, {username: 1, school: 1, donoData: 1})).data.value;
    let {premium} = donoAttributes(user.donoData);
    return {success: true, data: {value: {username: user.username, school: user.school, premium: premium}}};
};

const apiGradesSlim = (apiKey) => safe(_apiGradesSlim, apiKey);
const _apiGradesSlim = async (db, apiKey) => {

};

const internalApiAuthenticate = (apiKey) => safe(_internalApiAuthenticate, apiKey);
const _internalApiAuthenticate = async (db, apiKey) => {
    if (typeof apiKey !== "string" && !(apiKey instanceof String) || apiKey.length !== 25) {
        return {success: false, data: {message: "Invalid API key"}};
    }
    let key = await db.collection(INTERNAL_API_KEYS_COLLECTION_NAME).findOne({"apiKey": apiKey});
    if (key) {
        return {success: true};
    }
    return {success: false};
};

const internalApiDiscordConnect = (username, discordID) => safe(_internalApiDiscordConnect, lower(username), discordID);
/**
 * API Function to start a link between a Graderoom account and a Discord ID
 * @param db
 * @param {string} username - Graderoom username to link to
 * @param {string} discordID - Discord ID to link to
 */
const _internalApiDiscordConnect = async (db, username, discordID) => {
    if (typeof discordID !== "string") {
        // Case where the Discord ID is invalid
        return {success: false, data: {errorCode: 1}};
    }
    // Search database for the given Graderoom account
    let res = await getUser(username, {discord: 1});
    if (!res.success) {
        // Case where Graderoom account does not exist
        return {success: false, data: {errorCode: 2}};
    }
    let user = res.data.value;
    let currDiscord = user.discord.discordID;
    // Check if a Discord ID is already linked to the Graderoom account
    if (currDiscord) {
        if (currDiscord === discordID) {
            // Case where user is already connected
            return {
                success: false, data: {errorCode: 3}
            };
        } else {
            // Case where Graderoom account has a link to a different Discord
            return {success: false, data: {errorCode: 4}};
        }
    }

    // Generate a random 2-digit code for pairing using aids
    const numbers = "0123456789".split("").map(d => parseInt(d));
    let verificationCode = numbers.slice(1)[Math.floor(Math.random() * 9)] * 10 + numbers[Math.floor(Math.random() * 10)];

    // Create a verification notification to send to clients
    let now = Date.now();
    let expires = now + 2 * 60 * 1000; // 2 minutes from now
    let notification = {
        id: "discord-verify",
        type: "discord",
        title: "Connect Discord",
        message: `Enter the 2-Digit Code sent by Graderoomba ${notificationTextField("discord-verify", `sendData("discord-verify", {verificationCode: $("#discord-verify")[0].valueAsNumber})`, "number", "2-Digit Code", "10", "99", "1")}`,
        dismissible: false,
        dismissed: false,
        important: true,
        pinnable: false,
        pinned: true,
        createdDate: now
    };

    // Delete any existing discord notifications
    await deleteNotification(username, "discord-verify");
    await deleteNotification(username, "discord-fail");
    await deleteNotification(username, "discord-verified");

    // Store the verification code, the notification, and the unverified discord ID in the database
    await _users(db, username).updateOne({username: username}, {
        $set: {
            discord: {
                verificationCode: verificationCode, expires: expires, unverifiedDiscordID: discordID
            }
        }, $push: {"alerts.notifications": notification}
    });

    socketManager.emitToRoom(username, "notification-new", notification);

    return {success: true, data: {verificationCode: verificationCode}};
};

const internalApiDiscordUserInfo = (discordID) => safe(_internalApiDiscordUserInfo, discordID);
/**
 * API Function that searches the database for the given Discord ID and returns data for setting roles
 * @param db
 * @param {string} discordID - Discord ID to search for
 */
const _internalApiDiscordUserInfo = async (db, discordID) => {
    if (typeof discordID !== "string") {
        // Case where the Discord ID is invalid
        return {success: false, data: {errorCode: 1}};
    }
    let res = await _usernames(db).findOne({"discord.discordID": discordID}, {projection: {username: 1}});
    if (!res) {
        // Case where the user has not connected their account yet
        return {success: false, data: {errorCode: 5}};
    }
    let user = await _users(db, res.username).findOne({"discord.discordID": discordID}, {
        projection: {
            school: 1, donoData: 1
        }
    });
    if (!user) {
        // Case where the user has not connected their account yet
        return {success: false, data: {errorCode: 5}};
    }

    return {
        success: true, data: {school: user.school, donoData: donoAttributes(user.donoData)}
    };
};

module.exports = {
    /**
     * Initializes instance values
     * @param url
     * @param prod
     * @param beta
     * @param testing
     */
    config: config,
    init: init,
    usernameAvailable: usernameAvailable,
    schoolUsernameAvailable: schoolUsernameAvailable,
    addUser: addUser,
    userExists: userExists,
    initUser: initUser,
    updateAllUsers: updateAllUsers,
    updateAllClasses: updateAllClasses,
    getUser: getUser,
    getClass: getClass,
    getAllUsers: getAllUsers,
    _getAllUsers: _getAllUsers,
    getAllClasses: getAllClasses,
    getChartData: getChartData,
    getLoggedInData: getLoggedInData,
    getGradeHistoryLetters: getGradeHistoryLetters,
    userArchived: userArchived,
    unArchiveNonGraduatedUsers: unArchiveNonGraduatedUsers,
    archiveOldUsers: archiveOldUsers,
    archiveUser: archiveUser,
    getAllArchivedUsers: getAllArchivedUsers,
    unArchiveUser: unArchiveUser,
    removeUser: removeUser,
    removeUserFromArchive: removeUserFromArchive,
    getMostRecentTermData: getMostRecentTermData,
    login: login,
    setLoggedIn: setLoggedIn,
    encryptAndStoreSchoolPassword: encryptAndStoreSchoolPassword,
    decryptAndGetSchoolPassword: decryptAndGetSchoolPassword,
    acceptTerms: acceptTerms,
    acceptPrivacyPolicy: acceptPrivacyPolicy,
    setRemoteAccess: setRemoteAccess,
    setPersonalInfo: setPersonalInfo,
    setShowNonAcademic: setShowNonAcademic,
    setRegularizeClassGraphs: setRegularizeClassGraphs,
    setShowPlusMinusLines: setShowPlusMinusLines,
    setReduceMotion: setReduceMotion,
    setWeightedGPA: setWeightedGPA,
    setTheme: setTheme,
    setShowMaxGPA: setShowMaxGPA,
    setColorPalette: setColorPalette,
    updateCustomColor: updateCustomColor,
    setEnableLogging: setEnableLogging,
    setAnimateWhenUnfocused: setAnimateWhenUnfocused,
    setShowFps: setShowFps,
    setShowUpdatePopup: setShowUpdatePopup,
    createNotification: createNotification,
    updateNotification: updateNotification,
    deleteNotification: deleteNotification,
    changePassword: changePassword,
    changeSchoolEmail: changeSchoolEmail,
    disableGradeSync: disableGradeSync,
    makeAdmin: makeAdmin,
    removeAdmin: removeAdmin,
    logError: logError,
    updateGradesFromUser: updateGradesFromUser,
    updateGrades: updateGrades,
    updateGradeHistory: updateGradeHistory,
    updateSortData: updateSortData,
    resetSortData: resetSortData,
    userHasSemester: userHasSemester,
    initAddedAssignments: initAddedAssignments,
    initEditedAssignments: initEditedAssignments,
    initWeights: initWeights,
    initAddedWeights: initAddedWeights,
    updateClassesForUser: updateClassesForUser,
    updateAddedAssignments: updateAddedAssignments,
    updateEditedAssignments: updateEditedAssignments,
    getSyncStatus: getSyncStatus,
    setSyncStatus: setSyncStatus,
    latestVersionSeen: latestVersionSeen,
    updateTutorial: updateTutorial,
    resetTutorial: resetTutorial,
    addBetaKey: addBetaKey,
    betaKeyExists: betaKeyExists,
    betaKeyValid: betaKeyValid,
    getBetaKey: getBetaKey,
    getAllBetaKeys: getAllBetaKeys,
    claimBetaKey: claimBetaKey,
    removeBetaKey: removeBetaKey,
    joinBeta: joinBeta,
    updateBetaFeatures: updateBetaFeatures,
    leaveBeta: leaveBeta,
    checkPasswordResetToken: checkPasswordResetToken,
    resetPasswordRequest: resetPasswordRequest,
    resetPassword: resetPassword,
    clearTestDatabase: clearTestDatabase, //finished and should work:
    addDbClass: addDbClass,
    addWeightsSuggestion: addWeightsSuggestion,
    updateWeightsInClassDb: updateWeightsInClassDb,
    updateClassTypeInClassDb: updateClassTypeInClassDb,
    updateUCCSUClassTypeInClassDb: updateUCCSUClassTypeInClassDb,
    getMostRecentTermDataInClassDb: getMostRecentTermDataInClassDb,
    dbContainsSemester: dbContainsSemester,
    dbContainsClass: dbContainsClass,
    getAllClassData: getAllClassData,
    getTermsAndSemestersInClassDb: getTermsAndSemestersInClassDb,
    updateWeightsForClass: updateWeightsForClass,
    getRelevantClassData: getRelevantClassData,
    getAssignmentAverage: getAssignmentAverage,
    getUserCounts: getUserCounts,
    addDonation: addDonation,
    removeDonation: removeDonation,
    getDonoData: getDonoData,
    getDonoAttributes: getDonoAttributes,
    getAllAlerts: getAllAlerts,
    getSpecificAlerts: getSpecificAlerts,
    getTrimmedAlerts: getTrimmedAlerts,
    getAllGrades: getAllGrades,
    getSemesterGrades: getSemesterGrades,
    getSemesterWeights: getSemesterWeights,
    getSemesterAddedAssignments: getSemesterAddedAssignments,
    getSemesterEditedAssignments: getSemesterEditedAssignments,
    getSemesterAddedWeights: getSemesterAddedWeights,
    getGradeSync: getGradeSync,

    // Sorta API stuff
    createPairingKey: createPairingKey,
    deletePairingKey: deletePairingKey,
    deleteApiKey: deleteApiKey,
    discordVerify: discordVerify,
    discordUnverify: discordUnverify,

    // API STUFF
    apiPair: apiPair,
    apiPairExists: apiPairExists,
    apiAuthenticate: apiAuthenticate,
    apiGetUser: apiGetUser,
    apiInfo: apiInfo,
    apiGradesSlim: apiGradesSlim,

    // INTERNAL API STUFF (DANGEROUS)
    internalApiAuthenticate: internalApiAuthenticate,
    internalApiDiscordConnect: internalApiDiscordConnect,
    internalApiDiscordUserInfo: internalApiDiscordUserInfo,
};
