// generate_qr.js
const QRCode = require("qrcode");
const { students } = require("./students.js");
const fs = require("fs");

// Create folder if not exists
if (!fs.existsSync("qrcodes")) {
  fs.mkdirSync("qrcodes");
}

// Loop through students and generate QR
students.forEach((student) => {
  const qrData = JSON.stringify(student); // info inside QR
  const filePath = `qrcodes/${student.studentId}.png`;

  QRCode.toFile(filePath, qrData, { width: 300 }, (err) => {
    if (err) console.error("❌ Error generating QR:", err);
    else console.log(`✅ QR code saved: ${filePath}`);
  });
});
