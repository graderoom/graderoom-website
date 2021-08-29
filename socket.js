const authenticator = require("./authenticator");
module.exports = {
    setupSocket: function (socket, purpose) {
        purpose = purpose.toLowerCase(); // Just in case
        switch (purpose) {
            case "main":
                socket.on("settings-change", (data) => {
                    let keys = Object.keys(data);
                    for (let key of keys) {
                        let value = data[key];
                        let resp;
                        switch (key) {
                            case "enableLogging":
                                resp = authenticator.setEnableLogging(socket.request.user.username, value);
                                break;
                        }
                        if (resp.success) {
                            socket.emit("success-settingschange", resp);
                        } else {
                            socket.emit("fail-settingschange", resp);
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
