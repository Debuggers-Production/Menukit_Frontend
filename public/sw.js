/**
 * Unified Service Worker for Menukit (PWA caching + Firebase Cloud Messaging Push).
 * Handles background push notifications across Laptop/Desktop, Android, and iOS Safari.
 */

// Import Firebase Scripts for Service Worker
try {
  importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

  firebase.initializeApp({
    apiKey: "AIzaSyB52AkIRDC2mS44DjWlYOxZyGgUhNPBeKI",
    authDomain: "menukit-9f649.firebaseapp.com",
    projectId: "menukit-9f649",
    storageBucket: "menukit-9f649.firebasestorage.app",
    messagingSenderId: "327868133715",
    appId: "1:327868133715:web:9dbee4bb2886e534a931a6",
    measurementId: "G-JZP0B6XMDR"
  });

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Received background push message:', payload);
    const notificationTitle = payload.notification?.title || payload.data?.title || 'Menukit Notification';
    const notificationOptions = {
      body: payload.notification?.body || payload.data?.body || '',
      icon: payload.notification?.icon || '/pwa-192x192.png',
      badge: payload.notification?.badge || '/pwa-192x192.png',
      vibrate: [200, 100, 200],
      data: {
        url: payload.data?.url || '/orders',
        ...payload.data
      },
      requireInteraction: true,
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (e) {
  console.warn('[SW] Could not import/initialize Firebase in SW:', e);
}

const CACHE_NAME = 'menukit-pwa-v3';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/manifest.json',
        '/pwa-192x192.png',
        '/pwa-512x512.png',
        '/menukit-logo.svg',
      ]).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Notification click event listener
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/orders';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if (client.url.includes(self.location.origin)) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Fetch event listener for PWA caching
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (!url.protocol.startsWith('http')) return;

  // Skip local development to avoid intercepting Vite HMR & dynamic routes
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    return;
  }

  // Skip API and websocket requests
  if (url.pathname.startsWith('/api') || url.pathname.includes('/socket.io') || url.pathname.includes('/ws')) {
    return;
  }

  // Network-first with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        });
      })
  );
});
