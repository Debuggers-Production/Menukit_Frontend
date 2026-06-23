import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { useShopStore } from '@/store/shopStore';

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
    if (!shop?.theme) return;

    const theme = shop.theme;
    const isPublicMenu = location.pathname.startsWith('/m/') || location.pathname.startsWith('/menu/');
    const isApp = !isPublicMenu;

    // Determine if we should apply the theme based on the scope
    let shouldApplyTheme = false;
    if (theme.theme_scope === 'all') {
      shouldApplyTheme = true;
    } else if (theme.theme_scope === 'public' && isPublicMenu) {
      shouldApplyTheme = true;
    } else if (theme.theme_scope === 'app' && isApp) {
      shouldApplyTheme = true;
    }

    const root = document.documentElement;

    if (shouldApplyTheme) {
      // Apply primary color
      root.style.setProperty('--primary', theme.primary_color);
      root.style.setProperty('--primary-foreground', getContrastColor(theme.primary_color));
      
      // Apply font family if supported (we might need to load it dynamically if it's from Google Fonts, 
      // but for now we apply what's selected)
      if (theme.font_family) {
        root.style.setProperty('--font-sans', `"${theme.font_family}", system-ui, -apple-system, sans-serif`);
        root.style.setProperty('--font-heading', `"${theme.font_family}", system-ui, -apple-system, sans-serif`);
      }
    } else {
      // Revert to default theme (orange)
      root.style.removeProperty('--primary');
      root.style.removeProperty('--primary-foreground');
      root.style.removeProperty('--font-sans');
      root.style.removeProperty('--font-heading');
    }

    // Handle dark/light mode if applicable
    if (theme.theme === 'dark' && shouldApplyTheme) {
      root.classList.add('dark');
    } else if (theme.theme === 'light' && shouldApplyTheme) {
      root.classList.remove('dark');
    }

  }, [shop?.theme, location.pathname]);

  return <>{children}</>;
}
