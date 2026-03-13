# Supabase Setup Instructions

## 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note your project URL and anon key

## 2. Update Configuration
Replace the placeholder values in `threadify.js` line 6:

```javascript
const supabase = createClient('YOUR_PROJECT_URL', 'YOUR_ANON_KEY');
```

## 3. Enable Google OAuth
1. Go to Authentication > Providers in Supabase Dashboard
2. Enable Google provider
3. Add your Google OAuth credentials
4. Set redirect URL to: `https://your-domain.com` (or `http://localhost:3000` for development)

## 4. Disable Email Confirmation
1. Go to Authentication > Settings
2. Find "Enable email confirmations" 
3. Disable this option

## 5. Test Authentication
- Email signup: Creates user in auth.users with name in user_metadata
- Email login: Authenticates existing users
- Google login: OAuth flow with auto user creation
- Session persistence: Works across page refreshes

## Features Implemented
✅ Email/Password signup with name storage
✅ Email/Password login
✅ Google OAuth login
✅ Session restore on page load
✅ Logout functionality
✅ Error handling for all scenarios
✅ Users stored in auth.users table
