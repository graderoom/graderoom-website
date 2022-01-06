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

const h = require("./dbHelpers");
const {makeUser} = require("./dbHelpers");

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
    init: () => connectAndThen(_init),
    addUser: (school, username, password, schoolUsername, isAdmin, beta = false, betaKey) => connectAndThen(_addUser, school, h.lower(username), password, h.lower(schoolUsername), isAdmin, beta, betaKey),
    userExists: ({
                     username, schoolUsername
                 }) => connectAndThen(_userExists, {
        username: h.lower(username), schoolUsername: h.lower(schoolUsername)
    }),
    getUser: ({
                  username, schoolUsername
              }) => connectAndThen(_getUser, {
        username: h.lower(username), schoolUsername: h.lower(schoolUsername)
    }),
    getAllUsers: () => connectAndThen(_getAllUsers),
    acceptTerms: (username) => connectAndThen(_acceptTerms, h.lower(username)),
    acceptPrivacyPolicy: (username) => connectAndThen(_acceptPrivacyPolicy, h.lower(username)),
    removeUser: (username) => connectAndThen(_removeUser, h.lower(username)),
    addBetaKey: (betaKey) => connectAndThen(_addBetaKey, betaKey),
    betaKeyExists: (betaKey) => connectAndThen(_betaKeyExists, betaKey),
    betaKeyValid: (betaKey) => connectAndThen(_betaKeyValid, betaKey),
    getBetaKey: (betaKey) => connectAndThen(_getBetaKey, betaKey),
    getAllBetaKeys: () => connectAndThen(_getAllBetaKeys),
    claimBetaKey: (betaKey, username) => connectAndThen(_claimBetaKey, betaKey, h.lower(username)),
    removeBetaKey: (betaKey) => connectAndThen(_removeBetaKey, betaKey),
    joinBeta: (username) => connectAndThen(_joinBeta, h.lower(username)),
    updateBetaFeatures: (username, features) => connectAndThen(_updateBetaFeatures, h.lower(username), features),
    leaveBeta: (username) => connectAndThen(_leaveBeta, h.lower(username)),
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
    return new Promise(resolve => func(db(_client), ...args).then(async (_data) => {
        let success = "success" in _data && typeof _data.success === "boolean" ? _data.success : false;
        let data = "data" in _data && _data.data.constructor === Object ? _data.data : {};
        if ("log" in data && !_prod) {
            console.log(data.log);
            delete data.log;
        }
        if ("value" in data) {
            // Remove the _id attribute of the value if necessary
            data.value = h.removeId(data.value);
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
        if (!collectionNames.includes(h.classesCollection(name))) {
            await db.createCollection(h.classesCollection(name));
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

const _acceptTerms = async (db, username) => {
    let res = await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {$set: {alerts: {termsLastSeen: Date.now()}}});
    if (res.ok) {
        return {success: true, data: {log: `Accepted terms for ${username} in ${school}`}};
    }
    return {success: false, data: {log: `Error accepting terms for ${username} in ${school}`}};
};

const _acceptPrivacyPolicy = async (db, username) => {
    let res = await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {$set: {alerts: {$set: {policyLastSeen: Date.now()}}}});
    if (res.ok) {
        return {success: true, data: {log: `Accepted policy for ${username} in ${school}`}};
    }
    return {success: false, data: {log: `Error accepting policy for ${username} in ${school}`}};
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

const _addBetaKey = async (db) => {
    let betaKey = h.makeKey(7);
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
    let featureObject = h.betaFeatures();
    let res = await db.collection(USERS_COLLECTION_NAME).findOneAndUpdate({username: username}, {$set: {betaFeatures: featureObject}});
    if (res.ok) {
        return {success: true, data: {log: `Joined beta for ${username} in ${school}`}};
    }
    return {success: false, data: {log: `Error joining beta for ${username} in ${school}`}};
};

const _updateBetaFeatures = async (db, username, features) => {
    let featureObject = h.betaFeatures(features);
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
