import { useEffect } from 'react';
import { Info } from 'lucide-react';
import { Tooltip } from 'react-tooltip';
import { useHeaderStore } from '@/store/useHeaderStore';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
}

export function PageHeader({ title, subtitle, className = '' }: PageHeaderProps) {
  const { setTitle } = useHeaderStore();

  useEffect(() => {
    setTitle(title, subtitle);
    return () => setTitle('', '');
  }, [title, subtitle, setTitle]);

  return (
    <div className={`mb-4 text-left ${className}`}>
      <div className="flex items-center gap-2">
        <h1 className="text-xl sm:text-2xl font-black font-heading tracking-tight text-slate-900 dark:text-white">
          {title}
        </h1>
        
        {subtitle && (
          <>
            <button
              data-tooltip-id="page-header-tooltip"
              data-tooltip-content={subtitle}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors rounded-full p-0.5 focus:outline-none shrink-0"
              aria-label="More information"
            >
              <Info size={16} />
            </button>
            
            <Tooltip 
              id="page-header-tooltip" 
              place="bottom-start"
              className="!bg-slate-900 !text-white !text-xs !py-1.5 !px-3 !rounded-xl shadow-xl z-50 max-w-xs font-medium"
            />
          </>
        )}
      </div>

      {subtitle && (
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
          {subtitle}
        </p>
      )}
    </div>
  );
}
