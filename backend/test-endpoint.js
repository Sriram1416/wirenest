import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY
);

async function inspectProducts() {
    console.log("Checking Admin Products...");

    // Check customized products
    const { data: customized, error: cErr } = await supabaseAdmin.from('customized_products').select('*');
    if (cErr) console.error("Error fetching customized:", cErr);
    else console.log("Customized Products:", customized.length, "found.");
    if (customized.length > 0) {
        console.log("Sample Customized Product ID:", customized[0].id);
        console.log("Sample Customized Product Name:", customized[0].name);
    }

    // Check normal products
    const { data: normal, error: nErr } = await supabaseAdmin.from('normal_products').select('*');
    if (nErr) console.error("Error fetching normal:", nErr);
    else console.log("Normal Products:", normal.length, "found.");
    if (normal.length > 0) {
        console.log("Sample Normal Product ID:", normal[0].id);
        console.log("Sample Normal Product Name:", normal[0].name);
    }
}

inspectProducts();
