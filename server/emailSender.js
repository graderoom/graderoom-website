const Plunk = require('@plunk/node');
const plunk = new Plunk.default(process.env.PLUNK_API_KEY)
const fromEmail = "no-reply@graderoom.me"

module.exports = {

    sendPasswordResetToAccountOwner(toEmail, pwResetLink, firstName) {
        const msg = {
            to: toEmail,
            from: fromEmail,
            subject: "Graderoom Password Reset",
            body: buildEmailHTML(toEmail, pwResetLink, firstName),
            type: 'html'
        };

        (async () => {
            try {
                await plunk.emails.send(msg);
                console.log(`Sent email to ${toEmail}`);
            } catch (error) {
                console.error(error);

                if (error.response) {
                    console.error(error.response.body);
                }
            }
        })();
    },

    sendPasswordResetToNonUser(toEmail, pwResetLink) {
        // for now, just don't send one (and let the user think one was sent)
    },
};

function buildEmailHTML(toEmail, pwResetLink, firstName) {
    return `<html lang="en-US">
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
</html>`;
}
