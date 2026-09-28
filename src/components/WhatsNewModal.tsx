import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelLeftClose, Sparkles, Bug, CheckCircle2, ArrowRight, X, Layout, Maximize2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { APP_VERSION, APP_VERSION_NAME, FEATURE_STORAGE_KEY_V1_1_0 } from '@/config/version';
import { triggerHaptic, HAPTIC_PATTERNS } from '@/utils/haptic';
import menukitLogo from '@/assets/menukit-logo.svg';

interface WhatsNewModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  forceOpen?: boolean;
}

export function WhatsNewModal({ isOpen: controlledIsOpen, onClose: controlledOnClose, forceOpen = false }: WhatsNewModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isControlled = controlledIsOpen !== undefined;
  const isVisible = isControlled ? controlledIsOpen : internalOpen;

  useEffect(() => {
    if (forceOpen) {
      setInternalOpen(true);
      return;
    }

    if (!isControlled) {
      try {
        const seenData = localStorage.getItem(FEATURE_STORAGE_KEY_V1_1_0);
        if (!seenData) {
          const timer = setTimeout(() => {
            setInternalOpen(true);
            triggerCelebration();
          }, 800);
          return () => clearTimeout(timer);
        }
      } catch {
        // Fallback gracefully
      }
    }
  }, [forceOpen, isControlled]);

  const triggerCelebration = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        zIndex: 9999,
        colors: ['#f97316', '#10b981', '#6366f1', '#f59e0b']
      });
    } catch {
      // Ignore confetti errors
    }
  };

  const [arrowData, setArrowData] = useState<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    path: string;
    targetRect: DOMRect;
  } | null>(null);

  const featureCardRef = useRef<HTMLDivElement>(null);

  const updateArrow = () => {
    const target = document.getElementById('sidebar-collapse-toggle-btn');
    const modal = modalRef.current;
    const card = featureCardRef.current;

    if (!target || !modal) {
      setArrowData(null);
      return;
    }

    const tRect = target.getBoundingClientRect();
    const mRect = modal.getBoundingClientRect();
    const cRect = card ? card.getBoundingClientRect() : null;

    // Only display on desktop where target is located to the left of the modal
    if (tRect.width === 0 || tRect.right >= mRect.left - 20) {
      setArrowData(null);
      return;
    }

    const startX = mRect.left;
    const startY = cRect ? cRect.top + cRect.height / 2 : mRect.top + 220;
    const endX = tRect.right + 10;
    const endY = tRect.top + tRect.height / 2;

    const dx = startX - endX;
    const cp1X = startX - dx * 0.45;
    const cp1Y = startY;
    const cp2X = endX + Math.min(dx * 0.4, 80);
    const cp2Y = endY;

    const path = `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`;

    setArrowData({
      startX,
      startY,
      endX,
      endY,
      path,
      targetRect: tRect,
    });
  };

  useEffect(() => {
    if (!isVisible) {
      setArrowData(null);
      return;
    }

    const timer = setTimeout(updateArrow, 200);
    window.addEventListener('resize', updateArrow);
    window.addEventListener('scroll', updateArrow, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateArrow);
      window.removeEventListener('scroll', updateArrow, true);
    };
  }, [isVisible]);

  const markAsAcknowledged = () => {
    try {
      const payload = {
        version: APP_VERSION,
        name: APP_VERSION_NAME,
        seenAt: new Date().toISOString(),
      };
      localStorage.setItem(FEATURE_STORAGE_KEY_V1_1_0, JSON.stringify(payload));
    } catch {
      // Ignore
    }
  };

  const handleClose = () => {
    markAsAcknowledged();
    if (isControlled && controlledOnClose) {
      controlledOnClose();
    } else {
      setInternalOpen(false);
    }
  };

  const handleToggleSidebarAction = () => {
    triggerHaptic(HAPTIC_PATTERNS.SUCCESS);
    markAsAcknowledged();
    
    // Trigger the sidebar button if present
    const btn = document.getElementById('sidebar-collapse-toggle-btn');
    if (btn) {
      btn.click();
    }

    if (isControlled && controlledOnClose) {
      controlledOnClose();
    } else {
      setInternalOpen(false);
    }
  };

  if (!isVisible || !mounted) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9990] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        {/* Full-Screen Backdrop covering entire window including header */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm cursor-pointer z-0"
        />

        {/* Dynamic Curved Pointer Arrow */}
        {arrowData && (
          <div className="fixed inset-0 pointer-events-none z-10">
            {/* Pulsating Target Spotlight Indicator over Sidebar Toggle */}
            <div
              style={{
                position: 'fixed',
                left: arrowData.targetRect.left,
                top: arrowData.targetRect.top,
                width: arrowData.targetRect.width,
                height: arrowData.targetRect.height,
              }}
              className="pointer-events-auto cursor-pointer"
              onClick={handleToggleSidebarAction}
              title="Click to collapse / expand sidebar"
            >
              <div className="w-full h-full rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-[0_0_25px_rgba(249,115,22,0.9)] ring-4 ring-orange-400 ring-offset-2 ring-offset-slate-950 border-2 border-white animate-pulse">
                <PanelLeftClose size={18} />
              </div>
            </div>

            {/* SVG Arc and Arrowhead */}
            <svg className="fixed inset-0 w-full h-full pointer-events-none overflow-visible">
              <defs>
                <filter id="arrow-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#f97316" floodOpacity="0.9" />
                </filter>
                <linearGradient id="arrow-grad" x1="100%" y1="0%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#ea580c" />
                  <stop offset="60%" stopColor="#f97316" />
                  <stop offset="100%" stopColor="#fb923c" />
                </linearGradient>
              </defs>

              <motion.path
                d={arrowData.path}
                fill="none"
                stroke="url(#arrow-grad)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeDasharray="8 6"
                filter="url(#arrow-glow)"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />

              {/* Arrow Head */}
              <polygon
                points={`
                  ${arrowData.endX},${arrowData.endY} 
                  ${arrowData.endX + 13},${arrowData.endY - 6.5} 
                  ${arrowData.endX + 9},${arrowData.endY} 
                  ${arrowData.endX + 13},${arrowData.endY + 6.5}
                `}
                fill="#f97316"
                filter="url(#arrow-glow)"
              />
            </svg>
          </div>
        )}

        {/* Modal Card */}
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: "spring", damping: 26, stiffness: 300 }}
          className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden z-20 flex flex-col my-auto"
        >
          {/* Top Right Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-30 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white/90 hover:text-white transition-all cursor-pointer backdrop-blur-xs"
            aria-label="Close"
          >
            <X size={18} />
          </button>

          {/* Top Decorative Header */}
          <div className="relative bg-gradient-to-br from-orange-500 via-primary to-amber-600 px-6 pt-7 pb-6 text-white overflow-hidden">
            <div className="absolute -top-12 -right-12 w-44 h-44 bg-white/15 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-8 -left-8 w-36 h-36 bg-black/20 rounded-full blur-xl pointer-events-none" />

            {/* Pill Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 border border-white/30 text-white text-[11px] font-black uppercase tracking-wider mb-2.5 backdrop-blur-xs shadow-xs">
              <img src={menukitLogo} alt="Menukit" className="w-3.5 h-3.5 object-contain brightness-0 invert" />
              <span>What's New in v{APP_VERSION}</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>Collapsible Sidebar & UI Updates</span>
              <Maximize2 size={22} className="text-orange-200" />
            </h2>
            <p className="text-xs sm:text-sm text-orange-50/95 font-medium mt-1 leading-relaxed">
              Now you can close the sidebar for a wider, cleaner workspace view, alongside improved UI styling and bug fixes.
            </p>
          </div>

          {/* Body Content */}
          <div className="p-6 space-y-4 overflow-y-auto max-h-[65vh]">
            {/* Collapsible Sidebar Feature Showcase Card */}
            <div ref={featureCardRef} className="relative rounded-2xl bg-gradient-to-b from-orange-500/10 via-amber-500/5 to-slate-50 dark:from-orange-500/15 dark:via-slate-800/60 dark:to-slate-900 border border-orange-500/20 p-4 select-none overflow-hidden">
              <div className="flex items-center gap-4 justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-orange-500/15 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 border border-orange-500/30 shadow-inner">
                    <PanelLeftClose size={24} className="animate-pulse" />
                  </div>
                  <div className="space-y-0.5 text-left">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-orange-500/15 text-orange-700 dark:text-orange-300">
                      NEW FEATURE
                    </span>
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">
                      Close Sidebar for Wider View
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Tap the toggle button anytime to collapse the sidebar and expand your dashboard canvas.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature Highlights List */}
            <div className="space-y-2.5">
              {/* Feature 1: Improved UI */}
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Layout size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    Improved UI & Cleaner Aesthetics
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                    Enhanced spacing, responsive layouts, refined typography, and smoother micro-animations across all menus.
                  </p>
                </div>
              </div>

              {/* Feature 2: Bug Fixes */}
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Bug size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    Bug Fixes & Order Stability
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                    Fixed price validations, optimized add-ons & variant selection, and eliminated caching glitches.
                  </p>
                </div>
              </div>

              {/* Feature 3: Better Screen Real Estate */}
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    Seamless Experience
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                    Automatic update notifications keep your app running on the latest version without disruption.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              Maybe Later
            </button>

            <button
              onClick={handleToggleSidebarAction}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-orange-500 to-primary hover:from-orange-600 hover:to-primary/90 text-white shadow-md shadow-orange-500/20 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Try Collapsing Sidebar</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
