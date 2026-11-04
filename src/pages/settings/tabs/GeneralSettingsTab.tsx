import React from 'react';
import { 
  Laptop, Download, CheckCircle2, Sliders, Globe, Tag, 
  Lightbulb, Package, Clock, Timer, Hash 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { APP_VERSION } from '@/config/version';
import { SYSTEM_LANGUAGES } from '@/utils/language';

const CURRENCY_OPTIONS = [
  { id: '₹', name: 'Indian Rupee (₹)' },
  { id: '$', name: 'US Dollar ($)' },
  { id: '€', name: 'Euro (€)' },
  { id: '£', name: 'British Pound (£)' },
  { id: 'AED', name: 'UAE Dirham (AED)' },
  { id: 'S$', name: 'Singapore Dollar (S$)' },
  { id: 'A$', name: 'Australian Dollar (A$)' },
  { id: 'C$', name: 'Canadian Dollar (C$)' },
  { id: 'RM', name: 'Malaysian Ringgit (RM)' },
  { id: 'SR', name: 'Saudi Riyal (SR)' },
  { id: 'QAR', name: 'Qatari Riyal (QAR)' },
  { id: 'OMR', name: 'Omani Rial (OMR)' },
  { id: 'KWD', name: 'Kuwaiti Dinar (KWD)' },
  { id: 'BHD', name: 'Bahraini Dinar (BHD)' },
  { id: 'LKR', name: 'Sri Lankan Rupee (LKR)' },
];

const LANGUAGE_OPTIONS = [
  { id: 'en', name: 'English' },
  { id: 'ta', name: 'Tamil (தமிழ்)' },
  { id: 'hi', name: 'Hindi (हिन्दी)' },
  { id: 'te', name: 'Telugu (తెలుగు)' },
  { id: 'kn', name: 'Kannada (ಕನ್ನಡ)' },
  { id: 'ml', name: 'Malayalam (മലയാളം)' },
  { id: 'es', name: 'Spanish' },
  { id: 'fr', name: 'French' },
  { id: 'ar', name: 'Arabic (العربية)' },
];

interface GeneralSettingsTabProps {
  settingsData: any;
  setSettingsData: React.Dispatch<React.SetStateAction<any>>;
  timeoutMode: string;
  setTimeoutMode: React.Dispatch<React.SetStateAction<string>>;
  isInstalled: boolean;
  promptInstall: () => void;
  setIsWhatsNewOpen: (v: boolean) => void;
  businessCategory: any;
  onSave?: () => void;
  isSaving?: boolean;
}

export const GeneralSettingsTab: React.FC<GeneralSettingsTabProps> = ({
  settingsData,
  setSettingsData,
  timeoutMode,
  setTimeoutMode,
  isInstalled,
  promptInstall,
  setIsWhatsNewOpen,
  businessCategory,
  onSave,
  isSaving,
}) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Desktop Web App Installation Card */}
      <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Laptop size={20} />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Desktop Web App</CardTitle>
                <CardDescription className="text-xs">
                  Run Menukit as a native desktop application on Windows, Mac, or Linux.
                </CardDescription>
              </div>
            </div>
            {isInstalled ? (
              <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 flex items-center gap-1.5 w-fit">
                <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                App Installed
              </span>
            ) : (
              <Button
                type="button"
                onClick={promptInstall}
                size="sm"
                className="font-bold bg-primary hover:bg-primary-600 text-white rounded-xl shadow-xs gap-1.5 cursor-pointer shrink-0 w-fit"
              >
                <Download size={14} />
                Install on Desktop
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <p className="font-bold text-slate-800 dark:text-slate-200 mb-1">⚡ Dedicated Window</p>
              <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                Opens like a native software without browser tabs and search bars.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <p className="font-bold text-slate-800 dark:text-slate-200 mb-1">🖨️ POS & Receipt Printers</p>
              <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                Direct integration with local USB and Wi-Fi thermal receipt printers.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <p className="font-bold text-slate-800 dark:text-slate-200 mb-1">🔔 Live Order Ringing</p>
              <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                Desktop notifications and continuous bell sound on incoming orders.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Regional & Currency with Interactive Live Price Tag Preview */}
      <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <Sliders size={20} />
            </div>
            <div>
              <CardTitle className="text-base font-bold">Regional & Currency</CardTitle>
              <CardDescription className="text-xs">
                Configure how prices and language are displayed across all customer storefronts and printed bills.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Currency Symbol & Format
                </label>
                <SearchableSelect
                  options={CURRENCY_OPTIONS}
                  value={settingsData.currency || '₹'}
                  onChange={(val) => setSettingsData((prev: any) => ({ ...prev, currency: val }))}
                  placeholder="Select currency..."
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Globe size={13} className="text-primary" />
                    <span>System & Store Language</span>
                  </span>
                  {settingsData.language && settingsData.language !== 'en' && (
                    <span className="text-[10px] text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  )}
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                  Translates the entire system including dashboard, orders, POS, and storefronts.
                </p>
                <SearchableSelect
                  options={SYSTEM_LANGUAGES}
                  value={settingsData.language || 'en'}
                  onChange={(val) => {
                    setSettingsData((prev: any) => ({ ...prev, language: val }));
                  }}
                  placeholder="Select system language..."
                  className="w-full"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50/80 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Show Prices to Customers</p>
                  <p className="text-[11px] text-slate-500">When disabled, prices are hidden on the digital menu</p>
                </div>
                <Switch
                  checked={settingsData.show_prices !== false}
                  onCheckedChange={(c) => setSettingsData((prev: any) => ({ ...prev, show_prices: c }))}
                />
              </div>
            </div>

            {/* Live Visual Price Tag Preview */}
            <div className="p-4 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-primary/[0.02] to-transparent flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-primary/10">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <Tag size={12} />
                    Live Price Tag Preview
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">Customer View</span>
                </div>

                <div className="mt-4 p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {businessCategory?.isFood ? 'Special Chef Dish' : 'Standard Product Item'}
                      </h4>
                      <p className="text-[10px] text-slate-400">Available on catalog</p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-black text-primary">
                        {settingsData.show_prices !== false ? `${settingsData.currency || '₹'} 240.00` : 'Price on request'}
                      </p>
                      {settingsData.wholesale_pricing_enabled && (
                        <span className="inline-block mt-0.5 text-[9px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-200/70">
                          Bulk: {settingsData.currency || '₹'} 180.00
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 mt-3 italic">
                * Formats update instantly in your customers' currency selector.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Awaiting Timeframe */}
      <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center shrink-0">
              <Clock size={20} />
            </div>
            <div>
              <CardTitle className="text-base font-bold">Payment Awaiting Timeframe</CardTitle>
              <CardDescription className="text-xs">
                How long an online payment order waits in Pending state before automatic cancellation.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Allowed Payment Window
            </label>
            <div className="flex flex-wrap gap-2">
              {[5, 10, 15, 20, 30, 45, 60].map((mins) => {
                const isSelected = timeoutMode !== 'custom' && Number(settingsData.payment_timeout_minutes ?? 15) === mins;
                return (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => {
                      setTimeoutMode(String(mins));
                      setSettingsData((prev: any) => ({ ...prev, payment_timeout_minutes: mins }));
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-primary text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {mins} mins
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setTimeoutMode('custom')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  timeoutMode === 'custom'
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                Custom
              </button>
            </div>

            {timeoutMode === 'custom' && (
              <div className="max-w-xs pt-1">
                <Input
                  type="number"
                  min={1}
                  max={180}
                  value={settingsData.payment_timeout_minutes ?? 15}
                  onChange={(e) => setSettingsData((prev: any) => ({ ...prev, payment_timeout_minutes: Number(e.target.value) || 1 }))}
                  placeholder="Minutes (e.g. 25)"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Product Serial Number & SKU */}
      <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
              <Hash size={20} />
            </div>
            <div>
              <CardTitle className="text-base font-bold">Product Serial Number & SKU</CardTitle>
              <CardDescription className="text-xs">
                Configure automatic serial numbering for menu items and inventory cataloging.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between p-3.5 bg-slate-50/80 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Auto-Generate Serial Numbers</p>
              <p className="text-[11px] text-slate-500">Automatically assigns incremental item codes (e.g. 001, 002)</p>
            </div>
            <Switch
              checked={Boolean(settingsData.auto_serial_number_enabled)}
              onCheckedChange={(c) => setSettingsData((prev: any) => ({ ...prev, auto_serial_number_enabled: c }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Prefix (Optional)
              </label>
              <Input
                type="text"
                placeholder="e.g. ITM or FW-"
                value={settingsData.serial_number_prefix || ''}
                onChange={(e) => setSettingsData((prev: any) => ({ ...prev, serial_number_prefix: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Minimum Digits (Padding)
              </label>
              <Input
                type="number"
                min={1}
                max={8}
                value={settingsData.serial_number_digits ?? 3}
                onChange={(e) => setSettingsData((prev: any) => ({ ...prev, serial_number_digits: Number(e.target.value) || 3 }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Wholesale & Multi-Tier Pricing */}
      <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <Package size={20} />
            </div>
            <div>
              <CardTitle className="text-base font-bold">Wholesale & Multi-Tier Pricing</CardTitle>
              <CardDescription className="text-xs">
                Enable dedicated B2B wholesale prices and agent multipliers on your menu items.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between p-3.5 bg-slate-50/80 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Enable Wholesale Pricing Fields</p>
              <p className="text-[11px] text-slate-500">Displays Wholesaler & Agent pricing inputs when editing dishes/items</p>
            </div>
            <Switch
              checked={Boolean(settingsData.wholesale_pricing_enabled)}
              onCheckedChange={(c) => setSettingsData((prev: any) => ({ ...prev, wholesale_pricing_enabled: c }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* App Version & Mode Card */}
      <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="font-bold text-sm text-slate-800 dark:text-slate-200">App Version & Mode</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              v{APP_VERSION} ({import.meta.env.MODE || 'production'})
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsWhatsNewOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/60 rounded-full font-bold text-xs transition-colors cursor-pointer shadow-2xs"
            >
              <Lightbulb size={13} className="text-amber-500" />
              <span>What's New</span>
            </button>
            <div className="bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-bold px-3 py-1.5 rounded-full uppercase text-[11px] border border-emerald-200 dark:border-emerald-800">
              Stable
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Bottom Save Action */}
      {onSave && (
        <div className="flex justify-end pt-4">
          <Button
            onClick={onSave}
            disabled={isSaving}
            className="font-bold bg-primary hover:bg-primary/90 text-white rounded-xl shadow-xs px-6 py-2.5 h-auto cursor-pointer"
          >
            {isSaving ? 'Saving Changes...' : 'Save General Settings'}
          </Button>
        </div>
      )}
    </div>
  );
};

