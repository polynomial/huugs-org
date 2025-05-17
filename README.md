# Photo Gallery with Automatic Thumbnail Generation

This photo gallery website automatically creates optimized thumbnails for improved performance.

## Features

- Automatically generates thumbnails and medium-sized images
- Uses lazy loading for better performance
- Responsive gallery grid layout
- Lightbox with navigation controls
- Optimized for fast loading (reduced from 52MB to ~5MB)

## Development Setup

1. **Install Node.js and npm**
   ```bash
   # On Debian/Ubuntu
   sudo apt-get install nodejs npm
   
   # On macOS with Homebrew
   brew install node
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Generate thumbnails manually**
   ```bash
   node scripts/generate-thumbnails.js
   ```

## Automatic Thumbnail Generation

Thumbnails are generated automatically:

1. **On pre-commit (when Node.js is available)**
   - The Git hook `.githooks/pre-commit` automatically runs the thumbnail generator
   - Thumbnails and medium-sized images are added to your commit

2. **On GitHub Actions deployment**
   - When changes are pushed to main, GitHub Actions generates thumbnails
   - Thumbnails are optimized with jpegoptim
   - Everything is deployed to GitHub Pages

## Skip Thumbnail Generation

If needed, you can skip the thumbnail generation:

```bash
SKIP_THUMBNAIL_GEN=true git commit -m "Your commit message"
```

## Image Sizes

- **Original:** Full-size images stored in `pics/` directory
- **Medium:** 1200px width images for lightbox view in `medium/` directory
- **Thumbnails:** 300px width images for gallery grid in `thumbnails/` directory

## Gallery Configuration

The gallery configuration is stored in `js/gallery-config.json` and is automatically generated when thumbnails are created. 