import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.tsx'

if (!sessionStorage.getItem('lang_reloading')) {
  document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}`;
}
sessionStorage.removeItem('lang_reloading');

// Prevent mouse wheel from scrolling and altering number inputs globally
document.addEventListener('wheel', () => {
  if (document.activeElement && (document.activeElement as HTMLInputElement).type === 'number') {
    (document.activeElement as HTMLInputElement).blur();
  }
}, { passive: true });

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
        <App />
        <Toaster position="top-center" />
      </BrowserRouter>
    </QueryClientProvider>
)
