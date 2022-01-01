const {MongoClient} = require("mongodb");
const _ = require("lodash");

let _url;
let _prod;
let _beta;
let connectionCount = 0;

// Shared constants to avoid typo bugs
const SCHOOL_NAMES = ["bellarmine", "basis"];
const USERS_COLLECTION_NAME = "users";
const CLASSES_COLLECTION_NAME = "classes";
const BETAKEYS_COLLECTION_NAME = "betakeys";

module.exports = {
    /**
     * Initializes instance values
     * @param url
     * @param prod
     * @param beta
     */
    config: (url, prod, beta) => {
        _url = url;
        _prod = prod;
        _beta = beta;
    },
    init: (prod = false, beta = false) => connectAndThen(_init, prod, beta),
    addUser: (user, school) => connectAndThen(_addUser, user, school),
    getBetaKey: (betaKey) => connectAndThen(_getBetaKey, betaKey),
    claimBetaKey: (betaKey, username, school) => connectAndThen(_claimBetaKey, betaKey, username, school),
    getClasses: (school) => connectAndThen(_getClasses, school),
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
let connectAndThen = (func, ...args) => {
    return new Promise(resolve => MongoClient.connect(_url).then(client => {
        console.log(`${++connectionCount} mongo connections active`);
        func(db(client), ...args).then(async (_data) => {
            let success = "success" in _data && typeof _data.success === "boolean" ? _data.success : false;
            let data = "data" in _data && _data.data.constructor === Object ? _data.data : {};
            await client.close().then(() => {
                if ("log" in data && !_prod) {
                    console.log(data.log);
                }
                console.log(`${--connectionCount} mongo connections active`);
                return resolve({success: success, data: data});
            });
        });
    }));
};

let db = client => client.db(_beta ? "beta" : "stable");

let _init = async (db) => {
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
        if (!collectionNames.includes(name + "_" + USERS_COLLECTION_NAME)) {
            await db.createCollection(name + "_" + USERS_COLLECTION_NAME);
        }

        // Create the classes collection if it doesn't exist
        if (!collectionNames.includes(name + "_" + CLASSES_COLLECTION_NAME)) {
            await db.createCollection(name + "_" + CLASSES_COLLECTION_NAME);
        }
    }

    return {success: true};
};

let _addUser = async (db, user, school) => {
    if (SCHOOL_NAMES.includes(school)) {
        if (!await _userExists(db, school, {username: user.username, schoolUsername: user.schoolUsername})) {
            await db.collection(school + "_" + USERS_COLLECTION_NAME).insertOne(user);
            return {success: true, data: {log: `Created user ${user.username} in ${school}`, message: "User Created"}};
        } else {
            return {
                success: false,
                data: {log: "User creation failed", message: "This username or email address is already in use."}
            };
        }
    }
};

let _getBetaKey = async (db, betaKey) => {
    let _betaKey = await db.collection(BETAKEYS_COLLECTION_NAME).findOne({betaKey: betaKey});
    if (!_betaKey) {
        return {success: false, data: {log: `Key not found: ${_betaKey}`}};
    }
    return {success: true, data: {value: _betaKey}};
}

let _claimBetaKey = async (db, betaKey, username, school) => {
    let res = await _getBetaKey(db, betaKey);
    let res2 = await _userExists(db, school, {username: username});
    if (res.success && res2.success) {
        await db.collection(BETAKEYS_COLLECTION_NAME).findOneAndUpdate({betaKey: betaKey}, {claimed: true, claimedBy: username});
        return {success: true}
    }
    return {success: false};
}

let _userExists = async (db, school, {username, schoolUsername}) => {
    let collectionName = school + "_" + USERS_COLLECTION_NAME;
    let userExists = await db.collection(collectionName).findOne({$or: [{username: username}, {schoolUsername: schoolUsername}]});
    return {success: userExists};
}
