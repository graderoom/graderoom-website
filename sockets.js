const ALLOWED_PURPOSES = ["MAIN", "SYNC", "NOTI"];
const socketFunctions = require("./socket");
let io;

module.exports = {
    sockets: function (_io) {
        io = _io;
        io.on("connection", (socket) => {
            let purpose = socket.handshake.query['purpose'];
            if (!(typeof purpose === "string")) {
                socket.emit('Purpose must be a string');
                socket.disconnect();
                return;
            }
            if (!ALLOWED_PURPOSES.includes(purpose.toLowerCase())) {
                socket.emit('Invalid purpose');
                socket.disconnect();
                return;
            }
            let username = socket.request.user.username;
            let roomName = username + "-" + purpose;
            socket.join(roomName);
            let room = io.sockets.adapter.rooms.get(roomName);
            console.log(room.size + " socket(s) connected to " + roomName);
            io.to(roomName).emit("info-server-connection", room.size + " socket(s) connected to " + roomName);
            socketFunctions.setup(socket, purpose);
        });
    },
    getRoom: function(username, purpose) {
        let roomName = username + "-" + purpose;
        if (exists(roomName)) return io.to(roomName);
    },
}

function exists(roomName) {
    return io.sockets.adapter.rooms.get(roomName) != null;
}