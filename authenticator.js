const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");
const adapter = new FileSync("user_db.json");
const db = low(adapter);
const bcrypt = require("bcryptjs");
const scraper = require("./scrape");
const randomColor = require("randomcolor");
const crypto = require("crypto");
const readline = require("readline");
const fs = require("fs");

db.defaults({users: [], keys: []}).write();

module.exports = {

    /* beta key functions */

    betaAddNewUser: async function (betaKey, username, password, schoolUsername, isAdmin) {
        let asbk = db.get("keys").find({betaKey: betaKey}).value();
        if (asbk) {

            if (asbk.claimed) {
                return {success: false, message: "Beta key already claimed."};
            }

            let r = await this.addNewUser(username, password, schoolUsername, isAdmin);
            if (r.success === true) {
                db.get("keys").find({betaKey: betaKey}).set("claimed", true).write();
                db.get("keys").find({betaKey: betaKey}).set("claimedBy", username).write();
            }
            return r;
        }
        return {success: false, message: "Invalid beta key."};

    },

    addNewBetaKey: function (betaKey) {
        db.get("keys").push({
                                betaKey: betaKey, claimed: false, claimedBy: ""
                            }).write();
        return {success: true, message: "Added beta key: " + betaKey + "."};
    },

    getAllBetaKeyData: function () {
        return db.get("keys").value();
    },

    removeBetaKey: function (betaKey) {
        db.get("keys").remove({
                                  betaKey: betaKey
                              }).write();
        return {success: true, message: "Removed beta key."};
    },

    /* user functions
     */

    bringAllUpToDate: function () {
        let users = db.get("users").value();
        for (let i = 0; i < users.length; i++) {
            this.bringUpToDate(users[i].username);
        }
    },

    bringUpToDate: function (username) {
        let lc_username = username.toLowerCase();
        let user = db.get("users").find({username: lc_username});
        // Fixes db for all old users
        for (let i = 0; i < user.value().grades.length; i++) {
            if (!(user.value().weights[user.value().grades[i].class_name])) {
                this.addNewWeightDict(lc_username, i, user.value().grades[i].class_name);
            }
        }

        // Fix theme for old users
        if (user.value().appearance.darkMode) {
            user.get("appearance").unset("darkMode").write();
            user.value().appearance.theme = "auto";
            user.value().appearance.darkModeStart = 18;
            user.value().appearance.darkModeFinish = 7;
        }
    }

    //Need to add Try Catches to error check when updating db values
    , addNewUser: function (username, password, schoolUsername, isAdmin) {

        let lc_username = username.toLowerCase();
        return new Promise((resolve, reject) => {

            if (this.userExists(lc_username)) {
                return resolve({success: false, message: "Username already in use."});
            }

            if (!isAlphaNumeric(username) || username.length > 16) {
                return resolve({
                                   success: false, message: "Username must contain only letters and numbers."
                               });
            }

            if (password.length < 6 || password.length > 64) {
                return resolve({
                                   success: false, message: "Password must be 6 - 64 characters in length."
                               });
            }

            if (!validateEmail(schoolUsername)) {
                return resolve({success: false, message: "This must be your .bcp email."});
            }

            const roundsToGenerateSalt = 10;
            bcrypt.hash(password, roundsToGenerateSalt, function (err, hash) {
                db.get("users").push({
                                         username: lc_username,
                                         password: hash,
                                         schoolUsername: schoolUsername,
                                         isAdmin: isAdmin,
                                         appearance: {
                                             theme: "auto", accentColor: null, classColors: []
                                         },
                                         alerts: {
                                             lastUpdated: "never", updateGradesReminder: "daily"
                                         },
                                         weights: {},
                                         grades: []
                                     }).write();

                return resolve({success: true, message: "User Created"});
            });
        });

    }, login: function (username, password) {
        let lc_username = username.toLowerCase();
        let user = db.get("users").find({username: lc_username}).value();
        if (bcrypt.compareSync(password, user.password)) {
            return {success: true, message: "Login Successful"};
        } else {
            return {success: false, message: "Login Failed"};
        }

    }, changePassword: async function (username, oldPassword, newPassword) {
        let lc_username = username.toLowerCase();
        if (!this.login(username, oldPassword).success) {
            return {success: false, message: "Old Password is Incorrect"};
        }
        if (newPassword.length < 6 || newPassword.length > 64) {
            return {success: false, message: "New Password must be 6 - 64 characters in length."};
        }
        let user = db.get("users").find({username: lc_username});
        let schoolPass;
        if (user.get("schoolPassword").value()) {
            schoolPass = this.decryptAndGet(username, oldPassword).message;
        }
        let roundsToGenerateSalt = 10;
        let hashedPass = bcrypt.hashSync(newPassword, roundsToGenerateSalt);
        user.assign({password: hashedPass}).write();
        if (schoolPass) {
            this.encryptAndStore(username, schoolPass, newPassword);
        }
        return {success: true, message: "Password Updated"};
    }, changeSchoolEmail: function (username, schoolUsername) {
        let lc_username = username.toLowerCase();
        if (!validateEmail(schoolUsername)) {
            return {success: false, message: "This must be your .bcp email."};
        }
        db.get("users").find({username: lc_username}).assign({schoolUsername: schoolUsername}).write();
        return {success: true, message: "School Email Updated"};
    }, removeUser: function (username, password) {
        let lc_username = username.toLowerCase();
        db.get("users").find({username: lc_username}).remove().write();
        return {success: true, message: "Account deleted."};
    }, userExists: function (username) {
        let lc_username = username.toLowerCase();
        let user = db.get("users").find({username: lc_username}).value();
        return !!user;

    }, setTheme: function (username, theme, darkModeStart, darkModeStartAmPm, darkModeFinish, darkModeFinishAmPm) {
        let lc_username = username.toLowerCase();
        let user = db.get("users").find({username: lc_username});
        user.get("appearance").set("theme", theme).write();
        let message = theme.replace(/^\w/, c => c.toUpperCase()) + " theme enabled!";
        if (theme === "auto") {
            darkModeStart = parseInt(darkModeStart);
            darkModeFinish = parseInt(darkModeFinish);
            if (darkModeStartAmPm === "PM") {
                if (darkModeStart !== 12) {
                    darkModeStart += 12;
                }
            } else if (darkModeStart === 12) {
                darkModeStart -= 12;
            }
            if (darkModeFinishAmPm === "PM") {
                if (darkModeFinish !== 12) {
                    darkModeFinish += 12;
                }
            } else if (darkModeFinish === 12) {
                darkModeFinish += 12;
            }
            if (darkModeStart === darkModeFinish) {
                user.get("appearance").set("theme", "light").write();
                return {success: true, message: "Light theme enabled!"};
            }
            if ((darkModeStart < 0 || darkModeStart > 24) && (darkModeFinish < 0 || darkModeFinish > 24)) {
                return {success: false, message: "Invalid Start and End Time"};
            }
            if (darkModeStart < 0 || darkModeStart > 24) {
                return {success: false, message: "Invalid Start Time"};
            }
            if (darkModeFinish < 0 || darkModeFinish > 24) {
                return {success: false, message: "Invalid Finish Time"};
            }
            user.get("appearance").set("darkModeStart", parseInt(darkModeStart)).write();
            user.get("appearance").set("darkModeFinish", parseInt(darkModeFinish)).write();
            if (darkModeStartAmPm === "PM") {
                if (darkModeStart !== 12) {
                    darkModeStart -= 12;
                }
            }
            if (darkModeFinishAmPm === "PM") {
                if (darkModeFinish !== 12) {
                    darkModeFinish -= 12;
                }
            }
            if (darkModeStart === 0) {
                darkModeStart = 12;
            }
            if (darkModeFinish === 24) {
                darkModeFinish = 12;
            }
            message = "Dark theme enabled from " + darkModeStart + " " + darkModeStartAmPm + " to " + darkModeFinish + " " + darkModeFinishAmPm + ".";
        }
        return {success: true, message: message};
    }, setUpdateGradesReminder: function (username, updateGradesReminder) {
        let lc_username = username.toLowerCase();
        let user = db.get("users").find({username: lc_username}).value();
        user.alerts.updateGradesReminder = updateGradesReminder;
        if (updateGradesReminder.toLowerCase() === "never") {
            return {success: true, message: "Grade update alerts disabled."};
        }
        return {success: true, message: updateGradesReminder + " grade update alerts enabled!"};
    }, getUser: function (username) {
        let lc_username = username.toLowerCase();
        let user = db.get("users").find({username: lc_username}).value();
        //Parse weights with unicode to dots
        if (user) {
            user.weights = JSON.parse(JSON.stringify(user.weights).replace(/\\\\u002e/g, "."));
        }
        return user;
    },

    checkUpdateBackground: function (username) {
        let lc_username = username.toLowerCase();
        let user = db.get("users").find({username: lc_username});
        if (user.get("updatedInBackground").value() === "complete") {
            user.set("updatedInBackground", "already done").write();
            return {success: true, message: "Sync Complete!"};
        } else if (user.get("updatedInBackground").value() === "already done") {
            return {success: true, message: "Already Synced!"};
        } else {
            return {success: false, message: "Did not sync"};
        }
    },

    disableGradeSync: function (username) {
        let lc_username = username.toLowerCase();
        let user = db.get("users").find({username: lc_username});
        user.unset("schoolPassword").write();
    },

    setAutoRefresh: function (username, autoRefresh) {
        let lc_username = username.toLowerCase();
        let user = db.get("users").find({username: lc_username});
        user.set("autoRefresh", autoRefresh).write();
    },

    updateGradesBackground: function (acc_username, school_password) {
        let lc_username = acc_username.toLowerCase();
        let user = db.get("users").find({username: lc_username});
        user.set("updatedInBackground", "").write();
        this.updateGrades(acc_username, school_password).then(function () {
            let lc_username = acc_username.toLowerCase();
            let user = db.get("users").find({username: lc_username});
            user.set("updatedInBackground", "complete").write();
        });
    },

    updateGrades: async function (acc_username, school_password) {
        let lc_username = acc_username.toLowerCase();
        let userRef = db.get("users").find({username: lc_username});
        let grade_update_status = await scraper.loginAndScrapeGrades(userRef.value().schoolUsername, school_password);
        if (!grade_update_status.success) {
            //error updating grades
            return grade_update_status;
        }
        for (let i = 0; i < grade_update_status.new_grades.length; i++) {
            if (!(containsClass(grade_update_status.new_grades[i], userRef.value().grades))) {
                this.setRandomClassColor(lc_username, i, true);
            }
            if (!(userRef.value().weights[grade_update_status.new_grades[i].class_name])) {
                this.addNewWeightDict(lc_username, i, grade_update_status.new_grades[i].class_name);
            }
        }
        for (let i = grade_update_status.new_grades.length; i < userRef.value().appearance.classColors.length; i++) {
            userRef.value().appearance.classColors.pop();
        }
        userRef.assign({grades: grade_update_status.new_grades}).write();
        userRef.get("alerts").set("lastUpdated", Date.now()).write();
        userRef.set("updatedInBackground", "already done").write();
        return {success: true, message: "Updated grades!"};
    },

    addNewWeightDict: function (username, index, className) {
        let lc_username = username.toLowerCase();
        let userRef = db.get("users").find({username: lc_username});
        let weights = userRef.value().weights;
        let newWeights = {};

        for (let i = 0; i < Object.keys(weights).length + 1; i++) {
            if (i < index) {
                newWeights[Object.keys(weights)[i]] = Object.values(weights)[i];
            } else if (i === index) {
                newWeights[className] = {};
            } else {
                newWeights[Object.keys(weights)[i - 1]] = Object.values(weights)[i - 1];
            }
        }
        userRef.set("weights", newWeights).write();
        return {success: true, message: newWeights};
    },

    setRandomClassColor: function (username, index, isNew) {
        let lc_username = username.toLowerCase();
        let userRef = db.get("users").find({username: lc_username});
        let classColors = userRef.get("appearance").get("classColors").value();

        if (isNew) {
            let length = classColors.length;
            for (let i = index; i < length; i++) {
                classColors[i + 1] = classColors[i];
            }
        }
        classColors[index] = randomColor();
        userRef.get("appearance").set("classColors", classColors).write();
        return {success: true, message: classColors};
    },

    getAllUsers: function () {
        return db.get("users").value();
    },

    deleteUser: function (username) {
        let lc_username = username.toLowerCase();
        if (this.userExists(lc_username)) {
            db.get("users").remove({username: lc_username}).write();
            return {success: true, message: "Deleted user."};
        }
        return {success: false, message: "User does not exist."};
    },

    makeAdmin: function (username) {
        let lc_username = username.toLowerCase();
        if (this.userExists(lc_username)) {
            db.get("users").find({username: lc_username}).assign({isAdmin: true}).write();
            return {success: true, message: "Made user admin."};
        }
        return {success: false, message: "User does not exist."};
    },

    removeAdmin: function (username) {
        let lc_username = username.toLowerCase();
        if (this.userExists(lc_username)) {
            db.get("users").find({username: lc_username}).assign({isAdmin: false}).write();
            return {success: true, message: "Removed admin privileges."};
        }
        return {success: false, message: "User does not exist."};
    },

    updateWeightsForClass: function (username, className, weights) {
        //default update, not override
        let lc_username = username.toLowerCase();
        let userRef = db.get("users").find({username: lc_username});
        console.log(weights);
        if (!userRef.value()) {
            return {success: false, message: "User does not exist."};
        }

        let clsRef = userRef.get("grades").find({class_name: className});

        if (!clsRef.value()) {
            return {success: false, message: "Class does not exist."};
        }

        let weightsRef = userRef.get("weights");

        //Replace dots(.) with unicode escape sequence
        let modClassName = className.replace(/\./g, "\\u002e");

        weightsRef.set(modClassName, weights).write();
        console.log(weightsRef.value());
        return {success: true, message: "Updated weights for " + className + "!"};
    },

    encryptAndStore: function (username, schoolPass, userPass) {
        let lc_username = username.toLowerCase();
        let user = db.get("users").find({username: lc_username});

        let resp = this.login(username, userPass);
        if (!resp.success) {
            return {success: false, message: resp.message};
        }

        let resizedIV = Buffer.allocUnsafe(16);
        let iv = crypto.createHash("sha256").update("myHashedIV").digest();
        iv.copy(resizedIV);
        let key = crypto.createHash("sha256").update(userPass).digest();
        let cipher = crypto.createCipheriv("aes256", key, resizedIV);
        let encryptedPass = cipher.update(schoolPass, "utf8", "hex");
        encryptedPass += cipher.final("hex");

        user.set("schoolPassword", encryptedPass).write();
        return {success: true, message: encryptedPass};
    },

    decryptAndGet: function (username, userPass) {
        let lc_username = username.toLowerCase();
        let user = db.get("users").find({username: lc_username});

        let resp = this.login(username, userPass);
        if (!resp.success) {
            return {success: false, message: resp.message};
        }

        let resizedIV = Buffer.allocUnsafe(16);
        let iv = crypto.createHash("sha256").update("myHashedIV").digest();
        iv.copy(resizedIV);
        let key = crypto.createHash("sha256").update(userPass).digest();
        let decipher = crypto.createDecipheriv("aes256", key, resizedIV);

        let schoolPass = user.get("schoolPassword").value();

        let decryptedPass = decipher.update(schoolPass, "hex", "utf8");
        decryptedPass += decipher.final("utf8");
        return {success: true, message: decryptedPass};
    },

    readChangelog: async function (beta, callback) {
        const readInterface = readline.createInterface({input: fs.createReadStream("CHANGELOG.md")});
        let resultHTML = "";
        let items = [];
        let bodyCount = -1;
        let item = {title: "", date: "", content: {}};
        readInterface.on("line", function (line) {
            if (line.substring(0, 3) === "###") {
                item.content[line.substring(4)] = [];
                bodyCount++;
            } else if (line.substring(0, 2) === "##") {
                if (item.title !== "") {
                    items.push(item);
                    item = {title: "", date: "", content: {}};
                    bodyCount = -1;
                }
                item.title = line.substring(4, line.indexOf("]"));
                item.date = line.substring(line.indexOf("-") + 2);
            } else if (line.substring(0, 1) === "-") {
                if (item.title === "Unreleased" || item.title === "Known Issues") {
                    if (!item.content["Default"]) {
                        item.content["Default"] = [];
                    }
                    item.content["Default"].push(line.substring(2));
                } else {
                    item.content[Object.keys(item.content)[bodyCount]].push(line.substring(2));
                }
            }
        }).on("close", function () {
            items.push(item);
            for (let i = 0; i < items.length; i++) {
                resultHTML += "<div class=\"changelog-item\">";
                resultHTML += "<div class=\"header\">";
                resultHTML += "<div class=\"title\">" + items[i].title + "</div>";
                resultHTML += "<div class=\"date\">" + items[i].date + "</div>";
                resultHTML += "</div>";
                resultHTML += "<div class=\"content\">";
                if (items[i].title !== "Unreleased" && items[i].title !== "Known Issues") {
                    for (let j = 0; j < Object.keys(items[i].content).length; j++) {
                        resultHTML += "<div class=\"type " + Object.keys(items[i].content)[j].toLowerCase() + "\">" + Object.keys(items[i].content)[j] + "</div>";
                        for (let k = 0; k < items[i].content[Object.keys(items[i].content)[j]].length; k++) {
                            resultHTML += "<ul class=\"body\">" + items[i].content[Object.keys(items[i].content)[j]][k] + "</ul>";
                        }
                    }
                } else {
                    for (let j = 0; j < items[i].content["Default"].length; j++) {
                        resultHTML += "<ul class=\"body\">" + items[i].content["Default"][j] + "</ul>";
                    }
                }
                resultHTML += "</div>";
                resultHTML += "</div>";
            }
            return callback(resultHTML);
        });
    }
};

function isAlphaNumeric(str) {
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
}

function validateEmail(email) {
    let re = /\S+\d+@bcp+\.org+/;
    return re.test(email);
}

function containsClass(obj, list) {
    for (let i = 0; i < list.length; i++) {
        if (list[i].class_name === obj.class_name) {
            return true;
        }
    }
    return false;
}
