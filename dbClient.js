const {MongoClient} = require("mongodb");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
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
const SCHOOL_NAMES = ["bellarmine", "basis"];
const USERS_COLLECTION_NAME = "users";
const ARCHIVED_USERS_COLLECTION_NAME = "archived_users";
const CLASSES_COLLECTION_NAME = "classes";
const BETAKEYS_COLLECTION_NAME = "betakeys";

const STABLE_DATABASE_NAME = "stable";
const BETA_DATABASE_NAME = "beta";
const TEST_DATABASE_NAME = "test";

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
    roundsToGenerateSalt,
    validateEmail,
    getPersonalInfo,
    _versionNameArray,
    _betaChangelogArray,
    _changelogArray,
    _tutorialKeys,
    shuffleArray
} = require("./dbHelpers");
const SunCalc = require("suncalc");

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
    updateGrades: (username, schoolPassword) => safe(_updateGrades, lower(username), schoolPassword),
    updateGradeHistory: (username, schoolPassword) => safe(_updateGradeHistory, lower(username), schoolPassword),
    updateSortData: (username, sortData) => safe(_updateSortData, lower(username), sortData),
    initAddedAssignments: (username) => safe(_initAddedAssignments, lower(username)),
    initEditedAssignments: (username) => safe(_initEditedAssignments, lower(username)),
    initWeights: (username) => safe(_initWeights, lower(username)),
    updateAddedAssignments: (username, addedAssignments, term, semester) => safe(_updateAddedAssignments, lower(username), addedAssignments, term, semester),
    updateEditedAssignments: (username, editedAssignments, term, semester) => safe(_updateEditedAssignments, lower(username), editedAssignments, term, semester),
    getSyncStatus: (username) => safe(_getSyncStatus, lower(username)),
    setSyncStatus: (username, value) => safe(_setSyncStatus, lower(username), value),
    getWhatsNew: (username) => safe(_getWhatsNew, lower(username)),
    latestVersionSeen: (username) => safe(_latestVersionSeen, lower(username)),
    updateTutorial: (username, action) => safe(_updateTutorial, lower(username), action),
    resetTutorial: (username) => safe(_resetTutorial, lower(username)),
    addBetaKey: (betaKey) => safe(_addBetaKey, betaKey),
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
    clearTestDatabase: () => safe(_clearTestDatabase)
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
        try {
            func(db(_client), ...args).then(async (_data) => {
                let success = "success" in _data && typeof _data.success === "boolean" ? _data.success : false;
                let data = "data" in _data && _data.data.constructor === Object ? _data.data : {};
                if ("log" in data && !_prod) {
                    console.log(data.log);
                    delete data.log;
                }
                if ("value" in data) {
                    // Remove the _id attribute of the value if it exists
                    data.value = removeId(data.value);
                }
                return resolve({success: success, data: data});
            });
        } catch (e) {
            console.log(e);
            return resolve({success: false, data: {message: "Something went wrong"}});
        }
    });
};

const db = client => client.db(_testing ? TEST_DATABASE_NAME : _beta ? BETA_DATABASE_NAME : STABLE_DATABASE_NAME);

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
        let res = await db.claimBetaKey(school, betaKey, username);
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
        return {success: true, data: {log: `Created user ${user.username} in ${school}`, message: "User Created"}};
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
    let res = await _userArchived(db, username);
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
        return {success: false, data: {term: false, semester: false, log: `User ${username} has no grades!`}};
    }
    let term = terms[terms.map(t => parseInt(t.substring(0, 2))).reduce((maxIndex, term, index, arr) => term > arr[maxIndex] ? index : maxIndex, 0)];
    if (user.school === "basis") {
        return {success: true, data: {term: term, semester: "_"}};
    }
    let semesters = Object.keys(grades[term]);
    let semester = semesters[semesters.map(s => parseInt(s.substring(1))).reduce((maxIndex, semester, index, arr) => semester > arr[maxIndex] ? index : maxIndex, 0)];
    return {success: true, data: {term: term, semester: semester}};
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
    if (typeof value !== false) {
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
        return {
            success: false, data: {message: "Something went wrong", log: `Invalid seasonalEffects: ${seasonalEffects}`}
        };
    }
    if (typeof blurEffects !== "boolean") {
        return {
            success: false, data: {message: "Something went wrong", log: `Invalid seasonalEffects: ${blurEffects}`}
        };
    }
    let message = theme.replace(/^\w/, c => c.toUpperCase()) + " theme enabled!";
    if (theme === "auto") {
        darkModeStart = new Date("0/" + darkModeStart);
        darkModeFinish = new Date("0/" + darkModeFinish);
        message = "Dark theme enabled from " + darkModeStart.toLocaleTimeString() + " to " + darkModeFinish.toLocaleTimeString() + ".";
        darkModeStart = darkModeStart.getTime();
        darkModeFinish = darkModeFinish.getTime();
    }
    if (theme === "sun") {
        message = "Dark theme enabled from sunset to sunrise.";
    }
    if (seasonalEffects !== user.appearance.seasonalEffects) {
        message = "Seasonal effects " + (seasonalEffects ? "enabled" : "disabled") + "!";
    }
    if (blurEffects !== user.appearance.blurEffects) {
        message = "Blur effects " + (blurEffects ? "enabled" : "disabled");
    }
    let res2 = await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {
        $set: {
            "appearance.theme": theme,
            "appearance.darkModeStart": darkModeStart,
            "appearance.darkModeFinish": darkModeFinish,
            "appearance.seasonalEffects": seasonalEffects,
            "appearance.blurEffects": blurEffects
        }
    });
    if (res2.ok) {
        return {success: true, data: {message: message, log: `Updated appearance for ${username}`}};
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
        return {success: false, data: {message: `Invalid shuffle value: ${shuffle}`}};
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
        return {success: true, data: {log: `Updated color palette for ${username}`}};
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
            success: true,
            data: {
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
            success: true,
            data: {
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
        bcrypt.hash(newPassword, roundsToGenerateSalt, async (err, hash) => {
            if (err) {
                return resolve({success: false, data: {log: err, message: "Something went wrong"}});
            }
            let res3 = await db.findOneAndUpdate({username: username}, {$set: {password: hash}});
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

const _updateGrades = async (db, username, schoolPassword) => {
    let res = await _getUser(db, {username: username});
    if (!res.success) {
        return res;
    }
    let user = res.data.value;
    let {term: oldTerm, semester: oldSemester} = __getMostRecentTermData(user);
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
        console.log(data);
        if ("success" in data) {
            if (!data.success) {
                socketManager.emitToRoom(username, SYNC_PURPOSE, "fail", data.message);
            } else {
                let newTerm = Object.keys(data.new_grades)[0];
                let newSemester = Object.keys(data.new_grades[newTerm])[0];
                if (!(newTerm in user.grades)) {
                    let setString = `grades.${newTerm}`;
                    let setMap = {};
                    setMap[setString] = {};
                    await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {$set: setString});
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
                let setString2 = `grades.${newTerm}.${newSemester}`;
                let setMap2 = {};
                setMap2[setString2] = newGrades;
                await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {$set: setMap2});
                if (user.school === "basis") {
                    let newWeights = data.new_weights[newTerm][newSemester];
                    let setString3 = `weights.${newTerm}.${newSemester}`;
                    let setMap3 = {};
                    setMap3[setString3] = newWeights;
                    await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {$set: setMap3});
                }
                _initAddedAssignments(db, username);
                _initWeights(db, username);
                _initEditedAssignments(db, username);
                _bringUpToDate(db, username, newTerm, newSemester);

                let updateHistory = false;
                if ((newTerm !== oldTerm || newSemester !== oldSemester) || !user.updatedGradeHistory.length) {
                    _resetSortData(db, username);
                    updateHistory = true;
                }

                let time = Date.now();
                await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {
                    $set: {updatedInBackground: "already done"},
                    $push: {"alerts.lastUpdated": {timestamp: time, changeData: changeData, ps_locked: ps_locked}}
                });

                if (updateHistory) {
                    await _updateGradeHistory(db, username, schoolPassword);
                }

                socketManager.emitToRoom(username, SYNC_PURPOSE, "success", {message: "Updated grades!"});
            }
        } else {
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
                        let setString = `grades.${term}._`;
                        let setMap = {};
                        setMap[setString] = newWeights[term]._;
                        await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {$set: setMap});
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
                                let setString = `grades.${newYears[i]}`;
                                let setMap = {};
                                setMap[setString] = data.new_grades[newYears[i]];
                                await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {$set: setMap});
                            } else {
                                let currentSemesters = Object.keys(user.grades[newYears[i]]);
                                let newSemesters = Object.keys(data.new_grades[newYears[i]]);
                                for (let j = 0; j < newSemesters.length; j++) {
                                    if (!currentSemesters.includes(newSemesters[j])) {
                                        let setString = `grades.${newYears[i]}.${newSemesters[j]}`;
                                        let setMap = {};
                                        setMap[setString] = data.new_grades[newYears[i]][newSemesters[j]];
                                        await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {});
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
                                        let setString = `grades.${newYears[i]}.${newSemesters[j]}`;
                                        let setMap = {};
                                        setMap[setString] = newClasses;
                                        await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {$set: setMap});

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
                        _initWeights(db, username);
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
                this.bringUpToDate(username);

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
            temp[years[i]][semesters[j]] = current[years[i]] ? current[years[i]][semesters[j]] ?? {} : {};
            let classes = user.grades[years[i]][semesters[j]].map(c => c.class_name);
            for (let k = 0; k < classes.length; k++) {
                temp[years[i]][semesters[j]][classes[k]] = current[years[i]] ? current[years[i]][semesters[j]] ? current[years[i]][semesters[j]][classes[k]] ?? {
                    weights: {}, hasWeights: false
                } : {weights: {}, hasWeights: false} : {weights: {}, hasWeights: false};
            }
        }
    }

    await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {$set: {addedAssignments: temp}});
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

    let setString = `addedAssignments.${term}.${semester}`;
    let setMap = {};
    setMap[setString] = addedAssignments;
    await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {$set: setMap});
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

    let setString = `editedAssignments.${term}.${semester}`;
    let setMap = {};
    setMap[setString] = editedAssignments;
    await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {$set: setMap});
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
    let res = await db.collection.findOneAndUpdate({username: username}, {$set: {updatedInBackground: value}});
    if (res.ok) {
        return {success: true, data: {log: `Set sync status for ${username} to ${value}`}};
    }
    return {success: false, data: {log: `Error setting sync status for ${username} to ${value}`}};
};

const _getWhatsNew = async (db, username) => {
    let user = await _getUser(db, {username: username});
    let end = _versionNameArray.indexOf(_versionNameArray.find(v => v[1] === user.alerts.latestSeen));
    if (end < 2) {
        end = 2;
    }
    let result;
    if (_beta) {
        result = _betaChangelogArray.slice(1, end).join("");
    } else {
        result = "";
        for (let i = 1; i < _versionNameArray.length; i++) {
            if (_versionNameArray[i][0] !== "Beta") {
                if (i >= end && result) {
                    break;
                }
                result += _changelogArray[i];
            }
        }
    }
    return {success: true, data: {value: result}};
};

const _latestVersionSeen = async (db, username) => {
    let version;
    if (_beta) {
        version = _versionNameArray[1][1];
    } else {
        version = _versionNameArray.find(v => v[0] !== "Beta" && v[0] !== "Known Issues")[1];
    }
    let res = await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {$set: {"alerts.latestSeen": version}});
    if (res.ok) {
        return {success: true, data: {log: `Set latest seen for ${username} to ${version}`}};
    }
    return {success: false, data: {log: `Error setting latest seen for ${username} to ${version}`}};
};

const _updateTutorial = async (db, username, action) => {
    if (!_tutorialKeys.includes(action)) {
        return {success: false, data: {log: `Invalid action: ${action}`}};
    }
    let setString = `alerts.tutorialStatus.${action}Seen`;
    let setMap = {};
    setMap[setString] = true;
    let res = await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {$set: setMap}, {returnDocument: "after"});
    return {success: true, data: {value: res.value}};
};

const _resetTutorial = async (db, username) => {
    let setMap = {};
    setMap["alerts.tutorialStatus"] = Object.fromEntries(_tutorialKeys.map(key => [key, false]));
    let res = await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {$set: setMap}, {returnDocument: "after"});
    return {success: true, data: {value: res.value}};
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
    return {success: true, data: {log: `Added betaKey ${betaKey}`, message: "Beta Key Added", value: document}};
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
        return {success: true, data: {log: `Joined beta for ${username} in ${school}`}};
    }
    return {success: false, data: {log: `Error joining beta for ${username} in ${school}`}};
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

        bcrypt.hash(newPassword, roundsToGenerateSalt, async (err, hash) => {
            if (err) {
                return resolve({success: false, data: {log: err, message: "Something went wrong"}});
            }
            let res3 = await db.findOneAndUpdate({username: username}, {
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
