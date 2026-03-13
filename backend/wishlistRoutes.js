import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE
);

// 1. GET /wishlist/user/:user_id
// Fetch a user's entire wishlist
router.get("/user/:user_id", async (req, res) => {
    try {
        const { user_id } = req.params;
        const { data, error } = await supabaseAdmin
            .from('wishlists')
            .select('*')
            .eq('user_id', user_id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.status(200).json({ success: true, count: data.length, data });
    } catch (error) {
        console.error("Fetch Wishlist Error:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. POST /wishlist/add
// Add a new product to the auth user's wishlist
router.post("/add", async (req, res) => {
    try {
        const { user_id, product_id, product_type } = req.body;
        
        if (!user_id || !product_id || !product_type) {
             return res.status(400).json({ success: false, error: 'Missing required parameters' });
        }

        const { data, error } = await supabaseAdmin
            .from('wishlists')
            .insert([{ user_id, product_id, product_type }])
            .select('*')
            .single();

        // Handle unique constraint violations gracefully
        if (error) {
            if (error.code === '23505') { // Unique constraint code
                return res.status(200).json({ success: true, message: "Item is already in your wishlist" });
            }
            throw error;
        }

        res.status(201).json({ success: true, message: "Added to your wishlist", data });
    } catch (error) {
        console.error("Add to Wishlist Error:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 3. DELETE /wishlist/remove
// Remove an item from the auth user's wishlist using the explicit combination mapping
router.delete("/remove", async (req, res) => {
    try {
        const { user_id, product_id } = req.body;

        if (!user_id || !product_id) {
             return res.status(400).json({ success: false, error: 'Missing required parameters' });
        }

        const { error } = await supabaseAdmin
            .from('wishlists')
            .delete()
            .match({ user_id: user_id, product_id: product_id });

        if (error) throw error;
        res.status(200).json({ success: true, message: "Removed from wishlist" });
    } catch (error) {
        console.error("Remove from Wishlist Error:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
