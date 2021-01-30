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

const productionEnv = process.env.NODE_ENV === "production";

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
    dbConn.addNewUser(ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_SCHOOL_USERNAME, true, module.exports.needsBetaKeyToSignUp).then(r => {
        console.log(r);
        dbConn.setColorPalette(ADMIN_USERNAME, "clear", false);
    });
}

// required for passport
app.use(session({
                    secret: "secret", // session secret //TODO CHANGE
                    resave: true, saveUninitialized: true, cookie: {maxAge: 4 * 60 * 60 * 1000} //4 hours
                }));
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash()); // use connect-flash for flash messages stored in session

// routes ======================================================================
require("./routes.js")(app, passport); // load our routes and pass in our app and fully configured
                                       // passport

// launch ======================================================================

dbConn.backupdb();
dbConn.updateAllDB();
dbConn.backupdb();
dbConn.readChangelog("CHANGELOG.md");
dbConn.watchChangelog();
const httpServer = http.createServer(app);
httpServer.listen(httpPort, () => {
    if (process.platform === "win32") { // If on windows print ip for testing mobile app locally (mac ppl can comment this out when test)
        "use strict";

        const {networkInterfaces} = require("os");

        const nets = networkInterfaces();
        const results = {};

        for (const name of Object.keys(nets)) {
            for (const net of nets[name]) {
                // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
                if (net.family === "IPv4" && !net.internal) {
                    if (!results[name]) {
                        results[name] = [];
                    }
                    results[name].push(net.address);
                }
            }
        }

        console.log("Server IPs: ");
        console.table(results);
    }
    console.log("HTTP Server running on port " + httpPort);
});
