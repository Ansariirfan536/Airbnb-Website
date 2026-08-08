const express = require("express");
const router = express.Router();
const Razorpay = require("razorpay");
const crypto = require("crypto");
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const Listing = require("../models/listing"); // Core Model Schema Import

// Razorpay Instance Setup
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_SECRET_KEY,
});

// PASSPORT STRICT AUTHENTICATION LAYER
const isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) { 
        return res.status(401).json({ 
            status: "unauthorized",
            message: "Please login first to make a payment or booking." 
        });
    }
    next(); 
};

// 1. Order Create Route (PROTECTED WITH BACKEND SECURITY PATCH)
router.post("/create-order", isLoggedIn, async (req, res) => {
    try {
        // Frontend fetch se aane wala incoming structured data layout
        const { listingId, checkIn, checkOut, amount } = req.body;

        // I. Database entry tracking framework
        const listing = await Listing.findById(listingId);
        if (!listing) {
            return res.status(404).json({ success: false, message: "Listing document not found." });
        }

        // II. Night evaluation matrix calculation
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        const timeDiff = checkOutDate.getTime() - checkInDate.getTime();
        const totalNights = Math.ceil(timeDiff / (1000 * 3600 * 24));

        if (totalNights <= 0) {
            return res.status(400).json({ success: false, message: "Invalid reservation dates range configuration." });
        }

        // III. SERVER TIME WINDOW VALIDATOR (Matching your current timing setups)
        const saleStartDateTime = "2026-08-08T17:53:00"; 
        const saleDurationHours = 10;                     
        const startTime = new Date(saleStartDateTime).getTime();
        const targetEndTime = startTime + (saleDurationHours * 60 * 60 * 1000);
        const now = Date.now();

        let basePricePerDay = listing.price;

        // Check if item qualifies for database model embedded schema discounts matrix
        if (now >= startTime && now <= targetEndTime && listing.discountType && listing.discountType !== "none" && listing.discountValue > 0) {
            let savings = 0;
            if (listing.discountType === "percentage") {
                savings = listing.price * (listing.discountValue / 100);
            } else if (listing.discountType === "flat") {
                savings = listing.discountValue;
            }
            basePricePerDay = Math.max(0, listing.price - savings);
        }

        const serverCalculatedTotal = basePricePerDay * totalNights;

        // IV. ANTI-CHEAT ANTI-MANIPULATION SECURITY AUDIT FILTER
        if (Math.abs(serverCalculatedTotal - amount) > 1) { // 1 Rs float padding range
            return res.status(403).json({ 
                success: false, 
                message: "Security Protection Warning: Frontend amount tamper breach attempt detected!" 
            });
        }

        // V. Verification Pass: Initializing Razorpay transaction setup securely
        const options = { 
            amount: Math.round(serverCalculatedTotal * 100), // Convert to paisa format correctly
            currency: "INR" 
        };
        
        const order = await razorpay.orders.create(options);
        res.json(order);

    } catch (err) { 
        res.status(500).json({ success: false, error: err.message }); 
    }
});

// 2. Payment Verify Route 
router.post("/verify-payment", (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const shasum = crypto.createHmac("sha256", process.env.RAZORPAY_SECRET_KEY);
    shasum.update(razorpay_order_id + "|" + razorpay_payment_id);
    const digest = shasum.digest("hex");

    if (digest === razorpay_signature) {
        res.json({ status: "success" });
    } else {
        res.status(400).json({ status: "failure" });
    }
});

// 3. Unified Booking Confirmation Route (PROTECTED)
router.post("/send-confirmation", isLoggedIn, async (req, res) => {
 
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!req.user.email || !emailRegex.test(req.user.email)) {
        console.log(`[Validation Failed] Invalid email format blocked: ${req.user.email}`);
        return res.status(400).json({ error: "Invalid email format! Mail was not sent." });
    }

    const { checkIn, checkOut, paymentId, listingTitle, listingLocation } = req.body;
    const transporter = req.app.get('transporter');

    let qrBuffer;
    try {
        const uniqueData = `https://vercel.app{paymentId}&user=${req.user.username}`;

        qrBuffer = await QRCode.toBuffer(uniqueData, {
            errorCorrectionLevel: 'H',
            margin: 1,
            width: 120
        });
    } catch (qrError) {
        console.error("QR Generation failed:", qrError);
        return res.status(500).json({ error: "QR Code generation failed" });
    }

    const doc = new PDFDocument({ 
        margin: 50,
        bufferPages: true 
    });
    
    let buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', async () => {
        let pdfData = Buffer.concat(buffers);
        
        try {
            if (!transporter) {
                return res.status(500).json({ error: "Email transporter not configured on server." });
            }

            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: req.user.email,
                subject: "Booking Confirmed! 🎉",
                text: "Namaste! Your heritage stay booking is confirmed. Attached is your professional PDF receipt.",
                attachments: [{ 
                    filename: 'booking.pdf', 
                    content: pdfData,
                    contentType: 'application/pdf'
                }]
            });
            res.json({ success: true });
        } catch (error) {
            console.error("Nodemailer Delivery Error Logged:", error.message);
            res.status(550).json({ error: "Mail delivery failed. Please check if the email address exists." });
        }
    });

    // Professional PDF Design Layout Pipeline
    doc.fillColor('#333').fontSize(25).text('Wanderlust Booking Confirmation', { align: 'center' });
    doc.moveDown();
    doc.lineWidth(2).strokeColor('#d4af37').moveTo(50, 100).lineTo(560, 100).stroke();
    doc.moveDown();

    doc.fontSize(14).fillColor('#000');
    doc.text(`User Name: ${req.user.username}`);
    doc.text(`Booking Date: ${new Date().toLocaleDateString()}`);
    doc.moveDown();
    
    doc.fontSize(16).fillColor('#d4af37').text('Listing Details:');
    doc.fontSize(14).fillColor('#000')
       .text(`Stay Name: ${listingTitle}`)
       .text(`Location: ${listingLocation}`);
    
    doc.moveDown();
    doc.fontSize(16).fillColor('#d4af37').text('Payment & Booking Info:');
    doc.fontSize(14).fillColor('#000')
       .text(`Payment ID: ${paymentId}`)
       .text(`Check-in: ${checkIn}`)
       .text(`Check-out: ${checkOut}`);

    // QR Code Layout Insertion Matrix
    doc.moveDown(1.5);
    doc.fontSize(12).fillColor('#333').text('Scan to Verify Booking:', { align: 'center' });
    doc.moveDown(0.5);
    
    doc.image(qrBuffer, {
        fit:[120,120],
        align: 'center'
    });

    doc.moveDown(2);
    doc.fontSize(10).fillColor('#888').text('Thank you for choosing Wanderlust. Enjoy your stay!', { align: 'center' });
    
    doc.end(); 
});

module.exports = router;
