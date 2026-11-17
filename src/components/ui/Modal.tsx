import * as React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  containerClassName?: string;
  closeOnBackdropClick?: boolean;
  hideCloseButton?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ isOpen, onClose, title, description, children, footer, className, containerClassName, closeOnBackdropClick = false, hideCloseButton = false, size = 'md' }: ModalProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const hasHeader = Boolean(title || description);
  const isZeroPadding = className?.includes('p-0');

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className={cn("fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4", containerClassName)}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (closeOnBackdropClick) onClose();
            }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
          />
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ type: "spring", damping: 25, stiffness: 260 }}
            className={cn(
              "bg-white text-slate-900 relative w-full rounded-t-xl sm:rounded-xl shadow-2xl z-10 max-h-[90vh] sm:max-h-[85vh] overflow-hidden flex flex-col border border-slate-200",
              size === 'sm' && 'max-w-sm',
              size === 'md' && 'max-w-lg',
              size === 'lg' && 'max-w-2xl',
              size === 'xl' && 'max-w-4xl',
              className
            )}
          >
            {hasHeader ? (
              <div className="flex items-center justify-between p-4 sm:p-4.5 border-b border-slate-100 shrink-0 bg-slate-50/80">
                <div>
                  {title && <h2 className="text-base font-semibold text-slate-900 tracking-tight">{title}</h2>}
                  {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
                </div>
                {!hideCloseButton && (
                  <button
                    onClick={onClose}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            ) : !hideCloseButton ? (
              <button
                onClick={onClose}
                className="absolute top-3.5 right-3.5 z-50 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            ) : null}
            
            <div className={cn("overflow-y-auto flex-1 custom-scrollbar", isZeroPadding ? "p-0" : "p-4 sm:p-5")}>
              {children}
            </div>

            {footer && (
              <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-slate-50/80 shrink-0 flex items-center justify-end gap-2.5">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (!mounted) return null;
  return createPortal(modalContent, document.body);
}
