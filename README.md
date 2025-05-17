# Photo Gallery with Automatic Image Processing

A simple and elegant photo gallery website that automatically processes images in the `pics/` directory, correctly handling EXIF orientation data.

## Features

- Automatic image processing with correct rotation based on EXIF data
- Generation of thumbnails and medium-sized images
- Responsive gallery layout for all screen sizes
- GitHub Actions automation for continuous deployment
- Fancybox integration for beautiful image lightbox

## How to Use

### Adding New Photos

1. Create a directory structure in the `pics/` folder to organize your photos:
   ```
   pics/
   ├── landscape/
   │   ├── mountains/
   │   │   ├── image1.jpg
   │   │   └── image2.jpg
   │   └── beaches/
   │       ├── image3.jpg
   │       └── image4.jpg
   └── portrait/
       └── best/
           ├── image5.jpg
           └── image6.jpg
   ```

2. Push your changes to GitHub. The GitHub Actions workflow will:
   - Process your images (rotate based on EXIF data)
   - Generate thumbnails and medium-sized versions
  │   - Deploy your updated site to GitHub Pages

3. Alternatively, you can process images locally with:
   ```
   npm run process-images
   ```

### Local Development

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/photos.git
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Process images:
   ```
   npm run process-images
   ```

4. Start the local server:
   ```
   npm start
   ```

5. Visit http://localhost:3000 in your browser

## Technical Details

### Image Processing

Images are processed using the [Sharp](https://sharp.pixelplumbing.com/) library:

- Thumbnails: 300px max dimension (preserving aspect ratio)
- Medium: 1200px max dimension (for Fancybox view)
- Both versions are automatically rotated based on EXIF orientation metadata

### Directory Structure

- `pics/`: Original unmodified images (preserved)
- `thumbnails/`: Generated thumbnail images for grid view
- `medium/`: Medium-sized images for Fancybox view
- `js/gallery-config.json`: Automatically generated gallery configuration

## Automation

The system uses GitHub Actions to:

1. Watch for changes to the `pics/` directory
2. Process new or modified images
3. Deploy the updated gallery to GitHub Pages
4. Poll the GitHub Pages deployment status
5. Report when the site is live

## Customization

- Edit `css/style.css` to customize the appearance
- Modify `index.html` to change the page structure
- Update `js/app.js` to adjust gallery behavior

## License

MIT License 