# Backend Setup Instructions

## 📁 Backend Structure Created ✅

```
backend/
│── server.js          ✅ Main server file
│── supabaseClient.js  ✅ Supabase client
│── authRoutes.js      ✅ Authentication routes
│── .env              ✅ Environment variables
│── package.json       ✅ Dependencies
```

## 🚀 To Start the Backend

### Step 1: Install Dependencies
Open PowerShell as Administrator and run:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
cd "c:\Users\ADMIN\OneDrive\Desktop\Startup\backend"
npm install
```

### Step 2: Start Server
```powershell
node server.js
```

## 📡 Available Endpoints

### Authentication Routes (http://localhost:8000/auth)
- `POST /auth/signup` - Create new user
- `POST /auth/login` - User login  
- `POST /auth/logout` - User logout
- `GET /auth/session` - Get current session

### Root Endpoint
- `GET /` - Server status

## 🔐 Supabase Configuration
- Project URL: https://qcyrfudyumcfdbcorcrc.supabase.co
- Auth endpoints ready
- Session management enabled

## ✅ Expected Output
```
✅ Backend server running on http://localhost:8000
```

## 🛠️ Troubleshooting
If npm is blocked:
1. Open PowerShell as Administrator
2. Run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`
3. Restart PowerShell
4. Try npm install again
