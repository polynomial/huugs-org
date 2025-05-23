# 🚀 Deployment Guide: Automated Image Processing & GitHub Pages

This guide explains how to set up automated deployment of your photography website to GitHub Pages with the custom domain `huugs.org`.

## 🎯 Overview

The deployment system automatically:
1. **Detects new photos** added to `pics/` directory
2. **Processes images** (generates thumbnails, web versions, configurations)
3. **Runs tests** to ensure everything works
4. **Deploys to GitHub Pages** at `huugs.org`

## 📋 Prerequisites

### 1. GitHub Repository Setup
- Create a GitHub repository for your photography website
- Push your code to the `main` or `master` branch
- Ensure your repository is public (required for GitHub Pages on free accounts)

### 2. GitHub Pages Configuration
1. Go to your repository **Settings** → **Pages**
2. Under **Source**, select **GitHub Actions**
3. This enables GitHub Actions to deploy your site

### 3. Domain Configuration
Configure your DNS to point `huugs.org` to GitHub Pages:

**DNS Records to add:**
```
Type: CNAME
Name: www
Value: [your-username].github.io

Type: A
Name: @
Values: 
  185.199.108.153
  185.199.109.153
  185.199.110.153
  185.199.111.153
```

*Replace `[your-username]` with your actual GitHub username*

## 🔧 Workflow Configuration

### Automatic Triggers
The workflow runs when:
- **New photos added**: Any changes to `pics/**` directory
- **Code updates**: Changes to `public/**`, `scripts/**`, or configuration files
- **Manual trigger**: You can run it manually from GitHub Actions tab

### Workflow Steps
1. **🔍 Image Detection**: Scans `pics/` for new photos
2. **📦 Setup Environment**: Installs Node.js and dependencies
3. **🖼️ Process Images**: Generates thumbnails (400px) and web versions (1080px)
4. **📊 Build Summary**: Reports on processed images and galleries
5. **🚀 Deploy**: Uploads to GitHub Pages

## 📁 File Structure

Your repository should look like this:
```
your-repo/
├── pics/                          # 📸 Your original photos
│   ├── events/
│   │   └── saturday_market/
│   └── track/
│       └── bigten/
├── public/                        # 🌐 Generated website
│   ├── images/                    # 🖼️ Processed images (auto-generated)
│   ├── index.html
│   ├── bio.html
│   ├── CNAME                      # 🏠 Custom domain config
│   └── *.json                     # 📄 Gallery configs (auto-generated)
├── scripts/
│   └── process-images.js          # 🔧 Image processing script
├── .github/
│   └── workflows/
│       └── deploy.yml             # 🚀 Deployment workflow
└── package.json
```

## 🔄 Usage Workflow

### Adding New Photos
1. **Add photos** to appropriate directories in `pics/`:
   ```bash
   pics/events/new_event/photo1.jpg
   pics/events/new_event/photo2.jpg
   ```

2. **Commit and push**:
   ```bash
   git add pics/
   git commit -m "Add photos from new event"
   git push origin main
   ```

3. **Automatic processing**: GitHub Actions will:
   - Detect the new photos
   - Process them automatically
   - Deploy the updated website
   - Usually completes in 2-3 minutes

### Manual Deployment
If you need to redeploy without adding photos:
1. Go to **Actions** tab in your GitHub repository
2. Select **"🖼️ Process Images & Deploy to GitHub Pages"**
3. Click **"Run workflow"**
4. Select your branch and click **"Run workflow"**

## 📊 Monitoring Deployments

### GitHub Actions Dashboard
- View deployment status at: `https://github.com/[username]/[repo]/actions`
- Each workflow run shows:
  - ✅ Number of images processed
  - 📁 Galleries created
  - 🚀 Deployment status
  - 🌐 Live site URL

### Deployment Logs
The workflow provides detailed logs:
```
🔍 Checking pics/ directory structure
📊 Total image files found: 12
🚀 Starting image processing...
📈 Build Summary:
📁 Generated galleries: 2
🖼️ Thumbnail images: 12
🌐 Web images: 12
🎉 Successfully deployed to GitHub Pages!
```

## 🌐 Live Website

After successful deployment:
- **GitHub Pages URL**: `https://[username].github.io/[repo]`
- **Custom Domain**: `https://huugs.org` (after DNS configuration)
- **About Page**: `https://huugs.org/bio.html`

## 🛠️ Customization

### Changing Image Sizes
Edit `scripts/process-images.js`:
```javascript
const THUMBNAIL_SIZE = 400;  // Change thumbnail size
const WEB_SIZE = 1080;       // Change web version size
```

### Adding New Triggers
Edit `.github/workflows/deploy.yml` to add more trigger paths:
```yaml
paths: 
  - 'pics/**'
  - 'public/**'
  - 'assets/**'     # Add this line
```

### Custom Domain
To use a different domain:
1. Update `public/CNAME` with your domain
2. Configure your DNS provider accordingly

## 🔍 Troubleshooting

### Common Issues

**Images not processing:**
- Check that images are in supported formats (JPG, PNG, WebP, TIFF, GIF)
- Verify the `pics/` directory structure
- Look at the Actions log for specific errors

**Deployment failing:**
- Ensure GitHub Pages is enabled in repository settings
- Check that the repository is public (for free accounts)
- Verify the workflow has necessary permissions

**Custom domain not working:**
- Allow 24-48 hours for DNS propagation
- Check DNS configuration with online tools
- Ensure CNAME file contains only the domain name

### Getting Help

1. **Check Actions logs**: Detailed error messages in GitHub Actions
2. **Test locally**: Run `npm run process-images` and `npm test`
3. **Domain issues**: Use DNS checking tools to verify configuration

## 🎉 Success Metrics

A successful deployment will show:
- ✅ All workflow steps completed
- 🖼️ Images processed without errors
- 📊 Gallery configurations generated
- 🚀 Website accessible at your domain
- 📱 Responsive design working on all devices

---

**🌟 Your photography website is now fully automated!**

Simply add photos to `pics/` and push to GitHub - everything else happens automatically! 