import { createPortal } from 'react-dom';
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { useHeaderStore } from '@/store/useHeaderStore';
import { HeaderActions } from '@/components/HeaderActions';
import { 
  Check, ShoppingCart, Zap, PackageOpen, Award, Layers, ShieldCheck, 
  ArrowRight, CheckCircle2, Clock, ChevronDown, ChevronUp, AlertCircle, AlertTriangle, 
  Gift, FileText, Printer, Receipt, Lock, RefreshCw, Globe, Users, Search, Palette, BarChart3,
  CreditCard, Sparkles, Compass, HelpCircle, ExternalLink
} from 'lucide-react';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { api } from '@/services/api';
import menukitLogo from '@/assets/menukit-logo.svg';
import { CountryFlag } from '@/components/CountryFlag';
import { Button } from '@/components/ui/Button';

const CATEGORY_TAG_STYLES: Record<string, string> = {
  'Online Ordering': 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
  'Relationship Marketing': 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800',
  'Marketing': 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800',
  'Branding': 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
  'Analytics': 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800',
  'Discovery': 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800',
};

const CATEGORY_HEADER_ICONS: Record<string, any> = {
  'Online Ordering': Globe,
  'Relationship Marketing': Users,
  'Marketing': Search,
  'Branding': Palette,
  'Analytics': BarChart3,
  'Discovery': Compass,
};

const MODULE_THEMES: Record<string, { icon: any; iconColor: string; bgLight: string; benefits: string[] }> = {
  'online-orders': {
    icon: Globe,
    iconColor: 'text-blue-600 dark:text-blue-400',
    bgLight: 'bg-blue-50 dark:bg-blue-950/50 border-blue-200/80 dark:border-blue-900/50',
    benefits: ['Direct Customer Orders', 'Live Menu Ordering', 'Instant WhatsApp Alerts'],
  },
  'member-count': {
    icon: Users,
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    bgLight: 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200/80 dark:border-indigo-900/50',
    benefits: ['Monthly Growth Metrics', 'Automated Counter', 'Real-time Sync'],
  },
  'member-details': {
    icon: ShieldCheck,
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    bgLight: 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200/80 dark:border-indigo-900/50',
    benefits: ['Full Member Directory', 'Spending Habits & Visits', 'CRM Export Support'],
  },
  'search-data': {
    icon: Search,
    iconColor: 'text-purple-600 dark:text-purple-400',
    bgLight: 'bg-purple-50 dark:bg-purple-950/50 border-purple-200/80 dark:border-purple-900/50',
    benefits: ['Customer Search Analytics', 'Trending Dish Keywords', 'Demand Insights'],
  },
  'custom-theme': {
    icon: Palette,
    iconColor: 'text-amber-600 dark:text-amber-400',
    bgLight: 'bg-amber-50 dark:bg-amber-950/50 border-amber-200/80 dark:border-amber-900/50',
    benefits: ['Custom Brand Palette', 'Custom Header & Logo', 'Personalized Theme Styles'],
  },
  'analytics-advanced': {
    icon: BarChart3,
    iconColor: 'text-cyan-600 dark:text-cyan-400',
    bgLight: 'bg-cyan-50 dark:bg-cyan-950/50 border-cyan-200/80 dark:border-cyan-900/50',
    benefits: ['7D / 30D / Custom Date Filter', 'Customer Behavior Reports', 'Exportable Charts'],
  },
  'hide-discovery-badge': {
    icon: Compass,
    iconColor: 'text-rose-600 dark:text-rose-400',
    bgLight: 'bg-rose-50 dark:bg-rose-950/50 border-rose-200/80 dark:border-rose-900/50',
    benefits: ['Listed on Public Discover', 'No Outward Discover Badge', 'Pure Brand Experience'],
  },
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
  {
    id: 'hide-discovery-badge',
    name: 'Featured Discovery (No Menu Badge)',
    price: 49,
    description: 'Keep your shop discoverable on the public map & search while removing the outward Discover label from your customer menu.',
    category: 'Discovery',
  },
];

export function SubscriptionMarketplacePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as 'my-plan' | 'marketplace' | 'invoices') || 'my-plan';
  const [activeTab, setActiveTab] = useState<'my-plan' | 'marketplace' | 'invoices'>(initialTab);

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
  const countryDropdownRef = useRef<HTMLDivElement>(null);

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
    price: 449,
    monthly_price: 449,
    yearly_price: 4490,
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
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

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

  const handleTabChange = (tab: 'my-plan' | 'marketplace' | 'invoices') => {
    setActiveTab(tab);
    setSearchParams({ tab });
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

  const fetchBillingHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const res = await api.get('/subscription/history');
      setHistoryList(res.data.history || []);
    } catch (err) {
      toast.error('Failed to load invoice history');
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target as Node)) {
        setIsCountryDropdownOpen(false);
      }
    };
    if (isCountryDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCountryDropdownOpen]);

  useEffect(() => {
    setHeaderTitle(
      'Plans & Subscriptions',
      'Review your current plan entitlements, explore modular add-ons, and download official invoices.'
    );
    fetchCurrentSubscription();
    fetchBillingHistory();
  }, [setHeaderTitle, fetchCurrentSubscription, fetchBillingHistory]);

  useEffect(() => {
    fetchPricingCatalog();
  }, [fetchPricingCatalog]);

  const subscribedAddons = useMemo(() => {
    if (!activeSubscription) return [];
    if (activeSubscription.is_all_access) {
      return dynamicModules.filter(m => m.id !== 'analytics-advanced-filters' && m.id !== 'analytics-customer-insights');
    }
    if (Array.isArray(activeSubscription.active_modules)) {
      return dynamicModules.filter(addon => 
        activeSubscription.active_modules.includes(addon.id)
      );
    }
    return [];
  }, [activeSubscription, dynamicModules]);

  const hasActiveMemberDetails = Boolean(
    activeSubscription?.is_all_access ||
    (Array.isArray(activeSubscription?.active_modules) && (
      activeSubscription.active_modules.includes('member-details') ||
      activeSubscription.active_modules.includes('new-member')
    ))
  );

  const toggleFeature = (id: string) => {
    if (isAllAccess) setIsAllAccess(false);

    if (id === 'member-count') {
      if (hasActiveMemberDetails) {
        toast.info("You already have 'New Member + Details' active, which includes Member Count.");
        return;
      }
      if (selectedFeatures.has('member-details')) {
        toast.info("'New Member + Details' already includes Member Count for free.");
        return;
      }
    }

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
      fetchBillingHistory();
      handleTabChange('my-plan');
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
            fetchBillingHistory();
            handleTabChange('my-plan');
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
    dynamicModules
      .filter(m => m.id !== 'analytics-advanced-filters' && m.id !== 'analytics-customer-insights')
      .forEach(addon => {
        if (!map[addon.category]) map[addon.category] = [];
        map[addon.category].push(addon);
      });
    return map;
  }, [dynamicModules]);

  const handlePrintInvoice = async (invoiceId: string) => {
    const toastId = toast.loading('Preparing tax invoice...');
    try {
      const res = await api.get(`/subscription/invoices/${invoiceId}`);
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(res.data);
        printWindow.document.close();
        printWindow.focus();
      }
      toast.dismiss(toastId);
    } catch (err) {
      console.error("Failed to load invoice", err);
      toast.error('Failed to load invoice', { id: toastId });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24 animate-fade-in relative px-3 sm:px-6">
      
      {/* ── TOP BAR HEADER ACTIONS: COUNTRY SELECTOR ───────────────────── */}
      <HeaderActions>
        <div ref={countryDropdownRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
            className="bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl inline-flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-all shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer"
            title="Change Country & Currency"
          >
            <CountryFlag code={countryConfig.code} size={16} />
            <span className="font-bold">{countryConfig.name}</span>
            <span className="text-slate-400 dark:text-slate-400 font-mono text-[11px]">({countryConfig.currency} {countryConfig.symbol})</span>
            <ChevronDown size={13} className={cn("text-slate-400 transition-transform duration-200", isCountryDropdownOpen ? "rotate-180" : "")} />
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
      </HeaderActions>

      {/* ── STICKY SEGMENTED NAVIGATION TABS ─────────────────────────── */}
      <div className="sticky top-[-16px] sm:top-[-24px] lg:top-[-32px] z-10 bg-[#f8fafc]/90 dark:bg-slate-950/90 backdrop-blur-md pt-3 pb-3.5 -mt-2 -mx-3 px-3 sm:-mx-6 sm:px-6 border-b border-slate-200/60 dark:border-slate-800/60 transition-all">
        <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs max-w-full overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => handleTabChange('my-plan')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all shrink-0 cursor-pointer",
              activeTab === 'my-plan'
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <ShieldCheck size={16} className={activeTab === 'my-plan' ? "text-primary" : "text-slate-400"} />
            <span>My Active Plan</span>
            {activeSubscription && (
              <span className={cn(
                "text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider",
                activeSubscription.is_expired
                  ? "bg-red-500 text-white"
                  : activeSubscription.is_grace_period
                  ? "bg-amber-500 text-white"
                  : activeSubscription.is_trial
                  ? "bg-indigo-600 text-white"
                  : "bg-emerald-500 text-white"
              )}>
                {activeSubscription.is_expired ? 'Expired' : activeSubscription.is_trial ? 'Free Trial' : 'Active'}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('marketplace')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all shrink-0 cursor-pointer",
              activeTab === 'marketplace'
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <Zap size={16} className={activeTab === 'marketplace' ? "text-primary" : "text-slate-400"} />
            <span>Explore Plans & Add-ons</span>
            <span className="text-[9px] bg-orange-100 dark:bg-orange-950/60 text-primary font-black px-2 py-0.5 rounded-full">
              Modular
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('invoices')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all shrink-0 cursor-pointer",
              activeTab === 'invoices'
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <Receipt size={16} className={activeTab === 'invoices' ? "text-primary" : "text-slate-400"} />
            <span>Billing & Invoices</span>
            {historyList.length > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                {historyList.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: MY ACTIVE PLAN VIEW                                          */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'my-plan' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* ── MENUKIT GLASSMORPHISM ACTIVE PLAN HERO CARD ──────────────────── */}
          <div className={cn(
            "rounded-3xl p-6 sm:p-8 border relative overflow-hidden transition-all backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.25)]",
            activeSubscription?.is_expired
              ? "bg-rose-500/[0.04] dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40"
              : activeSubscription?.is_grace_period
              ? "bg-amber-500/[0.04] dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40"
              : activeSubscription?.is_trial
              ? "bg-indigo-500/[0.04] dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/40"
              : "bg-white/80 dark:bg-slate-900/80 border-slate-200/90 dark:border-slate-800"
          )}>
            {/* Ambient luminous radial aura blur */}
            <div className={cn(
              "absolute -right-16 -top-16 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-40 dark:opacity-20",
              activeSubscription?.is_expired
                ? "bg-rose-400/30"
                : activeSubscription?.is_grace_period
                ? "bg-amber-400/30"
                : activeSubscription?.is_trial
                ? "bg-indigo-400/30"
                : "bg-gradient-to-br from-emerald-400/25 via-teal-400/20 to-orange-400/20"
            )} />

            <div className="relative z-10 space-y-6">
              
              {/* Top Row: Plan Tier, Status, and Action Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs border",
                    activeSubscription?.is_expired
                      ? "bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400"
                      : activeSubscription?.is_grace_period
                      ? "bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-900/60 text-amber-600 dark:text-amber-400"
                      : activeSubscription?.is_trial
                      ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-900/60 text-indigo-600 dark:text-indigo-400"
                      : "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200/80 dark:border-emerald-800/80 text-emerald-600 dark:text-emerald-400"
                  )}>
                    {activeSubscription?.is_expired ? (
                      <AlertCircle className="w-6 h-6" />
                    ) : activeSubscription?.is_grace_period ? (
                      <AlertTriangle className="w-6 h-6" />
                    ) : activeSubscription?.is_trial ? (
                      <Gift className="w-6 h-6" />
                    ) : (
                      <ShieldCheck className="w-6 h-6" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 font-mono">
                        CURRENT SUBSCRIPTION
                      </span>
                      <span className={cn(
                        "text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5 border shadow-2xs",
                        activeSubscription?.is_expired
                          ? "bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900/60"
                          : activeSubscription?.is_grace_period
                          ? "bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900/60"
                          : activeSubscription?.is_trial
                          ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900/60"
                          : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/80"
                      )}>
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          activeSubscription?.is_expired ? "bg-red-500" : activeSubscription?.is_grace_period ? "bg-amber-500" : activeSubscription?.is_trial ? "bg-indigo-500" : "bg-emerald-500 animate-pulse"
                        )} />
                        {activeSubscription?.is_expired ? 'Expired' : activeSubscription?.is_grace_period ? 'Grace Period' : activeSubscription?.is_trial ? 'Free Trial' : 'Active'}
                      </span>
                    </div>

                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                      {activeSubscription?.is_expired
                        ? (activeSubscription.is_trial ? 'Free Trial Ended' : 'Subscription Ended')
                        : activeSubscription?.is_grace_period
                        ? (activeSubscription.is_trial ? 'Free Trial Ended (Grace Period)' : 'Subscription Ended (Grace Period)')
                        : activeSubscription?.is_trial
                        ? 'Free Trial Active'
                        : activeSubscription?.is_all_access
                        ? 'All-Access Pro Suite'
                        : 'Custom Modular Plan'}
                    </h2>
                  </div>
                </div>

                {/* Primary Action Button */}
                <div className="flex items-center gap-2.5 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => handleTabChange('marketplace')}
                    className="bg-primary hover:bg-orange-600 text-white font-bold text-xs h-10 px-5 rounded-xl shadow-md shadow-primary/20 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    <Zap size={14} className="fill-current" />
                    <span>{activeSubscription?.is_expired ? 'Renew Subscription' : 'Upgrade / Add Modules'}</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>

              {/* Metric Stat Cards Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                {/* Stat 1: Remaining Days & Progress Gauge */}
                <div className="bg-white/80 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 rounded-2xl p-3.5 space-y-1.5 backdrop-blur-md shadow-2xs">
                  <div className="flex items-center justify-between text-slate-400 dark:text-slate-400 text-[11px] font-semibold">
                    <span>Remaining Time</span>
                    <Clock size={13} className="text-slate-400" />
                  </div>
                  <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white font-heading">
                    {activeSubscription?.is_expired
                      ? '0 Days'
                      : activeSubscription?.is_grace_period
                      ? `${activeSubscription.grace_days_left} Days Grace`
                      : `${(activeSubscription?.core_days_left !== undefined ? activeSubscription.core_days_left : activeSubscription?.days_left) ?? 30} Days`}
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700/60 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        activeSubscription?.is_expired
                          ? "w-0 bg-red-500"
                          : activeSubscription?.is_grace_period
                          ? "w-1/6 bg-amber-500"
                          : "w-3/4 bg-emerald-500 dark:bg-emerald-400"
                      )}
                    />
                  </div>
                </div>

                {/* Stat 2: Active Modules Count */}
                <div className="bg-white/80 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 rounded-2xl p-3.5 space-y-1.5 backdrop-blur-md shadow-2xs">
                  <div className="flex items-center justify-between text-slate-400 dark:text-slate-400 text-[11px] font-semibold">
                    <span>Active Modules</span>
                    <PackageOpen size={13} className="text-slate-400" />
                  </div>
                  <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white font-heading">
                    {activeSubscription?.is_all_access
                      ? 'All Modules'
                      : `${subscribedAddons.length} Installed`}
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 size={10} /> Live & operational
                  </div>
                </div>

                {/* Stat 3: Valid Until Date */}
                <div className="bg-white/80 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 rounded-2xl p-3.5 space-y-1.5 backdrop-blur-md shadow-2xs">
                  <div className="flex items-center justify-between text-slate-400 dark:text-slate-400 text-[11px] font-semibold">
                    <span>Renewal Date</span>
                    <Receipt size={13} className="text-slate-400" />
                  </div>
                  <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white font-heading truncate">
                    {activeSubscription?.current_period_end
                      ? new Date(activeSubscription.current_period_end).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                      : 'Active Term'}
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                    Official GST statement
                  </div>
                </div>

                {/* Stat 4: Cloud Status */}
                <div className="bg-white/80 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 rounded-2xl p-3.5 space-y-1.5 backdrop-blur-md shadow-2xs">
                  <div className="flex items-center justify-between text-slate-400 dark:text-slate-400 text-[11px] font-semibold">
                    <span>Cloud Status</span>
                    <Globe size={13} className="text-slate-400" />
                  </div>
                  <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white font-heading flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/50" />
                    <span>99.9% Uptime</span>
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                    Realtime cloud routing
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Active Entitlements & Features Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers size={18} className="text-primary" />
                  Your Unlocked Features & Add-ons
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  All active features running for your registered shop.
                </p>
              </div>

              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-xl">
                {activeSubscription?.is_all_access ? 'All Features Unlocked' : `${subscribedAddons.length + 3} Features Active`}
              </span>
            </div>

            {/* Core Default Free System Features */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                  <Globe size={18} />
                </div>
                <div className="space-y-0.5 flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">Digital QR Menu & Scans</h4>
                    <span className="text-[9px] font-bold text-teal-600 bg-teal-50 dark:bg-teal-950/40 px-1.5 py-0.5 rounded">Core Free</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Unlimited customer menu scans & live dish viewing.</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                  <Layers size={18} />
                </div>
                <div className="space-y-0.5 flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">Catalog & Category Engine</h4>
                    <span className="text-[9px] font-bold text-teal-600 bg-teal-50 dark:bg-teal-950/40 px-1.5 py-0.5 rounded">Core Free</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Manage categories, menu items, dietary tags & pricing.</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                  <Users size={18} />
                </div>
                <div className="space-y-0.5 flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">Staff Accounts & Permissions</h4>
                    <span className="text-[9px] font-bold text-teal-600 bg-teal-50 dark:bg-teal-950/40 px-1.5 py-0.5 rounded">Core Free</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Multi-role employee invitations and granular access.</p>
                </div>
              </div>

              {/* Subscribed Add-on Modules */}
              {subscribedAddons.map((addon) => {
                const modExp = activeSubscription?.module_expirations?.[addon.id];
                const modDaysLeft = modExp?.days_left !== undefined 
                  ? modExp.days_left 
                  : (activeSubscription?.is_all_access ? activeSubscription?.days_left : (activeSubscription?.core_days_left ?? activeSubscription?.days_left));

                const HeaderIcon = CATEGORY_HEADER_ICONS[addon.category] || Sparkles;

                return (
                  <div key={addon.id} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <HeaderIcon size={18} />
                    </div>
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">{addon.name}</h4>
                        <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 rounded">
                          {modDaysLeft !== undefined ? `${modDaysLeft}d Left` : 'Active'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">{addon.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick FAQ / Guarantee Box */}
          <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-primary flex items-center justify-center shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Sequential Subscription Stacking</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Renewing or purchasing new add-ons automatically extends your current active period without losing any remaining days.
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleTabChange('invoices')}
              className="rounded-xl font-bold text-xs shrink-0 cursor-pointer"
            >
              <FileText size={14} />
              <span>View Past Invoices</span>
            </Button>
          </div>

        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: EXPLORE & UPGRADE PLANS (MARKETPLACE)                         */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'marketplace' && (
        <div className="animate-fade-in space-y-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* LEFT COLUMN: MODULES MARKETPLACE (2/3 Width) */}
            <div className="lg:col-span-2 space-y-6">
              
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

                      <div className="flex flex-col gap-3.5">
                        {features.map((feature) => {
                          const isSelected = selectedFeatures.has(feature.id);
                          const isDirectSubscribed = activeSubscription?.is_all_access || (
                            Array.isArray(activeSubscription?.active_modules) && (
                              activeSubscription.active_modules.includes(feature.id) ||
                              (feature.id === 'analytics-advanced' && (
                                activeSubscription.active_modules.includes('analytics-advanced-filters') ||
                                activeSubscription.active_modules.includes('analytics-customer-insights')
                              ))
                            )
                          );
                          const isMemberCountIncludedInActiveDetails = feature.id === 'member-count' && hasActiveMemberDetails;
                          const isMemberCountIncludedInSelectedDetails = feature.id === 'member-count' && (selectedFeatures.has('member-details') || isAllAccess);
                          const isAlreadySubscribed = isDirectSubscribed || isMemberCountIncludedInActiveDetails;

                          const featurePrice = billingCycle === 'yearly' ? (feature.yearly_price ?? feature.price * 10) : (feature.monthly_price ?? feature.price);

                          const moduleTheme = MODULE_THEMES[feature.id] || {
                            icon: CATEGORY_HEADER_ICONS[feature.category] || Layers,
                            iconColor: 'text-primary',
                            bgLight: 'bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-900/40',
                            benefits: ['Instant Activation', 'Cloud Synchronized', 'Included in All-Access'],
                          };
                          const ModuleIcon = moduleTheme.icon;

                          return (
                            <div
                              key={feature.id}
                              onClick={() => toggleFeature(feature.id)}
                              className={cn(
                                "group rounded-3xl p-5 sm:p-6 transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 cursor-pointer select-none relative overflow-hidden border",
                                isSelected
                                  ? "bg-gradient-to-br from-orange-500/[0.07] via-white to-amber-500/[0.04] dark:from-orange-950/40 dark:via-slate-900 dark:to-amber-950/20 border-primary ring-2 ring-primary/25 shadow-lg shadow-orange-500/10 -translate-y-0.5"
                                  : isAlreadySubscribed
                                  ? "bg-white dark:bg-slate-900 border-emerald-500/30 dark:border-emerald-500/20 hover:border-emerald-500/60 shadow-xs hover:shadow-md hover:-translate-y-0.5"
                                  : isMemberCountIncludedInSelectedDetails
                                  ? "bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/50 shadow-xs"
                                  : "bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs hover:shadow-md hover:-translate-y-0.5"
                              )}
                            >
                              {/* Selected glow indicator stripe */}
                              {isSelected && (
                                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-orange-400 to-amber-500" />
                              )}

                              {/* Left: App Icon + Content */}
                              <div className="flex items-start gap-4 flex-1 min-w-0">
                                <div className={cn(
                                  "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-transform duration-200 group-hover:scale-105 shadow-2xs",
                                  moduleTheme.bgLight
                                )}>
                                  <ModuleIcon size={22} className={moduleTheme.iconColor} />
                                </div>

                                <div className="space-y-1.5 flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={cn("text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-lg tracking-wider", tagStyle)}>
                                      {feature.category}
                                    </span>

                                    {isSelected ? (
                                      <span className="bg-primary text-white text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs animate-fade-in">
                                        <Check size={11} strokeWidth={3} /> Selected
                                      </span>
                                    ) : isMemberCountIncludedInActiveDetails ? (
                                      <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200 dark:border-emerald-800/60">
                                        <CheckCircle2 size={11} className="text-emerald-600 dark:text-emerald-400" /> Included in Active Plan
                                      </span>
                                    ) : isMemberCountIncludedInSelectedDetails ? (
                                      <span className="bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-blue-200 dark:border-blue-800/60">
                                        <CheckCircle2 size={11} className="text-blue-600 dark:text-blue-400" /> Included with Details
                                      </span>
                                    ) : isAlreadySubscribed ? (
                                      <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200 dark:border-emerald-800/60">
                                        <CheckCircle2 size={11} className="text-emerald-600 dark:text-emerald-400" /> Currently Active
                                      </span>
                                    ) : null}
                                  </div>

                                  <h4 className={cn(
                                    "font-bold text-base sm:text-lg leading-tight transition-colors",
                                    isSelected ? "text-primary dark:text-orange-400 font-extrabold" : "text-slate-900 dark:text-white"
                                  )}>
                                    {feature.name}
                                  </h4>

                                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
                                    {feature.description}
                                  </p>

                                  {/* Feature Micro-benefits chips */}
                                  {moduleTheme.benefits && moduleTheme.benefits.length > 0 && (
                                    <div className="flex items-center gap-2 pt-1.5 flex-wrap">
                                      {moduleTheme.benefits.map((b: string, i: number) => (
                                        <span
                                          key={i}
                                          className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 bg-slate-100/90 dark:bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700/60"
                                        >
                                          <span className="w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-500" />
                                          {b}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Right: Pricing & Tactile Action Button */}
                              <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center gap-3 shrink-0 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                                <div className="text-left sm:text-right">
                                  <div className="flex items-baseline gap-1">
                                    <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-heading tracking-tight">
                                      {countryConfig.symbol}{featurePrice}
                                    </span>
                                    <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold">
                                      /{billingCycle === 'yearly' ? 'year' : 'month'}
                                    </span>
                                  </div>
                                  {billingCycle === 'yearly' && (
                                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block sm:text-right">
                                      Save ~17% annually
                                    </span>
                                  )}
                                </div>

                                {isMemberCountIncludedInActiveDetails ? (
                                  <div className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1.5 shrink-0 select-none">
                                    <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" />
                                    <span>Included</span>
                                  </div>
                                ) : isMemberCountIncludedInSelectedDetails ? (
                                  <div className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 flex items-center gap-1.5 shrink-0 select-none">
                                    <Check size={13} strokeWidth={2.5} />
                                    <span>Included Free</span>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    className={cn(
                                      "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer select-none",
                                      isSelected
                                        ? "bg-primary text-white shadow-md shadow-primary/30 ring-2 ring-orange-400/40 scale-102"
                                        : "bg-slate-100 hover:bg-primary hover:text-white dark:bg-slate-800 dark:hover:bg-primary text-slate-700 dark:text-slate-200 hover:shadow-sm"
                                    )}
                                  >
                                    {isSelected ? (
                                      <>
                                        <Check size={14} strokeWidth={3} />
                                        <span>ADDED ✓</span>
                                      </>
                                    ) : (
                                      <span>+ Add Module</span>
                                    )}
                                  </button>
                                )}
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
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* TAB 3: BILLING & INVOICES VIEW                                      */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'invoices' && (
        <div className="space-y-6 animate-fade-in">
          
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Receipt size={20} className="text-primary" />
                  Official Billing & Tax Invoices
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Detailed tax invoice statements for all your subscription purchases.
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={fetchBillingHistory}
                disabled={isLoadingHistory}
                className="rounded-xl font-bold text-xs gap-1.5 cursor-pointer"
              >
                <RefreshCw size={13} className={isLoadingHistory ? "animate-spin" : ""} />
                <span>Refresh</span>
              </Button>
            </div>

            {isLoadingHistory ? (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <RefreshCw className="w-8 h-8 mx-auto animate-spin text-primary" />
                <p className="text-xs font-bold">Loading billing history...</p>
              </div>
            ) : historyList.length === 0 ? (
              <div className="py-16 text-center text-slate-400 space-y-3">
                <FileText className="w-12 h-12 mx-auto opacity-25" />
                <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">No Invoices Found</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  When you subscribe or renew your plans, your downloadable GST tax receipts and payment summaries will appear here.
                </p>
                <Button
                  onClick={() => handleTabChange('marketplace')}
                  size="sm"
                  className="rounded-xl font-bold text-xs mt-2"
                >
                  Explore Plans & Upgrades
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6">
                {historyList.map((item) => {
                  const currSym = item.currency === 'USD' ? '$' : item.currency === 'GBP' ? '£' : item.currency === 'AUD' ? 'A$' : item.currency === 'CAD' ? 'C$' : item.currency === 'EUR' ? '€' : '₹';
                  const invoiceDate = new Date(item.created_at || item.paid_at);
                  const formattedDate = invoiceDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                  const formattedTime = invoiceDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div
                      key={item.id}
                      className="relative bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between overflow-hidden group font-sans"
                    >
                      {/* Top Receipt Decorative Accent Stripe */}
                      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-orange-400 to-amber-500 opacity-90" />

                      {/* ── TOP SECTION: Header & Status Stamp ── */}
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/50 border border-orange-200/60 dark:border-orange-900/50 flex items-center justify-center text-primary shadow-2xs">
                              <img src={menukitLogo} alt="Menukit" className="w-4 h-4 object-contain" />
                            </div>
                            <div>
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block font-mono">
                                TAX INVOICE
                              </span>
                              <span className="text-xs font-bold text-slate-900 dark:text-white font-mono truncate max-w-[140px] block" title={`#${item.invoice_number || item.id}`}>
                                #{item.invoice_number || item.id.slice(0, 10).toUpperCase()}
                              </span>
                            </div>
                          </div>

                          {/* PAID Stamp Badge */}
                          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider">
                            <CheckCircle2 size={11} className="text-emerald-500" />
                            <span>PAID</span>
                          </div>
                        </div>

                        {/* Date & Cycle Info */}
                        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium pt-1 border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
                          <span className="flex items-center gap-1">
                            <Clock size={12} className="text-slate-400" />
                            {formattedDate}, {formattedTime}
                          </span>
                          <span className="capitalize font-semibold text-slate-700 dark:text-slate-300">
                            {item.billing_cycle || 'Monthly'} Cycle
                          </span>
                        </div>

                        {/* Purchased Plan Line Item */}
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3 space-y-1.5 border border-slate-100 dark:border-slate-800">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                              {item.is_all_access ? (
                                <>
                                  <Sparkles size={13} className="text-amber-500" />
                                  <span>All-Access Pack</span>
                                </>
                              ) : (
                                <>
                                  <PackageOpen size={13} className="text-primary" />
                                  <span>Modular Plan Subscription</span>
                                </>
                              )}
                            </span>
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs">
                              {item.is_all_access ? 'Full Suite' : `${item.purchased_modules?.length || 1} Add-ons`}
                            </span>
                          </div>

                          {!item.is_all_access && Array.isArray(item.purchased_modules) && item.purchased_modules.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {item.purchased_modules.map((modId: string, idx: number) => (
                                <span
                                  key={idx}
                                  className="text-[9px] font-semibold bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-slate-600"
                                >
                                  {modId}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ── TICKET NOTCH PERFORATION CUTOUTS & DASHED DIVIDER ── */}
                      <div className="relative my-4 flex items-center">
                        <div className="absolute -left-7 sm:-left-8 w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 shadow-inner" />
                        <div className="w-full border-t-2 border-dashed border-slate-200 dark:border-slate-800" />
                        <div className="absolute -right-7 sm:-right-8 w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 shadow-inner" />
                      </div>

                      {/* ── BOTTOM SECTION: Total & Action ── */}
                      <div className="space-y-3">
                        <div className="flex items-baseline justify-between">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                              Total Amount Paid
                            </span>
                            <span className="text-[10px] text-slate-400">
                              GST / Tax Invoice Included
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-2xl font-black text-slate-900 dark:text-white font-heading tracking-tight">
                              {currSym}{item.amount}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handlePrintInvoice(item.id)}
                          className="w-full py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-primary hover:text-white dark:bg-slate-800 dark:hover:bg-primary text-slate-800 dark:text-slate-200 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs hover:shadow-md hover:scale-[1.01] active:scale-[0.99]"
                        >
                          <Printer size={14} />
                          <span>View & Print Tax Receipt</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>

        </div>
      )}

      {/* ── MODAL: MOCK GATEWAY PAYMENT SIMULATOR ─────────────────────────── */}
      {mockGatewayOrder && createPortal(
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
                className="py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-800 font-bold text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleMockPaymentSuccess}
                disabled={isSubmitting}
                className="py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-xs shadow-md hover:brightness-110 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isSubmitting ? 'Verifying...' : 'Simulate Success ✓'}
              </button>
            </div>
          </div>
        </div>
      , document.body)}

    </div>
  );
}