import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 3000;

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  // Handle file requests - only redirect OAuth paths
  const validExtensions = ['.html', '.js', '.css', '.png', '.jpg', '.gif', '.svg', '.ico', '.json'];
  const hasValidExtension = validExtensions.some(ext => req.url.includes(ext));
  
  // Only redirect OAuth paths, everything else serves normally
  if (req.url.startsWith('/review') || 
      req.url.startsWith('/auth') || 
      req.url.startsWith('/oauth')) {
    console.log(`🔄 OAUTH REDIRECT: ${req.url} to /theardify.html`);
    res.writeHead(302, { 'Location': '/theardify.html' });
    res.end();
    return;
  }
  
  // Log all requests for debugging
  console.log(`📝 Request: ${req.method} ${req.url}`);
  
  let filePath = path.join(__dirname, req.url === '/' ? 'theardify.html' : req.url);
  
  // Remove query parameters from file path
  filePath = filePath.split('?')[0];
  
  const extname = String(path.extname(filePath)).toLowerCase();
  const mimeType = mimeTypes[extname] || 'application/octet-stream';
  
  fs.readFile(filePath, (err, data) => {
    if (err) {
      // Special handling for favicon.ico
      if (req.url.includes('favicon.ico')) {
        console.log(`📝 Favicon not found, serving empty response`);
        res.writeHead(200, { 'Content-Type': 'image/x-icon' });
        res.end('');
        return;
      }
      
      console.log(`❌ File not found: ${filePath}`);
      console.log(`🔄 Redirecting to /theardify.html as fallback`);
      
      // If file not found, redirect to theardify.html instead of serving it
      res.writeHead(302, { 'Location': '/theardify.html' });
      res.end();
    } else {
      res.writeHead(200, { 'Content-Type': mimeType });
      res.end(data);
    }
  });
});

server.listen(PORT, () => {
  console.log(`✅ Frontend server running on http://localhost:${PORT}`);
  console.log(`🌐 Access your app at: http://localhost:${PORT}/theardify.html`);
});
