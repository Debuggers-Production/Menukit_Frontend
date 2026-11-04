import React from 'react';
import { Search, X } from 'lucide-react';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onClear?: () => void;
  autoFocus?: boolean;
}

/**
 * SearchInput
 * Reusable debounced-ready search input with integrated search icon, clear button, and accessible styling.
 */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
  onClear,
  autoFocus = false,
}: SearchInputProps) {
  return (
    <div className={`relative flex items-center ${className}`}>
      <Search size={15} className="absolute left-3 text-slate-400 dark:text-slate-500 pointer-events-none shrink-0" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full pl-9 pr-8 py-2 text-xs font-medium rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange('');
            onClear?.();
          }}
          className="absolute right-2.5 p-0.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Clear search"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}
