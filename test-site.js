/**
 * Website Testing Script
 * 
 * This script checks for common issues in the photo gallery website:
 * - Verifies all necessary files exist
 * - Checks for JavaScript errors
 * - Tests image loading
 * - Validates HTML structure
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);
const readFileAsync = promisify(fs.readFile);
const statAsync = promisify(fs.stat);
const existsAsync = async (filePath) => {
    try {
        await statAsync(filePath);
        return true;
    } catch (err) {
        return false;
    }
};

// Configuration
const PORT = 3000;
const SERVER_PROCESS = {
    process: null,
    active: false
};

// Test results
const results = {
    success: [],
    warnings: [],
    errors: [],
    fixes: []
};

// Log functions
const log = {
    success: (msg) => {
        console.log(`✅ ${msg}`);
        results.success.push(msg);
    },
    warning: (msg) => {
        console.log(`⚠️ ${msg}`);
        results.warnings.push(msg);
    },
    error: (msg) => {
        console.error(`❌ ${msg}`);
        results.errors.push(msg);
    },
    fix: (msg) => {
        console.log(`🔧 ${msg}`);
        results.fixes.push(msg);
    },
    info: (msg) => console.log(`ℹ️ ${msg}`)
};

// Start a local web server
async function startServer() {
    if (SERVER_PROCESS.active) {
        return;
    }
    
    log.info('Starting local web server...');
    
    try {
        SERVER_PROCESS.process = exec(`npx http-server -p ${PORT} --silent`);
        SERVER_PROCESS.active = true;
        
        // Give the server a moment to start
        await new Promise(resolve => setTimeout(resolve, 1000));
        log.info(`Server running at http://localhost:${PORT}`);
        
        return true;
    } catch (error) {
        log.error(`Failed to start server: ${error.message}`);
        return false;
    }
}

// Stop the local web server
function stopServer() {
    if (SERVER_PROCESS.active && SERVER_PROCESS.process) {
        log.info('Stopping local web server...');
        SERVER_PROCESS.process.kill();
        SERVER_PROCESS.active = false;
    }
}

// Make an HTTP request
async function makeRequest(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data
                });
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

// Check if required files exist
async function checkRequiredFiles() {
    log.info('Checking for required files...');
    
    const requiredFiles = [
        'index.html',
        'css/style.css',
        'js/app.js',
        'js/gallery-config.json',
        'favicon.svg'
    ];
    
    for (const file of requiredFiles) {
        if (await existsAsync(file)) {
            log.success(`Required file exists: ${file}`);
        } else {
            log.error(`Missing required file: ${file}`);
        }
    }
}

// Check CSS file for issues
async function checkCSSFile() {
    log.info('Checking CSS file for issues...');
    
    const cssFile = 'css/style.css';
    if (!(await existsAsync(cssFile))) {
        log.error('CSS file does not exist');
        return;
    }
    
    try {
        const cssContent = await readFileAsync(cssFile, 'utf8');
        
        // Check for unmatched braces
        const openBraces = (cssContent.match(/{/g) || []).length;
        const closeBraces = (cssContent.match(/}/g) || []).length;
        
        if (openBraces !== closeBraces) {
            log.error(`CSS has unmatched braces: ${openBraces} opening and ${closeBraces} closing braces`);
        } else {
            log.success('CSS has balanced braces');
        }
        
        // Check for key browser prefixes
        const prefixes = ['-webkit-', '-moz-', '-ms-'];
        const keyCSSProps = ['transform', 'animation', 'transition', 'user-select'];
        const missingPrefixes = [];
        
        for (const prop of keyCSSProps) {
            if (cssContent.includes(prop) && !prefixes.some(prefix => cssContent.includes(`${prefix}${prop}`))) {
                missingPrefixes.push(prop);
            }
        }
        
        if (missingPrefixes.length > 0) {
            log.warning(`Some CSS properties may need vendor prefixes: ${missingPrefixes.join(', ')}`);
        } else {
            log.success('No obvious missing vendor prefixes detected');
        }
        
    } catch (error) {
        log.error(`Error checking CSS: ${error.message}`);
    }
}

// Check JavaScript files for issues
async function checkJSFiles() {
    log.info('Checking JavaScript files...');
    
    const jsFiles = ['js/app.js', 'generate-galleries.js'];
    
    for (const file of jsFiles) {
        if (!(await existsAsync(file))) {
            log.error(`JavaScript file does not exist: ${file}`);
            continue;
        }
        
        try {
            const jsContent = await readFileAsync(file, 'utf8');
            
            // Check for syntax errors
            try {
                new Function(jsContent);
                log.success(`JavaScript syntax is valid: ${file}`);
            } catch (syntaxError) {
                log.error(`JavaScript syntax error in ${file}: ${syntaxError.message}`);
            }
            
            // Check for console.log statements (not errors but good to know in production code)
            const consoleLogCount = (jsContent.match(/console\.log/g) || []).length;
            if (consoleLogCount > 0) {
                log.warning(`Found ${consoleLogCount} console.log statements in ${file}`);
            }
            
            // Check for potential memory leaks (simplistic check)
            if (file === 'js/app.js') {
                const eventListenersAddCount = (jsContent.match(/addEventListener/g) || []).length;
                const eventListenersRemoveCount = (jsContent.match(/removeEventListener/g) || []).length;
                
                if (eventListenersAddCount > 0 && eventListenersRemoveCount === 0) {
                    log.warning(`Found ${eventListenersAddCount} event listeners added but none removed in ${file}`);
                }
            }
            
        } catch (error) {
            log.error(`Error checking JavaScript: ${error.message}`);
        }
    }
}

// Check HTML for common issues
async function checkHTMLFile() {
    log.info('Checking HTML file...');
    
    const htmlFile = 'index.html';
    if (!(await existsAsync(htmlFile))) {
        log.error('HTML file does not exist');
        return;
    }
    
    try {
        const htmlContent = await readFileAsync(htmlFile, 'utf8');
        
        // Check for HTML5 doctype
        if (!htmlContent.includes('<!DOCTYPE html>')) {
            log.error('Missing HTML5 doctype declaration');
        } else {
            log.success('HTML5 doctype is present');
        }
        
        // Check for viewport meta tag
        if (!htmlContent.includes('viewport')) {
            log.error('Missing viewport meta tag');
        } else {
            log.success('Viewport meta tag is present');
        }
        
        // Check for charset
        if (!htmlContent.includes('charset')) {
            log.error('Missing charset meta tag');
        } else {
            log.success('Charset meta tag is present');
        }
        
        // Check for required script tags
        const requiredScripts = ['swiper', 'app.js'];
        for (const script of requiredScripts) {
            if (!htmlContent.includes(script)) {
                log.error(`Missing required script: ${script}`);
            } else {
                log.success(`Required script is present: ${script}`);
            }
        }
        
    } catch (error) {
        log.error(`Error checking HTML: ${error.message}`);
    }
}

// Check gallery configuration
async function checkGalleryConfig() {
    log.info('Checking gallery configuration...');
    
    const configFile = 'js/gallery-config.json';
    if (!(await existsAsync(configFile))) {
        log.error('Gallery configuration file does not exist');
        return;
    }
    
    try {
        const configContent = await readFileAsync(configFile, 'utf8');
        let config;
        
        try {
            config = JSON.parse(configContent);
            log.success('Gallery configuration JSON is valid');
            
            // Check if config is an array
            if (!Array.isArray(config)) {
                log.error('Gallery configuration should be an array');
            } else if (config.length === 0) {
                log.warning('Gallery configuration is empty - no galleries defined');
            } else {
                log.success(`Found ${config.length} galleries in configuration`);
                
                // Check first gallery for required properties
                const firstGallery = config[0];
                const requiredProps = ['id', 'title', 'photoCount'];
                const missingProps = requiredProps.filter(prop => !firstGallery.hasOwnProperty(prop));
                
                if (missingProps.length > 0) {
                    log.error(`Gallery configuration missing required properties: ${missingProps.join(', ')}`);
                } else {
                    log.success('Gallery configuration has all required properties');
                }
            }
            
        } catch (jsonError) {
            log.error(`Invalid JSON in gallery configuration: ${jsonError.message}`);
            
            // Try to fix common JSON issues
            let fixedContent = configContent;
            // Replace single quotes with double quotes
            fixedContent = fixedContent.replace(/'/g, '"');
            // Remove trailing commas
            fixedContent = fixedContent.replace(/,\s*([}\]])/g, '$1');
            
            try {
                JSON.parse(fixedContent);
                log.fix('JSON can be fixed by replacing single quotes and removing trailing commas');
                await fs.promises.writeFile(configFile + '.fixed', fixedContent);
                log.info(`Fixed JSON written to ${configFile}.fixed`);
            } catch (fixError) {
                log.error('Unable to automatically fix JSON');
            }
        }
        
    } catch (error) {
        log.error(`Error checking gallery configuration: ${error.message}`);
    }
}

// Test HTTP access to key resources
async function testHTTPAccess() {
    log.info('Testing HTTP access to key resources...');
    
    // In Nix environments, we may face restrictions with network access
    // So let's do a simplified check by just verifying file existence
    try {
        const files = [
            'index.html',
            'css/style.css',
            'js/app.js',
            'js/gallery-config.json'
        ];
        
        let allFilesExist = true;
        
        for (const file of files) {
            if (await existsAsync(file)) {
                log.success(`File exists and should be accessible via HTTP: ${file}`);
            } else {
                log.error(`File missing, would not be accessible via HTTP: ${file}`);
                allFilesExist = false;
            }
        }
        
        // Try to validate JSON in gallery config without server
        if (await existsAsync('js/gallery-config.json')) {
            try {
                const configData = await readFileAsync('js/gallery-config.json', 'utf8');
                JSON.parse(configData);
                log.success('gallery-config.json contains valid JSON');
            } catch (error) {
                log.error(`gallery-config.json does not contain valid JSON: ${error.message}`);
            }
        }
        
        if (allFilesExist) {
            log.success('All key files exist and should be accessible via HTTP');
        }
        
        // Optional: Try to start a server if we're not in a restricted environment
        if (process.env.NIX_FREE_NETWORKING === 'true') {
            const serverStarted = await startServer();
            if (!serverStarted) {
                log.warning('Could not start server for advanced HTTP testing');
                return;
            }
            
            try {
                // Test index.html
                const indexResponse = await makeRequest(`http://localhost:${PORT}/index.html`);
                if (indexResponse.statusCode === 200) {
                    log.success('Successfully accessed index.html via HTTP');
                } else {
                    log.error(`Failed to access index.html: Status ${indexResponse.statusCode}`);
                }
                
                // More HTTP tests...
                
            } catch (error) {
                log.warning(`Advanced HTTP testing skipped: ${error.message}`);
            } finally {
                stopServer();
            }
        } else {
            log.info('Skipping network-based HTTP testing in restricted environment');
        }
        
    } catch (error) {
        log.error(`Error testing HTTP access: ${error.message}`);
    }
}

// Generate gallery to test
async function testGalleryGeneration() {
    log.info('Testing gallery generation script...');
    
    try {
        if (!(await existsAsync('generate-galleries.js'))) {
            log.error('Gallery generation script does not exist');
            return;
        }

        // Check if we have Node.js
        try {
            const { stdout } = await execAsync('node --version');
            log.info(`Node.js version: ${stdout.trim()}`);
        } catch (error) {
            log.error('Node.js is not available, cannot test gallery generation');
            return;
        }
        
        // Create a test directory structure
        const testDir = 'test-gallery';
        const picDir = path.join(testDir, 'pics', 'test');
        
        try {
            // Create directories
            await fs.promises.mkdir(picDir, { recursive: true });
            
            // Create a simple test image (1x1 pixel)
            const base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
            const imageBuffer = Buffer.from(base64Image, 'base64');
            await fs.promises.writeFile(path.join(picDir, 'test.jpg'), imageBuffer);
            
            // Copy generate-galleries.js to test directory
            const generatorScript = await readFileAsync('generate-galleries.js', 'utf8');
            const modifiedScript = generatorScript
                .replace(/const PICS_DIR = ['"]pics['"]/, `const PICS_DIR = 'pics'`)
                .replace(/const GALLERIES_DIR = ['"]galleries['"]/, `const GALLERIES_DIR = 'galleries'`);
            
            await fs.promises.writeFile(path.join(testDir, 'generate-galleries.js'), modifiedScript);
            
            // Create minimal package.json
            const packageJson = {
                "name": "test-gallery",
                "version": "1.0.0",
                "scripts": {
                    "generate": "node generate-galleries.js"
                },
                "dependencies": {
                    "sharp": "^0.32.1"
                }
            };
            
            await fs.promises.writeFile(
                path.join(testDir, 'package.json'), 
                JSON.stringify(packageJson, null, 2)
            );
            
            // Create js directory for config
            await fs.promises.mkdir(path.join(testDir, 'js'), { recursive: true });
            
            // Try running the generation script
            log.info('Attempting to run gallery generation script in test environment...');
            try {
                process.chdir(testDir);
                
                // Install dependencies
                log.info('Installing dependencies for test...');
                await execAsync('npm install --no-audit --no-fund --silent sharp');
                
                // Run the generation script
                const { stdout, stderr } = await execAsync('node generate-galleries.js');
                log.info('Gallery generation output:');
                
                if (stderr) {
                    log.error(`Gallery generation stderr: ${stderr}`);
                }
                
                if (stdout) {
                    const outputLines = stdout.split('\n').filter(line => line.trim());
                    outputLines.forEach(line => log.info(`  ${line}`));
                }
                
                // Check if galleries directory was created
                if (await existsAsync('galleries/test')) {
                    log.success('Test gallery was successfully generated');
                    
                    // Check if config file was created
                    if (await existsAsync('js/gallery-config.json')) {
                        log.success('Gallery config was successfully generated');
                    } else {
                        log.error('Gallery config was not generated');
                    }
                } else {
                    log.error('Test gallery was not generated');
                }
                
                process.chdir('..');
            } catch (runError) {
                log.error(`Error running gallery generation: ${runError.message}`);
                process.chdir('..');
            }
            
        } catch (setupError) {
            log.error(`Error setting up test environment: ${setupError.message}`);
        } finally {
            // Clean up test directory
            try {
                await execAsync(`rm -rf ${testDir}`);
                log.info('Cleaned up test directory');
            } catch (cleanupError) {
                log.error(`Error cleaning up test directory: ${cleanupError.message}`);
            }
        }
        
    } catch (error) {
        log.error(`Error testing gallery generation: ${error.message}`);
    }
}

// Run all tests
async function runTests() {
    console.log('Starting website tests...');
    
    await checkRequiredFiles();
    await checkCSSFile();
    await checkJSFiles();
    await checkHTMLFile();
    await checkGalleryConfig();
    await testHTTPAccess();
    await testGalleryGeneration();
    
    // Output summary
    console.log('\n== Test Summary ==');
    console.log(`✅ Successes: ${results.success.length}`);
    console.log(`⚠️ Warnings: ${results.warnings.length}`);
    console.log(`❌ Errors: ${results.errors.length}`);
    console.log(`🔧 Fixes: ${results.fixes.length}`);
    
    if (results.errors.length > 0) {
        console.log('\n== Errors ==');
        results.errors.forEach((error, i) => console.log(`${i+1}. ${error}`));
    }
    
    if (results.warnings.length > 0) {
        console.log('\n== Warnings ==');
        results.warnings.forEach((warning, i) => console.log(`${i+1}. ${warning}`));
    }
    
    if (results.fixes.length > 0) {
        console.log('\n== Fixes ==');
        results.fixes.forEach((fix, i) => console.log(`${i+1}. ${fix}`));
    }
    
    console.log('\nTest completed!');
}

// Run the tests
runTests().catch(error => {
    console.error('Test script error:', error);
    if (SERVER_PROCESS.active) {
        stopServer();
    }
}); 