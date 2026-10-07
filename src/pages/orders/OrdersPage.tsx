import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router';
import { RefreshCw, ShoppingBag, Clock, XCircle, ChevronDown, Check, CheckCircle2, List, User, MapPin, Phone, Share2, Copy, ExternalLink, Navigation, Lock, Search, Plus, Filter, X, Calendar, Printer, UtensilsCrossed, Flame, RotateCcw, Eye, FileText, Percent } from 'lucide-react';

import { api } from '@/services/api';
import { useHeaderStore } from '@/store/useHeaderStore';
import { useShopStore } from '@/store/shopStore';
import { HeaderActions } from '@/components/HeaderActions';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Badge } from '@/components/ui/Badge';
import { InfiniteScrollTrigger } from '@/components/ui/InfiniteScrollTrigger';
import { Skeleton } from '@/components/ui/Skeleton';
import { DatePicker } from '@/components/ui/DatePicker';
import { Input } from '@/components/ui/Input';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import toast from 'react-hot-toast';
import { CreateOrderModal } from './CreateOrderModal';
import { ThermalBillModal } from '@/components/orders/ThermalBillModal';
import { ThermalKotModal } from '@/components/orders/ThermalKotModal';
import { PaymentModeModal } from '@/components/orders/PaymentModeModal';
import { usePrinterStore } from '@/store/usePrinterStore';
import { printOrderToStations, printBillToPrinter, printBillToAllPrinters, isNewlyAddedItem } from '@/utils/thermalPrinter';
import { printOrderA4Invoice } from '@/utils/orderInvoice';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { getBusinessCategory } from '@/config/businessCategories';
import { calculateOrderReplacementCredit } from '@/utils/pricing';

const getTodayDateStr = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getYesterdayDateStr = () => {
  const now = new Date();
  now.setDate(now.getDate() - 1);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};


function OrderCardSkeleton() {
  return (
    <Card className="relative overflow-hidden border-l-4 border-l-slate-200 dark:border-l-slate-800 shadow-sm animate-fade-in">
      <CardContent className="p-4 sm:p-5 space-y-3.5">
        {/* Top Bar Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-border/60">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-24 rounded-md" />
              <Skeleton className="h-4 w-20 rounded-full" />
            </div>
            <Skeleton className="h-3.5 w-36 rounded-md" />
          </div>
          <Skeleton className="h-6 w-32 rounded-full shrink-0" />
        </div>

        {/* Content Grid: Customer & Items */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Customer Information Skeleton */}
          <div className="p-3 bg-muted/30 rounded-xl space-y-2.5 border border-border/40">
            <div className="flex justify-between items-center">
              <Skeleton className="h-3.5 w-16 rounded" />
              <Skeleton className="h-4 w-28 rounded" />
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-border/40 border-dashed">
              <Skeleton className="h-3.5 w-12 rounded" />
              <Skeleton className="h-3.5 w-32 rounded" />
            </div>
          </div>

          {/* Order Items Preview Skeleton */}
          <div className="p-3 bg-muted/30 rounded-xl space-y-2 border border-border/40">
            <div className="flex justify-between items-center mb-1.5">
              <Skeleton className="h-3.5 w-14 rounded" />
              <Skeleton className="h-4 w-16 rounded-full" />
            </div>
            <div className="flex justify-between items-center">
              <Skeleton className="h-3.5 w-36 rounded" />
              <Skeleton className="h-3.5 w-6 rounded" />
            </div>
            <div className="flex justify-between items-center">
              <Skeleton className="h-3.5 w-24 rounded" />
              <Skeleton className="h-3.5 w-6 rounded" />
            </div>
          </div>
        </div>

        {/* Bottom Bar: Payment & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border/60">
          <div className="flex items-center gap-4">
            <div className="space-y-1">
              <Skeleton className="h-3 w-12 rounded" />
              <div className="flex items-center gap-1.5">
                <Skeleton className="h-4 w-14 rounded" />
                <Skeleton className="h-5 w-16 rounded-lg" />
              </div>
            </div>
            <div className="space-y-1 pl-3 border-l border-border/40">
              <Skeleton className="h-3 w-10 rounded" />
              <Skeleton className="h-5 w-20 rounded" />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-16 rounded-lg" />
            <Skeleton className="h-8 w-16 rounded-lg" />
            <Skeleton className="h-8 w-28 rounded-lg" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


import { parseDateSafe } from '@/utils/dateTime';

function formatDateTime(dateStr: string) {
  if (!dateStr) return { date: '—', time: '—' };
  const d = parseDateSafe(dateStr);
  if (!d) return { date: '—', time: '—' };
  const date = d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  return { date, time };
}

function generateGoogleMapsUrl(address: string) {
  if (!address) return '#';
  // Check for [loc=lat,lng] format
  const locMatch = address.match(/\[loc=([-?\d.]+),([-?\d.]+)\]/);
  if (locMatch) {
    return `https://www.google.com/maps?q=${locMatch[1]},${locMatch[2]}`;
  }
  // Check for Lat: X, Lon: Y format
  const latLonMatch = address.match(/Lat:\s*([-?\d.]+),\s*Lon:\s*([-?\d.]+)/i);
  if (latLonMatch) {
    return `https://www.google.com/maps?q=${latLonMatch[1]},${latLonMatch[2]}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function getOrderDistanceKm(order: any, shopLat?: number | null, shopLng?: number | null): number | null {
  if (!order?.delivery_address || !shopLat || !shopLng) return null;
  const match = order.delivery_address.match(/\[loc=([-?\d.]+),([-?\d.]+)\]/) || 
                order.delivery_address.match(/Lat:\s*([-?\d.]+),\s*Lon:\s*([-?\d.]+)/i);
  if (!match) return null;
  const custLat = parseFloat(match[1]);
  const custLng = parseFloat(match[2]);
  if (isNaN(custLat) || isNaN(custLng)) return null;

  const R = 6371; // km
  const dLat = (custLat - Number(shopLat)) * (Math.PI / 180);
  const dLon = (custLng - Number(shopLng)) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(Number(shopLat) * (Math.PI / 180)) * Math.cos(custLat * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDistanceWithUnit(distKm: number | null, currency?: string): string | null {
  if (distKm === null || isNaN(distKm)) return null;
  const isImperial = ['USD', '$', 'GBP', '£'].includes(currency || '');
  if (isImperial) {
    const miles = distKm * 0.621371;
    return `${miles.toFixed(1)} mi`;
  }
  return `${distKm.toFixed(1)} km`;
}

function getOrderDeliveryFee(order: any, shopSettings?: any, shopLat?: number | null, shopLng?: number | null): number {
  if (order?.order_type !== 'delivery') return 0;
  
  const distKm = getOrderDistanceKm(order, shopLat, shopLng);
  const baseCharge = Number(shopSettings?.base_delivery_charge || 0);
  const baseDist = Number(shopSettings?.base_delivery_distance || 0);
  const stepKm = Number(shopSettings?.extra_delivery_distance_step || 1);
  const extraRate = Number(shopSettings?.extra_delivery_charge_per_step || 0);

  if (distKm !== null && distKm > 0 && shopSettings?.delivery_enabled) {
    if (distKm <= baseDist || baseDist <= 0) {
      return baseCharge;
    }
    const extraDist = distKm - baseDist;
    const steps = Math.ceil(extraDist / stepKm);
    return baseCharge + (steps * extraRate);
  }
  
  return baseCharge;
}

function generateOrderBillText(order: any) {
  const { date, time } = formatDateTime(order.created_at);
  const orderId = order.daily_order_number || order.id.slice(0, 8).toUpperCase();
  const items = (order.items || []).filter((it: any) => !it.is_cancelled);
  const itemsSubtotal = items.reduce((sum: number, it: any) => sum + (Number(it.price || 0) * Number(it.quantity || 1)), 0);
  const isDelivery = order.order_type === 'delivery';
  const deliveryFee = (isDelivery && Number(order.total_amount) > itemsSubtotal) ? (Number(order.total_amount) - itemsSubtotal) : 0;
  const hotelTotal = itemsSubtotal + deliveryFee;

  const itemsText = (order.items || []).map((it: any) => {
    let details = `${it.name} x${it.quantity} - ₹${(it.price * it.quantity).toFixed(2)}`;
    if (it.variant_info) {
      try {
        const v = typeof it.variant_info === 'string' ? JSON.parse(it.variant_info) : it.variant_info;
        const vStr = Object.entries(v).map(([k, val]) => `${k}: ${val}`).join(', ');
        details += ` (${vStr})`;
      } catch { }
    }
    const isCancelled = Boolean(it.is_cancelled);
    if (isCancelled) {
      const isReplaced = it.cancellation_reason?.toLowerCase().includes('replace');
      const tag = isReplaced ? '[REPLACED]' : '[CANCELLED]';
      const reason = it.cancellation_reason ? ` (${it.cancellation_reason})` : '';
      return `• ~${details}~ ${tag}${reason}`;
    }
    const isNew = isNewlyAddedItem(it, order);
    return `• ${it.name}${isNew ? ' (new)' : ''} x${it.quantity} - ₹${(it.price * it.quantity).toFixed(2)}`;
  }).join('\n');

  let bill = `🧾 *ORDER BILL #${orderId}*\n`;
  bill += `📅 Date: ${date} at ${time}\n`;
  bill += `------------------------------\n`;
  bill += `👤 Customer: ${order.customer_name}\n`;
  bill += `📞 Phone: ${order.customer_phone}\n`;
  if (order.table_number) bill += `🪑 Table: T-${order.table_number}\n`;
  if (order.delivery_address) {
    bill += `📍 Address: ${order.delivery_address}\n`;
    bill += `🗺️ Google Maps: ${generateGoogleMapsUrl(order.delivery_address)}\n`;
  }
  bill += `------------------------------\n`;
  bill += `🛒 *Items Summary:*\n${itemsText}\n`;
  bill += `------------------------------\n`;
  if (order.payment_method === 'split' && order.split_payments?.length) {
    const spText = order.split_payments.map((sp: any) => `${(sp.method || 'cash').toUpperCase()}: ₹${Number(sp.amount || 0).toFixed(2)}`).join(' + ');
    bill += `💳 Payment: SPLIT [${spText}] (${order.payment_status?.toUpperCase()})\n`;
  } else {
    bill += `💳 Payment: ${order.payment_method?.toUpperCase()} (${order.payment_status?.toUpperCase()})\n`;
  }
  bill += `💰 *Grand Total: ₹${hotelTotal.toFixed(2)}*\n`;
  bill += `------------------------------\n`;
  bill += `Thank you for ordering with us!`;

  return bill;
}

const PAY_OPTIONS = [
  { value: 'paid', label: 'Paid', cls: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  { value: 'pending', label: 'Not Paid', cls: 'text-amber-700 bg-amber-50 border-amber-200', dot: 'bg-amber-400' },
  { value: 'refunded', label: 'Refunded', cls: 'text-purple-700 bg-purple-50 border-purple-200', dot: 'bg-purple-500' },
  { value: 'refund_pending', label: 'Refund Pending', cls: 'text-amber-700 bg-amber-50 border-amber-300', dot: 'bg-amber-500' },
  { value: 'refund_failed', label: 'Refund Failed', cls: 'text-rose-700 bg-rose-50 border-rose-300', dot: 'bg-rose-500' },
];

function paymentStyle(status: string) {
  const norm = (status || '').toLowerCase();
  return PAY_OPTIONS.find(o => o.value === norm) ?? PAY_OPTIONS[1];
}


/* ── Portal Dropdown ─────────────────────────────────────────────────────── */
interface PayDropdownProps {
  orderId: string;
  paymentStatus: string;
  paymentMethod: string;
  orderStatus: string;
  onSelect: (orderId: string, val: string) => void;
  disabled?: boolean;
}

function PayDropdown({ orderId, paymentStatus, paymentMethod, orderStatus, onSelect, disabled }: PayDropdownProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const normOrderStatus = (orderStatus || '').toUpperCase();
  const isPaidOnline = ['paid', 'refund_pending', 'refund_failed'].includes((paymentStatus || '').toLowerCase()) && paymentMethod === 'online';

  let options: typeof PAY_OPTIONS = [];
  if (normOrderStatus === 'COMPLETED' || normOrderStatus === 'DELIVERED') {
    // Completed orders: payment status is finalized and cannot be modified
    options = [];
  } else if (normOrderStatus === 'CANCELLED' || normOrderStatus === 'REJECTED') {
    // Cancelled orders: only online payments can be refunded
    if (isPaidOnline && paymentStatus !== 'refunded') {
      options = PAY_OPTIONS.filter(o => o.value === 'refunded');
    } else {
      options = [];
    }
  } else {
    options = PAY_OPTIONS.filter(o => {
      if (o.value === 'refunded') {
        return isPaidOnline;
      }
      return true;
    });
  }

  const isInteractive = !disabled && options.length > 0;
  const current = paymentStyle(paymentStatus);

  const openDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isInteractive || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + window.scrollY + 6,
      right: window.innerWidth - rect.right,
    });
    setOpen(v => !v);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSelect = (opt: typeof PAY_OPTIONS[number]) => {
    setOpen(false);
    if (opt.value === paymentStatus) return;
    if (opt.value === 'refunded') {
      if (!isPaidOnline) {
        toast.error('Refund can only be initiated for orders paid online via payment gateway.');
        return;
      }
      if (confirm('This will process an automatic online refund to the customer via payment gateway. Continue?')) {
        onSelect(orderId, opt.value);
      }
      return;
    }
    if (opt.value === 'paid') {
      onSelect(orderId, 'paid');
      return;
    }
    if (confirm(`Change payment status to "${opt.label}"?`)) {
      onSelect(orderId, opt.value);
    }
  };

  return (
    <div className="inline-flex items-center">
      <button
        ref={btnRef}
        onClick={openDropdown}
        disabled={!isInteractive}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black border transition-all whitespace-nowrap shrink-0 ${
          !isInteractive ? 'cursor-default' : 'cursor-pointer hover:shadow-xs'
        } ${current.cls}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${current.dot}`} />
        <span className="whitespace-nowrap">{current.label}</span>
        {isInteractive && (
          <ChevronDown size={11} className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {open && isInteractive && createPortal(
        <div
          ref={panelRef}
          style={{ position: 'absolute', top: pos.top, right: pos.right, zIndex: 9999 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden min-w-[148px] animate-fade-in"
        >
          {options.map(opt => {
            const isSelected = paymentStatus === opt.value;
            return (
              <button
                key={opt.value}
                onClick={(e) => { e.stopPropagation(); handleSelect(opt); }}
                className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-[11px] font-bold text-left transition-colors ${isSelected
                    ? `${opt.cls} border-l-[3px]`
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${opt.dot}`} />
                  <span>{opt.label}</span>
                </div>
                {isSelected && <Check size={11} />}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}

function getOrderStatusOptions(orderType?: string, paymentMethod?: string, paymentStatus?: string, orderStatus?: string) {
  const normStatus = (orderStatus || '').toUpperCase();
  const isPaid = (paymentStatus || '').toLowerCase() === 'paid' || normStatus === 'PAID';
  const isCash = paymentMethod === 'cash' || paymentMethod === 'cash_on_delivery' || paymentMethod === 'counter';

  // Completed or Cancelled orders cannot change status
  if (['COMPLETED', 'DELIVERED', 'CANCELLED', 'REJECTED'].includes(normStatus)) {
    return [];
  }

  if (normStatus === 'PENDING_VENDOR' || normStatus === 'PENDING') {
    if (isPaid) {
      return [
        { value: 'PREPARING', label: 'Accept Order', cls: 'text-amber-700 bg-amber-50 border-amber-200', dot: 'bg-amber-500' },
        { value: 'CANCELLED', label: 'Cancel & Refund', cls: 'text-rose-700 bg-rose-50 border-rose-200', dot: 'bg-rose-500' },
      ];
    }
    if (isCash) {
      return [
        { value: 'PREPARING', label: 'Accept Order', cls: 'text-orange-700 bg-orange-50 border-orange-200', dot: 'bg-orange-500' },
        { value: 'CANCELLED', label: 'Cancel', cls: 'text-rose-700 bg-rose-50 border-rose-200', dot: 'bg-rose-500' },
      ];
    }
    return [
      { value: 'PAYMENT_PENDING', label: 'Accept & Request Payment', cls: 'text-orange-700 bg-orange-50 border-orange-200', dot: 'bg-orange-500' },
      { value: 'CANCELLED', label: 'Cancel', cls: 'text-rose-700 bg-rose-50 border-rose-200', dot: 'bg-rose-500' },
    ];
  }

  const isAwaitingComplete = isPaid || normStatus === 'PREPARING' || normStatus === 'ACCEPTED' || normStatus === 'READY' || normStatus === 'OUT_FOR_DELIVERY';

  if (isAwaitingComplete) {
    const opts = [
      { value: 'PREPARING', label: 'Preparing', cls: 'text-blue-700 bg-blue-50 border-blue-200', dot: 'bg-blue-500' },
      { value: 'READY', label: 'Ready', cls: 'text-cyan-700 bg-cyan-50 border-cyan-200', dot: 'bg-cyan-500' },
    ];
    if (orderType === 'delivery') {
      opts.push({ value: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', cls: 'text-teal-700 bg-teal-50 border-teal-200', dot: 'bg-teal-500' });
    }
    // "Complete" is only available if the order is paid
    if (isPaid) {
      opts.push({ value: 'COMPLETED', label: 'Complete', cls: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' });
    }
    return opts;
  }

  if (isCash) {
    return [
      { value: 'PREPARING', label: 'Accept Order', cls: 'text-orange-700 bg-orange-50 border-orange-200', dot: 'bg-orange-500' },
      { value: 'CANCELLED', label: 'Cancel', cls: 'text-rose-700 bg-rose-50 border-rose-200', dot: 'bg-rose-500' },
    ];
  }

  // Online unpaid order
  return [
    { value: 'PAYMENT_PENDING', label: 'Accept & Request Payment', cls: 'text-orange-700 bg-orange-50 border-orange-200', dot: 'bg-orange-500' },
    { value: 'CANCELLED', label: 'Cancel', cls: 'text-rose-700 bg-rose-50 border-rose-200', dot: 'bg-rose-500' },
  ];
}


function orderStatusStyle(status: string, orderType?: string) {
  const norm = (status || '').toUpperCase();

  if (norm === 'PENDING' || norm === 'PENDING_VENDOR') {
    return { value: 'PENDING_VENDOR', label: 'Pending', cls: 'text-amber-700 bg-amber-50 border-amber-200', dot: 'bg-amber-400' };
  }
  if (norm === 'PAYMENT_PENDING') {
    return { value: 'PAYMENT_PENDING', label: 'Awaiting Payment', cls: 'text-orange-700 bg-orange-50 border-orange-200', dot: 'bg-orange-500' };
  }
  if (norm === 'ACCEPTED') {
    return { value: 'ACCEPTED', label: 'Accepted', cls: 'text-cyan-700 bg-cyan-50 border-cyan-200', dot: 'bg-cyan-500' };
  }
  if (norm === 'PAID') {
    return { value: 'PAID', label: 'Paid', cls: 'text-indigo-700 bg-indigo-50 border-indigo-200', dot: 'bg-indigo-500' };
  }
  if (norm === 'PREPARING') {
    return { value: 'PREPARING', label: 'Preparing', cls: 'text-blue-700 bg-blue-50 border-blue-200', dot: 'bg-blue-500' };
  }
  if (norm === 'READY') {
    return { value: 'READY', label: 'Ready', cls: 'text-cyan-700 bg-cyan-50 border-cyan-200', dot: 'bg-cyan-500' };
  }
  if (norm === 'OUT_FOR_DELIVERY') {
    return { value: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', cls: 'text-teal-700 bg-teal-50 border-teal-200', dot: 'bg-teal-500' };
  }
  if (norm === 'DELIVERED' || norm === 'COMPLETED') {
    return { value: 'DELIVERED', label: 'Completed', cls: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' };
  }
  if (norm === 'CANCELLED' || norm === 'REJECTED') {
    return { value: 'CANCELLED', label: 'Cancelled', cls: 'text-rose-700 bg-rose-50 border-rose-200', dot: 'bg-rose-500' };
  }
  return { value: status, label: status, cls: 'text-slate-700 bg-slate-50 border-slate-200', dot: 'bg-slate-400' };
}


interface OrderStatusDropdownProps {
  orderId: string;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod?: string;
  orderType?: string;
  onSelect: (orderId: string, val: string) => void;
}

function OrderStatusDropdown({ orderId, orderStatus, paymentStatus, paymentMethod, orderType, onSelect }: OrderStatusDropdownProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const current = orderStatusStyle(orderStatus, orderType);
  const options = getOrderStatusOptions(orderType, paymentMethod, paymentStatus, orderStatus);
  const isInteractive = options.length > 0;

  const openDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isInteractive || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + window.scrollY + 6,
      right: window.innerWidth - rect.right,
    });
    setOpen(v => !v);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSelect = (opt: { value: string; label: string; cls: string; dot: string }) => {
    setOpen(false);
    if (orderStatusStyle(orderStatus, orderType).value === opt.value) return;

    if (opt.value === 'COMPLETED' || opt.value === 'DELIVERED') {
      const isPaid = (paymentStatus || '').toLowerCase() === 'paid' || (orderStatus || '').toUpperCase() === 'PAID';
      if (!isPaid) {
        toast.error('Order must be marked as Paid before it can be marked as Completed.');
        return;
      }
    }
    
    if (opt.value === 'CANCELLED') {
      onSelect(orderId, 'CANCELLED');
    } else {
      if (confirm(`Change order status to "${opt.label}"?`)) {
        onSelect(orderId, opt.value);
      }
    }
  };

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={openDropdown}
        disabled={!isInteractive}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black border transition-all whitespace-nowrap shrink-0 ${
          !isInteractive ? 'cursor-default' : 'cursor-pointer hover:shadow-xs'
        } ${current.cls}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${current.dot}`} />
        <span className="whitespace-nowrap">{current.label}</span>
        {isInteractive && (
          <ChevronDown size={11} className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {open && isInteractive && createPortal(
        <div
          ref={panelRef}
          style={{ position: 'absolute', top: pos.top, right: pos.right, zIndex: 9999 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden min-w-[148px] animate-fade-in"
        >
          {options.map(opt => {
            const isSelected = orderStatusStyle(orderStatus, orderType).value === opt.value;
            return (
              <button
                key={opt.value}
                onClick={(e) => { e.stopPropagation(); handleSelect(opt); }}
                className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-[11px] font-bold text-left transition-colors ${isSelected
                    ? `${opt.cls} border-l-[3px]`
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${opt.dot}`} />
                  <span>{opt.label}</span>
                </div>
                {isSelected && <Check size={11} />}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}

let cachedOrders: any[] = [];

const DEFAULT_ITEM_CANCELLATION_REASONS = [
  { id: 'Customer cancelled request', name: 'Customer cancelled request' },
  { id: 'Item out of stock / ingredient unavailable', name: 'Item out of stock / ingredient unavailable' },
  { id: 'Preparation delay / Long wait time', name: 'Preparation delay / Long wait time' },
  { id: 'Accidental punch / Billing error', name: 'Accidental punch / Billing error' },
  { id: 'Customer changed item preference', name: 'Customer changed item preference' },
  { id: 'Kitchen / food quality issue', name: 'Kitchen / food quality issue' },
  { id: 'custom', name: 'Other / Custom Reason...' },
];

const DEFAULT_ORDER_CANCELLATION_REASONS = [
  { id: 'Item out of stock / Ingredients unavailable', name: 'Item out of stock / Ingredients unavailable' },
  { id: 'Kitchen is closed / Closing hours', name: 'Kitchen is closed / Closing hours' },
  { id: 'High order volume / Kitchen too busy', name: 'High order volume / Kitchen too busy' },
  { id: 'Customer requested cancellation', name: 'Customer requested cancellation' },
  { id: 'Duplicate order placed', name: 'Duplicate order placed' },
  { id: 'Delivery address outside service area', name: 'Delivery address outside service area' },
  { id: 'Customer phone unreachable / Invalid details', name: 'Customer phone unreachable / Invalid details' },
  { id: 'Pricing or technical error', name: 'Pricing or technical error' },
  { id: 'custom', name: 'Other / Custom Reason...' },
];

/* ── Main Page ───────────────────────────────────────────────────────────── */
export function OrdersPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [orders, setOrders] = useState<any[]>(cachedOrders);
  const [isLoading, setIsLoading] = useState(() => cachedOrders.length === 0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  
  // API Filtering & Pagination
  const [filterStatus, setFilterStatus] = useState<string>('new');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateStr());
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [statusCounts, setStatusCounts] = useState<{ [key: string]: number }>({
    all: 0, new: 0, awaiting_payment: 0, accepted: 0, preparing: 0, completed: 0, cancelled: 0
  });
  const PAGE_SIZE = 20;

  const [itemsModalOrder, setItemsModalOrder] = useState<any | null>(null);
  const [customerModalOrder, setCustomerModalOrder] = useState<any | null>(null);
  const [thermalPrintOrder, setThermalPrintOrder] = useState<any | null>(null);
  const [thermalPrintInitialMode, setThermalPrintInitialMode] = useState<'all' | 'new_only'>('all');
  const [thermalKotOrder, setThermalKotOrder] = useState<any | null>(null);
  const [thermalKotMode, setThermalKotMode] = useState<'full' | 'new_only' | 'cancelled'>('full');
  const [replacingItemOrder, setReplacingItemOrder] = useState<{ order: any; item: any } | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [cancelOrderWithRefund, setCancelOrderWithRefund] = useState<boolean>(true);
  const [selectedCancelOrderReason, setSelectedCancelOrderReason] = useState<string>(DEFAULT_ORDER_CANCELLATION_REASONS[0].id);
  const [cancelOrderReason, setCancelOrderReason] = useState<string>(DEFAULT_ORDER_CANCELLATION_REASONS[0].name);
  const [cancellingItemOrder, setCancellingItemOrder] = useState<{ orderId: string; itemId: string; itemName: string; item?: any } | null>(null);
  const [cancelItemWithRefund, setCancelItemWithRefund] = useState<boolean>(true);
  const [selectedCancelItemReason, setSelectedCancelItemReason] = useState<string>(DEFAULT_ITEM_CANCELLATION_REASONS[0].id);
  const [customCancelItemReason, setCustomCancelItemReason] = useState<string>('');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [refundingOrderId, setRefundingOrderId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [paymentModeModalOrder, setPaymentModeModalOrder] = useState<any | null>(null);
  const [targetOrderForAdd, setTargetOrderForAdd] = useState<any | null>(null);

  // Manual Discount Modal State
  const [discountModalOrder, setDiscountModalOrder] = useState<any | null>(null);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<string>('');
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);

  const openDiscountModal = (order: any) => {
    setDiscountModalOrder(order);
    const manualCode = (order.applied_discount_codes || []).find((c: string) => 
      c.startsWith('Discount (') || c.startsWith('Flat Discount (')
    );
    if (manualCode) {
      if (manualCode.startsWith('Discount (')) {
        setDiscountType('percentage');
        const match = manualCode.match(/Discount \((\d+(\.\d+)?)%/);
        setDiscountValue(match ? match[1] : '');
      } else {
        setDiscountType('fixed');
        const match = manualCode.match(/Flat Discount \(₹?(\d+(\.\d+)?)\)/);
        setDiscountValue(match ? match[1] : '');
      }
    } else {
      setDiscountType('percentage');
      setDiscountValue('');
    }
  };

  const handleSaveOrderDiscount = async (clearDiscount = false) => {
    if (!discountModalOrder) return;
    setIsApplyingDiscount(true);
    try {
      const payload = {
        discount_type: discountType,
        discount_value: clearDiscount ? 0 : (parseFloat(discountValue) || 0)
      };
      const res = await api.put(`/orders/${discountModalOrder.id}/discount`, payload);
      const updatedOrder = res.data;
      
      setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
      if (itemsModalOrder && itemsModalOrder.id === updatedOrder.id) {
        setItemsModalOrder(updatedOrder);
      }
      
      toast.success(clearDiscount ? 'Discount removed' : 'Discount applied successfully!');
      setDiscountModalOrder(null);
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.detail || 'Failed to apply discount');
    } finally {
      setIsApplyingDiscount(false);
    }
  };

  const { setTitle } = useHeaderStore();
  const { shop, menuItems, setMenuItems } = useShopStore();
  const businessCategory = getBusinessCategory(shop?.category);
  const { 
    paperWidth: defaultPaperWidth, 
    autoPrintOnAccept, 
    stations, 
    printedOrders, 
    markOrderKotPrinted, 
    isOrderKotPrinted,
    billingPrinter,
    billingPrinters,
    autoPrintOnPayment,
  } = usePrinterStore();

  const handleDirectPrintKot = useCallback(async (
    targetOrder: any, 
    mode: 'full' | 'new_only' | 'cancelled' = 'full',
    silent: boolean = false,
    options?: {
      customItems?: any[];
      reason?: string;
      kotTitle?: string;
      kotNumber?: string;
    }
  ) => {
    if (!targetOrder) return;
    const toastId = silent ? undefined : toast.loading('Sending KOT directly to kitchen printer...');
    try {
      const ok = await printOrderToStations(
        targetOrder,
        shop,
        menuItems,
        stations,
        defaultPaperWidth,
        mode,
        {
          ...options,
          silent,
        }
      );
      if (ok) {
        markOrderKotPrinted(targetOrder.id);
        if (toastId) toast.success('KOT printed successfully!', { id: toastId });
        else if (mode === 'cancelled') toast.success(`Void KOT sent to station for Order #${targetOrder.daily_order_number || targetOrder.id.slice(0, 8).toUpperCase()}`);
        else toast.success(`Auto-printed KOT for Order #${targetOrder.daily_order_number || targetOrder.id.slice(0, 8).toUpperCase()}`);
      } else {
        // If printer is offline/unreachable during background auto-print, mark as attempted to STOP continuous loop
        if (silent) {
          markOrderKotPrinted(targetOrder.id);
        }
        if (toastId) toast.error('Printer unavailable or offline', { id: toastId });
      }
    } catch (err: any) {
      console.error('Print KOT failed:', err);
      if (silent) {
        markOrderKotPrinted(targetOrder.id);
      }
      if (toastId) toast.error(err?.message || 'Failed to print KOT', { id: toastId });
    }
  }, [shop, menuItems, stations, defaultPaperWidth, markOrderKotPrinted]);

  const autoPrintRef = useRef(autoPrintOnAccept);
  autoPrintRef.current = autoPrintOnAccept;
  const isOrderKotPrintedRef = useRef(isOrderKotPrinted);
  isOrderKotPrintedRef.current = isOrderKotPrinted;
  const handleDirectPrintKotRef = useRef(handleDirectPrintKot);
  handleDirectPrintKotRef.current = handleDirectPrintKot;

  useEffect(() => {
    if (!menuItems || menuItems.length === 0) {
      api.get('/menu-items', { params: { limit: 500 } })
        .then(res => setMenuItems(res.data || []))
        .catch(err => console.error('Failed to prefetch menu items for KOT routing', err));
    }
  }, [menuItems, setMenuItems]);

  useEffect(() => {
    setTitle('Orders Queue', 'Manage live orders, tickets, and deliveries.');
  }, [setTitle]);

  const fetchStatusCounts = useCallback(async () => {
    try {
      const res = await api.get('/orders/status-counts', {
        params: selectedDate ? { date_filter: selectedDate } : {}
      });
      if (res.data) {
        setStatusCounts(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch status counts', err);
    }
  }, [selectedDate]);

  // Debounce search query input (350ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchOrdersData = useCallback(async (currentSkip: number, reset: boolean = false) => {
    if (reset) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const params: any = {
        skip: currentSkip,
        limit: PAGE_SIZE,
        status_filter: filterStatus,
        type_filter: filterType,
      };

      if (selectedDate) {
        params.date_filter = selectedDate;
      }

      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }

      const ordersReq = api.get('/orders', { params });
      const countsReq = reset ? api.get('/orders/status-counts', { params: selectedDate ? { date_filter: selectedDate } : {} }) : Promise.resolve(null);

      const [res, countsRes] = await Promise.all([ordersReq, countsReq]);

      if (countsRes?.data) {
        setStatusCounts(countsRes.data);
      }

      const newItems = res.data || [];
      const serverHasMore = res.headers['x-has-more'] === 'true' || newItems.length === PAGE_SIZE;

      setHasMore(serverHasMore);
      setSkip(currentSkip);
      setIsLocked(false);

      if (reset) {
        cachedOrders = newItems;
        setOrders(newItems);
      } else {
        setOrders((prev) => [...prev, ...newItems]);
      }

      // Automatically print KOT for incoming auto-accepted orders that haven't been printed yet
      if (autoPrintRef.current && newItems.length > 0) {
        for (const ord of newItems) {
          const isPaid = (ord.payment_status || '').toLowerCase() === 'paid';
          const isCash = ['cash', 'cash_on_delivery', 'counter'].includes((ord.payment_method || '').toLowerCase());
          const isPaidOrCash = isPaid || isCash;
          const normStatus = (ord.order_status || '').toUpperCase();
          const isAutoAccepted = (normStatus === 'ACCEPTED' || normStatus === 'PREPARING' || normStatus === 'PAID') && isPaidOrCash;
          if (isAutoAccepted && !isOrderKotPrintedRef.current(ord.id)) {
            handleDirectPrintKotRef.current(ord, 'full', true);
          }
        }
      }
    } catch (err: any) {
      if (err.response?.status === 403) {
        setIsLocked(true);
      } else {
        console.error(err);
        toast.error('Failed to load orders');
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [filterStatus, filterType, debouncedSearch, selectedDate]);

  // Fetch initial/filtered orders
  useEffect(() => {
    fetchOrdersData(0, true);
  }, [fetchOrdersData]);

  // Realtime updates listener (mounted once, using stable refs)
  useEffect(() => {
    const handleRealtimeUpdate = async (e: any) => {
      const notif = e.detail;
      if (!notif) return;
      if (notif.type === 'NEW_ORDER' || notif.type === 'ORDER_STATUS' || notif.type === 'ORDER_PAID') {
        fetchStatusCounts();
        fetchOrdersData(0, true);

        let meta: any = notif.metadata;
        if (!meta && notif.metadata_json) {
          try {
            meta = typeof notif.metadata_json === 'string' ? JSON.parse(notif.metadata_json) : notif.metadata_json;
          } catch { }
        }
        const orderId = notif.order?.id || meta?.order_id || meta?.orderId || notif.metadata?.order_id;
        if (autoPrintRef.current && orderId && !isOrderKotPrintedRef.current(orderId)) {
          try {
            let ord = notif.order;
            if (!ord || !ord.items || ord.items.length === 0) {
              const res = await api.get(`/orders/${orderId}`);
              ord = res.data;
            }
            if (ord) {
              const isPaid = (ord.payment_status || '').toLowerCase() === 'paid';
              const isCash = ['cash', 'cash_on_delivery', 'counter'].includes((ord.payment_method || '').toLowerCase());
              const isPaidOrCash = isPaid || isCash;
              const normStatus = (ord.order_status || '').toUpperCase();
              const isAutoAccepted = (normStatus === 'ACCEPTED' || normStatus === 'PREPARING' || normStatus === 'PAID') && isPaidOrCash;
              if (isAutoAccepted && !isOrderKotPrintedRef.current(ord.id)) {
                await handleDirectPrintKotRef.current(ord, 'full', true);
              }
            }
          } catch (err) {
            console.error('Auto-print KOT on realtime notification failed:', err);
          }
        }
      }
    };

    window.addEventListener('menukit-realtime-update', handleRealtimeUpdate);
    return () => window.removeEventListener('menukit-realtime-update', handleRealtimeUpdate);
  }, [fetchOrdersData, fetchStatusCounts]);

  // Periodic background check: auto-print any paid/preparing orders that haven't been printed yet,
  // regardless of which tab the merchant is currently viewing!
  useEffect(() => {
    const syncUnprintedPaidOrders = async () => {
      if (!autoPrintRef.current) return;
      try {
        const res = await api.get('/orders', { 
          params: { status_filter: 'preparing', limit: 20 } 
        });
        const preparingOrders = res.data || [];
        for (const ord of preparingOrders) {
          const isPaid = (ord.payment_status || '').toLowerCase() === 'paid';
          const isCash = ['cash', 'cash_on_delivery', 'counter'].includes((ord.payment_method || '').toLowerCase());
          const isPaidOrCash = isPaid || isCash;
          const normStatus = (ord.order_status || '').toUpperCase();
          const isAutoAccepted = (normStatus === 'ACCEPTED' || normStatus === 'PREPARING' || normStatus === 'PAID') && isPaidOrCash;
          if (isAutoAccepted && !isOrderKotPrintedRef.current(ord.id)) {
            await handleDirectPrintKotRef.current(ord, 'full', true);
          }
        }
      } catch {
        // silent background sync
      }
    };

    const intervalId = setInterval(syncUnprintedPaidOrders, 10000);
    const timeoutId = setTimeout(syncUnprintedPaidOrders, 1500);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, []);

  const handleLoadMore = () => {
    if (hasMore && !isLoadingMore && !isLoading) {
      const nextSkip = skip + PAGE_SIZE;
      fetchOrdersData(nextSkip, false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string, reason?: string, withRefund: boolean = true) => {
    const targetOrder = orders.find(o => o.id === orderId);
    if (targetOrder) {
      const curStatus = (targetOrder.order_status || '').toUpperCase();
      if (['COMPLETED', 'DELIVERED', 'CANCELLED', 'REJECTED'].includes(curStatus)) {
        toast.error(`Order is already ${curStatus.toLowerCase()} and cannot be modified.`);
        return;
      }
      if ((newStatus === 'COMPLETED' || newStatus === 'DELIVERED') && (targetOrder.payment_status || '').toLowerCase() !== 'paid' && curStatus !== 'PAID') {
        toast.error('Order must be marked as Paid before it can be marked as Completed.');
        return;
      }
    }

    if (newStatus === 'CANCELLED' && !reason) {
      setCancellingOrderId(orderId);
      setCancelOrderWithRefund(true);
      return;
    }
    
    setUpdatingOrderId(orderId);
    try {
      const payload: any = { status: newStatus };
      if (reason) payload.cancellation_reason = reason;
      if (newStatus === 'CANCELLED') payload.with_refund = withRefund;
      const res = await api.put(`/orders/${orderId}/status`, payload);
      toast.success(`Order marked as ${newStatus}`);
      fetchStatusCounts();
      setOrders(prev => {
        if (filterStatus !== 'all') {
          // If we are on a filtered tab, remove the order if it no longer matches the current tab
          if (filterStatus === 'preparing' && (newStatus === 'COMPLETED' || newStatus === 'DELIVERED' || newStatus === 'CANCELLED')) {
            return prev.filter(o => o.id !== orderId);
          }
          if (filterStatus === 'new' && newStatus !== 'PENDING_VENDOR' && newStatus !== 'PENDING') {
            return prev.filter(o => o.id !== orderId);
          }
          if (filterStatus === 'awaiting_payment' && newStatus !== 'PAYMENT_PENDING') {
            return prev.filter(o => o.id !== orderId);
          }
        }
        return prev.map(o => o.id === orderId ? { ...o, order_status: res.data.order_status, cancellation_reason: res.data.cancellation_reason, payment_status: res.data.payment_status ?? o.payment_status } : o);
      });

      // Auto-Print KOT to registered printer stations on order acceptance / preparing / paid
      const isAccepting = newStatus === 'ACCEPTED' || newStatus === 'PREPARING' || newStatus === 'PAID';
      if (isAccepting && autoPrintOnAccept && !isOrderKotPrinted(orderId)) {
        const targetOrder = orders.find(o => o.id === orderId) || res.data;
        if (targetOrder) {
          await handleDirectPrintKot(targetOrder, 'full', true);
        }
      }

      // Auto-Print Customer Bill on completion if configured
      if (newStatus === 'COMPLETED' && (autoPrintOnPayment || billingPrinter?.autoPrintOnPayment)) {
        const targetOrder = orders.find(o => o.id === orderId) || res.data;
        if (targetOrder) {
          const activePrinters = (billingPrinters && billingPrinters.length > 0)
            ? billingPrinters.filter(p => p.enabled !== false)
            : [billingPrinter];
          printBillToAllPrinters(targetOrder, shop, activePrinters).catch(e => console.error('Auto bill print failed:', e));
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update order status');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const [togglingItemId, setTogglingItemId] = useState<string | null>(null);
  const [togglingCancelItemId, setTogglingCancelItemId] = useState<string | null>(null);

  const handleToggleItemComplete = async (orderId: string, itemId: string) => {
    setTogglingItemId(itemId);
    try {
      const res = await api.put(`/orders/${orderId}/items/${itemId}/toggle-complete`);
      const updatedOrder = res.data;
      setOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
      if (itemsModalOrder && itemsModalOrder.id === orderId) {
        setItemsModalOrder(updatedOrder);
      }
      toast.success('Item status updated');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update item status');
    } finally {
      setTogglingItemId(null);
    }
  };

  const handleRestoreItem = async (orderId: string, itemId: string) => {
    setTogglingCancelItemId(itemId);
    try {
      const res = await api.put(`/orders/${orderId}/items/${itemId}/toggle-cancel`);
      const updatedOrder = res.data;
      setOrders(prev => {
        if (filterStatus === 'cancelled' && updatedOrder.order_status !== 'CANCELLED') {
          return prev.filter(o => o.id !== orderId);
        }
        return prev.map(o => o.id === orderId ? updatedOrder : o);
      });
      if (itemsModalOrder && itemsModalOrder.id === orderId) {
        setItemsModalOrder(updatedOrder);
      }
      fetchStatusCounts();
      toast.success('Item restored to order');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to restore item');
    } finally {
      setTogglingCancelItemId(null);
    }
  };

  const submitCancelItem = async () => {
    if (!cancellingItemOrder) return;
    const { orderId, itemId } = cancellingItemOrder;
    setTogglingCancelItemId(itemId);
    try {
      const finalReason = selectedCancelItemReason === 'custom'
        ? (customCancelItemReason.trim() || 'Item Cancelled')
        : (selectedCancelItemReason || 'Item Cancelled');
      const payload = { 
        reason: finalReason,
        with_refund: cancelItemWithRefund
      };
      const res = await api.put(`/orders/${orderId}/items/${itemId}/toggle-cancel`, payload);
      const updatedOrder = res.data;
      const allCancelled = (updatedOrder.items || []).length > 0 &&
        (updatedOrder.items || []).every((it: any) => it.is_cancelled);
      const isOrderCancelled = updatedOrder.order_status === 'CANCELLED' || allCancelled;

      setOrders(prev => {
        if (filterStatus !== 'all' && filterStatus !== 'cancelled' && isOrderCancelled) {
          // If all items are cancelled, remove order from active queue tabs
          return prev.filter(o => o.id !== orderId);
        }
        return prev.map(o => o.id === orderId ? updatedOrder : o);
      });
      if (itemsModalOrder && itemsModalOrder.id === orderId) {
        setItemsModalOrder(updatedOrder);
      }
      const isPaidOnline = String(updatedOrder.payment_status || '').toLowerCase() === 'paid' && String(updatedOrder.payment_method || '').toLowerCase() === 'online';
      if (isOrderCancelled) {
        if (cancelItemWithRefund && isPaidOnline) {
          toast.success('All items cancelled. Order cancelled & product total refunded (charges excluded).');
        } else {
          toast.success('All items cancelled. Order moved to Cancelled.');
        }
      } else {
        if (cancelItemWithRefund && isPaidOnline) {
          toast.success('Item cancelled & product price refunded to customer.');
        } else {
          toast.success('Item cancelled');
        }
      }

      const cancelledItem = (updatedOrder.items || []).find((it: any) => it.id === itemId) || {
        ...(cancellingItemOrder.item || {}),
        id: itemId,
        name: cancellingItemOrder.itemName,
        quantity: 1,
        is_cancelled: true,
        cancellation_reason: finalReason,
      };

      setCancellingItemOrder(null);
      setSelectedCancelItemReason(DEFAULT_ITEM_CANCELLATION_REASONS[0].id);
      setCustomCancelItemReason('');
      setCancelItemWithRefund(true);

      // Directly send VOID KOT to the cancelled item's station printer only
      await handleDirectPrintKot(updatedOrder, 'cancelled', true, {
        customItems: [{
          ...cancelledItem,
          is_cancelled: true,
          cancellation_reason: finalReason,
        }],
        kotTitle: 'VOID KOT - ITEM CANCELLED',
        reason: finalReason,
      });
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to cancel item');
    } finally {
      setTogglingCancelItemId(null);
    }
  };


  const submitCancelOrder = async () => {
    if (!cancellingOrderId) return;
    const targetOrder = orders.find(o => o.id === cancellingOrderId);
    const isPaid = targetOrder?.payment_status?.toLowerCase() === 'paid';
    const finalReason = cancelOrderReason.trim() || (selectedCancelOrderReason !== 'custom' ? selectedCancelOrderReason : '');
    if (!finalReason) {
      toast.error("Please provide a cancellation reason");
      return;
    }
    setIsCancelling(true);
    try {
      const effectiveRefund = isPaid ? cancelOrderWithRefund : false;
      await handleUpdateStatus(cancellingOrderId, 'CANCELLED', finalReason, effectiveRefund);
      setCancellingOrderId(null);
      setCancelOrderReason(DEFAULT_ORDER_CANCELLATION_REASONS[0].name);
      setSelectedCancelOrderReason(DEFAULT_ORDER_CANCELLATION_REASONS[0].id);
      setCancelOrderWithRefund(true);
    } finally {
      setIsCancelling(false);
    }
  };


  const handleUpdatePaymentStatus = useCallback(async (
    orderId: string, 
    newPayStatus: string, 
    customMethod?: string, 
    customSplit?: any[]
  ) => {
    const targetOrder = orders.find(o => o.id === orderId);
    if (targetOrder) {
      const curStatus = (targetOrder.order_status || '').toUpperCase();
      if (curStatus === 'COMPLETED' || curStatus === 'DELIVERED') {
        toast.error('Payment status cannot be changed for completed orders.');
        return;
      }
      if ((curStatus === 'CANCELLED' || curStatus === 'REJECTED') && newPayStatus !== 'refunded') {
        toast.error('Payment status cannot be changed for cancelled orders.');
        return;
      }
    }

    // If user selected 'paid' without supplying payment mode, open selection modal
    if (newPayStatus.toLowerCase() === 'paid' && !customMethod) {
      if (targetOrder) {
        setPaymentModeModalOrder(targetOrder);
      }
      return;
    }

    try {
      const payload: any = { payment_status: newPayStatus };
      if (customMethod) {
        payload.payment_method = customMethod;
      }
      if (customSplit) {
        payload.split_payments = customSplit;
      }
      const res = await api.put(`/orders/${orderId}/payment`, payload);
      const methodLabel = customMethod ? ` (${customMethod.toUpperCase()})` : '';
      toast.success(`Payment marked as ${newPayStatus.toUpperCase()}${methodLabel}`);
      fetchStatusCounts();
      setOrders(prev => prev.map(o => o.id === orderId ? { 
        ...o, 
        payment_status: res.data.payment_status ?? newPayStatus, 
        payment_method: res.data.payment_method ?? (customMethod || o.payment_method),
        split_payments: res.data.split_payments ?? customSplit ?? o.split_payments,
        order_status: res.data.order_status ?? o.order_status 
      } : o));

      // If marked as paid, automatically print KOT if not yet printed
      if (newPayStatus.toLowerCase() === 'paid' && autoPrintOnAccept && !isOrderKotPrinted(orderId)) {
        const fullOrder = orders.find(o => o.id === orderId) || res.data;
        if (fullOrder) {
          handleDirectPrintKot(fullOrder, 'full', true);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update payment status');
    }
  }, [fetchStatusCounts, autoPrintOnAccept, isOrderKotPrinted, orders, handleDirectPrintKot]);

  const handleRetryRefund = useCallback(async (orderId: string) => {
    setRefundingOrderId(orderId);
    try {
      const res = await api.post(`/orders/${orderId}/refund`);
      toast.success('Refund processed successfully via Razorpay!');
      fetchStatusCounts();
      setOrders(prev => prev.map(o => o.id === orderId ? res.data : o));
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Refund failed. Please check Razorpay account / balance.');
      fetchStatusCounts();
    } finally {
      setRefundingOrderId(null);
    }
  }, [fetchStatusCounts]);

  return (
    <div className="max-w-5xl mx-auto animate-fade-in pb-24 lg:pb-12 space-y-4">
      
      <HeaderActions>
        <Button
          size="sm"
          onClick={() => setIsCreateModalOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
          className="bg-primary text-white hover:bg-primary/90"
        >
          Create Order
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchOrdersData(0, true)}
          disabled={isLoading}
          leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
        >
          Refresh
        </Button>
      </HeaderActions>

      {isLocked && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/40 dark:to-orange-950/40 border-2 border-red-500/50 p-6 rounded-3xl text-center space-y-4 shadow-xl mb-4">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto shadow-inner">
            <Lock size={28} />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Orders Management Locked</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Your subscription has ended. Orders management and live order queue data features are locked by the backend. Please renew your subscription to access orders.
            </p>
          </div>
          <Button onClick={() => navigate('/subscription')} className="bg-primary hover:bg-primary/90 text-white font-extrabold text-xs uppercase tracking-wider px-6 py-3 shadow-md">
            Renew Subscription Now →
          </Button>
        </div>
      )}

      {/* Tabs — sticky top with backdrop blur matching Menus page */}
      <div className="sticky top-[-16px] sm:top-[-24px] lg:top-[-32px] z-20 bg-background/95 backdrop-blur-md pb-2.5 pt-2.5 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-b border-border mb-4 space-y-2">
        {/* Row 1: Status Filters - Sleek Horizontal Scrollable Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-hide py-0.5 whitespace-nowrap">
          {[
            { id: 'all', label: 'All Orders', count: statusCounts.all ?? 0, activeBg: 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm' },
            { id: 'new', label: 'New Orders', count: statusCounts.new ?? 0, activeBg: 'bg-amber-500 text-white shadow-sm' },
            { id: 'awaiting_payment', label: 'Awaiting Payment', count: statusCounts.awaiting_payment ?? 0, activeBg: 'bg-blue-500 text-white shadow-sm' },
            { id: 'preparing', label: 'Awaiting Complete', count: statusCounts.preparing ?? 0, activeBg: 'bg-cyan-500 text-white shadow-sm' },
            { id: 'completed', label: 'Completed', count: statusCounts.completed ?? 0, activeBg: 'bg-emerald-500 text-white shadow-sm' },
            { id: 'cancelled', label: 'Cancelled', count: statusCounts.cancelled ?? 0, activeBg: 'bg-rose-500 text-white shadow-sm' },
            { id: 'awaiting_refund', label: 'Awaiting Refund', count: statusCounts.awaiting_refund ?? 0, activeBg: 'bg-purple-600 text-white shadow-sm' },
          ].map(tab => {
            const isSelected = filterStatus === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (filterStatus !== tab.id) {
                    setIsLoading(true);
                    setFilterStatus(tab.id);
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer border ${
                  isSelected
                    ? `${tab.activeBg} border-transparent`
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  isSelected
                    ? 'bg-white/20 text-white dark:bg-black/20 dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Row 2: Order Type Secondary Filters + Quick Date Shortcuts */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-hide py-0.5 whitespace-nowrap text-xs">
          {[
            { id: 'all', label: 'All Types', activeBg: 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900' },
            { id: 'dine_in', label: 'Dine-in', activeBg: 'bg-indigo-600 text-white shadow-xs border-transparent' },
            { id: 'takeaway', label: 'Takeaway', activeBg: 'bg-amber-500 text-white shadow-xs border-transparent' },
            { id: 'delivery', label: 'Online / Delivery', activeBg: 'bg-fuchsia-600 text-white shadow-xs border-transparent' },
          ].map(typeTab => {
            const isSelected = filterType === typeTab.id;
            return (
              <button
                key={typeTab.id}
                onClick={() => {
                  if (filterType !== typeTab.id) {
                    setIsLoading(true);
                    setFilterType(typeTab.id);
                  }
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 cursor-pointer border ${
                  isSelected
                    ? `${typeTab.activeBg} border-transparent`
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {typeTab.label}
              </button>
            );
          })}

          <span className="h-3.5 w-px bg-slate-200 dark:bg-slate-700 mx-1 shrink-0" />

          {/* Quick Date Presets */}
          <span className="text-[10.5px] font-bold text-slate-400 flex items-center gap-1 shrink-0">
            <Filter size={10} /> Date:
          </span>
          <button
            type="button"
            onClick={() => setSelectedDate(getTodayDateStr())}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 border ${
              selectedDate === getTodayDateStr()
                ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setSelectedDate(getYesterdayDateStr())}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 border ${
              selectedDate === getYesterdayDateStr()
                ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            Yesterday
          </button>
          <button
            type="button"
            onClick={() => setSelectedDate('')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 border ${
              !selectedDate
                ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            All Time
          </button>
        </div>

        {/* Row 3: Search & Date Filter Controls (1 compact row on both mobile & desktop) */}
        <div className="flex items-center gap-2 pt-0.5">
          {/* API Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} />
            <input
              type="text"
              placeholder="Search customer, phone, table, order ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-amber-500 font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 shadow-xs h-9"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                title="Clear Search"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Custom DatePicker + Clear */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-32 sm:w-40 relative">
              <DatePicker
                value={selectedDate}
                onChange={(date) => setSelectedDate(date)}
                placeholder="Date"
                className="text-xs"
              />
            </div>
            {selectedDate && (
              <button
                type="button"
                onClick={() => setSelectedDate('')}
                className="h-9 px-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                title="Clear Filter"
              >
                <X size={12} />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}
          </div>
        </div>
      </div>


      {isLoading ? (
        <div className="flex flex-col gap-4 max-w-3xl mx-auto">
          {[1, 2, 3].map((n) => (
            <OrderCardSkeleton key={n} />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <Card className="p-12 text-center flex flex-col items-center justify-center">
          <ShoppingBag size={48} className="text-slate-300 dark:text-slate-700 mb-3" />
          <h3 className="font-bold text-slate-700 dark:text-slate-350 text-base">No orders found</h3>
          <p className="text-sm text-slate-400">
            {debouncedSearch ? `No orders match "${debouncedSearch}".` : 'There are no orders matching this filter right now.'}
          </p>
        </Card>
      ) : (

        <div className="flex flex-col gap-4 max-w-3xl mx-auto">
          {orders
            .filter(order => {
              const allItemsCancelled = Boolean(order.items && order.items.length > 0 && order.items.every((it: any) => it.is_cancelled));
              const isCancelled = allItemsCancelled || order.order_status === 'CANCELLED' || order.order_status === 'REJECTED';
              if (filterStatus === 'all') return true;
              if (filterStatus === 'cancelled') return isCancelled;
              if (isCancelled) return false;
              
              const s = (order.order_status || '').toUpperCase();
              if (filterStatus === 'new') return s === 'PENDING_VENDOR' || s === 'PENDING';
              if (filterStatus === 'awaiting_payment') return s === 'PAYMENT_PENDING';
              if (filterStatus === 'preparing') return ['PAID', 'ACCEPTED', 'PREPARING', 'READY'].includes(s);
              if (filterStatus === 'completed') return s === 'COMPLETED' || s === 'DELIVERED';
              if (filterStatus === 'awaiting_refund') {
                const p = (order.payment_status || '').toLowerCase();
                return ['refund_pending', 'refund_failed', 'awaiting_refund'].includes(p) || (isCancelled && ['paid', 'partially_refunded'].includes(p));
              }
              return true;
            })
            .map(order => {
              const allItemsCancelled = Boolean(order.items && order.items.length > 0 && order.items.every((it: any) => it.is_cancelled));
              const status = allItemsCancelled ? 'CANCELLED' : order.order_status;
              const normStatus = (status || '').toUpperCase();
              const isDineIn = order.order_type === 'dine_in';
              
              // Status booleans
              const isPendingVendor = !allItemsCancelled && (normStatus === 'PENDING_VENDOR' || normStatus === 'PENDING');
              const isPaymentPending = !allItemsCancelled && normStatus === 'PAYMENT_PENDING';
              const isPaymentPaid = !allItemsCancelled && ((order.payment_status || '').toLowerCase() === 'paid' || normStatus === 'PAID');
              const isPreparing = !allItemsCancelled && (normStatus === 'PREPARING' || normStatus === 'ACCEPTED' || normStatus === 'PAID');
              const isReady = !allItemsCancelled && normStatus === 'READY';
              const isCompleted = !allItemsCancelled && (normStatus === 'COMPLETED' || normStatus === 'DELIVERED');
              const isCancelled = allItemsCancelled || normStatus === 'CANCELLED' || normStatus === 'REJECTED';
              
              const isCancellable = isPendingVendor || isPaymentPending;
              
              const { date, time } = formatDateTime(order.created_at);
              
              // Colors: Completed/Delivered orders show emerald green border (#10b981)
              const borderColor = isPendingVendor
                ? '#f59e0b'
                : isPaymentPending
                  ? '#f97316'
                  : (isPreparing || isReady)
                    ? '#06b6d4'
                    : isCompleted
                      ? '#10b981'
                      : isCancelled
                        ? '#ef4444'
                        : '#94a3b8';
              
              // Sort items so active/unserved items appear first, completed next, and cancelled at the end
              const sortedItems = [...(order.items ?? [])].sort((a: any, b: any) => {
                if (Boolean(a.is_cancelled) !== Boolean(b.is_cancelled)) return a.is_cancelled ? 1 : -1;
                if (Boolean(a.is_completed) !== Boolean(b.is_completed)) return a.is_completed ? 1 : -1;
                return 0;
              });
              const previewItems = sortedItems.slice(0, 3);
              const extraCount = sortedItems.length - previewItems.length;

              return (
                <Card key={order.id} className="relative overflow-hidden border-l-4 shadow-sm hover:shadow-md transition-all rounded-2xl bg-card" style={{ borderLeftColor: borderColor }}>
                  <CardContent className="p-4 sm:p-5 space-y-4">

                    {/* Top Bar: Order ID, Copy Action, Type, Date/Time & Status Dropdown */}
                    <div className="flex items-start justify-between gap-2.5 pb-3 border-b border-border/60">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-base font-extrabold text-foreground tracking-tight">
                              #{order.daily_order_number || order.id.slice(0, 8).toUpperCase()}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(order.id);
                                toast.success('Order ID copied');
                              }}
                              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                              title="Copy Full Order ID"
                            >
                              <Copy size={13} />
                            </button>
                          </div>

                          <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider ${
                            order.order_type === 'dine_in' ? 'text-indigo-600 bg-indigo-50 border border-indigo-100 dark:text-indigo-400 dark:bg-indigo-950/40 dark:border-indigo-900/40' :
                            order.order_type === 'takeaway' ? 'text-amber-600 bg-amber-50 border border-amber-100 dark:text-amber-400 dark:bg-amber-950/40 dark:border-amber-900/40' :
                            'text-fuchsia-600 bg-fuchsia-50 border border-fuchsia-100 dark:text-fuchsia-400 dark:bg-fuchsia-950/40 dark:border-fuchsia-900/40'
                          }`}>
                            {order.order_type === 'delivery' ? 'Delivery' : order.order_type?.replace('_', ' ')}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock size={11} />
                          <span>{date} &bull; {time}</span>
                        </div>
                      </div>

                      <div className="shrink-0 pt-0.5">
                        <OrderStatusDropdown
                          orderId={order.id}
                          orderStatus={status}
                          paymentStatus={order.payment_status}
                          paymentMethod={order.payment_method}
                          orderType={order.order_type}
                          onSelect={handleUpdateStatus}
                        />
                      </div>
                    </div>

                  {/* Content Grid: Customer & Items Side-by-Side */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {/* Customer Information Box */}
                    <div
                      onClick={() => setCustomerModalOrder(order)}
                      className="p-3.5 bg-muted/40 hover:bg-muted/70 rounded-xl text-xs space-y-2 cursor-pointer transition-colors border border-border/50 flex flex-col justify-between"
                      title="Click to view full customer details"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-muted-foreground flex items-center gap-1.5">
                          <User size={13} className="text-primary/70" /> Customer
                        </span>
                        <span className="font-extrabold text-foreground text-sm">{order.customer_name}</span>
                      </div>

                      <div className="space-y-1.5 pt-1.5 border-t border-border/40 border-dashed">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                            <Phone size={12} /> Contact
                          </span>
                          <span className="font-mono text-foreground font-semibold">
                            {order.customer_phone || <span className="text-muted-foreground/80 font-normal italic">Walk-in</span>}
                          </span>
                        </div>
                        {order.table_number && (
                          <div className="flex justify-between items-center pt-1 border-t border-border/30">
                            <span className="text-muted-foreground font-medium">Table</span>
                            <span className="font-black text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                              #{order.table_number}
                            </span>
                          </div>
                        )}
                        {order.order_type === 'delivery' && (() => {
                          const distKm = getOrderDistanceKm(order, shop?.latitude, shop?.longitude);
                          const formattedDist = formatDistanceWithUnit(distKm, shop?.settings?.currency);
                          return (
                            <div className="flex justify-between items-center pt-1 border-t border-border/30">
                              <span className="text-muted-foreground font-medium flex items-center gap-1">
                                <Navigation size={11} className="text-amber-500" /> Distance
                              </span>
                              <span className="font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md font-mono text-[11px]">
                                {formattedDist ? `${formattedDist} away` : 'GPS attached'}
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Order Items Preview Box */}
                    <div
                      onClick={() => setItemsModalOrder(order)}
                      className="cursor-pointer group bg-muted/40 hover:bg-muted/70 p-3.5 rounded-xl border border-border/50 transition-colors flex flex-col justify-between"
                      title="Click to view all items & notes"
                    >
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <ShoppingBag size={12} className="text-amber-500" /> Items
                          </span>
                          <div className="flex items-center gap-1.5">
                            {order.items?.some((it: any) => it.is_cancelled && String(it.cancellation_reason || '').startsWith('Replaced with')) && (
                              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded">
                                {order.items.filter((it: any) => it.is_cancelled && String(it.cancellation_reason || '').startsWith('Replaced with')).length} Replaced
                              </span>
                            )}
                            {order.items?.some((it: any) => it.is_cancelled && !String(it.cancellation_reason || '').startsWith('Replaced with')) && (
                              <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/60 px-1.5 py-0.5 rounded">
                                {order.items.filter((it: any) => it.is_cancelled && !String(it.cancellation_reason || '').startsWith('Replaced with')).length} Cancelled
                              </span>
                            )}
                            {['COMPLETED', 'DELIVERED'].includes(String(order.order_status || '').toUpperCase()) ? (
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                                {order.items.filter((it: any) => !it.is_cancelled).length}/{order.items.filter((it: any) => !it.is_cancelled).length} Given
                              </span>
                            ) : order.items?.some((it: any) => it.is_completed && !it.is_cancelled) && (
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                                {order.items.filter((it: any) => it.is_completed && !it.is_cancelled).length}/{order.items.filter((it: any) => !it.is_cancelled).length} Given
                              </span>
                            )}
                            <Badge variant="secondary" className="text-[10px] font-bold bg-background border border-border/60">
                              {order.items?.reduce((acc: number, cur: any) => acc + cur.quantity, 0) || 0} Item(s)
                            </Badge>
                          </div>
                        </div>

                        <ul className="text-xs space-y-1.5">
                          {previewItems.map((item: any, i: number) => {
                            const isOrderCompleted = ['COMPLETED', 'DELIVERED'].includes(String(order.order_status || '').toUpperCase());
                            const isDone = Boolean(item.is_completed) || isOrderCompleted;
                            const isCancelled = Boolean(item.is_cancelled);
                            const isReplaced = isCancelled && String(item.cancellation_reason || '').startsWith('Replaced with');
                            const hasMixed = order.items?.some((it: any) => it.is_completed && !it.is_cancelled) && order.items?.some((it: any) => !it.is_completed && !it.is_cancelled);
                            const isNewUnserved = !isDone && !isCancelled && !isOrderCompleted && (hasMixed || isNewlyAddedItem(item, order));
                            return (
                              <li key={i} className={`flex justify-between items-center ${
                                isReplaced 
                                  ? 'line-through text-amber-700/80 dark:text-amber-400/80 opacity-75' 
                                  : isCancelled 
                                  ? 'line-through text-rose-400/80 dark:text-rose-500/80 opacity-70' 
                                  : isDone 
                                  ? 'line-through text-slate-400 dark:text-slate-500 opacity-60' 
                                  : 'text-foreground'
                              }`}>
                                <span className="truncate pr-2 font-medium group-hover:text-primary transition-colors flex items-center gap-1.5">
                                  {isReplaced ? (
                                    <RotateCcw size={12} className="text-amber-600 dark:text-amber-400 shrink-0" />
                                  ) : isCancelled ? (
                                    <XCircle size={12} className="text-rose-500 shrink-0" />
                                  ) : isDone ? (
                                    <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                                  ) : (
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                                  )}
                                  <span>{item.name}</span>
                                  {isCancelled && (
                                    isReplaced ? (
                                      <span className="text-[8.5px] font-black tracking-wider bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-1 py-0.2 rounded shrink-0">
                                        REPLACED
                                      </span>
                                    ) : (
                                      <span className="text-[8.5px] font-black tracking-wider bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-1 py-0.2 rounded shrink-0">
                                        CANCELLED
                                      </span>
                                    )
                                  )}
                                  {isNewUnserved && (
                                    <span className="text-[9px] font-black tracking-wider bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-1.5 py-0.2 rounded shrink-0">
                                      NEW
                                    </span>
                                  )}
                                </span>
                                <span className={`font-bold shrink-0 text-[11px] ${
                                  isReplaced ? 'text-amber-600 dark:text-amber-400' : isCancelled ? 'text-rose-400' : 'text-foreground'
                                }`}>x{item.quantity}</span>
                              </li>
                            );
                          })}

                          {extraCount > 0 && (
                            <li className="text-[10px] font-bold text-muted-foreground pt-0.5 text-center">
                              + {extraCount} more items
                            </li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Cancellation Reason if cancelled */}
                  {status === 'CANCELLED' && (order.cancellation_reason || allItemsCancelled) && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-100 dark:border-rose-900/30 text-xs">
                      <span className="block font-bold text-rose-700 dark:text-rose-400 mb-0.5">Cancellation Reason</span>
                      <p className="text-rose-600 dark:text-rose-300 font-medium">
                        {order.cancellation_reason || 'All items in this order were cancelled.'}
                      </p>
                    </div>
                  )}

                  {/* Bottom Bar: Clean 2-Tier Financial & Action Controls Layout */}
                  <div className="pt-3 border-t border-border/60 space-y-2.5">
                    {/* Tier 1: Full-Width Financial Summary Card */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 rounded-xl p-3">
                      <div className="flex items-center justify-between sm:justify-start sm:flex-col sm:items-start gap-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Payment</span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setPaymentModeModalOrder(order)}
                            title="Click to change payment method"
                            className="font-bold capitalize text-xs text-foreground shrink-0 hover:text-primary transition-colors cursor-pointer flex items-center gap-1 group/pm px-1 py-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <span>{order.payment_method}</span>
                          </button>
                          <PayDropdown
                            orderId={order.id}
                            paymentStatus={order.payment_status}
                            paymentMethod={order.payment_method}
                            orderStatus={order.order_status}
                            onSelect={(oId, val) => {
                              if (val === 'paid') {
                                setPaymentModeModalOrder(order);
                              } else {
                                handleUpdatePaymentStatus(oId, val);
                              }
                            }}
                            disabled={order.order_type === 'takeaway' && order.payment_method === 'online'}
                          />
                        </div>
                        {/* Split Payments Breakdown Badges */}
                        {order.split_payments && Array.isArray(order.split_payments) && order.split_payments.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                            {order.split_payments.map((sp: any, spIdx: number) => {
                              const spMethod = (sp.method || 'cash').toUpperCase();
                              const spAmt = Number(sp.amount || 0);
                              return (
                                <span
                                  key={spIdx}
                                  className="inline-flex items-center gap-1 text-[11px] font-bold font-mono px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700 shadow-2xs"
                                >
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight">{spMethod}:</span>
                                  <span className="text-primary font-black">{shop?.settings?.currency || '₹'}{spAmt.toFixed(2)}</span>
                                </span>
                              );
                            })}
                          </div>
                        )}
                        {order.payment_session_id && (
                          <div className="flex items-center gap-1 text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded max-w-fit">
                            <span className="font-bold text-[9px] text-slate-400">PAY ID:</span>
                            <span className="truncate max-w-[130px]">{order.payment_session_id}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(order.payment_session_id);
                                toast.success('Payment ID copied!');
                              }}
                              className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                              title="Copy Razorpay Payment ID"
                            >
                              <Copy size={10} />
                            </button>
                          </div>
                        )}
                        {order.refund_id && (
                          <div className="flex items-center gap-1 text-[10px] font-mono text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800 max-w-fit">
                            <span className="font-bold text-[9px] text-purple-500">REFUND ID:</span>
                            <span className="truncate max-w-[130px]">{order.refund_id}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(order.refund_id);
                                toast.success('Refund ID copied!');
                              }}
                              className="text-purple-400 hover:text-purple-700 dark:hover:text-white cursor-pointer"
                              title="Copy Refund ID"
                            >
                              <Copy size={10} />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Mobile Divider */}
                      <div className="border-t border-slate-200/60 dark:border-slate-800 sm:hidden" />

                      {(() => {
                        const isGstEnabled = Boolean(shop?.settings?.gst_enabled);
                        const cgstRate = Number(shop?.settings?.cgst_rate || 0);
                        const sgstRate = Number(shop?.settings?.sgst_rate || 0);
                        const totalTaxRate = cgstRate + sgstRate;
                        const isExclusiveTax = isGstEnabled && !shop?.settings?.inclusive_tax;

                        const allItems = order.items || [];
                        const presentedItems = allItems.filter((it: any) => !String(it.cancellation_reason || '').startsWith('Replaced with'));
                        const allItemsSubtotal = presentedItems.reduce((sum: number, it: any) => sum + (Number(it.price || 0) * Number(it.quantity || 1)), 0);
                        const activeItems = allItems.filter((it: any) => !it.is_cancelled);
                        const isOrderCancelled = status === 'CANCELLED' || allItemsCancelled;
                        const itemsSubtotal = (isOrderCancelled && activeItems.length === 0)
                          ? allItemsSubtotal
                          : activeItems.reduce((sum: number, it: any) => sum + (Number(it.price || 0) * Number(it.quantity || 1)), 0);

                        let taxAmount = 0;
                        if (isGstEnabled && totalTaxRate > 0) {
                          if (isExclusiveTax) {
                            taxAmount = Math.round((itemsSubtotal * (totalTaxRate / 100)) * 100) / 100;
                          } else {
                            const taxable = Math.round((itemsSubtotal / (1 + totalTaxRate / 100)) * 100) / 100;
                            taxAmount = Math.round((itemsSubtotal - taxable) * 100) / 100;
                          }
                        }

                        const deliveryFee = order.order_type === 'delivery'
                          ? getOrderDeliveryFee(order, shop?.settings, shop?.latitude, shop?.longitude)
                          : 0;

                        const foodTotal = isExclusiveTax 
                          ? Math.round((itemsSubtotal + taxAmount) * 100) / 100 
                          : itemsSubtotal;

                        const computedTotal = foodTotal + deliveryFee;
                        const rawTotal = Number(order.total_amount || 0);
                        const finalTotal = rawTotal > 0 ? (isOrderCancelled && activeItems.length === 0 ? allItemsSubtotal : rawTotal) : (computedTotal > 0 ? computedTotal : allItemsSubtotal);

                        const replacedCredit = calculateOrderReplacementCredit(allItems, false);
                        const isPendingDiff = (order.payment_status || '').toLowerCase() === 'pending' && replacedCredit > 0;
                        const remainingProductDue = isPendingDiff ? Math.max(0, finalTotal - replacedCredit) : 0;

                        const isRefunded = ['refunded', 'partially_refunded'].includes(String(order.payment_status || '').toLowerCase());
                        const refundedAmount = isRefunded ? (isOrderCancelled ? finalTotal : (allItems.reduce((acc: number, it: any) => {
                          if (it.is_cancelled && !String(it.cancellation_reason || '').startsWith('Replaced with')) {
                            const predecessor = allItems.find((p: any) =>
                              p.is_cancelled && String(p.cancellation_reason || '').startsWith(`Replaced with ${it.name}`)
                            );
                            if (predecessor) {
                              return acc + Math.min(Number(it.price || 0) * Number(it.quantity || 1), Number(predecessor.price || 0) * Number(predecessor.quantity || 1));
                            }
                            return acc + (Number(it.price || 0) * Number(it.quantity || 1));
                          }
                          return acc;
                        }, 0))) : 0;

                        const manualDiscountCode = (order.applied_discount_codes || []).find((c: string) => 
                          c.startsWith('Discount (') || c.startsWith('Flat Discount (')
                        );
                        const otherDiscountCodes = (order.applied_discount_codes || []).filter((c: string) => 
                          !c.startsWith('Discount (') && !c.startsWith('Flat Discount (')
                        );
                        const discountSavings = Math.max(0, itemsSubtotal - (rawTotal > 0 ? rawTotal : (computedTotal > 0 ? computedTotal : itemsSubtotal)));

                        return (
                          <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-1">
                            <div className="flex items-center gap-1.5 justify-end">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Total Amount</span>
                              {(discountSavings > 0 || (order.applied_discount_codes && order.applied_discount_codes.length > 0)) && (
                                <span className="text-[10px] font-bold text-muted-foreground line-through font-mono">
                                  {shop?.settings?.currency || '₹'}{itemsSubtotal.toFixed(2)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-baseline gap-1.5 justify-end flex-wrap">
                              <span className="font-black text-base sm:text-lg text-foreground font-mono tracking-tight">
                                {shop?.settings?.currency || '₹'}{finalTotal.toFixed(2)}
                              </span>
                              {manualDiscountCode && (
                                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded tracking-tight bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-mono">
                                  {manualDiscountCode}
                                </span>
                              )}
                              {otherDiscountCodes.length > 0 && (
                                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded tracking-tight bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-mono">
                                  {otherDiscountCodes.join(', ')} {discountSavings > 0 ? `(-${shop?.settings?.currency || '₹'}${discountSavings.toFixed(2)})` : ''}
                                </span>
                              )}
                              {!manualDiscountCode && otherDiscountCodes.length === 0 && discountSavings > 0 && (
                                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded tracking-tight bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-mono">
                                  -{shop?.settings?.currency || '₹'}{discountSavings.toFixed(2)} Off
                                </span>
                              )}
                              {order.order_type === 'delivery' && deliveryFee > 0 && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded tracking-tight bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30">
                                  +{shop?.settings?.currency || '₹'}{deliveryFee.toFixed(2)} Delivery Fee
                                </span>
                              )}
                              {isGstEnabled && totalTaxRate > 0 && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded tracking-tight ${
                                  isExclusiveTax
                                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                                    : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                }`}>
                                  {isExclusiveTax ? `+${shop?.settings?.currency || '₹'}${taxAmount.toFixed(2)} GST (${totalTaxRate}%)` : `incl. ${shop?.settings?.currency || '₹'}${taxAmount.toFixed(2)} GST`}
                                </span>
                              )}
                            </div>
                            {isPendingDiff && remainingProductDue > 0 && (
                              <div className="flex items-center justify-end gap-1.5 pt-0.5">
                                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-800">
                                  Paid: {shop?.settings?.currency || '₹'}{replacedCredit.toFixed(2)} &bull; Due: {shop?.settings?.currency || '₹'}{remainingProductDue.toFixed(2)}
                                </span>
                              </div>
                            )}
                            {isRefunded && refundedAmount > 0 && (
                              <div className="flex items-center justify-end gap-1.5 pt-0.5">
                                <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/60 px-2 py-0.5 rounded border border-purple-300 dark:border-purple-800">
                                  Refunded: {shop?.settings?.currency || '₹'}{refundedAmount.toFixed(2)}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Tier 2: Operational Action Controls (Evenly Distributed Grid) */}
                    {(() => {
                      const hasCancelBtn = status !== 'COMPLETED' && status !== 'CANCELLED';
                      const isRefundNeeded = order.payment_method === 'online' && (
                        ['refund_pending', 'refund_failed', 'awaiting_refund'].includes((order.payment_status || '').toLowerCase()) ||
                        (status === 'CANCELLED' && ['paid', 'partially_refunded'].includes((order.payment_status || '').toLowerCase()))
                      );
                      const manualDiscountCode = (order.applied_discount_codes || []).find((c: string) => 
                        c.startsWith('Discount (') || c.startsWith('Flat Discount (')
                      );

                      return (
                        <div className="grid grid-cols-2 gap-2 w-full pt-0.5">
                          {/* Physical Refund Button if refund failed / pending or cancelled paid order */}
                          {isRefundNeeded && (
                            <Button
                              size="sm"
                              className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-9 px-3.5 justify-center w-full col-span-2 shadow-xs gap-1.5 cursor-pointer"
                              onClick={() => handleRetryRefund(order.id)}
                              isLoading={refundingOrderId === order.id}
                            >
                              <RotateCcw size={13} />
                              <span>Process / Retry Refund ({shop?.settings?.currency || '₹'}{Number(order.total_amount).toFixed(2)})</span>
                            </Button>
                          )}
                          {/* KOT / POT Production Ticket Controls */}
                          {status !== 'COMPLETED' && status !== 'CANCELLED' && !isPendingVendor && (
                            printedOrders[order.id] ? (
                              <div className="inline-flex items-center justify-between rounded-xl border border-emerald-300/80 dark:border-emerald-800/80 bg-emerald-50/80 dark:bg-emerald-950/40 overflow-hidden shadow-2xs h-9 w-full col-span-1">
                                <span className="px-2.5 sm:px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 border-r border-emerald-200 dark:border-emerald-800/80 truncate">
                                  <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                                  <span className="truncate">{businessCategory.kotShort} Printed</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleDirectPrintKot(order, 'full')}
                                  className="px-2.5 sm:px-3 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                                  title={`Reprint ${businessCategory.kotShort}`}
                                >
                                  <RotateCcw size={12} />
                                  <span>Reprint</span>
                                </button>
                              </div>
                            ) : (
                              <div className="inline-flex items-center rounded-xl border border-amber-500/40 bg-amber-500/10 overflow-hidden shadow-2xs h-9 w-full col-span-1">
                                <button
                                  type="button"
                                  onClick={() => handleDirectPrintKot(order, 'full')}
                                  className="w-full h-full px-3 py-1 text-xs font-bold text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                                  title={`Print ${businessCategory.kotShort} directly to printer`}
                                >
                                  {businessCategory.isFood ? (
                                    <UtensilsCrossed size={13} className="text-amber-500 shrink-0" />
                                  ) : (
                                    <ShoppingBag size={13} className="text-amber-500 shrink-0" />
                                  )}
                                  <span>Print {businessCategory.kotShort}</span>
                                </button>
                              </div>
                            )
                          )}

                          {/* Add Items Button */}
                          {status !== 'COMPLETED' && status !== 'CANCELLED' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setTargetOrderForAdd(order)}
                              leftIcon={<Plus size={13} />}
                              className={`border-primary/40 text-primary hover:bg-primary/10 text-xs font-bold h-9 px-3.5 justify-center w-full whitespace-nowrap ${isPendingVendor ? 'col-span-2' : 'col-span-1'}`}
                            >
                              Add Items
                            </Button>
                          )}

                          {/* Apply Discount Button for active orders */}
                          {status !== 'COMPLETED' && status !== 'CANCELLED' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openDiscountModal(order)}
                              leftIcon={<Percent size={12} className={manualDiscountCode ? 'text-emerald-600 dark:text-emerald-400' : 'text-primary'} />}
                              className={`text-xs font-bold h-9 px-3.5 justify-center w-full whitespace-nowrap col-span-1 cursor-pointer ${
                                manualDiscountCode 
                                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/20' 
                                  : 'border-primary/40 text-primary hover:bg-primary/10'
                              }`}
                            >
                              {manualDiscountCode ? 'Edit Discount' : 'Apply Discount'}
                            </Button>
                          )}

                          {/* Cancel Button for active orders */}
                          {hasCancelBtn && (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40 text-xs font-bold h-9 px-3.5 justify-center w-full whitespace-nowrap col-span-1 cursor-pointer"
                              onClick={() => {
                                setCancellingOrderId(order.id);
                                setSelectedCancelOrderReason(DEFAULT_ORDER_CANCELLATION_REASONS[0].id);
                                setCancelOrderReason(DEFAULT_ORDER_CANCELLATION_REASONS[0].name);
                              }}
                              disabled={updatingOrderId === order.id}
                              leftIcon={<XCircle size={13} />}
                            >
                              Cancel
                            </Button>
                          )}

                          {/* Bill & Tax Invoice Print Buttons (For completed orders) */}
                          {status === 'COMPLETED' && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setThermalPrintOrder(order);
                                }}
                                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1 text-xs font-bold rounded-xl shadow-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer w-full whitespace-nowrap col-span-1"
                                title="Open thermal bill receipt & print to cashier printers"
                              >
                                <Printer size={13} />
                                <span>Print Bill</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  const tId = toast.loading('Preparing Tax Invoice...');
                                  printOrderA4Invoice(order, shop).then((res) => {
                                    if (res) {
                                      toast.success('Tax Invoice ready!', { id: tId });
                                    } else {
                                      toast.error('Could not open print window', { id: tId });
                                    }
                                  });
                                }}
                                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1 text-xs font-bold rounded-xl shadow-xs h-9 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer w-full whitespace-nowrap col-span-1"
                                title="Print standard A4 / PDF Tax Invoice"
                              >
                                <FileText size={13} className="text-primary" />
                                <span>Print Invoice</span>
                              </button>
                            </>
                          )}

                          {/* Primary Order Progress Action: Accept Order */}
                          {isPendingVendor && (
                            <Button
                              size="sm"
                              className="text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white h-9 shadow-xs px-4 justify-center w-full whitespace-nowrap col-span-2 cursor-pointer"
                              onClick={() => {
                                const isPaid = (order.payment_status || '').toLowerCase() === 'paid';
                                const isCash = order.payment_method === 'cash' || order.payment_method === 'cash_on_delivery' || order.payment_method === 'counter';
                                const nextStatus = (isPaid || isCash) ? 'PREPARING' : 'PAYMENT_PENDING';
                                handleUpdateStatus(order.id, nextStatus);
                              }}
                              isLoading={updatingOrderId === order.id}
                            >
                              {(order.payment_status || '').toLowerCase() === 'paid'
                                ? 'Accept Order'
                                : (order.payment_method === 'cash' || order.payment_method === 'cash_on_delivery' || order.payment_method === 'counter'
                                  ? 'Accept Order'
                                  : 'Accept & Request Payment')}
                            </Button>
                          )}

                          {/* Awaiting Customer Payment notice in merchant action area (Full Width) */}
                          {isPaymentPending && (
                            <div className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-800 text-xs font-bold h-9 w-full whitespace-nowrap col-span-2 shadow-2xs">
                              <Clock size={13} className="animate-spin text-orange-600" />
                              <span>Awaiting Payment...</span>
                            </div>
                          )}

                          {/* Complete Order (Full Width) */}
                          {(isPreparing || isReady) && (
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-9 shadow-xs px-4 justify-center w-full whitespace-nowrap col-span-2 cursor-pointer"
                              onClick={() => {
                                if (!isPaymentPaid) {
                                  toast.error('Order must be marked as Paid before it can be marked as Complete.');
                                  return;
                                }
                                handleUpdateStatus(order.id, 'COMPLETED');
                              }}
                              isLoading={updatingOrderId === order.id}
                              leftIcon={<Check size={14} />}
                            >
                              Complete Order
                            </Button>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                </CardContent>
              </Card>
            );
          })}
          {isLoadingMore && <OrderCardSkeleton />}
          <InfiniteScrollTrigger
            onIntersect={handleLoadMore}
            isLoading={isLoadingMore}
            hasMore={hasMore}
          />
        </div>
      )}


      {/* Customer Info Modal (Desktop only via isMobile check) */}
      <Modal
        isOpen={!!customerModalOrder && !isMobile}
        onClose={() => setCustomerModalOrder(null)}
        title="Customer & Delivery Details"
      >
        {customerModalOrder && (
          <div className="mt-3 space-y-4 text-sm">
            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-2 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <User size={16} className="text-primary" />
                <div>
                  <span className="text-xs text-slate-400 block font-bold uppercase">Customer Name</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{customerModalOrder.customer_name}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-200/50 dark:border-slate-800">
                <Phone size={16} className="text-primary" />
                <div>
                  <span className="text-xs text-slate-400 block font-bold uppercase">Phone Number</span>
                  <a href={`tel:${customerModalOrder.customer_phone}`} className="font-bold text-primary hover:underline">
                    {customerModalOrder.customer_phone}
                  </a>
                </div>
              </div>

              {customerModalOrder.table_number && (
                <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800">
                  <span className="text-xs text-slate-400 block font-bold uppercase">Table Number</span>
                  <span className="inline-block font-black text-primary bg-primary/10 px-2.5 py-0.5 rounded text-xs mt-0.5">
                    Table {customerModalOrder.table_number}
                  </span>
                </div>
              )}
            </div>

            {customerModalOrder.delivery_address && (
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-2 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-primary shrink-0" />
                    <div>
                      <span className="text-xs text-slate-400 font-bold uppercase">Full Delivery Address</span>
                      {(() => {
                        const distKm = getOrderDistanceKm(customerModalOrder, shop?.latitude, shop?.longitude);
                        const formattedDist = formatDistanceWithUnit(distKm, shop?.settings?.currency);
                        const fee = getOrderDeliveryFee(customerModalOrder, shop?.settings, shop?.latitude, shop?.longitude);
                        return (
                          <div className="flex items-center gap-2 mt-0.5">
                            {formattedDist && (
                              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded font-mono">
                                {formattedDist} away
                              </span>
                            )}
                            {fee > 0 && (
                              <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded font-mono">
                                Delivery Fee: {shop?.settings?.currency || '₹'}{fee.toFixed(2)}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  <a
                    href={generateGoogleMapsUrl(customerModalOrder.delivery_address)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[11px] font-black text-primary hover:underline bg-primary/10 px-2 py-0.5 rounded-md shrink-0"
                  >
                    <Navigation size={12} /> Open Map
                  </a>
                </div>
                <p className="text-slate-700 dark:text-slate-200 font-medium leading-relaxed bg-white dark:bg-slate-950 p-2.5 rounded-lg border border-slate-150 dark:border-slate-800">
                  {customerModalOrder.delivery_address.replace(/\s*\[loc=.*?\]/, '')}
                </p>
              </div>
            )}

            {/* Quick Share & Copy Actions */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-150 dark:border-slate-800">
              <Button
                size="sm"
                className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                onClick={() => setThermalPrintOrder(customerModalOrder)}
                leftIcon={<Printer size={14} />}
              >
                Print Bill
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="gap-1 font-bold text-xs border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                onClick={() => {
                  const tId = toast.loading('Preparing Tax Invoice...');
                  printOrderA4Invoice(customerModalOrder, shop).then((res) => {
                    if (res) toast.success('Tax Invoice ready!', { id: tId });
                    else toast.error('Could not open print window', { id: tId });
                  });
                }}
                leftIcon={<FileText size={14} className="text-primary" />}
              >
                Print Invoice
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-xs"
                onClick={() => {
                  const billText = generateOrderBillText(customerModalOrder);
                  if (navigator.share) {
                    navigator.share({ title: `Order Bill #${customerModalOrder.daily_order_number || customerModalOrder.id.slice(0, 8)}`, text: billText }).catch(() => { });
                  } else {
                    navigator.clipboard.writeText(billText);
                    toast.success('Bill copied to clipboard!');
                  }
                }}
                leftIcon={<Share2 size={14} />}
              >
                Share
              </Button>

              <Button
                variant="secondary"
                size="sm"
                className="gap-1 text-xs"
                onClick={() => {
                  const billText = generateOrderBillText(customerModalOrder);
                  navigator.clipboard.writeText(billText);
                  toast.success('Bill details copied to clipboard!');
                }}
                leftIcon={<Copy size={14} />}
              >
                Copy
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Customer Info Bottom Sheet (Mobile only via isMobile check) */}
      <BottomSheet
        isOpen={!!customerModalOrder && isMobile}
        onClose={() => setCustomerModalOrder(null)}
        title="Customer & Delivery Details"
      >
        {customerModalOrder && (
          <div className="space-y-4 text-sm">
            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-2 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <User size={16} className="text-primary" />
                <div>
                  <span className="text-xs text-slate-400 block font-bold uppercase">Customer Name</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{customerModalOrder.customer_name}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-200/50 dark:border-slate-800">
                <Phone size={16} className="text-primary" />
                <div>
                  <span className="text-xs text-slate-400 block font-bold uppercase">Phone Number</span>
                  <a href={`tel:${customerModalOrder.customer_phone}`} className="font-bold text-primary hover:underline">
                    {customerModalOrder.customer_phone}
                  </a>
                </div>
              </div>

              {customerModalOrder.table_number && (
                <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800">
                  <span className="text-xs text-slate-400 block font-bold uppercase">Table Number</span>
                  <span className="inline-block font-black text-primary bg-primary/10 px-2.5 py-0.5 rounded text-xs mt-0.5">
                    Table {customerModalOrder.table_number}
                  </span>
                </div>
              )}
            </div>

            {customerModalOrder.delivery_address && (
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-2 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-primary shrink-0" />
                    <div>
                      <span className="text-xs text-slate-400 font-bold uppercase">Full Delivery Address</span>
                      {(() => {
                        const distKm = getOrderDistanceKm(customerModalOrder, shop?.latitude, shop?.longitude);
                        const formattedDist = formatDistanceWithUnit(distKm, shop?.settings?.currency);
                        const fee = getOrderDeliveryFee(customerModalOrder, shop?.settings, shop?.latitude, shop?.longitude);
                        return (
                          <div className="flex items-center gap-2 mt-0.5">
                            {formattedDist && (
                              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded font-mono">
                                {formattedDist} away
                              </span>
                            )}
                            {fee > 0 && (
                              <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded font-mono">
                                Delivery Fee: {shop?.settings?.currency || '₹'}{fee.toFixed(2)}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  <a
                    href={generateGoogleMapsUrl(customerModalOrder.delivery_address)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[11px] font-black text-primary hover:underline bg-primary/10 px-2 py-0.5 rounded-md shrink-0"
                  >
                    <Navigation size={12} /> Open Map
                  </a>
                </div>
                <p className="text-slate-700 dark:text-slate-200 font-medium leading-relaxed bg-white dark:bg-slate-950 p-2.5 rounded-lg border border-slate-150 dark:border-slate-800">
                  {customerModalOrder.delivery_address.replace(/\s*\[loc=.*?\]/, '')}
                </p>
              </div>
            )}

            {/* Quick Share & Copy Actions */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-150 dark:border-slate-800">
              <Button
                size="sm"
                className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                onClick={() => setThermalPrintOrder(customerModalOrder)}
                leftIcon={<Printer size={14} />}
              >
                Print Bill
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="gap-1 font-bold text-xs border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                onClick={() => {
                  const tId = toast.loading('Preparing Tax Invoice...');
                  printOrderA4Invoice(customerModalOrder, shop).then((res) => {
                    if (res) toast.success('Tax Invoice ready!', { id: tId });
                    else toast.error('Could not open print window', { id: tId });
                  });
                }}
                leftIcon={<FileText size={14} className="text-primary" />}
              >
                Print Invoice
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-xs"
                onClick={() => {
                  const billText = generateOrderBillText(customerModalOrder);
                  if (navigator.share) {
                    navigator.share({ title: `Order Bill #${customerModalOrder.daily_order_number || customerModalOrder.id.slice(0, 8)}`, text: billText }).catch(() => { });
                  } else {
                    navigator.clipboard.writeText(billText);
                    toast.success('Bill copied to clipboard!');
                  }
                }}
                leftIcon={<Share2 size={14} />}
              >
                Share
              </Button>

              <Button
                variant="secondary"
                size="sm"
                className="gap-1 text-xs"
                onClick={() => {
                  const billText = generateOrderBillText(customerModalOrder);
                  navigator.clipboard.writeText(billText);
                  toast.success('Bill details copied to clipboard!');
                }}
                leftIcon={<Copy size={14} />}
              >
                Copy
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* Items Detail Modal (Desktop / Responsive via isMobile check) */}
      <Modal
        isOpen={!!itemsModalOrder && !isMobile}
        onClose={() => setItemsModalOrder(null)}
        title={`Order #${itemsModalOrder?.daily_order_number || itemsModalOrder?.id?.slice(0, 8)?.toUpperCase()} — Items (${itemsModalOrder?.items?.length ?? 0})`}
        className="max-w-2xl sm:max-w-3xl"
        footer={
          itemsModalOrder ? (
            <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              {/* Row 1 on mobile: Total Amount Bar / Right side on desktop */}
              <div className="flex items-center justify-between sm:order-2 border-b sm:border-b-0 pb-2 sm:pb-0 border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-1.5 sm:hidden">
                  <span className="font-extrabold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Amount</span>
                  <span className="text-xs text-slate-400 font-medium">({itemsModalOrder.items?.length ?? 0} items)</span>
                </div>
                {(() => {
                  const modalActiveItems = (itemsModalOrder.items || []).filter((it: any) => !it.is_cancelled);
                  const modalItemsSubtotal = modalActiveItems.reduce((sum: number, it: any) => sum + (Number(it.price || 0) * Number(it.quantity || 1)), 0);
                  const modalIsGstEnabled = Boolean(shop?.settings?.gst_enabled);
                  const modalTotalTaxRate = Number(shop?.settings?.cgst_rate || 0) + Number(shop?.settings?.sgst_rate || 0);
                  const modalIsExclusive = modalIsGstEnabled && !shop?.settings?.inclusive_tax;
                  const modalTaxAmount = (modalIsExclusive && modalTotalTaxRate > 0)
                    ? Math.round((modalItemsSubtotal * (modalTotalTaxRate / 100)) * 100) / 100
                    : 0;
                  const modalFinalTotal = modalIsExclusive ? (modalItemsSubtotal + modalTaxAmount) : Number(itemsModalOrder.total_amount ?? modalItemsSubtotal);
                  return (
                    <div className="flex items-baseline gap-2 shrink-0 ml-auto sm:ml-0">
                      <span className="hidden sm:inline font-extrabold text-xs text-slate-400 uppercase tracking-wider">Total</span>
                      <span className="text-primary font-black text-xl sm:text-2xl font-mono">
                        ₹{modalFinalTotal.toFixed(2)}
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* Row 2 on mobile: 50% Action buttons / Left side on desktop */}
              <div className="flex items-center gap-2 w-full sm:w-auto sm:order-1">
                {itemsModalOrder.order_status !== 'COMPLETED' && itemsModalOrder.order_status !== 'CANCELLED' && itemsModalOrder.order_status !== 'PENDING' && itemsModalOrder.order_status !== 'PENDING_VENDOR' && (
                  printedOrders[itemsModalOrder.id] ? (
                    <div className="flex-1 sm:flex-initial inline-flex items-center justify-center rounded-xl border border-emerald-300/80 dark:border-emerald-800/80 bg-emerald-50/80 dark:bg-emerald-950/40 overflow-hidden h-10 sm:h-9 text-xs">
                      <span className="px-2.5 sm:px-3 py-1 font-bold text-emerald-700 dark:text-emerald-400 flex items-center justify-center gap-1 border-r border-emerald-200 dark:border-emerald-800/80 whitespace-nowrap flex-1 sm:flex-initial">
                        <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>KOT Printed</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDirectPrintKot(itemsModalOrder, 'full')}
                        className="px-2.5 sm:px-3 py-1 font-semibold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap flex-1 sm:flex-initial"
                        title="Reprint KOT"
                      >
                        <RotateCcw size={12} className="shrink-0" />
                        <span>Reprint</span>
                      </button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 sm:flex-initial border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 font-bold text-xs h-10 sm:h-9 justify-center whitespace-nowrap"
                      onClick={() => handleDirectPrintKot(itemsModalOrder, 'full')}
                      leftIcon={<UtensilsCrossed size={13} className="shrink-0" />}
                    >
                      Print KOT
                    </Button>
                  )
                )}

                {itemsModalOrder.order_status !== 'COMPLETED' && itemsModalOrder.order_status !== 'CANCELLED' ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 sm:flex-initial border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 font-bold text-xs h-10 sm:h-9 justify-center whitespace-nowrap shadow-xs"
                      onClick={() => openDiscountModal(itemsModalOrder)}
                      leftIcon={<Percent size={13} className="shrink-0" />}
                    >
                      Discount
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 sm:flex-initial bg-primary hover:bg-primary/90 text-white font-bold text-xs h-10 sm:h-9 justify-center whitespace-nowrap shadow-xs"
                      onClick={() => {
                        const ord = itemsModalOrder;
                        setItemsModalOrder(null);
                        setTargetOrderForAdd(ord);
                      }}
                      leftIcon={<Plus size={14} className="shrink-0" />}
                    >
                      Add Items
                    </Button>
                  </>
                ) : itemsModalOrder.order_status === 'COMPLETED' ? (
                  <>
                    <Button
                      size="sm"
                      className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 sm:h-9 justify-center whitespace-nowrap shadow-xs"
                      onClick={() => setThermalPrintOrder(itemsModalOrder)}
                      leftIcon={<Printer size={13} className="shrink-0" />}
                    >
                      Print Bill
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 sm:flex-initial font-bold text-xs h-10 sm:h-9 justify-center whitespace-nowrap shadow-xs border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                      onClick={() => {
                        const tId = toast.loading('Preparing Tax Invoice...');
                        printOrderA4Invoice(itemsModalOrder, shop).then((res) => {
                          if (res) toast.success('Tax Invoice ready!', { id: tId });
                          else toast.error('Could not open print window', { id: tId });
                        });
                      }}
                      leftIcon={<FileText size={13} className="shrink-0 text-primary" />}
                    >
                      Print Invoice
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          ) : null
        }
      >
        {itemsModalOrder && (
          <div className="space-y-4 pt-1">
            {/* Top Order Context & Items Summary Banner */}
            <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${orderStatusStyle(itemsModalOrder.order_status).badgeClass || 'bg-primary/10 text-primary'}`}>
                  {orderStatusStyle(itemsModalOrder.order_status).label}
                </span>
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                  {['COMPLETED', 'DELIVERED'].includes(String(itemsModalOrder.order_status || '').toUpperCase())
                    ? itemsModalOrder.items.filter((i: any) => !i.is_cancelled).length
                    : itemsModalOrder.items.filter((i: any) => i.is_completed && !i.is_cancelled).length} of {itemsModalOrder.items.filter((i: any) => !i.is_cancelled).length} Items Served
                </span>
                {itemsModalOrder.items.some((i: any) => i.is_cancelled && String(i.cancellation_reason || '').startsWith('Replaced with')) && (
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                    <RotateCcw size={12} />
                    <span>{itemsModalOrder.items.filter((i: any) => i.is_cancelled && String(i.cancellation_reason || '').startsWith('Replaced with')).length} Replaced</span>
                  </span>
                )}
                {itemsModalOrder.items.some((i: any) => i.is_cancelled && !String(i.cancellation_reason || '').startsWith('Replaced with')) && (
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-0.5 rounded-lg border border-rose-200 dark:border-rose-800 flex items-center gap-1">
                    <XCircle size={12} />
                    <span>{itemsModalOrder.items.filter((i: any) => i.is_cancelled && !String(i.cancellation_reason || '').startsWith('Replaced with')).length} Cancelled</span>
                  </span>
                )}
              </div>

              {/* Order Meta Info */}
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <span>{itemsModalOrder.customer_name || 'Walk-in'}</span>
                <span>•</span>
                <span className="capitalize font-bold text-slate-700 dark:text-slate-300">{itemsModalOrder.order_type?.replace('_', ' ')}</span>
                {itemsModalOrder.table_number && (
                  <>
                    <span>•</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200/80 dark:border-amber-900/40">
                      Table #{itemsModalOrder.table_number}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Items List */}
            <div className="space-y-3">
              {[...(itemsModalOrder.items || [])].sort((a: any, b: any) => {
                if (Boolean(a.is_cancelled) !== Boolean(b.is_cancelled)) return a.is_cancelled ? 1 : -1;
                if (Boolean(a.is_completed) !== Boolean(b.is_completed)) return a.is_completed ? 1 : -1;
                return 0;
              }).map((it: any, idx: number) => {
                let variantLabel: string | null = null;
                if (it.variant_info) {
                  try {
                    const v = typeof it.variant_info === 'string' ? JSON.parse(it.variant_info) : it.variant_info;
                    variantLabel = Object.entries(v).map(([k, val]) => `${k}: ${val}`).join(', ');
                  } catch {
                    variantLabel = String(it.variant_info);
                  }
                }

                let addons: string[] = [];
                if (it.addons_info?.length) {
                  try {
                    addons = it.addons_info.map((a: any) =>
                      typeof a === 'string' ? a : (a.name ?? JSON.stringify(a))
                    );
                  } catch { /* ignore */ }
                }

                const isOrderCompleted = ['COMPLETED', 'DELIVERED'].includes(String(itemsModalOrder.order_status || '').toUpperCase());
                const isItemDone = Boolean(it.is_completed) || isOrderCompleted;
                const isItemCancelled = Boolean(it.is_cancelled);
                const isItemReplaced = isItemCancelled && String(it.cancellation_reason || '').startsWith('Replaced with');

                return (
                  <div
                    key={it.id ?? idx}
                    className={`rounded-2xl p-4 border transition-all ${
                      isItemReplaced
                        ? 'bg-amber-50/20 dark:bg-amber-950/15 border-amber-200/60 dark:border-amber-800/40 opacity-85'
                        : isItemCancelled
                        ? 'bg-rose-50/20 dark:bg-rose-950/15 border-rose-200/60 dark:border-rose-800/40 opacity-80'
                        : isItemDone
                        ? 'bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/40'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs'
                    }`}
                  >
                    {/* Top row: Name & Badges on Left, Price on Right */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                        <span className={`font-bold text-base ${
                          isItemReplaced
                            ? 'line-through text-amber-700/80 dark:text-amber-400/80'
                            : isItemCancelled 
                            ? 'line-through text-rose-500/80 dark:text-rose-400/80' 
                            : isItemDone 
                            ? 'text-slate-500 dark:text-slate-400' 
                            : 'text-slate-900 dark:text-slate-100'
                        }`}>
                          {it.name}
                        </span>

                        <span className={`text-xs font-black px-2.5 py-0.5 rounded-lg ${
                          isItemReplaced
                            ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                            : isItemCancelled 
                            ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-600' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono'
                        }`}>
                          ×{it.quantity}
                        </span>

                        {isItemCancelled && (
                          isItemReplaced ? (
                            <span className="text-[10px] font-black tracking-wider bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <RotateCcw size={11} /> REPLACED
                            </span>
                          ) : (
                            <span className="text-[10px] font-black tracking-wider bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <XCircle size={11} /> CANCELLED
                            </span>
                          )
                        )}
                        {isItemDone && !isItemCancelled && (
                          <span className="text-[10px] font-black tracking-wider bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <CheckCircle2 size={11} /> SERVED
                          </span>
                        )}
                        {!isItemDone && !isItemCancelled && itemsModalOrder.items.some((x: any) => x.is_completed) && (
                          <span className="text-[9.5px] font-black tracking-wider bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-md">
                            NEW
                          </span>
                        )}
                      </div>

                      {/* Item Total Price */}
                      <div className="shrink-0 text-right">
                        <span className={`font-black text-base font-mono ${isItemCancelled ? 'line-through text-slate-400 dark:text-slate-600' : 'text-slate-900 dark:text-slate-100'}`}>
                          ₹{(it.price * it.quantity).toFixed(2)}
                        </span>
                        {it.quantity > 1 && (
                          <p className="text-[10px] text-slate-400 font-mono">₹{Number(it.price).toFixed(2)} each</p>
                        )}
                      </div>
                    </div>

                    {/* Variant & Addons Details */}
                    {(variantLabel || addons.length > 0) && (
                      <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex flex-wrap gap-x-4 text-xs text-slate-500 dark:text-slate-400">
                        {variantLabel && (
                          <p>
                            <span className="font-semibold text-slate-600 dark:text-slate-300">Variant:</span> {variantLabel}
                          </p>
                        )}
                        {addons.length > 0 && (
                          <p>
                            <span className="font-semibold text-slate-600 dark:text-slate-300">Add-ons:</span> {addons.join(', ')}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Bottom Action Row */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-end gap-2">
                      {isItemCancelled ? (
                        isItemReplaced ? (
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-3 py-1 rounded-lg border border-amber-200/80 dark:border-amber-900/40">
                            <RotateCcw size={12} />
                            <span>Replaced • Non-restorable</span>
                          </div>
                        ) : ['paid', 'refunded', 'partially_refunded'].includes(String(itemsModalOrder?.payment_status || '').toLowerCase()) ? (
                          <div className="flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-lg border border-rose-200/60 dark:border-rose-900/40">
                            <span>Refunded • Non-recoverable</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleRestoreItem(itemsModalOrder.id, it.id)}
                            disabled={togglingCancelItemId === it.id}
                            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-[0.98]"
                            title="Restore this item"
                          >
                            <RefreshCw size={12} className={togglingCancelItemId === it.id ? 'animate-spin' : ''} />
                            <span>Restore Item</span>
                          </button>
                        )
                      ) : isOrderCompleted ? (
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-200/80 dark:border-emerald-800/50">
                          <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" />
                          <span>Served (Completed)</span>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleToggleItemComplete(itemsModalOrder.id, it.id)}
                            disabled={togglingItemId === it.id}
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-[0.98] ${
                              isItemDone
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-200'
                                : 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs'
                            }`}
                          >
                            {isItemDone ? (
                              <>
                                <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-300" />
                                <span>Served</span>
                              </>
                            ) : (
                              <>
                                <Clock size={13} />
                                <span>Mark Given</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => setReplacingItemOrder({ order: itemsModalOrder, item: it })}
                            className="px-3 py-1.5 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-[0.98]"
                            title="Replace this item with another"
                          >
                            <RotateCcw size={12} />
                            <span>Replace</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setCancellingItemOrder({ orderId: itemsModalOrder.id, itemId: it.id, itemName: it.name, item: it });
                              setCancelItemReason('');
                            }}
                            disabled={togglingCancelItemId === it.id}
                            className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-[0.98]"
                            title="Cancel this item"
                          >
                            <XCircle size={13} />
                            <span>Cancel</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Modal>

      {/* Items Detail Bottom Sheet (Mobile only via isMobile check) */}
      <BottomSheet
        isOpen={!!itemsModalOrder && isMobile}
        onClose={() => setItemsModalOrder(null)}
        title={`Order #${itemsModalOrder?.daily_order_number || itemsModalOrder?.id?.slice(0, 8)?.toUpperCase()} — Items (${itemsModalOrder?.items?.length ?? 0})`}
        footer={
          itemsModalOrder ? (
            <div className="space-y-3 w-full">
              {/* Row 1: Total Amount Bar */}
              {(() => {
                const modalActiveItems = (itemsModalOrder.items || []).filter((it: any) => !it.is_cancelled);
                const modalItemsSubtotal = modalActiveItems.reduce((sum: number, it: any) => sum + (Number(it.price || 0) * Number(it.quantity || 1)), 0);
                const modalIsGstEnabled = Boolean(shop?.settings?.gst_enabled);
                const modalTotalTaxRate = Number(shop?.settings?.cgst_rate || 0) + Number(shop?.settings?.sgst_rate || 0);
                const modalIsExclusive = modalIsGstEnabled && !shop?.settings?.inclusive_tax;
                const modalTaxAmount = (modalIsExclusive && modalTotalTaxRate > 0)
                  ? Math.round((modalItemsSubtotal * (modalTotalTaxRate / 100)) * 100) / 100
                  : 0;
                const modalFinalTotal = modalIsExclusive ? (modalItemsSubtotal + modalTaxAmount) : Number(itemsModalOrder.total_amount ?? modalItemsSubtotal);
                return (
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Amount</span>
                      <span className="text-xs text-slate-400 font-medium">({modalActiveItems.length} items)</span>
                    </div>
                    <span className="text-primary font-black text-xl font-mono">
                      ₹{modalFinalTotal.toFixed(2)}
                    </span>
                  </div>
                );
              })()}

              {/* Row 2: Full Width Actions */}
              <div className="flex items-center gap-2 w-full">
                {itemsModalOrder.order_status !== 'COMPLETED' && itemsModalOrder.order_status !== 'CANCELLED' && itemsModalOrder.order_status !== 'PENDING' && itemsModalOrder.order_status !== 'PENDING_VENDOR' && (
                  printedOrders[itemsModalOrder.id] ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 border-emerald-300 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold text-xs h-10 justify-center whitespace-nowrap"
                      onClick={() => handleDirectPrintKot(itemsModalOrder, 'full')}
                      leftIcon={<RotateCcw size={13} className="shrink-0" />}
                    >
                      Reprint KOT
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 font-bold text-xs h-10 justify-center whitespace-nowrap"
                      onClick={() => handleDirectPrintKot(itemsModalOrder, 'full')}
                      leftIcon={<UtensilsCrossed size={13} className="shrink-0" />}
                    >
                      Print KOT
                    </Button>
                  )
                )}

                {itemsModalOrder.order_status !== 'COMPLETED' && itemsModalOrder.order_status !== 'CANCELLED' ? (
                  <Button
                    size="sm"
                    className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold text-xs h-10 justify-center whitespace-nowrap shadow-xs"
                    onClick={() => {
                      const ord = itemsModalOrder;
                      setItemsModalOrder(null);
                      setTargetOrderForAdd(ord);
                    }}
                    leftIcon={<Plus size={14} className="shrink-0" />}
                  >
                    Add Items
                  </Button>
                ) : itemsModalOrder.order_status === 'COMPLETED' ? (
                  <>
                    <Button
                      size="sm"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 justify-center whitespace-nowrap shadow-xs"
                      onClick={() => setThermalPrintOrder(itemsModalOrder)}
                      leftIcon={<Printer size={13} className="shrink-0" />}
                    >
                      Print Bill
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 font-bold text-xs h-10 justify-center whitespace-nowrap shadow-xs border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                      onClick={() => {
                        const tId = toast.loading('Preparing Tax Invoice...');
                        printOrderA4Invoice(itemsModalOrder, shop).then((res) => {
                          if (res) toast.success('Tax Invoice ready!', { id: tId });
                          else toast.error('Could not open print window', { id: tId });
                        });
                      }}
                      leftIcon={<FileText size={13} className="shrink-0 text-primary" />}
                    >
                      Print Invoice
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          ) : null
        }
      >
        {itemsModalOrder && (
          <div className="space-y-3.5 pb-2">
            {/* Mobile Summary Banner */}
            <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-lg text-[11px] font-black uppercase tracking-wider ${orderStatusStyle(itemsModalOrder.order_status).badgeClass || 'bg-primary/10 text-primary'}`}>
                    {orderStatusStyle(itemsModalOrder.order_status).label}
                  </span>
                  <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                    {itemsModalOrder.items.filter((i: any) => i.is_completed && !i.is_cancelled).length}/{itemsModalOrder.items.filter((i: any) => !i.is_cancelled).length} Served
                  </span>
                  {itemsModalOrder.items.some((i: any) => i.is_cancelled) && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                      {itemsModalOrder.items.filter((i: any) => i.is_cancelled).length} Cancelled
                    </span>
                  )}
                </div>
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {itemsModalOrder.customer_name || 'Walk-in'} • {itemsModalOrder.table_number ? `Table #${itemsModalOrder.table_number}` : itemsModalOrder.order_type?.replace('_', ' ')}
                </div>
              </div>
            </div>

            {/* Mobile Items List */}
            <div className="space-y-2.5">
              {[...(itemsModalOrder.items || [])].sort((a: any, b: any) => {
                if (Boolean(a.is_cancelled) !== Boolean(b.is_cancelled)) return a.is_cancelled ? 1 : -1;
                if (Boolean(a.is_completed) !== Boolean(b.is_completed)) return a.is_completed ? 1 : -1;
                return 0;
              }).map((it: any, idx: number) => {
                let variantLabel: string | null = null;
                if (it.variant_info) {
                  try {
                    const v = typeof it.variant_info === 'string' ? JSON.parse(it.variant_info) : it.variant_info;
                    variantLabel = Object.entries(v).map(([k, val]) => `${k}: ${val}`).join(', ');
                  } catch {
                    variantLabel = String(it.variant_info);
                  }
                }

                let addons: string[] = [];
                if (it.addons_info?.length) {
                  try {
                    addons = it.addons_info.map((a: any) =>
                      typeof a === 'string' ? a : (a.name ?? JSON.stringify(a))
                    );
                  } catch { /* ignore */ }
                }

                const isOrderCompleted = ['COMPLETED', 'DELIVERED'].includes(String(itemsModalOrder.order_status || '').toUpperCase());
                const isItemDone = Boolean(it.is_completed) || isOrderCompleted;
                const isItemCancelled = Boolean(it.is_cancelled);
                const isItemReplaced = isItemCancelled && String(it.cancellation_reason || '').startsWith('Replaced with');

                return (
                  <div
                    key={it.id ?? idx}
                    className={`flex flex-col gap-2 rounded-2xl p-3.5 border transition-all ${
                      isItemReplaced
                        ? 'bg-amber-50/20 dark:bg-amber-950/15 border-amber-200/60 dark:border-amber-800/40 opacity-85'
                        : isItemCancelled
                        ? 'bg-rose-50/20 dark:bg-rose-950/15 border-rose-200/60 dark:border-rose-800/40 opacity-80'
                        : isItemDone
                        ? 'bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/40'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs'
                    }`}
                  >
                    {/* Top Row: Name, Quantity, Badges on Left, Price on Right */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`font-bold text-xs sm:text-sm ${
                            isItemReplaced
                              ? 'line-through text-amber-700/80 dark:text-amber-400/80'
                              : isItemCancelled 
                              ? 'line-through text-rose-500/80 dark:text-rose-400/80' 
                              : isItemDone 
                              ? 'text-slate-500 dark:text-slate-400' 
                              : 'text-slate-800 dark:text-slate-100'
                          }`}>
                            {it.name}
                          </span>
                          <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-md ${
                            isItemReplaced
                              ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                              : isItemCancelled 
                              ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-600' 
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono'
                          }`}>
                            ×{it.quantity}
                          </span>
                          {isItemCancelled && (
                            isItemReplaced ? (
                              <span className="text-[9px] font-black tracking-wider bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-1 py-0.2 rounded">
                                REPLACED
                              </span>
                            ) : (
                              <span className="text-[9px] font-black tracking-wider bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 px-1 py-0.2 rounded">
                                CANCELLED
                              </span>
                            )
                          )}
                          {isItemDone && !isItemCancelled && (
                            <span className="text-[9px] font-black tracking-wider bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-1 py-0.2 rounded">
                              SERVED
                            </span>
                          )}
                        </div>
                        {variantLabel && (
                          <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
                            <span className="font-semibold text-slate-600 dark:text-slate-400">Variant:</span> {variantLabel}
                          </p>
                        )}
                        {addons.length > 0 && (
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            <span className="font-semibold text-slate-600 dark:text-slate-400">Add-ons:</span> {addons.join(', ')}
                          </p>
                        )}
                      </div>

                      <div className="shrink-0 text-right">
                        <span className={`font-black text-xs font-mono ${isItemCancelled ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}>
                          ₹{(it.price * it.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                      {isItemCancelled ? (
                        isItemReplaced ? (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200/80 dark:border-amber-900/40">
                            <span>Replaced • Non-restorable</span>
                          </div>
                        ) : ['paid', 'refunded', 'partially_refunded'].includes(String(itemsModalOrder?.payment_status || '').toLowerCase()) ? (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded border border-rose-200/60 dark:border-rose-900/40">
                            <span>Refunded</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleRestoreItem(itemsModalOrder.id, it.id)}
                            disabled={togglingCancelItemId === it.id}
                            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-[0.98]"
                          >
                            <RefreshCw size={11} className={togglingCancelItemId === it.id ? 'animate-spin' : ''} />
                            <span>Restore</span>
                          </button>
                        )
                      ) : isOrderCompleted ? (
                        <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200/80 dark:border-emerald-800/50">
                          <CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400" />
                          <span>Served</span>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleToggleItemComplete(itemsModalOrder.id, it.id)}
                            disabled={togglingItemId === it.id}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-[0.98] ${
                              isItemDone
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700'
                                : 'bg-amber-500 text-white'
                            }`}
                          >
                            {isItemDone ? (
                              <>
                                <CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-300" />
                                <span>Served</span>
                              </>
                            ) : (
                              <>
                                <Clock size={12} />
                                <span>Mark Given</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => setReplacingItemOrder({ order: itemsModalOrder, item: it })}
                            className="px-2 py-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-[0.98]"
                            title="Replace this item"
                          >
                            <RotateCcw size={11} />
                            <span>Replace</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setCancellingItemOrder({ orderId: itemsModalOrder.id, itemId: it.id, itemName: it.name, item: it });
                              setCancelItemReason('');
                            }}
                            disabled={togglingCancelItemId === it.id}
                            className="px-2.5 py-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200/80 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-[0.98]"
                            title="Cancel this item"
                          >
                            <XCircle size={13} />
                            <span>Cancel</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </BottomSheet>




      {/* Cancellation Modal */}
      {(() => {
        const targetCancellingOrder = orders.find(o => o.id === cancellingOrderId);
        const currencySymbol = shop?.settings?.currency || '₹';
        const isPaid = targetCancellingOrder?.payment_status?.toLowerCase() === 'paid';
        const isOnlinePaid = targetCancellingOrder?.payment_method?.toLowerCase() === 'online' && isPaid;
        return (
          <Modal
            isOpen={!!cancellingOrderId}
            onClose={() => { 
              setCancellingOrderId(null); 
              setCancelOrderReason(DEFAULT_ORDER_CANCELLATION_REASONS[0].name);
              setSelectedCancelOrderReason(DEFAULT_ORDER_CANCELLATION_REASONS[0].id);
              setCancelOrderWithRefund(true);
            }}
            title="Cancel Order"
          >
            <div className="space-y-4 pt-2">
              {/* Order Info Banner */}
              {targetCancellingOrder && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center font-bold text-slate-800 dark:text-slate-100">
                    <span>Order #{targetCancellingOrder.daily_order_number || targetCancellingOrder.id?.slice(0, 8)}</span>
                    <span className="text-sm font-black text-rose-600 dark:text-rose-400">
                      {currencySymbol}{Number(targetCancellingOrder.total_amount || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                    <span>Payment Mode: <strong className="capitalize text-slate-700 dark:text-slate-200">{targetCancellingOrder.payment_method || 'Cash'}</strong></span>
                    <Badge variant={isPaid ? 'success' : 'warning'}>
                      {(targetCancellingOrder.payment_status || 'Pending').toUpperCase()}
                    </Badge>
                  </div>
                </div>
              )}

              {/* Refund Action Selector — Only visible if order was actually paid */}
              {isPaid && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Refund Option
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCancelOrderWithRefund(true)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                        cancelOrderWithRefund
                          ? 'bg-rose-50/80 border-rose-500 text-rose-950 dark:bg-rose-950/40 dark:border-rose-600 dark:text-rose-100 shadow-xs ring-1 ring-rose-500/30'
                          : 'bg-white hover:bg-slate-50 border-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800/80 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-bold flex items-center gap-1.5">
                          <RotateCcw size={13} className={cancelOrderWithRefund ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'} />
                          Cancel with Refund
                        </span>
                        {cancelOrderWithRefund && <CheckCircle2 size={14} className="text-rose-600 dark:text-rose-400" />}
                      </div>
                      <p className="text-[11px] leading-tight text-slate-500 dark:text-slate-400">
                        {isOnlinePaid
                          ? 'Initiates online refund via Razorpay and sends WhatsApp notification to the customer.'
                          : 'Deducts order amount from revenue growth reports (no online gateway API call).'}
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCancelOrderWithRefund(false)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                        !cancelOrderWithRefund
                          ? 'bg-amber-50/80 border-amber-500 text-amber-950 dark:bg-amber-950/40 dark:border-amber-600 dark:text-amber-100 shadow-xs ring-1 ring-amber-500/30'
                          : 'bg-white hover:bg-slate-50 border-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800/80 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-bold flex items-center gap-1.5">
                          <XCircle size={13} className={!cancelOrderWithRefund ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'} />
                          Cancel without Refund
                        </span>
                        {!cancelOrderWithRefund && <CheckCircle2 size={14} className="text-amber-600 dark:text-amber-400" />}
                      </div>
                      <p className="text-[11px] leading-tight text-slate-500 dark:text-slate-400">
                        Cancels the order without initiating any refund or altering collected payment.
                      </p>
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Preset Reason
                  </label>
                  <SearchableSelect
                    options={DEFAULT_ORDER_CANCELLATION_REASONS}
                    value={selectedCancelOrderReason}
                    onChange={(val) => {
                      setSelectedCancelOrderReason(val);
                      if (val !== 'custom') {
                        setCancelOrderReason(val);
                      } else {
                        setCancelOrderReason('');
                      }
                    }}
                    placeholder="Choose a preset cancellation reason..."
                    showSearch={false}
                    className="h-10 rounded-xl text-xs"
                  />
                </div>

                {/* Quick preset chips */}
                <div className="flex flex-wrap gap-1.5">
                  {DEFAULT_ORDER_CANCELLATION_REASONS.filter(r => r.id !== 'custom').slice(0, 5).map((preset) => {
                    const isSelected = selectedCancelOrderReason === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setSelectedCancelOrderReason(preset.id);
                          setCancelOrderReason(preset.name);
                        }}
                        className={`text-[11px] px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800 shadow-2xs'
                            : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {preset.name.split('/')[0].trim()}
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
                    <span>Reason Description</span>
                    <span className="text-[10px] text-slate-400 font-normal lowercase">(customizable)</span>
                  </label>
                  <textarea
                    className="w-full min-h-[95px] p-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all resize-none text-slate-800 dark:text-slate-100 placeholder-slate-400"
                    placeholder="e.g., Item out of stock, Restaurant closed..."
                    value={cancelOrderReason}
                    onChange={(e) => {
                      setCancelOrderReason(e.target.value);
                      const matched = DEFAULT_ORDER_CANCELLATION_REASONS.find(r => r.name === e.target.value);
                      if (matched) {
                        setSelectedCancelOrderReason(matched.id);
                      } else {
                        setSelectedCancelOrderReason('custom');
                      }
                    }}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { 
                    setCancellingOrderId(null); 
                    setCancelOrderReason(DEFAULT_ORDER_CANCELLATION_REASONS[0].name);
                    setSelectedCancelOrderReason(DEFAULT_ORDER_CANCELLATION_REASONS[0].id);
                    setCancelOrderWithRefund(true);
                  }}
                >
                  Go Back
                </Button>
                <Button
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white border-0"
                  onClick={submitCancelOrder}
                  isLoading={isCancelling}
                >
                  {!isPaid ? 'Cancel Order' : cancelOrderWithRefund ? 'Cancel & Refund' : 'Cancel without Refund'}
                </Button>
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* Create Offline Order Modal */}
      <CreateOrderModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onOrderCreated={async (createdOrder) => {
          fetchOrdersData(0, true);
          if (createdOrder && autoPrintOnAccept) {
            await handleDirectPrintKot(createdOrder, 'full', true);
          }
        }}
      />

      {/* Add Items to Active Order Modal */}
      <CreateOrderModal
        isOpen={!!targetOrderForAdd}
        onClose={() => setTargetOrderForAdd(null)}
        targetOrder={targetOrderForAdd}
        onOrderCreated={async (updatedOrder, newlyAddedItems) => {
          fetchOrdersData(0, true);
          if (updatedOrder && autoPrintOnAccept) {
            await handleDirectPrintKot(updatedOrder, 'new_only', true, {
              customItems: newlyAddedItems,
              kotTitle: 'KOT - NEW ADDITIONS'
            });
          }
        }}
      />

      {/* Item Cancellation Modal */}
      {(() => {
        const targetParentOrder = orders.find(o => o.id === cancellingItemOrder?.orderId);
        const currencySymbol = shop?.settings?.currency || '₹';
        const isOnlinePaid = targetParentOrder?.payment_method?.toLowerCase() === 'online' && targetParentOrder?.payment_status?.toLowerCase() === 'paid';
        const itemAmount = (cancellingItemOrder?.item?.price || 0) * (cancellingItemOrder?.item?.quantity || 1);

        return (
          <Modal
            isOpen={!!cancellingItemOrder}
            onClose={() => { 
              setCancellingItemOrder(null); 
              setSelectedCancelItemReason(DEFAULT_ITEM_CANCELLATION_REASONS[0].id);
              setCustomCancelItemReason(''); 
              setCancelItemWithRefund(true);
            }}
            title={`Cancel Item: ${cancellingItemOrder?.itemName || 'Item'}`}
          >
            <div className="space-y-4 pt-2">
              {/* Item Info Banner */}
              {cancellingItemOrder && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center font-bold text-slate-800 dark:text-slate-100">
                    <span>{cancellingItemOrder.itemName} {cancellingItemOrder.item?.quantity > 1 ? `(x${cancellingItemOrder.item?.quantity})` : ''}</span>
                    <span className="text-sm font-black text-rose-600 dark:text-rose-400">
                      {currencySymbol}{Number(itemAmount || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                    <span>Order: <strong className="text-slate-700 dark:text-slate-200">#{targetParentOrder?.daily_order_number || targetParentOrder?.id?.slice(0, 8)}</strong></span>
                    <span>Payment: <strong className="capitalize text-slate-700 dark:text-slate-200">{targetParentOrder?.payment_method || 'Cash'}</strong></span>
                  </div>
                </div>
              )}

              {/* Refund Action Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Refund Option
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCancelItemWithRefund(true)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                      cancelItemWithRefund
                        ? 'bg-rose-50/80 border-rose-500 text-rose-950 dark:bg-rose-950/40 dark:border-rose-600 dark:text-rose-100 shadow-xs ring-1 ring-rose-500/30'
                        : 'bg-white hover:bg-slate-50 border-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800/80 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold flex items-center gap-1.5">
                        <RotateCcw size={13} className={cancelItemWithRefund ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'} />
                        Cancel with Refund
                      </span>
                      {cancelItemWithRefund && <CheckCircle2 size={14} className="text-rose-600 dark:text-rose-400" />}
                    </div>
                    <p className="text-[11px] leading-tight text-slate-500 dark:text-slate-400">
                      {isOnlinePaid
                        ? 'Initiates partial refund via Razorpay and sends WhatsApp notification to the customer.'
                        : 'Deducts item amount from bill total and revenue reports.'}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCancelItemWithRefund(false)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                      !cancelItemWithRefund
                        ? 'bg-amber-50/80 border-amber-500 text-amber-950 dark:bg-amber-950/40 dark:border-amber-600 dark:text-amber-100 shadow-xs ring-1 ring-amber-500/30'
                        : 'bg-white hover:bg-slate-50 border-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800/80 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold flex items-center gap-1.5">
                        <XCircle size={13} className={!cancelItemWithRefund ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'} />
                        Cancel without Refund
                      </span>
                      {!cancelItemWithRefund && <CheckCircle2 size={14} className="text-amber-600 dark:text-amber-400" />}
                    </div>
                    <p className="text-[11px] leading-tight text-slate-500 dark:text-slate-400">
                      Marks item cancelled in kitchen/KOT without refunding or deducting collected amount.
                    </p>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Cancellation Reason
                </label>
                <SearchableSelect
                  options={DEFAULT_ITEM_CANCELLATION_REASONS}
                  value={selectedCancelItemReason}
                  onChange={(val) => setSelectedCancelItemReason(val)}
                  placeholder="Select cancellation reason..."
                  showSearch={false}
                  className="h-10 rounded-xl text-xs"
                />
                {selectedCancelItemReason === 'custom' && (
                  <Input
                    placeholder="Enter custom cancellation reason..."
                    value={customCancelItemReason}
                    onChange={(e) => setCustomCancelItemReason(e.target.value)}
                    className="text-xs h-10 mt-2"
                    autoFocus
                  />
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { 
                    setCancellingItemOrder(null); 
                    setSelectedCancelItemReason(DEFAULT_ITEM_CANCELLATION_REASONS[0].id);
                    setCustomCancelItemReason(''); 
                    setCancelItemWithRefund(true);
                  }}
                >
                  Go Back
                </Button>
                <Button
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white border-0"
                  onClick={submitCancelItem}
                  isLoading={togglingCancelItemId !== null}
                >
                  {cancelItemWithRefund ? 'Cancel Item & Refund' : 'Cancel Item without Refund'}
                </Button>
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* Item Replacement Modal (Using rich menu selection UI) */}
      <CreateOrderModal
        isOpen={!!replacingItemOrder}
        onClose={() => setReplacingItemOrder(null)}
        replacingItem={replacingItemOrder}
        onItemReplaced={async (updatedOrder, previousItem, newItem) => {
          setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
          if (itemsModalOrder && itemsModalOrder.id === updatedOrder.id) {
            setItemsModalOrder(updatedOrder);
          }
          fetchOrdersData(0, true);

          // 1. Send VOID KOT for the cancelled previous item to its station printer
          if (previousItem && autoPrintOnAccept) {
            await handleDirectPrintKot(updatedOrder, 'cancelled', true, {
              customItems: [previousItem],
              kotTitle: 'VOID KOT - ITEM REPLACED',
              reason: previousItem.cancellation_reason || 'Replaced with another item'
            });
          }
          // 2. Send KOT for the newly replaced item to its station printer
          if (newItem && autoPrintOnAccept) {
            await handleDirectPrintKot(updatedOrder, 'new_only', true, {
              customItems: [newItem],
              kotTitle: 'KOT - REPLACEMENT ITEM'
            });
          }
        }}
      />

      {/* Manual Discount Modal for Orders */}
      {discountModalOrder && (() => {
        const isGstEnabled = Boolean(shop?.settings?.gst_enabled);
        const cgstRate = Number(shop?.settings?.cgst_rate || 0);
        const sgstRate = Number(shop?.settings?.sgst_rate || 0);
        const totalTaxRate = cgstRate + sgstRate;
        const isExclusiveTax = isGstEnabled && !shop?.settings?.inclusive_tax;

        const activeItems = (discountModalOrder.items || []).filter((it: any) => !it.is_cancelled);
        const itemsSubtotal = activeItems.reduce((sum: number, it: any) => sum + (Number(it.price || 0) * Number(it.quantity || 1)), 0);

        const numVal = Math.max(0, parseFloat(discountValue) || 0);
        let computedDiscount = 0;
        if (numVal > 0) {
          if (discountType === 'percentage') {
            computedDiscount = Math.round(itemsSubtotal * (Math.min(100, numVal) / 100) * 100) / 100;
          } else {
            computedDiscount = Math.min(itemsSubtotal, Math.round(numVal * 100) / 100);
          }
        }

        const discountedFood = Math.max(0, itemsSubtotal - computedDiscount);
        const taxAmount = (isExclusiveTax && totalTaxRate > 0)
          ? Math.round(discountedFood * (totalTaxRate / 100) * 100) / 100
          : 0;

        const deliveryFee = discountModalOrder.order_type === 'delivery'
          ? getOrderDeliveryFee(discountModalOrder, shop?.settings, shop?.latitude, shop?.longitude)
          : 0;

        const calculatedTotal = discountedFood + taxAmount + deliveryFee;
        const existingManualCode = (discountModalOrder.applied_discount_codes || []).find((c: string) =>
          c.startsWith('Discount (') || c.startsWith('Flat Discount (')
        );

        return (
          <Modal
            isOpen={!!discountModalOrder}
            onClose={() => setDiscountModalOrder(null)}
            title={`Order #${discountModalOrder.daily_order_number || discountModalOrder.id.slice(0, 8).toUpperCase()} — Discount / Offer`}
            className="max-w-md"
            footer={
              <div className="flex items-center justify-between w-full gap-2">
                {existingManualCode ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSaveOrderDiscount(true)}
                    disabled={isApplyingDiscount}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 dark:hover:text-rose-400 border-rose-200 dark:border-rose-900/40 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                  >
                    Remove Discount
                  </Button>
                ) : (
                  <div />
                )}
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDiscountModalOrder(null)}
                    disabled={isApplyingDiscount}
                    className="text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleSaveOrderDiscount(false)}
                    isLoading={isApplyingDiscount}
                    disabled={numVal <= 0 && !existingManualCode}
                    className="text-xs font-bold bg-primary hover:bg-primary/90 text-white shadow-xs px-4 cursor-pointer"
                  >
                    {computedDiscount > 0
                      ? `Apply ₹${computedDiscount.toFixed(2)} Off`
                      : 'Apply Discount'}
                  </Button>
                </div>
              </div>
            }
          >
            <div className="space-y-4">
              {/* Order Info & Current Subtotal */}
              <div className="p-3 bg-muted/50 rounded-xl border border-border/80 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Order Items</span>
                  <p className="text-xs font-semibold text-foreground">
                    {activeItems.length} active item(s) &bull; {discountModalOrder.customer_name || 'Walk-in'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Items Total</span>
                  <div className="text-sm font-black text-foreground font-mono">
                    ₹{itemsSubtotal.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Segmented Type Toggle & Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground block">
                  Select Discount Type & Value
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="grid grid-cols-2 p-1 bg-muted rounded-xl border border-border shrink-0 sm:w-56">
                    <button
                      type="button"
                      onClick={() => {
                        setDiscountType('percentage');
                        if (discountType !== 'percentage') setDiscountValue('');
                      }}
                      className={`py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                        discountType === 'percentage'
                          ? 'bg-primary text-white shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Percent size={12} className="shrink-0" />
                      <span>Percentage</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDiscountType('fixed');
                        if (discountType !== 'fixed') setDiscountValue('');
                      }}
                      className={`py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                        discountType === 'fixed'
                          ? 'bg-primary text-white shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <span className="font-mono text-xs">₹</span>
                      <span>Flat Amount</span>
                    </button>
                  </div>

                  {/* Input field */}
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground font-mono">
                      {discountType === 'percentage' ? '%' : '₹'}
                    </span>
                    <Input
                      type="number"
                      min="0"
                      max={discountType === 'percentage' ? 100 : itemsSubtotal}
                      step={discountType === 'percentage' ? '0.5' : '1'}
                      placeholder={discountType === 'percentage' ? 'e.g. 10 (for 10% off)' : 'e.g. 50 (for ₹50 off)'}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      className="pl-7 pr-8 rounded-xl text-xs font-mono font-bold h-9 bg-background"
                      autoFocus
                    />
                    {discountValue && (
                      <button
                        type="button"
                        onClick={() => setDiscountValue('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs p-0.5 rounded cursor-pointer"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Apply Chips */}
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mr-1">Quick Apply:</span>
                {discountType === 'percentage' ? (
                  [5, 10, 15, 20, 25, 50].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setDiscountValue(String(pct))}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        discountValue === String(pct)
                          ? 'border-primary bg-primary text-white font-bold shadow-xs'
                          : 'border-border bg-background text-muted-foreground hover:text-foreground hover:border-border/80'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))
                ) : (
                  [10, 20, 50, 100, 200, 500].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setDiscountValue(String(amt))}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        discountValue === String(amt)
                          ? 'border-primary bg-primary text-white font-bold shadow-xs'
                          : 'border-border bg-background text-muted-foreground hover:text-foreground hover:border-border/80'
                      }`}
                    >
                      ₹{amt}
                    </button>
                  ))
                )}
              </div>

              {/* Live Calculation Preview */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Items Subtotal</span>
                  <span className="font-mono font-semibold">₹{itemsSubtotal.toFixed(2)}</span>
                </div>
                {computedDiscount > 0 && (
                  <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                    <span>Discount Applied ({discountType === 'percentage' ? `${discountValue}%` : 'Flat'})</span>
                    <span className="font-mono">-₹{computedDiscount.toFixed(2)}</span>
                  </div>
                )}
                {isGstEnabled && totalTaxRate > 0 && (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>GST ({totalTaxRate}% {isExclusiveTax ? 'Exclusive' : 'Inclusive'})</span>
                    <span className="font-mono font-semibold">
                      {isExclusiveTax ? `+₹${taxAmount.toFixed(2)}` : `incl. ₹${taxAmount.toFixed(2)}`}
                    </span>
                  </div>
                )}
                {deliveryFee > 0 && (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Delivery Fee</span>
                    <span className="font-mono font-semibold">+₹{deliveryFee.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-border/80 font-black text-sm">
                  <span className="text-foreground">New Order Total</span>
                  <span className="text-primary font-mono text-base">
                    ₹{calculatedTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* Thermal Bill Receipt Modal */}
      <ThermalBillModal
        isOpen={!!thermalPrintOrder}
        onClose={() => setThermalPrintOrder(null)}
        order={thermalPrintOrder}
        shop={shop}
        initialMode={thermalPrintInitialMode}
      />

      {/* Thermal Kitchen Order Ticket (KOT) Modal */}
      <ThermalKotModal
        isOpen={!!thermalKotOrder}
        onClose={() => setThermalKotOrder(null)}
        order={thermalKotOrder}
        shop={shop}
        initialMode={thermalKotMode}
      />

      {/* Payment Mode Selection Modal (When changing to Paid) */}
      <PaymentModeModal
        isOpen={!!paymentModeModalOrder}
        onClose={() => setPaymentModeModalOrder(null)}
        order={paymentModeModalOrder}
        currencySymbol={shop?.settings?.currency || '₹'}
        onConfirm={async (orderId, paymentStatus, paymentMethod, splitPayments) => {
          await handleUpdatePaymentStatus(orderId, paymentStatus, paymentMethod, splitPayments);
        }}
      />

      {/* Floating Action Button (FAB) for Create Order */}
      {!isCreateModalOpen && !targetOrderForAdd && createPortal(
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="lg:hidden fixed bottom-20 lg:bottom-8 right-4 lg:right-8 z-50 w-14 h-14 rounded-full bg-primary hover:bg-primary-600 hover:scale-105 shadow-xl flex items-center justify-center text-white transition-all duration-200 cursor-pointer"
          title="Create New Order"
        >
          <Plus size={24} />
        </button>,
        document.body
      )}
    </div>
  );
}
