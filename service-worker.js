// ============================================================
// SERVICE WORKER FOR AS-DEV WEATHER - /Wea/ Version
// ============================================================

const CACHE_NAME = 'asdev-weather-v1';
const urlsToCache = [
    '/Wea/',                    // Main site
    '/Wea/index.html',          // HTML file
    '/Wea/manifest.json',       // Manifest
    '/Wea/icons/favicon-16.png',
    '/Wea/icons/favicon-32.png',
    '/Wea/icons/icon-192.png',
    '/Wea/icons/icon-512.png',
    '/Wea/icons/apple-icon-180.png'
];

// Install service worker
self.addEventListener('install', event => {
    console.log('Service Worker installing for /Wea/');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Caching /Wea/ assets');
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting())
    );
});

// Fetch resources with proper path handling
self.addEventListener('fetch', event => {
    // Handle requests that might be missing /Wea/
    const url = new URL(event.request.url);
    
    // If request is for a file that should be in /Wea/ but isn't
    if (url.pathname.startsWith('/icons/') || 
        url.pathname === '/manifest.json' || 
        url.pathname === '/index.html') {
        
        // Redirect to /Wea/ version
        const correctUrl = '/Wea' + url.pathname;
        event.respondWith(
            caches.match(correctUrl).then(response => {
                if (response) return response;
                return fetch(correctUrl).catch(() => caches.match('/Wea/offline.html'));
            })
        );
        return;
    }
    
    // Normal fetch handling
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request)
                    .then(response => {
                        // Don't cache external APIs
                        if (!response || response.status !== 200 || 
                            event.request.url.includes('open-meteo.com')) {
                            return response;
                        }
                        
                        // Cache successful responses
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, responseClone);
                        });
                        return response;
                    })
                    .catch(() => {
                        // Return offline page for navigation requests
                        if (event.request.mode === 'navigate') {
                            return caches.match('/Wea/offline.html');
                        }
                    });
            })
    );
});

// Activate and clean up old caches
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});
