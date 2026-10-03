import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { 
  Banknote, 
  QrCode, 
  CreditCard, 
  ExternalLink, 
  Split, 
  Check, 
  Wallet, 
  Sparkles,
  AlertCircle
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
  const [splitCash, setSplitCash] = useState<string>('');
  const [splitUpi, setSplitUpi] = useState<string>('');
  const [splitCard, setSplitCard] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const orderTotal = Number(order?.total_amount || 0);

  useEffect(() => {
    if (isOpen && order) {
      const initialMethod = order.payment_method || 'cash';
      setSelectedMethod(initialMethod);

      if (initialMethod === 'split' && order.split_payments?.length) {
        const cashObj = order.split_payments.find((p: any) => p.method === 'cash');
        const upiObj = order.split_payments.find((p: any) => p.method === 'upi');
        const cardObj = order.split_payments.find((p: any) => p.method === 'card');
        setSplitCash(cashObj ? String(cashObj.amount) : '');
        setSplitUpi(upiObj ? String(upiObj.amount) : '');
        setSplitCard(cardObj ? String(cardObj.amount) : '');
      } else {
        const half = (orderTotal / 2).toFixed(2);
        const rem = (orderTotal - Number(half)).toFixed(2);
        setSplitCash(half);
        setSplitUpi(rem);
        setSplitCard('');
      }
    }
  }, [isOpen, order, orderTotal]);

  if (!isOpen || !order) return null;

  const numCash = parseFloat(splitCash) || 0;
  const numUpi = parseFloat(splitUpi) || 0;
  const numCard = parseFloat(splitCard) || 0;
  const splitTotal = numCash + numUpi + numCard;
  const diff = orderTotal - splitTotal;
  const isSplitValid = Math.abs(diff) < 0.05 && splitTotal > 0;

  const handleFillRemaining = (target: 'cash' | 'upi' | 'card') => {
    const currentWithoutTarget = (target === 'cash' ? 0 : numCash) + 
                                 (target === 'upi' ? 0 : numUpi) + 
                                 (target === 'card' ? 0 : numCard);
    const needed = Math.max(0, orderTotal - currentWithoutTarget);
    const neededStr = needed > 0 ? needed.toFixed(2) : '';

    if (target === 'cash') setSplitCash(neededStr);
    if (target === 'upi') setSplitUpi(neededStr);
    if (target === 'card') setSplitCard(neededStr);
  };

  const handleConfirm = async () => {
    if (selectedMethod === 'split') {
      if (!isSplitValid) {
        toast.error(`Split amounts total (${currencySymbol}${splitTotal.toFixed(2)}) must equal order total (${currencySymbol}${orderTotal.toFixed(2)})`);
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

  const paymentOptions = [
    {
      id: 'cash',
      label: 'Cash',
      subtext: 'Direct cash received at counter',
      icon: Banknote,
      color: 'emerald',
      activeCls: 'bg-emerald-500/10 border-emerald-500 text-emerald-950 dark:text-emerald-200 ring-2 ring-emerald-500/20',
      badgeCls: 'bg-emerald-500 text-white',
      iconBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    },
    {
      id: 'upi',
      label: 'UPI / QR Code',
      subtext: 'GPay, PhonePe, Paytm, QR scan',
      icon: QrCode,
      color: 'blue',
      activeCls: 'bg-blue-500/10 border-blue-500 text-blue-950 dark:text-blue-200 ring-2 ring-blue-500/20',
      badgeCls: 'bg-blue-500 text-white',
      iconBg: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
    },
    {
      id: 'card',
      label: 'Card (POS)',
      subtext: 'Debit or Credit Card Swipe/Tap',
      icon: CreditCard,
      color: 'purple',
      activeCls: 'bg-purple-500/10 border-purple-500 text-purple-950 dark:text-purple-200 ring-2 ring-purple-500/20',
      badgeCls: 'bg-purple-500 text-white',
      iconBg: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
    },
    {
      id: 'online',
      label: 'Online Gateway',
      subtext: 'Razorpay or Online link payment',
      icon: ExternalLink,
      color: 'indigo',
      activeCls: 'bg-indigo-500/10 border-indigo-500 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/20',
      badgeCls: 'bg-indigo-500 text-white',
      iconBg: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
    },
    {
      id: 'split',
      label: 'Split Payment',
      subtext: 'Split between Cash & UPI / Card',
      icon: Split,
      color: 'amber',
      activeCls: 'bg-amber-500/10 border-amber-500 text-amber-950 dark:text-amber-200 ring-2 ring-amber-500/20',
      badgeCls: 'bg-amber-500 text-white',
      iconBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Payment"
      className="max-w-xl sm:max-w-2xl w-full overflow-hidden rounded-3xl shadow-2xl"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-2xl px-5 py-2.5 font-bold cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            isLoading={isSubmitting}
            disabled={selectedMethod === 'split' && !isSplitValid}
            className="rounded-2xl px-6 py-2.5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer"
          >
            <Check size={18} className="stroke-[2.5]" />
            <span>Mark as Paid ({currencySymbol}{orderTotal.toFixed(2)})</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Order Header Financial Summary */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-transparent border border-orange-200/80 dark:border-orange-900/40 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                Order #{order.daily_order_number || order.id?.slice(0, 8)}
              </span>
              <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                {order.order_type || 'Dine-in'}
              </span>
            </div>
            <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 mt-1 font-semibold truncate">
              {order.customer_name || 'Walk-in Customer'}
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Total Payable</span>
            <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white tracking-tight">
              {currencySymbol}{orderTotal.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Payment Methods Grid */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2.5">
            Select Payment Method Received <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {paymentOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = selectedMethod === opt.id;
              const isSplit = opt.id === 'split';
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedMethod(opt.id)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all text-left cursor-pointer ${
                    isSplit ? 'sm:col-span-2' : ''
                  } ${
                    isSelected 
                      ? opt.activeCls 
                      : 'border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 text-slate-800 dark:text-slate-200 shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                      isSelected ? opt.iconBg : 'bg-slate-200/80 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300'
                    }`}>
                      <Icon size={20} className="stroke-[2.2]" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs sm:text-sm flex items-center gap-1.5 truncate">
                        <span>{opt.label}</span>
                        {isSelected && (
                          <span className={`px-2 py-0.5 text-[9px] font-black rounded-full ${opt.badgeCls}`}>
                            Selected
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        {opt.subtext}
                      </div>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ml-2 ${
                    isSelected ? 'border-primary bg-primary text-white' : 'border-slate-300 dark:border-slate-600'
                  }`}>
                    {isSelected && <Check size={12} className="stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Split Payment Form if Split is Selected */}
        {selectedMethod === 'split' && (
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-800/60 space-y-3.5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                  <Split size={14} className="stroke-[2.5]" />
                </div>
                <span className="text-xs sm:text-sm font-bold text-amber-950 dark:text-amber-200">
                  Split Amounts Breakdown
                </span>
              </div>
              <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg shadow-xs ${
                isSplitValid ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
              }`}>
                {currencySymbol}{splitTotal.toFixed(2)} / {currencySymbol}{orderTotal.toFixed(2)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Cash input */}
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200/80 dark:border-emerald-900/50 shadow-xs">
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                    <Banknote size={15} className="stroke-[2.2]" />
                    <span>Cash</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleFillRemaining('cash')}
                    className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold cursor-pointer transition-colors"
                  >
                    Balance
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">{currencySymbol}</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={splitCash}
                    onChange={(e) => setSplitCash(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* UPI input */}
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-blue-200/80 dark:border-blue-900/50 shadow-xs">
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400">
                    <QrCode size={15} className="stroke-[2.2]" />
                    <span>UPI / QR</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleFillRemaining('upi')}
                    className="px-1.5 py-0.5 rounded text-[10px] bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold cursor-pointer transition-colors"
                  >
                    Balance
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">{currencySymbol}</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={splitUpi}
                    onChange={(e) => setSplitUpi(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Card input */}
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-purple-200/80 dark:border-purple-900/50 shadow-xs">
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-400">
                    <CreditCard size={15} className="stroke-[2.2]" />
                    <span>Card</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleFillRemaining('card')}
                    className="px-1.5 py-0.5 rounded text-[10px] bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 font-bold cursor-pointer transition-colors"
                  >
                    Balance
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">{currencySymbol}</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={splitCard}
                    onChange={(e) => setSplitCard(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>

            {!isSplitValid && (
              <div className="flex items-center gap-2 text-xs font-medium text-amber-800 dark:text-amber-300 bg-amber-100/60 dark:bg-amber-900/30 p-2.5 rounded-xl">
                <AlertCircle size={15} className="shrink-0 text-amber-600" />
                <span>
                  {diff > 0 
                    ? `Remaining to allocate: ${currencySymbol}${diff.toFixed(2)}` 
                    : `Over allocated by ${currencySymbol}${Math.abs(diff).toFixed(2)}`}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
