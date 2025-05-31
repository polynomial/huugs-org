# Huugs Media Website Guide

## Overview

The Huugs Media website features a bold, dynamic design that captures the essence of sports photography with dramatic visuals and engaging animations.

## Site Structure

- **`/` (Homepage)** - Professional landing page for the media company
  - Bold sports magazine-inspired design
  - Auto-rotating hero slider
  - About section with 20-year photography journey
  - Portfolio highlights preview
  - Contact section
  
- **`/photos.html`** - Full photography gallery (hidden from main navigation)
  - Complete gallery browsing functionality
  - Accessible only via direct link
  - All original features preserved
  
- **`/highlights.html`** - Curated highlights gallery
  - Selected best photographs
  - Organized in an attractive grid layout
  - Lightbox viewing for full-size images
  
- **`/bio.html`** - Contact page

## Design Features

### Bold & Dynamic Theme
- **Inspiration**: Sports magazine/ESPN style
- **Color Scheme**: Dark background with red (#ff4444) accents
- **Typography**: Bebas Neue for headers, Montserrat for body text
- **Features**:
  - Auto-rotating hero image slider (4-second intervals)
  - Dynamic stats section showcasing experience
  - Engaging hover animations throughout
  - Parallax shine effects on images
  - Smooth scrolling navigation

### Key Sections

1. **Hero Section**
   - Full-screen rotating image slider
   - Bold typography with tagline "Where Legends Are Made"
   - Clear call-to-action buttons

2. **Stats Section**
   - 20 Years of Experience
   - 10 Countries
   - 1M+ Views Worldwide
   - 100% Passion

3. **Our Story**
   - Personal journey through 20 years of photography
   - Experience in landscape, historical documentary, and street art
   - Mission to convey joy and wonder
   - International work across 10 countries

4. **Portfolio Highlights**
   - Masonry grid layout
   - Hover effects with overlay information
   - Direct link to full portfolio

5. **Contact Section**
   - Two contact options: direct contact and social media
   - Interactive hover effects
   - Professional presentation

### Navigation
- Fixed header with blur effect
- Smooth scroll to sections
- Active section highlighting
- Mobile-responsive hamburger menu
- Gallery link removed from main navigation (accessible only via direct URL)

## Technical Details

### Files Structure:
- `public/index.html` - Main landing page
- `public/style.css` - All styles for the bold dynamic design
- `public/script.js` - JavaScript for interactions and animations
- `public/highlights.html` - Curated highlights gallery
- `public/photos.html` - Full gallery (hidden from navigation)

### Key Features:
- Auto-rotating hero slider
- Smooth scrolling navigation
- Active section detection
- Mobile-responsive design
- CSS animations and transitions
- Hover effects throughout

## Local Testing

The website is currently running on a local Python server:
- **URL**: `http://localhost:3000`
- **Server**: Python SimpleHTTPServer

### Pages:
- Homepage: `http://localhost:3000/`
- Full Gallery: `http://localhost:3000/photos.html` (direct link only)
- Highlights: `http://localhost:3000/highlights.html`
- Contact: `http://localhost:3000/bio.html`

## Deployment

To deploy the site:
1. Ensure all image paths are correct
2. Optimize images for web performance
3. Test on multiple devices and browsers
4. Deploy using your preferred hosting method

The site captures the energy and emotion of sports photography while telling your personal story of 20 years capturing joy and wonder around the world. 