const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config(); // Use .env for sensitive info

const app = express();
app.use(bodyParser.json());

const accountSid = process.env.TWILIO_ACCOUNT_SID; // Store these in .env
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = new twilio(accountSid, authToken);

// Set up SQLite DB
const db = new sqlite3.Database(':memory:');
db.serialize(() => {
    db.run("CREATE TABLE accidents (id INTEGER PRIMARY KEY AUTOINCREMENT, lat REAL, lng REAL, time TEXT)");
});

// Endpoint to receive accident data
app.post('/accident', (req, res) => {
    const { location, time } = req.body;
    const { lat, lng } = location;

    // Save accident data to the database
    db.run('INSERT INTO accidents (lat, lng, time) VALUES (?, ?, ?)', [lat, lng, time], function(err) {
        if (err) {
            return res.status(500).send('Error saving accident data');
        }

        // Send SMS alert via Twilio
        client.messages.create({
            body: `Accident detected at Lat: ${lat}, Lng: ${lng}`,
            to: process.env.EMERGENCY_NUMBER,  // Replace with the emergency number from .env
            from: process.env.TWILIO_NUMBER      // Replace with your Twilio number from .env
        }).then(() => console.log('SMS sent'))
          .catch(err => console.error('Error sending SMS:', err));

        // Send email alert via Nodemailer
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER, // Replace with your email from .env
                pass: process.env.EMAIL_PASS    // Replace with your email password from .env
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: 'hospital@domain.com, police@domain.com', // Replace with actual emails
            subject: 'Accident Alert',
            text: `An accident has been detected at Latitude: ${lat}, Longitude: ${lng}.`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return console.log('Error sending email:', error);
            }
            console.log('Email sent:', info.response);
        });

        res.send('Accident data received and alerts sent.');
    });
});

// Endpoint to get all accidents for the dashboard
app.get('/get_accidents', (req, res) => {
    db.all('SELECT * FROM accidents', [], (err, rows) => {
        if (err) {
            return res.status(500).send('Error fetching accidents');
        }
        res.json(rows);
    });
});

// Serve static files (like the dashboard)
app.use(express.static('public'));

app.listen(3000, () => {
    console.log('Server running on port 3000');
});
