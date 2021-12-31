const {MongoClient} = require("mongodb");
const _ = require("lodash");
const auth = require("./authenticator");
const bcrypt = require("bcryptjs");

// Change this when updateDB changes
const dbUserVersion = 0;
const dbClassVersion = 0;

let url;
let prod;
let beta;
let connectionCount = 0;

// Shared constants to avoid typo bugs
const SCHOOL_NAMES = ["bellarmine", "basis"];
const USERS_COLLECTION_NAME = "users";
const CLASSES_COLLECTION_NAME = "classes";

const roundsToGenerateSalt = 10;

module.exports = {
    /**
     * Creates user database if it does not already exist
     * @param _prod true if server is in a production enviroment
     * @param _beta true if beta server
     * @returns {Promise<void>}
     */
    init: async (_prod = false, _beta = false) => {
        prod = _prod;
        beta = _beta;
        if (_prod) {
            url = process.env.DB_URL;
        } else {
            url = "mongodb://localhost:27017";
        }
        console.log("Connecting main client to mongodb host at: " + url);
        auth.readChangelog("CHANGELOG.md");
        auth.watchChangelog();
        init();
    }, /**
     * Creates a new user
     * @param school The school that the user is a part of
     * @param username A unique username
     * @param password A plain text user password to be hashed
     * @param schoolUsername A plain text school password to be encrypted
     * @param isAdmin true if user to be created is an admininstrator
     * @param betaKey
     * @returns {Promise<{success: boolean, message: string}>}
     */
    addNewUser: (school, username, password, schoolUsername, isAdmin, betaKey) => {
        //

        // Convert username to lowercase
        let lc_username = username.toLowerCase();

        return new Promise(resolve => {

            // Do not create user if username is not valid
            if (!isAlphaNumeric(lc_username)) {
                return resolve({success: false, message: "Username must contain only lowercase letters and numbers."});
            }

            // Do not create user if username is longer than 16 characters
            if (lc_username.length > 16) {
                return resolve({success: false, message: "Username must contain 16 or fewer characters."});
            }

            // Return descriptive error for password validataion
            let err = validatePassword(password);
            if (err) {
                return resolve({success: false, message: err});
            }

            // Validate email address
            if (!validateEmail(schoolUsername, school)) {
                return resolve({
                    success: false,
                    message: `This must be your ${school[0].toUpperCase() + school.substring(1)} school email.`
                });
            }

            // Setup personal info with the EXACT same algorithm as the signup page
            let {firstName, lastName, graduationYear} = getPersonalInfo(schoolUsername, school);


            // Hash password
            bcrypt.hash(password, roundsToGenerateSalt, (err, hash) => {
                // Get current timestamp for user creation timestamp
                let now = Date.now();

                // Create the user json
                let user = {
                    school: school,
                    version: dbUserVersion,
                    username: lc_username,
                    password: hash,
                    schoolUsername: schoolUsername.toLowerCase(),
                    personalInfo: {
                        firstName: firstName, lastName: lastName, graduationYear: graduationYear
                    },
                    isAdmin: isAdmin,
                    betaFeatures: {
                        active: beta
                    },
                    appearance: {
                        theme: "sun",
                        classColors: [],
                        colorPalette: "clear",
                        shuffleColors: false,
                        seasonalEffects: true,
                        showNonAcademic: true,
                        darkModeStart: 946778400000,
                        darkModeFinish: 946738800000,
                        weightedGPA: true,
                        regularizeClassGraphs: true,
                        showMaxGPA: false,
                        animateWhenUnfocused: false,
                        showFps: false
                    },
                    alerts: {
                        lastUpdated: [],
                        updateGradesReminder: "daily",
                        latestSeen: auth.versionNameArray[1] ? beta ? auth.versionNameArray[1][1] : auth.versionNameArray.find(v => v[0] !== "Beta" && v[0] !== "Known Issues")[1] : "1.0.0",
                        policyLastSeen: "never",
                        termsLastSeen: "never",
                        remoteAccess: beta ? "allowed" : "denied",
                        tutorialStatus: Object.fromEntries(auth.tutorialKeys.map(k => [k, false])),
                        notifications: {
                            important: [buildStarterNotification(now)], unread: [], dismissed: []
                        }
                    },
                    weights: {},
                    grades: {},
                    updatedGradeHistory: [],
                    addedAssignments: {},
                    editedAssignments: {},
                    sortingData: {
                        dateSort: [], categorySort: []
                    },
                    loggedIn: [],
                    enableLogging: true
                };

                // Actually add the user to the collection
                addUser(user).then((result) => {
                    return resolve(result);
                });
            });
        });
    },
};

/**
 * Connects a new client and then executes the given function.
 * Logs the total number of connections.
 * Asynchronously returns the success and data returned by the called function
 *
 * @param func function to be called
 * @param args args to pass into the provided function
 * @returns {Promise<{success: boolean, data: Object}>}
 */
let connectAndThen = (func, ...args) => {
    return new Promise((resolve => MongoClient.connect(url).then((client) => {
        console.log(`${++connectionCount} mongo connections active`);
        func(db(client), ...args).then(async (_data) => {
            let success = "success" in _data && typeof _data.success === "boolean" ? _data.success : false;
            let data = "data" in _data && _data.data.constructor === Object ? _data.data : {};
            await client.close().then(() => {
                if ("log" in data && !prod) {
                    console.log(data.log);
                }
                console.log(`${--connectionCount} mongo connections active`);
                return resolve({success: success, data: data});
            });
        });
    })));
};

let db = (client) => client.db(beta ? "beta" : "stable");

let init = () => connectAndThen(_init);
let _init = async (db) => {
    // Get list of names of existing collections
    let collections = await db.listCollections().toArray();
    let collectionNames = collections.map((c) => c.name);

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

let addUser = (user) => connectAndThen(_addUser, user);
let _addUser = async (db, user) => {
    if (!await db.collection("users").findOne({$or: [{username: user.username}, {schoolUsername: user.schoolUsername}]})) {
        await db.collection("users").insertOne(user);
        return {success: true, data: {log: `Created user ${user.username}`, message: "User Created"}};
    } else {
        return {success: false, data: {log: "User creation failed", message: "This username or email address is already in use."}};
    }
};

/**
 * Checks if a string contains solely numbers and letters
 * @param str the string to check
 * @returns {boolean} true if str is alphanumeric
 */
let isAlphaNumeric = (str) => {
    let code, i, len;

    for (i = 0, len = str.length; i < len; i++) {
        code = str.charCodeAt(i);
        if (!(code > 47 && code < 58) && // numeric (0-9)
            !(code > 64 && code < 91) && // upper alpha (A-Z)
            !(code > 96 && code < 123)) { // lower alpha (a-z)
            return false;
        }
    }
    return true;
};

/**
 * Validates a given email address for the provided school
 * @param email the email address to check
 * @param school the school to check
 * @returns {boolean} true if the email is valid
 */
let validateEmail = (email, school) => {
    let re;
    switch (school) {
        case "basis":
            re = /^[a-z]+_[0-9]{5}@basisindependent.com$/i;
            break;
        default:
            re = /^[a-z]+\.[a-z]+[0-9]{2}@bcp.org$/i;
    }
    return re.test(email);
};

let validatePassword = (password) => {
    const lowerCaseRegex = new RegExp("^(?=.*[a-z])");
    const upperCaseRegex = new RegExp("^(?=.*[A-Z])");
    const numericRegex = new RegExp("^(?=.*[0-9])");
    let message;
    if (password.length < 6) {
        message = "Your password must be at least 6 characters long.";
    } else if (password.length > 64) {
        message = "Your password must be fewer than 64 characters long.";
    } else if (!lowerCaseRegex.test(password)) {
        message = "Your password must include at least one lowercase character.";
    } else if (!upperCaseRegex.test(password)) {
        message = "Your password must include at least one uppercase character.";
    } else if (!numericRegex.test(password)) {
        message = "Your password must include at least one number.";
    }
    return message;
};

let getPersonalInfo = (email, school) => {
    let firstName, lastName, graduationYear;
    switch (school) {
        case "basis":
            firstName = email.indexOf("_") === -1 ? email : email.substring(0, email.indexOf("_"));
            firstName = firstName[0].toUpperCase() + firstName.substring(1).toLowerCase();
            break;
        default:
            // First Name
            firstName = email.indexOf(".") === -1 ? email : email.substring(0, email.indexOf("."));
            firstName = firstName[0].toUpperCase() + firstName.substring(1).toLowerCase();

            // Last Name
            lastName = email.indexOf(".") === -1 ? "" : email.indexOf(email.match(/\d/)) === -1 ? email.substring(email.indexOf(".") + 1) : email.substring(email.indexOf(".") + 1, email.indexOf(email.match(/\d/)));
            lastName = lastName[0].toUpperCase() + lastName.substring(1).toLowerCase();

            // Graduation Year
            graduationYear = email.indexOf(email.match(/\d/)) === -1 ? "" : email.indexOf("@") === -1 ? email.substring(email.indexOf(email.match(/\d/))) : email.substring(email.indexOf(email.match(/\d/)), email.indexOf("@"));
            if (graduationYear) {
                graduationYear = parseInt(graduationYear);
                graduationYear += 2000;
            }
    }
    return {firstName, lastName, graduationYear};
};

let shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
};

let makeKey = (length) => {
    let result = "";
    let characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
};

let buildStarterNotification = (now) => {
    return {
        type: "announcement",
        title: "Welcome to your Notification Center",
        message: "All future notifications will be found here. You can configure this area however you'd like, using the notification settings accessible from the top right of this panel.",
        dismissible: true,
        dismissed: false,
        pinnable: true,
        pinned: true,
        createdDate: [now],
        dismissedDates: [],
        pinnedDates: [now],
        unDismissedDates: [],
        unPinnedDates: []
    };
};
