// load all the things we need
const LocalStrategy = require("passport-local").Strategy;
const authent = require("./authenticator.js");
const bcrypt = require("bcryptjs");
module.exports = function (passport) {

    // =========================================================================
    // passport session setup ==================================================
    // =========================================================================
    // required for persistent login sessions
    // passport needs ability to serialize and unserialize users out of session

    // used to serialize the user for the session
    passport.serializeUser(function (user, done) {
        done(null, user.username);
    });

    // used to deserialize the user
    passport.deserializeUser(function (username, done) {
        usr = authent.getUser(username);
        return done(null, usr);
    });

    // =========================================================================
    // LOCAL LOGIN =============================================================
    // =========================================================================
    passport.use("local-login", new LocalStrategy({
                                                      // by default, local strategy uses username and password, ]
                                                      usernameField: "username",
                                                      passwordField: "password",
                                                      passReqToCallback: true
                                                      // allows us to pass in the req from our route (lets us check if
                                                      // a user is logged in or not)
                                                  }, function (req, username, password, done) {
        if (username) {
            username = username.toLowerCase();
        }

        // asynchronous
        process.nextTick(function () {

            // if no user is found, return the message
            if (!authent.userExists(username)) {
                return done(null, false, req.flash("loginMessage", "User Not Found."));
            }
            if (authent.userDeleted(username)) {
                return done(null, false, req.flash("loginMessage", "This account has been deleted. Email graderoom@gmail.com to recover your account."))
            }

            let user = authent.getUser(username);
            if (bcrypt.compareSync(password, user.password)) {
                if (user.schoolPassword) {
                    let resp = authent.decryptAndGet(user.username, password);
                    let schoolPass = resp.message;
                    authent.updateGradesBackground(user.username, schoolPass);
                }
                return done(null, user);
            }
            return done(null, false, req.flash("loginMessage", "Incorrect Password."));
        });
    }));
};
