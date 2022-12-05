const dbClient = require("./dbClient");
const socketManager = require("./socketManager");
module.exports = {
    setupSocket: function (socket, purpose) {
        if (process.env.NODE_ENV !== "production") {
            logSocket(socket, purpose);
        }
        purpose = purpose.toLowerCase(); // Just in case
        switch (purpose) {
            case "main":
                socket.on("settings-change", async (data) => {
                    let keys = Object.keys(data);
                    for (let key of keys) {
                        let value = data[key];
                        let resp;
                        switch (key) {
                            case "enableLogging":
                                resp = await dbClient.setEnableLogging(socket.request.user.username, value);
                                break;
                            case "animateWhenUnfocused":
                                resp = await dbClient.setAnimateWhenUnfocused(socket.request.user.username, value);
                                break;
                            case "showFps":
                                resp = await dbClient.setShowFps(socket.request.user.username, value);
                                break;
                            case "theme":
                                let {theme, darkModeStart, darkModeFinish, seasonalEffects, blurEffects} = value;
                                resp = await dbClient.setTheme(socket.request.user.username, theme, darkModeStart, darkModeFinish, seasonalEffects, blurEffects);
                                break;
                            case "regularizeClassGraphs":
                                resp = await dbClient.setRegularizeClassGraphs(socket.request.user.username, value);
                                break;
                            case "showPlusMinusLines":
                                resp = await dbClient.setShowPlusMinusLines(socket.request.user.username, value);
                                break;
                            case "reduceMotion":
                                resp = await dbClient.setReduceMotion(socket.request.user.username, value);
                                break;
                        }
                        if (resp.success) {
                            socketManager.emitToRoom(socket.request.user.username, purpose, "success-settingschange", resp.data);
                        } else {
                            socketManager.emitToRoom(socket.request.user.username, purpose, "fail-settingschange", resp.data);
                        }
                    }
                });
                break;
            case "sync":
                socket.on("start-update", async (data) => {
                    let username = socket.request.user.username;
                    let gradeSync = data.gradeSync;
                    let schoolPass = data.schoolPassword;
                    let userPass = data.userPassword;

                    if (userPass) {
                        if (gradeSync) {
                            let resp = await dbClient.login(username, userPass);
                            if (!resp.success) {
                                socketManager.emitToRoom(username, purpose, "fail-general", {message: resp.data.message});
                                return;
                            }
                        } else {
                            let resp = await dbClient.decryptAndGetSchoolPassword(username, userPass);
                            if (resp.success) {
                                schoolPass = resp.data.value;
                            } else {
                                socketManager.emitToRoom(username, purpose, "fail-general", {message: resp.data.message});
                                return;
                            }
                        }
                    }

                    await dbClient.updateGrades(username, schoolPass, userPass, gradeSync);
                })
                break;
            case "noti":
                break;
        }
    },
}

function logSocket(socket, socketName) {

    function displayNicely(...args) {
        return args.map(arg => {
            return JSON.stringify(arg);
        });
    }

    socket.onAny((event, ...args) => {
        if (event.startsWith("info")) {
            console.info(socketName + " | " + event + " | " + displayNicely(...args).join(" | "));
        } else if (event.startsWith("error")) {
            console.error(socketName + " | " + event + " | " + displayNicely(...args).join(" | "));
        } else if (event.startsWith("fail")) {
            console.warn(socketName + " | " + event + " | " + displayNicely(...args).join(" | "));
        } else {
            console.log(socketName + " | " + event + " | " + displayNicely(...args).join(" | "));
        }
    });
}
