import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE
);

async function testQuery() {
    console.log("Testing direct query to public.users...");

    // 1. Try fetching first
    const { data: fetch1, error: err1 } = await supabaseAdmin.from('users').select('*');
    console.log("Current rows:", fetch1?.length, "Error:", err1?.message);

    if (fetch1?.length === 0) {
        console.log("Table is empty. Attempting a manual insert test...");

        const dummyId = "00000000-0000-0000-0000-000000000000"; // Fake UUID

        const { data: insertData, error: insertErr } = await supabaseAdmin.from('users').upsert({
            id: dummyId,
            email: "test@test.com",
            full_name: "Test User"
        }, { onConflict: 'id' }).select();

        console.log("Insert result data:", insertData);
        console.log("Insert result error:", insertErr?.message);

        // Fetch again
        const { data: fetch2, error: err2 } = await supabaseAdmin.from('users').select('*');
        console.log("Rows after insert test:", fetch2?.length, "Error:", err2?.message);

        // Cleanup
        await supabaseAdmin.from('users').delete().eq('id', dummyId);
    }
}

testQuery();
