import { ThemeSettings } from '@/types';
import { loadGoogleFont } from './fontLoader';

/**
 * Applies brand theme variables and visual geometry contours to a target DOM node (typically document.documentElement).
 * Handles CSS variables, Tailwind v4 radius tokens, and Google Fonts.
 */
export function applyThemeToElement(
  theme: Partial<ThemeSettings> | null | undefined,
  root: HTMLElement = document.documentElement
) {
  if (!theme) return;

  // 1. Primary brand color
  if (theme.primary_color) {
    root.style.setProperty('--primary', theme.primary_color);
    root.style.setProperty('--primary-foreground', '#ffffff');
    root.style.setProperty('--ring', theme.primary_color);
  }

  // 2. Typography
  if (theme.font_family) {
    loadGoogleFont(theme.font_family);
    root.style.setProperty('--font-sans', `"${theme.font_family}", system-ui, -apple-system, sans-serif`);
    root.style.setProperty('--font-heading', `"${theme.font_family}", system-ui, -apple-system, sans-serif`);
    if (typeof document !== 'undefined' && document.body) {
      document.body.style.fontFamily = theme.font_family;
    }
  }

  // 3. Visual Geometry: Card Edge Contour (Border Radius)
  const radius = theme.border_radius || 'smooth';
  root.setAttribute('data-radius', radius);

  if (radius === 'sharp') {
    root.style.setProperty('--radius', '0px');
    root.style.setProperty('--radius-xs', '0px');
    root.style.setProperty('--radius-sm', '0px');
    root.style.setProperty('--radius-md', '0px');
    root.style.setProperty('--radius-lg', '0px');
    root.style.setProperty('--radius-xl', '0px');
    root.style.setProperty('--radius-2xl', '0px');
    root.style.setProperty('--radius-3xl', '0px');
  } else if (radius === 'pill') {
    root.style.setProperty('--radius', '9999px');
    root.style.setProperty('--radius-xs', '9999px');
    root.style.setProperty('--radius-sm', '9999px');
    root.style.setProperty('--radius-md', '9999px');
    root.style.setProperty('--radius-lg', '1.25rem');
    root.style.setProperty('--radius-xl', '1.5rem');
    root.style.setProperty('--radius-2xl', '2rem');
    root.style.setProperty('--radius-3xl', '2.5rem');
  } else {
    // smooth (default boxy with subtle rounded curves)
    root.style.setProperty('--radius', '0.375rem');
    root.style.setProperty('--radius-xs', '0.125rem');
    root.style.setProperty('--radius-sm', '0.25rem');
    root.style.setProperty('--radius-md', '0.375rem');
    root.style.setProperty('--radius-lg', '0.5rem');
    root.style.setProperty('--radius-xl', '0.75rem');
    root.style.setProperty('--radius-2xl', '1rem');
    root.style.setProperty('--radius-3xl', '1.5rem');
  }
}

/**
 * Resets theme styles and tokens to the application default state.
 */
export function resetThemeOnElement(root: HTMLElement = document.documentElement) {
  root.style.removeProperty('--primary');
  root.style.removeProperty('--primary-foreground');
  root.style.removeProperty('--ring');
  root.style.removeProperty('--font-sans');
  root.style.removeProperty('--font-heading');
  root.removeAttribute('data-radius');

  root.style.setProperty('--radius', '0.375rem');
  root.style.setProperty('--radius-xs', '0.125rem');
  root.style.setProperty('--radius-sm', '0.25rem');
  root.style.setProperty('--radius-md', '0.375rem');
  root.style.setProperty('--radius-lg', '0.5rem');
  root.style.setProperty('--radius-xl', '0.625rem');
  root.style.setProperty('--radius-2xl', '0.75rem');
  root.style.removeProperty('--radius-3xl');

  if (typeof document !== 'undefined' && document.body) {
    document.body.style.fontFamily = '';
  }
}

