/**
 * Huugs Media Photography Collection App
 * 
 * Handles loading collections, events, and photos
 * with Fancybox integration for the lightbox view
 */

document.addEventListener('DOMContentLoaded', function() {
  // Initialize app based on current URL
  initApp();
});

/**
 * Helper function to track events in Google Analytics
 */
function trackEvent(eventCategory, eventAction, eventLabel) {
  if (typeof gtag === 'function') {
    console.log(`Tracking event: ${eventCategory} - ${eventAction} - ${eventLabel}`);
    gtag('event', eventAction, {
      'event_category': eventCategory,
      'event_label': eventLabel
    });
  } else {
    console.warn('Google Analytics not available for tracking');
  }
}

/**
 * Initialize the app based on the current URL
 */
function initApp() {
  const currentPath = window.location.pathname;
  const urlParams = new URLSearchParams(window.location.search);
  
  console.log("Initializing app with URL parameters:", Object.fromEntries(urlParams));
  
  // Handle different page views
  if (urlParams.has('genre') && urlParams.has('event')) {
    // Event page - show photos
    const genre = urlParams.get('genre');
    const event = urlParams.get('event');
    console.log(`Initializing event page: collection=${genre}, event=${event}`);
    trackEvent('Navigation', 'View Event', `${genre}/${event}`);
    initEventPage(genre, event);
  } else if (urlParams.has('genre')) {
    // Collection page - show events
    const genre = urlParams.get('genre');
    console.log(`Initializing collection page: collection=${genre}`);
    trackEvent('Navigation', 'View Collection', genre);
    initGenrePage(genre);
  } else {
    // Home page - show collections
    console.log("Initializing home page");
    trackEvent('Navigation', 'View Home', 'All Collections');
    initHomePage();
  }
  
  // Initialize Fancybox
  try {
    if (window.Fancybox) {
      Fancybox.bind("[data-fancybox]", {
        // Fancybox options
        animated: true,
        showClass: "fancybox-fadeIn",
        hideClass: "fancybox-fadeOut",
        dragToClose: false,
        trapFocus: true,
        autoFocus: true,
        placeFocusBack: true,
        // Track when Fancybox opens a photo
        on: {
          done: (fancybox, slide) => {
            const photoUrl = slide.src || '';
            const photoName = photoUrl.split('/').pop();
            trackEvent('Photo', 'View Enlarged', photoName);
          },
          error: (fancybox, slide, error) => {
            console.log("Fancybox error loading slide:", slide, error);
            // Replace the src with a placeholder if there's an error
            slide.src = 'thumbnails/placeholder.jpg';
          }
        }
      });
      console.log("Fancybox initialized");
    } else {
      console.warn("Fancybox not available");
    }
  } catch (error) {
    console.error("Error initializing Fancybox:", error);
  }
}

/**
 * Initialize the home page with all photo collections
 */
function initHomePage() {
  const genreGrid = document.getElementById('genre-grid');
  if (!genreGrid) return;
  
  // Load the gallery configuration
  fetch('./js/gallery-config.json')
    .then(response => {
      if (!response.ok) {
        throw new Error('Gallery config not found');
      }
      return response.json();
    })
    .then(config => {
      // Get unique collections from the config
      const genres = getGenresFromConfig(config);
      displayGenres(genres, genreGrid);
    })
    .catch(error => {
      console.error('Error loading gallery config:', error);
      // Scan directories directly as a fallback
      scanDirectories();
    });
}

/**
 * Load all collections from the configuration
 */
function loadAllGenres() {
  console.log('Loading all collections');
  
  const genreContainer = document.getElementById('genre-container');
  if (!genreContainer) {
    console.error('Collection container not found');
    return;
  }
  
  // Get the grid to add collections to
  const genreGrid = document.getElementById('genre-grid');
  if (!genreGrid) {
    console.error('Collection grid not found');
    return;
  }
  
  // Get gallery configuration
  fetch('./js/gallery-config.json')
    .then(response => response.json())
    .then(config => {
      // Process galleries to get unique collections
      const genres = getGenresFromConfig(config);
      console.log(`Found ${genres.length} collections`);
      
      if (genres.length === 0) {
        genreGrid.innerHTML = '<p>No photo collections found. Add photos to the "pics" directory.</p>';
        return;
      }
      
      // Add each collection to the grid
      genres.forEach(genre => {
        // Skip the test gallery
        if (genre.id === 'test-gallery') {
          return;
        }
        
        const genreItem = document.createElement('div');
        genreItem.className = 'genre-item';
        
        const link = document.createElement('a');
        link.href = `?genre=${genre.id}`;
        
        const img = document.createElement('img');
        img.className = 'lazy';
        img.dataset.src = genre.cover || './thumbnails/placeholder.jpg';
        img.alt = genre.title;
        
        const title = document.createElement('h3');
        title.textContent = genre.title;
        
        link.appendChild(img);
        link.appendChild(title);
        genreItem.appendChild(link);
        genreGrid.appendChild(genreItem);
      });
      
      // Initialize lazy loading for images
      new LazyLoad({
        elements_selector: '.lazy',
        use_native: true
      });
    })
    .catch(error => {
      console.error('Error loading gallery config:', error);
      genreGrid.innerHTML = '<p>Error loading collections. Please try again later.</p>';
    });
}

/**
 * Extract unique collections from the configuration
 */
function getGenresFromConfig(config) {
  if (!config.galleries) return [];
  
  const genres = new Map();
  
  // Process each gallery
  Object.keys(config.galleries).forEach(galleryPath => {
    const pathParts = galleryPath.split('/');
    
    // Skip if the path doesn't have the expected format
    if (pathParts.length < 2 || pathParts[0] !== 'pics') {
      return;
    }
    
    // Extract collection from the path (second segment after 'pics')
    const genreId = pathParts[1];
    
    // Skip the test gallery
    if (genreId === 'test-gallery') {
      return;
    }
    
    // Add collection if not already added
    if (!genres.has(genreId)) {
      // Find a cover image from the first gallery of this collection
      const gallery = config.galleries[galleryPath];
      const coverImage = gallery.images && gallery.images.length > 0 ?
                         `./${gallery.images[0].thumbnail}` : 
                         './thumbnails/placeholder.jpg';
      
      genres.set(genreId, {
        id: genreId,
        title: toTitleCase(genreId.replace(/-/g, ' ')),
        path: galleryPath,
        cover: coverImage
      });
      
      console.log(`Added collection: ${genreId}`);
    }
  });
  
  // Convert map to array and return
  return Array.from(genres.values());
}

/**
 * Display collections in a grid
 */
function displayGenres(genres, container) {
  if (!genres || genres.length === 0) {
    container.innerHTML = '<p>No photo collections found. Add photos to the "pics" directory.</p>';
    return;
  }
  
  // Clear existing content
  container.innerHTML = '';
  
  // Create cards for each collection
  genres.forEach(genre => {
    const card = document.createElement('div');
    card.className = 'genre-card';
    
    const link = document.createElement('a');
    link.href = `?genre=${genre.id}`;
    
    const img = document.createElement('img');
    img.className = 'lazy';
    img.dataset.src = genre.cover;
    img.alt = genre.title;
    
    const info = document.createElement('div');
    info.className = 'genre-info';
    info.innerHTML = `<h3 class="genre-title">${genre.title}</h3>`;
    
    link.appendChild(img);
    link.appendChild(info);
    card.appendChild(link);
    container.appendChild(card);
  });
  
  // Initialize lazy loading
  new LazyLoad({
    elements_selector: '.lazy',
    use_native: true
  });
}

/**
 * Find a cover image for a collection
 */
function findCoverImage(config, genre) {
  // Look through galleries for this collection
  for (const galleryPath in config.galleries) {
    if (galleryPath.includes(`/pics/${genre}/`)) {
      const gallery = config.galleries[galleryPath];
      if (gallery.images && gallery.images.length > 0) {
        return gallery.images[0].thumbnail;
      }
    }
  }
  
  return './thumbnails/placeholder.jpg';
}

/**
 * Initialize the collection page - show events
 */
function initGenrePage(genreId) {
  console.log(`Initializing collection page: ${genreId}`);
  
  // Hide other containers and show event container
  hideAllContainers();
  showContainer('event-container');
  
  // Update page title
  document.title = `${toTitleCase(genreId)} - Huugs Media`;
  
  // Update collection title
  const genreTitle = document.getElementById('genre-title');
  if (genreTitle) {
    genreTitle.textContent = toTitleCase(genreId);
  }
  
  // Set up back button
  const backButton = document.getElementById('back-button');
  if (backButton) {
    backButton.style.display = 'block';
    backButton.onclick = () => {
      window.location.href = '/';
    };
  }
  
  // Load events for this collection
  loadGenreEvents(genreId);
}

/**
 * Load events for a collection
 */
function loadGenreEvents(genreId) {
  console.log(`Loading events for collection: ${genreId}`);
  
  const eventList = document.getElementById('event-list');
  if (!eventList) {
    console.error('Event list container not found');
    return;
  }
  
  // Clear previous content
  eventList.innerHTML = '';
  
  // Get gallery configuration
  fetch('./js/gallery-config.json')
    .then(response => response.json())
    .then(config => {
      // Get events for this collection
      const events = getEventsFromConfig(config, genreId);
      console.log(`Found ${events.length} events for collection ${genreId}`);
      
      if (events.length === 0) {
        eventList.innerHTML = `<p>No events found for ${toTitleCase(genreId)}. Add photos to the "pics/${genreId}" directory.</p>`;
        return;
      }
      
      // Display events
      displayEvents(events, eventList, genreId);
    })
    .catch(error => {
      console.error('Error loading gallery config:', error);
      eventList.innerHTML = '<p>Error loading events. Please try again later.</p>';
    });
}

/**
 * Extract events for a collection from the config
 */
function getEventsFromConfig(config, genreId) {
  if (!config.galleries) return [];
  
  const events = new Map();
  const genrePath = `pics/${genreId}`;
  
  console.log(`Looking for events in collection: ${genreId}`);
  const galleryKeys = Object.keys(config.galleries);
  console.log(`Available galleries:`, galleryKeys);
  
  // Simple fix - directly extract 'best' event if we know it exists
  if (genreId === 'track' && galleryKeys.includes('pics/track/best')) {
    console.log('Found track/best directly from config');
    const galleryId = 'pics/track/best';
    const gallery = config.galleries[galleryId];
    
    if (gallery && gallery.images && gallery.images.length > 0) {
      events.set('best', {
        id: 'best',
        title: 'Best',
        path: galleryId,
        cover: `./${gallery.images[0].thumbnail}`,
        count: gallery.images.length
      });
      
      console.log(`Added event: Best with ${gallery.images.length} images`);
    }
    
    return Array.from(events.values());
  }
  
  // First, directly check if there are any galleries that match our pattern
  let foundEvents = false;
  
  for (const galleryId of galleryKeys) {
    console.log(`Checking gallery: ${galleryId}`);
    
    // Check if this is a direct match to the collection or subdirectory
    if (galleryId === genrePath || galleryId.startsWith(genrePath + '/')) {
      console.log(`Found match: ${galleryId}`);
      foundEvents = true;
      
      // Extract event name from path
      const pathParts = galleryId.split('/');
      let eventId;
      
      if (pathParts.length >= 3) {
        eventId = pathParts[2]; // e.g., "best" from "pics/track/best"
      } else {
        eventId = "general"; // Default event name if it's directly in the collection folder
      }
      
      console.log(`Extracted event ID: ${eventId}`);
      
      if (!events.has(eventId)) {
        // Find a cover image
        const coverImage = config.galleries[galleryId].images && 
                          config.galleries[galleryId].images.length > 0 ?
                          `./${config.galleries[galleryId].images[0].thumbnail}` :
                          './thumbnails/placeholder.jpg';
        
        const eventTitle = eventId === "general" ? "General" : toTitleCase(eventId.replace(/-/g, ' '));
        
        events.set(eventId, {
          id: eventId,
          title: eventTitle,
          path: galleryId,
          cover: coverImage,
          count: config.galleries[galleryId].images ? config.galleries[galleryId].images.length : 0
        });
        
        console.log(`Added event: ${eventTitle} with ${events.get(eventId).count} images`);
      }
    }
  }
  
  // If no events were found using the normal method, try a fallback approach
  if (!foundEvents) {
    console.log("No events found with standard approach, trying fallback...");
    
    // Manual fallback for track collection
    if (genreId === 'track') {
      console.log("Using hardcoded fallback for track collection");
      
      // Find any gallery path that contains track/best
      const bestGallery = galleryKeys.find(path => path.includes('track/best'));
      
      if (bestGallery) {
        const gallery = config.galleries[bestGallery];
        
        events.set('best', {
          id: 'best',
          title: 'Best',
          path: bestGallery,
          cover: gallery.images && gallery.images.length > 0 
                 ? `./${gallery.images[0].thumbnail}` 
                 : './thumbnails/placeholder.jpg',
          count: gallery.images ? gallery.images.length : 0
        });
        
        console.log(`Added event (manual fallback): Best with ${gallery.images.length} images`);
      }
    }
  }
  
  return Array.from(events.values());
}

/**
 * Display events in a grid with links
 */
function displayEvents(events, container, genreId) {
  if (!events || events.length === 0) {
    container.innerHTML = `<p>No events found for ${genreId ? toTitleCase(genreId) : 'this collection'}. Add photos to the ${genreId ? `"pics/${genreId}"` : ''} directory.</p>`;
    return;
  }
  
  // Clear the container
  container.innerHTML = '';
  
  // Add each event card
  events.forEach(event => {
    const card = document.createElement('a');
    card.href = `?genre=${genreId}&event=${event.id}`;
    card.className = 'event-card';
    
    // Create card HTML
    card.innerHTML = `
      <img src="${event.cover}" alt="${event.title}">
      <div class="event-info">
        <h3 class="event-title">${event.title}</h3>
        <p class="event-count">${event.count} ${event.count === 1 ? 'photo' : 'photos'}</p>
      </div>
    `;
    
    // Track click on event card
    card.addEventListener('click', function(e) {
      trackEvent('Navigation', 'Click Event', `${genreId}/${event.id}`);
    });
    
    container.appendChild(card);
  });
}

/**
 * Initialize the event page - show photos for an event
 */
function initEventPage(genreId, eventId) {
  console.log(`Initializing event page for collection=${genreId}, event=${eventId}`);
  
  // Hide other containers
  hideAllContainers();
  
  // Show event container
  showContainer('event-container');
  
  // Update page title
  document.title = `${toTitleCase(genreId)} - ${toTitleCase(eventId)}`;
  
  // Load photos for this event
  loadEventPhotos(genreId, eventId);
}

/**
 * Load photos for a specific event
 */
function loadEventPhotos(genre, event) {
  console.log(`Loading photos for event: ${genre}/${event}`);
  const urlParams = new URLSearchParams(window.location.search);
  
  // Check for manually passed genre/event vs URL params
  const genrePath = genre || urlParams.get('genre');
  const eventPath = event || urlParams.get('event');
  
  if (!genrePath || !eventPath) {
    console.error('Genre or event path is missing');
    return;
  }
  
  const galleryPath = `pics/${genrePath}/${eventPath}`;
  console.log(`Constructed gallery path: ${galleryPath}`);
  
  // Track viewing this specific event
  trackEvent('Navigation', 'View Event', `${genrePath}/${eventPath}`);
  
  // Get the event container
  const eventContainer = document.getElementById('event-container');
  if (!eventContainer) {
    console.error('Event container not found');
    return;
  }
  
  // Update event title
  const genreTitle = document.getElementById('genre-title');
  if (genreTitle) {
    genreTitle.textContent = `${toTitleCase(genrePath)}: ${toTitleCase(eventPath)}`;
  }
  
  // Ensure back button exists and is properly configured
  const backButton = document.getElementById('back-button');
  if (backButton) {
    backButton.style.display = 'inline-flex';
    backButton.onclick = () => {
      window.location.href = `?genre=${genrePath}`;
    };
    backButton.querySelector('span').textContent = `Back to ${toTitleCase(genrePath)}`;
  }
  
  // Get photos for this event from config
  fetch('./js/gallery-config.json')
    .then(response => response.json())
    .then(config => {
      const photos = getPhotosFromConfig(config, galleryPath);
      console.log(`Retrieved ${photos.length} photos for gallery path ${galleryPath}`);
      
      // First, clear any existing photo container
      const existingPhotoContainer = document.getElementById('photo-container');
      if (existingPhotoContainer) {
        existingPhotoContainer.remove();
      }
      
      // Create a fresh photo container with proper styles
      const photoContainer = document.createElement('div');
      photoContainer.id = 'photo-container';
      photoContainer.style.display = 'block';
      photoContainer.style.width = '100%';
      photoContainer.style.maxWidth = '100%';
      photoContainer.style.margin = '0';
      photoContainer.style.padding = '0';
      
      // Append to event container
      eventContainer.appendChild(photoContainer);
      
      // Display photos using our enhanced function
      displayPhotos(photos, photoContainer);
    })
    .catch(error => {
      console.error('Error loading gallery config:', error);
      
      // Create an error message
      const photoContainer = document.createElement('div');
      photoContainer.id = 'photo-container';
      photoContainer.style.display = 'block';
      photoContainer.innerHTML = `<p class="error-message">Error loading photos. Please try again later.</p>`;
      
      // Replace any existing photo container or append new one
      const existingPhotoContainer = document.getElementById('photo-container');
      if (existingPhotoContainer) {
        eventContainer.replaceChild(photoContainer, existingPhotoContainer);
      } else {
        eventContainer.appendChild(photoContainer);
      }
    });
}

/**
 * Check if an image exists and return a promise with either the original URL or fallback
 */
function checkImageExists(imageUrl, fallbackUrl = 'thumbnails/placeholder.jpg') {
  console.log("Checking if image exists:", imageUrl);
  
  return new Promise((resolve) => {
    // Always resolve with original URL if it's already a placeholder
    if (imageUrl.includes('placeholder.jpg')) {
      resolve(imageUrl);
      return;
    }
    
    const img = new Image();
    
    // Set a timeout to prevent hanging on slow connections
    const timeout = setTimeout(() => {
      console.log(`Image load timeout for ${imageUrl}, using fallback`);
      resolve(fallbackUrl);
    }, 3000);
    
    img.onload = function() {
      clearTimeout(timeout);
      console.log(`Image exists: ${imageUrl}`);
      resolve(imageUrl);
    };
    
    img.onerror = function() {
      clearTimeout(timeout);
      console.log(`Image not found: ${imageUrl}, using fallback`);
      resolve(fallbackUrl);
    };
    
    // Start loading the image
    img.src = imageUrl;
  });
}

/**
 * Extract photos for an event from the config
 */
function getPhotosFromConfig(config, galleryPath) {
  console.log(`Looking for photos in gallery path: ${galleryPath}`);
  console.log(`Available galleries:`, Object.keys(config.galleries));
  
  // Direct match
  if (config.galleries && config.galleries[galleryPath]) {
    console.log(`Found exact match for gallery: ${galleryPath}`);
    const gallery = config.galleries[galleryPath];
    if (!gallery.images) {
      console.log(`Gallery exists but has no images`);
      return [];
    }
    
    console.log(`Found ${gallery.images.length} images in gallery`);
    return gallery.images.map(image => ({
      thumbnail: `./${image.thumbnail}`,
      medium: `./${image.medium}`,
      original: `./${image.original || image.medium}`,
      title: image.title || '',
      orientation: image.orientation || null
    }));
  }
  
  // Special handling for track/best
  if (galleryPath === 'pics/track/best') {
    console.log('Using special handling for track/best');
    // Find a gallery that contains track/best
    const galleryKeys = Object.keys(config.galleries);
    const bestGallery = galleryKeys.find(path => path.includes('track/best'));
    
    if (bestGallery) {
      console.log(`Found alternative gallery path: ${bestGallery}`);
      const gallery = config.galleries[bestGallery];
      if (!gallery.images) {
        console.log(`Gallery exists but has no images`);
        return [];
      }
      
      console.log(`Found ${gallery.images.length} images in gallery`);
      return gallery.images.map(image => ({
        thumbnail: `./${image.thumbnail}`,
        medium: `./${image.medium}`,
        original: `./${image.original || image.medium}`,
        title: image.title || '',
        orientation: image.orientation || null
      }));
    }
  }
  
  console.log(`No matching gallery found for ${galleryPath}`);
  return [];
}

/**
 * Display photos in a gallery grid
 */
function displayPhotos(photos, container) {
  if (!container) return;
  
  console.log(`Displaying ${photos.length} photos in container`);
  container.innerHTML = ''; // Clear container
  
  if (photos.length === 0) {
    container.innerHTML = '<p class="no-photos">No photos found in this event.</p>';
    return;
  }
  
  // Create gallery wrapper
  const galleryWrapper = document.createElement('div');
  galleryWrapper.className = 'photo-gallery';
  galleryWrapper.id = 'photo-gallery';
  
  // Add gallery to the container
  container.appendChild(galleryWrapper);
  
  // Now load each image
  photos.forEach((photo, index) => {
    const thumbnailSrc = photo.thumbnail || '';
    const mediumSrc = photo.medium || photo.original || '';
    const title = photo.title || `Photo ${index + 1}`;
    
    // Create column wrapper for consistent sizing
    const photoWrapper = document.createElement('div');
    photoWrapper.className = 'photo-item-wrapper';
    
    // Create photo item container
    const photoItem = document.createElement('div');
    photoItem.className = 'photo-item';
    photoItem.setAttribute('data-index', index);
    
    // Create a link with fancybox data to open the lightbox
    const link = document.createElement('a');
    link.href = mediumSrc;
    link.setAttribute('data-fancybox', 'gallery');
    link.setAttribute('data-caption', title);
    
    // Create the image element with a placeholder before it loads
    const loadingPlaceholder = document.createElement('div');
    loadingPlaceholder.className = 'loading-placeholder';
    loadingPlaceholder.innerHTML = `<span>${title}</span>`;
    link.appendChild(loadingPlaceholder);
    
    // Create actual image that will replace the placeholder when loaded
    const img = document.createElement('img');
    img.className = 'lazy';
    img.dataset.src = thumbnailSrc;
    img.alt = title;
    
    // Handle successful image load
    img.addEventListener('load', function() {
      // Remove the placeholder when image loads
      if (loadingPlaceholder && loadingPlaceholder.parentNode) {
        loadingPlaceholder.parentNode.removeChild(loadingPlaceholder);
      }
    });
    
    // Handle image load error
    img.addEventListener('error', function() {
      // Keep the placeholder but update its style
      loadingPlaceholder.className = 'error-placeholder';
      loadingPlaceholder.innerHTML = `<span>${title}</span>`;
      img.style.display = 'none';
    });
    
    link.appendChild(img);
    photoItem.appendChild(link);
    photoWrapper.appendChild(photoItem);
    galleryWrapper.appendChild(photoWrapper);
  });
  
  // Initialize lazy loading
  new LazyLoad({
    elements_selector: '.lazy',
    use_native: true
  });
  
  // Initialize Fancybox
  try {
    Fancybox.bind("[data-fancybox='gallery']", {
      animated: true,
      on: {
        error: (fancybox, slide, error) => {
          console.log("Fancybox error loading slide:", slide, error);
          // Replace the src with a placeholder if there's an error
          slide.src = 'thumbnails/placeholder.jpg';
        }
      }
    });
  } catch (error) {
    console.error("Error binding Fancybox to gallery:", error);
  }
  
  // Initialize Masonry layout after images are loaded
  try {
    const gallery = document.getElementById('photo-gallery');
    if (gallery) {
      // Wait for all images to load
      imagesLoaded(gallery, function() {
        const masonry = new Masonry(gallery, {
          itemSelector: '.photo-item-wrapper',
          percentPosition: true
        });
        console.log('Masonry layout initialized');
      });
    }
  } catch (error) {
    console.error('Error initializing Masonry layout:', error);
  }
}

/**
 * Helper functions to show/hide containers
 */
function hideAllContainers() {
  // Hide all main container elements
  const containers = ['genre-container', 'event-container', 'photo-container'];
  containers.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.style.display = 'none';
    }
  });
}

function showContainer(containerId) {
  const container = document.getElementById(containerId);
  if (container) {
    container.style.display = 'block';
  } else {
    console.error(`Container with ID "${containerId}" not found`);
  }
}

/**
 * Helper to convert a string to title case
 */
function toTitleCase(str) {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Scan the pics directory as a fallback if config is not available
 */
function scanDirectories() {
  // This would be implemented if direct directory scanning is needed
  // Not fully implemented as it's better to rely on the gallery-config.json
  console.log('Directory scanning not implemented. Using placeholder data.');
  
  const genreGrid = document.getElementById('genre-grid');
  if (!genreGrid) return;
  
  // Display placeholder message
  genreGrid.innerHTML = `
    <p>Could not load gallery configuration. Please ensure the thumbnail generation 
    script has been run to create js/gallery-config.json.</p>
  `;
} 