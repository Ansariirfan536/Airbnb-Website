const express = require('express');
const router = express.Router();
const Listing = require('../models/listing');
const User = require('../models/user');

// Ensure session cart exists
function ensureCart(req, res, next) {
  if (!req.session.cart) req.session.cart = [];
  next();
}

// Add listing to cart
router.post('/add/:id', ensureCart, async (req, res, next) => {
  try {
    const { id } = req.params;
    const backUrl = req.get('Referrer') || req.get('Referer') || '/listings';
    const listing = await Listing.findById(id);
    if (!listing) {
      req.flash('error', 'Listing not found');
      return res.redirect(backUrl);
    }
    // simple item structure
    const item = {
      id: listing._id.toString(),
      title: listing.title,
      price: listing.price,
      image: listing.image && listing.image.url
    };
    // avoid duplicates
    const exists = req.session.cart.find(i => i.id === item.id);
    if (!exists) req.session.cart.push(item);
    // if user logged in, persist to user document
    if(req.user){
      try{
        // merge into user's cart
        const user = await User.findById(req.user._id);
        const ucart = user.cart || [];
        const map = new Map();
        ucart.concat(req.session.cart).forEach(i=>{
          if(!i || !i.id) return;
          const ex = map.get(i.id);
          const qty = i.qty ? Number(i.qty) : 1;
          if(ex) ex.qty = (ex.qty||0) + qty;
          else map.set(i.id, { id: i.id, title: i.title, price: i.price, image: i.image, qty });
        });
        const merged = Array.from(map.values());
        user.cart = merged;
        await user.save();
        // refresh session cart
        req.session.cart = merged;
      }catch(e){
        console.error('Error saving user cart:', e);
      }
    }
    req.flash('success', 'Added to cart');
    res.redirect(backUrl);
  } catch (e) {
    next(e);
  }
});

// Also accept GET requests to add (fallback for clicks/links)
router.get('/add/:id', ensureCart, async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log('GET /cart/add requested for id=', id);
    const listing = await Listing.findById(id);
    if (!listing) {
      req.flash('error', 'Listing not found');
      return res.redirect('/listings');
    }
    const item = {
      id: listing._id.toString(),
      title: listing.title,
      price: listing.price,
      image: listing.image && listing.image.url
    };
    const exists = req.session.cart.find(i => i.id === item.id);
    if (!exists) req.session.cart.push(item);
    req.flash('success', 'Added to cart');
    const backUrl = req.get('Referrer') || req.get('Referer') || '/listings';
    res.redirect(backUrl);
  } catch (e) {
    next(e);
  }
});

// View cart
router.get('/', ensureCart, (req, res) => {
  const cart = req.session.cart || [];
  res.render('cart', { cart });
});

// Remove from cart
router.post('/remove/:id', ensureCart, (req, res) => {
  const { id } = req.params;
  req.session.cart = (req.session.cart || []).filter(i => i.id !== id);
  // if user logged in, persist removal
  if(req.user){
    User.findById(req.user._id).then(user=>{
      user.cart = (user.cart || []).filter(i => i.id !== id);
      return user.save();
    }).catch(err=>console.error('Error removing item from user cart', err));
  }
  req.flash('success', 'Removed from cart');
  res.redirect('/cart');
});

module.exports = router;
