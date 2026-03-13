import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

// Critical: Service Role Key is required to bypass RLS and read auth.users
const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY // fallback just in case
);

async function seedUsers() {
    console.log("🌱 Starting Database Seeding Process...");

    try {
        // 1. Fetch all users from the secure Auth schema
        // Note: admin.listUsers requires the Service Role Key.
        console.log("Fetching existing users from Supabase Auth...");
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();

        if (authError) {
            throw new Error(`Failed to fetch auth users: ${authError.message}`);
        }

        const users = authData.users;

        if (!users || users.length === 0) {
            console.log("No users found in Supabase Auth to migrate.");
            return;
        }

        console.log(`Found ${users.length} users. Preparing migration into public.Users...`);

        // 2. Map Auth payload into the custom 'Users' table schema
        const usersToUpsert = users.map(user => {
            const email = user.email;
            const name = user.user_metadata?.full_name || user.user_metadata?.name || email.split('@')[0];
            const avatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;

            return {
                id: user.id, // Keep the exact UUID to maintain relation
                email: email,
                full_name: name,
                updated_at: new Date().toISOString(),
                // Be careful not to overwrite existing roles if they already exist during a re-run
                // role: 'user' (PostgreSQL defaults should handle this, or we leave it blank for manual entry)
            };
        });

        // 3. Upsert into the public Users table
        const { error: upsertError } = await supabaseAdmin
            .from('users')
            .upsert(usersToUpsert, { onConflict: 'id' });

        if (upsertError) {
            throw new Error(`Failed to upsert into Users table: ${upsertError.message}`);
        }

        console.log(`✅ Successfully migrated ${users.length} users into public.Users table!`);
        console.log("Your Admin Dashboard should now populate correctly.");

    } catch (err) {
        console.error("❌ Seeding Failed:", err.message);
        console.log("NOTE: If you got a 'not allowed' error, you must add SUPABASE_SERVICE_ROLE to your .env file.");
    }
}

// Execute the async function
seedUsers();
