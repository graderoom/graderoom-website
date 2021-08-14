<script src="/socket.io/socket.io.js"></script>

require("/socket.io/socket.io.js");

let mainSocket = io({"query": {"purpose": "MAIN"}});
let syncSocket = io({"query": {"purpose": "SYNC"}});
let notiSocket = io({"query": {"purpose": "NOTI"}});

function getLogType(event) {
    switch (event) {
        default:
            return "log";
    }
}

function logEvent(socket, event, ...args) {
    let data = socket.io.opts.query ?? {};
    let purpose = data.purpose ?? "Unknown";
    let string = `${purpose} | ${event} | ${[...args].join(" | ")}`;
    switch (getLogType(event)) {
        case "info":
            console.info(string);
            break;
        case "warn":
            console.warn(string);
            break;
        case "error":
            console.error(string);
            break;
        default:
            console.log(string);
            break;
    }
}

mainSocket.onAny((event, ...args) => logEvent(mainSocket, event, ...args));
syncSocket.onAny((event, ...args) => logEvent(syncSocket, event, ...args));
notiSocket.onAny((event, ...args) => logEvent(notiSocket, event, ...args));