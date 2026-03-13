import express from 'express';
import { supabase } from './supabaseClient.js';

const router = express.Router();

// Get all reviews for a product
router.get('/:product_id', async (req, res) => {
    try {
        const { product_id } = req.params;

        // Fetch reviews with user details
        const { data, error } = await supabase
            .from('reviews')
            .select(`
                id,
                rating,
                comment,
                created_at,
                users ( name, avatar_url )
            `)
            .eq('product_id', product_id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error fetching reviews:", error);
            return res.status(500).json({ success: false, error: error.message });
        }

        res.json({ success: true, data });
    } catch (err) {
        console.error("Server error explicitly loading reviews:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Add a new review
router.post('/add', async (req, res) => {
    try {
        const { product_id, user_id, rating, comment } = req.body;

        if (!product_id || !user_id || !rating) {
            return res.status(400).json({ success: false, error: 'Product ID, User ID, and Rating are required' });
        }

        const { data, error } = await supabase
            .from('reviews')
            .insert([{ product_id, user_id, rating, comment }])
            .select();

        if (error) {
            console.error("Error inserting review:", error);
            return res.status(500).json({ success: false, error: error.message });
        }

        res.json({ success: true, data });
    } catch (err) {
        console.error("Server Error saving review:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get average rating for a product
router.get('/average/:product_id', async (req, res) => {
    try {
        const { product_id } = req.params;

        const { data, error } = await supabase
            .from('reviews')
            .select('rating')
            .eq('product_id', product_id);

        if (error) {
            console.error("Error fetching average rating:", error);
            return res.status(500).json({ success: false, error: error.message });
        }

        let average = 0;
        let count = data.length;

        if (count > 0) {
            const sum = data.reduce((acc, current) => acc + current.rating, 0);
            average = (sum / count).toFixed(1);
        }

        res.json({ success: true, average: parseFloat(average), count });
    } catch (err) {
        console.error("Server Error calculating rating:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
