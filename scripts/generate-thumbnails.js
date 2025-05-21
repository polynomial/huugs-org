/**
 * Thumbnail Generator Script
 * 
 * This script generates thumbnails for all images in the pics directory
 * It creates two sizes: 
 * - thumbnails (300px width for gallery view)
 * - HD (1920px width for lightbox view)
 * 
 * Original high-resolution images are kept in pics/ but excluded from GitHub Pages
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Configuration
const config = {
  baseDir: path.join(__dirname, '..'),
  sourceDirs: ['pics'],
  thumbnailsDir: 'thumbnails',
  hdDir: 'hd',
  thumbnailWidth: 300,
  hdWidth: 1920,
  galleryConfigFile: 'js/gallery-config.json',
  galleryConfig: {
    galleries: {}
  }
};

// Create output directories if they don't exist
function ensureDirectoriesExist() {
  const dirs = [
    path.join(config.baseDir, config.thumbnailsDir),
    path.join(config.baseDir, config.hdDir)
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      console.log(`Creating directory: ${dir}`);
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

// Process a single image
async function processImage(imagePath, relativeImagePath) {
  const thumbnailDir = path.join(config.baseDir, config.thumbnailsDir, path.dirname(relativeImagePath));
  const hdDir = path.join(config.baseDir, config.hdDir, path.dirname(relativeImagePath));
  
  // Create output directories if they don't exist
  if (!fs.existsSync(thumbnailDir)) {
    fs.mkdirSync(thumbnailDir, { recursive: true });
  }
  
  if (!fs.existsSync(hdDir)) {
    fs.mkdirSync(hdDir, { recursive: true });
  }
  
  const thumbnailPath = path.join(config.baseDir, config.thumbnailsDir, relativeImagePath);
  const hdPath = path.join(config.baseDir, config.hdDir, relativeImagePath);
  
  console.log(`Processing image: ${relativeImagePath}`);
  
  try {
    // Load image with sharp
    const image = sharp(imagePath);
    
    // Get metadata including EXIF orientation
    const metadata = await image.metadata();
    
    // Generate thumbnail with proper orientation
    await image
      .rotate() // Auto-rotate based on EXIF orientation
      .resize(config.thumbnailWidth, null, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 80, progressive: true })
      .toFile(thumbnailPath);
    
    // Generate HD version with proper orientation
    await sharp(imagePath)
      .rotate() // Auto-rotate based on EXIF orientation
      .resize(config.hdWidth, null, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85, progressive: true })
      .toFile(hdPath);
    
    // Add to gallery config
    const galleryPath = path.dirname(relativeImagePath);
    if (!config.galleryConfig.galleries[galleryPath]) {
      config.galleryConfig.galleries[galleryPath] = {
        title: getNameFromPath(galleryPath),
        description: `Photos in ${galleryPath}`,
        images: []
      };
    }
    
    // Get image title from filename
    const title = getNameFromPath(path.basename(imagePath, path.extname(imagePath)));
    
    // Add image to gallery
    config.galleryConfig.galleries[galleryPath].images.push({
      title: title,
      original: relativeImagePath,
      thumbnail: path.join(config.thumbnailsDir, relativeImagePath),
      hd: path.join(config.hdDir, relativeImagePath),
      width: metadata.width,
      height: metadata.height,
      orientation: metadata.orientation || 1 // Default to normal orientation if not specified
    });
    
    return {
      success: true,
      originalSize: fs.statSync(imagePath).size,
      thumbnailSize: fs.statSync(thumbnailPath).size,
      hdSize: fs.statSync(hdPath).size
    };
  } catch (error) {
    console.error(`Error processing image ${relativeImagePath}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Helper to convert path to a nicer name
function getNameFromPath(pathString) {
  return pathString
    .split('/')
    .pop()
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

// Scan for all images in a directory recursively
function scanImagesRecursively(dir, baseDir = dir) {
  let results = [];
  const items = fs.readdirSync(dir);
  
  items.forEach(item => {
    const itemPath = path.join(dir, item);
    const stat = fs.statSync(itemPath);
    
    if (stat && stat.isDirectory()) {
      // Recurse into subdirectories
      results = results.concat(scanImagesRecursively(itemPath, baseDir));
    } else {
      // Check if this is a JPEG/JPG file
      const ext = path.extname(item).toLowerCase();
      if (ext === '.jpg' || ext === '.jpeg' || ext === '.png') {
        // Get path relative to the base directory
        const relativePath = path.relative(baseDir, itemPath);
        results.push({
          fullPath: itemPath,
          relativePath: relativePath
        });
      }
    }
  });
  
  return results;
}

// Process all images
async function processAllImages() {
  ensureDirectoriesExist();
  let results = { success: 0, error: 0, totalOriginalSize: 0, totalThumbnailSize: 0, totalHdSize: 0 };
  
  for (const sourceDir of config.sourceDirs) {
    const sourcePath = path.join(config.baseDir, sourceDir);
    if (!fs.existsSync(sourcePath)) {
      console.log(`Source directory does not exist: ${sourcePath}`);
      continue;
    }
    
    console.log(`Scanning for images in ${sourcePath}...`);
    const images = scanImagesRecursively(sourcePath, config.baseDir);
    console.log(`Found ${images.length} images.`);
    
    for (const image of images) {
      const result = await processImage(image.fullPath, image.relativePath);
      
      if (result.success) {
        results.success++;
        results.totalOriginalSize += result.originalSize;
        results.totalThumbnailSize += result.thumbnailSize;
        results.totalHdSize += result.hdSize;
      } else {
        results.error++;
      }
    }
  }
  
  return results;
}

// Save gallery configuration
function saveGalleryConfig() {
  const configPath = path.join(config.baseDir, config.galleryConfigFile);
  fs.writeFileSync(configPath, JSON.stringify(config.galleryConfig, null, 2));
  console.log(`Gallery configuration saved to ${configPath}`);
}

// Main function
async function main() {
  console.log('Starting image processing...');
  const results = await processAllImages();
  
  console.log('\nProcessing complete!');
  console.log(`Successfully processed ${results.success} images`);
  if (results.error > 0) {
    console.log(`Failed to process ${results.error} images`);
  }
  
  console.log('\nSize statistics:');
  console.log(`Original images: ${(results.totalOriginalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Thumbnails: ${(results.totalThumbnailSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`HD versions: ${(results.totalHdSize / 1024 / 1024).toFixed(2)} MB`);
  
  saveGalleryConfig();
}

// Run the script
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
}); 