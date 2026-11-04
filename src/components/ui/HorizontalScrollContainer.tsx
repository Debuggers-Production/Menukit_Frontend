import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface HorizontalScrollContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  scrollAmount?: number;
  className?: string;
  contentClassName?: string;
  showArrowsOnMobile?: boolean;
  activeItemKey?: string | number | null;
}

export function HorizontalScrollContainer({
  children,
  scrollAmount = 240,
  className,
  contentClassName,
  showArrowsOnMobile = false,
  activeItemKey,
  ...props
}: HorizontalScrollContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 2);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);

    // Mutation observer to detect child additions/changes
    const observer = new ResizeObserver(() => {
      checkScroll();
    });
    observer.observe(el);

    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
      observer.disconnect();
    };
  }, [checkScroll]);

  const handleScroll = (direction: 'left' | 'right') => {
    const el = containerRef.current;
    if (!el) return;
    const delta = direction === 'left' ? -scrollAmount : scrollAmount;
    el.scrollBy({ left: delta, behavior: 'smooth' });
  };

  const scrollToActive = useCallback((smooth = true) => {
    const el = containerRef.current;
    if (!el) return;
    const activeEl = el.querySelector<HTMLElement>(
      '[data-active="true"], [aria-selected="true"], [data-selected="true"]'
    );
    if (activeEl) {
      activeEl.scrollIntoView({
        behavior: smooth ? 'smooth' : 'instant',
        block: 'nearest',
        inline: 'center'
      });
      setTimeout(checkScroll, 350);
    }
  }, [checkScroll]);

  // When activeItemKey changes, smoothly scroll the active item into view
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToActive(true);
    }, 60);
    return () => clearTimeout(timer);
  }, [activeItemKey, scrollToActive]);

  // On initial mount / page load, ensure active item is visible
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToActive(false);
    }, 120);
    return () => clearTimeout(timer);
  }, [scrollToActive]);

  return (
    <div className={cn("relative group flex items-center w-full min-w-0", className)} {...props}>
      {/* Left Scroll Button with Highlighted Border & Elevation */}
      {canScrollLeft && (
        <div className="absolute left-0 z-20 flex items-center pr-3 bg-gradient-to-r from-background via-background/95 to-transparent h-full">
          <button
            type="button"
            onClick={() => handleScroll('left')}
            aria-label="Scroll left"
            className={cn(
              "flex items-center justify-center w-7 h-7 rounded-md bg-card text-foreground border border-primary/40 dark:border-primary/50 shadow-2xs hover:border-primary hover:bg-primary/10 hover:text-primary transition-all cursor-pointer hover:scale-105 active:scale-95 shrink-0 ring-1 ring-primary/25",
              !showArrowsOnMobile && "hidden sm:flex"
            )}
          >
            <ChevronLeft size={15} strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* Scrollable Container */}
      <div
        ref={containerRef}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        className={cn(
          "flex-1 overflow-x-auto no-scrollbar scroll-smooth [&::-webkit-scrollbar]:!hidden [&::-webkit-scrollbar]:!w-0 [&::-webkit-scrollbar]:!h-0",
          canScrollLeft && !showArrowsOnMobile && "sm:pl-9",
          canScrollRight && !showArrowsOnMobile && "sm:pr-9",
          canScrollLeft && showArrowsOnMobile && "pl-9",
          canScrollRight && showArrowsOnMobile && "pr-9",
          contentClassName
        )}
      >
        {children}
      </div>

      {/* Right Scroll Button with Highlighted Border & Elevation */}
      {canScrollRight && (
        <div className="absolute right-0 z-20 flex items-center pl-3 bg-gradient-to-l from-background via-background/95 to-transparent h-full">
          <button
            type="button"
            onClick={() => handleScroll('right')}
            aria-label="Scroll right"
            className={cn(
              "flex items-center justify-center w-7 h-7 rounded-md bg-card text-foreground border border-primary/40 dark:border-primary/50 shadow-2xs hover:border-primary hover:bg-primary/10 hover:text-primary transition-all cursor-pointer hover:scale-105 active:scale-95 shrink-0 ring-1 ring-primary/25",
              !showArrowsOnMobile && "hidden sm:flex"
            )}
          >
            <ChevronRight size={15} strokeWidth={2.5} />
          </button>
        </div>
      )}
    </div>
  );
}
