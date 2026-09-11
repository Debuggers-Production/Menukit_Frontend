import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Palette, Smartphone, Zap, ArrowRight, PenTool } from 'lucide-react';
import confetti from 'canvas-confetti';
import { APP_VERSION, APP_VERSION_NAME, FEATURE_STORAGE_KEY_V1_1_0 } from '@/config/version';
import { triggerHaptic, HAPTIC_PATTERNS } from '@/utils/haptic';
import { MiniAFrame } from '@/components/chalkboard/AFrameIllustration';
import menukitLogo from '@/assets/menukit-logo.svg';

interface WhatsNewModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  forceOpen?: boolean;
}

export function WhatsNewModal({ isOpen: controlledIsOpen, onClose: controlledOnClose, forceOpen = false }: WhatsNewModalProps) {
  const navigate = useNavigate();
  const [internalOpen, setInternalOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const [arrowCoords, setArrowCoords] = useState<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    targetRect: DOMRect;
    midX: number;
    midY: number;
    path: string;
  } | null>(null);

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
        colors: ['#f59e0b', '#10b981', '#6366f1', '#ec4899']
      });
    } catch {
      // Ignore confetti errors
    }
  };

  // Recalculate spiral arrow path between modal and sidebar tab
  const updateArrowPosition = () => {
    const target = document.getElementById('sidebar-nav-chalkboard');
    const modal = modalRef.current;

    if (!target || !modal) {
      setArrowCoords(null);
      return;
    }

    const tRect = target.getBoundingClientRect();
    const mRect = modal.getBoundingClientRect();

    // Only show arrow on screens where sidebar tab is visible to the left
    if (tRect.width === 0 || tRect.right >= mRect.left) {
      setArrowCoords(null);
      return;
    }

    const startX = mRect.left;
    const startY = mRect.top + 110;
    const endX = tRect.right + 12;
    const endY = tRect.top + tRect.height / 2;

    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    const loopRadius = Math.min(32, Math.max(18, Math.abs(startX - endX) * 0.15));

    // True cursive spiral loop path
    const path = `M ${startX} ${startY}
      C ${startX - 35} ${startY - 15}, ${midX + loopRadius * 1.6} ${midY - loopRadius * 2.2}, ${midX} ${midY - loopRadius}
      C ${midX - loopRadius * 1.5} ${midY}, ${midX - loopRadius} ${midY + loopRadius * 1.8}, ${midX + loopRadius * 0.7} ${midY + loopRadius}
      C ${midX + loopRadius * 2} ${midY + loopRadius * 0.2}, ${midX + loopRadius} ${midY - loopRadius * 1.3}, ${midX - loopRadius * 0.6} ${midY - loopRadius * 0.6}
      C ${midX - loopRadius * 2} ${midY + 5}, ${endX + 50} ${endY - 15}, ${endX} ${endY}`;

    setArrowCoords({
      startX,
      startY,
      endX,
      endY,
      targetRect: tRect,
      midX,
      midY,
      path,
    });
  };

  useEffect(() => {
    if (!isVisible) {
      setArrowCoords(null);
      return;
    }

    const rafId = requestAnimationFrame(() => {
      updateArrowPosition();
    });
    const interval = setInterval(updateArrowPosition, 250);
    window.addEventListener('resize', updateArrowPosition);
    window.addEventListener('scroll', updateArrowPosition, true);

    return () => {
      cancelAnimationFrame(rafId);
      clearInterval(interval);
      window.removeEventListener('resize', updateArrowPosition);
      window.removeEventListener('scroll', updateArrowPosition, true);
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
      console.log(`[Feature Announcement] User acknowledged ${APP_VERSION_NAME} at ${payload.seenAt}`);
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

  const handleExplore = () => {
    triggerHaptic(HAPTIC_PATTERNS.SUCCESS);
    markAsAcknowledged();
    if (isControlled && controlledOnClose) {
      controlledOnClose();
    } else {
      setInternalOpen(false);
    }
    navigate('/chalkboard');
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        {/* Backdrop with SVG Mask Cutout over the target tab */}
        {arrowCoords ? (
          <svg
            className="fixed inset-0 w-full h-full pointer-events-auto z-[120]"
            onClick={handleClose}
          >
            <defs>
              <mask id="chalkboard-spotlight-mask">
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                {/* Transparent hole over the sidebar tab */}
                <rect
                  x={arrowCoords.targetRect.left - 6}
                  y={arrowCoords.targetRect.top - 4}
                  width={arrowCoords.targetRect.width + 12}
                  height={arrowCoords.targetRect.height + 8}
                  rx="14"
                  fill="black"
                />
              </mask>
            </defs>
            <rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="rgba(2, 6, 23, 0.72)"
              mask="url(#chalkboard-spotlight-mask)"
            />
          </svg>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
          />
        )}

        {/* High-Contrast Interactive Spotlight Item over the Sidebar Tab */}
        {arrowCoords && (
          <>
            {/* Crystal-clear elevated tab clone with high-contrast text */}
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'fixed',
                left: arrowCoords.targetRect.left,
                top: arrowCoords.targetRect.top,
                width: arrowCoords.targetRect.width,
                height: arrowCoords.targetRect.height,
                zIndex: 128,
              }}
              onClick={handleExplore}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-black bg-white dark:bg-slate-900 text-slate-900 dark:text-white ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-950 shadow-[0_0_35px_rgba(245,158,11,0.95)] border-2 border-amber-400 select-none cursor-pointer transition-all hover:scale-105 active:scale-95 group"
              title="Click to open Chalkboard"
            >
              <PenTool size={16} className="text-amber-500 shrink-0 group-hover:rotate-12 transition-transform" />
              <span className="font-extrabold text-slate-900 dark:text-white text-xs truncate">
                Chalkboard
              </span>
              <span className="ml-auto text-[9px] font-black uppercase bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 px-1.5 py-0.5 rounded shadow-xs">
                NEW
              </span>
            </motion.div>

            {/* SVG Spiral Arrow Overlay */}
            <svg
              className="fixed inset-0 w-full h-full pointer-events-none z-[126] overflow-visible"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <filter id="spiral-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#f59e0b" floodOpacity="0.85" />
                </filter>
                <linearGradient id="spiral-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="50%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#d97706" />
                </linearGradient>
              </defs>

              {/* Animated Spiral Arrow Path */}
              <motion.path
                d={arrowCoords.path}
                fill="none"
                stroke="url(#spiral-grad)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="9 6"
                filter="url(#spiral-glow)"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />

              {/* Arrow Head pointing directly to the tab */}
              <polygon
                points={`
                  ${arrowCoords.endX},${arrowCoords.endY} 
                  ${arrowCoords.endX + 15},${arrowCoords.endY - 8} 
                  ${arrowCoords.endX + 11},${arrowCoords.endY} 
                  ${arrowCoords.endX + 15},${arrowCoords.endY + 8}
                `}
                fill="#f59e0b"
                filter="url(#spiral-glow)"
              />
            </svg>
          </>
        )}

        {/* Modal Card */}
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: "spring", damping: 26, stiffness: 300 }}
          className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden z-[122] flex flex-col my-auto sm:translate-x-10 lg:translate-x-16"
        >
          {/* Top Decorative Header */}
          <div className="relative bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 px-6 pt-7 pb-6 text-white overflow-hidden">
            <div className="absolute -top-12 -right-12 w-44 h-44 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-8 -left-8 w-36 h-36 bg-black/15 rounded-full blur-xl pointer-events-none" />

            {/* Pill Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 border border-white/30 text-white text-[11px] font-black uppercase tracking-wider mb-2.5 backdrop-blur-xs shadow-xs">
              <img src={menukitLogo} alt="Menukit" className="w-3.5 h-3.5 object-contain brightness-0 invert" />
              <span>What's New in v{APP_VERSION}</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>Sidewalk Chalkboard Specials</span>
              <PenTool size={22} className="text-amber-200" />
            </h2>
            <p className="text-xs sm:text-sm text-amber-50/90 font-medium mt-1 leading-relaxed">
              Showcase chef specials, daily catch, and signature offerings with vintage sidewalk chalkboard charm.
            </p>
          </div>

          {/* Body Content */}
          <div className="p-6 space-y-5 overflow-y-auto max-h-[65vh]">
            {/* 3D A-Frame Board Feature Hero Showcase */}
            <div className="relative rounded-2xl bg-gradient-to-b from-amber-500/10 via-orange-500/5 to-slate-50 dark:from-amber-500/15 dark:via-slate-800/60 dark:to-slate-900 border border-amber-500/20 p-4 text-center select-none overflow-hidden">
              <div className="flex items-center gap-5 justify-center">
                {/* Real 3D A-Frame Illustration */}
                <div className="shrink-0 transition-transform hover:scale-105 duration-300">
                  <MiniAFrame className="w-24 h-28" title="SPECIALS" />
                </div>

                {/* Info Text & Badge */}
                <div className="text-left space-y-1.5 flex-1 min-w-0">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                    <img src={menukitLogo} alt="Menukit" className="w-3 h-3 object-contain" /><span>Sidewalk Signboard</span>
                  </span>
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight">
                    A-Frame Daily Specials
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Display today's signature specials right on your digital menu with live chalkboard fonts and colors.
                  </p>
                </div>
              </div>
            </div>

            {/* Feature Highlights List */}
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Palette size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    Artistic Chalkboard Designer
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                    Customize titles, chalk lettering styles, colors, and border frames with instant real-time live preview.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Smartphone size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    Mobile Floating Sidewalk Sign
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                    Customers browsing your digital menu can tap a floating sidewalk board to view specials in full clarity.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Zap size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    Instant Live Sync
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                    Change your daily specials in seconds. Customers see updates immediately without re-scanning QR codes.
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
              onClick={handleExplore}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md shadow-orange-500/20 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Explore Chalkboard</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

