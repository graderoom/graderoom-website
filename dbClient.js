const {MongoClient} = require("mongodb");

let _url;
let _prod;
let _beta;
let _testing;
let connectionCount = 0;

// Shared constants to avoid typo bugs
const SCHOOL_NAMES = ["bellarmine", "basis"];
const USERS_COLLECTION_NAME = "users";
const CLASSES_COLLECTION_NAME = "classes";
const BETAKEYS_COLLECTION_NAME = "betakeys";

const STABLE_DATABASE_NAME = "stable";
const BETA_DATABASE_NAME = "beta";
const TEST_DATABASE_NAME = "test";

const userCollection = (school) => {
    return school + "_" + USERS_COLLECTION_NAME;
};

const classesCollection = (school) => {
    return school + "_" + CLASSES_COLLECTION_NAME;
}

const removeId = (value) => {
    if ("_id" in value) {
        delete value._id;
    }
    return value;
};


module.exports = {
    /**
     * Initializes instance values
     * @param url
     * @param prod
     * @param beta
     * @param testing
     */
    config: (url, prod, beta, testing = false) => {
        _url = url ?? _url;
        _prod = prod ?? _prod;
        _beta = beta ?? _beta;
        _testing = testing ?? _testing;
    },
    init: () => connectAndThen(_init),
    addUser: (school, user) => validateSchoolAndThenConnectAndThen(_addUser, school, user),
    userExists: (school, {
        username, schoolUsername
    }) => validateSchoolAndThenConnectAndThen(_userExists, school, {username, schoolUsername}),
    getUser: (school, {username, schoolUsername}) => validateSchoolAndThenConnectAndThen(_getUser, school, {
        username, schoolUsername
    }),
    getAllUsers: (school) => validateSchoolAndThenConnectAndThen(_getAllUsers, school), /* TODO update user functions */
    removeUser: (school, {
        username, schoolUsername
    }) => validateSchoolAndThenConnectAndThen(_removeUser, school, {username, schoolUsername}),
    addBetaKey: (betaKey) => connectAndThen(_addBetaKey, betaKey),
    betaKeyExists: (betaKey) => connectAndThen(_betaKeyExists, betaKey),
    getBetaKey: (betaKey) => connectAndThen(_getBetaKey, betaKey),
    getAllBetaKeys: () => connectAndThen(_getAllBetaKeys),
    claimBetaKey: (betaKey, username) => connectAndThen(_claimBetaKey, betaKey, username),
    removeBetaKey: (betaKey) => connectAndThen(_removeBetaKey, betaKey),
    clearTestDatabase: () => connectAndThen(_clearTestDatabase)
};

/**
 * Connects a new client and then executes the given function.
 * Passes in db and given args.
 * Logs the total number of connections.
 * Asynchronously returns the success and data returned by the called function
 *
 * @param func function to be called
 * @param args args to pass into the provided function
 * @returns {Promise<{success: boolean, data: Object}>}
 */
const connectAndThen = (func, ...args) => {
    return new Promise(resolve => MongoClient.connect(_url).then(client => {
        console.log(`${++connectionCount} mongo connections active`);
        func(db(client), ...args).then(async (_data) => {
            let success = "success" in _data && typeof _data.success === "boolean" ? _data.success : false;
            let data = "data" in _data && _data.data.constructor === Object ? _data.data : {};
            await client.close().then(() => {
                if ("log" in data && !_prod) {
                    console.log(data.log);
                    delete data.log;
                }
                if ("value" in data) {
                    // Remove the _id attribute of the value if necessary
                    data.value = removeId(data.value);
                }
                console.log(`${--connectionCount} mongo connections active`);
                return resolve({success: success, data: data});
            });
        });
    }));
};

const validateSchoolAndThenConnectAndThen = (func, school, ...args) => {
    if (!SCHOOL_NAMES.includes(school)) {
        console.log(`Invalid school: ${school}`);
        return {
            success: false, data: {message: "School does not exist"}
        };
    }
    return new Promise(resolve => {
        connectAndThen(func, school, ...args).then(result => {
            return resolve(result);
        });
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

    for (let name of SCHOOL_NAMES) {
        // Create the user collection if it doesn't exist
        if (!collectionNames.includes(userCollection(name))) {
            await db.createCollection(userCollection(name));
        }

        // Create the classes collection if it doesn't exist
        if (!collectionNames.includes(classesCollection(name))) {
            await db.createCollection(classesCollection(name));
        }
    }

    return {success: true};
};

const _addUser = async (db, school, user) => {
    if (!(await _userExists(db, school, {username: user.username, schoolUsername: user.schoolUsername})).success) {
        await db.collection(userCollection(school)).insertOne(user);
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

const _userExists = async (db, school, {username, schoolUsername}) => {
    let userExists = await db.collection(userCollection(school)).findOne({$or: [{username: username}, {schoolUsername: schoolUsername}]});
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

const _addBetaKey = async (db, betaKey) => {
    if ((await _betaKeyExists(db, betaKey)).success) {
        return {
            success: false, data: {log: `Beta key ${betaKey} already exists.`, message: "Beta key already exists."}
        };
    }
    await db.collection(BETAKEYS_COLLECTION_NAME).insertOne({
                                                                betaKey: betaKey, claimed: false, claimedBy: ""
                                                            });
    return {success: true, data: {log: `Added betaKey ${betaKey}`, message: "Beta Key Added"}};
};

const _getUser = async (db, school, {username, schoolUsername}) => {
    let user = await db.collection(userCollection(school)).findOne({
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

const _getAllUsers = async (db, school) => {
    return {success: true, data: {value: await db.collection(userCollection(school)).find({}).toArray()}};
};

const _removeUser = async (db, school, {username, schoolUsername}) => {
    let res = await db.collection(userCollection(school)).deleteOne({
                                                                        $or: [{
                                                                            username: username
                                                                        }, {
                                                                            schoolUsername: schoolUsername
                                                                        }]
                                                                    });
    if (res.deletedCount === 1) {
        return {success: true, data: {log: `Deleted user ${username}.`, message: "Deleted user."}};
    }
    return {
        success: false, data: {
            log: `Could not delete user with given parameters: username=${username}, schoolUsername=${schoolUsername}`,
            message: "User could not be deleted"
        }
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
    let key = await db.collection(BETAKEYS_COLLECTION_NAME).findOneAndUpdate({$and: [{betaKey: betaKey}, {claimed: false}]}, {
        $set: {
            claimed: true, claimedBy: username
        }
    });
    if (!!key) {
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

const _clearTestDatabase = async (db) => {
    if (!_testing) {
        return {success: false, data: {log: `Cannot drop non-testing databases`}};
    }
    return {success: await db.dropDatabase(), data: {log: `Dropped test database`}};
};
