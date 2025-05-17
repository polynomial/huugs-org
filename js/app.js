// Main Application JavaScript

document.addEventListener('DOMContentLoaded', () => {
    // Update footer year
    document.getElementById('year').textContent = new Date().getFullYear();
    
    // Initialize galleries
    loadGalleries();
});

// Global variables
let galleries = [];
let currentGallery = null;
let swiper = null;

/**
 * Load gallery data from the config file
 */
async function loadGalleries() {
    try {
        // Fetch gallery directories
        const response = await fetch('js/gallery-config.json');
        if (!response.ok) {
            throw new Error('Failed to load gallery configuration');
        }
        
        galleries = await response.json();
        
        // Build navigation
        buildNavigation(galleries);
        
        // Load first gallery by default
        if (galleries.length > 0) {
            loadGallery(galleries[0].id);
        } else {
            document.getElementById('gallery-container').innerHTML = '<p>No galleries found.</p>';
        }
    } catch (error) {
        console.error('Error loading galleries:', error);
        document.getElementById('gallery-container').innerHTML = `<p class="error">Error loading galleries: ${error.message}</p>`;
    }
}

/**
 * Build the navigation menu from gallery data
 */
function buildNavigation(galleries) {
    const nav = document.getElementById('main-nav');
    
    // Create the unordered list
    const ul = document.createElement('ul');
    
    // Add navigation items for each gallery
    galleries.forEach(gallery => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = '#' + gallery.id;
        a.textContent = gallery.title;
        a.addEventListener('click', (e) => {
            e.preventDefault();
            loadGallery(gallery.id);
        });
        
        if (gallery.id === galleries[0].id) {
            a.classList.add('active');
        }
        
        li.appendChild(a);
        ul.appendChild(li);
    });
    
    nav.appendChild(ul);
}

/**
 * Load a specific gallery
 */
async function loadGallery(galleryId) {
    // Find the gallery data
    currentGallery = galleries.find(g => g.id === galleryId);
    
    if (!currentGallery) {
        console.error('Gallery not found:', galleryId);
        return;
    }
    
    // Update navigation active state
    const navLinks = document.querySelectorAll('#main-nav a');
    navLinks.forEach(link => {
        if (link.getAttribute('href') === '#' + galleryId) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
    
    // Show loading indicator
    document.getElementById('gallery-container').innerHTML = '<div class="loading">Loading photos...</div>';
    
    try {
        // Fetch the photo list for this gallery
        const response = await fetch(`galleries/${galleryId}/photos.json`);
        if (!response.ok) {
            throw new Error('Failed to load gallery data');
        }
        
        const photoData = await response.json();
        renderGallery(currentGallery, photoData);
    } catch (error) {
        console.error('Error loading gallery:', error);
        document.getElementById('gallery-container').innerHTML = `<p class="error">Error loading gallery: ${error.message}</p>`;
    }
}

/**
 * Render the gallery view
 */
function renderGallery(gallery, photoData) {
    const container = document.getElementById('gallery-container');
    
    // Create gallery header
    const galleryHTML = `
        <div class="gallery-header">
            <h2>${gallery.title}</h2>
        </div>
        ${gallery.description ? `<div class="gallery-description">${gallery.description}</div>` : ''}
        <div class="photo-grid">
            ${photoData.map((photo, index) => `
                <div class="photo-item" data-index="${index}">
                    <img src="galleries/${gallery.id}/thumbs/${photo.filename}" alt="${photo.title || 'Photo ' + (index + 1)}">
                    <div class="photo-info">
                        <h3>${photo.title || 'Photo ' + (index + 1)}</h3>
                    </div>
                </div>
            `).join('')}
        </div>
        
        <div class="lightbox">
            <div class="close-lightbox">&times;</div>
            <div class="lightbox-content">
                <div class="swiper">
                    <div class="swiper-wrapper">
                        ${photoData.map(photo => `
                            <div class="swiper-slide">
                                <img src="galleries/${gallery.id}/${photo.filename}" alt="${photo.title || ''}">
                            </div>
                        `).join('')}
                    </div>
                    <div class="swiper-button-next"></div>
                    <div class="swiper-button-prev"></div>
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = galleryHTML;
    
    // Initialize the lightbox and Swiper
    initializeLightbox(photoData);
}

/**
 * Initialize the lightbox and Swiper for the gallery
 */
function initializeLightbox(photoData) {
    const lightbox = document.querySelector('.lightbox');
    const closeBtn = document.querySelector('.close-lightbox');
    
    // Initialize Swiper
    swiper = new Swiper('.swiper', {
        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
        },
        keyboard: {
            enabled: true,
            onlyInViewport: false,
        },
    });
    
    // Setup click handlers for thumbnails
    const photoItems = document.querySelectorAll('.photo-item');
    photoItems.forEach(item => {
        item.addEventListener('click', () => {
            const index = parseInt(item.getAttribute('data-index'));
            swiper.slideTo(index, 0);
            lightbox.classList.add('active');
        });
    });
    
    // Close lightbox
    closeBtn.addEventListener('click', () => {
        lightbox.classList.remove('active');
    });
    
    // Close on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightbox.classList.contains('active')) {
            lightbox.classList.remove('active');
        }
    });
    
    // Close when clicking outside the image
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            lightbox.classList.remove('active');
        }
    });
} 