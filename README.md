# Track Photography

A photography portfolio website for track events, hosted at [huugs.org](https://huugs.org).

## Features

- Responsive design that works on all devices
- Automatic gallery generation from photo directories
- Photo carousel/lightbox for viewing images
- Easy navigation between different galleries

## Setup Instructions

1. Clone this repository:
   ```
   git clone git@github.com:polynomial/huugs-org.git
   cd huugs-org
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Add your photos to the `pics` directory:
   - Create subdirectories for each gallery (e.g., `pics/track`, `pics/meet1`, etc.)
   - Place photos inside these directories

4. Generate the galleries:
   ```
   npm run generate
   ```

5. Start the local development server:
   ```
   npm run serve
   ```

6. Open your browser to `http://localhost:3000` to view the site

## Adding New Galleries

To add a new gallery:

1. Create a new directory under the `pics` folder (e.g., `pics/new-gallery`)
2. Add your photos to this directory
3. Run `npm run generate` to update the website
4. The new gallery will automatically appear in the navigation

## Deployment

The website is configured to be hosted on GitHub Pages. To deploy:

1. Push your changes to the GitHub repository
2. GitHub Actions will automatically build and deploy the site to huugs.org

## Custom Domain Setup

This site is configured to use the custom domain `huugs.org`. If you need to reconfigure the domain:

1. Update the CNAME file in the repository
2. Configure your domain's DNS settings to point to GitHub Pages

## Technical Details

- Built with vanilla JavaScript, HTML, and CSS
- Uses [Swiper](https://swiperjs.com/) for the image carousel
- Uses [Sharp](https://sharp.pixelplumbing.com/) for image processing and thumbnail generation