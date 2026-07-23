require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const axios = require('axios');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// 1. DATABASE CONNECTION (MongoDB)
const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ev_rental';
mongoose.connect(mongoUri)
    .then(() => console.log('✅ Connected to MongoDB Database'))
    .catch(err => console.error('❌ Database Connection Error:', err));

// 2. MONGOOSE SCHEMAS & MODELS
const BikeSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    model: String,
    status: { type: String, default: 'Available' },
    weeklyRent: Number,
    weeklyDue: Number
});

const RiderSchema = new mongoose.Schema({
    name: String,
    phone: { type: String, required: true, unique: true },
    emergency: String,
    aadhaar: String,
    dl: String,
    platform: String,
    bikeId: String,
    otp: String,
    otpExpires: Date
});

const Bike = mongoose.model('Bike', BikeSchema);
const Rider = mongoose.model('Rider', RiderSchema);

// Initial Database Seeding Function (Run once if empty)
async function seedInitialData() {
    const bikeCount = await Bike.countDocuments();
    if (bikeCount === 0) {
        await Bike.create([
            { id: 'EV-101', model: 'Speed-X Teal', status: 'Rented', weeklyRent: 1200, weeklyDue: 1200 },
            { id: 'EV-102', model: 'Urban Red', status: 'Available', weeklyRent: 1200, weeklyDue: 0 }
        ]);
        await Rider.create({
            name: 'Sachin',
            phone: '9876543210',
            emergency: '9123456789',
            aadhaar: '[Aadhaar Redacted]',
            dl: 'MH-03-2022-009',
            platform: 'Blinkit',
            bikeId: 'EV-101'
        });
        console.log('🌱 Demo Data Seeded to DB!');
    }
}
seedInitialData();

// --- REAL APIS ---

// 1. Send Real SMS OTP via Fast2SMS
app.post('/api/send-otp', async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone || phone.length < 10) {
            return res.status(400).json({ success: false, message: 'Valid 10-digit mobile number daalein!' });
        }

        const rider = await Rider.findOne({ phone });
        if (!rider) {
            return res.status(404).json({ success: false, message: 'Yeh number registered nahi hai! Contact Admin.' });
        }

        // Generate 4-digit OTP
        const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
        
        // Save OTP to DB with 5 min expiration
        rider.otp = generatedOtp;
        rider.otpExpires = Date.now() + 5 * 60 * 1000;
        await rider.save();

        // Send REAL SMS if API Key exists, else fallback to log
        if (process.env.FAST2SMS_API_KEY && process.env.FAST2SMS_API_KEY !== 'YOUR_FAST2SMS_API_KEY_HERE') {
            await axios.get('https://www.fast2sms.com/dev/bulkV2', {
                params: {
                    authorization: process.env.FAST2SMS_API_KEY,
                    variables_values: generatedOtp,
                    route: 'otp',
                    numbers: phone
                }
            });
            return res.json({ success: true, message: `OTP aapke mobile number (${phone}) par bhej diya gaya hai!` });
        } else {
            // Development Fallback
            console.log(`📱 [DEV MODE] OTP for ${phone} is: ${generatedOtp}`);
            return res.json({ success: true, message: `DEV MODE: Real API key nahi mili. Console me dekho ya OTP: ${generatedOtp}` });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'SMS bhejne me error aaya.' });
    }
});

// 2. Verify OTP & Fetch Personal Account
app.post('/api/verify-otp', async (req, res) => {
    try {
        const { phone, otp } = req.body;

        const rider = await Rider.findOne({ phone });
        if (!rider) return res.status(400).json({ success: false, message: 'Rider record nahi mila!' });

        if (!rider.otp || rider.otp !== otp || Date.now() > rider.otpExpires) {
            return res.status(400).json({ success: false, message: 'Galat ya expired OTP!' });
        }

        // Clear OTP on successful verification
        rider.otp = null;
        rider.otpExpires = null;
        await rider.save();

        const bike = await Bike.findOne({ id: rider.bikeId });

        res.json({ success: true, rider, bike, message: 'Login successful!' });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error!' });
    }
});

// 3. Pay Rent API (Database Update)
app.post('/api/pay-weekly-rent', async (req, res) => {
    try {
        const { bikeId, amount } = req.body;
        const bike = await Bike.findOne({ id: bikeId });

        if (!bike) return res.status(404).json({ success: false, message: 'Bike nahi mili!' });

        const numAmount = Number(amount);
        bike.weeklyDue = Math.max(0, bike.weeklyDue - numAmount);
        await bike.save();

        res.json({ success: true, message: `₹${numAmount} Rent receive ho gaya! Remaining Due: ₹${bike.weeklyDue}` });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Payment process error!' });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Production Server running on port ${PORT}`));
