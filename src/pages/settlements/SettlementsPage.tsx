import { cn } from '@/utils/cn';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { 
  Wallet, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Search, 
  Building2, 
  CreditCard,
  ShieldCheck,
  RefreshCw,
  Trophy
} from 'lucide-react';
import { api } from '@/services/api';
import { useShopStore } from '@/store/shopStore';
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useHeaderStore } from '@/store/useHeaderStore';
import { Skeleton } from '@/components/ui/Skeleton';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { DatePicker } from '@/components/ui/DatePicker';
import { InfiniteScrollTrigger } from '@/components/ui/InfiniteScrollTrigger';
import toast from 'react-hot-toast';
import { parseDateSafe } from '@/utils/dateTime';

interface SettlementItem {
  order_id: string;
  invoice_no: string;
  payment_reference: string;
  payment_method: string;
  customer_name: string;
  customer_phone?: string;
  gross_amount: number;
  platform_fee: number;
  net_settlement_amount: number;
  order_status: string;
  payment_status: string;
  settlement_status: 'settled' | 'pending';
  created_at: string;
  estimated_payout_date: string;
  actual_settled_date?: string;
}

interface SettlementSummary {
  total_online_sales: number;
  total_settled_amount: number;
  total_pending_settlement: number;
  total_transactions_count: number;
  settled_count: number;
  pending_count: number;
  bank_account_last4?: string;
  settlement_policy_notice: string;
  contest_participants_count: number;
  contest_settlement_amount: number;
  has_more: boolean;
  skip: number;
  limit: number;
  settlements: SettlementItem[];
}

function formatSettlementDateTime(dateStr: string) {
  if (!dateStr) return { date: '-', time: '' };
  const d = parseDateSafe(dateStr);
  if (!d) return { date: dateStr, time: '' };
  return {
    date: d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
  };
}

function formatSettlementDate(dateStr?: string) {
  if (!dateStr) return '-';
  const d = parseDateSafe(dateStr);
  if (!d) return dateStr;
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

const PAGE_SIZE = 20;

export function SettlementsPage() {
  const navigate = useNavigate();
  const { shop } = useShopStore();
  const currency = shop?.settings?.currency || '₹';

  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [summary, setSummary] = useState<SettlementSummary | null>(null);
  const [settlementsList, setSettlementsList] = useState<SettlementItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [skip, setSkip] = useState(0);

  // Filters & Search
  const [dateFilter, setDateFilter] = useState<'7' | '30' | '90' | 'custom'>('30');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const { setTitle } = useHeaderStore();

  useEffect(() => {
    setTitle('Settlements & Payouts', 'Track settlements and payouts.');
  }, [setTitle]);

  // Debounce search query input (350ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const loadSettlementsData = useCallback(async (currentSkip: number, reset: boolean = false) => {
    if (reset) {
      setIsLoading(true);
    } else {
      setIsFetchingMore(true);
    }

    try {
      const params: any = {
        status_filter: statusFilter,
        skip: currentSkip,
        limit: PAGE_SIZE,
      };

      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }

      if (dateFilter === 'custom') {
        if (customStart && customEnd) {
          params.start_date = customStart;
          params.end_date = customEnd;
        } else {
          setIsLoading(false);
          setIsFetchingMore(false);
          return;
        }
      } else {
        params.days = parseInt(dateFilter);
      }

      const res = await api.get<SettlementSummary>('/settlements/me', { params });
      const data = res.data;

      setSummary(data);
      setHasMore(data.has_more);
      setSkip(currentSkip);

      if (reset) {
        setSettlementsList(data.settlements || []);
      } else {
        setSettlementsList((prev) => [...prev, ...(data.settlements || [])]);
      }
    } catch (err) {
      console.error("Failed to load settlements", err);
      toast.error("Failed to load settlements summary.");
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
    }
  }, [dateFilter, customStart, customEnd, statusFilter, debouncedSearch]);

  // Trigger fetch on filter/search change
  useEffect(() => {
    if (dateFilter === 'custom' && (!customStart || !customEnd)) return;
    loadSettlementsData(0, true);
  }, [dateFilter, customStart, customEnd, statusFilter, debouncedSearch, loadSettlementsData]);

  // Infinite Scroll Handler
  const handleLoadMore = () => {
    if (hasMore && !isFetchingMore && !isLoading) {
      const nextSkip = skip + PAGE_SIZE;
      loadSettlementsData(nextSkip, false);
    }
  };

  return (
    <div className="space-y-4 w-full animate-fade-in pb-20 lg:pb-12">
      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3">
        {/* Total Pending Settlement */}
        <div className="bg-card border border-border/80 rounded-lg p-2.5 sm:p-3 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Pending Payout</span>
            <div className="w-7 h-7 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-2xs">
              <Clock size={13} />
            </div>
          </div>
          {isLoading && settlementsList.length === 0 ? (
            <Skeleton className="h-6 w-20 rounded-md" />
          ) : (
            <div>
              <h3 className="text-lg sm:text-xl font-black text-foreground font-heading">
                {currency}{summary?.total_pending_settlement.toFixed(2) || '0.00'}
              </h3>
              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold truncate">
                {summary?.pending_count || 0} order(s) pending
              </p>
            </div>
          )}
        </div>

        {/* Total Amount Settled */}
        <div className="bg-card border border-border/80 rounded-lg p-2.5 sm:p-3 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Settled</span>
            <div className="w-7 h-7 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-2xs">
              <CheckCircle2 size={13} />
            </div>
          </div>
          {isLoading && settlementsList.length === 0 ? (
            <Skeleton className="h-6 w-20 rounded-md" />
          ) : (
            <div>
              <h3 className="text-lg sm:text-xl font-black text-foreground font-heading">
                {currency}{summary?.total_settled_amount.toFixed(2) || '0.00'}
              </h3>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold truncate">
                {summary?.settled_count || 0} payout(s) completed
              </p>
            </div>
          )}
        </div>

        {/* Gross Online Sales */}
        <div className="bg-card border border-border/80 rounded-lg p-2.5 sm:p-3 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Gross Online Sales</span>
            <div className="w-7 h-7 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20 shadow-2xs">
              <Wallet size={13} />
            </div>
          </div>
          {isLoading && settlementsList.length === 0 ? (
            <Skeleton className="h-6 w-20 rounded-md" />
          ) : (
            <div>
              <h3 className="text-lg sm:text-xl font-black text-foreground font-heading">
                {currency}{summary?.total_online_sales.toFixed(2) || '0.00'}
              </h3>
              <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold truncate">
                {summary?.total_transactions_count || 0} online payments
              </p>
            </div>
          )}
        </div>

        {/* Contest Settlements */}
        <div className="bg-card border border-border/80 rounded-lg p-2.5 sm:p-3 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Contest Bonus</span>
            <div className="w-7 h-7 rounded-md bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 flex items-center justify-center border border-fuchsia-500/20 shadow-2xs">
              <Trophy size={13} />
            </div>
          </div>
          {isLoading && settlementsList.length === 0 ? (
            <Skeleton className="h-6 w-20 rounded-md" />
          ) : (
            <div>
              <h3 className="text-lg sm:text-xl font-black text-foreground font-heading">
                {currency}{(summary?.contest_settlement_amount || 0).toFixed(2)}
              </h3>
              <p className="text-[10px] text-fuchsia-600 dark:text-fuchsia-400 font-semibold truncate">
                {summary?.contest_participants_count || 0} participant(s)
              </p>
            </div>
          )}
        </div>

        {/* Payout Target */}
        <div className="bg-card border border-border/80 rounded-lg p-2.5 sm:p-3 shadow-2xs space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Payout Target</span>
            <div className="w-7 h-7 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20 shadow-2xs">
              <Building2 size={13} />
            </div>
          </div>
          {isLoading && settlementsList.length === 0 ? (
            <Skeleton className="h-6 w-20 rounded-md" />
          ) : (
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-foreground truncate" title={summary?.bank_account_last4 ? `•••• ${summary.bank_account_last4}` : ''}>
                  {summary?.bank_account_last4 ? `•••• ${summary.bank_account_last4}` : 'Not Configured'}
                </h3>
                <CheckCircle2 size={14} className={summary?.bank_account_last4 ? "text-emerald-500" : "text-muted-foreground"} />
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {summary?.bank_account_last4 ? 'Direct Bank Settlement active' : 'Click settings to configure'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* FILTER CONTROLS & TRANSACTION LIST TABLE */}
      <div className="bg-card border border-border/80 rounded-lg shadow-2xs overflow-hidden">
        {/* Sticky Header Bar on Scroll */}
        <div className="sticky -top-4 sm:-top-6 lg:-top-8 z-30 bg-card border-b border-border/80 p-3 sm:p-3.5 space-y-2.5">
          {/* Row 1: Title and Refresh Button */}
          <div className="flex items-center justify-between gap-2.5">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 min-w-0">
              <CreditCard size={15} className="text-primary shrink-0" />
              <span className="truncate">Settlement Transactions</span>
            </h3>

            <Button
              variant="outline"
              size="sm"
              onClick={() => loadSettlementsData(0, true)}
              className="rounded-md h-8 px-2.5 shrink-0 border-border shadow-2xs cursor-pointer hover:bg-muted"
              title="Refresh Settlements"
            >
              <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            </Button>
          </div>

          {/* Row 2: Date Filters & Status Dropdown (Structured without orphan button) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            {/* Date Filter Buttons */}
            <div className="flex items-center gap-0.5 bg-muted p-0.5 rounded-md text-xs font-bold overflow-x-auto header-scrollbar-x shrink-0">
              {[
                { label: '7D', val: '7' },
                { label: '30D', val: '30' },
                { label: '90D', val: '90' },
              ].map(item => (
                <button
                  key={item.val}
                  onClick={() => setDateFilter(item.val as any)}
                  className={cn(
                    "px-2.5 sm:px-3 h-7 rounded-md text-xs font-bold transition-all cursor-pointer flex-1 sm:flex-none text-center",
                    dateFilter === item.val
                      ? "bg-card text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {item.label}
                </button>
              ))}
              <button
                onClick={() => setDateFilter('custom')}
                className={cn(
                  "flex items-center justify-center gap-1 px-2.5 sm:px-3 h-7 rounded-md text-xs font-bold transition-all cursor-pointer flex-1 sm:flex-none",
                  dateFilter === 'custom'
                    ? "bg-card text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Calendar size={11} />
                <span>Custom</span>
              </button>
            </div>

            {/* Status Select Dropdown */}
            <div className="w-full sm:w-44 shrink-0">
              <SearchableSelect
                options={[
                  { id: 'all', name: 'All Status' },
                  { id: 'pending', name: 'Pending' },
                  { id: 'settled', name: 'Settled' }
                ]}
                value={statusFilter}
                onChange={(val) => setStatusFilter(val)}
                showSearch={false}
                placeholder="Filter Status"
                className="h-8 rounded-md font-semibold text-xs w-full"
              />
            </div>
          </div>

          {/* Backend Search Box */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={13} />
            <input
              type="text"
              placeholder="Search by customer name, phone, invoice, or order ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 h-8 text-xs bg-muted/40 border border-border rounded-md focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground transition-all"
            />
          </div>

          {/* Custom Date Inputs Picker */}
          {dateFilter === 'custom' && (
            <div className="pt-2 border-t border-border/80 space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-3 text-xs animate-fade-in relative z-30">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
                <div className="flex items-center gap-1.5 relative z-20">
                  <span className="font-bold text-muted-foreground text-[10.5px] shrink-0">From:</span>
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
                <div className="flex items-center gap-1.5 relative z-10">
                  <span className="font-bold text-muted-foreground text-[10.5px] shrink-0">To:</span>
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
        </div>

        <div>
          {isLoading && settlementsList.length === 0 ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-10 w-full rounded-md" />
              ))}
            </div>
          ) : settlementsList.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <div className="w-10 h-10 rounded-md bg-muted text-muted-foreground flex items-center justify-center mx-auto border border-border">
                <Wallet size={18} />
              </div>
              <h4 className="font-bold text-foreground text-xs sm:text-sm">No Settlement Transactions Found</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {debouncedSearch 
                  ? `No records match "${debouncedSearch}".` 
                  : 'Online payments received from customer orders will automatically appear here.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto header-scrollbar-x w-full">
              <table className="w-full min-w-[900px] text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/80 whitespace-nowrap">
                    <th className="py-3 px-3.5">Date & Time</th>
                    <th className="py-3 px-3.5">Invoice / Ref ID</th>
                    <th className="py-3 px-3.5">Customer</th>
                    <th className="py-3 px-3.5">Method</th>
                    <th className="py-3 px-3.5 text-right">Gross Amount</th>
                    <th className="py-3 px-3.5 text-right">Gateway Fee</th>
                    <th className="py-3 px-3.5 text-right">Net Settlement</th>
                    <th className="py-3 px-3.5 text-center">Settlement Status</th>
                    <th className="py-3 px-3.5 text-center">Payout Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-medium">
                  {settlementsList.map((item, index) => {
                    const dt = formatSettlementDateTime(item.created_at);
                    return (
                      <tr key={`${item.order_id}-${index}`} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-3.5 text-foreground font-mono text-[11px] whitespace-nowrap">
                          <div className="font-semibold">{dt.date}</div>
                          {dt.time && <div className="text-[10px] text-muted-foreground">{dt.time}</div>}
                        </td>
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span className="font-mono font-bold text-foreground block">{item.invoice_no}</span>
                          <span className="text-[10px] text-muted-foreground block font-mono">Ref: {item.payment_reference}</span>
                        </td>
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span className="font-bold text-foreground block">{item.customer_name}</span>
                          {item.customer_phone && (
                            <span className="text-[10px] text-muted-foreground block font-mono">{item.customer_phone}</span>
                          )}
                        </td>
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span className="capitalize px-2 py-0.5 rounded-md bg-muted font-bold text-[9.5px] text-foreground border border-border/60">
                            {item.payment_method}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-right font-mono font-bold text-foreground whitespace-nowrap">
                          {currency}{item.gross_amount.toFixed(2)}
                        </td>
                        <td className="py-3 px-3.5 text-right font-mono text-muted-foreground whitespace-nowrap">
                          {item.platform_fee > 0 ? `-${currency}${item.platform_fee.toFixed(2)}` : `${currency}0.00`}
                        </td>
                        <td className="py-3 px-3.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {currency}{item.net_settlement_amount.toFixed(2)}
                        </td>

                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          {item.settlement_status === 'settled' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9.5px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 size={11} /> Settled
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9.5px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              <Clock size={11} className="animate-pulse" /> Pending
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          {item.settlement_status === 'settled' && item.actual_settled_date ? (
                            <span className="font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              {formatSettlementDate(item.actual_settled_date)}
                            </span>
                          ) : (
                            <span className="font-mono text-[11px] font-medium text-muted-foreground">
                              Est: {formatSettlementDate(item.estimated_payout_date)}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* API Infinite Scroll Trigger */}
              <InfiniteScrollTrigger
                onIntersect={handleLoadMore}
                isLoading={isFetchingMore}
                hasMore={hasMore}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
