const {MongoClient} = require("mongodb");
const bcrypt = require("bcryptjs");

let _url;
let _prod;
let _beta;
let _testing;
let _client;

// Shared constants to avoid typo bugs
const SCHOOL_NAMES = ["bellarmine", "basis"];
const USERS_COLLECTION_NAME = "users";
const CLASSES_COLLECTION_NAME = "classes";
const BETAKEYS_COLLECTION_NAME = "betakeys";

const STABLE_DATABASE_NAME = "stable";
const BETA_DATABASE_NAME = "beta";
const TEST_DATABASE_NAME = "test";

const MAIN_PURPOSE = "main";
const SYNC_PURPOSE = "sync";
const NOTI_PURPOSE = "noti";

const {makeUser, validatePassword, makeKey, lower, removeId, classesCollection,
    roundsToGenerateSalt, validateEmail, getPersonalInfo
} = require("./dbHelpers");
const _ = require("lodash");
const stream = require("stream");
const socketManager = require("./socketManager");

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
    getMostRecentTermData: (username) => safe(_getMostRecentTermData, lower(username)),
    login: (username, password) => safe(_login, lower(username), password),
    acceptTerms: (username) => safe(_acceptTerms, lower(username)),
    acceptPrivacyPolicy: (username) => safe(_acceptPrivacyPolicy, lower(username)),
    changePassword: (username, oldPassword, newPassword) => safe(_changePassword, lower(username), oldPassword, newPassword),
    changeSchoolEmail: (username, schoolUsername) => safe(_changeSchoolEmail, lower(username), lower(schoolUsername)),
    removeUser: (username) => safe(_removeUser, lower(username)),
    getSyncStatus: (username) => safe(_getSyncStatus, lower(username)),
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
    return new Promise(resolve => func(db(_client), ...args).then(async (_data) => {
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
    }));
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

    for (let name of SCHOOL_NAMES) {
        // Create the classes collection if it doesn't exist
        if (!collectionNames.includes(classesCollection(name))) {
            await db.createCollection(classesCollection(name));
        }
    }

    return {success: true};
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

const _getMostRecentTermData = async (db, username) => {
    let res = await _getUser(db, {username: username});
    if (!res.success) return res;
    let user = res.data.value;
    return __getMostRecentTermData(user);
}

const __getMostRecentTermData = (user) => {
    let grades = user.grades;
    let terms = Object.keys(grades);
    if (terms.length === 0) {
        return {success: false, data: {term: false, semester: false, log: `User ${username} has no grades!`}}
    }
    let term = terms[terms.map(t => parseInt(t.substring(0, 2))).reduce((maxIndex, term, index, arr) => term > arr[maxIndex] ? index : maxIndex, 0)];
    if (user.school === "basis") {
        return {success: true, data: {term: term, semester: "_"}};
    }
    let semesters = Object.keys(grades[term]);
    let semester = semesters[semesters.map(s => parseInt(s.substring(1))).reduce((maxIndex, semester, index, arr) => semester > arr[maxIndex] ? index : maxIndex, 0)];
    return {success: true, data: {term: term, semester: semester}};
}

const _login = async (db, username, password) => {
    return new Promise(async resolve => {
        let res = await _userExists(db, {username: username});
        if (!res.success) return resolve({success: false, data: {message: "Invalid credentials."}});
        let user = res.data.value;
        bcrypt.compare(password, user.password, (err, success) => {
            if (err) {
                return resolve({success: false, data: {log: err, message: "Something went wrong"}})
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
}

const _acceptTerms = async (db, username) => {
    let res = await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {$set: {'alerts.termsLastSeen': Date.now()}});
    if (res.ok) {
        return {success: true, data: {log: `Accepted terms for ${username} in ${school}`}};
    }
    return {success: false, data: {log: `Error accepting terms for ${username} in ${school}`}};
};

const _acceptPrivacyPolicy = async (db, username) => {
    let res = await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {$set: {'alerts.policyLastSeen': Date.now()}});
    if (res.ok) {
        return {success: true, data: {log: `Accepted policy for ${username} in ${school}`}};
    }
    return {success: false, data: {log: `Error accepting policy for ${username} in ${school}`}};
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
        if ('schoolPassword' in user) {
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
                return resolve({success: false, data: {log: `Error updating password`, message: "Something went wrong"}});
            }
            if (schoolPassword) {
                let res4 = await _encryptAndStoreSchoolPassword(db, username, schoolPassword, newPassword);
                if (!res4.success) {
                    return resolve(res4);
                }
            }
            return resolve({success: true, data: {log: `Changed password for ${username}`, message: "Password Updated"}});
        });
    });
}

const _changeSchoolEmail = async (db, username, schoolUsername) => {
    let res = await _getUser(db, {username: username});
    if (!res.success) return res;
    let user = res.data.value;
    if (!validateEmail(schoolUsername, user.school)) {
        return {success: false, data: {message: "This must be your school email."}};
    }
    if (user.schoolUsername !== schoolUsername && await _userExists(db, {schoolUsername: schoolUsername})) {
        return {success: false, data: {message: "This email is already associated with an account."}};
    }
    let {firstName, lastName, graduationYear} = getPersonalInfo(schoolUsername, user.school);
    let res2 = await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {$set: {schoolUsername: schoolUsername, personalInfo: {firstName: firstName, lastName: lastName, graduationYear: graduationYear}}});
    if (!res2.ok) {
        return {success: false, data: {log: `Error updating school email`, message: "Something went wrong"}};
    }
    return {success: true, data: {log: `Changed school username for ${username}`, message: "School Email Updated"}};
}

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
    let _stream = new stream.Readable({objectMode: true, read: () => {}});
    _stream.on("data", (data) => {
        console.log(data);
        if ("success" in data) {
            if (!data.success) {
                socketManager.emitToRoom(username, )
            }
        }
    })
}


const _getRelClassData = async (db, username, term, semester) => {

}

const _getSyncStatus = async (db, username) => {
    let res = await _getUser(db, {username: username});
    if (!res.success) {
        return res;
    }
    let user = res.data.value;
    let syncStatus = user.updatedInBackground;
    if (syncStatus === "complete") {
        let res2 = await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {$set: {updatedInBackground: 'already done'}});
        if (!res2.ok) return res2;
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
}

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

const _clearTestDatabase = async (db) => {
    if (!_testing) {
        return {success: false, data: {log: `Cannot drop non-testing databases`}};
    }
    return {success: await db.dropDatabase(), data: {log: `Dropped test database`}};
};
