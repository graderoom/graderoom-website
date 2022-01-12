const dbClient = require("./dbClient");
const socketManager = require("./socketManager");
module.exports = {
    setupSocket: function (socket, purpose) {
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
                break;
            case "noti":
                break;
        }
    },
}
