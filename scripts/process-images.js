/**
 * Image Processing Script
 * 
 * This script processes images in the pics/ directory:
 * 1. Reads EXIF orientation data
 * 2. Applies correct rotation
 * 3. Creates properly sized versions:
 *    - Thumbnails: 300px max dimension, stored in thumbnails/
 *    - Medium: 1200px max dimension, stored in medium/
 * 4. Generates gallery-config.json with metadata
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const glob = require('glob');
const mkdirp = require('mkdirp');

// Configuration
const SOURCE_DIR = 'pics';
const THUMBNAIL_DIR = 'thumbnails';
const MEDIUM_DIR = 'medium';
const CONFIG_FILE = 'js/gallery-config.json';
const THUMBNAIL_SIZE = 300;
const MEDIUM_SIZE = 1200;
const SUPPORTED_FORMATS = ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG'];

// Initialize stats for reporting
const stats = {
  processedImages: 0,
  failedImages: 0,
  totalSizeMB: 0,
  thumbnailSizeMB: 0,
  mediumSizeMB: 0
};

// Gallery config structure
const galleryConfig = {
  version: '1.0',
  lastGenerated: new Date().toISOString(),
  stats: {},
  galleries: {}
};

/**
 * Find all images in the source directory
 */
async function findImages() {
  return new Promise((resolve, reject) => {
    const pattern = path.join(SOURCE_DIR, '**/*');
    glob(pattern, { nodir: true }, (err, files) => {
      if (err) return reject(err);
      
      // Filter for supported image formats
      const imageFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return SUPPORTED_FORMATS.includes(ext);
      });
      
      console.log(`Found ${imageFiles.length} image files to process`);
      resolve(imageFiles);
    });
  });
}

/**
 * Create output directories if they don't exist
 */
async function createOutputDirs(imagePath) {
  // Create thumbnail directory
  const thumbnailPath = path.join(THUMBNAIL_DIR, imagePath);
  const thumbnailDir = path.dirname(thumbnailPath);
  await mkdirp(thumbnailDir);
  
  // Create medium directory
  const mediumPath = path.join(MEDIUM_DIR, imagePath);
  const mediumDir = path.dirname(mediumPath);
  await mkdirp(mediumDir);
}

/**
 * Process a single image
 */
async function processImage(imagePath) {
  try {
    // Skip if the path contains /. files
    if (imagePath.includes('/.')) {
      console.log(`Skipping hidden file: ${imagePath}`);
      return null;
    }
    
    console.log(`Processing: ${imagePath}`);
    const relativeImagePath = imagePath;
    
    // Create output directories
    await createOutputDirs(relativeImagePath);
    
    // Output paths
    const thumbnailPath = path.join(THUMBNAIL_DIR, relativeImagePath);
    const mediumPath = path.join(MEDIUM_DIR, relativeImagePath);
    
    // Get image metadata with EXIF
    const metadata = await sharp(imagePath).metadata();
    
    // Create thumbnail with correct orientation
    const thumbnailBuffer = await sharp(imagePath)
      // Auto-rotate based on EXIF orientation
      .rotate()
      .resize({
        width: THUMBNAIL_SIZE,
        height: THUMBNAIL_SIZE,
        fit: 'inside',
        withoutEnlargement: true
      })
      .toBuffer();
    
    // Write the thumbnail
    await fs.promises.writeFile(thumbnailPath, thumbnailBuffer);
    
    // Create medium size with correct orientation
    const mediumBuffer = await sharp(imagePath)
      // Auto-rotate based on EXIF orientation
      .rotate()
      .resize({
        width: MEDIUM_SIZE,
        height: MEDIUM_SIZE,
        fit: 'inside',
        withoutEnlargement: true
      })
      .toBuffer();
    
    // Write the medium size
    await fs.promises.writeFile(mediumPath, mediumBuffer);
    
    // Update stats
    stats.processedImages++;
    const originalSize = (await fs.promises.stat(imagePath)).size / (1024 * 1024);
    const thumbnailSize = thumbnailBuffer.length / (1024 * 1024);
    const mediumSize = mediumBuffer.length / (1024 * 1024);
    
    stats.totalSizeMB += originalSize;
    stats.thumbnailSizeMB += thumbnailSize;
    stats.mediumSizeMB += mediumSize;
    
    // Return metadata for config
    return {
      original: relativeImagePath,
      thumbnail: path.join(THUMBNAIL_DIR, relativeImagePath),
      medium: path.join(MEDIUM_DIR, relativeImagePath),
      title: path.basename(relativeImagePath, path.extname(relativeImagePath)).replace(/_/g, ' '),
      width: metadata.width,
      height: metadata.height,
      orientation: metadata.orientation || 1
    };
  } catch (error) {
    console.error(`Error processing image ${imagePath}:`, error);
    stats.failedImages++;
    return null;
  }
}

/**
 * Process all images and build gallery config
 */
async function processAllImages() {
  try {
    // Find all images
    const imageFiles = await findImages();
    
    // Process images in batches to avoid memory issues
    const BATCH_SIZE = 10;
    const results = [];
    
    for (let i = 0; i < imageFiles.length; i += BATCH_SIZE) {
      const batch = imageFiles.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(batch.map(processImage));
      results.push(...batchResults.filter(Boolean));
      console.log(`Processed batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(imageFiles.length / BATCH_SIZE)}`);
    }
    
    // Build gallery configuration
    buildGalleryConfig(results);
    
    // Update stats
    galleryConfig.stats = {
      totalImages: stats.processedImages,
      totalSizeMB: stats.totalSizeMB.toFixed(2),
      thumbnailSizeMB: stats.thumbnailSizeMB.toFixed(2),
      mediumSizeMB: stats.mediumSizeMB.toFixed(2)
    };
    
    // Write config file
    const configDir = path.dirname(CONFIG_FILE);
    await mkdirp(configDir);
    await fs.promises.writeFile(
      CONFIG_FILE,
      JSON.stringify(galleryConfig, null, 2)
    );
    
    console.log('\nProcessing complete!');
    console.log(`Processed ${stats.processedImages} images successfully`);
    console.log(`Failed to process ${stats.failedImages} images`);
    console.log(`Original size: ${stats.totalSizeMB.toFixed(2)} MB`);
    console.log(`Thumbnail size: ${stats.thumbnailSizeMB.toFixed(2)} MB`);
    console.log(`Medium size: ${stats.mediumSizeMB.toFixed(2)} MB`);
    console.log(`Gallery config written to ${CONFIG_FILE}`);
  } catch (error) {
    console.error('Error processing images:', error);
  }
}

/**
 * Build gallery configuration from processed images
 */
function buildGalleryConfig(imageResults) {
  const galleries = {};
  
  // Group images by directory structure
  for (const image of imageResults) {
    // Get gallery path (directory structure)
    const dirname = path.dirname(image.original);
    
    // Skip if it's a placeholder
    if (image.original.includes('placeholder')) continue;
    
    // Create gallery if it doesn't exist
    if (!galleries[dirname]) {
      // Extract gallery name from path
      const parts = dirname.split(path.sep);
      let galleryTitle = parts[parts.length - 1] || 'General';
      galleryTitle = galleryTitle.charAt(0).toUpperCase() + galleryTitle.slice(1);
      
      galleries[dirname] = {
        title: galleryTitle.replace(/-/g, ' '),
        description: '0 images',
        images: []
      };
    }
    
    // Add image to gallery
    galleries[dirname].images.push(image);
  }
  
  // Update gallery descriptions with image counts
  for (const [galleryPath, gallery] of Object.entries(galleries)) {
    gallery.description = `${gallery.images.length} images`;
  }
  
  // Update gallery config
  galleryConfig.galleries = galleries;
}

// Run the script
console.log('Starting image processing...');
processAllImages().catch(console.error); 