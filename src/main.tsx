import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster as DynauraToaster } from 'dynaura'
import 'dynaura/styles-no-font.css'
import { toast as hotToast } from 'react-hot-toast'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { toast as dynauraToast, formatToastMessage } from './utils/toast'

// Bridge react-hot-toast to Dynaura so every existing toast call routes to dynamic island toasts
const origToast = hotToast as any;
if (origToast) {
  origToast.success = (message: any, opts?: any) => dynauraToast.success(message, opts);
  origToast.error = (message: any, opts?: any) => dynauraToast.error(message, opts);
  origToast.warning = (message: any, opts?: any) => dynauraToast.warning(message, opts);
  origToast.info = (message: any, opts?: any) => dynauraToast.info(message, opts);
  origToast.loading = (message: any, opts?: any) => dynauraToast.loading(message, opts);
  origToast.dismiss = (id?: string) => dynauraToast.dismiss(id);
  origToast.promise = (promise: any, msgs: any, opts?: any) => dynauraToast.promise(promise, msgs, opts);
  origToast.custom = (jsxOrFn: any, opts?: any) => dynauraToast.custom(jsxOrFn, opts);
}


// Prevent mouse wheel from scrolling and altering number inputs globally
document.addEventListener('wheel', () => {
  if (document.activeElement && (document.activeElement as HTMLInputElement).type === 'number') {
    (document.activeElement as HTMLInputElement).blur();
  }
}, { passive: true });

// Safe DOM patches to prevent Google Translate from breaking React DOM reconciliation
if (typeof Node !== 'undefined') {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (child.parentNode !== this) {
      if (console) {
        console.warn('Cannot remove child, parent is not the current node', child, this);
      }
      return child;
    }
    return originalRemoveChild.call(this, child) as T;
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      if (console) {
        console.warn('Cannot insert child, reference parent is not the current node', newNode, referenceNode, this);
      }
      return newNode;
    }
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  };
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,          // data fresh for 30s — no re-fetch on navigation
      gcTime: 5 * 60 * 1000,     // keep unused data in cache for 5 minutes
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <ErrorBoundary>
        <App />
        <DynauraToaster position="top-center" timer={true} swipe="both" />
      </ErrorBoundary>
    </BrowserRouter>
  </QueryClientProvider>
);

// Register PWA Service Worker for Desktop Web App installability
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('PWA service worker registration:', err);
    });
  });
}

