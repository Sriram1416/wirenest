# Google OAuth Setup Guide

## 🌐 Google Cloud Configuration

### **Your Google OAuth Credentials:**
- **Client ID:** `824944082300-tdembq72hf9f3tevhv5th1kjac5g86q1.apps.googleusercontent.com`
- **Client Secret:** [You need to get this from Google Cloud Console]

---

## 🔧 STEP 1: GOOGLE CLOUD CONSOLE SETUP

### **1. Get Client Secret:**
1. **Go to:** [Google Cloud Console](https://console.cloud.google.com)
2. **Select Project:** Your project
3. **Navigate:** APIs & Services → Credentials
4. **Find:** Your OAuth 2.0 Client ID
5. **Copy:** Client Secret

### **2. Configure Redirect URIs:**
Add these redirect URIs to your Google OAuth client:
```
http://localhost:3000
https://qcyrfudyumcfdbcorcrc.supabase.co/auth/v1/callback
```

---

## 🔧 STEP 2: SUPABASE CONFIGURATION

### **1. Update Supabase Google Provider:**
1. **Go to:** https://qcyrfudyumcfdbcorcrc.supabase.co
2. **Navigate:** Authentication → Providers
3. **Select:** Google provider
4. **Enable:** Toggle switch
5. **Add Credentials:**
   - **Client ID:** `824944082300-tdembq72hf9f3tevhv5th1kjac5g86q1.apps.googleusercontent.com`
   - **Client Secret:** [Your Google Client Secret]
6. **Set Redirect URL:** `http://localhost:3000`
7. **Save:** Configuration

---

## 🔧 STEP 3: FRONTEND REDIRECT FIX

### **Update Google Login Function:**
The redirect URL should be set correctly for local development.

---

## 🧪 STEP 4: TESTING GOOGLE LOGIN

### **Test Flow:**
1. **Click:** "Continue with Google"
2. **Redirect:** Google OAuth page
3. **Login:** Choose Google account
4. **Approve:** Permissions
5. **Redirect:** Back to your app
6. **Result:** Auto-logged in

---

## 🛠️ TROUBLESHOOTING

### **Common Issues:**
1. **"redirect_uri_mismatch"**
   - Fix: Add `http://localhost:3000` to Google Cloud redirect URIs

2. **"invalid_client"**
   - Fix: Check Client ID is correct

3. **"access_denied"**
   - Fix: User denied permission, try again

4. **Supabase OAuth error**
   - Fix: Check Client Secret is correct in Supabase

---

## 📋 REQUIRED URLs

### **Google Cloud Redirect URIs:**
```
http://localhost:3000
https://qcyrfudyumcfdbcorcrc.supabase.co/auth/v1/callback
```

### **Supabase Configuration:**
```
Client ID: 824944082300-tdembq72hf9f3tevhv5th1kjac5g86q1.apps.googleusercontent.com
Client Secret: [Your Google Client Secret]
Redirect URL: http://localhost:3000
```

---

## 🚀 NEXT STEPS

1. **Get Client Secret** from Google Cloud Console
2. **Update Supabase** Google provider settings
3. **Add Redirect URIs** to Google Cloud
4. **Test Google Login** flow

The Google OAuth will work once you complete these steps!
