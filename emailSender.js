const sgMail = require('@sendgrid/mail');
sgMail.setApiKey('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'); // todo regenerate & move to env
const fromEmail = "no-reply@graderoom.me"


module.exports = {

    sendPasswordResetToAccountOwner(toEmail, pwResetLink) {
        console.log(toEmail)
        const msg = {
            to: toEmail,
            from: fromEmail,
            subject: 'Password reset link',
            html: `<strong>${pwResetLink}</strong>`,
        };

        (async () => {
            try {
                await sgMail.send(msg);
                console.log("sent email");
            } catch (error) {
                console.error(error);

                if (error.response) {
                    console.error(error.response.body)
                }
            }
        })();
    },

    sendPasswordResetToNonUser(toEmail, pwResetLink) {
        // todo
    },

}