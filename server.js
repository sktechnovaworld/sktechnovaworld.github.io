const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

app.use(express.static(path.join(__dirname, 'public')));

// Database Structures
let bikes = [
    { id: 'EV-101', model: 'Speed-X Teal', status: 'Available', rider: null, weeklyRent: 1200, weeklyDue: 0 },
    { id: 'EV-102', model: 'Urban Red', status: 'Available', rider: null, weeklyRent: 1200, weeklyDue: 0 },
    { id: 'EV-103', model: 'Speed-X Teal', status: 'Rented', rider: 'Suresh Kumar', weeklyRent: 1200, weeklyDue: 1200 }
];

let riders = [
    { 
        id: 1, 
        name: 'Suresh Kumar', 
        phone: '9876543210', 
        emergency: '9123456789', 
        aadhaar: '[Aadhaar Redacted]', 
        dl: 'MH-03-2022-009', 
        platform: 'Blinkit', 
        bikeId: 'EV-103' 
    }
];

// --- APIs ---

// 1. Get All Bikes and Onboarded Riders Data
app.get('/api/bikes', (req, res) => {
    res.json({ success: true, bikes, riders });
});

// 2. Rider Onboarding & Bike Allocation (KYC + Issue)
app.post('/api/register-rider', (req, res) => {
    const { name, phone, emergency, aadhaar, dl, platform, bikeId } = req.body;

    const bike = bikes.find(b => b.id === bikeId && b.status === 'Available');
    if (!bike) return res.status(400).json({ success: false, message: 'Yeh bike abhi available nahi hai!' });

    // Update Bike Status
    bike.status = 'Rented';
    bike.rider = name;
    bike.weeklyDue = bike.weeklyRent; // 1 Week advance rent due

    // Save Rider KYC Data
    riders.push({
        id: riders.length + 1,
        name,
        phone,
        emergency,
        aadhaar,
        dl,
        platform,
        bikeId
    });

    res.json({ success: true, message: `Rider ${name} onboarded! Bike ${bikeId} successfully issue ho gayi.` });
});

// 3. Weekly Rent Collection
app.post('/api/pay-weekly-rent', (req, res) => {
    const { bikeId, amount } = req.body;
    const bike = bikes.find(b => b.id === bikeId && b.status === 'Rented');

    if (!bike) return res.status(400).json({ success: false, message: 'Rented bike select karein!' });

    const numAmount = Number(amount);
    bike.weeklyDue = Math.max(0, bike.weeklyDue - numAmount);

    res.json({ success: true, message: `₹${numAmount} Rent receive ho gaya! Remaining Due: ₹${bike.weeklyDue}` });
});

// 4. Return Bike
app.post('/api/return-bike', (req, res) => {
    const { bikeId } = req.body;
    const bike = bikes.find(b => b.id === bikeId);

    if (bike) {
        bike.status = 'Available';
        bike.rider = null;
        bike.weeklyDue = 0;

        // Rider Record me bike clear karna
        const rider = riders.find(r => r.bikeId === bikeId);
        if (rider) rider.bikeId = 'Returned';

        return res.json({ success: true, message: `Bike ${bikeId} successfully return kar li gayi hai.` });
    }
    res.status(400).json({ success: false, message: 'Bike error' });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 App working on http://localhost:${PORT}`));
