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
  
  // Get all image directories from the pics/ folder
  // For now, we'll hard-code the track/best gallery
  const galleries = ['track/best'];
  
  // Load images for each gallery
  galleries.forEach(gallery => {
    loadGalleryImages(gallery, galleryContainer);
  });
  
  // Initialize lazy loading
  new LazyLoad({
    elements_selector: ".lazy"
  });
}

// Function to load gallery images
function loadGalleryImages(galleryPath, container) {
  // For this simple version, we'll use the images directly from the pics folder
  // In a real app, you might want to generate thumbnails or use a JSON file with metadata
  const imageList = getImagesForGallery(galleryPath);
  
  imageList.forEach(image => {
    const item = document.createElement('div');
    item.className = 'gallery-item';
    
    const img = document.createElement('img');
    img.className = 'lazy';
    img.dataset.src = `pics/${galleryPath}/${image}`;
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

function openLightbox(imageSrc) {
  const lightbox = document.querySelector('.lightbox');
  const lightboxImage = lightbox.querySelector('.lightbox-image');
  
  if (!lightbox || !lightboxImage) return;
  
  // Set the image source
  lightboxImage.src = imageSrc;
  
  // Find index of current image and set up gallery array for navigation
  const galleryItems = document.querySelectorAll('.gallery-item img');
  currentGalleryImages = Array.from(galleryItems).map(img => img.dataset.src);
  currentImageIndex = currentGalleryImages.indexOf(imageSrc);
  
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
  if (!lightboxImage) return;
  
  lightboxImage.src = currentGalleryImages[currentImageIndex];
} 