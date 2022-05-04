const {MongoClient} = require("mongodb");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const chroma = require("chroma-js");
const _ = require("lodash");
const stream = require("stream");
const socketManager = require("./socketManager");
const scraper = require("./scrape");

let _url;
let _prod;
let _beta;
let _testing;
let _client;

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
    SCHOOL_NAMES,
    STABLE_DATABASE_NAME,
    betaFeatureKeys
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
                 }) => safe(_userExists, {
        username: lower(username), schoolUsername: lower(schoolUsername)
    }),
    updateUser: (username) => safe(_updateUser, lower(username)),
    updateAllUsers: () => safe(_updateAllUsers),
    getUser: ({
                  username, schoolUsername
              }) => safe(_getUser, {
        username: lower(username), schoolUsername: lower(schoolUsername)
    }),
    getAllUsers: () => safe(_getAllUsers),
    userArchived: ({username, schoolUsername}) => safe(_userArchived, {
        username: lower(username), schoolUsername: lower(schoolUsername)
    }),
    archiveUser: (username) => safe(_archiveUser, lower(username)),
    getAllArchivedUsers: () => safe(_getAllArchivedUsers),
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
    setFirstName: (username, value) => safe(_setFirstName, lower(username), value),
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
    getRelevantClassData: (username, term, semester) => safe(_getRelevantClassData, lower(username), term, semester)
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

    for (let name of SCHOOL_NAMES) {
        // Create the classes collection if it doesn't exist
        if (!collectionNames.includes(classesCollection(name))) {
            await db.createCollection(classesCollection(name));
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

const _userExists = async (db, {username, schoolUsername}) => {
    let userExists = await db.collection(USERS_COLLECTION_NAME).findOne({$or: [{username: username}, {schoolUsername: schoolUsername}]});
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

const _updateUser = async (db, username) => {
    let res = await _getUser(db, {username: username});
    if (!res.success) {
        return res;
    }

    let user = res.data.value;
    await __updateUser(db, user);

    return {success: true, data: {log: `Initialized ${username}`}};
};

const __updateUser = async (db, user) => {
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
        await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: user.username}, {
            $set: {
                "alerts.tutorialStatus": temp, "betaFeatures": temp2
            }
        });
    }
}

const _updateAllUsers = async (db) => {
    let {data: {value: users}} = await _getAllUsers(db);
    for (let i = 0; i < users.length; i++) {
        let user = users[i];
        console.log(`Updating ${user.username} (${i} of ${users.length})`);
        await __updateUser(db, user);
    }
    return {success: true};
};

const _getUser = async (db, {username, schoolUsername}) => {
    let user = await db.collection(USERS_COLLECTION_NAME).findOne({
                                                                      $or: [{
                                                                          username: username
                                                                      }, {
                                                                          schoolUsername: schoolUsername
                                                                      }]
                                                                  });
    if (!user) {
        return {
            success: false,
            data: {log: `No user found with given parameters: username=${username}, schoolUsername=${schoolUsername}`}
        };
    }
    return {success: true, data: {value: user}};
};

const _getAllUsers = async (db) => {
    return {success: true, data: {value: await db.collection(USERS_COLLECTION_NAME).find({}).toArray()}};
};

const _userArchived = async (db, {username, schoolUsername}) => {
    let userExists = await db.collection(ARCHIVED_USERS_COLLECTION_NAME).findOne({$or: [{username: username}, {schoolUsername: schoolUsername}]});
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
    let res = await _getUser(db, {username: username});
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
    let res = await _userArchived(db, {username: username});
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
    let res = await _getUser(db, {username: username});
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
    if (user.school === "basis") {
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
    let res = await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {$push: {loggedIn: Date.now()}});
    if (res.ok) {
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

    await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {$set: {schoolPassword: encryptedPass}});
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
    let res = await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {$set: {"alerts.termsLastSeen": Date.now()}});
    if (res.ok) {
        return {success: true, data: {log: `Accepted terms for ${username}`}};
    }
    return {success: false, data: {log: `Error accepting terms for ${username}`}};
};

const _acceptPrivacyPolicy = async (db, username) => {
    let res = await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {$set: {"alerts.policyLastSeen": Date.now()}});
    if (res.ok) {
        return {success: true, data: {log: `Accepted policy for ${username}`}};
    }
    return {success: false, data: {log: `Error accepting policy for ${username}`}};
};

const _setRemoteAccess = async (db, username, value) => {
    let allowedValues = ["allowed", "denied"];
    if (!allowedValues.includes(value)) {
        return {success: false, data: {message: "Something went wrong", log: `Invalid remote access value: ${value}`}};
    }
    let res = await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {$set: {"alerts.remoteAccess": value}});
    if (res.ok) {
        return {success: true, data: {log: `Set remote access for ${username} to ${value}`}};
    }
    return {success: false, data: {log: `Error setting remote access for ${username} to ${value}`}};
};

const _setFirstName = async (db, username, value) => {
    let firstNameRegex = new RegExp("^[a-zA-Z]*$");
    if (firstNameRegex.test(value)) {
        let res = await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {$set: {"personalInfo.firstName": value}});
        if (res.ok) {
            return {success: true, data: {message: "Updated first name"}};
        }
        return {
            success: false,
            data: {log: `Failed to set ${value} as first name for ${username}`, message: "Something went wrong"}
        };
    }
    return {success: false, data: {message: "First name must contain only letters"}};
};

const _setShowNonAcademic = async (db, username, value) => {
    if (typeof value !== "boolean") {
        return {
            success: false, data: {message: "Something went wrong", log: `Invalid showNonAcademic value: ${value}`}
        };
    }
    let res = await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {$set: {"appearance.showNonAcademic": value}});
    if (res.ok) {
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
    let res = await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {$set: {"appearance.regularizeClassGraphs": value}});
    if (res.ok) {
        return {success: true, data: {log: `Set regularizeClassGraphs to ${value} for ${username}`}};
    }
    return {success: false, data: {log: `Error setting regularizeClassGraphs to ${value} for ${username}`}};
};

const _setWeightedGPA = async (db, username, value) => {
    if (typeof value !== "boolean") {
        return {success: false, data: {message: "Something went wrong", log: `Invalid weightedGPA value: ${value}`}};
    }
    let res = await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {$set: {"appearance.weightedGPA": value}});
    if (res.ok) {
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
    let res2 = await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {
        $set: setMap
    });
    if (res2.ok) {
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
    let res = await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {$set: {"appearance.showMaxGPA": value}});
    if (res.ok) {
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
    let res = await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {
        $set: {
            "appearance.classColors": classColors,
            "appearance.colorPalette": preset,
            "appearance.shuffleColors": shuffle
        }
    });
    if (res.ok) {
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
    let res = await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {$set: {enableLogging: value}});
    if (res.ok) {
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
    let res = await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {$set: {"appearance.animateWhenUnfocused": value}});
    if (res.ok) {
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
    let res = await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {$set: {"appearance.showFps": value}});
    if (res.ok) {
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
            let res3 = await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {$set: {password: hash}});
            if (!res3.ok) {
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
    let res = await _getUser(db, {username: username});
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
    let res2 = await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {
        $set: {
            schoolUsername: schoolUsername,
            personalInfo: {firstName: firstName, lastName: lastName, graduationYear: graduationYear}
        }
    });
    if (!res2.ok) {
        return {success: false, data: {log: `Error updating school email`, message: "Something went wrong"}};
    }
    return {success: true, data: {log: `Changed school username for ${username}`, message: "School Email Updated"}};
};

const _disableGradeSync = async (db, username) => {
    let res = await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {$unset: {schoolPassword: ""}});
    if (res.ok) {
        return {success: true, data: {log: `Disabled GradeSync for ${username}`}};
    }
    return {success: false, data: {log: `Error disabling GradeSync for ${username}`}};
};

const _makeAdmin = async (db, username) => {
    let res = await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {$set: {isAdmin: true}});
    if (res.ok) {
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
    let res = await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {$set: {isAdmin: false}});
    if (res.ok) {
        return {success: true, data: {log: `Made ${username} not admin`, message: "Made user not admin"}};
    }
    return {success: false, data: {log: `Error making ${username} not admin`, message: "Something went wrong"}};
};

const _updateGrades = async (db, username, schoolPassword, userPassword, gradeSync) => {
    let res = await _getUser(db, {username: username});
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
                        await _setSyncStatus(db, username, "failed");
                        socketManager.emitToRoom(username, SYNC_PURPOSE, "fail", encryptResp.data.message);
                        return;
                    }
                }
                if (data.message === "Your account is no longer active.") {
                    await _setSyncStatus(db, username, "account-inactive");
                } else if (data.message === "No class data.") {
                    await _setSyncStatus(db, username, "no data");
                } else {
                    await _setSyncStatus(db, username, "failed");
                }
                socketManager.emitToRoom(username, SYNC_PURPOSE, "fail", data.message);
            } else {
                let newTerm = Object.keys(data.new_grades)[0];
                let newSemester = Object.keys(data.new_grades[newTerm])[0];
                if (!(newTerm in user.grades)) {
                    await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {$set: {[`grades.${newTerm}`]: {}}});
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
                await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {$set: {[`grades.${newTerm}.${newSemester}`]: newGrades}});
                if (user.school === "basis") {
                    let newWeights = data.new_weights[newTerm][newSemester];
                    await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {$set: {[`weights.${newTerm}.${newSemester}`]: newWeights}});
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
                await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {
                    $set: {updatedInBackground: "already done"},
                    $push: {"alerts.lastUpdated": {timestamp: time, changeData: changeData, ps_locked: ps_locked}}
                });

                if (updateHistory) {
                    await _setSyncStatus(db, username, "history");
                    await _updateGradeHistory(db, username, schoolPassword);
                }

                await _setSyncStatus(db, username, "complete");
                socketManager.emitToRoom(username, SYNC_PURPOSE, "success", {message: "Updated grades!"});

                let _res = await _getUser(db, {username: username});
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
            await _setSyncStatus(db, username, "updating");
            socketManager.emitToRoom(username, SYNC_PURPOSE, "progress", data);
        }
    });

    scraper.loginAndScrapeGrades(_stream, user.school, user.schoolUsername, schoolPassword, dataIfLocked, termDataIfLocked);

    return {success: true, data: {stream: _stream}};
};

const _updateGradeHistory = async (db, username, schoolPassword) => {
    let res = await _getUser(db, {username: username});
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
                    case "basis":
                        let newWeights = data.new_weights;
                        let term = Object.keys(newWeights)[0];
                        await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {$set: {[`weights.${term}._`]: newWeights[term]._}});
                        break;
                    case "bellarmine":
                        let currentWeights = user.weights;
                        for (let i = 0; i < newYears.length; i++) {
                            if (!(newYears[i] in currentWeights)) {
                                currentWeights[newYears[i]] = {};
                                let newSemesters = Object.keys(data.new_grades[newYears[i]]);
                                for (let j = 0; j < newSemesters.length; j++) {
                                    currentWeights[newYears[i]][newSemesters[j]] = {};
                                }
                            } else {
                                let currentSemesters = Object.keys(currentWeights[newYears[i]]);
                                let newSemesters = Object.keys(data.new_grades[newYears[i]]);
                                for (let j = 0; j < newSemesters.length; j++) {
                                    if (!currentSemesters.includes(newSemesters[j])) {
                                        currentWeights[newYears[i]][newSemesters[j]] = {};
                                    }
                                }
                            }
                            if (!currentYears.includes(newYears[i])) {
                                await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {$set: {[`grades.${newYears[i]}`]: data.new_grades[newYears[i]]}});
                            } else {
                                let currentSemesters = Object.keys(user.grades[newYears[i]]);
                                let newSemesters = Object.keys(data.new_grades[newYears[i]]);
                                for (let j = 0; j < newSemesters.length; j++) {
                                    if (!currentSemesters.includes(newSemesters[j])) {
                                        await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {$set: {[`grades.${newYears[i]}.${newSemesters[j]}`]: data.new_grades[newYears[i]][newSemesters[j]]}});
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
                                        await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {$set: {[`grades.${newYears[i]}.${newSemesters[j]}`]: newClasses}});

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
                await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {
                    $push: {
                        updatedGradeHistory: time,
                        "alerts.lastUpdated": {timestamp: time, changeData: changeData, ps_locked: false}
                    }
                });
                await _initAddedAssignments(db, username);
                await _initEditedAssignments(db, username);
                await _updateClassesForUser(db, username);

                socketManager.emitToRoom(username, "sync", "success-history", data.message);
            } else {
                socketManager.emitToRoom(username, "sync", "fail-history", data.message);
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
    let res = await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {
        $set: {
            "sortingData": {dateSort: dateSort, categorySort: categorySort}
        }
    });
    if (res.ok) {
        return {success: true};
    }
    return {success: false};
};

const _resetSortData = async (db, username) => {
    let res = await _getUser(db, {username: username});
    if (!res.success) {
        return res;
    }

    await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {
        $set: {
            sortingData: {
                dateSort: [], categorySort: []
            }
        }
    });

    return {success: true};
};

const _userHasSemester = async (db, username, term, semester) => {
    let res = await _getUser(db, {username: username});
    if (!res.success) {
        return res;
    }

    let user = res.data.value;
    return {success: true, data: {value: term in user.grades && semester in user.grades[term]}};
};

const _initAddedAssignments = async (db, username) => {
    let res = await _getUser(db, {username: username});
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
            temp[years[i]][semesters[j]] = current[years[i]] ? current[years[i]][semesters[j]] ?? {} : {};
            let classes = user.grades[years[i]][semesters[j]].map(c => c.class_name);
            for (let k = 0; k < classes.length; k++) {
                temp[years[i]][semesters[j]][classes[k]] = [];
            }
        }
    }

    await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {$set: {addedAssignments: temp}});
    return {success: true};
};

const _initEditedAssignments = async (db, username) => {
    let res = await _getUser(db, {username: username});
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
            temp[years[i]][semesters[j]] = current[years[i]] ? current[years[i]][semesters[j]] ?? {} : {};
            let classes = user.grades[years[i]][semesters[j]].map(c => c.class_name);
            for (let k = 0; k < classes.length; k++) {
                temp[years[i]][semesters[j]][classes[k]] = [];
            }
        }
    }

    await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {$set: {editedAssignments: temp}});
    return {success: true};
};

const _initWeights = async (db, username) => {
    let res = await _getUser(db, {username: username});
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
            temp[years[i]][semesters[j]] = current[years[i]]?.[semesters[j]] ?? {};
            let classes = user.grades[years[i]][semesters[j]].map(c => c.class_name);
            for (let k = 0; k < classes.length; k++) {
                if (current[years[i]]?.[semesters[j]]?.[classes[k]] === undefined) {
                    temp[years[i]][semesters[j]][classes[k]] = {weights: {}, hasWeights: false};
                } else {
                    temp[years[i]][semesters[j]][classes[k]].weights = _.clone(current[years[i]][semesters[j]][classes[k]].weights);
                    temp[years[i]][semesters[j]][classes[k]].hasWeights = current[years[i]][semesters[j]][classes[k]].hasWeights;
                }

                let goodWeights = new Set(user.grades[years[i]][semesters[j]][k].grades.map(g => g.category));
                // Make sure weights match grades
                let weightKeys = Object.keys(temp[years[i]][semesters[j]][classes[k]].weights);
                for (let l = 0; l < weightKeys.length; l++) {
                    if (!goodWeights.has(weightKeys[l])) {
                        delete temp[years[i]][semesters[j]][classes[k]].weights[weightKeys[l]];
                    }
                }
                weightKeys = Object.keys(temp[years[i]][semesters[j]][classes[k]].weights);
                for (let l = 0; l < goodWeights.length; l++) {
                    if (!weightKeys.includes(goodWeights[l])) {
                        temp[years[i]][semesters[j]][classes[k]].weights[goodWeights[l]] = null;
                    }
                }
            }
        }
    }

    await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {$set: {weights: temp}});
    return {success: true};
};

const _updateClassesForUser = async (db, username, term, semester, className) => {
    let res = await _getUser(db, {username: username});
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
                let hasWeights = user.weights[_term][_semester][_className].hasWeights;
                if (neededWeights.length === 1) {
                    hasWeights = false;
                }
                let currentWeights = user.weights[_term][_semester][_className];
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
    let res = await _getUser(db, {username: username});
    if (!res.success) {
        return res;
    }

    // TODO validate addedAssignments

    let user = res.data.value;
    let oldAddedAssignments = user.addedAssignments;
    if (!(term in oldAddedAssignments) || !(semester in oldAddedAssignments[term])) {
        return {
            success: false,
            data: {log: `Invalid parameters for updateAddedAssignments: username=${username}, term=${term}, semester=${semester}`}
        };
    }

    await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {$set: {[`addedAssignments.${term}.${semester}`]: addedAssignments}});
    return {success: true};
};

const _updateEditedAssignments = async (db, username, editedAssignments, term, semester) => {
    let res = await _getUser(db, {username: username});
    if (!res.success) {
        return res;
    }

    // TODO validate editedAssignments

    let user = res.data.value;
    let oldEditedAssignments = user.editedAssignments;
    if (!(term in oldEditedAssignments) || !(semester in oldEditedAssignments[term])) {
        return {
            success: false,
            data: {log: `Invalid parameters for updateEditedAssignments: username=${username}, term=${term}, semester=${semester}`}
        };
    }

    await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {$set: {[`editedAssignments.${term}.${semester}`]: editedAssignments}});
    return {success: true};
};

const _getSyncStatus = async (db, username) => {
    let res = await _getUser(db, {username: username});
    if (!res.success) {
        return res;
    }
    let user = res.data.value;
    let syncStatus = user.updatedInBackground;
    if (syncStatus === "complete") {
        await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {$set: {updatedInBackground: "already done"}});
        return {success: true, data: {message: "Sync Complete!"}};
    } else if (syncStatus === "already done") {
        return {success: true, data: {message: "Already Synced!"}};
    } else if (syncStatus === "no data") {
        return {success: false, data: {message: "Cannot access grades."}};
    } else if (syncStatus === "failed") {
        return {success: false, data: {message: "Sync Failed."}};
    } else if (syncStatus === "updating") {
        return {success: false, data: {message: "Did not sync"}};
    } else if (syncStatus === "history") {
        return {success: false, data: {message: "Syncing History..."}};
    } else if (syncStatus === "account-inactive") {
        return {success: false, data: {message: "Your PowerSchool account is no longer active."}};
    } else {
        return {success: false, data: {message: "Not syncing"}};
    }
};

const _setSyncStatus = async (db, username, value) => {
    let allowedValues = ["complete", "already done", "no data", "failed", "updating", "history", "account-inactive", ""];
    if (!allowedValues.includes(value)) {
        return {success: false, data: {log: `Invalid sync status: ${value}`}};
    }
    let res = await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {$set: {updatedInBackground: value}});
    if (res.ok) {
        return {success: true, data: {log: `Set sync status for ${username} to ${value}`}};
    }
    return {success: false, data: {log: `Error setting sync status for ${username} to ${value}`}};
};

const _getWhatsNew = async (db, username) => {
    let res = await _getUser(db, {username: username});
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
    let res = await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {$set: {"alerts.latestSeen": version}});
    if (res.ok) {
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
    let res = await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {$set: {"alerts.tutorialStatus": Object.fromEntries(tutorialKeys.map(key => [key, false]))}}, {returnDocument: "after"});
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
    let res2 = await db.collection(BETAKEYS_COLLECTION_NAME).findOneAndUpdate({$and: [{betaKey: betaKey}, {claimed: false}]}, {
        $set: {
            claimed: true, claimedBy: username
        }
    });
    if (res2.ok) {
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
    let res = await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {$set: {betaFeatures: featureObject}});
    if (res.ok) {
        return {success: true, data: {log: `Joined beta for ${username}`}};
    }
    return {success: false, data: {log: `Error joining beta for ${username}`}};
};

const _updateBetaFeatures = async (db, username, features) => {
    let featureObject = betaFeatures(features);
    let res = await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {$set: {betaFeatures: featureObject}});
    if (res.ok) {
        return {success: true, data: {log: `Updated beta features for ${username} in ${school}`}};
    }
    return {success: false, data: {log: `Updated beta features for ${username} in ${school}`}};
};

const _leaveBeta = async (db, username) => {
    let res = await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {$set: {betaFeatures: {active: false}}});
    if (res.ok) {
        return {success: true, data: {log: `Left beta for ${username} in ${school}`}};
    }
    return {success: false, data: {log: `Error leaving beta for ${username} in ${school}`}};
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
            let res3 = await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {
                $set: {password: hash}, $unset: {passwordResetTokenExpire: "", passwordResetToken: ""}
            });
            if (!res3.ok) {
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
        let catalogData = catalog().findOne({class_name: className});
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
    let res = await _getUser(db, {username: username});
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
            suggestions[i].usernames.push(username);
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
    let res = await db.collection(classesCollection(school)).findOneAndUpdate({
                                                                                  term: term,
                                                                                  semester: semester,
                                                                                  className: className
                                                                              }, {$set: {"classType": classType}});
    if (!res.ok) {
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
    let res = await db.collection(classesCollection(school)).findOneAndUpdate({
                                                                                  term: term,
                                                                                  semester: semester,
                                                                                  className: className
                                                                              }, {$set: {"uc_csuClassType": classType}});
    if (!res.ok) {
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
    let res = (await db.collection(classesCollection(school)).find().sort({
                                                                              term: -1, semester: -1
                                                                          }).limit(1).toArray())[0];
    return {success: true, data: {value: {term: res.term, semester: res.semester}}};
};

const _dbContainsSemester = async (db, school, term, semester) => {
    let res = await db.collection(classesCollection(school)).findOne({term: term, semester: semester});
    return {success: res !== null, data: {value: res}};
};

const _dbContainsClass = async (db, school, term, semester, className, teacherName) => {
    let res = await db.collection(classesCollection(school)).findOne({
                                                                         term: term,
                                                                         semester: semester,
                                                                         className: className,
                                                                         "teachers.teacherName": teacherName
                                                                     });
    return {success: res !== null, data: {value: res}};
};

const _getAllClassData = async (db, school, term, semester) => {
    let res = await db.collection(classesCollection(school)).find({term: term, semester: semester}).toArray();
    let allData = {};
    for (let classData of res) {
        for (let teacherData of classData.teachers) {
            classData[teacherData.teacherName] = teacherData;
        }
        delete classData._id;
        delete classData.teachers;
        delete classData.version;
        delete classData.term;
        delete classData.semester;
        allData[classData.className] = classData;
        delete allData[classData.className].className;

    }
    return {success: true, data: {value: allData}};
};

const _getTermsAndSemestersInClassDb = async (db, school) => {
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
    let res = await _getUser(db, {username: username});
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
    let userClassData = user.grades[term][semester].find(x => x.class_name === className);
    if (!userClassData) { //className in grades?
        return {
            success: false,
            data: {message: "Something went wrong", log: `Failed to update weights for ${username}. (2)`}
        };
    }
    teacherName = userClassData.teacher_name;

    //Verify term, semester, & className exist in weights
    if (!term in user.weights || !semester in user.weights[term] || !className in user.weights[term][semester]) { //term, semester, className in weights?
        return {
            success: false,
            data: {message: "Something went wrong", log: `Failed to update weights for ${username}. (3)`}
        };
    }
    currentWeights = user.weights[term][semester][className].weights;

    //Verify classesDB contains class
    let res2 = await _dbContainsClass(db, school, term, semester, className, teacherName); //teacherName in classDb?
    if (!res2.data.value) {
        return {
            success: false,
            data: {message: "Something went wrong", log: `Failed to update weights for ${username}. (4)`}
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
    let temp = {weights: modWeights, hasWeights: hasWeights, custom: custom};
    await db.collection(USERS_COLLECTION_NAME).updateOne({username: username}, {
        $set: {[`weights.${term}.${semester}.${className}`]: temp}
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
    let res = await _getUser(db, {username: username});
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

            let rawData = await catalog().findOne({class_name: userClass.className});

            let classData = await db.collection(classesCollection(school)).findOne(query, {
                projection: projection
            });

            let teachers = (await db.collection(classesCollection(school)).findOne(query, {
                projection: {teachers: {teacherName: 1}}
            })).teachers.map(t => t.teacherName).filter(t => t);

            let userCountQuery = {
                [`grades.${userClass.term}.${userClass.semester}`]: {$elemMatch: {class_name: userClass.className, teacher_name: userClass.teacherName}},
            }
            let userCountProjection = {
                [`grades.${userClass.term}.${userClass.semester}.$`]: 1,
            }
            let users = await db.collection(USERS_COLLECTION_NAME).find(userCountQuery, {projection: userCountProjection}).toArray();

            let minUsersForAverageCalc = 9;
            let classAverage = users.length >= minUsersForAverageCalc ? users.map(u => u.grades[userClass.term][userClass.semester][0].overall_percent).reduce((a, b) => a + b, 0) / users.length : null;

            relClasses[userClass.className] = {
                "department": rawData?.department ?? classData?.department ?? "",
                "classType": classData.classType ?? rawData?.classType ?? "",
                "uc_csuClassType": classData.uc_csuClassType ?? rawData?.uc_csuClassType ?? "",
                "weights": userClass.teacherName ? classData.teachers[0].weights : false,
                "hasWeights": userClass.teacherName ? classData.teachers[0].hasWeights : false,
                "credits": rawData?.credits ?? classData?.credits,
                "terms": rawData?.terms ?? classData?.terms,
                "description": rawData?.description,
                "userCount": users.length,
                "classAverage": classAverage,
                "teachers": teachers,
                "gradeLevels": rawData?.grade_levels,
            };
        }
    }

    return {success: true, data: {value: relClasses}};
};
