    function extensionSupported() {
        // No Safari
        if (typeof window.GestureEvent !== 'undefined') return false;
        return !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || /EdgA\/|Android.*Firefox\//.test(navigator.userAgent);
    }

    function randToken() {
        return Math.random().toString(36).substring(2);
    }

    function initSync() {
        scrapeToken = randToken();
        sendData('can-i-update', {token: scrapeToken});
    }

    let loginWindow;
    let openedStore = false;

    const extensionIDs = {
        chrome: 'dhidkhdjfikcdmfngbpnbgpnboiodnoo',
        edge: 'iaogfmdnjddigaclajncbkioienjmnea',
    };
    if (typeof testExtensionID !== 'undefined' && testExtensionID) {
        extensionIDs.test = testExtensionID;
    }
    let activeExtensionID = null;
    const requiredExtensionVersion = [1, 5, 4];
    let firefoxExtensionInstalled = false;
    let actualExtensionVersion = null;

    let messagePromises = {};

    function androidPwa() {
        return /Android/i.test(navigator.userAgent) && window.matchMedia('(display-mode: standalone)').matches;
    }

    function storeTarget() {
        if (/EdgA\//.test(navigator.userAgent)) {
            return 'https://microsoftedge.microsoft.com/addons/';
        }
        if (window.chrome === undefined) {
            return 'https://addons.mozilla.org/en-US/firefox/addon/graderoom/';
        }
        if (navigator.userAgent.includes('Edg/')) {
            return `https://microsoftedge.microsoft.com/addons/detail/graderoom/${extensionIDs.edge}`;
        }
        return `https://chrome.google.com/webstore/detail/graderoom/${extensionIDs.chrome}`;
    }

    function updateButton() {
        if (openedStore) {
            checkExtensionInstalled().then((installed) => {
                if (installed) {
                    document.getElementById('installExtensionInfo').style.display = 'none';
                    document.getElementById('localScrapeDiv').style.display = 'block';
                } else {
                    openedStore = false;
                    document.getElementById('extensionInstallBtn').textContent = 'Install Graderoom Extension';

                    alert('The Graderoom Extension is not installed. Please try again.');
                }
            });
        } else {
            openedStore = true;

            // A PWA sends every link to an in-app custom tab, where the store's install UI
            // does not appear, and no intent:// shape escapes it. The extension does work in
            // the app once installed, so this is a one-time trip to the browser.
            if (androidPwa()) {
                alert('Install the extension from Graderoom in your browser. You only need to do this once, then syncing works here in the app.');
            } else {
                window.open(storeTarget(), '_blank');
            }
            document.getElementById('extensionInstallBtn').textContent = 'I installed it!';
        }
    }

    window.addEventListener('message', (event) => {
        if (event.source !== window) return;
        if (event.origin !== window.origin) return;
        if (!event.data || event.data.direction !== 'from-extension') return;

        if (event.data.type === 'status') {
            clearTimeout(checkLastUpdated);
            let {progress, message} = event.data;
            document.querySelectorAll('.updateGradesMessage > span').forEach((elem) => {
                elem.style.opacity = '0.5';
                elem.style.width = `${progress}%`;
            });
            document.querySelectorAll('.updateGradesMessage').forEach((elem) => {
                elem.classList.remove('alert-danger');
                elem.classList.remove('alert-success');
                elem.classList.add('alert-info');
                elem.querySelector('.messageTxt').textContent = message;
            });
            return;
        }

        if (event.data.token && messagePromises[event.data.token]) {
            let data = event.data;
            let token = data.token;
            delete data.token;
            delete data.direction;
            messagePromises[token](data);
            delete messagePromises[token];
        } else if (event.data.type === 'presence') {
            firefoxExtensionInstalled = true;
        }
    });

    let port;
    function connectPort() {
        if (window.chrome === undefined) return;
        if (!checkVersion(actualExtensionVersion, [1, 5, 5])) return;

        disconnectPort();

        port = chrome.runtime.connect(activeExtensionID);
        port.onMessage.addListener((msg) => {
            if (msg.type === 'status') {
                clearTimeout(checkLastUpdated);
                let {progress, message} = msg;
                document.querySelectorAll('.updateGradesMessage > span').forEach((elem) => {
                    elem.style.opacity = '0.5';
                    elem.style.width = `${progress}%`;
                });
                document.querySelectorAll('.updateGradesMessage').forEach((elem) => {
                    elem.classList.remove('alert-danger');
                    elem.classList.remove('alert-success');
                    elem.classList.add('alert-info');
                    elem.querySelector('.messageTxt').textContent = message;
                });
            }
        });
    }

    function disconnectPort() {
        if (port) {
            port.disconnect();
            port = null;
        }
    }

    async function checkExtensionInstalled() {
        if (window.chrome !== undefined) {
            return checkChromeExtensionInstalled();
        }
        if (firefoxExtensionInstalled) {
            return sendMessageToExtension({type: 'get-version'}).then((response) => {
                if (response) {
                    actualExtensionVersion = response.version;
                    if (!checkVersion(response.version)) {
                        alert('Your Graderoom Extension is out of date');
                        return false;
                    } else {
                        return true;
                    }
                }
                return false;
            }).catch(() => {
                return false;
            }) ?? false;
        }
        return false;
    }

    async function checkChromeExtensionInstalled() {
        if (chrome.runtime === undefined) {
            return false;
        }
        for (const id of Object.values(extensionIDs)) {
            try {
                const response = await chrome.runtime.sendMessage(id, {type: 'get-version'});
                if (response) {
                    activeExtensionID = id;
                    actualExtensionVersion = response.version;
                    if (!checkVersion(response.version)) {
                        alert('Your Graderoom Extension is out of date');
                        return false;
                    }
                    return true;
                }
            } catch {
                // Extension not found with this ID, try next
            }
        }
        return false;
    }

    async function sendMessageToExtension(message) {
        if (firefoxExtensionInstalled) {
            message.token = randToken();
            message.direction = 'to-extension';
            return new Promise((resolve) => {
                messagePromises[message.token] = resolve;
                window.postMessage(message, window.origin);
            });
        } else if (window.chrome !== undefined && activeExtensionID) {
            return chrome.runtime.sendMessage(activeExtensionID, message);
        }

        return new Promise((resolve, reject) => {
            reject();
        });
    }

    function checkVersion(version, requiredVersion = requiredExtensionVersion) {
        if (typeof version !== 'string') return false;

        let installedVersion = version.split('.').map(x => parseInt(x));
        if (installedVersion.length === 0 || installedVersion.some(isNaN)) return false;

        for (let i = 1; i < Math.max(requiredVersion.length, installedVersion.length); i++) {
            let curr = requiredVersion[i] || 0;
            let inst = installedVersion[i] || 0;
            if (inst > curr) {
                return true; // Installed version is newer
            } else if (inst < curr) {
                return false; // Installed version is older
            }
        }
        return true; // Versions are the same
    }

    async function syncPresent(fromButton = true) {
        if (!await checkExtensionInstalled()) return false;

        $('#localScrapeDiv').find('button').prop('disabled', true).find('div').addClass('loading');
        $('.updateGradesMessage').show().removeClass('alert-danger').addClass('alert-info');
        $('.updateGradesMessage .messageTxt').text('Syncing...');

        connectPort();
        let resp = await sendMessageToExtension({type: 'get-present', target: 'offscreen'});
        if (!resp.data.success) {
            if (resp.data.message !== 'Not logged in.') {
                console.error(resp.data.message);
                $('.updateGradesMessage').removeClass('alert-info').addClass('alert-danger');
                $('.updateGradesMessage .messageTxt').text('An error occurred: ' + resp.data.message);
                $('#localScrapeDiv').find('button').prop('disabled', false).find('div').removeClass('loading');

                return false;
            }

            if (!fromButton) {
                $('.updateGradesMessage').hide();
                $('#localScrapeDiv').find('button').prop('disabled', false).find('div').removeClass('loading');
                return false;
            }

            $('#localScrapeDiv').find('button').prop('disabled', false).find('div').removeClass('loading');

            if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                $('.updateGradesMessage .messageTxt').html('You are not logged in. <a href="https://powerschool.bcp.org/student/idp?_userTypeHint=student" target="_blank" rel="noopener">Log in to PowerSchool</a>, then come back to this tab and tap Sync again.');
                return false;
            }

            $('.updateGradesMessage .messageTxt').text('You are not logged in. Please log in to PowerSchool in the opened window. Then, click the button below again.');

            if (!loginWindow || loginWindow.closed) {
                loginWindow = window.open('https://powerschool.bcp.org/student/idp?_userTypeHint=student', null, 'width=600,height=700');
            } else {
                loginWindow.focus();
            }
        } else {
            loginWindow?.close();

            let data = resp.data;

            $('#localScrapeDiv').find('button').prop('disabled', false).find('div').removeClass('loading');
                $('#loadingDisplay').hide();
                shortcutsEnabled = true;
                if (!data.success) {
                    if (data.message === 'Not logged in.') {
                        showCard('#localScrapeCardDisplay');
                    } else {
                        console.error(data.message);
                    }
                } else {
                    let term = Object.keys(data.data)[0];
                    let semester = Object.keys(data.data[term])[0];
                    let grades = data.data[term][semester];
                    $('.updateGradesMessage .messageTxt').text('Uploading grades...');
                    sendData('start-update-from-user', {term: term, semester: semester, grades: grades});
                }
        }
    }

    async function syncHistory(token) {
        if (!await checkExtensionInstalled()) return false;
        if (!checkVersion(actualExtensionVersion, [1, 6])) return false;

        connectPort();
        let resp = await sendMessageToExtension({type: 'get-history', target: 'offscreen'});

        if (!resp.data.success) {
            console.error(resp.data.message);
            return false;
        }

        sendData('start-update-history-from-user', {token: token, grades: resp.data.data});
    }
