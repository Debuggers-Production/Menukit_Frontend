import React, { useState } from 'react';
import { 
  Download, Laptop, Check, X, ShieldCheck, Zap, Printer, Bell, ExternalLink, ArrowRight, Chrome, Apple, MonitorSmartphone
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import menukitLogo from '@/assets/menukit-logo.svg';

interface DesktopInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstall?: () => void;
  isInstallable?: boolean;
}

export function DesktopInstallModal({
  isOpen,
  onClose,
  onInstall,
  isInstallable = true,
}: DesktopInstallModalProps) {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.userAgent);
  const isWindows = typeof navigator !== 'undefined' && /Win/i.test(navigator.userAgent);
  const [activeTab, setActiveTab] = useState<'windows' | 'mac'>(isMac ? 'mac' : 'windows');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" hideCloseButton className="max-w-lg p-0 overflow-hidden bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800">
      {/* Top Accent Strip */}
      <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-amber-500 to-rose-500" />

      {/* Header */}
      <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-orange-600/10 dark:bg-orange-950/50 border border-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 shadow-xs">
            <img src={menukitLogo} alt="Menukit" className="w-6 h-6 object-contain" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-tight">
              Install Menukit Desktop App
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Standalone window mode, instant USB/LAN receipt printing, and live audible order alerts.
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all cursor-pointer shrink-0"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>

      <div className="p-5 sm:p-6 space-y-4">
        {/* Key Benefits Pill Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
              <Zap size={14} />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">Dedicated Window</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">Zero browser tab clutter</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Printer size={14} />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">Thermal POS</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">Direct receipt printing</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Bell size={14} />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">Audio Chimes</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">Loud bell on new orders</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <ShieldCheck size={14} />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">Always Updated</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">Silent auto-updates</span>
            </div>
          </div>
        </div>

        {/* Redesigned Installation Instruction Card */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/50 p-4 space-y-3 shadow-2xs">
          {/* OS Switcher Tabs */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-700/60">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Laptop size={14} className="text-orange-600 dark:text-orange-400" />
              <span>Easy Browser Installation Guide</span>
            </span>

            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setActiveTab('windows')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  activeTab === 'windows'
                    ? 'bg-orange-600 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Windows / Chrome
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('mac')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  activeTab === 'mac'
                    ? 'bg-orange-600 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                macOS / Safari
              </button>
            </div>
          </div>

          {/* Step-by-Step Instructions */}
          {activeTab === 'windows' ? (
            <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-950/80 text-orange-700 dark:text-orange-300 font-black text-[10.5px] flex items-center justify-center shrink-0 mt-0.5 border border-orange-200 dark:border-orange-800/60">
                  1
                </span>
                <p className="leading-relaxed">
                  Look at the right side of your browser address bar for the <strong className="text-slate-900 dark:text-white font-bold">Install App (💻 / ⊕)</strong> icon.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-950/80 text-orange-700 dark:text-orange-300 font-black text-[10.5px] flex items-center justify-center shrink-0 mt-0.5 border border-orange-200 dark:border-orange-800/60">
                  2
                </span>
                <p className="leading-relaxed">
                  Or click <strong className="text-slate-900 dark:text-white font-bold">⋮ (Menu)</strong> ➔ <strong className="text-slate-900 dark:text-white font-bold">Cast, save, and share</strong> ➔ <strong className="text-orange-600 dark:text-orange-400 font-bold">Install Menukit...</strong>
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-950/80 text-orange-700 dark:text-orange-300 font-black text-[10.5px] flex items-center justify-center shrink-0 mt-0.5 border border-orange-200 dark:border-orange-800/60">
                  3
                </span>
                <p className="leading-relaxed">
                  Click <strong className="text-slate-900 dark:text-white font-bold">Install</strong> in the browser prompt. Menukit will launch in its own window and pin to your Taskbar.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-950/80 text-orange-700 dark:text-orange-300 font-black text-[10.5px] flex items-center justify-center shrink-0 mt-0.5 border border-orange-200 dark:border-orange-800/60">
                  1
                </span>
                <p className="leading-relaxed">
                  In Safari, click the <strong className="text-slate-900 dark:text-white font-bold">Share (⬆)</strong> button or <strong className="text-slate-900 dark:text-white font-bold">File</strong> in the top menu bar.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-950/80 text-orange-700 dark:text-orange-300 font-black text-[10.5px] flex items-center justify-center shrink-0 mt-0.5 border border-orange-200 dark:border-orange-800/60">
                  2
                </span>
                <p className="leading-relaxed">
                  Select <strong className="text-orange-600 dark:text-orange-400 font-bold">Add to Dock...</strong>
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-950/80 text-orange-700 dark:text-orange-300 font-black text-[10.5px] flex items-center justify-center shrink-0 mt-0.5 border border-orange-200 dark:border-orange-800/60">
                  3
                </span>
                <p className="leading-relaxed">
                  Click <strong className="text-slate-900 dark:text-white font-bold">Add</strong>. Launch Menukit directly from your macOS Dock or Launchpad!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          {onInstall && (
            <button
              onClick={() => {
                onInstall();
                onClose();
              }}
              className="flex-1 h-11 px-5 rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-98 text-white font-bold text-xs sm:text-sm shadow-md shadow-orange-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download size={16} />
              <span>Install Desktop App Now</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="px-5 h-11 rounded-xl font-bold text-xs sm:text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
