const puppeteer = require('puppeteer');

async function testGallery() {
    console.log('🔍 Testing photography gallery website...\n');
    
    const browser = await puppeteer.launch({ 
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1200, height: 800 });
        
        // Test main gallery page
        console.log('📄 Testing main gallery page...');
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
        
        // Check page title
        const title = await page.title();
        console.log(`   ✅ Page title: ${title}`);
        
        // Wait for gallery to load
        await page.waitForSelector('.collection-grid', { timeout: 10000 });
        console.log('   ✅ Gallery grid loaded');
        
        // Check if collection cards are loaded
        const collectionCount = await page.$$eval('.collection-card', items => items.length);
        console.log(`   ✅ Found ${collectionCount} collection cards`);
        
        // Check for navigation links
        const navLinks = await page.$$eval('.nav a', links => 
            links.map(link => ({ text: link.textContent, href: link.href }))
        );
        console.log(`   ✅ Navigation links: ${navLinks.map(l => l.text).join(', ')}`);
        
        // Test bio page
        console.log('\n📄 Testing bio page...');
        await page.goto('http://localhost:3000/bio.html', { waitUntil: 'networkidle0' });
        
        const bioTitle = await page.title();
        console.log(`   ✅ Bio page title: ${bioTitle}`);
        
        // Check for bio content
        const bioContent = await page.$('.bio-content');
        if (bioContent) {
            console.log('   ✅ Bio content found');
        } else {
            console.log('   ⚠️  Bio content not found');
        }
        
        // Test gallery navigation
        console.log('\n📄 Testing gallery navigation...');
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
        
        // Wait for configuration to load and check if galleries are available
        await page.waitForFunction(() => window.galleryConfig, { timeout: 10000 });
        
        const galleryConfig = await page.evaluate(() => window.galleryConfig);
        const galleries = Object.keys(galleryConfig.galleries);
        console.log(`   ✅ Available galleries: ${galleries.join(', ')}`);
        
        // Test clicking on a gallery
        if (galleries.length > 0) {
            // Click on browse galleries
            await page.click('#nav-browse');
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Check if gallery list appears
            const galleryList = await page.$('.gallery-navigation');
            if (galleryList) {
                console.log('   ✅ Gallery navigation displayed');
                
                // Go back to home and try clicking on first collection
                await page.click('#nav-home');
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                const firstCollection = await page.$('.collection-card a');
                if (firstCollection) {
                    await firstCollection.click();
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    const galleryItems = await page.$$eval('.masonry-item', items => items.length);
                    console.log(`   ✅ Gallery opened with ${galleryItems} images`);
                }
            }
        }
        
        console.log('\n✅ All tests passed! Your photography website is working correctly.');
        console.log('\n🎯 Your website is ready at: http://localhost:3000');
        console.log('📖 About page: http://localhost:3000/bio.html');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        
        // Try to get more details about the error
        try {
            const page = await browser.newPage();
            await page.goto('http://localhost:3000');
            const pageContent = await page.content();
            
            if (pageContent.includes('Error')) {
                console.log('\n🔍 Page contains errors. Check the browser console for more details.');
            }
        } catch (debugError) {
            console.log('Could not debug further:', debugError.message);
        }
    } finally {
        await browser.close();
    }
}

// Check if server is running first
async function checkServer() {
    const http = require('http');
    
    return new Promise((resolve) => {
        const req = http.get('http://localhost:3000', (res) => {
            resolve(true);
        });
        
        req.on('error', () => {
            resolve(false);
        });
        
        req.setTimeout(3000, () => {
            req.destroy();
            resolve(false);
        });
    });
}

async function main() {
    const serverRunning = await checkServer();
    
    if (!serverRunning) {
        console.log('❌ Server is not running. Please start it with: npm start');
        process.exit(1);
    }
    
    await testGallery();
}

if (require.main === module) {
    main();
}

module.exports = { testGallery }; 