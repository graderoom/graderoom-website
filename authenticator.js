const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const adapter = new FileSync('user_db.json');
const db = low(adapter);
let scraper = require('./scrape');


db.defaults({users: []}).write();

module.exports = {
    //Need to add Try Catches to error check when updating db values
    addNewUser: function(username, password, schoolUsername, schoolPassword, isAdmin) {
        if (this.userExists(username)) {
            return {success: false, message: "User Already Exists"};
        }

        db.get('users').push(
            {
                username: username,
                password: password,
                schoolUsername: schoolUsername,
                schoolPassword: schoolPassword,
                isAdmin: isAdmin,
                grades: [],
            }).write();

        return {success: true, message: "User Created"};
    },
    login: function(username, password) {
        let user = db.get('users').find({username: username}).value();
        if (user.password === password) {
            return {success: true, message: "Login Successful"};
        }
        return {success: false, message: "Login Failed"};
    },
    changePassword: function(username, password) {
        db.get('users').find({username: username}).assign({password: password}).write();
        return {success: true, message: "Password Updated"};
    },
    changeSchoolUsername: function(username, schoolUsername) {
        db.get('users').find({username: username}).assign({schoolUsername: schoolUsername}).write();
        return {success: true, message: "School Username Updated"};       
    },
    changeSchoolPassword: function(username, schoolPassword) {
        db.get('users').find({username: username}).assign({schoolPassword: schoolPassword}).write();
        return {success: true, message: "School Password Updated"};       
    },
    removeUser: function(username, password) {
        db.get('users').find({username: username}).remove().write();
        return {success: true, message: "Account deleted."};
    },
    userExists: function(username) {
        let user = db.get('users').find({username: username}).value();
        if (user) {
            return true;
        }
        return false;
    },

    getUser: function(username) {
        let user = db.get('users').find({username: username}).value();
        return user
    },

    updateGrades: async function(username) {
        let userRef = db.get('users').find({username: username});
        let user = userRef.value();
        let grade_update_status = await scraper.loginAndScrapeGrades(user.schoolUsername, user.schoolPassword);
        console.log(grade_update_status);
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

    deleteUser: function(userToRemove) {

        if (this.userExists(userToRemove)) {
            db.get('users').remove({username: userToRemove}).write();
            return {success: true, message: "Deleted user."}
        }
        return {success: false, message: "User does not exist."}
    }


    // testPassword: function(username, password) {
    //     user = db.get('users').find({username: username});
    //     if (user) {
    //         //todo add hash
    //         return password == user.password;
    //     }
    //     return false;
    // }

};