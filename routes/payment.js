const express = require("express");
const router = express.Router();
const Razorpay = require("razorpay");

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_SECRET_KEY,
});

router.post("/create-order", async (req, res) => {
    try {
        const options = {
            amount: req.body.price * 100, // Dinamic price from frontend
            currency: "INR",
        };
        const order = await razorpay.orders.create(options);
        res.json(order);
    } catch (err) {
        res.status(500).send(err);
    }
});



router.post("/verify-payment", (req, res) => {
    const crypto = require("crypto");
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


router.post("/send-confirmation", async (req, res) => {
    const transporter = req.app.get('transporter'); // Jo tumne app.js mein set kiya tha
    
    const mailOptions = {
        from: '"Wanderlust Support" <your-email@gmail.com>',
        to: req.user.email, // User ki email
        subject: "Booking Confirmed! 🎉",
        text: "Namaste Irfan! Tumhari booking confirm ho gayi hai. Wanderlust ke saath safar ka anand lein.",
        html: "<h1>Booking Confirmed!</h1><p>Namaste, tumhari heritage stay ki booking confirm ho gayi hai.</p>"
    };

    try {
        await transporter.sendMail(mailOptions);
        res.json({ message: "Email sent successfully!" });
    } catch (error) {
        res.status(500).json({ error: "Email sending failed" });
    }
});

module.exports = router;

