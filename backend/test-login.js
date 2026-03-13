import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

async function testAdminLogin() {
    console.log("Testing Admin Login Credentials...");

    // 1. Try to login
    const email = "admin@gmail.com";
    const password = "admin@123";

    console.log(`Attempting login with ${email}`);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (authError || !authData.user) {
        console.error("❌ Authentication Failed:");
        console.error(authError?.message || "Unknown auth error");
        return;
    }

    console.log("✅ Credentials are valid! Auth user ID:", authData.user.id);

    // 2. Check Role
    console.log("Checking role in public.users table...");
    const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', authData.user.id)
        .single();

    if (userError) {
        console.error("❌ Database query for user role failed:");
        console.error(userError.message);
        return;
    }

    console.log("✅ Database query successful. User Data:", userData);

    if (userData.role !== 'admin') {
        console.error(`❌ User role is not 'admin'. Found: '${userData.role}'`);
    } else {
        console.log("✅ User is correctly configured as an admin!");
    }
}

testAdminLogin();
