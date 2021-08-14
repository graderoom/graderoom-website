const authenticator = require("./authenticator");

module.exports = {
    setup: function (socket, purpose) {
        switch (purpose) {
            case "MAIN":
                socket.on("settings-change", (data) => {
                    let keys = Object.keys(data);
                    keys.forEach((key) => {
                        let value = data[key];
                        let resp;
                        switch(key) {
                            case "enableLogging":
                                resp = authenticator.setLogging(socket.request.user.username, value);
                                break;
                        }
                        if (resp.success) {
                            socket.emit("settings-change-success", resp.message);
                        } else {
                            socket.emit("settings-change-failure", resp.message);
                        }
                    });
                });
                break;
            case "SYNC":

            case "NOTI":

        }
    }
}