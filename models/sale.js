const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const saleSchema = new Schema({
    listing: {
        type: Schema.Types.ObjectId,
        ref: "Listing",
        required: true,
        unique: true // Ek listing par ek hi active sale config rahegi
    },
    discountType: {
        type: String,
        enum: ["percentage", "flat"],
        required: true
    },
    discountValue: {
        type: Number,
        required: true
    },
    saleStartDateTime: {
        type: Date,
        required: true
    },
    saleDurationHours: {
        type: Number,
        required: true
    }
});

const Sale = mongoose.model("Sale", saleSchema);
module.exports = Sale;