const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const dotenv = require("dotenv");

dotenv.config({
    path: "./env/email.env"
});
  
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })

function sendMail(to, subject, html){
    const accessToken = oauth2Client.getAccessToken();

    const mailOptions = {
        from: `TasinShop <${process.env.EMAIL_USERNAME}>`,
        to,
        subject,
        html
    };

    // Use the refresh token for sending emails with Nodemailer
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: process.env.EMAIL_USERNAME,
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
          accessToken,
        },
    });

    transporter.sendMail(mailOptions, (err, res) => {
        if(err) {
            console.log(err);
        } 
        else {
            console.log("Mail sent!")
        }
    })
}


module.exports = sendMail;