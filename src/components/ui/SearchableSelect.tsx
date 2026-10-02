import React, { useState, useRef, useEffect, useMemo, useDeferredValue, forwardRef, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface Option {
  id: string;
  name: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  subtext?: string;
}

export interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  showSearch?: boolean;
  className?: string;
  minWidth?: number;
  id?: string;
  tabIndex?: number;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
}

export const SearchableSelect = forwardRef<HTMLDivElement, SearchableSelectProps>(function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  showSearch = true,
  className,
  minWidth,
  id,
  tabIndex = 0,
  onKeyDown
}, ref) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const deferredSearch = useDeferredValue(search);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => triggerRef.current as HTMLDivElement);

  const [pos, setPos] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    maxHeight: number;
    openUpward: boolean;
  }>({ left: 0, width: 0, maxHeight: 240, openUpward: false });

  const filteredOptions = useMemo(() => {
    if (!showSearch || !deferredSearch.trim()) return options;
    const query = deferredSearch.toLowerCase();
    return options.filter(opt => opt.name.toLowerCase().includes(query));
  }, [options, showSearch, deferredSearch]);

  const selectedOption = useMemo(() => {
    return options.find(opt => opt.id?.toString() === value?.toString());
  }, [options, value]);

  useEffect(() => {
    if (isOpen) {
      const idx = filteredOptions.findIndex(opt => opt.id?.toString() === value?.toString());
      setHighlightedIndex(idx >= 0 ? idx : 0);
    } else {
      setHighlightedIndex(-1);
    }
  }, [isOpen, filteredOptions, value]);

  useEffect(() => {
    function updatePosition() {
      if (!isOpen || !wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom - 12;
      const spaceAbove = rect.top - 12;

      // Decide whether to flip upward
      const shouldFlipUpward = spaceBelow < 180 && spaceAbove > spaceBelow;
      const availableSpace = shouldFlipUpward ? spaceAbove : spaceBelow;
      const maxHeight = Math.max(120, Math.min(260, availableSpace));
      const calculatedWidth = Math.max(rect.width, minWidth || 160);

      // Prevent overflow off right edge of viewport
      let left = rect.left;
      if (left + calculatedWidth > window.innerWidth - 12) {
        left = Math.max(12, window.innerWidth - calculatedWidth - 12);
      }

      if (shouldFlipUpward) {
        setPos({
          bottom: viewportHeight - rect.top + 4,
          top: undefined,
          left,
          width: calculatedWidth,
          maxHeight,
          openUpward: true
        });
      } else {
        setPos({
          top: rect.bottom + 4,
          bottom: undefined,
          left,
          width: calculatedWidth,
          maxHeight,
          openUpward: false
        });
      }
    }

    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
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
  }, [isOpen, minWidth]);

  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (onKeyDown) {
      onKeyDown(e);
      if (e.defaultPrevented) return;
    }

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!showSearch && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
          const enabledOpts = options.filter(o => !o.disabled);
          if (enabledOpts.length > 0) {
            const currentIdx = enabledOpts.findIndex(o => o.id?.toString() === value?.toString());
            let nextIdx = 0;
            if (e.key === 'ArrowDown') {
              nextIdx = currentIdx >= 0 ? (currentIdx + 1) % enabledOpts.length : 0;
            } else {
              nextIdx = currentIdx > 0 ? currentIdx - 1 : enabledOpts.length - 1;
            }
            onChange(enabledOpts[nextIdx].id);
            return;
          }
        }
        setIsOpen(true);
      }
    } else {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex(prev => {
          const next = prev + 1;
          return next < filteredOptions.length ? next : 0;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex(prev => {
          const next = prev - 1;
          return next >= 0 ? next : filteredOptions.length - 1;
        });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          const opt = filteredOptions[highlightedIndex];
          if (!opt.disabled) {
            onChange(opt.id);
            setIsOpen(false);
            setSearch('');
          }
        }
      }
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div 
        id={id}
        ref={triggerRef}
        tabIndex={tabIndex}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleTriggerKeyDown}
        className={cn(
          "flex items-center justify-between min-h-[40px] h-10 w-full rounded-xl border border-input bg-background px-3.5 py-2 text-sm font-medium shadow-sm cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary",
          className
        )}
      >
        <div className={`flex items-center gap-2 truncate ${!selectedOption ? 'text-muted-foreground' : 'text-foreground font-medium'}`}>
          {selectedOption?.icon}
          <span className="truncate">{selectedOption ? selectedOption.name : placeholder}</span>
        </div>
        <ChevronDown size={16} className={`text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && createPortal(
        <div 
          ref={dropdownRef}
          className="fixed z-[999999] bg-popover text-popover-foreground rounded-xl shadow-lg border border-border overflow-hidden flex flex-col transition-all duration-100 ease-out"
          style={{
            top: pos.top !== undefined ? `${pos.top}px` : 'auto',
            bottom: pos.bottom !== undefined ? `${pos.bottom}px` : 'auto',
            left: `${pos.left}px`,
            width: `${pos.width}px`,
            maxHeight: `${pos.maxHeight}px`
          }}
        >
          {showSearch && (
            <div className="flex items-center px-3 py-2 border-b border-border bg-muted/30 shrink-0">
              <Search size={14} className="text-muted-foreground mr-2 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                className="w-full bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
                    handleTriggerKeyDown(e as any);
                  } else if (e.key === 'Escape') {
                    setIsOpen(false);
                    triggerRef.current?.focus();
                  }
                }}
                autoFocus
              />
            </div>
          )}
          <div className="flex-1 overflow-y-auto overscroll-contain py-1 scrollbar-thin">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-3 text-sm text-center text-muted-foreground">No results found</div>
            ) : (
              filteredOptions.map((opt, idx) => (
                <div
                  key={opt.id}
                  className={`px-3 py-2.5 text-sm flex items-center justify-between gap-2 transition-colors ${
                    opt.disabled
                      ? 'opacity-50 cursor-not-allowed bg-muted/40 text-muted-foreground'
                      : 'cursor-pointer ' + 
                        (idx === highlightedIndex ? 'bg-accent text-accent-foreground ' : '') +
                        (value?.toString() === opt.id.toString() ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground hover:bg-accent hover:text-accent-foreground')
                  }`}
                  onClick={() => {
                    if (opt.disabled) return;
                    onChange(opt.id);
                    setIsOpen(false);
                    setSearch('');
                    triggerRef.current?.focus();
                  }}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                >
                  <div className="flex items-center gap-2 truncate">
                    {opt.icon}
                    <span className="truncate">{opt.name}</span>
                  </div>
                  {opt.subtext && (
                    <span className="text-[10px] font-bold shrink-0 opacity-80">{opt.subtext}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
});
