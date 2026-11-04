import { useState, useEffect } from 'react';
import { COUNTRY_CODES } from '@/components/ui/CountryCodeSelect';

const CACHE_KEY = 'menukit_detected_country_calling_code';

export function useGeoCountryCode(initialCode: string = '+91') {
  const [countryCode, setCountryCode] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached && (COUNTRY_CODES.some(c => c.code === cached) || cached.startsWith('+'))) {
        return cached;
      }
    }
    return initialCode;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if valid cache exists
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      if (cached !== countryCode) {
        setCountryCode(cached);
      }
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    // Primary: ipapi.co
    fetch('https://ipapi.co/json/', { signal: controller.signal })
      .then(res => res.json())
      .then(data => {
        clearTimeout(timeoutId);
        if (data && data.country_calling_code) {
          const rawCode = String(data.country_calling_code).trim();
          const code = rawCode.startsWith('+') ? rawCode : `+${rawCode}`;
          setCountryCode(code);
          localStorage.setItem(CACHE_KEY, code);
        }
      })
      .catch(() => {
        // Fallback: ipwho.is
        fetch('https://ipwho.is/', { signal: controller.signal })
          .then(res => res.json())
          .then(data => {
            clearTimeout(timeoutId);
            if (data && data.calling_code) {
              const rawCode = String(data.calling_code).trim();
              const code = rawCode.startsWith('+') ? rawCode : `+${rawCode}`;
              setCountryCode(code);
              localStorage.setItem(CACHE_KEY, code);
            }
          })
          .catch(() => {
            // Silently fall back to default
          });
      });

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  return [countryCode, setCountryCode] as const;
}

