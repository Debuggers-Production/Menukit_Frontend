import React from 'react';
import { SettingRow } from '../components/SettingRow';
import {
  CreditCard, CheckCircle2, AlertCircle, RefreshCw, 
  Banknote, ShieldCheck, Check, Info, Landmark,
  Truck,
  UtensilsCrossed, Store, ShoppingBag, PackageCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';

interface PaymentsSettingsTabProps {
  settingsData: any;
  setSettingsData: React.Dispatch<React.SetStateAction<any>>;
  shop: any;
  user: any;
  liveRazorpayStatus?: string | null;
  businessCategory: any;
}

export const PaymentsSettingsTab: React.FC<PaymentsSettingsTabProps> = ({
  settingsData,
  setSettingsData,
  shop,
  user,
  liveRazorpayStatus,
  businessCategory,
}) => {
  return (
<div className="space-y-6 animate-in fade-in duration-300">
              <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4 bg-slate-50/50 dark:bg-slate-900/50">
                  <CardTitle className="text-base font-bold">Online Payments</CardTitle>
                  <CardDescription className="text-xs">Gateway configuration and payment settings.</CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-6">
                  {/* Gateway */}
                  <div>
                    {(() => {
                      const status = liveRazorpayStatus || shop?.settings?.razorpay_route_status;
                      const isVerified = status === 'activated' || status === 'active';
                      return (
                        <>
                          <SettingRow
                            icon={CreditCard}
                            title="Accept Online Payments via Gateway"
                            description="Master switch to accept online payments (UPI, Cards, Netbanking) across your ordering channels."
                            checked={settingsData.online_payments_enabled && isVerified}
                            onChange={(c) => {
                              if (isVerified) {
                                setSettingsData(prev => ({ ...prev, online_payments_enabled: c }));
                              }
                            }}
                            disabled={!isVerified}
                          />

                          {/* Separate channel toggles when master is enabled & verified */}
                          {isVerified && settingsData.online_payments_enabled && (
                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4 pl-2 sm:pl-4 bg-slate-50/50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 animate-fade-in">
                              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                Ordering Channels Payment Options
                              </div>

                              <SettingRow
                                icon={businessCategory.isFood ? UtensilsCrossed : Store}
                                title={businessCategory.dineInOnlinePaymentTitle}
                                description={businessCategory.dineInOnlinePaymentDesc}
                                checked={settingsData.online_payments_dinein_enabled !== false}
                                onChange={(c) => setSettingsData(prev => ({ ...prev, online_payments_dinein_enabled: c }))}
                              />

                              <SettingRow
                                icon={businessCategory.isFood ? ShoppingBag : PackageCheck}
                                title={businessCategory.takeawayOnlinePaymentTitle}
                                description={businessCategory.takeawayOnlinePaymentDesc}
                                checked={settingsData.online_payments_takeaway_enabled !== false}
                                onChange={(c) => setSettingsData(prev => ({ ...prev, online_payments_takeaway_enabled: c }))}
                              />

                              <SettingRow
                                icon={Truck}
                                title={businessCategory.deliveryOnlinePaymentTitle}
                                description={businessCategory.deliveryOnlinePaymentDesc}
                                checked={settingsData.online_payments_delivery_enabled !== false}
                                onChange={(c) => setSettingsData(prev => ({ ...prev, online_payments_delivery_enabled: c }))}
                              />
                            </div>
                          )}

                          {!isVerified && (
                            <div className="mt-2 p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 rounded-xl space-y-1 text-xs">
                              <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200">
                                <AlertCircle size={14} className="text-amber-600" />
                                <span>Verification Required</span>
                              </div>
                              <p className="text-amber-700 dark:text-amber-300">You must verify your Settlement Bank Account before accepting online payments.</p>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>

              {/* Settlement Bank */}
              <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4 bg-green-50/30 dark:bg-green-900/10">
                  <CardTitle className="text-base font-bold text-green-700 dark:text-green-500">Settlement Bank Account</CardTitle>
                  <CardDescription className="text-xs">Receive automatic payouts for online orders.</CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase mb-1 block">Beneficiary Name</label>
                      <input
                        type="text" placeholder="e.g. Siva Store"
                        value={settingsData.beneficiary_name || ''}
                        onChange={(e) => setSettingsData(prev => ({ ...prev, beneficiary_name: e.target.value }))}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 uppercase mb-1 block">Account Number</label>
                      <input
                        type="text"
                        placeholder={shop?.settings?.bank_account_last4 ? `•••• •••• ${shop.settings.bank_account_last4}` : "Account Number"}
                        value={settingsData.bank_account_number || ''}
                        onChange={(e) => setSettingsData(prev => ({ ...prev, bank_account_number: e.target.value }))}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 uppercase mb-1 block">IFSC Code</label>
                      <input
                        type="text" placeholder="e.g. HDFC0001234"
                        value={settingsData.ifsc_code || ''}
                        onChange={(e) => setSettingsData(prev => ({ ...prev, ifsc_code: e.target.value.toUpperCase() }))}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-green-500"
                      />
                    </div>
                  </div>
                  
                  {shop?.settings?.bank_account_last4 && (
                    <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-100">
                      <p className="text-xs text-green-600 font-bold">
                        ✓ Linked (ending in {shop.settings.bank_account_last4})
                      </p>
                      {(liveRazorpayStatus || shop.settings.razorpay_route_status) && (() => {
                        const status = liveRazorpayStatus || shop.settings.razorpay_route_status;
                        const isVerified = status === 'activated' || status === 'active';
                        return (
                          <div className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase ${isVerified ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {isVerified ? '✓ Verified & Active' : '⏳ Verification Pending'}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
  );
};
