const {MongoClient} = require("mongodb");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const chroma = require("chroma-js");
const _ = require("lodash");
const stream = require("stream");
const socketManager = require("./socketManager");
const scraper = require("./scrape");
const {SyncStatus, Schools, Constants} = require("./enums");
const {dbUserVersion, dbClassVersion} = require("./dbHelpers");

let _url;
let _prod;
let _beta;
let _testing;
let _client;

let lastUpdatedCharts = new Date(0);
let loginData, uniqueLoginData, syncData, userData, activeUsersData, gradData;

// Shared constants to avoid typo bugs

const MAIN_PURPOSE = "main";
const SYNC_PURPOSE = "sync";
const NOTI_PURPOSE = "noti";

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
    versionNameArray,
    betaChangelogArray,
    changelogArray,
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
    betaFeatureKeys,
    isNotToday
} = require("./dbHelpers");

module.exports = {
    /**
     * Initializes instance values
     * @param url
     * @param prod
     * @param beta
     * @param testing
     */
    config: async (url, prod, beta, testing = false) => {
        _url = url ?? _url;
        _prod = prod ?? _prod;
        _beta = beta ?? _beta;
        _testing = testing ?? _testing;
        _client?.close();
        _client = await MongoClient.connect(_url);
        console.log(`Connected to mongodb at url: ${_url}`);
    },
    init: () => safe(_init),
    usernameAvailable: (username) => safe(_usernameAvailable, lower(username)),
    schoolUsernameAvailable: (schoolUsername) => safe(_schoolUsernameAvailable, lower(schoolUsername)),
    addUser: (school, username, password, schoolUsername, isAdmin, beta = false, betaKey) => safe(_addUser, school, lower(username), password, lower(schoolUsername), isAdmin, beta, betaKey),
    userExists: ({
                     username, schoolUsername
                 }, includeFullUser = false) => safe(_userExists, {
        username: lower(username), schoolUsername: lower(schoolUsername)
    }, includeFullUser),
    updateUser: (username) => safe(_initUser, lower(username)),
    updateAllUsers: () => safe(_updateAllUsers),
    updateAllClasses: () => safe(_updateAllClasses),
    getUser: (username, projection) => safe(_getUser, lower(username), projection),
    getAllUsers: (projection) => safe(_getAllUsers, projection),
    getChartData: () => safe(_getChartData),
    userArchived: ({username, schoolUsername}) => safe(_userArchived, {
        username: lower(username), schoolUsername: lower(schoolUsername)
    }),
    archiveUser: (username) => safe(_archiveUser, lower(username)),
    getAllArchivedUsers: (projection) => safe(_getAllArchivedUsers, projection),
    unArchiveUser: (username) => safe(_unArchiveUser, lower(username)),
    removeUser: (username) => safe(_removeUser, lower(username)),
    removeUserFromArchive: (username) => safe(_removeUserFromArchive, lower(username)),
    getMostRecentTermData: (username) => safe(_getMostRecentTermData, lower(username)),
    login: (username, password) => safe(_login, lower(username), password),
    setLoggedIn: (username) => safe(_setLoggedIn, lower(username)),
    encryptAndStoreSchoolPassword: (username, schoolPassword, password) => safe(_encryptAndStoreSchoolPassword, lower(username), schoolPassword, password),
    decryptAndGetSchoolPassword: (username, password) => safe(_decryptAndGetSchoolPassword, lower(username), password),
    acceptTerms: (username) => safe(_acceptTerms, lower(username)),
    acceptPrivacyPolicy: (username) => safe(_acceptPrivacyPolicy, lower(username)),
    setRemoteAccess: (username, value) => safe(_setRemoteAccess, lower(username), lower(value)),
    setPersonalInfo: (username, firstName, lastName, graduationYear) => safe(_setPersonalInfo, lower(username), firstName, lastName, graduationYear),
    setShowNonAcademic: (username, value) => safe(_setShowNonAcademic, lower(username), value),
    setRegularizeClassGraphs: (username, value) => safe(_setRegularizeClassGraphs, lower(username), value),
    setWeightedGPA: (username, value) => safe(_setWeightedGPA, lower(username), value),
    setTheme: (username, theme, darkModeStart, darkModeFinish, seasonalEffects, blurEffects) => safe(_setTheme, lower(username), lower(theme), darkModeStart, darkModeFinish, seasonalEffects, blurEffects),
    setShowMaxGPA: (username, value) => safe(_setShowMaxGPA, lower(username), value),
    setColorPalette: (username, preset, shuffle) => safe(_setColorPalette, lower(username), lower(preset), shuffle),
    setEnableLogging: (username, value) => safe(_setEnableLogging, lower(username), value),
    setAnimateWhenUnfocused: (username, value) => safe(_setAnimateWhenUnfocused, lower(username), value),
    setShowFps: (username, value) => safe(_setShowFps, lower(username), value),
    changePassword: (username, oldPassword, newPassword) => safe(_changePassword, lower(username), oldPassword, newPassword),
    changeSchoolEmail: (username, schoolUsername) => safe(_changeSchoolEmail, lower(username), lower(schoolUsername)),
    disableGradeSync: (username) => safe(_disableGradeSync, lower(username)),
    makeAdmin: (username) => safe(_makeAdmin, lower(username)),
    removeAdmin: (username, requester) => safe(_removeAdmin, lower(username), lower(requester)),
    updateGrades: (username, schoolPassword, userPassword, gradeSync) => safe(_updateGrades, lower(username), schoolPassword, userPassword, gradeSync),
    updateGradeHistory: (username, schoolPassword) => safe(_updateGradeHistory, lower(username), schoolPassword),
    updateSortData: (username, sortData) => safe(_updateSortData, lower(username), sortData),
    resetSortData: (username) => safe(_resetSortData, lower(username)),
    userHasSemester: (username, term, semester) => safe(_userHasSemester, lower(username), term, semester),
    initAddedAssignments: (username) => safe(_initAddedAssignments, lower(username)),
    initEditedAssignments: (username) => safe(_initEditedAssignments, lower(username)),
    initWeights: (username) => safe(_initWeights, lower(username)),
    updateClassesForUser: (username, term, semester, className) => safe(_updateClassesForUser, lower(username), term, semester, className),
    updateAddedAssignments: (username, addedAssignments, term, semester) => safe(_updateAddedAssignments, lower(username), addedAssignments, term, semester),
    updateEditedAssignments: (username, editedAssignments, term, semester) => safe(_updateEditedAssignments, lower(username), editedAssignments, term, semester),
    getSyncStatus: (username) => safe(_getSyncStatus, lower(username)),
    setSyncStatus: (username, value) => safe(_setSyncStatus, lower(username), value),
    getWhatsNew: (username) => safe(_getWhatsNew, lower(username)),
    latestVersionSeen: (username) => safe(_latestVersionSeen, lower(username)),
    updateTutorial: (username, action) => safe(_updateTutorial, lower(username), action),
    resetTutorial: (username) => safe(_resetTutorial, lower(username)),
    addBetaKey: () => safe(_addBetaKey),
    betaKeyExists: (betaKey) => safe(_betaKeyExists, betaKey),
    betaKeyValid: (betaKey) => safe(_betaKeyValid, betaKey),
    getBetaKey: (betaKey) => safe(_getBetaKey, betaKey),
    getAllBetaKeys: () => safe(_getAllBetaKeys),
    claimBetaKey: (betaKey, username) => safe(_claimBetaKey, betaKey, lower(username)),
    removeBetaKey: (betaKey) => safe(_removeBetaKey, betaKey),
    joinBeta: (username) => safe(_joinBeta, lower(username)),
    updateBetaFeatures: (username, features) => safe(_updateBetaFeatures, lower(username), features),
    leaveBeta: (username) => safe(_leaveBeta, lower(username)),
    checkPasswordResetToken: (token) => safe(_checkPasswordResetToken, token),
    resetPasswordRequest: (schoolUsername) => safe(_resetPasswordRequest, lower(schoolUsername)),
    resetPassword: (token, newPassword) => safe(_resetPassword, token, newPassword),
    clearTestDatabase: () => safe(_clearTestDatabase), //finished and should work:
    addWeightsSuggestion: (username, term, semester, className, teacherName, hasWeights, weights) => safe(_addWeightsSuggestion, lower(username), term, semester, className, teacherName, hasWeights, weights),
    addDbClass: (school, term, semester, className, teacherName) => safe(_addDbClass, lower(school), term, semester, className, teacherName),
    getMostRecentTermDataInClassDb: (school) => safe(_getMostRecentTermDataInClassDb, lower(school)),
    dbContainsSemester: (school, term, semester) => safe(_dbContainsSemester, lower(school), term, semester),
    dbContainsClass: (school, term, semester, className, teacherName) => safe(_dbContainsClass, lower(school), term, semester, className, teacherName), //not tested at all (literally haven't attempted to call them once):
    getAllClassData: (school, term, semester) => safe(_getAllClassData, lower(school), term, semester),
    getTermsAndSemestersInClassDb: (school) => safe(_getTermsAndSemestersInClassDb, lower(school)),
    updateWeightsInClassDb: (school, term, semester, className, teacherName, hasWeights, weights) => safe(_updateWeightsInClassDb, lower(school), term, semester, className, teacherName, hasWeights, weights),
    updateClassTypeInClassDb: (school, term, semester, className, classType) => safe(_updateClassTypeInClassDb, lower(school), term, semester, className, classType),
    updateUCCSUClassTypeInClassDb: (school, term, semester, className, classType) => safe(_updateUCCSUClassTypeInClassDb, lower(school), term, semester, className, classType),
    updateWeightsForClass: (username, term, semester, className, hasWeights, weights) => safe(_updateWeightsForClass, lower(username), term, semester, className, hasWeights, weights),
    getRelevantClassData: (username, term, semester) => safe(_getRelevantClassData, lower(username), term, semester),
    addDonation: (username, platform, paidValue, receivedValue, dateDonated) => safe(_addDonation, lower(username), lower(platform), paidValue, receivedValue, dateDonated),
    removeDonation: (username, index) => safe(_removeDonation, lower(username), index),
    getDonoData: (username) => safe(_getDonoData, lower(username)),
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
            return resolve({success: false, data: {message: "Something went wrong"}});
        });
    });
};

const db = client => client.db(_testing ? TEST_DATABASE_NAME : _beta ? BETA_DATABASE_NAME : STABLE_DATABASE_NAME);
const catalog = () => _client.db(COMMON_DATABASE_NAME).collection(CATALOG_COLLECTION_NAME);

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
    if (!collectionNames.includes(USERS_COLLECTION_NAME)) {
        await db.createCollection(USERS_COLLECTION_NAME);
    }
    // Create the deleted user collection if it doesn't exist
    if (!collectionNames.includes(ARCHIVED_USERS_COLLECTION_NAME)) {
        await db.createCollection(ARCHIVED_USERS_COLLECTION_NAME);
    }

    for (let school of Object.values(Schools)) {
        // Create the classes collection if it doesn't exist
        if (!collectionNames.includes(classesCollection(school))) {
            await db.createCollection(classesCollection(school));
        }
    }

    return {success: true};
};

const _usernameAvailable = async (db, username) => {
    let res = await _userExists(db, {username: username});
    if (res.success) {
        return {
            success: false, data: {log: `${username} is already taken`, message: "This username is already taken!"}
        };
    }
    let res2 = await _userArchived(db, {username: username});
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

const _schoolUsernameAvailable = async (db, schoolUsername) => {
    let res = await _userExists(db, {schoolUsername: schoolUsername});
    if (res.success) {
        return {
            success: false, data: {
                log: `${schoolUsername} is already taken`,
                message: "This email address is already associated with an account!"
            }
        };
    }
    let res2 = await _userArchived(db, {schoolUsername: schoolUsername});
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

const _addUser = async (db, school, username, password, schoolUsername, isAdmin, beta, betaKey) => {
    if (beta) {
        let res = await _claimBetaKey(db, betaKey, username);
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
    return await __addUser(db, user);
};

const __addUser = async (db, user) => {
    if (!(await _userExists(db, {username: user.username, schoolUsername: user.schoolUsername})).success) {
        await db.collection(USERS_COLLECTION_NAME).insertOne(user);
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

const _userExists = async (db, {username, schoolUsername}, includeFullUser = false) => {
    let query = {$or: [{username: username}, {schoolUsername: schoolUsername}]};
    let projection = includeFullUser ? {} : {username: 1};
    let userExists = await db.collection(USERS_COLLECTION_NAME).findOne(query, projection);
    if (!!userExists) {
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
    let res = await _getUser(db, username, {version: 1, weights: 1, addedAssignments: 1, editedAssignments: 1});
    if (!res.success) {
        return res;
    }

    let user = res.data.value;
    await __version1(db, user);

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

        await db.collection(USERS_COLLECTION_NAME).updateOne({username: user.username}, {
            $set: {
                "weights": weights, "addedAssignments": addedAssignments, "editedAssignments": editedAssignments
            }
        });

        // Run init weights to clean up bad weights (dots causing stuff)
        await _initWeights(db, user.username);
        await _initAddedAssignments(db, user.username);
        await _initEditedAssignments(db, user.username);

        await db.collection(USERS_COLLECTION_NAME).updateOne({username: user.username}, {$set: {version: 1}});
    }
};

const _version2 = async (db, username) => {
    let res = await _getUser(db, username, {version: 1, addedAssignments: 1});
    if (!res.success) {
        return res;
    }

    let user = res.data.value;
    await __version2(db, user);

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

        await db.collection(USERS_COLLECTION_NAME).updateOne({username: user.username}, {$set: {addedAssignments: addedAssignments}});

        await db.collection(USERS_COLLECTION_NAME).updateOne({username: user.username}, {$set: {version: 2}});
    }
};

const _version3 = async (db, username) => {
    let res = await _getUser(db, username, {
        version: 1,
        grades: 1,
        weights: 1,
        addedAssignments: 1,
        editedAssignments: 1
    });
    if (!res.success) {
        return res;
    }

    let user = res.data.value;
    await __version3(db, user);

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
                weights[year][semester] = user.grades[year][semester].map(g => weights[year][semester].find(w => w.className === g.class_name) ?? {
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

        await db.collection(USERS_COLLECTION_NAME).updateOne({username: user.username}, {
            $set: {
                weights: weights, editedAssignments: editedAssignments, addedAssignments: addedAssignments
            }
        });

        await db.collection(USERS_COLLECTION_NAME).updateOne({username: user.username}, {$set: {version: 3}});
    }
};

const _version4 = async (db, username) => {
    let res = await _getUser(db, username, {version: 1, addedAssignments: 1, editedAssignments: 1});
    if (!res.success) {
        return res;
    }

    let user = res.data.value;
    await __version4(db, user);

    return {success: true, data: {log: `Updated ${username} to version 4`}};
}

const __version4 = async (db, user) => {
    if (user.version === 3) {
        await _initAddedAssignments(db, user.username);
        await _initEditedAssignments(db, user.username);

        await db.collection(USERS_COLLECTION_NAME).updateOne({username: user.username}, {$set: {version: 4}});
    }
}

const _version5 = async (db, username) => {
    let res = await _getUser(db, username, {version: 1});
    if (!res.success) {
        return res;
    }

    let user = res.data.value;
    await __version5(db, user);

    return {success: true, data: {log: `Updated ${username} to version 5`}};
}

const __version5 = async (db, user) => {
    if (user.version === 4) {
        await db.collection(USERS_COLLECTION_NAME).updateOne({username: user.username}, {$set: {donoData: [], version: 5}})
    }
}

const _initUser = async (db, username) => {
    let res = await _getUser(db, username, {"alerts.tutorialStatus": 1, betaFeatures: 1});
    if (!res.success) {
        return res;
    }

    let user = res.data.value;
    await __initUser(db, user);

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

    // Remove extra beta features
    let betaFeatures = user.betaFeatures;
    let existingFeatures = Object.keys(betaFeatures);
    let temp2 = _.clone(betaFeatures);
    for (let i = 0; i < existingFeatures.length; i++) {
        if (existingFeatures[i] === "active") {
            continue;
        }
        if (!betaFeatureKeys.includes(existingFeatures[i])) {
            delete temp2[existingFeatures[i]];
        }
    }

    // Set all new beta features to true
    if (betaFeatures.active) {
        for (let i = 0; i < betaFeatureKeys.length; i++) {
            if (!(betaFeatureKeys[i] in temp2)) {
                temp2[betaFeatureKeys[i]] = true;
            }
        }
    }

    if (!_.isEqual(temp, user.alerts.tutorialStatus) || !_.isEqual(temp2, user.betaFeatures)) {
        await db.collection(USERS_COLLECTION_NAME).updateOne({username: user.username}, {
            $set: {
                "alerts.tutorialStatus": temp, "betaFeatures": temp2
            }
        });
    }
};

const _updateAllUsers = async (db) => {
    let {data: {value: users}} = await _getAllUsers(db, {username: 1, version: 1});
    for (let i = 0; i < users.length; i++) {
        let user = users[i];
        if (user.version < dbUserVersion) {
            console.log(`Updating ${user.username} (${i + 1} of ${users.length})`);
            if (user.version < 1) {
                console.log((await _version1(db, user.username)).data.log);
            }
            if (user.version < 2) {
                console.log((await _version2(db, user.username)).data.log);
            }
            if (user.version < 3) {
                console.log((await _version3(db, user.username)).data.log);
            }
            if (user.version < 4) {
                console.log((await _version4(db, user.username)).data.log);
            }
            if (user.version < 5) {
                console.log((await _version5(db, user.username)).data.log);
            }
        }
        console.log((await _initUser(db, user.username)).data.log);
    }
    return {success: true};
};

const _classVersion1 = async (db, school, className, term, semester) => {
    let res = await _getClass(db, school, className, term, semester, {
        version: 1,
        department: 1,
        classType: 1,
        uc_csuClassType: 1,
        credits: 1,
        terms: 1
    });
    if (!res.success) {
        return res;
    }

    let class_ = res.data.value;
    await __classVersion1(db, school, class_);

    return {success: true, data: {log: `Updated ${className} in ${school} ${term} ${semester} to version 1`}};
};

const __classVersion1 = async (db, school, class_) => {
    if (class_.version === 0) {
        let rawData = await catalog().findOne({class_name: class_.className, school: school});
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
            if (class_.credits === rawData.credits || !([1,2,5,10]).includes(class_.terms)) {
                update.credits = null;
            }
            if (_.isEqual(class_.terms, rawData.terms) || !([1,2]).includes(class_.terms)) {
                update.terms = null;
            }
        }
        await db.collection(classesCollection(school)).updateOne({
                                                                     className: class_.className,
                                                                     term: class_.term,
                                                                     semester: class_.semester
                                                                 }, {$set: update, $unset: {grade_levels: "", description: ""}});

        await db.collection(classesCollection(school)).updateOne({
                                                                            className: class_.className,
                                                                            term: class_.term,
                                                                            semester: class_.semester
                                                                        }, {$set: {version: 1}});
    }
};

const _classVersion2 = async (db, school, className, term, semester) => {
    let res = await _getClass(db, school, className, term, semester, {
        version: 1,
        teachers: 1
    });
    if (!res.success) {
        return res;
    }

    let class_ = res.data.value;
    await __classVersion2(db, school, class_);

    return {success: true, data: {log: `Updated ${className} in ${school} ${term} ${semester} to version 2`}};};

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
}

const _updateAllClasses = async (db) => {
    for (let school of Object.values(Schools)) {
        let {data: {value: classes}} = await _getAllClasses(db, school, {
            className: 1, term: 1, semester: 1, version: 1,
        });
        for (let i = 0; i < classes.length; i++) {
            let class_ = classes[i];
            if (class_.version < dbClassVersion) {
                console.log(`Updating ${school} class ${class_.className} (${i + 1} of ${classes.length})`);
                if (class_.version < 1) {
                    console.log((await _classVersion1(db, school, class_.className, class_.term, class_.semester)).data.log);
                }
                if (class_.version < 2) {
                    console.log((await _classVersion2(db, school, class_.className, class_.term, class_.semester)).data.log);
                }
            }
        }
    }

    return {success: true};
};

const _getUser = async (db, username, projection, additionalQuery) => {
    let query = {username: username};
    if (!!additionalQuery) {
        Object.assign(query, additionalQuery);
    }
    if (!!projection) {
        projection.username = 1;
    }
    let user = await db.collection(USERS_COLLECTION_NAME).findOne(query, projection);
    if (!user) {
        return {
            success: false,
            data: {log: `No user found with given parameters: username=${username}${!!additionalQuery ? `, additionalQuery=${JSON.stringify(additionalQuery)}` : ``}`}
        };
    }
    return {success: true, data: {value: user}};
};

const _getClass = async (db, school, className, term, semester, projection, additionalQuery) => {
    if (!Object.values(Schools).includes(school)) return {success: false, data: {log: `Invalid school ${school}`}};
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

const _getAllUsers = async (db, projection) => {
    return {success: true, data: {value: await db.collection(USERS_COLLECTION_NAME).find({}, projection).toArray()}};
};

const _getAllClasses = async (db, school, projection) => {
    if (!Object.values(Schools).includes(school)) return {success: false, data: {log: `Invalid school ${school}`}};
    return {
        success: true,
        data: {value: await db.collection(classesCollection(school)).find({}, projection).toArray()}
    };
};

const _getChartData = async (db) => {
    if (isNotToday(lastUpdatedCharts)) {
        let projection = {
            loggedIn: 1, "alerts.lastUpdated": 1, "personalInfo.graduationYear": 1
        };
        let allUsers = (await _getAllUsers(db, projection)).data.value;
        let loginDates = allUsers.map(u => u.loggedIn.map(d => {
            let date = new Date(d);
            return new Date(date.getFullYear(), date.getMonth(), date.getDate());
        })).reduce((a, b) => a.concat(b)).filter(d => isNotToday(d));
        let syncDates = allUsers.map(u => u.alerts.lastUpdated.map(d => {
            let date = new Date(d.timestamp);
            return new Date(date.getFullYear(), date.getMonth(), date.getDate());
        })).reduce((a, b) => a.concat(b)).filter(d => isNotToday(d));
        loginDates = loginDates.concat(syncDates.filter(t => !loginDates.find(u => u.getTime() === t.getTime()))).sort((a, b) => a.getTime() - b.getTime());
        syncDates = syncDates.concat(loginDates.filter(t => !syncDates.find(u => u.getTime() === t.getTime()))).sort((a, b) => a.getTime() - b.getTime());
        loginData = [];
        for (let j = 0; j < loginDates.length; j++) {
            let r = loginData.find(d => d.x.getTime() === loginDates[j].getTime());
            if (r) {
                r.y++;
            } else {
                loginData.push({x: loginDates[j], y: 1});
            }
        }
        let uniqueLoginDates = allUsers.map(user => [...new Set(user.loggedIn.map(loggedIn => {
            let date = new Date(loggedIn);
            return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
        }))].map(loggedIn => new Date(loggedIn))).reduce((a, b) => a.concat(b));
        uniqueLoginDates = uniqueLoginDates.concat(loginDates.filter(time => !uniqueLoginDates.find(anotherTime => anotherTime.getTime() === time.getTime())));
        uniqueLoginDates = uniqueLoginDates.filter(d => isNotToday(d));
        uniqueLoginDates.sort((a, b) => a.getTime() - b.getTime());
        uniqueLoginData = [];
        for (let j = 0; j < uniqueLoginDates.length; j++) {
            let r = uniqueLoginData.find(d => d.x.getTime() === uniqueLoginDates[j].getTime());
            if (r) {
                r.y++;
            } else {
                uniqueLoginData.push({x: uniqueLoginDates[j], y: 1});
            }
        }
        syncData = [];
        for (let j = 0; j < syncDates.length; j++) {
            let r = syncData.find(d => d.x.getTime() === syncDates[j].getTime());
            if (r) {
                r.y++;
            } else {
                syncData.push({x: syncDates[j], y: 1});
            }
        }
        userData = loginData.map(t => ({
            x: t.x, y: allUsers.filter(u => {
                let date = new Date(Math.min(...u.loggedIn));
                return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() <= t.x.getTime();
            }).length
        }));
        activeUsersData = loginData.map(t => ({
            x: t.x, y: allUsers.filter(u => u.loggedIn.some(v => {
                let vDate = new Date(v);
                let vTime = new Date(vDate.getFullYear(), vDate.getMonth(), vDate.getDate()).getTime();
                return (vTime <= t.x.getTime()) && (vTime >= (t.x.getTime() - (14 * 24 * 60 * 60 * 1000)));
            })).length
        }));
        let today = new Date();
        let seniorYear = today.getFullYear() + (today.getMonth() > 4 ? 1 : 0);
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
    }

    lastUpdatedCharts = new Date();
    return {
        success: true, data: {
            loginData: loginData,
            uniqueLoginData: uniqueLoginData,
            syncData: syncData,
            userData: userData,
            activeUsersData: activeUsersData,
            gradData: gradData
        }
    };
};

const _userArchived = async (db, {username, schoolUsername}, includeFullUser = false) => {
    let projection = includeFullUser ? {} : {username: 1};
    let userExists = await db.collection(ARCHIVED_USERS_COLLECTION_NAME).findOne({$or: [{username: username}, {schoolUsername: schoolUsername}]}, projection);
    if (!!userExists) {
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

const _archiveUser = async (db, username) => {
    let res = await _getUser(db, username);
    if (!res.success) {
        return res;
    }
    await db.collection(ARCHIVED_USERS_COLLECTION_NAME).insertOne(res.data.value);
    let res2 = await _removeUser(db, username);
    if (!res2.success) {
        return res2;
    }
    return {success: true, data: {log: `Archived user ${username}.`, message: "Archived user."}};
};

const _getAllArchivedUsers = async (db) => {
    return {success: true, data: {value: await db.collection(ARCHIVED_USERS_COLLECTION_NAME).find({}).toArray()}};
};

const _unArchiveUser = async (db, username) => {
    let res = await _userArchived(db, username, true);
    if (!res.success) {
        return res;
    }
    let res2 = await __addUser(db, res.data.value);
    if (!res2.success) {
        return res2;
    }
    let res3 = await _removeUserFromArchive(db, username);
    if (!res3.success) {
        return res3;
    }
    return {success: true, data: {log: `Unarchived user ${username}.`, message: "Unarchived user."}};
};

const _removeUser = async (db, username) => {
    let res = await db.collection(USERS_COLLECTION_NAME).deleteOne({
                                                                       username: username
                                                                   });
    if (res.deletedCount === 1) {
        return {success: true, data: {log: `Deleted user ${username}.`, message: "Deleted user."}};
    }
    return {
        success: false, data: {
            log: `Could not delete user with given parameters: username=${username}`,
            message: "User could not be deleted"
        }
    };
};

const _removeUserFromArchive = async (db, username) => {
    let res = await db.collection(ARCHIVED_USERS_COLLECTION_NAME).deleteOne({
                                                                                username: username
                                                                            });
    if (res.deletedCount === 1) {
        return {success: true, data: {log: `Deleted archived user ${username}.`, message: "Deleted archived user."}};
    }
    return {
        success: false, data: {
            log: `Could not delete archived user with given parameters: username=${username}`,
            message: "Archived user could not be deleted"
        }
    };
};

const _getMostRecentTermData = async (db, username) => {
    let res = await _getUser(db, username, {grades: 1, school: 1});
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
            success: false, data: {value: {term: false, semester: false}, log: `User ${user.username} has no grades!`}
        };
    }
    let term = terms[terms.map(t => parseInt(t.substring(0, 2))).reduce((maxIndex, term, index, arr) => term > arr[maxIndex] ? index : maxIndex, 0)];
    if (user.school === Schools.BISV) {
        return {success: true, data: {value: {term: term, semester: "_"}}};
    }
    let semesters = Object.keys(grades[term]);
    let semester = semesters[semesters.map(s => parseInt(s.substring(1))).reduce((maxIndex, semester, index, arr) => semester > arr[maxIndex] ? index : maxIndex, 0)];
    return {success: true, data: {value: {term: term, semester: semester}}};
};

const _login = async (db, username, password) => {
    return new Promise(async resolve => {
        let res = await _userExists(db, {username: username});
        if (!res.success) {
            return resolve({success: false, data: {message: "Invalid credentials."}});
        }
        let user = res.data.value;
        bcrypt.compare(password, user.password, (err, success) => {
            if (err) {
                return resolve({success: false, data: {log: err, message: "Something went wrong"}});
            }
            if (!success) {
                return resolve({
                                   success: false,
                                   data: {log: `Login failed for ${username}`, message: "Incorrect Graderoom password."}
                               });
            }
            return resolve({
                               success: true,
                               data: {log: `Login success for ${username}`, message: "Login Successful", value: user}
                           });
        });
    });
};

const _setLoggedIn = async (db, username) => {
    let res = await db.collection(USERS_COLLECTION_NAME).updateOne({username: username}, {$push: {loggedIn: Date.now()}});
    if (res.matchedCount === 1) {
        return {success: true};
    }
    return {success: false};
};

const _encryptAndStoreSchoolPassword = async (db, username, schoolPassword, password) => {
    let res = await _login(db, username, password);
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

    await db.collection(USERS_COLLECTION_NAME).updateOne({username: username}, {$set: {schoolPassword: encryptedPass}});
    return {success: true, data: {log: `Stored school password for ${username}`}};
};

const _decryptAndGetSchoolPassword = async (db, username, password) => {
    let res = await _login(db, username, password);
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

const _acceptTerms = async (db, username) => {
    let res = await db.collection(USERS_COLLECTION_NAME).updateOne({username: username}, {$set: {"alerts.termsLastSeen": Date.now()}});
    if (res.matchedCount === 1) {
        return {success: true, data: {log: `Accepted terms for ${username}`}};
    }
    return {success: false, data: {log: `Error accepting terms for ${username}`}};
};

const _acceptPrivacyPolicy = async (db, username) => {
    let res = await db.collection(USERS_COLLECTION_NAME).updateOne({username: username}, {$set: {"alerts.policyLastSeen": Date.now()}});
    if (res.matchedCount === 1) {
        return {success: true, data: {log: `Accepted policy for ${username}`}};
    }
    return {success: false, data: {log: `Error accepting policy for ${username}`}};
};

const _setRemoteAccess = async (db, username, value) => {
    let allowedValues = ["allowed", "denied"];
    if (!allowedValues.includes(value)) {
        return {success: false, data: {message: "Something went wrong", log: `Invalid remote access value: ${value}`}};
    }
    let res = await db.collection(USERS_COLLECTION_NAME).updateOne({username: username}, {$set: {"alerts.remoteAccess": value}});
    if (res.matchedCount === 1) {
        return {success: true, data: {log: `Set remote access for ${username} to ${value}`}};
    }
    return {success: false, data: {log: `Error setting remote access for ${username} to ${value}`}};
};

const _setPersonalInfo = async (db, username, firstName, lastName, graduationYear) => {
    let school = (await _getUser(db, username)).data.value.school;
    if (([!!firstName, !!lastName || (school === Schools.BISV && lastName === ""), !!graduationYear || graduationYear === 0]).filter(a => a).length !== 1) {
        return {success: false, data: {log: `Invalid personal info for ${username}`, message: "Something went wrong"}};
    }
    let nameRegex = new RegExp("^[a-zA-Z]*$");
    if (!!firstName) {
        if (nameRegex.test(firstName)) {
            let res = await db.collection(USERS_COLLECTION_NAME).updateOne({username: username}, {$set: {"personalInfo.firstName": firstName}});
            if (res.matchedCount === 1) {
                return {success: true, data: {message: "Updated first name"}};
            }
            return {
                success: false,
                data: {log: `Failed to set ${firstName} as first name for ${username}`, message: "Something went wrong"}
            };
        }
        return {success: false, data: {message: "First name must contain only letters"}};
    } else if (!!lastName || (school === Schools.BISV && lastName === "")) {
        if (nameRegex.test(lastName)) {
            let res = await db.collection(USERS_COLLECTION_NAME).updateOne({username: username}, {$set: {"personalInfo.lastName": lastName}});
            if (res.matchedCount === 1) {
                return {success: true, data: {message: "Updated last name"}};
            }
            return {
                success: false,
                data: {log: `Failed to set ${lastName} as last name for ${username}`, message: "Something went wrong"}
            };
        }
    } else if (!!graduationYear || graduationYear === 0) {
        if (school === Schools.BELL) {
            return {success: false, data: {message: "Changing graduation year is not supported"}};
        }

        if (typeof graduationYear !== "number") {
            return {success: false, data: {message: "Graduation year must be a number"}};
        }
        let res = await db.collection(USERS_COLLECTION_NAME).updateOne({username: username}, {$set: {"personalInfo.graduationYear": graduationYear}});
        if (res.matchedCount === 1) {
            return {success: true, data: {message: "Updated graduation year"}};
        }
        return {
            success: false,
            data: {log: `Failed to set ${graduationYear} as graduation year for ${username}`, message: "Something went wrong"}
        }
    }
};

const _setShowNonAcademic = async (db, username, value) => {
    if (typeof value !== "boolean") {
        return {
            success: false, data: {message: "Something went wrong", log: `Invalid showNonAcademic value: ${value}`}
        };
    }
    let res = await db.collection(USERS_COLLECTION_NAME).updateOne({username: username}, {$set: {"appearance.showNonAcademic": value}});
    if (res.matchedCount === 1) {
        return {success: true, data: {log: `Set showNonAcademic to ${value} for ${username}`}};
    }
    return {success: false, data: {log: `Error setting showNonAcademic to ${value} for ${username}`}};
};

const _setRegularizeClassGraphs = async (db, username, value) => {
    if (typeof value !== "boolean") {
        return {
            success: false,
            data: {message: "Something went wrong", log: `Invalid regularizeClassGraphs value: ${value}`}
        };
    }
    let res = await db.collection(USERS_COLLECTION_NAME).updateOne({username: username}, {$set: {"appearance.regularizeClassGraphs": value}});
    if (res.matchedCount === 1) {
        return {success: true, data: {log: `Set regularizeClassGraphs to ${value} for ${username}`}};
    }
    return {success: false, data: {log: `Error setting regularizeClassGraphs to ${value} for ${username}`}};
};

const _setWeightedGPA = async (db, username, value) => {
    if (typeof value !== "boolean") {
        return {success: false, data: {message: "Something went wrong", log: `Invalid weightedGPA value: ${value}`}};
    }
    let res = await db.collection(USERS_COLLECTION_NAME).updateOne({username: username}, {$set: {"appearance.weightedGPA": value}});
    if (res.matchedCount === 1) {
        return {success: true, data: {log: `Set weightedGPA to ${value} for ${username}`}};
    }
    return {success: false, data: {log: `Error setting weightedGPA to ${value} for ${username}`}};
};

const _setTheme = async (db, username, theme, darkModeStart, darkModeFinish, seasonalEffects, blurEffects) => {
    let res = await _userExists(db, {username: username});
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
        message = "Dark theme enabled from " + darkModeStart.toLocaleTimeString() + " to " + darkModeFinish.toLocaleTimeString() + ".";
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
    let res2 = await db.collection(USERS_COLLECTION_NAME).updateOne({username: username}, {
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

const _setShowMaxGPA = async (db, username, value) => {
    if (typeof value !== "boolean") {
        return {success: false, data: {message: "Something went wrong", log: `Invalid showMaxGPA value: ${value}`}};
    }
    let res = await db.collection(USERS_COLLECTION_NAME).updateOne({username: username}, {$set: {"appearance.showMaxGPA": value}});
    if (res.matchedCount === 1) {
        return {success: true, data: {log: `Set showMaxGPA to ${value} for ${username}`}};
    }
    return {success: false, data: {log: `Error setting showMaxGPA to ${value} for ${username}`}};
};

const _setColorPalette = async (db, username, preset, shuffle) => {
    if (typeof shuffle !== "boolean") {
        return {success: false, data: {log: `Invalid shuffle value: ${shuffle}`}};
    }
    let light, saturation, hues = [0, 30, 60, 120, 180, 240, 270, 300, 330, 15, 45, 90, 150, 210, 255, 285, 315, 345];
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
        default:
            return {success: false, message: "Invalid preset"};
    }
    let classColors = hues.map(h => chroma({h: h, s: saturation, l: light}).hex());
    if (shuffle) {
        shuffleArray(classColors);
    }
    let res = await db.collection(USERS_COLLECTION_NAME).updateOne({username: username}, {
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

const _setEnableLogging = async (db, username, value) => {
    if (typeof value !== "boolean") {
        return {
            success: false, data: {
                message: "Invalid value", log: `Invalid enableLogging value: ${value}`, settings: {enableLogging: value}
            }
        };
    }
    let res = await db.collection(USERS_COLLECTION_NAME).updateOne({username: username}, {$set: {enableLogging: value}});
    if (res.matchedCount === 1) {
        return {
            success: true,
            data: {message: "Logging " + (value ? "enabled" : "disabled") + "!", settings: {enableLogging: value}}
        };
    }
    return {success: false, data: {message: "Invalid user"}};
};

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
    let res = await db.collection(USERS_COLLECTION_NAME).updateOne({username: username}, {$set: {"appearance.animateWhenUnfocused": value}});
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

const _setShowFps = async (db, username, value) => {
    if (typeof value !== "boolean") {
        return {
            success: false, data: {
                message: "Invalid value", log: `Invalid showFps value: ${value}`, settings: {showFps: value}
            }
        };
    }
    let res = await db.collection(USERS_COLLECTION_NAME).updateOne({username: username}, {$set: {"appearance.showFps": value}});
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

const _changePassword = async (db, username, oldPassword, newPassword) => {
    return new Promise(async resolve => {
        let res = await _login(db, username, oldPassword);
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
            let res2 = await _decryptAndGetSchoolPassword(db, username, oldPassword);
            if (!res2.success) {
                return resolve(res2);
            }
            schoolPassword = res2.data.value;
        }
        bcrypt.hash(newPassword, ROUNDS_TO_GENERATE_SALT, async (err, hash) => {
            if (err) {
                return resolve({success: false, data: {log: err, message: "Something went wrong"}});
            }
            let res3 = await db.collection(USERS_COLLECTION_NAME).updateOne({username: username}, {$set: {password: hash}});
            if (res3.matchedCount === 0) {
                return resolve({
                                   success: false,
                                   data: {log: `Error updating password`, message: "Something went wrong"}
                               });
            }
            if (schoolPassword) {
                let res4 = await _encryptAndStoreSchoolPassword(db, username, schoolPassword, newPassword);
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

const _changeSchoolEmail = async (db, username, schoolUsername) => {
    let res = await _getUser(db, username, {school: 1, schoolUsername: 1});
    if (!res.success) {
        return res;
    }
    let user = res.data.value;
    if (!validateEmail(schoolUsername, user.school)) {
        return {success: false, data: {message: "This must be your school email."}};
    }
    if (user.schoolUsername !== schoolUsername && await _userExists(db, {schoolUsername: schoolUsername})) {
        return {success: false, data: {message: "This email is already associated with an account."}};
    }
    let {firstName, lastName, graduationYear} = getPersonalInfo(schoolUsername, user.school);
    let res2 = await db.collection(USERS_COLLECTION_NAME).updateOne({username: username}, {
        $set: {
            schoolUsername: schoolUsername,
            personalInfo: {firstName: firstName, lastName: lastName, graduationYear: graduationYear}
        }
    });
    if (res2.matchedCount === 0) {
        return {success: false, data: {log: `Error updating school email`, message: "Something went wrong"}};
    }
    return {success: true, data: {log: `Changed school username for ${username}`, message: "School Email Updated"}};
};

const _disableGradeSync = async (db, username) => {
    let res = await db.collection(USERS_COLLECTION_NAME).updateOne({username: username}, {$unset: {schoolPassword: ""}});
    if (res.matchedCount === 1) {
        return {success: true, data: {log: `Disabled GradeSync for ${username}`}};
    }
    return {success: false, data: {log: `Error disabling GradeSync for ${username}`}};
};

const _makeAdmin = async (db, username) => {
    let res = await db.collection(USERS_COLLECTION_NAME).updateOne({username: username}, {$set: {isAdmin: true}});
    if (res.matchedCount === 1) {
        return {success: true, data: {log: `Made ${username} admin`, message: "Made user admin"}};
    }
    return {success: false, data: {log: `Error making ${username} admin`, message: "Something went wrong"}};
};

const _removeAdmin = async (db, username, requester) => {
    if (username === requester) {
        return {
            success: false, data: {log: `Cannot remove own admin for ${username}`, message: "Cannot remove own admin"}
        };
    }
    let res = await db.collection(USERS_COLLECTION_NAME).updateOne({username: username}, {$set: {isAdmin: false}});
    if (res) {
        return {success: true, data: {log: `Made ${username} not admin`, message: "Made user not admin"}};
    }
    return {success: false, data: {log: `Error making ${username} not admin`, message: "Something went wrong"}};
};

const _updateGrades = async (db, username, schoolPassword, userPassword, gradeSync) => {
    let res = await _getUser(db, username, {grades: 1, school: 1, updatedGradeHistory: 1, schoolUsername: 1});
    if (!res.success) {
        return res;
    }
    let user = res.data.value;
    let {term: oldTerm, semester: oldSemester} = __getMostRecentTermData(user).data.value;
    let termDataIfLocked = {term: oldTerm, semester: oldSemester};
    let dataIfLocked = "";
    if (oldTerm && oldSemester) {
        dataIfLocked = user.grades[oldTerm][oldSemester].map(class_data => _.omit(class_data, ["grades"]));
    } else {
        termDataIfLocked = "";
    }
    let _stream = new stream.Readable({
                                          objectMode: true, read: () => {
        }
                                      });

    _stream.on("data", async (data) => {
        if ("success" in data) {
            if (!data.success) {
                if (data.message !== "Incorrect login details." && gradeSync) {
                    let encryptResp = await _encryptAndStoreSchoolPassword(db, username, schoolPassword, userPassword);
                    if (!encryptResp.success) {
                        await _setSyncStatus(db, username, SyncStatus.FAILED);
                        socketManager.emitToRoom(username, SYNC_PURPOSE, "fail", encryptResp.data.message);
                        return;
                    }
                }
                if (data.message === "Your account is no longer active.") {
                    await _setSyncStatus(db, username, SyncStatus.ACCOUNT_INACTIVE);
                } else if (data.message === "No class data.") {
                    await _setSyncStatus(db, username, SyncStatus.NO_DATA);
                    data.message = "No PowerSchool grades found for this term.";
                } else {
                    await _setSyncStatus(db, username, SyncStatus.FAILED);
                }
                socketManager.emitToRoom(username, SYNC_PURPOSE, "fail", {
                    gradeSyncEnabled: gradeSync, message: data.message
                });
            } else {
                let newTerm = Object.keys(data.new_grades)[0];
                let newSemester = Object.keys(data.new_grades[newTerm])[0];
                if (!(newTerm in user.grades)) {
                    await db.collection(USERS_COLLECTION_NAME).updateOne({username: username}, {$set: {[`grades.${newTerm}`]: {}}});
                }
                let newGrades = data.new_grades[newTerm][newSemester];
                let newClasses = newGrades.map(c => c.class_name);
                let oldPSAIDs = [];
                let oldGrades;
                if (newTerm in user.grades && newSemester in user.grades[newTerm]) {
                    oldGrades = user.grades[newTerm][newSemester];
                    // Filter out classes that we don't have anymore
                    // Idk how this would happen but it was in the code
                    oldGrades = oldGrades.filter(c => newClasses.includes(c.class_name));

                    // filtering id => !!id removes undefined psaids (before we scraped them)
                    // Idk if this is relevant but I'm keeping it for now TODO
                    oldPSAIDs = oldGrades.map(c => c.grades.map(g => g.psaid)).filter(id => !!id);
                }
                let newPSAIDs = newGrades.map(c => c.grades.map(g => g.psaid));

                // Make the two arrays the same length
                oldPSAIDs.push(...Array(newPSAIDs.length - oldPSAIDs.length).fill([]));

                // Calculate changes
                let added = Object.fromEntries(newPSAIDs.map((classPSAIDs, index) => [newGrades[index].class_name, newPSAIDs[index]]).filter(data => data[1].length));
                let modified = {};
                let removed = {};
                let overall = {};

                if (oldGrades) {
                    added = Object.fromEntries(newPSAIDs.map((classPSAIDs, index) => [newGrades[index].class_name, newPSAIDs[index].filter(psaid => !oldPSAIDs[index].includes(psaid))]).filter(data => data[1].length));
                    modified = Object.fromEntries(oldGrades.map((classData, index) => [classData.class_name, classData.grades.filter(assignmentData => newPSAIDs[index].includes(assignmentData.psaid) && !_.isEqual(assignmentData, newGrades[index].grades.find(assignment => assignment.psaid === assignmentData.psaid)))]).filter(data => data[1].length));
                    removed = Object.fromEntries(oldGrades.map((classData, index) => [classData.class_name, classData.grades.filter(assignmentData => assignmentData.psaid && !newPSAIDs[index].includes(assignmentData.psaid))]).filter(data => data[1].length));
                    overall = Object.fromEntries(oldGrades.map((classData, index) => {
                        let clone = Object.assign({}, classData);
                        delete clone.grades;
                        delete clone.class_name;
                        let newClone = Object.assign({}, newGrades[index]);
                        delete newClone.grades;
                        delete newClone.class_name;
                        clone.ps_locked = newClone.ps_locked;
                        return [classData.class_name, Object.fromEntries(Object.entries(clone).filter(([k, v]) => newClone[k] !== v || k === "ps_locked"))];
                    }).filter(data => Object.keys(data[1]).length));
                }

                let ps_locked = Object.values(overall).filter(o => o.ps_locked === true).length !== 0;
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
                await db.collection(USERS_COLLECTION_NAME).updateOne({username: username}, {$set: {[`grades.${newTerm}.${newSemester}`]: newGrades}});
                if (user.school === Schools.BISV) {
                    let newWeights = data.new_weights[newTerm][newSemester];
                    await db.collection(USERS_COLLECTION_NAME).updateOne({username: username}, {$set: {[`weights.${newTerm}.${newSemester}`]: newWeights}});
                }
                await _initAddedAssignments(db, username);
                await _initWeights(db, username);
                await _initEditedAssignments(db, username);
                await _updateClassesForUser(db, username, newTerm, newSemester);

                let updateHistory = false;
                if ((newTerm !== oldTerm || newSemester !== oldSemester) || !user.updatedGradeHistory.length) {
                    await _resetSortData(db, username);
                    updateHistory = true;
                }

                let time = Date.now();
                await db.collection(USERS_COLLECTION_NAME).updateOne({username: username}, {
                    $set: {updatedInBackground: SyncStatus.ALREADY_DONE},
                    $push: {"alerts.lastUpdated": {timestamp: time, changeData: changeData, ps_locked: ps_locked}}
                });

                if (updateHistory) {
                    await _setSyncStatus(db, username, SyncStatus.HISTORY);
                    await _updateGradeHistory(db, username, schoolPassword);
                }

                await _setSyncStatus(db, username, SyncStatus.COMPLETE);
                socketManager.emitToRoom(username, SYNC_PURPOSE, "success", {message: "Updated grades!"});

                let _res = await _getUser(db, username, {
                    [`grades.${newTerm}.${newSemester}`]: 1,
                    [`weights.${newTerm}.${newSemester}`]: 1,
                    "alerts.lastUpdated": {$slice: -1}
                });
                let _user = _res.data.value;

                if (gradeSync) {
                    let encryptResp = await _encryptAndStoreSchoolPassword(db, username, schoolPassword, userPassword);
                    if (!encryptResp.success) {
                        res.status(400).send(encryptResp.data.message);
                        return;
                    }
                }

                socketManager.emitToRoom(username, SYNC_PURPOSE, "success", {
                    gradeSyncEnabled: gradeSync,
                    message: data.message,
                    grades: JSON.stringify(_user.grades[newTerm][newSemester].filter(grades => !(["CR", false]).includes(grades.overall_letter) || grades.grades.length)),
                    weights: JSON.stringify(_user.weights[newTerm][newSemester]),
                    updateData: JSON.stringify(_user.alerts.lastUpdated.slice(-1)[0])
                });
            }
        } else {
            await _setSyncStatus(db, username, SyncStatus.UPDATING);
            socketManager.emitToRoom(username, SYNC_PURPOSE, "progress", data);
        }
    });

    scraper.loginAndScrapeGrades(_stream, user.school, user.schoolUsername, schoolPassword, dataIfLocked, termDataIfLocked);

    return {success: true, data: {stream: _stream}};
};

const _updateGradeHistory = async (db, username, schoolPassword) => {
    let res = await _getUser(db, username, {grades: 1, weights: 1});
    if (!res.success) {
        return res;
    }
    let user = res.data.value;
    let _stream = new stream.Readable({
                                          objectMode: true, read: () => {
        }
                                      });
    _stream.on("data", async (data) => {
        console.log(data);
        let changeData = {};
        if ("success" in data) {
            if (data.success) {
                let currentYears = Object.keys(user.grades);
                let newYears = Object.keys(data.new_grades);
                let school = user.school;
                switch (school) {
                    case Schools.BISV:
                        let newWeights = data.new_weights;
                        let term = Object.keys(newWeights)[0];
                        await db.collection(USERS_COLLECTION_NAME).updateOne({username: username}, {$set: {[`weights.${term}._`]: newWeights[term]._}});
                        break;
                    case Schools.BELL:
                        let currentWeights = user.weights;
                        for (let i = 0; i < newYears.length; i++) {
                            if (!(newYears[i] in currentWeights)) {
                                currentWeights[newYears[i]] = {};
                                let newSemesters = Object.keys(data.new_grades[newYears[i]]);
                                for (let j = 0; j < newSemesters.length; j++) {
                                    currentWeights[newYears[i]][newSemesters[j]] = [];
                                }
                            } else {
                                let currentSemesters = Object.keys(currentWeights[newYears[i]]);
                                let newSemesters = Object.keys(data.new_grades[newYears[i]]);
                                for (let j = 0; j < newSemesters.length; j++) {
                                    if (!currentSemesters.includes(newSemesters[j])) {
                                        currentWeights[newYears[i]][newSemesters[j]] = [];
                                    }
                                }
                            }
                            if (!currentYears.includes(newYears[i])) {
                                await db.collection(USERS_COLLECTION_NAME).updateOne({username: username}, {$set: {[`grades.${newYears[i]}`]: data.new_grades[newYears[i]]}});
                            } else {
                                let currentSemesters = Object.keys(user.grades[newYears[i]]);
                                let newSemesters = Object.keys(data.new_grades[newYears[i]]);
                                for (let j = 0; j < newSemesters.length; j++) {
                                    if (!currentSemesters.includes(newSemesters[j])) {
                                        await db.collection(USERS_COLLECTION_NAME).updateOne({username: username}, {$set: {[`grades.${newYears[i]}.${newSemesters[j]}`]: data.new_grades[newYears[i]][newSemesters[j]]}});
                                    } else {
                                        let newClasses = data.new_grades[newYears[i]][newSemesters[j]];
                                        let oldClasses = user.grades[newYears[i]][newSemesters[j]];
                                        for (let k = 0; k < newClasses.length; k++) {
                                            let className = newClasses[k].class_name;
                                            let oldClass = oldClasses?.find(c => c.class_name === className);
                                            if (oldClass && !newClasses[k].grades.length) {
                                                newClasses[k].grades = oldClass.grades;
                                            }
                                        }
                                        await db.collection(USERS_COLLECTION_NAME).updateOne({username: username}, {$set: {[`grades.${newYears[i]}.${newSemesters[j]}`]: newClasses}});

                                        let overall = {};
                                        if (oldClasses) {
                                            overall = Object.fromEntries(oldClasses.map((classData) => {
                                                let clone = Object.assign({}, classData);
                                                delete clone.grades;
                                                delete clone.class_name;
                                                delete clone.ps_locked;
                                                delete clone.student_id;
                                                delete clone.section_id;
                                                delete clone.teacher_name;
                                                let newClone = Object.assign({}, newClasses.find(g => g.class_name === classData.class_name));
                                                delete newClone.grades;
                                                delete newClone.class_name;
                                                delete newClone.ps_locked;
                                                delete newClone.teacher_name;
                                                return [classData.class_name, Object.fromEntries(Object.entries(clone).filter(([k, v]) => newClone[k] !== v))];
                                            }).filter(data => Object.keys(data[1]).length));
                                        }
                                        changeData = {
                                            added: {}, modified: {}, removed: {}, overall: overall
                                        };
                                    }
                                }
                            }
                        }
                        await _initWeights(db, username);
                }
                let time = Date.now();
                await db.collection(USERS_COLLECTION_NAME).updateOne({username: username}, {
                    $push: {
                        updatedGradeHistory: time,
                        "alerts.lastUpdated": {timestamp: time, changeData: changeData, ps_locked: false}
                    }
                });
                await _initAddedAssignments(db, username);
                await _initEditedAssignments(db, username);
                await _updateClassesForUser(db, username);

                socketManager.emitToRoom(username, "sync", "success-history", {});
            } else {
                socketManager.emitToRoom(username, "sync", "fail-history", {message: data.message});
            }
        } else {
            socketManager.emitToRoom(username, "sync", "progress-history", data);
        }
    });

    scraper.loginAndScrapeGrades(_stream, user.school, user.schoolUsername, schoolPassword, "", "", "true");
};

const _updateSortData = async (db, username, sortData) => {
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
    let res = await db.collection(USERS_COLLECTION_NAME).updateOne({username: username}, {
        $set: {
            "sortingData": {dateSort: dateSort, categorySort: categorySort}
        }
    });
    if (res.matchedCount === 1) {
        return {success: true};
    }
    return {success: false};
};

const _resetSortData = async (db, username) => {
    await db.collection(USERS_COLLECTION_NAME).updateOne({username: username}, {
        $set: {
            sortingData: {
                dateSort: [], categorySort: []
            }
        }
    });

    return {success: true};
};

const _userHasSemester = async (db, username, term, semester) => {
    let res = await _getUser(db, username, {grades: 1});
    if (!res.success) {
        return res;
    }

    let user = res.data.value;
    return {
        success: true,
        data: {value: term in user.grades && semester in user.grades[term] && user.grades[term][semester].filter(grades => !(["CR", false]).includes(grades.overall_letter) || grades.grades.length).length}
    };
};

const _initAddedAssignments = async (db, username) => {
    let res = await _getUser(db, username, {addedAssignments: 1, grades: 1});
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

    await db.collection(USERS_COLLECTION_NAME).updateOne({username: username}, {$set: {addedAssignments: temp}});
    return {success: true};
};

const _initEditedAssignments = async (db, username) => {
    let res = await _getUser(db, username, {editedAssignments: 1, grades: 1});
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

    await db.collection(USERS_COLLECTION_NAME).updateOne({username: username}, {$set: {editedAssignments: temp}});
    return {success: true};
};

const _initWeights = async (db, username) => {
    let res = await _getUser(db, username, {weights: 1, grades: 1});
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
                    temp[years[i]][semesters[j]][k].weights = _.clone(current[years[i]][semesters[j]][existing].weights);
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

    await db.collection(USERS_COLLECTION_NAME).updateOne({username: username}, {$set: {weights: temp}});
    return {success: true};
};

const _updateClassesForUser = async (db, username, term, semester, className) => {
    let res = await _getUser(db, username, {grades: 1, school: 1, weights: 1});
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
                if (!(await _dbContainsClass(db, user.school, _term, _semester, _className, teacherName)).success) {
                    await _addDbClass(db, user.school, _term, _semester, _className, teacherName);
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

                let res2 = await _dbContainsClass(db, user.school, _term, _semester, _className, teacherName);
                if (res2.success) {
                    let dbClass = res2.data.value;
                    let dbTeacher = dbClass.teachers.find(teacher => teacher.teacherName === teacherName);
                    // Update weights from classes db if not custom
                    if (!custom && (dbTeacher.hasWeights === false || Object.keys(dbTeacher.weights).length > 0)) {
                        newWeights = dbTeacher.weights;
                        hasWeights = dbTeacher.hasWeights;
                        ``;
                    } else {
                        newWeights = Object.fromEntries(neededWeights.map((neededWeight) => [neededWeight, currentWeights.weights[neededWeight] ?? null]));

                        //Set to point-based if only one category exists (& category is null)
                        let values = Object.values(newWeights);
                        if (values.length === 1 && values[0] == null) {
                            hasWeights = false;
                        }

                        //Add user's weights as suggestions
                        await _addWeightsSuggestion(db, username, _term, _semester, _className, teacherName, hasWeights, newWeights);

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
                await _updateWeightsForClass(db, username, _term, _semester, _className, hasWeights, newWeights, custom, false);
            }
        }
    }

    return {success: true};
};

const _updateAddedAssignments = async (db, username, addedAssignments, term, semester) => {
    let res = await _getUser(db, username, {addedAssignments: 1, [`grades.${term}.${semester}`]: 1});
    if (!res.success) {
        return res;
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

    if (addedAssignments.length !== grades[term][semester].length) {
        return {success: false, data: {prodLog: `addedAssignments has invalid length username=${username}`}};
    }

    let allowedKeys = ["assignment_name", "date", "category", "grade_percent", "points_gotten", "points_possible", "exclude"];
    let allowedTypes = {
        "assignment_name": ["string"],
        "date": ["string"],
        "category": ["string"],
        "grade_percent": ["number", "boolean"],
        "points_gotten": ["number", "boolean"],
        "points_possible": ["number", "boolean"],
        "exclude": ["boolean"]
    };

    for (let i = 0; i < addedAssignments.length; i++) {
        for (let j = 0; j < addedAssignments[i].data.length; j++) {
            let assignment = addedAssignments[i].data[j];
            if (Object.keys(assignment).length !== allowedKeys.length) {
                return {success: false, data: {prodLog: `addedAssignments has the wrong number of keys`}};
            }
            if (!Object.keys(assignment).every((k) => allowedKeys.includes(k))) {
                return {success: false, data: {prodLog: `addedAssignments has invalid keys`}};
            }
            if (!Object.entries(assignment).every(([h, k]) => allowedTypes[h].includes(typeof k))) {
                return {success: false, data: {prodLog: `addedAssignments has invalid values`}};
            }
        }
    }

    await db.collection(USERS_COLLECTION_NAME).updateOne({username: username}, {$set: {[`addedAssignments.${term}.${semester}`]: addedAssignments}});
    return {success: true};
};

const _updateEditedAssignments = async (db, username, editedAssignments, term, semester) => {
    let res = await _getUser(db, username, {editedAssignments: 1, [`grades.${term}.${semester}`]: 1});
    if (!res.success) {
        return res;
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

    if (editedAssignments.length !== grades[term][semester].length) {
        return {success: false, data: {prodLog: `editedAssignments has invalid length username=${username}`}};
    }

    let allowedKeys = ["assignment_name", "date", "category", "grade_percent", "points_gotten", "points_possible", "exclude"];
    let allowedTypes = {
        "assignment_name": "string",
        "category": "string",
        "grade_percent": "number",
        "points_gotten": "number",
        "points_possible": "number",
        "exclude": "boolean"
    };

    for (let i = 0; i < editedAssignments.length; i++) {
        let assignments = Object.values(editedAssignments[i].data);
        for (let j = 0; j < assignments.length; j++) {
            let assignment = assignments[j];
            if (!Object.keys(assignment).every((k) => allowedKeys.includes(k))) {
                return {success: false, data: {prodLog: `editedAssignments has invalid keys`}};
            }
            if (!Object.entries(assignment).every(([h, k]) => typeof k === allowedTypes[h] || k === null)) {
                return {success: false, data: {prodLog: `editedAssignments has invalid values`}};
            }
        }
    }

    let oldEditedAssignments = user.editedAssignments;
    if (!(term in oldEditedAssignments) || !(semester in oldEditedAssignments[term])) {
        return {
            success: false,
            data: {log: `Invalid parameters for updateEditedAssignments: username=${username}, term=${term}, semester=${semester}`}
        };
    }

    await db.collection(USERS_COLLECTION_NAME).updateOne({username: username}, {$set: {[`editedAssignments.${term}.${semester}`]: editedAssignments}});
    return {success: true};
};

const _getSyncStatus = async (db, username) => {
    let res = await _getUser(db, username, {updatedInBackground: 1});
    if (!res.success) {
        return res;
    }
    let user = res.data.value;
    let syncStatus = user.updatedInBackground;
    if (syncStatus === SyncStatus.COMPLETE) {
        await db.collection(USERS_COLLECTION_NAME).updateOne({username: username}, {$set: {updatedInBackground: SyncStatus.ALREADY_DONE}});
        return {success: true, data: {message: "Sync Complete!"}};
    } else if (syncStatus === SyncStatus.ALREADY_DONE) {
        return {success: true, data: {message: "Already Synced!"}};
    } else if (syncStatus === SyncStatus.NO_DATA) {
        return {success: false, data: {message: "No PowerSchool grades found for this term."}};
    } else if (syncStatus === SyncStatus.FAILED) {
        return {success: false, data: {message: "Sync Failed."}};
    } else if (syncStatus === SyncStatus.UPDATING) {
        return {success: false, data: {message: "Did not sync"}};
    } else if (syncStatus === SyncStatus.HISTORY) {
        return {success: false, data: {message: "Syncing History..."}};
    } else if (syncStatus === SyncStatus.ACCOUNT_INACTIVE) {
        return {success: false, data: {message: "Your account is no longer active."}};
    } else if (syncStatus === SyncStatus.NOT_SYNCING) {
        return {success: false, data: {message: "Not syncing"}};
    }
};

const _setSyncStatus = async (db, username, value) => {
    if (!Object.values(SyncStatus).includes(value)) {
        return {success: false, data: {log: `Invalid sync status: ${value}`}};
    }
    let res = await db.collection(USERS_COLLECTION_NAME).updateOne({username: username}, {$set: {updatedInBackground: value}});
    if (res.matchedCount === 1) {
        return {success: true, data: {log: `Set sync status for ${username} to ${value}`}};
    }
    return {success: false, data: {log: `Error setting sync status for ${username} to ${value}`}};
};

const _getWhatsNew = async (db, username) => {
    let res = await _getUser(db, username, {"alerts.latestSeen": 1});
    if (!res.success) {
        return res;
    }
    let user = res.data.value;
    let end = versionNameArray().indexOf(versionNameArray().find(v => v[1] === user.alerts.latestSeen));
    if (end < 2) {
        end = 2;
    }
    let result;
    if (_beta) {
        result = betaChangelogArray().slice(1, end).join("");
    } else {
        result = "";
        for (let i = 1; i < versionNameArray().length; i++) {
            if (versionNameArray()[i][0] !== "Beta") {
                if (i >= end && result) {
                    break;
                }
                result += changelogArray()[i];
            }
        }
    }
    return {success: true, data: {value: result}};
};

const _latestVersionSeen = async (db, username) => {
    let version;
    if (_beta) {
        version = versionNameArray()[1][1];
    } else {
        version = versionNameArray().find(v => v[0] !== "Beta" && v[0] !== "Known Issues")[1];
    }
    let res = await db.collection(USERS_COLLECTION_NAME).updateOne({username: username}, {$set: {"alerts.latestSeen": version}});
    if (res.matchedCount === 1) {
        return {success: true, data: {log: `Set latest seen for ${username} to ${version}`}};
    }
    return {success: false, data: {log: `Error setting latest seen for ${username} to ${version}`}};
};

const _updateTutorial = async (db, username, action) => {
    if (!tutorialKeys.includes(action)) {
        return {success: false, data: {log: `Invalid action: ${action}`}};
    }

    let res = await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {$set: {[`alerts.tutorialStatus.${action}`]: true}}, {returnDocument: "after"});
    return {success: true, data: {value: res.value.alerts.tutorialStatus}};
};

const _resetTutorial = async (db, username) => {
    let res = await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {
        $set: {
            "alerts.tutorialStatus": Object.fromEntries(tutorialKeys.map(key => [key, false]))
        }
    }, {returnDocument: "after"});
    return {success: true, data: {value: res.value.alerts.tutorialStatus}};
};

const _addBetaKey = async (db) => {
    let betaKey = makeKey(7);
    if ((await _betaKeyExists(db, betaKey)).success) {
        return {
            success: false, data: {log: `Beta key ${betaKey} already exists.`, message: "Beta key already exists."}
        };
    }
    let document = {
        betaKey: betaKey, claimed: false, claimedBy: ""
    };
    await db.collection(BETAKEYS_COLLECTION_NAME).insertOne(document);
    return {
        success: true, data: {log: `Added betaKey ${betaKey}`, message: `Beta Key ${betaKey} Added`, value: document}
    };
};

const _betaKeyExists = async (db, betaKey) => {
    let betaKeyExists = await db.collection(BETAKEYS_COLLECTION_NAME).findOne({betaKey: betaKey});
    if (!!betaKeyExists) {
        return {success: true, data: {log: `BetaKey ${betaKey} found`, value: betaKeyExists}};
    }
    return {
        success: false, data: {log: `No betaKey found with given parameters: betaKey=${betaKey}`}
    };
};

const _betaKeyValid = async (db, betaKey) => {
    let exists = await _betaKeyExists(db, betaKey);
    if (!exists.success) {
        return {success: false, data: {message: "Invalid beta key!"}};
    }
    if (exists.data.value.claimed) {
        return {success: false, data: {message: "Beta key already claimed!"}};
    }
    return {success: true, data: {message: "Valid key!"}};
};

const _getBetaKey = async (db, betaKey) => {
    let _betaKey = await db.collection(BETAKEYS_COLLECTION_NAME).findOne({betaKey: betaKey});
    if (!_betaKey) {
        return {success: false, data: {log: `Key not found: ${betaKey}`}};
    }
    return {success: true, data: {value: _betaKey}};
};

const _getAllBetaKeys = async (db) => {
    return {success: true, data: {value: await db.collection(BETAKEYS_COLLECTION_NAME).find({}).toArray()}};
};

const _claimBetaKey = async (db, betaKey, username) => {
    let res = await _getBetaKey(db, betaKey);
    if (!res.success) {
        return {success: false, data: {message: "Invalid beta key."}};
    }
    if (res.data.value.claimed) {
        return {
            success: false, data: {log: `Beta key ${betaKey} already claimed.`, message: "Beta key already claimed."}
        };
    }
    let res2 = await db.collection(BETAKEYS_COLLECTION_NAME).updateOne({$and: [{betaKey: betaKey}, {claimed: false}]}, {
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

const _joinBeta = async (db, username) => {
    let featureObject = betaFeatures();
    let res = await db.collection(USERS_COLLECTION_NAME).updateOne({username: username}, {$set: {betaFeatures: featureObject}});
    if (res.matchedCount === 1) {
        return {success: true, data: {log: `Joined beta for ${username}`}};
    }
    return {success: false, data: {log: `Error joining beta for ${username}`}};
};

const _updateBetaFeatures = async (db, username, features) => {
    let featureObject = betaFeatures(features);
    let res = await db.collection(USERS_COLLECTION_NAME).updateOne({username: username}, {$set: {betaFeatures: featureObject}});
    if (res.matchedCount === 1) {
        return {success: true, data: {log: `Updated beta features for ${username}`}};
    }
    return {success: false, data: {log: `Updated beta features for ${username}`}};
};

const _leaveBeta = async (db, username) => {
    let res = await db.collection(USERS_COLLECTION_NAME).updateOne({username: username}, {$set: {betaFeatures: {active: false}}});
    if (res.matchedCount === 1) {
        return {success: true, data: {log: `Left beta for ${username}`}};
    }
    return {success: false, data: {log: `Error leaving beta for ${username}`}};
};

const _checkPasswordResetToken = async (db, token) => {
    let user = await db.collection(USERS_COLLECTION_NAME).findOne({passwordResetToken: token});
    let valid = user && user.passwordResetTokenExpire > Date.now();
    let gradeSync = !!user.schoolPassword;
    return {success: true, data: {user: user, valid: valid, gradeSync: gradeSync}};
};

const _resetPasswordRequest = async (db, schoolUsername) => {
    let token = makeKey(20);

    let res = await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({schoolUsername: schoolUsername}, {
        $set: {
            passwordResetToken: token, passwordResetTokenExpire: Date.now() + 1000 * 60 * 60 * 24
        }
    }, {returnDocument: "after"});
    if (res.ok) {
        return {success: true, data: {user: res.value, token: token}};
    }
    return {success: false};
};

const _resetPassword = async (db, token, newPassword) => {
    return new Promise(async resolve => {
        let res = await _checkPasswordResetToken(db, token);
        let {user, valid, gradeSync} = res.data;
        if (!valid) {
            return resolve({success: false, data: {message: "Invalid token."}});
        }

        let message = validatePassword(newPassword);
        if (message) {
            return resolve({success: false, data: {message: message}});
        }

        if (gradeSync) {
            await _disableGradeSync(db, user.username);
        }

        let username = user.username;

        bcrypt.hash(newPassword, ROUNDS_TO_GENERATE_SALT, async (err, hash) => {
            if (err) {
                return resolve({success: false, data: {log: err, message: "Something went wrong"}});
            }
            let res3 = await db.collection(USERS_COLLECTION_NAME).updateOne({username: username}, {
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

const _clearTestDatabase = async (db) => {
    if (!_testing) {
        return {success: false, data: {log: `Cannot drop non-testing databases`}};
    }
    return {success: await db.dropDatabase(), data: {log: `Dropped test database`}};
};

const _addDbClass = async (db, school, term, semester, className, teacherName) => {
    if (!Object.values(Schools).includes(school)) return {success: false, data: {log: `Invalid school ${school}`}};
    let classData = await db.collection(classesCollection(school)).findOne({
                                                                               term: term,
                                                                               semester: semester,
                                                                               className: className
                                                                           }, {projection: {"teachers": 1, "_id": 1}});
    if (classData) { // class already exists
        if (classData.teachers.every(x => x.teacherName !== teacherName)) {
            await db.collection(classesCollection(school)).updateOne({_id: classData._id}, {$push: {"teachers": makeTeacher(teacherName)}});
        }
    } else { //class doesn't exist
        let catalogData = await catalog().findOne({class_name: className, school: school});
        await db.collection(classesCollection(school)).insertOne(makeClass(term, semester, className, teacherName, catalogData));
    }

    return {success: true, data: {log: `Added class ${term} / ${semester} / ${className} / ${teacherName}.`}};
};

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
    let res = await _getUser(db, username, {school: 1});
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
                                                                 _id: classData._id, "teachers.teacherName": teacherName
                                                             }, {
                                                                 $set: {"teachers.$.suggestions": suggestions}
                                                             });

    return {
        success: true,
        data: {log: `Added suggestion from ${username} to ${term} / ${semester} / ${className} / ${teacherName}.`}
    };
};

const _updateWeightsInClassDb = async (db, school, term, semester, className, teacherName, hasWeights, weights) => {
    if (!Object.values(Schools).includes(school)) return {success: false, data: {message: "Something went wrong", log: `Invalid school ${school}`}};
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
                                                                                             "teachers.$": 1, "_id": 1
                                                                                         }
                                                                                     })).value;

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
                                                                 _id: classData._id, "teachers.teacherName": teacherName
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

const _updateClassTypeInClassDb = async (db, school, term, semester, className, classType) => {
    if (!Object.values(Schools).includes(school)) return {success: false, data: {message: "Something went wrong", log: `Invalid school ${school}`}};
    if (!Constants.classTypes.includes(classType)) classType = null;
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

const _updateUCCSUClassTypeInClassDb = async (db, school, term, semester, className, classType) => {
    if (!Object.values(Schools).includes(school)) return {success: false, data: {message: "Something went wrong", log: `Invalid school ${school}`}};
    if (!Constants.uc_csuClassTypes.includes(classType)) classType = null;
    let res = await db.collection(classesCollection(school)).updateOne({
                                                                                  term: term,
                                                                                  semester: semester,
                                                                                  className: className
                                                                              }, {$set: {"uc_csuClassType": classType}});
    if (res.matchedCount === 0) {
        return {
            success: false, data: {
                message: "Something went wrong", log: `Failed to set UC/CSU class type of ${className} to ${classType}`
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

const _getMostRecentTermDataInClassDb = async (db, school) => {
    if (!Object.values(Schools).includes(school)) return {success: false, data: {log: `Invalid school ${school}`}};
    let res = (await db.collection(classesCollection(school)).find().sort({
                                                                              term: -1, semester: -1
                                                                          }).limit(1).toArray())[0];
    return {success: true, data: {value: {term: res.term, semester: res.semester}}};
};

const _dbContainsSemester = async (db, school, term, semester) => {
    if (!Object.values(Schools).includes(school)) return {success: false, data: {log: `Invalid school ${school}`}};
    let res = await db.collection(classesCollection(school)).findOne({term: term, semester: semester});
    return {success: res !== null, data: {value: res}};
};

const _dbContainsClass = async (db, school, term, semester, className, teacherName) => {
    if (!Object.values(Schools).includes(school)) return {success: false, data: {log: `Invalid school ${school}`}};
    let res = await db.collection(classesCollection(school)).findOne({
                                                                         term: term,
                                                                         semester: semester,
                                                                         className: className,
                                                                         "teachers.teacherName": teacherName
                                                                     });
    return {success: res !== null, data: {value: res}};
};

const _getAllClassData = async (db, school, term, semester) => {
    if (!Object.values(Schools).includes(school)) return {success: false, data: {log: `Invalid school ${school}`}};
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
    let res2 = await catalog().find({class_name: {$in: classNames}, school: school}).toArray();
    let catalogData = {};
    for (let data of res2) {
        catalogData[data.class_name] = data;
        delete data._id;
        delete catalogData[data.class_name].class_name;
    }
    return {success: true, data: {classData: allData, catalogData: catalogData}};
};

const _getTermsAndSemestersInClassDb = async (db, school) => {
    if (!Object.values(Schools).includes(school)) return {success: false, data: {log: `Invalid school ${school}`}};
    let termsAndSemesters = await db.collection(classesCollection(school)).aggregate([{
        $group: {
            _id: "$term", semesters: {$addToSet: "$semester"}
        }
    }, {$sort: {_id: 1}}]).toArray();
    termsAndSemesters = termsAndSemesters.map(x => [x._id, x.semesters.sort()]);
    return {success: true, data: {value: termsAndSemesters}};
};

const _updateWeightsForClass = async (db, username, term, semester, className, hasWeights, weights, custom = null, addSuggestion = true) => {
    //Get user
    let query = {[`grades.${term}.${semester}.class_name`]: className};
    let projection = {school: 1, [`grades.${term}.${semester}`]: 1, [`weights.${term}.${semester}`]: 1};
    let res = await _getUser(db, username, projection, query);
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
            data: {message: "Something went wrong", log: `Failed to update weights for ${username}. (1)`}
        };
    }
    let classIndex = user.grades[term][semester].findIndex(g => g.class_name === className);
    if (classIndex === -1) { //className in grades?
        return {
            success: false,
            data: {message: "Something went wrong", log: `Failed to update weights for ${username}. (2)`}
        };
    }
    teacherName = user.grades[term][semester][classIndex].teacher_name;

    //Verify term, semester, & className exist in weights
    if (!term in user.weights || !semester in user.weights[term] || user.weights[term][semester].length <= classIndex || user.weights[term][semester][classIndex].className !== className) { //term, semester, className in weights?
        return {
            success: false,
            data: {message: "Something went wrong", log: `Failed to update weights for ${username}. (3)`}
        };
    }
    currentWeights = user.weights[term][semester][classIndex].weights;

    //Verify classesDB contains class
    let res2 = await _dbContainsClass(db, school, term, semester, className, teacherName); //teacherName in classDb?
    if (!res2.data.value) {
        return {
            success: false,
            data: {message: "Something went wrong", prodLog: `Failed to update weights for ${username}. (4)`}
        };
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
        await _addWeightsSuggestion(db, username, term, semester, className, teacherName, hasWeights, weights);
    }

    //Validate & Modify Weights
    let modWeights;
    try {
        [hasWeights, modWeights] = fixWeights(hasWeights, Object.assign({}, currentWeights, weights));
    } catch (e) {
        return {
            success: false, data: {message: "Something went wrong", log: e}
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
    await db.collection(USERS_COLLECTION_NAME).updateOne({
                                                             username: username,
                                                             [`weights.${term}.${semester}.className`]: className
                                                         }, {
                                                             $set: {[`weights.${term}.${semester}.$`]: temp}
                                                         });

    if (custom) {
        return {
            success: true,
            data: {message: `Custom weight set for ${className}.`, log: `Custom weight set for ${className}.`}
        };
    }
    return {success: true, data: {message: `Reset weight for ${className}.`, log: `Reset weight for ${className}.`}};
    //Important: Do not change first word of message. It is used in frontend to determine if it is custom.
};

const _getRelevantClassData = async (db, username, term, semester) => {
    let res = await _getUser(db, username, {grades: 1, school: 1});
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
                                                                            overallPercent: c.overall_percent
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

            let rawData = await catalog().findOne({class_name: userClass.className, school: school});

            let classData = await db.collection(classesCollection(school)).findOne(query, {
                projection: projection
            });

            let teachers = (await db.collection(classesCollection(school)).findOne(query, {
                projection: {teachers: {teacherName: 1}}
            }))?.teachers.map(t => t.teacherName).filter(t => t) ?? [];

            let userCountQuery = {
                [`grades.${userClass.term}.${userClass.semester}`]: {
                    $elemMatch: {
                        class_name: userClass.className, teacher_name: userClass.teacherName
                    }
                }
            };
            let userCountProjection = {
                [`grades.${userClass.term}.${userClass.semester}.$`]: 1
            };
            let users = await db.collection(USERS_COLLECTION_NAME).find(userCountQuery, {projection: userCountProjection}).toArray();

            let minUsersForAverageCalc = 9;
            let classAverage = users.length >= minUsersForAverageCalc ? users.map(u => u.grades[userClass.term][userClass.semester][0].overall_percent).reduce((a, b) => a + b, 0) / users.length : null;

            relClasses[userClass.className] = {
                "department": classData?.department ?? rawData?.department ?? "",
                "classType": classData?.classType ?? rawData?.classType ?? "",
                "uc_csuClassType": classData?.uc_csuClassType ?? rawData?.uc_csuClassType ?? "",
                "weights": userClass.teacherName ? classData?.teachers[0].weights : false,
                "hasWeights": userClass.teacherName ? classData?.teachers[0].hasWeights : false,
                "credits": classData?.credits ?? rawData?.credits,
                "terms": classData?.terms ?? rawData?.terms,
                "description": rawData?.description,
                "userCount": users.length,
                "classAverage": classAverage,
                "teachers": teachers,
                "gradeLevels": rawData?.grade_levels
            };
        }
    }

    return {success: true, data: {value: relClasses}};
};

const _addDonation = async (db, username, platform, paidValue, receivedValue, dateDonated) => {
    if (!Constants.donoPlatforms.includes(platform)) return {success: false, data: {message: "Invalid Platform", log: `Invalid platform ${platform}`}};
    if (typeof paidValue !== "number" || typeof receivedValue !== "number") return {success: false, data: {message: "Invalid payment amounts", log: `Invalid payment amounts paid=${paidValue} received=${receivedValue}`}};
    if (typeof dateDonated !== "number") return {success: false, data: {message: "Invalid date", log: `Invalid date ${dateDonated}`}};

    let res = await db.collection(USERS_COLLECTION_NAME).updateOne({
        username: username,

                                                         }, {$push: {donoData: {
                                                             platform: platform,
                paidValue: paidValue,
                receivedValue: receivedValue,
                dateDonated: dateDonated
            }}});

    if (res.matchedCount === 1) {
        return {success: true, data: {message: `Added donation for ${username}`}};
    }

    return {success: false, data: {log: `Error adding donation for ${username}`, message: `Error adding donation for ${username}`}};
};

const _removeDonation = async (db, username, index) => {
    let res = await _getUser(db, username, {donoData: 1});
    if (!res.success) return res;

    let donoData = res.data.value.donoData;
    if (index >= 0 && index < donoData.length) {
        donoData.splice(index, 1);
    } else {
        return {success: false, data: {message: `Failed to remove donation for ${username}`, log: `Index ${index} out of bounds for removing donation for ${username}`}};
    }

    await db.collection(USERS_COLLECTION_NAME).updateOne({username: username}, {$set: {donoData: donoData}});

    return {success: true, data: {message: `Removed donation for ${username}`, log: `Removed donation for ${username}`}};
}

const _getDonoData = async (db, username) => {
    let res = await _getUser(db, username, {donoData: 1});
    if (!res.success) return res;

    return {success: true, data: {value: res.data.value.donoData}};
}
