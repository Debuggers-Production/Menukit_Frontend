import { useState, useMemo, useEffect } from 'react';
import { useHeaderStore } from '@/store/useHeaderStore';
import { Check, ShoppingCart, Sparkles, Zap, PackageOpen, Award, Layers, ShieldCheck, ArrowRight, HelpCircle } from 'lucide-react';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';
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
    id: 'member-count',
    name: 'New Member Count',
    price: 100,
    description: 'Track how many new members/customers join every month seamlessly.',
    category: 'Relationship Marketing',
  },
  {
    id: 'member-details',
    name: 'New Member + Details',
    price: 150,
    description: 'Store and manage deep customer information along with member growth metrics.',
    category: 'Relationship Marketing',
  },
  {
    id: 'search-data',
    name: 'Customer Search Data',
    price: 60,
    description: 'Access search analytics and real-time customer interest insights.',
    category: 'Marketing',
  },
  {
    id: 'custom-theme',
    name: 'Custom Theme Studio',
    price: 60,
    description: 'Customize colors, logos, and custom branding of your digital menu.',
    category: 'Branding',
  },
  {
    id: 'analytics-advanced-filters',
    name: 'Advanced Analytics Filters',
    price: 50,
    description: 'Unlock 7-day, 30-day, and Custom Date range filters for your dashboard.',
    category: 'Analytics',
  },
  {
    id: 'analytics-customer-insights',
    name: 'Customer Insights Report',
    price: 50,
    description: 'Access detailed reports on customer views and repeat visits.',
    category: 'Analytics',
  },
];

const ALL_ACCESS_PRICE = 299;

export function SubscriptionMarketplacePage() {
  const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(new Set());
  const [isAllAccess, setIsAllAccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const setHeaderTitle = useHeaderStore((state) => state.setTitle);

  useEffect(() => {
    setHeaderTitle('Subscriptions');
  }, [setHeaderTitle]);

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

  const { total, activeItems } = useMemo(() => {
    if (isAllAccess) {
      return { total: ALL_ACCESS_PRICE, activeItems: [] };
    }
    
    let sum = 0;
    const items: Feature[] = [];
    selectedFeatures.forEach((id) => {
      const feature = ADDONS.find(a => a.id === id);
      if (feature) {
        sum += feature.price;
        items.push(feature);
      }
    });
    return { total: sum, activeItems: items };
  }, [selectedFeatures, isAllAccess]);

  const handleCheckout = async () => {
    if (total === 0) {
      toast.error("Please select at least one module or pack.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create order on backend
      const res = await api.post('/subscription/create-order', {
        is_all_access: isAllAccess,
        selected_modules: Array.from(selectedFeatures),
      });
      
      const orderData = res.data;

      // 2. Mock Mode handling
      if (orderData.mock_mode) {
        await api.post('/subscription/verify', {
          razorpay_order_id: orderData.order_id,
          razorpay_payment_id: "mock_payment_" + Date.now(),
          razorpay_signature: "mock_signature_bypass",
        });
        toast.success("Subscription activated (Mock Mode)!");
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
        description: "Subscription Activation",
        order_id: orderData.order_id,
        handler: async function (response: any) {
          try {
            await api.post('/subscription/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            toast.success("Payment successful! Subscription activated.");
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 antialiased selection:bg-orange-500 selection:text-white pb-48 lg:pb-36">
      
      {/* Background Decorative Ambient Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] pointer-events-none overflow-hidden z-0 opacity-40 dark:opacity-70">
        <div className="absolute -top-40 left-10 w-72 h-72 bg-primary/30 rounded-full blur-[120px]" />
        <div className="absolute -top-20 right-10 w-80 h-80 bg-orange-500/20 rounded-full blur-[100px]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 pt-8 sm:px-6 lg:px-8 z-10">
        
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

        {/* Premium Native Segmented Switch (Highly Mobile Optimized) */}
        <div className="flex justify-center mb-8 sticky -top-4 sm:-top-6 lg:-top-8 z-30 py-3 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 bg-slate-50/90 dark:bg-[#0b0f19]/90 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 shadow-sm">
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
                  Consolidate every custom marketplace dynamic feature and priority updates inside one flat billing wrapper.
                </p>
                <button 
                  onClick={() => handlePlanTypeChange('all-access')}
                  className="w-full bg-primary hover:bg-primary text-white py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-md shadow-primary/10"
                >
                  Switch to All-Access <ArrowRight size={12} />
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
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">All-Access Bundle</h2>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                        Complete feature catalog package clearance with no operational volume bounds or rate capping tiers.
                      </p>
                    </div>
                  </div>
                  
                  <div className="relative group self-center sm:self-auto shrink-0">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary to-orange-600 rounded-2xl blur-md opacity-30 group-hover:opacity-60 transition duration-500" />
                    <div className="relative bg-white dark:bg-[#182032] px-6 py-4 rounded-2xl border-2 border-primary/50 flex items-baseline gap-1 shadow-xl shadow-primary/20">
                      <span className="text-4xl font-black bg-gradient-to-r from-primary to-orange-600 bg-clip-text text-transparent">₹{ALL_ACCESS_PRICE}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">/mo</span>
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
                          return (
                            <div 
                              key={feature.id}
                              onClick={() => toggleFeature(feature.id)}
                              className={cn(
                                "bg-white dark:bg-[#111726] border rounded-2xl p-4 sm:p-5 transition-all duration-300 flex flex-col justify-between cursor-pointer select-none relative active:scale-[0.98] tap-highlight-transparent group",
                                isSelected 
                                  ? "border-primary dark:border-primary shadow-md ring-1 ring-primary/20" 
                                  : "border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm"
                              )}
                            >
                              {/* Selected Indicator Glow Line */}
                              {isSelected && <div className="absolute top-0 left-6 right-6 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent shadow-md" />}

                              <div>
                                <div className="flex justify-between items-start gap-3 mb-2">
                                  <div>
                                    <h4 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base leading-snug mt-1.5 transition-colors group-hover:text-primary dark:group-hover:text-primary">
                                      {feature.name}
                                    </h4>
                                  </div>
                                  
                                  {/* Tap Check Target Element */}
                                  <div className={cn(
                                    "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all duration-300 shadow-inner mt-0.5",
                                    isSelected 
                                      ? "bg-primary border-primary text-white scale-110 shadow-primary/20" 
                                      : "border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#182032]"
                                  )}>
                                    {isSelected && <Check size={11} strokeWidth={3} />}
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
                                  <span className="font-black text-slate-900 dark:text-white text-sm sm:text-base">₹{feature.price}</span>
                                  <span className="text-[10px] text-slate-400 font-bold">/mo</span>
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
        <div className="fixed bottom-16 lg:bottom-0 left-0 lg:left-64 right-0 bg-white/75 dark:bg-[#0b0f19]/80 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800/80 shadow-[0_-10px_40px_rgba(0,0,0,0.06)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.4)] z-40 px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] lg:pb-4 transition-transform duration-300">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            
            {/* Meta Pricing Details Layer */}
            <div className="flex items-center gap-3 w-full sm:w-auto px-1 sm:px-0 justify-between sm:justify-start">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-[#131b2e] flex items-center justify-center text-slate-500 dark:text-slate-400 border border-slate-200/20 dark:border-slate-700/20 shrink-0">
                  <ShoppingCart size={16} />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block leading-none">Your Setup</span>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
                    <span>Core (₹0)</span>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    {isAllAccess ? (
                      <span className="text-primary font-extrabold text-[11px] bg-primary/10 px-1.5 py-0.5 rounded-md">All-Access Pack</span>
                    ) : (
                      <span className="text-slate-500 dark:text-slate-400 font-semibold text-[11px]">
                        {activeItems.length === 0 ? 'No add-ons' : `${activeItems.length} active module${activeItems.length !== 1 ? 's' : ''}`}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Total display localized inside mobile line alignment split */}
              <div className="text-right sm:hidden">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest block">Total Cost</span>
                <div className="flex items-baseline justify-end gap-0.5">
                  <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">₹{total}</span>
                  <span className="text-[10px] font-bold text-slate-400">/mo</span>
                </div>
              </div>
            </div>

            {/* Total display & Interactive Checkout Call-out Button Bundle */}
            <div className="flex items-center justify-between sm:justify-end gap-5 w-full sm:w-auto">
              {/* Main Desktop Total Wrapper */}
              <div className="text-right hidden sm:block">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest block">Total Investment</span>
                <div className="flex items-baseline justify-end gap-0.5 mt-0.5">
                  <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">₹{total}</span>
                  <span className="text-xs font-bold text-slate-400">/mo</span>
                </div>
              </div>
              
              <button
                onClick={handleCheckout}
                disabled={isSubmitting}
                className="w-full sm:w-auto bg-gradient-to-r from-primary via-primary to-orange-600 hover:from-primary hover:to-orange-500 text-white px-8 py-3.5 sm:py-3 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all duration-200 flex items-center justify-center min-w-[140px] text-sm disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97] touch-manipulation"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Confirm & Activate'
                )}
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}