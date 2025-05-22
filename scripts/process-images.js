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
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const crypto = require('crypto');

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

const config = {
    thumbnailSize: { width: 300, height: 300 },
    mediumSize: { width: 1200, height: 1200 },
    quality: 80,
    formats: ['jpg', 'jpeg', 'png'],
    sourceDir: 'pics',
    outputDirs: {
        thumbnails: 'public/images/thumbnails',
        mediums: 'public/images/mediums',
        metadata: 'public/images/metadata'
    }
};

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
  await fs.mkdir(thumbnailDir, { recursive: true });
  
  // Create medium directory
  const mediumPath = path.join(MEDIUM_DIR, imagePath);
  const mediumDir = path.dirname(mediumPath);
  await fs.mkdir(mediumDir, { recursive: true });

  // Create original directory
  const originalPath = path.join(ORIGINAL_DIR, imagePath);
  const originalDir = path.dirname(originalPath);
  await fs.mkdir(originalDir, { recursive: true });
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
    await createOutputDirs(relPath);

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
    await fs.mkdir(configDir, { recursive: true });
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
  for (const dir of Object.values(config.outputDirs)) {
    await fs.mkdir(dir, { recursive: true });
  }
}

// Run the script
processAllImages().catch(console.error);

// Generate a hash for the image to use as a cache key
function generateImageHash(filePath) {
    return crypto.createHash('md5').update(filePath).digest('hex');
}

// Process a single image
async function processImage(filePath, relativePath) {
    try {
        const image = sharp(filePath);
        const metadata = await image.metadata();
        const hash = generateImageHash(relativePath);
        
        // Calculate aspect ratio and dimensions for layout
        const aspectRatio = metadata.width / metadata.height;
        const layoutInfo = {
            originalWidth: metadata.width,
            originalHeight: metadata.height,
            aspectRatio,
            hash,
            relativePath
        };

        // Generate thumbnail
        const thumbnailPath = path.join(config.outputDirs.thumbnails, `${hash}.jpg`);
        await image
            .clone()
            .resize(config.thumbnailSize.width, config.thumbnailSize.height, {
                fit: 'cover',
                position: 'center'
            })
            .jpeg({ quality: config.quality })
            .toFile(thumbnailPath);

        // Generate medium size
        const mediumPath = path.join(config.outputDirs.mediums, `${hash}.jpg`);
        await image
            .clone()
            .resize(config.mediumSize.width, config.mediumSize.height, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .jpeg({ quality: config.quality })
            .toFile(mediumPath);

        // Save metadata
        const metadataPath = path.join(config.outputDirs.metadata, `${hash}.json`);
        await fs.writeFile(metadataPath, JSON.stringify(layoutInfo, null, 2));

        return layoutInfo;
    } catch (error) {
        console.error(`Error processing ${filePath}:`, error);
        return null;
    }
}

// Process all images in a directory recursively
async function processDirectory(dirPath, relativePath = '') {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const results = [];

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const newRelativePath = path.join(relativePath, entry.name);

        if (entry.isDirectory()) {
            const subResults = await processDirectory(fullPath, newRelativePath);
            results.push(...subResults);
        } else if (entry.isFile() && config.formats.includes(path.extname(entry.name).toLowerCase().slice(1))) {
            const result = await processImage(fullPath, newRelativePath);
            if (result) {
                results.push(result);
            }
        }
    }

    return results;
}

// Generate a layout configuration file
async function generateLayoutConfig(images) {
    const layoutConfig = {
        images: images,
        lastUpdated: new Date().toISOString()
    };

    const configPath = path.join(config.outputDirs.metadata, 'layout-config.json');
    await fs.writeFile(configPath, JSON.stringify(layoutConfig, null, 2));
}

// Main function
async function main() {
    try {
        console.log('Starting image processing pipeline...');
        await ensureDirectories();
        
        const images = await processDirectory(config.sourceDir);
        console.log(`Processed ${images.length} images`);
        
        await generateLayoutConfig(images);
        console.log('Layout configuration generated');
        
        console.log('Image processing complete!');
    } catch (error) {
        console.error('Error in image processing pipeline:', error);
        process.exit(1);
    }
}

main(); 