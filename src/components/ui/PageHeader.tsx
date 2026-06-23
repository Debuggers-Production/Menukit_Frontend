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
    // Cleanup is optional, but helps avoid stale titles if unmounted
    return () => setTitle('', '');
  }, [title, subtitle, setTitle]);

  return (
    <div className={`mb-1 flex items-center gap-2 ${className}`}>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-heading">
        {title}
      </h1>
      
      {subtitle && (
        <>
          <button
            data-tooltip-id="page-header-tooltip"
            data-tooltip-content={subtitle}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors rounded-full p-1 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            aria-label="More information"
          >
            <Info size={18} />
          </button>
          
          <Tooltip 
            id="page-header-tooltip" 
            place="bottom"
            className="z-50 max-w-xs text-center !bg-slate-800 dark:!bg-slate-700 !text-white !rounded-xl !text-xs !py-2 !px-3 !shadow-xl"
            arrowColor="transparent"
          />
        </>
      )}
    </div>
  );
}
