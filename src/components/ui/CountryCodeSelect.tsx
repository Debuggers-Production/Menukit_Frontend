import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface CountryCode {
  code: string;
  flag: string;
  label: string;
}

export const COUNTRY_CODES: CountryCode[] = [
  { code: '+91', flag: '🇮🇳', label: 'India (+91)' },
  { code: '+1', flag: '🇺🇸', label: 'USA / Canada (+1)' },
  { code: '+44', flag: '🇬🇧', label: 'UK (+44)' },
  { code: '+971', flag: '🇦🇪', label: 'UAE (+971)' },
  { code: '+65', flag: '🇸🇬', label: 'Singapore (+65)' },
  { code: '+60', flag: '🇲🇾', label: 'Malaysia (+60)' },
  { code: '+61', flag: '🇦🇺', label: 'Australia (+61)' },
  { code: '+966', flag: '🇸🇦', label: 'Saudi Arabia (+966)' },
  { code: '+974', flag: '🇶🇦', label: 'Qatar (+974)' },
  { code: '+968', flag: '🇴🇲', label: 'Oman (+968)' },
  { code: '+965', flag: '🇰🇼', label: 'Kuwait (+965)' },
  { code: '+973', flag: '🇧🇭', label: 'Bahrain (+973)' },
  { code: '+94', flag: '🇱🇰', label: 'Sri Lanka (+94)' },
  { code: '+49', flag: '🇩🇪', label: 'Germany (+49)' },
  { code: '+33', flag: '🇫🇷', label: 'France (+33)' },
  { code: '+64', flag: '🇳🇿', label: 'New Zealand (+64)' },
  { code: '+880', flag: '🇧🇩', label: 'Bangladesh (+880)' },
  { code: '+977', flag: '🇳🇵', label: 'Nepal (+977)' },
  { code: '+62', flag: '🇮🇩', label: 'Indonesia (+62)' },
  { code: '+63', flag: '🇵🇭', label: 'Philippines (+63)' },
  { code: '+66', flag: '🇹🇭', label: 'Thailand (+66)' },
  { code: '+81', flag: '🇯🇵', label: 'Japan (+81)' },
];

const GEO_IP_CACHE_KEY = 'menukit_detected_country_calling_code';

interface CountryCodeSelectProps {
  value: string;
  onChange: (code: string) => void;
  className?: string;
  heightClass?: string;
  autoDetect?: boolean;
}

export function CountryCodeSelect({
  value,
  onChange,
  className,
  heightClass = 'h-11',
  autoDetect = false,
}: CountryCodeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [pos, setPos] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
  }>({ left: 0, width: 230 });

  // Auto-detect based on user's IP if enabled
  useEffect(() => {
    if (!autoDetect || typeof window === 'undefined') return;

    const cached = localStorage.getItem(GEO_IP_CACHE_KEY);
    if (cached) {
      if (cached !== value) {
        onChange(cached);
      }
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    fetch('https://ipapi.co/json/', { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        clearTimeout(timeoutId);
        if (data && data.country_calling_code) {
          const raw = String(data.country_calling_code).trim();
          const code = raw.startsWith('+') ? raw : `+${raw}`;
          localStorage.setItem(GEO_IP_CACHE_KEY, code);
          onChange(code);
        }
      })
      .catch(() => {
        fetch('https://ipwho.is/', { signal: controller.signal })
          .then((res) => res.json())
          .then((data) => {
            clearTimeout(timeoutId);
            if (data && data.calling_code) {
              const raw = String(data.calling_code).trim();
              const code = raw.startsWith('+') ? raw : `+${raw}`;
              localStorage.setItem(GEO_IP_CACHE_KEY, code);
              onChange(code);
            }
          })
          .catch(() => {});
      });

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [autoDetect]);

  const selectedCountry =
    COUNTRY_CODES.find((c) => c.code === value) || {
      code: value || '+91',
      flag: '🌐',
      label: `International (${value || '+91'})`,
    };

  useEffect(() => {
    function updatePosition() {
      if (!isOpen || !triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom - 10;
      const spaceAbove = rect.top - 10;
      const dropdownWidth = 240;

      const shouldFlipUpward = spaceBelow < 200 && spaceAbove > spaceBelow;

      // Ensure dropdown stays inside viewport horizontally
      let left = rect.left;
      if (left + dropdownWidth > window.innerWidth - 12) {
        left = Math.max(12, window.innerWidth - dropdownWidth - 12);
      }

      if (shouldFlipUpward) {
        setPos({
          bottom: viewportHeight - rect.top + 6,
          top: undefined,
          left,
          width: dropdownWidth,
        });
      } else {
        setPos({
          top: rect.bottom + 6,
          bottom: undefined,
          left,
          width: dropdownWidth,
        });
      }
    }

    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          heightClass,
          'px-2.5 rounded-xl border border-border/80 bg-background hover:bg-muted/50 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-2xs select-none',
          className
        )}
      >
        <span className="text-sm leading-none">{selectedCountry.flag}</span>
        <span className="text-foreground text-[11px] font-bold">{selectedCountry.code}</span>
        <ChevronDown
          size={12}
          className={cn(
            'text-muted-foreground transition-transform duration-150',
            isOpen && 'rotate-180 text-primary'
          )}
        />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: pos.top !== undefined ? `${pos.top}px` : 'auto',
              bottom: pos.bottom !== undefined ? `${pos.bottom}px` : 'auto',
              left: `${pos.left}px`,
              width: `${pos.width}px`,
              zIndex: 9999,
            }}
            className="max-h-60 overflow-y-auto bg-card border border-border rounded-xl shadow-2xl py-1 divide-y divide-border/40 animate-in fade-in zoom-in-95 duration-100 scrollbar-thin"
          >
            {COUNTRY_CODES.map((c) => {
              const isSelected = c.code === selectedCountry.code;
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    onChange(c.code);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'w-full px-3 py-2 text-left text-xs font-semibold hover:bg-muted/70 flex items-center gap-2 cursor-pointer transition-colors',
                    isSelected
                      ? 'bg-primary/10 text-primary font-bold'
                      : 'text-foreground'
                  )}
                >
                  <span className="text-sm leading-none">{c.flag}</span>
                  <span className="flex-1 truncate">{c.label}</span>
                  {isSelected && <Check size={13} className="text-primary shrink-0" />}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}
