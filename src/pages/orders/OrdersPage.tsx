import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw, ShoppingBag, Clock, XCircle, ChevronDown, Check, List, User, MapPin, Phone, Share2, Copy, ExternalLink, Navigation } from 'lucide-react';
import { api } from '@/services/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { BottomSheet } from '@/components/ui/BottomSheet';
import toast from 'react-hot-toast';

function formatDateTime(dateStr: string) {
  if (!dateStr) return { date: '—', time: '—' };
  const d = new Date(dateStr);
  const date = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  return { date, time };
}

function generateGoogleMapsUrl(address: string) {
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
}

function PayDropdown({ orderId, paymentStatus, paymentMethod, orderStatus, onSelect }: PayDropdownProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const isCancelled = ['rejected', 'cancelled'].includes(orderStatus);
  const options = isCancelled
    ? PAY_OPTIONS.filter(o => ['pending', 'refunded'].includes(o.value))
    : PAY_OPTIONS;
  const current = paymentStyle(paymentStatus);

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

  const handleSelect = (opt: typeof PAY_OPTIONS[number]) => {
    setOpen(false);
    if (opt.value === paymentStatus) return;
    const isRefundable = opt.value === 'refunded' && paymentMethod === 'online';
    const msg = isRefundable
      ? 'This will process an automatic Cashfree refund to the customer. Continue?'
      : `Change payment status to "${opt.label}"?`;
    if (confirm(msg)) onSelect(orderId, opt.value);
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <span className="text-slate-400 text-[9px] uppercase tracking-wider font-bold">Payment Status</span>
      <button
        ref={btnRef}
        onClick={openDropdown}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black border transition-all cursor-pointer ${current.cls}`}
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
  { value: 'pending', label: 'Pending', cls: 'text-amber-700 bg-amber-50 border-amber-200', dot: 'bg-amber-400' },
  { value: 'accepted', label: 'Preparing', cls: 'text-blue-700 bg-blue-50 border-blue-200', dot: 'bg-blue-500' },
  { value: 'completed', label: 'Completed', cls: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  { value: 'rejected', label: 'Rejected', cls: 'text-rose-700 bg-rose-50 border-rose-200', dot: 'bg-rose-500' },
];

function orderStatusStyle(status: string) {
  return ORDER_STATUS_OPTIONS.find(o => o.value === status) ?? ORDER_STATUS_OPTIONS[0];
}

interface OrderStatusDropdownProps {
  orderId: string;
  orderStatus: string;
  onSelect: (orderId: string, val: string) => void;
}

function OrderStatusDropdown({ orderId, orderStatus, onSelect }: OrderStatusDropdownProps) {
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
    if (confirm(`Change order status to "${opt.label}"?`)) {
      onSelect(orderId, opt.value);
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
          {ORDER_STATUS_OPTIONS.map(opt => {
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

/* ── Main Page ───────────────────────────────────────────────────────────── */
export function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [itemsModalOrder, setItemsModalOrder] = useState<any | null>(null);
  const [customerModalOrder, setCustomerModalOrder] = useState<any | null>(null);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/orders');
      setOrders(res.data || []);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await api.put(`/orders/${orderId}/status`, { status: newStatus });
      toast.success(`Order marked as ${newStatus}`);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, order_status: res.data.order_status } : o));
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update order status');
    }
  };

  const handleUpdatePaymentStatus = useCallback(async (orderId: string, newPayStatus: string) => {
    try {
      const res = await api.put(`/orders/${orderId}/payment-status`, { payment_status: newPayStatus });
      toast.success(`Payment marked as ${newPayStatus}`);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, payment_status: res.data.payment_status ?? newPayStatus } : o));
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update payment status');
    }
  }, []);

  const filteredOrders = orders.filter(o => {
    if (filterStatus === 'all') return true;
    return o.order_status === filterStatus;
  });

  return (
    <div className="max-w-5xl mx-auto animate-fade-in pb-24 lg:pb-12 space-y-4">
      {/* Page Header (visible on mobile and desktop) */}
      <div className="flex justify-between items-center mb-2">
        <PageHeader
          title="Orders Queue"
          subtitle="Manage your incoming live orders, dine-in tickets, and deliveries."
        />
        <Button
          variant="outline"
          size="sm"
          onClick={fetchOrders}
          disabled={isLoading}
          leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
        >
          Refresh
        </Button>
      </div>

      {/* Tabs — sticky top with zero gap and full backdrop blur */}
      <div className="sticky top-[-16px] sm:top-[-24px] lg:top-[-32px] z-20 bg-[#f8fafc]/95 dark:bg-slate-950/95 backdrop-blur-md pt-3 pb-3 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-b border-slate-200 dark:border-slate-800 mb-4 shadow-xs">
        <div
          className="flex overflow-x-auto gap-2 py-1 whitespace-nowrap scrollbar-hide no-scrollbar"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {[
            { id: 'all',       label: 'All Orders',       count: orders.length, activeBg: 'bg-primary text-white shadow-md shadow-primary/20' },
            { id: 'pending',   label: 'Pending Approval', count: orders.filter(o => o.order_status === 'pending').length, activeBg: 'bg-amber-500 text-white shadow-md shadow-amber-500/20' },
            { id: 'accepted',  label: 'Preparing',        count: orders.filter(o => o.order_status === 'accepted').length, activeBg: 'bg-blue-600 text-white shadow-md shadow-blue-600/20' },
            { id: 'completed', label: 'Completed',        count: orders.filter(o => o.order_status === 'completed').length, activeBg: 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' },
            { id: 'rejected',  label: 'Rejected',         count: orders.filter(o => o.order_status === 'rejected').length, activeBg: 'bg-rose-600 text-white shadow-md shadow-rose-600/20' },
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
      </div>

      {isLoading && orders.length === 0 ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card className="p-12 text-center flex flex-col items-center justify-center">
          <ShoppingBag size={48} className="text-slate-300 dark:text-slate-700 mb-3" />
          <h3 className="font-bold text-slate-700 dark:text-slate-350 text-base">No orders found</h3>
          <p className="text-sm text-slate-400">There are no orders matching this filter right now.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredOrders.map(order => {
            const isPending = order.order_status === 'pending';
            const isAccepted = order.order_status === 'accepted';
            const isCancellable = isPending || isAccepted;
            const { date, time } = formatDateTime(order.created_at);
            const borderColor = isPending ? '#f59e0b' : isAccepted ? '#3b82f6' : order.order_status === 'completed' ? '#10b981' : '#ef4444';
            const previewItems = order.items?.slice(0, 2) ?? [];
            const extraCount = (order.items?.length ?? 0) - 2;

            return (
              <Card key={order.id} className="relative overflow-visible border-l-4" style={{ borderLeftColor: borderColor }}>
                <CardContent className="p-6 space-y-4">

                  {/* Header */}
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Order ID</span>
                      <p className="font-mono text-sm font-semibold">#{order.id.slice(0, 8)}</p>
                      <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-400">
                        <Clock size={11} />
                        <span className="font-medium">{date} &bull; {time}</span>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <OrderStatusDropdown
                        orderId={order.id}
                        orderStatus={order.order_status}
                        onSelect={handleUpdateStatus}
                      />
                      <span className="block text-xs font-bold text-slate-500 capitalize mt-0.5">
                        {order.order_type?.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Customer Information (Clickable to view full details) */}
                  <div
                    onClick={() => setCustomerModalOrder(order)}
                    className="p-3 bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-xl text-xs space-y-1.5 cursor-pointer transition-colors border border-slate-150/50 dark:border-slate-800"
                    title="Click to view full customer info"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-slate-850 dark:text-slate-200 flex items-center gap-1.5">
                        <User size={12} className="text-primary" />
                        {order.customer_name}{' '}
                        <span className="font-mono text-slate-400 font-normal">({order.customer_phone})</span>
                      </span>
                      {order.table_number && (
                        <span className="font-black text-primary bg-primary/10 px-2 py-0.5 rounded text-[10px]">
                          T-{order.table_number}
                        </span>
                      )}
                    </div>
                    {order.delivery_address && (
                      <div className="pt-1 border-t border-slate-150 dark:border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-between gap-2">
                        <span className="truncate">
                          <strong>Address:</strong> {order.delivery_address}
                        </span>
                        <span className="text-[10px] text-primary font-bold shrink-0">View full &rarr;</span>
                      </div>
                    )}
                  </div>

                  {/* Items Preview — fixed preview with modal button */}
                  <div className="border-t border-slate-100 dark:border-slate-800/60 pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Items List</p>
                      {order.items?.length > 0 && (
                        <button
                          onClick={() => setItemsModalOrder(order)}
                          className="flex items-center gap-1 text-[10px] font-extrabold text-primary hover:underline cursor-pointer"
                        >
                          <List size={11} />
                          View all {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                        </button>
                      )}
                    </div>
                    <div className="space-y-1">
                      {previewItems.map((it: any) => (
                        <div key={it.id} className="flex justify-between text-xs font-medium">
                          <span className="text-slate-650 dark:text-slate-400">
                            {it.name} <strong className="text-slate-800 dark:text-slate-200">x{it.quantity}</strong>
                          </span>
                          <span className="text-slate-500 font-mono">₹{(it.price * it.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                      {extraCount > 0 && (
                        <button
                          onClick={() => setItemsModalOrder(order)}
                          className="text-[10px] text-slate-400 hover:text-primary font-semibold italic text-left"
                        >
                          +{extraCount} more item{extraCount !== 1 ? 's' : ''}… (click to view)
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Payment Row */}
                  <div className="flex justify-between items-end border-t border-slate-100 dark:border-slate-800/60 pt-3">
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-bold">Method</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300 capitalize">{order.payment_method}</span>
                    </div>
                    <PayDropdown
                      orderId={order.id}
                      paymentStatus={order.payment_status}
                      paymentMethod={order.payment_method}
                      orderStatus={order.order_status}
                      onSelect={handleUpdatePaymentStatus}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800/60">
                    <p className="font-black text-slate-800 dark:text-white text-base">
                      ₹{Number(order.total_amount).toFixed(2)}
                    </p>
                    <div className="flex gap-2 flex-wrap justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        title="Share Bill & Location"
                        onClick={() => {
                          const billText = generateOrderBillText(order);
                          if (navigator.share) {
                            navigator.share({ title: `Order Bill #${order.id.slice(0, 8)}`, text: billText }).catch(() => { });
                          } else {
                            navigator.clipboard.writeText(billText);
                            toast.success('Order Bill copied to clipboard!');
                          }
                        }}
                        leftIcon={<Share2 size={13} />}
                      >
                        Share
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        title="Copy Bill Text"
                        onClick={() => {
                          const billText = generateOrderBillText(order);
                          navigator.clipboard.writeText(billText);
                          toast.success('Order Bill copied to clipboard!');
                        }}
                        leftIcon={<Copy size={13} />}
                      >
                        Copy
                      </Button>
                      {isCancellable && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="bg-rose-50 hover:bg-rose-100 text-rose-600 border-0"
                          onClick={() => { if (confirm('Cancel this order?')) handleUpdateStatus(order.id, 'rejected'); }}
                          leftIcon={<XCircle size={13} />}
                        >
                          Cancel
                        </Button>
                      )}
                      {isPending && (
                        <Button size="sm" onClick={() => handleUpdateStatus(order.id, 'accepted')}>
                          Accept Order
                        </Button>
                      )}
                      {isAccepted && (
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => handleUpdateStatus(order.id, 'completed')}
                        >
                          Mark Completed
                        </Button>
                      )}
                    </div>
                  </div>

                </CardContent>
              </Card>
            );
          })}
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
    </div>
  );
}
