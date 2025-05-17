/**
 * Gallery Generator Script
 * 
 * This script scans your photo directories and generates the necessary
 * configurations, thumbnails, and directory structure for the photo gallery website.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Configuration
const PICS_DIR = 'pics';
const GALLERIES_DIR = 'galleries';
const THUMBS_SIZE = 400; // Thumbnail width in pixels
const CONFIG_FILE = 'js/gallery-config.json';

// Ensure directories exist
if (!fs.existsSync(GALLERIES_DIR)) {
    fs.mkdirSync(GALLERIES_DIR);
}

if (!fs.existsSync('js')) {
    fs.mkdirSync('js');
}

// Get all subdirectories in pics folder
const picDirs = fs.readdirSync(PICS_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

// Gallery configuration object
const galleryConfig = [];

// Process each gallery directory
async function processGalleries() {
    console.log('Starting gallery generation...');
    
    for (const dirName of picDirs) {
        console.log(`Processing gallery: ${dirName}`);
        await processGallery(dirName);
    }
    
    // Write the gallery configuration file
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(galleryConfig, null, 2));
    console.log(`Gallery configuration saved to ${CONFIG_FILE}`);
    console.log('Gallery generation complete!');
}

// Process a single gallery directory
async function processGallery(dirName) {
    const sourcePath = path.join(PICS_DIR, dirName);
    const galleryPath = path.join(GALLERIES_DIR, dirName);
    const thumbsPath = path.join(galleryPath, 'thumbs');
    
    // Create gallery directories if they don't exist
    if (!fs.existsSync(galleryPath)) {
        fs.mkdirSync(galleryPath, { recursive: true });
    }
    
    if (!fs.existsSync(thumbsPath)) {
        fs.mkdirSync(thumbsPath);
    }
    
    // Find all image files recursively in the source directory
    const imageFiles = getImagesRecursively(sourcePath);
    
    // Skip if no images found
    if (imageFiles.length === 0) {
        console.log(`No images found in ${sourcePath}`);
        return;
    }
    
    // Process each image file
    const photoEntries = [];
    for (const file of imageFiles) {
        try {
            // Get relative path from source directory
            const relativeFilePath = path.relative(sourcePath, file);
            // Normalize file paths with forward slashes
            const normalizedPath = relativeFilePath.replace(/\\/g, '/');
            
            // Generate photo object
            const fileName = path.basename(file);
            const photoEntry = {
                filename: normalizedPath,
                title: formatTitle(fileName),
                date: getFileDate(file)
            };
            
            photoEntries.push(photoEntry);
            
            // Copy original to gallery directory
            const targetFilePath = path.join(galleryPath, normalizedPath);
            const targetDir = path.dirname(targetFilePath);
            
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }
            
            // Only copy if file doesn't exist or is newer
            if (!fs.existsSync(targetFilePath) || 
                fs.statSync(file).mtime > fs.statSync(targetFilePath).mtime) {
                fs.copyFileSync(file, targetFilePath);
                console.log(`Copied: ${fileName}`);
            }
            
            // Generate thumbnail
            const thumbFilePath = path.join(thumbsPath, normalizedPath);
            const thumbDir = path.dirname(thumbFilePath);
            
            if (!fs.existsSync(thumbDir)) {
                fs.mkdirSync(thumbDir, { recursive: true });
            }
            
            // Only create thumbnail if it doesn't exist or source is newer
            if (!fs.existsSync(thumbFilePath) || 
                fs.statSync(file).mtime > fs.statSync(thumbFilePath).mtime) {
                await generateThumbnail(file, thumbFilePath);
                console.log(`Thumbnail: ${fileName}`);
            }
        } catch (error) {
            console.error(`Error processing ${file}:`, error);
        }
    }
    
    // Sort photos by date
    photoEntries.sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
    });
    
    // Write photos.json file for this gallery
    fs.writeFileSync(
        path.join(galleryPath, 'photos.json'),
        JSON.stringify(photoEntries, null, 2)
    );
    
    // Add to main gallery config
    galleryConfig.push({
        id: dirName,
        title: formatTitle(dirName),
        description: `A collection of ${photoEntries.length} photos`,
        photoCount: photoEntries.length
    });
}

// Generate a thumbnail for an image
async function generateThumbnail(sourceFile, targetFile) {
    try {
        await sharp(sourceFile)
            .resize({ width: THUMBS_SIZE, withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toFile(targetFile);
    } catch (error) {
        console.error(`Error generating thumbnail for ${sourceFile}:`, error);
        // Fallback: just copy the original if thumbnail generation fails
        fs.copyFileSync(sourceFile, targetFile);
    }
}

// Get all image files recursively in a directory
function getImagesRecursively(dir) {
    let results = [];
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
        const itemPath = path.join(dir, item.name);
        
        if (item.isDirectory()) {
            // Recursively search subdirectories
            results = results.concat(getImagesRecursively(itemPath));
        } else if (isImageFile(item.name)) {
            // Add image files
            results.push(itemPath);
        }
    }
    
    return results;
}

// Check if a file is an image based on extension
function isImageFile(filename) {
    const ext = path.extname(filename).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
}

// Format a filename into a title (remove extension, replace underscores/hyphens with spaces)
function formatTitle(filename) {
    return path.basename(filename, path.extname(filename))
        .replace(/[_-]/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2'); // Add space between camelCase
}

// Get file creation/modification date
function getFileDate(filepath) {
    const stats = fs.statSync(filepath);
    return stats.mtime.toISOString();
}

// Run the gallery generation
processGalleries().catch(error => {
    console.error('Gallery generation failed:', error);
}); 