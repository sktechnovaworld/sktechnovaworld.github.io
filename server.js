const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

app.use(express.static(path.join(__dirname, 'public')));

// DATABASE: Bikes & Battery Status
let bikes = [
    { 
        id: 'EV-101', 
        model: 'Speed-X Teal', 
        battery: 88, // Battery %
        status: 'Rented', 
        riderPhone: '7991352092' 
    },
    { 
        id: 'EV-102', 
        model: 'Urban Red', 
        battery: 42, 
        status: 'Available', 
        riderPhone: null 
    }
];

// DATABASE: Riders, KYC Details & Rental Plans
let riders = [
    { 
        name: 'Sachin Kumar', 
        phone: '7991352092', 
        aadhaar: '[Aadhaar Redacted]', 
        pan: 'ABCDE1234F', 
        platform: 'Blinkit',
        bikeId: 'EV-101',
        planName: 'Weekly Super Plan',
        startDate: '2026-07-20',
        endDate: '2026-07-27', // Plan Expiry Date
        weeklyRent: 1200
    }
];

// --- APIs FOR DUKANDAR & RIDER ---

// 1. Get Live Admin Fleet Data (Dukandar Dashboard)
app.get('/api/admin/fleet', (req, res) => {
    // Merge Bike Battery & Rider KYC Data
    const fullData = bikes.map(bike => {
        const rider = riders.find(r => r.bikeId === bike.id);
        
        // Expiry Calculation
        let daysLeft = 0;
        if (rider) {
            const end = new Date(rider.endDate);
            const today = new Date();
            const diffTime = end - today;
            daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        return {
            bikeId: bike.id,
            model: bike.model,
            battery: bike.battery,
            status: bike.status,
            rider: rider ? {
                name: rider.name,
                phone: rider.phone,
                aadhaar: rider.aadhaar,
                pan: rider.pan,
                platform: rider.platform,
                planName: rider.planName,
                endDate: rider.endDate,
                daysLeft: daysLeft > 0 ? daysLeft : 0
            } : null
        };
    });

    res.json({ success: true, fleet: fullData });
});

// 2. Assign New Bike to Rider (Dukandar Form)
app.post('/api/admin/assign-bike', (req, res) => {
    const { name, phone, aadhaar, pan, platform, bikeId, planDays } = req.body;

    const bike = bikes.find(b => b.id === bikeId && b.status === 'Available');
    if (!bike) return res.status(400).json({ success: false, message: 'Yeh bike abhi kisi aur ke paas hai!' });

    // Dates Calculation
    const start = new Date();
    const end = new Date();
    end.setDate(start.getDate() + Number(planDays || 7));

    bike.status = 'Rented';
    bike.riderPhone = phone;

    riders.push({
        name,
        phone,
        aadhaar,
        pan,
        platform,
        bikeId,
        planName: `${planDays} Days Plan`,
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
        weeklyRent: 1200
    });

    res.json({ success: true, message: `Bike ${bikeId} ${name} ko issue kar di gayi hai!` });
});

// 3. Live Rider Login & Battery/Plan Fetch (Rider App API)
app.post('/api/rider/dashboard', (req, res) => {
    const { phone } = req.body;
    const rider = riders.find(r => r.phone === phone);

    if (!rider) {
        return res.status(404).json({ success: false, message: 'Yeh phone number kisi active plan se juda nahi hai.' });
    }

    const bike = bikes.find(b => b.id === rider.bikeId);
    
    // Days Left calculation
    const end = new Date(rider.endDate);
    const today = new Date();
    const diffTime = end - today;
    const daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    res.json({
        success: true,
        rider: {
            name: rider.name,
            phone: rider.phone,
            platform: rider.platform,
            planName: rider.planName,
            endDate: rider.endDate,
            daysLeft: daysLeft
        },
        bike: {
            id: bike.id,
            model: bike.model,
            battery: bike.battery
        }
    });
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Fleet Engine Live on http://localhost:${PORT}`));
