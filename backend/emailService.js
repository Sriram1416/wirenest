import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const ADMIN_EMAIL = process.env.GMAIL_USER || 'wirenestteam@gmail.com';

// Create transporter with explicit settings for better reliability
function createTransporter() {
    const pass = process.env.GMAIL_PASS;
    const user = process.env.GMAIL_USER || 'wirenestteam@gmail.com';
    
    if (!pass) {
        console.error('❌ EMAIL CONFIG ERROR: GMAIL_PASS env var is not set!');
        return null;
    }

    // Using explicit host/port instead of "service: gmail" for more control
    return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // Use STARTTLS
        auth: {
            user: user,
            pass: pass
        },
        tls: {
            // Do not fail on invalid certs
            rejectUnauthorized: false
        }
    });
}

const commonStyles = `
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    line-height: 1.6;
    color: #1f2937;
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
    background-color: #ffffff;
    border-radius: 12px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
`;

const buttonStyle = `
    display: inline-block;
    background-color: #3b82f6;
    color: #ffffff;
    padding: 12px 24px;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 600;
    margin: 20px 0;
`;

/**
 * Admin Notification Email
 */
export async function sendAdminNewOrderEmail(orderId, totalAmount, customerEmail, receiptUrl, orderItems = [], customerAddress = null) {
    const transporter = createTransporter();
    if (!transporter) return;

    const frontendUrl = process.env.FRONTEND_URL || 'https://wirenest.vercel.app';
    
    console.log(`📧 Starting to send Admin Email for Order: ${orderId}...`);
    let itemsHtml = orderItems.map(item => {
        const imgSrc = item.image ? (item.image.startsWith('http') ? item.image : `${frontendUrl}/${item.image}`) : '';
        return `
            <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
                    ${imgSrc ? `<img src="${imgSrc}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px; margin-right: 12px; vertical-align: middle;">` : ''}
                    <span style="font-weight: 600;">${item.name || 'Product'}</span>
                </td>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity || 1}</td>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${item.price || 0}</td>
            </tr>
        `;
    }).join('');

    const mailOptions = {
        from: `WireNest System <${ADMIN_EMAIL}>`,
        to: ADMIN_EMAIL,
        subject: `🚨 New Order Action Required: #${orderId.substring(0, 8)}`,
        html: `
            <div style="${commonStyles}">
                <h2 style="color: #111827; margin-top: 0;">New Order Received!</h2>
                <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
                    <p style="margin: 4px 0;"><strong>Order ID:</strong> #${orderId.substring(0, 8)}</p>
                    <p style="margin: 4px 0;"><strong>Total Value:</strong> <span style="color: #059669; font-size: 1.25rem; font-weight: 700;">₹${totalAmount}</span></p>
                </div>

                <div style="margin-bottom: 24px;">
                    <h3 style="font-size: 1.1rem; border-bottom: 2px solid #3b82f6; padding-bottom: 8px; color: #3b82f6;">Customer Details</h3>
                    <p style="margin: 4px 0;"><strong>Name:</strong> ${customerAddress?.name || 'N/A'}</p>
                    <p style="margin: 4px 0;"><strong>Email:</strong> ${customerAddress?.email || customerEmail}</p>
                    <p style="margin: 4px 0;"><strong>Phone:</strong> ${customerAddress?.mobile || 'N/A'}</p>
                    <p style="margin: 4px 0;"><strong>Address:</strong> ${customerAddress?.address}, ${customerAddress?.city} - ${customerAddress?.pincode}</p>
                </div>

                <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                    <thead style="background-color: #f3f4f6;">
                        <tr>
                            <th style="padding: 12px; text-align: left;">Product</th>
                            <th style="padding: 12px; text-align: center;">Qty</th>
                            <th style="padding: 12px; text-align: right;">Price</th>
                        </tr>
                    </thead>
                    <tbody>${itemsHtml}</tbody>
                </table>

                ${receiptUrl ? `
                    <div style="margin-top: 24px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; text-align: center;">
                        <p style="margin-top: 0; font-weight: 600; text-align: left;">Payment Receipt:</p>
                        <a href="${receiptUrl}" target="_blank">
                            <img src="${receiptUrl}" style="max-width: 100%; border-radius: 8px; border: 1px solid #e5e7eb;">
                        </a>
                    </div>
                ` : ''}

                <div style="text-align: center; border-top: 1px solid #e5e7eb; margin-top: 32px; padding-top: 24px;">
                    <a href="${frontendUrl}/admin/admin.html" style="${buttonStyle}">Open Admin Dashboard</a>
                    <p style="font-size: 0.875rem; color: #6b7280; margin-top: 16px;">Review the payment and update the status to notify the customer.</p>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Admin email sent for order ${orderId}`);
    } catch (err) {
        console.error("❌ Admin Email Failed:", err.message);
    }
}

/**
 * 1. Customer Payment Confirmation (Status: processing)
 */
export async function sendCustomerApprovalEmail(customerEmail, orderId, totalAmount) {
    const transporter = createTransporter();
    if (!transporter || !customerEmail) return;

    const mailOptions = {
        from: `WireNest Support <${ADMIN_EMAIL}>`,
        to: customerEmail,
        subject: `✅ Payment Confirmed! Order #${orderId.substring(0, 8)}`,
        html: `
            <div style="${commonStyles}; text-align: center;">
                <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
                <h1 style="color: #059669; margin-top: 0;">Payment Approved!</h1>
                <p style="font-size: 1.1rem; color: #4b5563;">Hello! We've received your payment for order <strong>#${orderId.substring(0, 8)}</strong>.</p>
                <div style="background-color: #ecfdf5; padding: 20px; border-radius: 12px; margin: 24px 0;">
                    <p style="margin: 0; color: #065f46; font-size: 1.25rem; font-weight: 700;">Total: ₹${totalAmount}</p>
                </div>
                <p>Your order is now being processed and will be shipped soon.</p>
                <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 0.875rem;">
                    Thank you for choosing WireNest!
                </div>
            </div>
        `
    };
    try { await transporter.sendMail(mailOptions); } catch (e) { console.error(e); }
}

/**
 * 2. Customer Shipped Notification (Status: shipped)
 */
export async function sendCustomerShippedEmail(customerEmail, orderId) {
    const transporter = createTransporter();
    if (!transporter || !customerEmail) return;

    const mailOptions = {
        from: `WireNest Support <${ADMIN_EMAIL}>`,
        to: customerEmail,
        subject: `🚚 Your Order has Shipped! #${orderId.substring(0, 8)}`,
        html: `
            <div style="${commonStyles}; text-align: center;">
                <div style="font-size: 48px; margin-bottom: 16px;">🚚</div>
                <h1 style="color: #2563eb; margin-top: 0;">On the Way!</h1>
                <p style="font-size: 1.1rem; color: #4b5563;">Great news! Your order <strong>#${orderId.substring(0, 8)}</strong> has been shipped.</p>
                <div style="margin: 32px 0;">
                    <img src="https://cdn-icons-png.flaticon.com/512/2769/2769339.png" style="width: 120px; opacity: 0.9;">
                </div>
                <p>It's traveling to your destination as we speak. We'll let you know once it arrives!</p>
                <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 0.875rem;">
                    Thank you for shopping with us!
                </div>
            </div>
        `
    };
    try { await transporter.sendMail(mailOptions); } catch (e) { console.error(e); }
}

/**
 * 3. Customer Delivered Notification (Status: delivered)
 */
export async function sendCustomerDeliveredEmail(customerEmail, orderId) {
    const transporter = createTransporter();
    if (!transporter || !customerEmail) return;

    const mailOptions = {
        from: `WireNest Support <${ADMIN_EMAIL}>`,
        to: customerEmail,
        subject: `📦 Order Delivered! #${orderId.substring(0, 8)}`,
        html: `
            <div style="${commonStyles}; text-align: center;">
                <div style="font-size: 48px; margin-bottom: 16px;">🎁</div>
                <h1 style="color: #059669; margin-top: 0;">Delivered!</h1>
                <p style="font-size: 1.1rem; color: #4b5563;">Your order <strong>#${orderId.substring(0, 8)}</strong> has been successfully delivered.</p>
                <div style="margin: 32px 0;">
                    <img src="https://cdn-icons-png.flaticon.com/512/1008/1008010.png" style="width: 120px;">
                </div>
                <p>We hope you love your new products! If you have any questions, feel free to reply to this email.</p>
                <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 0.875rem;">
                    WireNest - Crafting Quality.
                </div>
            </div>
        `
    };
    try { await transporter.sendMail(mailOptions); } catch (e) { console.error(e); }
}
