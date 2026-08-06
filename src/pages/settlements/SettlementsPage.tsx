import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { 
  Wallet, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Search, 
  ArrowUpRight, 
  Info, 
  Building2, 
  CreditCard,
  Download,
  Filter,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  Trophy
} from 'lucide-react';
import { api } from '@/services/api';
import { useShopStore } from '@/store/shopStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { DatePicker } from '@/components/ui/DatePicker';
import toast from 'react-hot-toast';

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
}

interface SettlementSummary {
  total_online_sales: number;
  total_settled_amount: number;
  total_pending_settlement: number;
  total_transactions_count: number;
  settled_count: number;
  pending_count: number;
  payout_upi_id?: string;
  settlement_policy_notice: string;
  contest_participants_count: number;
  contest_settlement_amount: number;
  settlements: SettlementItem[];
}

export function SettlementsPage() {
  const navigate = useNavigate();
  const { shop } = useShopStore();
  const currency = shop?.settings?.currency || '₹';

  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<SettlementSummary | null>(null);
  
  // Filters
  const [dateFilter, setDateFilter] = useState<'7' | '30' | '90' | 'custom'>('30');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchSettlements = async () => {
    setIsLoading(true);
    try {
      const params: any = {
        status_filter: statusFilter,
      };
      if (dateFilter === 'custom') {
        if (customStart && customEnd) {
          params.start_date = customStart;
          params.end_date = customEnd;
        } else {
          setIsLoading(false);
          return;
        }
      } else {
        params.days = parseInt(dateFilter);
      }

      const res = await api.get('/settlements/me', { params });
      setSummary(res.data);
    } catch (err) {
      console.error("Failed to load settlements", err);
      toast.error("Failed to load settlements summary.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (dateFilter === 'custom' && (!customStart || !customEnd)) return;
    fetchSettlements();
  }, [dateFilter, customStart, customEnd, statusFilter]);

  const filteredSettlements = useMemo(() => {
    if (!summary?.settlements) return [];
    if (!searchQuery.trim()) return summary.settlements;
    const query = searchQuery.toLowerCase();
    return summary.settlements.filter(item => 
      item.customer_name?.toLowerCase().includes(query) ||
      item.customer_phone?.includes(query) ||
      item.invoice_no?.toLowerCase().includes(query) ||
      item.payment_reference?.toLowerCase().includes(query) ||
      item.order_id?.toLowerCase().includes(query)
    );
  }, [summary, searchQuery]);

  return (
    <div className="space-y-4 max-w-6xl mx-auto animate-fade-in pb-24 lg:pb-12">
      <PageHeader
        title="Settlements & Payouts"
        subtitle="View online payment settlements, pending payout timelines, and date-wise revenue breakdowns."
      />

      {/* 7 WORKING DAYS SETTLEMENT POLICY BANNER */}
      <Card className="border-blue-200/80 dark:border-blue-900/40 bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-slate-50 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-slate-900 shadow-xs overflow-hidden">
        <CardContent className="p-3 sm:p-3.5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs shadow-blue-500/20">
                <Clock size={16} className="animate-pulse" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-xs text-slate-900 dark:text-white">
                    7 Working Days Settlement Policy
                  </h3>
                  <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                    Standard Payout
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug max-w-2xl">
                  Online payments received for Takeaway & Delivery orders are settled within <strong>7 working days</strong> to your registered payout account.
                </p>
                {summary?.payout_upi_id ? (
                  <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 pt-0.5">
                    <ShieldCheck size={13} /> Registered Payout UPI: <span className="font-mono bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 text-[10px]">{summary.payout_upi_id}</span>
                  </p>
                ) : (
                  <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 pt-0.5">
                    <AlertCircle size={13} /> No Shop UPI ID configured. <button onClick={() => navigate('/settings')} className="underline hover:text-amber-700">Add UPI in Settings</button>
                  </p>
                )}
              </div>
            </div>

            <Button
              onClick={() => navigate('/settings')}
              variant="outline"
              size="sm"
              className="rounded-xl font-bold text-xs h-8 px-3 shrink-0 bg-white dark:bg-slate-900 shadow-xs"
            >
              <Building2 size={13} className="mr-1 text-blue-600" />
              Configure Payout
            </Button>
          </div>
        </CardContent>
      </Card>      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Total Pending Settlement */}
        <Card className="border-amber-200/60 dark:border-amber-900/30 bg-amber-50/30 dark:bg-amber-950/10">
          <CardContent className="p-3.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-amber-800 dark:text-amber-300 uppercase tracking-wider">Pending Settlement</span>
              <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-600 flex items-center justify-center">
                <Clock size={14} />
              </div>
            </div>
            {isLoading ? (
              <Skeleton className="h-6 w-24" />
            ) : (
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  {currency}{summary?.total_pending_settlement.toFixed(2) || '0.00'}
                </h3>
                <p className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold mt-0.5">
                  {summary?.pending_count || 0} order(s) pending payout
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Total Amount Settled */}
        <Card className="border-emerald-200/60 dark:border-emerald-900/30 bg-emerald-50/30 dark:bg-emerald-950/10">
          <CardContent className="p-3.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">Total Settled</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 size={14} />
              </div>
            </div>
            {isLoading ? (
              <Skeleton className="h-6 w-24" />
            ) : (
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  {currency}{summary?.total_settled_amount.toFixed(2) || '0.00'}
                </h3>
                <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5">
                  {summary?.settled_count || 0} payout(s) completed
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gross Online Sales */}
        <Card className="border-blue-200/60 dark:border-blue-900/30 bg-blue-50/30 dark:bg-blue-950/10">
          <CardContent className="p-3.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-blue-800 dark:text-blue-300 uppercase tracking-wider">Gross Online Sales</span>
              <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 flex items-center justify-center">
                <Wallet size={14} />
              </div>
            </div>
            {isLoading ? (
              <Skeleton className="h-6 w-24" />
            ) : (
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  {currency}{summary?.total_online_sales.toFixed(2) || '0.00'}
                </h3>
                <p className="text-[10px] text-blue-700 dark:text-blue-400 font-semibold mt-0.5">
                  {summary?.total_transactions_count || 0} online payments
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contest Settlements */}
        <Card className="border-fuchsia-200/60 dark:border-fuchsia-900/30 bg-fuchsia-50/30 dark:bg-fuchsia-950/10">
          <CardContent className="p-3.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-fuchsia-800 dark:text-fuchsia-300 uppercase tracking-wider">Contest Bonus</span>
              <div className="w-7 h-7 rounded-lg bg-fuchsia-100 dark:bg-fuchsia-900/50 text-fuchsia-600 flex items-center justify-center">
                <Trophy size={14} />
              </div>
            </div>
            {isLoading ? (
              <Skeleton className="h-6 w-24" />
            ) : (
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  {currency}{(summary?.contest_settlement_amount || 0).toFixed(2)}
                </h3>
                <p className="text-[10px] text-fuchsia-700 dark:text-fuchsia-400 font-semibold mt-0.5">
                  {summary?.contest_participants_count || 0} participant(s)
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payout Target */}
        <Card className="border-purple-200/60 dark:border-purple-900/30 bg-purple-50/30 dark:bg-purple-950/10">
          <CardContent className="p-3.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-purple-800 dark:text-purple-300 uppercase tracking-wider">Payout Target</span>
              <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-600 flex items-center justify-center">
                <Building2 size={14} />
              </div>
            </div>
            {isLoading ? (
              <Skeleton className="h-6 w-24" />
            ) : (
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white truncate" title={summary?.payout_upi_id || ''}>
                  {summary?.payout_upi_id || 'Not Configured'}
                </h3>
                <p className="text-[10px] text-purple-700 dark:text-purple-400 font-semibold mt-0.5">
                  {summary?.payout_upi_id ? 'Direct UPI Payout active' : 'Click settings to configure'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* FILTER CONTROLS & STICKY TOOLBAR */}
      <Card className="overflow-visible">
        {/* Sticky Header Bar on Scroll */}
        <div className="sticky -top-4 sm:-top-6 lg:-top-8 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 p-3 sm:p-4 rounded-t-2xl shadow-md space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm sm:text-base font-extrabold flex items-center gap-2">
                <CreditCard size={18} className="text-primary shrink-0" />
                Settlement Transactions
              </CardTitle>
              <CardDescription className="text-[11px] text-slate-500">
                Date-wise breakdown of online payments, platform charges, net amounts, and settlement status.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Date Filter Buttons */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs font-bold shrink-0">
                {[
                  { label: '7 Days', val: '7' },
                  { label: '30 Days', val: '30' },
                  { label: '90 Days', val: '90' },
                ].map(item => (
                  <button
                    key={item.val}
                    onClick={() => setDateFilter(item.val as any)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] transition-all cursor-pointer ${
                      dateFilter === item.val
                        ? 'bg-white dark:bg-slate-900 text-primary shadow-xs font-black'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-semibold'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
                <button
                  onClick={() => setDateFilter('custom')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] transition-all cursor-pointer ${
                    dateFilter === 'custom'
                      ? 'bg-white dark:bg-slate-900 text-primary shadow-xs font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-semibold'
                  }`}
                >
                  <Calendar size={12} />
                  <span>Custom</span>
                </button>
              </div>

              {/* Styled Status Select Dropdown */}
              <div className="w-40 sm:w-44 shrink-0">
                <SearchableSelect
                  options={[
                    { id: 'all', name: 'All Status' },
                    { id: 'pending', name: 'Pending Settlement' },
                    { id: 'settled', name: 'Settled' }
                  ]}
                  value={statusFilter}
                  onChange={(val) => setStatusFilter(val)}
                  showSearch={false}
                  placeholder="Filter Status"
                  className="bg-white dark:bg-slate-900 font-semibold"
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={fetchSettlements}
                className="rounded-xl h-9 px-2.5 shrink-0"
                title="Refresh Settlements"
              >
                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              </Button>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search by Customer name, Phone, Invoice No, or Order ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-primary font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400"
            />
          </div>

          {/* Custom Date Inputs Picker */}
          {dateFilter === 'custom' && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-3 text-xs animate-fade-in relative z-30">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
                <div className="flex items-center gap-1.5 relative z-20">
                  <span className="font-bold text-slate-500 text-[11px] shrink-0">From:</span>
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
                  <span className="font-bold text-slate-500 text-[11px] shrink-0">To:</span>
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

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : filteredSettlements.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <Wallet size={24} />
              </div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">No Settlement Transactions Found</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery 
                  ? 'No records match your search query.' 
                  : 'Online payments received from customer orders will automatically show here date-wise.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Invoice / Ref ID</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4 text-right">Gross Amt</th>
                    <th className="py-3 px-4 text-right">Gateway Fee</th>
                    <th className="py-3 px-4 text-right">Net Settlement</th>
                    <th className="py-3 px-4">Settlement Status</th>
                    <th className="py-3 px-4 text-center">Est. Payout Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                  {filteredSettlements.map((item) => (
                    <tr key={item.order_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                        {item.created_at}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{item.invoice_no}</span>
                        <span className="text-[10px] text-slate-400 block font-mono">Ref: {item.payment_reference}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{item.customer_name}</span>
                        {item.customer_phone && (
                          <span className="text-[10px] text-slate-400 block font-mono">{item.customer_phone}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="capitalize px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-bold text-[10px] text-slate-600 dark:text-slate-300">
                          {item.payment_method}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                        {currency}{item.gross_amount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-400">
                        -{currency}{item.platform_fee.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                        {currency}{item.net_settlement_amount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        {item.settlement_status === 'settled' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 size={11} /> Settled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                            <Clock size={11} className="animate-pulse" /> Pending
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        {item.estimated_payout_date}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
