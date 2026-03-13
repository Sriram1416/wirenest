import express from "express";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

// Elevate privileges to bypass RLS for admin/backend forced operations where needed
const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY
);

const isValidUUID = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

// 1. GET /cart/:user_id - Fetch a user's cart
router.get("/:user_id", async (req, res) => {
    const { user_id } = req.params;

    if (!isValidUUID(user_id)) return res.json({ success: true, data: [] });

    try {
        const { data, error } = await supabaseAdmin
            .from('cart')
            .select('*')
            .eq('user_id', user_id);

        if (error) throw error;

        res.json({ success: true, data });
    } catch (error) {
        console.error("Fetch Cart Error:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. POST /cart/add - Add an item to the cart
router.post("/add", async (req, res) => {
    const { user_id, product_id, product_type, quantity, customization_choices } = req.body;

    if (!isValidUUID(user_id)) return res.status(400).json({ success: false, error: "Invalid user ID" });
    if (!isValidUUID(product_id)) return res.status(400).json({ success: false, error: "Invalid product ID - must be a UUID. Legacy local product IDs are not supported." });
    if (!product_type || !['normal', 'customized'].includes(product_type)) return res.status(400).json({ success: false, error: "Invalid product_type. Must be 'normal' or 'customized'." });

    try {
        // Ensure user exists in custom users table to prevent Foreign Key violation on cart insertion
        const { data: userExists } = await supabaseAdmin.from('users').select('id').eq('id', user_id).single();
        if (!userExists) {
            console.log(`User ${user_id} not found in public.users. Attempting upsert...`);
            const { error: upsertErr } = await supabaseAdmin.from('users').upsert({
                id: user_id,
                email: `synced_${user_id.substring(0, 8)}@wirenest.local`,
                full_name: 'Auto-Synced User',
                updated_at: new Date().toISOString()
            }, { onConflict: 'id' });

            if (upsertErr) {
                console.error("Failed to upsert user during cart add:", upsertErr);
                // If it's an FK error, it means user_id is completely invalid in auth.users. 
                // We should reject the cart addition to prevent orphaned/broken cart DB state.
                return res.status(400).json({ success: false, error: "User ID does not exist in the authentication system." });
            }
        }

        // Check if item already exists in cart for this user
        const { data: existingItems, error: searchError } = await supabaseAdmin
            .from('cart')
            .select('*')
            .eq('user_id', user_id)
            .eq('product_id', product_id)
            .eq('product_type', product_type);

        if (searchError) throw searchError;

        // Let's do a simple check. If normal product, just add quantity.
        // If customized, might depend on choices, but for now we just insert or update based on exact match if we want,
        // or just insert a new row. The easiest is always insert a new row or update if same configuration.
        // Let's just always insert a new row for simplicity unless it perfectly matches a normal product.

        let matchFound = false;

        if (existingItems && existingItems.length > 0) {
            // Find perfect match
            for (let item of existingItems) {
                if (JSON.stringify(item.customization_choices || {}) === JSON.stringify(customization_choices || {})) {
                    // Update quantity
                    const { error: updateError } = await supabaseAdmin
                        .from('cart')
                        .update({ quantity: item.quantity + (quantity || 1) })
                        .eq('id', item.id);

                    if (updateError) throw updateError;
                    matchFound = true;
                    break;
                }
            }
        }

        if (!matchFound) {
            // Insert new
            const { error: insertError } = await supabaseAdmin
                .from('cart')
                .insert([{
                    user_id,
                    product_id,
                    product_type,
                    quantity: quantity || 1,
                    customization_choices: customization_choices || {}
                }]);

            if (insertError) throw insertError;
        }

        res.json({ success: true, message: "Added to cart" });
    } catch (error) {
        console.error("Add to Cart Error:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 3. PUT /cart/update/:cart_id
router.put("/update/:cart_id", async (req, res) => {
    const { cart_id } = req.params;
    const { quantity } = req.body;

    try {
        const { error } = await supabaseAdmin
            .from('cart')
            .update({ quantity })
            .eq('id', cart_id);

        if (error) throw error;
        res.json({ success: true, message: "Cart quantity updated" });
    } catch (error) {
        console.error("Update Cart Quantity Error:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 4. DELETE /cart/remove/:cart_id
router.delete("/remove/:cart_id", async (req, res) => {
    const { cart_id } = req.params;

    try {
        const { error } = await supabaseAdmin
            .from('cart')
            .delete()
            .eq('id', cart_id);

        if (error) throw error;
        res.json({ success: true, message: "Removed from cart" });
    } catch (error) {
        console.error("Remove from Cart Error:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 4. DELETE /cart/clear/:user_id
router.delete("/clear/:user_id", async (req, res) => {
    const { user_id } = req.params;

    if (!isValidUUID(user_id)) return res.json({ success: true });

    try {
        const { error } = await supabaseAdmin
            .from('cart')
            .delete()
            .eq('user_id', user_id);

        if (error) throw error;
        res.json({ success: true, message: "Cart cleared" });
    } catch (error) {
        console.error("Clear Cart Error:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
