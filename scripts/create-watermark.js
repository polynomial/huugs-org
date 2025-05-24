const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// 10 professional font styles for photography watermarks
const fontStyles = {
    'tenor': {
        name: 'Tenor Sans',
        description: 'Elegant display serif - sophisticated and distinctive for professional branding',
        svg: (text, width, height) => `
            <svg width="${width}" height="${height}">
                <defs>
                    <style>
                        .text { 
                            font-family: 'Tenor Sans', 'Times New Roman', serif; 
                            font-size: 30px; 
                            font-weight: normal; 
                            fill: white; 
                            stroke: rgba(0,0,0,0.4); 
                            stroke-width: 0.5;
                            text-anchor: middle;
                            letter-spacing: 1px;
                        }
                    </style>
                </defs>
                <text x="${width/2}" y="${height/2 + 10}" class="text">${text}</text>
            </svg>
        `
    },
    'helvetica': {
        name: 'Helvetica Light',
        description: 'Ultra-clean and professional - the gold standard for minimal design',
        svg: (text, width, height) => `
            <svg width="${width}" height="${height}">
                <defs>
                    <style>
                        .text { 
                            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; 
                            font-size: 24px; 
                            font-weight: 300; 
                            fill: white; 
                            stroke: rgba(0,0,0,0.3); 
                            stroke-width: 0.5;
                            text-anchor: middle;
                            letter-spacing: 1px;
                        }
                    </style>
                </defs>
                <text x="${width/2}" y="${height/2 + 8}" class="text">${text}</text>
            </svg>
        `
    },
    'futura': {
        name: 'Futura Light',
        description: 'Geometric precision - perfect for modern and architectural photography',
        svg: (text, width, height) => `
            <svg width="${width}" height="${height}">
                <defs>
                    <style>
                        .text { 
                            font-family: 'Futura', 'Century Gothic', 'Avant Garde', sans-serif; 
                            font-size: 24px; 
                            font-weight: 300; 
                            fill: white; 
                            stroke: rgba(0,0,0,0.4); 
                            stroke-width: 0.5;
                            text-anchor: middle;
                            letter-spacing: 2px;
                        }
                    </style>
                </defs>
                <text x="${width/2}" y="${height/2 + 8}" class="text">${text}</text>
            </svg>
        `
    },
    'optima': {
        name: 'Optima',
        description: 'Humanist elegance - sophisticated choice for fine art and portraits',
        svg: (text, width, height) => `
            <svg width="${width}" height="${height}">
                <defs>
                    <style>
                        .text { 
                            font-family: 'Optima', 'Lucida Grande', sans-serif; 
                            font-size: 25px; 
                            font-weight: normal; 
                            fill: white; 
                            stroke: rgba(0,0,0,0.4); 
                            stroke-width: 0.5;
                            text-anchor: middle;
                            letter-spacing: 1px;
                        }
                    </style>
                </defs>
                <text x="${width/2}" y="${height/2 + 9}" class="text">${text}</text>
            </svg>
        `
    },
    'avenir': {
        name: 'Avenir Light',
        description: 'Friendly yet professional - excellent for lifestyle and wedding photography',
        svg: (text, width, height) => `
            <svg width="${width}" height="${height}">
                <defs>
                    <style>
                        .text { 
                            font-family: 'Avenir', 'Avenir Next', 'Century Gothic', sans-serif; 
                            font-size: 24px; 
                            font-weight: 300; 
                            fill: white; 
                            stroke: rgba(0,0,0,0.3); 
                            stroke-width: 0.5;
                            text-anchor: middle;
                            letter-spacing: 1.5px;
                        }
                    </style>
                </defs>
                <text x="${width/2}" y="${height/2 + 8}" class="text">${text}</text>
            </svg>
        `
    },
    'lato': {
        name: 'Lato Light',
        description: 'Modern and approachable - great for commercial and event photography',
        svg: (text, width, height) => `
            <svg width="${width}" height="${height}">
                <defs>
                    <style>
                        .text { 
                            font-family: 'Lato', 'Helvetica Neue', Arial, sans-serif; 
                            font-size: 24px; 
                            font-weight: 300; 
                            fill: white; 
                            stroke: rgba(0,0,0,0.3); 
                            stroke-width: 0.5;
                            text-anchor: middle;
                            letter-spacing: 1px;
                        }
                    </style>
                </defs>
                <text x="${width/2}" y="${height/2 + 8}" class="text">${text}</text>
            </svg>
        `
    },
    'opensans': {
        name: 'Open Sans Light',
        description: 'Highly readable and neutral - versatile for all photography types',
        svg: (text, width, height) => `
            <svg width="${width}" height="${height}">
                <defs>
                    <style>
                        .text { 
                            font-family: 'Open Sans', 'Helvetica Neue', Arial, sans-serif; 
                            font-size: 24px; 
                            font-weight: 300; 
                            fill: white; 
                            stroke: rgba(0,0,0,0.3); 
                            stroke-width: 0.5;
                            text-anchor: middle;
                            letter-spacing: 1px;
                        }
                    </style>
                </defs>
                <text x="${width/2}" y="${height/2 + 8}" class="text">${text}</text>
            </svg>
        `
    },
    'source': {
        name: 'Source Sans Pro Light',
        description: 'Technical precision - ideal for documentary and journalistic work',
        svg: (text, width, height) => `
            <svg width="${width}" height="${height}">
                <defs>
                    <style>
                        .text { 
                            font-family: 'Source Sans Pro', 'Arial', sans-serif; 
                            font-size: 24px; 
                            font-weight: 300; 
                            fill: white; 
                            stroke: rgba(0,0,0,0.4); 
                            stroke-width: 0.5;
                            text-anchor: middle;
                            letter-spacing: 1px;
                        }
                    </style>
                </defs>
                <text x="${width/2}" y="${height/2 + 8}" class="text">${text}</text>
            </svg>
        `
    },
    'roboto': {
        name: 'Roboto Light',
        description: 'Contemporary and digital-friendly - perfect for modern lifestyle shots',
        svg: (text, width, height) => `
            <svg width="${width}" height="${height}">
                <defs>
                    <style>
                        .text { 
                            font-family: 'Roboto', 'Arial', sans-serif; 
                            font-size: 24px; 
                            font-weight: 300; 
                            fill: white; 
                            stroke: rgba(0,0,0,0.3); 
                            stroke-width: 0.5;
                            text-anchor: middle;
                            letter-spacing: 1px;
                        }
                    </style>
                </defs>
                <text x="${width/2}" y="${height/2 + 8}" class="text">${text}</text>
            </svg>
        `
    },
    'montserrat': {
        name: 'Montserrat Light',
        description: 'Urban and stylish - excellent for fashion and creative photography',
        svg: (text, width, height) => `
            <svg width="${width}" height="${height}">
                <defs>
                    <style>
                        .text { 
                            font-family: 'Montserrat', 'Helvetica Neue', Arial, sans-serif; 
                            font-size: 24px; 
                            font-weight: 300; 
                            fill: white; 
                            stroke: rgba(0,0,0,0.3); 
                            stroke-width: 0.5;
                            text-anchor: middle;
                            letter-spacing: 2px;
                        }
                    </style>
                </defs>
                <text x="${width/2}" y="${height/2 + 8}" class="text">${text}</text>
            </svg>
        `
    },
    'proxima': {
        name: 'Proxima Nova Light',
        description: 'Versatile and popular - works beautifully for any photography genre',
        svg: (text, width, height) => `
            <svg width="${width}" height="${height}">
                <defs>
                    <style>
                        .text { 
                            font-family: 'Proxima Nova', 'Avenir', 'Helvetica Neue', Arial, sans-serif; 
                            font-size: 24px; 
                            font-weight: 300; 
                            fill: white; 
                            stroke: rgba(0,0,0,0.3); 
                            stroke-width: 0.5;
                            text-anchor: middle;
                            letter-spacing: 1px;
                        }
                    </style>
                </defs>
                <text x="${width/2}" y="${height/2 + 8}" class="text">${text}</text>
            </svg>
        `
    }
};

async function createTextWatermark(text, style, outputPath) {
    console.log(`🎨 Creating text watermark: "${text}" in ${style.name} style...`);
    
    // Calculate watermark dimensions based on text length and font
    const watermarkWidth = Math.max(200, text.length * 20);
    const watermarkHeight = 50;
    
    // Create SVG watermark
    const watermarkSvg = style.svg(text, watermarkWidth, watermarkHeight);
    
    // Convert SVG to PNG
    const watermark = await sharp(Buffer.from(watermarkSvg))
        .png()
        .toBuffer();
    
    // Save the watermark
    await fs.promises.writeFile(outputPath, watermark);
    console.log(`💾 Text watermark saved to: ${outputPath}`);
    
    return watermark;
}

async function applyWatermarkToImage(imagePath, watermarkBuffer, outputPath, opacity = 0.8) {
    console.log(`🖼️ Applying watermark to: ${imagePath}`);
    
    // Load the image
    const image = sharp(imagePath);
    const imageMetadata = await image.metadata();
    console.log(`📏 Image dimensions: ${imageMetadata.width}x${imageMetadata.height}`);
    
    // Calculate watermark size (8% of image width, max 250px, min 100px)
    const watermarkWidth = Math.min(250, Math.max(100, Math.round(imageMetadata.width * 0.08)));
    
    // Resize watermark to appropriate size
    const resizedWatermark = await sharp(watermarkBuffer)
        .resize(watermarkWidth, null, {
            fit: 'inside',
            withoutEnlargement: true
        })
        .png()
        .toBuffer();
    
    const watermarkMetadata = await sharp(resizedWatermark).metadata();
    
    // Position watermark in bottom-right corner with 20px margin
    const left = imageMetadata.width - watermarkMetadata.width - 20;
    const top = imageMetadata.height - watermarkMetadata.height - 20;
    
    console.log(`📍 Watermark position: ${left}, ${top}`);
    
    // Apply watermark with specified opacity
    const watermarkedImage = await image
        .composite([
            {
                input: resizedWatermark,
                left: left,
                top: top,
                blend: 'over'
            }
        ])
        .jpeg({ quality: 90 })
        .toBuffer();
    
    // Save the watermarked image
    await fs.promises.writeFile(outputPath, watermarkedImage);
    console.log(`💾 Watermarked image saved to: ${outputPath}`);
    
    return outputPath;
}

async function main() {
    try {
        console.log('🚀 Starting text watermark creation process...');
        
        const text = '© Huugs.org';
        const sampleImagePath = path.join(__dirname, '../public/images/events/saturday_market/web/bubble_IMG_6738.jpg');
        
        // Check if sample image exists
        if (!fs.existsSync(sampleImagePath)) {
            throw new Error(`Sample image not found: ${sampleImagePath}`);
        }
        
        // Create watermarks for each font style
        const results = [];
        for (const [styleKey, style] of Object.entries(fontStyles)) {
            console.log(`\n📝 Processing ${style.name}...`);
            
            // Create individual watermark
            const watermarkPath = path.join(__dirname, `../public/assets/watermark-${styleKey}.png`);
            const watermarkBuffer = await createTextWatermark(text, style, watermarkPath);
            
            // Apply to sample image
            const outputImagePath = path.join(__dirname, `../public/watermark-sample-${styleKey}.jpg`);
            await applyWatermarkToImage(sampleImagePath, watermarkBuffer, outputImagePath);
            
            results.push({
                key: styleKey,
                name: style.name,
                description: style.description,
                watermarkPath: `assets/watermark-${styleKey}.png`,
                samplePath: `watermark-sample-${styleKey}.jpg`
            });
        }
        
        console.log('\n✅ All watermark styles created successfully!');
        console.log('\n📁 Generated files:');
        results.forEach(result => {
            console.log(`   • ${result.name}: ${result.samplePath}`);
        });
        
        return results;
        
    } catch (error) {
        console.error('❌ Error creating watermarks:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { createTextWatermark, applyWatermarkToImage, fontStyles }; 