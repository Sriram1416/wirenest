import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE
);

async function injectWishlistSchema() {
    console.log("🚀 Initializing Wishlist Schema Creation via REST API bypass...");

    try {
        const sqlPath = path.join(__dirname, 'wishlists_table.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');
        
        // We will attempt to run this using the standard REST approach 
        // to see if we can force a raw string query execution if RLS is off.
        const { data, error } = await supabaseAdmin.rpc('exec_sql', { query: sqlContent });

        if (error) {
           console.log("❌ RPC 'exec_sql' failed. This means you do not have a raw SQL executor function installed.");
           console.log("You MUST manually copy the contents of `backend/wishlists_table.sql` and run it in the Supabase Dashboard SQL Editor.");
        } else {
           console.log("✅ Successfully generated wishlists table via seed bypass.");
        }

    } catch (e) {
        console.error("Critical Execution Error:", e);
    }
}

injectWishlistSchema();
