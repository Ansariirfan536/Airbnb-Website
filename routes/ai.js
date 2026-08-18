const express = require("express");
const router = express.Router();
const Listing = require("../models/listing.js");

router.post("/api/gemini-chat", async (req, res) => {
    try {
        const { queryText } = req.body;
        const lowerQuery = queryText.toLowerCase().trim();

        // Smart Language Detection: Check if query is primarily English
        const isEnglish = /^[a-zA-Z0-9\s,.:?'-]+$/.test(queryText);

        const allListings = await Listing.find({});
        
        if (!allListings || allListings.length === 0) {
            const msg = isEnglish ? "Sorry friend, there are no properties available in the database right now!" : "Arre dost, abhi database mein koi properties available nahi hain!";
            return res.json({ response: msg });
        }

        let aiReply = "";

        // Greetings
        if (["hi", "hello", "hey", "namaste", "how are you", "what's up", "kaise ho", "kya haal hai"].some(word => lowerQuery === word || lowerQuery.startsWith(word))) {
            if (isEnglish) {
                aiReply = `Hello your ai asssistent @Irfan❤️! Everything is great, my friend. Welcome to Wanderlust Heritage Stays! Feel free to ask about any property, location, or price.`;
            } else {
                aiReply = `Namaste mai Irfan ai ❤️! Sab badhiya hai dost. Bataiye Wanderlust par aaj kaun si behtareen stay explore karni hai?`;
            }
        }
        // Best / Cheapest
        else if (lowerQuery.includes("best") || lowerQuery.includes("sasta") || lowerQuery.includes("cheapest") || lowerQuery.includes("good")) {
            let cheapest = allListings.reduce((prev, curr) => (prev.price < curr.price) ? prev : curr);
            if (isEnglish) {
                aiReply = `Looking at value and budget, <b>${cheapest.title}</b> is our best and most affordable stay, priced at just ₹${(cheapest.price || 0).toLocaleString("en-IN")} in ${cheapest.location}, ${cheapest.country}! 🌟<br><br><a href="/listings/${cheapest._id}" target="_blank" style="color:#d4af37; font-weight:bold; text-decoration:underline;">View Property Details</a>`;
            } else {
                aiReply = `Dekhiye dost, hamare paas <b>${cheapest.title}</b> sabse sasti aur behtareen deal hai, jo sirf ₹${(cheapest.price || 0).toLocaleString("en-IN")} mein ${cheapest.location} mein milti hai! 🌟<br><br><a href="/listings/${cheapest._id}" target="_blank" style="color:#d4af37; font-weight:bold; text-decoration:underline;">View Property Details</a>`;
            }
        }
        // Highest / Expensive
        else if (lowerQuery.includes("high") || lowerQuery.includes("expensive") || lowerQuery.includes("mehnga") || lowerQuery.includes("maximum")) {
            let highest = allListings.reduce((prev, curr) => (prev.price > curr.price) ? prev : curr);
            if (isEnglish) {
                aiReply = `For a royal and luxury experience, our most premium property is <b>${highest.title}</b> located in ${highest.location}, priced at ₹${(highest.price || 0).toLocaleString("en-IN")}! ✨<br><br><a href="/listings/${highest._id}" target="_blank" style="color:#d4af37; font-weight:bold; text-decoration:underline;">View Property Details</a>`;
            } else {
                aiReply = `Agar royal aur luxury stay ki baat karein, toh hamari sabse premium property <b>${highest.title}</b> hai, jo ${highest.location} mein hai aur iska price ₹${(highest.price || 0).toLocaleString("en-IN")} hai! ✨<br><br><a href="/listings/${highest._id}" target="_blank" style="color:#d4af37; font-weight:bold; text-decoration:underline;">View Property Details</a>`;
            }
        }
        // Specific Property Search & Intelligent Recommendation Fallback
        else {
            let matchedItem = allListings.find(item => {
                const titleLower = item.title.toLowerCase();
                const locLower = (item.location || "").toLowerCase();
                const queryWords = lowerQuery.split(" ");
                return queryWords.some(word => word.length > 2 && (titleLower.includes(word) || locLower.includes(word)));
            });

            if (matchedItem) {
                if (isEnglish) {
                    aiReply = `Found it! <b>${matchedItem.title}</b> in ${matchedItem.location}, ${matchedItem.country} is a top-tier stay.<br><br>💰 <b>Price:</b> ₹${(matchedItem.price || 0).toLocaleString("en-IN")}<br><br><a href="/listings/${matchedItem._id}" target="_blank" style="color:#d4af37; font-weight:bold; text-decoration:underline;">View Property Details</a>`;
                } else {
                    aiReply = `Haan dost! Maine check kiya, <b>${matchedItem.title}</b> (${matchedItem.location}, ${matchedItem.country}) ekdum top-tier stay hai.<br><br>💰 <b>Price:</b> ₹${(matchedItem.price || 0).toLocaleString("en-IN")}<br><br><a href="/listings/${matchedItem._id}" target="_blank" style="color:#d4af37; font-weight:bold; text-decoration:underline;">View Property Details</a>`;
                }
            } else {
                // Smart Recommendation Fallback (AI automatically suggests a great property instead of failing)
                let randomPick = allListings[Math.floor(Math.random() * allListings.length)];
                
                if (isEnglish) {
                    aiReply = `That sounds like a wonderful plan! While I couldn't search that exact phrase, I personally recommend checking out <b>${randomPick.title}</b> in ${randomPick.location} for ₹${(randomPick.price || 0).toLocaleString("en-IN")}. It's a marvelous stay! ✨<br><br><a href="/listings/${randomPick._id}" target="_blank" style="color:#d4af37; font-weight:bold; text-decoration:underline;">View Property Details</a>`;
                } else {
                    aiReply = `Wah, kya badhiya choice hai! Halanki exact match nahi mila, lekin main personally suggest karunga ki aap <b>${randomPick.title}</b> (${randomPick.location}) zaroor dekhein—sirf ₹${(randomPick.price || 0).toLocaleString("en-IN")} mein ekdum mast property hai! ✨<br><br><a href="/listings/${randomPick._id}" target="_blank" style="color:#d4af37; font-weight:bold; text-decoration:underline;">View Property Details</a>`;
                }
            }
        }

        res.json({ response: aiReply });

    } catch (error) {
        console.error("Smart AI Error:", error);
        res.status(500).json({ error: "Failed to process request." });
    }
});

module.exports = router;