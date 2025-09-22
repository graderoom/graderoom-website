const dbClient = require('./dbClient');
const socketManager = require('./socketManager');
module.exports = {
    socketUsernameHelper: _socketUsernameHelper,
    setupSocket: function (socket) {
        if (process.env.NODE_ENV !== 'production') {
            logSocket(socket);
        }
        socket.on('settings-change', async (data) => {
            let keys = Object.keys(data);
            for (let key of keys) {
                let value = data[key];
                let resp;
                switch (key) {
                    case 'enableLogging':
                        resp = await dbClient.setEnableLogging(_socketUsernameHelper(socket), value);
                        break;
                    case 'animateWhenUnfocused':
                        resp = await dbClient.setAnimateWhenUnfocused(_socketUsernameHelper(socket), value);
                        break;
                    case 'showFps':
                        resp = await dbClient.setShowFps(_socketUsernameHelper(socket), value);
                        break;
                    case 'theme':
                        let {theme, darkModeStart, darkModeFinish, seasonalEffects, blurEffects} = value;
                        resp = await dbClient.setTheme(_socketUsernameHelper(socket), theme, darkModeStart, darkModeFinish, seasonalEffects, blurEffects);
                        break;
                    case 'regularizeClassGraphs':
                        resp = await dbClient.setRegularizeClassGraphs(_socketUsernameHelper(socket), value);
                        break;
                    case 'showPlusMinusLines':
                        resp = await dbClient.setShowPlusMinusLines(_socketUsernameHelper(socket), value);
                        break;
                    case 'reduceMotion':
                        resp = await dbClient.setReduceMotion(_socketUsernameHelper(socket), value);
                        break;
                }
                if (resp?.success) {
                    socketManager.emitToRoom(_socketUsernameHelper(socket), 'success-settings-change', resp.data);
                } else {
                    socketManager.emitToRoom(_socketUsernameHelper(socket), 'fail-settings-change', resp.data);
                }
            }
        });
        socket.on('start-update', async (data) => {
            let username = _socketUsernameHelper(socket);
            let gradeSync = data.gradeSync;
            let schoolPass = data.schoolPassword;
            let userPass = data.userPassword;

            if (userPass) {
                if (gradeSync) {
                    let resp = await dbClient.login(username, userPass);
                    if (!resp?.success) {
                        socketManager.emitToRoom(username, 'sync-fail-general', {message: resp.data.message});
                        return;
                    }
                } else {
                    let resp = await dbClient.decryptAndGetSchoolPassword(username, userPass);
                    if (resp?.success) {
                        schoolPass = resp.data.value;
                    } else {
                        socketManager.emitToRoom(username, 'sync-fail-general', {message: resp.data.message});
                        return;
                    }
                }
            }

            await dbClient.updateGrades(username, schoolPass, userPass, gradeSync);
        });
        socket.on('can-i-update', async (data) => {
            let username = _socketUsernameHelper(socket);
            let resp = await dbClient.canIUpdate(username);
            if (resp.success) {
                socketManager.emitToRoom(username, 'you-can-update', {token: data.token});
            } else {
                socketManager.emitToRoom(username, 'sync-limit', resp.data);
            }
        });
        socket.on('start-update-from-user', async (data) => {
            let username = _socketUsernameHelper(socket);
            let resp = await dbClient.updateGradesFromUser(username, data);
            if (!resp.success) {
                if (resp.data.message !== 'You need to wait before syncing again.') {
                    socketManager.emitToRoom(username, 'sync-fail-general', {message: resp.data.message});
                }
            }
        });
        socket.on('notification-settings-change', async (data) => {
            let keys = Object.keys(data);
            for (let key of keys) {
                let value = data[key];
                let resp;
                switch (key) {
                    case 'showUpdatePopup':
                        resp = await dbClient.setShowUpdatePopup(_socketUsernameHelper(socket), value);
                        break;
                }
                if (resp?.success) {
                    socketManager.emitToRoom(_socketUsernameHelper(socket), 'success-notification-settings-change', resp.data);
                } else {
                    socketManager.emitToRoom(_socketUsernameHelper(socket), 'fail-notification-settings-change', resp.data);
                }
            }
        });
        socket.on('notification-update', async (data) => {
            let id = data.id;
            let update = data.data;
            let resp = await dbClient.updateNotification(_socketUsernameHelper(socket), id, update);
            if (resp?.success) {
                socketManager.emitToRoom(_socketUsernameHelper(socket), 'success-notification-update', resp.data);
            } else {
                socketManager.emitToRoom(_socketUsernameHelper(socket), 'fail-notification-update', resp.data);
            }
        });
        socket.on('discord-verify', async (data) => {
            let verificationCode = data.verificationCode;
            let resp = await dbClient.discordVerify(_socketUsernameHelper(socket), verificationCode);
            await dbClient.deleteNotification(_socketUsernameHelper(socket), 'discord-verify');
            if (resp.success) {
                let notification = {
                    id: 'discord-verified',
                    type: 'discord',
                    title: 'Discord Verified!',
                    message: `Your Discord account was successfully connected to your Graderoom account. Run <span class="mono">/roles</span> in Discord to get your roles!`,
                    dismissible: true,
                    dismissed: false,
                    important: true,
                    pinnable: false,
                    pinned: true,
                    createdDate: Date.now(),
                };
                socketManager.emitToRoom(_socketUsernameHelper(socket), 'notification-new', notification);
            } else {
                let notification = {
                    id: 'discord-fail',
                    type: 'error',
                    title: 'Verification Failed',
                    message: resp.data.message,
                    dismissible: true,
                    dismissed: false,
                    important: true,
                    pinnable: false,
                    pinned: true,
                    createdDate: Date.now(),
                };
                socketManager.emitToRoom(_socketUsernameHelper(socket), 'notification-new', notification);
            }
        });
    },
};

function logSocket(socket) {

    function displayNicely(...args) {
        return args.map(arg => {
            return JSON.stringify(arg);
        });
    }

    socket.onAny((event, ...args) => {
        if (event.startsWith('info')) {
            console.info(event + ' | ' + displayNicely(...args).join(' | '));
        } else if (event.startsWith('error')) {
            console.error(event + ' | ' + displayNicely(...args).join(' | '));
        } else if (event.startsWith('fail')) {
            console.warn(event + ' | ' + displayNicely(...args).join(' | '));
        } else {
            console.log(event + ' | ' + displayNicely(...args).join(' | '));
        }
    });
}

function _socketUsernameHelper(socket) {
    return (socket.request.user.isAdmin ? socket.request.headers.referer.split('usernameToRender=')[1]?.split('&')[0] : undefined) ?? socket.request.user.username;
}
