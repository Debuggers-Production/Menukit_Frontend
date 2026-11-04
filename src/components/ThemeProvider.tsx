import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { useShopStore } from '@/store/shopStore';
import { applyThemeToElement, resetThemeOnElement } from '@/utils/themeApplier';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { shop } = useShopStore();
  const location = useLocation();

  useEffect(() => {
    const root = document.documentElement;
    const isPublicMenu = location.pathname.startsWith('/shop/') || 
                         location.pathname.startsWith('/m/') || 
                         location.pathname.startsWith('/menu/');

    if (!shop?.theme) {
      if (!isPublicMenu) {
        root.classList.remove('dark');
        resetThemeOnElement(root);
      }
      return;
    }

    const theme = shop.theme;
    const scope = theme.theme_scope || 'all';

    // Check scope applicability
    const appliesToCurrentRoute = scope === 'all' || 
      (scope === 'public' && isPublicMenu) || 
      (scope === 'app' && !isPublicMenu);

    if (!appliesToCurrentRoute) {
      resetThemeOnElement(root);
      return;
    }

    // Only apply custom dark mode from shop theme settings on PUBLIC DINER MENU routes
    if (isPublicMenu && theme.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Apply primary brand colors, typography, and visual geometry contours
    applyThemeToElement(theme, root);

  }, [shop?.theme, location.pathname]);

  return <>{children}</>;
}
