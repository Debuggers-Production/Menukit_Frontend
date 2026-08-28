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
    <div className={`mb-6 text-left ${className}`}>
      <div className="flex items-center gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold font-heading tracking-tight text-foreground">
          {title}
        </h1>
        
        {subtitle && (
          <>
            <button
              data-tooltip-id="page-header-tooltip"
              data-tooltip-content={subtitle}
              className="text-muted-foreground hover:text-foreground transition-colors rounded-full p-0.5 focus:outline-none shrink-0"
              aria-label="More information"
            >
              <Info size={16} />
            </button>
            
            <Tooltip 
              id="page-header-tooltip" 
              place="bottom-start"
              className="!bg-popover !text-popover-foreground border border-border !text-xs !py-2 !px-4 !rounded-xl shadow-xl z-50 max-w-xs font-medium"
            />
          </>
        )}
      </div>

      {subtitle && (
        <p className="text-sm text-muted-foreground font-medium mt-1">
          {subtitle}
        </p>
      )}
    </div>
  );
}
