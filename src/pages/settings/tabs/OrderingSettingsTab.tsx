import { toast } from 'react-hot-toast';
import React, { useState } from 'react';
import { SettingRow } from '../components/SettingRow';
import {
  ShoppingBag, UtensilsCrossed, Truck, AlertCircle, CreditCard, 
  Lock, CheckCircle2, ChevronRight, Info, Store, Clock,
  QrCode, Save, ShieldCheck, Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';

interface OrderingSettingsTabProps {
  settingsData: any;
  setSettingsData: React.Dispatch<React.SetStateAction<any>>;
  shop: any;
  liveRazorpayStatus?: string | null;
  onNavigateToPayments: () => void;
  businessCategory: any;
  onSave?: () => void;
  isSaving?: boolean;
}

export const OrderingSettingsTab: React.FC<OrderingSettingsTabProps> = ({
  settingsData,
  setSettingsData,
  shop,
  liveRazorpayStatus,
  onNavigateToPayments,
  businessCategory,
  onSave,
  isSaving,
}) => {
  const status = liveRazorpayStatus || shop?.settings?.razorpay_route_status;
  const isBankVerified = Boolean(shop?.settings?.bank_account_last4) && (status === 'activated' || status === 'active');
  const [testDistance, setTestDistance] = useState<number>(2);

  return (
<div className="space-y-6 animate-in fade-in duration-300">
                {!isBankVerified && (
                  <div className="p-4 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
                    <div className="flex items-start gap-3.5">
                      <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5">
                        <AlertCircle size={20} />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                            Bank Verification & Online Payments Notice
                          </h4>
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-amber-200/70 dark:bg-amber-900/70 text-amber-800 dark:text-amber-300">
                            Notice
                          </span>
                        </div>
                        <p className="text-xs text-amber-700 dark:text-amber-300/90 font-medium leading-relaxed max-w-2xl">
                          {!shop?.settings?.bank_account_last4
                            ? "You can enable ordering channels now! Customers can place orders and pay via Pay at Counter, Cash on Delivery, or UPI. To accept online card & gateway payments directly to your bank account, please link your settlement bank account."
                            : "Your settlement bank account details are under verification. In the meantime, ordering channels remain active with Pay at Counter, Cash on Delivery, and UPI payments. Online card payments will activate once verification is complete."}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => onNavigateToPayments()}
                      className="shrink-0 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs px-4 h-9 self-stretch sm:self-auto flex items-center justify-center gap-1.5"
                    >
                      <CreditCard size={15} />
                      <span>{!shop?.settings?.bank_account_last4 ? "Add Bank Account" : "View Bank Verification"}</span>
                    </Button>
                  </div>
                )}

                {/* 1. Ordering Channels Card */}
                <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
                  <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base font-bold">Active Ordering Channels</CardTitle>
                        <CardDescription className="text-xs">Enable the fulfillment channels available to your customers on the digital menu.</CardDescription>
                      </div>
                      {!isBankVerified && (
                        <span className="text-[11px] font-medium text-amber-700 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 px-2.5 py-1 rounded-lg flex items-center gap-1">
                          <Info size={12} />
                          Counter & Cash / UPI Active
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 divide-y divide-slate-100 dark:divide-slate-800">
                    <SettingRow
                      icon={QrCode}
                      title={businessCategory.dineInChannelLabel}
                      description={businessCategory.dineInChannelDesc}
                      checked={Boolean(settingsData.dinein_enabled)}
                      onChange={(c) => {
                        setSettingsData(prev => ({ ...prev, dinein_enabled: c }));
                      }}
                    />

                    {Boolean(settingsData.dinein_enabled) && businessCategory.isFood && (
                      <div className="ml-2 sm:ml-4 pl-3.5 border-l-2 border-amber-200 dark:border-amber-800/60 my-2 space-y-2.5 transition-all">
                        <SettingRow
                          icon={UtensilsCrossed}
                          title="Enable Table Selection (Table Numbers)"
                          description="Allow customers and staff to choose specific table numbers (Table-1, Table-2, etc.). Turn off if your restaurant does not use table numbers."
                          checked={settingsData.dinein_tables_enabled}
                          onChange={(c) => setSettingsData(prev => ({ ...prev, dinein_tables_enabled: c }))}
                        />

                        {settingsData.dinein_tables_enabled && (
                          <div className="py-3 px-4 sm:px-5 bg-amber-50/60 dark:bg-amber-950/20 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-slate-800 dark:text-slate-100">Total Dine-In Tables</span>
                                <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 rounded-md">Table-1 to Table-N</span>
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                Configure total restaurant tables. Customers and staff will choose from a structured dropdown (Table-1, Table-2, etc.).
                              </p>
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              <input
                                type="number"
                                min={1}
                                max={500}
                                value={settingsData.dinein_tables_count || 10}
                                onChange={(e) => {
                                  const val = Math.max(1, Math.min(500, parseInt(e.target.value) || 1));
                                  setSettingsData(prev => ({ ...prev, dinein_tables_count: val }));
                                }}
                                className="w-24 px-3 py-1.5 text-xs font-black bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700/60 rounded-xl text-center focus:ring-2 focus:ring-primary focus:outline-none shadow-2xs font-mono"
                              />
                              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Tables</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <SettingRow
                      icon={ShoppingBag}
                      title={businessCategory.takeawayChannelLabel}
                      description={businessCategory.takeawayChannelDesc}
                      checked={Boolean(settingsData.takeaway_enabled)}
                      onChange={(c) => {
                        setSettingsData(prev => ({ ...prev, takeaway_enabled: c }));
                      }}
                    />

                    <SettingRow
                      icon={Truck}
                      title={businessCategory.deliveryChannelLabel}
                      description={businessCategory.deliveryChannelDesc}
                      checked={Boolean(settingsData.delivery_enabled)}
                      onChange={(c) => {
                        setSettingsData(prev => ({ ...prev, delivery_enabled: c }));
                      }}
                    />

                    {!isBankVerified && (
                      <div className="p-3 bg-amber-50/70 dark:bg-amber-950/20 rounded-xl border border-amber-200/60 dark:border-amber-900/30 flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                        <Info className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                        <span>Settlement bank account verification is pending. Online card payments are currently disabled; customers will pay using Pay at Counter, Cash on Delivery, or direct UPI.</span>
                      </div>
                    )}

                    {Boolean(settingsData.delivery_enabled) && (
                      <div className="ml-2 sm:ml-4 pl-3.5 border-l-2 border-amber-200 dark:border-amber-800/60 my-2 space-y-4 transition-all">
                        <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 space-y-4">
                          <div className="flex items-center gap-2">
                            <Truck className="w-4 h-4 text-amber-500" />
                            <span className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                              Delivery Pricing & Range Rules
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
                            <div>
                              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1.5 truncate">
                                Base Cost ({settingsData.currency})
                              </label>
                              <input
                                type="number" min="0" step="1"
                                value={settingsData.base_delivery_charge !== undefined && settingsData.base_delivery_charge !== null ? settingsData.base_delivery_charge : ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setSettingsData(prev => ({ ...prev, base_delivery_charge: val === '' ? ('' as any) : Math.max(0, parseFloat(val) || 0) }));
                                }}
                                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-amber-500 font-semibold text-slate-900 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1.5 truncate">
                                Included Distance (km)
                              </label>
                              <input
                                type="number" min="0" step="0.5"
                                value={settingsData.base_delivery_distance !== undefined && settingsData.base_delivery_distance !== null ? settingsData.base_delivery_distance : ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setSettingsData(prev => ({ ...prev, base_delivery_distance: val === '' ? ('' as any) : Math.max(0, parseFloat(val) || 0) }));
                                }}
                                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-amber-500 font-semibold text-slate-900 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1.5 truncate">
                                Extra Step (km)
                              </label>
                              <input
                                type="number" min="0.1" step="0.5"
                                value={settingsData.extra_delivery_distance_step !== undefined && settingsData.extra_delivery_distance_step !== null ? settingsData.extra_delivery_distance_step : ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setSettingsData(prev => ({ ...prev, extra_delivery_distance_step: val === '' ? ('' as any) : Math.max(0.1, parseFloat(val) || 0.1) }));
                                }}
                                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-amber-500 font-semibold text-slate-900 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1.5 truncate">
                                Extra Rate ({settingsData.currency})
                              </label>
                              <input
                                type="number" min="0" step="1"
                                value={settingsData.extra_delivery_charge_per_step !== undefined && settingsData.extra_delivery_charge_per_step !== null ? settingsData.extra_delivery_charge_per_step : ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setSettingsData(prev => ({ ...prev, extra_delivery_charge_per_step: val === '' ? ('' as any) : Math.max(0, parseFloat(val) || 0) }));
                                }}
                                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-amber-500 font-semibold text-slate-900 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1.5 flex items-center justify-between gap-1">
                                <span className="truncate">Coverable Radius</span>
                                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-normal shrink-0">(0 = ∞)</span>
                              </label>
                              <input
                                type="number" min="0" step="0.5"
                                placeholder="0"
                                value={(settingsData as any).max_delivery_distance !== undefined && (settingsData as any).max_delivery_distance !== null ? (settingsData as any).max_delivery_distance : ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setSettingsData(prev => ({
                                    ...prev,
                                    max_delivery_distance: val === '' ? ('' as any) : Math.max(0, parseFloat(val) || 0)
                                  }));
                                }}
                                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-amber-500 font-semibold text-slate-900 dark:text-white"
                              />
                            </div>
                          </div>

                          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-2">
                              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 "></span> Calculation Preview
                              </span>
                              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
                                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Test Distance:</span>
                                <input
                                  type="number" min="0" step="0.5"
                                  value={testDistance}
                                  onChange={(e) => setTestDistance(Math.max(0, parseFloat(e.target.value) || 0))}
                                  className="w-14 px-1.5 py-0.5 text-xs bg-transparent border-0 text-center font-bold text-primary focus:outline-none"
                                />
                                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">km</span>
                              </div>
                            </div>
                            <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                              {(() => {
                                const dist = testDistance;
                                const baseDist = settingsData.base_delivery_distance || 0;
                                const baseCharge = settingsData.base_delivery_charge || 0;
                                const step = settingsData.extra_delivery_distance_step || 1;
                                const rate = settingsData.extra_delivery_charge_per_step || 0;
                                const maxDist = (settingsData as any).max_delivery_distance || 0;

                                if (maxDist > 0 && dist > maxDist) {
                                  return <span className="text-rose-500 font-bold">⚠️ Outside Delivery Range: Test distance ({dist} km) exceeds maximum coverable distance ({maxDist} km). Orders will be blocked.</span>;
                                }

                                if (dist <= baseDist) {
                                  return <span>Total Fee: <strong className="text-emerald-600 dark:text-emerald-400">{settingsData.currency}{baseCharge}</strong> (Within base distance).</span>;
                                }
                                const extraKm = dist - baseDist;
                                const steps = Math.ceil(extraKm / step);
                                const extraFee = steps * rate;
                                return <span>Base: <strong className="text-slate-900 dark:text-white">{settingsData.currency}{baseCharge}</strong> + Extra: <strong className="text-amber-600 dark:text-amber-400">{settingsData.currency}{extraFee}</strong> ({steps} steps) = Total: <strong className="text-emerald-600 dark:text-emerald-400 text-sm">{settingsData.currency}{baseCharge + extraFee}</strong></span>;
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 2. Order Acceptance & Payment Rules Card */}
                <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
                  <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base font-bold">Order Acceptance & Payment Rules</CardTitle>
                        <CardDescription className="text-xs">Configure how incoming orders are accepted and whether upfront customer payment is required.</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 divide-y divide-slate-100 dark:divide-slate-800">
                    <SettingRow
                      icon={ShieldCheck}
                      title="Accept Orders Only After Payment"
                      description="When enabled, online orders placed via the public menu must be paid upfront before the order is placed/confirmed. When disabled (default), the order is submitted first for merchant review and acceptance, and then payment is made."
                      checked={Boolean(settingsData.accept_after_payment)}
                      onChange={(c) => {
                        setSettingsData(prev => ({ ...prev, accept_after_payment: c }));
                      }}
                    />

                    <SettingRow
                      icon={Zap}
                      title="Auto Accept Incoming Orders"
                      description="Automatically accept and confirm incoming orders immediately without requiring manual merchant approval."
                      checked={Boolean(settingsData.auto_accept_orders)}
                      onChange={(c) => {
                        setSettingsData(prev => ({ ...prev, auto_accept_orders: c }));
                      }}
                    />
                  </CardContent>
                </Card>

                {/* Bottom Action Save */}
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={onSave}
                    disabled={isSaving}
                    className="font-bold bg-primary text-white rounded-xl shadow-md hover:shadow-lg transition-all px-6 py-2.5 cursor-pointer"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? 'Saving...' : 'Save Ordering Settings'}
                  </Button>
                </div>
              </div>
  );
};
