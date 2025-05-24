const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const { glob } = require('glob');

// Configuration
const PICS_DIR = 'pics';
const OUTPUT_DIR = 'public/images';
const THUMBNAIL_SIZE = 400;
const WEB_SIZE = 1080;
const SUPPORTED_FORMATS = ['jpg', 'jpeg', 'png', 'webp', 'tiff', 'gif'];

console.log('🖼️  Starting photo gallery processing...');

// Create output directories
async function createDirectories() {
    const dirs = [
        `${OUTPUT_DIR}/thumbnails`,
        `${OUTPUT_DIR}/web`
        // Removed original directory - we don't want to deploy raw images
    ];
    
    for (const dir of dirs) {
        await fs.mkdir(dir, { recursive: true });
    }
}

// Get all image files from pics directory
async function getImageFiles() {
    const patterns = SUPPORTED_FORMATS.map(ext => 
        `${PICS_DIR}/**/*.{${ext},${ext.toUpperCase()}}`
    );
    
    let allFiles = [];
    for (const pattern of patterns) {
        const files = await glob(pattern);
        allFiles = [...allFiles, ...files];
    }
    
    return allFiles.sort();
}

// Process a single image
async function processImage(imagePath) {
    const relativePath = path.relative(PICS_DIR, imagePath);
    const pathParts = relativePath.split(path.sep);
    const fileName = pathParts.pop();
    const dirPath = pathParts.join('/');
    
    console.log(`🔄 Processing: ${relativePath}`);
    
    try {
        // Get image metadata
        const metadata = await sharp(imagePath).metadata();
        if (!metadata.width || !metadata.height) {
            console.log(`⚠️  Skipping ${fileName}: Invalid image metadata`);
            return null;
        }
        
        // Get metadata after rotation to ensure correct dimensions
        const rotatedMetadata = await sharp(imagePath).rotate().metadata();
        
        // Create output path structure
        const outputBasePath = path.join(OUTPUT_DIR, dirPath);
        await fs.mkdir(`${outputBasePath}/thumbnails`, { recursive: true });
        await fs.mkdir(`${outputBasePath}/web`, { recursive: true });
        // Removed original directory creation - we don't deploy raw images
        
        const baseName = path.parse(fileName).name;
        const thumbnailPath = path.join(outputBasePath, 'thumbnails', `${baseName}.jpg`);
        const webPath = path.join(outputBasePath, 'web', `${baseName}.jpg`);
        
        // Generate thumbnail
        await sharp(imagePath)
            .rotate() // Auto-rotate based on EXIF orientation
            .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { 
                fit: 'inside',
                withoutEnlargement: true 
            })
            .jpeg({ quality: 85 })
            .toFile(thumbnailPath);
        
        // Generate web version
        await sharp(imagePath)
            .rotate() // Auto-rotate based on EXIF orientation
            .resize(WEB_SIZE, WEB_SIZE, { 
                fit: 'inside',
                withoutEnlargement: true 
            })
            .jpeg({ quality: 90 })
            .toFile(webPath);
        
        return {
            name: baseName,
            filename: fileName,
            thumbnailPath: `/images/${dirPath}/thumbnails/${baseName}.jpg`,
            webPath: `/images/${dirPath}/web/${baseName}.jpg`,
            aspectRatio: rotatedMetadata.width / rotatedMetadata.height,
            width: rotatedMetadata.width,
            height: rotatedMetadata.height,
            dirPath: dirPath
        };
        
    } catch (error) {
        console.error(`❌ Error processing ${fileName}:`, error.message);
        return null;
    }
}

// Build gallery structure
function buildGalleryStructure(processedImages) {
    const galleries = {};
    const navigation = [];
    
    // Group images by directory
    processedImages.forEach(image => {
        const dirPath = image.dirPath;
        
        if (!galleries[dirPath]) {
            galleries[dirPath] = {
                name: formatGalleryName(dirPath),
                path: dirPath,
                images: []
            };
        }
        
        galleries[dirPath].images.push({
            name: image.name,
            filename: image.filename,
            thumbnailPath: image.thumbnailPath,
            webPath: image.webPath,
            aspectRatio: image.aspectRatio,
            width: image.width,
            height: image.height
        });
    });
    
    // Create navigation structure
    Object.keys(galleries).forEach(galleryPath => {
        const gallery = galleries[galleryPath];
        const parts = galleryPath.split('/');
        
        navigation.push({
            name: gallery.name,
            path: galleryPath,
            slug: gallery.name.toLowerCase().replace(/\s+/g, '-'),
            level: parts.length - 1,
            hasImages: true,
            imageCount: gallery.images.length,
            category: parts[0] // First directory level as category
        });
    });
    
    // Sort navigation by category and then by name
    navigation.sort((a, b) => {
        if (a.category !== b.category) {
            return a.category.localeCompare(b.category);
        }
        return a.name.localeCompare(b.name);
    });
    
    return { galleries, navigation };
}

// Format gallery name from directory path
function formatGalleryName(dirPath) {
    const parts = dirPath.split('/');
    const lastPart = parts[parts.length - 1];
    
    // Replace underscores and capitalize
    return lastPart
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
}

// Main processing function
async function processImages() {
    try {
        // Create output directories
        await createDirectories();
        
        // Get all image files
        const imageFiles = await getImageFiles();
        console.log(`📊 Found ${imageFiles.length} image files`);
        
        if (imageFiles.length === 0) {
            console.log('⚠️  No images found in pics/ directory');
            return;
        }
        
        // Process all images
        let processedCount = 0;
        let skippedCount = 0;
        const processedImages = [];
        
        for (const filePath of imageFiles) {
            try {
                const result = await processImage(filePath);
                if (result) {
                    processedImages.push(result);
                    processedCount++;
                } else {
                    skippedCount++;
                }
            } catch (error) {
                console.error(`❌ Error processing ${filePath}:`, error.message);
                skippedCount++;
            }
        }
        
        // Build gallery structure
        const { galleries, navigation } = buildGalleryStructure(processedImages);
        
        // Save configuration files
        const config = {
            generated: new Date().toISOString(),
            totalImages: processedCount,
            galleries: galleries
        };
        
        await fs.writeFile(
            'public/gallery-config.json',
            JSON.stringify(config, null, 2)
        );
        
        await fs.writeFile(
            'public/navigation.json',
            JSON.stringify(navigation, null, 2)
        );
        
        // Generate summary
        console.log('\n✅ Photo gallery processing complete!');
        console.log(`   📸 Processed: ${processedCount} images`);
        console.log(`   ⚠️  Skipped: ${skippedCount} images`);
        console.log(`   📁 Galleries: ${Object.keys(galleries).length}`);
        console.log(`   📄 Configuration saved to: public/gallery-config.json`);
        console.log(`   🗂️  Navigation saved to: public/navigation.json`);
        
        // Show gallery breakdown
        console.log('\n📋 Gallery Summary:');
        Object.entries(galleries).forEach(([path, gallery]) => {
            console.log(`   • ${gallery.name}: ${gallery.images.length} photos`);
        });
        
        console.log('\n🚀 Your photography website is ready!');
        console.log('   Run "npm start" to start the local server');
        
    } catch (error) {
        console.error('❌ Processing failed:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    processImages();
}

module.exports = { processImages }; 