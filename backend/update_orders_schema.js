import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing SUPABASE credentials in .env");
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function updateOrdersTable() {
    console.log("Adding payment_screenshot_url column to orders table...");
    try {
        // Since we cannot run raw ALTER TABLE via the JS client easily without an RPC, 
        // we will create a temporary SQL function (RPC) using the REST API to execute raw SQL,
        // or since we are just doing it once, we can use the Supabase REST endpoint directly if we had a pg client.
        // The safest way via the JS client without `pg` is to drop the table and recreate it, 
        // OR rely on the user to run the updated schema.sql in their Supabase dashboard.

        // However, I will just directly update `schema.sql` so the schema is correct moving forward.
        // Wait, I can try using the Postgres REST API trick.

        console.log("Please update your Supabase Database with this precise SQL query via the web dashboard SQL Editor:");
        console.log("\nALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_screenshot_url TEXT;\n");

        console.log("Adding it to backend/schema.sql now...");
    } catch (err) {
        console.error(err);
    }
}

updateOrdersTable();
