import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const ADMIN_EMAIL = process.env.GMAIL_USER || 'wirenestteam@gmail.com';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: ADMIN_EMAIL,
        pass: process.env.GMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

/**
 * Sends a notification to the Store Admin when a new order is placed
 */
export async function sendAdminNewOrderEmail(orderId, totalAmount, customerEmail, receiptUrl, orderItems = [], customerAddress = null) {
    if (!process.env.GMAIL_PASS) return;

    const serverUrl = process.env.BACKEND_URL || 'http://localhost:8001';
    const absoluteReceiptUrl = (receiptUrl && !receiptUrl.startsWith('http')) ? `${serverUrl}${receiptUrl}` : receiptUrl;

    let itemsHtml = `
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-family: sans-serif;">
            <thead>
                <tr style="background-color: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                    <th style="padding: 12px; text-align: left;">Product</th>
                    <th style="padding: 12px; text-align: left;">Details</th>
                    <th style="padding: 12px; text-align: center;">Qty</th>
                    <th style="padding: 12px; text-align: right;">Price</th>
                </tr>
            </thead>
            <tbody>
    `;

    for (let item of orderItems) {
        const typeBadge = item.blockType === 'customized' || item.isCustomized ?
            `<span style="background: #e0e7ff; color: #3730a3; padding: 2px 6px; border-radius: 4px; font-size: 11px;">Customized</span>` :
            `<span style="background: #f1f5f9; color: #475569; padding: 2px 6px; border-radius: 4px; font-size: 11px;">Normal</span>`;

        let customDetails = '';
        if (item.colors && item.colors.length > 0) {
            let colorDisplay = Array.isArray(item.colors) ? item.colors.join(', ') : item.colors;
            customDetails += `<br><small style="color: #64748b;">Colors: ${colorDisplay}</small>`;
        }
        if (item.size) {
            customDetails += `<br><small style="color: #64748b;">Size: ${item.size}</small>`;
        }

        const imgHtml = item.image ? `<img src="${item.image}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd;">` : '';

        itemsHtml += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 12px; display: flex; align-items: center; gap: 10px;">
                    ${imgHtml}
                    <strong>${item.name || 'Product'}</strong>
                </td>
                <td style="padding: 12px;">
                    ${typeBadge}
                    ${customDetails}
                </td>
                <td style="padding: 12px; text-align: center;">${item.quantity || 1}</td>
                <td style="padding: 12px; text-align: right;">₹${item.price || 0}</td>
            </tr>
        `;
    }

    itemsHtml += `
            </tbody>
        </table>
    `;

    const receiptHtml = receiptUrl && receiptUrl !== 'No Receipt' ? `
        <div style="margin-top: 20px; border-top: 1px solid #ccc; padding-top: 20px; text-align: center;">
            <p style="text-align: left;"><strong>Payment Screenshot / Receipt:</strong></p>
            <a href="${absoluteReceiptUrl}" target="_blank">
                <img src="${absoluteReceiptUrl}" alt="Payment Receipt" style="max-width: 100%; max-height: 500px; border: 2px solid #ccc; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            </a>
        </div>
    ` : `<p><em>No payment receipt uploaded.</em></p>`;

    const mailOptions = {
        from: `WireNest System <${ADMIN_EMAIL}>`,
        to: ADMIN_EMAIL, // Send to the admin
        subject: `🚨 New Order Pending Approval: #${orderId.substring(0, 8)}`,
        html: `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; background: #fff;">
                <h2 style="color: #d97706; border-bottom: 2px solid #d97706; padding-bottom: 10px;">New Order Received!</h2>
                <div style="background: #fafafa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <p style="margin: 5px 0;"><strong>Order ID:</strong> ${orderId}</p>
                    <p style="margin: 5px 0; font-size: 18px;"><strong>Total Value:</strong> <span style="color: #16a34a;">₹${totalAmount}</span></p>
                </div>

                ${customerAddress ? `
                <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #16a34a;">
                    <h3 style="margin-top: 0; margin-bottom: 10px; color: #166534; font-size: 16px;">Shipping Details</h3>
                    <p style="margin: 5px 0;"><strong>Customer Name:</strong> ${customerAddress.name}</p>
                    <p style="margin: 5px 0;"><strong>Mobile Number:</strong> ${customerAddress.mobile}</p>
                    <p style="margin: 5px 0;"><strong>Email Address:</strong> ${customerAddress.email}</p>
                    <p style="margin: 5px 0;"><strong>Delivery Address:</strong><br>${customerAddress.address}<br>${customerAddress.city} - ${customerAddress.pincode}</p>
                </div>
                ` : `<p style="margin: 5px 0;"><strong>Customer Email:</strong> ${customerEmail}</p>`}

                
                ${itemsHtml}
                ${receiptHtml}

                <br/>
                <p style="margin-top: 30px; padding: 15px; background: #e0e7ff; border-radius: 8px; text-align: center;">
                    Please log into the <a href="http://localhost:3000/admin/admin.html" style="color: #2563eb; text-decoration: none; font-weight: bold; padding: 5px 10px; border: 1px solid #2563eb; border-radius: 4px; display: inline-block; background: #fff;">Admin Dashboard</a> to review the screenshot and <strong>Approve</strong> or <strong>Reject</strong> the payment.
                </p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`📧 Admin notification email sent for order ${orderId}`);
    } catch (err) {
        console.error("Failed to send admin email:", err);
    }
}

/**
 * Sends a receipt exactly to the customer when the admin clicks [Approve]
 */
export async function sendCustomerApprovalEmail(customerEmail, orderId, totalAmount) {
    if (!process.env.GMAIL_PASS || !customerEmail) return;

    const mailOptions = {
        from: `WireNest Support <${ADMIN_EMAIL}>`,
        to: customerEmail,
        subject: `✅ Your WireNest Order is Confirmed! (#${orderId.substring(0, 8)})`,
        html: `
            <div style="font-family: Arial, sans-serif; text-align: center; color: #333;">
                <h1 style="color: #4CAF50;">Payment Approved!</h1>
                <p>Hello! We have successfully received your payment of <b>₹${totalAmount}</b>.</p>
                <p>Your order <strong>#${orderId.substring(0, 8)}</strong> is now processing and will be shipped shortly.</p>
                <br/>
                <p>Thank you for shopping at <strong>WireNest</strong>!</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`📧 Customer approval email sent to ${customerEmail}`);
    } catch (err) {
        console.error("Failed to send customer email:", err);
    }
}

/**
 * Sends a notification to the customer when the admin clicks [Mark Shipped]
 */
export async function sendCustomerShippedEmail(customerEmail, orderId) {
    if (!process.env.GMAIL_PASS || !customerEmail) return;

    const mailOptions = {
        from: `WireNest Support <${ADMIN_EMAIL}>`,
        to: customerEmail,
        subject: `🚚 Your WireNest Order has Shipped! (#${orderId.substring(0, 8)})`,
        html: `
            <div style="font-family: Arial, sans-serif; text-align: center; color: #333; padding: 20px;">
                <h1 style="color: #0284c7;">Your Order is on the Way!</h1>
                <p>Great news! Your order <strong>#${orderId.substring(0, 8)}</strong> has been shipped and is currently in transit.</p>
                <img src="https://cdn-icons-png.flaticon.com/512/2769/2769339.png" alt="Shipping Icon" style="width: 100px; margin: 20px 0;">
                <p>We will notify you again once it has been delivered to your destination.</p>
                <br/>
                <p>Thank you for shopping at <strong>WireNest</strong>!</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`📧 Customer shipping email sent to ${customerEmail}`);
    } catch (err) {
        console.error("Failed to send shipping email:", err);
    }
}

/**
 * Sends a notification to the customer when the admin clicks [Mark Delivered]
 */
export async function sendCustomerDeliveredEmail(customerEmail, orderId) {
    if (!process.env.GMAIL_PASS || !customerEmail) return;

    const mailOptions = {
        from: `WireNest Support <${ADMIN_EMAIL}>`,
        to: customerEmail,
        subject: `📦 Your WireNest Order is Delivered! (#${orderId.substring(0, 8)})`,
        html: `
            <div style="font-family: Arial, sans-serif; text-align: center; color: #333; padding: 20px;">
                <h1 style="color: #10b981;">Order Delivered!</h1>
                <p>Your order <strong>#${orderId.substring(0, 8)}</strong> has been successfully delivered to your address.</p>
                <img src="https://cdn-icons-png.flaticon.com/512/1008/1008010.png" alt="Delivery Icon" style="width: 100px; margin: 20px 0;">
                <p>We hope you love your new products!</p>
                <br/>
                <p>Thank you for shopping at <strong>WireNest</strong>!</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`📧 Customer delivery email sent to ${customerEmail}`);
    } catch (err) {
        console.error("Failed to send delivery email:", err);
    }
}
