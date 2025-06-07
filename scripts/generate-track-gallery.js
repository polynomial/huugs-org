#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const { promisify } = require('util');

// Promisify fs functions
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

class TrackGalleryGenerator {
    constructor() {
        this.trackAlbumsFile = 'track_albums';
        this.outputDir = 'public/track';
        this.outputFile = path.join(this.outputDir, 'index.html');
        this.albums = [];
    }

    async init() {
        console.log('🏃 Starting Track Gallery Generator...');
        
        try {
            // Ensure output directory exists
            await this.ensureDir(this.outputDir);
            
            // Read track albums file
            const albumUrls = await this.readTrackAlbums();
            console.log(`📖 Found ${albumUrls.length} track album URLs`);
            
            // Process each album
            for (let i = 0; i < albumUrls.length; i++) {
                const url = albumUrls[i];
                console.log(`🔍 Processing album ${i + 1}/${albumUrls.length}: ${url}`);
                const albumData = await this.fetchAlbumData(url);
                if (albumData) {
                    this.albums.push(albumData);
                }
                // Add delay to be respectful to Google's servers
                await this.delay(1000);
            }
            
            // Generate HTML page
            await this.generateTrackPage();
            
            console.log(`✅ Track gallery generated successfully!`);
            console.log(`📄 Output: ${this.outputFile}`);
            console.log(`🌐 Albums processed: ${this.albums.length}`);
            
        } catch (error) {
            console.error('❌ Error generating track gallery:', error.message);
            process.exit(1);
        }
    }

    async ensureDir(dir) {
        try {
            await mkdir(dir, { recursive: true });
        } catch (error) {
            if (error.code !== 'EEXIST') {
                throw error;
            }
        }
    }

    async readTrackAlbums() {
        try {
            const content = await readFile(this.trackAlbumsFile, 'utf8');
            return content
                .split('\n')
                .map(line => line.trim())
                .filter(line => line && line.startsWith('https://'));
        } catch (error) {
            throw new Error(`Could not read ${this.trackAlbumsFile}: ${error.message}`);
        }
    }

    async fetchAlbumData(url) {
        try {
            const html = await this.fetchUrl(url);
            const albumData = this.parseAlbumData(html, url);
            return albumData;
        } catch (error) {
            console.warn(`⚠️  Could not fetch data for ${url}: ${error.message}`);
            return this.createFallbackAlbumData(url);
        }
    }

    async fetchUrl(url) {
        return new Promise((resolve, reject) => {
            const request = https.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            }, (response) => {
                let data = '';
                
                response.on('data', (chunk) => {
                    data += chunk;
                });
                
                response.on('end', () => {
                    resolve(data);
                });
            });
            
            request.on('error', (error) => {
                reject(error);
            });
            
            request.setTimeout(10000, () => {
                request.destroy();
                reject(new Error('Request timeout'));
            });
        });
    }

    parseAlbumData(html, url) {
        // Extract title from various possible locations
        let title = this.extractTitle(html);
        
        // Extract date information
        let date = this.extractDate(html);
        
        // Extract first image for hero
        let heroImage = this.extractHeroImage(html);
        
        return {
            url,
            title: title || 'Track Meet',
            date: date || new Date().toISOString().split('T')[0],
            heroImage: heroImage || '/assets/placeholder.jpg',
            id: this.generateId(url)
        };
    }

    extractTitle(html) {
        // Try to extract title from various meta tags and elements
        const titlePatterns = [
            /<title[^>]*>([^<]+)<\/title>/i,
            /<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i,
            /<meta[^>]*name="title"[^>]*content="([^"]+)"/i,
            /<h1[^>]*>([^<]+)<\/h1>/i
        ];
        
        for (const pattern of titlePatterns) {
            const match = html.match(pattern);
            if (match && match[1]) {
                return match[1].trim();
            }
        }
        
        return null;
    }

    extractDate(html) {
        // Try to extract date from various sources
        const datePatterns = [
            /(\w+\s+\d{1,2},\s+\d{4})/g,
            /(\d{4}-\d{2}-\d{2})/g,
            /(\d{1,2}\/\d{1,2}\/\d{4})/g
        ];
        
        for (const pattern of datePatterns) {
            const matches = html.match(pattern);
            if (matches && matches[0]) {
                try {
                    const date = new Date(matches[0]);
                    if (!isNaN(date.getTime())) {
                        return date.toISOString().split('T')[0];
                    }
                } catch (e) {
                    // Continue to next pattern
                }
            }
        }
        
        return null;
    }

    extractHeroImage(html) {
        // Try to extract first image URL
        const imagePatterns = [
            /<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i,
            /<img[^>]*src="([^"]+)"/i
        ];
        
        for (const pattern of imagePatterns) {
            const match = html.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }
        
        return null;
    }

    createFallbackAlbumData(url) {
        return {
            url,
            title: 'Track Meet',
            date: new Date().toISOString().split('T')[0],
            heroImage: '/assets/placeholder.jpg',
            id: this.generateId(url)
        };
    }

    generateId(url) {
        // Extract ID from Google Photos URL
        const match = url.match(/\/([a-zA-Z0-9_-]+)$/);
        return match ? match[1] : Math.random().toString(36).substr(2, 9);
    }

    async generateTrackPage() {
        // Sort albums by date (newest first)
        this.albums.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        const html = this.generateHTML();
        await writeFile(this.outputFile, html, 'utf8');
    }

    generateHTML() {
        const albumsHTML = this.albums.map(album => `
            <div class="album-card" data-date="${album.date}">
                <div class="album-image">
                    <img src="${this.escapeHtml(album.heroImage)}" alt="${this.escapeHtml(album.title)}" 
                         onerror="this.src='/assets/placeholder.jpg'">
                </div>
                <div class="album-content">
                    <h3 class="album-title">${this.escapeHtml(album.title)}</h3>
                    <p class="album-date">${this.formatDate(album.date)}</p>
                    <a href="${this.escapeHtml(album.url)}" class="album-link" target="_blank" rel="noopener">
                        View Photos
                    </a>
                </div>
            </div>
        `).join('');

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Track & Field Gallery - Huugs Media</title>
    
    <!-- Favicon -->
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    
    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;700;900&family=Bebas+Neue&family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet">
    
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Poppins', sans-serif;
            background: linear-gradient(135deg, #1a1a1a, #2d2d2d);
            color: white;
            line-height: 1.6;
            min-height: 100vh;
        }

        .header {
            background: rgba(26, 26, 26, 0.95);
            padding: 2rem 0;
            text-align: center;
            backdrop-filter: blur(10px);
        }

        .header h1 {
            font-family: 'Bebas Neue', cursive;
            font-size: 3rem;
            color: #ff6b35;
            margin-bottom: 0.5rem;
        }

        .header p {
            font-size: 1.1rem;
            opacity: 0.8;
        }

        .nav-home {
            position: absolute;
            top: 2rem;
            left: 2rem;
        }

        .nav-home a {
            color: white;
            text-decoration: none;
            font-weight: 600;
            transition: color 0.3s ease;
        }

        .nav-home a:hover {
            color: #ff6b35;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 4rem 2rem;
        }

        .albums-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 2rem;
            margin-top: 2rem;
        }

        .album-card {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            overflow: hidden;
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .album-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            border-color: rgba(255, 107, 53, 0.3);
        }

        .album-image {
            width: 100%;
            height: 250px;
            overflow: hidden;
            position: relative;
        }

        .album-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.3s ease;
        }

        .album-card:hover .album-image img {
            transform: scale(1.05);
        }

        .album-content {
            padding: 1.5rem;
        }

        .album-title {
            font-family: 'Montserrat', sans-serif;
            font-size: 1.3rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: white;
        }

        .album-date {
            color: #ff6b35;
            font-size: 0.9rem;
            margin-bottom: 1rem;
            font-weight: 500;
        }

        .album-link {
            display: inline-block;
            background: linear-gradient(135deg, #ff6b35, #e55a2b);
            color: white;
            padding: 0.7rem 1.5rem;
            text-decoration: none;
            border-radius: 25px;
            font-weight: 600;
            transition: all 0.3s ease;
            font-size: 0.9rem;
        }

        .album-link:hover {
            background: linear-gradient(135deg, #e55a2b, #cc4e24);
            transform: translateY(-1px);
            box-shadow: 0 5px 15px rgba(255, 107, 53, 0.3);
        }

        .stats {
            text-align: center;
            margin: 2rem 0;
            padding: 2rem;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            backdrop-filter: blur(10px);
        }

        .stats h2 {
            font-family: 'Bebas Neue', cursive;
            font-size: 2rem;
            color: #ff6b35;
            margin-bottom: 1rem;
        }

        @media (max-width: 768px) {
            .header h1 {
                font-size: 2rem;
            }

            .albums-grid {
                grid-template-columns: 1fr;
                gap: 1.5rem;
            }

            .container {
                padding: 2rem 1rem;
            }

            .nav-home {
                position: static;
                text-align: center;
                margin-bottom: 1rem;
            }
        }

        .empty-state {
            text-align: center;
            padding: 4rem 2rem;
            opacity: 0.7;
        }

        .empty-state h2 {
            font-size: 1.5rem;
            margin-bottom: 1rem;
            color: #ff6b35;
        }
    </style>
</head>
<body>
    <div class="nav-home">
        <a href="/">&larr; Back to Home</a>
    </div>

    <div class="header">
        <h1>Track & Field Gallery</h1>
        <p>Capturing the speed, power, and grace of track and field competition</p>
    </div>

    <div class="container">
        <div class="stats">
            <h2>Track Meet Collection</h2>
            <p>${this.albums.length} photo album${this.albums.length !== 1 ? 's' : ''} from track and field events</p>
        </div>

        ${this.albums.length > 0 ? `
        <div class="albums-grid">
            ${albumsHTML}
        </div>
        ` : `
        <div class="empty-state">
            <h2>No Albums Yet</h2>
            <p>Track meet albums will appear here as they are added to the collection.</p>
        </div>
        `}
    </div>

    <script>
        // Add any interactive features here
        console.log('Track Gallery loaded with ${this.albums.length} albums');
    </script>
</body>
</html>`;
    }

    escapeHtml(text) {
        const div = { innerHTML: text };
        return div.innerHTML
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    formatDate(dateStr) {
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (e) {
            return dateStr;
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Run the generator
if (require.main === module) {
    const generator = new TrackGalleryGenerator();
    generator.init();
}

module.exports = TrackGalleryGenerator; 