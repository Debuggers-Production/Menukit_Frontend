import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { APP_CONFIG } from '@/config';

export interface ControlledGoogleAdProps {
  position: 'topbar' | 'bottombar';
  showAds?: boolean;
  className?: string;
  adSlotId?: string;
}

/**
 * Controlled Google AdSense Component
 * Strictly controlled by Menukit's subscription status:
 * - If shop is SUBSCRIBED (paid) -> Returns null (100% removed, zero ads).
 * - If shop is UNSUBSCRIBED (or simulation mode) -> Renders Google Ads fixed at top of screen or fixed at bottom of screen.
 * 
 * Powered purely by Google AdSense (ca-pub-3222424909905554).
 */
export const ControlledGoogleAd: React.FC<ControlledGoogleAdProps> = ({
  position,
  showAds = false,
  className = '',
  adSlotId,
}) => {
  const adRef = useRef<HTMLDivElement>(null);
  const [adSenseFilled, setAdSenseFilled] = useState(false);

  // Check if simulation mode is enabled via environment variables or runtime Docker config
  const isSimulationMode = 
    import.meta.env.VITE_FORCE_SHOW_ADS === 'true' || 
    import.meta.env.VITE_SIMULATE_SUBSCRIPTION_ENDED === 'true' ||
    APP_CONFIG.FORCE_SHOW_ADS === 'true' ||
    (typeof window !== 'undefined' && (window as any).APP_CONFIG?.FORCE_SHOW_ADS === 'true');

  const effectiveShowAds = showAds || isSimulationMode;

  const rawClientId = 
    import.meta.env.VITE_GOOGLE_ADSENSE_CLIENT_ID || 
    APP_CONFIG.GOOGLE_ADSENSE_CLIENT_ID ||
    (typeof window !== 'undefined' && (window as any).APP_CONFIG?.GOOGLE_ADSENSE_CLIENT_ID) ||
    (typeof window !== 'undefined' && (window as any).GOOGLE_ADSENSE_CLIENT_ID) || 
    'ca-pub-3222424909905554';
  const adsenseClientId = rawClientId ? (rawClientId.startsWith('ca-') ? rawClientId : `ca-${rawClientId}`) : '';

  const isLocalhost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  useEffect(() => {
    if (!effectiveShowAds || !adsenseClientId) return;

    // Load Google AdSense script dynamically if not already loaded
    if (!document.getElementById('adsense-script')) {
      const script = document.createElement('script');
      script.id = 'adsense-script';
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`;
      script.async = true;
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);
    }

    try {
      if (typeof window !== 'undefined' && (window as any).adsbygoogle) {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      }
    } catch (e) {
      // AdSense initialization error or blocked by adblock
    }

    // Check if Google AdSense actually injected an iframe after loading
    const timer = setTimeout(() => {
      if (adRef.current) {
        const hasIframe = adRef.current.querySelector('iframe');
        const ins = adRef.current.querySelector('ins');
        const status = ins?.getAttribute('data-ad-status');
        if (hasIframe || status === 'filled') {
          setAdSenseFilled(true);
        }
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [effectiveShowAds, adsenseClientId]);

  // CRITICAL: When the customer has paid for their subscription,
  // effectiveShowAds is false and we remove the ad completely from the DOM!
  if (!effectiveShowAds) {
    return null;
  }

  // 1. Production Google AdSense Unit (live filled ad)
  const realAdUnit = (
    <div ref={adRef} className={adSenseFilled ? 'w-full' : 'hidden'}>
      <ins
        className="adsbygoogle"
        style={{
          display: 'block',
          width: '100%',
          height: '46px',
          maxHeight: '50px',
        }}
        data-ad-client={adsenseClientId}
        data-ad-slot={adSlotId || (position === 'topbar' ? '1234567890' : '0987654321')}
        data-ad-format="horizontal"
        data-full-width-responsive="true"
      />
    </div>
  );

  // 2. Simulated Google Ad Preview
  // Shown on localhost, or while testing before public domain DNS approval
  const showSimulatedPreview = !adSenseFilled || isLocalhost || isSimulationMode;

  // ==========================================
  // TOP OF SCREEN FIXED GOOGLE AD
  // ==========================================
  if (position === 'topbar') {
    return (
      <aside 
        aria-label="Advertisement Banner (Top of Screen)"
        className={`fixed top-0 left-0 right-0 w-full z-[60] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800 shadow-xs select-none ${className}`}
      >
        <div className="max-w-3xl mx-auto px-3 py-1.5 flex items-center justify-between gap-2.5 h-11">
          {/* Ad Label Pill */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="font-black text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase tracking-wider border border-slate-200/60 dark:border-slate-700">
              Ad
            </span>
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hidden xs:inline">
              Google Ads
            </span>
            {isSimulationMode && (
              <span className="text-[8px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold border border-amber-300/40">
                Unsubscribed
              </span>
            )}
          </div>

          {/* Real Google Ad (production) */}
          {realAdUnit}

          {/* Simulated Google Ad preview (development/localhost) */}
          {showSimulatedPreview && (
            <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center shrink-0 font-bold text-[11px] shadow-xs">
                  G
                </div>
                <p className="text-[11px] font-medium text-slate-800 dark:text-slate-200 truncate">
                  Cloud Kitchen & Restaurant POS • Multi-Store Orders
                </p>
              </div>

              <a
                href="https://www.google.com/adsense/start/"
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-[10px] font-bold shrink-0 transition-all shadow-xs flex items-center gap-1 cursor-pointer"
              >
                <span>Visit</span>
                <ExternalLink size={9} />
              </a>
            </div>
          )}
        </div>
      </aside>
    );
  }

  // ==========================================
  // BOTTOM OF SCREEN FIXED GOOGLE AD
  // ==========================================
  return (
    <aside 
      aria-label="Advertisement Banner (Bottom of Screen)"
      className={`fixed bottom-0 left-0 right-0 w-full z-[45] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800 shadow-lg select-none ${className}`}
    >
      <div className="max-w-3xl mx-auto px-3 py-1.5 flex items-center justify-between gap-2.5 h-11">
        {/* Ad Label Pill */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="font-black text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase tracking-wider border border-slate-200/60 dark:border-slate-700">
            Ad
          </span>
          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hidden xs:inline">
            Google Ads
          </span>
          {isSimulationMode && (
            <span className="text-[8px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold border border-amber-300/40">
              Unsubscribed
            </span>
          )}
        </div>

        {/* Real Google Ad (production) */}
        {realAdUnit}

        {/* Simulated Google Ad preview (development/localhost) */}
        {showSimulatedPreview && (
          <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center shrink-0 font-bold text-[11px] shadow-xs">
                G
              </div>
              <p className="text-[11px] font-medium text-slate-800 dark:text-slate-200 truncate">
                Digital Menus & Automated Billing • Setup in 5 Mins
              </p>
            </div>

            <a
              href="https://www.google.com/adsense/start/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-[10px] font-bold shrink-0 transition-all shadow-xs flex items-center gap-1 cursor-pointer"
            >
              <span>Learn More</span>
              <ExternalLink size={9} />
            </a>
          </div>
        )}
      </div>
    </aside>
  );
};
