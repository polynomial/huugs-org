/**
 * Huugs Media Photography Collection App
 * 
 * Handles loading collections, events, and photos
 * with Fancybox integration for the lightbox view
 */

console.log('App.js loaded');

document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM Content Loaded');
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
  console.log('Initializing home page...');
  const genreGrid = document.getElementById('genre-grid');
  if (!genreGrid) {
    console.error('Genre grid element not found');
    return;
  }
  
  console.log('Loading gallery configuration...');
  // Load the gallery configuration
  fetch('./js/gallery-config.json')
    .then(response => {
      console.log('Gallery config response:', response.status, response.statusText);
      if (!response.ok) {
        throw new Error(`Gallery config not found: ${response.status} ${response.statusText}`);
      }
      return response.json();
    })
    .then(config => {
      console.log('Gallery config loaded:', config);
      // Get unique collections from the config
      const genres = getGenresFromConfig(config);
      console.log('Found genres:', genres);
      displayGenres(genres, genreGrid);
    })
    .catch(error => {
      console.error('Error loading gallery config:', error);
      genreGrid.innerHTML = `<p>Error loading collections: ${error.message}</p>`;
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
  console.log('Getting genres from config:', config);
  if (!config.galleries) {
    console.error('No galleries found in config');
    return [];
  }
  
  const genres = new Map();
  
  // Process each gallery
  Object.keys(config.galleries).forEach(galleryId => {
    const gallery = config.galleries[galleryId];
    console.log(`Processing gallery: ${galleryId}`, gallery);
    
    // Skip if not a valid gallery
    if (!gallery || !gallery.events) {
      console.warn(`Invalid gallery: ${galleryId}`);
      return;
    }
    
    // Add collection if not already added
    if (!genres.has(galleryId)) {
      // Find a cover image from the first event's first photo
      let coverImage = './thumbnails/placeholder.jpg';
      const firstEvent = Object.values(gallery.events)[0];
      if (firstEvent && firstEvent.photos && firstEvent.photos.length > 0) {
        coverImage = firstEvent.photos[0].thumbnail;
      }
      
      genres.set(galleryId, {
        id: galleryId,
        title: gallery.title || toTitleCase(galleryId.replace(/_/g, ' ')),
        path: galleryId,
        cover: coverImage
      });
      
      console.log(`Added collection: ${galleryId}`, genres.get(galleryId));
    }
  });
  
  // Convert map to array and return
  const result = Array.from(genres.values());
  console.log('Final genres array:', result);
  return result;
}

/**
 * Display collections in a grid
 */
function displayGenres(genres, container) {
  console.log('Displaying genres:', genres);
  if (!genres || genres.length === 0) {
    console.warn('No genres to display');
    container.innerHTML = '<p>No photo collections found. Add photos to the "pics" directory.</p>';
    return;
  }
  
  // Clear existing content
  container.innerHTML = '';
  
  // Create grid for collections
  const grid = document.createElement('div');
  grid.className = 'genre-grid';
  
  // Add each collection to the grid
  genres.forEach(genre => {
    console.log('Creating card for genre:', genre);
    const card = document.createElement('div');
    card.className = 'genre-card';
    
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
    card.appendChild(link);
    grid.appendChild(card);
  });
  
  container.appendChild(grid);
  
  // Initialize lazy loading for images
  try {
    new LazyLoad({
      elements_selector: '.lazy',
      use_native: true
    });
    console.log('Lazy loading initialized');
  } catch (error) {
    console.error('Error initializing lazy loading:', error);
  }
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
  if (!config.galleries || !config.galleries[genreId]) return [];
  
  const events = new Map();
  const gallery = config.galleries[genreId];
  
  console.log(`Looking for events in collection: ${genreId}`);
  
  // Process each event in the gallery
  Object.entries(gallery.events).forEach(([eventId, event]) => {
    if (event && event.photos && event.photos.length > 0) {
      events.set(eventId, {
        id: eventId,
        title: event.title || toTitleCase(eventId.replace(/_/g, ' ')),
        path: `${genreId}/${eventId}`,
        cover: event.photos[0].thumbnail,
        count: event.photos.length
      });
      
      console.log(`Added event: ${eventId} with ${event.photos.length} photos`);
    }
  });
  
  return Array.from(events.values());
}

/**
 * Display events in a grid
 */
function displayEvents(events, container, genreId) {
  if (!events || events.length === 0) {
    container.innerHTML = '<p>No events found.</p>';
    return;
  }
  
  // Clear existing content
  container.innerHTML = '';
  
  // Create grid for events
  const grid = document.createElement('div');
  grid.className = 'event-grid';
  
  // Add each event to the grid
  events.forEach(event => {
    const card = document.createElement('div');
    card.className = 'event-card';
    
    const link = document.createElement('a');
    link.href = `?genre=${genreId}&event=${event.id}`;
    
    const img = document.createElement('img');
    img.className = 'lazy';
    img.dataset.src = event.cover;
    img.alt = event.title;
    
    const info = document.createElement('div');
    info.className = 'event-info';
    info.innerHTML = `<h3 class="event-title">${event.title}</h3>`;
    
    link.appendChild(img);
    link.appendChild(info);
    card.appendChild(link);
    grid.appendChild(card);
  });
  
  container.appendChild(grid);
  
  // Initialize lazy loading
  new LazyLoad({
    elements_selector: '.lazy',
    use_native: true
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
  showContainer('photo-container');
  
  // Update page title
  document.title = `${toTitleCase(genreId)} - ${toTitleCase(eventId)}`;
  
  // Load photos for this event
  loadEventPhotos(genreId, eventId);
}

/**
 * Load photos for an event
 */
function loadEventPhotos(genreId, eventId) {
  console.log(`Loading photos for event: ${genreId}/${eventId}`);
  
  const photoGrid = document.getElementById('photo-grid');
  if (!photoGrid) {
    console.error('Photo grid container not found');
    return;
  }
  
  // Clear previous content
  photoGrid.innerHTML = '';
  
  // Get gallery configuration
  fetch('./js/gallery-config.json')
    .then(response => response.json())
    .then(config => {
      const photos = getPhotosFromConfig(config, genreId, eventId);
      console.log(`Found ${photos.length} photos for event ${eventId}`);
      
      if (photos.length === 0) {
        photoGrid.innerHTML = `<p>No photos found for ${toTitleCase(eventId)}. Add photos to the "pics/${genreId}/${eventId}" directory.</p>`;
        return;
      }
      
      // Display photos
      displayPhotos(photos, photoGrid);
    })
    .catch(error => {
      console.error('Error loading gallery config:', error);
      photoGrid.innerHTML = '<p>Error loading photos. Please try again later.</p>';
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
function getPhotosFromConfig(config, genreId, eventId) {
  if (!config.galleries || !config.galleries[genreId] || !config.galleries[genreId].events[eventId]) {
    return [];
  }
  
  const event = config.galleries[genreId].events[eventId];
  if (!event.photos) return [];
  
  return event.photos.map(photo => ({
    id: photo.original.split('/').pop(),
    title: photo.title,
    original: photo.original,
    thumbnail: photo.thumbnail,
    medium: photo.medium
  }));
}

/**
 * Display photos in a grid
 */
function displayPhotos(photos, container) {
  if (!photos || photos.length === 0) {
    container.innerHTML = '<p>No photos found.</p>';
    return;
  }
  
  // Clear existing content
  container.innerHTML = '';
  
  // Create grid for photos
  const grid = document.createElement('div');
  grid.className = 'photo-grid';
  
  // Add each photo to the grid
  photos.forEach(photo => {
    const card = document.createElement('div');
    card.className = 'photo-card';
    
    const link = document.createElement('a');
    link.href = photo.medium;
    link.setAttribute('data-fancybox', 'gallery');
    link.setAttribute('data-caption', photo.title);
    
    const img = document.createElement('img');
    img.className = 'lazy';
    img.dataset.src = photo.thumbnail;
    img.alt = photo.title;
    
    link.appendChild(img);
    card.appendChild(link);
    grid.appendChild(card);
  });
  
  container.appendChild(grid);
  
  // Initialize lazy loading
  new LazyLoad({
    elements_selector: '.lazy',
    use_native: true
  });
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
    if (containerId === 'event-container') {
      const photoContainer = document.getElementById('photo-container');
      if (photoContainer) {
        photoContainer.style.display = 'block';
      }
    }
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