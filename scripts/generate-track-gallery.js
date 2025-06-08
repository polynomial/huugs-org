#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const { promisify } = require('util');

// Check if puppeteer is available, fall back to simple HTTP if not
let puppeteer;
try {
    puppeteer = require('puppeteer');
} catch (e) {
    console.log('⚠️  Puppeteer not available, falling back to simple HTTP scraping');
}

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
            let albumData;
            
            if (puppeteer && process.env.PUPPETEER_EXECUTABLE_PATH) {
                albumData = await this.fetchAlbumDataWithPuppeteer(url);
            } else {
                console.log(`   📄 Using fallback HTTP scraping for ${url}`);
                const html = await this.fetchUrl(url);
                albumData = this.parseAlbumData(html, url);
            }
            
            return albumData;
        } catch (error) {
            console.warn(`⚠️  Could not fetch data for ${url}: ${error.message}`);
            return this.createFallbackAlbumData(url);
        }
    }

    async fetchAlbumDataWithPuppeteer(url) {
        let browser;
        try {
            browser = await puppeteer.launch({
                headless: true,
                executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu'
                ]
            });

            const page = await browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
            
            console.log(`   🌐 Loading page: ${url}`);
            await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

            // Wait for content to load and try to trigger photo loading
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Scroll down to trigger lazy loading of photos
            await page.evaluate(() => {
                window.scrollTo(0, 500);
            });
            
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Try to extract album title
            const title = await page.evaluate(() => {
                // Try various selectors for the album title
                const selectors = [
                    'h1',
                    '[data-test-id="album-title"]',
                    '.VfPpkd-LgbsSe',
                    '.album-title',
                    'title'
                ];
                
                for (const selector of selectors) {
                    const element = document.querySelector(selector);
                    if (element && element.textContent && element.textContent.trim()) {
                        return element.textContent.trim();
                    }
                }
                
                // Check document title
                if (document.title) {
                    return document.title.replace(/ - Google Photos$/, '').trim();
                }
                
                return null;
            });

            // Try to extract date information
            const date = await page.evaluate(() => {
                // Look for date patterns in the page
                const text = document.body.innerText;
                const datePatterns = [
                    /(\w+\s+\d{1,2},\s+\d{4})/g,
                    /(\d{4}-\d{2}-\d{2})/g,
                    /(\d{1,2}\/\d{1,2}\/\d{4})/g
                ];
                
                for (const pattern of datePatterns) {
                    const matches = text.match(pattern);
                    if (matches && matches[0]) {
                        try {
                            const testDate = new Date(matches[0]);
                            if (!isNaN(testDate.getTime()) && testDate.getFullYear() > 2020) {
                                return testDate.toISOString().split('T')[0];
                            }
                        } catch (e) {
                            // Continue
                        }
                    }
                }
                return null;
            });

            console.log(`   📝 Extracted - Title: "${title}", Date: "${date}"`);

            return {
                url,
                title: title || 'Track Meet',
                date: date || new Date().toISOString().split('T')[0],
                id: this.generateId(url)
            };

        } catch (error) {
            console.warn(`   ❌ Puppeteer failed for ${url}: ${error.message}`);
            throw error;
        } finally {
            if (browser) {
                await browser.close();
            }
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
            <div class="album-item" data-date="${album.date}">
                <div class="album-info">
                    <h3 class="album-title">${this.escapeHtml(album.title)}</h3>
                    <p class="album-date">${this.formatDate(album.date)}</p>
                </div>
                <a href="${this.escapeHtml(album.url)}" class="album-link" target="_blank" rel="noopener">
                    View Photos →
                </a>
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
            display: flex;
            flex-direction: column;
            gap: 1rem;
            margin-top: 2rem;
        }

        .album-item {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            padding: 1.5rem 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .album-item:hover {
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(255, 107, 53, 0.3);
            transform: translateX(10px);
        }

        .album-info {
            flex: 1;
        }

        .album-title {
            font-family: 'Montserrat', sans-serif;
            font-size: 1.3rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: white;
            margin: 0;
        }

        .album-date {
            color: rgba(255, 255, 255, 0.7);
            font-size: 0.9rem;
            font-weight: 400;
            margin: 0.25rem 0 0 0;
        }

        .album-link {
            background: linear-gradient(135deg, #ff6b35, #e55a2b);
            color: white;
            padding: 0.8rem 1.5rem;
            text-decoration: none;
            border-radius: 25px;
            font-weight: 600;
            transition: all 0.3s ease;
            font-size: 0.9rem;
            white-space: nowrap;
        }

        .album-link:hover {
            background: linear-gradient(135deg, #e55a2b, #cc4e24);
            transform: scale(1.05);
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

            .album-item {
                flex-direction: column;
                align-items: flex-start;
                gap: 1rem;
                padding: 1.5rem;
            }

            .album-item:hover {
                transform: none;
            }

            .album-link {
                align-self: flex-end;
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