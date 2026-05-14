    toggleInputUserPasswordDisplay();

    function toggleInputUserPasswordDisplay() {
        if ($("#savePasswordToggle").is(":checked")) {
            $("#userPassword").show();
            $("#inputUserPassword").attr("required", "required").attr("autocomplete", "on");
        } else {
            $("#userPassword").hide();
            $("#inputUserPassword").removeAttr("required").val("").attr("autocomplete", "off");
        }
    }

    let checkLastUpdated;

    function setupLastUpdated() {
        $(".fa-refresh.fa-spin").removeClass("fa-spin").css("opacity", "");
        $("#syncGrades").css("cursor", "");
        $("#syncGrades btn").removeClass("disabled").css("pointer-events", "");

        $(".updateGradesMessage > span").css('opacity', '');

        const JUST_NOW_LIMIT = 10;

        const SECOND = 1000;
        const MINUTE = 60 * SECOND;
        const HOUR = 60 * MINUTE;
        const DAY = 24 * HOUR;

        let message = $(".updateGradesMessage").find(".messageTxt");
        let lastUpdated = alerts.lastUpdated.slice(-1)[0];
        if (lastUpdated === undefined) {
            message.text("Never synced");
        } else {
            lastUpdated = lastUpdated.timestamp;
            let deltaTime = Date.now() - lastUpdated;
            if (checkLastUpdated) {
                clearTimeout(checkLastUpdated);
            }
            let seconds = Math.floor(deltaTime / SECOND) % 60;
            if (deltaTime < JUST_NOW_LIMIT * SECOND) {
                message.text("Last synced just now." + recentChangeText);
                checkLastUpdated = setTimeout(setupLastUpdated, (1 + seconds / JUST_NOW_LIMIT - deltaTime / (JUST_NOW_LIMIT * SECOND)) * JUST_NOW_LIMIT * SECOND);
                return;
            }
            if (deltaTime < MINUTE) {
                message.text("Last synced " + seconds + "s ago." + recentChangeText);
                checkLastUpdated = setTimeout(setupLastUpdated, (1 + seconds - deltaTime / SECOND) * SECOND);
                return;
            }
            let minutes = Math.floor(deltaTime / MINUTE) % 60;
            if (deltaTime < HOUR) {
                message.text("Last synced " + minutes + "m ago." + recentChangeText);
                checkLastUpdated = setTimeout(setupLastUpdated, (1 + minutes - deltaTime / MINUTE) * MINUTE);
                return;
            }
            let hours = Math.floor(deltaTime / HOUR) % 24;
            let days = Math.floor(deltaTime / DAY);
            if (deltaTime < DAY) {
                message.text("Last synced " + hours + "h " + (minutes > 0 ? minutes + "m ago." : " ago.") + recentChangeText);
                checkLastUpdated = setTimeout(setupLastUpdated, (1 + minutes - (deltaTime / MINUTE) % 60) * MINUTE);
            } else {
                message.text("Last synced " + days + "d " + (hours > 0 ? hours + "h ago." : " ago.") + recentChangeText);
                checkLastUpdated = setTimeout(setupLastUpdated, (1 + hours - (deltaTime / HOUR) % 24) * HOUR);
            }
        }
    }

    function updateGrades(password, schoolPassword, gradeSync) {
        let _gradeSync = !schoolPassword;

        let messageBox = $(".updateGradesMessage");
        let message = $(".updateGradesMessage.alert .messageTxt");

        clearTimeout(checkLastUpdated);

        $(".fa-refresh").addClass("fa-spin").css("opacity", 0.5);

        messageBox.removeClass("alert-success").removeClass("alert-danger").addClass("alert-info");

        $(message).text("");

        $("#updateGradesDisplay input").trigger("blur");

        shortcutsEnabled = false;

        $("#loadingDisplay").show();

        $(`${_gradeSync ? "#syncGradesForm" : "#gradeSyncForm"}`).find("button").prop("disabled", true).find("div").addClass("loading");

        sendData("start-update", {
            gradeSync: gradeSync, schoolPassword: schoolPassword, userPassword: password
        });

        return false;
    }
