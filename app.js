if(process.env.NODE_ENV !="production"){
  require("dotenv").config();
}


const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate=require("ejs-mate");
const ExpressError=require("./utils/ExpressError.js");
const session=require("express-session");
const mongoStore=require("connect-mongo")
const flash=require("connect-flash");
const passport=require("passport");
const LocalStrategy=require("passport-local");
const User=require("./models/user.js");

const listingRouter=require("./routes/listing.js");
const reviewRouter=require("./routes/review.js");
const userRouter=require("./routes/user.js");
const cartRouter=require("./routes/cart.js");


//const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";
const dbUrl=process.env.ATLASDB_URL;


main()
  .then(() => {
    console.log("connected to DB");
  })
  .catch((err) => {
    console.log(err);
  });

async function main() {
  //await mongoose.connect(MONGO_URL);
  await mongoose.connect(dbUrl);
}

app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"));
app.use(express.urlencoded({extended:true}));
app.use(methodOverride("_method"));
app.engine("ejs",ejsMate);
app.use(express.static(path.join(__dirname,"public")));


const store=mongoStore.create({
  mongoUrl:dbUrl,
  crypto:{
    secret:process.env.SECRET,
  },
  touchAfter:1*3600,
});

store.on("error",()=>{
  console.log("ERROR in Mongo Session Store",err)
})

const sessionOptions={
  store,
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized:true,
  cookie:{
    expires:Date.now()+7*24*60*60*1000,
    maxAge:7*24*60*60*1000,
    httpOnly:true
  }
};

// app.get("/", (req, res) => {
//   res.send("Hi, I am root");
// });

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));


passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req,res,next)=>{
  res.locals.success=req.flash("success");
  res.locals.error=req.flash("error");
  res.locals.currUser=req.user;
  // Sync session cart with persistent user cart when logged in
  (async function syncCart(){
    try{
      if(req.user){
        const sessionCart = req.session.cart || [];
        const userCart = (req.user.cart && Array.isArray(req.user.cart)) ? req.user.cart : [];
        // merge sessionCart and userCart by id, summing qtys
        const map = new Map();
        sessionCart.concat(userCart).forEach(item => {
          if(!item || !item.id) return;
          const existing = map.get(item.id);
          const qty = item.qty ? Number(item.qty) : 1;
          if(existing){
            existing.qty = (existing.qty || 0) + qty;
          } else {
            map.set(item.id, { id: item.id, title: item.title, price: item.price, image: item.image, qty });
          }
        });
        const merged = Array.from(map.values());
        // update session
        req.session.cart = merged;
        res.locals.cartCount = merged.length;
        res.locals.cart = merged;
        // persist to user if different
        const userCartJson = JSON.stringify(userCart || []);
        const mergedJson = JSON.stringify(merged || []);
        if(mergedJson !== userCartJson){
          const updated = await User.findByIdAndUpdate(req.user._id, { cart: merged }, { new: true });
          // update req.user reference
          req.user = updated;
        }
      } else {
        res.locals.cart = req.session.cart || [];
        res.locals.cartCount = (req.session && req.session.cart) ? req.session.cart.length : 0;
      }
      next();
    }catch(e){
      next(e);
    }
  })();
});


///////////Demo 
// app.get("/demouser",async(req,res)=>{
//   let fakeUser=new User({
//     email:"student@gmail.com",
//     username:"student",
//     age:18
//   });
//  let registerdUser=await User.register(fakeUser,"irfan");
//  res.send(registerdUser);
// })


  app.use("/listings", listingRouter);
  app.use("/listings/:id/reviews",reviewRouter);
  // Mount cart before the catch-all user router so /cart routes are reachable
  app.use("/cart", cartRouter);
  app.use("/",userRouter);


  
app.all("*",(req,res,next)=>{
  next(new ExpressError(404,"Page Not Found!"));
});

    
app.use((err,req,res,next)=>{
 let {statusCode=500, message ="Something went wrong!!"}=err;
//res.status(statusCode).send(message);
res.status(statusCode).render("error.ejs",{message});
});


    app.listen(8080, () => {
      console.log("server is listening to port 8080");
    });