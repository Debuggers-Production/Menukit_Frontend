import { useState, useRef, useEffect, useMemo, useDeferredValue } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '@/utils/cn';

interface Option {
  id: string;
  name: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  showSearch?: boolean;
  className?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  showSearch = true,
  className
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
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

      if (shouldFlipUpward) {
        setPos({
          bottom: viewportHeight - rect.top + 4,
          top: undefined,
          left: rect.left,
          width: rect.width,
          maxHeight,
          openUpward: true
        });
      } else {
        setPos({
          top: rect.bottom + 4,
          bottom: undefined,
          left: rect.left,
          width: rect.width,
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
  }, [isOpen]);

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-between min-h-[38px] h-9 w-full rounded-xl border border-input bg-transparent px-3 py-1.5 text-xs shadow-xs cursor-pointer dark:bg-slate-900 transition-colors focus-within:ring-2 focus-within:ring-ring",
          className
        )}
      >
        <span className={`block truncate ${!selectedOption ? 'text-slate-500' : 'text-slate-900 dark:text-slate-100 font-medium'}`}>
          {selectedOption ? selectedOption.name : placeholder}
        </span>
        <ChevronDown size={16} className={`text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && createPortal(
        <div 
          ref={dropdownRef}
          className="fixed z-[999999] bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col transition-all duration-100 ease-out"
          style={{
            top: pos.top !== undefined ? `${pos.top}px` : 'auto',
            bottom: pos.bottom !== undefined ? `${pos.bottom}px` : 'auto',
            left: `${pos.left}px`,
            width: `${pos.width}px`,
            maxHeight: `${pos.maxHeight}px`
          }}
        >
          {showSearch && (
            <div className="flex items-center px-3 py-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 shrink-0">
              <Search size={14} className="text-slate-400 mr-2 shrink-0" />
              <input
                type="text"
                className="w-full bg-transparent text-xs focus:outline-none dark:text-white"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>
          )}
          <div className="flex-1 overflow-y-auto overscroll-contain py-1 scrollbar-thin">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-3 text-xs text-center text-slate-500">No results found</div>
            ) : (
              filteredOptions.map((opt) => (
                <div
                  key={opt.id}
                  className={`px-3 py-2 text-xs cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors ${
                    value?.toString() === opt.id.toString() ? 'bg-primary/10 text-primary font-bold' : 'text-slate-700 dark:text-slate-300'
                  }`}
                  onClick={() => {
                    onChange(opt.id);
                    setIsOpen(false);
                    setSearch('');
                  }}
                >
                  {opt.name}
                </div>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
