// load all the things we need
var LocalStrategy = require('passport-local').Strategy;
let authent = require('./authenticator.js');
module.exports = function(passport) {

    // =========================================================================
    // passport session setup ==================================================
    // =========================================================================
    // required for persistent login sessions
    // passport needs ability to serialize and unserialize users out of session

    // used to serialize the user for the session
    passport.serializeUser(function(user, done) {
        done(null, user.username);
    });

    // used to deserialize the user
    passport.deserializeUser(function(username, done) {
        usr = authent.getUser(username);
        return done(null, usr)
    });

    // =========================================================================
    // LOCAL LOGIN =============================================================
    // =========================================================================
    passport.use('local-login', new LocalStrategy({
        // by default, local strategy uses username and password, ]
        usernameField : 'username',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)
    },
    function(req, username, password, done) {
        if (username)
            username = username.toLowerCase();

        // asynchronous
        process.nextTick(function() {

            user = authent.getUser(username)
                // if no user is found, return the message
            if (!user) {
                return done(null, false, req.flash('loginMessage', 'No user found.'));
            }

            if (user.password != password) {
                return done(null, false, req.flash('loginMessage', 'Wrong pass.'));
            }
            // all is well, return user
            return done(null, user);
            
        });
    }));
};
