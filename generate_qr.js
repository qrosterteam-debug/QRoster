// generate_qr.js - Original style, fixed for your current students.js and app.js

const QRCode = require("qrcode");
const { students } = require("./students.js");
const fs = require("fs");

// Create folder if not exists
if (!fs.existsSync("qrcodes")) {
  fs.mkdirSync("qrcodes");
  console.log("Created qrcodes folder");
}

// Loop through students and generate QR
students.forEach((student) => {
  const qrData = JSON.stringify(student); // Full student object (studentid, name, section)
  const filePath = `qrcodes/${student.studentid}.png`; // Simple filename using studentid

  QRCode.toFile(filePath, qrData, { width: 500, margin: 4 }, (err) => {
    if (err) console.error(`❌ Error for ${student.studentid}:`, err);
    else console.log(`✅ QR code saved: ${filePath}`);
  });
});

console.log("\nGeneration complete! Check the 'qrcodes' folder.");