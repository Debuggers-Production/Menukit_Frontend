/**
 * Firebase Cloud Messaging Service Worker for Menukit.
 * Handles background push notifications across Laptop/Desktop, Android, and iOS.
 */

// Scripts for firebase-app and firebase-messaging in Service Worker scope
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

// Initialize Firebase inside the Service Worker
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
  console.log('[FCM SW] Received background message:', payload);
  const notificationTitle = payload.notification?.title || payload.data?.title || 'Menukit Notification';
  const tagId = payload.notification?.tag || payload.data?.order_id || payload.data?.tag || ('menukit-' + Date.now());
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || '',
    icon: payload.notification?.icon || '/pwa-192x192.png',
    badge: payload.notification?.badge || '/pwa-192x192.png',
    tag: tagId,
    vibrate: [200, 100, 200],
    data: {
      url: payload.data?.url || '/orders',
      ...payload.data
    },
    requireInteraction: true,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle notification click: focus open window or navigate
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
