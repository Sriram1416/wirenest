import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upiString = "upi://pay?pa=9715058175@pthdfc&pn=WireNest&cu=INR";
const imagesDir = path.join(__dirname, '..', 'images');
const outPath = path.join(imagesDir, 'payment-qr.png');

if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
}

QRCode.toFile(outPath, upiString, {
    width: 350,
    margin: 2,
    color: {
        dark: '#000000',
        light: '#ffffff'
    }
}, function (err) {
    if (err) throw err;
    console.log('✅ QR code successfully generated at ' + outPath);
});
