let io;

module.exports = {
    setIo: function (_io) {
        io = _io;
    },
    emitToRoom: function (username, event, ...args) {
        keepTrying(() => getRoom(username), 1000, 5, (socket) => socket.emit(event, ...args), () => console.log(`Failed to send ${event} to ${username} with data ${[...args].join(" | ")}`));
    },
    count: () => getCount(),
    uniqueCount: (requestingUsername) => getUniqueCount(requestingUsername)
}

function getCount() {
    let time = Date.now();
    let count = io.engine.clientsCount;
    console.log(`Count took ${Date.now() - time}ms`);
    return count;
}

function getUniqueCount(requestingUsername) {
    let time = Date.now();
    let unique = Object.entries(Object.fromEntries(io.sockets.adapter.rooms)).filter(([k, v]) => !v.has(k) && !(!!requestingUsername && k === requestingUsername));
    console.log(`Unique Count took ${Date.now() - time}ms`);
    return unique.length + (requestingUsername ? 1 : 0);
}

function getRoom(username) {
    let roomName = username;
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
