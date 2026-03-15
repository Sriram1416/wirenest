import express from "express";
import { supabase } from "./supabaseClient.js";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

// Elevate privileges to bypass Row Level Security when syncing tables
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY
);

/* HELPER: Sync Auth User to Custom 'Users' Table */
async function syncUserToTable(user) {
  if (!user) return;

  const email = user.email;
  const name = user.user_metadata?.full_name || user.user_metadata?.name || email.split('@')[0];
  const avatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;

  console.log(`Syncing user ${email} to Users table...`);

  // Attempt to upsert the user into the custom 'users' table.
  // Assuming the table accepts: id (uuid), email, full_name
  const { error } = await supabaseAdmin
    .from('users')
    .upsert({
      id: user.id, // Linking the custom table to the Auth user ID
      email: email,
      full_name: name,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' }); // Avoid duplicate key errors if user already exists

  if (error) {
    console.error("Failed to sync user to Users table:", error.message);
  }
}

/* SIGN UP */
router.post("/signup", async (req, res) => {
  const { email, password, name } = req.body;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name }
    }
  });

  if (error) {
    return res.status(400).json({ success: false, error: error.message });
  }

  // Auto-sync the newly created user to the custom table
  await syncUserToTable(data.user);

  res.json({ success: true, user: data.user });
});

/* LOGIN */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    return res.status(401).json({
      success: false,
      error: "Invalid email or password"
    });
  }

  // Check if this user is actually an Administrator
  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('role, email')
    .eq('id', data.user.id)
    .single();

  if ((userData && userData.role === 'admin') || data.user.email?.toLowerCase() === 'wirenestteam@gmail.com') {
    await supabase.auth.signOut();
    return res.status(403).json({
      success: false,
      error: "Admin accounts cannot log into the storefront directly. Please use the Admin Dashboard."
    });
  }

  // Ensure returning users are also synced/updated in the custom table
  await syncUserToTable(data.user);

  res.json({ success: true, user: data.user });
});

/* GOOGLE OAUTH */
router.get("/google", async (req, res) => {
  // Determine frontend URL dynamically. Fallback to common production URL if headers missing.
  const frontendOrigin = req.headers.origin || req.headers.referer || "https://wirenest.vercel.app";
  const redirectUrl = req.query.redirectUrl || `${frontendOrigin}/index.html`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl
    }
  });

  if (error) {
    return res.status(400).json({ success: false, error: error.message });
  }

  // Send the provider URL back so the frontend can redirect the user
  res.json({ success: true, url: data.url });
});

/* GET USER FROM TOKEN (OAuth Callback) */
router.post("/user", async (req, res) => {
  const { access_token } = req.body;
  if (!access_token) {
    return res.status(400).json({ success: false, error: "No token provided" });
  }

  const { data, error } = await supabase.auth.getUser(access_token);

  if (error) {
    return res.status(401).json({ success: false, error: error.message });
  }

  // Prevent admin OAuth from mapping locally on the storefront
  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', data.user.id)
    .single();

  if ((userData && userData.role === 'admin') || data.user.email?.toLowerCase() === 'wirenestteam@gmail.com') {
    return res.status(403).json({
      success: false,
      error: "Admin accounts cannot log into the storefront directly. Please use the Admin Dashboard."
    });
  }

  // Sync Google OAuth users to the custom table upon successful token exchange
  await syncUserToTable(data.user);

  res.json({ success: true, user: data.user });
});

/* LOGOUT */
router.post("/logout", async (_req, res) => {
  await supabase.auth.signOut();
  res.json({ success: true });
});

/* SESSION */
router.get("/session", async (_req, res) => {
  const { data } = await supabase.auth.getSession();
  res.json({ user: data.session?.user || null });
});

export default router;
