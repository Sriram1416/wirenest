import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY
);

async function inspect() {
    console.log("Checking users table...");
    // Let's try inserting a dummy user to see the exact error
    const { data: insertData, error: insertError } = await supabaseAdmin
        .from('users')
        .insert({
            id: '123e4567-e89b-12d3-a456-426614174000',
            email: 'test_upsert@wirenest.local',
            full_name: 'Test Upsert User',
            updated_at: new Date().toISOString()
        });

    if (insertError) {
        console.error("USERS INSERT ERROR:", insertError);
    } else {
        console.log("User insertion succeeded");
        // Cleanup
        await supabaseAdmin.from('users').delete().eq('id', '123e4567-e89b-12d3-a456-426614174000');
    }
}

inspect();
