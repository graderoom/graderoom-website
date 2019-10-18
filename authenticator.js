const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const adapter = new FileSync('user_db.json');
const db = low(adapter);
const bcrypt = require('bcrypt');
const scraper = require('./scrape');


db.defaults({users: []}).write();

module.exports = {
    //Need to add Try Catches to error check when updating db values
    addNewUser: function(username, password, schoolUsername, isAdmin) {

        let lc_username = username.toLowerCase();
        return new Promise((resolve, reject) => {

            if (this.userExists(lc_username)) {
                return resolve({success: false, message: "Username already in use."});
            }

            if (!isAlphaNumberic(username) || username.length > 16) {
                return resolve({success: false, message: "u"});
            }

            if (password.length < 6 || password.length > 64) {
                return resolve({success: false, message: "Password must be 6 - 64 characters in length"})
            }

            if (!validateEmail(schoolUsername)) {
                return resolve({success: false, message: "This must be your .bcp email."});
            }

        const roundsToGenerateSalt = 10;
            bcrypt.hash(password,roundsToGenerateSalt,function(err, hash) {
                db.get('users').push(
                    {
                        username: lc_username,
                        password: hash,
                        schoolUsername: schoolUsername,
                        isAdmin: isAdmin,
                        grades: [],
                    }).write();

                return resolve({success: true, message: "User Created"});
            });
        })

    },
    login: function(username, password) {
        let lc_username = username.toLowerCase();
        let user = db.get('users').find({username: lc_username}).value();
        bcrypt.compare(password, user.password, function (err, res) {
            if (res) {
                return {success: true, message: "Login Successful"};
            } else {
                return {success: false, message: "Login Failed"};
            }
        });
    },
    changePassword: function(username, password) {
        let lc_username = username.toLowerCase();
        let roundsToGenerateSalt = 10;
        bcrypt.hash(password,roundsToGenerateSalt,function(err,hash) {
            db.get('users').find({username: lc_username}).assign({password: hash}).write();
        });
        return {success: true, message: "Password Updated"};
    },
    changeSchoolUsername: function(username, schoolUsername) {
        let lc_username = username.toLowerCase();
        db.get('users').find({username: lc_username}).assign({schoolUsername: schoolUsername}).write();
        return {success: true, message: "School Email Updated"};       
    },
    removeUser: function(username, password) {
        let lc_username = username.toLowerCase();
        db.get('users').find({username: lc_username}).remove().write();
        return {success: true, message: "Account deleted."};
    },
    userExists: function(username) {
        let lc_username = username.toLowerCase();
        let user = db.get('users').find({username: lc_username}).value();
        if (user) {
            return true;
        }
        return false;
    },

    getUser: function(username) {
        let lc_username = username.toLowerCase();
        let user = db.get('users').find({username: lc_username}).value();
        return user
    },

    updateGrades: async function(acc_username, school_password) {
        let lc_username = acc_username.toLowerCase();
        let userRef = db.get('users').find({username: acc_username});
        let grade_update_status = await scraper.loginAndScrapeGrades(userRef.value().schoolUsername, school_password);
        // console.log(grade_update_status);
        if (!grade_update_status.success) {
            //error updating grades
            return grade_update_status;
        }
        userRef.assign({grades: grade_update_status.new_grades}).write();
        return {success: true, message: "Updated grades!"};
    },

    getAllUsers: function() {
        return db.get('users').value();
    },

    deleteUser: function(username) {
        let lc_username = username.toLowerCase();
        if (this.userExists(lc_username)) {
            db.get('users').remove({username: lc_username}).write();
            return {success: true, message: "Deleted user."}
        }
        return {success: false, message: "User does not exist."}
    },

    updateWeightsForClass: function(username, className, weights) {
        let lc_username = username.toLowerCase();
        let userRef = db.get('users').find({username: lc_username});
        console.log(weights);
        if (!userRef.value()) {
            return {success: false, message: "User does not exist."}
        }

        let clsRef = userRef.get('grades').find({class_name: className});

        if (!clsRef.value()) {
            return {success: false, message: "Class does not exist."}
        }

        clsRef.assign({weights: weights}).write();

        return {success: true, message: "Updated weights for " + className + "!"};

    }


};

function isAlphaNumberic(str) {
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
    let re = /\S+@bcp+\.org+/;
    return re.test(email);
}
