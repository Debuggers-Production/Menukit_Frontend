/**
 * Shared in-memory and sessionStorage cache for public shop and discount data.
 * Prevents redundant API calls when navigating between public pages (Menu, Item, Cart, Order Status).
 */

const memoryCache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const publicCache = {
  get: <T = any>(key: string): T | null => {
    // 1. Check in-memory
    const mem = memoryCache[key];
    if (mem && Date.now() - mem.timestamp < CACHE_TTL_MS) {
      return mem.data as T;
    }

    return null;
  },

  set: (key: string, data: any): void => {
    if (!key || !data) return;
    const entry = { data, timestamp: Date.now() };
    memoryCache[key] = entry;
  },

  clear: (key?: string): void => {
    if (key) {
      delete memoryCache[key];
    } else {
      Object.keys(memoryCache).forEach((k) => delete memoryCache[k]);
    }
  }
};
