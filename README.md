# Huugs Media Photography Website

A beautiful, responsive photography gallery website that automatically generates galleries from your photo directories with masonry layout and Fancybox viewer.

## Features

✨ **Automatic Gallery Generation** - Just add photos to directories and run one command  
🖼️ **Masonry Layout** - Images display in their natural aspect ratios  
🔍 **Fancybox Viewer** - Click any image to view in full-screen with zoom and navigation  
📱 **Responsive Design** - Works perfectly on desktop, tablet, and mobile  
⚡ **Optimized Images** - Automatically generates thumbnails and web-optimized versions  
🎨 **Professional Design** - Clean, modern interface with your branding  
📄 **Bio Page** - Professional about page for your photography business  

## Quick Start

### Local Development

### 1. Add Your Photos
```bash
# Organize your photos in the pics/ directory
pics/
├── events/
│   └── saturday_market/
│       ├── photo1.jpg
│       ├── photo2.jpg
│       └── ...
└── track/
    └── bigten/
        ├── photo1.jpg
        └── photo2.jpg
```

### 2. Process Images
```bash
npm run process-images
```

### 3. Start the Server
```bash
npm start
```

### 4. View Your Website
Open http://localhost:3000 in your browser

## 🚀 Automated Deployment

This project includes automated deployment to GitHub Pages with custom domain support.

### Setup (One-time)
1. **Push to GitHub**: Commit your code to a GitHub repository
2. **Enable GitHub Pages**: Go to Settings → Pages → Source: GitHub Actions  
3. **Configure Domain**: Set up DNS for `huugs.org` (see [DEPLOYMENT.md](DEPLOYMENT.md))

### Usage (Every time you add photos)
1. **Add photos** to `pics/` directory
2. **Commit and push**:
   ```bash
   git add pics/
   git commit -m "Add new photos"
   git push
   ```
3. **Automatic magic**: GitHub Actions will:
   - Process your images
   - Generate thumbnails and web versions
   - Deploy to https://huugs.org
   - Complete in ~2-3 minutes

📖 **Full deployment guide**: [DEPLOYMENT.md](DEPLOYMENT.md)

## Directory Structure

```
photos/
├── pics/                    # Your original photos go here
│   ├── events/
│   ├── track/
│   └── portfolio/
├── public/                  # Generated website files
│   ├── images/             # Processed images (auto-generated)
│   ├── index.html          # Main gallery page
│   ├── bio.html           # About page
│   ├── gallery-config.json # Gallery configuration (auto-generated)
│   └── navigation.json     # Navigation structure (auto-generated)
├── scripts/
│   ├── process-images.js   # Image processing script
│   └── test-gallery.js     # Test suite
├── server.js              # Local web server
└── package.json           # Dependencies and scripts
```

## Available Commands

| Command | Description |
|---------|-------------|
| `npm start` | Start the local web server |
| `npm run process-images` | Process photos and generate galleries |
| `npm test` | Run the test suite to verify everything works |
| `npm run build` | Alias for process-images |

## Adding New Photos

1. **Add photos to directories** in `pics/`
   - Create subdirectories to organize by event, category, etc.
   - Supported formats: JPG, JPEG, PNG, WebP, TIFF, GIF

2. **Process the images**:
   ```bash
   npm run process-images
   ```

3. **Refresh your browser** - New galleries will appear automatically!

## Image Processing

The system automatically creates:
- **Thumbnails** (400px) - For gallery grid display
- **Web versions** (1080px) - For Fancybox viewer
- **Original copies** - Preserved in the public directory

All processed images are optimized for web delivery with appropriate compression.

## Customization

### Updating Your Bio
Edit `public/bio.html` to customize:
- Your photo and description
- Contact information
- Specialties and approach
- Any other personal details

### Styling
The website uses:
- **Font**: Montserrat (Google Fonts)
- **Colors**: Dark theme with red accents (#e74c3c)
- **Layout**: CSS Grid masonry with responsive breakpoints

### Logo and Branding
The website uses the Huugs Media brand identity with:
- **Logo**: Professional Huugs Media logo in the header and footer
- **Favicon**: Custom favicon for browser tabs  
- **Colors**: Consistent brand colors throughout
  - Primary red: `#e74c3c`
  - Hover red: `#c0392b`
  - Dark backgrounds: `#222`, `#333`, `#1f1f1f`
- **Typography**: Montserrat font family for clean, modern text

To replace with your own branding:
- Replace `public/assets/huugs-media-logo.png` with your logo
- Replace `public/favicon.ico` with your favicon
- Update colors in the CSS as needed

## Technical Details

### Image Optimization
- **Sharp** library for high-quality image processing
- **Aspect ratio preservation** for natural masonry layout
- **Lazy loading** for improved performance
- **Cache headers** for faster subsequent loads

### Gallery Features
- **Fancybox 5.0** integration with:
  - Zoom controls
  - Slideshow mode
  - Thumbnail navigation
  - Download option
  - Keyboard shortcuts

### Responsive Design
- **Mobile-first** approach
- **CSS Grid** with automatic column sizing
- **Touch-friendly** navigation
- **Optimized** for all screen sizes

## Troubleshooting

### Server Won't Start
```bash
# Kill any existing server process
pkill -f "node server.js"

# Start fresh
npm start
```

### Images Not Loading
```bash
# Reprocess images
npm run process-images

# Check for errors in the output
```

### Test the Website
```bash
# Run automated tests
npm test
```

## File Formats Supported

- **JPEG/JPG** - Most common format
- **PNG** - For images with transparency
- **WebP** - Modern, efficient format
- **TIFF** - High-quality format
- **GIF** - For simple graphics

## Performance Tips

1. **Organize photos** into logical directories
2. **Limit directory size** to ~50-100 photos for best performance
3. **Use descriptive names** for directories (they become gallery titles)
4. **Process images** after adding new photos

## Development

### Project Structure
- **Node.js** backend with vanilla JavaScript frontend
- **No build process** required - just HTML, CSS, and JS
- **Minimal dependencies** for easy maintenance

### Testing
The test suite verifies:
- Server functionality
- Image loading
- Gallery navigation
- Responsive design
- Fancybox integration

## License

MIT License - Feel free to customize for your photography business!

---

**🚀 Your photography website is ready!**

Visit http://localhost:3000 to see your galleries in action. 