const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

/**
 * Test suite for gallery functionality
 */
async function runTests() {
  console.log('Running gallery tests...\n');
  
  const tests = [
    testGalleryConfig,
    testImagePaths,
    testDirectoryStructure,
    testGallery
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      await test();
      console.log(`✓ ${test.name} passed`);
      passed++;
    } catch (error) {
      console.error(`✗ ${test.name} failed:`, error.message);
      failed++;
    }
  }
  
  console.log(`\nTest Summary: ${passed} passed, ${failed} failed`);
}

/**
 * Test gallery configuration file
 */
async function testGalleryConfig() {
  const configPath = path.join('public', 'js', 'gallery-config.json');
  const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
  
  // Test basic structure
  if (!config.galleries) {
    throw new Error('Gallery config missing galleries object');
  }
  
  // Test events gallery
  const eventsGallery = config.galleries.events;
  if (!eventsGallery) {
    throw new Error('Events gallery not found in config');
  }
  
  // Test saturday_market event
  const saturdayMarket = eventsGallery.events.saturday_market;
  if (!saturdayMarket) {
    throw new Error('Saturday market event not found in config');
  }
  
  // Test photos array
  if (!Array.isArray(saturdayMarket.photos) || saturdayMarket.photos.length === 0) {
    throw new Error('No photos found in Saturday market event');
  }
  
  // Test first photo structure
  const firstPhoto = saturdayMarket.photos[0];
  if (!firstPhoto.thumbnail || !firstPhoto.medium || !firstPhoto.original) {
    throw new Error('Photo object missing required properties');
  }
}

/**
 * Test image paths and files
 */
async function testImagePaths() {
  const configPath = path.join('public', 'js', 'gallery-config.json');
  const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
  
  // Get first photo from Saturday market
  const firstPhoto = config.galleries.events.events.saturday_market.photos[0];
  
  // Test thumbnail path
  const thumbnailPath = path.join('public', firstPhoto.thumbnail);
  try {
    await fs.access(thumbnailPath);
  } catch (error) {
    throw new Error(`Thumbnail not found: ${thumbnailPath}`);
  }
  
  // Test medium path
  const mediumPath = path.join('public', firstPhoto.medium);
  try {
    await fs.access(mediumPath);
  } catch (error) {
    throw new Error(`Medium image not found: ${mediumPath}`);
  }
}

/**
 * Test directory structure
 */
async function testDirectoryStructure() {
  const requiredDirs = [
    'public/images',
    'public/images/thumbnails',
    'public/images/medium',
    'public/images/original'
  ];
  
  for (const dir of requiredDirs) {
    try {
      await fs.access(dir);
    } catch (error) {
      throw new Error(`Required directory not found: ${dir}`);
    }
  }
  
  // Test that thumbnails directory has content
  const thumbnailDir = path.join('public', 'images', 'thumbnails', 'events', 'saturday_market');
  const files = await fs.readdir(thumbnailDir);
  if (files.length === 0) {
    throw new Error('No thumbnail files found in Saturday market directory');
  }
}

async function testGallery() {
    console.log('Starting gallery test...');
    
    // Read the gallery config
    const configPath = './public/js/gallery-config.json';
    const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
    console.log('Gallery config loaded:', {
        totalImages: config.stats.processedImages,
        failedImages: config.stats.failedImages,
        galleries: Object.keys(config.galleries)
    });

    // Launch browser
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Enable request interception
    await page.setRequestInterception(true);
    const requests = [];
    page.on('request', request => {
        requests.push({
            url: request.url(),
            resourceType: request.resourceType()
        });
        request.continue();
    });

    // Load the page
    console.log('Loading page...');
    await page.goto('http://localhost:3000/?genre=events&event=saturday_market', {
        waitUntil: 'networkidle0',
        timeout: 30000
    });

    // Get all image elements
    const images = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('img')).map(img => ({
            src: img.src,
            alt: img.alt,
            width: img.width,
            height: img.height
        }));
    });

    console.log('\nFound images in DOM:', images.length);
    images.forEach(img => console.log(`- ${img.src} (${img.width}x${img.height})`));

    // Get all network requests
    const imageRequests = requests.filter(r => r.resourceType === 'image');
    console.log('\nImage requests made:', imageRequests.length);
    imageRequests.forEach(req => console.log(`- ${req.url}`));

    // Check if images match config
    const configImages = config.galleries.events.events.saturday_market.photos;
    console.log('\nImages in config:', configImages.length);
    configImages.forEach(img => console.log(`- ${img.thumbnail}`));

    // Check for errors
    const errors = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('img'))
            .filter(img => !img.complete || img.naturalHeight === 0)
            .map(img => img.src);
    });

    if (errors.length > 0) {
        console.log('\nFailed to load images:', errors);
    }

    await browser.close();
}

// Run the tests
runTests().catch(console.error); 