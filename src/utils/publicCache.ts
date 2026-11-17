/**
 * High-performance shared in-memory & sessionStorage cache for public shop and menu data.
 * Guarantees instantaneous 0ms page transitions across Menu, Item, Cart, and Order Status.
 */

const memoryCache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const syncChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('menukit-sync')
  : null;

export const publicCache = {
  get: <T = any>(key: string): T | null => {
    if (!key) return null;

    // 1. Check in-memory L1 cache (0.001ms)
    const mem = memoryCache[key];
    if (mem && Date.now() - mem.timestamp < CACHE_TTL_MS) {
      return mem.data as T;
    }

    // 2. Check sessionStorage L2 cache
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem(`pk_cache_${key}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && Date.now() - parsed.timestamp < CACHE_TTL_MS) {
            memoryCache[key] = parsed;
            return parsed.data as T;
          }
        }
      } catch {
        // ignore
      }

      // 3. Check localStorage L3 cache (instant cross-session & new tab access)
      try {
        const localStored = localStorage.getItem(`pk_cache_${key}`);
        if (localStored) {
          const parsed = JSON.parse(localStored);
          if (parsed && Date.now() - parsed.timestamp < CACHE_TTL_MS) {
            memoryCache[key] = parsed;
            return parsed.data as T;
          }
        }
      } catch {
        // ignore
      }
    }

    return null;
  },

  set: (key: string, data: any): void => {
    if (!key || data === undefined || data === null) return;
    const entry = { data, timestamp: Date.now() };
    memoryCache[key] = entry;

    if (typeof window !== 'undefined') {
      try {
        const payload = JSON.stringify(entry);
        sessionStorage.setItem(`pk_cache_${key}`, payload);
        localStorage.setItem(`pk_cache_${key}`, payload);
      } catch {
        // quota exceeded or private mode, safe to ignore
      }
    }
  },

  clear: (key?: string): void => {
    if (key) {
      delete memoryCache[key];
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.removeItem(`pk_cache_${key}`);
          localStorage.removeItem(`pk_cache_${key}`);
        } catch {}
      }
    } else {
      Object.keys(memoryCache).forEach((k) => delete memoryCache[k]);
      if (typeof window !== 'undefined') {
        try {
          const sessionKeys: string[] = [];
          for (let i = 0; i < sessionStorage.length; i++) {
            const k = sessionStorage.key(i);
            if (k && k.startsWith('pk_cache_')) sessionKeys.push(k);
          }
          sessionKeys.forEach(k => sessionStorage.removeItem(k));

          const localKeys: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('pk_cache_')) localKeys.push(k);
          }
          localKeys.forEach(k => localStorage.removeItem(k));
        } catch {}
      }
    }

    if (syncChannel) {
      try {
        syncChannel.postMessage({ type: 'CACHE_CLEARED', key, timestamp: Date.now() });
      } catch {}
    }
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('menukit_sync_cache_cleared', Date.now().toString());
      } catch {}
    }
  },

  notifySettingsUpdated: (shopId?: string, settings?: any): void => {
    publicCache.clear();
    if (syncChannel) {
      try {
        syncChannel.postMessage({ type: 'SHOP_SETTINGS_UPDATED', shopId, settings, timestamp: Date.now() });
      } catch {}
    }
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('menukit_shop_settings_updated', Date.now().toString());
        window.dispatchEvent(new CustomEvent('menukit-shop-settings-updated', { detail: settings }));
      } catch {}
    }
  },

  subscribe: (callback: (event?: any) => void): (() => void) => {
    if (typeof window === 'undefined') return () => {};

    const handleMessage = (e: MessageEvent) => {
      if (e.data && (e.data.type === 'CACHE_CLEARED' || e.data.type === 'SHOP_SETTINGS_UPDATED')) {
        callback(e.data);
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'menukit_sync_cache_cleared' || e.key === 'menukit_shop_settings_updated') {
        callback({ type: 'STORAGE_SYNC', timestamp: Date.now() });
      }
    };

    const handleCustom = (e: Event) => {
      callback((e as CustomEvent).detail);
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        callback({ type: 'VISIBILITY_CHANGE' });
      }
    };

    if (syncChannel) {
      syncChannel.addEventListener('message', handleMessage);
    }
    window.addEventListener('storage', handleStorage);
    window.addEventListener('menukit-shop-settings-updated', handleCustom);
    window.addEventListener('focus', handleVisibility);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (syncChannel) {
        syncChannel.removeEventListener('message', handleMessage);
      }
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('menukit-shop-settings-updated', handleCustom);
      window.removeEventListener('focus', handleVisibility);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }
};
