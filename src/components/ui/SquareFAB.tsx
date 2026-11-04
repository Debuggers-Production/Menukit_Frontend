import React from 'react';
import { createPortal } from 'react-dom';
import { LucideIcon } from 'lucide-react';

export interface SquareFABProps {
  icon: LucideIcon;
  onClick: () => void;
  title: string;
  className?: string;
  iconSize?: number;
  badge?: number | string;
  visible?: boolean;
}

/**
 * SquareFAB
 * Universal modern square floating action button.
 * Uses consistent rounded-xl geometry, high-contrast elevation, and responsive positioning.
 */
export function SquareFAB({
  icon: Icon,
  onClick,
  title,
  className = '',
  iconSize = 24,
  badge,
  visible = true,
}: SquareFABProps) {
  if (!visible) return null;

  return createPortal(
    <button
      onClick={onClick}
      className={`fixed bottom-20 lg:bottom-8 right-4 lg:right-8 z-50 w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-primary hover:bg-primary-600 hover:scale-105 active:scale-95 shadow-xl flex items-center justify-center text-white transition-all duration-200 cursor-pointer border border-white/20 select-none ${className}`}
      title={title}
      aria-label={title}
    >
      <Icon size={iconSize} className="shrink-0" />
      {badge !== undefined && (
        <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-black rounded-full min-w-5 h-5 px-1 flex items-center justify-center ring-2 ring-white dark:ring-slate-900 shadow-sm">
          {badge}
        </span>
      )}
    </button>,
    document.body
  );
}
