import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { 
  QrCode, Eye, Search, CalendarDays, Filter, Users, Lock, ChevronRight,
  TrendingUp, TrendingDown, DollarSign, Receipt, ShoppingBag, Trophy, 
  Sparkles, Download, ExternalLink, ArrowUpRight, Wallet, FileText, Calendar, CheckCircle2, CreditCard, Banknote
} from 'lucide-react';
import { api } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/ui/PageHeader';
import { DatePicker } from '@/components/ui/DatePicker';
import { useShopStore } from '@/store/shopStore';
import { membershipService, RepeatedCustomer } from '@/services/memberships';

import { Button } from '@/components/ui/Button';

export function AnalyticsPage() {
  const navigate = useNavigate();
  const { shop } = useShopStore();
  const currencySymbol = shop?.currency_symbol || '₹';

  const [activeTab, setActiveTab] = useState<'revenue' | 'scans'>('revenue');
  const [data, setData] = useState<any>(null);
  const [revenueData, setRevenueData] = useState<any>(null);
  const [repeatedCustomers, setRepeatedCustomers] = useState<RepeatedCustomer[]>([]);
  const [subscriptionInfo, setSubscriptionInfo] = useState<{is_active: boolean, is_all_access: boolean, active_modules: string[], is_expired?: boolean} | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRevenueLoading, setIsRevenueLoading] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [topSearchesList, setTopSearchesList] = useState<any[]>([]);
  const [isSearchDataLocked, setIsSearchDataLocked] = useState<boolean>(false);

  // Timeframe & Custom Date State
  const [dateFilter, setDateFilter] = useState<number | 'custom'>(30);
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  // Payment Mode Filter State: 'all' | 'online' | 'offline'
  const [paymentModeFilter, setPaymentModeFilter] = useState<'all' | 'online' | 'offline'>('all');

  const [invoiceSearch, setInvoiceSearch] = useState('');

  const getRevenueApiUrl = () => {
    if (dateFilter === 'custom' && customStart && customEnd) {
      return `/analytics/revenue?start_date=${customStart}&end_date=${customEnd}`;
    }
    return `/analytics/revenue?days=${typeof dateFilter === 'number' ? dateFilter : 30}`;
  };

  // Dedicated fetch for Customer Search Data
  useEffect(() => {
    const fetchTopSearches = async () => {
      try {
        const res = await api.get('/analytics/top-searches');
        setTopSearchesList(res.data?.top_searches || []);
        setIsSearchDataLocked(false);
      } catch (err: any) {
        if (err.response?.status === 403) {
          setIsSearchDataLocked(true);
        } else {
          console.error('Failed to fetch top searches', err);
        }
      }
    };
    fetchTopSearches();
  }, []);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      try {
        let currentShopId = shop?.id;
        if (!shop) {
          const shopRes = await api.get('/shops/me').catch(() => ({ data: {} }));
          if (shopRes.data?.id) {
            currentShopId = shopRes.data.id;
          }
        }

        const subRes = await api.get('/subscription/current').catch(() => ({ data: null }));
        setSubscriptionInfo(subRes.data);

        // Core Dashboard overview is free
        const dashRes = await api.get('/analytics/dashboard').catch(() => ({ data: null }));
        setData(dashRes.data);

        // Revenue analytics module check
        try {
          const revRes = await api.get(getRevenueApiUrl());
          setRevenueData(revRes.data);
          setIsLocked(false);
        } catch (revErr: any) {
          if (revErr.response?.status === 403) {
            setIsLocked(true);
          }
        }

        if (currentShopId) {
          const repeated = await membershipService.getRepeatedCustomers(currentShopId, 2).catch(() => []);
          setRepeatedCustomers(repeated);
        }
      } catch (error: any) {
        console.error('Failed to fetch analytics', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, [shop?.id]);

  useEffect(() => {
    const fetchRevenueOnly = async () => {
      if (dateFilter === 'custom' && (!customStart || !customEnd)) return;
      
      setIsRevenueLoading(true);
      try {
        const revRes = await api.get(getRevenueApiUrl());
        setRevenueData(revRes.data);
      } catch (err) {
        console.error('Failed to update revenue filter', err);
      } finally {
        setIsRevenueLoading(false);
      }
    };
    if (!isLoading) {
      fetchRevenueOnly();
    }
  }, [dateFilter, customStart, customEnd]);

  const isOnlinePm = (pm: string) => 
    ['online', 'upi', 'card', 'pay_online', 'razorpay', 'cashfree'].includes((pm || '').toLowerCase());

  const invoicesByMode = useMemo(() => {
    const all = revenueData?.recent_invoices || [];
    if (paymentModeFilter === 'online') {
      return all.filter((inv: any) => isOnlinePm(inv.payment_method));
    }
    if (paymentModeFilter === 'offline') {
      return all.filter((inv: any) => !isOnlinePm(inv.payment_method));
    }
    return all;
  }, [revenueData?.recent_invoices, paymentModeFilter]);

  const displayedGross = useMemo(() => {
    if (paymentModeFilter === 'all') return revenueData?.total_gross_revenue || 0;
    return invoicesByMode.reduce((sum: number, inv: any) => sum + (inv.total_order_amt || 0), 0);
  }, [revenueData?.total_gross_revenue, invoicesByMode, paymentModeFilter]);

  const displayedSettled = useMemo(() => {
    if (paymentModeFilter === 'all') return revenueData?.total_settled_amount || 0;
    return invoicesByMode.reduce((sum: number, inv: any) => sum + (inv.settled_amount || 0), 0);
  }, [revenueData?.total_settled_amount, invoicesByMode, paymentModeFilter]);

  const displayedPgCharges = useMemo(() => {
    if (paymentModeFilter === 'all') return revenueData?.total_commission_paid || 0;
    return invoicesByMode.reduce((sum: number, inv: any) => sum + (inv.commission_amount || 0), 0);
  }, [revenueData?.total_commission_paid, invoicesByMode, paymentModeFilter]);

  const filteredInvoices = useMemo(() => {
    return invoicesByMode.filter((inv: any) => 
      inv.invoice_no.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
      inv.order_id.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
      inv.customer_name.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
      (inv.payment_id && inv.payment_id.toLowerCase().includes(invoiceSearch.toLowerCase()))
    );
  }, [invoicesByMode, invoiceSearch]);

  const maxRevenueBar = (revenueData?.daily_sales || []).reduce((max: number, d: any) => Math.max(max, d.gross_revenue), 100);

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-6xl">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-8 max-w-6xl mx-auto animate-fade-in pb-28">
      {/* Header with Navigation */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 sm:gap-4">
        <PageHeader 
          title="Product Analytics & Sales"
          subtitle="Real-time order revenue, item popularity ranking, payment gateway charges, and invoice records."
          className="mb-0"
        />

        <div className="flex items-center gap-2 w-full lg:w-auto shrink-0">
          <div className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl flex items-center gap-1 border border-slate-200/60 dark:border-slate-700/60 w-full lg:w-auto shrink-0">
            <button
              onClick={() => setActiveTab('revenue')}
              className={`flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'revenue' 
                  ? 'bg-white dark:bg-slate-900 text-primary shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <TrendingUp size={14} /> Revenue & Orders
            </button>
            <button
              onClick={() => setActiveTab('scans')}
              className={`flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'scans' 
                  ? 'bg-white dark:bg-slate-900 text-primary shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <QrCode size={14} /> Scans & Traffic
            </button>
          </div>
        </div>
      </div>

      {isLocked && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/40 dark:to-orange-950/40 border-2 border-red-500/50 p-6 sm:p-8 rounded-3xl text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto shadow-inner">
            <Lock size={32} />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-900 dark:text-white">Product Analytics & Sales Locked</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Your subscription has ended. Access to real-time order revenue, sales reports, item popularity rankings, and invoices is locked by the backend. Please renew your subscription to access analytics.
            </p>
          </div>
          <Button onClick={() => navigate('/subscription')} className="bg-primary hover:bg-primary/90 text-white font-extrabold text-xs uppercase tracking-wider px-6 py-3.5 shadow-md">
            Renew Subscription Now →
          </Button>
        </div>
      )}

      {/* Date Range Selector with Custom Date Option */}
      <div className="relative z-30 flex flex-col gap-3 bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <CalendarDays size={18} className="text-primary shrink-0" />
            <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">Timeframe:</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 w-full sm:w-auto">
            {[
              { days: 7, label: '7 Days' },
              { days: 30, label: '30 Days' },
              { days: 90, label: '90 Days' },
            ].map(t => (
              <button
                key={t.days}
                onClick={() => setDateFilter(t.days)}
                className={`h-9 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center justify-center cursor-pointer ${
                  dateFilter === t.days 
                    ? 'bg-primary text-white shadow-sm' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}

            <button
              onClick={() => setDateFilter('custom')}
              className={`h-9 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center justify-center gap-1.5 cursor-pointer ${
                dateFilter === 'custom' 
                  ? 'bg-primary text-white shadow-sm' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              <Calendar size={13} />
              <span>Custom</span>
            </button>
          </div>
        </div>

        {/* Custom Date Inputs Picker */}
        {dateFilter === 'custom' && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-4 text-xs animate-fade-in relative z-30">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 flex-1">
              <div className="flex items-center gap-2 relative z-20">
                <span className="font-bold text-slate-500 text-[11px] w-10 sm:w-auto shrink-0">From:</span>
                <DatePicker
                  value={customStart}
                  maxDate={customEnd || undefined}
                  onChange={(d) => {
                    setCustomStart(d);
                    if (customEnd && d > customEnd) {
                      setCustomEnd(d);
                    }
                  }}
                  placeholder="Start Date"
                />
              </div>
              <div className="flex items-center gap-2 relative z-10">
                <span className="font-bold text-slate-500 text-[11px] w-10 sm:w-auto shrink-0">To:</span>
                <DatePicker
                  value={customEnd}
                  minDate={customStart || undefined}
                  onChange={(d) => setCustomEnd(d)}
                  placeholder="End Date"
                />
              </div>
            </div>
            {customStart && customEnd && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 self-center shrink-0">
                <CheckCircle2 size={13} /> Filter Applied
              </span>
            )}
          </div>
        )}
        {/* Payment Mode Filter Bar (Online / Offline / All) */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-primary shrink-0" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Payment Mode:</span>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setPaymentModeFilter('all')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                paymentModeFilter === 'all'
                  ? 'bg-white dark:bg-slate-900 text-primary shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Payments
            </button>

            <button
              onClick={() => setPaymentModeFilter('online')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                paymentModeFilter === 'online'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-purple-600'
              }`}
            >
              <CreditCard size={12} />
              <span>Online</span>
            </button>

            <button
              onClick={() => setPaymentModeFilter('offline')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                paymentModeFilter === 'offline'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600'
              }`}
            >
              <Banknote size={12} />
              <span>Offline (Cash)</span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: REVENUE & ORDER ANALYTICS */}
      {activeTab === 'revenue' && (
        <div className="space-y-5 sm:space-y-6 animate-fade-in">
          {/* Key Revenue & Settlement KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {/* Total Revenue */}
            <Card className="relative overflow-hidden border-emerald-100 dark:border-emerald-950/40 bg-gradient-to-br from-emerald-50/50 via-white to-emerald-50/20 dark:from-emerald-950/20 dark:to-slate-900">
              <CardContent className="p-4 sm:p-5">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Gross Sales Revenue</p>
                    <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-heading">
                      {currencySymbol}{displayedGross.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </h3>
                  </div>
                  <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 shrink-0">
                    <DollarSign size={18} className="sm:w-5 sm:h-5" />
                  </div>
                </div>
                
                {/* Growth Ratio Badge */}
                <div className="mt-2.5 flex items-center gap-1.5 flex-wrap text-xs">
                  {revenueData?.growth_ratio >= 0 ? (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 shrink-0">
                      <TrendingUp size={11} /> +{revenueData?.growth_ratio}% growth
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300 shrink-0">
                      <TrendingDown size={11} /> {revenueData?.growth_ratio}%
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 font-medium">vs prev period</span>
                </div>
              </CardContent>
            </Card>

            {/* Net Settled Amount */}
            <Card className="relative overflow-hidden border-blue-100 dark:border-blue-950/40 bg-gradient-to-br from-blue-50/50 via-white to-blue-50/20 dark:from-blue-950/20 dark:to-slate-900">
              <CardContent className="p-4 sm:p-5">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Net Settled Revenue</p>
                    <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-blue-600 dark:text-blue-400 font-heading">
                      {currencySymbol}{displayedSettled.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </h3>
                  </div>
                  <div className="p-2 sm:p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 shrink-0">
                    <Wallet size={18} className="sm:w-5 sm:h-5" />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-2.5 font-medium">
                  After {currencySymbol}{displayedPgCharges.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} PG charges
                </p>
              </CardContent>
            </Card>

            {/* Highest Revenue Food */}
            <Card className="relative overflow-hidden border-amber-100 dark:border-amber-950/40 bg-gradient-to-br from-amber-50/50 via-white to-amber-50/20 dark:from-amber-950/20 dark:to-slate-900">
              <CardContent className="p-4 sm:p-5">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Top Revenue Food</p>
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                      {revenueData?.highest_revenue_food?.name || 'No Sales Yet'}
                    </h3>
                    <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                      {currencySymbol}{revenueData?.highest_revenue_food?.total_revenue || 0}
                    </p>
                  </div>
                  <div className="p-2 sm:p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 shrink-0">
                    <Trophy size={18} className="sm:w-5 sm:h-5" />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 font-medium">
                  {revenueData?.highest_revenue_food?.total_quantity || 0} units sold
                </p>
              </CardContent>
            </Card>

            {/* Most Ordered Item */}
            <Card className="relative overflow-hidden border-purple-100 dark:border-purple-950/40 bg-gradient-to-br from-purple-50/50 via-white to-purple-50/20 dark:from-purple-950/20 dark:to-slate-900">
              <CardContent className="p-4 sm:p-5">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Most Ordered Item</p>
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                      {revenueData?.most_ordered_food?.name || 'No Orders Yet'}
                    </h3>
                    <p className="text-xs font-bold text-purple-600 dark:text-purple-400 mt-0.5">
                      {revenueData?.most_ordered_food?.total_quantity || 0} Orders
                    </p>
                  </div>
                  <div className="p-2 sm:p-2.5 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 shrink-0">
                    <ShoppingBag size={18} className="sm:w-5 sm:h-5" />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 font-medium">
                  {currencySymbol}{revenueData?.most_ordered_food?.total_revenue || 0} gross revenue
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Daily Revenue Chart & Breakdown */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
                  <TrendingUp size={18} className="text-primary shrink-0" /> Daily Revenue & Order Velocity
                </CardTitle>
                <p className="text-[11px] text-slate-500 mt-0.5">Daily breakdown of gross revenue vs net settlements</p>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {revenueData?.daily_sales?.length > 0 ? (
                <div className="h-56 sm:h-60 flex items-end gap-1.5 sm:gap-2 pt-6 border-b border-slate-100 dark:border-slate-800 pb-4 relative">
                  {revenueData.daily_sales.map((day: any, i: number) => {
                    const heightPct = maxRevenueBar > 0 ? (day.gross_revenue / maxRevenueBar) * 100 : 0;
                    return (
                      <div 
                        key={i}
                        className="flex-1 flex flex-col items-center group relative h-full justify-end cursor-pointer"
                      >
                        {/* Bar */}
                        <div 
                          className="w-full max-w-[32px] bg-gradient-to-t from-primary/90 to-primary/40 hover:from-primary hover:to-primary-600 rounded-t-lg transition-all relative border border-primary/20"
                          style={{ height: `${Math.max(heightPct, 8)}%` }}
                        >
                          {/* Hover Tooltip */}
                          <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[11px] py-1.5 px-3 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-30 shadow-xl border border-slate-700">
                            <span className="font-bold">{day.date}</span><br />
                            <span className="text-emerald-400 font-black">Gross: {currencySymbol}{day.gross_revenue}</span><br />
                            <span className="text-slate-300">Orders: {day.orders_count}</span>
                          </div>
                        </div>
                        <span className="text-[8px] sm:text-[9px] text-slate-400 font-bold mt-2 truncate w-full text-center">
                          {new Date(day.date).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-44 flex items-center justify-center text-slate-400 text-xs">
                  No sales recorded in this period yet.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Product Level Popularity & Top Customer Searches */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Trophy size={16} className="text-amber-500 shrink-0" /> Top Ordered Dishes
                </CardTitle>
                <span className="text-[11px] font-bold text-slate-400">Total Units</span>
              </CardHeader>
              <CardContent className="pt-4">
                {revenueData?.top_ordered_items?.length > 0 ? (
                  <div className="space-y-3">
                    {revenueData.top_ordered_items.slice(0, 6).map((item: any, idx: number) => {
                      const maxQty = revenueData.top_ordered_items[0].total_quantity || 1;
                      const pct = Math.round((item.total_quantity / maxQty) * 100);
                      return (
                        <div key={idx} className="flex items-center justify-between gap-2.5 text-xs">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                              idx === 0 ? 'bg-amber-100 text-amber-700' : idx === 1 ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {idx + 1}
                            </span>
                            <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{item.name}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                            <div className="w-12 sm:w-20 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="font-bold text-slate-900 dark:text-white text-[11px] sm:text-xs w-10 text-right">{item.total_quantity} pcs</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-6">No order item records yet.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <DollarSign size={16} className="text-emerald-500 shrink-0" /> Top Revenue Food Items
                </CardTitle>
                <span className="text-[11px] font-bold text-slate-400">Total Revenue</span>
              </CardHeader>
              <CardContent className="pt-4">
                {revenueData?.top_ordered_items?.length > 0 ? (
                  <div className="space-y-3">
                    {[...revenueData.top_ordered_items].sort((a,b) => b.total_revenue - a.total_revenue).slice(0, 6).map((item: any, idx: number) => {
                      const maxRev = revenueData.top_ordered_items[0].total_revenue || 1;
                      const pct = Math.round((item.total_revenue / maxRev) * 100);
                      return (
                        <div key={idx} className="flex items-center justify-between gap-2.5 text-xs">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                              idx === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {idx + 1}
                            </span>
                            <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{item.name}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                            <div className="w-12 sm:w-20 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="font-black text-emerald-600 dark:text-emerald-400 text-[11px] sm:text-xs w-12 text-right">{currencySymbol}{item.total_revenue}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-6">No revenue breakdown records yet.</p>
                )}
              </CardContent>
            </Card>

            {/* Top Customer Searches */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Search size={16} className="text-orange-500 shrink-0" /> Top Customer Searches
                </CardTitle>
                <span className="text-[10px] font-bold bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full uppercase">
                  Module Add-on
                </span>
              </CardHeader>
              <CardContent className="pt-4">
                {isSearchDataLocked ? (
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border border-amber-200 dark:border-amber-800/80 p-4 rounded-xl text-center space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
                      <Lock size={16} />
                    </div>
                    <h5 className="font-extrabold text-xs text-slate-900 dark:text-white">Customer Search Analytics Locked</h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Subscribe to Search Data module to see live search terms.
                    </p>
                    <Button onClick={() => navigate('/subscription')} size="sm" className="bg-primary text-white text-[11px] font-extrabold py-1 h-7 cursor-pointer">
                      Unlock Module →
                    </Button>
                  </div>
                ) : topSearchesList.length > 0 ? (
                  <div className="space-y-3">
                    {topSearchesList.map((search: any, i: number) => (
                      <div key={i} className="flex items-center justify-between gap-2.5 text-xs">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-lg text-slate-500 shrink-0">
                            <Search size={12} />
                          </div>
                          <span className="font-bold text-slate-800 dark:text-slate-200 capitalize truncate">{search.term}</span>
                        </div>
                        <span className="text-[11px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-full shrink-0">
                          {search.count} searches
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-400">
                    <Search size={28} className="mx-auto mb-2 opacity-50" />
                    <p className="text-xs">No search data recorded yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Detailed Invoice & Commission Settlement Table */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
                  <Receipt size={18} className="text-primary shrink-0" /> Order Settlement & Invoice Ledger
                </CardTitle>
                <p className="text-[11px] text-slate-500 mt-0.5">Click any Order ID to navigate to order details.</p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl shrink-0">
                  <button
                    onClick={() => setPaymentModeFilter('all')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      paymentModeFilter === 'all'
                        ? 'bg-white dark:bg-slate-900 text-primary shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setPaymentModeFilter('online')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      paymentModeFilter === 'online'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-slate-500 hover:text-purple-600'
                    }`}
                  >
                    Online
                  </button>
                  <button
                    onClick={() => setPaymentModeFilter('offline')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      paymentModeFilter === 'offline'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-500 hover:text-emerald-600'
                    }`}
                  >
                    Offline
                  </button>
                </div>

                <div className="relative w-full sm:w-56">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search invoice or order ID..."
                    value={invoiceSearch}
                    onChange={(e) => setInvoiceSearch(e.target.value)}
                    className="w-full h-8 pl-8 pr-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {filteredInvoices.length > 0 ? (
                <div className="overflow-x-auto no-scrollbar scrollbar-thin">
                  <table className="w-full text-left text-xs min-w-[700px]">
                    <thead className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-bold">
                      <tr>
                        <th className="py-3 px-4">Order ID</th>
                        <th className="py-3 px-4">Invoice No</th>
                        <th className="py-3 px-4">Payment Ref / ID</th>
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4 text-right">Gross Amt</th>
                        <th className="py-3 px-4 text-center">Method</th>
                        <th className="py-3 px-4 text-right">PG Charge</th>
                        <th className="py-3 px-4 text-right">Net Settled</th>
                        <th className="py-3 px-4">Date & Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {filteredInvoices.map((inv: any) => (
                        <tr key={inv.order_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                          {/* Order ID - Clickable Navigation */}
                          <td className="py-3 px-4">
                            <button
                              onClick={() => navigate('/orders', { state: { searchOrderId: inv.order_id } })}
                              className="font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                              title="Click to view order details"
                            >
                              #{inv.order_id.slice(0, 8)}
                              <ExternalLink size={11} />
                            </button>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                            {inv.invoice_no}
                          </td>
                          <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                            <span className="truncate max-w-[100px] inline-block">{inv.payment_id}</span>
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                            {inv.customer_name}
                          </td>
                          <td className="py-3 px-4 text-right font-black text-slate-900 dark:text-white">
                            {currencySymbol}{inv.total_order_amt}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              isOnlinePm(inv.payment_method) ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {inv.payment_method}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-rose-500 font-bold">
                            -{currencySymbol}{inv.commission_amount}
                          </td>
                          <td className="py-3 px-4 text-right font-black text-emerald-600 dark:text-emerald-400">
                            {currencySymbol}{inv.settled_amount}
                          </td>
                          <td className="py-3 px-4 text-slate-400 text-[11px]">
                            {inv.created_at}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No invoices found matching your filter.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: MENU SCANS & TRAFFIC ANALYTICS */}
      {activeTab === 'scans' && (
        <div className="space-y-5 sm:space-y-6 animate-fade-in">
          {/* Main Scans Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">Total QR Scans</p>
                    <h3 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white font-heading">
                      {data?.overview?.total_qr_scans || 0}
                    </h3>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-900/30">
                    <QrCode size={24} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">Menu Page Views</p>
                    <h3 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white font-heading">
                      {data?.overview?.total_menu_views || 0}
                    </h3>
                  </div>
                  <div className="p-3 rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-900/30">
                    <Eye size={24} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Traffic Scan Chart */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-bold flex items-center">
                <CalendarDays size={18} className="mr-2 text-primary" /> Daily Traffic & QR Scans
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data?.daily_scans?.length > 0 ? (
                <div className="h-56 flex items-end gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 relative">
                  {data.daily_scans.map((day: any, i: number) => {
                    const maxS = Math.max(...data.daily_scans.map((d: any) => d.count), 1);
                    const height = `${(day.count / maxS) * 100}%`;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                        <div 
                          className="w-full max-w-[40px] bg-primary/20 dark:bg-primary-900/40 hover:bg-primary rounded-t-md transition-all relative cursor-pointer"
                          style={{ height: height === '0%' ? '4px' : height }}
                        >
                          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                            {day.count} scans ({day.date})
                          </div>
                        </div>
                        <span className="text-[9px] text-slate-400 mt-2 truncate">{day.date.slice(5)}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center text-slate-400 text-xs">
                  No scan traffic recorded yet.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Repeated Customers & Search Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-base font-bold">
                  <Users size={18} className="mr-2 text-slate-500" /> Repeat Guests & Loyalty
                </CardTitle>
              </CardHeader>
              <CardContent>
                {repeatedCustomers.length > 0 ? (
                  <div className="space-y-3">
                    {repeatedCustomers.slice(0, 5).map((c: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{c.name || 'Guest'}</p>
                          <p className="text-[10px] text-slate-400">{c.mobile_number}</p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-xs font-black bg-indigo-100 text-indigo-700">
                          {c.visit_count} visits
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-6">No repeat customer visits registered yet.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-base font-bold">
                  <Search size={18} className="mr-2 text-slate-500" /> Customer Search Terms
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data?.top_searches?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {data.top_searches.map((s: any, idx: number) => (
                      <span key={idx} className="px-3 py-1.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        {s.term}
                        <span className="text-[10px] bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded-full text-slate-500">{s.count}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-6">No search query history yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
