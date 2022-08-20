const _ = require("lodash");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");
const md5 = require("md5");
const readline = require("readline");

exports.USERS_COLLECTION_NAME = "users";
exports.CLASSES_COLLECTION_NAME = "classes";
exports.ROUNDS_TO_GENERATE_SALT = 10;
exports.SCHOOL_NAMES = ["bellarmine", "basis"];
exports.USERS_COLLECTION_NAME = "users";
exports.ARCHIVED_USERS_COLLECTION_NAME = "archived_users";
exports.CATALOG_COLLECTION_NAME = "catalog";
exports.BETAKEYS_COLLECTION_NAME = "betakeys";
exports.STABLE_DATABASE_NAME = "stable";
exports.BETA_DATABASE_NAME = "beta";
exports.TEST_DATABASE_NAME = "test";
exports.COMMON_DATABASE_NAME = "common";

// Change this when updateDB changes
const dbUserVersion = 0;
const dbClassVersion = 0;

let _changelogArray = [];
let _betaChangelogArray = [];
let _versionNameArray = [];

exports.changelogArray = () =>_changelogArray;
exports.betaChangelogArray = () => _betaChangelogArray;
exports.versionNameArray = () => _versionNameArray;

// Update this list with new tutorial keys
exports.tutorialKeys = ["homeSeen", "navinfoSeen", "moreSeen", "settingsSeen", "legendSeen"];

// Update this list with new beta features
exports.betaFeatureKeys = ["showNotificationPanel"];

exports.classesCollection = (school) => {
    return school + "_" + this.CLASSES_COLLECTION_NAME;
};

exports.removeId = (value) => {
    if (value.constructor === Object) {
        if ("_id" in value) {
            delete value._id;
        }
    }
    return value;
};

exports.makeKey = (length) => {
    let result = "";
    let characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
};

exports.betaFeatures = (betaFeatures) => {
    let obj = {active: true};
    for (let feature of this.betaFeatureKeys) {
        obj[feature] = !!(!betaFeatures || betaFeatures.includes(feature));
    }
    return obj;
};

exports.validateUsername = (str) => {
    let code, i, len;

    for (i = 0, len = str.length; i < len; i++) {
        code = str.charCodeAt(i);
        if (!(code > 47 && code < 58) && // numeric (0-9)
            !(code > 96 && code < 123)) { // lower alpha (a-z)
            return false;
        }
    }
    return true;
};

exports.validatePassword = (password) => {
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

exports.validateEmail = (email, school) => {
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

exports.makeUser = async (school, username, password, schoolUsername, isAdmin, beta) => {
    return new Promise(resolve => {
        // Do not create user if username is not valid
        if (!this.validateUsername(username)) {
            return resolve({success: false, message: "Username must contain only lowercase letters and numbers."});
        }

        // Do not create user if username is longer than 16 characters
        if (username.length > 16) {
            return resolve({success: false, message: "Username must contain 16 or fewer characters."});
        }

        // Return descriptive error for password validataion
        let err = this.validatePassword(password);
        if (err) {
            return resolve({success: false, message: err});
        }

        // Validate email address
        if (!this.validateEmail(schoolUsername, school)) {
            return resolve({
                               success: false,
                               message: `This must be your ${school[0].toUpperCase() + school.substring(1)} school email.`
                           });
        }

        // Setup personal info with the EXACT same algorithm as the signup page
        let {firstName, lastName, graduationYear} = this.getPersonalInfo(schoolUsername, school);


        // Hash password
        bcrypt.hash(password, this.ROUNDS_TO_GENERATE_SALT, (err, hash) => {
            // Get current timestamp for user creation timestamp
            let now = Date.now();

            // Create the user json
            let user = {
                version: dbUserVersion,
                school: school,
                username: username,
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
                    latestSeen: _versionNameArray[1] ? beta ? _versionNameArray[1][1] : _versionNameArray.find(v => v[0] !== "Beta" && v[0] !== "Known Issues")[1] : "1.0.0",
                    policyLastSeen: "never",
                    termsLastSeen: "never",
                    remoteAccess: beta ? "allowed" : "denied",
                    tutorialStatus: Object.fromEntries(this.tutorialKeys.map(k => [k, false])),
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

            return resolve({success: true, data: {value: user}});
        });
    });
};

exports.makeClass = (term, semester, className, teacherName, catalogData) => {
    return {
        department: catalogData?.department ?? "",
        grade_levels: catalogData?.grade_levels ?? "",
        credits: catalogData?.credits ?? "",
        terms: catalogData?.terms ?? "",
        description: catalogData?.description ?? "",
        uc_csuClassType: catalogData?.uc_csuClassType ?? "",
        classType: catalogData?.classType ?? "",
        teachers: [this.makeTeacher(teacherName)],
        term: term,
        semester: semester,
        className: className,
        version: dbClassVersion
    }
};

exports.makeTeacher = (teacherName) => {
    return {
        weights: {},
        hasWeights: null,
        suggestions: [],
        assignments: {},
        overall_grade: [],
        "teacherName": teacherName
    };
};

exports.lower = (str) => (str ?? "").toLowerCase();

exports.watchChangelog = () => {
    let md5Previous = null;
    let fsWait = false;
    let filePath = path.resolve("CHANGELOG.md");
    let fileDir = path.dirname(filePath);
    fs.statSync(fileDir);
    fs.watch(fileDir, (event, filename) => {
        if (filename === "CHANGELOG.md") {
            if (fsWait) {
                return;
            }
            fsWait = setTimeout(() => {
                fsWait = false;
            }, 100);
            fs.access(filename, fs.F_OK, (err) => {
                const _readChangelog = this.readChangelog;
                let waiting;
                let read = function () {
                    if (waiting) {
                        clearTimeout(waiting);
                    }
                    const md5Current = md5(fs.readFileSync(filename));
                    if (md5Current === md5Previous) {
                        return;
                    }
                    md5Previous = md5Current;
                    console.log(`${filename} modified, reading...`);
                    _readChangelog(filename);
                };
                if (err) {
                    if (fs.existsSync(filename)) {
                        read();
                    }
                    console.log(`${filename} not found`);
                    let waitFormula = function (index) {
                        return 500 * Math.ceil(-(40 / (index + 4)) + 10);
                    };
                    let wait = function () {
                        let waitTime = waitFormula(waitIndex) / 1000;
                        waitIndex++;
                        if (!fs.existsSync(filename)) {
                            if (waiting) {
                                clearTimeout(waiting);
                            }
                            console.log(`Try ${waitIndex} | Waiting for ${waitTime} seconds...`);
                            waiting = setTimeout(wait, waitFormula(waitIndex));
                        } else {
                            read();
                        }
                    };
                    let waitIndex = 1;
                    let waitTime = waitFormula(waitIndex) / 1000;
                    if (waiting) {
                        clearTimeout(waiting);
                    }
                    console.log(`Try ${waitIndex} | Waiting for ${waitTime} seconds...`);
                    waiting = setTimeout(wait, waitFormula(waitIndex));
                } else {
                    read();
                }
            });
        }
    });
};

exports.changelog = (beta) => {
    if (beta) {
        return _betaChangelogArray;
    } else {
        return _changelogArray;
    }
};

exports.readChangelog = (filename) => {
    async function read() {
        return new Promise(resolve => {
            let resultHTML = "";
            let betaResultHTML = "";
            let items = [];
            let bodyCount = -1;
            let item = {title: "", date: "", content: {}};
            _versionNameArray = [];
            const line_counter = ((i = 0) => () => ++i)();
            let lineReader = readline.createInterface({
                                                          input: fs.createReadStream(filename)
                                                      });
            lineReader.on("line", (line, lineno = line_counter()) => {
                if (line.substring(0, 3) === "###") {
                    item.content[line.substring(4)] = [];
                    bodyCount++;
                } else if (line.substring(0, 2) === "##") {
                    if (item.title !== "") {
                        if (item.title !== "Known Issues") {
                            _versionNameArray.push(item.title.split(" "));
                        } else {
                            _versionNameArray.push(["Known Issues", ""]);
                        }
                        items.push(item);
                        item = {title: "", date: "", content: {}};
                        bodyCount = -1;
                    }
                    item.title = line.substring(4, line.indexOf("]"));
                    item.date = line.substring(line.indexOf("-") + 2);
                } else if (line[0] === "-") {
                    if (item.title === "Known Issues" || item.title.substring(0, 12) === "Announcement") {
                        if (!item.content["Default"]) {
                            item.content["Default"] = [];
                        }
                        item.content["Default"].push(line.substring(2));
                    } else if (item.content[Object.keys(item.content)[bodyCount]]) {
                        item.content[Object.keys(item.content)[bodyCount]].push(line.substring(2));
                    } else {
                        // Prevents changelog file errors from crashing server
                        if (!item.content["Unfiled"]) {
                            item.title = "This shouldn't have happened. Send a bug report in More > Send Feedback. ERR #" + lineno;
                            item.content["Unfiled"] = [];
                        }
                        item.content["Unfiled"].push(line.substring(2));
                    }
                }
            }).on("close", () => {
                items.push(item);
                _versionNameArray.push(item.title.split(" "));
                let currentVersionFound = false;
                let betaCurrentVersionFound = false;
                for (let i = 0; i < items.length; i++) {
                    resultHTML += "<div class=\"changelog-item";
                    betaResultHTML += "<div class=\"changelog-item";
                    if (items[i].title.substring(0, 4) === "Beta") {
                        if (!betaCurrentVersionFound) {
                            betaResultHTML += " current";
                            betaCurrentVersionFound = true;
                        }
                        resultHTML += "\">";
                        betaResultHTML += "\">";
                    } else if (items[i].title.substring(0, 6) === "Stable") {
                        if (!currentVersionFound) {
                            resultHTML += " current\">";
                            currentVersionFound = true;
                        } else {
                            resultHTML += " stable\">";
                        }
                        if (!betaCurrentVersionFound) {
                            betaResultHTML += " current\">";
                            betaCurrentVersionFound = true;
                        } else {
                            betaResultHTML += " stable\">";
                        }
                    } else if (items[i].title.substring(0, 12) === "Announcement") {
                        betaResultHTML += " announcement\">";
                        resultHTML += " announcement\">";
                    } else if (items[i].title.substring(0, 12) === "Known Issues") {
                        betaResultHTML += " known-issues\">";
                        resultHTML += " known-issues\">";
                    } else {
                        betaResultHTML += "\">";
                        resultHTML += "\">";
                    }
                    resultHTML += "<div class=\"header\">";
                    resultHTML += "<div class=\"title\">" + items[i].title + "</div>";
                    resultHTML += "<div class=\"date\">" + items[i].date + "</div>";
                    resultHTML += "</div>";
                    resultHTML += "<div class=\"content\">";
                    betaResultHTML += "<div class=\"header\">";
                    betaResultHTML += "<div class=\"title\">" + items[i].title + "</div>";
                    betaResultHTML += "<div class=\"date\">" + items[i].date + "</div>";
                    betaResultHTML += "</div>";
                    betaResultHTML += "<div class=\"content\">";
                    if (items[i].title !== "Known Issues" && items[i].title.substring(0, 12) !== "Announcement") {
                        for (let j = 0; j < Object.keys(items[i].content).length; j++) {
                            resultHTML += "<div class=\"type " + Object.keys(items[i].content)[j].toLowerCase() + "\">" + Object.keys(items[i].content)[j];
                            betaResultHTML += "<div class=\"type " + Object.keys(items[i].content)[j].toLowerCase() + "\">" + Object.keys(items[i].content)[j];
                            for (let k = 0; k < items[i].content[Object.keys(items[i].content)[j]].length; k++) {
                                resultHTML += "<span class=\"body\">" + items[i].content[Object.keys(items[i].content)[j]][k] + "</span>";
                                betaResultHTML += "<span class=\"body\">" + items[i].content[Object.keys(items[i].content)[j]][k] + "</span>";
                            }
                            resultHTML += "</div>";
                            betaResultHTML += "</div>";
                        }
                    } else {
                        if (!items[i].content["Default"]) {
                            items[i].content["Default"] = [];
                        }
                        for (let j = 0; j < items[i].content["Default"].length; j++) {
                            resultHTML += "<span class=\"body\">" + items[i].content["Default"][j] + "</span>";
                            betaResultHTML += "<span class=\"body\">" + items[i].content["Default"][j] + "</span>";
                        }
                    }
                    resultHTML += "</div>";
                    resultHTML += "</div>|";
                    betaResultHTML += "</div>";
                    betaResultHTML += "</div>|";
                }
                _changelogArray = resultHTML.split("|");
                _betaChangelogArray = betaResultHTML.split("|");
                return resolve();
            });
        });
    }

    read().then(() => {
        console.log(`${filename} parsed`);
    });
};

exports.buildStarterNotification = (now) => {
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

exports.getPersonalInfo = (email, school) => {
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

exports.shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
};

/**
 * Determines if two weights are identical
 * (Both are point-based or have same weight names & values_
 * @returns {boolean} true if both weights are identical
 */
exports.compareWeights = (weight1, weight2) => {
    if (weight1.hasWeights !== weight2.hasWeights) {
        return false;
    } else if (weight1.hasWeights === false) {
        return true;
    }
    return _.isEqual(weight1.weights, weight2.weights);
}

/**
 * Determines if given weight is custom in comparison to verifiedWeight.
 * (Allows verified weight to have additional weights)
 * @returns {boolean} true if given weight is custom
 */
exports.isCustom = (weight, verifiedWeight) => {
    if (weight.hasWeights !== verifiedWeight.hasWeights) {
        return true;
    } else if (weight.hasWeights === false) {
        return false;
    }
    for (let key in weight.weights) {
        if (!(key in verifiedWeight.weights) || weight.weights[key] !== verifiedWeight.weights[key]) {
            return true;
        }
    }
    return false;
}

exports.fixWeights = (hasWeights, weights) => {
    if (typeof hasWeights !== "boolean") {
        throw `ERROR: invalid hasWeights type: ${typeof hasWeights}`;
    }
    let modWeights = {};
    for (let key in weights) {
        if (hasWeights === false || weights[key] === null || modWeights[key] === "") {
            modWeights[key] = null;
        } else {
            modWeights[key] = parseFloat(weights[key]);
            if (isNaN(modWeights[key])) {
                throw `ERROR: invalid weights values (isNaN): ${weights[key]}`;
            }
        }
    }
    return [hasWeights, modWeights];
}

exports.isNotToday = (date) => {
    return (new Date().toDateString()) !== date.toDateString();
}

function buildStarterNotification(now) {
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
}
