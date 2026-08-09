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
const Sale = require("./models/sale.js"); // 🌟 Database Sale Model Import
const paymentRouter = require("./routes/payment.js");

// Routes
const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");
const cartRouter = require("./routes/cart.js");

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

// GLOBAL MIDDLEWARE (Includes IST Timezone Fixed Sale Config)
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

        // 🌟 Exact India (IST) Current Time for Vercel Serverless Reliability
        const indianTimeStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
        const now = new Date(indianTimeStr).getTime();

        const sales = await Sale.find({});
        const salesMap = {};
        
        sales.forEach(sale => {
            if (sale.saleStartDateTime && sale.saleDurationHours) {
                let startTime = new Date(sale.saleStartDateTime).getTime();
                let targetEndTime = startTime + (Number(sale.saleDurationHours) * 60 * 60 * 1000);

                if (now >= startTime && now <= targetEndTime) {
                    salesMap[sale.listing.toString()] = {
                        discountType: sale.discountType,
                        discountValue: sale.discountValue,
                        saleStartDateTime: sale.saleStartDateTime,
                        saleDurationHours: sale.saleDurationHours
                    };
                }
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

// Root route (Home page)
app.get("/", (req, res) => {
    res.redirect("/listings"); 
});

app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/cart", cartRouter);
app.use("/", userRouter);
app.use("/payment", paymentRouter);

const adminRouter =  require("./routes/admin.js");
app.use("/admin", adminRouter); 

// AI Chat API Route for Portal
app.post("/api/chat", async (req, res) => {
    try {
        const { query, context } = req.body;
        const lowerQuery = query.toLowerCase();
        
        let aiResponseText = `Namaste! i am here : "${query}".`;

        if (context && context.length > 0) {
            if (lowerQuery.includes("mehnga") || lowerQuery.includes("expensive") || lowerQuery.includes("highest")) {
                let mostExpensive = context[0];
                let maxPrice = -1;

                context.forEach(item => {
                    const priceNum = parseFloat(item.price.replace(/[^0-9.]/g, '')) || 0;
                    if (priceNum > maxPrice) {
                        maxPrice = priceNum;
                        mostExpensive = item;
                    }
                });

                aiResponseText = `Most expensive property '${mostExpensive.title}' hai, jiska price ${mostExpensive.price} hai!`;
            } 
            else if (lowerQuery.includes("low price") || lowerQuery.includes("cheapest")) {
                let cheapest = context[0];
                let minPrice = Infinity;

                context.forEach(item => {
                    const priceNum = parseFloat(item.price.replace(/[^0-9.]/g, '')) || 0;
                    if (priceNum > 0 && priceNum < minPrice) {
                        minPrice = priceNum;
                        cheapest = item;
                    }
                });

                aiResponseText = `Sabse sasti property '${cheapest.title}' hai, jiska price ${cheapest.price} hai!`;
            } 
            else {
                aiResponseText = `Aapke paas total ${context.length} options available hain. Aap inmein se kisi ke baare mein bhi pooch sakte hain!`;
            }
        } else {
            aiResponseText = "Filhal koi listing data available nahi hai.";
        }
        
        res.json({ text: aiResponseText });
    } catch (err) {
        console.error(err);
        res.status(500).json({ text: "Server error occurred while processing AI request." });
    }
});

app.listen(8080, () => { console.log("Server listening on port 8080"); });