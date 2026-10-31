// ==============================================================================
// WealthOvers Service Worker (PRD Section 25 Compliant)
// Manages offline shell, caches static icons, and clears obsolete client caches.
// Sensitive financial data and API routes are NEVER cached.
// ==============================================================================

const CACHE_NAME = 'wealthovers-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/images/logo-dark.png',
  '/images/logo-light.png',
  '/images/logo.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        // Fallback silently if some static asset cannot be cached immediately
        console.warn('SW: pre-caching non-critical failure', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // STRICT SECURITY GUARD: Never intercept or cache API requests, auth callbacks, or mutation requests
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  // Network-first strategy for dynamic page navigation, cache-fallback for static assets
  event.respondWith(
    fetch(event.request).catch(async () => {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      return caches.match('/');
    })
  );
});
