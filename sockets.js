const socketFunctions = require("./socket");
const {getSyncStatus} = require("./dbClient");
let io;

module.exports = {
    sockets: function (_io) {
        io = _io;
        io.on("connection", async (socket) => {
            let username = socket.request.user.username;
            let res = await getSyncStatus(socket.request.user.username);
            socket.emit("info-initialstatus", res.data);
            let roomName = username;
            socket.join(roomName);
            this.logRoom(roomName);
            socket.on("disconnect", () => {
                this.logRoom(roomName);
            });
            socketFunctions.setupSocket(socket);
        });
    }, logRoom: function (roomName) {
        let room = io.sockets.adapter.rooms.get(roomName);
        let size = room ? room.size : 0;
        console.log(size + " socket(s) connected to " + roomName);
        io.to(roomName).emit("info-server-connection", size + " socket(s) connected to " + roomName);
    }
};
