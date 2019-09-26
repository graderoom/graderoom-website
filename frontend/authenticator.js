const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const adapter = new FileSync('db.json');
const db = low(adapter);

db.defaults({users: []}).write();

module.exports = {
    //Need to add Try Catches to error check when updating db values

    addNewUser: function(username, password, schoolUsername, schoolPassword) {
        db.get('users').push({username: username, 
                              password: password, 
                              schoolUsername: schoolUsername, 
                              schoolPassword: schoolPassword}).write();
        return {success: true, message: "User Created"};
    },
    login: function(username, password) {
        user = db.get('users').find({username: username}).value();
        if (user.password = password) {
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
        return {success: true, message: "Account Deleted"};      
    },
    userExists: function(username) {
        user = db.get('users').find({username: username});
        if (user)
            return true
        return false
    }
}