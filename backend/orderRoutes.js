import express from "express";
import multer from "multer";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { sendAdminNewOrderEmail, sendCustomerApprovalEmail, sendCustomerShippedEmail, sendCustomerDeliveredEmail } from './emailService.js';

dotenv.config();

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase Init
const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE,
    { auth: { persistSession: false } }
);

// Memory storage — receipts go to Supabase Storage (persistent CDN), not Render disk
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

// Upload receipt buffer to Supabase Storage
async function uploadReceiptToSupabase(file) {
    const ext = path.extname(file.originalname) || '.jpg';
    const fileName = `receipts/receipt-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

    const { error } = await supabaseAdmin.storage
        .from('product-images')
        .upload(fileName, file.buffer, { contentType: file.mimetype, upsert: false });

    if (error) throw new Error('Receipt upload failed: ' + error.message);

    const { data } = supabaseAdmin.storage.from('product-images').getPublicUrl(fileName);
    return data.publicUrl;
}

// POST /orders/checkout
// Receives: receipt (File), user_id (String/UUID), shipping_address (JSON String), items (JSON String), total_amount (Number)
router.post("/checkout", upload.single('receipt'), async (req, res) => {
    try {
        console.log("🛒 Incoming Checkout Request");

        if (!req.file) {
            return res.status(400).json({ error: "Missing payment screenshot" });
        }

        // Upload receipt to Supabase Storage (permanent CDN)
        let receiptUrl;
        try {
            receiptUrl = await uploadReceiptToSupabase(req.file);
        } catch (uploadErr) {
            console.error('Receipt upload error:', uploadErr.message);
            return res.status(500).json({ error: 'Failed to store payment receipt: ' + uploadErr.message });
        }

        const { user_id, shipping_address, items, total_amount } = req.body;

        let parsedAddress = {};
        let parsedItems = [];

        try {
            parsedAddress = JSON.parse(shipping_address);
            parsedItems = JSON.parse(items);

            // Workaround for locked SQL constraints: bundle the receipt URL into the unstructured JSONB field
            parsedAddress.payment_screenshot_url = receiptUrl;
        } catch (e) {
            console.error("Error parsing checkout JSON:", e);
            return res.status(400).json({ error: "Invalid JSON format for address or items" });
        }

        // 1. Create the main Order Record targeting public.orders
        const { data: orderData, error: orderError } = await supabaseAdmin
            .from('orders')
            .insert([{
                user_id: (user_id && user_id !== 'null') ? user_id : null,
                total_amount: parseFloat(total_amount),
                status: 'pending',
                shipping_address: parsedAddress
            }])
            .select('*')
            .single();

        if (orderError) {
            console.error("Supabase Order Insert Error:", orderError);
            throw orderError;
        }

        const newOrderId = orderData.id;
        console.log(`✅ Order Created: ${newOrderId}`);

        // 2. Insert Order Items mapping
        const orderItemsPayload = parsedItems.map(item => ({
            order_id: newOrderId,
            product_id: item.productId,
            product_type: item.blockType || (item.isCustomized ? 'customized' : 'normal'),
            quantity: item.quantity,
            price_at_purchase: item.price,
            product_image: item.image || null,
            customization_choices: { size: item.size, colors: item.colors }
        }));

        const { error: itemsError } = await supabaseAdmin
            .from('order_items')
            .insert(orderItemsPayload);

        if (itemsError) {
            console.error("Supabase Order Items Insert Error:", itemsError);
            throw itemsError;
        }

        // 3. Insert specific Order Details payload
        const orderDetailsPayload = {
            order_id: newOrderId,
            name: parsedAddress.name,
            mobile: parsedAddress.mobile,
            email: parsedAddress.email,
            address: parsedAddress.address,
            city: parsedAddress.city,
            pincode: parsedAddress.pincode
        };

        const { error: detailsError } = await supabaseAdmin
            .from('order_details')
            .insert(orderDetailsPayload);

        if (detailsError) {
            console.error("Supabase Order Details Insert Error:", detailsError);
            throw detailsError;
        }

        // 4. Clear User's Cart if logged in
        if (user_id && user_id !== 'null') {
            await supabaseAdmin.from('cart').delete().eq('user_id', user_id);
        }

        res.status(200).json({ success: true, order_id: newOrderId, message: "Order submitted successfully" });

        // Trigger Email to Admin (awaited so errors appear in Render logs)
        try {
            const customerEmail = parsedAddress.email || 'Unknown';
            await sendAdminNewOrderEmail(newOrderId, total_amount, customerEmail, receiptUrl, parsedItems, parsedAddress);
        } catch (e) {
            console.error("Admin Email Send Error:", e.message);
        }

    } catch (err) {
        console.error("Checkout Processing Error:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// PUT /orders/:id/status
// Admin endpoint to Approve/Reject payments
router.put('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'processing', 'rejected', etc.

        if (!['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'rejected'].includes(status)) {
            return res.status(400).json({ error: "Invalid status state" });
        }

        const { data, error } = await supabaseAdmin
            .from('orders')
            .update({ status: status })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.status(200).json({ success: true, order: data });

        // Trigger automated lifecycle Email to User
        if (['processing', 'shipped', 'delivered'].includes(status)) {
            try {
                const customerEmail = data.shipping_address?.email;
                if (customerEmail) {
                    if (status === 'processing') {
                        sendCustomerApprovalEmail(customerEmail, data.id, data.total_amount);
                    } else if (status === 'shipped') {
                        sendCustomerShippedEmail(customerEmail, data.id);
                    } else if (status === 'delivered') {
                        sendCustomerDeliveredEmail(customerEmail, data.id);
                    }
                }
            } catch (e) {
                console.error("Async Customer Email Error:", e);
            }
        }

    } catch (err) {
        console.error("Order Status Update Error:", err);
        res.status(500).json({ error: "Server Error" });
    }
});

import QRCode from 'qrcode';

// GET /orders/qr?amount=150.00
// Dynamically generates a precise UPI invoice barcode
router.get("/qr", async (req, res) => {
    try {
        const { amount } = req.query;
        if (!amount) return res.status(400).send("Amount required");

        // The user's exact merchant UPI string mapping
        const upiString = `upi://pay?pa=9715058175@pthdfc&pn=WireNest&am=${parseFloat(amount).toFixed(2)}&cu=INR`;

        res.setHeader('Content-Type', 'image/png');
        QRCode.toFileStream(res, upiString, {
            width: 350,
            margin: 2,
            color: { dark: '#000000', light: '#ffffff' }
        });

    } catch (err) {
        console.error("Dynamic QR Generation Error:", err);
        res.status(500).send("Error generating QR code");
    }
});

// GET /orders/user/:user_id
// Fetch all past orders placed by a specific customer
router.get("/user/:user_id", async (req, res) => {
    try {
        const { user_id } = req.params;
        const { data, error } = await supabaseAdmin
            .from('orders')
            .select(`
                *,
                order_items (*)
            `)
            .eq('user_id', user_id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.status(200).json({ success: true, orders: data });
    } catch (err) {
        console.error("Fetch User Orders Error:", err);
        res.status(500).json({ error: "Server Error" });
    }
});

export default router;
