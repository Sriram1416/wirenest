import express from "express";
import { supabase } from "./supabaseClient.js";
import { createClient } from "@supabase/supabase-js";
import multer from "multer";
import path from "path";

const router = express.Router();

// Configure Multer for local Admin Image Uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, uniqueSuffix + path.extname(file.originalname))
    }
});
const upload = multer({ storage: storage });

// Elevate privileges to bypass Row Level Security for fetching admin data
const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY
);

/* ADMIN LOGIN (Supabase Role-Based) */
router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    // 1. Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (authError || !authData.user) {
        return res.status(401).json({
            success: false,
            error: authError?.message || "Invalid credentials"
        });
    }

    // 2. Authorize the user: Check the 'role' column in the custom 'users' table
    const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role, full_name, email')
        .eq('id', authData.user.id)
        .single();

    if (userError || !userData || userData.role !== 'admin') {
        // Sign out if they aren't actually an admin
        await supabase.auth.signOut();
        return res.status(403).json({
            success: false,
            error: "Access Denied: You do not have administrator privileges."
        });
    }

    // Success
    return res.json({
        success: true,
        admin: {
            email: userData.email,
            name: userData.full_name || "Admin",
            role: userData.role
        }
    });
});

/* IMAGE UPLOAD ENDPOINT */
router.post("/upload", upload.array('images', 10), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, error: "No files uploaded." });
        }

        // Generate relative server URLs for the saved files to allow frontend to dictate BACKEND_URL
        const fileUrls = req.files.map(f => {
            return `/uploads/${f.filename}`;
        });

        res.json({ success: true, urls: fileUrls });
    } catch (err) {
        console.error("Upload Error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/* GET ALL USERS */
router.get("/users", async (_req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('users')
            .select('*')
            .order('updated_at', { ascending: false });

        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }

        res.json({ success: true, users: data });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

/* GET ALL NORMAL PRODUCTS */
router.get("/products", async (_req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('normal_products')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }

        res.json({ success: true, products: data });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

const ALLOWED_TABLES = [
    'categories', 'normal_products', 'customized_products',
    'stock', 'cart', 'orders', 'users', 'order_items', 'order_details'
];

/* UNIVERSAL GET */
router.get("/data/:table", async (req, res) => {
    const { table } = req.params;
    if (!ALLOWED_TABLES.includes(table)) return res.status(400).json({ success: false, error: "Invalid table" });

    try {
        const { data, error } = await supabaseAdmin.from(table).select('*').order('created_at', { ascending: false });
        // Some tables might only have 'updated_at', fallback if created_at fails
        if (error && error.message.includes("created_at")) {
            const { data: fallbackData, error: fallbackError } = await supabaseAdmin.from(table).select('*');
            if (fallbackError) throw fallbackError;
            return res.json({ success: true, data: fallbackData });
        }
        if (error) throw error;
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/* UNIVERSAL POST */
router.post("/data/:table", async (req, res) => {
    const { table } = req.params;
    const payload = req.body;
    if (!ALLOWED_TABLES.includes(table)) return res.status(400).json({ success: false, error: "Invalid table" });

    try {
        const { data, error } = await supabaseAdmin.from(table).insert([payload]).select();
        if (error) throw error;
        res.json({ success: true, data: data[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/* UNIVERSAL PUT */
router.put("/data/:table/:id", async (req, res) => {
    const { table, id } = req.params;
    const payload = req.body;
    if (!ALLOWED_TABLES.includes(table)) return res.status(400).json({ success: false, error: "Invalid table" });

    // Auto-update standard updated_at column if present
    if (payload.updated_at !== undefined) {
        payload.updated_at = new Date().toISOString();
    }

    try {
        const { data, error } = await supabaseAdmin.from(table).update(payload).eq('id', id).select();
        if (error) throw error;
        res.json({ success: true, data: data[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/* UNIVERSAL DELETE */
router.delete("/data/:table/:id", async (req, res) => {
    const { table, id } = req.params;
    if (!ALLOWED_TABLES.includes(table)) return res.status(400).json({ success: false, error: "Invalid table" });

    try {
        const { error } = await supabaseAdmin.from(table).delete().eq('id', id);
        if (error) throw error;
        res.json({ success: true, message: "Deleted successfully" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
