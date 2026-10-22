    function extensionSupported() {
        // No Safari
        if (typeof window.GestureEvent !== 'undefined') return false;
        return !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || /EdgA\/|Android.*Firefox\//.test(navigator.userAgent);
    }

    function randToken() {
        return Math.random().toString(36).substring(2);
    }

    let loginWindow;
    let loginWatcher;
    let openedStore = false;
    let installWatcher;

    const powerschoolLoginUrl = 'https://powerschool.bcp.org/student/idp?_userTypeHint=student';
    let needsLogin = false;
    let awaitingLogin = false;

    function setNeedsLogin(login) {
        needsLogin = login === true;
        if (!needsLogin) {
            return syncReset();
        }
        if (loginWindow && !loginWindow.closed) {
            awaitingLogin = true;
            return syncControl('awaiting');
        }
        loginWindow = null;
        syncControl('login');
    }

    const SYNC_STATES = {
        waiting: {
            label: 'Synced',
            popup: () => {
                let left = countdown(nextAllowedAt());
                if (syncBlockedUntil) {
                    return 'You synced very recently. You can sync again in ' + left + '.';
                }
                let auto = nextAutoAt();
                return autoSyncPhrase() + (auto && auto <= nextAllowedAt()
                    ? ' Next sync in ' + left + '.'
                    : ' You can sync manually sooner, in ' + left + '.');
            }
        },
        unchanged: {
            label: 'Up to date', sub: 'No changes',
            popup: 'Nothing changed since your last sync, so nothing was uploaded and no sync was used. You can check again once the bar empties.'
        },
        ready: {
            label: 'Sync', sub: nextAutoText,
            popup: () => 'Click to sync now. ' + autoSyncPhrase()
        },
        syncing: {
            label: 'Syncing', sub: () => syncStatusMessage,
            popup: 'Getting your grades from PowerSchool.'
        },
        login: {
            label: 'Sync', sub: 'Sign in needed',
            popup: 'Your PowerSchool session expired. Click to sign in again.'
        },
        awaiting: {
            label: 'Sign in', sub: 'Waiting...',
            popup: 'Finish signing in to PowerSchool, then click here.'
        },
        install: {
            label: 'Install', sub: 'Extension',
            popup: 'Syncing needs the Graderoom Extension. Click to install it.'
        },
        installed: {
            label: 'Waiting', sub: 'For install',
            popup: 'Waiting for the Graderoom Extension to install.'
        },
        reload: {
            label: 'Reload', sub: 'To finish',
            popup: 'Firefox only sees the extension on a fresh page. Click to reload.'
        },
        unsupported: {
            label: 'Sync', sub: 'Unsupported',
            popup: 'Syncing needs Chrome, Edge, or Firefox on a computer or Android.'
        },
        error: {
            label: 'Retry', sub: 'Sync failed',
            popup: () => 'Sync failed' + (syncErrorMessage ? ': ' + syncErrorMessage : '') + '. Click to try again.'
        }
    };
    const STICKY_STATES = ['ready', 'login', 'awaiting', 'install', 'installed', 'reload', 'error'];

    let syncProgressPct = 0;
    let syncStatusMessage = 'Working…';

    function syncStatus(progress, message) {
        syncProgressPct = progress ?? 0;
        syncStatusMessage = message || 'Working…';
        syncControl('syncing');
    }

    let syncErrorMessage = null;

    function syncError(message) {
        syncErrorMessage = message || null;
        if (!syncErrorMessage) {
            return syncReset();
        }
        syncControl('error');
    }
    let syncState = null;

    function syncReset() {
        syncState = null;
        syncControl(null);
    }

    function syncControl(state) {
        if (state) {
            syncState = state;
        } else if (syncState && !STICKY_STATES.includes(syncState)) {
            syncState = null;
        }
        if (syncState === null || syncState === 'ready') {
            syncState = syncReady() ? 'ready' : recentlyUnchanged() ? 'unchanged' : 'waiting';
        }

        let {label, sub, popup} = SYNC_STATES[syncState];
        let progress = syncState === 'syncing' ? syncProgressPct : 0;
        if (syncState === 'unchanged' && $('#syncControl').attr('data-state') !== 'unchanged') {
            // Start the drain part-way through if the check happened before this page loaded
            $('#syncControl').css('animation-delay', (lastChecked() - Date.now()) + 'ms');
            setTimeout(() => syncState === 'unchanged' && syncControl(), lastChecked() + CHECK_COOLDOWN - Date.now());
        }
        $('#syncControl').attr('data-state', syncState)
            .css('--progress', progress + '%');
        $('#syncControlLabel').text(label);
        $('#syncControlSub').text(typeof sub === 'function' ? sub() : sub ?? nextSyncText());
        $('#syncControlPopup').text(typeof popup === 'function' ? popup() : popup);
        fitSyncControl();
    }

    let fittedState = null;

    function fitSyncControl() {
        let chip = document.getElementById('syncControl');
        if (!chip) return;

        if (syncState === 'syncing' && fittedState === 'syncing') return;
        fittedState = syncState;

        let from = chip.style.width;
        chip.style.width = 'max-content';
        let to = chip.offsetWidth;
        chip.style.width = from;

        if (!to) {
            chip.style.width = '';
            fittedState = null;
            return;
        }

        chip.offsetWidth;
        chip.style.width = to + 'px';
    }

    function syncControlClick() {
        switch (syncState) {
            case 'ready':
                return initSync();
            case 'login':
            case 'awaiting':
                return powerschoolLogin();
            case 'install':
                return installExtension();
            case 'reload':
                return window.location.reload();
            case 'error':
                return initSync();
        }
    }

    function lastSync() {
        return typeof alerts === 'undefined' ? undefined : alerts.lastUpdated.slice(-1)[0];
    }

    let syncBlockedUntil = null;

    function syncBlocked(timestamp) {
        syncBlockedUntil = timestamp || null;
        syncReset();
    }

    function nextAllowedAt() {
        if (syncBlockedUntil) return syncBlockedUntil;
        let lastUpdated = lastSync();
        // Unchanged checks cost no sync, but still space them out so PowerSchool isn't hammered
        let checkCooldown = lastChecked() ? lastChecked() + CHECK_COOLDOWN : 0;
        return Math.max(lastUpdated && syncMinInterval ? lastUpdated.timestamp + syncMinInterval : 0, checkCooldown);
    }

    function storage(key, value) {
        try {
            if (value === undefined) return localStorage.getItem(key);
            localStorage.setItem(key, value);
        } catch {
            return null;
        }
    }

    const CHECK_COOLDOWN = 60000;

    // A check newer than the last upload found nothing to upload
    function recentlyUnchanged() {
        return lastChecked() > (lastSync()?.timestamp ?? 0) && Date.now() < lastChecked() + CHECK_COOLDOWN;
    }

    function lastChecked() {
        return +storage('syncLastChecked:' + username) || 0;
    }

    const CLASS_KEYS = ['class_name', 'teacher_name', 'overall_percent', 'overall_letter', 'student_id', 'section_id', 'ps_locked'];
    const GRADE_KEYS = ['assignment_name', 'date', 'category', 'grade_percent', 'points_gotten', 'points_possible', 'exclude', 'missing', 'late', 'psaid'];

    // Same fields processClasses() keeps, so a scrape compares equal to what the server stored from it
    function comparableGrades(classes) {
        let pick = (o, keys) => Object.fromEntries(keys.map(k => [k, o[k] ?? null]));
        return classes.map(c => ({...pick(c, CLASS_KEYS), grades: c.grades.map(g => pick(g, GRADE_KEYS))}));
    }

    function matchesStoredGrades(scrapeTerm, scrapeSemester, classes) {
        if (typeof syncedGrades === 'undefined' || !syncedGrades) return false;
        if (scrapeTerm !== syncedGrades.term || scrapeSemester !== syncedGrades.semester) return false;
        return _.isEqual(comparableGrades(classes), comparableGrades(syncedGrades.grades));
    }

    function syncUnchanged() {
        storage('syncLastChecked:' + username, Date.now());
        disconnectPort();
        setupLastUpdated();
        syncReset();
    }

    function nextAutoAt() {
        let last = Math.max(lastSync()?.timestamp ?? 0, lastChecked());
        return last && syncInterval ? last + syncInterval : 0;
    }

    function syncReady() {
        return countdown(nextAllowedAt()) === null;
    }

    function autoSyncDue() {
        return countdown(nextAutoAt()) === null;
    }

    function countdown(deadline) {
        if (!deadline) return null;

        let delta = deadline - Date.now();
        if (delta <= 0) return null;
        let hours = Math.floor(delta / 36e5);
        let minutes = Math.ceil((delta % 36e5) / 6e4);
        return (hours > 0 ? hours + 'h' + (minutes > 0 ? ' ' : '') : '') + (minutes > 0 ? minutes + 'm' : '');
    }

    function nextSyncText() {
        if (!lastSync() && !syncBlockedUntil) return 'Never synced';
        let left = countdown(nextAllowedAt());
        if (!left) return 'Ready';

        let auto = nextAutoAt();
        return (auto && auto <= nextAllowedAt() ? 'Auto in ' : 'Available in ') + left;
    }

    function nextAutoText() {
        let left = countdown(nextAutoAt());
        return left ? 'Auto in ' + left : 'Ready';
    }

    function syncPeriodText() {
        if (!syncInterval) return null;
        if (syncInterval < 36e5) return (syncInterval / 6e4) + ' minutes';
        if (syncInterval === 36e5) return 'hour';
        if (syncInterval === 864e5) return 'day';
        return (syncInterval / 36e5) + ' hours';
    }

    function autoSyncPhrase() {
        let every = syncPeriodText();
        return every ? 'Your grades automatically sync every ' + every + '.' : 'Your grades automatically sync.';
    }

    function scheduleSyncTick() {
        let deadline = syncState === 'ready' ? nextAutoAt() : nextAllowedAt();
        let untilBoundary = deadline ? (deadline - Date.now()) % 60000 : 0;
        setTimeout(() => {
            syncControl();
            if (syncState === 'ready' && autoSyncDue()) autoSync();
            scheduleSyncTick();
        }, untilBoundary > 0 ? untilBoundary : 60000);
    }

    // Auto-sync while the page stays open. Every open tab may fire at once: 1.7.3+ shares one scrape
    // between them, and the server records only one upload
    function autoSync() {
        // accountInactive only exists on the grades page, the one page that handles sync results
        if (typeof accountInactive === 'undefined' || accountInactive || school !== 'bellarmine' || !extensionSupported()) return;
        if (!checkVersion(actualExtensionVersion, [1, 7, 3])) return;
        initSync();
    }

    function maybeAutoSync() {
        if (!extensionSupported()) {
            return syncControl('unsupported');
        }
        checkExtensionInstalled().then(installed => {
            if (!installed) return syncControl('install');
            if (autoSyncDue()) return syncPresent();
            syncReset();
        });
    }

    $(() => {
        syncControl(extensionSupported() ? null : 'unsupported');
        scheduleSyncTick();
        // Another tab's check starts the cooldown here too
        window.addEventListener('storage', (e) => e.key === 'syncLastChecked:' + username && syncState !== 'syncing' && syncControl());
    });

    function powerschoolLogin() {
        if (awaitingLogin) {
            awaitingLogin = false;
            return syncPresent();
        }

        if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
            window.open(powerschoolLoginUrl, '_blank', 'noopener');
        } else {
            loginWindow = window.open(powerschoolLoginUrl, null, 'width=600,height=700');
            watchLoginWindow();
        }
        awaitingLogin = true;
        syncControl('awaiting');
    }

    function powerschoolLoggedIn() {
        if (!awaitingLogin && !needsLogin) return;
        awaitingLogin = false;
        clearInterval(loginWatcher);
        loginWindow?.close();
        syncPresent();
    }

    function watchLoginWindow() {
        clearInterval(loginWatcher);
        loginWatcher = setInterval(() => {
            if (!awaitingLogin) return clearInterval(loginWatcher);
            if (loginWindow && !loginWindow.closed) return;
            clearInterval(loginWatcher);
            awaitingLogin = false;
            syncPresent();
        }, 500);
    }

    function initSync() {
        if (needsLogin) return powerschoolLogin();
        scrapeToken = randToken();
        syncStatus(0, 'Checking…');
        sendData('can-i-update', {token: scrapeToken});
    }

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

    const EXTENSION_SOURCES = {chrome: 'Chrome', edge: 'Edge', test: 'Test build', firefox: 'Firefox'};

    function showExtensionVersion(version, source) {
        actualExtensionVersion = version;
        $('#extensionVersionDisplay').text(
            version ? version + ' (' + (EXTENSION_SOURCES[source] ?? source) + ')' : 'not installed'
        );
    }

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
        return `https://chromewebstore.google.com/detail/graderoom/${extensionIDs.chrome}`;
    }

    function watchForInstall() {
        clearInterval(installWatcher);
        if (window.chrome === undefined) {
            return syncControl('reload');
        }
        let attempts = 0;
        installWatcher = setInterval(() => {
            if (++attempts > 300) {
                clearInterval(installWatcher);
                openedStore = false;
                return syncControl('install');
            }
            checkExtensionInstalled().then((installed) => {
                if (!installed) return;
                clearInterval(installWatcher);
                syncReset();
                if (syncReady()) {
                    syncPresent();
                }
            });
        }, 1000);
    }

    function installExtension() {
        if (openedStore) {
            return;
        }

        openedStore = true;

        if (androidPwa()) {
            alert('Install the extension from Graderoom in your browser. You only need to do this once, then syncing works here in the app.');
        } else {
            window.open(storeTarget(), '_blank');
        }
        syncControl('installed');
        watchForInstall();
    }

    window.addEventListener('message', (event) => {
        if (event.source !== window) return;
        if (event.origin !== window.origin) return;
        if (!event.data || event.data.direction !== 'from-extension') return;

        if (event.data.type === 'ps-login') {
            powerschoolLoggedIn();
            return;
        }

        if (event.data.type === 'status') {
            syncStatus(event.data.progress, event.data.message);
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
            if (msg.type === 'ps-login') {
                powerschoolLoggedIn();
                return;
            }
            // Extension 1.7.3+ sends every tab's scrape progress to all connected tabs
            if (msg.type === 'status' && syncState === 'syncing') {
                syncStatus(msg.progress, msg.message);
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
            showExtensionVersion(null);
            return sendMessageToExtension({type: 'get-version'}).then((response) => {
                if (response) {
                    showExtensionVersion(response.version, 'firefox');
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
        showExtensionVersion(null);
        return false;
    }

    async function checkChromeExtensionInstalled() {
        if (chrome.runtime === undefined) {
            return false;
        }
        showExtensionVersion(null);
        for (const [source, id] of Object.entries(extensionIDs)) {
            try {
                const response = await chrome.runtime.sendMessage(id, {type: 'get-version'});
                if (response) {
                    activeExtensionID = id;
                    showExtensionVersion(response.version, source);
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

        for (let i = 0; i < Math.max(requiredVersion.length, installedVersion.length); i++) {
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

    async function syncPresent() {
        if (!await checkExtensionInstalled()) {
            syncControl('install');
            return false;
        }

        syncErrorMessage = null;
        syncStatus(0, 'Starting…');

        connectPort();
        let resp = await sendMessageToExtension({type: 'get-present', target: 'offscreen'});
        if (!resp.data.success) {
            if (resp.data.message !== 'Not logged in.') {
                console.error(resp.data.message);
                setNeedsLogin(false);
                syncError(resp.data.message);

                return false;
            }

            setNeedsLogin(true);
            return false;
        } else {
            loginWindow?.close();
            awaitingLogin = false;
            setNeedsLogin(null);

            let data = resp.data;

            $('#loadingDisplay').hide();
            shortcutsEnabled = true;

            let term = Object.keys(data.data)[0];
            let semester = Object.keys(data.data[term])[0];
            let grades = data.data[term][semester];
            if (matchesStoredGrades(term, semester, grades)) return syncUnchanged();
            syncStatus(100, 'Uploading…');
            sendData('start-update-from-user', {term: term, semester: semester, grades: grades});
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
