const express = require("express");
const app = express();
const http = require("http");
const httpPort = parseInt(process.env.port);
const isBetaServer = httpPort !== 5996;
const flash = require("connect-flash");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const redis = require("redis");
const session = require("express-session");
const passport = require("passport");
const productionEnv = process.env.NODE_ENV === "production";
const fs = require("fs");
const {watchChangelog, readChangelog} = require("./dbHelpers");

module.exports.beta = isBetaServer;

readChangelog("CHANGELOG.md");
watchChangelog();

// MONGO TIME
const mongo = require("./dbClient");
let mongoUrl;
if (productionEnv) {
    mongoUrl = process.env.DB_URL;
} else {
    mongoUrl = "mongodb://localhost:27017";
}
mongo.config(mongoUrl, productionEnv, isBetaServer).then(() => {
    mongo.init().then(async () => {
        if (!productionEnv) {
            let pass = await require("./dbTests").runAll();
            if (!pass) {
                console.log("Some tests failed. Server will not start. Exiting...");
                process.exit();
            }
        }

        await mongo.updateAllClasses();
        await mongo.updateAllUsers();
        console.log('Starting node.js server...');

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
        app.use(bodyParser.json({limit: '1mb'})); // get information from html forms
        app.use(bodyParser.urlencoded({limit: '1mb', extended: true}));

        app.set("view engine", "ejs"); // set up ejs for templating #todo do we want this

        // required for passport
        let RedisStore = require("connect-redis")(session);
        let redisPort = httpPort + 383; // 6379 for stable, 6381 for beta
        let redisClient = redis.createClient({port: redisPort});
        let store = new RedisStore({client: redisClient});
        app.use(session({
                            store: store, secret: process.env.SECRET, // session secret
                            resave: true, saveUninitialized: true, cookie: {maxAge: 4 * 60 * 60 * 1000} //4 hours
                        }));
        app.use(passport.initialize());
        app.use(passport.session()); // persistent login sessions
        app.use(flash()); // use connect-flash for flash messages stored in session

        // routes ======================================================================
        require("./routes.js")(app, passport); // load our routes and pass in our app and fully configured
                                               // passport

        // launch ======================================================================

        const httpServer = http.createServer(app);
        const io = require("socket.io")(httpServer);
        const passportSocketIo = require("passport.socketio");
        io.use(passportSocketIo.authorize({
                                              key: "connect.sid",
                                              passport: passport,
                                              cookieParser: cookieParser,
                                              secret: process.env.SECRET,
                                              store: store
                                          }));
        require("./sockets").sockets(io);
        require("./socketManager").setIo(io);
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
    });
});
