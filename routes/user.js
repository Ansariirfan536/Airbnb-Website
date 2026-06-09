const express = require("express");
const router = express.Router();
const User = require("../models/user.js");
const wrapAsync = require("../utils/wrapAsync");
const passport = require("passport");
const otpGenerator = require("otp-generator");

// 1. Signup Form Get Route
router.get("/signup", (req, res) => res.render("users/signup.ejs"));

// 2. Signup POST Route: OTP Send & Rate Limiting
router.post("/signup", wrapAsync(async (req, res) => {
    const transporter = req.app.get('transporter');
    const { username, email, password } = req.body;

    // Freeze check (1 minute freeze as per your request)
    if (req.session.frozenUntil && Date.now() < req.session.frozenUntil) {
        req.flash("error", "Too many attempts! Please try again later.");
        return res.redirect("/signup");
    }

    // OTP Count Limit (Max 5)
    req.session.otpCount = (req.session.otpCount || 0) + 1;
    if (req.session.otpCount > 5) {
        req.session.frozenUntil = Date.now() + 10 * 60 * 1000; // 1 Minute freeze
        req.flash("error", "Limit exceeded. Account frozen for 10 minutes.");
        return res.redirect("/signup");
    }

    const otp = otpGenerator.generate(6, { digits: true, upperCaseAlphabets: false, specialChars: false });
    
    // Store data in session
    req.session.otp = otp;
    req.session.otpExpires = Date.now() + 2 * 60 * 1000; // 2 minutes expiry
    req.session.signupData = { username, email, password };

    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Wanderlust Verification",
        text: `Your OTP is: ${otp}. Valid for 2 minutes.`
    });

    req.flash("success", "OTP sent to your email!");
    res.render("users/verify-otp.ejs", { email: email, timeLeft: 120 });
}));

// 3. Verification Route
router.post("/verify", wrapAsync(async (req, res, next) => {
    // Check if session data exists
    if (!req.session.signupData) {
        req.flash("error", "Session expired. Please sign up again.");
        return res.redirect("/signup");
    }

    // Expiration check
    if (Date.now() > req.session.otpExpires) {
        req.flash("error", "OTP Expired! Please request a new one.");
        return res.redirect("/signup");
    }

    // Validation
    if (req.body.otp === req.session.otp) {
        const { username, email, password } = req.session.signupData;
        const newUser = new User({ email, username });
        const registeredUser = await User.register(newUser, password);
        
        req.login(registeredUser, (err) => {
            if (err) return next(err);
            req.flash("success", "Welcome to Wanderlust!");
            
            // Clean up session
            delete req.session.otp;
            delete req.session.signupData;
            delete req.session.otpCount;
            
            res.redirect("/listings");
        });
    } else {
        // Error on same page
        req.flash("error", "Invalid OTP! Try again.");
        
        // Calculate remaining time for timer
        const timeLeft = Math.max(0, Math.floor((req.session.otpExpires - Date.now()) / 1000));
        
        res.render("users/verify-otp.ejs", { 
            email: req.session.signupData.email, 
            timeLeft: timeLeft 
        });
    }
}));

// 4. Login & Logout
router.route("/login")
    .get((req, res) => res.render("users/login.ejs"))
    .post(passport.authenticate("local", { failureRedirect: "/login", failureFlash: true }), (req, res) => res.redirect("/listings"));

router.get("/logout", (req, res) => { req.logout(() => res.redirect("/listings")); });

module.exports = router;