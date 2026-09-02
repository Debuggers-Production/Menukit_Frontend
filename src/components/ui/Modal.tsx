import * as React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
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
  closeOnBackdropClick?: boolean;
}

export function Modal({ isOpen, onClose, title, description, children, footer, className, closeOnBackdropClick = true }: ModalProps) {
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

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
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
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className={cn(
              "bg-background relative w-full max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl z-10 max-h-[90vh] sm:max-h-[85vh] overflow-hidden flex flex-col border border-border",
              className
            )}
          >


            {/* Fixed Header */}
            {(title || description) && (
              <div className="relative z-30 bg-background pt-4 pb-4 px-6 sm:px-8 border-b border-border shrink-0">
                <button
                  onClick={onClose}
                  className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-muted transition-colors"
                >
                  <X className="h-4.5 w-4.5" />
                  <span className="sr-only">Close</span>
                </button>

                <div className="space-y-1 pr-8 text-left">
                  {title && <h2 className="text-lg sm:text-xl font-bold tracking-tight font-heading text-foreground">{title}</h2>}
                  {description && <p className="text-sm text-muted-foreground">{description}</p>}
                </div>
              </div>
            )}

            {/* Scrollable Content Container */}
            <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-4 sm:px-8 space-y-4">
              {children}
            </div>

            {/* Fixed Static Footer */}
            {footer && (
              <div className="shrink-0 py-4 px-6 sm:px-8 border-t border-border bg-background mt-auto z-20">
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
