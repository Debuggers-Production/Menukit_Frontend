import React, { useState, useRef, useEffect, useMemo, useDeferredValue, forwardRef, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Check } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface Option {
  id: string;
  name: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  subtext?: string;
  badge?: string;
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
  // Async backend search & infinite scroll pagination props
  onSearchChange?: (query: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
  isLoadingMore?: boolean;
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
  onKeyDown,
  onSearchChange,
  onLoadMore,
  hasMore = false,
  isLoading = false,
  isLoadingMore = false,
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
  }>({ left: 0, width: 0, maxHeight: 280, openUpward: false });

  const isAsync = Boolean(onSearchChange);

  const filteredOptions = useMemo(() => {
    if (isAsync || !showSearch || !deferredSearch.trim()) return options;
    const q = deferredSearch.toLowerCase().trim();
    return options.filter(opt => 
      opt.name.toLowerCase().includes(q) || 
      (opt.badge && opt.badge.toLowerCase().includes(q)) ||
      (opt.subtext && opt.subtext.toLowerCase().includes(q))
    );
  }, [options, showSearch, deferredSearch, isAsync]);

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
      const shouldFlipUpward = (spaceBelow < 250 && spaceAbove > spaceBelow) || (spaceBelow < 180 && spaceAbove > 180);
      const availableSpace = shouldFlipUpward ? spaceAbove : spaceBelow;
      const maxHeight = Math.max(140, Math.min(260, availableSpace));
      const calculatedWidth = Math.max(rect.width, minWidth || rect.width);

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

  const handleDropdownScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!onLoadMore || !hasMore || isLoadingMore || isLoading) return;
    const target = e.currentTarget;
    if (target.scrollHeight - target.scrollTop - target.clientHeight < 35) {
      onLoadMore();
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
          "flex items-center justify-between min-h-[38px] h-9.5 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs sm:text-sm font-medium shadow-2xs cursor-pointer transition-all focus:outline-none focus:ring-1.5 focus:ring-primary focus:border-primary",
          className
        )}
      >
        <div className={`flex items-center gap-2 truncate min-w-0 flex-1 ${!selectedOption ? 'text-muted-foreground' : 'text-foreground'}`}>
          {selectedOption?.icon && (
            <span className="shrink-0 text-primary">{selectedOption.icon}</span>
          )}
          <span className="truncate font-semibold">{selectedOption ? selectedOption.name : placeholder}</span>
          {selectedOption?.badge && (
            <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/80 shrink-0 hidden sm:inline-block">
              {selectedOption.badge}
            </span>
          )}
        </div>
        <ChevronDown size={15} className={`text-muted-foreground shrink-0 ml-2 transition-transform duration-200 ${isOpen ? 'rotate-180 text-primary' : ''}`} />
      </div>

      {isOpen && createPortal(
        <div 
          ref={dropdownRef}
          className="fixed z-[999999] bg-popover text-popover-foreground rounded-lg shadow-xl border border-border/90 overflow-hidden flex flex-col transition-all duration-100 ease-out max-w-[calc(100vw-24px)]"
          style={{
            top: pos.top !== undefined ? `${pos.top}px` : 'auto',
            bottom: pos.bottom !== undefined ? `${pos.bottom}px` : 'auto',
            left: `${pos.left}px`,
            width: `${pos.width}px`,
            maxHeight: `${pos.maxHeight}px`
          }}
        >
          {showSearch && (
            <div className="flex items-center px-3 py-2 border-b border-border/80 bg-muted/40 shrink-0">
              <Search size={14} className="text-muted-foreground mr-2 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                className="w-full bg-transparent text-xs sm:text-sm focus:outline-none placeholder:text-muted-foreground"
                placeholder="Search..."
                value={search}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearch(val);
                  if (onSearchChange) {
                    onSearchChange(val);
                  }
                }}
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

          <div 
            className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain py-1 scrollbar-thin"
            onScroll={handleDropdownScroll}
          >
            {isLoading ? (
              <div className="py-5 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span>Searching options...</span>
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-xs text-center text-muted-foreground">No matching options found</div>
            ) : (
              <>
                {filteredOptions.map((opt, idx) => {
                  const isSelected = value?.toString() === opt.id?.toString();
                  const isHighlighted = idx === highlightedIndex;

                  return (
                    <div
                      key={opt.id}
                      className={cn(
                        "px-3 py-2 text-xs sm:text-sm flex items-start justify-between gap-2.5 transition-colors select-none",
                        opt.disabled
                          ? "opacity-50 cursor-not-allowed bg-muted/40 text-muted-foreground"
                          : "cursor-pointer",
                        !opt.disabled && isHighlighted && !isSelected && "bg-accent/80 text-accent-foreground",
                        !opt.disabled && isSelected && "bg-primary/10 text-primary font-semibold",
                        !opt.disabled && !isHighlighted && !isSelected && "text-foreground hover:bg-muted/70",
                        opt.subtext && "border-b border-border/40 last:border-b-0"
                      )}
                      onClick={() => {
                        if (opt.disabled) return;
                        onChange(opt.id);
                        setIsOpen(false);
                        setSearch('');
                        if (onSearchChange) onSearchChange('');
                        triggerRef.current?.focus();
                      }}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        {opt.icon && (
                          <div className={cn(
                            "w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5",
                            isSelected ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                          )}>
                            {opt.icon}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={cn(
                              "font-semibold text-xs sm:text-sm leading-snug",
                              isSelected ? "text-primary" : "text-foreground"
                            )}>
                              {opt.name}
                            </span>
                            {opt.badge && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-muted text-muted-foreground border border-border/60">
                                {opt.badge}
                              </span>
                            )}
                          </div>
                          {opt.subtext && (
                            <p className="text-[11px] leading-relaxed text-muted-foreground line-clamp-2 mt-0.5 whitespace-normal break-words font-normal">
                              {opt.subtext}
                            </p>
                          )}
                        </div>
                      </div>

                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center shrink-0 mt-1 ml-1 shadow-2xs">
                          <Check size={10} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  );
                })}

                {isLoadingMore && (
                  <div className="py-2.5 text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5 border-t border-border/40">
                    <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span>Loading more...</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
});
