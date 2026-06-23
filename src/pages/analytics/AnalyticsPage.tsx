import { useState, useEffect } from 'react';
import { QrCode, Eye, Search, CalendarDays, Filter, Users, Lock, ChevronRight } from 'lucide-react';
import { api } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { useShopStore } from '@/store/shopStore';
import { membershipService, RepeatedCustomer } from '@/services/memberships';

export function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [repeatedCustomers, setRepeatedCustomers] = useState<RepeatedCustomer[]>([]);
  const [subscriptionInfo, setSubscriptionInfo] = useState<{is_active: boolean, is_all_access: boolean, active_modules: string[]} | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<number | 'custom'>(30);
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [activeBar, setActiveBar] = useState<number | null>(null);
  const { shop } = useShopStore();
  
  const [viewAllModal, setViewAllModal] = useState<{isOpen: boolean, type: 'views' | 'searches' | 'repeated' | null}>({isOpen: false, type: null});
  const [modalSearch, setModalSearch] = useState('');
  
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dailyReportData, setDailyReportData] = useState<any>(null);
  
  const handleBarClick = async (date: string) => {
    setSelectedDate(date);
    
    try {
      const res = await api.get(`/analytics/daily?date=${date}`);
      setDailyReportData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      
    }
  };

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        let currentShopId = shop?.id;
        
        // Fetch shop if not loaded
        if (!shop) {
          const shopRes = await api.get('/shops/me');
          if (shopRes.data.id) {
            // setShop(shopRes.data);
            currentShopId = shopRes.data.id;
          }
        }

        const [res, subRes] = await Promise.all([
          api.get('/analytics/dashboard'),
          api.get('/subscription/current')
        ]);
        setData(res.data);
        setSubscriptionInfo(subRes.data);
        
        if (currentShopId) {
          const repeated = await membershipService.getRepeatedCustomers(currentShopId, 2);
          setRepeatedCustomers(repeated);
        }
      } catch (error) {
        console.error('Failed to fetch analytics', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, [shop?.id]);

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-6xl">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  const hasAdvancedFilters = subscriptionInfo?.is_all_access || subscriptionInfo?.active_modules?.includes('analytics-advanced-filters');
  const hasCustomerInsights = subscriptionInfo?.is_all_access || subscriptionInfo?.active_modules?.includes('analytics-customer-insights');

  // Filter data based on selected range
  const filteredScans = dateFilter === 'custom'
    ? (data?.daily_scans || []).filter((d: any) => {
        const date = new Date(d.date);
        const start = customStart ? new Date(customStart) : new Date(0);
        const end = customEnd ? new Date(customEnd + 'T23:59:59') : new Date('2999-12-31');
        return date >= start && date <= end;
      })
    : (data?.daily_scans?.slice(-dateFilter) || []);
  const maxScans = filteredScans.length > 0 
    ? Math.max(...filteredScans.map((d: any) => d.count)) 
    : 10;

  const displayData = selectedDate && dailyReportData ? {
    ...data,
    overview: {
      total_qr_scans: dailyReportData.total_scans,
      total_menu_views: dailyReportData.total_views,
    },
    top_items: dailyReportData.top_items,
    top_searches: dailyReportData.top_searches,
  } : data;

  const displayRepeatedCustomers = selectedDate && dailyReportData ? dailyReportData.repeated_customers : repeatedCustomers;

  return (
    <div className="space-y-6 sm:space-y-8 max-w-6xl animate-fade-in pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4">
        <PageHeader 
          title={selectedDate ? `Daily Report: ${new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}` : "Analytics & Reports"}
          subtitle={selectedDate ? "Showing data for the selected date only." : "Track your menu's performance and customer behavior."}
          className="mb-0"
        />
        {selectedDate && (
          <button 
            onClick={() => setSelectedDate(null)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
          >
            Get Overall
          </button>
        )}
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-start gap-2">
              <div>
                <p className="text-xs sm:text-sm font-medium text-slate-500 mb-0.5 sm:mb-1 truncate">
                  Total Scans
                </p>
                <h3 className="text-2xl sm:text-4xl font-bold text-slate-900 dark:text-white">
                  {displayData?.overview?.total_qr_scans || 0}
                </h3>
              </div>
              <div className="p-2 sm:p-3 rounded-xl self-start bg-purple-100 dark:bg-purple-900/30 text-purple-500">
                <QrCode className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-start gap-2">
              <div>
                <p className="text-xs sm:text-sm font-medium text-slate-500 mb-0.5 sm:mb-1 truncate">
                  Menu Views
                </p>
                <h3 className="text-2xl sm:text-4xl font-bold text-slate-900 dark:text-white">
                  {displayData?.overview?.total_menu_views || 0}
                </h3>
              </div>
              <div className="p-2 sm:p-3 rounded-xl self-start bg-orange-100 dark:bg-orange-900/30 text-orange-500">
                <Eye className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="flex flex-col gap-3 pb-2">
          <div className="flex flex-row items-center justify-between w-full">
            <CardTitle className="flex items-center text-lg">
              <CalendarDays size={18} className="mr-2 text-primary" />
              Scan Activity
            </CardTitle>
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-slate-400" />
              <div className="w-40">
                {!hasAdvancedFilters ? (
                  <div className="flex items-center justify-between px-3 h-9 bg-slate-100 dark:bg-slate-800 rounded-md text-sm text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700 select-none">
                    <span>30 Days (Basic)</span>
                    <Lock size={12} className="text-slate-400" />
                  </div>
                ) : (
                  <SearchableSelect
                    options={[
                      { id: '7', name: 'Last 7 Days' },
                      { id: '14', name: 'Last 14 Days' },
                      { id: '30', name: 'Last 30 Days' },
                      { id: 'custom', name: 'Custom Range' },
                    ]}
                    value={dateFilter.toString()}
                    onChange={(val) => setDateFilter(val === 'custom' ? 'custom' : Number(val))}
                    showSearch={false}
                    className="h-9 bg-slate-100 dark:bg-slate-800 border-none shadow-none"
                  />
                )}
              </div>
            </div>
          </div>
          {dateFilter === 'custom' && (
            <div className="flex items-center justify-end gap-2 text-sm w-full animate-fade-in">
              <input 
                type="date" 
                value={customStart} 
                onChange={e => setCustomStart(e.target.value)}
                className="h-9 px-3 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/50 text-slate-700 dark:text-slate-300"
              />
              <span className="text-slate-400 font-medium">to</span>
              <input 
                type="date" 
                value={customEnd} 
                onChange={e => setCustomEnd(e.target.value)}
                className="h-9 px-3 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/50 text-slate-700 dark:text-slate-300"
              />
            </div>
          )}
        </CardHeader>
        <CardContent>
          {filteredScans.length > 0 ? (
            <div className="h-56 flex items-end gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 relative">
              {/* Y-axis lines could go here */}
              {filteredScans.map((day: any, i: number) => {
                const height = maxScans > 0 ? `${(day.count / maxScans) * 100}%` : '0%';
                // Show fewer labels depending on range
                const showLabel = dateFilter === 'custom' 
                  ? (filteredScans.length <= 7 || i % Math.ceil(filteredScans.length / 7) === 0 || i === filteredScans.length - 1)
                  : (dateFilter <= 7 || i % Math.ceil(filteredScans.length / 7) === 0 || i === filteredScans.length - 1);
                
                return (
                  <div 
                    key={i} 
                    className="flex-1 flex flex-col items-center group relative h-full justify-end"
                    onClick={() => handleBarClick(day.date)}
                    onMouseEnter={() => setActiveBar(i)}
                    onMouseLeave={() => setActiveBar(null)}
                  >
                    <div 
                      className="w-full max-w-[40px] bg-primary/20 dark:bg-primary-900/40 hover:bg-primary rounded-t-md transition-all relative cursor-pointer border border-primary/10"
                      style={{ height: height === '0%' ? '4px' : height }}
                    >
                      {/* Tooltip */}
                      <div className={`absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs py-1.5 px-3 rounded-lg transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg ${activeBar === i ? 'opacity-100' : 'opacity-0 md:group-hover:opacity-100'}`}>
                        <span className="font-bold">{day.count} scans</span><br/>
                        <span className="text-slate-300">{new Date(day.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-[4px] border-r-[4px] border-t-[4px] border-transparent border-t-slate-900"></div>
                      </div>
                    </div>
                    {/* Date Label */}
                    <div className="h-8 mt-2 flex items-center justify-center overflow-visible">
                      {showLabel && (
                        <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">
                          {new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400">
              No scan data available for this period.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Viewed Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Eye size={18} className="mr-2 text-slate-500" />
              Most Viewed Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            {displayData?.top_items?.length > 0 ? (
              <div className="space-y-4">
                {displayData.top_items.slice(0, 5).map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="font-medium text-sm">{item.name}</span>
                    <div className="flex items-center">
                      <div className="w-32 h-2 bg-slate-100 dark:bg-slate-800 rounded-full mr-3 overflow-hidden">
                        <div 
                          className="h-full bg-primary" 
                          style={{ width: `${(item.count / displayData.top_items[0].count) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-semibold w-8 text-right">{item.count}</span>
                    </div>
                  </div>
                ))}
                {displayData.top_items.length > 5 && (
                  <button 
                    onClick={() => { setViewAllModal({isOpen: true, type: 'views'}); setModalSearch(''); }}
                    className="w-full py-2 mt-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    +{displayData.top_items.length - 5} more items
                  </button>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500 py-4 text-center">No view data available yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Top Searches */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Search size={18} className="mr-2 text-slate-500" />
              Top Searches
            </CardTitle>
          </CardHeader>
          <CardContent>
            {displayData?.top_searches?.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {displayData.top_searches.slice(0, 5).map((search: any, i: number) => {
                  // Calculate size based on count relative to max
                  const maxCount = displayData.top_searches[0].count;
                  const ratio = search.count / maxCount;
                  const sizeClass = ratio > 0.8 ? 'text-sm font-semibold bg-primary-100 dark:bg-primary-900/40' 
                                  : ratio > 0.4 ? 'text-xs font-medium bg-slate-100 dark:bg-slate-800' 
                                  : 'text-[11px] bg-slate-50 dark:bg-slate-800/50';
                  
                  return (
                    <span key={i} className={`px-3 py-1.5 rounded-full text-slate-700 dark:text-slate-300 flex items-center gap-2 ${sizeClass}`}>
                      {search.term}
                      <span className="text-[10px] opacity-60 bg-white/50 dark:bg-black/20 px-1.5 rounded-full">{search.count}</span>
                    </span>
                  );
                })}
                {displayData.top_searches.length > 5 && (
                  <button
                    onClick={() => { setViewAllModal({isOpen: true, type: 'searches'}); setModalSearch(''); }}
                    className="px-3 py-1.5 rounded-full text-sm font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                  >
                    +{displayData.top_searches.length - 5} more
                  </button>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500 py-4 text-center">No search data available yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Repeated Customers Report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users size={18} className="mr-2 text-slate-500" />
            Top Repeated Customers
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!hasCustomerInsights ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900/50">
              <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-4">
                <Lock size={20} className="text-indigo-500" />
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white mb-2">Customer Insights Locked</h4>
              <p className="text-sm text-slate-500 max-w-sm mb-5">
                Upgrade to the Customer Insights Report add-on to view top repeated customers, visit counts, and contact information.
              </p>
              <a href="/dashboard/subscriptions" className="bg-primary hover:bg-primary-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2 transition-colors">
                View Add-ons <ChevronRight size={16} />
              </a>
            </div>
          ) : displayRepeatedCustomers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <th className="py-2 px-3 font-medium text-slate-500">Name</th>
                    <th className="py-2 px-3 font-medium text-slate-500">Mobile</th>
                    <th className="py-2 px-3 font-medium text-slate-500 text-center">Visits</th>
                  </tr>
                </thead>
                <tbody>
                  {displayRepeatedCustomers.slice(0, 5).map((customer: any, idx: number) => (
                    <tr key={idx} className="border-b border-slate-50 dark:border-slate-800/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200">{customer.name || 'Anonymous'}</td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">{customer.mobile_number}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold px-2.5 py-1 rounded-full text-xs border border-indigo-100 dark:border-indigo-800">
                          {customer.visit_count}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {displayRepeatedCustomers.length > 5 && (
                <button
                  onClick={() => { setViewAllModal({isOpen: true, type: 'repeated'}); setModalSearch(''); }}
                  className="w-full py-2 mt-4 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  +{displayRepeatedCustomers.length - 5} more customers
                </button>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500 py-4 text-center">No repeated customers found yet.</p>
          )}
        </CardContent>
      </Card>

      {/* View All Modal */}
      <Modal
        isOpen={viewAllModal.isOpen}
        onClose={() => {
          setViewAllModal({isOpen: false, type: null});
          setModalSearch('');
        }}
        title={viewAllModal.type === 'views' ? 'All Viewed Items' : viewAllModal.type === 'searches' ? 'All Searches' : 'All Repeated Customers'}
        className="max-w-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
      >
        <div className="mt-4">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search..."
              value={modalSearch}
              onChange={(e) => setModalSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-all"
            />
          </div>

          <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-4 custom-scrollbar">
            {viewAllModal.type === 'views' && displayData?.top_items && (
              displayData.top_items
                .filter((item: any) => item.name.toLowerCase().includes(modalSearch.toLowerCase()))
                .length > 0 ? (
                  displayData.top_items
                    .filter((item: any) => item.name.toLowerCase().includes(modalSearch.toLowerCase()))
                    .map((item: any, i: number) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="font-medium text-sm">{item.name}</span>
                        <div className="flex items-center">
                          <div className="w-32 h-2 bg-slate-100 dark:bg-slate-800 rounded-full mr-3 overflow-hidden">
                            <div 
                              className="h-full bg-primary" 
                              style={{ width: `${(item.count / displayData.top_items[0].count) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-semibold w-8 text-right">{item.count}</span>
                        </div>
                      </div>
                    ))
                ) : (
                  <p className="text-sm text-slate-500 py-4 text-center">No items match your search.</p>
                )
            )}

            {viewAllModal.type === 'searches' && displayData?.top_searches && (
              displayData.top_searches.filter((search: any) => search.term.toLowerCase().includes(modalSearch.toLowerCase())).length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {displayData.top_searches
                    .filter((search: any) => search.term.toLowerCase().includes(modalSearch.toLowerCase()))
                    .map((search: any, i: number) => {
                      const maxCount = displayData.top_searches[0].count;
                      const ratio = search.count / maxCount;
                      const sizeClass = ratio > 0.8 ? 'text-sm font-semibold bg-primary-100 dark:bg-primary-900/40' 
                                      : ratio > 0.4 ? 'text-xs font-medium bg-slate-100 dark:bg-slate-800' 
                                      : 'text-[11px] bg-slate-50 dark:bg-slate-800/50';
                      return (
                        <span key={i} className={`px-3 py-1.5 rounded-full text-slate-700 dark:text-slate-300 flex items-center gap-2 ${sizeClass}`}>
                          {search.term}
                          <span className="text-[10px] opacity-60 bg-white/50 dark:bg-black/20 px-1.5 rounded-full">{search.count}</span>
                        </span>
                      );
                    })}
                </div>
              ) : (
                <p className="text-sm text-slate-500 py-4 text-center">No searches match your search.</p>
              )
            )}

            {viewAllModal.type === 'repeated' && displayRepeatedCustomers && (
              displayRepeatedCustomers.filter((c: any) => (c.name || '').toLowerCase().includes(modalSearch.toLowerCase()) || c.mobile_number.includes(modalSearch)).length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800">
                        <th className="py-2 px-3 font-medium text-slate-500">Name</th>
                        <th className="py-2 px-3 font-medium text-slate-500">Mobile</th>
                        <th className="py-2 px-3 font-medium text-slate-500 text-center">Visits</th>
                      </tr>
                    </thead>
                    <tbody>
                      {repeatedCustomers
                        .filter((c: any) => (c.name || '').toLowerCase().includes(modalSearch.toLowerCase()) || c.mobile_number.includes(modalSearch))
                        .map((customer: any, idx: number) => (
                          <tr key={idx} className="border-b border-slate-50 dark:border-slate-800/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200">{customer.name || 'Anonymous'}</td>
                            <td className="py-3 px-3 text-slate-600 dark:text-slate-400">{customer.mobile_number}</td>
                            <td className="py-3 px-3 text-center">
                              <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold px-2.5 py-1 rounded-full text-xs border border-indigo-100 dark:border-indigo-800">
                                {customer.visit_count}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-slate-500 py-4 text-center">No customers match your search.</p>
              )
            )}
          </div>
        </div>
      </Modal>

    </div>
  );
}
