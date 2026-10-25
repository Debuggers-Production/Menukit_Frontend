import React from 'react';
import { useWsStore } from '@/store/wsStore';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { cn } from '@/utils/cn';

interface WsConnectionTrackerProps {
  className?: string;
  showTextOnMobile?: boolean;
}

export const WsConnectionTracker: React.FC<WsConnectionTrackerProps> = ({
  className,
  showTextOnMobile = false,
}) => {
  const { status, latencyMs, requestReconnect, reconnectCount } = useWsStore();

  const handleManualReconnect = (e: React.MouseEvent) => {
    e.stopPropagation();
    requestReconnect();
  };

  if (status === 'connected') {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold select-none transition-all",
          "bg-emerald-50/90 hover:bg-emerald-100/90 text-emerald-700 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 shadow-2xs cursor-pointer",
          className
        )}
        title={`Live WebSocket Stream Active${latencyMs !== null ? ` (${latencyMs}ms latency)` : ''}. Screen Wake Guard is Active.`}
        onClick={handleManualReconnect}
      >
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className={cn("text-[11px] font-bold tracking-tight", !showTextOnMobile && "hidden sm:inline")}>
          Live
        </span>
        {latencyMs !== null && (
          <span className="hidden md:inline text-[9px] font-mono text-emerald-600/80 dark:text-emerald-400/80">
            {latencyMs}ms
          </span>
        )}
      </div>
    );
  }

  if (status === 'connecting' || status === 'reconnecting') {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold select-none transition-all",
          "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shadow-2xs animate-pulse cursor-wait",
          className
        )}
        title={`Connecting to order stream... (Attempt ${reconnectCount + 1})`}
      >
        <RefreshCw size={11} className="animate-spin text-amber-600 dark:text-amber-400 shrink-0" />
        <span className={cn("text-[11px] font-bold tracking-tight", !showTextOnMobile && "hidden sm:inline")}>
          {status === 'reconnecting' ? 'Reconnecting...' : 'Connecting...'}
        </span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleManualReconnect}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold select-none transition-all cursor-pointer",
        "bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:hover:bg-rose-900/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800 shadow-2xs hover:scale-105 active:scale-95",
        className
      )}
      title="Disconnected from live notifications. Click to reconnect immediately."
    >
      <WifiOff size={11} className="text-rose-600 dark:text-rose-400 shrink-0" />
      <span className={cn("text-[11px] font-bold tracking-tight", !showTextOnMobile && "hidden sm:inline")}>
        Offline · Tap to Reconnect
      </span>
    </button>
  );
};
