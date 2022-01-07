// load all the things we need
const LocalStrategy = require("passport-local").Strategy;
const dbClient = require("./dbClient");
const bcrypt = require("bcryptjs");
const socketManager = require("./socketManager");
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
    passport.deserializeUser(async function (username, done) {
        let res = await dbClient.getUser({username: username});
        if (res.success) {
            return done(null, res.data.value);
        }
        return done(null, null);
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

        let userRef = authent.getUserRef(username);
        let user = userRef.value();
        if (user && 'updatedInBackground' in user) {
            userRef.set("updatedInBackground", "updating").write();
        }

        // asynchronous
        process.nextTick(async function () {

            // if no user is found, return the message
            let res = await dbClient.userExists({username: username, schoolUsername: username});
            if (!res.success) {
                return done(null, false, req.flash("loginMessage", "Invalid Credentials"));
            }

            let user = res.data.value;
            if (user && bcrypt.compareSync(password, user.password)) {
                authent.setLoggedIn(user.username);
                if ('schoolPassword' in user) {
                    let resp = await dbClient.decryptAndGetSchoolPassword(user.username, password);
                    let schoolPass = resp.data.value;
                    let _stream = authent.updateGrades(user.username, schoolPass);
                    let {term, semester} = (await dbClient.getMostRecentTermData(user.username)).data;

                    _stream.on("data", (data) => {
                        if (!('success' in data)) {
                            return;
                        }
                        if (data.success) {
                            if (term && semester) {
                                socketManager.emitToRoom(user.username, "sync", "success-alldata", {
                                    gradeSyncEnabled: true,
                                    message: data.message,
                                    grades: JSON.stringify(req.user.grades[term][semester].filter(grades => !(["CR", false]).includes(grades.overall_letter) || grades.grades.length)),
                                    weights: JSON.stringify(req.user.weights[term][semester]),
                                    updateData: JSON.stringify(req.user.alerts.lastUpdated.slice(-1)[0])
                                });
                            } else {
                                socketManager.emitToRoom(user.username, "sync", "fail-termsemester", data.message);
                            }
                        } else {
                            userRef.set("updatedInBackground", "account-inactive").write();
                            socketManager.emitToRoom(user.username, "sync", "fail", data.message);
                        }
                    });
                }
                return done(null, user);
            }
            return done(null, false, req.flash("loginMessage", "Invalid Credentials"));
        });
    }));
};
