#!/usr/bin/env node

/**
 * Complete Photo Gallery Auto-Test
 * 
 * This script:
 * 1. Creates sample test data
 * 2. Runs the gallery generation script
 * 3. Sets up a virtual DOM environment
 * 4. Loads and tests the website code
 * 5. Reports all errors and issues
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const { promisify } = require('util');
const { JSDOM } = require('jsdom');

// Promisified functions
const mkdirAsync = promisify(fs.mkdir);
const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);
const existsAsync = async (filePath) => fs.existsSync(filePath);

// Test configuration
const TEST_DIR = path.join(process.cwd(), 'test-gallery-env');
const SAMPLE_PICS = path.join(TEST_DIR, 'pics');
const SAMPLE_GALLERIES = ['nature', 'urban', 'portrait'];
const LOG_FILE = path.join(TEST_DIR, 'test-log.txt');
const ERROR_LOG = path.join(TEST_DIR, 'error-log.txt');

// Virtual server config
const SERVER_PORT = 8080;
let serverProcess = null;
let browsersyncProcess = null;

// Create a logger that writes to both console and log file
const log = {
    messages: [],
    errors: [],
    info: function(message) {
        const msg = `[INFO] ${message}`;
        console.log('\x1b[36m%s\x1b[0m', msg); // Cyan
        this.messages.push(msg);
    },
    success: function(message) {
        const msg = `[SUCCESS] ${message}`;
        console.log('\x1b[32m%s\x1b[0m', msg); // Green
        this.messages.push(msg);
    },
    warning: function(message) {
        const msg = `[WARNING] ${message}`;
        console.log('\x1b[33m%s\x1b[0m', msg); // Yellow
        this.messages.push(msg);
    },
    error: function(message) {
        const msg = `[ERROR] ${message}`;
        console.error('\x1b[31m%s\x1b[0m', msg); // Red
        this.messages.push(msg);
        this.errors.push(msg);
    },
    saveLog: async function() {
        try {
            await writeFileAsync(LOG_FILE, this.messages.join('\n'));
            if (this.errors.length > 0) {
                await writeFileAsync(ERROR_LOG, this.errors.join('\n'));
            }
        } catch (err) {
            console.error('Failed to save logs:', err);
        }
    }
};

// Generate a sample 1x1 pixel image in different colors
function generateSampleImage(color) {
    // Generate a 1x1 pixel JPEG
    const colorValues = {
        red: Buffer.from([
            0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
            0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
            0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
            0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
            0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
            0xff, 0xff, 0xff, 0xff, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11,
            0x00, 0xff, 0xc4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xc4, 0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xda, 0x00,
            0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0xff, 0x00, 0xff, 0xd9
        ]),
        green: Buffer.from([
            0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
            0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
            0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
            0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
            0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
            0xff, 0xff, 0xff, 0xff, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11,
            0x00, 0xff, 0xc4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xc4, 0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xda, 0x00,
            0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0x00, 0xff, 0x00, 0xff, 0xd9
        ]),
        blue: Buffer.from([
            0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
            0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
            0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
            0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
            0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
            0xff, 0xff, 0xff, 0xff, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11,
            0x00, 0xff, 0xc4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xc4, 0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xda, 0x00,
            0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0x00, 0x00, 0xff, 0xff, 0xd9
        ])
    };
    
    return colorValues[color] || colorValues.blue;
}

// Create the test environment
async function createTestEnvironment() {
    log.info('Creating test environment...');
    
    // Create test directory
    if (!await existsAsync(TEST_DIR)) {
        await mkdirAsync(TEST_DIR, { recursive: true });
    }
    
    // Create pics directory
    if (!await existsAsync(SAMPLE_PICS)) {
        await mkdirAsync(SAMPLE_PICS, { recursive: true });
    }
    
    // Create sample galleries with images
    for (const gallery of SAMPLE_GALLERIES) {
        const galleryDir = path.join(SAMPLE_PICS, gallery);
        await mkdirAsync(galleryDir, { recursive: true });
        
        // Create a few sample images in each gallery
        const colors = ['red', 'green', 'blue'];
        for (let i = 0; i < 5; i++) {
            const color = colors[i % colors.length];
            const imageData = generateSampleImage(color);
            const imagePath = path.join(galleryDir, `sample_${i + 1}.jpg`);
            await writeFileAsync(imagePath, imageData);
        }
        
        // Add a subdirectory with more images
        const subDir = path.join(galleryDir, 'sub_category');
        await mkdirAsync(subDir, { recursive: true });
        for (let i = 0; i < 3; i++) {
            const color = colors[(i + 2) % colors.length];
            const imageData = generateSampleImage(color);
            const imagePath = path.join(subDir, `sub_${i + 1}.jpg`);
            await writeFileAsync(imagePath, imageData);
        }
    }
    
    // Copy website files to test environment
    log.info('Copying website files to test environment...');
    
    // Copy required files (HTML, CSS, JS)
    try {
        const filesToCopy = [
            'index.html', 
            'favicon.svg', 
            'generate-galleries.js',
            'package.json', 
            'package-lock.json'
        ];
        
        for (const file of filesToCopy) {
            if (await existsAsync(file)) {
                const content = await readFileAsync(file);
                await writeFileAsync(path.join(TEST_DIR, file), content);
            } else {
                log.warning(`File ${file} not found, skipping`);
            }
        }
        
        // Create directories
        const dirsToCreate = ['css', 'js'];
        for (const dir of dirsToCreate) {
            await mkdirAsync(path.join(TEST_DIR, dir), { recursive: true });
            
            // Copy files from these directories
            if (await existsAsync(dir)) {
                const files = fs.readdirSync(dir);
                for (const file of files) {
                    if (fs.statSync(path.join(dir, file)).isFile()) {
                        const content = await readFileAsync(path.join(dir, file));
                        await writeFileAsync(path.join(TEST_DIR, dir, file), content);
                    }
                }
            }
        }
        
        log.success('Files copied successfully');
    } catch (err) {
        log.error(`Error copying files: ${err.message}`);
    }
}

// Install dependencies in the test environment
async function installDependencies() {
    log.info('Installing dependencies in test environment...');
    
    try {
        process.chdir(TEST_DIR);
        execSync('npm install --no-fund --no-audit', { stdio: 'ignore' });
        
        // Also install testing dependencies
        execSync('npm install --no-save jsdom http-server browser-sync', { stdio: 'ignore' });
        
        log.success('Dependencies installed successfully');
        process.chdir('..');
    } catch (err) {
        log.error(`Error installing dependencies: ${err.message}`);
        process.chdir('..');
    }
}

// Run gallery generation in the test environment
async function runGalleryGeneration() {
    log.info('Running gallery generation...');
    
    try {
        process.chdir(TEST_DIR);
        
        // Force node to expose gc for memory management
        const output = execSync('node --expose-gc generate-galleries.js', { encoding: 'utf8' });
        log.info(`Gallery generation output: ${output}`);
        
        log.success('Gallery generation completed');
        process.chdir('..');
        return true;
    } catch (err) {
        log.error(`Error running gallery generation: ${err.message}`);
        process.chdir('..');
        return false;
    }
}

// Start the testing web server
async function startServer() {
    return new Promise((resolve) => {
        log.info('Starting test server...');
        
        try {
            process.chdir(TEST_DIR);
            
            // Use browsersync for easier debugging
            const bs = require(path.join(TEST_DIR, 'node_modules/browser-sync'));
            browsersyncProcess = bs.create();
            
            browsersyncProcess.init({
                server: './',
                port: SERVER_PORT,
                open: false,
                ui: false,
                logLevel: 'silent'
            }, () => {
                log.success(`Server started at http://localhost:${SERVER_PORT}`);
                process.chdir('..');
                resolve(true);
            });
        } catch (err) {
            log.error(`Error starting server: ${err.message}`);
            process.chdir('..');
            resolve(false);
        }
    });
}

// Stop the server
function stopServer() {
    if (browsersyncProcess) {
        browsersyncProcess.exit();
        log.info('Server stopped');
    }
}

// Create a virtual browser environment using JSDOM
async function createVirtualBrowser() {
    log.info('Creating virtual browser environment...');
    
    try {
        // Read HTML file
        const html = await readFileAsync(path.join(TEST_DIR, 'index.html'), 'utf8');
        
        // Create virtual DOM
        const dom = new JSDOM(html, {
            url: `http://localhost:${SERVER_PORT}`,
            referrer: `http://localhost:${SERVER_PORT}`,
            contentType: 'text/html',
            includeNodeLocations: true,
            runScripts: 'dangerously',
            resources: 'usable',
            pretendToBeVisual: true
        });
        
        // Mock browser environment
        global.window = dom.window;
        global.document = dom.window.document;
        global.navigator = dom.window.navigator;
        global.location = dom.window.location;
        
        // Capture console logs
        const originalConsoleLog = dom.window.console.log;
        const originalConsoleError = dom.window.console.error;
        const originalConsoleWarn = dom.window.console.warn;
        
        dom.window.console.log = (...args) => {
            log.info(`[Browser Console] ${args.join(' ')}`);
            originalConsoleLog.apply(dom.window.console, args);
        };
        
        dom.window.console.error = (...args) => {
            log.error(`[Browser Console] ${args.join(' ')}`);
            originalConsoleError.apply(dom.window.console, args);
        };
        
        dom.window.console.warn = (...args) => {
            log.warning(`[Browser Console] ${args.join(' ')}`);
            originalConsoleWarn.apply(dom.window.console, args);
        };
        
        // Capture window errors
        dom.window.addEventListener('error', (event) => {
            log.error(`[Browser Error] ${event.message} at ${event.filename}:${event.lineno}:${event.colno}`);
        });
        
        log.success('Virtual browser environment created');
        return dom;
    } catch (err) {
        log.error(`Error creating virtual browser: ${err.message}`);
        return null;
    }
}

// Load JavaScript files manually
async function loadJavaScript(dom) {
    log.info('Loading JavaScript files...');
    
    try {
        // Read app.js
        const appJsContent = await readFileAsync(path.join(TEST_DIR, 'js', 'app.js'), 'utf8');
        
        // Create a script element
        const script = dom.window.document.createElement('script');
        script.type = 'text/javascript';
        script.textContent = appJsContent;
        
        // Add script to head
        dom.window.document.head.appendChild(script);
        
        log.success('JavaScript files loaded');
        return true;
    } catch (err) {
        log.error(`Error loading JavaScript: ${err.message}`);
        return false;
    }
}

// Extract fixes from logs
function extractFixes() {
    const fixes = [];
    
    // Check for common errors
    if (log.errors.some(err => err.includes('process is not defined'))) {
        fixes.push('Fix browser environment detection in app.js');
    }
    
    if (log.errors.some(err => err.includes('document is not defined'))) {
        fixes.push('Fix Node.js environment detection in generate-galleries.js');
    }
    
    // Check for other errors
    if (log.errors.some(err => err.includes('Cannot read properties') || err.includes('undefined'))) {
        fixes.push('Fix null or undefined references');
    }
    
    return fixes;
}

// Apply fixes automatically
async function applyFixes() {
    log.info('Applying fixes automatically...');
    
    try {
        // Fix app.js for browser environment
        const appJsPath = path.join(TEST_DIR, 'js', 'app.js');
        if (await existsAsync(appJsPath)) {
            let appJs = await readFileAsync(appJsPath, 'utf8');
            
            // Fix process.env reference
            if (appJs.includes('process.env')) {
                appJs = appJs.replace(
                    /const DEBUG\s*=\s*process\.env\.NODE_ENV.*?;/,
                    'const DEBUG = false; // Browser environment'
                );
                await writeFileAsync(appJsPath, appJs);
                log.success('Fixed process.env reference in app.js');
            }
        }
        
        // Fix generate-galleries.js for Node.js environment
        const genGalleriesPath = path.join(TEST_DIR, 'generate-galleries.js');
        if (await existsAsync(genGalleriesPath)) {
            let genGalleries = await readFileAsync(genGalleriesPath, 'utf8');
            
            // Ensure proper debug function
            if (genGalleries.includes('debug(')) {
                const debugFunctionFix = `
// Debug utility - Node.js environment
const DEBUG = true; // Enable debugging during testing
function debug(...args) {
    if (DEBUG) {
        console.log(...args);
    }
}
`;
                genGalleries = genGalleries.replace(
                    /\/\/ Debug utility.*?function debug.*?\}/s,
                    debugFunctionFix
                );
                await writeFileAsync(genGalleriesPath, genGalleries);
                log.success('Fixed debug function in generate-galleries.js');
            }
        }
        
        log.success('Fixes applied successfully');
    } catch (err) {
        log.error(`Error applying fixes: ${err.message}`);
    }
}

// Run the virtual browser tests
async function runTests() {
    log.info('Running tests in virtual browser...');
    
    try {
        // Create virtual browser
        const dom = await createVirtualBrowser();
        if (!dom) return false;
        
        // Add additional libraries needed for testing
        const swiper = await readFileAsync(path.join(__dirname, 'node_modules/swiper/swiper-bundle.min.js'), 'utf8');
        const swiperScript = dom.window.document.createElement('script');
        swiperScript.textContent = swiper;
        dom.window.document.head.appendChild(swiperScript);
        
        // Add test instrumentation
        const testScript = dom.window.document.createElement('script');
        testScript.textContent = `
            window.onerror = function(message, source, lineno, colno, error) {
                console.error('Error:', message, 'at', source, lineno, colno);
                return true;
            };
            
            // Wait for DOM to fully load
            document.addEventListener('DOMContentLoaded', function() {
                console.log('DOM fully loaded');
                
                // Check for galleries
                setTimeout(function() {
                    const galleryContainer = document.getElementById('gallery-container');
                    if (galleryContainer) {
                        console.log('Gallery container found:', galleryContainer.innerHTML.substring(0, 100) + '...');
                    } else {
                        console.error('Gallery container not found');
                    }
                    
                    // Check navigation
                    const nav = document.getElementById('main-nav');
                    if (nav) {
                        console.log('Navigation found:', nav.innerHTML.substring(0, 100) + '...');
                    } else {
                        console.error('Navigation not found');
                    }
                    
                    // Signal test completion
                    window.testCompleted = true;
                }, 1000);
            });
        `;
        dom.window.document.head.appendChild(testScript);
        
        // Load app.js
        await loadJavaScript(dom);
        
        // Wait for tests to complete
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Check results
        if (dom.window.testCompleted) {
            log.success('Browser tests completed');
        } else {
            log.warning('Browser tests did not complete in time');
        }
        
        return true;
    } catch (err) {
        log.error(`Error running browser tests: ${err.message}`);
        return false;
    }
}

// Run full test suite
async function runFullTest() {
    try {
        console.log('\n=== PHOTO GALLERY AUTO-TEST ===\n');
        
        // Create test environment
        await createTestEnvironment();
        
        // Install dependencies
        await installDependencies();
        
        // Run gallery generation
        const generationSuccess = await runGalleryGeneration();
        
        if (generationSuccess) {
            // Start server
            await startServer();
            
            // Run tests
            await runTests();
            
            // Check for errors and apply fixes
            if (log.errors.length > 0) {
                log.warning(`Detected ${log.errors.length} errors, attempting automatic fixes...`);
                await applyFixes();
                
                // Run tests again after fixes
                log.info('Re-running tests after applying fixes...');
                await runGalleryGeneration();
                await runTests();
            }
            
            // Stop server
            stopServer();
        }
        
        // Save logs
        await log.saveLog();
        
        // Report results
        console.log('\n=== TEST SUMMARY ===\n');
        console.log(`Total messages: ${log.messages.length}`);
        console.log(`Errors: ${log.errors.length}`);
        
        if (log.errors.length > 0) {
            console.log('\nRecommended fixes:');
            const fixes = extractFixes();
            fixes.forEach((fix, index) => {
                console.log(`${index + 1}. ${fix}`);
            });
        } else {
            console.log('\n✅ All tests passed!');
        }
        
        console.log(`\nDetailed logs saved to: ${LOG_FILE}`);
        if (log.errors.length > 0) {
            console.log(`Error log saved to: ${ERROR_LOG}`);
        }
        
    } catch (err) {
        console.error('Test failed with error:', err);
    }
}

// Install required global dependencies if not available
function checkDependencies() {
    const dependencies = ['jsdom', 'http-server', 'browser-sync'];
    let missing = [];
    
    dependencies.forEach(dep => {
        try {
            require.resolve(dep);
        } catch (e) {
            missing.push(dep);
        }
    });
    
    if (missing.length > 0) {
        console.log(`Installing missing dependencies: ${missing.join(', ')}...`);
        execSync(`npm install --no-save ${missing.join(' ')}`, { stdio: 'inherit' });
    }
}

// Run the script
checkDependencies();
runFullTest(); 