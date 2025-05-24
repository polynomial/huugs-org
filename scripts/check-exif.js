const sharp = require('sharp');
const path = require('path');

async function checkExifData(imagePath) {
    try {
        console.log(`🔍 Checking EXIF data for: ${imagePath}`);
        
        const metadata = await sharp(imagePath).metadata();
        
        console.log('📊 Image metadata:');
        console.log(`   Width: ${metadata.width}px`);
        console.log(`   Height: ${metadata.height}px`);
        console.log(`   Format: ${metadata.format}`);
        console.log(`   Has EXIF: ${metadata.exif ? 'Yes' : 'No'}`);
        
        if (metadata.exif) {
            console.log(`   EXIF data length: ${metadata.exif.length} bytes`);
            console.log(`   EXIF data: ${metadata.exif.toString('hex').substring(0, 100)}...`);
        }
        
        return metadata;
        
    } catch (error) {
        console.error('❌ Error checking EXIF data:', error.message);
        return null;
    }
}

async function main() {
    const webImagePath = path.join(__dirname, '../public/images/events/saturday_market/web/bubble_IMG_6738.jpg');
    const originalImagePath = path.join(__dirname, '../pics/events/Saturday Market/bubble_IMG_6738.JPG');
    
    console.log('🚀 Checking EXIF data in processed and original images...\n');
    
    console.log('📋 Original image:');
    await checkExifData(originalImagePath);
    
    console.log('\n📋 Processed web image:');
    await checkExifData(webImagePath);
}

if (require.main === module) {
    main();
} 