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
  
  // Handle different page views
  if (urlParams.has('genre')) {
    // Genre page - show events
    const genre = urlParams.get('genre');
    initGenrePage(genre);
  } else if (urlParams.has('genre') && urlParams.has('event')) {
    // Event page - show photos
    const genre = urlParams.get('genre');
    const event = urlParams.get('event');
    initEventPage(genre, event);
  } else {
    // Home page - show genres
    initHomePage();
  }
  
  // Initialize Fancybox
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
 * Extract genres from the config file
 */
function getGenresFromConfig(config) {
  if (!config.galleries) return [];
  
  const genres = new Map();
  
  Object.keys(config.galleries).forEach(galleryId => {
    // Extract genre from gallery path (first part of path)
    const pathParts = galleryId.split('/');
    if (pathParts.length >= 2) {
      const genre = pathParts[1]; // e.g., "track" from "pics/track/best"
      
      if (!genres.has(genre)) {
        genres.set(genre, {
          id: genre,
          title: toTitleCase(genre),
          path: `pics/${genre}`,
          cover: findCoverImage(config, genre),
          count: 0
        });
      }
      
      // Update the event count for this genre
      const genreData = genres.get(genre);
      genreData.count++;
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
 * Initialize a genre page showing all events
 */
function initGenrePage(genreId) {
  // First, update the page structure
  document.title = `${toTitleCase(genreId)} Photos`;
  
  const main = document.querySelector('main');
  if (!main) return;
  
  main.innerHTML = `
    <div class="events-header">
      <a href="index.html" class="back-link">← Back to Genres</a>
      <h2>${toTitleCase(genreId)} Events</h2>
    </div>
    <div class="events-grid" id="events-grid">
      <!-- Events will be loaded here -->
    </div>
  `;
  
  // Load events for this genre
  loadGenreEvents(genreId);
}

/**
 * Load all events for a specific genre
 */
function loadGenreEvents(genreId) {
  const eventsGrid = document.getElementById('events-grid');
  if (!eventsGrid) return;
  
  // Load the gallery configuration
  fetch('./js/gallery-config.json')
    .then(response => {
      if (!response.ok) {
        throw new Error('Gallery config not found');
      }
      return response.json();
    })
    .then(config => {
      // Get events from the config
      const events = getEventsFromConfig(config, genreId);
      displayEvents(events, eventsGrid, genreId);
    })
    .catch(error => {
      console.error('Error loading gallery config:', error);
      eventsGrid.innerHTML = '<p>Error loading events. Please try again later.</p>';
    });
}

/**
 * Extract events for a genre from the config
 */
function getEventsFromConfig(config, genreId) {
  if (!config.galleries) return [];
  
  const events = new Map();
  const genrePath = `pics/${genreId}`;
  
  // Log for debugging
  console.log(`Looking for events in genre: ${genreId}`);
  console.log(`Available galleries:`, Object.keys(config.galleries));
  
  // First, directly check if there are any galleries that match our pattern
  let foundEvents = false;
  
  Object.keys(config.galleries).forEach(galleryId => {
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
  });
  
  // If no events were found using the normal method, try a fallback approach
  if (!foundEvents) {
    console.log("No events found with standard approach, trying fallback...");
    
    // Look for any gallery that contains the genre in its path
    Object.keys(config.galleries).forEach(galleryId => {
      if (galleryId.includes(`/${genreId}/`)) {
        const pathParts = galleryId.split('/');
        // Find the part after the genre name
        let genreIndex = -1;
        pathParts.forEach((part, index) => {
          if (part === genreId) {
            genreIndex = index;
          }
        });
        
        if (genreIndex >= 0 && genreIndex + 1 < pathParts.length) {
          const eventId = pathParts[genreIndex + 1];
          
          if (!events.has(eventId)) {
            // Find a cover image
            const coverImage = config.galleries[galleryId].images && 
                              config.galleries[galleryId].images.length > 0 ?
                              `./${config.galleries[galleryId].images[0].thumbnail}` :
                              './thumbnails/placeholder.jpg';
            
            events.set(eventId, {
              id: eventId,
              title: toTitleCase(eventId.replace(/-/g, ' ')),
              path: galleryId,
              cover: coverImage,
              count: config.galleries[galleryId].images ? config.galleries[galleryId].images.length : 0
            });
            
            console.log(`Added event (fallback): ${eventId} with ${events.get(eventId).count} images`);
          }
        }
      }
    });
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
 * Initialize an event page showing all photos
 */
function initEventPage(genreId, eventId) {
  // First, update the page structure
  document.title = `${toTitleCase(eventId.replace(/-/g, ' '))} Photos`;
  
  const main = document.querySelector('main');
  if (!main) return;
  
  main.innerHTML = `
    <div class="photos-header">
      <a href="?genre=${genreId}" class="back-link">← Back to ${toTitleCase(genreId)} Events</a>
      <h2>${toTitleCase(eventId.replace(/-/g, ' '))}</h2>
    </div>
    <div class="photos-grid" id="photos-grid">
      <!-- Photos will be loaded here -->
    </div>
  `;
  
  // Load photos for this event
  loadEventPhotos(genreId, eventId);
}

/**
 * Load all photos for a specific event
 */
function loadEventPhotos(genreId, eventId) {
  const photosGrid = document.getElementById('photos-grid');
  if (!photosGrid) return;
  
  let galleryPath;
  if (eventId === "general") {
    galleryPath = `pics/${genreId}`;
  } else {
    galleryPath = `pics/${genreId}/${eventId}`;
  }
  
  // Load the gallery configuration
  fetch('./js/gallery-config.json')
    .then(response => {
      if (!response.ok) {
        throw new Error('Gallery config not found');
      }
      return response.json();
    })
    .then(config => {
      // Get photos from the config
      const photos = getPhotosFromConfig(config, galleryPath);
      displayPhotos(photos, photosGrid);
    })
    .catch(error => {
      console.error('Error loading gallery config:', error);
      photosGrid.innerHTML = '<p>Error loading photos. Please try again later.</p>';
    });
}

/**
 * Extract photos for an event from the config
 */
function getPhotosFromConfig(config, galleryPath) {
  if (!config.galleries || !config.galleries[galleryPath]) return [];
  
  const gallery = config.galleries[galleryPath];
  if (!gallery.images) return [];
  
  return gallery.images.map(image => ({
    thumbnail: `./${image.thumbnail}`,
    medium: `./${image.medium}`,
    original: `./${image.original || image.medium}`,
    title: image.title || ''
  }));
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
 * Helper to convert a string to title case
 */
function toTitleCase(str) {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
} 