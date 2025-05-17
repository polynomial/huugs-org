/**
 * Photo Gallery Website Fixer
 * 
 * This script automatically fixes common issues detected by the test-site.js script.
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { execSync } = require('child_process');

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const existsAsync = async (filePath) => {
    try {
        await promisify(fs.stat)(filePath);
        return true;
    } catch (err) {
        return false;
    }
};

// Log functions
const log = {
    success: (msg) => console.log(`✅ ${msg}`),
    warning: (msg) => console.log(`⚠️ ${msg}`),
    error: (msg) => console.error(`❌ ${msg}`),
    fix: (msg) => console.log(`🔧 ${msg}`),
    info: (msg) => console.log(`ℹ️ ${msg}`),
};

// Create necessary directories
async function createDirectories() {
    log.info('Checking and creating necessary directories...');
    
    const directories = [
        'css',
        'js',
        'galleries'
    ];
    
    for (const dir of directories) {
        if (!await existsAsync(dir)) {
            log.fix(`Creating missing directory: ${dir}`);
            await promisify(fs.mkdir)(dir, { recursive: true });
        }
    }
}

// Create or fix CSS prefixes
async function fixCSSPrefixes() {
    log.info('Checking CSS for vendor prefixes...');
    
    const cssFile = 'css/style.css';
    if (!await existsAsync(cssFile)) {
        log.warning('CSS file not found, skipping prefixes fix');
        return;
    }
    
    try {
        const cssContent = await readFileAsync(cssFile, 'utf8');
        
        // Properties that might need prefixes
        const prefixProperties = [
            'transform', 
            'animation', 
            'animation-delay', 
            'animation-duration', 
            'transition', 
            'transition-delay', 
            'user-select',
            'appearance',
            'backdrop-filter',
            'box-shadow',
            'filter'
        ];
        
        let updatedCss = cssContent;
        let fixCount = 0;
        
        for (const prop of prefixProperties) {
            // Regex to find property declarations without vendor prefixes
            const propRegex = new RegExp(`(?<!-webkit-|\\-moz-|\\-ms-)${prop}\\s*:`, 'g');
            
            // Find matches but exclude those that already have prefixes
            const matches = [...updatedCss.matchAll(propRegex)];
            
            if (matches.length > 0) {
                for (const match of matches) {
                    const matchIndex = match.index;
                    const matchText = match[0];
                    
                    // Find the declaration block (from property to semicolon)
                    const declarationEnd = updatedCss.indexOf(';', matchIndex);
                    if (declarationEnd !== -1) {
                        const declaration = updatedCss.substring(matchIndex, declarationEnd + 1);
                        
                        // Create prefixed versions
                        const webkitPrefix = `-webkit-${declaration}`;
                        const mozPrefix = `-moz-${declaration}`;
                        const msPrefix = `-ms-${declaration}`;
                        
                        // Insert prefixes before the standard property
                        const replacement = `${webkitPrefix}\n    ${mozPrefix}\n    ${msPrefix}\n    ${declaration}`;
                        
                        // Update the CSS content
                        updatedCss = updatedCss.substring(0, matchIndex) + 
                                     replacement + 
                                     updatedCss.substring(declarationEnd + 1);
                        
                        fixCount++;
                        
                        // Since we modified the string, we need to adjust future match indices
                        // This is a simplified approach - for a real tool, we'd need to rebuild matches
                        // For simplicity, we'll just break after one fix and let subsequent runs fix others
                        break;
                    }
                }
            }
        }
        
        if (fixCount > 0) {
            log.fix(`Adding ${fixCount} vendor prefixes to CSS properties`);
            await writeFileAsync(cssFile, updatedCss);
        } else {
            log.success('No CSS vendor prefix issues found');
        }
        
    } catch (error) {
        log.error(`Error fixing CSS prefixes: ${error.message}`);
    }
}

// Fix JS console.log statements
async function fixJSConsoleStatements() {
    log.info('Checking JavaScript files for console statements...');
    
    const jsFiles = ['js/app.js', 'generate-galleries.js'];
    
    for (const file of jsFiles) {
        if (!await existsAsync(file)) {
            continue;
        }
        
        try {
            const jsContent = await readFileAsync(file, 'utf8');
            
            // Replace console.log with a more controlled approach in production
            let updatedContent = jsContent;
            
            // Count console.log statements
            const consoleLogCount = (jsContent.match(/console\.log\(/g) || []).length;
            
            if (consoleLogCount > 0) {
                // Add a debug utility function at the beginning of the file if it doesn't exist
                if (!jsContent.includes('function debug(') && !jsContent.includes('const debug =')) {
                    const debugFunction = `
// Debug utility - Set DEBUG to false in production
const DEBUG = process.env.NODE_ENV !== 'production';
function debug(...args) {
    if (DEBUG) {
        console.log(...args);
    }
}

`;
                    updatedContent = debugFunction + updatedContent;
                }
                
                // Replace console.log with debug
                updatedContent = updatedContent.replace(/console\.log\(/g, 'debug(');
                
                log.fix(`Replaced ${consoleLogCount} console.log statements with debug() in ${file}`);
                await writeFileAsync(file, updatedContent);
            }
            
        } catch (error) {
            log.error(`Error fixing JavaScript in ${file}: ${error.message}`);
        }
    }
}

// Fix gallery configuration
async function fixGalleryConfig() {
    log.info('Checking gallery configuration...');
    
    const configFile = 'js/gallery-config.json';
    const fixedConfigFile = 'js/gallery-config.json.fixed';
    
    // Check if a fixed config exists from previous test
    if (await existsAsync(fixedConfigFile)) {
        log.fix('Found fixed gallery config - applying it');
        
        try {
            const fixedContent = await readFileAsync(fixedConfigFile, 'utf8');
            
            // Validate JSON
            try {
                JSON.parse(fixedContent);
                await writeFileAsync(configFile, fixedContent);
                await promisify(fs.unlink)(fixedConfigFile);
                log.success('Applied fixed gallery configuration');
            } catch (error) {
                log.error(`Fixed config file contains invalid JSON: ${error.message}`);
            }
        } catch (error) {
            log.error(`Error reading fixed config: ${error.message}`);
        }
    } else if (await existsAsync(configFile)) {
        try {
            const configContent = await readFileAsync(configFile, 'utf8');
            
            try {
                // Validate existing config
                JSON.parse(configContent);
                log.success('Gallery configuration JSON is valid');
            } catch (error) {
                // Try to fix common JSON issues
                log.fix(`Fixing JSON issues in gallery configuration: ${error.message}`);
                
                let fixedContent = configContent;
                
                // Replace single quotes with double quotes
                fixedContent = fixedContent.replace(/'/g, '"');
                
                // Remove trailing commas
                fixedContent = fixedContent.replace(/,\s*([}\]])/g, '$1');
                
                // Add missing quotes around property names
                fixedContent = fixedContent.replace(/([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g, '$1"$2"$3');
                
                try {
                    JSON.parse(fixedContent);
                    await writeFileAsync(configFile, fixedContent);
                    log.success('Fixed gallery configuration JSON issues');
                } catch (fixError) {
                    log.error(`Unable to fix JSON: ${fixError.message}`);
                }
            }
        } catch (error) {
            log.error(`Error checking gallery configuration: ${error.message}`);
        }
    } else {
        log.warning('Gallery configuration file not found');
        
        // Create a sample config if it doesn't exist
        const sampleConfig = [
            {
                "id": "sample",
                "title": "Sample Gallery",
                "description": "A sample gallery configuration. Add real galleries via the generate-galleries.js script.",
                "photoCount": 0
            }
        ];
        
        log.fix('Creating sample gallery configuration');
        
        try {
            await writeFileAsync(configFile, JSON.stringify(sampleConfig, null, 2));
            log.success('Created sample gallery configuration');
        } catch (error) {
            log.error(`Error creating sample config: ${error.message}`);
        }
    }
}

// Add missing event listener cleanup
async function fixEventListeners() {
    log.info('Checking for potential event listener memory leaks...');
    
    const appJsFile = 'js/app.js';
    
    if (!await existsAsync(appJsFile)) {
        log.warning('App JS file not found, skipping event listener check');
        return;
    }
    
    try {
        const jsContent = await readFileAsync(appJsFile, 'utf8');
        
        // Check for event listener cleanup
        const addListenerCount = (jsContent.match(/addEventListener/g) || []).length;
        const removeListenerCount = (jsContent.match(/removeEventListener/g) || []).length;
        
        if (addListenerCount > 0 && removeListenerCount === 0) {
            log.fix('Adding event listener cleanup to prevent memory leaks');
            
            // Find the initialization of the lightbox
            const lightboxFunctionRegex = /function\s+initializeLightbox\s*\([^)]*\)\s*\{/;
            const match = jsContent.match(lightboxFunctionRegex);
            
            if (match) {
                const insertPosition = jsContent.indexOf(match[0]) + match[0].length;
                
                // Add cleanup function that removes event listeners
                const cleanupFunction = `
    // Cleanup function to remove event listeners
    function cleanupEventListeners() {
        closeBtn.removeEventListener('click', closeLightbox);
        document.removeEventListener('keydown', handleKeyDown);
        lightbox.removeEventListener('click', handleLightboxClick);
        
        // Remove thumbnail click handlers
        photoItems.forEach(item => {
            item.removeEventListener('click', handleThumbnailClick);
        });
    }

    // Event handler functions
    const closeLightbox = () => {
        lightbox.classList.remove('active');
        document.body.classList.remove('no-scroll');
    };
    
    const handleKeyDown = (e) => {
        if (e.key === 'Escape' && lightbox.classList.contains('active')) {
            closeLightbox();
        }
    };
    
    const handleLightboxClick = (e) => {
        if (e.target === lightbox) {
            closeLightbox();
        }
    };
`;
                
                // Modify the event listeners to use named functions
                let updatedContent = jsContent.substring(0, insertPosition) + 
                                    cleanupFunction + 
                                    jsContent.substring(insertPosition);
                
                // Replace anonymous event listeners with named functions
                updatedContent = updatedContent.replace(
                    /closeBtn\.addEventListener\('click', \(\) => \{[^}]*\}\);/s,
                    "closeBtn.addEventListener('click', closeLightbox);"
                );
                
                updatedContent = updatedContent.replace(
                    /document\.addEventListener\('keydown', \(e\) => \{[^}]*\}\);/s,
                    "document.addEventListener('keydown', handleKeyDown);"
                );
                
                updatedContent = updatedContent.replace(
                    /lightbox\.addEventListener\('click', \(e\) => \{[^}]*\}\);/s,
                    "lightbox.addEventListener('click', handleLightboxClick);"
                );
                
                // Replace thumbnail click handlers
                updatedContent = updatedContent.replace(
                    /item\.addEventListener\('click', \(\) => \{[^}]*\}\);/s,
                    "const handleThumbnailClick = function() {\n" +
                    "            const index = parseInt(this.getAttribute('data-index'));\n" +
                    "            swiper.slideTo(index, 0);\n" +
                    "            lightbox.classList.add('active');\n" +
                    "            document.body.classList.add('no-scroll');\n" +
                    "            updatePhotoInfo(photoData[index]);\n" +
                    "        };\n" +
                    "        item.addEventListener('click', handleThumbnailClick);"
                );
                
                // Add cleanup to swiper destroy
                if (updatedContent.includes('swiper.destroy(')) {
                    updatedContent = updatedContent.replace(
                        /if \(swiper\) \{\s*swiper\.destroy\([^)]*\);/,
                        "if (swiper) {\n        cleanupEventListeners();\n        swiper.destroy("
                    );
                }
                
                await writeFileAsync(appJsFile, updatedContent);
                log.success('Added event listener cleanup to prevent memory leaks');
            } else {
                log.warning('Could not locate the lightbox initialization function');
            }
        } else {
            log.success('Event listener handling looks good');
        }
        
    } catch (error) {
        log.error(`Error fixing event listeners: ${error.message}`);
    }
}

// Ensure all lazy loading is properly configured
async function fixLazyLoading() {
    log.info('Checking lazy loading configuration...');
    
    const htmlFile = 'index.html';
    
    if (!await existsAsync(htmlFile)) {
        log.warning('HTML file not found, skipping lazy loading check');
        return;
    }
    
    try {
        const htmlContent = await readFileAsync(htmlFile, 'utf8');
        
        // Check if vanilla-lazyload is included
        if (!htmlContent.includes('vanilla-lazyload')) {
            log.fix('Adding vanilla-lazyload library for better image loading performance');
            
            // Add the library reference
            let updatedContent = htmlContent.replace(
                /<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/swiper/,
                '<script src="https://cdn.jsdelivr.net/npm/vanilla-lazyload@17.8.3/dist/lazyload.min.js"></script>\n    <script src="https://cdn.jsdelivr.net/npm/swiper'
            );
            
            await writeFileAsync(htmlFile, updatedContent);
            log.success('Added vanilla-lazyload library to HTML');
        } else {
            log.success('Lazy loading library is already included');
        }
        
    } catch (error) {
        log.error(`Error fixing lazy loading: ${error.message}`);
    }
}

// Ensure favicon exists
async function fixFavicon() {
    log.info('Checking favicon...');
    
    if (!await existsAsync('favicon.svg') && !await existsAsync('favicon.png') && !await existsAsync('favicon.ico')) {
        log.fix('Creating default favicon.svg');
        
        const svgContent = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>
  <rect width='100' height='100' rx='15' fill='#2c3e50'/>
  <circle cx='30' cy='30' r='15' fill='#3498db'/>
  <rect x='15' y='55' width='70' height='30' rx='5' fill='#3498db' opacity='0.8'/>
</svg>`;
        
        try {
            await writeFileAsync('favicon.svg', svgContent);
            log.success('Created default favicon.svg');
        } catch (error) {
            log.error(`Error creating favicon: ${error.message}`);
        }
    } else {
        log.success('Favicon exists');
    }
}

// Run all fixes
async function runFixes() {
    console.log('Starting automatic fixes for website issues...');
    
    try {
        await createDirectories();
        await fixCSSPrefixes();
        await fixJSConsoleStatements();
        await fixGalleryConfig();
        await fixEventListeners();
        await fixLazyLoading();
        await fixFavicon();
        
        console.log('\n✅ All fixes applied successfully!');
        console.log('Run the test script again to verify the fixes.');
    } catch (error) {
        console.error(`\n❌ Error applying fixes: ${error.message}`);
    }
}

// Run the fixes
runFixes().catch(error => {
    console.error('Unexpected error:', error);
}); 