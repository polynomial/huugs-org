// Debug utility - Set DEBUG to false in production
const DEBUG = process.env.NODE_ENV !== 'production';
function debug(...args) {
    if (DEBUG) {
        console.log(...args);
    }
}

/**
 * Gallery Generator Script
 * 
 * This script scans your photo directories and generates the necessary
 * configurations, thumbnails, and directory structure for the photo gallery website.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);
const statAsync = promisify(fs.stat);
const readdirAsync = promisify(fs.readdir);
const mkdirAsync = promisify(fs.mkdir);
const copyFileAsync = promisify(fs.copyFile);
const writeFileAsync = promisify(fs.writeFile);

// Configuration
const PICS_DIR = 'pics';
const GALLERIES_DIR = 'galleries';
const THUMBS_SIZE = 400; // Thumbnail width in pixels
const DISPLAY_SIZE = 1800; // Maximum width for displayed images
const CONFIG_FILE = 'js/gallery-config.json';
const MAX_CONCURRENT_PROCESSES = 3; // Limit concurrent image processing
const DEFAULT_QUALITY = 80; // JPEG quality

// Configure Sharp for better memory management
sharp.cache(false); // Disable sharp cache to prevent memory leaks
sharp.concurrency(1); // Set concurrency to avoid memory issues

// Ensure directories exist
async function ensureDirectoriesExist() {
    if (!fs.existsSync(GALLERIES_DIR)) {
        await mkdirAsync(GALLERIES_DIR);
    }

    if (!fs.existsSync('js')) {
        await mkdirAsync('js');
    }
}

// Gallery configuration object
let galleryConfig = [];

// Load existing config if available (for incremental updates)
async function loadExistingConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const configData = await readFileAsync(CONFIG_FILE, 'utf8');
            return JSON.parse(configData);
        }
    } catch (error) {
        debug(`Warning: Could not load existing config: ${error.message}`);
    }
    return [];
}

// Process images in batches to avoid memory issues
async function processBatch(items, processFn) {
    const results = [];
    
    for (let i = 0; i < items.length; i += MAX_CONCURRENT_PROCESSES) {
        const batch = items.slice(i, i + MAX_CONCURRENT_PROCESSES);
        const batchResults = await Promise.all(batch.map(processFn));
        results.push(...batchResults);
        
        // Force garbage collection between batches
        if (global.gc) {
            global.gc();
        }
    }
    
    return results.filter(Boolean); // Filter out null/undefined results
}

// Process each gallery directory
async function processGalleries() {
    debug('Starting gallery generation...');
    
    await ensureDirectoriesExist();
    
    // Load existing config
    const existingConfig = await loadExistingConfig();
    const existingGalleries = new Map(existingConfig.map(g => [g.id, g]));
    
    // Get all subdirectories in pics folder
    const dirEntries = await readdirAsync(PICS_DIR, { withFileTypes: true });
    const picDirs = dirEntries
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
    
    galleryConfig = [];
    
    // Process each gallery
    for (const dirName of picDirs) {
        debug(`Processing gallery: ${dirName}`);
        const existingGallery = existingGalleries.get(dirName);
        await processGallery(dirName, existingGallery);
    }
    
    // Write the gallery configuration file
    await writeFileAsync(CONFIG_FILE, JSON.stringify(galleryConfig, null, 2));
    debug(`Gallery configuration saved to ${CONFIG_FILE}`);
    debug('Gallery generation complete!');
}

// Process a single gallery directory
async function processGallery(dirName, existingGallery = null) {
    const sourcePath = path.join(PICS_DIR, dirName);
    const galleryPath = path.join(GALLERIES_DIR, dirName);
    const thumbsPath = path.join(galleryPath, 'thumbs');
    const displayPath = path.join(galleryPath, 'display');
    
    // Create gallery directories if they don't exist
    if (!fs.existsSync(galleryPath)) {
        await mkdirAsync(galleryPath, { recursive: true });
    }
    
    if (!fs.existsSync(thumbsPath)) {
        await mkdirAsync(thumbsPath, { recursive: true });
    }
    
    if (!fs.existsSync(displayPath)) {
        await mkdirAsync(displayPath, { recursive: true });
    }
    
    // Find all image files recursively in the source directory
    const imageFiles = await getImagesRecursively(sourcePath);
    
    // Skip if no images found
    if (imageFiles.length === 0) {
        debug(`No images found in ${sourcePath}`);
        return;
    }
    
    debug(`Found ${imageFiles.length} images in ${dirName}`);
    
    // Auto-detect categories based on subdirectories or file prefixes
    const categories = detectCategories(imageFiles, sourcePath);
    
    // Process each image file in batches
    const photoEntries = [];
    
    await processBatch(imageFiles, async (file) => {
        try {
            // Get relative path from source directory
            const relativeFilePath = path.relative(sourcePath, file);
            // Normalize file paths with forward slashes
            const normalizedPath = relativeFilePath.replace(/\\/g, '/');
            
            // Generate photo object
            const fileName = path.basename(file);
            const category = assignCategory(file, sourcePath, categories);
            
            const photoEntry = {
                filename: normalizedPath,
                title: formatTitle(fileName),
                date: await getFileDate(file),
                category: category
            };
            
            // Extract EXIF data if available
            try {
                const metadata = await sharp(file).metadata();
                if (metadata) {
                    if (metadata.width && metadata.height) {
                        photoEntry.dimensions = {
                            width: metadata.width,
                            height: metadata.height
                        };
                    }
                    
                    if (metadata.exif) {
                        const exifData = {};
                        // Add useful EXIF data
                        // This is simplified - a full implementation would parse all EXIF data
                        photoEntry.exif = exifData;
                    }
                }
            } catch (metaError) {
                debug(`Could not extract metadata from ${fileName}: ${metaError.message}`);
            }
            
            photoEntries.push(photoEntry);
            
            // Copy and process files
            await processImageFile(file, normalizedPath, galleryPath, thumbsPath, displayPath);
            
            return true;
        } catch (error) {
            console.error(`Error processing ${file}:`, error);
            return false;
        }
    });
    
    // Sort photos by date
    photoEntries.sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
    });
    
    // Group photos by category
    const photosByCategory = {};
    for (const photo of photoEntries) {
        const category = photo.category || 'uncategorized';
        if (!photosByCategory[category]) {
            photosByCategory[category] = [];
        }
        photosByCategory[category].push(photo);
    }
    
    // Generate gallery metadata
    const galleryMetadata = {
        id: dirName,
        title: formatTitle(dirName),
        description: existingGallery?.description || `A collection of ${photoEntries.length} photos`,
        photoCount: photoEntries.length,
        categories: Object.keys(photosByCategory).map(category => ({
            id: category,
            title: formatTitle(category),
            photoCount: photosByCategory[category].length
        })),
        updatedAt: new Date().toISOString()
    };
    
    // Write photos.json file for this gallery
    await writeFileAsync(
        path.join(galleryPath, 'photos.json'),
        JSON.stringify(photoEntries, null, 2)
    );
    
    // Write category files
    for (const [category, photos] of Object.entries(photosByCategory)) {
        await writeFileAsync(
            path.join(galleryPath, `${category}.json`),
            JSON.stringify(photos, null, 2)
        );
    }
    
    // Add to main gallery config
    galleryConfig.push(galleryMetadata);
}

// Process an image file - create display version and thumbnail
async function processImageFile(sourceFile, normalizedPath, galleryPath, thumbsPath, displayPath) {
    const fileName = path.basename(sourceFile);
    
    // Prepare paths
    const targetFilePath = path.join(galleryPath, normalizedPath);
    const targetDir = path.dirname(targetFilePath);
    
    const thumbFilePath = path.join(thumbsPath, normalizedPath);
    const thumbDir = path.dirname(thumbFilePath);
    
    const displayFilePath = path.join(displayPath, normalizedPath);
    const displayDir = path.dirname(displayFilePath);
    
    // Create directories if needed
    for (const dir of [targetDir, thumbDir, displayDir]) {
        if (!fs.existsSync(dir)) {
            await mkdirAsync(dir, { recursive: true });
        }
    }
    
    // Only copy original if file doesn't exist or is newer
    try {
        const sourceStats = await statAsync(sourceFile);
        let shouldCopy = !fs.existsSync(targetFilePath);
        
        if (!shouldCopy) {
            const targetStats = await statAsync(targetFilePath);
            shouldCopy = sourceStats.mtime > targetStats.mtime;
        }
        
        if (shouldCopy) {
            await copyFileAsync(sourceFile, targetFilePath);
            debug(`Copied: ${fileName}`);
        }
    } catch (error) {
        console.error(`Error copying ${fileName}: ${error.message}`);
    }
    
    // Generate display version (smaller for web)
    try {
        let shouldGenerateDisplay = !fs.existsSync(displayFilePath);
        
        if (!shouldGenerateDisplay && fs.existsSync(targetFilePath)) {
            const sourceStats = await statAsync(sourceFile);
            const displayStats = await statAsync(displayFilePath);
            shouldGenerateDisplay = sourceStats.mtime > displayStats.mtime;
        }
        
        if (shouldGenerateDisplay) {
            await generateDisplayImage(sourceFile, displayFilePath);
            debug(`Display: ${fileName}`);
        }
    } catch (error) {
        console.error(`Error generating display image for ${fileName}: ${error.message}`);
    }
    
    // Generate thumbnail
    try {
        let shouldGenerateThumbnail = !fs.existsSync(thumbFilePath);
        
        if (!shouldGenerateThumbnail && fs.existsSync(targetFilePath)) {
            const sourceStats = await statAsync(sourceFile);
            const thumbStats = await statAsync(thumbFilePath);
            shouldGenerateThumbnail = sourceStats.mtime > thumbStats.mtime;
        }
        
        if (shouldGenerateThumbnail) {
            await generateThumbnail(sourceFile, thumbFilePath);
            debug(`Thumbnail: ${fileName}`);
        }
    } catch (error) {
        console.error(`Error generating thumbnail for ${fileName}: ${error.message}`);
    }
}

// Generate a web-optimized display version of an image
async function generateDisplayImage(sourceFile, targetFile) {
    try {
        await sharp(sourceFile)
            .resize({ 
                width: DISPLAY_SIZE, 
                height: DISPLAY_SIZE,
                fit: 'inside',
                withoutEnlargement: true 
            })
            .jpeg({ 
                quality: DEFAULT_QUALITY,
                progressive: true
            })
            .toFile(targetFile);
    } catch (error) {
        console.error(`Error generating display image for ${sourceFile}:`, error);
        // Fallback
        await copyFileAsync(sourceFile, targetFile);
    }
}

// Generate a thumbnail for an image
async function generateThumbnail(sourceFile, targetFile) {
    try {
        await sharp(sourceFile)
            .resize({ 
                width: THUMBS_SIZE,
                height: THUMBS_SIZE,
                fit: 'cover',
                position: 'centre',
                withoutEnlargement: true 
            })
            .jpeg({ 
                quality: DEFAULT_QUALITY,
                progressive: true
            })
            .toFile(targetFile);
    } catch (error) {
        console.error(`Error generating thumbnail for ${sourceFile}:`, error);
        // Fallback
        try {
            await copyFileAsync(sourceFile, targetFile);
        } catch (copyError) {
            console.error(`Error copying fallback thumbnail for ${sourceFile}:`, copyError);
        }
    }
}

// Get all image files recursively in a directory
async function getImagesRecursively(dir) {
    let results = [];
    
    try {
        const items = await readdirAsync(dir, { withFileTypes: true });
        
        for (const item of items) {
            const itemPath = path.join(dir, item.name);
            
            if (item.isDirectory()) {
                // Recursively search subdirectories
                const subResults = await getImagesRecursively(itemPath);
                results = results.concat(subResults);
            } else if (isImageFile(item.name)) {
                // Add image files
                results.push(itemPath);
            }
        }
    } catch (error) {
        console.error(`Error reading directory ${dir}:`, error);
    }
    
    return results;
}

// Detect categories based on directory structure or filename patterns
function detectCategories(imageFiles, sourcePath) {
    const categories = new Set();
    const dirCategories = new Map();
    const prefixCategories = new Map();
    
    // Collect subdirectories as potential categories
    for (const file of imageFiles) {
        const relativePath = path.relative(sourcePath, file);
        const parentDir = path.dirname(relativePath);
        
        if (parentDir && parentDir !== '.') {
            const category = parentDir.split(path.sep)[0]; // First level directory
            categories.add(category);
            
            if (!dirCategories.has(category)) {
                dirCategories.set(category, []);
            }
            dirCategories.get(category).push(file);
        }
        
        // Check for filename prefixes (like event_photo.jpg)
        const fileName = path.basename(file, path.extname(file));
        const prefixMatch = fileName.match(/^([a-z_]+)_/i);
        
        if (prefixMatch && prefixMatch[1]) {
            const prefix = prefixMatch[1].toLowerCase();
            categories.add(prefix);
            
            if (!prefixCategories.has(prefix)) {
                prefixCategories.set(prefix, []);
            }
            prefixCategories.get(prefix).push(file);
        }
    }
    
    return {
        all: [...categories],
        dirMap: dirCategories,
        prefixMap: prefixCategories
    };
}

// Assign a category to an image
function assignCategory(filePath, sourcePath, categories) {
    const relativePath = path.relative(sourcePath, filePath);
    const parentDir = path.dirname(relativePath);
    
    // First check directory-based category
    if (parentDir && parentDir !== '.') {
        const dirCategory = parentDir.split(path.sep)[0];
        if (categories.all.includes(dirCategory)) {
            return dirCategory;
        }
    }
    
    // Then check filename prefix
    const fileName = path.basename(filePath, path.extname(filePath));
    const prefixMatch = fileName.match(/^([a-z_]+)_/i);
    
    if (prefixMatch && prefixMatch[1]) {
        const prefix = prefixMatch[1].toLowerCase();
        if (categories.all.includes(prefix)) {
            return prefix;
        }
    }
    
    return null; // No category found
}

// Check if a file is an image based on extension
function isImageFile(filename) {
    const ext = path.extname(filename).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
}

// Format a filename into a title (remove extension, replace underscores/hyphens with spaces)
function formatTitle(filename) {
    // Remove extension
    let title = path.basename(filename, path.extname(filename));
    
    // Remove any prefix patterns like "event_" or date patterns
    title = title.replace(/^[a-z_]+_/i, '');
    title = title.replace(/^\d{4}-\d{2}-\d{2}_/i, '');
    
    // Replace underscores/hyphens with spaces
    title = title.replace(/[_-]/g, ' ');
    
    // Add space between camelCase
    title = title.replace(/([a-z])([A-Z])/g, '$1 $2');
    
    // Capitalize first letter of each word
    title = title.replace(/\b\w/g, l => l.toUpperCase());
    
    return title;
}

// Get file creation/modification date
async function getFileDate(filepath) {
    try {
        const stats = await statAsync(filepath);
        return stats.mtime.toISOString();
    } catch (error) {
        console.error(`Error getting file date for ${filepath}:`, error);
        return new Date().toISOString();
    }
}

// Run the gallery generation
processGalleries().catch(error => {
    console.error('Gallery generation failed:', error);
    process.exit(1);
}); 