const express = require("express");
const app = express();
const http = require("http");
const httpPort = 5998; //process.env.PORT || 8080;
const flash = require("connect-flash");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const session = require("express-session");
const passport = require("passport");
const dbConn = require("./authenticator.js");
const fs = require("fs");

const productionEnv = process.argv[2] === undefined ? false : process.argv[2];

module.exports.needsBetaKeyToSignUp = true; //todo

app.use("/public/", express.static("./public"));
require("./passport")(passport); // pass passport for configuration

// set up our express application
if (productionEnv) {
    app.use(morgan("common", {
        stream: fs.createWriteStream("./graderoom.log", {flags: "a"})
    }));
}

app.use(morgan("dev")); // log every request to the console
app.use(cookieParser()); // read cookies (needed for auth)
app.use(bodyParser.json()); // get information from html forms
app.use(bodyParser.urlencoded({extended: true}));

app.set("view engine", "ejs"); // set up ejs for templating #todo do we want this

/**
 * FIRSt TIME sETUP: add admin user
 * she can be deleted and recreated with a new password, this is just the default
 * also TODO dont hard code this
 */

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "password";
const ADMIN_SCHOOL_USERNAME = "admin1@bcp.org";

if (!dbConn.userExists(ADMIN_USERNAME)) {
    console.log("Creating admin account.");
    dbConn.addNewUser(ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_SCHOOL_USERNAME, true).then(r => {
        console.log(r);
    });
}

// required for passport
app.use(session({
                    secret: "secret", // session secret //TODO CHANGE
                    resave: true, saveUninitialized: true, cookie: {maxAge: 1 * 1 * 10 * 1000} //4 hours
                }));
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash()); // use connect-flash for flash messages stored in session

// routes ======================================================================
require("./routes.js")(app, passport); // load our routes and pass in our app and fully configured
                                       // passport

// launch ======================================================================

dbConn.backupdb();
const httpServer = http.createServer(app);
httpServer.listen(httpPort, () => {
    console.log("HTTP Server running on port " + httpPort);
});
