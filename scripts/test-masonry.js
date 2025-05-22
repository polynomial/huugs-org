const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;

async function testMasonryLayout() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    // Test different viewport sizes
    const viewports = [
        { width: 1920, height: 1080 }, // Desktop
        { width: 1366, height: 768 },  // Laptop
        { width: 768, height: 1024 },  // Tablet
        { width: 375, height: 812 }    // Mobile
    ];

    // Use a real event page URL
    const testUrl = 'http://localhost:3000/?genre=events&event=saturday_market';

    console.log('Starting Masonry layout tests...');

    for (const viewport of viewports) {
        console.log(`\nTesting viewport: ${viewport.width}x${viewport.height}`);
        await page.setViewport(viewport);

        // Load the event page
        await page.goto(testUrl, { waitUntil: 'networkidle0' });

        // Wait for images to load
        await page.waitForSelector('.photo-item img', { timeout: 10000 });

        // Take screenshot (viewport only, not fullPage)
        const screenshotPath = path.join('test-results', `masonry-${viewport.width}x${viewport.height}.png`);
        await page.screenshot({ path: screenshotPath });

        // Check if Masonry is working
        const masonryWorking = await page.evaluate(() => {
            const items = document.querySelectorAll('.photo-item');
            if (items.length === 0) return false;

            // Check if items are positioned correctly (no overlapping)
            const positions = Array.from(items).map(item => {
                const rect = item.getBoundingClientRect();
                return {
                    top: rect.top,
                    left: rect.left,
                    right: rect.right,
                    bottom: rect.bottom
                };
            });

            // Check for overlaps
            for (let i = 0; i < positions.length; i++) {
                for (let j = i + 1; j < positions.length; j++) {
                    const a = positions[i];
                    const b = positions[j];
                    
                    if (!(a.bottom <= b.top || 
                          a.top >= b.bottom || 
                          a.right <= b.left || 
                          a.left >= b.right)) {
                        return false;
                    }
                }
            }

            return true;
        });

        console.log(`Masonry layout ${masonryWorking ? 'working' : 'not working'} at ${viewport.width}x${viewport.height}`);
        
        // Check image loading
        const imagesLoaded = await page.evaluate(() => {
            const images = document.querySelectorAll('.photo-item img');
            return Array.from(images).every(img => img.complete && img.naturalHeight !== 0);
        });

        console.log(`Images ${imagesLoaded ? 'loaded' : 'not loaded'} correctly`);

        // Check responsive behavior
        const columnCount = await page.evaluate(() => {
            const items = document.querySelectorAll('.photo-item');
            if (items.length === 0) return 0;

            const firstItem = items[0];
            const containerWidth = firstItem.parentElement.clientWidth;
            const itemWidth = firstItem.clientWidth;
            return Math.floor(containerWidth / itemWidth);
        });

        console.log(`Column count: ${columnCount}`);
    }

    await browser.close();
    console.log('\nMasonry layout tests completed!');
}

// Create test-results directory if it doesn't exist
async function ensureTestResultsDir() {
    try {
        await fs.mkdir('test-results', { recursive: true });
    } catch (error) {
        if (error.code !== 'EEXIST') {
            throw error;
        }
    }
}

// Run the tests
async function main() {
    try {
        await ensureTestResultsDir();
        await testMasonryLayout();
    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

main(); 