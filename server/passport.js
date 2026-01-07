// load all the things we need
const LocalStrategy = require("passport-local").Strategy;
const dbClient = require("./dbClient");
const bcrypt = require("bcryptjs");
const {SyncStatus, Schools} = require("./enums");
const socketManager = require('./socketManager');
const {nextSyncAllowed, nextSyncWhen} = require('./dbHelpers');
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
        // Only get some info
        let projection = {
            schoolUsername: 1,
            isAdmin: 1,
            donoData: 1,
            school: 1,
            personalInfo: 1,
            appearance: 1,
            betaFeatures: 1,
            enableLogging: 1,
            api: 1,
            'discord.discordID': 1,
            sortingData: 1,
            updatedGradeHistory: 1,
        };
        let res = await dbClient.getUser(username, projection);
        if (res.success) {
            return done(null, res.data.value);
        }
        return done(null, null);
    });

    // =========================================================================
    // LOCAL LOGIN =============================================================
    // =========================================================================
    passport.use("local-login", new LocalStrategy({
        // by default, local strategy uses username and password,
        usernameField: "username",
        passwordField: "password",
        passReqToCallback: true
        // allows us to pass in the req from our route (lets us check if
        // a user is logged in or not)
    }, async function (req, username, password, done) {
        if (username) {
            username = username.toLowerCase();
        }

        // asynchronous
        process.nextTick(async function () {

            // if no user is found, return the message
            let res = await dbClient.userExists({username: username, schoolUsername: username}, true);
            if (!res.success) {
                let res2 = await dbClient.userArchived({username: username, schoolUsername: username});
                if (res2.success) {
                    return done(null, false, req.flash("loginMessage",
                            "This account has been archived! Email <a href='mailto:support@graderoom.me'>support@graderoom.me</a> to recover your account."
                    ));
                }
                return done(null, false, req.flash("loginMessage", "Invalid Credentials"));
            }

            let user = res.data.value;
            if (user && bcrypt.compareSync(password, user.password)) {
                await dbClient.setLoggedIn(user.username);
                if (user.school === Schools.BELL) {
                    let lastUpdated = user.alerts.lastUpdated;
                    if (lastUpdated.length) {
                        if (!nextSyncAllowed(lastUpdated.slice(-1)[0].timestamp, user.donoData)) {
                            await dbClient.setSyncStatus(user.username, SyncStatus.LIMIT);
                            socketManager.emitToRoom(user.username, "sync-limit", {timestamp: nextSyncWhen(lastUpdated.slice(-1)[0].timestamp, user.donoData)})
                            return done(null, user);
                        }
                    }
                    await dbClient.setSyncStatus(user.username, SyncStatus.LOCAL);
                } else if ('schoolPassword' in user) {
                    await dbClient.setSyncStatus(user.username, SyncStatus.UPDATING);
                    let resp = await dbClient.decryptAndGetSchoolPassword(user.username, password);
                    let schoolPass = resp.data.value;
                    await dbClient.updateGrades(user.username, schoolPass);
                }
                return done(null, user);
            }
            return done(null, false, req.flash("loginMessage", "Invalid Credentials"));
        });
    }));
};
