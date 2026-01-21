const mongoose=require("mongoose");
const Schema=mongoose.Schema;
const passportLocalMongoose=require("passport-local-mongoose");

const userSchema=new Schema({
        email:{
                type:String,
                required:true,
        },
        cart: [
            {
                id: String,
                title: String,
                price: Number,
                image: String,
                qty: {
                    type: Number,
                    default: 1
                }
            }
        ]
});

userSchema.plugin(passportLocalMongoose);
module.exports=mongoose.model("User",userSchema);