import { toast } from 'react-hot-toast';
import { usePrinterStore } from '@/store/usePrinterStore';
import React from 'react';
import {
  Printer, Plus, Trash2, Edit2, UtensilsCrossed, ShoppingBag, 
  Receipt, Wifi, Usb, Bluetooth, Layers, Terminal, Copy, Volume2, 
  CheckCircle2, AlertCircle, Info, RefreshCw, Check, Scissors,
  FileText, Tags, Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { PrinterStation, BillingPrinterConfig, BillingPrinter } from '@/store/usePrinterStore';
import { BILL_LANGUAGES } from '@/utils/billTranslations';

interface PrinterSettingsTabProps {
  printerSection: 'all' | 'kot' | 'billing';
  setPrinterSection: (s: 'all' | 'kot' | 'billing') => void;
  stations: PrinterStation[];
  billingPrinters: BillingPrinter[];
  primaryBillingPrinter?: BillingPrinter;
  paperWidth: '58mm' | '80mm';
  setPaperWidth: (w: '58mm' | '80mm') => void;
  autoPrintOnAccept: boolean;
  setAutoPrintOnAccept: (v: boolean) => void;
  bridgeStatus: any;
  setBridgeStatus: (s: any) => void;
  pairedUsbName: string | null;
  pairedBtName: string | null;
  btPermissionBlocked: boolean;
  setBtPermissionBlocked: (v: boolean) => void;
  isTestingBt: boolean;
  isPairingUsb: boolean;
  categories: any[];
  onOpenStationModal: (station?: PrinterStation) => void;
  onDeleteStation: (id: string) => void;
  onOpenBillingPrinterModal: (printer?: BillingPrinter) => void;
  onDeleteBillingPrinter: (id: string) => void;
  onTestStation: (station: PrinterStation) => void;
  onTestBillingPrinter: (printer: BillingPrinter) => void;
  onTestBluetoothSlip: (name: string, width: '58mm' | '80mm') => void;
  onPairBillingPrinterUsb: () => void;
  onPairBillingPrinterBt: () => void;
  businessCategory: any;
}

export const PrinterSettingsTab: React.FC<PrinterSettingsTabProps> = ({
  printerSection,
  setPrinterSection,
  stations,
  billingPrinters,
  primaryBillingPrinter,
  paperWidth,
  setPaperWidth,
  autoPrintOnAccept,
  setAutoPrintOnAccept,
  bridgeStatus,
  setBridgeStatus,
  pairedUsbName,
  pairedBtName,
  btPermissionBlocked,
  setBtPermissionBlocked,
  isTestingBt,
  isPairingUsb,
  categories,
  onOpenStationModal,
  onDeleteStation,
  onOpenBillingPrinterModal,
  onDeleteBillingPrinter,
  onTestStation,
  onTestBillingPrinter,
  onTestBluetoothSlip,
  onPairBillingPrinterUsb,
  onPairBillingPrinterBt,
  businessCategory,
}) => {
  const {
    updateStation,
    updateBillingPrinter,
    setDefaultBillingPrinter,
    autoPrintOnPayment,
    setAutoPrintOnPayment,
  } = usePrinterStore();

  const [quickAssignStation, setQuickAssignStation] = React.useState<PrinterStation | null>(null);
  const [quickAssignCategoryIds, setQuickAssignCategoryIds] = React.useState<string[]>([]);
  const [categorySearchQuery, setCategorySearchQuery] = React.useState('');

  const openNewStationModal = () => onOpenStationModal();
  const openNewBillingPrinterModal = () => onOpenBillingPrinterModal();
  const handleTestPrint = (station?: PrinterStation) => {
    const target = station || stations[0];
    if (target) onTestStation(target);
    else onOpenStationModal();
  };
  const handleTestBillPrint = () => {
    if (primaryBillingPrinter) onTestBillingPrinter(primaryBillingPrinter);
    else if (billingPrinters[0]) onTestBillingPrinter(billingPrinters[0]);
    else onOpenBillingPrinterModal();
  };
  const handleTestSpecificBillPrint = (printer: BillingPrinter) => {
    onTestBillingPrinter(printer);
  };

  return (
<div className="space-y-6 animate-in fade-in duration-300">
              {/* Context Selector / Quick Filter Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2 sm:p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setPrinterSection('all')}
                    className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      printerSection === 'all'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Layers size={13} />
                    <span>All Setup</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrinterSection('kot')}
                    className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      printerSection === 'kot'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {businessCategory.isFood ? <UtensilsCrossed size={13} /> : <ShoppingBag size={13} />}
                    <span>{businessCategory.kotTabLabel} ({stations.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrinterSection('billing')}
                    className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      printerSection === 'billing'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Receipt size={13} />
                    <span>{businessCategory.billingTabLabel} ({billingPrinters.length})</span>
                  </button>
                </div>
              </div>

              {/* =========================================================
                  SECTION 1: KITCHEN / PACKING ORDER TICKETS (KOT / POT)
              ========================================================= */}
              {(printerSection === 'all' || printerSection === 'kot') && (
                <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
                  <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4 bg-linear-to-r from-amber-50/70 via-orange-50/30 to-transparent dark:from-amber-950/20 dark:via-orange-950/10 dark:to-transparent flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                        {businessCategory.isFood ? <UtensilsCrossed size={20} /> : <ShoppingBag size={20} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-base font-bold">{businessCategory.productionStationLabel}</CardTitle>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                            {businessCategory.kotShort} Station
                          </span>
                        </div>
                        <CardDescription className="text-xs mt-0.5">
                          {businessCategory.productionPrinterDesc}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTestPrint()}
                        leftIcon={<FileText size={13} className="text-amber-500" />}
                        className="text-xs font-bold"
                      >
                        {businessCategory.testKotButtonLabel}
                      </Button>
                      <Button
                        size="sm"
                        onClick={openNewStationModal}
                        leftIcon={<Plus size={14} />}
                        className="bg-primary text-white font-bold text-xs shadow-xs"
                      >
                        {businessCategory.addKotStationButtonLabel}
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 sm:p-5 space-y-5">
                    {/* Auto-Print KOT Switch */}
                    <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                          <Zap size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {businessCategory.autoPrintKotLabel}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {businessCategory.autoPrintKotDesc}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={autoPrintOnAccept}
                        onChange={(val) => {
                          setAutoPrintOnAccept(val);
                          toast.success(val ? `Auto-print ${businessCategory.kotShort} enabled` : `Auto-print ${businessCategory.kotShort} disabled`);
                        }}
                      />
                    </div>

                    {/* Kitchen Printer Stations Subsection */}
                    <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                            {businessCategory.productionStationLabel}
                          </label>
                          <p className="text-[11px] text-slate-500">
                            {businessCategory.productionPrinterDesc}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                          {stations.length} {stations.length === 1 ? 'Station Configured' : 'Stations Configured'}
                        </span>
                      </div>

                      {stations.length === 0 ? (
                        <div className="text-center py-8 bg-slate-50 dark:bg-slate-850/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-5 space-y-2.5">
                          <Printer size={32} className="mx-auto text-slate-400" />
                          <div>
                            <p className="font-bold text-sm text-slate-700 dark:text-slate-300">{businessCategory.noKotStationsTitle}</p>
                            <p className="text-xs text-slate-500 mt-0.5 max-w-md mx-auto">
                              {businessCategory.isFood
                                ? 'Add your first station (e.g., Main Kitchen, Bar, Tandoor) to automatically route specific food categories.'
                                : 'Add your first station (e.g., Main Godown, Counter 1, Dispatch Desk) to automatically route items.'}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={openNewStationModal}
                            leftIcon={<Plus size={14} />}
                            className="font-bold"
                          >
                            {businessCategory.addKotStationButtonLabel}
                          </Button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          {stations.map((station) => {
                            const isUniversal = !station.categoryIds || station.categoryIds.includes('all') || station.categoryIds.length === 0;
                            const matchedCategories = !isUniversal 
                              ? categories.filter(c => station.categoryIds.includes(c.id))
                              : [];

                            return (
                              <div
                                key={station.id}
                                className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between space-y-2.5 ${
                                  station.enabled !== false
                                    ? 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs'
                                    : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/40 dark:border-slate-800/40 opacity-70'
                                }`}
                              >
                                <div className="space-y-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="space-y-0.5">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="font-black text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                          <Printer size={15} className="text-primary" />
                                          {station.name}
                                        </h4>
                                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                          {station.paperWidth || '80mm'}
                                        </span>
                                        {station.connectionType === 'network' && (
                                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                                            <Wifi size={10} /> LAN {station.ipAddress || 'No IP'}
                                          </span>
                                        )}
                                        {station.connectionType === 'usb' && (
                                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border border-teal-200 dark:border-teal-800 flex items-center gap-1">
                                            <Usb size={10} /> Direct USB
                                          </span>
                                        )}
                                        {station.connectionType === 'bluetooth' && (
                                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                                            <Bluetooth size={10} /> Direct Bluetooth
                                          </span>
                                        )}
                                        {(!station.connectionType || station.connectionType === 'browser') && (
                                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                                            🖥️ System Default
                                          </span>
                                        )}
                                        {station.soundBuzzer !== false && (
                                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded text-amber-600 dark:text-amber-400 flex items-center gap-0.5" title="Kitchen Buzzer Alert Active">
                                            <Volume2 size={11} />
                                          </span>
                                        )}
                                        {station.enabled === false && (
                                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                                            Disabled
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => handleTestPrint(station)}
                                        title="Send Test Print to this Station"
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                      >
                                        <Printer size={14} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => onOpenStationModal(station)}
                                        title="Edit Station"
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                      >
                                        <Edit2 size={14} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (confirm(`Remove printer station "${station.name}"?`)) {
                                            onDeleteStation(station.id);
                                            toast.success('Station removed');
                                          }
                                        }}
                                        title="Delete Station"
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Category routing badges */}
                                  <div className="pt-0.5">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                                        Routing Categories:
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setQuickAssignStation(station);
                                          setQuickAssignCategoryIds(station.categoryIds || ['all']);
                                          setCategorySearchQuery('');
                                        }}
                                        className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:underline cursor-pointer"
                                        title="Choose & assign multiple categories to this printer"
                                      >
                                        <Tags size={12} />
                                        <span>Assign Categories</span>
                                      </button>
                                    </div>
                                    {isUniversal ? (
                                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                                        <Zap size={12} className="text-purple-600" />
                                        <span>{businessCategory.routingDesc}</span>
                                      </div>
                                    ) : (
                                      <div className="flex flex-wrap gap-1">
                                        {matchedCategories.length > 0 ? (
                                          matchedCategories.map((c) => (
                                            <span
                                              key={c.id}
                                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60"
                                            >
                                              {c.name}
                                            </span>
                                          ))
                                        ) : (
                                          <span className="text-[11px] text-slate-400 italic">
                                            {station.categoryIds.length} categories assigned
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                                  <span className="text-slate-500 font-medium text-[11px]">
                                    Auto-print: <strong className={station.autoPrintOnAccept !== false ? 'text-emerald-600' : 'text-slate-400'}>{station.autoPrintOnAccept !== false ? 'Active' : 'Off'}</strong>
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => updateStation(station.id, { enabled: station.enabled === false ? true : false })}
                                    className="h-6 text-[11px] font-bold text-slate-600 dark:text-slate-300 px-2"
                                  >
                                    {station.enabled === false ? 'Enable' : 'Disable'}
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* =========================================================
                  SECTION 2: CASHIER & CUSTOMER BILL PRINTERS
              ========================================================= */}
              {(printerSection === 'all' || printerSection === 'billing') && (
                <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
                  <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3.5 bg-linear-to-r from-emerald-50/70 via-teal-50/30 to-transparent dark:from-emerald-950/20 dark:via-teal-950/10 dark:to-transparent flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Receipt size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-base font-bold">{businessCategory.billingHeaderTitle}</CardTitle>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            {businessCategory.billingStationBadge}
                          </span>
                        </div>
                        <CardDescription className="text-xs mt-0.5">
                          {businessCategory.billingHeaderDesc}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleTestBillPrint}
                        leftIcon={<Printer size={13} className="text-emerald-600" />}
                        className="text-xs font-bold border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                      >
                        {businessCategory.testBillButtonLabel}
                      </Button>
                      <Button
                        size="sm"
                        onClick={openNewBillingPrinterModal}
                        leftIcon={<Plus size={14} />}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
                      >
                        {businessCategory.addBillingPrinterButtonLabel}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-5 space-y-5">
                    {/* Auto-Print Bill Switch */}
                    <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                          <Zap size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {businessCategory.autoPrintBillLabel}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {businessCategory.autoPrintBillDesc}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={autoPrintOnPayment || false}
                        onChange={(val) => {
                          setAutoPrintOnPayment(val);
                          toast.success(val ? 'Auto-print bill enabled' : 'Auto-print bill disabled');
                        }}
                      />
                    </div>

                    {/* Cashier Billing Printers Subsection */}
                    <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                            {businessCategory.billingStationLabel}
                          </label>
                          <p className="text-[11px] text-slate-500">
                            {businessCategory.billingPrinterDesc}
                          </p>
                        </div>
                        <span className="text-[11px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                          {billingPrinters.length} {billingPrinters.length === 1 ? 'Printer' : 'Printers'} Configured
                        </span>
                      </div>

                      {billingPrinters.length === 0 ? (
                        <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                          <Receipt className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{businessCategory.noBillingPrintersTitle}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">Click below to register your first billing printer.</p>
                          <Button
                            size="sm"
                            onClick={openNewBillingPrinterModal}
                            leftIcon={<Plus size={14} />}
                            className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                          >
                            {businessCategory.addBillingPrinterButtonLabel}
                          </Button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          {billingPrinters.map((printer) => (
                            <div
                              key={printer.id}
                              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                                printer.enabled === false
                                  ? 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 opacity-60'
                                  : 'border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/70 shadow-xs hover:border-emerald-300 dark:hover:border-emerald-800'
                              }`}
                            >
                              <div className="space-y-2.5">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <Receipt size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                                      <h5 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                                        {printer.name}
                                      </h5>
                                    </div>

                                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                        {printer.paperWidth || '80mm'}
                                      </span>
                                      {printer.connectionType === 'network' && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                                          <Wifi size={10} /> LAN {printer.ipAddress}:{printer.port || 9100}
                                        </span>
                                      )}
                                      {printer.connectionType === 'usb' && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border border-teal-200 dark:border-teal-800 flex items-center gap-1">
                                          <Usb size={10} /> Direct USB
                                        </span>
                                      )}
                                      {printer.connectionType === 'bluetooth' && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                                          <Bluetooth size={10} /> Direct Bluetooth
                                        </span>
                                      )}
                                      {(!printer.connectionType || printer.connectionType === 'browser') && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                                          🖥️ System Default
                                        </span>
                                      )}
                                      {printer.isDefault && (
                                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                          Default Bill Printer
                                        </span>
                                      )}
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                                        🌐 {BILL_LANGUAGES.find(l => l.id === (printer.language || 'store'))?.name.split(' (')[0] || 'Store Language'}
                                      </span>
                                      {printer.enabled === false && (
                                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                                          Disabled
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleTestSpecificBillPrint(printer)}
                                      title="Send Test Bill Print to this Printer"
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    >
                                      <Printer size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onOpenBillingPrinterModal(printer)}
                                      title="Edit Cashier Printer"
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (billingPrinters.length <= 1) {
                                          toast.error('You must have at least one cashier billing printer.');
                                          return;
                                        }
                                        if (confirm(`Remove cashier printer "${printer.name}"?`)) {
                                          onDeleteBillingPrinter(printer.id);
                                          toast.success('Cashier printer removed');
                                        }
                                      }}
                                      title="Delete Printer"
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>

                                <div className="pt-0.5">
                                  {printer.isDefault ? (
                                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                                      <Check size={12} strokeWidth={3} />
                                      <span>Primary Counter (Default target for quick bill print &amp; auto-printing)</span>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setDefaultBillingPrinter(printer.id);
                                        toast.success(`"${printer.name}" set as default bill printer`);
                                      }}
                                      className="text-[11px] font-bold text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline cursor-pointer"
                                    >
                                      ★ Set as Primary Bill Printer
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                                <span className="text-slate-500 font-medium text-[11px]">
                                  Auto-print: <strong className={printer.enabled !== false && autoPrintOnPayment ? 'text-emerald-600' : 'text-slate-400'}>{printer.enabled !== false && autoPrintOnPayment ? 'Active' : 'Off'}</strong>
                                </span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => updateBillingPrinter(printer.id, { enabled: printer.enabled === false ? true : false })}
                                  className="h-6 text-[11px] font-bold text-slate-600 dark:text-slate-300 px-2"
                                >
                                  {printer.enabled === false ? 'Enable' : 'Disable'}
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
  );
};
