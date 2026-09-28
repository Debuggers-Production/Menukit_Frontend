import { useState, useEffect, useCallback, useRef } from 'react';
import { Rocket, RefreshCw, X, ArrowUpRight } from 'lucide-react';

interface VersionInfo {
  version: string;
  buildTime: number;
  builtAt?: string;
}

export function VersionUpdateNotifier() {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [newVersionInfo, setNewVersionInfo] = useState<VersionInfo | null>(null);

  const localBuildTime = useRef<number>(
    typeof __APP_BUILD_TIME__ !== 'undefined' ? Number(__APP_BUILD_TIME__) : Date.now()
  );
  const localVersion = useRef<string>(
    typeof __APP_VERSION__ !== 'undefined' ? String(__APP_VERSION__) : '1.0.0'
  );

  const checkVersion = useCallback(async () => {
    try {
      // Bust browser and intermediate proxy caches with timestamp
      const res = await fetch(`/version.json?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });

      if (!res.ok) return;
      const data: VersionInfo = await res.json();

      if (data) {
        const isDev = import.meta.env.DEV;
        
        // In production: check if remote buildTime is newer or version string changed
        // In dev: check if version string changed (prevent false positives from hot-reloading)
        const isNewerBuild = !isDev && typeof data.buildTime === 'number' && data.buildTime > localBuildTime.current + 2000;
        const isNewerVersion = Boolean(data.version && data.version !== localVersion.current);

        if (isNewerBuild || isNewerVersion) {
          setNewVersionInfo(data);
          setHasUpdate(true);
        } else {
          setHasUpdate(false);
        }
      }
    } catch {
      // Ignore network errors during background check
    }
  }, []);

  // Listen to PWA Service Worker updates
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (!reg) return;

        // If a worker is already waiting to activate
        if (reg.waiting) {
          setHasUpdate(true);
        }

        // Listen for new worker installed
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setHasUpdate(true);
              }
            });
          }
        });
      }).catch(() => {});
    }
  }, []);

  // Setup periodic & event-driven update checks
  useEffect(() => {
    // Initial check 4s after mount
    const initTimer = setTimeout(() => {
      checkVersion();
    }, 4000);

    // Periodic check every 60 seconds
    const interval = setInterval(() => {
      checkVersion();
    }, 60000);

    // Check when user returns to tab / focuses browser window
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkVersion();
      }
    };

    const handleFocus = () => {
      checkVersion();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearTimeout(initTimer);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [checkVersion]);

  const handleRefresh = async () => {
    setIsUpdating(true);

    try {
      // 1. Tell waiting service worker to skip waiting
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg?.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      }

      // 2. Clear caches to ensure clean bundle loading
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
    } catch (e) {
      console.warn('Cache clear error during update:', e);
    }

    // 3. Hard reload the page with cache-busting
    setTimeout(() => {
      window.location.reload();
    }, 300);
  };

  if (!hasUpdate) return null;

  // Minimized floating pill
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-[9999] animate-in fade-in slide-in-from-bottom-3 duration-300">
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-primary text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all font-bold text-xs cursor-pointer border border-white/20"
        >
          <Rocket size={14} className="animate-pulse" />
          <span>Update Available</span>
          <ArrowUpRight size={13} />
        </button>
      </div>
    );
  }

  // Full floating update modal / card
  return (
    <div className="fixed bottom-4 sm:bottom-6 inset-x-4 sm:inset-x-auto sm:right-6 sm:max-w-md z-[9999] animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="bg-background/95 dark:bg-slate-900/95 backdrop-blur-xl border border-primary/30 rounded-2xl p-4 sm:p-4.5 shadow-2xl text-foreground relative overflow-hidden">
        {/* Glow Accent Background */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/15 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 dark:bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shrink-0 shadow-inner">
              <Rocket size={18} className="animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-sm sm:text-base text-foreground leading-tight">
                  New Version Available!
                </h4>
                {newVersionInfo?.version && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-primary/15 text-primary">
                    v{newVersionInfo.version}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                A new update has been released with the latest improvements and fixes.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer shrink-0"
            title="Dismiss for now"
          >
            <X size={16} />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 mt-3.5 pt-3 border-t border-border/60 relative z-10">
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="flex-1 h-9 rounded-xl border border-border bg-card hover:bg-muted text-xs font-bold text-muted-foreground hover:text-foreground transition-all cursor-pointer"
          >
            Later
          </button>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isUpdating}
            className="flex-[2] h-9 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-75"
          >
            <RefreshCw size={13} className={isUpdating ? 'animate-spin' : ''} />
            <span>{isUpdating ? 'Updating...' : 'Refresh Page Now'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
