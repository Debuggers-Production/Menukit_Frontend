import { Monitor, Download, Laptop, Check, X, ShieldCheck, Zap, Printer, Bell } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" className="max-w-md p-0 overflow-hidden bg-white dark:bg-slate-900">
      {/* Header Banner */}
      <div className="relative bg-gradient-to-br from-primary via-orange-600 to-amber-600 p-6 text-white overflow-hidden">
        <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-md">
              <Laptop size={26} className="text-white" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/80 bg-white/15 px-2 py-0.5 rounded-full">
                Desktop Web App
              </span>
              <h3 className="text-xl font-black mt-1 leading-tight">Install Menukit</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/30 flex items-center justify-center text-white/80 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <p className="text-xs text-white/90 mt-3 leading-relaxed">
          Install Menukit directly on your computer desktop for instant access, dedicated window mode, and faster POS operations.
        </p>
      </div>

      {/* App Advantages */}
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-primary font-bold text-xs mb-1">
              <Zap size={14} />
              <span>Instant Launch</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Opens in a dedicated distraction-free window from desktop or taskbar.</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs mb-1">
              <Printer size={14} />
              <span>Thermal POS</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Direct integration with USB and network kitchen receipt printers.</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs mb-1">
              <Bell size={14} />
              <span>Live Sounds</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Audible bell alerts when customers place new dine-in or takeaway orders.</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs mb-1">
              <ShieldCheck size={14} />
              <span>Auto Updates</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Always runs the latest version with zero manual updates needed.</p>
          </div>
        </div>

        {/* Browser specific manual hint if native prompt wasn't immediate */}
        <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
          <p className="font-bold flex items-center gap-1.5">
            <Monitor size={14} className="text-amber-600 shrink-0" />
            {isMac ? 'On macOS Safari / Chrome:' : isWindows ? 'On Windows (Chrome / Edge / Brave):' : 'Desktop Browser Installation:'}
          </p>
          <ol className="list-decimal list-inside space-y-1 text-[11px] text-amber-800 dark:text-amber-300 pl-0.5">
            {isMac ? (
              <>
                <li>Click <strong>File</strong> in the top menu bar.</li>
                <li>Select <strong>Add to Dock...</strong> or look for the Install icon in the URL bar.</li>
                <li>Launch Menukit directly from your macOS Dock.</li>
              </>
            ) : (
              <>
                <li>Look for the <strong>Install icon (💻/⊕)</strong> at the right end of the address bar.</li>
                <li>Or click <strong>⋮ (Menu)</strong> ➔ <strong>Cast, save, and share</strong> ➔ <strong>Install Menukit</strong>.</li>
                <li>Menukit will be added to your Desktop and Start Menu.</li>
              </>
            )}
          </ol>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-1">
          {onInstall && (
            <Button
              onClick={() => {
                onInstall();
                onClose();
              }}
              className="flex-1 bg-primary hover:bg-primary-600 text-white font-bold h-11 rounded-xl shadow-md gap-2 cursor-pointer"
            >
              <Download size={16} />
              <span>Install Desktop App Now</span>
            </Button>
          )}
          <Button
            variant="outline"
            onClick={onClose}
            className="px-5 h-11 rounded-xl font-semibold border-slate-200 dark:border-slate-800"
          >
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
