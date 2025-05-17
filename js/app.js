/**
 * Photography Collection App
 * 
 * Handles loading genres, events, and photos
 * with Fancybox integration for the lightbox view
 */

document.addEventListener('DOMContentLoaded', function() {
  // Initialize app based on current page
  initApp();
});

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
    console.log(`Initializing event page: genre=${genre}, event=${event}`);
    initEventPage(genre, event);
  } else if (urlParams.has('genre')) {
    // Genre page - show events
    const genre = urlParams.get('genre');
    console.log(`Initializing genre page: genre=${genre}`);
    initGenrePage(genre);
  } else {
    // Home page - show genres
    console.log("Initializing home page");
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
 * Initialize the home page with all photo genres
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
      // Get unique genres from the config
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
 * Load all genres from the configuration
 */
function loadAllGenres() {
  console.log('Loading all genres');
  
  const genreContainer = document.getElementById('genre-container');
  if (!genreContainer) {
    console.error('Genre container not found');
    return;
  }
  
  // Get the grid to add genres to
  const genreGrid = document.getElementById('genre-grid');
  if (!genreGrid) {
    console.error('Genre grid not found');
    return;
  }
  
  // Get gallery configuration
  fetch('./js/gallery-config.json')
    .then(response => response.json())
    .then(config => {
      // Process galleries to get unique genres
      const genres = getGenresFromConfig(config);
      console.log(`Found ${genres.length} genres`);
      
      if (genres.length === 0) {
        genreGrid.innerHTML = '<p>No photo genres found. Add photos to the "pics" directory.</p>';
        return;
      }
      
      // Add each genre to the grid
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
      genreGrid.innerHTML = '<p>Error loading genres. Please try again later.</p>';
    });
}

/**
 * Extract unique genres from the configuration
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
    
    // Extract genre from the path (second segment after 'pics')
    const genreId = pathParts[1];
    
    // Skip the test gallery
    if (genreId === 'test-gallery') {
      return;
    }
    
    // Add genre if not already added
    if (!genres.has(genreId)) {
      // Find a cover image from the first gallery of this genre
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
      
      console.log(`Added genre: ${genreId}`);
    }
  });
  
  return Array.from(genres.values());
}

/**
 * Display the genre cards on the home page
 */
function displayGenres(genres, container) {
  if (genres.length === 0) {
    container.innerHTML = '<p>No photo genres found. Add photos to the "pics" directory.</p>';
    return;
  }
  
  // Clear the container
  container.innerHTML = '';
  
  // Add each genre card
  genres.forEach(genre => {
    const card = document.createElement('a');
    card.href = `?genre=${genre.id}`;
    card.className = 'genre-card';
    
    // Create card HTML
    card.innerHTML = `
      <img src="${genre.cover}" alt="${genre.title}">
      <div class="genre-info">
        <h2 class="genre-title">${genre.title}</h2>
        <p class="genre-count">${genre.count} ${genre.count === 1 ? 'event' : 'events'}</p>
      </div>
    `;
    
    container.appendChild(card);
  });
}

/**
 * Find a cover image for a genre
 */
function findCoverImage(config, genre) {
  // Try to find a good cover image from the galleries
  for (const galleryId in config.galleries) {
    if (galleryId.includes(`/pics/${genre}/`)) {
      const gallery = config.galleries[galleryId];
      if (gallery.images && gallery.images.length > 0) {
        // Use the first image from the first gallery as the cover
        return `./${gallery.images[0].thumbnail}`;
      }
    }
  }
  
  // Fallback to a placeholder
  return `./thumbnails/pics/${genre}/placeholder.jpg`;
}

/**
 * Initialize the genre page - show events for a genre
 */
function initGenrePage(genreId) {
  console.log(`Initializing genre page for genre=${genreId}`);
  
  // Hide other containers and show event container
  hideAllContainers();
  showContainer('event-container');
  
  // Update page title
  document.title = `${toTitleCase(genreId)} Events`;
  
  // Update genre title
  const genreTitle = document.getElementById('event-title');
  if (genreTitle) {
    genreTitle.textContent = `${toTitleCase(genreId)} Events`;
  }
  
  // Add back button to home page
  const backButton = document.getElementById('back-button');
  if (backButton) {
    backButton.style.display = 'block';
    backButton.onclick = () => {
      window.location.href = '/';
    };
    backButton.querySelector('span').textContent = 'Back to Genres';
  }
  
  // Load events for this genre
  loadGenreEvents(genreId);
}

/**
 * Load events for a specific genre
 */
function loadGenreEvents(genreId) {
  console.log(`Loading events for genre: ${genreId}`);
  
  // Clear previous event content
  const eventContainer = document.querySelector('#event-container');
  if (!eventContainer) {
    console.error('Event container not found');
    return;
  }
  
  // Create event list container if it doesn't exist
  let eventList = document.getElementById('event-list');
  if (!eventList) {
    eventList = document.createElement('div');
    eventList.id = 'event-list';
    eventList.className = 'event-grid';
    eventContainer.appendChild(eventList);
  } else {
    eventList.innerHTML = '';
  }
  
  // Get events for this genre from config
  fetch('./js/gallery-config.json')
    .then(response => response.json())
    .then(config => {
      const events = getEventsFromConfig(config, genreId);
      console.log(`Retrieved ${events.length} events for genre ${genreId}`);
      
      if (events.length === 0) {
        eventList.innerHTML = `<p>No events found for ${toTitleCase(genreId)}. Add photos to the 'pics/${genreId}' directory.</p>`;
        return;
      }
      
      // Add events to grid
      events.forEach(event => {
        const eventDiv = document.createElement('div');
        eventDiv.className = 'event-item';
        
        const link = document.createElement('a');
        link.href = `?genre=${genreId}&event=${event.id}`;
        
        const img = document.createElement('img');
        img.className = 'lazy event-thumbnail';
        img.dataset.src = event.cover;
        img.alt = event.title;
        
        const title = document.createElement('h3');
        title.textContent = event.title;
        
        const count = document.createElement('span');
        count.className = 'photo-count';
        count.textContent = `${event.count} photos`;
        
        link.appendChild(img);
        link.appendChild(title);
        link.appendChild(count);
        eventDiv.appendChild(link);
        eventList.appendChild(eventDiv);
      });
      
      // Initialize lazy loading for images
      new LazyLoad({
        elements_selector: '.lazy',
        use_native: true
      });
    })
    .catch(error => {
      console.error('Error loading gallery config:', error);
      eventList.innerHTML = `<p>Error loading events: ${error.message}</p>`;
    });
}

/**
 * Extract events for a genre from the config
 */
function getEventsFromConfig(config, genreId) {
  if (!config.galleries) return [];
  
  const events = new Map();
  const genrePath = `pics/${genreId}`;
  
  console.log(`Looking for events in genre: ${genreId}`);
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
    
    // Check if this is a direct match to the genre or subdirectory
    if (galleryId === genrePath || galleryId.startsWith(genrePath + '/')) {
      console.log(`Found match: ${galleryId}`);
      foundEvents = true;
      
      // Extract event name from path
      const pathParts = galleryId.split('/');
      let eventId;
      
      if (pathParts.length >= 3) {
        eventId = pathParts[2]; // e.g., "best" from "pics/track/best"
      } else {
        eventId = "general"; // Default event name if it's directly in the genre folder
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
    
    // Manual fallback for track genre
    if (genreId === 'track') {
      console.log("Using hardcoded fallback for track genre");
      
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
 * Display event cards for a genre
 */
function displayEvents(events, container, genreId) {
  if (events.length === 0) {
    container.innerHTML = `<p>No events found for ${toTitleCase(genreId)}. Add photos to the "pics/${genreId}" directory.</p>`;
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
    
    container.appendChild(card);
  });
}

/**
 * Initialize the event page - show photos for an event
 */
function initEventPage(genreId, eventId) {
  console.log(`Initializing event page for genre=${genreId}, event=${eventId}`);
  
  // Hide other containers and show event container
  hideAllContainers();
  showContainer('event-container');
  
  // Update page title
  document.title = toTitleCase(eventId);
  
  // Update event title
  const eventTitle = document.getElementById('event-title');
  if (eventTitle) {
    eventTitle.textContent = toTitleCase(eventId);
  }
  
  // Add back button to genre page
  const backButton = document.getElementById('back-button');
  if (backButton) {
    backButton.style.display = 'block';
    backButton.onclick = () => {
      window.location.href = `?genre=${genreId}`;
    };
    backButton.querySelector('span').textContent = `Back to ${toTitleCase(genreId)} Events`;
  }
  
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
  
  // Clear previous event content
  const eventContainer = document.querySelector('#event-container');
  if (!eventContainer) {
    console.error('Event container not found');
    return;
  }
  eventContainer.innerHTML = '';
  
  // Update event title
  const eventTitle = document.querySelector('#event-title');
  if (eventTitle) {
    eventTitle.textContent = `${eventPath.charAt(0).toUpperCase() + eventPath.slice(1)}`;
  }
  
  // Get photos for this event from config
  fetch('./js/gallery-config.json')
    .then(response => response.json())
    .then(config => {
      const photos = getPhotosFromConfig(config, galleryPath);
      console.log(`Retrieved ${photos.length} photos for gallery path ${galleryPath}`);
      
      if (photos.length === 0) {
        eventContainer.innerHTML = `<p>No photos found for ${eventPath}. Add photos to the '${galleryPath}' directory.</p>`;
        return;
      }
      
      // Create photo grid
      const photoGrid = document.createElement('div');
      photoGrid.className = 'photo-grid';
      photoGrid.id = 'photos-grid'; // Add ID for potential reference
      eventContainer.appendChild(photoGrid);
      
      // Add photos to grid
      photos.forEach((photo, index) => {
        const photoDiv = document.createElement('div');
        photoDiv.className = 'photo-item';
        
        const link = document.createElement('a');
        link.href = photo.medium;
        link.setAttribute('data-fancybox', 'gallery');
        link.setAttribute('data-caption', photo.title || `Photo ${index + 1}`);
        
        const img = document.createElement('img');
        img.className = 'lazy';
        img.dataset.src = photo.thumbnail;
        img.alt = photo.title || `Photo ${index + 1}`;
        
        link.appendChild(img);
        photoDiv.appendChild(link);
        photoGrid.appendChild(photoDiv);
      });
      
      // Initialize lazy loading for images
      new LazyLoad({
        elements_selector: '.lazy',
        use_native: true
      });
      
      // Initialize Fancybox for the gallery - MAKE SURE THIS RUNS AFTER ADDING PHOTOS
      console.log('Attempting to initialize Fancybox for gallery...');
      try {
        if (typeof Fancybox !== 'undefined') {
          // Destroy any existing Fancybox instances first
          try {
            Fancybox.destroy();
          } catch (e) {
            console.log('No previous Fancybox instance to destroy');
          }
          
          // Initialize a new Fancybox instance
          Fancybox.bind('[data-fancybox="gallery"]', {
            loop: true,
            buttons: ["zoom", "slideShow", "fullScreen", "download", "thumbs", "close"],
            animationEffect: "fade",
            transitionEffect: "fade",
            preventCaptionOverlap: true,
            hideScrollbar: true,
            clickContent: 'next'
          });
          console.log('Fancybox successfully initialized for gallery');
        } else {
          console.error('Fancybox is not defined - check if it is properly loaded');
          
          // Add Fancybox scripts if they're missing
          if (!document.querySelector('script[src*="fancybox"]')) {
            console.log('Attempting to load Fancybox scripts dynamically...');
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@fancyapps/ui@4.0/dist/fancybox.umd.js';
            script.onload = () => {
              console.log('Fancybox script loaded, initializing...');
              Fancybox.bind('[data-fancybox="gallery"]', {
                loop: true,
                buttons: ["zoom", "slideShow", "fullScreen", "download", "thumbs", "close"]
              });
            };
            document.head.appendChild(script);
            
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdn.jsdelivr.net/npm/@fancyapps/ui@4.0/dist/fancybox.css';
            document.head.appendChild(link);
          }
        }
      } catch (e) {
        console.error('Error initializing Fancybox:', e);
      }
    })
    .catch(error => {
      console.error('Error loading gallery config:', error);
      eventContainer.innerHTML = `<p>Error loading photos: ${error.message}</p>`;
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
      title: image.title || ''
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
        title: image.title || ''
      }));
    }
  }
  
  console.log(`No matching gallery found for ${galleryPath}`);
  return [];
}

/**
 * Display photos in a grid with Fancybox integration
 */
function displayPhotos(photos, container) {
  if (photos.length === 0) {
    container.innerHTML = '<p>No photos found for this event.</p>';
    return;
  }
  
  // Clear the container
  container.innerHTML = '';
  
  // Add each photo
  photos.forEach((photo, index) => {
    const item = document.createElement('a');
    item.href = photo.medium;
    item.className = 'photo-item';
    item.setAttribute('data-fancybox', 'gallery');
    item.setAttribute('data-caption', photo.title);
    
    // Create the thumbnail
    const img = document.createElement('img');
    img.src = photo.thumbnail;
    img.alt = photo.title || `Photo ${index + 1}`;
    
    item.appendChild(img);
    container.appendChild(item);
  });
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