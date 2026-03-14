import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE // Important: use service role to bypass policies
);

async function setupAdmin() {
    console.log("Creating Admin User...");
    const email = "admin@wirenest.com";
    const password = "adminpassword123!";

    // 1. Create user in auth schema
    const { data: user, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: { name: "WireNest Admin" }
    });

    if (authError && authError.message.includes('already been registered')) {
        console.log("Admin user already exists in auth. Trying to update password...");
        
        // Find user first
        const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = usersData.users.find(u => u.email === email);
        
        if (existingUser) {
            await supabaseAdmin.auth.admin.updateUserById(existingUser.id, { password: password });
            console.log("Password updated successfully.");
            
            // Upsert role in users table
            await mapUserToPublic(existingUser.id, email);
        }
    } else if (authError) {
        console.error("Failed to create auth user:", authError);
    } else {
        console.log("Auth user created successfully with ID:", user.user.id);
        await mapUserToPublic(user.user.id, email);
    }
}

async function mapUserToPublic(userId, email) {
    console.log("Ensuring user has 'admin' role in public.users...");
    const { error: dbError } = await supabaseAdmin
        .from('users')
        .upsert({
            id: userId,
            email: email,
            full_name: "WireNest Admin",
            role: "admin",
            updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

    if (dbError) {
        console.error("Failed to map user to public schema:", dbError);
    } else {
        console.log("✅ Admin user setup complete!");
        console.log(`Login Email: admin@wirenest.com`);
        console.log(`Login Password: adminpassword123!`);
    }
}

setupAdmin();
