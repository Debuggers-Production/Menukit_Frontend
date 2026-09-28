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
  { code: '+61', flag: '🇦🇺', label: 'Australia (+61)' },
  { code: '+966', flag: '🇸🇦', label: 'Saudi Arabia (+966)' },
  { code: '+974', flag: '🇶🇦', label: 'Qatar (+974)' },
  { code: '+968', flag: '🇴🇲', label: 'Oman (+968)' },
  { code: '+965', flag: '🇰🇼', label: 'Kuwait (+965)' },
  { code: '+973', flag: '🇧🇭', label: 'Bahrain (+973)' },
  { code: '+94', flag: '🇱🇰', label: 'Sri Lanka (+94)' },
];

interface CountryCodeSelectProps {
  value: string;
  onChange: (code: string) => void;
  className?: string;
  heightClass?: string;
}

export function CountryCodeSelect({
  value,
  onChange,
  className,
  heightClass = 'h-11',
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

  const selectedCountry =
    COUNTRY_CODES.find((c) => c.code === value) || COUNTRY_CODES[0];

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
          'px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0 shadow-2xs select-none',
          className
        )}
      >
        <span className="text-base">{selectedCountry.flag}</span>
        <span className="text-slate-800 dark:text-slate-200">{selectedCountry.code}</span>
        <ChevronDown
          size={14}
          className={cn(
            'text-slate-400 transition-transform duration-150',
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
            className="max-h-60 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl py-1 divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in zoom-in-95 duration-100 scrollbar-thin"
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
                    'w-full px-3.5 py-2.5 text-left text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer transition-colors',
                    isSelected
                      ? 'bg-primary/10 text-primary font-bold'
                      : 'text-slate-800 dark:text-slate-200'
                  )}
                >
                  <span className="text-base">{c.flag}</span>
                  <span className="flex-1 truncate">{c.label}</span>
                  {isSelected && <Check size={14} className="text-primary shrink-0" />}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}
