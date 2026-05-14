
    let changelogContainer = $("#changelog-container");
    let changelogLegendColumn = $("#changelog-legend-column");
    let latestVersion;
    let versionNames = [];
    let versionClasses = []
    let versionDates = [];
    let versionMessages = [];
    let cachedHTML = {};
    let changelogLegendArray;
    let changelogLegendReferences;

    function showChangelog(callback = false, whatsNew = false, version = false) {
        if (!callback && !whatsNew) {
            showCard("#changelogDisplay");
            $(".changelog-parent, .changelog-parent > div").addClass("show");
            setTimeout(() => showVersion(version), 250);
            return;
        }
        return new Promise(async resolve => {
            if (latestVersion === undefined) {
                latestVersion = await $.ajax({
                    url: "/latestVersion", type: "GET", async: true
                }).catch(() => {
                });
            }
            if (changelogLegendArray === undefined || !versionNames[1]?.endsWith(latestVersion)) {
                await $.ajax({
                    url: "/changelogLegend", type: "GET", async: true
                }).done(function (response) {
                    if (typeof response === "string" && response.startsWith("<!")) {  // If logged out
                        $(".session-timeout").show();
                        $("body").find("*").not(".session-timeout").remove();
                        return;
                    }
                    changelogLegendArray = response;
                    changelogLegendColumn.empty();
                });
            } else if (!callback && whatsNew && alerts.notificationSettings.showUpdatePopup) {
                if (!latestVersion.endsWith(alerts.latestSeen)) {
                    showCard("#changelogDisplay");
                    $(".changelog-parent, .changelog-parent > div").addClass("show");
                    showVersion(latestVersion);
                }
                return resolve();
            } else if (callback && versionNames) {
                // noinspection JSValidateTypes
                callback(versionNames, versionDates, versionMessages);
                return resolve();
            }
            changelogLegendReferences = changelogLegendArray.map(x => $(x));
            changelogLegendColumn.html(changelogLegendReferences);
            versionNames = [];
            for (let i = 0; i < changelogLegendReferences.length; i++) {
                let version = $(changelogLegendReferences[i]);
                let name = version.contents().filter((i, el) => el.nodeType === 3).text();
                version.on("click", () => showVersion(name));
                versionNames.push(name);
                let date = version.text().slice(name.length);
                // Add offset so versions on the same day are ordered correctly in notifications
                versionDates.push(new Date(`${date.slice(0, 10)}/0:`).getTime() + changelogLegendReferences.length - i);
                versionMessages.push(date.slice(13));
            }
            if (callback) {
                // noinspection JSValidateTypes
                callback(versionNames, versionDates, versionMessages);
                return resolve();
            }

            $(".changelog-parent, .changelog-parent > div").addClass("show");
            resolve();
        });
    }

    function showVersion(version) {
        if (!version) return;
        if (!(version in cachedHTML)) {
            $.ajax({
                url: "/changelog", type: "GET", async: true, data: {versionName: version}
            }).done((response) => {
                if (typeof response === "string" && response.startsWith("<!")) {  // If logged out
                    $(".session-timeout").show();
                    $("body").find("*").not(".session-timeout").remove();
                    return;
                }
                changelogContainer.html(response);
                cachedHTML[version] = response;
            });
        } else {
            changelogContainer.html(cachedHTML[version]);
        }
        let idx = versionNames.indexOf(version);
        if (idx === -1) return;
        changelogContainer.removeClass("placeholder");
        changelogLegendReferences.forEach((v) => v.removeClass("active"));
        changelogLegendReferences[idx].addClass("active");
        let scrollTop = changelogLegendColumn.scrollTop() + changelogLegendReferences[idx].position().top - changelogLegendColumn.height() / 3 + changelogLegendReferences[idx].height() / 2;
        changelogLegendColumn.animate({
            scrollTop: scrollTop
        });
        if (version === latestVersion) {
            $.ajax({
                url: "/latestVersionSeen", type: "POST", async: true
            }).done((response) => {
                if (typeof response === "string" && response.startsWith("<!")) {  // If logged out
                    $(".session-timeout").show();
                    $("body").find("*").not(".session-timeout").remove();
                    return;
                }
                alerts.latestSeen = versionNames[1].substring(versionNames[1].indexOf(" ") + 1);
            });
            dismissById(version);
        }
    }
