const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;

async function waitForServer(url, maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                console.log('Server is ready!');
                return true;
            }
        } catch (error) {
            console.log(`Waiting for server... (${i + 1}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    throw new Error('Server failed to start within timeout period');
}

async function testMasonryLayout() {
    console.log('Starting Masonry layout test...');
    
    // Wait for server to be ready
    await waitForServer('http://localhost:3000');
    
    // Launch browser with no-sandbox for CI environments
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: 'new'
    });
    
    try {
        const page = await browser.newPage();
        
        // Set viewport to a reasonable size
        await page.setViewport({ width: 1200, height: 800 });
        
        // Navigate to the site
        console.log('Navigating to site...');
        await page.goto('http://localhost:3000/?genre=events&event=saturday_market', {
            waitUntil: 'networkidle0',
            timeout: 30000
        });
        
        // Wait for images to load
        console.log('Waiting for images to load...');
        await page.waitForSelector('.photo-item img', { timeout: 30000 });
        
        // Take a screenshot of the viewport
        console.log('Taking screenshot...');
        await page.screenshot({ 
            path: 'masonry-test.png',
            fullPage: false // Only capture viewport
        });
        
        // Test different viewport sizes
        const viewports = [
            { width: 1920, height: 1080, name: 'desktop' },
            { width: 1366, height: 768, name: 'laptop' },
            { width: 768, height: 1024, name: 'tablet' },
            { width: 375, height: 667, name: 'mobile' }
        ];
        
        for (const viewport of viewports) {
            console.log(`Testing ${viewport.name} layout...`);
            await page.setViewport(viewport);
            await new Promise(r => setTimeout(r, 1000));
            
            // Take screenshot for this viewport
            await page.screenshot({
                path: `masonry-test-${viewport.name}.png`,
                fullPage: false
            });
            
            // Get column count
            const columnCount = await page.evaluate(() => {
                const items = document.querySelectorAll('.photo-item');
                if (items.length === 0) return 0;
                
                const firstItem = items[0];
                const firstItemLeft = firstItem.getBoundingClientRect().left;
                let columns = 1;
                
                for (let i = 1; i < items.length; i++) {
                    const item = items[i];
                    const itemLeft = item.getBoundingClientRect().left;
                    if (Math.abs(itemLeft - firstItemLeft) < 5) {
                        columns++;
                    }
                }
                
                return columns;
            });
            
            console.log(`${viewport.name} layout has ${columnCount} columns`);
        }
        
        console.log('Masonry layout test completed successfully!');
    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    } finally {
        await browser.close();
    }
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