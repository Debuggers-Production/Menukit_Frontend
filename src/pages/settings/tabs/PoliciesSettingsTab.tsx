import React from 'react';
import {
  RotateCcw, CheckCircle2, AlertCircle, ShoppingBag, 
  HelpCircle, ShieldCheck, Check, Eye,
  Info, Save, UtensilsCrossed
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';

interface PoliciesSettingsTabProps {
  settingsData: any;
  setSettingsData: React.Dispatch<React.SetStateAction<any>>;
  businessCategory: any;
  onSave?: () => void;
  isSaving?: boolean;
}

export const PoliciesSettingsTab: React.FC<PoliciesSettingsTabProps> = ({
  settingsData,
  setSettingsData,
  businessCategory,
  onSave,
  isSaving,
}) => {
  return (
<div className="space-y-6 animate-in fade-in duration-300">
              {/* Live Customer Policy Badges Preview */}
              <div className="p-4 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 via-slate-50 dark:via-slate-900/50 to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-1.5 text-primary text-xs font-bold uppercase tracking-wider mb-1">
                    <CheckCircle2 size={13} />
                    <span>Live Customer Storefront Badges</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    How cancellation & replacement policies appear to customers on your public digital menu:
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {settingsData.refund_allowed ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 size={11} className="text-emerald-600" />
                      100% Refundable
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                      <AlertCircle size={11} className="text-rose-600" />
                      Non-Refundable
                    </span>
                  )}

                  {settingsData.replacement_allowed ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      <RotateCcw size={11} className="text-blue-600" />
                      Replacement Eligible
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                      Final Sale
                    </span>
                  )}
                </div>
              </div>
              {/* 1. CANCELLATION & REFUND POLICY CARD */}
              <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4 bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${settingsData.refund_allowed ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                        <RotateCcw className="w-4 h-4" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-bold">Cancellation Policy</CardTitle>
                        <CardDescription className="text-xs">Control whether order cancellation triggers automated food amount refunds to customers.</CardDescription>
                      </div>
                    </div>
                    <Switch
                      checked={settingsData.refund_allowed}
                      onCheckedChange={(checked) => {
                        setSettingsData(prev => {
                          const isDefaultOrEmpty = !prev.refund_policy_notes || 
                            prev.refund_policy_notes === 'If any item is cancelled, 100% of the food item price is refunded to your account within 5-7 business days.' ||
                            prev.refund_policy_notes === 'This store operates under a strict no-refund policy. Orders cannot be refunded upon cancellation.';
                          return {
                            ...prev,
                            refund_allowed: checked,
                            refund_policy_notes: isDefaultOrEmpty
                              ? (checked ? 'If any item is cancelled, 100% of the food item price is refunded to your account within 5-7 business days.' : 'This store operates under a strict no-refund policy. Orders cannot be refunded upon cancellation.')
                              : prev.refund_policy_notes,
                          };
                        });
                      }}
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {settingsData.refund_allowed ? (
                    <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                      <div>
                        <span className="font-semibold">Cancellation Refund Enabled:</span> When an online-paid order is cancelled (by customer or store), the food amount will be refunded automatically via payment gateway (Razorpay) and a WhatsApp refund confirmation will be sent to the customer.
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                      <div>
                        <span className="font-semibold">No Refund on Cancellation:</span> If an order is cancelled, the food amount will <strong className="underline">NOT</strong> be refunded and <strong className="underline">NO</strong> payment gateway refund or automated refund activities will be triggered. Orders are treated as non-refundable.
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Cancellation Policy Terms & Instructions (Shown to Customers)
                      </label>
                      <button
                        type="button"
                        onClick={() => setSettingsData(prev => ({
                          ...prev,
                          refund_policy_notes: settingsData.refund_allowed
                            ? 'If any item is cancelled, 100% of the food item price is refunded to your account within 5-7 business days.'
                            : 'This store operates under a strict no-refund policy. Orders cannot be refunded upon cancellation.'
                        }))}
                        className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                      >
                        Reset to Default Text
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      value={settingsData.refund_policy_notes || ''}
                      onChange={(e) => setSettingsData(prev => ({ ...prev, refund_policy_notes: e.target.value }))}
                      placeholder={settingsData.refund_allowed ? "If any item is cancelled, 100% of the food item price is refunded to your account within 5-7 business days." : "This store operates under a strict no-refund policy. Orders cannot be refunded upon cancellation."}
                      className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none font-medium leading-relaxed"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 2. REPLACEMENT POLICY CARD */}
              <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4 bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${settingsData.replacement_allowed ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-slate-500/10 text-slate-600 dark:text-slate-400'}`}>
                        <UtensilsCrossed className="w-4 h-4" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-bold">Replacement Policy</CardTitle>
                        <CardDescription className="text-xs">Set customer-facing item replacement policy. (Store staff can still perform manual replacements from admin portal).</CardDescription>
                      </div>
                    </div>
                    <Switch
                      checked={settingsData.replacement_allowed}
                      onCheckedChange={(checked) => {
                        setSettingsData(prev => {
                          const isDefaultOrEmpty = !prev.replacement_policy_notes || 
                            prev.replacement_policy_notes === 'Free replacement available for damaged or incorrect delivered items.' ||
                            prev.replacement_policy_notes === 'Item replacements are not accepted on public orders.';
                          return {
                            ...prev,
                            replacement_allowed: checked,
                            replacement_policy_notes: isDefaultOrEmpty
                              ? (checked ? 'Free replacement available for damaged or incorrect delivered items.' : 'Item replacements are not accepted on public orders.')
                              : prev.replacement_policy_notes,
                          };
                        });
                      }}
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {settingsData.replacement_allowed ? (
                    <>
                      <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                        <div>
                          <span className="font-semibold">Customer Replacements Enabled:</span> Customers will see that item replacements are available on your storefront for damaged, defective, or incorrect food items.
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Replacement Window (Days)
                          </label>
                          <Input
                            type="number"
                            min="0"
                            max="90"
                            value={settingsData.replacement_window_days ?? 0}
                            onChange={(e) => setSettingsData(prev => ({ ...prev, replacement_window_days: parseInt(e.target.value) || 0 }))}
                            placeholder="0 (Immediate / Same Day) or days"
                            className="text-xs rounded-xl"
                          />
                          <p className="text-[11px] text-slate-400">Enter 0 for same-day replacement upon delivery, or number of days.</p>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Replacement Terms & Guidelines (Shown to Customers)
                          </label>
                          <button
                            type="button"
                            onClick={() => setSettingsData(prev => ({
                              ...prev,
                              replacement_policy_notes: 'Free replacement available for damaged or incorrect delivered items.'
                            }))}
                            className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                          >
                            Reset to Default Text
                          </button>
                        </div>
                        <textarea
                          rows={3}
                          value={settingsData.replacement_policy_notes || ''}
                          onChange={(e) => setSettingsData(prev => ({ ...prev, replacement_policy_notes: e.target.value }))}
                          placeholder="Free replacement available for damaged or incorrect delivered items."
                          className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none font-medium leading-relaxed"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2.5">
                        <Info className="w-4 h-4 shrink-0 text-slate-500 mt-0.5" />
                        <div>
                          <span className="font-semibold">Customer Replacements Disabled:</span> Customers will see "No item replacements accepted" on your storefront. <strong className="text-slate-900 dark:text-white">Note:</strong> Store staff and admin can still manually replace items from the order manager if needed for customer resolution.
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Replacement Policy Terms (Shown to Customers)
                          </label>
                          <button
                            type="button"
                            onClick={() => setSettingsData(prev => ({
                              ...prev,
                              replacement_policy_notes: 'Item replacements are not accepted on public orders.'
                            }))}
                            className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                          >
                            Reset to Default Text
                          </button>
                        </div>
                        <textarea
                          rows={2}
                          value={settingsData.replacement_policy_notes || ''}
                          onChange={(e) => setSettingsData(prev => ({ ...prev, replacement_policy_notes: e.target.value }))}
                          placeholder="Item replacements are not accepted on public orders."
                          className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none font-medium leading-relaxed"
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* 3. CUSTOMER PREVIEW SUMMARY CARD */}
              <Card className="border-dashed border-2 border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <Eye className="w-3.5 h-3.5 text-primary" />
                    Customer Storefront Policy Badges Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-2.5">
                    {/* Cancellation Badge */}
                    <div className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 ${
                      settingsData.refund_allowed 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60' 
                        : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60'
                    }`}>
                      <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                      <span>{settingsData.refund_allowed ? 'Cancellation Refund Supported' : 'No Refund on Cancellation'}</span>
                    </div>

                    {/* Replacement Badge */}
                    <div className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 ${
                      settingsData.replacement_allowed 
                        ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60' 
                        : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                    }`}>
                      <UtensilsCrossed className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {settingsData.replacement_allowed 
                          ? `${settingsData.replacement_window_days ? `${settingsData.replacement_window_days}-Day ` : ''}Replacement Available` 
                          : 'No Replacements Accepted'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Bottom Action Save */}
              <div className="flex justify-end pt-2">
                <Button
                  onClick={onSave}
                  disabled={isSaving}
                  className="font-bold bg-primary text-white rounded-xl shadow-md hover:shadow-lg transition-all px-6 py-2.5"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save Policy Settings'}
                </Button>
              </div>
            </div>
  );
};
