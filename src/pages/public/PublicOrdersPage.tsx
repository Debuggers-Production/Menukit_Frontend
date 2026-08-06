import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ChevronLeft, ShoppingBag, Clock, ArrowRight, History, UtensilsCrossed, Gamepad2, MapPin, ArrowUpRight, Trophy, ChefHat, CheckCircle2, XCircle, CreditCard, AlertCircle, SlidersHorizontal, Bike, Home, Hotel, User } from 'lucide-react';
import { api } from '@/services/api';
import { Shop } from '@/types';
import { DiscountUnlockPopup } from '@/components/public/DiscountUnlockPopup';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCartStore } from '@/store/cartStore';
import toast from 'react-hot-toast';
import { useActiveOrders } from '@/hooks/useActiveOrders';
import { contestService } from '@/services/contestService';
import { motion } from 'framer-motion';
import { BottomSheet } from '@/components/ui/BottomSheet';

export function PublicOrdersPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { items: cartItems } = useCartStore();
  const cartItemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const { currentOrder, totalActiveCount } = useActiveOrders(id);
  
  const [shop, setShop] = useState<Shop | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showVerifyPopup, setShowVerifyPopup] = useState(false);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('customer_token'));
  const [statusFilter, setStatusFilter] = useState<'all' | 'cooking' | 'accepted' | 'completed' | 'cancelled'>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'all' | 'cash' | 'online'>('all');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'cancelled'>('pending');
  const [contestBtnTextIndex, setContestBtnTextIndex] = useState(0);
  const [globalParticipantsCount, setGlobalParticipantsCount] = useState<number | null>(null);

  const contestTexts = useMemo(() => [
    'Contest',
    globalParticipantsCount !== null ? `${globalParticipantsCount}+ Joined` : '1000+ Members',
    'Live Join Now'
  ], [globalParticipantsCount]);

  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // Apply live status filter
    if (statusFilter !== 'all') {
      result = result.filter(o => {
        if (statusFilter === 'cooking') return o.order_status === 'preparing' || o.order_status === 'cooking';
        return o.order_status === statusFilter;
      });
    }

    // Apply payment status filter
    if (paymentStatusFilter !== 'all') {
      result = result.filter(o => {
        if (paymentStatusFilter === 'paid') return o.payment_status === 'paid';
        return o.payment_status === 'pending';
      });
    }

    // Apply payment method filter
    if (paymentMethodFilter !== 'all') {
      result = result.filter(o => {
        if (paymentMethodFilter === 'cash') return o.payment_method === 'cash_on_delivery' || o.payment_method === 'cash';
        return o.payment_method === 'online' || o.payment_method === 'pay_online' || o.payment_method === 'upi' || o.payment_method === 'card';
      });
    }

    return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [orders, statusFilter, paymentStatusFilter, paymentMethodFilter]);

  useEffect(() => {
    if (!id) return;
    api.get(`/public/shop/${id}`)
      .then(res => setShop(res.data))
      .catch(err => console.error("Failed to load shop details", err));
  }, [id]);

  useEffect(() => {
    contestService.getGlobalParticipantsCount()
      .then(setGlobalParticipantsCount)
      .catch(console.error);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setContestBtnTextIndex((prev) => (prev + 1) % contestTexts.length);
    }, 2500);
    return () => clearInterval(timer);
  }, [contestTexts.length]);

  const fetchOrders = async (tokenStr: string) => {
    setIsLoading(true);
    try {
      const res = await api.get(`/public/shop/${id}/my-orders`, {
        params: { token: tokenStr }
      });
      setOrders(res.data);
    } catch (err) {
      console.error("Failed to fetch orders", err);
      toast.error("Failed to load order history.");
    } finally {
      setIsLoading(false);
    }
  };

  const [isScrollingDown, setIsScrollingDown] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setIsScrollingDown(true);
      } else if (currentScrollY < lastScrollY.current) {
        setIsScrollingDown(false);
      }
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (id && token) {
      fetchOrders(token);
    } else {
      setIsLoading(false);
    }
  }, [id, token]);

  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);

  const loadRazorpaySDK = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) { resolve(true); return; }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayNow = async (orderId: string) => {
    setPayingOrderId(orderId);
    try {
      const sdkLoaded = await loadRazorpaySDK();
      if (!sdkLoaded) {
        toast.error("Could not load payment gateway SDK. Please try again.");
        setPayingOrderId(null);
        return;
      }

      const res = await api.post(`/public/shop/${id}/orders/${orderId}/pay`);
      const payData = res.data;

      if (payData.mock_mode) {
        await api.post(`/public/shop/${id}/orders/${orderId}/verify`, {
          razorpay_order_id: payData.razorpay_order_id,
          razorpay_payment_id: `pay_mock_${Date.now()}`,
          razorpay_signature: 'mock_signature'
        });
        toast.success("Payment successful!");
        if (token) fetchOrders(token);
        return;
      }

      const baseTotal = payData.base_total || (payData.amount / 100).toFixed(2);
      const platFee = payData.platform_fee || 0;
      const pgFee = payData.pg_fee || 0;
      const gstFee = payData.gst_on_fee || 0;
      const grandTotal = payData.grand_total || (payData.amount / 100).toFixed(2);

      const rzpOptions = {
        key: payData.razorpay_key,
        amount: payData.amount,
        currency: payData.currency || 'INR',
        name: shop?.name || 'Restaurant Order',
        description: `Items: ₹${baseTotal} | Platform Fee: ₹${platFee} | PG Fee (3%): ₹${pgFee} | GST: ₹${gstFee} = ₹${grandTotal}`,
        order_id: payData.razorpay_order_id,
        notes: {
          "1_Items_Subtotal": `₹${baseTotal}`,
          "2_Platform_Fee_1%": `₹${platFee}`,
          "3_Payment_Gateway_Fee_3%": `₹${pgFee}`,
          "4_GST_on_Fee_18%": `₹${gstFee}`,
          "5_Grand_Total": `₹${grandTotal}`
        },
        handler: async (response: any) => {
          try {
            await api.post(`/public/shop/${id}/orders/${orderId}/verify`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            toast.success("Payment successful!");
            if (token) fetchOrders(token);
          } catch {
            toast.error("Payment verification failed. Please contact support.");
          }
        },
        theme: { color: '#f97316' },
      };

      const rzp = new (window as any).Razorpay(rzpOptions);
      rzp.open();
    } catch (err: any) {
      console.error("Failed to initiate payment", err);
      toast.error(err.response?.data?.detail || "Failed to initiate online payment. Please try again.");
    } finally {
      setPayingOrderId(null);
    }
  };

  const renderLiveStatusVisual = (order: any) => {
    const status = order.order_status;
    const isUnpaid = order.payment_status === 'pending';
    const type = order.order_type; // 'dine_in', 'takeaway', 'delivery'
    const isPendingAccept = status === 'pending';
    const isPreparing = status === 'preparing' || status === 'cooking' || status === 'accepted';
    const isCompleted = status === 'completed';
    const isCancelled = status === 'cancelled' || status === 'rejected';

    return (
      <div className="bg-slate-50/70 dark:bg-slate-950/40 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/80 mb-4 relative overflow-hidden">
        {/* Dynamic Animated Status Header */}
        <div className="flex items-center gap-3">
          {isPendingAccept && (
            <div className="relative flex items-center justify-center w-10 h-10 shrink-0">
              <div className="absolute inset-0 rounded-full bg-amber-500/20 animate-[radar-pulse_1.5s_infinite]" />
              <div className="relative w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-sm">
                <Hotel size={15} />
              </div>
            </div>
          )}

          {isPreparing && (
            <div className="relative flex items-center justify-center w-10 h-10 shrink-0">
              <div className="absolute inset-0 rounded-full bg-orange-500/20 animate-ping" style={{ animationDuration: '2.5s' }} />
              <div className="relative w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-sm animate-pulse">
                <ChefHat size={16} className="animate-bounce text-white" />
              </div>
            </div>
          )}

          {isCompleted && (
            <div className="relative flex items-center justify-center w-10 h-10 shrink-0">
              <div className="relative w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm">
                <CheckCircle2 size={16} className="text-white" />
              </div>
            </div>
          )}

          {isCancelled && (
            <div className="relative flex items-center justify-center w-10 h-10 shrink-0">
              <div className="relative w-8 h-8 rounded-full bg-slate-400 text-white flex items-center justify-center shadow-sm">
                <XCircle size={15} />
              </div>
            </div>
          )}

          {/* Text descriptions with step tracker */}
          <div className="flex-1 min-w-0">
            <h4 className="text-[11px] font-black text-slate-850 dark:text-slate-200 capitalize">
              {isPendingAccept && "Waiting for acceptance"}
              {status === 'accepted' && "Order Accepted"}
              {(status === 'preparing' || status === 'cooking') && "Preparing Your Meal"}
              {isCompleted && (type === 'delivery' ? "Meal Delivered Successfully" : type === 'takeaway' ? "Order Picked Up" : "Served Hot at Table")}
              {isCancelled && "Order Cancelled"}
            </h4>
            <p className="text-[9px] text-slate-400 font-bold tracking-wide uppercase truncate mt-0.5">
              {isPendingAccept && "Restaurant is reviewing details..."}
              {isPreparing && "Kitchen is cooking fresh ingredients..."}
              {isCompleted && "Thank you for dining with us!"}
              {isCancelled && "Order has been cancelled."}
            </p>
          </div>
        </div>

        {/* Interactive Visual Animations */}
        <div className="mt-3 pt-3 border-t border-dashed border-slate-200 dark:border-slate-850 flex justify-center items-center h-14 relative bg-white/70 dark:bg-slate-900/40 rounded-xl overflow-hidden">
          {isPendingAccept && (
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-450 dark:text-slate-400 border border-slate-200/40">
                  <ShoppingBag size={14} />
                </div>
                <span className="text-[8px] text-slate-450 font-bold mt-1 uppercase tracking-wide">Placed</span>
              </div>
              <div className="flex gap-1.5 animate-pulse">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '0s' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
              <div className="flex flex-col items-center animate-pulse">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 border border-amber-200/50">
                  <Hotel size={14} />
                </div>
                <span className="text-[8px] text-amber-600 font-black mt-1 uppercase tracking-wide">Pending</span>
              </div>
            </div>
          )}

          {isPreparing && (
            <div className="flex items-center gap-10">
              <div className="flex flex-col items-center opacity-50">
                <Hotel size={14} className="text-slate-400" />
                <span className="text-[8px] text-slate-400 font-bold mt-1 uppercase tracking-wide">Accepted</span>
              </div>
              <div className="w-16 h-[2px] bg-slate-200 dark:bg-slate-800 relative overflow-hidden rounded-full">
                <div className="absolute inset-0 bg-orange-500 animate-[fill-progress_2s_infinite]" />
              </div>
              <div className="flex flex-col items-center">
                <div className="relative">
                  <ChefHat size={16} className="text-orange-500 animate-bounce" />
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 bg-orange-500/20 blur-xs rounded-full" />
                </div>
                <span className="text-[8px] text-orange-600 font-black mt-1 uppercase tracking-wide">Cooking</span>
              </div>
            </div>
          )}

          {isCompleted && (
            <div className="w-full px-4 flex items-center justify-between">
              {type === 'delivery' ? (
                <div className="w-full flex items-center justify-between relative px-2">
                  <div className="absolute left-6 right-6 h-[1px] border-t border-dashed border-slate-200" />
                  <div className="flex flex-col items-center relative z-10 opacity-50">
                    <ChefHat size={14} className="text-slate-450" />
                    <span className="text-[7px] text-slate-400 font-bold mt-1">Kitchen</span>
                  </div>
                  {/* Rolling Delivery Bike */}
                  <div className="flex flex-col items-center relative z-20 animate-[bike-ride_4s_infinite_ease-in-out]">
                    <Bike size={16} className="text-orange-500 animate-bounce" />
                    <span className="text-[8px] text-orange-600 font-black mt-1">Delivering</span>
                  </div>
                  <div className="flex flex-col items-center relative z-10">
                    <MapPin size={15} className="text-emerald-500" />
                    <span className="text-[8px] text-emerald-600 font-black mt-1">Home</span>
                  </div>
                </div>
              ) : type === 'takeaway' ? (
                <div className="w-full flex items-center justify-between relative px-2">
                  <div className="absolute left-6 right-6 h-[1px] border-t border-dashed border-slate-200" />
                  <div className="flex flex-col items-center relative z-10 opacity-50">
                    <ChefHat size={14} className="text-slate-455" />
                    <span className="text-[7px] text-slate-400 font-bold mt-1">Kitchen</span>
                  </div>
                  {/* Walking Takeaway Person */}
                  <div className="flex flex-col items-center relative z-20 animate-[bike-ride_3.5s_infinite_ease-in-out]">
                    <ShoppingBag size={15} className="text-blue-500 animate-[walk-sway_1s_infinite_alternate]" />
                    <span className="text-[8px] text-blue-600 font-black mt-1">Takeaway</span>
                  </div>
                  <div className="flex flex-col items-center relative z-10">
                    <Home size={15} className="text-emerald-500" />
                    <span className="text-[8px] text-emerald-600 font-black mt-1">Home</span>
                  </div>
                </div>
              ) : (
                // Dine In waiter tray serving table
                <div className="w-full flex items-center justify-center gap-3">
                  <div className="relative">
                    <UtensilsCrossed size={16} className="text-emerald-500 animate-pulse" />
                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full flex items-center justify-center text-white text-[6px]">✓</div>
                  </div>
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">Served at Table #{order.table_number || 'N/A'}</span>
                </div>
              )}
            </div>
          )}

          {isCancelled && (
            <div className="flex items-center gap-2 text-slate-400">
              <XCircle size={15} />
              <span className="text-[8px] font-black uppercase tracking-wider">Cancelled / Refunded</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const handleVerifySuccess = () => {
    setShowVerifyPopup(false);
    const newToken = localStorage.getItem('customer_token');
    if (newToken) {
      setToken(newToken);
    }
  };

  const primaryColor = shop?.theme?.primary_color || '#ea580c';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'accepted': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'completed': return 'bg-green-50 text-green-600 border-green-100';
      case 'rejected': return 'bg-red-50 text-red-600 border-red-100';
      case 'cancelled': return 'bg-slate-50 text-slate-500 border-slate-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans antialiased text-slate-800">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(`/shop/${id}`)}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600 cursor-pointer"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="font-extrabold text-slate-800 text-lg leading-tight">Your Orders</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{shop?.name}</p>
          </div>
        </div>

        <button
          onClick={() => {
            const profileAppUrl = import.meta.env.VITE_CUSTOMER_PROFILE_URL || 'http://localhost:5176';
            window.location.href = `${profileAppUrl}/shop/${id}/profile`;
          }}
          className="p-2.5 bg-orange-50 text-orange-600 hover:bg-orange-100 rounded-full transition-all cursor-pointer flex items-center justify-center border border-orange-200/60"
          title="Customer Profile & Wallet"
        >
          <User size={18} />
        </button>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        {!token ? (
          <div className="bg-white rounded-2xl p-6 text-center border border-slate-100 shadow-sm">
            <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <History className="w-8 h-8 text-orange-500" />
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-2">View Your Past Orders</h2>
            <p className="text-sm text-slate-500 mb-6">
              Verify your mobile number to view and track your orders instantly.
            </p>
            <button
              onClick={() => setShowVerifyPopup(true)}
              className="w-full py-3 text-white font-bold rounded-xl shadow-lg hover:brightness-110 transition-all active:scale-[0.98]"
              style={{ backgroundColor: primaryColor }}
            >
              Verify Mobile Number
            </button>
          </div>
        ) : isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-28 rounded-2xl w-full" />
            <Skeleton className="h-28 rounded-2xl w-full" />
            <Skeleton className="h-28 rounded-2xl w-full" />
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center border border-slate-100 shadow-sm">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-8 h-8 text-slate-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-1">No Orders Found</h2>
            <p className="text-sm text-slate-500 mb-5">
              You haven't placed any orders from this shop yet.
            </p>
            <button
              onClick={() => navigate(`/shop/${id}`)}
              className="w-full py-3 text-white font-bold rounded-xl transition-all"
              style={{ backgroundColor: primaryColor }}
            >
              Browse Menu
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center border border-slate-100 dark:border-slate-800 shadow-sm"
              >
                <p className="text-sm text-slate-500 dark:text-slate-400 capitalize">No orders match the selected filters.</p>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order, idx) => {
                  const isUnpaid = order.payment_status === 'pending';
                  const isPendingAccept = order.order_status === 'pending';
                  const isPreparing = order.order_status === 'preparing' || order.order_status === 'cooking' || order.order_status === 'accepted';
                  const isCompleted = order.order_status === 'completed';
                  const isCancelled = order.order_status === 'cancelled' || order.order_status === 'rejected';

                  // Dynamic card border/bg styling based on live states
                  let cardClass = "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/80";
                  let topBar = null;

                  if (isUnpaid) {
                    cardClass = "bg-white dark:bg-slate-900 border-amber-300 dark:border-amber-900 shadow-amber-500/5";
                    topBar = <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600 animate-pulse" />;
                  } else if (isPendingAccept) {
                    cardClass = "bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-900/60 animate-pulse-subtle";
                    topBar = <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />;
                  } else if (isPreparing) {
                    cardClass = "bg-white dark:bg-slate-900 border-orange-200 dark:border-orange-900/60 shadow-orange-500/5";
                    topBar = <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 to-amber-500" />;
                  } else if (isCompleted) {
                    cardClass = "bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-250 dark:border-emerald-900/40";
                    topBar = <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />;
                  } else if (isCancelled) {
                    cardClass = "bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-850 opacity-75";
                  }

                  return (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, y: 30, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      whileHover={{ y: -6, scale: 1.015, transition: { duration: 0.2 } }}
                      whileTap={{ scale: 0.995 }}
                      transition={{ delay: idx * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
                      key={order.id}
                      className={`border rounded-[24px] p-5 shadow-sm relative overflow-hidden group cursor-pointer ${cardClass}`}
                      onClick={() => navigate(`/shop/${id}/order/${order.id}`)}
                    >
                      {topBar}

                      {/* Header row */}
                      <div className="flex justify-between items-start mb-3.5">
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">ORDER REFERENCE</p>
                          <p className="font-extrabold text-sm text-slate-855 dark:text-slate-200 mt-1.5 font-mono">#{order.id.slice(0, 8).toUpperCase()}</p>
                        </div>

                        <div className="flex flex-col items-end gap-1.5">
                          {/* Live Status Badge */}
                          <div className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider ${
                            isPendingAccept ? 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30' :
                            isPreparing ? 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/30' :
                            isCompleted ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30' :
                            'bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-950/20 dark:text-slate-400 dark:border-slate-800'
                          }`}>
                            {isPendingAccept ? (
                              <Clock size={10} className="animate-pulse text-blue-500" />
                            ) : isPreparing ? (
                              <ChefHat size={10} className="animate-bounce text-orange-500" />
                            ) : isCompleted ? (
                              <CheckCircle2 size={10} className="text-emerald-500" />
                            ) : (
                              <XCircle size={10} className="text-slate-400" />
                            )}
                            <span>
                              {isPendingAccept ? 'Waiting to Accept' : order.order_status}
                            </span>
                          </div>

                          {/* Payment status badge */}
                          <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            isUnpaid ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400'
                          }`}>
                            {isUnpaid ? 'Unpaid' : 'Paid'}
                          </span>
                        </div>
                      </div>

                      {/* Warning notice for pending payment - only when order is NOT cancelled AND online payments enabled */}
                      {isUnpaid && !isCancelled && shop?.settings?.online_payments_enabled !== false && (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 text-[10px] text-amber-800 dark:text-amber-300 font-bold mb-3.5 flex items-center gap-1.5">
                          <AlertCircle size={12} className="text-amber-600 dark:text-amber-400 animate-pulse" />
                          <span>Payment is pending. Pay now to confirm your order details.</span>
                        </div>
                      )}

                      {/* Live Process Animation Step Tracker */}
                      {renderLiveStatusVisual(order)}

                      <div className="border-t border-dashed border-slate-150 dark:border-slate-800/80 pt-3.5 flex justify-between items-center text-xs text-slate-500 mb-3.5">
                        <div className="flex items-center gap-1.5 font-mono text-[10px]">
                          <Clock size={13} className="text-slate-400" />
                          <span>{new Date(order.created_at).toLocaleDateString()}</span>
                        </div>
                        <span className="font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-300 text-[9px]">{order.order_type.replace('_', ' ')}</span>
                      </div>

                      {/* Items Summary list with mini monospaced details */}
                      <div className="bg-slate-50 dark:bg-slate-950/60 rounded-xl p-3 text-[11px] text-slate-650 dark:text-slate-400 space-y-1.5 mb-4 border border-slate-100/50 dark:border-slate-850">
                        {order.items.map((it: any) => (
                          <div key={it.id} className="flex justify-between items-center font-mono">
                            <span className="font-semibold text-slate-700 dark:text-slate-350">
                              {it.name} <span className="text-[10px] text-slate-450 font-bold px-1 bg-slate-200/50 dark:bg-slate-800 rounded">x{it.quantity}</span>
                            </span>
                            <span className="font-bold text-slate-900 dark:text-white">{shop?.settings?.currency || '₹'}{(Number(it.price) * it.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>

                      {/* Dotted invoice perforation separator */}
                      <div className="border-b border-dashed border-slate-200 dark:border-slate-800 my-4" />

                      <div className="flex justify-between items-center pt-1">
                        <div>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none block">Total Bill</span>
                          <span className="font-black text-lg text-slate-850 dark:text-white mt-1.5 block">{shop?.settings?.currency || '₹'}{Number(order.total_amount).toFixed(2)}</span>
                        </div>
                        <div className="flex gap-2">
                          {/* Pay Now only when unpaid AND order is delivery AND order is not cancelled AND online payments enabled */}
                          {isUnpaid && !isCancelled && order.order_type === 'delivery' && shop?.settings?.online_payments_enabled !== false && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePayNow(order.id);
                              }}
                              disabled={payingOrderId === order.id}
                              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-white text-[10px] font-black uppercase tracking-wider shadow-sm bg-gradient-to-r from-orange-500 to-amber-500 hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                            >
                              {payingOrderId === order.id ? (
                                <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                              ) : (
                                <>
                                  <CreditCard size={12} />
                                  <span>Pay Now</span>
                                </>
                              )}
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/shop/${id}/order/${order.id}`);
                            }}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-[11px] font-black uppercase tracking-wider shadow-sm hover:brightness-110 active:scale-95 transition-all cursor-pointer group"
                            style={{ backgroundColor: primaryColor }}
                          >
                            <span>Track</span>
                            <ArrowRight size={13} className="group-hover:translate-x-1.5 transition-transform" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 🏷️ Zomato District Style Side Tab (Clings to right wall) */}
      <div 
        className="fixed right-0 bottom-24 z-50 transition-transform duration-300 ease-in-out"
        style={{ transform: isScrollingDown ? 'translateX(100%)' : 'translateX(0)' }}
      >
        <button
          onClick={() => navigate('/discover')}
          className="flex items-center justify-center gap-1.5 pl-4 pr-3 h-[42px] rounded-l-full font-black text-white shadow-[0_4px_16px_rgba(0,0,0,0.15)] border-l border-y border-white/20 active:scale-95 group transition-transform hover:brightness-110"
          style={{ backgroundColor: primaryColor }}
        >
          <span className="tracking-wide text-xs">Discover</span>
          <ArrowUpRight size={14} strokeWidth={3} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      </div>

      {/* 🧱 Premium Floating Bottom Asymmetric Sized Navigation Dock Frame */}
      <div 
        className="fixed bottom-4 left-4 right-4 sm:bottom-6 sm:left-1/2 sm:-translate-x-1/2 sm:w-[480px] z-40 transition-transform duration-300 ease-in-out"
        style={{ transform: isScrollingDown ? 'translateY(120px)' : 'translateY(0)' }}
      >
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-[32px] shadow-[0_12px_45px_rgba(0,0,0,0.15)] border border-slate-100 dark:border-slate-800 p-2">
          {/* Configured grid cols structure layout mapping to give dynamic wider room weight */}
          <div className="grid grid-cols-6 gap-1 items-center text-center">

            {/* Menu Button */}
            <button onClick={() => navigate(`/shop/${id}`)} className="col-span-1 flex flex-col items-center justify-center gap-1">
              <UtensilsCrossed size={19} className="text-slate-400 group-hover:text-slate-650" />
              <span className="text-[10px] font-bold text-slate-400">Menu</span>
            </button>

            {/* Cart Button */}
            <button onClick={() => navigate(`/shop/${id}/cart`)} className="col-span-1 flex flex-col items-center justify-center gap-1 relative">
              <ShoppingBag size={19} className="text-slate-400" />
              {cartItemCount > 0 && (
                <span className="absolute top-0 right-2 bg-red-500 text-white text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
              <span className="text-[10px] font-bold text-slate-400">Cart</span>
            </button>

            {/* Games Button */}
            <button onClick={() => navigate(`/shop/${id}?games=true`)} className="col-span-1 flex flex-col items-center justify-center gap-1">
              <Gamepad2 size={19} className="text-slate-400" />
              <span className="text-[10px] font-bold text-slate-400">Games</span>
            </button>

            {/* Orders Button */}
            <div className="col-span-1 flex flex-col items-center justify-center gap-1 relative">
              <div className="relative">
                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="flex items-center justify-center"
                >
                  <History size={19} style={{ color: primaryColor }} />
                </button>
                {totalActiveCount > 0 && currentOrder && (
                  <button
                    key={currentOrder.id}
                    onClick={() => navigate(`/shop/${id}/order/${currentOrder.id}`)}
                    className={`absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-md flex items-center gap-1 border border-white dark:border-slate-900 transition-all duration-300 cursor-pointer hover:brightness-110 active:scale-95 ${
                      currentOrder.order_status === 'pending'
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 animate-pulse'
                        : 'bg-gradient-to-r from-blue-500 to-indigo-600 animate-bounce'
                    }`}
                  >
                    <span>#{currentOrder.id.slice(0, 4).toUpperCase()}</span>
                    {currentOrder.order_status === 'pending' ? <Clock size={10} className="animate-spin text-white" /> : <ChefHat size={10} className="text-white" />}
                    <span>{currentOrder.order_status === 'pending' ? 'Waiting' : 'Preparing'}</span>
                  </button>
                )}
              </div>
              <span className="text-[10px] font-bold" style={{ color: primaryColor }}>Orders</span>
            </div>

            {/* 🏆 Asymmetric Extra-Wide Contest Button */}
            <button
              onClick={() => navigate(`/shop/${id}/contest`)}
              className="col-span-2 relative flex items-center justify-center gap-1.5 h-[46px] text-white font-black shadow-md transition-all active:scale-[0.97] hover:brightness-110 tracking-wider px-3 rounded-r-2xl rounded-l-none overflow-hidden" 
              style={{ 
                background: `linear-gradient(135deg, ${primaryColor} 0%, #ff8c00 100%)`,
                boxShadow: `0 4px 12px 0 ${primaryColor}30`
              }}
            >
              <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-r-2xl">
                <div className="absolute left-1/2 top-1/2 w-2.5 h-1.5 bg-yellow-400 rounded-sm animate-[particle-pop_1.8s_infinite_ease-out]" style={{ '--tx': '45px', '--ty': '-12px', '--rot': '120deg' } as any} />
                <div className="absolute left-1/2 top-1/2 w-1.5 h-3.5 bg-rose-400 rounded-sm animate-[particle-pop_1.8s_infinite_ease-out_0.2s]" style={{ '--tx': '-40px', '--ty': '10px', '--rot': '180deg' } as any} />
                <div className="absolute left-1/2 top-1/2 w-3 h-1.5 bg-cyan-400 rounded-sm animate-[particle-pop_1.8s_infinite_ease-out_0.4s]" style={{ '--tx': '30px', '--ty': '15px', '--rot': '90deg' } as any} />
                <div className="absolute left-1/2 top-1/2 w-2 h-2 bg-emerald-400 rounded-full animate-[particle-pop_1.8s_infinite_ease-out_0.6s]" style={{ '--tx': '-25px', '--ty': '-16px', '--rot': '45deg' } as any} />
                <div className="absolute left-1/2 top-1/2 w-1.5 h-3 bg-purple-400 animate-[particle-pop_1.8s_infinite_ease-out_0.8s]" style={{ '--tx': '55px', '--ty': '4deg', '--rot': '270deg' } as any} />
                <div className="absolute left-1/2 top-1/2 w-2.5 h-2.5 bg-amber-400 rounded-xs animate-[particle-pop_1.8s_infinite_ease-out_1.0s]" style={{ '--tx': '-55px', '--ty': '-6px', '--rot': '135deg' } as any} />
              </div>

              <Trophy size={15} className="text-white fill-white/10 shrink-0 relative z-10" />
              <span 
                key={contestBtnTextIndex} 
                className="text-[10px] uppercase tracking-widest text-white relative z-10 animate-[btn-text-swap_0.4s_ease-out] block"
              >
                {contestTexts[contestBtnTextIndex]}
              </span>
            </button>

          </div>
        </div>
      </div>

      <style>{`
        @keyframes btn-text-swap {
          0% { transform: translateY(8px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes particle-pop {
          0% { transform: translate(-50%, -50%) translate(0, 0) scale(1) rotate(0deg); opacity: 0; }
          10% { opacity: 0.9; }
          90% { opacity: 0.9; }
          100% { transform: translate(-50%, -50%) translate(var(--tx), var(--ty)) scale(0) rotate(var(--rot)); opacity: 0; }
        }
        @keyframes pulse-subtle {
          0%, 100% { transform: scale(1); border-color: rgba(59, 130, 246, 0.4); }
          50% { transform: scale(1.003); border-color: rgba(59, 130, 246, 0.7); }
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 3s infinite ease-in-out;
        }
        @keyframes radar-pulse {
          0% { transform: scale(0.95); opacity: 1; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes fill-progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes bike-ride {
          0%, 100% { transform: translateX(-25px); }
          50% { transform: translateX(25px); }
        }
        @keyframes walk-sway {
          0% { transform: rotate(-10deg) translateY(0px); }
          100% { transform: rotate(10deg) translateY(-2px); }
        }
      `}</style>

      {/* Floating Filter FAB */}
      {token && (
        <div 
          className="fixed right-4 bottom-38 z-40 print:hidden transition-transform duration-300 ease-in-out"
          style={{ transform: isScrollingDown ? 'translateX(100px)' : 'translateX(0)' }}
        >
          <button
            onClick={() => setIsFilterSheetOpen(true)}
            className="w-12 h-12 rounded-full text-white shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center cursor-pointer relative"
            style={{ backgroundColor: primaryColor }}
          >
            <SlidersHorizontal size={20} />
            {(statusFilter !== 'all' || paymentStatusFilter !== 'all' || paymentMethodFilter !== 'all') && (
              <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-red-500 rounded-full text-[9px] font-black flex items-center justify-center text-white ring-2 ring-white">
                {Number(statusFilter !== 'all') + Number(paymentStatusFilter !== 'all') + Number(paymentMethodFilter !== 'all')}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Filter Bottom Sheet Panel */}
      <BottomSheet
        isOpen={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        title="Filter Orders"
      >
        <div className="p-5 space-y-5">
          {/* Status Filter Row */}
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2.5">Live Status</span>
            <div className="flex flex-wrap gap-2">
              {([
                { key: 'all', label: 'All Status' },
                { key: 'cooking', label: 'Cooking/Preparing' },
                { key: 'accepted', label: 'Accepted' },
                { key: 'completed', label: 'Completed' },
                { key: 'cancelled', label: 'Cancelled' }
              ] as const).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setStatusFilter(opt.key)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-extrabold transition-all cursor-pointer border ${
                    statusFilter === opt.key
                      ? 'text-white border-transparent'
                      : 'text-slate-650 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                  }`}
                  style={statusFilter === opt.key ? { backgroundColor: primaryColor } : {}}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Status Filter Row */}
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2.5">Payment Status</span>
            <div className="flex flex-wrap gap-2">
              {([
                { key: 'all', label: 'All' },
                { key: 'paid', label: 'Paid' },
                { key: 'unpaid', label: 'Not Paid' }
              ] as const).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setPaymentStatusFilter(opt.key)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-extrabold transition-all cursor-pointer border ${
                    paymentStatusFilter === opt.key
                      ? 'text-white border-transparent'
                      : 'text-slate-650 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                  }`}
                  style={paymentStatusFilter === opt.key ? { backgroundColor: primaryColor } : {}}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Method Filter Row */}
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2.5">Payment Method</span>
            <div className="flex flex-wrap gap-2">
              {([
                { key: 'all', label: 'All' },
                { key: 'cash', label: 'Cash on Pay' },
                { key: 'online', label: 'Pay Online' }
              ] as const).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setPaymentMethodFilter(opt.key)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-extrabold transition-all cursor-pointer border ${
                    paymentMethodFilter === opt.key
                      ? 'text-white border-transparent'
                      : 'text-slate-650 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                  }`}
                  style={paymentMethodFilter === opt.key ? { backgroundColor: primaryColor } : {}}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <button
              onClick={() => {
                setStatusFilter('all');
                setPaymentStatusFilter('all');
                setPaymentMethodFilter('all');
              }}
              className="flex-1 py-3 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-500 hover:text-slate-850 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
            <button
              onClick={() => setIsFilterSheetOpen(false)}
              className="flex-1 py-3 text-white rounded-2xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-md"
              style={{ backgroundColor: primaryColor }}
            >
              Apply Filters
            </button>
          </div>
        </div>
      </BottomSheet>

      {showVerifyPopup && shop && (
        <DiscountUnlockPopup 
          shopId={shop.id}
          onClose={() => setShowVerifyPopup(false)}
          onUnlock={handleVerifySuccess}
        />
      )}
    </div>
  );
}
