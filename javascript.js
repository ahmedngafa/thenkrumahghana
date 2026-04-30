const CACHE_NAME = 'nkrumah-ghana-v1.0.0';
const RUNTIME_CACHE = 'nkrumah-runtime-v1';

// Resources to cache immediately on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&family=Playfair+Display:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap'
];

// Install event - precache essential resources
self.addEventListener('install', event => {
  console.log('🔧 Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Precaching app shell');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        console.log('✅ Service Worker: Installed');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
  console.log('🚀 Service Worker: Activating...');
  
  const currentCaches = [CACHE_NAME, RUNTIME_CACHE];
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => !currentCaches.includes(cacheName))
          .map(cacheName => {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => {
      console.log('✅ Service Worker: Activated');
      return self.clients.claim();
    })
  );
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', event => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin) && 
      !event.request.url.includes('cloudflare.com') && 
      !event.request.url.includes('googleapis.com') &&
      !event.request.url.includes('unsplash.com')) {
    return;
  }

  // Handle API-like requests (network first)
  if (event.request.url.includes('/api/') || event.request.method !== 'GET') {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // For images, use cache first
  if (event.request.destination === 'image') {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // For all other requests, use network first with cache fallback
  event.respondWith(networkFirst(event.request));
});

// Network first strategy
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    
    // Cache the fetched response
    if (response && response.status === 200) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('⚠️ Network failed, trying cache:', request.url);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Offline fallback for HTML
    if (request.headers.get('accept')?.includes('text/html')) {
      return caches.match('/index.html');
    }
    
    throw error;
  }
}

// Cache first strategy (for images and static assets)
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('⚠️ Image fetch failed:', request.url);
    // Return a placeholder or fallback
    return new Response('', { status: 408, statusText: 'Offline' });
  }
}

// Handle messages from the page
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('⏩ Service Worker: Skipping waiting');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then(cacheNames => {
      return Promise.all(cacheNames.map(name => caches.delete(name)));
    }).then(() => {
      console.log('🗑️ All caches cleared');
    });
  }
});

// Background sync for offline actions
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    console.log('🔄 Background sync triggered');
    // Implement data syncing logic here
  }
});

// Push notification support
self.addEventListener('push', event => {
  const options = {
    body: event.data?.text() || 'New update from The Nkrumah Ghana',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Explore',
        icon: '/icons/icon-72.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/icon-72.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('The Nkrumah Ghana', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'explore') {
    clients.openWindow('/');
  }
});