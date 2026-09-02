import { useState, useMemo, useEffect, useCallback } from 'react';
import { useHeaderStore } from '@/store/useHeaderStore';
import { 
  Check, ShoppingCart, Zap, PackageOpen, Award, Layers, ShieldCheck, 
  ArrowRight, CheckCircle2, Clock, ChevronDown, ChevronUp, AlertCircle, AlertTriangle, 
  Gift, FileText, Printer, Receipt, Lock, RefreshCw, Globe, Users, Search, Palette, BarChart3
} from 'lucide-react';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { api } from '@/services/api';
import menukitLogo from '@/assets/menukit-logo.svg';
import { CountryFlag } from '@/components/CountryFlag';

const CATEGORY_TAG_STYLES: Record<string, string> = {
  'Online Ordering': 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
  'Relationship Marketing': 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800',
  'Marketing': 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800',
  'Branding': 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
  'Analytics': 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800',
};

const CATEGORY_HEADER_ICONS: Record<string, any> = {
  'Online Ordering': Globe,
  'Relationship Marketing': Users,
  'Marketing': Search,
  'Branding': Palette,
  'Analytics': BarChart3,
};

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
  monthly_price?: number;
  yearly_price?: number;
  currency?: string;
  currency_symbol?: string;
  description: string;
  category: string;
}

interface CountryConfig {
  code: string;
  name: string;
  currency: string;
  symbol: string;
  flag: string;
}

const DEFAULT_SUPPORTED_COUNTRIES: CountryConfig[] = [
  { code: 'IN', name: 'India', currency: 'INR', symbol: '₹', flag: '🇮🇳' },
  { code: 'US', name: 'United States', currency: 'USD', symbol: '$', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', symbol: '£', flag: '🇬🇧' },
  { code: 'AU', name: 'Australia', currency: 'AUD', symbol: 'A$', flag: '🇦🇺' },
  { code: 'CA', name: 'Canada', currency: 'CAD', symbol: 'C$', flag: '🇨🇦' },
  { code: 'OTHER', name: 'International / Other', currency: 'USD', symbol: '$', flag: '🌎' },
];

const INITIAL_ADDONS: Feature[] = [
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
    id: 'analytics-advanced',
    name: 'Advanced Analytics',
    price: 129,
    description: 'Unlock 7-day, 30-day, Custom Date range filters, and detailed customer insights reports.',
    category: 'Analytics',
  },
];

export function SubscriptionMarketplacePage() {
  const [selectedCountry, setSelectedCountryState] = useState<string>(() => {
    try {
      return localStorage.getItem('menukit_selected_country') || '';
    } catch {
      return '';
    }
  });

  const [countryConfig, setCountryConfig] = useState<CountryConfig>(DEFAULT_SUPPORTED_COUNTRIES[0]);
  const [supportedCountries, setSupportedCountries] = useState<CountryConfig[]>(DEFAULT_SUPPORTED_COUNTRIES);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);

  const [dynamicModules, setDynamicModules] = useState<Feature[]>(INITIAL_ADDONS);
  const [allAccessPlan, setAllAccessPlan] = useState<{
    name: string;
    price: number;
    monthly_price: number;
    yearly_price: number;
    currency: string;
    currency_symbol: string;
    description: string;
  }>({
    name: 'All-Access Pack',
    price: 399,
    monthly_price: 399,
    yearly_price: 3990,
    currency: 'INR',
    currency_symbol: '₹',
    description: 'Unlock everything — all current and future modules included without restrictions.',
  });

  const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(new Set());
  const [isAllAccess, setIsAllAccess] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSubscription, setActiveSubscription] = useState<any>(null);
  const [showSubscribedDetails, setShowSubscribedDetails] = useState(false);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const [mockGatewayOrder, setMockGatewayOrder] = useState<{
    order_id: string;
    amount: number;
    currency: string;
    currency_symbol?: string;
  } | null>(null);

  const setHeaderTitle = useHeaderStore((state) => state.setTitle);

  const setSelectedCountry = (code: string) => {
    setSelectedCountryState(code);
    try {
      localStorage.setItem('menukit_selected_country', code);
    } catch {}
  };

  const fetchPricingCatalog = useCallback(async () => {
    try {
      const url = selectedCountry 
        ? `/subscription/pricing?country=${selectedCountry}&billing_cycle=${billingCycle}`
        : `/subscription/pricing?billing_cycle=${billingCycle}`;
      const res = await api.get(url);
      const data = res.data;
      if (data.country) {
        setCountryConfig({
          code: data.country.code,
          name: data.country.name,
          currency: data.country.currency,
          symbol: data.country.currency_symbol || data.country.symbol || '₹',
          flag: data.country.flag || '🇮🇳',
        });
      }
      if (data.supported_countries && Array.isArray(data.supported_countries)) {
        setSupportedCountries(data.supported_countries);
      }
      if (data.all_access) {
        setAllAccessPlan(data.all_access);
      }
      if (data.modules && Array.isArray(data.modules)) {
        setDynamicModules(data.modules);
      }
    } catch (err) {
      console.warn('Failed to load dynamic pricing catalog:', err);
    }
  }, [selectedCountry, billingCycle]);

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

  useEffect(() => {
    fetchPricingCatalog();
  }, [fetchPricingCatalog]);

  const fetchBillingHistory = async () => {
    try {
      const res = await api.get('/subscription/history');
      setHistoryList(res.data.history || []);
      setShowHistoryModal(true);
    } catch (err) {
      toast.error('Failed to load invoice history');
    }
  };

  const subscribedAddons = useMemo(() => {
    if (!activeSubscription) return [];
    if (activeSubscription.is_all_access) return dynamicModules;
    if (Array.isArray(activeSubscription.active_modules)) {
      return dynamicModules.filter(addon => 
        activeSubscription.active_modules.includes(addon.id) ||
        (addon.id === 'analytics-advanced' && (
          activeSubscription.active_modules.includes('analytics-advanced-filters') ||
          activeSubscription.active_modules.includes('analytics-customer-insights')
        ))
      );
    }
    return [];
  }, [activeSubscription, dynamicModules]);

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

    if (isAllAccess) {
      base = isYearly ? (allAccessPlan.yearly_price || allAccessPlan.price * 10) : (allAccessPlan.monthly_price || allAccessPlan.price);
    } else {
      selectedFeatures.forEach((id) => {
        const feature = dynamicModules.find(a => a.id === id);
        if (feature) {
          const itemPrice = isYearly ? (feature.yearly_price ?? feature.price * 10) : (feature.monthly_price ?? feature.price);
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
  }, [selectedFeatures, isAllAccess, billingCycle, allAccessPlan, dynamicModules]);

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
      setSelectedFeatures(new Set());
      setIsAllAccess(false);
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
      const res = await api.post('/subscription/create-order', {
        is_all_access: isAllAccess,
        selected_modules: Array.from(selectedFeatures),
        billing_cycle: billingCycle,
        country_code: selectedCountry || undefined,
      });
      
      const orderData = res.data;

      if (orderData.mock_mode) {
        setMockGatewayOrder({
          order_id: orderData.order_id,
          amount: orderData.amount,
          currency: orderData.currency || countryConfig.currency,
          currency_symbol: orderData.currency_symbol || countryConfig.symbol,
        });
        setIsSubmitting(false);
        return;
      }

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
            setSelectedFeatures(new Set());
            setIsAllAccess(false);
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
      toast.error(err.response?.data?.detail || 'Failed to initiate checkout. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = useMemo(() => {
    const map: Record<string, Feature[]> = {};
    dynamicModules.forEach(addon => {
      if (!map[addon.category]) map[addon.category] = [];
      map[addon.category].push(addon);
    });
    return map;
  }, [dynamicModules]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24 animate-fade-in relative px-3 sm:px-6">
      
      {/* 1. TOP ACTIVE SUBSCRIPTION STATUS BANNER */}
      {activeSubscription && (
        <div className={cn(
          "rounded-3xl p-5 border shadow-sm transition-all relative overflow-hidden",
          activeSubscription.is_expired
            ? "bg-gradient-to-r from-red-500/10 via-rose-500/10 to-red-500/15 border-red-500/30"
            : activeSubscription.is_grace_period
            ? "bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/15 border-amber-500/30"
            : activeSubscription.is_trial
            ? "bg-gradient-to-r from-indigo-500/15 via-blue-500/10 to-purple-500/15 border-indigo-500/40"
            : "bg-gradient-to-r from-emerald-500/15 via-emerald-600/10 to-teal-500/15 border-emerald-500/30"
        )}>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className={cn(
                "w-12 h-12 rounded-2xl text-white flex items-center justify-center shrink-0 shadow-md font-black text-lg",
                activeSubscription.is_expired ? "bg-red-500" : activeSubscription.is_grace_period ? "bg-amber-500" : activeSubscription.is_trial ? "bg-gradient-to-br from-indigo-600 to-purple-600" : "bg-emerald-500"
              )}>
                {activeSubscription.is_expired ? <AlertCircle className="w-6 h-6" /> : activeSubscription.is_grace_period ? <AlertTriangle className="w-6 h-6" /> : activeSubscription.is_trial ? <Gift className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white tracking-tight">
                    {activeSubscription.is_trial ? 'Free Trial Active' : activeSubscription.is_all_access ? 'All-Access Pack Active' : 'Custom Modular Plan'}
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
                    ? 'Subscription has ended. Select modules below to renew.'
                    : activeSubscription.is_grace_period
                    ? `Grace Period Active: ${activeSubscription.grace_days_left} day${activeSubscription.grace_days_left !== 1 ? 's' : ''} left`
                    : activeSubscription.is_trial
                    ? `Free Trial Active: ${activeSubscription.days_left ?? 30} Day${(activeSubscription.days_left ?? 30) !== 1 ? 's' : ''} Remaining (${activeSubscription.current_period_end ? `Expires ${new Date(activeSubscription.current_period_end).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''})`
                    : `Expires on ${activeSubscription.current_period_end ? new Date(activeSubscription.current_period_end).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Active'}`
                  }
                </p>
              </div>
            </div>

            <div className="flex flex-col items-start md:items-end gap-1.5 shrink-0 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-slate-200/50 dark:border-slate-800">
              <div className="flex items-center gap-2">
                {!activeSubscription.is_expired && (
                  <div className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border shadow-xs font-black text-xs",
                    activeSubscription.is_trial 
                      ? "bg-indigo-600 text-white border-indigo-500" 
                      : "bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200"
                  )}>
                    <Clock size={14} className={activeSubscription.is_trial ? "text-indigo-200" : "text-primary"} />
                    <span>
                      {activeSubscription.days_left !== undefined ? `${activeSubscription.days_left} Days Left` : 'Active'}
                    </span>
                  </div>
                )}
                <button 
                  onClick={fetchBillingHistory}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-xs font-bold shadow-xs cursor-pointer"
                >
                  <FileText size={14} className="text-orange-500" />
                  <span>Invoices & Billing</span>
                </button>
              </div>
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                {activeSubscription.is_all_access ? '✨ All Modules Unlocked' : `${activeSubscription.active_modules?.length || 0} Modules Active`}
              </span>
            </div>
          </div>

          {subscribedAddons.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-[11px] text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5 font-medium">
                <img src={menukitLogo} alt="Menukit" className="w-3.5 h-3.5 object-contain shrink-0" />
                <strong>Sequential Extension:</strong> New module purchases automatically stack and extend smoothly.
              </span>

              <button
                onClick={() => setShowSubscribedDetails(!showSubscribedDetails)}
                className="flex items-center gap-1 px-3 py-1 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-xs font-extrabold text-primary hover:text-primary-600 transition-all cursor-pointer shadow-xs shrink-0"
              >
                <span>{showSubscribedDetails ? 'Hide Subscribed Modules' : `View ${subscribedAddons.length} Subscribed Modules`}</span>
                {showSubscribedDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
          )}

          {showSubscribedDetails && subscribedAddons.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-200/80 dark:border-slate-800/80 space-y-3 animate-fade-in">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-500" />
                Active Subscribed Modules ({subscribedAddons.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {subscribedAddons.map((addon) => {
                  const modExp = activeSubscription?.module_expirations?.[addon.id];
                  const modDaysLeft = modExp?.days_left !== undefined ? modExp.days_left : activeSubscription.days_left;

                  return (
                    <div key={addon.id} className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400">
                          {addon.category}
                        </span>
                        <h5 className="font-bold text-xs text-slate-900 dark:text-white mt-1">{addon.name}</h5>
                      </div>
                      <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2 py-1 rounded-lg shrink-0">
                        {modDaysLeft !== undefined ? `${modDaysLeft}d Left` : 'Active'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. MAIN 2-COLUMN MODERN SUBSCRIPTION LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* LEFT COLUMN: MODULES MARKETPLACE (2/3 Width) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section Header with Country Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/40 text-primary text-[11px] font-bold uppercase tracking-wider mb-2 shadow-xs">
                <img src={menukitLogo} alt="Menukit" className="w-4 h-4 object-contain" />
                <span>MODULAR MARKETPLACE</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Select Your <span className="bg-gradient-to-r from-primary via-orange-500 to-orange-600 bg-clip-text text-transparent">Add-On Modules</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Pick individual modules for your business needs or unlock the full suite with the All-Access Pack.
              </p>
            </div>

            {/* Country Selector Dropdown Pill */}
            <div className="relative self-start sm:self-center shrink-0">
              <button
                type="button"
                onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 px-3.5 py-2 rounded-2xl inline-flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 transition-all shadow-xs cursor-pointer"
                title="Change Country & Currency"
              >
                <CountryFlag code={countryConfig.code} size={18} />
                <span>{countryConfig.name}</span>
                <span className="text-slate-400 font-mono text-[11px]">({countryConfig.currency} {countryConfig.symbol})</span>
                <ChevronDown size={14} className={cn("text-slate-400 transition-transform duration-200", isCountryDropdownOpen ? "rotate-180" : "")} />
              </button>

              {isCountryDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl py-1.5 z-50 overflow-hidden animate-fade-in">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                    Select Your Country
                  </div>
                  {supportedCountries.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => {
                        setSelectedCountry(c.code);
                        setIsCountryDropdownOpen(false);
                      }}
                      className={cn(
                        "w-full px-3 py-2 text-left flex items-center justify-between text-xs font-semibold transition-colors cursor-pointer",
                        countryConfig.code === c.code
                          ? "bg-primary/10 text-primary dark:text-orange-400 font-bold"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <CountryFlag code={c.code} size={16} />
                        <span>{c.name}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">{c.currency} {c.symbol}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 2-COLUMN SPLIT HIGHLIGHT CARDS (Left: Included Free Bundle, Right: All-Access Pack) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
            
            {/* HIGHLIGHT 1: Included Free Core System Card */}
            <div className="bg-gradient-to-br from-teal-500/10 via-white to-cyan-500/5 dark:from-teal-950/20 dark:to-slate-900 border-2 border-teal-500/30 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between space-y-4 relative overflow-hidden h-full">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <img src={menukitLogo} alt="Menukit" className="w-5 h-5 object-contain" />
                    <span className="bg-teal-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-xs uppercase tracking-wider">
                      100% FREE BUNDLE
                    </span>
                  </div>
                  <span className="text-[10px] font-black text-teal-700 bg-teal-100 dark:bg-teal-950/60 dark:text-teal-300 px-2.5 py-1 rounded-full shrink-0">
                    Active Default
                  </span>
                </div>

                <div>
                  <h3 className="font-black text-lg text-slate-900 dark:text-white">Core System Features</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    Digital QR Menu, Category & Item Catalog, Staff Accounts & Permissions, Unlimited Menu Scans, Settlements Engine.
                  </p>
                </div>

                <div className="space-y-1.5 pt-1 text-xs font-bold text-teal-700 dark:text-teal-300">
                  <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-teal-500 shrink-0" /> Digital QR Menu & Scans</span>
                  <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-teal-500 shrink-0" /> Category & Item Catalog</span>
                  <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-teal-500 shrink-0" /> Staff Accounts & Permissions</span>
                </div>
              </div>

              <div className="pt-4 border-t border-teal-200/60 dark:border-teal-800/60 flex items-baseline justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Plan Price</span>
                  <span className="text-3xl font-black text-teal-600 dark:text-teal-400 font-heading">{countryConfig.symbol}0</span>
                </div>
                <span className="text-xs text-slate-400 font-bold">/ forever free</span>
              </div>
            </div>

            {/* HIGHLIGHT 2: All-Access Pack Hero Card */}
            <div 
              onClick={() => handlePlanTypeChange(isAllAccess ? 'custom' : 'all-access')}
              className={cn(
                "rounded-3xl p-5 sm:p-6 border-2 transition-all duration-300 cursor-pointer relative overflow-hidden shadow-xl group flex flex-col justify-between space-y-4 h-full",
                isAllAccess 
                  ? "bg-gradient-to-r from-orange-500 via-primary to-amber-500 text-white border-amber-300 ring-4 ring-orange-500/30 scale-[1.01]"
                  : "bg-gradient-to-r from-orange-500/90 via-primary/95 to-amber-600/90 text-white border-orange-300/60 hover:border-amber-300 hover:shadow-2xl"
              )}
            >
              {/* Ambient Glass Gloss Overlay */}
              <div className="absolute right-0 top-0 translate-x-6 -translate-y-6 w-40 h-40 bg-white/15 rounded-full blur-2xl pointer-events-none" />

              <div className="space-y-3 relative z-10">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-white shadow-md p-1.5 flex items-center justify-center shrink-0 border border-orange-100">
                      <img src={menukitLogo} alt="Menukit" className="w-full h-full object-contain" />
                    </div>
                    <span className="bg-white text-orange-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-md flex items-center gap-1">
                      <Award size={13} className="text-orange-500" /> BEST VALUE
                    </span>
                  </div>

                  <button
                    type="button"
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0 shadow-md cursor-pointer",
                      isAllAccess 
                        ? "bg-white text-orange-600 scale-110 ring-2 ring-white/30" 
                        : "bg-white/20 text-white hover:bg-white hover:text-orange-600"
                    )}
                  >
                    <Check size={18} strokeWidth={3} />
                  </button>
                </div>

                <div>
                  <h3 className="font-black text-lg text-white tracking-tight">{allAccessPlan.name || 'All-Access Pack'}</h3>
                  <p className="text-xs text-orange-50/90 leading-relaxed mt-1">
                    {allAccessPlan.description || 'Unlock all current and future add-on modules for one flat subscription.'}
                  </p>
                </div>

                <div className="space-y-1.5 pt-1 text-xs font-extrabold text-orange-100">
                  <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-amber-300 shrink-0" /> Save Big vs Individual Modules</span>
                  <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-amber-300 shrink-0" /> Includes All Marketplace Add-ons</span>
                </div>
              </div>

              <div className="pt-4 border-t border-white/25 flex items-baseline justify-between relative z-10">
                <div>
                  <span className="text-[10px] font-bold text-orange-200 block uppercase tracking-wider">All-Access Price</span>
                  <div className="text-3xl font-black text-white font-heading">
                    {countryConfig.symbol}{billingCycle === 'yearly' ? (allAccessPlan.yearly_price ?? allAccessPlan.price * 10) : (allAccessPlan.monthly_price ?? allAccessPlan.price)}
                    <span className="text-xs font-semibold opacity-90">/{billingCycle === 'yearly' ? 'yr' : 'mo'}</span>
                  </div>
                </div>
                {billingCycle === 'yearly' ? (
                  <span className="text-[10px] bg-emerald-500 text-white font-bold px-2 py-0.5 rounded-full shadow-xs">
                    2M FREE
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-200 font-bold">
                    Single Flat Rate
                  </span>
                )}
              </div>
            </div>

          </div>

          {/* MARKETPLACE MODULE CARDS GRID BY CATEGORY */}
          <div className="space-y-6">
            {Object.entries(categories).map(([category, features]) => {
              const HeaderIcon = CATEGORY_HEADER_ICONS[category] || Layers;
              const tagStyle = CATEGORY_TAG_STYLES[category] || 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';

              return (
                <div key={category} className="space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                    <HeaderIcon size={16} className="text-primary" />
                    <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      {category}
                    </h3>
                  </div>

                  <div className="flex flex-col gap-3">
                    {features.map((feature) => {
                      const isSelected = selectedFeatures.has(feature.id);
                      const isAlreadySubscribed = activeSubscription?.is_all_access || (
                        Array.isArray(activeSubscription?.active_modules) && (
                          activeSubscription.active_modules.includes(feature.id) ||
                          (feature.id === 'analytics-advanced' && (
                            activeSubscription.active_modules.includes('analytics-advanced-filters') ||
                            activeSubscription.active_modules.includes('analytics-customer-insights')
                          ))
                        )
                      );
                      const featurePrice = billingCycle === 'yearly' ? (feature.yearly_price ?? feature.price * 10) : (feature.monthly_price ?? feature.price);

                      return (
                        <div
                          key={feature.id}
                          onClick={() => toggleFeature(feature.id)}
                          className={cn(
                            "rounded-2xl p-4 sm:p-5 transition-all duration-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer select-none relative group shadow-xs",
                            isSelected
                              ? "border-2 border-primary ring-4 ring-primary/20 bg-gradient-to-r from-orange-50/90 via-white to-amber-50/80 dark:from-orange-950/40 dark:via-slate-900 dark:to-amber-950/30 shadow-lg scale-[1.005]"
                              : isAlreadySubscribed
                              ? "border-2 border-emerald-500/40 dark:border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/10 hover:border-primary/60"
                              : "border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-primary/50 hover:shadow-md"
                          )}
                        >
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={cn("text-[9px] font-black uppercase px-2.5 py-0.5 rounded-md shadow-2xs", tagStyle)}>
                                {feature.category}
                              </span>

                              {isSelected ? (
                                <span className="bg-primary text-white text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                                  <Check size={12} strokeWidth={3} /> SELECTED FOR BILL
                                </span>
                              ) : isAlreadySubscribed ? (
                                <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                  <Check size={10} /> Currently Active
                                </span>
                              ) : null}
                            </div>

                          <h4 className={cn(
                            "font-black text-sm sm:text-base leading-snug transition-colors",
                            isSelected ? "text-primary dark:text-orange-400" : "text-slate-900 dark:text-white"
                          )}>
                            {feature.name}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            {feature.description}
                          </p>
                        </div>

                        <div className="flex items-center gap-4 shrink-0 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-slate-100 dark:border-slate-800/80 pt-3 sm:pt-0">
                          <div className="text-left sm:text-right">
                            <div className="flex items-baseline gap-1">
                              <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-heading">
                                {countryConfig.symbol}{featurePrice}
                              </span>
                              <span className="text-xs text-slate-400 font-medium">
                                /{billingCycle === 'yearly' ? 'yr' : 'mo'}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            className={cn(
                              "px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs",
                              isSelected
                                ? "bg-primary text-white shadow-md shadow-primary/30 ring-2 ring-orange-400/50 scale-105"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-primary hover:text-white"
                            )}
                          >
                            {isSelected ? (
                              <>
                                <Check size={14} strokeWidth={3} />
                                <span>ADDED ✓</span>
                              </>
                            ) : (
                              <span>+ SELECT MODULE</span>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          </div>

        </div>

        {/* RIGHT COLUMN: STICKY PAYMENT & BILL SUMMARY CARD (1/3 Width) */}
        <div className="lg:col-span-1 sticky top-6 z-20 space-y-4">
          
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
            
            {/* Header & Billing Cycle Switcher */}
            <div className="space-y-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Receipt size={18} className="text-primary" />
                  Plan & Bill Summary
                </h3>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-orange-50 dark:bg-orange-950/40 text-primary flex items-center gap-1">
                  <img src={menukitLogo} alt="Menukit" className="w-3.5 h-3.5 object-contain" />
                  Checkout
                </span>
              </div>

              {/* Billing Cycle Selector Toggle */}
              <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  className={cn(
                    "flex-1 py-1.5 text-xs font-extrabold rounded-xl transition-all text-center cursor-pointer",
                    billingCycle === 'monthly'
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800"
                  )}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('yearly')}
                  className={cn(
                    "flex-1 py-1.5 text-xs font-extrabold rounded-xl transition-all text-center cursor-pointer flex items-center justify-center gap-1",
                    billingCycle === 'yearly'
                      ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800"
                  )}
                >
                  Yearly
                  <span className="text-[9px] bg-emerald-500 text-white font-black px-1.5 py-0.2 rounded-full">
                    2M Free
                  </span>
                </button>
              </div>
            </div>

            {/* Selected Modules Itemized List */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Selected Subscription Items ({isAllAccess ? '1 Pack' : `${activeItems.length} Modules`})
              </span>

              {isAllAccess ? (
                <div className="flex items-center justify-between p-3 rounded-xl bg-orange-50/60 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/40">
                  <div className="flex items-center gap-2">
                    <img src={menukitLogo} alt="Menukit" className="w-4 h-4 object-contain shrink-0" />
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">{allAccessPlan.name || 'All-Access Pack'}</h4>
                      <p className="text-[10px] text-slate-500">All Modules Unlocked</p>
                    </div>
                  </div>
                  <span className="font-black text-xs text-slate-900 dark:text-white">
                    {countryConfig.symbol}{billingCycle === 'yearly' ? (allAccessPlan.yearly_price ?? allAccessPlan.price * 10) : (allAccessPlan.monthly_price ?? allAccessPlan.price)}
                  </span>
                </div>
              ) : activeItems.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {activeItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[170px]">
                        {item.name}
                      </span>
                      <span className="font-extrabold text-slate-900 dark:text-white shrink-0">
                        {countryConfig.symbol}{item.price}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-1">
                  <ShoppingCart className="w-6 h-6 text-slate-300 dark:text-slate-700 mx-auto" />
                  <p className="text-xs font-bold text-slate-500">No modules selected yet</p>
                  <p className="text-[11px] text-slate-400">Click "+ Select" on any module card to add it to your plan.</p>
                </div>
              )}
            </div>

            {/* Price Breakdown Table */}
            <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Base Subtotal</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{countryConfig.symbol}{baseTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Gateway Fee (3%)</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{countryConfig.symbol}{pgFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>GST / Taxes (18% PG)</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{countryConfig.symbol}{gstFee.toFixed(2)}</span>
              </div>

              {billingCycle === 'yearly' && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-lg text-[11px]">
                  <span>Yearly Discount Savings</span>
                  <span>2 Months FREE</span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-baseline justify-between">
                <div>
                  <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider block">Total Payable</span>
                  <span className="text-[10px] text-slate-400 font-medium">Billed {billingCycle}</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black bg-gradient-to-r from-primary via-orange-500 to-amber-500 bg-clip-text text-transparent font-heading">
                    {countryConfig.symbol}{grandTotal.toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-400 font-bold block">/{billingCycle === 'yearly' ? 'yr' : 'mo'}</span>
                </div>
              </div>
            </div>

            {/* Action CTA Checkout Button */}
            <button
              onClick={handleCheckout}
              disabled={isSubmitting || baseTotal === 0}
              className="w-full py-3.5 px-4 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-orange-500 via-primary to-amber-500 hover:brightness-110 shadow-lg shadow-orange-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 fill-current" />
                  <span>PAY NOW & ACTIVATE</span>
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </>
              )}
            </button>

            {/* Security Badges */}
            <div className="pt-2 flex items-center justify-center gap-4 text-[10px] font-bold text-slate-400 border-t border-slate-100 dark:border-slate-800/80">
              <span className="flex items-center gap-1">
                <Zap size={12} className="text-orange-500" /> Instant Activation
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <ShieldCheck size={12} className="text-emerald-500" /> 256-Bit Encrypted
              </span>
            </div>

          </div>
        </div>

      </div>

      {/* 3. MODAL: INVOICE & BILLING HISTORY */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="text-primary" /> Invoice & Billing History
              </h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-3 pr-1">
              {historyList.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="font-bold text-sm">No billing invoices found yet.</p>
                </div>
              ) : (
                historyList.map((item) => {
                  const currSym = item.currency === 'USD' ? '$' : item.currency === 'GBP' ? '£' : item.currency === 'AUD' ? 'A$' : item.currency === 'CAD' ? 'C$' : item.currency === 'EUR' ? '€' : '₹';
                  return (
                    <div key={item.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">
                          Invoice #{item.invoice_number}
                        </span>
                        <h4 className="font-black text-sm text-slate-900 dark:text-white">
                          {currSym}{item.amount} <span className="text-[10px] font-semibold text-slate-400 font-mono">({item.currency || 'INR'})</span>
                        </h4>
                        <p className="text-xs text-slate-500">
                          {new Date(item.created_at || item.paid_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} • {item.status || 'Paid'}
                        </p>
                      </div>

                      <a
                        href={`/api/v1/subscription/invoice/${item.id}/print`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-primary flex items-center gap-1.5 hover:bg-primary/10 transition-colors shadow-xs"
                      >
                        <Printer size={14} /> Print Invoice
                      </a>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-right">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. MODAL: MOCK GATEWAY PAYMENT SIMULATOR */}
      {mockGatewayOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl text-center space-y-5 animate-scale-up">
            <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-950/60 text-primary flex items-center justify-center mx-auto shadow-md">
              <Zap className="w-8 h-8 fill-current" />
            </div>

            <div>
              <h3 className="font-black text-xl text-slate-900 dark:text-white">Mock Payment Gateway</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Simulating payment checkout for Order ID: <code className="font-bold text-primary">{mockGatewayOrder.order_id}</code>
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="text-xs text-slate-400 font-bold uppercase">Total Payable Amount</span>
              <div className="text-3xl font-black text-slate-900 dark:text-white font-heading">
                {mockGatewayOrder.currency_symbol || (mockGatewayOrder.currency === 'USD' ? '$' : mockGatewayOrder.currency === 'GBP' ? '£' : mockGatewayOrder.currency === 'AUD' ? 'A$' : mockGatewayOrder.currency === 'CAD' ? 'C$' : mockGatewayOrder.currency === 'EUR' ? '€' : '₹')}{(mockGatewayOrder.amount / 100).toFixed(2)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleMockPaymentCancel}
                disabled={isSubmitting}
                className="py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-800 font-bold text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleMockPaymentSuccess}
                disabled={isSubmitting}
                className="py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-xs shadow-md hover:brightness-110 transition-all flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? 'Verifying...' : 'Simulate Success ✓'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}