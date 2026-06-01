// ── LearNow Service Worker ─────────────────────────────────────────────────
// Strategy:
//   - App shell (HTML, fonts, Tailwind CDN) → Cache First
//   - Firebase / API calls                  → Network Only (never cache auth)
//   - Everything else                       → Network First, fall back to cache
// ──────────────────────────────────────────────────────────────────────────

const CACHE_NAME = 'learnow-v3';
const CACHE_SHELL = 'learnow-shell-v3';

// Files that form the app shell — cached on install
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// External CDN assets to cache on first use
const CDN_ORIGINS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdn.tailwindcss.com',
  'cdnjs.cloudflare.com',
];

// Never cache these — always go to network
const NEVER_CACHE = [
  'firebaseapp.com',
  'googleapis.com/identitytoolkit',
  'securetoken.googleapis.com',
  'cloudfunctions.net',
  'firestore.googleapis.com',
  'recaptcha',
];

// ── INSTALL ───────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_SHELL).then(cache => {
      return cache.addAll(SHELL_ASSETS).catch(err => {
        // Don't fail install if some shell assets 404 (icons may not exist yet)
        console.warn('[SW] Shell cache partial failure:', err);
      });
    })
  );
  // Take control immediately without waiting for old SW to die
  self.skipWaiting();
});

// ── ACTIVATE ──────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME && key !== CACHE_SHELL)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ── SKIP WAITING message from app ─────────────────────────────────────────
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── FETCH ─────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 1. Never cache auth, Firebase, or API calls
  if (NEVER_CACHE.some(domain => url.hostname.includes(domain) || url.href.includes(domain))) {
    return; // Let browser handle normally
  }

  // 2. Non-GET requests — network only
  if (event.request.method !== 'GET') return;

  // 3. App shell — Cache First
  if (
    url.pathname === '/' ||
    url.pathname === '/index.html' ||
    url.pathname === '/manifest.json'
  ) {
    event.respondWith(cacheFirst(event.request, CACHE_SHELL));
    return;
  }

  // 4. CDN fonts/scripts — Cache First (they're versioned/immutable)
  if (CDN_ORIGINS.some(origin => url.hostname.includes(origin))) {
    event.respondWith(cacheFirst(event.request, CACHE_NAME));
    return;
  }

  // 5. Everything else — Network First, fall back to cache
  event.respondWith(networkFirst(event.request, CACHE_NAME));
});

// ── STRATEGIES ────────────────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    // Offline and not cached — return offline fallback if we have it
    const fallback = await caches.match('/index.html');
    return fallback || new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Last resort: serve app shell for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/index.html');
    }
    return new Response('Offline', { status: 503 });
  }
}
