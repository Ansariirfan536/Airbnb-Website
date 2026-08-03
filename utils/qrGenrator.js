// const QRCode = require('qrcode');

// /**
//  * Generate a unique QR Code as a Base64 Data URL or Buffer
//  * @param {string} bookingId - Unique ID of the booking
//  * @param {string} userId - Unique ID of the user
//  * @returns {Promise<string>} Base64 Data URL of the QR code image
//  */
// const generateUniqueQR = async (bookingId, userId) => {
//     try {
//         // 1. Unique verification URL banayein
//         const uniqueData = `https://yourairbnb.com{bookingId}?user=${userId}`;
        
//         // 2. QR Code options (Custom size aur clear borders ke liye)
//         const options = {
//             errorCorrectionLevel: 'H', // High error correction
//             type: 'image/png',
//             quality: 0.92,
//             margin: 1,
//             width: 200 // Size in pixels
//         };

//         // 3. QR Code ko Base64 string image me convert karein
//         const qrCodeDataUrl = await QRCode.toDataURL(uniqueData, options);
        
//         return qrCodeDataUrl; // Yeh string return karega (e.g., "data:image/png;base64,...")
//     } catch (err) {
//         console.error("QR Code Generation Error:", err);
//         throw new Error("Failed to generate unique QR Code");
//     }
// };

// module.exports = { generateUniqueQR };
