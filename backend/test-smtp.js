import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

async function testSMTP() {
    console.log("Testing SMTP Connection for:", process.env.GMAIL_USER);

    if (!process.env.GMAIL_PASS) {
        console.error("❌ ERROR: GMAIL_PASS environment variable is missing!");
        return;
    }

    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER || 'wirenestteam@gmail.com',
                pass: process.env.GMAIL_PASS
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        // Test Authentication
        await transporter.verify();
        console.log("✅ SMTP Authentication Successful!");

        // Attempt Send
        console.log("Attempting to send a test ping to", process.env.GMAIL_USER);
        await transporter.sendMail({
            from: `System Debug <${process.env.GMAIL_USER}>`,
            to: process.env.GMAIL_USER,
            subject: '🔍 WireNest SMTP Diagnostic Test',
            text: 'If you are reading this, Node.js is actively authorized to send emails.'
        });

        console.log("✅ Email successfully dispatched via SMTP gateway.");

    } catch (err) {
        console.error("❌ SMTP Failure:");
        console.error(err.message);

        if (err.message.includes('Username and Password not accepted')) {
            console.log("\n⚠️ DIAGNOSTIC: Google blocked the login attempt.");
            console.log("Make sure you are NOT using your normal Gmail password in the .env file.");
            console.log("You MUST generate an 'App Password' from Google Account Settings -> Security -> App Passwords.");
        }
    }
}

testSMTP();
