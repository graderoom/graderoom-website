const dbClient = require("./dbClient");
const socketManager = require("./socketManager");
module.exports = {
    setupSocket: function (socket) {
        if (process.env.NODE_ENV !== "production") {
            logSocket(socket);
        }
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
                if (resp?.success) {
                    socketManager.emitToRoom(socket.request.user.username, "success-settings-change", resp.data);
                } else {
                    socketManager.emitToRoom(socket.request.user.username, "fail-settings-change", resp.data);
                }
            }
        });
        socket.on("start-update", async (data) => {
            let username = socket.request.user.username;
            let gradeSync = data.gradeSync;
            let schoolPass = data.schoolPassword;
            let userPass = data.userPassword;

            if (userPass) {
                if (gradeSync) {
                    let resp = await dbClient.login(username, userPass);
                    if (!resp?.success) {
                        socketManager.emitToRoom(username, "fail-general", {message: resp.data.message});
                        return;
                    }
                } else {
                    let resp = await dbClient.decryptAndGetSchoolPassword(username, userPass);
                    if (resp?.success) {
                        schoolPass = resp.data.value;
                    } else {
                        socketManager.emitToRoom(username, "fail-general", {message: resp.data.message});
                        return;
                    }
                }
            }

            await dbClient.updateGrades(username, schoolPass, userPass, gradeSync);
        })
        socket.on("notification-settings-change", async (data) => {
            let keys = Object.keys(data);
            for (let key of keys) {
                let value = data[key];
                let resp;
                switch (key) {
                    case "showUpdatePopup":
                        resp = await dbClient.setShowUpdatePopup(socket.request.user.username, value);
                        break;
                }
                if (resp?.success) {
                    socketManager.emitToRoom(socket.request.user.username, "success-notification-settings-change", resp.data);
                } else {
                    socketManager.emitToRoom(socket.request.user.username, "fail-notification-settings-change", resp.data);
                }
            }
        });
        socket.on("notification-update", async (data) => {
                    let id = data.id;
                    let update = data.data;
                    let resp = await dbClient.updateNotification(socket.request.user.username, id, update);
                    if (resp?.success) {
                        socketManager.emitToRoom(socket.request.user.username, "success-notification-update", resp.data);
                    } else {
                        socketManager.emitToRoom(socket.request.user.username, "fail-notification-update", resp.data);
                    }
                });
        socket.on("discord-verify", async (data) => {
            let verificationCode = data.verificationCode;
            let resp = await dbClient.discordVerify(socket.request.user.username, verificationCode);
            await dbClient.deleteNotification(socket.request.user.username, "discord-verify");
            if (resp.success) {
                let notification = {
                    id: "discord-verified",
                    type: "discord",
                    title: "Discord Verified!",
                    message: "Your Discord account was successfully connected to your Graderoom account",
                    dismissible: true,
                    dismissed: false,
                    important: true,
                    pinnable: false,
                    pinned: true,
                    createdDate: Date.now(),
                };
                socketManager.emitToRoom(socket.request.user.username, "notification-new", notification);
            } else {
                let notification = {
                    id: "discord-fail",
                    type: "error",
                    title: "Verification Failed",
                    message: resp.data.message,
                    dismissible: true,
                    dismissed: false,
                    important: true,
                    pinnable: false,
                    pinned: true,
                    createdDate: Date.now(),
                };
                socketManager.emitToRoom(socket.request.user.username, "notification-new", notification);
            }
        });
    },
}

function logSocket(socket) {

    function displayNicely(...args) {
        return args.map(arg => {
            return JSON.stringify(arg);
        });
    }

    socket.onAny((event, ...args) => {
        if (event.startsWith("info")) {
            console.info(event + " | " + displayNicely(...args).join(" | "));
        } else if (event.startsWith("error")) {
            console.error(event + " | " + displayNicely(...args).join(" | "));
        } else if (event.startsWith("fail")) {
            console.warn(event + " | " + displayNicely(...args).join(" | "));
        } else {
            console.log(event + " | " + displayNicely(...args).join(" | "));
        }
    });
}
