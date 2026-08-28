import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router';
import { RefreshCw, ShoppingBag, Clock, XCircle, ChevronDown, Check, List, User, MapPin, Phone, Share2, Copy, ExternalLink, Navigation, Lock, Search, Plus } from 'lucide-react';
import { api } from '@/services/api';
import { useHeaderStore } from '@/store/useHeaderStore';
import { HeaderActions } from '@/components/HeaderActions';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Badge } from '@/components/ui/Badge';
import { InfiniteScrollTrigger } from '@/components/ui/InfiniteScrollTrigger';
import toast from 'react-hot-toast';
import { CreateOrderModal } from './CreateOrderModal';

function formatDateTime(dateStr: string) {
  if (!dateStr) return { date: '—', time: '—' };
  const d = new Date(dateStr);
  const date = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
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

function generateOrderBillText(order: any) {
  const { date, time } = formatDateTime(order.created_at);
  const orderId = order.id.slice(0, 8).toUpperCase();
  const itemsText = (order.items || []).map((it: any) => {
    let details = `${it.name} x${it.quantity} - ₹${(it.price * it.quantity).toFixed(2)}`;
    if (it.variant_info) {
      try {
        const v = typeof it.variant_info === 'string' ? JSON.parse(it.variant_info) : it.variant_info;
        const vStr = Object.entries(v).map(([k, val]) => `${k}: ${val}`).join(', ');
        details += ` (${vStr})`;
      } catch { }
    }
    return `• ${details}`;
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
  bill += `💳 Payment: ${order.payment_method?.toUpperCase()} (${order.payment_status?.toUpperCase()})\n`;
  bill += `💰 *Grand Total: ₹${Number(order.total_amount).toFixed(2)}*\n`;
  bill += `------------------------------\n`;
  bill += `Thank you for ordering with us!`;

  return bill;
}

const PAY_OPTIONS = [
  { value: 'pending', label: 'Not Paid', cls: 'text-amber-700 bg-amber-50 border-amber-200', dot: 'bg-amber-400' },
  { value: 'paid', label: 'Paid', cls: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  { value: 'completed', label: 'Completed', cls: 'text-blue-700 bg-blue-50 border-blue-200', dot: 'bg-blue-500' },
  { value: 'refunded', label: 'Refunded', cls: 'text-purple-700 bg-purple-50 border-purple-200', dot: 'bg-purple-500' },
];

function paymentStyle(status: string) {
  return PAY_OPTIONS.find(o => o.value === status) ?? PAY_OPTIONS[0];
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

  const isCancelled = ['rejected', 'cancelled', 'CANCELLED'].includes(orderStatus);
  const options = isCancelled
    ? PAY_OPTIONS.filter(o => ['pending', 'refunded'].includes(o.value))
    : PAY_OPTIONS;
  const current = paymentStyle(paymentStatus);

  const openDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || !btnRef.current) return;
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
    const isRefundable = opt.value === 'refunded' && paymentMethod === 'online';
    const msg = isRefundable
      ? 'This will process an automatic online refund to the customer. Continue?'
      : `Change payment status to "${opt.label}"?`;
    if (confirm(msg)) onSelect(orderId, opt.value);
  };

  return (
    <div className="inline-flex items-center">
      <button
        ref={btnRef}
        onClick={openDropdown}
        disabled={disabled}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black border transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${current.cls}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`} />
        <span>{current.label}</span>
        <ChevronDown size={11} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && createPortal(
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

/* ── Order Status Portal Dropdown ───────────────────────────────────────── */
const ORDER_STATUS_OPTIONS = [
  { value: 'PENDING_VENDOR', label: 'Needs Acceptance', cls: 'text-amber-700 bg-amber-50 border-amber-200', dot: 'bg-amber-400' },
  { value: 'PAYMENT_PENDING', label: 'Accept', cls: 'text-orange-700 bg-orange-50 border-orange-200', dot: 'bg-orange-500' },
  { value: 'PAID', label: 'Paid - Start Prep', cls: 'text-indigo-700 bg-indigo-50 border-indigo-200', dot: 'bg-indigo-500' },
  { value: 'PREPARING', label: 'Preparing', cls: 'text-blue-700 bg-blue-50 border-blue-200', dot: 'bg-blue-500' },
  { value: 'READY', label: 'Ready for Pickup', cls: 'text-cyan-700 bg-cyan-50 border-cyan-200', dot: 'bg-cyan-500' },
  { value: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', cls: 'text-teal-700 bg-teal-50 border-teal-200', dot: 'bg-teal-500' },
  { value: 'DELIVERED', label: 'Complete', cls: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  { value: 'CANCELLED', label: 'Cancel', cls: 'text-rose-700 bg-rose-50 border-rose-200', dot: 'bg-rose-500' },
  // Legacy Fallbacks
  { value: 'pending', label: 'Pending (Legacy)', cls: 'text-amber-700 bg-amber-50 border-amber-200', dot: 'bg-amber-400' },
  { value: 'accepted', label: 'Accepted (Legacy)', cls: 'text-blue-700 bg-blue-50 border-blue-200', dot: 'bg-blue-500' },
  { value: 'completed', label: 'Completed (Legacy)', cls: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  { value: 'rejected', label: 'Rejected (Legacy)', cls: 'text-rose-700 bg-rose-50 border-rose-200', dot: 'bg-rose-500' },
];

function orderStatusStyle(status: string) {
  return ORDER_STATUS_OPTIONS.find(o => o.value === status) ?? ORDER_STATUS_OPTIONS[0];
}

interface OrderStatusDropdownProps {
  orderId: string;
  orderStatus: string;
  paymentStatus: string;
  onSelect: (orderId: string, val: string) => void;
}

function OrderStatusDropdown({ orderId, orderStatus, paymentStatus, onSelect }: OrderStatusDropdownProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const current = orderStatusStyle(orderStatus);

  const openDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!btnRef.current) return;
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

  const handleSelect = (opt: typeof ORDER_STATUS_OPTIONS[number]) => {
    setOpen(false);
    if (opt.value === orderStatus) return;
    
    if (opt.value === 'CANCELLED' || opt.value === 'rejected') {
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
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer ${current.cls}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`} />
        <span>{current.label}</span>
        <ChevronDown size={11} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          style={{ position: 'absolute', top: pos.top, right: pos.right, zIndex: 9999 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden min-w-[140px] animate-fade-in"
        >
          {ORDER_STATUS_OPTIONS.filter(o => {
            const isStandard = ['PENDING_VENDOR', 'PAYMENT_PENDING', 'PAID', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED'].includes(o.value);
            if (!isStandard) return false;
            if (paymentStatus === 'paid' && o.value === 'CANCELLED') return false;
            return true;
          }).map(opt => {
            const isSelected = orderStatus === opt.value;
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

/* ── Main Page ───────────────────────────────────────────────────────────── */
export function OrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>(cachedOrders);
  const [isLoading, setIsLoading] = useState(() => cachedOrders.length === 0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  
  // API Filtering & Pagination
  const [filterStatus, setFilterStatus] = useState<string>('new');
  const [filterType, setFilterType] = useState<string>('all');
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
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [cancelOrderReason, setCancelOrderReason] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [targetOrderForAdd, setTargetOrderForAdd] = useState<any | null>(null);
  const { setTitle } = useHeaderStore();

  useEffect(() => {
    setTitle('Orders Queue', 'Manage your incoming live orders, dine-in tickets, and deliveries.');
  }, [setTitle]);

  const fetchStatusCounts = useCallback(async () => {
    try {
      const res = await api.get('/orders/status-counts');
      if (res.data) {
        setStatusCounts(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch status counts', err);
    }
  }, []);

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

      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }

      const ordersReq = api.get('/orders', { params });
      const countsReq = reset ? api.get('/orders/status-counts') : Promise.resolve(null);

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
  }, [filterStatus, filterType, debouncedSearch]);

  useEffect(() => {
    fetchOrdersData(0, true);

    const handleRealtimeUpdate = (e: any) => {
      const notif = e.detail;
      if (!notif || notif.type === 'NEW_ORDER' || notif.type === 'ORDER_STATUS') {
        fetchOrdersData(0, true);
      }
    };

    window.addEventListener('menukit-realtime-update', handleRealtimeUpdate);
    return () => window.removeEventListener('menukit-realtime-update', handleRealtimeUpdate);
  }, [filterStatus, filterType, debouncedSearch, fetchOrdersData]);

  const handleLoadMore = () => {
    if (hasMore && !isLoadingMore && !isLoading) {
      const nextSkip = skip + PAGE_SIZE;
      fetchOrdersData(nextSkip, false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string, reason?: string) => {
    if (newStatus === 'CANCELLED' && !reason) {
      setCancellingOrderId(orderId);
      return;
    }
    
    try {
      const payload: any = { status: newStatus };
      if (reason) payload.cancellation_reason = reason;
      const res = await api.put(`/orders/${orderId}/status`, payload);
      toast.success(`Order marked as ${newStatus}`);
      fetchStatusCounts();
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, order_status: res.data.order_status, cancellation_reason: res.data.cancellation_reason } : o));
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update order status');
    }
  };

  const submitCancelOrder = async () => {
    if (!cancellingOrderId) return;
    if (!cancelOrderReason.trim()) {
      toast.error("Please provide a cancellation reason");
      return;
    }
    await handleUpdateStatus(cancellingOrderId, 'CANCELLED', cancelOrderReason);
    setCancellingOrderId(null);
    setCancelOrderReason('');
  };

  const handleUpdatePaymentStatus = useCallback(async (orderId: string, newPayStatus: string) => {
    try {
      const res = await api.put(`/orders/${orderId}/payment`, { payment_status: newPayStatus });
      toast.success(`Payment marked as ${newPayStatus}`);
      fetchStatusCounts();
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, payment_status: res.data.payment_status ?? newPayStatus } : o));
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update payment status');
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
      <div className="sticky top-[-16px] sm:top-[-24px] lg:top-[-32px] z-20 bg-background/95 backdrop-blur-md pb-4 pt-4 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-b border-border mb-6 space-y-3">
        <div
          className="flex overflow-x-auto gap-2 py-1 whitespace-nowrap scrollbar-hide no-scrollbar"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {[
            { id: 'all',       label: 'All Orders',       count: statusCounts.all ?? 0, activeBg: 'bg-slate-800 text-white shadow-md shadow-slate-800/20' },
            { id: 'new',       label: 'New Orders',       count: statusCounts.new ?? 0, activeBg: 'bg-amber-500 text-white shadow-md shadow-amber-500/20' },
            { id: 'awaiting_payment', label: 'Awaiting Payment', count: statusCounts.awaiting_payment ?? 0, activeBg: 'bg-blue-500 text-white shadow-md shadow-blue-500/20' },
            { id: 'accepted',  label: 'Awaiting Preparing',        count: statusCounts.accepted ?? 0, activeBg: 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20' },
            { id: 'preparing', label: 'Awaiting Complete', count: statusCounts.preparing ?? 0, activeBg: 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20' },
            { id: 'completed', label: 'Completed',        count: statusCounts.completed ?? 0, activeBg: 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' },
            { id: 'cancelled', label: 'Cancelled',        count: statusCounts.cancelled ?? 0, activeBg: 'bg-rose-500 text-white shadow-md shadow-rose-500/20' },
          ].map(tab => {
            const isSelected = filterStatus === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? tab.activeBg
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  isSelected
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Order Type Secondary Filters */}
        <div
          className="flex overflow-x-auto gap-2 mt-2 py-1 whitespace-nowrap scrollbar-hide no-scrollbar"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {[
            { id: 'all', label: 'All Types', activeBg: 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900' },
            { id: 'dine_in', label: 'Dine-in', activeBg: 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 border-transparent' },
            { id: 'takeaway', label: 'Takeaway', activeBg: 'bg-amber-500 text-white shadow-md shadow-amber-500/20 border-transparent' },
            { id: 'delivery', label: 'Online / Delivery', activeBg: 'bg-fuchsia-600 text-white shadow-md shadow-fuchsia-600/20 border-transparent' },
          ].map(typeTab => {
            const isSelected = filterType === typeTab.id;
            return (
              <button
                key={typeTab.id}
                onClick={() => setFilterType(typeTab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all shrink-0 cursor-pointer border ${
                  isSelected
                    ? typeTab.activeBg
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {typeTab.label}
              </button>
            );
          })}
        </div>

        {/* API Search Input */}
        <div className="relative mt-2.5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            type="text"
            placeholder="Search customer, phone, table, address, or order ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-primary font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 shadow-xs"
          />
        </div>
      </div>

      {isLoading && orders.length === 0 ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
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
          {orders.map(order => {
            const status = order.order_status;
            
            // New logic booleans
            const isPendingVendor = status === 'PENDING_VENDOR' || status === 'pending';
            const isPaymentPending = status === 'PAYMENT_PENDING';
            const isPaid = status === 'PAID';
            const isPreparing = status === 'PREPARING' || status === 'accepted';
            const isReady = status === 'READY';
            
            const isCancellable = isPendingVendor || isPaymentPending || isPaid || isPreparing;
            
            const { date, time } = formatDateTime(order.created_at);
            
            // Colors
            const borderColor = isPendingVendor ? '#f59e0b' : isPaymentPending ? '#f97316' : (isPaid || isPreparing || isReady) ? '#3b82f6' : status === 'completed' || status === 'DELIVERED' ? '#10b981' : '#ef4444';
            
            const previewItems = order.items?.slice(0, 2) ?? [];
            const extraCount = (order.items?.length ?? 0) - 2;

            return (
              <Card key={order.id} className="relative overflow-hidden border-l-4 shadow-sm hover:shadow-md transition-shadow" style={{ borderLeftColor: borderColor }}>
                <CardContent className="p-4 sm:p-5 space-y-3.5">

                  {/* Top Bar: Order ID, Type, Date/Time & Status Dropdown */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-border/60">
                    <div className="flex items-center justify-between sm:justify-start gap-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-base font-extrabold text-foreground">#{order.id.slice(0, 8).toUpperCase()}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${
                            order.order_type === 'dine_in' ? 'text-indigo-600 bg-indigo-50 border border-indigo-100 dark:text-indigo-400 dark:bg-indigo-950/40 dark:border-indigo-900/40' :
                            order.order_type === 'takeaway' ? 'text-amber-600 bg-amber-50 border border-amber-100 dark:text-amber-400 dark:bg-amber-950/40 dark:border-amber-900/40' :
                            'text-fuchsia-600 bg-fuchsia-50 border border-fuchsia-100 dark:text-fuchsia-400 dark:bg-fuchsia-950/40 dark:border-fuchsia-900/40'
                          }`}>
                            {order.order_type === 'delivery' ? 'Delivery' : order.order_type?.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                          <Clock size={12} />
                          <span>{date} &bull; {time}</span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 self-start sm:self-auto">
                      <OrderStatusDropdown
                        orderId={order.id}
                        orderStatus={order.order_status}
                        paymentStatus={order.payment_status}
                        onSelect={handleUpdateStatus}
                      />
                    </div>
                  </div>

                  {/* Content Grid: Customer & Items Side-by-Side on Desktop */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Customer Information */}
                    <div
                      onClick={() => setCustomerModalOrder(order)}
                      className="p-3 bg-muted/40 hover:bg-muted/70 rounded-xl text-xs space-y-1.5 cursor-pointer transition-colors border border-border/50 flex flex-col justify-center"
                      title="Click to view full customer details"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-muted-foreground flex items-center gap-1">
                          <User size={13} /> Customer
                        </span>
                        <span className="font-extrabold text-foreground">{order.customer_name}</span>
                      </div>
                      {order.customer_phone && (
                        <div className="flex justify-between items-center pt-1 border-t border-border/40 border-dashed">
                          <span className="text-muted-foreground font-semibold flex items-center gap-1">
                            <Phone size={12} /> Phone
                          </span>
                          <span className="font-mono text-foreground font-bold">{order.customer_phone}</span>
                        </div>
                      )}
                      {order.table_number && (
                        <div className="flex justify-between items-center pt-1 border-t border-border/40 border-dashed">
                          <span className="text-muted-foreground font-semibold">Table</span>
                          <span className="font-black text-primary">Table #{order.table_number}</span>
                        </div>
                      )}
                    </div>

                    {/* Order Items Preview */}
                    <div
                      onClick={() => setItemsModalOrder(order)}
                      className="cursor-pointer group bg-muted/40 hover:bg-muted/70 p-3 rounded-xl border border-border/50 transition-colors flex flex-col justify-between"
                    >
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                          <ShoppingBag size={12} /> Items
                        </span>
                        <Badge variant="secondary" className="text-[10px] bg-background">
                          {order.items?.reduce((acc: number, cur: any) => acc + cur.quantity, 0) || 0} Item(s)
                        </Badge>
                      </div>
                      <ul className="text-xs space-y-1">
                        {previewItems.map((item: any, i: number) => (
                          <li key={i} className="flex justify-between text-muted-foreground">
                            <span className="truncate pr-2 font-medium text-foreground group-hover:text-primary transition-colors">{item.name}</span>
                            <span className="font-bold text-foreground shrink-0">x{item.quantity}</span>
                          </li>
                        ))}
                        {extraCount > 0 && (
                          <li className="text-[10px] font-bold text-muted-foreground pt-0.5 text-center">
                            + {extraCount} more items
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>

                  {/* Cancellation Reason if cancelled */}
                  {status === 'CANCELLED' && order.cancellation_reason && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-100 dark:border-rose-900/30 text-xs">
                      <span className="block font-bold text-rose-700 dark:text-rose-400 mb-0.5">Cancellation Reason</span>
                      <p className="text-rose-600 dark:text-rose-300 font-medium">
                        {order.cancellation_reason}
                      </p>
                    </div>
                  )}

                  {/* Bottom Bar: Payment Status & Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border/60">
                    <div className="flex items-center justify-between sm:justify-start gap-4">
                      <div>
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Payment</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-extrabold capitalize text-xs text-foreground">{order.payment_method}</span>
                          <PayDropdown
                            orderId={order.id}
                            paymentStatus={order.payment_status}
                            paymentMethod={order.payment_method}
                            orderStatus={order.order_status}
                            onSelect={handleUpdatePaymentStatus}
                            disabled={order.order_type === 'takeaway' && order.payment_method === 'online'}
                          />
                        </div>
                      </div>

                      <div className="text-right sm:text-left border-l border-border/40 pl-4">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Total</span>
                        <span className="font-black text-base text-foreground">
                          ₹{Number(order.total_amount).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons Row */}
                    <div className="flex flex-wrap items-center gap-2 justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                      {status !== 'COMPLETED' && status !== 'CANCELLED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setTargetOrderForAdd(order)}
                          leftIcon={<Plus size={13} />}
                          className="border-primary/40 text-primary hover:bg-primary/10 text-xs font-bold"
                        >
                          + Add Items
                        </Button>
                      )}

                      <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(order.id); toast.success('Order ID copied'); }} leftIcon={<Copy size={13} />} className="text-xs text-muted-foreground">
                        Copy
                      </Button>
                      
                      {isCancellable && order.payment_status !== 'paid' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="bg-rose-50 hover:bg-rose-100 text-rose-600 border-0 text-xs font-bold"
                          onClick={() => setCancellingOrderId(order.id)}
                          leftIcon={<XCircle size={13} />}
                        >
                          Cancel
                        </Button>
                      )}
                      
                      {isPendingVendor && (
                        <Button size="sm" className="text-xs font-bold" onClick={() => handleUpdateStatus(order.id, 'PAYMENT_PENDING')}>
                          Accept Order
                        </Button>
                      )}
                      
                      {isPaymentPending && (
                        <Button size="sm" variant="outline" disabled className="opacity-70 bg-amber-50 text-amber-700 border-amber-200 text-xs font-bold">
                          Awaiting Payment
                        </Button>
                      )}

                      {isPaid && (
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold" onClick={() => handleUpdateStatus(order.id, 'PREPARING')}>
                          Start Prep
                        </Button>
                      )}

                      {isPreparing && (
                        <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold" onClick={() => handleUpdateStatus(order.id, 'READY')}>
                          Mark Ready
                        </Button>
                      )}

                      {isReady && (
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold" onClick={() => handleUpdateStatus(order.id, 'COMPLETED')}>
                          Mark Completed
                        </Button>
                      )}
                    </div>
                  </div>

                </CardContent>
              </Card>
            );
          })}
          <InfiniteScrollTrigger
            onIntersect={handleLoadMore}
            isLoading={isLoadingMore}
            hasMore={hasMore}
          />
        </div>
      )}

      {/* Customer Info Modal (Desktop only via isOpen check) */}
      <Modal
        isOpen={!!customerModalOrder && window.innerWidth >= 640}
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
                    <MapPin size={16} className="text-primary" />
                    <span className="text-xs text-slate-400 font-bold uppercase">Full Delivery Address</span>
                  </div>
                  <a
                    href={generateGoogleMapsUrl(customerModalOrder.delivery_address)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[11px] font-black text-primary hover:underline bg-primary/10 px-2 py-0.5 rounded-md"
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
            <div className="flex gap-2 pt-2 border-t border-slate-150 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-1.5"
                onClick={() => {
                  const billText = generateOrderBillText(customerModalOrder);
                  if (navigator.share) {
                    navigator.share({ title: `Order Bill #${customerModalOrder.id.slice(0, 8)}`, text: billText }).catch(() => { });
                  } else {
                    navigator.clipboard.writeText(billText);
                    toast.success('Bill copied to clipboard!');
                  }
                }}
                leftIcon={<Share2 size={14} />}
              >
                Share Bill
              </Button>

              <Button
                variant="secondary"
                size="sm"
                className="flex-1 gap-1.5"
                onClick={() => {
                  const billText = generateOrderBillText(customerModalOrder);
                  navigator.clipboard.writeText(billText);
                  toast.success('Bill details copied to clipboard!');
                }}
                leftIcon={<Copy size={14} />}
              >
                Copy Text
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Customer Info Bottom Sheet (Mobile only via isOpen check) */}
      <BottomSheet
        isOpen={!!customerModalOrder && window.innerWidth < 640}
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
                    <MapPin size={16} className="text-primary" />
                    <span className="text-xs text-slate-400 font-bold uppercase">Full Delivery Address</span>
                  </div>
                  <a
                    href={generateGoogleMapsUrl(customerModalOrder.delivery_address)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[11px] font-black text-primary hover:underline bg-primary/10 px-2 py-0.5 rounded-md"
                  >
                    <Navigation size={12} /> Open Map
                  </a>
                </div>
                <p className="text-slate-700 dark:text-slate-200 font-medium leading-relaxed bg-white dark:bg-slate-950 p-2.5 rounded-lg border border-slate-150 dark:border-slate-800">
                  {customerModalOrder.delivery_address}
                </p>
              </div>
            )}

            {/* Quick Share & Copy Actions */}
            <div className="flex gap-2 pt-2 border-t border-slate-150 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-1.5"
                onClick={() => {
                  const billText = generateOrderBillText(customerModalOrder);
                  if (navigator.share) {
                    navigator.share({ title: `Order Bill #${customerModalOrder.id.slice(0, 8)}`, text: billText }).catch(() => { });
                  } else {
                    navigator.clipboard.writeText(billText);
                    toast.success('Bill copied to clipboard!');
                  }
                }}
                leftIcon={<Share2 size={14} />}
              >
                Share Bill
              </Button>

              <Button
                variant="secondary"
                size="sm"
                className="flex-1 gap-1.5"
                onClick={() => {
                  const billText = generateOrderBillText(customerModalOrder);
                  navigator.clipboard.writeText(billText);
                  toast.success('Bill details copied to clipboard!');
                }}
                leftIcon={<Copy size={14} />}
              >
                Copy Text
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* Items Detail Modal (Desktop only via isOpen check) */}
      <Modal
        isOpen={!!itemsModalOrder && window.innerWidth >= 640}
        onClose={() => setItemsModalOrder(null)}
        title={`Order #${itemsModalOrder?.id?.slice(0, 8)?.toUpperCase()} — Items (${itemsModalOrder?.items?.length ?? 0})`}
      >
        {itemsModalOrder && (
          <div className="mt-2">
            <div className="flex items-center gap-3 mb-4 px-1">
              <span className="text-xs font-bold text-slate-500">
                {itemsModalOrder.items.length} item{itemsModalOrder.items.length !== 1 ? 's' : ''}
              </span>
              <span className="text-slate-200 dark:text-slate-700">•</span>
              <span className={`text-xs font-black px-2 py-0.5 rounded-full ${itemsModalOrder.order_status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                  itemsModalOrder.order_status === 'accepted' ? 'bg-blue-100 text-blue-700' :
                    itemsModalOrder.order_status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      'bg-rose-100 text-rose-700'
                }`}>
                {itemsModalOrder.order_status}
              </span>
            </div>

            <div className="overflow-y-auto max-h-[400px] pr-1 space-y-2" style={{ scrollbarWidth: 'thin' }}>
              {itemsModalOrder.items.map((it: any, idx: number) => {
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

                return (
                  <div
                    key={it.id ?? idx}
                    className="flex items-start justify-between gap-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl px-4 py-3 border border-slate-100 dark:border-slate-800"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-800 dark:text-slate-100">{it.name}</span>
                        <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          ×{it.quantity}
                        </span>
                      </div>
                      {variantLabel && (
                        <p className="text-[11px] text-slate-500 mt-1 font-medium">
                          <span className="font-semibold text-slate-600 dark:text-slate-400">Variant:</span> {variantLabel}
                        </p>
                      )}
                      {addons.length > 0 && (
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          <span className="font-semibold text-slate-600 dark:text-slate-400">Add-ons:</span> {addons.join(', ')}
                        </p>
                      )}
                    </div>
                    <span className="font-black text-sm font-mono text-slate-700 dark:text-slate-200 shrink-0">
                      ₹{(it.price * it.quantity).toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center font-black text-base mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white">
              <span>Grand Total</span>
              <span className="text-primary text-lg">₹{Number(itemsModalOrder.total_amount).toFixed(2)}</span>
            </div>
          </div>
        )}
      </Modal>

      {/* Items Detail Bottom Sheet (Mobile only via isOpen check) */}
      <BottomSheet
        isOpen={!!itemsModalOrder && window.innerWidth < 640}
        onClose={() => setItemsModalOrder(null)}
        title={`Order #${itemsModalOrder?.id?.slice(0, 8)?.toUpperCase()} — Items (${itemsModalOrder?.items?.length ?? 0})`}
      >
        {itemsModalOrder && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-bold text-slate-500">
                {itemsModalOrder.items.length} item{itemsModalOrder.items.length !== 1 ? 's' : ''}
              </span>
              <span className="text-slate-200 dark:text-slate-700">•</span>
              <span className={`text-xs font-black px-2 py-0.5 rounded-full ${itemsModalOrder.order_status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                  itemsModalOrder.order_status === 'accepted' ? 'bg-blue-100 text-blue-700' :
                    itemsModalOrder.order_status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      'bg-rose-100 text-rose-700'
                }`}>
                {itemsModalOrder.order_status}
              </span>
            </div>

            <div className="space-y-2">
              {itemsModalOrder.items.map((it: any, idx: number) => {
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

                return (
                  <div
                    key={it.id ?? idx}
                    className="flex items-start justify-between gap-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl px-4 py-3 border border-slate-100 dark:border-slate-800"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-800 dark:text-slate-100">{it.name}</span>
                        <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          ×{it.quantity}
                        </span>
                      </div>
                      {variantLabel && (
                        <p className="text-[11px] text-slate-500 mt-1 font-medium">
                          <span className="font-semibold text-slate-600 dark:text-slate-400">Variant:</span> {variantLabel}
                        </p>
                      )}
                      {addons.length > 0 && (
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          <span className="font-semibold text-slate-600 dark:text-slate-400">Add-ons:</span> {addons.join(', ')}
                        </p>
                      )}
                    </div>
                    <span className="font-black text-sm font-mono text-slate-700 dark:text-slate-200 shrink-0">
                      ₹{(it.price * it.quantity).toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center font-black text-base mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white">
              <span>Grand Total</span>
              <span className="text-primary text-lg">₹{Number(itemsModalOrder.total_amount).toFixed(2)}</span>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* Cancellation Modal */}
      <Modal
        isOpen={!!cancellingOrderId}
        onClose={() => { setCancellingOrderId(null); setCancelOrderReason(''); }}
        title="Cancel Order"
      >
        <div className="space-y-4 pt-2">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Please provide a reason for cancelling this order. This will be shown to the customer.
          </p>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Cancellation Reason
            </label>
            <textarea
              className="w-full min-h-[100px] p-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all resize-none"
              placeholder="e.g., Item out of stock, Restaurant closed..."
              value={cancelOrderReason}
              onChange={(e) => setCancelOrderReason(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => { setCancellingOrderId(null); setCancelOrderReason(''); }}
            >
              Go Back
            </Button>
            <Button
              className="flex-1 bg-rose-600 hover:bg-rose-700 text-white border-0"
              onClick={submitCancelOrder}
            >
              Confirm Cancellation
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Offline Order Modal */}
      <CreateOrderModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onOrderCreated={() => fetchOrdersData(0, true)}
      />

      {/* Add Items to Active Order Modal */}
      <CreateOrderModal
        isOpen={!!targetOrderForAdd}
        onClose={() => setTargetOrderForAdd(null)}
        targetOrder={targetOrderForAdd}
        onOrderCreated={() => fetchOrdersData(0, true)}
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
