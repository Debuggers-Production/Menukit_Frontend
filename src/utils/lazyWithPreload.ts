import { lazy, ComponentType, LazyExoticComponent } from 'react';

export type PreloadableComponent<T extends ComponentType<any>> = LazyExoticComponent<T> & {
  preload: () => Promise<{ default: T }>;
};

/**
 * Creates a React.lazy component with a .preload() method to fetch
 * the underlying module ahead of time (e.g. on hover or background idle).
 */
export function lazyWithPreload<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): PreloadableComponent<T> {
  let loadedPromise: Promise<{ default: T }> | null = null;

  const preload = () => {
    if (!loadedPromise) {
      loadedPromise = factory();
    }
    return loadedPromise;
  };

  const Component = lazy(preload) as PreloadableComponent<T>;
  Component.preload = preload;
  return Component;
}

export const routePreloadMap: Record<string, () => Promise<any>> = {};

export function registerPreload(path: string, preloadFn: () => Promise<any>) {
  routePreloadMap[path] = preloadFn;
}

/**
 * Trigger preload for a given route path (e.g. on mouseEnter / focus / touchStart).
 */
export function preloadRoute(path: string) {
  if (routePreloadMap[path]) {
    try {
      routePreloadMap[path]();
    } catch {
      // Ignore prefetch failures
    }
  }
}

/**
 * Preload all registered dashboard routes in the background during idle time.
 */
export function preloadAllRoutes() {
  Object.values(routePreloadMap).forEach((fn) => {
    try {
      fn();
    } catch {
      // Ignore prefetch failures
    }
  });
}
