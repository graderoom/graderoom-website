let io;

module.exports = {
    setIo: function (_io) {
        io = _io;
    },
    emitToRoom: function (username, purpose, event, ...args) {
        keepTrying(() => getRoom(username, purpose), 1000, 5, (socket) => socket.emit(event, ...args), () => console.log(`Failed to send ${event} to ${username}-${purpose} with data ${[...args].join(" | ")}`));
    },
}

function getRoom(username, purpose) {
    let roomName = username + "-" + purpose.toLowerCase();
    if (exists(roomName)) {
        return io.to(roomName);
    }
}

function exists(roomName) {
    return io.sockets.adapter.rooms.get(roomName) != null;
}

function keepTrying(func, initialDelay, triesLeft, success, fail) {
    let test = func();
    if (triesLeft === 0) {
        if (fail) fail();
        return;
    }
    if (!test && test !== false) {
        setTimeout(() => keepTrying(func, initialDelay * 1.5, --triesLeft), initialDelay);
    } else {
        if (success) success(test);
    }
}