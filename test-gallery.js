/**
 * Gallery Website Testing Script
 * 
 * A more comprehensive test script that thoroughly checks the functionality
 * of the photo gallery website by creating a virtual browser environment.
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Test configuration
const CONFIG = {
  expectedFiles: [
    'index.html',
    'css/style.css',
    'js/app.js',
    'js/gallery-config.json'
  ],
  waitTime: 1000 // Time to wait for async operations in ms
};

// Test results tracking
const results = {
  passed: [],
  failed: [],
  warnings: []
};

/**
 * Run all tests
 */
async function runTests() {
  console.log('Starting gallery website tests...\n');
  
  try {
    // Create DOM environment with HTML from index.html
    const html = fs.existsSync('../index.html') 
      ? fs.readFileSync('../index.html', 'utf8')
      : '<html><body><div id="gallery-container"></div><div id="main-nav"></div></body></html>';
      
    // Setup DOM environment
    const dom = setupDomEnvironment(html);
    
    // Run tests
    await testRequiredFiles();
    await testGalleryConfig();
    await testDomElements(dom);
    
    // Report results
    reportResults();
    
  } catch (error) {
    console.error('Test execution failed:', error);
    process.exit(1);
  }
}

/**
 * Setup JSDOM environment with mocks
 */
function setupDomEnvironment(html) {
  // Create DOM with provided HTML
  const dom = new JSDOM(html, {
    url: "http://localhost/",
    contentType: "text/html",
    includeNodeLocations: true,
    runScripts: "dangerously",
    resources: "usable"
  });
  
  // Setup global objects
  global.window = dom.window;
  global.document = dom.window.document;
  global.navigator = dom.window.navigator;
  global.HTMLElement = dom.window.HTMLElement;
  
  // Mock fetch API
  dom.window.fetch = async (url) => {
    console.log(`Mock fetch: ${url}`);
    
    // Check if the file exists and return appropriate response
    if (url.includes('gallery-config.json')) {
      const configPath = path.join(__dirname, '..', 'js', 'gallery-config.json');
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf8');
        return {
          ok: true,
          json: async () => JSON.parse(content)
        };
      }
    } else if (url.includes('photos.json')) {
      // Return mock photo data
      return {
        ok: true,
        json: async () => [{
          filename: "test.jpg",
          title: "Test Photo",
          description: "Test description"
        }]
      };
    }
    
    // Default response for unknown URLs
    return { 
      ok: false,
      status: 404,
      statusText: 'Not Found'
    };
  };
  
  // Mock Swiper
  dom.window.Swiper = class Swiper {
    constructor(element, options) {
      this.element = element;
      this.options = options;
      this.slides = [];
      this.activeIndex = 0;
    }
    
    slideTo(index) {
      this.activeIndex = index;
    }
    
    destroy() {}
  };
  
  // Mock LazyLoad
  dom.window.LazyLoad = class LazyLoad {
    constructor(options) {
      this.options = options;
    }
    
    destroy() {}
  };
  
  return dom;
}

/**
 * Test if all required files exist
 */
async function testRequiredFiles() {
  console.log('Testing required files...');
  
  for (const filePath of CONFIG.expectedFiles) {
    const fullPath = path.join(__dirname, '..', filePath);
    
    if (fs.existsSync(fullPath)) {
      results.passed.push(`File exists: ${filePath}`);
    } else {
      results.failed.push(`Missing required file: ${filePath}`);
    }
  }
}

/**
 * Test gallery configuration
 */
async function testGalleryConfig() {
  console.log('Testing gallery configuration...');
  
  const configPath = path.join(__dirname, '..', 'js', 'gallery-config.json');
  
  if (!fs.existsSync(configPath)) {
    results.failed.push('Gallery config file not found');
    return;
  }
  
  try {
    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configContent);
    
    if (!Array.isArray(config)) {
      results.failed.push('Gallery config is not an array');
      return;
    }
    
    results.passed.push(`Gallery config contains ${config.length} galleries`);
    
    // Test each gallery entry
    config.forEach((gallery, index) => {
      if (!gallery.id) {
        results.failed.push(`Gallery at index ${index} is missing 'id' property`);
      }
      
      if (!gallery.title) {
        results.warnings.push(`Gallery '${gallery.id}' is missing 'title' property`);
      }
      
      // Check if gallery folder exists
      const galleryPath = path.join(__dirname, '..', 'galleries', gallery.id);
      if (!fs.existsSync(galleryPath)) {
        results.warnings.push(`Gallery folder not found: galleries/${gallery.id}`);
      }
    });
    
  } catch (error) {
    results.failed.push(`Failed to parse gallery config: ${error.message}`);
  }
}

/**
 * Test DOM elements and structure
 */
async function testDomElements(dom) {
  console.log('Testing DOM elements...');
  
  // Test essential containers
  const containers = [
    { id: 'gallery-container', name: 'Gallery container' },
    { id: 'main-nav', name: 'Navigation container' }
  ];
  
  containers.forEach(container => {
    const element = dom.window.document.getElementById(container.id);
    if (element) {
      results.passed.push(`${container.name} found in DOM`);
    } else {
      results.failed.push(`${container.name} not found in DOM`);
    }
  });
  
  // Check meta tags
  const metaTags = dom.window.document.querySelectorAll('meta');
  if (metaTags.length > 0) {
    results.passed.push(`Found ${metaTags.length} meta tags`);
    
    // Check for viewport meta tag
    const viewportTag = Array.from(metaTags).find(tag => 
      tag.getAttribute('name') === 'viewport');
      
    if (!viewportTag) {
      results.warnings.push('No viewport meta tag found, mobile display may be affected');
    }
  } else {
    results.warnings.push('No meta tags found');
  }
  
  // Check for CSS links
  const cssLinks = dom.window.document.querySelectorAll('link[rel="stylesheet"]');
  if (cssLinks.length > 0) {
    results.passed.push(`Found ${cssLinks.length} CSS stylesheet links`);
  } else {
    results.warnings.push('No CSS stylesheet links found');
  }
  
  // Check for JavaScript includes
  const scripts = dom.window.document.querySelectorAll('script');
  if (scripts.length > 0) {
    results.passed.push(`Found ${scripts.length} script tags`);
    
    // Check for app.js
    const appScript = Array.from(scripts).find(script => 
      script.getAttribute('src')?.includes('app.js'));
      
    if (!appScript) {
      results.warnings.push('app.js script not found in HTML');
    }
  } else {
    results.failed.push('No script tags found');
  }
  
  // Additional checks can be added here
}

/**
 * Report test results
 */
function reportResults() {
  console.log('\n==================================');
  console.log('         TEST RESULTS             ');
  console.log('==================================\n');
  
  console.log(`PASSED: ${results.passed.length} tests`);
  results.passed.forEach((msg, i) => console.log(`  ${i+1}. ✅ ${msg}`));
  
  if (results.warnings.length > 0) {
    console.log(`\nWARNINGS: ${results.warnings.length}`);
    results.warnings.forEach((msg, i) => console.log(`  ${i+1}. ⚠️  ${msg}`));
  }
  
  if (results.failed.length > 0) {
    console.log(`\nFAILED: ${results.failed.length} tests`);
    results.failed.forEach((msg, i) => console.log(`  ${i+1}. ❌ ${msg}`));
    process.exit(1);
  }
  
  console.log('\nAll tests completed successfully!');
}

// Run all tests
runTests().catch(err => {
  console.error('Test failure:', err);
  process.exit(1);
}); 