document.addEventListener('DOMContentLoaded', function() {
  // Initialize gallery
  initGallery();
  
  // Initialize lightbox
  initLightbox();
});

// Function to initialize the gallery
function initGallery() {
  const galleryContainer = document.querySelector('.gallery');
  if (!galleryContainer) return;
  
  // Check if we have a gallery config file
  fetch('./js/gallery-config.json')
    .then(response => {
      if (!response.ok) {
        throw new Error('Gallery config not found');
      }
      return response.json();
    })
    .then(config => {
      // Use gallery config if available
      loadGalleriesFromConfig(config, galleryContainer);
    })
    .catch(error => {
      console.error('Error loading gallery config:', error);
      // Fallback to direct loading
      const galleries = ['track/best'];
      galleries.forEach(gallery => {
        loadGalleryImages(gallery, galleryContainer);
      });
    });
  
  // Initialize lazy loading
  new LazyLoad({
    elements_selector: ".lazy"
  });
}

// Function to load galleries from config file
function loadGalleriesFromConfig(config, container) {
  if (!config.galleries) return;
  
  // For each gallery in the config
  Object.keys(config.galleries).forEach(galleryId => {
    const gallery = config.galleries[galleryId];
    const galleryTitle = document.createElement('h2');
    galleryTitle.textContent = gallery.title;
    container.appendChild(galleryTitle);
    
    if (gallery.description) {
      const galleryDesc = document.createElement('p');
      galleryDesc.className = 'gallery-description';
      galleryDesc.textContent = gallery.description;
      container.appendChild(galleryDesc);
    }
    
    const galleryGrid = document.createElement('div');
    galleryGrid.className = 'gallery-grid';
    container.appendChild(galleryGrid);
    
    // Add each image
    gallery.images.forEach(image => {
      const item = document.createElement('div');
      item.className = 'gallery-item';
      
      const img = document.createElement('img');
      img.className = 'lazy';
      img.dataset.src = `./${image.thumbnail}`;
      img.alt = image.title;
      
      item.appendChild(img);
      galleryGrid.appendChild(item);
      
      // Add click event for lightbox
      item.addEventListener('click', function() {
        // Use medium sized image for lightbox
        openLightbox(`./${image.medium}`, image.title);
      });
    });
  });
}

// Function to load gallery images (fallback method)
function loadGalleryImages(galleryPath, container) {
  // For this simple version, we'll use the images directly from the pics folder
  // In a real app, you might want to generate thumbnails or use a JSON file with metadata
  const imageList = getImagesForGallery(galleryPath);
  
  imageList.forEach(image => {
    const item = document.createElement('div');
    item.className = 'gallery-item';
    
    const img = document.createElement('img');
    img.className = 'lazy';
    img.dataset.src = `./pics/${galleryPath}/${image}`;
    img.alt = image.replace(/\.(jpg|jpeg|png|gif)$/i, '').replace(/_/g, ' ');
    
    item.appendChild(img);
    container.appendChild(item);
    
    // Add click event for lightbox
    item.addEventListener('click', function() {
      openLightbox(img.dataset.src);
    });
  });
}

// Function to get images for a specific gallery
// In a real app, this would be from a JSON file or API
function getImagesForGallery(galleryPath) {
  // This is just a placeholder - in reality, you would fetch this data
  if (galleryPath === 'track/best') {
    return [
      'DSC00005.JPG', 'DSC00216.jpg', 'DSC00221.JPG', 'DSC00235-EDIT.jpg',
      'DSC00307-EDIT.jpg', 'DSC00324.JPG', 'DSC00326.JPG', 'DSC00336.JPG',
      'DSC00351-EDIT.jpg', 'DSC00375.JPG', 'DSC00378.JPG', 'DSC00384-EDIT.jpg',
      'DSC00384.jpg', 'DSC00415.JPG', 'DSC00453.JPG', 'DSC00511.JPG',
      'DSC00527.JPG', 'DSC00563.JPG', 'DSC00629.jpg', 'DSC00822.JPG',
      'DSC00915-EDIT.jpg', 'DSC01303.JPG', 'IMG_0015.JPG', 'IMG_0017.JPG',
      'IMG_0026.JPG', 'IMG_0110.JPG', 'IMG_0122.JPG', 'IMG_0134.JPG',
      'IMG_0469.JPG', 'IMG_0488.JPG'
    ];
  }
  return [];
}

// Lightbox functionality
let currentImageIndex = 0;
let currentGalleryImages = [];

function initLightbox() {
  const lightbox = document.querySelector('.lightbox');
  if (!lightbox) return;
  
  // Close lightbox when clicking on the background
  lightbox.addEventListener('click', function(e) {
    if (e.target === lightbox) {
      closeLightbox();
    }
  });
  
  // Close button
  const closeBtn = lightbox.querySelector('.lightbox-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeLightbox);
  }
  
  // Navigation buttons
  const prevBtn = lightbox.querySelector('.lightbox-prev');
  const nextBtn = lightbox.querySelector('.lightbox-next');
  
  if (prevBtn) {
    prevBtn.addEventListener('click', showPreviousImage);
  }
  
  if (nextBtn) {
    nextBtn.addEventListener('click', showNextImage);
  }
  
  // Keyboard navigation
  document.addEventListener('keydown', function(e) {
    if (!lightbox.classList.contains('active')) return;
    
    if (e.key === 'Escape') {
      closeLightbox();
    } else if (e.key === 'ArrowLeft') {
      showPreviousImage();
    } else if (e.key === 'ArrowRight') {
      showNextImage();
    }
  });
}

function openLightbox(imageSrc, imageTitle) {
  const lightbox = document.querySelector('.lightbox');
  const lightboxImage = lightbox.querySelector('.lightbox-image');
  const lightboxTitle = lightbox.querySelector('.lightbox-title');
  
  if (!lightbox || !lightboxImage) return;
  
  // Set the image source
  lightboxImage.src = imageSrc;
  
  // Set title if provided
  if (lightboxTitle && imageTitle) {
    lightboxTitle.textContent = imageTitle;
    lightboxTitle.style.display = 'block';
  } else if (lightboxTitle) {
    lightboxTitle.style.display = 'none';
  }
  
  // Find index of current image and set up gallery array for navigation
  const galleryItems = document.querySelectorAll('.gallery-item');
  currentGalleryImages = [];
  currentImageIndex = -1;
  
  // We need to check if we're using the new config-based approach
  const configImages = document.querySelectorAll('.gallery-item[data-medium]');
  
  if (configImages.length > 0) {
    // Using new approach with thumbnails and medium images
    galleryItems.forEach((item, index) => {
      const medium = item.getAttribute('data-medium');
      const title = item.getAttribute('data-title');
      currentGalleryImages.push({ src: medium, title: title });
      
      if (medium === imageSrc) {
        currentImageIndex = index;
      }
    });
  } else {
    // Using old approach with direct image references
    galleryItems.forEach((item, index) => {
      const img = item.querySelector('img');
      if (img) {
        const src = img.dataset.src;
        currentGalleryImages.push({ src: src, title: img.alt });
        
        if (src === imageSrc) {
          currentImageIndex = index;
        }
      }
    });
  }
  
  // If image not found in gallery, add it as standalone
  if (currentImageIndex === -1) {
    currentGalleryImages.push({ src: imageSrc, title: imageTitle || '' });
    currentImageIndex = currentGalleryImages.length - 1;
  }
  
  // Show the lightbox
  lightbox.classList.add('active');
  document.body.style.overflow = 'hidden'; // Prevent scrolling when lightbox is open
}

function closeLightbox() {
  const lightbox = document.querySelector('.lightbox');
  if (!lightbox) return;
  
  lightbox.classList.remove('active');
  document.body.style.overflow = ''; // Restore scrolling
}

function showPreviousImage() {
  if (currentGalleryImages.length === 0) return;
  
  currentImageIndex = (currentImageIndex - 1 + currentGalleryImages.length) % currentGalleryImages.length;
  updateLightboxImage();
}

function showNextImage() {
  if (currentGalleryImages.length === 0) return;
  
  currentImageIndex = (currentImageIndex + 1) % currentGalleryImages.length;
  updateLightboxImage();
}

function updateLightboxImage() {
  const lightboxImage = document.querySelector('.lightbox-image');
  const lightboxTitle = document.querySelector('.lightbox-title');
  
  if (!lightboxImage) return;
  
  const current = currentGalleryImages[currentImageIndex];
  lightboxImage.src = current.src;
  
  if (lightboxTitle) {
    if (current.title) {
      lightboxTitle.textContent = current.title;
      lightboxTitle.style.display = 'block';
    } else {
      lightboxTitle.style.display = 'none';
    }
  }
} 