const express = require('express');
const nodemailer = require('nodemailer');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

const emailMethod = {email_verify}

async function email_verify(){
  dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRATION = parseInt(process.env.JWT_EXPIRATION);


// Configure Nodemailer with your email service credentials
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Middleware to parse JSON in the request body
app.use(express.json());

// User registration endpoint
app.post('/create_account_cust.html', async (req, res) => {
  const { username,email,phone, password,confirm_pass } = req.body;

  try {
    // Check if the user already exists
    const [rows] = await pool.query('SELECT * FROM user WHERE email = ?', [email]);
    if (rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    if(password != confirm_pass){
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash the password before saving it to the database
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert a new user record into the database
    await pool.query('INSERT INTO users (username,email,phone, password_hash, salt,is_verified) VALUES (?, ?, ?,?,?)', [username,email,phone, hashedPassword, salt,0]);

    // Generate a JWT token for email verification
    const verificationToken = jwt.sign({ email }, JWT_SECRET, { expiresIn: JWT_EXPIRATION });

    // Send the verification email
    const mailOptions = {
      from: process.env.EMAIL_USERNAME,
      to: email,
      subject: 'Email Verification',
      text: `Click on the following link to verify your email: http://localhost:${PORT}/verify/${verificationToken}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log('Error sending email:', error);
        res.status(500).json({ error: 'Failed to send verification email' });
      } else {
        console.log('Verification email sent:', info.response);
        res.json({ message: 'Verification email sent successfully' });
      }
    });

    res.redirect('/index.html');
  } catch (err) {
    console.error('Error registering user:', err);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// User verification endpoint
app.get('/verify/:token', async (req, res) => {
  const { token } = req.params;

  try {
    // Verify the JWT token
    const decodedToken = jwt.verify(token, JWT_SECRET);

    // Update the user's is_verified status in the database
    await pool.query('UPDATE user SET is_verified = ? WHERE email = ?', [1, decodedToken.email]);

    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    console.error('Error verifying email:', err);
    res.status(400).json({ error: 'Invalid verification token' });
  }
});

}

module.exports = emailMethod

