export interface FCMDeviceInfo {
  platform: 'web' | 'android' | 'ios';
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
}

/**
 * Detect client platform, device type, and browser.
 */
export function getDeviceInfo(): FCMDeviceInfo {
  if (typeof window === 'undefined') {
    return { platform: 'web', deviceType: 'desktop', browser: 'other' };
  }
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

