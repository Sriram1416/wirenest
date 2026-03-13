// Fix for directory listing issue
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Security middleware
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

app.use(cors());
app.use(express.json());

// Import routes
const authRoutes = require('./authRoutes.js');

// Use routes
app.use('/auth', authRoutes);

// Root route - prevent directory listing
app.get('/', (req, res) => {
    res.json({
        message: 'WireNest Backend Running',
        status: 'Active',
        server: 'Express.js',
        endpoints: {
            signup: 'POST /auth/signup',
            login: 'POST /auth/login',
            logout: 'POST /auth/logout',
            session: 'GET /auth/session'
        }
    });
});

// Handle 404 for directory access
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: 'Directory listing is not allowed'
    });
});

const PORT = process.env.PORT || 8001;

app.listen(PORT, () => {
    console.log(`🚀 WireNest Backend running on http://localhost:${PORT}`);
    console.log('✅ Directory listing disabled');
    console.log('🔒 Security headers enabled');
});
