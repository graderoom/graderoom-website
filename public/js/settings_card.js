
    let checkingFirstName;
    let checkingLastName;
    let checkingGradYear;
    let settingsBtns = $('#settingsCardDisplay .tablinks');

    function checkFirstName(inputID, messageDivID) {
        const firstNameRegex = new RegExp(/^[a-z]+(?:-[a-z]+)*$/i);

        let firstName = $(inputID)[0].value;
        let icon = $($($(inputID)[0].nextElementSibling)[0].firstElementChild);

        $(messageDivID).addClass('dont-show').removeClass('always-show');
        icon.attr('class', 'fa fa-pulse fa-spinner');
        $(inputID).removeClass('invalid').addClass('loading');
        if (checkingFirstName) {
            clearTimeout(checkingFirstName);
        }

        if (firstName.length === 0) {
            firstName = getPersonalInfo(schoolUsername).firstName;
            $(messageDivID).addClass('always-show').removeClass('dont-show').text('Your name will be set back to ' + firstName + ' when you click outside of the input field');
            icon.attr('class', 'fa fa-exclamation-circle');
            $(inputID).removeClass('loading').addClass('invalid').blur(() => {
                $(inputID).val(firstName);
                $(inputID).trigger('input');
                $(inputID).off('blur');
            });
            return;
        }

        checkingFirstName = setTimeout(() => {
            if (!firstNameRegex.test(firstName)) {
                $(messageDivID).removeClass('dont-show').addClass('always-show').text('First name can only contain letters and/or hyphens.');
                icon.attr('class', 'fa fa-exclamation-circle');
                $(inputID).removeClass('loading').addClass('invalid');
                return;
            }
            $.ajax({
                url: '/setPersonalInfo', type: 'POST', async: true, data: {firstName: firstName}
            }).done((response) => {
                if (typeof response === 'string' && response.startsWith('<!')) {  // If logged out
                    $('.session-timeout').show();
                    $('body').find('*').not('.session-timeout').remove();
                    return;
                }
                // Make sure value is still the same
                if (firstName === $(inputID)[0].value) {
                    $(messageDivID).removeClass('dont-show').removeClass('always-show').text(response);
                    icon.attr('class', 'fa fa-check-circle');
                    $(inputID).removeClass('loading').removeClass('invalid');
                    personalInfo.firstName = firstName;
                    updateNameDisplay();
                }
            }).fail((data) => {
                // Make sure value is still the same
                if (firstName === $(inputID)[0].value) {
                    $(messageDivID).removeClass('dont-show').addClass('always-show').html(data.responseText);
                    icon.attr('class', 'fa fa-exclamation-circle');
                    $(inputID).removeClass('loading').addClass('invalid');
                }
            });
        }, 400);
    }

    function checkLastName(inputID, messageDivID) {
        const lastNameRegex = new RegExp(/^[a-z]+(?:-[a-z]+)*$/i);

        let lastName = $(inputID)[0].value;
        let icon = $($($(inputID)[0].nextElementSibling)[0].firstElementChild);

        $(messageDivID).addClass('dont-show').removeClass('always-show');
        icon.attr('class', 'fa fa-pulse fa-spinner');
        $(inputID).removeClass('loading').removeClass('invalid');
        if (checkingLastName) {
            clearTimeout(checkingLastName);
        }

        if (school !== 'basis' && lastName.length === 0) {
            lastName = getPersonalInfo(schoolUsername).lastName;
            $(messageDivID).addClass('always-show').removeClass('dont-show').text(`Your name will be set back to ${lastName} when you click outside of the input field`);
            icon.attr('class', 'fa fa-exclamation-circle');
            $(inputID).removeClass('loading').addClass('invalid').blur(() => {
                $(inputID).val(lastName);
                $(inputID).trigger('input');
                $(inputID).off('blur');
            });
            return;
        }

        checkingLastName = setTimeout(() => {
            if (!lastNameRegex.test(lastName)) {
                $(messageDivID).removeClass('dont-show').addClass('always-show').text('Last name can only contain letters and/or hyphens.');
                icon.attr('class', 'fa fa-exclamation-circle');
                $(inputID).removeClass('loading').addClass('invalid');
                return;
            }
            $.ajax({
                url: '/setPersonalInfo', type: 'POST', async: true, data: {lastName: lastName}
            }).done((response) => {
                if (typeof response === 'string' && response.startsWith('<!')) {  // If logged out
                    $('.session-timeout').show();
                    $('body').find('*').not('.session-timeout').remove();
                    return;
                }
                // Make sure value is still the same
                if (lastName === $(inputID)[0].value) {
                    $(messageDivID).removeClass('dont-show').removeClass('always-show').text(response);
                    icon.attr('class', 'fa fa-check-circle');
                    $(inputID).removeClass('loading').removeClass('invalid');
                    personalInfo.lastName = lastName;
                    updateNameDisplay();
                }
            }).fail((data) => {
                // Make sure value is still the same
                if (lastName === $(inputID)[0].value) {
                    $(messageDivID).removeClass('dont-show').addClass('always-show').html(data.responseText);
                    icon.attr('class', 'fa fa-exclamation-circle');
                    $(inputID).removeClass('loading').addClass('invalid');
                }
            });
        }, 400);
    }

    function checkGradYear(inputID, messageDivID) {
        const gradYearRegex = new RegExp('^2[0-9][1-9][0-9]$');

        let gradYear = $(inputID)[0].valueAsNumber;
        let icon = $($($(inputID)[0].nextElementSibling)[0].firstElementChild);

        $(messageDivID).addClass('dont-show').removeClass('always-show');
        icon.attr('class', 'fa fa-pulse fa-spinner');
        $(inputID).removeClass('invalid').addClass('loading');
        if (checkingGradYear) {
            clearTimeout(checkingGradYear);
        }

        checkingGradYear = setTimeout(() => {
            if (gradYear.length !== 0 && !gradYearRegex.test(gradYear)) {
                $(messageDivID).removeClass('dont-show').addClass('always-show').text('That doesn\'t look like a valid graduation year');
                icon.attr('class', 'fa fa-exclamation-circle');
                $(inputID).removeClass('loading').addClass('invalid');
                return;
            }
            $.ajax({
                url: '/setPersonalInfo', type: 'POST', async: true, data: {graduationYear: gradYear}
            }).done((response) => {
                if (typeof response === 'string' && response.startsWith('<!')) {  // If logged out
                    $('.session-timeout').show();
                    $('body').find('*').not('.session-timeout').remove();
                    return;
                }
                // Make sure value is still the same
                if (gradYear === $(inputID)[0].valueAsNumber) {
                    $(messageDivID).removeClass('dont-show').removeClass('always-show').text(response);
                    icon.attr('class', 'fa fa-check-circle');
                    $(inputID).removeClass('loading').removeClass('invalid');
                    personalInfo.graduationYear = gradYear;
                    updateNameDisplay();
                }
            }).fail((data) => {
                // Make sure value is still the same
                if (gradYear === $(inputID)[0].valueAsNumber) {
                    $(messageDivID).removeClass('dont-show').addClass('always-show').html(data.responseText);
                    icon.attr('class', 'fa fa-exclamation-circle');
                    $(inputID).removeClass('loading').addClass('invalid');
                }
            });
        }, 400);
    }

    function updateNameDisplay(schoolUsername) {
        if (schoolUsername) {
            let {firstName, lastName, graduationYear} = getPersonalInfo(schoolUsername);
            let name = [];
            if (!!firstName) {
                name.push(firstName);
            }
            if (!!lastName) {
                name.push(lastName);
            }
            if (!!graduationYear && graduationYear > 2010) {
                name.push(`'${graduationYear - 2000}`);
            }
            $('#nameDisplay').text(name.join(' '));
            $('#firstName').val(firstName);
            $('#lastName').val(lastName);
            $('#graduationYear').val(graduationYear);
        } else {
            let name = [];
            if (!!personalInfo.firstName) {
                name.push(personalInfo.firstName);
            }
            if (!!personalInfo.lastName) {
                name.push(personalInfo.lastName);
            }
            if (!!personalInfo.graduationYear && personalInfo.graduationYear > 2010) {
                name.push(`'${personalInfo.graduationYear - 2000}`);
            }
            $('#nameDisplay').text(name.join(' '));
        }
    }

    function getPersonalInfo(email) {
        if (school === 'bellarmine') {
            // First Name
            let firstName = email.substring(0, email.indexOf('.'));
            firstName = firstName[0].toUpperCase() + firstName.substring(1).toLowerCase();

            // Last Name
            let lastName = email.substring(email.indexOf('.') + 1, email.indexOf(email.match(/\d/)));
            lastName = lastName[0].toUpperCase() + lastName.substring(1).toLowerCase();

            // Graduation Year
            let graduationYear = email.substring(email.indexOf(email.match(/\d/)), email.indexOf('@'));
            if (graduationYear) {
                graduationYear = parseInt(graduationYear);
                graduationYear += 2000;
            }

            return {firstName, lastName, graduationYear};
        }
        if (school === 'ndsj') {
            // First Name
            let firstName = email.substring(0, 1).toUpperCase();

            // Last Name
            let lastName = email.substring(1, email.indexOf(email.match(/\d/)));
            lastName = lastName[0].toUpperCase() + lastName.substring(1).toLowerCase();

            // Graduation Year
            let graduationYear = email.substring(email.indexOf(email.match(/\d/)), email.indexOf('@'));
            if (graduationYear) {
                graduationYear = parseInt(graduationYear);
                graduationYear += 2000;
            }

            return {firstName, lastName, graduationYear};
        }
        if (school === 'basis') {
            let firstName = email.indexOf('_') === -1 ? email : email.substring(0, email.indexOf('_'));
            firstName = firstName[0].toUpperCase() + firstName.substring(1).toLowerCase();
            let lastName = '';
            let graduationYear = null;

            return {firstName, lastName, graduationYear};
        }
    }

    function manageGradeSyncCheckbox() {
        let gradeSyncDiv = $('#gradeSyncDiv');
        if (gradeSyncDiv.css('display') === 'block' && !$('#gradeSyncToggle').prop('checked')) {
            gradeSync = false;
            ajaxPostForm('#gradeSync', [], '', true);
            $('#gradeSync').trigger('submit');
            gradeSyncDiv.hide();
            $('#syncGradesDiv').show();
            $('.gradeSyncEnabled').hide();
            clearTimeout(checkLastUpdated);
            $('.updateGradesMessage').removeClass('alert-danger').removeClass('alert-success').addClass('alert-info').find('.messageTxt').text('GradeSync is not enabled');
        } else {
            $('#savePasswordToggle:not(:checked)').trigger('click');
            $('#syncGradesDiv').show();
            showCard('#updateGradesDisplay');
        }
    }

    function reload() {
        location.reload();
    }

    function setColorPalette(palette) {
        if (!palette) {
            palette = appearance.colorPalette;
        }
        let buttons = $('#color-scheme-picker button:not([disabled])');
        buttons.prop('disabled', true);
        $.ajax({
            url: '/setColorPalette',
            type: 'POST',
            data: {preset: palette, shuffleColors: JSON.stringify($('#shuffleToggle').is(':checked'))},
            async: true
        }).done((response) => {
            if (typeof response === 'string' && response.startsWith('<!')) {  // If logged out
                $('.session-timeout').show();
                $('body').find('*').not('.session-timeout').remove();
                return;
            }
            $('#color-scheme-picker div').each(function () {
                if (this.id === palette) {
                    $(this).find('i').css('opacity', 1);
                } else {
                    $(this).find('i').css('opacity', 0);
                }
            });
            if (palette === 'custom') {
                $('.editClassColor').addClass('visible');
                $('#shuffleToggle').parent('.switch').parent('.slider-container').hide();
            } else {
                $('.editClassColor').removeClass('visible');
                $('#shuffleToggle').parent('.switch').parent('.slider-container').show();
                updateClassColors(!appearance.showNonAcademic ? academicIndices.map(n => response[n]) : response);
            }
            appearance.colorPalette = palette;
            setTimeout(() => {
                buttons.prop('disabled', false);
            }, 1000);
        });
    }

    function updateCustomColor(serverClassIndex, colorHex) {
        let color = colorHex;
        if (colorHex.startsWith('#')) {
            color = colorHex.substring(1);
        }
        if (color.length === 3) {
            color = color[0] + color[0] + color[1] + color[1] + color[2] + color[2];
        }
        if (color.length !== 6) {
            return;
        }
        let buttons = $('#color-scheme-picker button:not([disabled])');
        buttons.prop('disabled', true);
        $.ajax({
            url: '/updateCustomColor',
            type: 'POST',
            data: {index: serverClassIndex, color: color}
        }).done((response) => {
            if (typeof response === 'string' && response.startsWith('<!')) {  // If logged out
                $('.session-timeout').show();
                $('body').find('*').not('.session-timeout').remove();
                return;
            }
            updateClassColors(!appearance.showNonAcademic ? academicIndices.map(n => response[n]) : response);
            setTimeout(() => {
                buttons.prop('disabled', false);
            }, 1000);
        });
    }

    function updateClassColors(colorArray) {
        let _colors = colorArray;
        for (let i = 0; i < _colors.length; i++) {
            $('#classColor' + i).css('color', _colors[i]);
            $('#customColor' + i).val(_colors[i]);
        }
        colors = colorArray;
        setupColorStuff();
    }

    function updateSchoolUsernameDisplay() {
        document.getElementById('schoolUsernameDisplay').textContent = document.getElementById('school_email').value;
    }

    function openTab(tabIndex) {
        // Declare all variables
        let tabName = '#settings-' + tabIndex;

        // Get all elements with class="tabcontent" and hide them
        $('#settingsCardDisplay .tabcontent').removeClass('show');

        // Get all elements with class="tablinks" and remove the class "active"
        settingsBtns.removeClass('active');

        // Show the current tab, and add an "active" class to the button that opened the tab
        $(tabName).addClass('show');
        $(settingsBtns[tabIndex]).addClass('active');
        currentSettingsTab = tabIndex;

        if (currentSettingsTab === 4) {
            setupDiscord(true);
        }
    }

    function checkLabel(input) {
        let label = $($(input)[0].previousElementSibling);
        input = $(input);
        if (input[0].value !== '') {
            if (!label.hasClass('label-active')) {
                label.addClass('label-active');
            }
        } else {
            label.removeClass('label-active');
        }
    }

    let checkingPassword;

    function checkPassword(inputID, oldID, messageDivID) {
        const lowerCaseRegex = new RegExp('^(?=.*[a-z])');
        const upperCaseRegex = new RegExp('^(?=.*[A-Z])');
        const numericRegex = new RegExp('^(?=.*[0-9])');

        let password = $(inputID)[0].value;
        let oldPassword = $(oldID)[0].value;
        let icon = $($($(inputID)[0].nextElementSibling)[0].firstElementChild);
        if (messageDivID) {
            $(messageDivID).addClass('dont-show').removeClass('always-show');
            icon.attr('class', 'fa fa-pulse fa-spinner');
            $(inputID).removeClass('invalid').addClass('loading');
            if (checkingPassword) {
                clearTimeout(checkingPassword);
            }

            if (password === '') {
                $(messageDivID).addClass('dont-show').removeClass('always-show');
                icon.attr('class', '');
                $(inputID).removeClass('loading').removeClass('invalid');
                invalidate();
                return;
            }
            checkingPassword = setTimeout(() => {
                if (oldPassword === '') {
                    $(messageDivID).removeClass('dont-show').addClass('always-show').text('Enter your old password first');
                    icon.attr('class', 'fa fa-exclamation-circle');
                    $(inputID).removeClass('loading').addClass('invalid');
                    invalidate();
                    return;
                }
                if (password === oldPassword) {
                    $(messageDivID).removeClass('dont-show').addClass('always-show').text('Your new password should be different from your old password');
                    icon.attr('class', 'fa fa-exclamation-circle');
                    $(inputID).removeClass('loading').addClass('invalid');
                    invalidate();
                    return;
                }
                let message;
                if (password.length < 6) {
                    message = 'Your password must be at least 6 characters long';
                } else if (password.length > 64) {
                    message = 'Your password must be fewer than 64 characters long';
                } else if (!lowerCaseRegex.test(password)) {
                    message = 'Your password must include at least one lowercase character';
                } else if (!upperCaseRegex.test(password)) {
                    message = 'Your password must include at least one uppercase character';
                } else if (!numericRegex.test(password)) {
                    message = 'Your password must include at least one number';
                } else {
                    message = 'Strong password';
                    $(messageDivID).removeClass('dont-show').removeClass('always-show').text(message);
                    icon.attr('class', 'fa fa-check-circle');
                    $(inputID).removeClass('loading').removeClass('invalid');
                    validate();
                    return;
                }
                if (message) {
                    $(messageDivID).removeClass('dont-show').addClass('always-show').css('color', 'red').text(message);
                    icon.attr('class', 'fa fa-exclamation-circle');
                    $(inputID).css('border-bottom-color', 'red');
                    invalidate();
                } else {
                    $(messageDivID).addClass('dont-show').removeClass('always-show');
                    icon.attr('class', '');
                    $(inputID).removeClass('loading').removeClass('invalid');
                }
            }, 400);
        } else {
            return !((password.length < 6) || (password.length > 64) || (!lowerCaseRegex.test(password)) || (!upperCaseRegex.test(password)) || (!numericRegex.test(password)));
        }
    }

    let checkingPasswordConfirm;

    function checkPasswordConfirm(inputID, oldID, confirmID, messageDivID) {
        let password = $(inputID)[0].value;
        let confirm = $(confirmID)[0].value;
        let icon = $($($(confirmID)[0].nextElementSibling)[0].firstElementChild);
        if (messageDivID) {
            $(messageDivID).addClass('dont-show').removeClass('always-show');
            icon.attr('class', 'fa fa-pulse fa-spinner');
            $(confirmID).removeClass('invalid').addClass('loading');
            if (checkingPasswordConfirm) {
                clearTimeout(checkingPasswordConfirm);
            }

            if (confirm === '') {
                $(messageDivID).addClass('dont-show').removeClass('always-show');
                icon.attr('class', '');
                $(confirmID).removeClass('loading').removeClass('invalid');
                invalidate();
                return;
            }
            checkingPasswordConfirm = setTimeout(() => {
                if (checkPassword(inputID, oldID)) {
                    if (password === confirm) {
                        $(messageDivID).removeClass('dont-show').removeClass('always-show').text('Passwords match');
                        icon.attr('class', 'fa fa-check-circle');
                        $(confirmID).removeClass('loading').removeClass('invalid');
                        validate();
                    } else {
                        $(messageDivID).removeClass('dont-show').addClass('always-show').text('Passwords do not match');
                        icon.attr('class', 'fa fa-exclamation-circle');
                        $(confirmID).removeClass('loading').addClass('invalid');
                        invalidate();
                    }
                } else {
                    $(messageDivID).removeClass('dont-show').addClass('always-show').text('Enter a valid password first');
                    icon.attr('class', 'fa fa-exclamation-circle');
                    $(confirmID).removeClass('loading').addClass('invalid');
                    invalidate();
                }
            }, 400);
        } else {
            invalidate();
            return checkPassword(inputID, oldID) && password === confirm;
        }
    }

    let passwordDiv = $('#password');
    let oldPasswordDiv = $('#oldPassword');
    let confirmDiv = $('#confirmPassword');
    let signupBtn = $('#changePasswordBtn');

    function validate() {
        if (!checkPasswordConfirm(passwordDiv, oldPasswordDiv, confirmDiv)) { // Invalid or Unconfirmed Password
            invalidate();
            return;
        }
        signupBtn.prop('disabled', '');
    }

    function invalidate() {
        signupBtn.prop('disabled', 'disabled');
    }

    function closeMessage(id) {
        document.getElementById(id).style.display = 'none';
    }

    function resetTutorial() {
        $.ajax({
            url: '/resetTutorial', type: 'POST', async: true
        }).done((response) => {
            if (typeof response === 'string' && response.startsWith('<!')) {  // If logged out
                $('.session-timeout').show();
                $('body').find('*').not('.session-timeout').remove();
                return;
            }
            alerts.tutorialStatus = JSON.parse(response);
            setupTutorialPopups();
            updateTutorialProgress();
        });
    }

    function updateTutorialProgress() {
        const {tutorialStatus} = alerts;
        let numGotten = Object.values(tutorialStatus).filter(x => x).length;
        let numTotal = Object.values(tutorialStatus).length;
        let progress = numGotten / numTotal * 100;
        let bar = $('#tutorialStatus').text(progress !== 0 ? Math.round(progress) + '%' : '').css('width', progress + '%').parents('.progress');
        let emptyBars = $('.empty-progress');
        let i;
        for (i = 0; i < numTotal - numGotten; i++) {
            if (i >= emptyBars.length) {
                bar.append('<div class="progress-bar empty-progress" role="progressbar" style="width: ' + (100 / numTotal) + '%"></div>');
            } else {
                $(emptyBars[i]).css('width', (100 / numTotal) + '%');
            }
        }
        for (i; i < emptyBars.length; i++) {
            $(emptyBars[i]).remove();
        }
    }

    function setupDonos() {
        let donoDiv = $('#donations');
        let donoProgressDiv = $('#donationProgress');
        let progressBars = donoProgressDiv.find('div.progress-bar');
        $(progressBars).css('width', '0');
        $(progressBars[0]).css('width', '12.5%');
        if (donoData.length === 0) {
            donoDiv.html(`<div style="text-align: center">No Donations Yet</div>`);
            $(progressBars[4]).css('width', '87.5%');
            donor = false;
            plus = false;
            premium = false;
        } else {
            let donoTable = `<table id="donoTable"><thead><tr><th>Platform</th><th>Amount Paid</th><th>Actual Value</th><th>Date Donated</th></tr></thead><tbody>`;
            let totalPaid = 0;
            let totalReceived = 0;
            for (let i = 0; i < donoData.length; i++) {
                let platform = donoData[i].platform;
                let paid = donoData[i].paidValue;
                let received = donoData[i].receivedValue;
                totalPaid += paid;
                totalReceived += received;
                let date = donoData[i].dateDonated;

                if (platform === 'paypal') platform = 'PayPal';
                else if (platform === 'zelle') platform = 'Zelle';
                else if (platform === 'venmo') platform = 'Venmo';
                else if (platform === 'cash') platform = 'Cash';
                else if (platform === 'gift') platform = 'Gift';

                donoTable += `<tr><td class="dono-platform-${platform.toLowerCase()}">${platform}</td><td>$${paid.toFixed(2)}</td><td>$${received.toFixed(2)}</td><td>${new Date(date).toLocaleDateString()}</td></tr>`;
            }
            donoTable += `<tfoot><tr><td style="text-align: right">Total:</td><td>$${totalPaid.toFixed(2)}</td><td>$${totalReceived.toFixed(2)}</td><td></td></tr></tfoot></tbody></table>`;
            donoDiv.html(donoTable);

            let minDonor = 0.01;
            let minPlus = 3;
            let minPremium = 5;

            if (totalReceived <= minDonor) {
                let width = 12.5 * totalReceived / minDonor;
                $(progressBars[1]).css('width', `${width}%`);
                $(progressBars[4]).css('width', `${100 - 12.5 - width}%`);
            } else if (totalReceived <= minPlus) {
                $(progressBars[1]).css('width', '12.5%');
                let width = 25 * (totalReceived - minDonor) / (minPlus - minDonor);
                $(progressBars[2]).css('width', `${width}%`);
                $(progressBars[4]).css('width', `${100 - 12.5 - 12.5 - width}%`);
            } else {
                $(progressBars[1]).css('width', '12.5%');
                $(progressBars[2]).css('width', `25%`);
                let width = Math.min(50, 50 * (totalReceived - minPlus) / (minPremium - minPlus));
                $(progressBars[3]).css('width', `${width}%`);
                $(progressBars[4]).css('width', `${100 - 12.5 - 12.5 - 25 - width}%`);
            }
            donor = totalReceived >= minDonor;
            plus = totalReceived >= minPlus;
            premium = totalReceived >= minPremium;

            if (!donor) createDonationProgressNotification()
        }
    }

    function changeSetting(name, value) {
        sendData('settings-change', {[name]: value});
    }

    function ajaxPostForm(formID, fieldIDsToClear, messagesDivID, _async, doInstantly = false) {
        // Get the form.
        let form = $(formID);
        $(form).on('submit', function (event) {
            event.preventDefault();
            event.stopImmediatePropagation();

            if (submittingForms[formID]) {
                clearTimeout(submittingForms[formID]);
                delete submittingForms[formID];
            }
            submittingForms[formID] = setTimeout(() => {

                let formData;
                let message;
                let formMessagesDiv;

                // Serialize the form data.
                formData = $(form).serialize();

                // Get the messages.
                formMessagesDiv = $(messagesDivID);
                $(formMessagesDiv).find('.sk-chase-mini').css('display', 'inline-block');
                message = $(formMessagesDiv).find('.messageTxt');
                $(message).text('');
                $(formMessagesDiv).removeClass('alert-success').removeClass('alert-danger').addClass('alert-info');
                $(formMessagesDiv).show();

                // Submit the form using AJAX.
                $.ajax({
                    type: 'POST', url: $(form).attr('action'), data: formData, async: _async
                }).done(function (response) {
                    if (typeof response === 'string' && response.startsWith('<!')) {  // If logged out
                        $('.session-timeout').show();
                        $('body').find('*').not('.session-timeout').remove();
                        return;
                    }
                    console.log(response);
                    setTimeout(function () {
                        $(message).text(response);
                        $(formMessagesDiv).find('.sk-chase-mini').hide();
                        $(formMessagesDiv).removeClass('alert-info').removeClass('alert-danger').addClass('alert-success');
                    }, 500);

                    if (formID === '#changeSchoolEmail') {
                        schoolUsername = $('#school_email')[0].value;
                        updateNameDisplay(schoolUsername);
                        $($('#school_email')[0].form).find('button').prop('disabled', true);
                    }

                    // Show the div.
                    $(formMessagesDiv).show();

                    // Clear fields to clear
                    for (let i = 0; i < fieldIDsToClear.length; i++) {
                        $(fieldIDsToClear[i]).val('');
                        $(fieldIDsToClear[i]).trigger('blur');
                        if (formID === '#changePassword') {
                            $($(fieldIDsToClear[i])[0].previousElementSibling).removeClass('label-active');
                            if ($($(fieldIDsToClear[i])[0].previousElementSibling.children[0])) {
                                $($(fieldIDsToClear[i])[0].previousElementSibling.children[0]).text('');
                            }
                        }
                    }

                }).fail(function (data) {
                    // Make sure that the formMessages div has the alert-danger class
                    $($(formMessagesDiv)[1]).removeClass('alert-info');
                    $($(formMessagesDiv)[1]).addClass('alert-danger');

                    // Set the message text.
                    if (data.responseText !== '') {
                        if (data.responseText === 'Incorrect login details.') {
                            $(message).text('Incorrect school password.');
                            $('#inputPassword').trigger('focus');
                        } else {
                            $(message).text(data.responseText);
                        }
                    } else {
                        console.log(formMessagesDiv);
                        $(message).text('Oops! An error occurred and your message could not be sent.');
                    }

                    // Show the div.
                    $(formMessagesDiv).css('display', 'block');

                    // Hide loading
                    $(formMessagesDiv).find('.sk-chase-mini').hide();

                    if (formID === '#syncGradesForm' || formID === '#gradeSyncForm') {
                        clearTimeout(checkLastUpdated);
                    }

                });
            }, (doInstantly ? 0 : 400));
        });
    }

