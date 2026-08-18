require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const session = require("express-session");
const mongoStore = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");
const Sale = require("./models/sale.js"); 
const paymentRouter = require("./routes/payment.js");

// Routes Imports
const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");
const cartRouter = require("./routes/cart.js");
const adminRouter = require("./routes/admin.js");


// AI Router Import from routes folder
const aiRouter = require("./routes/ai.js");

const dbUrl = process.env.ATLASDB_URL;

// Nodemailer Config
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});
app.set('transporter', transporter); 

main().then(() => console.log("Connected to DB")).catch((err) => console.log(err));
async function main() { await mongoose.connect(dbUrl); }

app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

const store = mongoStore.create({ mongoUrl: dbUrl, touchAfter: 24 * 3600 });
app.use(session({
    store,
    secret: process.env.SECRET || "secret",
    resave: false,
    saveUninitialized: false,
    cookie: { expires: Date.now() + 7 * 24 * 60 * 60 * 1000, maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// GLOBAL MIDDLEWARE
app.use(async (req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user || null;
    res.locals.session = req.session; 
    
    try {
        if (req.user) {
            req.session.cart = req.user.cart || [];
        }
        res.locals.cart = req.session.cart || [];
        res.locals.cartCount = res.locals.cart.length;

        const sales = await Sale.find({});
        const salesMap = {};
        
        sales.forEach(sale => {
            if (sale.listing) {
                salesMap[sale.listing.toString()] = {
                    discountType: sale.discountType,
                    discountValue: sale.discountValue,
                    saleStartDateTime: sale.saleStartDateTime,
                    saleDurationHours: sale.saleDurationHours
                };
            }
        });

        res.locals.saleConfig = {
            isActive: Object.keys(salesMap).length > 0,
            listingsSaleConfig: salesMap
        };

        next();
    } catch (err) {
        res.locals.saleConfig = { isActive: false, listingsSaleConfig: {} };
        next();
    }
});

// Root route
app.get("/", (req, res) => {
    res.redirect("/listings"); 
});

// App Routes
app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/cart", cartRouter);
app.use("/", userRouter);
app.use("/payment", paymentRouter);
app.use("/admin", adminRouter); 

// AI Modularized Route Prefix
app.use("/", aiRouter);

app.listen(8080, () => { console.log("Server listening on port 8080"); });