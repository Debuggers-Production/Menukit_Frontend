/**
 * Language management utility for Menukit.
 * Supports Google Translate integration and system-wide language persistence.
 */

export const SYSTEM_LANGUAGES = [
  { id: 'en', name: 'English (US/UK)' },
  { id: 'ta', name: 'Tamil (தமிழ்)' },
  { id: 'hi', name: 'Hindi (हिन्दी)' },
  { id: 'te', name: 'Telugu (తెలుగు)' },
  { id: 'kn', name: 'Kannada (ಕನ್ನಡ)' },
  { id: 'ml', name: 'Malayalam (മലയാളം)' },
  { id: 'mr', name: 'Marathi (मराठी)' },
  { id: 'gu', name: 'Gujarati (ગુજરાતી)' },
  { id: 'bn', name: 'Bengali (বাংলা)' },
  { id: 'pa', name: 'Punjabi (ਪੰਜਾਬੀ)' },
  { id: 'ar', name: 'Arabic (العربية)' },
  { id: 'es', name: 'Spanish (Español)' },
  { id: 'fr', name: 'French (Français)' },
  { id: 'de', name: 'German (Deutsch)' },
];

/**
 * Gets the currently active Google Translate language code from cookies.
 */
export function getActiveSystemLanguage(): string {
  if (typeof document === 'undefined') return 'en';
  const match = document.cookie.match(/googtrans=\/en\/([^;]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return localStorage.getItem('menukit_system_language') || 'en';
}

/**
 * Sets the system language across the entire application using Google Translate.
 * Sets the appropriate cookies and triggers the translate element.
 */
export function setSystemLanguage(langCode: string, reload: boolean = true): void {
  if (typeof document === 'undefined') return;

  const targetLang = (langCode && langCode.trim()) || 'en';
  localStorage.setItem('menukit_system_language', targetLang);

  const hostname = window.location.hostname;
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';

  if (targetLang === 'en') {
    // Clear cookie
    document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    if (!isLocal) {
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${hostname};`;
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${hostname};`;
    }
  } else {
    // Set cookie
    document.cookie = `googtrans=/en/${targetLang}; path=/;`;
    if (!isLocal) {
      document.cookie = `googtrans=/en/${targetLang}; path=/; domain=${hostname};`;
      document.cookie = `googtrans=/en/${targetLang}; path=/; domain=.${hostname};`;
    }
  }

  // Trigger Google Translate combo element if present in DOM
  const select = document.querySelector('.goog-te-combo') as HTMLSelectElement | null;
  if (select) {
    select.value = targetLang;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  if (reload) {
    setTimeout(() => {
      window.location.reload();
    }, 200);
  }
}

