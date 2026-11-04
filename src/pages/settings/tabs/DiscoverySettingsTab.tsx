import { toast } from 'react-hot-toast';
import { api } from '@/services/api';
import { publicCache } from '@/utils/publicCache';
import React from 'react';
import { SettingRow } from '../components/SettingRow';
import {
  MapPin, CheckCircle2, ChevronRight, Store, Lock, ArrowRight, ShieldCheck,
  EyeOff, Check
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import menukitLogo from '@/assets/menukit-logo.svg';

interface DiscoverySettingsTabProps {
  settingsData: any;
  setSettingsData: React.Dispatch<React.SetStateAction<any>>;
  discoveryDaysLeft: number;
  discoveryExpiresAt: string | null;
  isPaidDiscoveryActive: boolean;
  onOpenDiscoveryModal: () => void;
  onNavigateToShopSetup: () => void;
  onSelectFreeDiscoveryOption: () => void;
  onResetToStandardDiscovery: () => void;
  shop: any;
  setShop: (shop: any) => void;
}

export const DiscoverySettingsTab: React.FC<DiscoverySettingsTabProps> = ({
  settingsData,
  setSettingsData,
  discoveryDaysLeft,
  discoveryExpiresAt,
  isPaidDiscoveryActive,
  onOpenDiscoveryModal,
  onNavigateToShopSetup,
  onSelectFreeDiscoveryOption,
  onResetToStandardDiscovery,
  shop,
  setShop,
}) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
<Card className="border-slate-200/80 dark:border-slate-800 shadow-xs animate-in fade-in duration-300">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-bold">Public App Discovery</CardTitle>
                    <CardDescription className="text-xs">Control your visibility on the customer map and search.</CardDescription>
                  </div>
                  {/* Current Active Mode Badge */}
                  {settingsData.is_discoverable && settingsData.hide_discovery_badge ? (
                    <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 flex items-center gap-1.5 w-fit">
                      <img src={menukitLogo} alt="Menukit" className="w-3.5 h-3.5 object-contain shrink-0" />
                      Paid Discovery (₹49/mo){discoveryDaysLeft > 0 ? ` · ${discoveryDaysLeft}d left` : ''}
                    </span>
                  ) : settingsData.is_discoverable ? (
                    <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 flex items-center gap-1.5 w-fit">
                      <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                      Standard Discovery (Free)
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 flex items-center gap-1.5 w-fit">
                      <EyeOff size={13} className="shrink-0" />
                      Discovery Disabled
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-6">
                <SettingRow
                  icon={MapPin}
                  title="Enable Store Discovery"
                  description={
                    settingsData.is_discoverable && settingsData.hide_discovery_badge
                      ? `Paid mode active (${discoveryDaysLeft} days left): Shop is discoverable on public map, and 'Discover' label is hidden on your public menu & orders.`
                      : settingsData.is_discoverable
                      ? "Standard mode active: Shop is discoverable on public map, and 'Discover' label is shown on your public menu & orders."
                      : "Discovery disabled: Shop is removed from public map & search, and 'Discover' label is hidden on your menu & orders."
                  }
                  checked={settingsData.is_discoverable}
                  onChange={(checked) => {
                    if (!checked) {
                      // Smoothly turn OFF store discovery without any error
                      onSelectFreeDiscoveryOption();
                    } else {
                      // Turn ON store discovery
                      if (isPaidDiscoveryActive) {
                        const updated = {
                          ...settingsData,
                          is_discoverable: true,
                          hide_discovery_badge: true,
                          show_prices: true,
                          show_offers: true,
                          show_menus_in_discovery: true,
                        };
                        setSettingsData(updated);
                        api.put('/shops/me/settings', updated).then((res) => {
                          publicCache.clear();
                          window.dispatchEvent(new CustomEvent('menukit-shop-settings-updated', { detail: res.data }));
                          if (shop) setShop({ ...shop, settings: { ...shop.settings, ...updated } });
                          toast.success('Store discovery enabled (Shop is on public map & Discover label is hidden).');
                        }).catch((err) => {
                          toast.error(err.response?.data?.detail || 'Failed to enable discovery');
                        });
                      } else {
                        onResetToStandardDiscovery();
                      }
                    }
                  }}
                />

                {/* Option summary cards */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Discovery & Menu Label Options
                    </h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onOpenDiscoveryModal()}
                      className="text-xs h-8 cursor-pointer"
                    >
                      Change Option
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Free Option Card */}
                    <div
                      onClick={() => onOpenDiscoveryModal()}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        !settingsData.is_discoverable
                          ? 'border-purple-500 bg-purple-50/40 dark:bg-purple-950/20 ring-1 ring-purple-500'
                          : 'border-border bg-card hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <EyeOff size={14} className="text-slate-500" />
                          Option 1: Free Option
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          ₹0 Free
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Hides your shop completely from the public discovery map & search, and removes the "Discover" label from your customer menu & orders.
                      </p>
                      {!settingsData.is_discoverable && (
                        <div className="mt-2 text-[11px] font-bold text-purple-700 dark:text-purple-400 flex items-center gap-1">
                          <Check size={12} strokeWidth={3} /> Currently Active
                        </div>
                      )}
                    </div>

                    {/* Paid Option Card */}
                    <div
                      onClick={() => onOpenDiscoveryModal()}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        settingsData.is_discoverable && settingsData.hide_discovery_badge
                          ? 'border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 ring-1 ring-amber-500'
                          : 'border-border bg-card hover:border-amber-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <img src={menukitLogo} alt="Menukit" className="w-3.5 h-3.5 object-contain shrink-0" />
                          Option 2: Paid Option
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                          ₹49 / mo
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Shows your shop on public discovery map & search, but completely removes the "Discover" label from your customer menu. Included in next renewal.
                      </p>
                      {settingsData.is_discoverable && settingsData.hide_discovery_badge && (
                        <div className="mt-2 text-[11px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                          <Check size={12} strokeWidth={3} /> Currently Active {discoveryDaysLeft > 0 ? `(${discoveryDaysLeft} days left)` : ''}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
    </div>
  );
};
