/**
 * Thumbnail Generator Script
 * 
 * This script generates thumbnails for all images in the pics directory
 * It creates two sizes: 
 * - thumbnails (300px width for gallery view)
 * - medium (1200px width for lightbox view)
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
  quality: 80,
  extensions: ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG']
};

// Create directories if they don't exist
function ensureDirectoryExists(directory) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
    console.log(`Created directory: ${directory}`);
  }
}

// Process an image to create thumbnail and medium versions
async function processImage(sourceFilePath, relativePath) {
  const fileExt = path.extname(sourceFilePath).toLowerCase();
  const fileName = path.basename(sourceFilePath);
  const dirName = path.dirname(relativePath);
  
  // Create output directories
  const thumbnailDir = path.join(config.baseDir, config.thumbnailsDir, dirName);
  const mediumDir = path.join(config.baseDir, config.mediumDir, dirName);
  
  ensureDirectoryExists(thumbnailDir);
  ensureDirectoryExists(mediumDir);
  
  // Output paths
  const thumbnailPath = path.join(thumbnailDir, fileName);
  const mediumPath = path.join(mediumDir, fileName);
  
  try {
    // Generate thumbnail
    await sharp(sourceFilePath)
      .resize(config.thumbnailWidth)
      .jpeg({ quality: config.quality })
      .toFile(thumbnailPath);
    
    // Generate medium size
    await sharp(sourceFilePath)
      .resize(config.mediumWidth)
      .jpeg({ quality: config.quality })
      .toFile(mediumPath);
    
    console.log(`Processed: ${relativePath}`);
    return { thumbnail: thumbnailPath, medium: mediumPath };
  } catch (error) {
    console.error(`Error processing ${sourceFilePath}:`, error);
    return null;
  }
}

// Walk through directories recursively to find all images
function findImagesRecursively(directory, baseDir = directory) {
  const images = [];
  const items = fs.readdirSync(directory);
  
  for (const item of items) {
    const fullPath = path.join(directory, item);
    const relativePath = path.relative(baseDir, fullPath);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Recursively search subdirectories
      const subImages = findImagesRecursively(fullPath, baseDir);
      images.push(...subImages);
    } else if (config.extensions.includes(path.extname(item))) {
      // Add image files to the list
      images.push({ path: fullPath, relativePath });
    }
  }
  
  return images;
}

// Create a placeholder image for genres/events without images
async function createPlaceholderImage() {
  const placeholderPath = path.join(config.baseDir, 'thumbnails', 'placeholder.jpg');
  
  if (!fs.existsSync(placeholderPath)) {
    try {
      // Create a simple black placeholder image
      await sharp({
        create: {
          width: config.thumbnailWidth,
          height: config.thumbnailWidth,
          channels: 3,
          background: { r: 240, g: 240, b: 240 }
        }
      })
      .jpeg({ quality: config.quality })
      .toFile(placeholderPath);
      
      console.log(`Created placeholder image: ${placeholderPath}`);
    } catch (error) {
      console.error('Error creating placeholder image:', error);
    }
  }
}

// Main function
async function generateThumbnails() {
  console.log('Starting thumbnail generation...');
  
  // Create a placeholder image
  await createPlaceholderImage();
  
  // Track statistics
  const stats = {
    totalImages: 0,
    processed: 0,
    failed: 0,
    thumbnailSizeTotal: 0,
    mediumSizeTotal: 0,
    originalSizeTotal: 0
  };
  
  // Process each source directory
  for (const sourceDir of config.sourceDirs) {
    const sourcePath = path.join(config.baseDir, sourceDir);
    
    if (!fs.existsSync(sourcePath)) {
      console.log(`Source directory ${sourcePath} does not exist. Skipping.`);
      continue;
    }
    
    console.log(`Scanning directory: ${sourcePath}`);
    const images = findImagesRecursively(sourcePath);
    stats.totalImages += images.length;
    
    console.log(`Found ${images.length} images in ${sourceDir}`);
    
    // Process all images
    for (const image of images) {
      try {
        const result = await processImage(image.path, path.join(sourceDir, image.relativePath));
        
        if (result) {
          stats.processed++;
          
          // Calculate size savings
          const originalSize = fs.statSync(image.path).size;
          const thumbnailSize = fs.statSync(result.thumbnail).size;
          const mediumSize = fs.statSync(result.medium).size;
          
          stats.originalSizeTotal += originalSize;
          stats.thumbnailSizeTotal += thumbnailSize;
          stats.mediumSizeTotal += mediumSize;
        } else {
          stats.failed++;
        }
      } catch (error) {
        console.error(`Failed to process ${image.path}:`, error);
        stats.failed++;
      }
    }
  }
  
  // Create a JSON file with image information for the gallery
  generateGalleryConfig(stats);
  
  // Display summary
  console.log('\nThumbnail Generation Complete');
  console.log('---------------------------');
  console.log(`Total images found: ${stats.totalImages}`);
  console.log(`Successfully processed: ${stats.processed}`);
  console.log(`Failed: ${stats.failed}`);
  console.log('\nSize Information:');
  console.log(`Original size: ${(stats.originalSizeTotal / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`Medium size: ${(stats.mediumSizeTotal / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`Thumbnail size: ${(stats.thumbnailSizeTotal / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`Total savings: ${((stats.originalSizeTotal - stats.thumbnailSizeTotal - stats.mediumSizeTotal) / (1024 * 1024)).toFixed(2)} MB`);
}

// Generate a JSON file with gallery configuration
function generateGalleryConfig(stats) {
  const galleryConfig = {
    version: "1.0",
    lastGenerated: new Date().toISOString(),
    stats: {
      totalImages: stats.totalImages,
      totalSizeMB: (stats.originalSizeTotal / (1024 * 1024)).toFixed(2),
      thumbnailSizeMB: (stats.thumbnailSizeTotal / (1024 * 1024)).toFixed(2),
      mediumSizeMB: (stats.mediumSizeTotal / (1024 * 1024)).toFixed(2)
    },
    galleries: {}
  };
  
  // Find all galleries (subdirectories of pics)
  for (const sourceDir of config.sourceDirs) {
    const sourcePath = path.join(config.baseDir, sourceDir);
    
    if (fs.existsSync(sourcePath)) {
      // First level: genres (e.g., track, nature, etc.)
      const genres = fs.readdirSync(sourcePath);
      
      for (const genre of genres) {
        const genrePath = path.join(sourcePath, genre);
        
        if (fs.statSync(genrePath).isDirectory()) {
          // Second level: events within each genre
          const events = fs.readdirSync(genrePath);
          
          for (const event of events) {
            const eventPath = path.join(genrePath, event);
            
            if (fs.statSync(eventPath).isDirectory()) {
              // This is an event directory
              const galleryId = path.join(sourceDir, genre, event);
              const galleryImages = findImagesRecursively(eventPath, sourcePath);
              
              if (galleryImages.length > 0) {
                galleryConfig.galleries[galleryId] = {
                  title: formatTitle(event),
                  description: `${galleryImages.length} images`,
                  images: galleryImages.map(img => {
                    const fileName = path.basename(img.path);
                    return {
                      original: path.join(img.relativePath),
                      thumbnail: path.join(config.thumbnailsDir, sourceDir, img.relativePath),
                      medium: path.join(config.mediumDir, sourceDir, img.relativePath),
                      title: formatTitle(fileName.replace(/\.(jpg|jpeg|png)$/i, ''))
                    };
                  })
                };
              }
            } else if (config.extensions.includes(path.extname(event).toLowerCase())) {
              // This is an image directly in the genre folder (not in an event subfolder)
              // Create a "general" event for these images
              const galleryId = path.join(sourceDir, genre);
              
              if (!galleryConfig.galleries[galleryId]) {
                galleryConfig.galleries[galleryId] = {
                  title: formatTitle(genre),
                  description: "General images",
                  images: []
                };
              }
              
              // Add this image to the general gallery
              const imagePath = path.join(genrePath, event);
              const relativePath = path.relative(sourcePath, imagePath);
              
              galleryConfig.galleries[galleryId].images.push({
                original: relativePath,
                thumbnail: path.join(config.thumbnailsDir, sourceDir, relativePath),
                medium: path.join(config.mediumDir, sourceDir, relativePath),
                title: formatTitle(event.replace(/\.(jpg|jpeg|png)$/i, ''))
              });
            }
          }
        }
      }
    }
  }
  
  // Write gallery config to file
  const configPath = path.join(config.baseDir, 'js', 'gallery-config.json');
  fs.writeFileSync(configPath, JSON.stringify(galleryConfig, null, 2));
  console.log(`Generated gallery config: ${configPath}`);
}

// Helper function to format titles nicely
function formatTitle(str) {
  return str
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Run the thumbnail generator
generateThumbnails().catch(err => {
  console.error('Error generating thumbnails:', err);
  process.exit(1);
}); 