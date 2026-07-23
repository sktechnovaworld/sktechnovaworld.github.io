const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

app.use(express.static(path.join(__dirname, 'public')));

// Database (Bikes & Registered Riders)
let bikes = [
    { id: 'EV-101', model: 'Speed-X Teal', status: 'Rented', rider: 'Sachin', weeklyRent: 1200, weeklyDue: 1200 },
    { id: 'EV-102', model: 'Urban Red', status: 'Available', rider: null, weeklyRent: 1200, weeklyDue: 0 }
];

let riders = [
    { 
        id: 1, 
        name: 'Sachin', 
        phone: '9876543210', 
        emergency: '9123456789', 
        aadhaar: '[Aadhaar Redacted]', 
        dl: 'MH-03-2022-009', 
        platform: 'Blinkit', 
        bikeId: 'EV-101' 
    }
];

// OTP Store (Testing Purpose)
let generatedOTPs = {};

// --- OTP & LOGIN APIS ---

// 1. Send OTP
app.post('/api/send-otp', (req, res) => {
    const { phone } = req.body;
    
    // Check if number exists in Database
    const rider = riders.find(r => r.phone === phone);
    if (!rider) {
        return res.status(400).json({ success: false, message: 'Yeh mobile number registered nahi hai! Admin se contact karein.' });
    }

    // Fixed Test OTP: 1234 (Production me MSG91 / Fast2SMS API se Real SMS bhej sakte ho)
    generatedOTPs[phone] = '1234';
    res.json({ success: true, message: 'OTP bhej diya gaya hai! (Test OTP: 1234)' });
});

// 2. Verify OTP & Open Account
app.post('/api/verify-otp', (req, res) => {
    const { phone, otp } = req.body;

    if (generatedOTPs[phone] && generatedOTPs[phone] === otp) {
        const rider = riders.find(r => r.phone === phone);
        const bike = bikes.find(b => b.id === rider.bikeId);
        
        delete generatedOTPs[phone]; // Clear OTP after success
        return res.json({ success: true, rider, bike, message: 'Login Successful!' });
    }

    res.status(400).json({ success: false, message: 'Galat OTP! Kripya 1234 daalein.' });
});

// 3. Weekly Rent Collection
app.post('/api/pay-weekly-rent', (req, res) => {
    const { bikeId, amount } = req.body;
    const bike = bikes.find(b => b.id === bikeId);

    if (!bike) return res.status(400).json({ success: false, message: 'Bike error' });

    const numAmount = Number(amount);
    bike.weeklyDue = Math.max(0, bike.weeklyDue - numAmount);

    res.json({ success: true, message: `₹${numAmount} Rent Payment Successful!` });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Mobile Login App running on http://localhost:${PORT}`));
