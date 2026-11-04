import { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { 
  Banknote, 
  QrCode, 
  CreditCard, 
  ExternalLink, 
  Split, 
  Check, 
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  Percent,
  Coins
} from 'lucide-react';
import toast from 'react-hot-toast';

interface PaymentModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any | null;
  currencySymbol?: string;
  onConfirm: (orderId: string, paymentStatus: string, paymentMethod: string, splitPayments?: any[]) => Promise<void>;
}

export function PaymentModeModal({
  isOpen,
  onClose,
  order,
  currencySymbol = '₹',
  onConfirm,
}: PaymentModeModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<string>('cash');
  
  // Cash Tendered & Change assistant
  const [cashTendered, setCashTendered] = useState<string>('');

  // Split payment amounts
  const [splitCash, setSplitCash] = useState<string>('');
  const [splitUpi, setSplitUpi] = useState<string>('');
  const [splitCard, setSplitCard] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const orderTotal = Number(order?.total_amount || 0);

  // Initialize defaults on modal open
  useEffect(() => {
    if (isOpen && order) {
      const initialMethod = order.payment_method || 'cash';
      setSelectedMethod(initialMethod);
      setCashTendered(orderTotal > 0 ? String(orderTotal) : '');

      if (initialMethod === 'split' && order.split_payments?.length) {
        const cashObj = order.split_payments.find((p: any) => p.method === 'cash');
        const upiObj = order.split_payments.find((p: any) => p.method === 'upi');
        const cardObj = order.split_payments.find((p: any) => p.method === 'card');
        setSplitCash(cashObj ? String(cashObj.amount) : '');
        setSplitUpi(upiObj ? String(upiObj.amount) : '');
        setSplitCard(cardObj ? String(cardObj.amount) : '');
      } else {
        const half = Math.round((orderTotal / 2) * 100) / 100;
        const rem = Math.round((orderTotal - half) * 100) / 100;
        setSplitCash(half > 0 ? String(half) : '');
        setSplitUpi(rem > 0 ? String(rem) : '');
        setSplitCard('');
      }
    }
  }, [isOpen, order, orderTotal]);

  // Numbers & split balance validation
  const numCash = parseFloat(splitCash) || 0;
  const numUpi = parseFloat(splitUpi) || 0;
  const numCard = parseFloat(splitCard) || 0;
  const splitTotal = Math.round((numCash + numUpi + numCard) * 100) / 100;
  const diff = Math.round((orderTotal - splitTotal) * 100) / 100;
  const isSplitValid = Math.abs(diff) < 0.05 && splitTotal > 0;

  // Cash change calculation
  const numTendered = parseFloat(cashTendered) || 0;
  const changeToReturn = Math.max(0, Math.round((numTendered - orderTotal) * 100) / 100);

  // Quick cash note options based on order total
  const quickCashPresets = useMemo(() => {
    if (orderTotal <= 0) return [];
    const notes = [100, 200, 500, 1000, 2000];
    const suggestions: number[] = [orderTotal];
    
    for (const note of notes) {
      if (note > orderTotal && !suggestions.includes(note)) {
        suggestions.push(note);
      }
      if (suggestions.length >= 4) break;
    }
    const next100 = Math.ceil(orderTotal / 100) * 100;
    if (next100 > orderTotal && !suggestions.includes(next100)) {
      suggestions.push(next100);
    }
    return Array.from(new Set(suggestions)).sort((a, b) => a - b).slice(0, 4);
  }, [orderTotal]);

  // Split Fill Remaining handler
  const handleFillRemaining = (target: 'cash' | 'upi' | 'card') => {
    const currentWithoutTarget = (target === 'cash' ? 0 : numCash) + 
                                 (target === 'upi' ? 0 : numUpi) + 
                                 (target === 'card' ? 0 : numCard);
    const needed = Math.max(0, Math.round((orderTotal - currentWithoutTarget) * 100) / 100);
    const neededStr = needed > 0 ? needed.toFixed(2) : '';

    if (target === 'cash') setSplitCash(neededStr);
    if (target === 'upi') setSplitUpi(neededStr);
    if (target === 'card') setSplitCard(neededStr);
  };

  // 50/50 Split preset
  const handleSplit5050 = () => {
    const half = Math.round((orderTotal / 2) * 100) / 100;
    const rem = Math.round((orderTotal - half) * 100) / 100;
    setSplitCash(String(half));
    setSplitUpi(String(rem));
    setSplitCard('');
  };

  // Reset split
  const handleResetSplit = () => {
    setSplitCash('');
    setSplitUpi('');
    setSplitCard('');
  };

  // Submission handler
  const handleConfirm = async () => {
    if (selectedMethod === 'split') {
      if (!isSplitValid) {
        toast.error(`Split total (${currencySymbol}${splitTotal.toFixed(2)}) must equal bill total (${currencySymbol}${orderTotal.toFixed(2)})`);
        return;
      }
      const splitList: any[] = [];
      if (numCash > 0) splitList.push({ method: 'cash', amount: numCash });
      if (numUpi > 0) splitList.push({ method: 'upi', amount: numUpi });
      if (numCard > 0) splitList.push({ method: 'card', amount: numCard });

      setIsSubmitting(true);
      try {
        await onConfirm(order.id, 'paid', 'split', splitList);
        onClose();
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(order.id, 'paid', selectedMethod);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Keyboard shortcut support (1-5 for methods, Enter to confirm, Esc to close)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Enter' && !isSubmitting) {
        if (selectedMethod !== 'split' || isSplitValid) {
          e.preventDefault();
          handleConfirm();
        }
        return;
      }

      if (!isInput) {
        if (e.key === '1' || e.key.toLowerCase() === 'c') setSelectedMethod('cash');
        if (e.key === '2' || e.key.toLowerCase() === 'u') setSelectedMethod('upi');
        if (e.key === '3') setSelectedMethod('card');
        if (e.key === '4') setSelectedMethod('online');
        if (e.key === '5' || e.key.toLowerCase() === 's') setSelectedMethod('split');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedMethod, isSplitValid, isSubmitting, orderTotal]);

  if (!isOpen || !order) return null;

  const paymentOptions = [
    {
      id: 'cash',
      label: 'Cash',
      shortcut: '1',
      subtext: 'Direct counter cash',
      icon: Banknote,
    },
    {
      id: 'upi',
      label: 'UPI / QR',
      shortcut: '2',
      subtext: 'GPay, PhonePe, Paytm',
      icon: QrCode,
    },
    {
      id: 'card',
      label: 'Card POS',
      shortcut: '3',
      subtext: 'Swipe/Tap terminal',
      icon: CreditCard,
    },
    {
      id: 'online',
      label: 'Online Gateway',
      shortcut: '4',
      subtext: 'Razorpay payment link',
      icon: ExternalLink,
    },
    {
      id: 'split',
      label: 'Split Payment',
      shortcut: '5',
      subtext: 'Divide across channels',
      icon: Split,
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Order Payment"
      className="max-w-xl sm:max-w-2xl w-full rounded-2xl shadow-xl p-0 overflow-hidden border border-slate-200 dark:border-slate-800"
      footer={
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
          {/* Keyboard Helper chips */}
          <div className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300">1-5</span>
            <span>Method</span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300">Enter ↵</span>
            <span>Confirm</span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300">Esc</span>
            <span>Close</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl px-4 py-2 font-bold cursor-pointer text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              isLoading={isSubmitting}
              disabled={selectedMethod === 'split' && !isSplitValid}
              className="rounded-xl px-5 py-2 font-black bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-xs cursor-pointer text-xs sm:text-sm active:scale-98 transition-all"
            >
              <Check size={16} className="stroke-[3]" />
              <span>Mark as Paid ({currencySymbol}{orderTotal.toFixed(2)})</span>
            </Button>
          </div>
        </div>
      }
    >
      <div className="p-4 sm:p-6 space-y-4">
        {/* 1. Structured Order & Financial Summary Box */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/90 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-800 dark:text-slate-200">
                ORDER #{order.order_number || order.id?.slice(-4) || '—'}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-[10px] font-extrabold text-amber-700 dark:text-amber-300 uppercase tracking-wide">
                {order.order_type || 'DINE_IN'}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              {order.customer_name || 'Walk-in Customer'}
              {order.customer_phone ? ` • ${order.customer_phone}` : ''}
            </p>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              Total Payable
            </span>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {currencySymbol}{orderTotal.toFixed(2)}
            </span>
          </div>
        </div>

        {/* 2. Structured Payment Method Selection Grid */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Select Payment Method Received <span className="text-rose-500">*</span>
            </span>
            <span className="text-[10px] text-slate-400 hidden sm:inline">
              Press 1-5 to switch
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {paymentOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = selectedMethod === opt.id;

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedMethod(opt.id)}
                  className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between relative group ${
                    isSelected
                      ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-xs ring-1 ring-primary/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-primary text-white shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:text-primary group-hover:bg-primary/10'
                    }`}>
                      <Icon size={16} />
                    </div>

                    <span className={`text-[10px]  font-bold px-1.5 py-0.5 rounded border transition-colors ${
                      isSelected
                        ? 'bg-primary/15 border-primary/30 text-primary'
                        : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                    }`}>
                      {opt.shortcut}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-1">
                      <p className={`text-xs font-bold leading-tight ${
                        isSelected ? 'text-primary' : 'text-slate-800 dark:text-slate-200'
                      }`}>
                        {opt.label}
                      </p>
                      {isSelected && <Check size={12} className="text-primary stroke-[3]" />}
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {opt.subtext}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. CASH ASSISTANT BOX (When Cash is Selected) */}
        {selectedMethod === 'cash' && (
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Coins size={14} className="text-emerald-600" />
                <span>Cash Tendered & Change Assistant</span>
              </span>
              {changeToReturn > 0 && (
                <span className="text-xs font-black px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  Return Change: {currencySymbol}{changeToReturn.toFixed(2)}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                  Cash Amount Tendered
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">{currencySymbol}</span>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value)}
                    placeholder={orderTotal.toFixed(2)}
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-primary shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                  Quick Note Presets
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {quickCashPresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCashTendered(String(preset))}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border  font-bold cursor-pointer transition-all ${
                        numTendered === preset
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      {preset === orderTotal ? 'Exact' : `${currencySymbol}${preset}`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. SPLIT PAYMENT STRUCTURED BOX (When Split is Selected) */}
        {selectedMethod === 'split' && (
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-3.5">
            {/* Split Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Split size={15} className="text-primary" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Split Amount Allocation
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSplit5050}
                  className="text-[11px] font-bold px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                >
                  50 / 50 Split
                </button>
                <button
                  type="button"
                  onClick={handleResetSplit}
                  className="text-[11px] font-bold px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                >
                  Reset
                </button>
                <span className={`text-xs  font-black px-2.5 py-1 rounded-lg border ${
                  isSplitValid
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                }`}>
                  {currencySymbol}{splitTotal.toFixed(2)} / {currencySymbol}{orderTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Segmented Distribution Bar */}
            <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex">
              <div 
                className="bg-emerald-500 h-full transition-all duration-200" 
                style={{ width: `${orderTotal > 0 ? Math.min(100, (numCash / orderTotal) * 100) : 0}%` }}
                title={`Cash: ${currencySymbol}${numCash}`}
              />
              <div 
                className="bg-sky-500 h-full transition-all duration-200" 
                style={{ width: `${orderTotal > 0 ? Math.min(100, (numUpi / orderTotal) * 100) : 0}%` }}
                title={`UPI: ${currencySymbol}${numUpi}`}
              />
              <div 
                className="bg-purple-500 h-full transition-all duration-200" 
                style={{ width: `${orderTotal > 0 ? Math.min(100, (numCard / orderTotal) * 100) : 0}%` }}
                title={`Card: ${currencySymbol}${numCard}`}
              />
            </div>

            {/* 3 Boxy Channel Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Cash Box */}
              <div className="p-3 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    <Banknote size={14} />
                    <span>Cash</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleFillRemaining('cash')}
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800 cursor-pointer"
                  >
                    Balance
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">{currencySymbol}</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={splitCash}
                    onChange={(e) => setSplitCash(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-6 pr-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* UPI Box */}
              <div className="p-3 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-sky-700 dark:text-sky-400">
                    <QrCode size={14} />
                    <span>UPI / QR</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleFillRemaining('upi')}
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/60 dark:hover:bg-sky-900 text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800 cursor-pointer"
                  >
                    Balance
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">{currencySymbol}</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={splitUpi}
                    onChange={(e) => setSplitUpi(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-6 pr-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Card Box */}
              <div className="p-3 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-400">
                    <CreditCard size={14} />
                    <span>Card POS</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleFillRemaining('card')}
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800 cursor-pointer"
                  >
                    Balance
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">{currencySymbol}</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={splitCard}
                    onChange={(e) => setSplitCard(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-6 pr-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* Validation Message Banner */}
            {!isSplitValid ? (
              <div className="flex items-center justify-between p-2.5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-xs font-semibold text-amber-800 dark:text-amber-300">
                <div className="flex items-center gap-1.5">
                  <AlertCircle size={14} className="text-amber-600 shrink-0" />
                  <span>
                    {diff > 0 
                      ? `Remaining to allocate: ${currencySymbol}${diff.toFixed(2)}` 
                      : `Over-allocated by ${currencySymbol}${Math.abs(diff).toFixed(2)}`}
                  </span>
                </div>
                {diff > 0 && (
                  <button
                    type="button"
                    onClick={() => handleFillRemaining(numCash === 0 ? 'cash' : (numUpi === 0 ? 'upi' : 'card'))}
                    className="text-[11px] font-bold underline cursor-pointer text-amber-700 dark:text-amber-300"
                  >
                    Fill Remainder
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                <span>Split amounts match the bill total perfectly. Ready to confirm.</span>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
