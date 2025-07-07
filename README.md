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
🔗 **Direct Links** - Share direct links to specific sections (e.g., `http://localhost:3000/#highlights`)

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
├── track/
│   └── bigten/
│       ├── photo1.jpg
│       └── photo2.jpg
└── portfolio/
    └── new-additions-2024/
        ├── photo1.jpg
        └── photo2.jpg
```

### 2. Process Images
```bash
# Set up nix environment (if needed)
if [ -e '/nix/var/nix/profiles/default/etc/profile.d/nix-daemon.sh' ]; then
  . '/nix/var/nix/profiles/default/etc/profile.d/nix-daemon.sh'
fi

# Process images with watermarks
nix-shell --run "node scripts/process-images.js"
```

### 3. Start the Server
```bash
nix-shell --run "node server.js"
```

### 4. View Your Website
Open http://localhost:3000 in your browser

## 📸 Adding New Portfolio Photos (Complete Workflow)

This section covers the complete process for adding new portfolio photos to both the dynamic gallery system and the prominent highlights section on the main page.

### Step 1: Organize Your New Photos
```bash
# Create a dedicated portfolio directory
mkdir -p pics/portfolio/new-additions-$(date +%Y)

# Copy your new photos to the directory
# Name your files descriptively (e.g., 5_STARS_Canon_EOS_R3_RF85mm_F1.2_L_USM_112A1909.JPG)
cp /path/to/your/new/photos/* pics/portfolio/new-additions-$(date +%Y)/
```

### Step 2: Process Images with Watermarks
```bash
# Set up nix environment
if [ -e '/nix/var/nix/profiles/default/etc/profile.d/nix-daemon.sh' ]; then
  . '/nix/var/nix/profiles/default/etc/profile.d/nix-daemon.sh'
fi

# Process all images (creates thumbnails and web versions with watermarks)
nix-shell --run "node scripts/process-images.js"
```

This will:
- ✅ Create 400px thumbnails for fast loading
- ✅ Create 1080px web versions with watermarks
- ✅ Generate gallery configuration files
- ✅ Update navigation structure

### Step 3: Add Best Photos to Main Highlights Section
```bash
# Copy your best photos to the highlights directory
cp public/images/portfolio/new-additions-*/web/5_STARS_*.jpg public/highlights/
cp public/images/portfolio/new-additions-*/web/your_best_photos.jpg public/highlights/
```

### Step 4: Update Highlights Section HTML
Edit `public/index.html` to add your new photos to the Portfolio Highlights section:

```html
<!-- Add new highlight items -->
<div class="highlight-item">
    <img src="/highlights/your_new_photo.jpg" alt="Your Description" onerror="this.src='/assets/placeholder.jpg'">
    <div class="highlight-overlay">
        <h3>Your Title</h3>
        <p>Your description</p>
    </div>
</div>
```

**Pro Tips for Highlights Layout:**
- Use `<div class="highlight-item large">` for featured images (spans 2 columns)
- Place your best wide-angle shot first as a large item
- End with your best telephoto shot as a large item (bookend style)
- Mix different focal lengths and styles throughout

### Step 5: Start Server and Test
```bash
# Start the local server
nix-shell --run "node server.js" &

# Test that images load
curl -I http://localhost:3000/highlights/your_new_photo.jpg

# Visit the website
open http://localhost:3000
```

### Step 6: Share Direct Links
Your website supports direct links to specific sections:
- **Portfolio Highlights**: `http://localhost:3000/#highlights`
- **About Section**: `http://localhost:3000/#about`  
- **Contact Section**: `http://localhost:3000/#contact`
- **Home**: `http://localhost:3000/#home`

### Example Complete Workflow
```bash
# 1. Add photos
mkdir -p pics/portfolio/summer-session-2024
cp ~/Downloads/new_portfolio_photos/* pics/portfolio/summer-session-2024/

# 2. Process images
if [ -e '/nix/var/nix/profiles/default/etc/profile.d/nix-daemon.sh' ]; then
  . '/nix/var/nix/profiles/default/etc/profile.d/nix-daemon.sh'
fi
nix-shell --run "node scripts/process-images.js"

# 3. Copy best photos to highlights
cp public/images/portfolio/summer-session-2024/web/5_STARS_*.jpg public/highlights/

# 4. Update public/index.html (add new highlight items)
# 5. Test website
nix-shell --run "node server.js" &
open http://localhost:3000/#highlights
```

## 🚀 Automated Deployment

This project includes automated deployment to GitHub Pages with custom domain support.

### Setup (One-time)
1. **Push to GitHub**: Commit your code to a GitHub repository
2. **Enable GitHub Pages**: Go to Settings → Pages → Source: GitHub Actions  
3. **Configure Domain**: Set up DNS for `huugs.org` (see [DEPLOYMENT.md](DEPLOYMENT.md))

### Usage (Every time you add photos)
1. **Add photos** to `pics/` directory
2. **Process and update highlights** (follow workflow above)
3. **Commit and push**:
   ```bash
   git add pics/ public/
   git commit -m "Add new portfolio photos"
   git push
   ```
4. **Automatic magic**: GitHub Actions will:
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

Visit http://localhost:3000 to see your galleries in action. # Force workflow trigger
# Debugging deployment
# Trigger optimized deployment after fixing GitHub Pages settings
