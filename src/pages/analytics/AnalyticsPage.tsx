import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router';
import { 
  QrCode, Eye, Search, CalendarDays, Filter, Users, Lock, ChevronRight, ChevronLeft,
  TrendingUp, TrendingDown, DollarSign, Receipt, ShoppingBag, Trophy, Download, ExternalLink, ArrowUpRight, Wallet, FileText, Calendar, CheckCircle2, CreditCard, Banknote,
  PieChart, Smartphone, Package, Layers, BarChart2, ArrowLeft, Tag, ArrowUpDown, Check
} from 'lucide-react';
import { api } from '@/services/api';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { useHeaderStore } from '@/store/useHeaderStore';
import { HeaderActions } from '@/components/HeaderActions';
import { DatePicker } from '@/components/ui/DatePicker';
import { Modal } from '@/components/ui/Modal';
import { useShopStore } from '@/store/shopStore';
import { getBusinessCategory } from '@/config/businessCategories';
import { membershipService, RepeatedCustomer } from '@/services/memberships';
import { InfiniteScrollTrigger } from '@/components/ui/InfiniteScrollTrigger';

import { Button } from '@/components/ui/Button';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { HorizontalScrollContainer } from '@/components/ui/HorizontalScrollContainer';
import { cn } from '@/utils/cn';
import { formatLocalDateTime } from '@/utils/dateTime';

export function AnalyticsPage() {
  const navigate = useNavigate();
  const { shop } = useShopStore();
  const businessCategory = getBusinessCategory(shop?.category);
  const currencySymbol = shop?.currency_symbol || '₹';

  const [activeTab, setActiveTab] = useState<'revenue' | 'products' | 'scans' | 'gst'>('revenue');
  const [data, setData] = useState<any>(null);
  const [revenueData, setRevenueData] = useState<any>(null);
  const [productSalesData, setProductSalesData] = useState<any>(null);
  const [isProductSalesLoading, setIsProductSalesLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [productSortBy, setProductSortBy] = useState<'revenue' | 'quantity' | 'name'>('revenue');
  const [hoveredDailyStat, setHoveredDailyStat] = useState<any>(null);
  const [hoveredRevenueDay, setHoveredRevenueDay] = useState<any>(null);
  const [hoveredScanDay, setHoveredScanDay] = useState<any>(null);

  // Product Dropdown Async Search & Pagination
  const [dropdownSearch, setDropdownSearch] = useState('');
  const [dropdownProducts, setDropdownProducts] = useState<any[]>([]);
  const [dropdownSkip, setDropdownSkip] = useState(0);
  const [dropdownHasMore, setDropdownHasMore] = useState(true);
  const [isDropdownLoading, setIsDropdownLoading] = useState(false);
  const [isDropdownLoadingMore, setIsDropdownLoadingMore] = useState(false);

  const DROPDOWN_PAGE_SIZE = 20;

  const fetchDropdownProducts = useCallback(async (query: string, skipVal: number, append: boolean = false) => {
    if (append) {
      setIsDropdownLoadingMore(true);
    } else {
      setIsDropdownLoading(true);
    }
    try {
      const params = new URLSearchParams();
      if (query.trim()) {
        params.append('search', query.trim());
      }
      params.append('skip', String(skipVal));
      params.append('limit', String(DROPDOWN_PAGE_SIZE));
      
      const res = await api.get(`/menu-items?${params.toString()}`);
      const items = res.data || [];
      
      if (append) {
        setDropdownProducts(prev => {
          const existingIds = new Set(prev.map((it: any) => it.id));
          const newItems = items.filter((it: any) => !existingIds.has(it.id));
          return [...prev, ...newItems];
        });
      } else {
        setDropdownProducts(items);
      }
      setDropdownHasMore(items.length >= DROPDOWN_PAGE_SIZE);
      setDropdownSkip(skipVal + items.length);
    } catch (err) {
      console.error('Failed to fetch products for dropdown', err);
    } finally {
      setIsDropdownLoading(false);
      setIsDropdownLoadingMore(false);
    }
  }, []);

  // Debounced search for dropdown
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchDropdownProducts(dropdownSearch, 0, false);
    }, 250);
    return () => clearTimeout(handler);
  }, [dropdownSearch, fetchDropdownProducts]);

  const handleDropdownLoadMore = useCallback(() => {
    if (dropdownHasMore && !isDropdownLoadingMore && !isDropdownLoading) {
      fetchDropdownProducts(dropdownSearch, dropdownSkip, true);
    }
  }, [dropdownHasMore, isDropdownLoadingMore, isDropdownLoading, dropdownSearch, dropdownSkip, fetchDropdownProducts]);

  const productDropdownOptions = useMemo(() => {
    const salesMap = new Map<string, any>();
    (productSalesData?.products || []).forEach((p: any) => {
      if (p.name) salesMap.set(p.name.toLowerCase(), p);
      if (p.item_id) salesMap.set(String(p.item_id), p);
    });

    const optionsList: any[] = [
      {
        id: 'all',
        name: 'Overall (All Products)',
        icon: <ShoppingBag size={15} className="text-primary shrink-0" />,
        subtext: productSalesData?.total_products_sold_count ? `${productSalesData.total_products_sold_count} sold • ${currencySymbol}${productSalesData.total_product_revenue}` : undefined,
      }
    ];

    // If selectedProduct is not 'all' and not yet in dropdownProducts, add it so it displays nicely
    if (selectedProduct && selectedProduct !== 'all') {
      const isAlreadyInList = dropdownProducts.some((it: any) => it.name === selectedProduct);
      if (!isAlreadyInList) {
        const stats = salesMap.get(selectedProduct.toLowerCase());
        optionsList.push({
          id: selectedProduct,
          name: selectedProduct,
          icon: stats?.image_url ? (
            <img src={stats.image_url} alt={selectedProduct} className="w-5 h-5 rounded-md object-cover shrink-0 border border-slate-200 dark:border-slate-700" />
          ) : (
            <Package size={15} className="text-slate-400 shrink-0" />
          ),
          subtext: stats ? `${stats.total_quantity_sold} sold • ${currencySymbol}${stats.total_revenue}` : undefined,
        });
      }
    }

    dropdownProducts.forEach((item: any) => {
      const stats = salesMap.get(item.name?.toLowerCase()) || (item.id ? salesMap.get(String(item.id)) : null);
      const imgUrl = item.images?.[0]?.image_url || item.image_url || stats?.image_url;
      optionsList.push({
        id: item.name,
        name: item.name,
        icon: imgUrl ? (
          <img src={imgUrl} alt={item.name} className="w-5 h-5 rounded-md object-cover shrink-0 border border-slate-200 dark:border-slate-700" />
        ) : (
          <Package size={15} className="text-slate-400 shrink-0" />
        ),
        subtext: stats ? `${stats.total_quantity_sold} sold • ${currencySymbol}${stats.total_revenue}` : '0 sold',
      });
    });

    return optionsList;
  }, [dropdownProducts, selectedProduct, productSalesData, currencySymbol]);

  const [gstData, setGstData] = useState<any>(null);
  const [isGstLoading, setIsGstLoading] = useState(false);
  const [gstSearch, setGstSearch] = useState('');
  const [debouncedGstSearch, setDebouncedGstSearch] = useState('');
  const [gstPage, setGstPage] = useState(1);
  const [gstInvoices, setGstInvoices] = useState<any[]>([]);
  const [gstHasMore, setGstHasMore] = useState(false);
  const [isLoadingMoreGst, setIsLoadingMoreGst] = useState(false);
  const GST_PAGE_SIZE = 20;

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
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const [invoiceSearch, setInvoiceSearch] = useState('');
  
  // Card Search States
  const [dishSearch, setDishSearch] = useState('');
  const [revenueSearch, setRevenueSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [termSearch, setTermSearch] = useState('');

  // Debounce GST search to trigger backend query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedGstSearch(gstSearch);
    }, 350);
    return () => clearTimeout(handler);
  }, [gstSearch]);

  const getRevenueApiUrl = () => {
    if (dateFilter === 'custom' && customStart && customEnd) {
      return `/analytics/revenue?start_date=${customStart}&end_date=${customEnd}`;
    }
    return `/analytics/revenue?days=${typeof dateFilter === 'number' ? dateFilter : 30}`;
  };

  const getProductSalesApiUrl = (productName = selectedProduct, search = productSearch) => {
    const params = new URLSearchParams();
    if (dateFilter === 'custom' && customStart && customEnd) {
      params.append('start_date', customStart);
      params.append('end_date', customEnd);
    } else {
      params.append('days', String(typeof dateFilter === 'number' ? dateFilter : 30));
    }
    if (productName && productName !== 'all') {
      params.append('product_name', productName);
    }
    if (search && search.trim()) {
      params.append('search', search.trim());
    }
    return `/analytics/product-sales?${params.toString()}`;
  };

  const handleExportProductSalesCsv = () => {
    if (!productSalesData || !productSalesData.products || productSalesData.products.length === 0) {
      toast.error("No product sales data available to export.");
      return;
    }
    const isDrilldown = Boolean(selectedProduct && selectedProduct !== 'all');
    let headers: string[];
    let rows: (string | number)[][];

    if (isDrilldown) {
      if ((productSalesData.recent_sales || []).length > 0) {
        // Full order-level transaction details in local date/time
        headers = [
          "Order ID",
          "Date / Time",
          "Product Name",
          "Variant",
          "Customer Name",
          "Customer Phone",
          "Quantity Sold",
          "Unit Price (INR)",
          "Line Total (INR)",
          "Payment Method",
          "Order Type"
        ];
        rows = productSalesData.recent_sales.map((s: any) => [
          `"${s.order_id ? `#${s.order_id.slice(0, 8)}` : ''}"`,
          `"${formatLocalDateTime(s.created_at)}"`,
          `"${(selectedProduct || '').replace(/"/g, '""')}"`,
          `"${(s.variant_name || 'Standard').replace(/"/g, '""')}"`,
          `"${(s.customer_name || 'Guest').replace(/"/g, '""')}"`,
          `"${s.customer_phone || ''}"`,
          s.quantity,
          Number(s.unit_price || 0).toFixed(2),
          Number(s.total_price || 0).toFixed(2),
          `"${(s.payment_method || 'cash').toUpperCase()}"`,
          `"${(s.order_type || 'dine_in').toUpperCase()}"`
        ]);
      } else {
        // Active dates only, sorted newest date first
        headers = ["Product Name", "Date", "Units Sold", "Daily Revenue (INR)", "Orders Count"];
        rows = (productSalesData.daily_sales || [])
          .filter((d: any) => d.quantity_sold > 0)
          .slice()
          .reverse()
          .map((d: any) => [
            `"${selectedProduct}"`,
            `"${d.date}"`,
            d.quantity_sold,
            Number(d.revenue || 0).toFixed(2),
            d.orders_count
          ]);
      }
    } else {
      headers = ["Product Name", "Category", "Avg Unit Price (INR)", "Units Sold", "Total Revenue (INR)", "Orders Count", "First Sale Date", "Last Sale Date"];
      rows = productSalesData.products.map((p: any) => [
        `"${p.name.replace(/"/g, '""')}"`,
        `"${(p.category_name || 'Uncategorized').replace(/"/g, '""')}"`,
        Number(p.average_unit_price || 0).toFixed(2),
        p.total_quantity_sold,
        Number(p.total_revenue || 0).toFixed(2),
        p.orders_count,
        `"${p.first_sale_date || ''}"`,
        `"${p.last_sale_date || ''}"`
      ]);
    }

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Product_Sales_Report_${isDrilldown ? selectedProduct?.replace(/\s+/g, '_') : 'Overall'}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    toast.success("Product sales report CSV exported!");
  };

  const getGstApiUrl = (page = 1, limit = GST_PAGE_SIZE, search = debouncedGstSearch) => {
    const params = new URLSearchParams();
    if (dateFilter === 'custom' && customStart && customEnd) {
      params.append('start_date', customStart);
      params.append('end_date', customEnd);
    } else {
      params.append('days', String(typeof dateFilter === 'number' ? dateFilter : 30));
    }
    if (search.trim()) {
      params.append('search', search.trim());
    }
    params.append('page', String(page));
    params.append('limit', String(limit));
    return `/analytics/gst-report?${params.toString()}`;
  };

  const handleExportGstCsv = async () => {
    try {
      toast.loading("Exporting complete GSTR report...", { id: 'csv-export' });
      const exportUrl = getGstApiUrl(1, 10000, debouncedGstSearch);
      const res = await api.get(exportUrl);
      const fullData = res.data;
      if (!fullData || !fullData.invoices || fullData.invoices.length === 0) {
        toast.error("No tax invoices found to export.", { id: 'csv-export' });
        return;
      }
      const headers = [
        "Invoice Number",
        "Order ID",
        "Invoice Date",
        "Customer Name",
        "Customer Mobile",
        "Payment Mode",
        "Payment Status",
        "Taxable Turnover (INR)",
        "CGST Rate (%)",
        "CGST Amount (INR)",
        "SGST Rate (%)",
        "SGST Amount (INR)",
        "Total GST (INR)",
        "Gross Total (INR)"
      ];

      const rows = fullData.invoices.map((inv: any) => [
        `"${inv.invoice_no || inv.bill_number || ''}"`,
        `"${inv.order_id || ''}"`,
        `"${inv.date ? formatLocalDateTime(inv.date) : (inv.created_at ? formatLocalDateTime(inv.created_at) : '')}"`,
        `"${(inv.customer_name || 'Walk-in').replace(/"/g, '""')}"`,
        `"${inv.customer_phone || ''}"`,
        `"${inv.payment_method || ''}"`,
        `"${inv.payment_status || ''}"`,
        Number(inv.taxable_amount ?? inv.taxable_value ?? 0).toFixed(2),
        Number(inv.cgst_rate || 0),
        Number(inv.cgst_amount || 0).toFixed(2),
        Number(inv.sgst_rate || 0),
        Number(inv.sgst_amount || 0).toFixed(2),
        Number(inv.total_tax_amount ?? inv.total_tax ?? 0).toFixed(2),
        Number(inv.gross_amount ?? inv.gross_total ?? 0).toFixed(2)
      ]);

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `GSTR_Sales_Register_${typeof dateFilter === 'number' ? `${dateFilter}_days` : 'custom'}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("GSTR CSV exported successfully!", { id: 'csv-export' });
    } catch (e) {
      toast.error("Failed to export GSTR CSV", { id: 'csv-export' });
    }
  };

  const { setTitle } = useHeaderStore();

  useEffect(() => {
    setTitle('Analytics');
  }, [setTitle]);

  // Fetch GST report whenever tab is 'gst', date filter, or debounced search changes
  useEffect(() => {
    if (activeTab === 'gst') {
      if (dateFilter === 'custom' && (!customStart || !customEnd)) return;
      setIsGstLoading(true);
      setGstPage(1);
      api.get(getGstApiUrl(1, GST_PAGE_SIZE, debouncedGstSearch))
        .then(res => {
          setGstData(res.data);
          setGstInvoices(res.data?.invoices || []);
          setGstHasMore(Boolean(res.data?.has_more));
        })
        .catch(err => {
          console.error("Failed to fetch GST report", err);
          toast.error("Failed to load GST tax reports");
        })
        .finally(() => setIsGstLoading(false));
    }
  }, [activeTab, dateFilter, customStart, customEnd, debouncedGstSearch]);

  const handleLoadMoreGst = useCallback(async () => {
    if (!gstHasMore || isLoadingMoreGst || isGstLoading) return;
    setIsLoadingMoreGst(true);
    const nextPage = gstPage + 1;
    try {
      const res = await api.get(getGstApiUrl(nextPage, GST_PAGE_SIZE, debouncedGstSearch));
      const newInvoices = res.data?.invoices || [];
      setGstInvoices(prev => [...prev, ...newInvoices]);
      setGstPage(nextPage);
      setGstHasMore(Boolean(res.data?.has_more));
    } catch (err) {
      console.error("Failed to load more GST invoices", err);
    } finally {
      setIsLoadingMoreGst(false);
    }
  }, [gstHasMore, isLoadingMoreGst, isGstLoading, gstPage, debouncedGstSearch, dateFilter, customStart, customEnd]);

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
        let fetchShopPromise = null;
        if (!shop) {
          fetchShopPromise = api.get('/shops/me').then(res => {
            currentShopId = res.data?.id;
            return res;
          }).catch(() => ({ data: {} }));
        }

        const [shopRes, subRes, dashRes] = await Promise.all([
          fetchShopPromise || Promise.resolve(null),
          api.get('/subscription/current').catch(() => ({ data: null })),
          api.get('/analytics/dashboard').catch(() => ({ data: null }))
        ]);

        setSubscriptionInfo(subRes.data);
        setData(dashRes.data);

        // Fetch revenue and repeated customers in parallel after we guarantee we have currentShopId
        const fetchRevenuePromise = api.get(getRevenueApiUrl())
          .then(res => {
            setRevenueData(res.data);
            setIsLocked(false);
          })
          .catch(revErr => {
            if (revErr.response?.status === 403) {
              setIsLocked(true);
            }
          });

        const fetchRepeatedPromise = currentShopId
          ? membershipService.getRepeatedCustomers(currentShopId, 2)
              .then(repeated => setRepeatedCustomers(repeated))
              .catch(() => setRepeatedCustomers([]))
          : Promise.resolve();

        await Promise.all([fetchRevenuePromise, fetchRepeatedPromise]);

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

  useEffect(() => {
    if (activeTab === 'products' && !isLoading) {
      const fetchProductSales = async () => {
        if (dateFilter === 'custom' && (!customStart || !customEnd)) return;
        setIsProductSalesLoading(true);
        try {
          const res = await api.get(getProductSalesApiUrl());
          setProductSalesData(res.data);
          setIsLocked(false);
        } catch (err: any) {
          if (err.response?.status === 403) {
            setIsLocked(true);
          } else {
            console.error('Failed to update product sales filter', err);
          }
        } finally {
          setIsProductSalesLoading(false);
        }
      };
      fetchProductSales();
    }
  }, [activeTab, dateFilter, customStart, customEnd, selectedProduct, productSearch, isLoading]);

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
      <div className="space-y-6 w-full">
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
    <div className="space-y-4 w-full animate-fade-in pb-20">
      
      {/* DESKTOP HEADER ACTIONS - Tab Navigation */}
      <HeaderActions>
        <div className="bg-slate-100 dark:bg-slate-800 p-0.5 rounded-md flex items-center gap-0.5 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('revenue')}
            className={cn(
              "flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap cursor-pointer",
              activeTab === 'revenue' 
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold" 
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <TrendingUp size={13} />
            <span>Revenue</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={cn(
              "flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap cursor-pointer",
              activeTab === 'products' 
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold" 
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <Package size={13} />
            <span>Sales by Product</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('scans')}
            className={cn(
              "flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap cursor-pointer",
              activeTab === 'scans' 
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold" 
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <QrCode size={13} />
            <span>Traffic</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('gst')}
            className={cn(
              "flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap cursor-pointer",
              activeTab === 'gst' 
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold" 
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <Receipt size={13} />
            <span>GST Reports</span>
          </button>
        </div>
      </HeaderActions>

      {/* MOBILE TAB SWITCHER */}
      <div className="lg:hidden bg-slate-100 dark:bg-slate-800 p-1 rounded-md grid grid-cols-2 sm:grid-cols-4 gap-1 border border-slate-200/80 dark:border-slate-700/80 shrink-0 shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab('revenue')}
          className={cn(
            "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-all whitespace-nowrap cursor-pointer",
            activeTab === 'revenue' 
              ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold" 
              : "text-slate-600 dark:text-slate-400"
          )}
        >
          <TrendingUp size={13} /> Revenue
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('products')}
          className={cn(
            "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-all whitespace-nowrap cursor-pointer",
            activeTab === 'products' 
              ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold" 
              : "text-slate-600 dark:text-slate-400"
          )}
        >
          <Package size={13} /> Products
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('scans')}
          className={cn(
            "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-all whitespace-nowrap cursor-pointer",
            activeTab === 'scans' 
              ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold" 
              : "text-slate-600 dark:text-slate-400"
          )}
        >
          <QrCode size={13} /> Traffic
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('gst')}
          className={cn(
            "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-all whitespace-nowrap cursor-pointer",
            activeTab === 'gst' 
              ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold" 
              : "text-slate-600 dark:text-slate-400"
          )}
        >
          <Receipt size={13} /> GST
        </button>
      </div>

      {/* SUBSCRIPTION LOCKED BANNER */}
      {isLocked && (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 p-4 rounded-lg text-center space-y-2.5 shadow-2xs">
          <div className="w-10 h-10 rounded-md bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-2xs">
            <Lock size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Analytics Access Locked</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-0.5">
              Your subscription plan has expired. Real-time reports and sales analytics are locked. Please renew to restore full access.
            </p>
          </div>
          <Button size="sm" onClick={() => navigate('/subscription')} className="text-xs font-semibold px-4 py-1.5 shadow-2xs">
            Renew Subscription Now →
          </Button>
        </div>
      )}

      {/* UNIFIED TIMEFRAME & PAYMENT FILTER BAR */}
      <div className="bg-white dark:bg-slate-900 p-2.5 sm:p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-1 text-slate-500 mr-1">
            <CalendarDays size={14} className="text-primary" />
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Period:</span>
          </div>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-md border border-slate-200/60 dark:border-slate-700/60">
            {[
              { days: 7, label: '7D' },
              { days: 30, label: '30D' },
              { days: 90, label: '90D' },
            ].map(t => (
              <button
                key={t.days}
                type="button"
                onClick={() => setDateFilter(t.days)}
                className={cn(
                  "px-2.5 py-1 rounded-sm text-xs font-medium transition-all cursor-pointer",
                  dateFilter === t.days 
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold" 
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                {t.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setDateFilter('custom')}
              className={cn(
                "px-2.5 py-1 rounded-sm text-xs font-medium transition-all flex items-center gap-1 cursor-pointer",
                dateFilter === 'custom' 
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold" 
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <Calendar size={12} />
              <span>Custom</span>
            </button>
          </div>

          {dateFilter === 'custom' && (
            <div className="flex items-center gap-1.5 ml-1">
              <DatePicker
                value={customStart}
                maxDate={customEnd || undefined}
                onChange={(d) => {
                  setCustomStart(d);
                  if (customEnd && d > customEnd) setCustomEnd(d);
                }}
                placeholder="From"
              />
              <span className="text-slate-400 text-xs">to</span>
              <DatePicker
                value={customEnd}
                minDate={customStart || undefined}
                onChange={(d) => setCustomEnd(d)}
                placeholder="To"
              />
            </div>
          )}
        </div>

        {/* Payment Mode Selector */}
        <div className="flex items-center gap-1.5 self-end sm:self-center">
          <span className="text-xs font-semibold text-slate-500 hidden sm:inline">Mode:</span>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-md border border-slate-200/60 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => setPaymentModeFilter('all')}
              className={cn(
                "px-2.5 py-1 rounded-sm text-xs font-medium transition-all cursor-pointer",
                paymentModeFilter === 'all'
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setPaymentModeFilter('online')}
              className={cn(
                "px-2.5 py-1 rounded-sm text-xs font-medium transition-all flex items-center gap-1 cursor-pointer",
                paymentModeFilter === 'online'
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <CreditCard size={12} />
              <span>Online</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentModeFilter('offline')}
              className={cn(
                "px-2.5 py-1 rounded-sm text-xs font-medium transition-all flex items-center gap-1 cursor-pointer",
                paymentModeFilter === 'offline'
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <Banknote size={12} />
              <span>Cash</span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: REVENUE & ORDER ANALYTICS */}
      {activeTab === 'revenue' && (
        <div className="space-y-4 animate-fade-in">
          {/* Key Revenue & Settlement KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Total Revenue */}
            <Card className="rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <CardContent className="p-3.5 sm:p-4">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Gross Sales Revenue</p>
                    <h3 className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
                      {currencySymbol}{displayedGross.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </h3>
                  </div>
                  <div className="p-2 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 shrink-0">
                    <Banknote size={16} />
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-xs">
                  {revenueData?.growth_ratio >= 0 ? (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-sm text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      <TrendingUp size={10} /> +{revenueData?.growth_ratio}%
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-sm text-[10px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                      <TrendingDown size={10} /> {revenueData?.growth_ratio}%
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400">vs prev period</span>
                </div>
              </CardContent>
            </Card>

            {/* Net Settled Amount */}
            <Card className="rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <CardContent className="p-3.5 sm:p-4">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Net Settled Revenue</p>
                    <h3 className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
                      {currencySymbol}{displayedSettled.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </h3>
                  </div>
                  <div className="p-2 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60 shrink-0">
                    <Wallet size={16} />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 font-medium">Direct bank settlement</p>
              </CardContent>
            </Card>

            {/* Top Revenue Product */}
            <Card className="rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <CardContent className="p-3.5 sm:p-4">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {revenueData?.highest_revenue_food?.image_url ? (
                      <img
                        src={revenueData.highest_revenue_food.image_url}
                        alt={revenueData.highest_revenue_food.name}
                        className="w-9 h-9 rounded-md object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                      />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Top Revenue Item</p>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {revenueData?.highest_revenue_food?.name || 'No Sales'}
                      </h4>
                      <p className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {currencySymbol}{revenueData?.highest_revenue_food?.total_revenue || 0}
                      </p>
                    </div>
                  </div>
                  <div className="p-2 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60 shrink-0">
                    <Trophy size={16} />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 font-medium">
                  {revenueData?.highest_revenue_food?.total_quantity || 0} units sold
                </p>
              </CardContent>
            </Card>

            {/* Most Ordered Item */}
            <Card className="rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <CardContent className="p-3.5 sm:p-4">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {revenueData?.most_ordered_food?.image_url ? (
                      <img
                        src={revenueData.most_ordered_food.image_url}
                        alt={revenueData.most_ordered_food.name}
                        className="w-9 h-9 rounded-md object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                      />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Most Ordered Item</p>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {revenueData?.most_ordered_food?.name || 'No Orders'}
                      </h4>
                      <p className="text-xs font-bold font-mono text-purple-600 dark:text-purple-400 mt-0.5">
                        {revenueData?.most_ordered_food?.total_quantity || 0} Orders
                      </p>
                    </div>
                  </div>
                  <div className="p-2 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200/60 dark:border-purple-800/60 shrink-0">
                    <ShoppingBag size={16} />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 font-medium">
                  {currencySymbol}{revenueData?.most_ordered_food?.total_revenue || 0} gross revenue
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Payment Modes & Collections Breakdown Card */}
          <Card className="rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <PieChart size={16} className="text-primary shrink-0" />
                <span>Collections by Payment Mode</span>
              </CardTitle>
              <div className="text-right shrink-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mr-1.5">Total Tracked:</span>
                <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {currencySymbol}{displayedGross.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-3.5 space-y-3">
              {revenueData?.payment_modes_breakdown?.some((m: any) => m.amount > 0) ? (
                <>
                  {(() => {
                    const paymentModeColors: Record<string, { bg: string; dot: string }> = {
                      cash: { bg: 'bg-emerald-500', dot: 'bg-emerald-500' },
                      upi: { bg: 'bg-purple-500', dot: 'bg-purple-500' },
                      online: { bg: 'bg-amber-500', dot: 'bg-amber-500' },
                      card: { bg: 'bg-blue-500', dot: 'bg-blue-500' },
                      other: { bg: 'bg-slate-400', dot: 'bg-slate-400' },
                    };

                    return (
                      <>
                        <div className="h-2.5 w-full rounded-md bg-slate-100 dark:bg-slate-800 overflow-hidden flex shadow-inner">
                          {revenueData.payment_modes_breakdown.map((pm: any, idx: number) => {
                            if (pm.percentage <= 0) return null;
                            const colorConf = paymentModeColors[pm.mode] || { bg: 'bg-primary', dot: 'bg-primary' };
                            return (
                              <div
                                key={idx}
                                style={{ width: `${pm.percentage}%` }}
                                className={`${colorConf.bg} transition-all hover:opacity-90`}
                                title={`${pm.label}: ${currencySymbol}${pm.amount.toFixed(2)} (${pm.percentage}%)`}
                              />
                            );
                          })}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-1">
                          {revenueData.payment_modes_breakdown.map((pm: any, idx: number) => {
                            const colorConf = paymentModeColors[pm.mode] || { bg: 'bg-primary', dot: 'bg-primary' };
                            return (
                              <div
                                key={idx}
                                className="p-2.5 rounded-md border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 flex flex-col justify-between"
                              >
                                <div className="flex items-center justify-between gap-1 mb-1.5">
                                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate flex items-center gap-1.5">
                                    <span className={`w-2 h-2 rounded-full ${colorConf.dot} shrink-0 ring-2 ring-white/60 dark:ring-slate-900/60`} />
                                    {pm.label}
                                  </span>
                                  <span className="text-[10px] font-bold font-mono px-1.5 py-0.2 rounded bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                    {pm.percentage}%
                                  </span>
                                </div>
                                <div>
                                  <h4 className="text-xs sm:text-sm font-bold font-mono text-slate-900 dark:text-white">
                                    {currencySymbol}{pm.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                  </h4>
                                  <p className="text-[9.5px] text-slate-400 font-medium mt-0.5">
                                    {pm.orders_count} {pm.orders_count === 1 ? 'order' : 'orders'}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    );
                  })()}
                </>
              ) : (
                <div className="py-6 text-center text-slate-400 text-xs">
                  <Banknote size={24} className="mx-auto mb-1.5 opacity-40" />
                  <p>No payment records in this period.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Daily Revenue Chart with HorizontalScrollContainer */}
          <Card className="rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <TrendingUp size={16} className="text-primary shrink-0" />
                <span>Daily Revenue & Order Velocity</span>
              </CardTitle>

              {hoveredRevenueDay && (
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 text-xs font-bold animate-fade-in shrink-0">
                  <Calendar size={12} className="text-primary" />
                  <span className="font-mono text-slate-900 dark:text-white">{hoveredRevenueDay.date}:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-black">{currencySymbol}{hoveredRevenueDay.gross_revenue}</span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span className="text-slate-500 font-normal">{hoveredRevenueDay.orders_count} orders</span>
                </div>
              )}
            </CardHeader>
            <CardContent className="pt-3.5">
              {revenueData?.daily_sales?.length > 0 ? (
                <div>
                  <HorizontalScrollContainer scrollAmount={220} contentClassName="flex items-end gap-1.5 sm:gap-2 pt-16 pb-2.5 h-60 w-full">
                    {(() => {
                      const dailyList = revenueData.daily_sales;
                      const maxGross = Math.max(...dailyList.map((d: any) => d.gross_revenue), 1);
                      return dailyList.map((day: any, i: number) => {
                        const heightPct = day.gross_revenue > 0
                          ? Math.max(8, Math.round((day.gross_revenue / maxGross) * 62))
                          : 4;
                        const isHovered = hoveredRevenueDay?.date === day.date;
                        const isFirst = i <= 1;
                        const isLast = i >= dailyList.length - 2;

                        return (
                          <div 
                            key={day.date || i}
                            className="flex-1 min-w-[32px] sm:min-w-[40px] max-w-[50px] flex flex-col items-center relative h-full justify-end cursor-pointer shrink-0"
                            onMouseEnter={() => setHoveredRevenueDay(day)}
                            onMouseLeave={() => setHoveredRevenueDay(null)}
                            onClick={() => setHoveredRevenueDay((prev: any) => prev?.date === day.date ? null : day)}
                          >
                            <div 
                              className={cn(
                                "w-full rounded-t-sm transition-all relative border border-primary/20 shadow-2xs",
                                day.gross_revenue > 0
                                  ? isHovered
                                    ? "bg-primary ring-2 ring-primary ring-offset-1"
                                    : "bg-primary/80 hover:bg-primary"
                                  : "bg-slate-200 dark:bg-slate-800"
                              )}
                              style={{ height: `${heightPct}%` }}
                            >
                              <div className={cn(
                                "absolute -top-12 bg-slate-900/95 backdrop-blur-md text-white text-[10px] py-1 px-2 rounded-md whitespace-nowrap z-30 shadow-md border border-slate-700 flex flex-col gap-0.5 pointer-events-none transition-all duration-150",
                                isFirst ? "left-0" : isLast ? "right-0" : "left-1/2 -translate-x-1/2",
                                isHovered ? "opacity-100 scale-100 visible" : "opacity-0 scale-95 invisible"
                              )}>
                                <span className="font-mono">{day.date}</span>
                                <span className="text-emerald-400 font-bold">{currencySymbol}{day.gross_revenue} ({day.orders_count} orders)</span>
                              </div>
                            </div>
                            <span className={cn(
                              "text-[9.5px] mt-1.5 truncate w-full text-center font-mono",
                              isHovered ? "font-bold text-primary" : "text-slate-400"
                            )}>
                              {new Date(day.date).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </HorizontalScrollContainer>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[10.5px]">Daily gross revenue velocity</span>
                  </div>
                </div>
              ) : (
                <div className="h-36 flex items-center justify-center text-slate-400 text-xs">
                  No sales recorded in this period yet.
                </div>
              )}
            </CardContent>
          </Card>

          {/* 4-Card Performance Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Top Ordered Dishes/Products */}
            <Card className="h-[300px] flex flex-col rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <CardHeader className="flex flex-col gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2.5 shrink-0">
                <div className="flex flex-row items-center justify-between">
                  <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-1.5">
                    <Trophy size={14} className="text-amber-500 shrink-0" />
                    <span>Top Ordered {businessCategory.isFood ? 'Dishes' : 'Products'}</span>
                  </CardTitle>
                  <span className="text-[10px] font-bold text-slate-400">Total Units</span>
                </div>
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder={businessCategory.isFood ? "Search dishes..." : "Search items..."}
                    value={dishSearch}
                    onChange={(e) => setDishSearch(e.target.value)}
                    className="w-full h-7 pl-7 pr-3 text-[11px] rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-2.5 flex-1 overflow-y-auto custom-scrollbar">
                {revenueData?.top_ordered_items?.length > 0 ? (
                  <div className="space-y-2">
                    {revenueData.top_ordered_items.filter((i: any) => i.name.toLowerCase().includes(dishSearch.toLowerCase())).map((item: any, idx: number) => {
                      const maxQty = revenueData.top_ordered_items[0].total_quantity || 1;
                      const pct = Math.round((item.total_quantity / maxQty) * 100);
                      return (
                        <div key={idx} className="flex items-center justify-between gap-2 text-xs py-0.5">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="w-4 h-4 rounded-sm flex items-center justify-center font-bold text-[9.5px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                              {idx + 1}
                            </span>
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.name} className="w-5 h-5 rounded-sm object-cover shrink-0 border border-slate-200 dark:border-slate-700" />
                            ) : null}
                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate text-[11.5px]">{item.name}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="w-14 sm:w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-sm overflow-hidden">
                              <div className="h-full bg-primary rounded-sm transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="font-bold font-mono text-slate-900 dark:text-white text-[11px] w-12 text-right">{item.total_quantity} pcs</span>
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

            {/* Top Revenue Products */}
            <Card className="h-[300px] flex flex-col rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <CardHeader className="flex flex-col gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2.5 shrink-0">
                <div className="flex flex-row items-center justify-between">
                  <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-1.5">
                    <Banknote size={14} className="text-emerald-500 shrink-0" />
                    <span>Top Revenue Items</span>
                  </CardTitle>
                  <span className="text-[10px] font-bold text-slate-400">Total Revenue</span>
                </div>
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search items..."
                    value={revenueSearch}
                    onChange={(e) => setRevenueSearch(e.target.value)}
                    className="w-full h-7 pl-7 pr-3 text-[11px] rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-2.5 flex-1 overflow-y-auto custom-scrollbar">
                {revenueData?.top_ordered_items?.length > 0 ? (
                  <div className="space-y-2">
                    {[...revenueData.top_ordered_items]
                      .sort((a,b) => b.total_revenue - a.total_revenue)
                      .filter((i: any) => i.name.toLowerCase().includes(revenueSearch.toLowerCase()))
                      .map((item: any, idx: number) => {
                      const maxRev = revenueData.top_ordered_items[0].total_revenue || 1;
                      const pct = Math.round((item.total_revenue / maxRev) * 100);
                      return (
                        <div key={idx} className="flex items-center justify-between gap-2 text-xs py-0.5">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="w-4 h-4 rounded-sm flex items-center justify-center font-bold text-[9.5px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                              {idx + 1}
                            </span>
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.name} className="w-5 h-5 rounded-sm object-cover shrink-0 border border-slate-200 dark:border-slate-700" />
                            ) : null}
                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate text-[11.5px]">{item.name}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="w-14 sm:w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-sm overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-sm transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400 text-[11px] w-14 text-right">{currencySymbol}{item.total_revenue}</span>
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

            {/* Top Categories */}
            <Card className="h-[300px] flex flex-col rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <CardHeader className="flex flex-col gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2.5 shrink-0">
                <div className="flex flex-row items-center justify-between">
                  <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-1.5">
                    <Layers size={14} className="text-indigo-500 shrink-0" />
                    <span>Top Categories</span>
                  </CardTitle>
                  <span className="text-[10px] font-bold text-slate-400">Total Clicks</span>
                </div>
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search categories..."
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    className="w-full h-7 pl-7 pr-3 text-[11px] rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-2.5 flex-1 overflow-y-auto custom-scrollbar">
                {revenueData?.top_ordered_categories?.length > 0 ? (
                  <div className="space-y-2">
                    {revenueData.top_ordered_categories.filter((c: any) => c.name.toLowerCase().includes(categorySearch.toLowerCase())).map((cat: any, idx: number) => {
                      const maxQty = revenueData.top_ordered_categories[0].total_quantity || 1;
                      const pct = Math.round((cat.total_quantity / maxQty) * 100);
                      return (
                        <div key={idx} className="flex items-center justify-between gap-2 text-xs py-0.5">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="w-4 h-4 rounded-sm flex items-center justify-center font-bold text-[9.5px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                              {idx + 1}
                            </span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate text-[11.5px]">{cat.name}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="w-14 sm:w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-sm overflow-hidden">
                              <div className="h-full bg-indigo-500 rounded-sm transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="font-bold font-mono text-indigo-600 dark:text-indigo-400 text-[11px] w-14 text-right">{cat.total_quantity} clicks</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-6">No category data recorded yet.</p>
                )}
              </CardContent>
            </Card>

            {/* Top Customer Searches */}
            <Card className="h-[300px] flex flex-col rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <CardHeader className="flex flex-col gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2.5 shrink-0">
                <div className="flex flex-row items-center justify-between">
                  <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-1.5">
                    <Search size={14} className="text-orange-500 shrink-0" />
                    <span>Top Searches</span>
                  </CardTitle>
                  <span className="text-[10px] font-bold text-slate-400">Query Volume</span>
                </div>
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search queries..."
                    value={termSearch}
                    onChange={(e) => setTermSearch(e.target.value)}
                    className="w-full h-7 pl-7 pr-3 text-[11px] rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-2.5 flex-1 overflow-y-auto custom-scrollbar">
                {isSearchDataLocked ? (
                  <div className="p-4 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-center space-y-1.5">
                    <Lock size={16} className="mx-auto text-slate-400" />
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Search Analytics Locked</p>
                    <p className="text-[10.5px] text-slate-400">Subscribe to Search Data module to view live search terms.</p>
                  </div>
                ) : topSearchesList.length > 0 ? (
                  <div className="space-y-2">
                    {topSearchesList.filter((s: any) => s.term.toLowerCase().includes(termSearch.toLowerCase())).map((search: any, i: number) => (
                      <div key={i} className="flex items-center justify-between gap-2 text-xs py-0.5">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="w-4 h-4 rounded-sm flex items-center justify-center font-bold text-[9.5px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                            {i + 1}
                          </span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize truncate text-[11.5px]">{search.term}</span>
                        </div>
                        <span className="text-[10.5px] font-bold font-mono px-2 py-0.5 rounded-sm bg-primary/10 text-primary shrink-0">
                          {search.count} searches
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-6">No search data recorded yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: SALES BY PRODUCT ANALYTICS */}
      {activeTab === 'products' && (
        <div className="space-y-4 animate-fade-in">
          {/* Top KPI Cards for Product Sales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <CardContent className="p-3.5 sm:p-4">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      {selectedProduct && selectedProduct !== 'all' ? 'Units (This Item)' : 'Total Units Sold'}
                    </p>
                    <h3 className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
                      {(selectedProduct && selectedProduct !== 'all'
                        ? productSalesData?.selected_product_stats?.total_quantity_sold
                        : productSalesData?.total_products_sold_count) || 0}
                      <span className="text-xs font-normal text-slate-400 ml-1.5">units</span>
                    </h3>
                  </div>
                  <div className="p-2 rounded-md bg-primary/10 text-primary border border-primary/20 shrink-0">
                    <Package size={16} />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 font-medium">
                  {selectedProduct && selectedProduct !== 'all'
                    ? `From ${productSalesData?.selected_product_stats?.orders_count || 0} orders`
                    : `Across ${productSalesData?.total_orders_count || 0} orders`}
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <CardContent className="p-3.5 sm:p-4">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      {selectedProduct && selectedProduct !== 'all' ? 'Item Revenue' : 'Total Item Revenue'}
                    </p>
                    <h3 className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
                      {currencySymbol}
                      {((selectedProduct && selectedProduct !== 'all'
                        ? productSalesData?.selected_product_stats?.total_revenue
                        : productSalesData?.total_product_revenue) || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </h3>
                  </div>
                  <div className="p-2 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 shrink-0">
                    <Banknote size={16} />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 font-medium">
                  Gross item sales value in timeframe
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <CardContent className="p-3.5 sm:p-4">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Products Sold</p>
                    <h3 className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-purple-600 dark:text-purple-400">
                      {productSalesData?.total_unique_products_sold || 0}
                      <span className="text-xs font-normal text-slate-400 ml-1.5">items</span>
                    </h3>
                  </div>
                  <div className="p-2 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200/60 dark:border-purple-800/60 shrink-0">
                    <Layers size={16} />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 font-medium">
                  Active items ordered at least once
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <CardContent className="p-3.5 sm:p-4">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {productSalesData?.top_selling_product?.image_url ? (
                      <img
                        src={productSalesData.top_selling_product.image_url}
                        alt={productSalesData.top_selling_product.name}
                        className="w-9 h-9 rounded-md object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                      />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Top Selling Item</p>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {productSalesData?.top_selling_product?.name || 'No Sales'}
                      </h4>
                      <p className="text-xs font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5">
                        {productSalesData?.top_selling_product?.total_quantity_sold || 0} units ({currencySymbol}{productSalesData?.top_selling_product?.total_revenue || 0})
                      </p>
                    </div>
                  </div>
                  <div className="p-2 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60 shrink-0">
                    <Trophy size={16} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Product Filter, Search & Export Bar */}
          <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 min-w-0">
              <div className="w-full sm:w-56">
                <SearchableSelect
                  options={productDropdownOptions}
                  value={selectedProduct || 'all'}
                  onChange={(val) => setSelectedProduct(val === 'all' ? null : String(val))}
                  placeholder="Select Product"
                  searchPlaceholder="Filter items..."
                  className="h-8.5 text-xs rounded-md border-slate-200 dark:border-slate-700 shadow-2xs"
                  onSearchChange={(q) => setDropdownSearch(q)}
                  onLoadMore={handleDropdownLoadMore}
                  hasMore={dropdownHasMore}
                  isLoadingMore={isDropdownLoadingMore}
                />
              </div>

              <div className="relative flex-1 max-w-sm">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search in table..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full h-8.5 pl-8 pr-3 text-xs rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              </div>

              {selectedProduct && selectedProduct !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="px-2.5 py-1.5 rounded-md text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer shrink-0"
                >
                  ← All Products
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportProductSalesCsv}
                className="h-8.5 text-xs font-semibold flex items-center gap-1.5 rounded-md shadow-2xs cursor-pointer"
              >
                <Download size={13} />
                <span>Export CSV</span>
              </Button>
            </div>
          </div>

          {/* MAIN PRODUCT SALES TABLE (Overall View) */}
          {(!selectedProduct || selectedProduct === 'all') && (
            <Card className="rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <ShoppingBag size={16} className="text-primary" />
                  <span>Product Sales Register</span>
                </CardTitle>

                {/* Sort selector */}
                <div className="flex items-center gap-1.5 self-start sm:self-auto">
                  <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                    <ArrowUpDown size={11} /> Sort:
                  </span>
                  <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-md text-xs">
                    <button
                      type="button"
                      onClick={() => setProductSortBy('revenue')}
                      className={cn(
                        "px-2 py-0.5 rounded-sm text-[11px] font-semibold transition-all cursor-pointer",
                        productSortBy === 'revenue' ? "bg-white dark:bg-slate-900 text-primary shadow-2xs" : "text-slate-500"
                      )}
                    >
                      Revenue
                    </button>
                    <button
                      type="button"
                      onClick={() => setProductSortBy('quantity')}
                      className={cn(
                        "px-2 py-0.5 rounded-sm text-[11px] font-semibold transition-all cursor-pointer",
                        productSortBy === 'quantity' ? "bg-white dark:bg-slate-900 text-primary shadow-2xs" : "text-slate-500"
                      )}
                    >
                      Units
                    </button>
                    <button
                      type="button"
                      onClick={() => setProductSortBy('name')}
                      className={cn(
                        "px-2 py-0.5 rounded-sm text-[11px] font-semibold transition-all cursor-pointer",
                        productSortBy === 'name' ? "bg-white dark:bg-slate-900 text-primary shadow-2xs" : "text-slate-500"
                      )}
                    >
                      Name
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isProductSalesLoading ? (
                  <div className="p-8 text-center space-y-1.5">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs text-slate-400 font-medium">Loading product reports...</p>
                  </div>
                ) : (productSalesData?.products || []).length > 0 ? (
                  <div className="overflow-x-auto max-h-[460px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="sticky top-0 bg-slate-50 dark:bg-slate-850 z-10 border-b border-slate-200/80 dark:border-slate-800">
                        <tr className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                          <th className="py-2.5 px-3 pl-4"># Rank & Product</th>
                          <th className="py-2.5 px-3">Category</th>
                          <th className="py-2.5 px-3 text-right">Avg Price</th>
                          <th className="py-2.5 px-3 text-right">Units Sold</th>
                          <th className="py-2.5 px-3 text-right">Total Revenue</th>
                          <th className="py-2.5 px-3 text-right">Orders</th>
                          <th className="py-2.5 px-3 pr-4 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {(() => {
                          const totalRev = productSalesData.total_product_revenue || 1;
                          const totalUnits = productSalesData.total_products_sold_count || 1;
                          let list = [...productSalesData.products];
                          if (productSearch.trim()) {
                            const q = productSearch.toLowerCase();
                            list = list.filter((p: any) =>
                              (p.name && p.name.toLowerCase().includes(q)) ||
                              (p.category_name && p.category_name.toLowerCase().includes(q))
                            );
                          }
                          if (productSortBy === 'quantity') {
                            list.sort((a, b) => b.total_quantity_sold - a.total_quantity_sold);
                          } else if (productSortBy === 'name') {
                            list.sort((a, b) => a.name.localeCompare(b.name));
                          } else {
                            list.sort((a, b) => b.total_revenue - a.total_revenue);
                          }
                          return list.map((p: any, idx: number) => {
                            const revPct = Math.round((p.total_revenue / totalRev) * 100);
                            const unitPct = Math.round((p.total_quantity_sold / totalUnits) * 100);
                            return (
                              <tr
                                key={p.name}
                                onClick={() => setSelectedProduct(p.name)}
                                className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                              >
                                <td className="py-2.5 px-3 pl-4">
                                  <div className="flex items-center gap-2">
                                    <span className="w-4 h-4 rounded-sm flex items-center justify-center font-bold text-[9.5px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                                      {idx + 1}
                                    </span>
                                    {p.image_url ? (
                                      <img src={p.image_url} alt={p.name} className="w-6 h-6 rounded-sm object-cover shrink-0 border border-slate-200 dark:border-slate-700" />
                                    ) : (
                                      <div className="w-6 h-6 rounded-sm bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                                        <Package size={12} />
                                      </div>
                                    )}
                                    <span className="font-semibold text-slate-900 dark:text-white group-hover:text-primary transition-colors line-clamp-1 text-[11.5px]">
                                      {p.name}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-slate-500">
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                    {p.category_name || 'General'}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-700 dark:text-slate-300">
                                  {currencySymbol}{p.average_unit_price}
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <div className="flex flex-col items-end gap-0.5">
                                    <span className="font-mono font-bold text-primary">
                                      {p.total_quantity_sold}
                                    </span>
                                    <div className="w-12 h-1 bg-slate-100 dark:bg-slate-800 rounded-sm overflow-hidden">
                                      <div className="h-full bg-primary rounded-sm" style={{ width: `${Math.min(100, Math.max(5, unitPct))}%` }} />
                                    </div>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <div className="flex flex-col items-end gap-0.5">
                                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                      {currencySymbol}{p.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                    </span>
                                    <span className="text-[9.5px] text-slate-400">{revPct}%</span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                                  {p.orders_count}
                                </td>
                                <td className="py-2.5 px-3 pr-4 text-center">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedProduct(p.name);
                                    }}
                                    className="px-2 py-0.5 rounded-sm bg-primary/10 hover:bg-primary text-primary hover:text-white font-semibold text-[10.5px] transition-all cursor-pointer shrink-0"
                                  >
                                    View Dates →
                                  </button>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    <Package size={24} className="mx-auto mb-1.5 opacity-40" />
                    <p>No product sales recorded in this timeframe.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* DRILLDOWN DATE-BY-DATE & RECENT ORDERS TABLES */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
            {/* Daily Date Breakdown */}
            <Card className="rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-1.5">
                  <CalendarDays size={14} className="text-primary" />
                  <span>
                    {selectedProduct && selectedProduct !== 'all'
                      ? `Date Breakdown: ${selectedProduct}`
                      : 'Daily Sales Breakdown'}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {(() => {
                  const filteredDays = (productSalesData?.daily_sales || []).filter((d: any) => d.quantity_sold > 0);
                  if (filteredDays.length === 0) {
                    return (
                      <div className="text-center py-8 text-slate-400 text-xs">
                        No sales recorded on any date in this timeframe.
                      </div>
                    );
                  }
                  return (
                    <div className="overflow-x-auto max-h-[320px] overflow-y-auto custom-scrollbar">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="sticky top-0 bg-slate-50 dark:bg-slate-850 z-10 border-b border-slate-200/80 dark:border-slate-800">
                          <tr className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                            <th className="py-2 px-3 pl-4">Date</th>
                            <th className="py-2 px-3 text-right">Units</th>
                            <th className="py-2 px-3 text-right">Revenue</th>
                            <th className="py-2 px-3 pr-4 text-right">Orders</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {filteredDays.map((d: any) => (
                            <tr key={d.date} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                              <td className="py-2 px-3 pl-4 font-mono font-semibold text-slate-800 dark:text-slate-200">
                                {d.date}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-primary">
                                {d.quantity_sold}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                {currencySymbol}{d.revenue.toFixed(2)}
                              </td>
                              <td className="py-2 px-3 pr-4 text-right font-mono text-slate-500">
                                {d.orders_count}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Recent Orders with this Product */}
            <Card className="rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-1.5">
                  <Receipt size={14} className="text-emerald-600" />
                  <span>
                    {selectedProduct && selectedProduct !== 'all'
                      ? `Recent Orders: ${selectedProduct}`
                      : 'Recent Product Orders'}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {(productSalesData?.recent_sales || []).length > 0 ? (
                  <div className="overflow-x-auto max-h-[320px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="sticky top-0 bg-slate-50 dark:bg-slate-850 z-10 border-b border-slate-200/80 dark:border-slate-800">
                        <tr className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                          <th className="py-2 px-3 pl-4">Order / Time</th>
                          <th className="py-2 px-3">Customer</th>
                          <th className="py-2 px-3 text-right">Qty</th>
                          <th className="py-2 px-3 pr-4 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {productSalesData.recent_sales.map((s: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                            <td className="py-2 px-3 pl-4">
                              <span className="font-mono font-bold text-slate-800 dark:text-slate-200 block text-[11px]">
                                #{s.order_id.slice(0, 8)}
                              </span>
                              <span className="text-[9.5px] text-slate-400 block">{formatLocalDateTime(s.created_at)}</span>
                            </td>
                            <td className="py-2 px-3">
                              <span className="font-semibold text-slate-700 dark:text-slate-300 block text-[11px]">{s.customer_name}</span>
                              {s.variant_name && (
                                <span className="text-[9.5px] text-slate-400">({s.variant_name})</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-primary">
                              {s.quantity}x
                            </td>
                            <td className="py-2 px-3 pr-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {currencySymbol}{s.total_price.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    No order transactions recorded for this product in this timeframe.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 3: MENU SCANS & TRAFFIC ANALYTICS */}
      {activeTab === 'scans' && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card className="rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <CardContent className="p-3.5 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Total QR Scans</p>
                    <h3 className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 dark:text-white">
                      {data?.overview?.total_qr_scans || 0}
                    </h3>
                  </div>
                  <div className="p-2.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200/60 dark:border-purple-800/60">
                    <QrCode size={20} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <CardContent className="p-3.5 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Menu Page Views</p>
                    <h3 className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 dark:text-white">
                      {data?.overview?.total_menu_views || 0}
                    </h3>
                  </div>
                  <div className="p-2.5 rounded-md bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-200/60 dark:border-orange-800/60">
                    <Eye size={20} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Daily Traffic Chart with HorizontalScrollContainer */}
          <Card className="rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <CalendarDays size={16} className="text-primary" />
                <span>Daily Traffic & QR Scans</span>
              </CardTitle>

              {hoveredScanDay && (
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 text-xs font-bold animate-fade-in shrink-0">
                  <Calendar size={12} className="text-primary" />
                  <span className="font-mono text-slate-900 dark:text-white">{hoveredScanDay.date}:</span>
                  <span className="text-primary font-bold">{hoveredScanDay.count} scans</span>
                </div>
              )}
            </CardHeader>
            <CardContent className="pt-3.5">
              {data?.daily_scans?.length > 0 ? (
                <div>
                  <HorizontalScrollContainer scrollAmount={220} contentClassName="flex items-end gap-1.5 sm:gap-2 pt-16 pb-2.5 h-60 w-full">
                    {(() => {
                      const dailyList = data.daily_scans;
                      const maxS = Math.max(...dailyList.map((d: any) => d.count), 1);
                      return dailyList.map((day: any, i: number) => {
                        const heightPct = day.count > 0 ? Math.max(8, Math.round((day.count / maxS) * 62)) : 4;
                        const isHovered = hoveredScanDay?.date === day.date;
                        const isFirst = i <= 1;
                        const isLast = i >= dailyList.length - 2;

                        return (
                          <div 
                            key={day.date || i}
                            className="flex-1 min-w-[32px] sm:min-w-[40px] max-w-[50px] flex flex-col items-center relative h-full justify-end cursor-pointer shrink-0"
                            onMouseEnter={() => setHoveredScanDay(day)}
                            onMouseLeave={() => setHoveredScanDay(null)}
                            onClick={() => setHoveredScanDay((prev: any) => prev?.date === day.date ? null : day)}
                          >
                            <div 
                              className={cn(
                                "w-full rounded-t-sm transition-all relative",
                                day.count > 0
                                  ? isHovered
                                    ? "bg-primary ring-2 ring-primary ring-offset-1"
                                    : "bg-primary/70 hover:bg-primary"
                                  : "bg-slate-200 dark:bg-slate-800"
                              )}
                              style={{ height: `${heightPct}%` }}
                            >
                              <div className={cn(
                                "absolute -top-11 bg-slate-900/95 backdrop-blur-md text-white text-[10px] py-1 px-2 rounded-md whitespace-nowrap z-30 shadow-md border border-slate-700 flex flex-col gap-0.5 pointer-events-none transition-all duration-150",
                                isFirst ? "left-0" : isLast ? "right-0" : "left-1/2 -translate-x-1/2",
                                isHovered ? "opacity-100 scale-100 visible" : "opacity-0 scale-95 invisible"
                              )}>
                                <span className="font-mono">{day.date}</span>
                                <span className="text-primary font-bold">{day.count} scans</span>
                              </div>
                            </div>
                            <span className={cn(
                              "text-[9.5px] mt-1.5 truncate w-full text-center font-mono",
                              isHovered ? "font-bold text-primary" : "text-slate-400"
                            )}>
                              {day.date.slice(5)}
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </HorizontalScrollContainer>
                </div>
              ) : (
                <div className="h-36 flex items-center justify-center text-slate-400 text-xs">
                  No scan traffic recorded yet.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Repeat Guests Card */}
          <Card className="rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="flex items-center text-xs sm:text-sm font-bold">
                <Users size={14} className="mr-1.5 text-slate-500" /> Repeat Guests & Loyalty
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              {repeatedCustomers.length > 0 ? (
                <div className="space-y-2">
                  {repeatedCustomers.slice(0, 5).map((c: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-md bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{c.name || 'Guest'}</p>
                        <p className="text-[10px] font-mono text-slate-400">{c.mobile_number}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-sm text-xs font-bold font-mono bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
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
        </div>
      )}

      {/* TAB 4: GST & TAX REPORTS */}
      {activeTab === 'gst' && (
        <div className="space-y-4 animate-fade-in">
          {/* Header Action Bar for GST */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 bg-white dark:bg-slate-900 p-3 sm:p-3.5 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-200/60 dark:border-orange-800/60 shrink-0">
                <Receipt size={16} />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  GST & Compliance Tax Register
                </h3>
              </div>
            </div>

            <Button
              size="sm"
              onClick={handleExportGstCsv}
              disabled={isGstLoading || !gstData?.invoices?.length}
              className="w-full sm:w-auto h-8 text-xs font-semibold px-3.5 rounded-md shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
            >
              <Download size={13} />
              <span>Export GSTR CSV</span>
            </Button>
          </div>

          {/* 5 GST KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            <Card className="rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <CardContent className="p-3">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Taxable Turnover</p>
                <h3 className="text-sm sm:text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {currencySymbol}{Number(gstData?.total_taxable_turnover || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
                <p className="text-[9.5px] text-slate-400 mt-0.5 font-medium">Net base sales</p>
              </CardContent>
            </Card>

            <Card className="rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <CardContent className="p-3">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Total GST Collected</p>
                <h3 className="text-sm sm:text-base font-bold font-mono text-orange-600 dark:text-orange-400">
                  {currencySymbol}{Number(gstData?.total_gst_collected || gstData?.total_gst || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
                <p className="text-[9.5px] text-slate-400 mt-0.5 font-medium">Total tax</p>
              </CardContent>
            </Card>

            <Card className="rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <CardContent className="p-3">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">CGST (Central)</p>
                <h3 className="text-sm sm:text-base font-bold font-mono text-blue-600 dark:text-blue-400">
                  {currencySymbol}{Number(gstData?.total_cgst_collected || gstData?.total_cgst || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
                <p className="text-[9.5px] text-slate-400 mt-0.5 font-medium">{gstData?.compliance?.cgst_rate || 2.5}% rate</p>
              </CardContent>
            </Card>

            <Card className="rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <CardContent className="p-3">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">SGST (State)</p>
                <h3 className="text-sm sm:text-base font-bold font-mono text-indigo-600 dark:text-indigo-400">
                  {currencySymbol}{Number(gstData?.total_sgst_collected || gstData?.total_sgst || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
                <p className="text-[9.5px] text-slate-400 mt-0.5 font-medium">{gstData?.compliance?.sgst_rate || 2.5}% rate</p>
              </CardContent>
            </Card>

            <Card className="rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs col-span-2 sm:col-span-1">
              <CardContent className="p-3">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Tax Invoices</p>
                <h3 className="text-sm sm:text-base font-bold font-mono text-slate-900 dark:text-white">
                  {gstData?.total_invoices_count ?? gstData?.invoices_count ?? 0}
                </h3>
                <p className="text-[9.5px] text-slate-400 mt-0.5 font-medium">B2C bills</p>
              </CardContent>
            </Card>
          </div>

          {/* Invoices Tax Register Table Card */}
          <Card className="rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <CardHeader className="p-3 sm:p-3.5 pb-2.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-2">
                  <FileText size={15} className="text-primary" />
                  <span>Tax Invoices Register</span>
                  {gstData?.total_invoices_count !== undefined && (
                    <span className="text-[10px] font-bold font-mono px-2 py-0.2 rounded-sm bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {gstData.total_invoices_count}
                    </span>
                  )}
                </CardTitle>

                {/* Search Bar for Invoices */}
                <div className="relative w-full sm:w-64">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={gstSearch}
                    onChange={(e) => setGstSearch(e.target.value)}
                    placeholder="Search invoice, customer..."
                    className="w-full pl-7 pr-3 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-medium focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {isGstLoading ? (
                <div className="p-8 text-center space-y-1.5">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-slate-400 font-medium">Loading tax invoices register...</p>
                </div>
              ) : gstInvoices.length > 0 ? (
                <>
                  <div className="overflow-auto max-h-[460px] custom-scrollbar relative border-b border-slate-100 dark:border-slate-800">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-850 shadow-2xs border-b border-slate-200/80 dark:border-slate-800">
                        <tr className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                          <th className="py-2.5 px-3 pl-4">Invoice / Date</th>
                          <th className="py-2.5 px-3">Customer</th>
                          <th className="py-2.5 px-3">Payment</th>
                          <th className="py-2.5 px-3 text-right">Taxable Turnover</th>
                          <th className="py-2.5 px-3 text-right">CGST</th>
                          <th className="py-2.5 px-3 text-right">SGST</th>
                          <th className="py-2.5 px-3 text-right">Total GST</th>
                          <th className="py-2.5 px-3 pr-4 text-right">Gross Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {gstInvoices.map((inv: any, idx: number) => (
                          <tr key={inv.order_id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors font-medium">
                            <td className="py-2 px-3 pl-4">
                              <span className="font-mono font-bold text-slate-900 dark:text-white block text-[11px]">
                                {inv.invoice_no || inv.bill_number}
                              </span>
                              <span className="text-[9.5px] text-slate-400">
                                {inv.date ? formatLocalDateTime(inv.date) : (inv.created_at ? formatLocalDateTime(inv.created_at) : '-')}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <span className="text-slate-800 dark:text-slate-200 font-semibold block text-[11px]">
                                {inv.customer_name || 'Walk-in'}
                              </span>
                              {inv.customer_phone && (
                                <span className="text-[9.5px] text-slate-400 font-mono">
                                  {inv.customer_phone}
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3">
                              <span className="capitalize font-semibold text-slate-700 dark:text-slate-300 block text-[11px]">
                                {inv.payment_method}
                              </span>
                              <span className={`inline-block px-1 py-0.2 rounded-sm text-[8.5px] font-bold uppercase ${
                                (inv.payment_status || '').toLowerCase() === 'paid'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              }`}>
                                {inv.payment_status}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-medium text-slate-800 dark:text-slate-200">
                              {currencySymbol}{Number(inv.taxable_amount ?? inv.taxable_value ?? 0).toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-blue-600 dark:text-blue-400">
                              {currencySymbol}{Number(inv.cgst_amount || 0).toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-indigo-600 dark:text-indigo-400">
                              {currencySymbol}{Number(inv.sgst_amount || 0).toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-medium text-orange-600 dark:text-orange-400">
                              {currencySymbol}{Number(inv.total_tax_amount ?? inv.total_tax ?? 0).toFixed(2)}
                            </td>
                            <td className="py-2 px-3 pr-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                              {currencySymbol}{Number(inv.gross_amount ?? inv.gross_total ?? 0).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="py-2 flex flex-col items-center justify-center">
                      <InfiniteScrollTrigger
                        onIntersect={handleLoadMoreGst}
                        isLoading={isLoadingMoreGst}
                        hasMore={gstHasMore}
                      />
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-50/70 dark:bg-slate-900/50 flex items-center justify-between text-xs px-4">
                    <span className="text-[10.5px] font-semibold text-slate-500">
                      Total Invoices: {gstData?.total_invoices_count || gstInvoices.length}
                    </span>
                    <p className="text-slate-400 text-[10.5px]">
                      Showing {gstInvoices.length} invoices
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs">
                  <Receipt size={24} className="mx-auto mb-1.5 opacity-40" />
                  <p>No GST invoices found.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
