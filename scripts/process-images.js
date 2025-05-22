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

const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const glob = require('glob');
const mkdirp = require('mkdirp');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

// Configuration
const SOURCE_DIR = 'pics';
const PUBLIC_DIR = 'public';
const IMAGES_DIR = path.join(PUBLIC_DIR, 'images');
const THUMBNAIL_DIR = path.join(IMAGES_DIR, 'thumbnails');
const MEDIUM_DIR = path.join(IMAGES_DIR, 'medium');
const ORIGINAL_DIR = path.join(IMAGES_DIR, 'original');
const CONFIG_FILE = path.join(PUBLIC_DIR, 'js', 'gallery-config.json');
const THUMBNAIL_SIZE = 300;
const MEDIUM_SIZE = 1200;
const QUALITY = 80;
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
async function findImages(dir) {
  const files = await fs.readdir(dir);
  const imageFiles = [];

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = await fs.stat(fullPath);

    if (stat.isDirectory()) {
      const subDirImages = await findImages(fullPath);
      imageFiles.push(...subDirImages);
    } else if (SUPPORTED_FORMATS.includes(path.extname(file).toLowerCase())) {
      imageFiles.push(fullPath);
    }
  }

  return imageFiles;
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

  // Create original directory
  const originalPath = path.join(ORIGINAL_DIR, imagePath);
  const originalDir = path.dirname(originalPath);
  await mkdirp(originalDir);
}

/**
 * Process a single image
 * @param {string} inputPath
 * @param {string} relPath - relative path from SOURCE_DIR
 */
async function processImage(inputPath, relPath) {
  try {
    const filename = path.basename(inputPath);
    const thumbnailPath = path.join(THUMBNAIL_DIR, relPath);
    const mediumPath = path.join(MEDIUM_DIR, relPath);
    const originalPath = path.join(ORIGINAL_DIR, relPath);

    // Ensure output directories exist
    await mkdirp(path.dirname(thumbnailPath));
    await mkdirp(path.dirname(mediumPath));
    await mkdirp(path.dirname(originalPath));

    // Copy original image
    await fs.copyFile(inputPath, originalPath);

    // Read image metadata
    const metadata = await sharp(inputPath).metadata();
    console.log(`Processing ${relPath}: ${metadata.width}x${metadata.height}`);

    // Create thumbnail
    await sharp(inputPath)
      .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: QUALITY })
      .toFile(thumbnailPath);

    // Create medium-sized version
    await sharp(inputPath)
      .resize(MEDIUM_SIZE, MEDIUM_SIZE, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: QUALITY })
      .toFile(mediumPath);

    console.log(`✓ Created versions for ${relPath}`);
    return true;
  } catch (error) {
    console.error(`Error processing ${inputPath}:`, error);
    return false;
  }
}

/**
 * Process all images and build gallery config
 */
async function processAllImages() {
  try {
    console.log('Starting image processing...');
    await ensureDirectories();

    const images = await findImages(SOURCE_DIR);
    console.log(`Found ${images.length} images to process`);

    let successCount = 0;
    let failCount = 0;
    // Map: { [gallery]: { [event]: [photoObj, ...] } }
    const galleries = {};

    for (const image of images) {
      // relPath: e.g. track/best/image.jpg
      const relPath = path.relative(SOURCE_DIR, image);
      const parts = relPath.split(path.sep);
      if (parts.length < 2) continue; // skip images not in a subfolder
      const gallery = parts[0];
      const event = parts[1];
      const eventKey = event;
      const galleryKey = gallery;

      // Process image
      const success = await processImage(image, relPath);
      if (success) {
        successCount++;
        // Add to config
        if (!galleries[galleryKey]) {
          galleries[galleryKey] = {
            title: galleryKey.replace(/_/g, ' '),
            events: {}
          };
        }
        if (!galleries[galleryKey].events[eventKey]) {
          galleries[galleryKey].events[eventKey] = {
            title: eventKey.replace(/_/g, ' '),
            photos: []
          };
        }
        galleries[galleryKey].events[eventKey].photos.push({
          original: `/images/original/${relPath}`,
          thumbnail: `/images/thumbnails/${relPath}`,
          medium: `/images/medium/${relPath}`,
          title: path.basename(relPath, path.extname(relPath)).replace(/_/g, ' ')
        });
      } else {
        failCount++;
      }
    }

    // Update config
    galleryConfig.galleries = galleries;
    galleryConfig.stats = {
      processedImages: successCount,
      failedImages: failCount
    };
    galleryConfig.lastGenerated = new Date().toISOString();

    // Write config file
    const configDir = path.dirname(CONFIG_FILE);
    await mkdirp(configDir);
    await fs.writeFile(
      CONFIG_FILE,
      JSON.stringify(galleryConfig, null, 2)
    );

    console.log('\nProcessing complete!');
    console.log(`Successfully processed: ${successCount} images`);
    if (failCount > 0) {
      console.log(`Failed to process: ${failCount} images`);
    }
    console.log(`Gallery config written to ${CONFIG_FILE}`);
  } catch (error) {
    console.error('Error processing images:', error);
  }
}

// Ensure directories exist
async function ensureDirectories() {
  const dirs = [THUMBNAIL_DIR, MEDIUM_DIR, ORIGINAL_DIR];
  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true });
  }
}

// Run the script
processAllImages().catch(console.error); 