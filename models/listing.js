
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Review = require("./review.js");
 

const listingSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  description: String,
image:{
  url: String,
  filename: String,
},
  price:Number,
  location: String,
  country: String,
  reviews:[
    {
      type:Schema.Types.ObjectId,
      ref:"Review",
    }
  ],
  owner:{
    type: Schema.Types.ObjectId,
    ref:"User",
  },
  

   status: {
    type: String,
    enum: ["active", "sold", "expired"],
    default: "active"
  },
  expiresAt: {
    type: Date,
    default: () => Date.now() + 30*24*60*60*1000 // 30 days validity
  }


});

listingSchema.post("findOneAndDelete",async(listing)=>{
  if(listing){
    await Review.deleteMany({_id: {$in: listing.reviews}});
  }
});

const Listing = mongoose.model("Listing", listingSchema);
module.exports = Listing;