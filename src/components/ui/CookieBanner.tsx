import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Cookie, Shield, Check, X, Settings2, ExternalLink } from 'lucide-react';
import { Button } from './Button';

export interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
}

const STORAGE_KEY = 'menukit_cookie_consent_v1';

export function getCookieConsent(): CookiePreferences | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [preferences, setPreferences] = useState({
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    // Check if consent was already given
    const existing = getCookieConsent();
    if (!existing) {
      // Show banner after brief delay
      const timer = setTimeout(() => setIsVisible(true), 1200);
      return () => clearTimeout(timer);
    }

    // Listen for manual trigger from settings/footer
    const handleReopen = () => {
      const current = getCookieConsent();
      if (current) {
        setPreferences({
          analytics: current.analytics,
          marketing: current.marketing,
        });
      }
      setIsCustomizeOpen(true);
      setIsVisible(true);
    };

    window.addEventListener('open_cookie_preferences', handleReopen);
    return () => window.removeEventListener('open_cookie_preferences', handleReopen);
  }, []);

  const saveConsent = (analytics: boolean, marketing: boolean) => {
    const payload: CookiePreferences = {
      necessary: true,
      analytics,
      marketing,
      timestamp: new Date().toISOString(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      window.dispatchEvent(new CustomEvent('menukit_cookie_consent_updated', { detail: payload }));
    } catch (e) {
      console.error('Failed to save cookie consent', e);
    }
    setIsVisible(false);
    setIsCustomizeOpen(false);
  };

  const handleAcceptAll = () => {
    saveConsent(true, true);
  };

  const handleRejectAll = () => {
    saveConsent(false, false);
  };

  const handleSaveCustom = () => {
    saveConsent(preferences.analytics, preferences.marketing);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-6 sm:right-auto sm:max-w-xl z-50 animate-fade-in print:hidden">
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xl p-5 sm:p-6 space-y-4 text-slate-800 dark:text-slate-200">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
            <Cookie size={20} />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              Privacy & Cookie Preferences
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                DPDP & GDPR
              </span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              We use strictly necessary cookies to keep you signed in and process orders. We only use analytics and marketing cookies if you grant explicit permission.
            </p>
          </div>
        </div>

        {/* Customization Panel */}
        {isCustomizeOpen && (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-3 text-xs">
            {/* Strictly Necessary */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/60 dark:border-slate-700/60">
              <div className="space-y-0.5 pr-2">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Shield size={13} className="text-emerald-500" />
                  Strictly Necessary
                </span>
                <p className="text-[11px] text-slate-500">
                  Required for authentication, session tokens, and security. Cannot be disabled.
                </p>
              </div>
              <input
                type="checkbox"
                id="strictly_necessary_toggle"
                checked={true}
                disabled
                title="Strictly necessary cookies cannot be disabled"
                className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-slate-300 dark:border-slate-600 cursor-not-allowed opacity-90 accent-orange-600"
              />
            </div>

            {/* Performance & Analytics */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/60 dark:border-slate-700/60">
              <div className="space-y-0.5 pr-2">
                <span className="font-bold text-slate-900 dark:text-white">Performance & Analytics</span>
                <p className="text-[11px] text-slate-500">
                  Helps us understand platform usage and diagnose connection latency.
                </p>
              </div>
              <input
                type="checkbox"
                id="analytics_toggle"
                checked={preferences.analytics}
                onChange={(e) => setPreferences((p) => ({ ...p, analytics: e.target.checked }))}
                className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-slate-300 dark:border-slate-600 cursor-pointer"
              />
            </div>

            {/* Marketing & Personalization */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 pr-2">
                <span className="font-bold text-slate-900 dark:text-white">Marketing & Personalization</span>
                <p className="text-[11px] text-slate-500">
                  Allows relevant store promotions and partner discounts.
                </p>
              </div>
              <input
                type="checkbox"
                id="marketing_toggle"
                checked={preferences.marketing}
                onChange={(e) => setPreferences((p) => ({ ...p, marketing: e.target.checked }))}
                className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-slate-300 dark:border-slate-600 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Links to Privacy & Cookie details */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
          <div className="flex items-center gap-2">
            <Link to="/privacy" className="hover:text-orange-600 hover:underline">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link to="/refund-policy" className="hover:text-orange-600 hover:underline">
              Refund Policy
            </Link>
            <span>•</span>
            <Link to="/terms" className="hover:text-orange-600 hover:underline">
              Terms
            </Link>
          </div>
          {!isCustomizeOpen && (
            <button
              type="button"
              onClick={() => setIsCustomizeOpen(true)}
              className="inline-flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 cursor-pointer"
            >
              <Settings2 size={13} />
              <span>Customize</span>
            </button>
          )}
        </div>

        {/* Action Buttons - Genuine Choice with Equal Prominence */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
          {isCustomizeOpen ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCustomizeOpen(false)}
                className="rounded-xl text-xs font-bold col-span-1"
              >
                Back
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveCustom}
                className="rounded-xl text-xs font-bold col-span-2 bg-orange-600 hover:bg-orange-700 text-white"
              >
                Save Preferences
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRejectAll}
                className="rounded-xl text-xs font-bold border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Reject Non-Essential
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCustomizeOpen(true)}
                className="rounded-xl text-xs font-bold border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 hidden sm:inline-flex"
              >
                Customize
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleAcceptAll}
                className="rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white col-span-1"
              >
                Accept All
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

