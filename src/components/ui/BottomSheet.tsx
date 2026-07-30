import * as React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function BottomSheet({ isOpen, onClose, title, children, footer, className }: BottomSheetProps) {
  const [mounted, setMounted] = React.useState(false);
  const controls = useAnimation();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      controls.start({ y: 0 });
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, controls]);

  const handleDragEnd = async (_event: any, info: any) => {
    // If dragged down past 100px or dragged down fast (velocity > 300)
    if (info.offset.y > 100 || info.velocity.y > 300) {
      onClose();
    } else {
      controls.start({ y: 0 });
    }
  };

  const sheetContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.div
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0.1, bottom: 0.8 }}
            onDragEnd={handleDragEnd}
            animate={controls}
            initial={{ y: "100%" }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className={cn(
              "relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)] z-10 flex flex-col max-h-[85vh] sm:max-h-[600px] overflow-hidden select-none pb-safe",
              className
            )}
          >
            {/* Drag Handle Bar - clickable to close too */}
            <div 
              onClick={onClose}
              className="w-full py-4 flex items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors shrink-0 group"
              title="Drag or click to close"
            >
              <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full group-hover:bg-slate-300 dark:group-hover:bg-slate-600 transition-colors" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              {title ? (
                <h2 className="text-base font-extrabold text-slate-800 dark:text-white font-heading">{title}</h2>
              ) : (
                <div />
              )}
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
                <span className="sr-only">Close</span>
              </button>
            </div>

            {/* Scrollable Content Container */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
              {children}
            </div>

            {/* Fixed Footer */}
            {footer && (
              <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (!mounted) return null;

  return createPortal(sheetContent, document.body);
}
