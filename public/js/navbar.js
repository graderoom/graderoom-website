
    let submittingForms = {};

    function sendData(event, data) {
        socket.emit(event, data);
    }

    function showCard(id) {
        disableScrolling();
        if (cardsDisplayed.includes(id.substring(1))) {
            cardsDisplayed.splice(cardsDisplayed.indexOf(id.substring(1)), 1);
        }
        cardsDisplayed.push(id.substring(1));
        $(".blurred-background").each(function () {
            if (cardsDisplayed.includes($($(this).parent())[0].id)) {
                $(this).parent().css("z-index", cardsDisplayed.indexOf($($(this).parent())[0].id) + minCardZIndex);
            }
        });
        if (id === "#settingsCardDisplay") {
            $($("#school_email").val(schoolUsername)[0].form).find("button").prop("disabled", true);
            checkLabel($("#school_email"));
            openTab(currentSettingsTab);
            updateTutorialProgress();
            $("#blur-range-picker").val(appearance.blurAmount || 4);
        }
        if (id === "#feedbackDisplay") {
            setupFeedbackForm();
            setupDiscord(true);
        }
        if (id === "#localScrapeCardDisplay") {
            if (!extensionSupported()) {
                document.getElementById("mobileExtensionInfo").style.display = "block";
                document.getElementById("installExtensionInfo").style.display = "none";
                document.getElementById("localScrapeDiv").style.display = "none";
                $(id).fadeIn(100);
            } else {
                checkExtensionInstalled().then((installed) => {
                    if (installed) {
                        document.getElementById("installExtensionInfo").style.display = "none";
                        document.getElementById("localScrapeDiv").style.display = "block";
                    } else {
                        document.getElementById("installExtensionInfo").style.display = "block";
                        document.getElementById("localScrapeDiv").style.display = "none";
                    }
                }).then(() => $(id).fadeIn(100));
            }
        } else {
            $(id).fadeIn(100);
        }
    }

    function closeForm(id) {
        if (cardsDisplayed.length && cardsDisplayed.includes(id)) {
            for (let i = 0; i < cardsDisplayed.length; i++) {
                $("#" + cardsDisplayed[i]).finish();
            }
            cardsDisplayed = cardsDisplayed.filter(c => c !== id);
        }
        if (!cardsDisplayed.length) {
            enableScrolling();
        }
        let form = $("#" + id);
        form.fadeOut(100);
        let inputFields = $("#" + id + " .form-control").not(".dont-clear").not(":disabled");
        for (let i = 0; i < inputFields.length; i++) {
            inputFields[i].value = "";
            $(inputFields[i]).trigger("input");
        }
        if (id === "settingsCardDisplay") {
            closeMessage("passwordChangeMessage");
            closeMessage("emailChangeMessage");
            closeMessage("themeMessage");
        }
        if (id === "feedbackDisplay") {
            let feedbackForm = $("#feedbackForm");
            let oldFrame = feedbackForm.parent();
            feedbackForm.remove();
            oldFrame.append(`<iframe id="feedbackForm" frameborder="0" marginheight="0" marginwidth="0">Loading…</iframe>`);
            setupFeedbackForm();
        }
        if (id === "changelogDisplay") {
            $(".changelog-parent, .changelog-parent > div").removeClass("show");
        }
        if (id === "updateGradesDisplay") {
            if (gradeSync) {
                $("#syncGradesDiv").hide();
                $("#gradeSyncDiv").show();
            } else {
                $("#gradeSyncDiv").hide();
                $("#syncGradesDiv").show();
            }
        }
        if (id === "localScrapeCardDisplay") {
            document.getElementById("mobileExtensionInfo").style.display = "none";
            document.getElementById("installExtensionInfo").style.display = "none";
            document.getElementById("localScrapeDiv").style.display = "none";
        }

        // Manage theme selection, if it exists
        try {
            $(`input[name=theme]`).prop("checked", false);
            $(`input[name=theme][value=${mode === "auto" || mode === "system" ? "auto-mode" : mode}]`).prop("checked", true);
            $(`input[name=automaticTheme]`).prop("checked", false);
            $(`input[name=automaticTheme][value=${mode === "system" ? "system" : "auto"}]`).prop("checked", true);
            $("#light-theme-options").toggle(mode === "light" || mode === "auto" || mode === "system");
            $("#dark-theme-options").toggle(mode === "dark" || mode === "auto" || mode === "system");
            $("#automatic-theme-options").toggle(mode === "auto" || mode === "system");
            $("#auto-limits-container").toggle(mode === "auto").css("display", mode === "auto" ? "flex" : "none");
            $("#prefers-color-scheme").toggle(mode === "system");
        } catch (e) {
        }

        // Manage gradeSync checkbox, if it exists
        try {
            let gradeSyncCheckBox = document.getElementById("gradeSyncToggle");
            if (gradeSync && !gradeSyncCheckBox.checked) {
                gradeSyncCheckBox.checked = true;
            } else if (!gradeSync && gradeSyncCheckBox.checked) {
                gradeSyncCheckBox.checked = false;
            }
        } catch (e) {
        }
    }

    // Collapse navbar or card when click outside
    $(document).mousedown(function (e) {
        //Auto hide for any card with blurred-login
        if ($(e.target).closest(".blurred-login").length) {
            if (!$(e.target).closest(".card").length) {
                closeForm($(e.target).closest(".blurred-login")[0].id);
            }
        }
        if (!$(e.target).closest("#collapsingNav").length && !$(e.target).is("#collapsingNav")) {
            $(".navbar-collapse").collapse("hide");
        }
    });
    // Collapse navbar or card when press escape
    $(document).keydown(function (e) {
        if ($("#loadingDisplay").css("display") === "none") {
            if (e.key === "Escape") { // escape key maps to keycode `27`
                let toggle = $(".dropdown-toggle");
                if (toggle.attr("aria-expanded") === "true") {
                    toggle.trigger("click");
                    return;
                }
                if (cardsDisplayed.length !== 0) {
                    closeForm(cardsDisplayed[cardsDisplayed.length - 1]);
                    return;
                }
                let addAssignmentContainer = $($(".add-assignment-container")[currentPage]);
                if (addAssignmentContainer.hasClass("active")) {
                    addAssignmentContainer.removeClass("active");
                }
            }
        }
    });

    // appearance is provided by the inline data bridge in the EJS template
    enableSnow();
