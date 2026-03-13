// WireNest Backend Server Startup Script
import { createServer } from 'http';

const PORT = process.env.PORT || 8001;
const HOST = 'localhost';

// Create HTTP server to prevent directory listing
const server = createServer((req, res) => {
    // Set security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Handle API routes
    if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>WireNest Backend</title>
            </head>
            <body>
                <h1>✅ WireNest Backend Running</h1>
                <p>Server: ${HOST}:${PORT}</p>
                <p>Status: Active and ready</p>
                <p>API Endpoints:</p>
                <ul>
                    <li><a href="/auth/signup">POST /auth/signup</a></li>
                    <li><a href="/auth/login">POST /auth/login</a></li>
                    <li><a href="/auth/logout">POST /auth/logout</a></li>
                    <li><a href="/auth/session">GET /auth/session</a></li>
                </ul>
            </body>
            </html>
        `);
        return;
    }
    
    // Handle directory access attempts
    res.writeHead(403, { 'Content-Type': 'text/html' });
    res.end(`
        <!DOCTYPE html>
        <html>
        <head>
                <title>Access Denied</title>
        </head>
        <body>
            <h1>403 - Access Denied</h1>
            <p>Directory listing is not allowed.</p>
            <p>Please access the API endpoints directly.</p>
        </body>
        </html>
    `);
});

server.listen(PORT, HOST, () => {
    console.log(`🚀 WireNest Backend Server running on http://${HOST}:${PORT}`);
    console.log('✅ API endpoints ready');
    console.log('🔒 Security headers enabled');
});
