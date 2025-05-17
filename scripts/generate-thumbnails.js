/**
 * Thumbnail Generator Script
 * 
 * This script generates thumbnails for all images in the pics directory
 * It creates two sizes: 
 * - thumbnails (300px width for gallery view)
 * - medium (1200px width for lightbox view)
 * 
 * It also properly handles EXIF orientation to ensure photos appear in the correct orientation
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Configuration
const config = {
  baseDir: path.join(__dirname, '..'),
  sourceDirs: ['pics'],
  thumbnailsDir: 'thumbnails',
  mediumDir: 'medium',
  thumbnailWidth: 300,
  mediumWidth: 1200,
  galleryConfigFile: 'js/gallery-config.json',
  galleryConfig: {
    galleries: {}
  }
};

// Create output directories if they don't exist
function ensureDirectoriesExist() {
  const dirs = [
    path.join(config.baseDir, config.thumbnailsDir),
    path.join(config.baseDir, config.mediumDir)
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
  const mediumDir = path.join(config.baseDir, config.mediumDir, path.dirname(relativeImagePath));
  
  // Create output directories if they don't exist
  if (!fs.existsSync(thumbnailDir)) {
    fs.mkdirSync(thumbnailDir, { recursive: true });
  }
  
  if (!fs.existsSync(mediumDir)) {
    fs.mkdirSync(mediumDir, { recursive: true });
  }
  
  const thumbnailPath = path.join(config.baseDir, config.thumbnailsDir, relativeImagePath);
  const mediumPath = path.join(config.baseDir, config.mediumDir, relativeImagePath);
  
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
    
    // Generate medium-sized image with proper orientation
    await sharp(imagePath)
      .rotate() // Auto-rotate based on EXIF orientation
      .resize(config.mediumWidth, null, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85, progressive: true })
      .toFile(mediumPath);
    
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
      medium: path.join(config.mediumDir, relativeImagePath),
      width: metadata.width,
      height: metadata.height,
      orientation: metadata.orientation || 1 // Default to normal orientation if not specified
    });
    
    return {
      success: true,
      originalSize: fs.statSync(imagePath).size,
      thumbnailSize: fs.statSync(thumbnailPath).size,
      mediumSize: fs.statSync(mediumPath).size
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
  let results = { success: 0, error: 0, totalOriginalSize: 0, totalThumbnailSize: 0, totalMediumSize: 0 };
  
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
        results.totalMediumSize += result.mediumSize;
      } else {
        results.error++;
      }
    }
  }
  
  return results;
}

// Save gallery configuration to JSON file
function saveGalleryConfig() {
  const configPath = path.join(config.baseDir, config.galleryConfigFile);
  
  // Sort images by filename for consistent order
  for (const galleryPath in config.galleryConfig.galleries) {
    config.galleryConfig.galleries[galleryPath].images.sort((a, b) => {
      const aName = path.basename(a.original);
      const bName = path.basename(b.original);
      return aName.localeCompare(bName);
    });
  }
  
  fs.writeFileSync(configPath, JSON.stringify(config.galleryConfig, null, 2));
  console.log(`Gallery configuration saved to ${configPath}`);
}

// Main function
async function main() {
  console.log('Starting thumbnail generation...');
  const startTime = new Date();
  
  try {
    const results = await processAllImages();
    
    console.log('\nThumbnail generation complete!');
    console.log(`Processed ${results.success + results.error} images`);
    console.log(`Success: ${results.success}, Errors: ${results.error}`);
    
    // Convert bytes to MB for better readability
    const originalSizeMB = (results.totalOriginalSize / (1024 * 1024)).toFixed(2);
    const thumbnailSizeMB = (results.totalThumbnailSize / (1024 * 1024)).toFixed(2);
    const mediumSizeMB = (results.totalMediumSize / (1024 * 1024)).toFixed(2);
    
    console.log(`\nOriginal size: ${originalSizeMB} MB`);
    console.log(`Thumbnail size: ${thumbnailSizeMB} MB`);
    console.log(`Medium size: ${mediumSizeMB} MB`);
    
    const totalReduction = originalSizeMB - (parseFloat(thumbnailSizeMB) + parseFloat(mediumSizeMB));
    console.log(`Total size reduction: ${totalReduction.toFixed(2)} MB`);
    
    console.log(`\nSaving gallery configuration...`);
    saveGalleryConfig();
    
    const endTime = new Date();
    const processingTime = (endTime - startTime) / 1000;
    console.log(`\nTotal processing time: ${processingTime.toFixed(2)} seconds`);
  } catch (error) {
    console.error('Error during thumbnail generation:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 