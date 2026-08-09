const express = require("express");
const router = express.Router();
const Sale = require("../models/sale");
const Listing = require("../models/listing");

// Middleware to check if user is logged in (optional: yahan aap admin check bhi laga sakte hain)
const isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
        req.flash("error", "You must be logged in to access admin panel!");
        return res.redirect("/login");
    }
    next();
};

// 1. Render Admin Sale Form (GET /admin/sale/new)
router.get("/sale/new", isLoggedIn, async (req, res) => {
    try {
        const allListings = await Listing.find({});
        res.render("admin/new-sale.ejs", { allListings });
    } catch (err) {
        req.flash("error", "Something went wrong.");
        res.redirect("/listings");
    }
});

// 2. Save or Update Sale in Database (POST /admin/sale)
router.post("/sale", isLoggedIn, async (req, res) => {
    try {
        const { listingId, discountType, discountValue, saleStartDateTime, saleDurationHours } = req.body;
        
        // Agar us listing par pehle se koi sale hai toh update ho jayegi, nahi toh nayi ban jayegi (upsert: true)
        await Sale.findOneAndUpdate(
            { listing: listingId },
            { 
                listing: listingId,
                discountType, 
                discountValue, 
                saleStartDateTime, 
                saleDurationHours 
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        req.flash("success", "Sale successfully applied to the listing! 🎉");
        res.redirect("/listings");
    } catch (err) {
        req.flash("error", err.message);
        res.redirect("/listings");
    }
});

module.exports = router;