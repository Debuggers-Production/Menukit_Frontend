import { useState, useMemo, useEffect, useCallback } from 'react';
import { useHeaderStore } from '@/store/useHeaderStore';
import { Check, ShoppingCart, Sparkles, Zap, PackageOpen, Award, Layers, ShieldCheck, ArrowRight, HelpCircle, CheckCircle2, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { api } from '@/services/api';

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

interface Feature {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
}

const ADDONS: Feature[] = [
  {
    id: 'online-orders',
    name: 'Online Visibility & Orders Accept',
    price: 129,
    description: 'Accept online delivery & takeaway orders directly with live online menu visibility.',
    category: 'Online Ordering',
  },
  {
    id: 'member-count',
    name: 'New Member Count',
    price: 99,
    description: 'Track how many new members/customers join every month seamlessly.',
    category: 'Relationship Marketing',
  },
  {
    id: 'member-details',
    name: 'New Member + Details',
    price: 129,
    description: 'Store and manage deep customer information along with member growth metrics.',
    category: 'Relationship Marketing',
  },
  {
    id: 'search-data',
    name: 'Customer Search Data',
    price: 69,
    description: 'Access search analytics and real-time customer interest insights.',
    category: 'Marketing',
  },
  {
    id: 'custom-theme',
    name: 'Custom Theme Studio',
    price: 69,
    description: 'Customize colors, logos, and custom branding of your digital menu.',
    category: 'Branding',
  },
  {
    id: 'analytics-advanced-filters',
    name: 'Advanced Analytics Filters',
    price: 59,
    description: 'Unlock 7-day, 30-day, and Custom Date range filters for your dashboard.',
    category: 'Analytics',
  },
  {
    id: 'analytics-customer-insights',
    name: 'Customer Insights Report',
    price: 59,
    description: 'Access detailed reports on customer views and repeat visits.',
    category: 'Analytics',
  },
];

const ALL_ACCESS_PRICE = 399;

export function SubscriptionMarketplacePage() {
  const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(new Set());
  const [isAllAccess, setIsAllAccess] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSubscription, setActiveSubscription] = useState<any>(null);
  const [showSubscribedDetails, setShowSubscribedDetails] = useState(false);

  const subscribedAddons = useMemo(() => {
    if (!activeSubscription) return [];
    if (activeSubscription.is_all_access) return ADDONS;
    if (Array.isArray(activeSubscription.active_modules)) {
      return ADDONS.filter(addon => activeSubscription.active_modules.includes(addon.id));
    }
    return [];
  }, [activeSubscription]);

  const [mockGatewayOrder, setMockGatewayOrder] = useState<{
    order_id: string;
    amount: number;
    currency: string;
  } | null>(null);

  const setHeaderTitle = useHeaderStore((state) => state.setTitle);

  const fetchCurrentSubscription = useCallback(async () => {
    try {
      const res = await api.get('/subscription/current');
      setActiveSubscription(res.data);
    } catch (err) {
      console.error('Failed to load current subscription:', err);
    }
  }, []);

  useEffect(() => {
    setHeaderTitle('Subscriptions');
    fetchCurrentSubscription();
  }, [setHeaderTitle, fetchCurrentSubscription]);

  const toggleFeature = (id: string) => {
    if (isAllAccess) setIsAllAccess(false);

    setSelectedFeatures((prev) => {
      const newSet = new Set(prev);
      
      if (id === 'member-details') {
        if (!newSet.has('member-details')) {
          newSet.add('member-details');
          newSet.delete('member-count');
        } else {
          newSet.delete('member-details');
        }
      } else if (id === 'member-count') {
        if (!newSet.has('member-count')) {
          newSet.add('member-count');
          newSet.delete('member-details');
        } else {
          newSet.delete('member-count');
        }
      } else {
        if (newSet.has(id)) {
          newSet.delete(id);
        } else {
          newSet.add(id);
        }
      }

      return newSet;
    });
  };

  const handlePlanTypeChange = (type: 'custom' | 'all-access') => {
    if (type === 'all-access') {
      setIsAllAccess(true);
      setSelectedFeatures(new Set());
    } else {
      setIsAllAccess(false);
    }
  };

  const { baseTotal, pgFee, gstFee, grandTotal, activeItems } = useMemo(() => {
    let base = 0;
    const items: Feature[] = [];

    const isYearly = billingCycle === 'yearly';
    const multiplier = isYearly ? 10 : 1;

    if (isAllAccess) {
      base = ALL_ACCESS_PRICE * multiplier;
    } else {
      selectedFeatures.forEach((id) => {
        const feature = ADDONS.find(a => a.id === id);
        if (feature) {
          const itemPrice = feature.price * multiplier;
          base += itemPrice;
          items.push({ ...feature, price: itemPrice });
        }
      });
    }

    const fee = Math.round((base * 0.03) * 100) / 100;
    const gst = Math.round((fee * 0.18) * 100) / 100;
    const total = Math.round((base + fee + gst) * 100) / 100;

    return {
      baseTotal: base,
      pgFee: fee,
      gstFee: gst,
      grandTotal: total,
      activeItems: items
    };
  }, [selectedFeatures, isAllAccess, billingCycle]);

  const handleMockPaymentSuccess = async () => {
    if (!mockGatewayOrder) return;
    setIsSubmitting(true);
    try {
      await api.post('/subscription/verify', {
        razorpay_order_id: mockGatewayOrder.order_id,
        razorpay_payment_id: "pay_mock_" + Date.now(),
        razorpay_signature: "sig_mock_verified",
      });
      confetti({ particleCount: 120, spread: 90, origin: { y: 0.5 } });
      toast.success("Payment successful! Subscription activated.");
      setMockGatewayOrder(null);
      fetchCurrentSubscription();
    } catch (error) {
      toast.error("Payment verification failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMockPaymentCancel = () => {
    toast.error("Payment cancelled.");
    setMockGatewayOrder(null);
  };

  const handleCheckout = async () => {
    if (baseTotal === 0) {
      toast.error("Please select at least one module or pack.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create Razorpay order on backend
      const res = await api.post('/subscription/create-order', {
        is_all_access: isAllAccess,
        selected_modules: Array.from(selectedFeatures),
        billing_cycle: billingCycle,
      });
      
      const orderData = res.data;

      // 2. Mock Gateway Mode handling
      if (orderData.mock_mode) {
        setMockGatewayOrder({
          order_id: orderData.order_id,
          amount: orderData.amount,
          currency: orderData.currency || 'INR',
        });
        setIsSubmitting(false);
        return;
      }

      // 3. Real Razorpay Mode
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        toast.error("Razorpay SDK failed to load. Are you online?");
        setIsSubmitting(false);
        return;
      }

      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Menukit",
        description: `Subscription: ${isAllAccess ? 'All-Access Pack' : 'Custom Modules'}`,
        order_id: orderData.order_id,
        handler: async function (response: any) {
          try {
            await api.post('/subscription/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            confetti({ particleCount: 120, spread: 90, origin: { y: 0.5 } });
            toast.success("Payment successful! Subscription activated.");
            fetchCurrentSubscription();
          } catch (error) {
            toast.error("Payment verification failed. Please contact support.");
          }
        },
        theme: { color: "#f97316" }
      };

      const paymentObject = new (window as any).Razorpay(options);
      
      paymentObject.on('payment.failed', function (_response: any) {
        toast.error("Payment failed. Please try again.");
      });
      
      paymentObject.open();

    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to initiate Razorpay checkout. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 antialiased selection:bg-orange-500 selection:text-white pb-48 lg:pb-36">
      
      {/* Background Decorative Ambient Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] pointer-events-none overflow-hidden z-0 opacity-40 dark:opacity-70">
        <div className="absolute -top-40 left-10 w-72 h-72 bg-primary/30 rounded-full blur-[120px]" />
        <div className="absolute -top-20 right-10 w-80 h-80 bg-orange-500/20 rounded-full blur-[100px]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 pt-8 sm:px-6 lg:px-8 z-10">
        
        {/* Active Subscription Status Banner */}
        {activeSubscription && (
          <div className={cn(
            "mb-6 rounded-2xl p-5 border shadow-md transition-all relative overflow-hidden",
            activeSubscription.is_expired
              ? "bg-gradient-to-r from-red-500/10 via-rose-500/10 to-red-500/15 border-red-500/30"
              : activeSubscription.is_grace_period
              ? "bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/15 border-amber-500/30"
              : activeSubscription.is_trial
              ? "bg-gradient-to-r from-indigo-500/15 via-blue-500/10 to-purple-500/15 border-indigo-500/30"
              : "bg-gradient-to-r from-emerald-500/15 via-emerald-600/10 to-teal-500/15 border-emerald-500/30"
          )}>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className={cn(
                  "w-12 h-12 rounded-2xl text-white flex items-center justify-center shrink-0 shadow-md font-black text-lg",
                  activeSubscription.is_expired ? "bg-red-500" : activeSubscription.is_grace_period ? "bg-amber-500" : activeSubscription.is_trial ? "bg-indigo-600" : "bg-emerald-500"
                )}>
                  {activeSubscription.is_expired ? '🚨' : activeSubscription.is_grace_period ? '⚠️' : activeSubscription.is_trial ? '✨' : '🟢'}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white tracking-tight">
                      {activeSubscription.is_trial ? '1-Month Free Trial' : activeSubscription.is_all_access ? 'All-Access Pack' : 'Custom Modular Plan'}
                    </h3>
                    <span className={cn(
                      "text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs",
                      activeSubscription.is_expired ? "bg-red-500 text-white" : activeSubscription.is_grace_period ? "bg-amber-500 text-white" : activeSubscription.is_trial ? "bg-indigo-600 text-white" : "bg-emerald-500 text-white"
                    )}>
                      {activeSubscription.is_expired ? 'Expired' : activeSubscription.is_grace_period ? 'Grace Period' : activeSubscription.is_trial ? 'Free Trial' : 'Active'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {activeSubscription.is_expired
                      ? 'Subscription has ended. Renew now to unlock features.'
                      : activeSubscription.is_grace_period
                      ? `Grace Period Active: ${activeSubscription.grace_days_left} day${activeSubscription.grace_days_left !== 1 ? 's' : ''} left`
                      : `Expires on ${activeSubscription.current_period_end ? new Date(activeSubscription.current_period_end).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Active'}`
                    }
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-start md:items-end gap-1 shrink-0 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-slate-200/50 dark:border-slate-800">
                {!activeSubscription.is_expired && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                    <Clock size={14} className="text-primary" />
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                      {activeSubscription.days_left !== undefined ? `${activeSubscription.days_left} Days Remaining` : 'Active'}
                    </span>
                  </div>
                )}
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                  {activeSubscription.is_all_access ? '✨ All 8 Modules Unlocked' : `${activeSubscription.active_modules?.length || 0} Modules Active`}
                </span>
              </div>
            </div>

            {/* Sequential Extension Notice & Interactive Toggle */}
            <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-[11px] text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1 font-medium">
                <Sparkles size={12} className="text-orange-500 shrink-0" />
                <strong>Sequential Extension:</strong> New purchases will automatically stack and extend your plan smoothly.
              </span>

              {subscribedAddons.length > 0 && (
                <button
                  onClick={() => setShowSubscribedDetails(!showSubscribedDetails)}
                  className="flex items-center gap-1 px-3 py-1 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-xs font-extrabold text-primary hover:text-primary-600 transition-all cursor-pointer shadow-xs shrink-0"
                >
                  <span>{showSubscribedDetails ? 'Hide Subscribed Modules' : `View ${subscribedAddons.length} Subscribed Modules`}</span>
                  {showSubscribedDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              )}
            </div>

            {/* Subscribed Active Modules Breakdown Grid */}
            {showSubscribedDetails && subscribedAddons.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-200/80 dark:border-slate-800/80 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    Active Subscribed Add-On Modules ({subscribedAddons.length})
                  </h4>
                  <span className="text-[10px] font-semibold text-slate-400">
                    Individual Module Validity
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {subscribedAddons.map((addon) => {
                    const modExp = activeSubscription?.module_expirations?.[addon.id];
                    const modDaysLeft = modExp?.days_left !== undefined ? modExp.days_left : activeSubscription.days_left;
                    const modExpiresAt = modExp?.expires_at
                      ? new Date(modExp.expires_at)
                      : (activeSubscription.current_period_end ? new Date(activeSubscription.current_period_end) : null);

                    return (
                      <div
                        key={addon.id}
                        className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-start justify-between gap-3 hover:border-emerald-300 dark:hover:border-emerald-800 transition-all"
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400">
                              {addon.category}
                            </span>
                            <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> Subscribed
                            </span>
                          </div>
                          <h5 className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                            {addon.name}
                          </h5>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                            {addon.description}
                          </p>
                        </div>

                        <div className="text-right shrink-0 space-y-1">
                          <div className="flex items-center gap-1 text-[11px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 px-2.5 py-1 rounded-lg">
                            <Clock size={11} />
                            <span>
                              {modDaysLeft !== undefined
                                ? `${modDaysLeft} Days Left`
                                : 'Active'}
                            </span>
                          </div>
                          <p className="text-[10px] font-semibold text-slate-400">
                            {modExpiresAt
                              ? `Expires ${modExpiresAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`
                              : 'Active'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Luxury Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 dark:bg-orange-950/40 border border-orange-100/80 dark:border-orange-900/40 text-primary dark:text-primary text-[11px] font-bold uppercase tracking-wider mb-3">
            <Sparkles size={12} className="animate-pulse" /> Add-On Marketplace
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white mb-3">
            Build Your <span className="bg-gradient-to-r from-primary via-orange-500 to-orange-500 bg-clip-text text-transparent">Custom Plan</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto text-sm sm:text-base px-2">
            Start with our powerful core system for free. Scale your dynamic business with precision modular updates.
          </p>
        </div>

        {/* Monthly vs Yearly Billing Cycle Switch */}
        <div className="flex items-center justify-center gap-3 mb-6 sm:mb-8">
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            className={cn(
              "text-xs sm:text-sm font-extrabold transition-colors cursor-pointer px-3 py-1.5 rounded-xl",
              billingCycle === 'monthly'
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            )}
          >
            Monthly Billing
          </button>

          <button
            type="button"
            onClick={() => setBillingCycle(prev => prev === 'monthly' ? 'yearly' : 'monthly')}
            className={cn(
              "w-14 h-8 rounded-full p-1 transition-colors duration-300 relative border flex items-center cursor-pointer shadow-inner shrink-0",
              billingCycle === 'yearly' 
                ? "bg-gradient-to-r from-orange-500 to-amber-500 border-orange-400" 
                : "bg-slate-300 dark:bg-slate-700 border-slate-400/30"
            )}
            title="Toggle Monthly / Yearly billing"
          >
            <div className={cn(
              "w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-300 flex items-center justify-center font-black text-[9px]",
              billingCycle === 'yearly' ? "translate-x-6 text-orange-600" : "translate-x-0 text-slate-600"
            )}>
              {billingCycle === 'yearly' ? '1Y' : '1M'}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setBillingCycle('yearly')}
            className={cn(
              "flex items-center gap-2 text-xs sm:text-sm font-extrabold transition-colors cursor-pointer px-3 py-1.5 rounded-xl",
              billingCycle === 'yearly'
                ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            )}
          >
            <span>Yearly Billing</span>
            <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
              2 Months FREE
            </span>
          </button>
        </div>

        {/* Premium Native Segmented Switch (Fully Responsive) */}
        <div className="flex justify-center mb-6 sm:mb-8 py-2 z-20">
          <div className="bg-slate-200/60 dark:bg-[#131b2e] border border-slate-300/30 dark:border-slate-800/80 p-1 rounded-2xl flex w-full max-w-md shadow-inner">
            <button
              onClick={() => handlePlanTypeChange('custom')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300",
                !isAllAccess 
                  ? "bg-white dark:bg-[#1e294b] text-primary dark:text-white shadow-md shadow-slate-900/5 dark:shadow-none" 
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              )}
            >
              <Layers size={14} className={!isAllAccess ? "text-primary" : ""} />
              Modular Add-ons
            </button>
            <button
              onClick={() => handlePlanTypeChange('all-access')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 relative",
                isAllAccess 
                  ? "bg-gradient-to-r from-primary to-orange-600 text-white shadow-lg shadow-primary/20" 
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              )}
            >
              <Award size={14} className={isAllAccess ? "text-amber-300" : ""} />
              All-Access Pack
              <span className="absolute -top-1.5 right-1 bg-amber-500 text-[9px] text-white px-1.5 py-0.5 rounded-full font-black shadow-sm">
                MAX
              </span>
            </button>
          </div>
        </div>

        {/* Core Layout Structure */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Base Configuration Block */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-gradient-to-b from-emerald-500/10 to-white/70 dark:to-[#111827]/60 backdrop-blur-md rounded-2xl p-5 border-2 border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.15)] relative overflow-hidden group">
              <div className="absolute -right-6 -bottom-6 text-emerald-500/10 pointer-events-none transition-transform group-hover:scale-110 duration-500">
                <PackageOpen size={90} />
              </div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-extrabold text-slate-800 dark:text-slate-200 text-xs tracking-wider uppercase">Included Free Bundle</h3>
                <span className="text-[10px] bg-emerald-500 text-white font-black px-2.5 py-0.5 rounded-full shadow-sm shadow-emerald-500/30">100% FREE</span>
              </div>
              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">₹0</span>
                <span className="text-xs text-slate-500 font-medium">/ forever</span>
              </div>
              <ul className="space-y-2 border-t border-emerald-500/20 pt-3">
                {['Hotel Profile System', 'Dynamic QR Generation', 'Menu Core Dashboard', 'Basic Analytics', 'Unlimited Menus & Categories', 'Unlimited Discounts'].map((item, i) => (
                  <li key={i} className="flex items-center text-slate-700 dark:text-slate-300 text-xs font-medium">
                    <ShieldCheck size={14} className="text-emerald-500 mr-2 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Smart Banner for Mobile & Desktop Upsell */}
            {!isAllAccess && (
              <div className="bg-gradient-to-br from-[#121829] via-[#1a233d] to-[#111625] text-white rounded-2xl p-5 border border-primary/20 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-xl" />
                <h4 className="font-bold text-sm mb-1 flex items-center gap-1.5 text-orange-200">
                  <Sparkles size={14} className="text-amber-400" /> Unlock True Efficiency
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Save time and gain full operational flexibility with the All-Access Pack.
                </p>
                <button 
                  onClick={() => handlePlanTypeChange('all-access')}
                  className="w-full bg-gradient-to-r from-primary to-orange-500 text-white text-xs font-black py-2.5 rounded-xl shadow-md flex items-center justify-center gap-1.5 hover:brightness-110 transition-all uppercase tracking-wider"
                >
                  Switch to All-Access <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Dynamic Content Switching Layer */}
          <div className="lg:col-span-2">
            {isAllAccess ? (
              /* All Access Plan Layout Panel */
              <div className="bg-white dark:bg-[#121826] border-2 border-primary rounded-3xl p-6 sm:p-8 shadow-xl shadow-primary/5 relative overflow-hidden group animate-in fade-in zoom-in-95 duration-200">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all duration-700" />
                
                <div className="flex flex-col sm:flex-row gap-5 sm:items-center justify-between relative z-10 pb-6 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-orange-600 text-white flex items-center justify-center shadow-lg shadow-primary/20 shrink-0 mt-0.5">
                      <Award size={22} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">All-Access Bundle</h2>
                        {billingCycle === 'yearly' && (
                          <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                            2 Months FREE
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                        Complete feature catalog package clearance with no operational volume bounds or rate capping tiers.
                      </p>
                    </div>
                  </div>
                  
                  <div className="relative group self-center sm:self-auto shrink-0 text-right">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary to-orange-600 rounded-2xl blur-md opacity-30 group-hover:opacity-60 transition duration-500" />
                    <div className="relative bg-white dark:bg-[#182032] px-6 py-4 rounded-2xl border-2 border-primary/50 flex flex-col items-end shadow-xl shadow-primary/20">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black bg-gradient-to-r from-primary to-orange-600 bg-clip-text text-transparent">
                          ₹{billingCycle === 'yearly' ? ALL_ACCESS_PRICE * 10 : ALL_ACCESS_PRICE}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                          /{billingCycle === 'yearly' ? 'yr' : 'mo'}
                        </span>
                      </div>
                      {billingCycle === 'yearly' && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold mt-0.5">
                          Effective ₹332.50/mo (Save ₹798)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <span className="text-[11px] font-bold text-primary dark:text-primary uppercase tracking-widest block mb-3">Everything Included:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {ADDONS.map((addon) => (
                      <div key={addon.id} className="flex items-center gap-2.5 bg-slate-50 dark:bg-[#171f30]/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800/40">
                        <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                          <Check size={10} strokeWidth={3} />
                        </div>
                        <span className="font-semibold text-xs text-slate-700 dark:text-slate-300 truncate">{addon.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Custom Feature Modular Marketplace Grid */
              <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between text-slate-800 dark:text-slate-200 font-bold text-xs uppercase tracking-wider px-1">
                  <span className="flex items-center gap-1.5"><Zap size={14} className="text-primary" /> Mix & Match Core Modules</span>
                  <span className="text-slate-400 text-[11px] font-medium hidden sm:inline">Tap to choose</span>
                </div>
                
                <div>
                  {Object.entries(
                    ADDONS.reduce((acc, feature) => {
                      const cat = feature.category || 'Other';
                      if (!acc[cat]) acc[cat] = [];
                      acc[cat].push(feature);
                      return acc;
                    }, {} as Record<string, typeof ADDONS>)
                  ).map(([category, features]) => (
                    <div key={category} className="mb-6 last:mb-0">
                      <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3 px-1 border-b border-slate-200/50 dark:border-slate-800/50 pb-2 flex items-center gap-2">
                        <Layers size={14} className="text-primary" />
                        {category}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {features.map((feature) => {
                          const isSelected = selectedFeatures.has(feature.id);
                          const isAlreadySubscribed = activeSubscription?.is_all_access || (Array.isArray(activeSubscription?.active_modules) && activeSubscription.active_modules.includes(feature.id));
                          const featurePrice = billingCycle === 'yearly' ? feature.price * 10 : feature.price;
                          return (
                            <div 
                              key={feature.id}
                              onClick={() => toggleFeature(feature.id)}
                              className={cn(
                                "bg-white dark:bg-[#111726] border rounded-2xl p-4 sm:p-5 transition-all duration-300 flex flex-col justify-between cursor-pointer select-none relative active:scale-[0.98] tap-highlight-transparent group",
                                isAlreadySubscribed
                                  ? "border-emerald-500/40 dark:border-emerald-500/30 bg-gradient-to-br from-emerald-50/20 via-white to-transparent dark:from-emerald-950/10 dark:via-[#111726] dark:to-transparent"
                                  : isSelected 
                                  ? "border-primary dark:border-primary shadow-md ring-1 ring-primary/20" 
                                  : "border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm"
                              )}
                            >
                              {/* Selected Indicator Glow Line */}
                              {isSelected && <div className="absolute top-0 left-6 right-6 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent shadow-md" />}

                              <div>
                                <div className="flex justify-between items-start gap-3 mb-2">
                                  <div>
                                    {isAlreadySubscribed && (
                                      <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-400 px-2 py-0.5 rounded-full uppercase tracking-wider mb-1 shadow-xs">
                                        <CheckCircle2 size={10} /> Subscribed • {activeSubscription.days_left !== undefined ? `${activeSubscription.days_left}d Left` : 'Active'}
                                      </span>
                                    )}
                                    <h4 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base leading-snug mt-0.5 transition-colors group-hover:text-primary dark:group-hover:text-primary">
                                      {feature.name}
                                    </h4>
                                  </div>
                                  
                                  {/* Tap Check Target Element */}
                                  <div className={cn(
                                    "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all duration-300 shadow-inner mt-0.5",
                                    isSelected 
                                      ? "bg-primary border-primary text-white scale-110 shadow-primary/20" 
                                      : isAlreadySubscribed
                                      ? "bg-emerald-500 border-emerald-500 text-white"
                                      : "border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#182032]"
                                  )}>
                                    {(isSelected || isAlreadySubscribed) && <Check size={11} strokeWidth={3} />}
                                  </div>
                                </div>
                                
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal mb-4">
                                  {feature.description}
                                </p>
                              </div>

                              <div className="pt-3 border-t border-slate-50 dark:border-slate-800/40 flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                  <HelpCircle size={11} /> Multi-use
                                </span>
                                <div className="text-right">
                                  <span className="font-black text-slate-900 dark:text-white text-sm sm:text-base">
                                    ₹{featurePrice}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-bold">
                                    /{billingCycle === 'yearly' ? 'yr' : 'mo'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Premium Mobile-First Safe Sticky Billing Bar */}
        <div className="fixed bottom-16 lg:bottom-0 left-0 lg:left-64 right-0 bg-white/95 dark:bg-[#0b0f19]/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800/80 shadow-[0_-10px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-40 px-4 pt-2.5 pb-[calc(10px+env(safe-area-inset-bottom))] lg:pb-3.5 transition-transform duration-300">
          <div className="max-w-4xl mx-auto space-y-2">
            
            {/* Top Line: Setup & Itemized Fee Breakdown Pill */}
            <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300 pb-1.5 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-5 h-5 rounded-md bg-slate-100 dark:bg-[#131b2e] flex items-center justify-center text-slate-500 shrink-0">
                  <ShoppingCart size={12} />
                </div>
                <span className="truncate text-[11px]">
                  {isAllAccess ? (
                    <span className="text-primary font-extrabold bg-primary/10 px-1.5 py-0.5 rounded">
                      All-Access Pack ({billingCycle === 'yearly' ? 'Yearly' : 'Monthly'})
                    </span>
                  ) : (
                    <span>{activeItems.length === 0 ? 'No modules selected' : `${activeItems.length} active module${activeItems.length !== 1 ? 's' : ''} (${billingCycle === 'yearly' ? 'Yearly' : 'Monthly'})`}</span>
                  )}
                </span>
              </div>

              {/* Itemized Calculation Summary Pill */}
              <div className="flex items-center gap-1 sm:gap-1.5 text-[9px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium shrink-0 bg-slate-100 dark:bg-slate-800/80 px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                <span>Base: <strong className="text-slate-900 dark:text-white">₹{baseTotal.toFixed(2)}</strong></span>
                <span>+</span>
                <span>PG: <strong className="text-slate-900 dark:text-white">₹{pgFee.toFixed(2)}</strong></span>
                <span>+</span>
                <span>GST: <strong className="text-slate-900 dark:text-white">₹{gstFee.toFixed(2)}</strong></span>
              </div>
            </div>

            {/* Bottom Line: Total Payable & Pay Now CTA */}
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest block leading-none">
                  Total Payable Bill ({billingCycle === 'yearly' ? 'Yearly' : 'Monthly'})
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">₹{grandTotal.toFixed(2)}</span>
                  <span className="text-xs font-bold text-slate-400">/{billingCycle === 'yearly' ? 'yr' : 'mo'}</span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={isSubmitting}
                className="bg-gradient-to-r from-orange-500 via-primary to-orange-600 hover:brightness-110 text-white px-7 sm:px-9 py-2.5 sm:py-3 rounded-xl font-black shadow-lg shadow-orange-500/25 transition-all duration-200 flex items-center justify-center text-sm disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97] touch-manipulation gap-2 uppercase tracking-wider shrink-0"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Zap size={16} className="fill-white text-white animate-bounce" />
                    <span>Pay Now</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>

        {/* Payment Gateway Sandbox Modal */}
        {mockGatewayOrder && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#111726] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 font-black text-xs flex items-center justify-center">PAY</div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 leading-tight">Payment Gateway</h3>
                    <span className="text-[10px] text-slate-400">Order ID: {mockGatewayOrder.order_id}</span>
                  </div>
                </div>
                <button 
                  onClick={handleMockPaymentCancel}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-50 dark:bg-[#172033] p-5 rounded-2xl border border-slate-100 dark:border-slate-800/60 text-center space-y-2">
                  <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">Itemized Subscription Bill</span>
                  
                  <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1 max-w-xs mx-auto text-left border-t border-b border-slate-200/50 dark:border-slate-700/50 py-2.5 my-2">
                    <div className="flex justify-between">
                      <span>Base Plan / Modules:</span>
                      <span className="font-bold">₹{baseTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Gateway Fee:</span>
                      <span className="font-semibold">+₹{pgFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>GST on PG Fee:</span>
                      <span className="font-semibold">+₹{gstFee.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-baseline pt-1">
                    <span className="text-xs font-black uppercase text-slate-500">Total Payable:</span>
                    <span className="text-3xl font-black text-slate-900 dark:text-white">₹{(mockGatewayOrder.amount / 100).toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-2.5 pt-2">
                  <button
                    onClick={handleMockPaymentSuccess}
                    disabled={isSubmitting}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold py-3.5 rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-xs uppercase tracking-wider disabled:opacity-50"
                  >
                    {isSubmitting ? "Processing..." : "🟢 Simulate Payment Success"}
                  </button>

                  <button
                    onClick={handleMockPaymentCancel}
                    disabled={isSubmitting}
                    className="w-full bg-white dark:bg-[#182135] hover:bg-red-50 hover:text-red-500 border border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-400 font-bold py-3 rounded-xl transition-all active:scale-[0.98] text-xs uppercase tracking-wider disabled:opacity-50"
                  >
                    🔴 Simulate Payment Failure
                  </button>
                </div>
              </div>

              <div className="text-center pt-2">
                <span className="text-[9px] text-slate-400 font-medium leading-none">🔒 Secure Payment Transaction</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}