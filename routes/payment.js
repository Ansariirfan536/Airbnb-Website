const express = require("express");
const router = express.Router();
const Razorpay = require("razorpay");
const crypto = require("crypto");
const PDFDocument = require('pdfkit');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_SECRET_KEY,
});

// 1. Order Create
router.post("/create-order", async (req, res) => {
    try {
        const options = { amount: req.body.price * 100, currency: "INR" };
        const order = await razorpay.orders.create(options);
        res.json(order);
    } catch (err) { res.status(500).send(err); }
});

// 2. Payment Verify
router.post("/verify-payment", (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const shasum = crypto.createHmac("sha256", process.env.RAZORPAY_SECRET_KEY);
    shasum.update(razorpay_order_id + "|" + razorpay_payment_id);
    const digest = shasum.digest("hex");

    if (digest === razorpay_signature) res.json({ status: "success" });
    else res.status(400).json({ status: "failure" });
});

// 3. Unified Booking Confirmation Route (Professional PDF + Email)
router.post("/send-confirmation", async (req, res) => {
    if (!req.user || !req.user.email) {
        return res.status(400).json({ error: "User session lost! Login again." });
    }

    const { checkIn, checkOut, paymentId, listingTitle, listingLocation } = req.body;
    const transporter = req.app.get('transporter');

    // PDF ko memory mein banayenge
    const doc = new PDFDocument({ margin: 50 });
    let buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', async () => {
        let pdfData = Buffer.concat(buffers);
        
        try {
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
            console.error("Email Error:", error);
            res.status(500).json({ error: "Email failed: " + error.message });
        }
    });

    // Professional PDF Design
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

    doc.moveDown(2);
    doc.fontSize(10).fillColor('#888').text('Thank you for choosing Wanderlust. Enjoy your stay!', { align: 'center' });
    
    doc.end(); 
});

module.exports = router;