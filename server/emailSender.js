const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: 587,
    requireTLS: true,
    auth: {user: process.env.SMTP_USER, pass: process.env.SMTP_PASS}
});
const fromEmail = "Graderoom <no-reply@graderoom.me>"

module.exports = {

    sendPasswordResetToAccountOwner(toEmail, pwResetLink, firstName) {
        const msg = {
            to: toEmail,
            from: fromEmail,
            subject: "Graderoom Password Reset",
            // Overrides OCI's own unsubscribe link, which would suppress every future email to this address
            headers: {
                "List-Unsubscribe": "<https://graderoom.me/unsubscribe>",
                "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"
            },
            html: buildEmailHTML(toEmail, pwResetLink, firstName),
            text: `Hi ${firstName},

Someone requested a new password for the Graderoom account for ${toEmail}. No changes have been made to your account yet.

Reset your password here (expires in 24 hours):
${pwResetLink}

If you didn't request this, you can safely ignore this email.

Questions? Email support@graderoom.me`
        };

        (async () => {
            try {
                await transporter.sendMail(msg);
                console.log(`Sent email to ${toEmail}`);
            } catch (error) {
                console.error(error);
            }
        })();
    },

    sendPasswordResetToNonUser(toEmail, pwResetLink) {
        // for now, just don't send one (and let the user think one was sent)
    },
};

function buildEmailHTML(toEmail, pwResetLink, firstName) {
    // Email clients ignore most <style> blocks, so everything is inline
    return `<div style="max-width: 480px; margin: 0 auto; font-family: Montserrat, 'Segoe UI', Arial, sans-serif; color: #222222;">
   <div style="padding: 24px 0 8px; text-align: center;">
      <img src="https://graderoom.me/public/resources/common/icon-128.png" alt="Graderoom" width="56" height="56"
           style="display: inline-block; width: 56px; height: 56px; margin: 0; border: 0;">
      <div style="font-size: 22px; font-weight: 600; margin-top: 8px;">Graderoom</div>
   </div>
   <div style="background-color: #FFFFFF; border: 1px solid #DDDDDD; border-radius: 12px; padding: 24px;">
      <p style="margin: 0 0 16px; font-size: 16px; font-weight: 600;">Hi ${firstName},</p>
      <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6;">
         Someone requested a new password for the Graderoom account for ${toEmail}. No changes have been made to your account yet.
      </p>
      <div style="margin: 24px 0; text-align: center;">
         <a href="${pwResetLink}" target="_blank"
            style="display: inline-block; padding: 12px 28px; background-color: #444444; color: #FFFFFF; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 8px;">Reset Password</a>
      </div>
      <p style="margin: 0 0 16px; font-size: 13px; line-height: 1.6; color: #555555;">
         This link expires in 24 hours. If the button doesn't work, paste this into your browser:<br>
         <a href="${pwResetLink}" style="color: #444444; word-break: break-all;">${pwResetLink}</a>
      </p>
      <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #555555;">
         If you didn't request this, you can safely ignore this email.
      </p>
   </div>
   <p style="margin: 16px 0 0; font-size: 12px; line-height: 1.6; color: #888888; text-align: center;">
      Questions? Email <a href="mailto:support@graderoom.me" style="color: #888888;">support@graderoom.me</a>
   </p>
</div>`;
}
