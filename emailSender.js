const sgMail = require('@sendgrid/mail');
sgMail.setApiKey('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'); // todo regenerate & move to env
const fromEmail = "no-reply@graderoom.me"


module.exports = {

    sendPasswordResetToAccountOwner(toEmail, pwResetLink, firstName) {
        console.log(toEmail)
        const msg = {
            to: toEmail,
            from: fromEmail,
            subject: 'Graderoom Password Reset',
            html: buildEmailHTML(toEmail, pwResetLink, firstName),
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

function buildEmailHTML(toEmail, pwResetLink, firstName) {
    return `<html>
   <body>
      <h3>${firstName},</h3>
      <p> Someone has requested a new password for the Graderoom account for ${toEmail}. No changes have been made to your account yet.
         <br> <br>
         You can reset your password by clicking the link below:
         <br>
         ${pwResetLink}
         <br>
         This link will expire in 24 hours.
         <br><br>
         If you did not request a new password, you can safely ignore this email. For other concerns, please email support@graderoom.me.
         <br> <br>
         Best, <br>
         The Graderoom Team
      <p>
   </body>
</html>`
}