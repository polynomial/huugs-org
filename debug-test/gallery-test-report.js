/**
 * Gallery Website Static Analysis Tool
 * 
 * This script performs static analysis of the photo gallery website files
 * without trying to execute them, generating a comprehensive report with
 * recommendations for improvements.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  rootDir: path.join(__dirname, '..'),
  reportFile: 'gallery-test-report.html',
  checks: {
    requiredFiles: [
      'index.html',
      'css/style.css',
      'js/app.js',
      'js/gallery-config.json',
      'favicon.svg'
    ],
    recommendedFiles: [
      'README.md',
      'robots.txt',
      'sitemap.xml'
    ],
    cssProperties: [
      { name: 'display: flex', pattern: /display\s*:\s*flex/i },
      { name: 'grid layout', pattern: /display\s*:\s*grid/i },
      { name: 'media queries', pattern: /@media/i },
      { name: 'CSS variables', pattern: /--[\w-]+/i },
      { name: 'animations', pattern: /@keyframes/i }
    ],
    jsFeatures: [
      { name: 'async/await', pattern: /async|await/g },
      { name: 'arrow functions', pattern: /=>/g },
      { name: 'template literals', pattern: /`[^`]*`/g },
      { name: 'promises', pattern: /new Promise|\.then\(|\.catch\(/g },
      { name: 'fetch API', pattern: /fetch\(/g }
    ],
    htmlFeatures: [
      { name: 'viewport meta tag', pattern: /<meta[^>]*viewport[^>]*>/i },
      { name: 'semantic HTML5 elements', pattern: /<(header|footer|nav|main|section|article|aside)[>\s]/g },
      { name: 'aria attributes', pattern: /aria-[\w-]+="[^"]*"/g }
    ]
  }
};

// Results tracking
const results = {
  fileChecks: {
    passed: [],
    failed: [],
    warnings: []
  },
  cssAnalysis: {
    features: {},
    suggestions: []
  },
  jsAnalysis: {
    features: {},
    potentialIssues: []
  },
  htmlAnalysis: {
    features: {},
    suggestions: []
  },
  performance: {
    suggestions: []
  },
  accessibility: {
    issues: []
  },
  security: {
    issues: []
  }
};

/**
 * Main function to run all checks
 */
async function runAnalysis() {
  console.log('Starting gallery website static analysis...');
  
  try {
    // Check required files
    checkRequiredFiles();
    
    // Analyze files by type
    analyzeHtmlFiles();
    analyzeCssFiles();
    analyzeJsFiles();
    analyzeGalleryConfig();
    
    // Generate report
    generateReport();
    
    console.log(`Analysis complete! Report saved to ${CONFIG.reportFile}`);
    
  } catch (error) {
    console.error('Analysis failed:', error);
    process.exit(1);
  }
}

/**
 * Check if required files exist
 */
function checkRequiredFiles() {
  console.log('Checking required files...');
  
  CONFIG.checks.requiredFiles.forEach(file => {
    const filePath = path.join(CONFIG.rootDir, file);
    
    if (fs.existsSync(filePath)) {
      results.fileChecks.passed.push(`✅ Required file exists: ${file}`);
    } else {
      results.fileChecks.failed.push(`❌ Missing required file: ${file}`);
    }
  });
  
  CONFIG.checks.recommendedFiles.forEach(file => {
    const filePath = path.join(CONFIG.rootDir, file);
    
    if (fs.existsSync(filePath)) {
      results.fileChecks.passed.push(`✅ Recommended file exists: ${file}`);
    } else {
      results.fileChecks.warnings.push(`⚠️ Missing recommended file: ${file}`);
    }
  });
}

/**
 * Analyze HTML files
 */
function analyzeHtmlFiles() {
  console.log('Analyzing HTML files...');
  
  const indexPath = path.join(CONFIG.rootDir, 'index.html');
  if (!fs.existsSync(indexPath)) return;
  
  const content = fs.readFileSync(indexPath, 'utf8');
  
  // Check for HTML features
  CONFIG.checks.htmlFeatures.forEach(feature => {
    const matches = content.match(feature.pattern);
    results.htmlAnalysis.features[feature.name] = {
      found: !!matches,
      count: matches ? matches.length : 0
    };
    
    if (!matches) {
      results.htmlAnalysis.suggestions.push(
        `Consider adding ${feature.name} to improve the website.`
      );
    }
  });
  
  // Check for common issues
  if (!content.includes('lang=')) {
    results.accessibility.issues.push(
      'HTML lang attribute not found. Add lang attribute to the <html> tag.'
    );
  }
  
  if (!content.match(/<title>[^<]+<\/title>/i)) {
    results.accessibility.issues.push(
      'Page title not found or empty. Add a descriptive <title> tag.'
    );
  }
  
  if (!content.includes('<meta name="description"')) {
    results.htmlAnalysis.suggestions.push(
      'Add a meta description tag to improve SEO.'
    );
  }
  
  // Check image tags for alt attributes
  const imgTags = content.match(/<img[^>]*>/gi) || [];
  let missingAltCount = 0;
  
  imgTags.forEach(img => {
    if (!img.includes('alt=')) {
      missingAltCount++;
    }
  });
  
  if (missingAltCount > 0) {
    results.accessibility.issues.push(
      `${missingAltCount} image(s) missing alt attributes. Add alt attributes to all images.`
    );
  }
}

/**
 * Analyze CSS files
 */
function analyzeCssFiles() {
  console.log('Analyzing CSS files...');
  
  const cssDir = path.join(CONFIG.rootDir, 'css');
  if (!fs.existsSync(cssDir)) return;
  
  const cssFiles = fs.readdirSync(cssDir)
    .filter(file => file.endsWith('.css'))
    .map(file => path.join(cssDir, file));
  
  cssFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const filename = path.basename(file);
    
    // Check for CSS features
    CONFIG.checks.cssProperties.forEach(feature => {
      if (!results.cssAnalysis.features[feature.name]) {
        results.cssAnalysis.features[feature.name] = {
          found: false,
          count: 0,
          files: []
        };
      }
      
      const matches = content.match(feature.pattern);
      if (matches) {
        results.cssAnalysis.features[feature.name].found = true;
        results.cssAnalysis.features[feature.name].count += matches.length;
        results.cssAnalysis.features[feature.name].files.push(filename);
      }
    });
    
    // Check for vendor prefixes
    const vendorPrefixes = content.match(/-(webkit|moz|ms|o)-/g);
    if (vendorPrefixes && vendorPrefixes.length > 0) {
      results.cssAnalysis.suggestions.push(
        `${filename} uses ${vendorPrefixes.length} vendor prefixes. Consider using autoprefixer.`
      );
    }
    
    // Check file size for performance
    const stats = fs.statSync(file);
    if (stats.size > 50000) { // 50KB
      results.performance.suggestions.push(
        `${filename} is ${Math.round(stats.size / 1024)}KB. Consider minifying or splitting the file.`
      );
    }
  });
  
  // Suggest modern features if not found
  Object.entries(results.cssAnalysis.features).forEach(([name, data]) => {
    if (!data.found) {
      results.cssAnalysis.suggestions.push(
        `Consider using ${name} for more modern CSS layouts and effects.`
      );
    }
  });
}

/**
 * Analyze JavaScript files
 */
function analyzeJsFiles() {
  console.log('Analyzing JavaScript files...');
  
  const jsDir = path.join(CONFIG.rootDir, 'js');
  if (!fs.existsSync(jsDir)) return;
  
  const jsFiles = fs.readdirSync(jsDir)
    .filter(file => file.endsWith('.js'))
    .map(file => path.join(jsDir, file));
  
  jsFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const filename = path.basename(file);
    
    // Check for JS features
    CONFIG.checks.jsFeatures.forEach(feature => {
      if (!results.jsAnalysis.features[feature.name]) {
        results.jsAnalysis.features[feature.name] = {
          found: false,
          count: 0,
          files: []
        };
      }
      
      const matches = content.match(feature.pattern);
      if (matches) {
        results.jsAnalysis.features[feature.name].found = true;
        results.jsAnalysis.features[feature.name].count += matches.length;
        results.jsAnalysis.features[feature.name].files.push(filename);
      }
    });
    
    // Check for console.log statements
    const consoleLogs = content.match(/console\.log\(/g);
    if (consoleLogs && consoleLogs.length > 0) {
      results.jsAnalysis.potentialIssues.push(
        `${filename} contains ${consoleLogs.length} console.log statements. Remove them in production.`
      );
    }
    
    // Check for potential memory leaks (event listeners without removal)
    const addEventListeners = content.match(/addEventListener\(/g) || [];
    const removeEventListeners = content.match(/removeEventListener\(/g) || [];
    
    if (addEventListeners.length > removeEventListeners.length) {
      results.jsAnalysis.potentialIssues.push(
        `${filename} may have event listener memory leaks. ${addEventListeners.length} listeners added but only ${removeEventListeners.length} removed.`
      );
    }
    
    // Check file size for performance
    const stats = fs.statSync(file);
    if (stats.size > 100000) { // 100KB
      results.performance.suggestions.push(
        `${filename} is ${Math.round(stats.size / 1024)}KB. Consider splitting or optimizing the file.`
      );
    }
  });
}

/**
 * Analyze gallery configuration
 */
function analyzeGalleryConfig() {
  console.log('Analyzing gallery configuration...');
  
  const configPath = path.join(CONFIG.rootDir, 'js', 'gallery-config.json');
  if (!fs.existsSync(configPath)) return;
  
  try {
    const content = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(content);
    
    if (!Array.isArray(config)) {
      results.fileChecks.failed.push('❌ Gallery config is not an array');
      return;
    }
    
    if (config.length === 0) {
      results.fileChecks.warnings.push('⚠️ Gallery config is empty');
      return;
    }
    
    results.fileChecks.passed.push(`✅ Gallery config contains ${config.length} galleries`);
    
    // Check each gallery
    config.forEach((gallery, index) => {
      // Required properties
      if (!gallery.id) {
        results.fileChecks.failed.push(`❌ Gallery at index ${index} is missing 'id' property`);
      }
      
      if (!gallery.title) {
        results.fileChecks.warnings.push(`⚠️ Gallery '${gallery.id || index}' is missing 'title' property`);
      }
      
      // Check for gallery folders
      if (gallery.id) {
        const galleryDir = path.join(CONFIG.rootDir, 'galleries', gallery.id);
        if (!fs.existsSync(galleryDir)) {
          results.fileChecks.warnings.push(`⚠️ Gallery folder not found: galleries/${gallery.id}`);
        } else {
          // Check for photos.json
          const photosJson = path.join(galleryDir, 'photos.json');
          if (!fs.existsSync(photosJson)) {
            results.fileChecks.warnings.push(`⚠️ Missing photos.json for gallery: ${gallery.id}`);
          } else {
            try {
              const photosContent = fs.readFileSync(photosJson, 'utf8');
              const photos = JSON.parse(photosContent);
              
              if (!Array.isArray(photos)) {
                results.fileChecks.failed.push(`❌ Photos data for gallery ${gallery.id} is not an array`);
              } else {
                results.fileChecks.passed.push(`✅ Gallery ${gallery.id} has ${photos.length} photos defined`);
                
                // Check for image files
                const displayDir = path.join(galleryDir, 'display');
                const thumbsDir = path.join(galleryDir, 'thumbs');
                
                if (!fs.existsSync(displayDir)) {
                  results.fileChecks.warnings.push(`⚠️ Display images folder not found for gallery: ${gallery.id}`);
                }
                
                if (!fs.existsSync(thumbsDir)) {
                  results.fileChecks.warnings.push(`⚠️ Thumbnail images folder not found for gallery: ${gallery.id}`);
                }
              }
            } catch (error) {
              results.fileChecks.failed.push(`❌ Failed to parse photos.json for gallery ${gallery.id}: ${error.message}`);
            }
          }
        }
      }
    });
    
  } catch (error) {
    results.fileChecks.failed.push(`❌ Failed to parse gallery config: ${error.message}`);
  }
}

/**
 * Generate HTML report
 */
function generateReport() {
  console.log('Generating report...');
  
  const reportPath = path.join(__dirname, CONFIG.reportFile);
  
  // Calculate overall scores
  const passedCount = results.fileChecks.passed.length;
  const failedCount = results.fileChecks.failed.length;
  const warningCount = results.fileChecks.warnings.length;
  const totalChecks = passedCount + failedCount + warningCount;
  
  const score = Math.round((passedCount / totalChecks) * 100);
  
  // Build HTML report
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gallery Website Test Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    h1, h2, h3 {
      color: #2c3e50;
    }
    .summary {
      display: flex;
      justify-content: space-between;
      background-color: #f8f9fa;
      padding: 20px;
      border-radius: 5px;
      margin-bottom: 30px;
    }
    .score {
      font-size: 48px;
      font-weight: bold;
      color: ${score >= 90 ? '#27ae60' : score >= 70 ? '#f39c12' : '#e74c3c'};
    }
    .score-label {
      font-size: 14px;
      color: #7f8c8d;
    }
    .counts {
      display: flex;
      gap: 15px;
    }
    .count-item {
      text-align: center;
      padding: 10px;
      border-radius: 5px;
      min-width: 100px;
    }
    .passed {
      background-color: #e6f7ee;
      color: #27ae60;
    }
    .warnings {
      background-color: #fef5e7;
      color: #f39c12;
    }
    .failed {
      background-color: #fdedec;
      color: #e74c3c;
    }
    .section {
      margin-bottom: 30px;
      padding: 20px;
      background-color: #fff;
      border-radius: 5px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .check-list {
      list-style-type: none;
      padding-left: 10px;
    }
    .check-list li {
      margin-bottom: 8px;
      padding-left: 25px;
      position: relative;
    }
    .check-list li:before {
      position: absolute;
      left: 0;
      top: 0;
    }
    .check-pass:before {
      content: "✅";
    }
    .check-warn:before {
      content: "⚠️";
    }
    .check-fail:before {
      content: "❌";
    }
    .features {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 15px;
    }
    .feature-card {
      border: 1px solid #eee;
      border-radius: 5px;
      padding: 15px;
      background-color: #f8f9fa;
    }
    .feature-name {
      font-weight: bold;
      margin-bottom: 5px;
    }
    .footer {
      text-align: center;
      margin-top: 50px;
      color: #7f8c8d;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <h1>Gallery Website Test Report</h1>
  <p>Generated on ${new Date().toLocaleString()}</p>
  
  <div class="summary">
    <div>
      <div class="score">${score}%</div>
      <div class="score-label">Overall Score</div>
    </div>
    <div class="counts">
      <div class="count-item passed">
        <div>${passedCount}</div>
        <div>Passed</div>
      </div>
      <div class="count-item warnings">
        <div>${warningCount}</div>
        <div>Warnings</div>
      </div>
      <div class="count-item failed">
        <div>${failedCount}</div>
        <div>Failed</div>
      </div>
    </div>
  </div>
  
  <div class="section">
    <h2>File Checks</h2>
    <ul class="check-list">
      ${results.fileChecks.passed.map(item => `<li class="check-pass">${item.replace('✅ ', '')}</li>`).join('\n      ')}
      ${results.fileChecks.warnings.map(item => `<li class="check-warn">${item.replace('⚠️ ', '')}</li>`).join('\n      ')}
      ${results.fileChecks.failed.map(item => `<li class="check-fail">${item.replace('❌ ', '')}</li>`).join('\n      ')}
    </ul>
  </div>
  
  <div class="section">
    <h2>HTML Analysis</h2>
    <h3>Features Detected</h3>
    <div class="features">
      ${Object.entries(results.htmlAnalysis.features).map(([name, data]) => `
        <div class="feature-card">
          <div class="feature-name">${name}</div>
          <div>${data.found ? `Found ${data.count} instances` : 'Not found'}</div>
        </div>
      `).join('\n      ')}
    </div>
    
    ${results.htmlAnalysis.suggestions.length > 0 ? `
      <h3>Suggestions</h3>
      <ul class="check-list">
        ${results.htmlAnalysis.suggestions.map(item => `<li class="check-warn">${item}</li>`).join('\n        ')}
      </ul>
    ` : ''}
  </div>
  
  <div class="section">
    <h2>CSS Analysis</h2>
    <h3>Features Detected</h3>
    <div class="features">
      ${Object.entries(results.cssAnalysis.features).map(([name, data]) => `
        <div class="feature-card">
          <div class="feature-name">${name}</div>
          <div>${data.found ? `Found ${data.count} instances in ${data.files.length} files` : 'Not found'}</div>
          ${data.found ? `<div><small>Files: ${data.files.join(', ')}</small></div>` : ''}
        </div>
      `).join('\n      ')}
    </div>
    
    ${results.cssAnalysis.suggestions.length > 0 ? `
      <h3>Suggestions</h3>
      <ul class="check-list">
        ${results.cssAnalysis.suggestions.map(item => `<li class="check-warn">${item}</li>`).join('\n        ')}
      </ul>
    ` : ''}
  </div>
  
  <div class="section">
    <h2>JavaScript Analysis</h2>
    <h3>Features Detected</h3>
    <div class="features">
      ${Object.entries(results.jsAnalysis.features).map(([name, data]) => `
        <div class="feature-card">
          <div class="feature-name">${name}</div>
          <div>${data.found ? `Found ${data.count} instances in ${data.files.length} files` : 'Not found'}</div>
          ${data.found ? `<div><small>Files: ${data.files.join(', ')}</small></div>` : ''}
        </div>
      `).join('\n      ')}
    </div>
    
    ${results.jsAnalysis.potentialIssues.length > 0 ? `
      <h3>Potential Issues</h3>
      <ul class="check-list">
        ${results.jsAnalysis.potentialIssues.map(item => `<li class="check-warn">${item}</li>`).join('\n        ')}
      </ul>
    ` : ''}
  </div>
  
  ${results.performance.suggestions.length > 0 ? `
    <div class="section">
      <h2>Performance Suggestions</h2>
      <ul class="check-list">
        ${results.performance.suggestions.map(item => `<li class="check-warn">${item}</li>`).join('\n        ')}
      </ul>
    </div>
  ` : ''}
  
  ${results.accessibility.issues.length > 0 ? `
    <div class="section">
      <h2>Accessibility Issues</h2>
      <ul class="check-list">
        ${results.accessibility.issues.map(item => `<li class="check-fail">${item}</li>`).join('\n        ')}
      </ul>
    </div>
  ` : ''}
  
  <div class="footer">
    <p>Generated by Gallery Website Static Analysis Tool</p>
  </div>
</body>
</html>
  `;
  
  fs.writeFileSync(reportPath, html);
}

// Run the analysis
runAnalysis().catch(err => {
  console.error('Analysis failed:', err);
  process.exit(1);
}); 