import React from 'react';
import {
  Receipt, CheckCircle2, AlertCircle, Info, ShieldCheck, 
  FileText, Check, Percent, FileCheck,
  Coins, Sliders, Store
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';

interface TaxSettingsTabProps {
  settingsData: any;
  setSettingsData: React.Dispatch<React.SetStateAction<any>>;
  shop: any;
  onSave?: () => void;
  isSaving?: boolean;
}

export const TaxSettingsTab: React.FC<TaxSettingsTabProps> = ({
  settingsData,
  setSettingsData,
  shop,
  onSave,
  isSaving,
}) => {
  return (
<div className="space-y-6 animate-in fade-in duration-300">
              <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4 bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base font-bold">GST & Government Compliances</CardTitle>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          Tax Invoices & FSSAI
                        </span>
                      </div>
                      <CardDescription className="text-xs mt-1">
                        Configure GSTIN, FSSAI registration, tax rates (CGST/SGST), and invoice calculation mode.
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Enable GST Billing:</span>
                      <Switch
                        checked={settingsData.gst_enabled}
                        onChange={(checked) => setSettingsData(prev => ({ ...prev, gst_enabled: checked }))}
                      />
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 sm:p-6 space-y-6">
                  {!settingsData.gst_enabled ? (
                    <div className="p-6 text-center rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
                        <Receipt size={24} />
                      </div>
                      <div className="font-bold text-sm text-slate-800 dark:text-slate-200">GST Billing is Disabled</div>
                      <p className="text-xs text-slate-500 max-w-md mx-auto">
                        Turn on the switch above if your restaurant or business is registered under GST to calculate CGST/SGST on orders, issue legal Tax Invoices, and generate tax compliance audit reports.
                      </p>
                      <Button
                        size="sm"
                        onClick={() => setSettingsData(prev => ({ ...prev, gst_enabled: true }))}
                        className="font-bold bg-primary text-white text-xs h-8 px-4"
                      >
                        Enable GST Now
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Government Registrations */}
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                          <Store size={14} className="text-primary" />
                          Business & Government Identifiers
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                              <span>Goods & Services Tax ID (GSTIN)</span>
                              <span className="text-[10px] font-normal text-slate-400">15 Characters</span>
                            </label>
                            <Input
                              placeholder="e.g. 33AAAAA0000A1Z5"
                              value={settingsData.gstin}
                              onChange={(e) => setSettingsData(prev => ({ ...prev, gstin: e.target.value.toUpperCase().trim() }))}
                              maxLength={15}
                              className="font-mono uppercase font-bold tracking-wider"
                            />
                            <p className="text-[11px] text-slate-500">
                              Appears prominently on public customer receipts and cashier bills.
                            </p>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              Legal / Registered Business Name
                            </label>
                            <Input
                              placeholder="e.g. Siva Food Enterprises Pvt Ltd"
                              value={settingsData.legal_name}
                              onChange={(e) => setSettingsData(prev => ({ ...prev, legal_name: e.target.value }))}
                            />
                            <p className="text-[11px] text-slate-500">
                              Official registered trade entity name for legal Tax Invoices.
                            </p>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                              <span>FSSAI License Number</span>
                              <span className="text-[10px] font-normal text-slate-400">14 Digits</span>
                            </label>
                            <Input
                              placeholder="e.g. 12423008000123"
                              value={settingsData.fssai_license}
                              onChange={(e) => setSettingsData(prev => ({ ...prev, fssai_license: e.target.value.trim() }))}
                              maxLength={14}
                              className="font-mono tracking-wider font-bold"
                            />
                            <p className="text-[11px] text-slate-500">
                              Mandatory Food Safety license number printed on restaurant slips.
                            </p>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              Invoice Declaration / Footer Note
                            </label>
                            <Input
                              placeholder="e.g. Tax Invoice issued under Section 31 of CGST Act"
                              value={settingsData.tax_invoice_notes}
                              onChange={(e) => setSettingsData(prev => ({ ...prev, tax_invoice_notes: e.target.value }))}
                            />
                            <p className="text-[11px] text-slate-500">
                              Custom compliance or return policy note printed at the bottom of bills.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Tax Rates Configuration */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                            <Coins size={14} className="text-primary" />
                            Tax Rates & GST Slabs
                          </h4>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] font-medium text-slate-500">Quick Slabs:</span>
                            <button
                              type="button"
                              onClick={() => setSettingsData(prev => ({ ...prev, cgst_rate: 2.5, sgst_rate: 2.5 }))}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                settingsData.cgst_rate === 2.5 && settingsData.sgst_rate === 2.5
                                  ? 'bg-primary text-white shadow-xs'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                              }`}
                            >
                              5% (Standard)
                            </button>
                            <button
                              type="button"
                              onClick={() => setSettingsData(prev => ({ ...prev, cgst_rate: 6.0, sgst_rate: 6.0 }))}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                settingsData.cgst_rate === 6.0 && settingsData.sgst_rate === 6.0
                                  ? 'bg-primary text-white shadow-xs'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                              }`}
                            >
                              12%
                            </button>
                            <button
                              type="button"
                              onClick={() => setSettingsData(prev => ({ ...prev, cgst_rate: 9.0, sgst_rate: 9.0 }))}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                settingsData.cgst_rate === 9.0 && settingsData.sgst_rate === 9.0
                                  ? 'bg-primary text-white shadow-xs'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                              }`}
                            >
                              18% (AC/Bar)
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              Central GST (CGST %)
                            </label>
                            <div className="relative">
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
                                max="28"
                                value={settingsData.cgst_rate}
                                onChange={(e) => setSettingsData(prev => ({ ...prev, cgst_rate: parseFloat(e.target.value) || 0 }))}
                                className="pr-8 font-bold"
                              />
                              <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">%</span>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              State GST (SGST %)
                            </label>
                            <div className="relative">
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
                                max="28"
                                value={settingsData.sgst_rate}
                                onChange={(e) => setSettingsData(prev => ({ ...prev, sgst_rate: parseFloat(e.target.value) || 0 }))}
                                className="pr-8 font-bold"
                              />
                              <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">%</span>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              Combined Effective Tax
                            </label>
                            <div className="h-10 flex items-center px-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 font-black text-emerald-700 dark:text-emerald-300 text-sm">
                              {((Number(settingsData.cgst_rate) || 0) + (Number(settingsData.sgst_rate) || 0)).toFixed(1)}% Total GST
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Tax Calculation Mode: Exclusive vs Inclusive */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                          <Sliders size={14} className="text-primary" />
                          Tax Pricing Calculation Mode
                        </h4>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div 
                            onClick={() => setSettingsData(prev => ({ ...prev, inclusive_tax: false }))}
                            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                              !settingsData.inclusive_tax
                                ? 'border-primary bg-primary/5 dark:bg-primary/10'
                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                                Exclusive Tax (Added at checkout)
                              </span>
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                !settingsData.inclusive_tax ? 'border-primary bg-primary text-white' : 'border-slate-300'
                              }`}>
                                {!settingsData.inclusive_tax && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              Standard for restaurants. Menu prices represent net food amount; CGST & SGST are computed and added on top in the bill.
                            </p>
                            <div className="mt-3 text-[11px] font-mono bg-slate-100 dark:bg-slate-800 p-2 rounded-lg text-slate-600 dark:text-slate-400">
                              Item: ₹100 + 5% GST (₹5) = <strong>Total ₹105</strong>
                            </div>
                          </div>

                          <div 
                            onClick={() => setSettingsData(prev => ({ ...prev, inclusive_tax: true }))}
                            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                              settingsData.inclusive_tax
                                ? 'border-primary bg-primary/5 dark:bg-primary/10'
                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                                Inclusive Tax (Included in menu price)
                              </span>
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                settingsData.inclusive_tax ? 'border-primary bg-primary text-white' : 'border-slate-300'
                              }`}>
                                {settingsData.inclusive_tax && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              Ideal for cafes & QSR. Menu prices already include GST; the invoice automatically shows the extracted net taxable amount & tax breakdown.
                            </p>
                            <div className="mt-3 text-[11px] font-mono bg-slate-100 dark:bg-slate-800 p-2 rounded-lg text-slate-600 dark:text-slate-400">
                              Item: ₹100 (Taxable ₹95.24 + GST ₹4.76) = <strong>Total ₹100</strong>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Live Status Overview Banner */}
                      <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5">
                          <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <div>
                            <span className="font-extrabold text-emerald-950 dark:text-emerald-200">
                              GST Compliance Active ({((Number(settingsData.cgst_rate) || 0) + (Number(settingsData.sgst_rate) || 0)).toFixed(1)}% Total Tax)
                            </span>
                            <div className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                              Mode: {settingsData.inclusive_tax ? 'Inclusive Pricing' : 'Exclusive (Added to Bill)'} • GSTIN: {settingsData.gstin || 'Not configured'} • FSSAI: {settingsData.fssai_license || 'Not configured'}
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={onSave}
                          disabled={isSaving}
                          className="font-bold bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 h-8 cursor-pointer"
                        >
                          {isSaving ? 'Saving...' : 'Save GST Settings'}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
                          {/* Live Thermal Receipt Slip Preview */}
              <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <Receipt size={13} />
                    Live Customer Thermal Bill Preview
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">80mm Paper Preview</span>
                </div>

                <div className="max-w-xs mx-auto p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-[11px] space-y-2 text-slate-800 dark:text-slate-200 shadow-inner">
                  <div className="text-center space-y-0.5 border-b border-dashed border-slate-300 dark:border-slate-700 pb-2">
                    <p className="font-bold text-sm tracking-wide">{shop?.name || 'My Restaurant'}</p>
                    {settingsData.gst_enabled && settingsData.gstin && (
                      <p className="text-[10px] text-slate-500">GSTIN: {settingsData.gstin}</p>
                    )}
                    {settingsData.fssai_license && (
                      <p className="text-[10px] text-slate-500">FSSAI: {settingsData.fssai_license}</p>
                    )}
                  </div>

                  <div className="space-y-1 py-1">
                    <div className="flex justify-between">
                      <span>1x Masala Dosa</span>
                      <span>{settingsData.currency || '₹'}100.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>1x Filter Coffee</span>
                      <span>{settingsData.currency || '₹'}40.00</span>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-slate-300 dark:border-slate-700 pt-1.5 space-y-0.5">
                    <div className="flex justify-between text-slate-500">
                      <span>Subtotal</span>
                      <span>{settingsData.currency || '₹'}140.00</span>
                    </div>
                    {settingsData.gst_enabled && (
                      <>
                        <div className="flex justify-between text-slate-500 text-[10px]">
                          <span>CGST ({settingsData.cgst_rate ?? 2.5}%)</span>
                          <span>{settingsData.currency || '₹'}{(140 * (Number(settingsData.cgst_rate || 2.5) / 100)).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-slate-500 text-[10px]">
                          <span>SGST ({settingsData.sgst_rate ?? 2.5}%)</span>
                          <span>{settingsData.currency || '₹'}{(140 * (Number(settingsData.sgst_rate || 2.5) / 100)).toFixed(2)}</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-300 dark:border-slate-700">
                      <span>Total Amount</span>
                      <span>
                        {settingsData.currency || '₹'}
                        {(
                          140 + 
                          (settingsData.gst_enabled && !settingsData.inclusive_tax
                            ? 140 * ((Number(settingsData.cgst_rate || 2.5) + Number(settingsData.sgst_rate || 2.5)) / 100)
                            : 0)
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {settingsData.tax_invoice_notes && (
                    <div className="text-center text-[10px] text-slate-500 border-t border-dashed border-slate-300 dark:border-slate-700 pt-2 italic">
                      "{settingsData.tax_invoice_notes}"
                    </div>
                  )}
                </div>
              </div>
</div>
  );
};
