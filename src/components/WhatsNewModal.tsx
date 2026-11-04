import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  ArrowRight, X, Coins, MessageCircle, Wallet, 
  Printer, Store, Layers, CheckCircle2, ShoppingBag, 
  Percent, Smartphone, Globe2, Radio
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { APP_VERSION, APP_VERSION_NAME, FEATURE_STORAGE_KEY_V1_1_0 } from '@/config/version';
import { triggerHaptic, HAPTIC_PATTERNS } from '@/utils/haptic';
import { useShopStore } from '@/store/shopStore';
import { isSchemeEnabledShop } from '@/config/businessCategories';
import menukitLogo from '@/assets/menukit-logo.svg';

interface WhatsNewModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  forceOpen?: boolean;
}

export function WhatsNewModal({ isOpen: controlledIsOpen, onClose: controlledOnClose, forceOpen = false }: WhatsNewModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'schemes' | 'pos' | 'commerce'>('all');
  const [mounted, setMounted] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { shop } = useShopStore();

  const isSchemeShop = isSchemeEnabledShop(shop?.category);

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
        particleCount: 85,
        spread: 80,
        origin: { y: 0.55 },
        zIndex: 9999,
        colors: ['#f97316', '#fb923c', '#f59e0b', '#10b981', '#6366f1']
      });
    } catch {
      // Ignore confetti errors
    }
  };

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

  const handlePrimaryAction = () => {
    triggerHaptic(HAPTIC_PATTERNS.SUCCESS);
    markAsAcknowledged();
    
    if (isSchemeShop) {
      navigate('/schemes');
    } else {
      navigate('/orders');
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
      <div className="fixed inset-0 z-[9990] flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
        {/* Full-Screen Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 bg-slate-950/75 backdrop-blur-md cursor-pointer z-0"
        />

        {/* Modal Card */}
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          className="relative w-full max-w-xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden z-20 flex flex-col my-auto"
        >
          {/* Top Brand Accent Bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400" />

          {/* Top Header */}
          <div className="relative px-5 pt-5 pb-3 sm:px-6 sm:pt-6 sm:pb-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/50 flex items-start justify-between gap-4 shrink-0">
            <div className="space-y-1.5 min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 text-[11px] font-bold tracking-tight border border-orange-200 dark:border-orange-800/60">
                <img src={menukitLogo} alt="Menukit" className="w-3.5 h-3.5 object-contain" />
                <span>v{APP_VERSION} Major Release</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <span>Universal Commerce & Multi-Station Dispatch</span>
                <Zap size={18} className="text-amber-500 shrink-0" />
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Welcome to Menukit v2.1.0! Experience our biggest evolution yet: multi-industry catalogs, savings schemes, driver-free thermal POS, and streamlined multi-station routing.
              </p>
            </div>

            {/* Close Button */}
            <button
              onClick={handleClose}
              className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all cursor-pointer shrink-0 mt-0.5"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          {/* Filter Pills */}
          <div className="px-5 pt-3 pb-1 border-b border-slate-100 dark:border-slate-800/60 bg-white dark:bg-slate-900 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: 'All Highlights' },
              { id: 'schemes', label: 'Savings Schemes' },
              { id: 'pos', label: 'Thermal POS & Stations' },
              { id: 'commerce', label: 'Multi-Industry' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Body Content - Scrollable */}
          <div className="p-4 sm:p-5 space-y-3 overflow-y-auto custom-scrollbar flex-1 min-h-0">
            {/* Featured Hero Card */}
            {(activeTab === 'all' || activeTab === 'schemes') && (
              <div className="rounded-2xl p-4 bg-gradient-to-br from-orange-50 via-amber-50/40 to-white dark:from-orange-950/20 dark:via-slate-800/60 dark:to-slate-900 border border-orange-200/80 dark:border-orange-800/50 shadow-xs space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-orange-500 text-white shadow-2xs">
                    MAJOR FEATURE
                  </span>
                  <span className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    <span>Live in v2.1.0</span>
                  </span>
                </div>
                <div className="flex items-start gap-3 pt-1">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Coins size={20} />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                      Customer Savings Schemes (Pandu / Deepavali Schemes)
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      Built for Crackers, Bakeries, and Retailers: launch recurring weekly or monthly installment clubs, track customer passbooks, issue digital receipts, and automate payment collections.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Feature Highlights Grid / List */}
            <div className="space-y-2.5 pt-1">
              {/* Highlight 1: Multi-Industry Expansion */}
              {(activeTab === 'all' || activeTab === 'commerce') && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 hover:border-orange-300 dark:hover:border-orange-800 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Store size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        Universal Commercial Business Models
                      </h4>
                      <span className="text-[9.5px] px-1.5 py-0.5 rounded-md bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 font-bold shrink-0">
                        5 Industries
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                      Tailored workflows for <strong>Fashion & Boutiques</strong> (size/color matrix), <strong>Crackers & Fireworks</strong>, <strong>Wholesale & B2B</strong> (tier discounts), <strong>Bakeries & Sweets</strong>, and <strong>Restaurants, Cafés & Hotels</strong>.
                    </p>
                  </div>
                </div>
              )}

              {/* Highlight 2: Thermal POS Printing & Station Dispatch */}
              {(activeTab === 'all' || activeTab === 'pos') && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Printer size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        High-Speed Thermal POS & Multi-Station Routing
                      </h4>
                      <span className="text-[9.5px] px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold shrink-0">
                        Zero Drivers
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                      Direct 80mm & 58mm receipt printing over WebUSB, Bluetooth, and LAN with zero driver installations. Orders automatically route to billing desks, packing counters, or kitchen KOT.
                    </p>
                  </div>
                </div>
              )}

              {/* Highlight 3: WhatsApp Automation */}
              {(activeTab === 'all' || activeTab === 'schemes') && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <MessageCircle size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        Automated WhatsApp Scheme Reminders
                      </h4>
                      <span className="text-[9.5px] px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold shrink-0">
                        1 Day Before
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                      Customers automatically receive personalized WhatsApp alerts 1 day before due dates with instant UPI payment links and digital passbook balances.
                    </p>
                  </div>
                </div>
              )}

              {/* Highlight 4: Auto-Applied Discounts & 4-Step Checkout */}
              {(activeTab === 'all' || activeTab === 'commerce') && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-800 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Percent size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        Auto-Applied Discounts & 4-Step Order Pipeline
                      </h4>
                      <span className="text-[9.5px] px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold shrink-0">
                        Instant
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                      Smooth 4-step pipeline: QR scan / manual order → Auto-applied promo discounts → Multi-station routing → Instant split settlement (Cash + UPI).
                    </p>
                  </div>
                </div>
              )}

              {/* Highlight 5: Multilingual Thermal & Web Support */}
              {(activeTab === 'all' || activeTab === 'pos') && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Globe2 size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        Multilingual Printing & Authentic Brand Orange
                      </h4>
                      <span className="text-[9.5px] px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold shrink-0">
                        13+ Languages
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                      Prints itemized customer receipts in Tamil, Hindi, English, and 10+ Indic scripts, wrapped in Menukit's unified warm brand orange palette.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sticky Modal Footer Actions */}
          <div className="p-4 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
            <button
              onClick={handleClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Close
            </button>

            <button
              onClick={handlePrimaryAction}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/25 transition-all cursor-pointer active:scale-98"
            >
              <span>{isSchemeShop ? "Explore Savings Schemes" : "View Live Orders"}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
