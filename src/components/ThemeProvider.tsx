import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { useShopStore } from '@/store/shopStore';
import { loadGoogleFont } from '@/utils/fontLoader';

// Helper to calculate a contrasting foreground color (black or white) based on hex background
function getContrastColor(hexColor: string) {
  // Remove the hash if it exists
  const hex = hexColor.replace('#', '');
  
  // Parse the RGB values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return white for dark colors, black for light colors
  return luminance > 0.5 ? '#0f172a' : '#ffffff';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { shop } = useShopStore();
  const location = useLocation();

  useEffect(() => {
    const root = document.documentElement;
    const isPublicMenu = location.pathname.startsWith('/m/') || location.pathname.startsWith('/menu/');

    if (!shop?.theme) {
      if (!isPublicMenu) {
        root.classList.remove('dark');
      }
      return;
    }

    const theme = shop.theme;

    // Only apply custom dark mode from shop theme settings on PUBLIC DINER MENU routes (/m/...)
    if (isPublicMenu && theme.theme === 'dark') {
      root.classList.add('dark');
    } else {
      // Merchant Dashboard routes must ALWAYS remain clean light mode
      root.classList.remove('dark');
    }

    // Apply primary brand accent color & Google Fonts
    if (theme.primary_color) {
      root.style.setProperty('--primary', theme.primary_color);
      root.style.setProperty('--primary-foreground', getContrastColor(theme.primary_color));
    }

    if (theme.font_family) {
      loadGoogleFont(theme.font_family);
      root.style.setProperty('--font-sans', `"${theme.font_family}", system-ui, -apple-system, sans-serif`);
      root.style.setProperty('--font-heading', `"${theme.font_family}", system-ui, -apple-system, sans-serif`);
    }

  }, [shop?.theme, location.pathname]);

  return <>{children}</>;
}
