const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;

// MIME types for different file extensions
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Create HTTP server
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;
  
  // Decode URL to handle spaces and special characters
  pathname = decodeURIComponent(pathname);
  
  // If root path, serve index.html
  if (pathname === '/') {
    pathname = '/index.html';
  }
  
  console.log(`${new Date().toISOString()} "${req.method} ${req.url}" -> "${pathname}"`);
  
  const filePath = path.join(__dirname, 'public', pathname);
  
  // Security check - ensure path is within public directory
  const normalizedPath = path.normalize(filePath);
  const publicPath = path.join(__dirname, 'public');
  
  if (!normalizedPath.startsWith(publicPath)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }
  
  // Check if file exists
  fs.stat(normalizedPath, (err, stats) => {
    if (err) {
      // File not found
      console.log(`   ❌ 404: ${normalizedPath}`);
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }
    
    if (!stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }
    
    // Get file extension and corresponding MIME type
    const ext = path.extname(normalizedPath).toLowerCase();
    const mimeType = mimeTypes[ext] || 'application/octet-stream';
    
    // Set cache headers for images
    const headers = { 'Content-Type': mimeType };
    if (ext.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/)) {
      headers['Cache-Control'] = 'public, max-age=31536000'; // 1 year
    }
    
    // Read and serve the file
    fs.readFile(normalizedPath, (err, content) => {
      if (err) {
        console.log(`   ❌ Error reading file: ${err.message}`);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
        return;
      }
      
      res.writeHead(200, headers);
      res.end(content);
      console.log(`   ✅ 200: ${ext} (${content.length} bytes)`);
    });
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Photography website server running at http://localhost:${PORT}`);
  console.log(`📁 Serving files from: ${path.join(__dirname, 'public')}`);
  console.log('');
  console.log('🎯 Available pages:');
  console.log(`   • Gallery: http://localhost:${PORT}/`);
  console.log(`   • About: http://localhost:${PORT}/bio.html`);
  console.log('');
  console.log('📸 To update your gallery:');
  console.log('   1. Add photos to pics/ directory');
  console.log('   2. Run: npm run process-images');
  console.log('   3. Refresh your browser');
  console.log('');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});