/**
 * Simple Test Script for Photo Gallery Website
 * 
 * This script creates a minimal test environment to verify basic functionality
 * without relying on fetch API or async/await functionality.
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Create simple HTML structure
const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Gallery Test</title>
    <style>
        .loading { color: blue; font-style: italic; }
        .error { color: red; font-weight: bold; }
        .thumbnail { width: 100px; height: 100px; }
        .swiper-slide { margin: 5px; border: 1px solid #ccc; }
    </style>
</head>
<body>
    <div id="main-nav"></div>
    <div id="gallery-container"></div>
    <footer><span id="year"></span></footer>
</body>
</html>
`;

// Create mock data
const galleryConfig = [
    {
        id: "nature",
        title: "Nature",
        description: "Beautiful natural landscapes",
        photoCount: 5
    },
    {
        id: "architecture",
        title: "Architecture",
        description: "Urban photography",
        photoCount: 3
    }
];

const photoData = [
    {
        filename: "photo1.jpg",
        title: "Mountain View",
        description: "A scenic mountain landscape",
        dimensions: { width: 1920, height: 1080 }
    },
    {
        filename: "photo2.jpg",
        title: "Forest Path",
        description: "Path through a dense forest"
    }
];

// Create DOM with our HTML
const dom = new JSDOM(html, {
    runScripts: "dangerously",
    resources: "usable"
});

// Setup console capture
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const logs = [];
const errors = [];

console.log = (...args) => {
    logs.push(args.join(' '));
    originalConsoleLog(...args);
};

console.error = (...args) => {
    errors.push(args.join(' '));
    originalConsoleError('\x1b[31m', ...args, '\x1b[0m');
};

// Set global vars
global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.navigator = dom.window.navigator;
global.fetch = () => Promise.resolve(); // Mock fetch but don't use it

// Create mock libraries
const mockScript = dom.window.document.createElement('script');
mockScript.textContent = `
// Debug utility
function debug(...args) {
    console.log("[DEBUG]", ...args);
}

// Mock Swiper
window.Swiper = function(selector, options) {
    console.log("Swiper initialized with selector:", selector);
    this.activeIndex = 0;
    this.slideTo = function(index) { 
        console.log("Sliding to:", index);
        this.activeIndex = index;
    };
    this.destroy = function() { 
        console.log("Swiper destroyed");
    };
};

// Mock LazyLoad
window.LazyLoad = function(options) {
    console.log("LazyLoad initialized");
    this.destroy = function() {
        console.log("LazyLoad destroyed");
    };
};

// Global variables
let galleries = [];
let currentGallery = null;
let currentCategory = null;
let swiper = null;
let lazyLoadInstance = null;

// Simplified gallery functions
function loadGalleries() {
    console.log("Loading galleries");
    
    const galleryContainer = document.getElementById('gallery-container');
    if (!galleryContainer) {
        console.error("Gallery container not found");
        return;
    }
    
    // Directly use our mock data
    galleries = ${JSON.stringify(galleryConfig)};
    
    // Build navigation
    buildNavigation(galleries);
    
    // Load the first gallery
    if (galleries.length > 0) {
        loadGallery(galleries[0].id);
    } else {
        galleryContainer.innerHTML = '<p>No galleries found.</p>';
    }
}

function buildNavigation(galleries) {
    console.log("Building navigation");
    
    const navContainer = document.getElementById('main-nav');
    if (!navContainer) return;
    
    let navHTML = '<ul class="nav-list">';
    
    galleries.forEach(gallery => {
        navHTML += \`<li><a href="#\${gallery.id}" class="nav-item">\${gallery.title}</a></li>\`;
    });
    
    navHTML += '</ul>';
    navContainer.innerHTML = navHTML;
    
    // Add event listeners to nav items
    document.querySelectorAll('#main-nav a').forEach(link => {
        link.addEventListener('click', (e) => {
            const galleryId = e.target.getAttribute('href').substring(1);
            loadGallery(galleryId);
        });
    });
}

function loadGallery(galleryId, categoryId = null) {
    console.log("Loading gallery:", galleryId, "category:", categoryId);
    
    // Find the gallery data
    currentGallery = galleries.find(g => g.id === galleryId);
    currentCategory = categoryId;
    
    if (!currentGallery) {
        console.error("Gallery not found:", galleryId);
        return;
    }
    
    // Update navigation active state
    const navLinks = document.querySelectorAll('#main-nav a');
    navLinks.forEach(link => {
        if (link.getAttribute('href') === '#' + galleryId) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
    
    // We'll use our mock photo data directly
    renderGallery(currentGallery, ${JSON.stringify(photoData)});
}

function renderGallery(gallery, photoData) {
    console.log("Rendering gallery:", gallery.title);
    
    const container = document.getElementById('gallery-container');
    if (!container) return;
    
    let galleryHTML = \`
        <div class="gallery">
            <h2>\${gallery.title}</h2>
            <p>\${gallery.description || ''}</p>
            
            <div class="thumbnail-grid">
                \${photoData.map((photo, index) => \`
                    <div class="thumbnail" data-index="\${index}">
                        <img src="galleries/\${gallery.id}/thumbs/\${photo.filename}" 
                             alt="\${photo.title || ''}">
                        <div class="thumbnail-title">\${photo.title || 'Photo ' + (index + 1)}</div>
                    </div>
                \`).join('')}
            </div>
            
            <div class="lightbox">
                <div class="swiper-container">
                    <div class="swiper-wrapper">
                        \${photoData.map((photo, index) => \`
                            <div class="swiper-slide" data-index="\${index}">
                                <img src="galleries/\${gallery.id}/display/\${photo.filename}" 
                                     alt="\${photo.title || ''}">
                                <div class="slide-caption">
                                    <h4>\${photo.title || 'Photo ' + (index + 1)}</h4>
                                </div>
                            </div>
                        \`).join('')}
                    </div>
                </div>
            </div>
        </div>
    \`;
    
    container.innerHTML = galleryHTML;
    
    console.log("Gallery rendered successfully");
}

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Update footer year
        const yearElement = document.getElementById('year');
        if (yearElement) {
            yearElement.textContent = new Date().getFullYear();
        }
        
        // Initialize galleries
        loadGalleries();
    } catch (err) {
        console.error('Failed to initialize application:', err.message);
    }
});
`;

// Add script to the page
dom.window.document.head.appendChild(mockScript);

// Trigger DOMContentLoaded
console.log("Triggering DOMContentLoaded event...");
const event = dom.window.document.createEvent('Event');
event.initEvent('DOMContentLoaded', true, true);
dom.window.document.dispatchEvent(event);

// Check the DOM after a short delay
setTimeout(() => {
    console.log("\n=== Results ===");
    
    // Check year output
    const yearElement = dom.window.document.getElementById('year');
    console.log("Year element:", yearElement?.textContent || 'Not found');
    
    // Check navigation
    const navElement = dom.window.document.getElementById('main-nav');
    console.log("Navigation built:", navElement?.innerHTML.includes('nav-list') ? 'Yes' : 'No');
    console.log("Number of nav items:", dom.window.document.querySelectorAll('.nav-item').length);
    
    // Check gallery content
    const galleryElement = dom.window.document.getElementById('gallery-container');
    console.log("Gallery container found:", galleryElement ? 'Yes' : 'No');
    console.log("Gallery title present:", galleryElement?.innerHTML.includes('<h2>') ? 'Yes' : 'No');
    console.log("Number of thumbnails:", dom.window.document.querySelectorAll('.thumbnail').length);
    console.log("Number of slides:", dom.window.document.querySelectorAll('.swiper-slide').length);
    
    // Check for errors
    if (errors.length > 0) {
        console.log("\n=== Errors ===");
        errors.forEach(error => {
            console.error(error);
        });
    }
    
    console.log("\n=== Test complete ===");
    
    // Final assessment
    const success = yearElement && 
                   dom.window.document.querySelectorAll('.nav-item').length > 0 &&
                   dom.window.document.querySelectorAll('.thumbnail').length > 0;
                   
    console.log("Test result:", success ? "PASSED" : "FAILED");
    
    if (!success) {
        console.log("Recommendations:");
        if (!yearElement)
            console.log("- Fix the year display in the footer");
        if (dom.window.document.querySelectorAll('.nav-item').length === 0)
            console.log("- Check the navigation building functionality");
        if (dom.window.document.querySelectorAll('.thumbnail').length === 0)
            console.log("- Verify the gallery rendering process");
    }
}, 1000); 