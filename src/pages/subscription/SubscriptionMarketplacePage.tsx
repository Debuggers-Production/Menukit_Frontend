import { createPortal } from 'react-dom';
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { useHeaderStore } from '@/store/useHeaderStore';
import { HeaderActions } from '@/components/HeaderActions';
import { 
  Check, ShoppingCart, Zap, PackageOpen, Award, Layers, ShieldCheck, 
  ArrowRight, CheckCircle2, Clock, ChevronDown, ChevronUp, AlertCircle, AlertTriangle, 
  Gift, FileText, Printer, Receipt, Lock, RefreshCw, Globe, Users, Search, Palette, BarChart3,
  CreditCard, Compass, HelpCircle, ExternalLink, Package, Store, Crown, Megaphone
} from 'lucide-react';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { api } from '@/services/api';
import menukitLogo from '@/assets/menukit-logo.svg';
import { CountryFlag } from '@/components/CountryFlag';
import { Button } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

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
  'Marketing': Megaphone,
  'Branding': Palette,
  'Analytics': BarChart3,
  'Discovery': Compass,
  'Business': Store,
  'Store': Store,
  'All-Access': Crown,
  'Security': ShieldCheck,
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
  const [isAutopay, setIsAutopay] = useState<boolean>(true);
  const [isTogglingAutopay, setIsTogglingAutopay] = useState<boolean>(false);
  const [showDisableAutopayModal, setShowDisableAutopayModal] = useState<boolean>(false);
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

  const handleToggleAutopay = async (newVal: boolean) => {
    setIsTogglingAutopay(true);
    try {
      const res = await api.post('/subscription/toggle-autopay', { auto_renew: newVal });
      if (res.data.needs_mandate_setup) {
        toast((_t) => (
          <div className="flex flex-col gap-1 text-left">
            <span className="font-bold text-xs text-slate-900 dark:text-white">Auto-Pay Mandate Required</span>
            <span className="text-[11px] text-slate-500">Your previous bank mandate was cancelled. Please authorize a new recurring mandate to reactivate Auto-Pay.</span>
          </div>
        ), { icon: '💳', duration: 5000 });
        setBillingCycle(activeSubscription?.billing_cycle || 'monthly');
        setIsAllAccess(activeSubscription?.is_all_access ?? true);
        setIsAutopay(true);
        handleTabChange('marketplace');
        return;
      }
      toast.success(res.data.message || (newVal ? 'Autopay enabled' : 'Autopay disabled'));
      if (activeSubscription) {
        setActiveSubscription({ ...activeSubscription, auto_renew: newVal });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update autopay setting');
    } finally {
      setIsTogglingAutopay(false);
    }
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
        is_autopay: isAutopay,
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

      const options: any = {
        key: orderData.key,
        name: "Menukit",
        description: `Subscription: ${isAllAccess ? 'All-Access Pack' : 'Custom Modules'} (${billingCycle === 'yearly' ? 'Yearly Auto-Pay' : 'Monthly Auto-Pay'})`,
        handler: async function (response: any) {
          try {
            await api.post('/subscription/verify', {
              razorpay_order_id: response.razorpay_order_id || orderData.order_id,
              razorpay_subscription_id: response.razorpay_subscription_id || orderData.subscription_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            confetti({ particleCount: 120, spread: 90, origin: { y: 0.5 } });
            toast.success(orderData.subscription_id ? "Auto-Pay mandate approved! Subscription active." : "Payment successful! Subscription activated.");
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

      if (orderData.subscription_id) {
        // Razorpay Recurring Subscriptions / AutoPay Mandate (UPI Autopay, Card Mandate, e-NACH)
        options.subscription_id = orderData.subscription_id;
      } else {
        // Direct One-Time Payment Order (QR code, UPI, Netbanking)
        options.order_id = orderData.order_id;
        options.amount = orderData.amount;
        options.currency = orderData.currency;
      }

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
    <div className="space-y-4 w-full pb-20 animate-fade-in relative">
      
      {/* ── TOP BAR HEADER ACTIONS: COUNTRY SELECTOR ───────────────────── */}
      <HeaderActions>
        <div ref={countryDropdownRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
            className="bg-card hover:bg-muted border border-border px-2.5 h-8 rounded-md inline-flex items-center gap-1.5 text-xs font-semibold text-foreground transition-all shadow-2xs hover:border-primary/40 cursor-pointer"
            title="Change Country & Currency"
          >
            <CountryFlag code={countryConfig.code} size={15} />
            <span className="font-bold">{countryConfig.name}</span>
            <span className="text-muted-foreground font-mono text-[11px]">({countryConfig.currency} {countryConfig.symbol})</span>
            <ChevronDown size={12} className={cn("text-muted-foreground transition-transform duration-200", isCountryDropdownOpen ? "rotate-180" : "")} />
          </button>

          {isCountryDropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-56 bg-card border border-border/80 rounded-lg shadow-xl py-1 z-50 overflow-hidden animate-fade-in">
              <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/70">
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
                    "w-full px-3 py-1.5 text-left flex items-center justify-between text-xs font-medium transition-colors cursor-pointer",
                    countryConfig.code === c.code
                      ? "bg-primary/10 text-primary font-bold"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <CountryFlag code={c.code} size={15} />
                    <span>{c.name}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground font-mono">{c.currency} {c.symbol}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </HeaderActions>

      {/* ── STICKY SEGMENTED NAVIGATION TABS ─────────────────────────── */}
      <div className="sticky top-[-12px] sm:top-[-16px] lg:top-[-20px] z-10 bg-background/95 backdrop-blur-md py-2 -mx-3 px-3 sm:-mx-4 sm:px-4 lg:-mx-5 lg:px-5 border-b border-border/80 transition-all">
        <div className="flex items-center gap-1.5 p-1 bg-card rounded-lg border border-border/80 shadow-2xs max-w-full overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => handleTabChange('my-plan')}
            className={cn(
              "flex items-center gap-1.5 px-3 h-8 rounded-md font-semibold text-xs transition-all shrink-0 cursor-pointer",
              activeTab === 'my-plan'
                ? "bg-primary text-white shadow-2xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <ShieldCheck size={14} className={activeTab === 'my-plan' ? "text-white" : "text-muted-foreground"} />
            <span>My Active Plan</span>
            {activeSubscription && (
              <span className={cn(
                "text-[9.5px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider",
                activeSubscription.is_expired
                  ? "bg-destructive text-destructive-foreground"
                  : activeSubscription.is_grace_period
                  ? "bg-amber-500 text-white"
                  : activeSubscription.is_trial
                  ? "bg-indigo-600 text-white"
                  : "bg-emerald-600 text-white"
              )}>
                {activeSubscription.is_expired ? 'Expired' : activeSubscription.is_trial ? 'Free Trial' : 'Active'}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('marketplace')}
            className={cn(
              "flex items-center gap-1.5 px-3 h-8 rounded-md font-semibold text-xs transition-all shrink-0 cursor-pointer",
              activeTab === 'marketplace'
                ? "bg-primary text-white shadow-2xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <Zap size={14} className={activeTab === 'marketplace' ? "text-white" : "text-muted-foreground"} />
            <span>Explore Plans & Add-ons</span>
            <span className="text-[9.5px] bg-primary/15 text-primary font-bold px-1.5 py-0.5 rounded-md">
              Modular
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('invoices')}
            className={cn(
              "flex items-center gap-1.5 px-3 h-8 rounded-md font-semibold text-xs transition-all shrink-0 cursor-pointer",
              activeTab === 'invoices'
                ? "bg-primary text-white shadow-2xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <Receipt size={14} className={activeTab === 'invoices' ? "text-white" : "text-muted-foreground"} />
            <span>Billing & Invoices</span>
            {historyList.length > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-muted text-muted-foreground">
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
        <div className="space-y-4 animate-fade-in">
          
          {/* ── ACTIVE PLAN HERO CARD ──────────────────── */}
          <div className={cn(
            "rounded-lg p-4 sm:p-5 border relative overflow-hidden transition-all shadow-2xs",
            activeSubscription?.is_expired
              ? "bg-destructive/[0.04] border-destructive/30"
              : activeSubscription?.is_grace_period
              ? "bg-amber-500/[0.04] border-amber-500/30"
              : activeSubscription?.is_trial
              ? "bg-indigo-500/[0.04] border-indigo-500/30"
              : "bg-card border-border/80"
          )}>
            <div className="relative z-10 space-y-4">
              
              {/* Top Row: Plan Tier, Status, and Action Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-md flex items-center justify-center shrink-0 shadow-2xs border",
                    activeSubscription?.is_expired
                      ? "bg-destructive/10 border-destructive/20 text-destructive"
                      : activeSubscription?.is_grace_period
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
                      : activeSubscription?.is_trial
                      ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400"
                      : "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  )}>
                    {activeSubscription?.is_expired ? (
                      <AlertCircle className="w-5 h-5" />
                    ) : activeSubscription?.is_grace_period ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : activeSubscription?.is_trial ? (
                      <Gift className="w-5 h-5" />
                    ) : (
                      <ShieldCheck className="w-5 h-5" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
                        Current Subscription
                      </span>
                      <span className={cn(
                        "text-[9.5px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1.5 border shadow-2xs",
                        activeSubscription?.is_expired
                          ? "bg-destructive/10 text-destructive border-destructive/20"
                          : activeSubscription?.is_grace_period
                          ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
                          : activeSubscription?.is_trial
                          ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20"
                          : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                      )}>
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          activeSubscription?.is_expired ? "bg-destructive" : activeSubscription?.is_grace_period ? "bg-amber-500" : activeSubscription?.is_trial ? "bg-indigo-500" : "bg-emerald-500 animate-pulse"
                        )} />
                        {activeSubscription?.is_expired ? 'Expired' : activeSubscription?.is_grace_period ? 'Grace Period' : activeSubscription?.is_trial ? 'Free Trial' : 'Active'}
                      </span>
                    </div>

                    <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
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
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => handleTabChange('marketplace')}
                    className="bg-primary hover:bg-primary/90 text-white font-semibold text-xs h-8.5 px-3.5 rounded-md shadow-2xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                  >
                    <Zap size={13} className="fill-current" />
                    <span>{activeSubscription?.is_expired ? 'Renew Subscription' : 'Upgrade / Add Modules'}</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              </div>

              {/* Metric Stat Cards Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
                {/* Stat 1: Remaining Days & Progress Gauge */}
                <div className="bg-muted/40 border border-border/80 rounded-lg p-3 space-y-1 shadow-2xs">
                  <div className="flex items-center justify-between text-muted-foreground text-[11px] font-medium">
                    <span>Remaining Time</span>
                    <Clock size={12} />
                  </div>
                  <div className="text-base sm:text-lg font-bold text-foreground">
                    {activeSubscription?.is_expired
                      ? '0 Days'
                      : activeSubscription?.is_grace_period
                      ? `${activeSubscription.grace_days_left} Days Grace`
                      : `${(activeSubscription?.core_days_left !== undefined ? activeSubscription.core_days_left : activeSubscription?.days_left) ?? 30} Days`}
                  </div>
                  <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        activeSubscription?.is_expired
                          ? "w-0 bg-destructive"
                          : activeSubscription?.is_grace_period
                          ? "w-1/6 bg-amber-500"
                          : "w-3/4 bg-emerald-500"
                      )}
                    />
                  </div>
                </div>

                {/* Stat 2: Active Modules Count */}
                <div className="bg-muted/40 border border-border/80 rounded-lg p-3 space-y-1 shadow-2xs">
                  <div className="flex items-center justify-between text-muted-foreground text-[11px] font-medium">
                    <span>Active Modules</span>
                    <PackageOpen size={12} />
                  </div>
                  <div className="text-base sm:text-lg font-bold text-foreground">
                    {activeSubscription?.is_all_access
                      ? 'All Modules'
                      : `${subscribedAddons.length} Installed`}
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 size={10} /> Live & operational
                  </div>
                </div>

                {/* Stat 3: Valid Until Date */}
                <div className="bg-muted/40 border border-border/80 rounded-lg p-3 space-y-1 shadow-2xs">
                  <div className="flex items-center justify-between text-muted-foreground text-[11px] font-medium">
                    <span>Renewal Date</span>
                    <Receipt size={12} />
                  </div>
                  <div className="text-base sm:text-lg font-bold text-foreground truncate">
                    {activeSubscription?.current_period_end
                      ? new Date(activeSubscription.current_period_end).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                      : 'Active Term'}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-medium">
                    Official GST statement
                  </div>
                </div>

                {/* Stat 4: Cloud Status */}
                <div className="bg-muted/40 border border-border/80 rounded-lg p-3 space-y-1 shadow-2xs">
                  <div className="flex items-center justify-between text-muted-foreground text-[11px] font-medium">
                    <span>Cloud Status</span>
                    <Globe size={12} />
                  </div>
                  <div className="text-base sm:text-lg font-bold text-foreground flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-2xs" />
                    <span>99.9% Uptime</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground font-medium">
                    Realtime cloud routing
                  </div>
                </div>
              </div>

              {/* Autopay Control Banner */}
              <div className="pt-3 border-t border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start sm:items-center gap-2.5">
                  <div className={cn(
                    "w-8 h-8 rounded-md flex items-center justify-center shrink-0 border transition-all",
                    Boolean(activeSubscription?.auto_renew)
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : "bg-muted text-muted-foreground border-border"
                  )}>
                    <RefreshCw size={14} className={Boolean(activeSubscription?.auto_renew) ? "animate-spin-slow" : ""} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-foreground">
                        Subscription Auto-Pay
                      </span>
                      <span className={cn(
                        "text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1",
                        Boolean(activeSubscription?.auto_renew)
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-muted text-muted-foreground border border-border"
                      )}>
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          Boolean(activeSubscription?.auto_renew) ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"
                        )} />
                        {Boolean(activeSubscription?.auto_renew) ? "AUTOPAY ACTIVE" : "AUTOPAY OFF"}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-bold uppercase font-mono">
                        ({activeSubscription?.billing_cycle === 'yearly' ? 'Yearly Cycle' : 'Monthly Cycle'})
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {Boolean(activeSubscription?.auto_renew)
                        ? `Automatically renews every ${activeSubscription?.billing_cycle === 'yearly' ? 'year' : 'month'} on ${activeSubscription?.current_period_end ? new Date(activeSubscription.current_period_end).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'renewal date'}. Turn off anytime.`
                        : `Auto-pay is currently off. Your subscription will pause when the current cycle ends on ${activeSubscription?.current_period_end ? new Date(activeSubscription.current_period_end).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'renewal date'}.`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap self-end sm:self-center shrink-0">
                  {/* Cycle Switcher Button */}
                  {activeSubscription?.billing_cycle === 'monthly' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setBillingCycle('yearly');
                        setIsAllAccess(true);
                        setIsAutopay(true);
                        handleTabChange('marketplace');
                      }}
                      className="px-2.5 h-7.5 rounded-md bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold flex items-center gap-1 border border-primary/25 transition-all cursor-pointer shadow-2xs active:scale-95"
                    >
                      <Crown size={12} />
                      <span>Switch to Yearly (Save 2 Mos)</span>
                      <ArrowRight size={11} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setBillingCycle('monthly');
                        setIsAllAccess(true);
                        setIsAutopay(true);
                        handleTabChange('marketplace');
                      }}
                      className="px-2.5 h-7.5 rounded-md bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold flex items-center gap-1 border border-border transition-all cursor-pointer shadow-2xs active:scale-95"
                    >
                      <span>Switch to Monthly</span>
                      <ArrowRight size={11} />
                    </button>
                  )}

                  {/* Turn off / Turn on Toggle with Modal Confirmation */}
                  <div className="flex items-center gap-2 pl-2 border-l border-border">
                    <span className="text-xs font-medium text-muted-foreground">
                      {Boolean(activeSubscription?.auto_renew) ? 'Auto-Pay On' : 'Auto-Pay Off'}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={Boolean(activeSubscription?.auto_renew)}
                      disabled={isTogglingAutopay}
                      onClick={() => {
                        if (Boolean(activeSubscription?.auto_renew)) {
                          setShowDisableAutopayModal(true);
                        } else {
                          handleToggleAutopay(true);
                        }
                      }}
                      className={cn(
                        "w-10 h-5 flex items-center rounded-full p-0.5 transition-colors duration-200 cursor-pointer disabled:opacity-50",
                        Boolean(activeSubscription?.auto_renew) ? "bg-emerald-500" : "bg-muted border border-input"
                      )}
                    >
                      <div
                        className={cn(
                          "bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200",
                          Boolean(activeSubscription?.auto_renew) ? "translate-x-5" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Active Entitlements & Features Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Layers size={15} className="text-primary" />
                  <span>Your Unlocked Features & Add-ons</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  All active features running for your registered shop.
                </p>
              </div>

              <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-0.5 rounded-md border border-border/60">
                {activeSubscription?.is_all_access ? 'All Features Unlocked' : `${subscribedAddons.length + 3} Features Active`}
              </span>
            </div>

            {/* Core Default Free System Features */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              <div className="p-3 rounded-lg bg-card border border-border/80 shadow-2xs flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 border border-teal-500/20">
                  <Globe size={15} />
                </div>
                <div className="space-y-0.5 flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="font-bold text-xs text-foreground truncate">Digital QR Menu & Scans</h4>
                    <span className="text-[9px] font-bold text-teal-600 bg-teal-50 dark:bg-teal-950/40 px-1.5 py-0.5 rounded-md">Core Free</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Unlimited customer menu scans & live dish viewing.</p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-card border border-border/80 shadow-2xs flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 border border-teal-500/20">
                  <Layers size={15} />
                </div>
                <div className="space-y-0.5 flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="font-bold text-xs text-foreground truncate">Catalog & Category Engine</h4>
                    <span className="text-[9px] font-bold text-teal-600 bg-teal-50 dark:bg-teal-950/40 px-1.5 py-0.5 rounded-md">Core Free</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Manage categories, menu items, dietary tags & pricing.</p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-card border border-border/80 shadow-2xs flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 border border-teal-500/20">
                  <Users size={15} />
                </div>
                <div className="space-y-0.5 flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="font-bold text-xs text-foreground truncate">Staff Accounts & Permissions</h4>
                    <span className="text-[9px] font-bold text-teal-600 bg-teal-50 dark:bg-teal-950/40 px-1.5 py-0.5 rounded-md">Core Free</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Multi-role employee invitations and granular access.</p>
                </div>
              </div>

              {/* Subscribed Add-on Modules */}
              {subscribedAddons.map((addon) => {
                const modExp = activeSubscription?.module_expirations?.[addon.id];
                const modDaysLeft = modExp?.days_left !== undefined 
                  ? modExp.days_left 
                  : (activeSubscription?.is_all_access ? activeSubscription?.days_left : (activeSubscription?.core_days_left ?? activeSubscription?.days_left));

                const HeaderIcon = CATEGORY_HEADER_ICONS[addon.category] || Package;

                return (
                  <div key={addon.id} className="p-3 rounded-lg bg-card border border-border/80 shadow-2xs flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                      <HeaderIcon size={15} />
                    </div>
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="font-bold text-xs text-foreground truncate">{addon.name}</h4>
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 rounded-md">
                          {modDaysLeft !== undefined ? `${modDaysLeft}d Left` : 'Active'}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-tight">{addon.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick FAQ / Guarantee Box */}
          <div className="p-3.5 rounded-lg bg-muted/40 border border-border/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                <ShieldCheck size={16} />
              </div>
              <div>
                <h4 className="font-bold text-xs text-foreground">Sequential Subscription Stacking</h4>
                <p className="text-xs text-muted-foreground">
                  Renewing or purchasing new add-ons automatically extends your current active period without losing any remaining days.
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleTabChange('invoices')}
              className="rounded-md font-semibold text-xs shrink-0 cursor-pointer h-8"
            >
              <FileText size={13} />
              <span>View Past Invoices</span>
            </Button>
          </div>

        </div>
      )}

            {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: EXPLORE & UPGRADE PLANS (MARKETPLACE)                         */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'marketplace' && (
        <div className="animate-fade-in space-y-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT COLUMN: MODULES MARKETPLACE */}
            <div className="lg:col-span-7 xl:col-span-8 min-w-0 space-y-5">
              
              {/* 2-COLUMN SPLIT HIGHLIGHT CARDS (Left: Included Free Bundle, Right: All-Access Pack) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-stretch">
                
                {/* HIGHLIGHT 1: Included Free Core System Card */}
                <div className="bg-card border-2 border-teal-500/40 rounded-lg p-4 shadow-2xs flex flex-col justify-between space-y-3 relative overflow-hidden h-full">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <img src={menukitLogo} alt="Menukit" className="w-4 h-4 object-contain" />
                        <span className="bg-teal-600 text-white text-[9.5px] font-bold px-2 py-0.5 rounded-md shadow-2xs uppercase tracking-wider">
                          100% Free Bundle
                        </span>
                      </div>
                      <span className="text-[9.5px] font-bold text-teal-700 bg-teal-50 dark:bg-teal-950/60 dark:text-teal-300 px-2 py-0.5 rounded-md shrink-0 border border-teal-200 dark:border-teal-800">
                        Active Default
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-sm text-foreground">Core System Features</h3>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        Digital QR Menu, Category & Item Catalog, Staff Accounts & Permissions, Unlimited Menu Scans, Settlements Engine.
                      </p>
                    </div>

                    <div className="space-y-1 pt-1 text-xs font-semibold text-teal-700 dark:text-teal-300">
                      <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-teal-500 shrink-0" /> Digital QR Menu & Scans</span>
                      <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-teal-500 shrink-0" /> Category & Item Catalog</span>
                      <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-teal-500 shrink-0" /> Staff Accounts & Permissions</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border/80 flex items-baseline justify-between">
                    <div>
                      <span className="text-[9.5px] font-bold text-muted-foreground block uppercase tracking-wider">Plan Price</span>
                      <span className="text-2xl font-black text-teal-600 dark:text-teal-400 font-heading">{countryConfig.symbol}0</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-medium tracking-tight text-right">
                      * T&C apply
                    </span>
                  </div>
                </div>

                {/* HIGHLIGHT 2: All-Access Pack Hero Card */}
                <div 
                  onClick={() => handlePlanTypeChange(isAllAccess ? 'custom' : 'all-access')}
                  className={cn(
                    "rounded-lg p-4 border-2 transition-all duration-200 cursor-pointer relative overflow-hidden shadow-2xs group flex flex-col justify-between space-y-3 h-full",
                    isAllAccess 
                      ? "bg-primary/5 dark:bg-primary/10 border-primary ring-2 ring-primary/20 text-foreground"
                      : "bg-card border-border/80 hover:border-primary/50 text-foreground"
                  )}
                >
                  <div className="space-y-2.5 relative z-10">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-md bg-primary/10 text-primary p-1 flex items-center justify-center shrink-0 border border-primary/20">
                          <img src={menukitLogo} alt="Menukit" className="w-full h-full object-contain" />
                        </div>
                        <span className="bg-primary text-white text-[9.5px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider shadow-2xs flex items-center gap-1">
                          <Award size={11} /> BEST VALUE
                        </span>
                      </div>

                      <button
                        type="button"
                        className={cn(
                          "w-6 h-6 rounded-md flex items-center justify-center transition-all shrink-0 cursor-pointer",
                          isAllAccess 
                            ? "bg-primary text-white ring-2 ring-primary/20" 
                            : "bg-muted text-muted-foreground hover:bg-primary/15 hover:text-primary"
                        )}
                      >
                        <Check size={14} strokeWidth={3} />
                      </button>
                    </div>

                    <div>
                      <h3 className="font-bold text-sm text-foreground tracking-tight">{allAccessPlan.name || 'All-Access Pack'}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                        {allAccessPlan.description || 'Unlock all current and future add-on modules for one flat subscription.'}
                      </p>
                    </div>

                    <div className="space-y-1 pt-1 text-xs font-semibold text-primary">
                      <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-primary shrink-0" /> Save Big vs Individual Modules</span>
                      <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-primary shrink-0" /> Includes All Marketplace Add-ons</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border/80 flex items-baseline justify-between relative z-10">
                    <div>
                      <span className="text-[9.5px] font-bold text-muted-foreground block uppercase tracking-wider">All-Access Price</span>
                      <div className="text-2xl font-black text-foreground font-heading">
                        {countryConfig.symbol}{billingCycle === 'yearly' ? (allAccessPlan.yearly_price ?? allAccessPlan.price * 10) : (allAccessPlan.monthly_price ?? allAccessPlan.price)}
                        <span className="text-xs font-semibold text-muted-foreground">/{billingCycle === 'yearly' ? 'yr' : 'mo'}</span>
                      </div>
                    </div>
                    {billingCycle === 'yearly' ? (
                      <span className="text-[9.5px] bg-emerald-500 text-white font-bold px-1.5 py-0.5 rounded-md shadow-2xs">
                        2M FREE
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground font-semibold">
                        Single Flat Rate
                      </span>
                    )}
                  </div>
                </div>

              </div>

              {/* MARKETPLACE MODULE CARDS GRID BY CATEGORY */}
              <div className="space-y-5">
                {Object.entries(categories).map(([category, features]) => {
                  const HeaderIcon = CATEGORY_HEADER_ICONS[category] || Layers;
                  const tagStyle = CATEGORY_TAG_STYLES[category] || 'bg-muted text-muted-foreground';

                  return (
                    <div key={category} className="space-y-2.5">
                      <div className="flex items-center gap-2 border-b border-border/80 pb-1.5">
                        <HeaderIcon size={14} className="text-primary" />
                        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                          {category}
                        </h3>
                      </div>

                      <div className="flex flex-col gap-2.5">
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
                            bgLight: 'bg-muted text-foreground border-border',
                            benefits: ['Instant Activation', 'Cloud Synchronized', 'Included in All-Access'],
                          };
                          const ModuleIcon = moduleTheme.icon;

                          return (
                            <div
                              key={feature.id}
                              onClick={() => toggleFeature(feature.id)}
                              className={cn(
                                "group rounded-lg p-3.5 transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 cursor-pointer select-none relative overflow-hidden border shadow-2xs",
                                isSelected
                                  ? "bg-primary/[0.04] dark:bg-primary/[0.08] border-primary ring-1 ring-primary/30"
                                  : isAlreadySubscribed
                                  ? "bg-card border-emerald-500/40 hover:border-emerald-500/70"
                                  : isMemberCountIncludedInSelectedDetails
                                  ? "bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/50"
                                  : "bg-card border-border/80 hover:border-border hover:shadow-xs"
                              )}
                            >
                              {/* Selected indicator stripe */}
                              {isSelected && (
                                <div className="absolute top-0 left-0 bottom-0 w-1 bg-primary" />
                              )}

                              {/* Left: App Icon + Content */}
                              <div className="flex items-start gap-3 flex-1 min-w-0 pl-1">
                                <div className={cn(
                                  "w-9 h-9 rounded-md flex items-center justify-center shrink-0 border transition-transform duration-200 group-hover:scale-105 shadow-2xs",
                                  moduleTheme.bgLight
                                )}>
                                  <ModuleIcon size={17} className={moduleTheme.iconColor} />
                                </div>

                                <div className="space-y-1 flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className={cn("text-[9px] font-bold uppercase px-2 py-0.5 rounded-md tracking-wider", tagStyle)}>
                                      {feature.category}
                                    </span>

                                    {isSelected ? (
                                      <span className="bg-primary text-white text-[9.5px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                                        <Check size={11} strokeWidth={3} /> Selected
                                      </span>
                                    ) : isMemberCountIncludedInActiveDetails ? (
                                      <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 text-[9.5px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border border-emerald-200 dark:border-emerald-800/60">
                                        <CheckCircle2 size={11} className="text-emerald-600 dark:text-emerald-400" /> Active Plan
                                      </span>
                                    ) : isMemberCountIncludedInSelectedDetails ? (
                                      <span className="bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 text-[9.5px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border border-blue-200 dark:border-blue-800/60">
                                        <CheckCircle2 size={11} className="text-blue-600 dark:text-blue-400" /> With Details
                                      </span>
                                    ) : isAlreadySubscribed ? (
                                      <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 text-[9.5px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border border-emerald-200 dark:border-emerald-800/60">
                                        <CheckCircle2 size={11} className="text-emerald-600 dark:text-emerald-400" /> Currently Active
                                      </span>
                                    ) : null}
                                  </div>

                                  <h4 className={cn(
                                    "font-bold text-xs sm:text-sm leading-tight transition-colors",
                                    isSelected ? "text-primary font-bold" : "text-foreground"
                                  )}>
                                    {feature.name}
                                  </h4>

                                  <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                                    {feature.description}
                                  </p>

                                  {/* Feature Micro-benefits chips */}
                                  {moduleTheme.benefits && moduleTheme.benefits.length > 0 && (
                                    <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                                      {moduleTheme.benefits.map((b: string, i: number) => (
                                        <span
                                          key={i}
                                          className="inline-flex items-center gap-1 text-[10.5px] font-medium text-muted-foreground bg-muted/70 px-2 py-0.5 rounded-md border border-border/60"
                                        >
                                          <span className="w-1 h-1 rounded-full bg-primary" />
                                          {b}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Right: Pricing & Action Button */}
                              <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center gap-2.5 shrink-0 w-full sm:w-auto pt-2.5 sm:pt-0 border-t sm:border-t-0 border-border/80">
                                <div className="text-left sm:text-right">
                                  <div className="flex items-baseline gap-1">
                                    <span className="text-xl sm:text-2xl font-black text-foreground font-heading tracking-tight">
                                      {countryConfig.symbol}{featurePrice}
                                    </span>
                                    <span className="text-[11px] text-muted-foreground font-semibold">
                                      /{billingCycle === 'yearly' ? 'yr' : 'mo'}
                                    </span>
                                  </div>
                                  {billingCycle === 'yearly' && (
                                    <span className="text-[9.5px] font-bold text-emerald-600 dark:text-emerald-400 block sm:text-right">
                                      Save ~17% annually
                                    </span>
                                  )}
                                </div>

                                {isMemberCountIncludedInActiveDetails ? (
                                  <div className="px-3 h-8 rounded-md text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1.5 shrink-0 select-none">
                                    <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" />
                                    <span>Included</span>
                                  </div>
                                ) : isMemberCountIncludedInSelectedDetails ? (
                                  <div className="px-3 h-8 rounded-md text-xs font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 flex items-center gap-1.5 shrink-0 select-none">
                                    <Check size={13} strokeWidth={2.5} />
                                    <span>Included Free</span>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    className={cn(
                                      "px-3 h-8 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer select-none",
                                      isSelected
                                        ? "bg-primary text-white shadow-2xs ring-1 ring-primary/40"
                                        : "bg-muted hover:bg-primary hover:text-white text-foreground border border-border"
                                    )}
                                  >
                                    {isSelected ? (
                                      <>
                                        <Check size={13} strokeWidth={3} />
                                        <span>Added ✓</span>
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

            {/* RIGHT COLUMN: STICKY PAYMENT & BILL SUMMARY CARD */}
            <div className="lg:col-span-5 xl:col-span-4 min-w-0 sticky top-20 z-10 space-y-4 pt-1">
              
              <div className="bg-card border border-border/80 rounded-lg p-4 shadow-2xs space-y-4 min-w-0">
                
                {/* Header & Billing Cycle Switcher */}
                <div className="space-y-3 pb-3 border-b border-border/80">
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5 truncate">
                      <Receipt size={16} className="text-primary shrink-0" />
                      <span className="truncate">Plan & Bill Summary</span>
                    </h3>
                    <span className="text-[9.5px] font-bold uppercase px-2 py-0.5 rounded-md bg-primary/10 text-primary flex items-center gap-1 border border-primary/20 shrink-0">
                      <img src={menukitLogo} alt="Menukit" className="w-3 h-3 object-contain shrink-0" />
                      Checkout
                    </span>
                  </div>

                  {/* Billing Cycle Selector Toggle */}
                  <div className="flex items-center justify-between bg-muted p-0.5 rounded-md">
                    <button
                      type="button"
                      onClick={() => setBillingCycle('monthly')}
                      className={cn(
                        "flex-1 py-1 text-xs font-bold rounded-md transition-all text-center cursor-pointer",
                        billingCycle === 'monthly'
                          ? "bg-card text-foreground shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Monthly
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingCycle('yearly')}
                      className={cn(
                        "flex-1 py-1 text-xs font-bold rounded-md transition-all text-center cursor-pointer flex items-center justify-center gap-1",
                        billingCycle === 'yearly'
                          ? "bg-primary text-white shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Yearly
                      <span className="text-[9px] bg-emerald-500 text-white font-bold px-1.5 py-0.2 rounded-md">
                        2M Free
                      </span>
                    </button>
                  </div>
                </div>

                {/* Selected Modules Itemized List */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Selected Items ({isAllAccess ? '1 Pack' : `${activeItems.length} Modules`})
                  </span>

                  {isAllAccess ? (
                    <div className="flex items-center justify-between p-2.5 rounded-md bg-muted/40 border border-border/80 gap-2 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <img src={menukitLogo} alt="Menukit" className="w-4 h-4 object-contain shrink-0" />
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-foreground truncate">{allAccessPlan.name || 'All-Access Pack'}</h4>
                          <p className="text-[10px] text-muted-foreground truncate">All Modules Unlocked</p>
                        </div>
                      </div>
                      <span className="font-bold text-xs text-foreground shrink-0">
                        {countryConfig.symbol}{billingCycle === 'yearly' ? (allAccessPlan.yearly_price ?? allAccessPlan.price * 10) : (allAccessPlan.monthly_price ?? allAccessPlan.price)}
                      </span>
                    </div>
                  ) : activeItems.length > 0 ? (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {activeItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-2 rounded-md bg-muted/40 border border-border/60 text-xs gap-2 min-w-0">
                          <span className="font-semibold text-foreground truncate min-w-0">
                            {item.name}
                          </span>
                          <span className="font-bold text-foreground shrink-0">
                            {countryConfig.symbol}{item.price}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-md border border-dashed border-border/80 text-center space-y-1">
                      <ShoppingCart className="w-5 h-5 text-muted-foreground mx-auto" />
                      <p className="text-xs font-bold text-foreground">No modules selected yet</p>
                      <p className="text-[10px] text-muted-foreground">Click "+ Add Module" on any card to add it to your plan.</p>
                    </div>
                  )}
                </div>

                {/* Price Breakdown Table */}
                <div className="space-y-1.5 pt-2.5 border-t border-border/80 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Base Subtotal</span>
                    <span className="font-bold text-foreground">{countryConfig.symbol}{baseTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Gateway Fee (3%)</span>
                    <span className="font-bold text-foreground">{countryConfig.symbol}{pgFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>GST / Taxes (18% PG)</span>
                    <span className="font-bold text-foreground">{countryConfig.symbol}{gstFee.toFixed(2)}</span>
                  </div>

                  {billingCycle === 'yearly' && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 p-1.5 rounded-md text-[10.5px] border border-emerald-200 dark:border-emerald-800">
                      <span>Yearly Discount Savings</span>
                      <span>2 Months FREE</span>
                    </div>
                  )}

                  <div className="pt-2.5 border-t border-border/80 flex items-baseline justify-between">
                    <div>
                      <span className="text-xs font-bold text-foreground uppercase tracking-wider block">Total Payable</span>
                      <span className="text-[10px] text-muted-foreground">Billed {billingCycle}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-primary font-heading">
                        {countryConfig.symbol}{grandTotal.toFixed(2)}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-semibold block">/{billingCycle === 'yearly' ? 'yr' : 'mo'}</span>
                    </div>
                  </div>
                </div>

                {/* ── AUTOPAY (AUTO-RENEWAL) OPTION ───────────────────────── */}
                <div className="p-3 rounded-lg bg-muted/30 border border-border/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                        <RefreshCw size={13} className={isAutopay ? "animate-spin-slow" : ""} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-foreground">
                            Auto-Pay (Auto-Renew)
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-primary/15 text-primary uppercase tracking-wider">
                            Default
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-medium block">
                          {billingCycle === 'yearly' ? 'Renews every year automatically' : 'Renews every month automatically'}
                        </span>
                      </div>
                    </div>

                    {/* Toggle Switch */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isAutopay}
                      onClick={() => setIsAutopay(!isAutopay)}
                      className={cn(
                        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                        isAutopay ? "bg-primary" : "bg-muted border border-border"
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out",
                          isAutopay ? "translate-x-4" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>

                  <p className="text-[10px] text-muted-foreground leading-normal pl-0.5">
                    {isAutopay 
                      ? `Enjoy uninterrupted access. Your plan renews ${billingCycle === 'yearly' ? 'yearly' : 'monthly'}. You can cancel or pause anytime from your dashboard.` 
                      : 'Auto-renewal is turned off. Your features will pause when the current billing cycle expires.'}
                  </p>
                </div>

                {/* Action CTA Checkout Button */}
                <button
                  onClick={handleCheckout}
                  disabled={isSubmitting || baseTotal === 0}
                  className="w-full h-10 px-4 rounded-md font-bold text-xs text-white bg-primary hover:bg-primary/90 shadow-2xs active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-current" />
                      <span>PAY NOW & ACTIVATE</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-auto" />
                    </>
                  )}
                </button>

                {/* Security Badges */}
                <div className="pt-2 flex items-center justify-center gap-3 text-[10px] font-semibold text-muted-foreground border-t border-border/80">
                  <span className="flex items-center gap-1">
                    <Zap size={11} className="text-primary" /> Instant Activation
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <ShieldCheck size={11} className="text-emerald-500" /> 256-Bit Encrypted
                  </span>
                </div>
                <p className="text-[10px] text-center text-muted-foreground pt-0.5">
                  Backed by our 14-day money-back guarantee. View our <a href="/refund-policy" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Refund Policy</a> and <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Terms of Service</a>.
                </p>

              </div>
            </div>

          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* TAB 3: BILLING & INVOICES VIEW                                      */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'invoices' && (
        <div className="space-y-4 animate-fade-in w-full">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                <Receipt size={17} className="text-primary" />
                Official Billing & Tax Invoices
              </h3>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchBillingHistory}
              disabled={isLoadingHistory}
              className="rounded-md font-bold text-xs gap-1.5 h-8 px-3 cursor-pointer shadow-2xs"
            >
              <RefreshCw size={12} className={isLoadingHistory ? "animate-spin" : ""} />
              <span>Refresh</span>
            </Button>
          </div>

            {isLoadingHistory ? (
              <div className="py-14 text-center text-muted-foreground space-y-2">
                <RefreshCw className="w-6 h-6 mx-auto animate-spin text-primary" />
                <p className="text-xs font-bold">Loading billing history...</p>
              </div>
            ) : historyList.length === 0 ? (
              <div className="py-14 text-center text-muted-foreground space-y-2.5">
                <FileText className="w-10 h-10 mx-auto opacity-30" />
                <h4 className="font-bold text-sm text-foreground">No Invoices Found</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  When you subscribe or renew your plans, your downloadable GST tax receipts and payment summaries will appear here.
                </p>
                <Button
                  onClick={() => handleTabChange('marketplace')}
                  size="sm"
                  className="rounded-md font-bold text-xs mt-2 h-8 px-3"
                >
                  Explore Plans & Upgrades
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {historyList.map((item) => {
                  const currSym = item.currency === 'USD' ? '$' : item.currency === 'GBP' ? '£' : item.currency === 'AUD' ? 'A$' : item.currency === 'CAD' ? 'C$' : item.currency === 'EUR' ? '€' : '₹';
                  const invoiceDate = new Date(item.created_at || item.paid_at);
                  const formattedDate = invoiceDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                  const formattedTime = invoiceDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div
                      key={item.id}
                      className="bg-card border border-border/80 rounded-lg p-4 shadow-2xs hover:border-primary/40 transition-all duration-200 flex flex-col justify-between space-y-3 font-sans"
                    >
                      {/* Top Section: Header & Status Badge */}
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-2xs">
                              <img src={menukitLogo} alt="Menukit" className="w-3.5 h-3.5 object-contain" />
                            </div>
                            <div>
                              <span className="text-[9.5px] font-bold uppercase tracking-widest text-muted-foreground block font-mono">
                                TAX INVOICE
                              </span>
                              <span className="text-xs font-bold text-foreground font-mono truncate max-w-[140px] block" title={`#${item.invoice_number || item.id}`}>
                                #{item.invoice_number || item.id.slice(0, 10).toUpperCase()}
                              </span>
                            </div>
                          </div>

                          {/* PAID Stamp Badge */}
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[9.5px] font-bold uppercase tracking-wider">
                            <CheckCircle2 size={11} className="text-emerald-500" />
                            <span>PAID</span>
                          </div>
                        </div>

                        {/* Date & Cycle Info */}
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium pt-1 border-b border-border/80 pb-2">
                          <span className="flex items-center gap-1">
                            <Clock size={11} className="text-muted-foreground" />
                            {formattedDate}, {formattedTime}
                          </span>
                          <span className="capitalize font-semibold text-foreground">
                            {item.billing_cycle || 'Monthly'} Cycle
                          </span>
                        </div>

                        {/* Purchased Plan Line Item */}
                        <div className="bg-muted/40 rounded-md p-2.5 space-y-1 border border-border/60">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-foreground flex items-center gap-1.5">
                              {item.is_all_access ? (
                                <>
                                  <Crown size={12} className="text-amber-500" />
                                  <span>All-Access Pack</span>
                                </>
                              ) : (
                                <>
                                  <PackageOpen size={12} className="text-primary" />
                                  <span>Modular Plan Subscription</span>
                                </>
                              )}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-semibold">
                              {item.is_all_access ? 'Full Suite' : `${(item.modules || []).length} Add-on${(item.modules || []).length !== 1 ? 's' : ''}`}
                            </span>
                          </div>

                          {!item.is_all_access && item.modules && item.modules.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {item.modules.slice(0, 4).map((modId: string) => (
                                <span
                                  key={modId}
                                  className="text-[9.5px] font-mono px-1.5 py-0.2 rounded-md bg-muted text-muted-foreground border border-border/70"
                                >
                                  {modId}
                                </span>
                              ))}
                              {item.modules.length > 4 && (
                                <span className="text-[9px] px-1 py-0.2 rounded-md bg-muted text-muted-foreground font-bold">
                                  +{item.modules.length - 4} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bottom Total & Actions */}
                      <div className="pt-2 border-t border-border/80 space-y-2">
                        <div className="flex items-baseline justify-between">
                          <div>
                            <span className="text-[9.5px] font-bold text-muted-foreground uppercase tracking-wider block">
                              Total Paid
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              via {item.payment_method || 'Online PG'}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-xl font-bold text-foreground font-heading tracking-tight">
                              {currSym}{item.amount}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handlePrintInvoice(item.id)}
                          className="w-full h-8.5 px-3 rounded-lg bg-primary hover:bg-primary/90 active:scale-[0.98] text-primary-foreground font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs border-0"
                        >
                          <Printer size={14} className="text-white" />
                          <span>View & Print Tax Receipt</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

        </div>
      )}

      {/* ── MODAL: MOCK GATEWAY PAYMENT SIMULATOR ─────────────────────────── */}
      {mockGatewayOrder && createPortal(
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border/80 rounded-lg p-5 max-w-sm w-full shadow-xl text-center space-y-4 animate-scale-up">
            <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mx-auto border border-primary/20 shadow-2xs">
              <Zap className="w-6 h-6 fill-current" />
            </div>

            <div>
              <h3 className="font-bold text-base text-foreground">Mock Payment Gateway</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Simulating payment checkout for Order ID: <code className="font-bold text-primary">{mockGatewayOrder.order_id}</code>
              </p>
            </div>

            <div className="p-3 rounded-md bg-muted/40 border border-border space-y-0.5">
              <span className="text-[10px] text-muted-foreground font-bold uppercase">Total Payable Amount</span>
              <div className="text-2xl font-black text-foreground font-heading">
                {mockGatewayOrder.currency_symbol || (mockGatewayOrder.currency === 'USD' ? '$' : mockGatewayOrder.currency === 'GBP' ? '£' : mockGatewayOrder.currency === 'AUD' ? 'A$' : mockGatewayOrder.currency === 'CAD' ? 'C$' : mockGatewayOrder.currency === 'EUR' ? '€' : '₹')}{(mockGatewayOrder.amount / 100).toFixed(2)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                onClick={handleMockPaymentCancel}
                disabled={isSubmitting}
                className="h-8.5 px-3 rounded-md border border-border font-semibold text-xs text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleMockPaymentSuccess}
                disabled={isSubmitting}
                className="h-8.5 px-3 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isSubmitting ? 'Verifying...' : 'Simulate Success ✓'}
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* ── MODAL: CONFIRM TURNING OFF AUTOPAY ─────────────────────────── */}
      <ConfirmModal
        isOpen={showDisableAutopayModal}
        onClose={() => setShowDisableAutopayModal(false)}
        onConfirm={async () => {
          setShowDisableAutopayModal(false);
          await handleToggleAutopay(false);
        }}
        title="Turn Off Subscription Auto-Pay?"
        message={`Your subscription features will remain active until ${activeSubscription?.current_period_end ? new Date(activeSubscription.current_period_end).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'the end of your current cycle'}. No further recurring deductions will be made, and features will pause after this date unless renewed manually.`}
        confirmText="Yes, Turn Off Auto-Pay"
        cancelText="Keep Auto-Pay Enabled"
        isDestructive={true}
        isLoading={isTogglingAutopay}
      />

    </div>
  );
}
