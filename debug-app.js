#!/usr/bin/env node

/**
 * Simple Debug Script for Photo Gallery Website
 * This script:
 * 1. Creates a minimal browser environment
 * 2. Loads and runs the app.js file
 * 3. Reports any errors
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Read files
const readFile = (filePath) => {
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch (err) {
        console.error(`Error reading ${filePath}:`, err.message);
        return null;
    }
};

// Create a simple HTML template
const createHtml = () => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Photo Gallery Debug</title>
</head>
<body>
    <div id="main-nav"></div>
    <div id="gallery-container"></div>
    <footer>
        <span id="year"></span>
    </footer>
</body>
</html>
`;
};

// Create mock JSON data for gallery-config.json
const createMockGalleryConfig = () => {
    return JSON.stringify([
        {
            id: "test-gallery",
            title: "Test Gallery",
            description: "For debugging purposes",
            photoCount: 3,
            categories: [
                {
                    id: "test-category",
                    title: "Test Category",
                    photoCount: 3
                }
            ],
            updatedAt: new Date().toISOString()
        }
    ]);
};

// Create mock photo data
const createMockPhotoJson = () => {
    return JSON.stringify([
        {
            filename: "test1.jpg",
            title: "Test Photo 1",
            date: new Date().toISOString(),
            category: "test-category"
        },
        {
            filename: "test2.jpg",
            title: "Test Photo 2",
            date: new Date().toISOString(),
            category: "test-category"
        },
        {
            filename: "test3.jpg",
            title: "Test Photo 3",
            date: new Date().toISOString(),
            category: "test-category"
        }
    ]);
};

// Setup directories for testing
const setupDirectories = () => {
    const dirs = ['js', 'galleries/test-gallery'];
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
    
    // Write mock gallery config
    fs.writeFileSync('js/gallery-config.json', createMockGalleryConfig());
    
    // Write mock photos.json
    fs.writeFileSync('galleries/test-gallery/photos.json', createMockPhotoJson());
};

// Mock fetch API
const mockFetch = (url) => {
    console.log(`Mock fetch: ${url}`);
    
    let response;
    if (url === 'js/gallery-config.json') {
        response = createMockGalleryConfig();
    } else if (url === 'galleries/test-gallery/photos.json') {
        response = createMockPhotoJson();
    } else {
        return Promise.resolve({
            ok: false,
            json: () => Promise.reject(new Error(`Not found: ${url}`))
        });
    }
    
    return Promise.resolve({
        ok: true, 
        json: () => Promise.resolve(JSON.parse(response))
    });
};

// Create virtual browser environment
const createVirtualBrowser = () => {
    console.log('Setting up virtual browser environment...');
    
    // Create virtual DOM
    const dom = new JSDOM(createHtml(), {
        url: "http://localhost/",
        referrer: "http://localhost/",
        contentType: "text/html",
        includeNodeLocations: true,
        runScripts: "dangerously"
    });
    
    // Mock browser environment
    global.window = dom.window;
    global.document = dom.window.document;
    global.navigator = dom.window.navigator;
    global.fetch = mockFetch;
    
    // Mock Swiper
    global.window.Swiper = function(selector, options) {
        console.log(`Swiper initialized with selector: ${selector}`);
        this.activeIndex = 0;
        this.slideTo = function(index) { 
            console.log(`Swiper.slideTo(${index})`); 
            this.activeIndex = index;
        };
        this.destroy = function() { console.log('Swiper destroyed'); };
    };
    
    // Mock LazyLoad
    global.window.LazyLoad = function(options) {
        console.log('LazyLoad initialized');
        this.destroy = function() { console.log('LazyLoad destroyed'); };
    };
    
    // Capture console output
    const originalConsoleLog = dom.window.console.log;
    const originalConsoleError = dom.window.console.error;
    
    dom.window.console.log = (...args) => {
        console.log('[Browser]', ...args);
        originalConsoleLog.apply(dom.window.console, args);
    };
    
    dom.window.console.error = (...args) => {
        console.error('[Browser Error]', ...args);
        originalConsoleError.apply(dom.window.console, args);
    };
    
    // Capture errors
    dom.window.addEventListener('error', (event) => {
        console.error(`[JS Error] ${event.message} at ${event.filename}:${event.lineno}:${event.colno}`);
    });
    
    return dom;
};

// Load JavaScript file
const loadAndRunJs = (dom, jsPath) => {
    console.log(`Loading JavaScript file: ${jsPath}`);
    
    const jsContent = readFile(jsPath);
    if (!jsContent) return false;
    
    try {
        // Fix any process.env references by inserting a global definition
        const fixedJsContent = `
// Mock browser globals
window.process = { env: { NODE_ENV: 'development' } };

${jsContent}
`;
        
        // Create script element
        const script = dom.window.document.createElement('script');
        script.textContent = fixedJsContent;
        
        // Add to document
        dom.window.document.head.appendChild(script);
        
        console.log('JavaScript file loaded and executed');
        return true;
    } catch (err) {
        console.error('Error loading JavaScript:', err);
        return false;
    }
};

// Main function
const main = () => {
    try {
        // Setup test environment
        setupDirectories();
        
        // Create virtual browser
        const dom = createVirtualBrowser();
        
        // Load app.js
        const appJsPath = 'js/app.js';
        if (!loadAndRunJs(dom, appJsPath)) {
            console.error(`Failed to load ${appJsPath}`);
            return;
        }
        
        // Trigger DOMContentLoaded
        console.log('Triggering DOMContentLoaded event...');
        const event = dom.window.document.createEvent('Event');
        event.initEvent('DOMContentLoaded', true, true);
        dom.window.document.dispatchEvent(event);
        
        // Wait a moment and check the result
        setTimeout(() => {
            console.log('\n== DOM Content After Execution ==');
            console.log('Gallery Container:', dom.window.document.getElementById('gallery-container').innerHTML);
            console.log('Navigation:', dom.window.document.getElementById('main-nav').innerHTML);
            console.log('Year Element:', dom.window.document.getElementById('year').textContent);
            
            console.log('\n== Test Complete ==');
        }, 1000);
        
    } catch (err) {
        console.error('Test failed with error:', err);
    }
};

// Run the test
main(); 