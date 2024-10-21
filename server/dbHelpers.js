const _ = require("lodash");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");
const md5 = require("md5");
const readline = require("readline");
const {Schools} = require("./enums");

exports.CLASSES_COLLECTION_NAME = "classes";
exports.CHARTS_COLLECTION_NAME = "charts";
exports.INTERNAL_API_KEYS_COLLECTION_NAME = "internal"
exports.ROUNDS_TO_GENERATE_SALT = 10;
exports.USERS_COLLECTION_NAME = "users";
exports.ARCHIVED_USERS_COLLECTION_NAME = "archived_users";
exports.CATALOG_COLLECTION_NAME = "catalog";
exports.BETAKEYS_COLLECTION_NAME = "betakeys";
exports.ERRORS_COLLECTION_NAME = "errors";
exports.GENERAL_ERRORS_COLLECTION_NAME = "general_errors";
exports.STABLE_DATABASE_NAME = "stable";
exports.BETA_DATABASE_NAME = "beta";
exports.TEST_DATABASE_NAME = "test";
exports.COMMON_DATABASE_NAME = "common";
exports.SCHOOL_USERNAME_LOOKUP_COLLECTION_NAME = "school_username_lookup";

// Change this when updateDB changes
exports.dbUserVersion = 29;
exports.dbClassVersion = 3;

exports.minUsersForAverageCalc = 9;

const minDonoAmount = 3;
const minPremiumAmount = 5;

const freeSyncPeriod = 4 * 60 * 60 * 1000; // 4 hours
const donorSyncPeriod = 2 * 60 * 60 * 1000; // 2 hours
const plusSyncPeriod = 60 * 60 * 1000; // 1 hour
const premiumSyncPeriod = 15 * 60 * 1000; // 15 minutes

let _changelogArray = [];
let _betaChangelogArray = [];
let _versionNameArray = [];
let _changelogLegend = [];
let _betaChangelogLegend = [];

exports.changelogArray = () => _changelogArray;
exports.betaChangelogArray = () => _betaChangelogArray;
exports.versionNameArray = () => _versionNameArray;

// Update this list with new tutorial keys
exports.tutorialKeys = ["homeSeen", "navinfoSeen", "moreSeen", "settingsSeen", "legendSeen"];

// Update this list with new beta features
exports.betaFeatureKeys = [];

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
        obj[feature] = !!(!Array.isArray(betaFeatures) || betaFeatures.includes(feature));
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
        case Schools.BISV:
            re = /^[a-z][a-z][0-9]{5}@basisindependent\.com$/i;
            break;
        case Schools.BELL:
            re = /^[a-z]+(?:-[a-z]+)*\.[a-z]+(?:-[a-z]+)*[0-9]{2}@bcp\.org$/i;
            break;
        case Schools.NDSJ:
            re = /^(?:[a-z]{2,}|[a-z]+(?:-[a-z]+)+)[0-9]{2}@ndsj\.org$/i;
            break;
        default:
            return false;
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
            // Create the user json
            let user = {
                version: this.dbUserVersion,
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
                    showNonAcademic: false,
                    darkModeStart: 946778400000,
                    darkModeFinish: 946738800000,
                    weightedGPA: true,
                    regularizeClassGraphs: true,
                    showPlusMinusLines: false,
                    reduceMotion: false,
                    showMaxGPA: false,
                    animateWhenUnfocused: false,
                    showFps: false
                },
                alerts: {
                    lastUpdated: [],
                    latestSeen: _versionNameArray[1] ? beta ? _versionNameArray[1][1] : _versionNameArray.find(v => v[0] !== "Beta" && v[0] !== "Known Issues")[1] : "1.0.0",
                    policyLastSeen: "never",
                    termsLastSeen: "never",
                    remoteAccess: beta ? "allowed" : "denied",
                    tutorialStatus: Object.fromEntries(this.tutorialKeys.map(k => [k, false])),
                    notifications: this.buildStarterNotifications(),
                    notificationSettings: {
                        showUpdatePopup: false,
                    },
                },
                weights: {},
                grades: {},
                updatedGradeHistory: [],
                addedAssignments: {},
                editedAssignments: {},
                addedWeights: {},
                sortingData: {
                    dateSort: [], categorySort: []
                },
                loggedIn: [],
                enableLogging: true,
                donoData: [],
                api: {},
                discord: {},
                nextAvailableFakePSAID: 1,
            };

            return resolve({success: true, data: {value: user}});
        });
    });
};

exports.makeClass = (term, semester, className, teacherName) => {
    return {
        department: null,
        credits: null,
        terms: null,
        uc_csuClassType: null,
        classType: null,
        teachers: [this.makeTeacher(teacherName)],
        term: term,
        semester: semester,
        className: className,
        version: this.dbClassVersion
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

exports.hash = (username) => {
    let hash = 5381;
    for (let i = 0; i < username.length; i++) {
        hash = ((hash << 5) + hash) + username.charCodeAt(i); /* hash * 33 + c */
    }
    return Math.abs(hash % 10);
}

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

exports.changelog = (beta, versionName) => {
    let idx = _versionNameArray.findIndex(v => v.join(" ").trimEnd() === versionName);
    if (idx === -1) return null;
    if (beta) {
        return _betaChangelogArray[idx];
    } else {
        return _changelogArray[idx];
    }
};

exports.changelogLegend = (beta) => {
    if (beta) {
        return _betaChangelogLegend;
    } else {
        return _changelogLegend;
    }
}

exports.latestVersion = (beta) => {
    let version;
    if (beta) {
        version = _versionNameArray[1].join(" ");
    } else {
        version = _versionNameArray.find(v => v[0] !== "Beta" && v[0] !== "Known Issues").join(" ");
    }
    return version;
}

exports.readChangelog = (filename) => {
    async function read() {
        return new Promise(resolve => {
            let resultHTML = "";
            let betaResultHTML = "";
            let legendHTML = "";
            let betaLegendHTML = "";
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
                    let _line = line.substring(2);
                    let open = true;
                    for (let i = 0; i < _line.length; i++) {
                        if (_line[i] === "`") {
                            _line = _line.slice(0, i) + `${open ? "<span class='mono'>" : "</span>"}` + _line.slice(i + 1);
                            open = !open;
                        }
                    }
                    _line = _line.replaceAll(/<github\s*issue\s*=\s*"\d*"\s*>(?:|(?:.(?!<\/github>))*.)<\/github>/g, (str) => {
                        let num = str.substring(str.indexOf('"') + 1, str.indexOf('"', str.indexOf('"') + 1));
                        let val = str.substring(str.indexOf(">") + 1, str.indexOf("<", str.indexOf(">") + 1));
                        return `${val} <span class="changelog-fixes"><i class="fa fa-github"></i> <a href="https://github.com/graderoom/graderoom-website/issues/${num}/" target="_blank">#${num}</a></span>`;
                    });
                    if (item.title === "Known Issues" || item.title.substring(0, 12) === "Announcement") {
                        if (!item.content["Default"]) {
                            item.content["Default"] = [];
                        }
                        item.content["Default"].push(_line);
                    } else if (item.content[Object.keys(item.content)[bodyCount]]) {
                        item.content[Object.keys(item.content)[bodyCount]].push(_line);
                    } else {
                        // Prevents changelog file errors from crashing server
                        if (!item.content["Unfiled"]) {
                            item.title = "This shouldn't have happened. Send a bug report in More > Send Feedback. ERR #" + lineno;
                            item.content["Unfiled"] = [];
                        }
                        item.content["Unfiled"].push(_line);
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
                    legendHTML += "<div class=\"";
                    betaLegendHTML += "<div class=\"";
                    if (items[i].title.substring(0, 4) === "Beta") {
                        if (!betaCurrentVersionFound) {
                            betaResultHTML += " current";
                            betaLegendHTML += " current";
                            betaCurrentVersionFound = true;
                        }
                        resultHTML += "\">";
                        betaResultHTML += "\">";
                        legendHTML += "\">";
                        betaLegendHTML += "\">";
                    } else if (items[i].title.substring(0, 6) === "Stable") {
                        if (!currentVersionFound) {
                            resultHTML += " current\">";
                            legendHTML += " current\">";
                            currentVersionFound = true;
                        } else {
                            resultHTML += " stable\">";
                            legendHTML += " stable\">";
                        }
                        if (!betaCurrentVersionFound) {
                            betaResultHTML += " current\">";
                            betaLegendHTML += " current\">";
                            betaCurrentVersionFound = true;
                        } else {
                            betaResultHTML += " stable\">";
                            betaLegendHTML += " stable\">";
                        }
                    } else if (items[i].title.substring(0, 12) === "Announcement") {
                        betaResultHTML += " announcement\">";
                        resultHTML += " announcement\">";
                        betaLegendHTML += " announcement\">";
                        legendHTML += " announcement\">";
                    } else if (items[i].title.substring(0, 12) === "Known Issues") {
                        betaResultHTML += " known-issues\">";
                        resultHTML += " known-issues\">";
                        betaLegendHTML += " known-issues\">";
                        legendHTML += " known-issues\">";
                    } else {
                        betaResultHTML += "\">";
                        resultHTML += "\">";
                        betaLegendHTML += "\">";
                        legendHTML += "\">";
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
                    legendHTML += items[i].title;
                    legendHTML += "<p class=\"date\">" + items[i].date + "</p>";
                    betaLegendHTML += items[i].title;
                    betaLegendHTML += "<p class=\"date\">" + items[i].date + "</p>";
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
                    legendHTML += "</div>|";
                    betaLegendHTML += "</div>|";
                }
                _changelogArray = resultHTML.split("|");
                _betaChangelogArray = betaResultHTML.split("|");
                _changelogLegend = legendHTML.split("|");
                _betaChangelogLegend = betaLegendHTML.split("|");
                return resolve();
            });
        });
    }

    read().then(() => {
        console.log(`${filename} parsed`);
    });
};

exports.getPersonalInfo = (email, school) => {
    let firstName, lastName, graduationYear;
    switch (school) {
        case Schools.BISV:
            firstName = email.indexOf("_") === -1 ? email : email.substring(0, email.indexOf("_"));
            firstName = firstName[0].toUpperCase() + firstName.substring(1).toLowerCase();
            break;
        case Schools.BELL:
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
            break;
        case Schools.NDSJ:
            // First Name
            firstName = email.substring(0, 1).toUpperCase();

            // Last Name
            lastName = email.indexOf(email.match(/\d/)) === -1 ? email.substring(1) : email.substring(1, email.indexOf(email.match(/\d/)));
            lastName = lastName.length <= 1 ? lastName.toUpperCase() : lastName[0].toUpperCase() + lastName.substring(1).toLowerCase();

            // Graduation Year
            graduationYear = email.indexOf(email.match(/\d/)) === -1 ? "" :
                                 email.indexOf("@") === -1 ? email.substring(email.indexOf(email.match(/\d/))) : email.substring(email.indexOf(email.match(/\d/)), email.indexOf("@"));
            if (graduationYear) {
                graduationYear = parseInt(graduationYear);
                graduationYear += 2000;
            }
            break;
        default:
            break;
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
        if (!(key in verifiedWeight.weights)) continue;
        if (weight.weights[key] !== verifiedWeight.weights[key]) {
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
    return date.getTime() < (Date.parse(new Date().toDateString()));
}

exports.buildStarterNotifications = () => {
    return [{
        id: "starter0",
        type: "announcement",
        title: "Notification!",
        message: "This is a pinned notification. Click on it to open the notification panel.",
        dismissible: true,
        dismissed: false,
        important: true,
        pinnable: false,
        pinned: true,
        createdDate: -1,
    },{
        id: "starter1",
        type: "announcement",
        title: "Hover Me!",
        message: "Important notifications will glow. Most notifications will have actions on the right. Hover them to see what they do.",
        dismissible: true,
        dismissed: false,
        important: true,
        pinnable: true,
        pinned: false,
        createdDate: -2,
    },{
        id: "starter2",
        type: "announcement",
        title: "Hover Me Next!",
        message: "Some notifications require you to take some kind of action." +
                 this.notificationButton(`dismissById('starter2')`, `Click Me to Dismiss!`),
        dismissible: false,
        dismissed: false,
        important: false,
        pinnable: false,
        pinned: false,
        createdDate: -3,
    },{
        id: "starter3",
        type: "announcement",
        title: "Hover Me Last!",
        message: "This is what most of your notifications will look like. The color on the top left signifies the notification type. Hover each to see what they mean.",
        dismissible: true,
        dismissed: false,
        important: false,
        pinnable: true,
        pinned: false,
        createdDate: -4,
    }];
}

exports.notificationButton = function (onclickString, innerText) {
    return `<br><span class="notification-button" onclick="${onclickString}"><b><i class=\"fa fa-external-link-square\"></i> ${innerText}</b></span>`
}

exports.notificationTextField = function (id, onsubmitString, inputType, placeholderText, min="", max="", step="") {
    return `<br>
            <div class="form-group notification-text-field">
            <input id='${id}' type='${inputType}' placeholder='${placeholderText}' min='${min}' max='${max}' step='${step}' class="form-control">
            <btn onclick='${onsubmitString}' class="btn btn-sm">Submit</btn>
            </div>`;
}

exports.donoHelper = function (totalDonos) {
    return {donor: totalDonos > 0, plus: totalDonos >= minDonoAmount, premium: totalDonos >= minPremiumAmount}
}

exports.donoAttributes = function (donos) {
    let totalDonos = donos.map(d => d.receivedValue).reduce((a, b) => a + b, 0);
    return exports.donoHelper(totalDonos);
}

exports.nextSyncAllowed = function (lastSyncTimestamp, donoData) {
    let {donor, plus, premium} = exports.donoAttributes(donoData);
    if (premium) {
        return Date.now() > lastSyncTimestamp + premiumSyncPeriod;
    }
    if (plus) {
        return Date.now() > lastSyncTimestamp + plusSyncPeriod;
    }
    if (donor) {
        return Date.now() > lastSyncTimestamp + donorSyncPeriod;
    }
    return Date.now() > lastSyncTimestamp + freeSyncPeriod;
}
