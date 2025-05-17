// Main Application JavaScript

// Debug utility - Set DEBUG to false in production
const DEBUG = process.env.NODE_ENV !== 'production';
function debug(...args) {
    if (DEBUG) {
        console.log(...args);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Update footer year
    document.getElementById('year').textContent = new Date().getFullYear();
    
    // Initialize galleries
    loadGalleries();
    
    // Handle URL hash changes
    window.addEventListener('hashchange', handleHashChange);
    
    // Initial hash check
    handleHashChange();
});

// Global variables
let galleries = [];
let currentGallery = null;
let currentCategory = null;
let swiper = null;
let lazyLoadInstance = null;

/**
 * Handle URL hash changes for navigation
 */
function handleHashChange() {
    const hash = window.location.hash.substring(1); // Remove the # symbol
    
    if (hash) {
        const [galleryId, categoryId] = hash.split('/');
        
        if (galleryId && galleries.length > 0) {
            loadGallery(galleryId, categoryId);
        }
    }
}

/**
 * Load gallery data from the config file
 */
async function loadGalleries() {
    try {
        // Show loading indicator
        document.getElementById('gallery-container').innerHTML = '<div class="loading">Loading galleries...</div>';
        
        // Fetch gallery directories
        const response = await fetch('js/gallery-config.json');
        if (!response.ok) {
            throw new Error('Failed to load gallery configuration');
        }
        
        galleries = await response.json();
        
        // Build navigation
        buildNavigation(galleries);
        
        // Load from URL hash or first gallery by default
        const hash = window.location.hash.substring(1);
        if (hash) {
            const [galleryId, categoryId] = hash.split('/');
            if (galleryId) {
                loadGallery(galleryId, categoryId);
                return;
            }
        }
        
        // No hash, load first gallery
        if (galleries.length > 0) {
            loadGallery(galleries[0].id);
        } else {
            document.getElementById('gallery-container').innerHTML = '<p>No galleries found.</p>';
        }
    } catch (error) {
        debug('Error loading galleries:', error);
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
        a.dataset.count = gallery.photoCount;
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
async function loadGallery(galleryId, categoryId = null) {
    // Find the gallery data
    currentGallery = galleries.find(g => g.id === galleryId);
    currentCategory = categoryId;
    
    if (!currentGallery) {
        debug('Gallery not found:', galleryId);
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
    
    // Update URL hash
    if (categoryId) {
        window.history.replaceState(null, null, `#${galleryId}/${categoryId}`);
    } else {
        window.history.replaceState(null, null, `#${galleryId}`);
    }
    
    // Show loading indicator
    document.getElementById('gallery-container').innerHTML = '<div class="loading">Loading photos...</div>';
    
    try {
        // Fetch the photo list for this gallery
        let photoData;
        
        if (categoryId) {
            // Load category-specific photos
            const response = await fetch(`galleries/${galleryId}/${categoryId}.json`);
            if (!response.ok) {
                // If category file doesn't exist, fall back to all photos
                const allResponse = await fetch(`galleries/${galleryId}/photos.json`);
                if (!allResponse.ok) {
                    throw new Error('Failed to load gallery data');
                }
                photoData = await allResponse.json();
                // Filter by category
                photoData = photoData.filter(photo => photo.category === categoryId);
            } else {
                photoData = await response.json();
            }
        } else {
            // Load all photos
            const response = await fetch(`galleries/${galleryId}/photos.json`);
            if (!response.ok) {
                throw new Error('Failed to load gallery data');
            }
            photoData = await response.json();
        }
        
        renderGallery(currentGallery, photoData, categoryId);
    } catch (error) {
        debug('Error loading gallery:', error);
        document.getElementById('gallery-container').innerHTML = `<p class="error">Error loading gallery: ${error.message}</p>`;
    }
}

/**
 * Render the gallery view
 */
function renderGallery(gallery, photoData, categoryId = null) {
    const container = document.getElementById('gallery-container');
    
    // Build the category navigation if available
    let categoryNav = '';
    if (gallery.categories && gallery.categories.length > 0) {
        categoryNav = `
            <div class="category-nav">
                <a href="#${gallery.id}" class="${!categoryId ? 'active' : ''}">All (${gallery.photoCount})</a>
                ${gallery.categories.map(cat => 
                    `<a href="#${gallery.id}/${cat.id}" class="${categoryId === cat.id ? 'active' : ''}">${cat.title} (${cat.photoCount})</a>`
                ).join('')}
            </div>
        `;
    }
    
    // Get the title and description for the current view
    let title = gallery.title;
    let description = gallery.description;
    
    if (categoryId && gallery.categories) {
        const category = gallery.categories.find(c => c.id === categoryId);
        if (category) {
            title = `${gallery.title} - ${category.title}`;
            description = `Showing ${category.photoCount} photos in the ${category.title} category`;
        }
    }
    
    // Create gallery header
    const galleryHTML = `
        <div class="gallery-header">
            <h2>${title}</h2>
        </div>
        ${description ? `<div class="gallery-description">${description}</div>` : ''}
        ${categoryNav}
        <div class="photo-grid">
            ${photoData.map((photo, index) => `
                <div class="photo-item" data-index="${index}">
                    <img class="lazy" 
                         data-src="galleries/${gallery.id}/thumbs/${photo.filename}" 
                         alt="${photo.title || 'Photo ' + (index + 1)}">
                    <div class="photo-info">
                        <h3>${photo.title || 'Photo ' + (index + 1)}</h3>
                        ${photo.category ? `<span class="photo-category">${photo.category}</span>` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
        
        <div class="lightbox">
            <div class="close-lightbox">&times;</div>
            <div class="image-info"></div>
            <div class="lightbox-content">
                <div class="swiper">
                    <div class="swiper-wrapper">
                        ${photoData.map((photo, index) => `
                            <div class="swiper-slide" data-index="${index}">
                                <img data-src="galleries/${gallery.id}/display/${photo.filename}" 
                                     alt="${photo.title || ''}">
                                <div class="slide-caption">
                                    <h4>${photo.title || 'Photo ' + (index + 1)}</h4>
                                    ${photo.dimensions ? 
                                        `<span class="dimensions">${photo.dimensions.width} × ${photo.dimensions.height}</span>` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="swiper-button-next"></div>
                    <div class="swiper-button-prev"></div>
                    <div class="swiper-pagination"></div>
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = galleryHTML;
    
    // Initialize lazy loading for thumbnails
    if (window.LazyLoad) {
        if (lazyLoadInstance) {
            lazyLoadInstance.destroy();
        }
        lazyLoadInstance = new LazyLoad({
            threshold: 300,
            callback_loaded: (el) => {
                // Add animation class when image is loaded
                el.parentElement.classList.add('loaded');
            }
        });
    }
    
    // Initialize the lightbox and Swiper
    initializeLightbox(photoData);
}

/**
 * Initialize the lightbox and Swiper for the gallery
 */
function initializeLightbox(photoData) {
    const lightbox = document.querySelector('.lightbox');
    const closeBtn = document.querySelector('.close-lightbox');
    const infoElement = document.querySelector('.image-info');
    
    // Cleanup function to remove event listeners
    function cleanupEventListeners() {
        closeBtn.removeEventListener('click', closeLightbox);
        document.removeEventListener('keydown', handleKeyDown);
        lightbox.removeEventListener('click', handleLightboxClick);
        
        // Remove thumbnail click handlers
        photoItems.forEach(item => {
            item.removeEventListener('click', handleThumbnailClick);
        });
    }

    // Event handler functions
    const closeLightbox = () => {
        lightbox.classList.remove('active');
        document.body.classList.remove('no-scroll');
    };
    
    const handleKeyDown = (e) => {
        if (e.key === 'Escape' && lightbox.classList.contains('active')) {
            closeLightbox();
        }
    };
    
    const handleLightboxClick = (e) => {
        if (e.target === lightbox) {
            closeLightbox();
        }
    };
    
    // Destroy existing swiper if it exists
    if (swiper) {
        cleanupEventListeners();
        swiper.destroy(true, true);
        swiper = null;
    }
    
    // Initialize Swiper
    swiper = new Swiper('.swiper', {
        lazy: {
            loadPrevNext: true,
            loadPrevNextAmount: 2,
        },
        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
        },
        pagination: {
            el: '.swiper-pagination',
            type: 'fraction',
        },
        keyboard: {
            enabled: true,
            onlyInViewport: false,
        },
        on: {
            slideChange: function() {
                updatePhotoInfo(photoData[this.activeIndex]);
            }
        }
    });
    
    // Update photo info when slide changes
    function updatePhotoInfo(photo) {
        if (!photo) return;
        
        let infoHTML = `<div class="info-title">${photo.title || 'Untitled'}</div>`;
        
        if (photo.date) {
            const date = new Date(photo.date);
            infoHTML += `<div class="info-date">${date.toLocaleDateString()}</div>`;
        }
        
        if (photo.category) {
            infoHTML += `<div class="info-category">${photo.category}</div>`;
        }
        
        if (photo.exif) {
            infoHTML += `<div class="info-exif">
                ${Object.entries(photo.exif).map(([key, value]) => 
                    `<span>${key}: ${value}</span>`
                ).join(' | ')}
            </div>`;
        }
        
        infoElement.innerHTML = infoHTML;
    }
    
    // Setup click handlers for thumbnails
    const photoItems = document.querySelectorAll('.photo-item');
    photoItems.forEach(item => {
        const handleThumbnailClick = function() {
            const index = parseInt(this.getAttribute('data-index'));
            swiper.slideTo(index, 0);
            lightbox.classList.add('active');
            document.body.classList.add('no-scroll');
            updatePhotoInfo(photoData[index]);
        };
        item.addEventListener('click', handleThumbnailClick);
    });
    
    // Close lightbox
    closeBtn.addEventListener('click', closeLightbox);
    
    // Close on escape key
    document.addEventListener('keydown', handleKeyDown);
    
    // Close when clicking outside the image
    lightbox.addEventListener('click', handleLightboxClick);
}

// Helper function to preload images for smooth transitions
function preloadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
} 