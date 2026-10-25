/**
 * Firebase Cloud Messaging (FCM) client service.
 * Supports Web Push across Laptop/Desktop (Chrome, Safari, Edge, Firefox),
 * Mobile Android, and iOS (iOS 16.4+ Safari & PWA).
 */

import React from 'react';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging, MessagePayload } from 'firebase/messaging';
import toast from 'react-hot-toast';
import { api } from './api';

// Cache references
let firebaseApp: FirebaseApp | null = null;
let messagingInstance: Messaging | null = null;

export interface FCMDeviceInfo {
  platform: 'web' | 'android' | 'ios';
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
}

/**
 * Detect client platform, device type, and browser.
 */
export function getDeviceInfo(): FCMDeviceInfo {
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);
  const isTablet = /iPad|tablet|(android(?!.*mobile))/i.test(ua);
  const isMobile = /mobile/i.test(ua) || isIOS || isAndroid;

  let platform: 'web' | 'android' | 'ios' = 'web';
  if (isIOS) platform = 'ios';
  else if (isAndroid) platform = 'android';

  let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';
  if (isTablet) deviceType = 'tablet';
  else if (isMobile) deviceType = 'mobile';

  let browser = 'other';
  if (/chrome|crios/i.test(ua) && !/edge|edgios|opr/i.test(ua)) browser = 'chrome';
  else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) browser = 'safari';
  else if (/edg/i.test(ua)) browser = 'edge';
  else if (/firefox|fxios/i.test(ua)) browser = 'firefox';

  return { platform, deviceType, browser };
}

// Default Firebase Web Client credentials for Menukit (consistent with sw.js and firebase-messaging-sw.js)
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyB52AkIRDC2mS44DjWlYOxZyGgUhNPBeKI",
  authDomain: "menukit-9f649.firebaseapp.com",
  projectId: "menukit-9f649",
  storageBucket: "menukit-9f649.firebasestorage.app",
  messagingSenderId: "327868133715",
  appId: "1:327868133715:web:9dbee4bb2886e534a931a6",
  measurementId: "G-JZP0B6XMDR",
  vapidKey: "BIR1iUOAQ5Ya5XeFmijZmQQtT7JxEGplxFUjAVKeBPBZ6ircOr9ymjo-VPEpbYHyH3OoMcJX2TES_bkGRHdoCvI",
};

/**
 * Resolve Firebase web credentials with priority:
 * 1. import.meta.env (Vite build-time inlining)
 * 2. window.APP_CONFIG (Docker runtime injection via config.js)
 * 3. DEFAULT_FIREBASE_CONFIG (Menukit production project defaults)
 */
export function getFirebaseConfig() {
  const winConfig = typeof window !== 'undefined' ? (window as any).APP_CONFIG : undefined;

  const getVal = (viteVal: string | undefined, winKey: string, fallback: string): string => {
    if (viteVal && viteVal.trim() && !viteVal.startsWith('$')) return viteVal.trim();
    if (winConfig && winConfig[winKey] && typeof winConfig[winKey] === 'string' && winConfig[winKey].trim() && !winConfig[winKey].startsWith('$')) {
      return winConfig[winKey].trim();
    }
    return fallback;
  };

  const apiKey = getVal(import.meta.env.VITE_FIREBASE_API_KEY, 'FIREBASE_API_KEY', DEFAULT_FIREBASE_CONFIG.apiKey);
  const projectId = getVal(import.meta.env.VITE_FIREBASE_PROJECT_ID, 'FIREBASE_PROJECT_ID', DEFAULT_FIREBASE_CONFIG.projectId);
  const messagingSenderId = getVal(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID, 'FIREBASE_MESSAGING_SENDER_ID', DEFAULT_FIREBASE_CONFIG.messagingSenderId);
  const appId = getVal(import.meta.env.VITE_FIREBASE_APP_ID, 'FIREBASE_APP_ID', DEFAULT_FIREBASE_CONFIG.appId);
  const authDomain = getVal(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, 'FIREBASE_AUTH_DOMAIN', `${projectId}.firebaseapp.com`);
  const storageBucket = getVal(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, 'FIREBASE_STORAGE_BUCKET', `${projectId}.firebasestorage.app`);
  const measurementId = getVal(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID, 'FIREBASE_MEASUREMENT_ID', DEFAULT_FIREBASE_CONFIG.measurementId);
  const vapidKey = getVal(import.meta.env.VITE_FIREBASE_VAPID_KEY, 'FIREBASE_VAPID_KEY', DEFAULT_FIREBASE_CONFIG.vapidKey);

  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
    measurementId,
    vapidKey,
  };
}

/**
 * Check if Firebase environment variables are configured.
 */
export function isFirebaseConfigured(): boolean {
  const cfg = getFirebaseConfig();
  return Boolean(cfg.apiKey && cfg.projectId && cfg.messagingSenderId && cfg.appId);
}

/**
 * Initialize Firebase App singleton safely.
 */
export function initFirebase(): { app: FirebaseApp | null; messaging: Messaging | null } {
  if (firebaseApp && messagingInstance) {
    return { app: firebaseApp, messaging: messagingInstance };
  }

  if (!isFirebaseConfigured()) {
    return { app: null, messaging: null };
  }

  try {
    const firebaseConfig = getFirebaseConfig();

    const existingApps = getApps();
    firebaseApp = existingApps.length > 0 ? existingApps[0] : initializeApp(firebaseConfig);

    if (typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator) {
      messagingInstance = getMessaging(firebaseApp);
    }

    return { app: firebaseApp, messaging: messagingInstance };
  } catch (error) {
    console.warn('[FCM] Failed to initialize Firebase:', error);
    return { app: null, messaging: null };
  }
}

/**
 * Request notification permission and register FCM device token with backend.
 */
export async function requestFCMToken(shopId?: string): Promise<{ success: boolean; token?: string; error?: string }> {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Window not defined' };
  }

  if (!('Notification' in window)) {
    return { success: false, error: 'Push notifications are not supported by this browser.' };
  }

  if (!('serviceWorker' in navigator)) {
    return { success: false, error: 'Service workers are not supported by this browser.' };
  }

  if (!isFirebaseConfigured()) {
    return {
      success: false,
      error: 'Firebase is not yet configured with VITE_FIREBASE_* environment variables.',
    };
  }

  const { messaging } = initFirebase();
  if (!messaging) {
    return { success: false, error: 'Firebase Messaging could not be initialized.' };
  }

  try {
    // Request permission from the user
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'Notification permission was denied or dismissed.' };
    }

    // Ensure Service Worker is registered
    let swReg = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
    if (!swReg) {
      try {
        swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
      } catch (e) {
        console.warn('[FCM] SW register notice:', e);
      }
    }

    const { vapidKey } = getFirebaseConfig();
    let token: string | null = null;

    try {
      token = await getToken(messaging, {
        vapidKey: vapidKey && vapidKey.trim() ? vapidKey.trim() : undefined,
        serviceWorkerRegistration: swReg || undefined,
      });
    } catch (firstErr: any) {
      console.warn('[FCM] Direct token request failed, trying fallback without registration argument:', firstErr);
      try {
        token = await getToken(messaging, {
          vapidKey: vapidKey && vapidKey.trim() ? vapidKey.trim() : undefined,
        });
      } catch (secondErr: any) {
        throw secondErr;
      }
    }

    if (!token) {
      return { success: false, error: 'Unable to retrieve FCM registration token from Firebase.' };
    }

    // Save token to localStorage
    localStorage.setItem('menukit_fcm_token', token);
    console.log('%c[FCM REGISTRATION TOKEN]:\n' + token, 'background: #111; color: #00ff88; font-size: 13px; font-weight: bold; padding: 6px; border-radius: 6px;');


    // Register token with backend
    const deviceInfo = getDeviceInfo();
    try {
      await api.post('/notifications/fcm/register', {
        token: token,
        shop_id: shopId || undefined,
        platform: deviceInfo.platform,
        device_type: deviceInfo.deviceType,
        browser: deviceInfo.browser,
        user_agent: navigator.userAgent,
      });
      console.info('[FCM] Device token registered successfully:', token.slice(0, 16) + '...');
    } catch (apiErr) {
      console.warn('[FCM] Backend token registration failed:', apiErr);
    }

    return { success: true, token };
  } catch (err: any) {
    if (err?.name === 'AbortError' || err?.message?.includes('push service error')) {
      console.warn('[FCM] Push service unavailable on this browser/environment:', err?.message || err);
    } else {
      console.error('[FCM] Error requesting notification token:', err);
    }

    // Detect Brave Browser push service disabled
    const isBrave = (navigator as any).brave !== undefined;
    if (isBrave && (err?.message?.includes('push service error') || err?.name === 'AbortError')) {
      return {
        success: false,
        error: "Brave Browser blocks push notifications by default. Go to brave://settings/privacy, enable 'Use Google services for push messaging', and restart Brave.",
      };
    }

    return { success: false, error: err?.message || 'Error requesting notification token' };
  }
}

/**
 * Vibrant 3-chord notification chime synthesized via Web Audio API.
 * Guaranteed to play reliably across all modern desktop/mobile browsers without external asset dependency.
 */
export function playNotificationSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      const ctx = new AudioContextClass();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const now = ctx.currentTime;
      // Vibrant 3-chord notification chime: E5 (659Hz) -> G#5 (830Hz) -> B5 (987Hz)
      const freqs = [659.25, 830.61, 987.77];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        gain.gain.setValueAtTime(0.25, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.1 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.4);
      });
    }
  } catch (err) {
    console.debug('[FCM] Sound chime notice:', err);
  }
}

/**
 * Listen for foreground push messages while the app tab is active.
 */
export function setupFCMForegroundListener(
  onNotificationReceived?: (payload: MessagePayload) => void
): () => void {
  const { messaging } = initFirebase();
  if (!messaging) return () => {};

  try {
    const unsubscribe = onMessage(messaging, (payload) => {
      console.info('[FCM] Foreground push message received:', payload);

      const title = payload.notification?.title || (payload.data as any)?.title || 'Menukit Notification';
      const body = payload.notification?.body || (payload.data as any)?.body || '';
      const clickUrl = (payload.data as any)?.url || '/orders';

      // Play audio chime immediately
      playNotificationSound();

      // Show in-app interactive toast notification banner
      toast.custom(
        (t) =>
          React.createElement(
            'div',
            {
              onClick: () => {
                toast.dismiss(t.id);
                if (typeof window !== 'undefined' && clickUrl) {
                  window.location.href = clickUrl;
                }
              },
              className: `${
                t.visible ? 'animate-enter' : 'animate-leave'
              } max-w-md w-full bg-slate-900 border-2 border-emerald-500/80 shadow-2xl rounded-2xl pointer-events-auto flex items-center p-4 gap-3.5 cursor-pointer text-white transform hover:scale-[1.02] transition-all`,
              style: { zIndex: 999999 },
            },
            React.createElement(
              'div',
              {
                className:
                  'w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/30 text-xl',
              },
              '🔔'
            ),
            React.createElement(
              'div',
              { className: 'flex-1 min-w-0' },
              React.createElement(
                'p',
                { className: 'text-sm font-black text-emerald-400 truncate tracking-wide' },
                title
              ),
              React.createElement(
                'p',
                { className: 'text-xs text-slate-300 mt-0.5 line-clamp-2 leading-snug' },
                body
              )
            ),
            React.createElement(
              'span',
              {
                className:
                  'text-[11px] font-bold px-2.5 py-1 bg-emerald-500/20 text-emerald-300 rounded-lg border border-emerald-500/40 shrink-0',
              },
              'View'
            )
          ),
        { duration: 8000, id: `fcm-${Date.now()}` }
      );

      // Display native browser notification banner
      try {
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then((reg) => {
              reg.showNotification(title, {
                body,
                icon: '/pwa-192x192.png',
                badge: '/pwa-192x192.png',
                data: { url: clickUrl },
                requireInteraction: true,
              });
            }).catch(() => {
              new Notification(title, { body, icon: '/pwa-192x192.png' });
            });
          } else {
            new Notification(title, { body, icon: '/pwa-192x192.png' });
          }
        }
      } catch (e) {
        console.warn('[FCM] Error showing foreground banner:', e);
      }


      // Dispatch custom event for reactive UI updates
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('menukit-fcm-message', {
            detail: payload,
          })
        );
      }

      if (onNotificationReceived) {
        onNotificationReceived(payload);
      }
    });

    return unsubscribe;
  } catch (err) {
    console.warn('[FCM] Failed to set up foreground listener:', err);
    return () => {};
  }
}

/**
 * Trigger a test push notification to verify push delivery on this device.
 */
export async function testPushNotification(shopId?: string): Promise<{ success: boolean; message: string }> {
  try {
    const currentToken = localStorage.getItem('menukit_fcm_token');
    const res = await api.post('/notifications/fcm/test', {
      token: currentToken || undefined,
      shop_id: shopId || undefined,
      title: 'Menukit Push Test 🔔',
      body: 'Push notifications are working smoothly across your device!',
      url: '/orders',
    });

    return {
      success: res.data?.success ?? true,
      message: res.data?.message || 'Test push notification dispatched!',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.response?.data?.detail || err?.message || 'Failed to send test push',
    };
  }
}

/**
 * Unregister current device FCM token on logout.
 */
export async function unregisterFCMToken(): Promise<void> {
  const token = localStorage.getItem('menukit_fcm_token');
  if (!token) return;

  try {
    await api.post('/notifications/fcm/unregister', { token });
    localStorage.removeItem('menukit_fcm_token');
  } catch (err) {
    console.warn('[FCM] Failed to unregister FCM token:', err);
  }
}
