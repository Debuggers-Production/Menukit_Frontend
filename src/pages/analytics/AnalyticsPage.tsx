import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router';
import { 
  QrCode, Eye, Search, CalendarDays, Filter, Users, Lock, ChevronRight, ChevronLeft,
  TrendingUp, TrendingDown, DollarSign, Receipt, ShoppingBag, Trophy, 
  Sparkles, Download, ExternalLink, ArrowUpRight, Wallet, FileText, Calendar, CheckCircle2, CreditCard, Banknote,
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
    setTitle('Product Analytics & Sales', 'Track revenue, popularity ranking, and tax invoices.');
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
      
      <HeaderActions>
        <div className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl flex items-center gap-1 border border-slate-200/60 dark:border-slate-700/60 shrink-0">
          <button
            onClick={() => setActiveTab('revenue')}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'revenue' 
                ? 'bg-white dark:bg-slate-900 text-primary shadow-sm' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <TrendingUp size={14} /> Revenue
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'products' 
                ? 'bg-white dark:bg-slate-900 text-primary shadow-sm' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Package size={14} /> Sales by Product
          </button>
          <button
            onClick={() => setActiveTab('scans')}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'scans' 
                ? 'bg-white dark:bg-slate-900 text-primary shadow-sm' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <QrCode size={14} /> Traffic
          </button>
          <button
            onClick={() => setActiveTab('gst')}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'gst' 
                ? 'bg-white dark:bg-slate-900 text-primary shadow-sm' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Receipt size={14} /> GST Reports
          </button>
        </div>
      </HeaderActions>

      {/* Mobile Tab Switcher */}
      <div className="lg:hidden bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-1 border border-slate-200/80 dark:border-slate-700/80 shrink-0 shadow-2xs">
        <button
          onClick={() => setActiveTab('revenue')}
          className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'revenue' 
              ? 'bg-white dark:bg-slate-900 text-primary shadow-xs' 
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <TrendingUp size={13} /> Revenue
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'products' 
              ? 'bg-white dark:bg-slate-900 text-primary shadow-xs' 
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Package size={13} /> Products
        </button>
        <button
          onClick={() => setActiveTab('scans')}
          className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'scans' 
              ? 'bg-white dark:bg-slate-900 text-primary shadow-xs' 
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <QrCode size={13} /> Traffic
        </button>
        <button
          onClick={() => setActiveTab('gst')}
          className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'gst' 
              ? 'bg-white dark:bg-slate-900 text-primary shadow-xs' 
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Receipt size={13} /> GST
        </button>
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

      {/* Date Range & Payment Mode Selector - Desktop View */}
      <div className="hidden sm:flex relative z-30 flex-col gap-3 bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
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

      {/* Mobile Active Filter Bar */}
      <div className="sm:hidden flex items-center justify-between bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 min-w-0">
          <CalendarDays size={14} className="text-primary shrink-0" />
          <span className="truncate">
            {dateFilter === 'custom' 
              ? `${customStart || 'Start'} → ${customEnd || 'End'}` 
              : `${dateFilter} Days`}
            {paymentModeFilter !== 'all' && ` • ${paymentModeFilter === 'online' ? 'Online' : 'Cash'}`}
          </span>
        </div>
        <button
          onClick={() => setIsMobileFilterOpen(true)}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline px-2.5 py-1 rounded-lg bg-primary/10 shrink-0 cursor-pointer"
        >
          <Filter size={12} />
          <span>Filters</span>
        </button>
      </div>

      {/* Mobile Floating Filter Action Button (FAB - Icon Only with Active Indicator Dot) */}
      {!isMobileFilterOpen && typeof document !== 'undefined' && createPortal(
        <button
          onClick={() => setIsMobileFilterOpen(true)}
          className="fixed bottom-24 right-5 z-50 sm:hidden w-14 h-14 rounded-full bg-primary hover:bg-primary-600 active:scale-95 shadow-2xl flex items-center justify-center text-white transition-all cursor-pointer"
          aria-label="Open Filters"
        >
          <Filter size={22} />
          {(dateFilter === 'custom' || dateFilter !== 30 || paymentModeFilter !== 'all') && (
            <span className="absolute top-1 right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900" />
            </span>
          )}
        </button>,
        document.body
      )}

      {/* Mobile Filters Modal */}
      <Modal
        isOpen={isMobileFilterOpen}
        onClose={() => setIsMobileFilterOpen(false)}
        title="Analytics Filters"
        description="Filter report timeframe and payment modes"
        footer={
          <div className="flex items-center gap-2 w-full">
            <Button
              variant="outline"
              className="flex-1 font-bold border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
              onClick={() => {
                setDateFilter(30);
                setCustomStart('');
                setCustomEnd('');
                setPaymentModeFilter('all');
                toast.success('Filters reset to default');
                setIsMobileFilterOpen(false);
              }}
            >
              Clear Filter
            </Button>
            <Button
              className="flex-1 font-bold"
              onClick={() => setIsMobileFilterOpen(false)}
            >
              Apply Filters
            </Button>
          </div>
        }
      >
        <div className="space-y-4 p-1">
          {/* Timeframe selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <CalendarDays size={15} className="text-primary" /> Timeframe
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { days: 7, label: '7 Days' },
                { days: 30, label: '30 Days' },
                { days: 90, label: '90 Days' },
              ].map(t => (
                <button
                  key={t.days}
                  onClick={() => setDateFilter(t.days)}
                  className={`h-10 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                    dateFilter === t.days 
                      ? 'bg-primary text-white shadow-xs' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {t.label}
                </button>
              ))}
              <button
                onClick={() => setDateFilter('custom')}
                className={`h-10 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  dateFilter === 'custom' 
                    ? 'bg-primary text-white shadow-xs' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Calendar size={13} />
                <span>Custom</span>
              </button>
            </div>
          </div>

          {/* Custom Date Pickers */}
          {dateFilter === 'custom' && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2.5 border border-slate-200/80 dark:border-slate-800 animate-fade-in">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-500 text-xs w-12 shrink-0">From:</span>
                <DatePicker
                  value={customStart}
                  maxDate={customEnd || undefined}
                  onChange={(d) => {
                    setCustomStart(d);
                    if (customEnd && d > customEnd) setCustomEnd(d);
                  }}
                  placeholder="Start Date"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-500 text-xs w-12 shrink-0">To:</span>
                <DatePicker
                  value={customEnd}
                  minDate={customStart || undefined}
                  onChange={(d) => setCustomEnd(d)}
                  placeholder="End Date"
                />
              </div>
            </div>
          )}

          {/* Payment Mode Selector */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Filter size={15} className="text-primary" /> Payment Mode
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => setPaymentModeFilter('all')}
                className={`h-10 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                  paymentModeFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-xs dark:bg-slate-100 dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setPaymentModeFilter('online')}
                className={`h-10 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  paymentModeFilter === 'online'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <CreditCard size={13} />
                <span>Online</span>
              </button>
              <button
                onClick={() => setPaymentModeFilter('offline')}
                className={`h-10 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  paymentModeFilter === 'offline'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Banknote size={13} />
                <span>Cash</span>
              </button>
            </div>
          </div>
        </div>
      </Modal>

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
                    <Banknote size={18} className="sm:w-5 sm:h-5" />
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
                  100% direct settlement to linked bank account
                </p>
              </CardContent>
            </Card>

            {/* Highest Revenue Food */}
            <Card className="relative overflow-hidden border-amber-100 dark:border-amber-950/40 bg-gradient-to-br from-amber-50/50 via-white to-amber-50/20 dark:from-amber-950/20 dark:to-slate-900 shadow-xs">
              <CardContent className="p-4 sm:p-5">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {revenueData?.highest_revenue_food?.image_url ? (
                      <img
                        src={revenueData.highest_revenue_food.image_url}
                        alt={revenueData.highest_revenue_food.name}
                        className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-200/80 dark:border-slate-700 shadow-2xs"
                      />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Top Revenue {businessCategory.isFood ? 'Food' : 'Product'}</p>
                      <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                        {revenueData?.highest_revenue_food?.name || 'No Sales Yet'}
                      </h3>
                      <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                        {currencySymbol}{revenueData?.highest_revenue_food?.total_revenue || 0}
                      </p>
                    </div>
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
            <Card className="relative overflow-hidden border-purple-100 dark:border-purple-950/40 bg-gradient-to-br from-purple-50/50 via-white to-purple-50/20 dark:from-purple-950/20 dark:to-slate-900 shadow-xs">
              <CardContent className="p-4 sm:p-5">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {revenueData?.most_ordered_food?.image_url ? (
                      <img
                        src={revenueData.most_ordered_food.image_url}
                        alt={revenueData.most_ordered_food.name}
                        className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-200/80 dark:border-slate-700 shadow-2xs"
                      />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Most Ordered Item</p>
                      <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                        {revenueData?.most_ordered_food?.name || 'No Orders Yet'}
                      </h3>
                      <p className="text-xs font-bold text-purple-600 dark:text-purple-400 mt-0.5">
                        {revenueData?.most_ordered_food?.total_quantity || 0} Orders
                      </p>
                    </div>
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

          {/* Payment Modes & Collections Breakdown Card */}
          <Card className="overflow-hidden border-slate-200/80 dark:border-slate-800">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                  <PieChart size={18} className="text-primary shrink-0" />
                  <span>Collections by Payment Mode</span>
                </CardTitle>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Revenue collected across payment channels (including split payments)
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Total Tracked</span>
                <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {currencySymbol}{displayedGross.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              {/* Visual Distribution Multi-Segment Bar */}
              {revenueData?.payment_modes_breakdown?.some((m: any) => m.amount > 0) ? (
                <>
                  <div className="space-y-1.5">
                    <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex shadow-inner">
                      {revenueData.payment_modes_breakdown.map((pm: any, idx: number) => {
                        if (pm.percentage <= 0) return null;
                        const colors: Record<string, string> = {
                          cash: 'bg-emerald-500',
                          upi: 'bg-purple-500',
                          online: 'bg-amber-500',
                          card: 'bg-blue-500',
                          other: 'bg-slate-400',
                        };
                        const barColor = colors[pm.mode] || 'bg-primary';
                        return (
                          <div
                            key={idx}
                            style={{ width: `${pm.percentage}%` }}
                            className={`${barColor} transition-all duration-500 hover:opacity-90 relative group cursor-pointer`}
                            title={`${pm.label}: ${currencySymbol}${pm.amount.toFixed(2)} (${pm.percentage}%)`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Mode Cards Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3 pt-1">
                    {revenueData.payment_modes_breakdown.map((pm: any, idx: number) => {
                      const modeConfigs: Record<string, { bg: string, border: string, text: string, iconBg: string, icon: any }> = {
                        cash: {
                          bg: 'bg-emerald-50/60 dark:bg-emerald-950/20',
                          border: 'border-emerald-200/70 dark:border-emerald-800/40',
                          text: 'text-emerald-700 dark:text-emerald-400',
                          iconBg: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600',
                          icon: Banknote,
                        },
                        upi: {
                          bg: 'bg-purple-50/60 dark:bg-purple-950/20',
                          border: 'border-purple-200/70 dark:border-purple-800/40',
                          text: 'text-purple-700 dark:text-purple-400',
                          iconBg: 'bg-purple-100 dark:bg-purple-900/40 text-purple-600',
                          icon: Smartphone,
                        },
                        online: {
                          bg: 'bg-amber-50/60 dark:bg-amber-950/20',
                          border: 'border-amber-200/70 dark:border-amber-800/40',
                          text: 'text-amber-700 dark:text-amber-400',
                          iconBg: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600',
                          icon: CreditCard,
                        },
                        card: {
                          bg: 'bg-blue-50/60 dark:bg-blue-950/20',
                          border: 'border-blue-200/70 dark:border-blue-800/40',
                          text: 'text-blue-700 dark:text-blue-400',
                          iconBg: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600',
                          icon: CreditCard,
                        },
                        other: {
                          bg: 'bg-slate-50 dark:bg-slate-900/40',
                          border: 'border-slate-200/70 dark:border-slate-800/60',
                          text: 'text-slate-700 dark:text-slate-300',
                          iconBg: 'bg-slate-200 dark:bg-slate-800 text-slate-600',
                          icon: Wallet,
                        },
                      };

                      const cfg = modeConfigs[pm.mode] || modeConfigs.other;
                      const IconComponent = cfg.icon;

                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-2xl border transition-all ${cfg.bg} ${cfg.border} flex flex-col justify-between`}
                        >
                          <div className="flex items-center justify-between gap-1.5 mb-2">
                            <div className={`p-1.5 rounded-lg ${cfg.iconBg} shrink-0`}>
                              <IconComponent size={14} />
                            </div>
                            <span className="text-[10px] font-black font-mono px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
                              {pm.percentage}%
                            </span>
                          </div>
                          <div>
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block truncate">
                              {pm.label}
                            </span>
                            <h4 className={`text-sm sm:text-base font-black font-mono mt-0.5 ${cfg.text}`}>
                              {currencySymbol}{pm.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                            </h4>
                            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                              {pm.orders_count} {pm.orders_count === 1 ? 'transaction' : 'transactions'}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <Banknote size={28} className="mx-auto mb-2 opacity-40" />
                  <p>No payment records in this period.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Daily Revenue Chart & Breakdown */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
                  <TrendingUp size={18} className="text-primary shrink-0" />
                  <span>Daily Revenue & Order Velocity</span>
                </CardTitle>
              </div>

              {/* Dynamic Live Info Badge for Hovered / Tapped Day */}
              {hoveredRevenueDay && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 dark:bg-primary/20 border border-primary/30 text-xs font-bold animate-fade-in shrink-0">
                  <Calendar size={13} className="text-primary" />
                  <span className="font-mono text-slate-900 dark:text-white">{hoveredRevenueDay.date}:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-black">{currencySymbol}{hoveredRevenueDay.gross_revenue}</span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span className="text-slate-500 font-normal">{hoveredRevenueDay.orders_count} orders</span>
                </div>
              )}
            </CardHeader>
            <CardContent className="pt-4">
              {revenueData?.daily_sales?.length > 0 ? (
                <div>
                  <div className="h-64 flex items-end gap-1.5 sm:gap-2.5 pt-16 border-b border-slate-100 dark:border-slate-800 pb-2 relative overflow-x-auto no-scrollbar">
                    {(() => {
                      const dailyList = revenueData.daily_sales;
                      const maxGross = Math.max(...dailyList.map((d: any) => d.gross_revenue), 1);
                      return dailyList.map((day: any, i: number) => {
                        const heightPct = day.gross_revenue > 0
                          ? Math.max(8, Math.round((day.gross_revenue / maxGross) * 65))
                          : 4;
                        const isHovered = hoveredRevenueDay?.date === day.date;
                        const isLeftEdge = i < 3;
                        const isRightEdge = i >= dailyList.length - 3;
                        const tooltipAlignClass = isLeftEdge
                          ? 'left-0'
                          : isRightEdge
                            ? 'right-0'
                            : 'left-1/2 -translate-x-1/2';

                        return (
                          <div 
                            key={day.date || i}
                            className="flex-1 min-w-[28px] sm:min-w-[36px] max-w-[48px] flex flex-col items-center group relative h-full justify-end cursor-pointer"
                            onMouseEnter={() => setHoveredRevenueDay(day)}
                            onMouseLeave={() => setHoveredRevenueDay(null)}
                            onClick={() => setHoveredRevenueDay((prev: any) => prev?.date === day.date ? null : day)}
                          >
                            {/* Bar */}
                            <div 
                              className={cn(
                                "w-full rounded-t-lg transition-all relative border border-primary/20 shadow-2xs",
                                day.gross_revenue > 0
                                  ? isHovered
                                    ? "bg-gradient-to-t from-primary-600 to-primary ring-2 ring-primary ring-offset-1"
                                    : "bg-gradient-to-t from-primary/80 to-primary hover:from-primary-600 hover:to-primary"
                                  : "bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700"
                              )}
                              style={{ height: `${heightPct}%` }}
                            >
                              {/* Floating Tooltip */}
                              <div className={cn(
                                "absolute -top-16 bg-slate-900/95 backdrop-blur-md text-white text-[11px] py-1.5 px-3 rounded-xl transition-all whitespace-nowrap z-30 shadow-2xl border border-slate-700/80 flex flex-col gap-0.5",
                                isHovered ? "opacity-100 z-40" : "opacity-0 group-hover:opacity-100 pointer-events-none",
                                tooltipAlignClass
                              )}>
                                <div className="flex items-center justify-between gap-3 border-b border-slate-700/80 pb-0.5">
                                  <span className="font-mono font-bold text-slate-200">{day.date}</span>
                                  <span className="text-[9px] text-slate-400 font-medium">{day.orders_count} orders</span>
                                </div>
                                <div className="flex items-center gap-2 pt-0.5">
                                  <span className="text-emerald-400 font-extrabold">{currencySymbol}{day.gross_revenue}</span>
                                </div>
                              </div>
                            </div>
                            <span className={cn(
                              "text-[9px] sm:text-[10px] mt-2 truncate w-full text-center font-mono transition-colors",
                              isHovered ? "font-bold text-primary" : "text-slate-400"
                            )}>
                              {new Date(day.date).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                    <span className="flex items-center gap-1.5 text-[11px]">
                      <span className="w-2.5 h-2.5 rounded bg-primary inline-block"></span>
                      <span>Bar height represents daily gross revenue</span>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="h-44 flex items-center justify-center text-slate-400 text-xs">
                  No sales recorded in this period yet.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Product Level Popularity & Top Customer Searches */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            <Card className="h-[320px] flex flex-col">
              <CardHeader className="flex flex-col gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
                <div className="flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Trophy size={16} className="text-amber-500 shrink-0" /> Top Ordered {businessCategory.isFood ? 'Dishes' : 'Products'}
                  </CardTitle>
                  <span className="text-[11px] font-bold text-slate-400">Total Units</span>
                </div>
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder={businessCategory.isFood ? "Search dishes..." : "Search items..."}
                    value={dishSearch}
                    onChange={(e) => setDishSearch(e.target.value)}
                    className="w-full h-7 pl-7 pr-3 text-[11px] rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-4 flex-1 overflow-y-auto no-scrollbar scrollbar-thin">
                {revenueData?.top_ordered_items?.length > 0 ? (
                  <div className="space-y-3">
                    {revenueData.top_ordered_items.filter((i: any) => i.name.toLowerCase().includes(dishSearch.toLowerCase())).map((item: any, idx: number) => {
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
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.name}
                                className="w-6 h-6 rounded-md object-cover shrink-0 border border-slate-200/80 dark:border-slate-700"
                              />
                            ) : null}
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

            <Card className="h-[320px] flex flex-col">
              <CardHeader className="flex flex-col gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
                <div className="flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Banknote size={16} className="text-emerald-500 shrink-0" /> Top Revenue {businessCategory.isFood ? 'Food Items' : 'Products'}
                  </CardTitle>
                  <span className="text-[11px] font-bold text-slate-400">Total Revenue</span>
                </div>
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search items..."
                    value={revenueSearch}
                    onChange={(e) => setRevenueSearch(e.target.value)}
                    className="w-full h-7 pl-7 pr-3 text-[11px] rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-4 flex-1 overflow-y-auto no-scrollbar scrollbar-thin">
                {revenueData?.top_ordered_items?.length > 0 ? (
                  <div className="space-y-3">
                    {[...revenueData.top_ordered_items]
                      .sort((a,b) => b.total_revenue - a.total_revenue)
                      .filter((i: any) => i.name.toLowerCase().includes(revenueSearch.toLowerCase()))
                      .map((item: any, idx: number) => {
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
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.name}
                                className="w-6 h-6 rounded-md object-cover shrink-0 border border-slate-200/80 dark:border-slate-700"
                              />
                            ) : null}
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

            {/* Top Ordered Categories */}
            <Card className="h-[320px] flex flex-col">
              <CardHeader className="flex flex-col gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
                <div className="flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Trophy size={16} className="text-indigo-500 shrink-0" /> Top Categories
                  </CardTitle>
                  <span className="text-[11px] font-bold text-slate-400">Total Clicks</span>
                </div>
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search categories..."
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    className="w-full h-7 pl-7 pr-3 text-[11px] rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-4 flex-1 overflow-y-auto no-scrollbar scrollbar-thin">
                {revenueData?.top_ordered_categories?.length > 0 ? (
                  <div className="space-y-3">
                    {revenueData.top_ordered_categories.filter((c: any) => c.name.toLowerCase().includes(categorySearch.toLowerCase())).map((cat: any, idx: number) => {
                      const maxQty = revenueData.top_ordered_categories[0].total_quantity || 1;
                      const pct = Math.round((cat.total_quantity / maxQty) * 100);
                      return (
                        <div key={idx} className="flex items-center justify-between gap-2.5 text-xs">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                              idx === 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {idx + 1}
                            </span>
                            <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{cat.name}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                            <div className="w-12 sm:w-20 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="font-black text-indigo-600 dark:text-indigo-400 text-[11px] sm:text-xs w-16 text-right">{cat.total_quantity} clicks</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-400">
                    <Trophy size={28} className="mx-auto mb-2 opacity-50" />
                    <p className="text-xs">No category data recorded yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Customer Searches */}
            <Card className="h-[320px] flex flex-col">
              <CardHeader className="flex flex-col gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
                <div className="flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Search size={16} className="text-orange-500 shrink-0" /> Top Searches
                  </CardTitle>
                  <span className="text-[10px] font-bold bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full uppercase">
                    Module Add-on
                  </span>
                </div>
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search terms..."
                    value={termSearch}
                    onChange={(e) => setTermSearch(e.target.value)}
                    className="w-full h-7 pl-7 pr-3 text-[11px] rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-4 flex-1 overflow-y-auto no-scrollbar scrollbar-thin">
                {isSearchDataLocked ? (
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border border-amber-200 dark:border-amber-800/80 p-4 rounded-xl text-center space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
                      <Lock size={16} />
                    </div>
                    <h5 className="font-extrabold text-xs text-slate-900 dark:text-white">Analytics Locked</h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Subscribe to Search Data module to see live search terms.
                    </p>
                    <Button onClick={() => navigate('/subscription')} size="sm" className="bg-primary text-white text-[11px] font-extrabold py-1 h-7 cursor-pointer">
                      Unlock Module →
                    </Button>
                  </div>
                ) : topSearchesList.length > 0 ? (
                  <div className="space-y-3">
                    {topSearchesList.filter((s: any) => s.term.toLowerCase().includes(termSearch.toLowerCase())).map((search: any, i: number) => (
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
        </div>
      )}

      {/* TAB 2: SALES BY PRODUCT ANALYTICS */}
      {activeTab === 'products' && (
        <div className="space-y-5 sm:space-y-6 animate-fade-in">
          {/* Top KPI Cards for Product Sales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {/* Total Units Sold */}
            <Card className="relative overflow-hidden border-primary/20 dark:border-primary/20 bg-gradient-to-br from-primary/10 via-white to-primary/5 dark:from-primary/10 dark:to-slate-900 shadow-xs">
              <CardContent className="p-4 sm:p-5">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                      {selectedProduct && selectedProduct !== 'all' ? 'Units Saled (This Product)' : 'Total Units Saled'}
                    </p>
                    <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-primary font-heading">
                      {(selectedProduct && selectedProduct !== 'all'
                        ? productSalesData?.selected_product_stats?.total_quantity_sold
                        : productSalesData?.total_products_sold_count) || 0}
                      <span className="text-xs font-bold text-slate-400 ml-1.5 font-normal">units</span>
                    </h3>
                  </div>
                  <div className="p-2 sm:p-2.5 rounded-xl bg-primary/10 dark:bg-primary/20 text-primary shrink-0">
                    <Package size={18} className="sm:w-5 sm:h-5" />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-2 font-medium">
                  {selectedProduct && selectedProduct !== 'all'
                    ? `From ${productSalesData?.selected_product_stats?.orders_count || 0} customer orders`
                    : `Across ${productSalesData?.total_orders_count || 0} customer orders`}
                </p>
              </CardContent>
            </Card>

            {/* Total Product Sales Revenue */}
            <Card className="relative overflow-hidden border-emerald-100 dark:border-emerald-950/40 bg-gradient-to-br from-emerald-50/50 via-white to-emerald-50/20 dark:from-emerald-950/20 dark:to-slate-900 shadow-xs">
              <CardContent className="p-4 sm:p-5">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                      {selectedProduct && selectedProduct !== 'all' ? 'Product Revenue' : 'Total Product Revenue'}
                    </p>
                    <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-heading">
                      {currencySymbol}
                      {((selectedProduct && selectedProduct !== 'all'
                        ? productSalesData?.selected_product_stats?.total_revenue
                        : productSalesData?.total_product_revenue) || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </h3>
                  </div>
                  <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 shrink-0">
                    <Banknote size={18} className="sm:w-5 sm:h-5" />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-2 font-medium">
                  Gross item sales value in selected timeframe
                </p>
              </CardContent>
            </Card>

            {/* Products Sold */}
            <Card className="relative overflow-hidden border-purple-100 dark:border-purple-950/40 bg-gradient-to-br from-purple-50/50 via-white to-purple-50/20 dark:from-purple-950/20 dark:to-slate-900 shadow-xs">
              <CardContent className="p-4 sm:p-5">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Products Sold</p>
                    <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-purple-600 dark:text-purple-400 font-heading">
                      {productSalesData?.total_unique_products_sold || 0}
                      <span className="text-xs font-bold text-slate-400 ml-1.5 font-normal">items</span>
                    </h3>
                  </div>
                  <div className="p-2 sm:p-2.5 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 shrink-0">
                    <Layers size={18} className="sm:w-5 sm:h-5" />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-2 font-medium">
                  Active menu items ordered at least once
                </p>
              </CardContent>
            </Card>

            {/* Top Selling Product */}
            <Card className="relative overflow-hidden border-amber-100 dark:border-amber-950/40 bg-gradient-to-br from-amber-50/50 via-white to-amber-50/20 dark:from-amber-950/20 dark:to-slate-900 shadow-xs">
              <CardContent className="p-4 sm:p-5">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {productSalesData?.top_selling_product?.image_url ? (
                      <img
                        src={productSalesData.top_selling_product.image_url}
                        alt={productSalesData.top_selling_product.name}
                        className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-200/80 dark:border-slate-700 shadow-2xs"
                      />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Top Selling Item</p>
                      <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                        {productSalesData?.top_selling_product?.name || 'No Sales Yet'}
                      </h3>
                      <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                        {productSalesData?.top_selling_product?.total_quantity_sold || 0} units ({currencySymbol}{productSalesData?.top_selling_product?.total_revenue || 0})
                      </p>
                    </div>
                  </div>
                  <div className="p-2 sm:p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 shrink-0">
                    <Trophy size={18} className="sm:w-5 sm:h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Product Filter, Search & Export Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Left: Product Selector Dropdown & Quick Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 min-w-0">
              {/* Product Selector SearchableSelect */}
              <div className="w-full sm:w-[280px] shrink-0">
                <SearchableSelect
                  options={productDropdownOptions}
                  value={selectedProduct || 'all'}
                  onChange={(val) => setSelectedProduct(val === 'all' ? null : val)}
                  placeholder="Select product..."
                  showSearch={true}
                  className="h-10 text-xs font-bold"
                  onSearchChange={setDropdownSearch}
                  onLoadMore={handleDropdownLoadMore}
                  hasMore={dropdownHasMore}
                  isLoading={isDropdownLoading}
                  isLoadingMore={isDropdownLoadingMore}
                />
              </div>

              {/* Text Search input */}
              <div className="relative flex-1 min-w-[180px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Filter table by product or category..."
                  className="w-full h-10 pl-8 pr-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Right: Export CSV & Reset Button */}
            <div className="flex items-center gap-2 shrink-0">
              {selectedProduct && selectedProduct !== 'all' && (
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="h-10 px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft size={13} />
                  <span>Show Overall</span>
                </button>
              )}

              <Button
                variant="outline"
                onClick={handleExportProductSalesCsv}
                className="h-10 font-bold text-xs border-slate-200 dark:border-slate-700 flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Download size={13} />
                <span>Export Report</span>
              </Button>
            </div>
          </div>

          {/* Active Product Drilldown Banner (if specific product selected) */}
          {selectedProduct && selectedProduct !== 'all' && (
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 rounded-2xl border border-primary/20 dark:border-primary/30 flex items-center justify-between gap-4 animate-fade-in">
              <div className="flex items-center gap-3 min-w-0">
                {productSalesData?.selected_product_stats?.image_url ? (
                  <img
                    src={productSalesData.selected_product_stats.image_url}
                    alt={selectedProduct}
                    className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-200/80 dark:border-slate-700 shadow-xs"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center font-black text-sm shrink-0 shadow-sm">
                    <Package size={22} />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
                      {selectedProduct}
                    </h4>
                    {productSalesData?.selected_product_stats?.category_name && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                        {productSalesData.selected_product_stats.category_name}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Total Sold: <strong className="text-slate-800 dark:text-slate-200">{productSalesData?.selected_product_stats?.total_quantity_sold || 0} units</strong> • Revenue: <strong className="text-emerald-600 dark:text-emerald-400">{currencySymbol}{productSalesData?.selected_product_stats?.total_revenue || 0}</strong> • Avg Price: {currencySymbol}{productSalesData?.selected_product_stats?.average_unit_price || 0}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedProduct(null)}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 shadow-2xs shrink-0 cursor-pointer"
              >
                Clear Filter ✕
              </button>
            </div>
          )}

          {/* Daily Sales Quantity & Revenue Trend Bar Chart */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2">
              <div>
                <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
                  <BarChart2 size={18} className="text-primary shrink-0" />
                  <span>
                    {selectedProduct && selectedProduct !== 'all'
                      ? `Daily Sales & Revenue: ${selectedProduct}`
                      : 'Daily Units Sold & Revenue Timeline (All Products)'}
                  </span>
                </CardTitle>
              </div>

              {/* Dynamic Live Info Badge for Hovered Day */}
              {hoveredDailyStat && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 dark:bg-primary/20 border border-primary/30 text-xs font-bold animate-fade-in shrink-0">
                  <Calendar size={13} className="text-primary" />
                  <span className="font-mono text-slate-900 dark:text-white">{hoveredDailyStat.date}:</span>
                  <span className="text-primary">{hoveredDailyStat.quantity_sold} units</span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span className="text-emerald-600 dark:text-emerald-400">{currencySymbol}{hoveredDailyStat.revenue}</span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span className="text-slate-500 font-normal">{hoveredDailyStat.orders_count} orders</span>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {isProductSalesLoading ? (
                <div className="h-56 flex items-center justify-center">
                  <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (productSalesData?.daily_sales || []).length > 0 ? (
                <div>
                  <div className="h-64 flex items-end gap-1.5 sm:gap-2.5 mt-2 pt-16 pb-2 border-t border-slate-100 dark:border-slate-800 relative overflow-x-auto no-scrollbar">
                    {(() => {
                      const dailyList = productSalesData.daily_sales;
                      const maxUnits = Math.max(...dailyList.map((d: any) => d.quantity_sold), 1);
                      return dailyList.map((day: any, i: number) => {
                        // Scale to max 65% height so tooltips have 35% clearance from the top edge and NEVER get clipped!
                        const heightPct = day.quantity_sold > 0 
                          ? Math.max(8, Math.round((day.quantity_sold / maxUnits) * 65))
                          : 4;
                        const isHovered = hoveredDailyStat?.date === day.date;
                        const isLeftEdge = i < 3;
                        const isRightEdge = i >= dailyList.length - 3;
                        const tooltipAlignClass = isLeftEdge 
                          ? 'left-0' 
                          : isRightEdge 
                            ? 'right-0' 
                            : 'left-1/2 -translate-x-1/2';

                        return (
                          <div 
                            key={day.date} 
                            className="flex-1 min-w-[30px] max-w-[48px] flex flex-col items-center group relative h-full justify-end cursor-pointer"
                            onMouseEnter={() => setHoveredDailyStat(day)}
                            onMouseLeave={() => setHoveredDailyStat(null)}
                            onClick={() => setHoveredDailyStat((prev: any) => prev?.date === day.date ? null : day)}
                          >
                            <div
                              className={cn(
                                "w-full rounded-t-md transition-all relative shadow-2xs",
                                day.quantity_sold > 0
                                  ? isHovered 
                                    ? "bg-gradient-to-t from-primary-600 to-primary ring-2 ring-primary ring-offset-1" 
                                    : "bg-gradient-to-t from-primary/80 to-primary hover:from-primary-600 hover:to-primary"
                                  : "bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700"
                              )}
                              style={{ height: `${heightPct}%` }}
                            >
                              {/* Floating Tooltip with full information and guaranteed non-clipping visibility */}
                              <div className={cn(
                                "absolute -top-16 bg-slate-900/95 backdrop-blur-md text-white text-[11px] py-1.5 px-3 rounded-xl transition-all whitespace-nowrap z-30 shadow-2xl border border-slate-700/80 flex flex-col gap-0.5",
                                isHovered ? "opacity-100 z-40" : "opacity-0 group-hover:opacity-100 pointer-events-none",
                                tooltipAlignClass
                              )}>
                                <div className="flex items-center justify-between gap-3 border-b border-slate-700/80 pb-0.5">
                                  <span className="font-mono font-bold text-slate-200">{day.date}</span>
                                  <span className="text-[9px] text-slate-400 font-medium">{day.orders_count} orders</span>
                                </div>
                                <div className="flex items-center gap-2 pt-0.5">
                                  <span className="text-amber-300 font-bold">{day.quantity_sold} units</span>
                                  <span className="text-slate-500">•</span>
                                  <span className="text-emerald-400 font-extrabold">{currencySymbol}{day.revenue}</span>
                                </div>
                              </div>
                            </div>
                            <span className={cn(
                              "text-[10px] mt-2 truncate w-full text-center font-mono transition-colors",
                              isHovered ? "font-bold text-primary" : "text-slate-400"
                            )}>
                              {day.date.slice(5)}
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                    <span className="flex items-center gap-1.5 text-[11px]">
                      <span className="w-2.5 h-2.5 rounded bg-primary inline-block"></span>
                      <span>Bar height represents units sold on that date</span>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center text-slate-400 text-xs">
                  No daily sales recorded for this timeframe.
                </div>
              )}
            </CardContent>
          </Card>

          {/* MAIN PRODUCT SALES PERFORMANCE TABLE (When Overall View) */}
          {(!selectedProduct || selectedProduct === 'all') && (
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <ShoppingBag size={18} className="text-primary" />
                    <span>Every Product Sales Report</span>
                  </CardTitle>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Click any product to drill down into its date-by-date sales timeline & recent orders
                  </p>
                </div>

                {/* Sort selector */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                    <ArrowUpDown size={12} /> Sort:
                  </span>
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
                    <button
                      onClick={() => setProductSortBy('revenue')}
                      className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        productSortBy === 'revenue' ? 'bg-white dark:bg-slate-900 text-primary shadow-xs' : 'text-slate-500'
                      }`}
                    >
                      Revenue
                    </button>
                    <button
                      onClick={() => setProductSortBy('quantity')}
                      className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        productSortBy === 'quantity' ? 'bg-white dark:bg-slate-900 text-primary shadow-xs' : 'text-slate-500'
                      }`}
                    >
                      Units
                    </button>
                    <button
                      onClick={() => setProductSortBy('name')}
                      className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        productSortBy === 'name' ? 'bg-white dark:bg-slate-900 text-primary shadow-xs' : 'text-slate-500'
                      }`}
                    >
                      Name
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isProductSalesLoading ? (
                  <div className="p-12 text-center">
                    <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-xs text-slate-400">Loading product sales reports...</p>
                  </div>
                ) : (productSalesData?.products || []).length > 0 ? (
                  <div className="overflow-x-auto border-t border-slate-100 dark:border-slate-800">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200/80 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider bg-slate-50/75 dark:bg-slate-850/75">
                          <th className="p-3 pl-4"># Rank & Product</th>
                          <th className="p-3">Category</th>
                          <th className="p-3 text-right">Avg Unit Price</th>
                          <th className="p-3 text-right">Units Saled</th>
                          <th className="p-3 text-right">Total Revenue</th>
                          <th className="p-3 text-right">Orders</th>
                          <th className="p-3 pr-4 text-center">Action</th>
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
                                className="hover:bg-slate-50/75 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                              >
                                <td className="p-3 pl-4">
                                  <div className="flex items-center gap-2.5">
                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] shrink-0 ${
                                      idx === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300' :
                                      idx === 1 ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200' :
                                      idx === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/80 dark:text-orange-300' :
                                      'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                    }`}>
                                      {idx + 1}
                                    </span>
                                    {p.image_url ? (
                                      <img src={p.image_url} alt={p.name} className="w-8 h-8 rounded-lg object-cover shrink-0 border border-slate-200 dark:border-slate-700" />
                                    ) : (
                                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                                        <Package size={14} />
                                      </div>
                                    )}
                                    <span className="font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors line-clamp-1">
                                      {p.name}
                                    </span>
                                  </div>
                                </td>
                                <td className="p-3 text-slate-500 dark:text-slate-400">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                    {p.category_name || 'General'}
                                  </span>
                                </td>
                                <td className="p-3 text-right font-mono font-medium text-slate-700 dark:text-slate-300">
                                  {currencySymbol}{p.average_unit_price}
                                </td>
                                <td className="p-3 text-right">
                                  <div className="flex flex-col items-end gap-1">
                                    <span className="font-mono font-black text-primary">
                                      {p.total_quantity_sold} units
                                    </span>
                                    <div className="w-14 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                      <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, Math.max(5, unitPct))}%` }} />
                                    </div>
                                  </div>
                                </td>
                                <td className="p-3 text-right">
                                  <div className="flex flex-col items-end gap-1">
                                    <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                                      {currencySymbol}{p.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                    </span>
                                    <span className="text-[10px] text-slate-400">{revPct}% of total</span>
                                  </div>
                                </td>
                                <td className="p-3 text-right font-mono text-slate-600 dark:text-slate-400">
                                  {p.orders_count}
                                </td>
                                <td className="p-3 pr-4 text-center">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedProduct(p.name);
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-white font-bold text-[11px] transition-all cursor-pointer shrink-0"
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
                  <div className="text-center py-12 text-slate-400">
                    <Package size={32} className="mx-auto mb-2 opacity-40" />
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300">No product sales found</p>
                    <p className="text-[10px] text-slate-400 mt-1">Try selecting a wider timeframe or check if orders have been placed.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* DATE-BY-DATE SALES BREAKDOWN TABLE (For selected product or overall) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
            {/* Daily Date Breakdown */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
                    <CalendarDays size={18} className="text-primary" />
                    <span>
                      {selectedProduct && selectedProduct !== 'all'
                        ? `Date-by-Date Sales: ${selectedProduct}`
                        : 'Daily Sales Volume & Revenue'}
                    </span>
                  </CardTitle>
                  <p className="text-[11px] text-slate-400 mt-0.5">Which date, how many units saled & revenue generated</p>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {(() => {
                  const filteredDays = (productSalesData?.daily_sales || []).filter((d: any) => d.quantity_sold > 0);
                  if (filteredDays.length === 0) {
                    return (
                      <div className="text-center py-10 text-slate-400 text-xs">
                        No sales recorded on any date in this timeframe.
                      </div>
                    );
                  }
                  return (
                    <div className="overflow-x-auto max-h-[380px] overflow-y-auto no-scrollbar scrollbar-thin border-t border-slate-100 dark:border-slate-800">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="sticky top-0 bg-slate-50 dark:bg-slate-850 z-10">
                          <tr className="border-b border-slate-200/80 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                            <th className="p-3 pl-4">Date</th>
                            <th className="p-3 text-right">Units Saled</th>
                            <th className="p-3 text-right">Revenue</th>
                            <th className="p-3 pr-4 text-right">Orders</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {filteredDays.map((d: any) => (
                            <tr key={d.date} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                              <td className="p-3 pl-4 font-bold text-slate-800 dark:text-slate-200 font-mono">
                                {d.date}
                              </td>
                              <td className="p-3 text-right font-mono font-black text-primary">
                                {d.quantity_sold} qty
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                {currencySymbol}{d.revenue.toFixed(2)}
                              </td>
                              <td className="p-3 pr-4 text-right font-mono text-slate-500">
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
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
                    <Receipt size={18} className="text-emerald-600" />
                    <span>
                      {selectedProduct && selectedProduct !== 'all'
                        ? `Recent Orders: ${selectedProduct}`
                        : 'Recent Product Orders'}
                    </span>
                  </CardTitle>
                  <p className="text-[11px] text-slate-400 mt-0.5">Individual line item order transactions</p>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {(productSalesData?.recent_sales || []).length > 0 ? (
                  <div className="overflow-x-auto max-h-[380px] overflow-y-auto no-scrollbar scrollbar-thin border-t border-slate-100 dark:border-slate-800">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="sticky top-0 bg-slate-50 dark:bg-slate-850 z-10">
                        <tr className="border-b border-slate-200/80 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                          <th className="p-3 pl-4">Order / Time</th>
                          <th className="p-3">Customer</th>
                          <th className="p-3 text-right">Qty</th>
                          <th className="p-3 pr-4 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {productSalesData.recent_sales.map((s: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                            <td className="p-3 pl-4">
                              <span className="font-mono font-bold text-slate-800 dark:text-slate-200 block text-[11px]">
                                #{s.order_id.slice(0, 8)}
                              </span>
                              <span className="text-[10px] text-slate-400 block">{formatLocalDateTime(s.created_at)}</span>
                            </td>
                            <td className="p-3">
                              <span className="font-bold text-slate-700 dark:text-slate-300 block">{s.customer_name}</span>
                              {s.variant_name && (
                                <span className="text-[10px] text-slate-400 font-medium">({s.variant_name})</span>
                              )}
                            </td>
                            <td className="p-3 text-right font-mono font-black text-primary">
                              {s.quantity}x
                            </td>
                            <td className="p-3 pr-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {currencySymbol}{s.total_price.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-10 text-slate-400 text-xs">
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
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2">
              <CardTitle className="text-sm sm:text-base font-bold flex items-center">
                <CalendarDays size={18} className="mr-2 text-primary" /> Daily Traffic & QR Scans
              </CardTitle>

              {/* Dynamic Live Info Badge for Hovered / Tapped Day */}
              {hoveredScanDay && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 dark:bg-primary/20 border border-primary/30 text-xs font-bold animate-fade-in shrink-0">
                  <Calendar size={13} className="text-primary" />
                  <span className="font-mono text-slate-900 dark:text-white">{hoveredScanDay.date}:</span>
                  <span className="text-primary font-black">{hoveredScanDay.count} scans</span>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {data?.daily_scans?.length > 0 ? (
                <div>
                  <div className="h-64 flex items-end gap-1.5 sm:gap-2.5 mt-2 pt-16 pb-2 border-t border-slate-100 dark:border-slate-800 relative overflow-x-auto no-scrollbar">
                    {(() => {
                      const dailyList = data.daily_scans;
                      const maxS = Math.max(...dailyList.map((d: any) => d.count), 1);
                      return dailyList.map((day: any, i: number) => {
                        const heightPct = day.count > 0 ? Math.max(8, Math.round((day.count / maxS) * 65)) : 4;
                        const isHovered = hoveredScanDay?.date === day.date;
                        const isLeftEdge = i < 3;
                        const isRightEdge = i >= dailyList.length - 3;
                        const tooltipAlignClass = isLeftEdge
                          ? 'left-0'
                          : isRightEdge
                            ? 'right-0'
                            : 'left-1/2 -translate-x-1/2';

                        return (
                          <div 
                            key={day.date || i}
                            className="flex-1 min-w-[28px] sm:min-w-[36px] max-w-[48px] flex flex-col items-center group relative h-full justify-end cursor-pointer"
                            onMouseEnter={() => setHoveredScanDay(day)}
                            onMouseLeave={() => setHoveredScanDay(null)}
                            onClick={() => setHoveredScanDay((prev: any) => prev?.date === day.date ? null : day)}
                          >
                            <div 
                              className={cn(
                                "w-full rounded-t-md transition-all relative",
                                day.count > 0
                                  ? isHovered
                                    ? "bg-gradient-to-t from-primary-600 to-primary ring-2 ring-primary ring-offset-1"
                                    : "bg-primary/30 dark:bg-primary-900/40 hover:bg-primary"
                                  : "bg-slate-200 dark:bg-slate-800"
                              )}
                              style={{ height: `${heightPct}%` }}
                            >
                              {/* Floating Tooltip */}
                              <div className={cn(
                                "absolute -top-14 bg-slate-900/95 backdrop-blur-md text-white text-[11px] py-1.5 px-3 rounded-xl transition-all whitespace-nowrap z-30 shadow-2xl border border-slate-700/80 flex flex-col gap-0.5",
                                isHovered ? "opacity-100 z-40" : "opacity-0 group-hover:opacity-100 pointer-events-none",
                                tooltipAlignClass
                              )}>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-slate-200">{day.date}</span>
                                  <span className="text-primary font-bold">{day.count} scans</span>
                                </div>
                              </div>
                            </div>
                            <span className={cn(
                              "text-[9px] sm:text-[10px] mt-2 truncate w-full text-center font-mono transition-colors",
                              isHovered ? "font-bold text-primary" : "text-slate-400"
                            )}>
                              {day.date.slice(5)}
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </div>
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


          </div>
        </div>
      )}

      {/* TAB 3: GST & COMPLIANCES REPORTS */}
      {activeTab === 'gst' && (
        <div className="space-y-5 sm:space-y-6 animate-fade-in">
          {/* Header Action Bar for GST */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 bg-gradient-to-r from-orange-50 via-amber-50 to-white dark:from-slate-850 dark:to-slate-900 p-4 sm:p-5 rounded-2xl border border-orange-200/70 dark:border-slate-800 shadow-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 shrink-0">
                  <Receipt size={20} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    GST & Government Tax Reports
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Automated B2C tax register for GSTR-1 & GSTR-3B filing, CGST, and SGST breakdowns.
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleExportGstCsv}
              disabled={isGstLoading || !gstData?.invoices?.length}
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white font-extrabold text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer shrink-0 active:scale-95 transition-all disabled:opacity-50"
            >
              <Download size={14} /> Export GSTR CSV
            </Button>
          </div>

          {/* 5 GST KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            {/* Taxable Turnover */}
            <Card className="border-emerald-100 dark:border-emerald-950/40 bg-gradient-to-br from-emerald-50/40 via-white to-white dark:from-emerald-950/20 dark:to-slate-900">
              <CardContent className="p-4 sm:p-5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Taxable Turnover</p>
                <h3 className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-heading">
                  {currencySymbol}{Number(gstData?.total_taxable_turnover || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
                <p className="text-[10px] text-slate-400 mt-1 font-medium">Net base sales</p>
              </CardContent>
            </Card>

            {/* Total GST Collected */}
            <Card className="border-orange-100 dark:border-orange-950/40 bg-gradient-to-br from-orange-50/40 via-white to-white dark:from-orange-950/20 dark:to-slate-900">
              <CardContent className="p-4 sm:p-5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total GST Collected</p>
                <h3 className="text-xl sm:text-2xl font-black text-orange-600 dark:text-orange-400 font-heading">
                  {currencySymbol}{Number(gstData?.total_gst_collected || gstData?.total_gst || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
                <p className="text-[10px] text-slate-400 mt-1 font-medium">Total tax liability</p>
              </CardContent>
            </Card>

            {/* CGST */}
            <Card className="border-blue-100 dark:border-blue-950/40 bg-gradient-to-br from-blue-50/40 via-white to-white dark:from-blue-950/20 dark:to-slate-900">
              <CardContent className="p-4 sm:p-5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">CGST (Central)</p>
                <h3 className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 font-heading">
                  {currencySymbol}{Number(gstData?.total_cgst_collected || gstData?.total_cgst || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
                <p className="text-[10px] text-slate-400 mt-1 font-medium">{gstData?.compliance?.cgst_rate || 2.5}% rate</p>
              </CardContent>
            </Card>

            {/* SGST */}
            <Card className="border-indigo-100 dark:border-indigo-950/40 bg-gradient-to-br from-indigo-50/40 via-white to-white dark:from-indigo-950/20 dark:to-slate-900">
              <CardContent className="p-4 sm:p-5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">SGST (State)</p>
                <h3 className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 font-heading">
                  {currencySymbol}{Number(gstData?.total_sgst_collected || gstData?.total_sgst || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
                <p className="text-[10px] text-slate-400 mt-1 font-medium">{gstData?.compliance?.sgst_rate || 2.5}% rate</p>
              </CardContent>
            </Card>

            {/* Invoices Count */}
            <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
              <CardContent className="p-4 sm:p-5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tax Invoices</p>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-heading">
                  {gstData?.total_invoices_count ?? gstData?.invoices_count ?? 0}
                </h3>
                <p className="text-[10px] text-slate-400 mt-1 font-medium">B2C bills generated</p>
              </CardContent>
            </Card>
          </div>

          {/* Invoices Tax Register Table Card */}
          <Card className="border-slate-200/80 dark:border-slate-800">
            <CardHeader className="p-4 sm:p-5 pb-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
                  <FileText size={18} className="text-primary" /> Tax Invoices Register
                  {gstData?.total_invoices_count !== undefined && (
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {gstData.total_invoices_count}
                    </span>
                  )}
                </CardTitle>

                {/* Search Bar for Invoices */}
                <div className="relative w-full sm:w-72">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={gstSearch}
                    onChange={(e) => setGstSearch(e.target.value)}
                    placeholder="Search bill number, customer, phone..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {isGstLoading ? (
                <div className="p-12 text-center space-y-2">
                  <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-slate-400 font-medium">Loading tax invoices register...</p>
                </div>
              ) : gstInvoices.length > 0 ? (
                <>
                  <div className="overflow-auto max-h-[460px] custom-scrollbar-x relative border-b border-slate-100 dark:border-slate-800">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="sticky top-0 z-10 bg-slate-100/95 dark:bg-slate-850/95 backdrop-blur-xs shadow-xs">
                        <tr className="border-b border-slate-200/80 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                          <th className="p-3 pl-4">Invoice / Date</th>
                          <th className="p-3">Customer</th>
                          <th className="p-3">Payment</th>
                          <th className="p-3 text-right">Taxable Turnover</th>
                          <th className="p-3 text-right">CGST</th>
                          <th className="p-3 text-right">SGST</th>
                          <th className="p-3 text-right">Total GST</th>
                          <th className="p-3 pr-4 text-right">Gross Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {gstInvoices.map((inv: any, idx: number) => (
                          <tr key={inv.order_id || idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors font-medium">
                            <td className="p-3 pl-4">
                              <span className="font-mono font-bold text-slate-900 dark:text-white block">
                                {inv.invoice_no || inv.bill_number}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {inv.date ? formatLocalDateTime(inv.date) : (inv.created_at ? formatLocalDateTime(inv.created_at) : '-')}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="text-slate-800 dark:text-slate-200 font-bold block">
                                {inv.customer_name || 'Walk-in'}
                              </span>
                              {inv.customer_phone && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {inv.customer_phone}
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              <span className="capitalize font-bold text-slate-700 dark:text-slate-300 block">
                                {inv.payment_method}
                              </span>
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                                (inv.payment_status || '').toLowerCase() === 'paid'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              }`}>
                                {inv.payment_status}
                              </span>
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                              {currencySymbol}{Number(inv.taxable_amount ?? inv.taxable_value ?? 0).toFixed(2)}
                            </td>
                            <td className="p-3 text-right font-mono text-blue-600 dark:text-blue-400">
                              {currencySymbol}{Number(inv.cgst_amount || 0).toFixed(2)}
                            </td>
                            <td className="p-3 text-right font-mono text-indigo-600 dark:text-indigo-400">
                              {currencySymbol}{Number(inv.sgst_amount || 0).toFixed(2)}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-orange-600 dark:text-orange-400">
                              {currencySymbol}{Number(inv.total_tax_amount ?? inv.total_tax ?? 0).toFixed(2)}
                            </td>
                            <td className="p-3 pr-4 text-right font-mono font-black text-slate-900 dark:text-white">
                              {currencySymbol}{Number(inv.gross_amount ?? inv.gross_total ?? 0).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Infinite Scroll Trigger inside scrollable body */}
                    <div className="py-2.5 flex flex-col items-center justify-center">
                      <InfiniteScrollTrigger
                        onIntersect={handleLoadMoreGst}
                        isLoading={isLoadingMoreGst}
                        hasMore={gstHasMore}
                      />
                    </div>
                  </div>

                  {/* Summary Counter Footer */}
                  <div className="p-3 bg-slate-50/70 dark:bg-slate-900/50 flex items-center justify-between text-xs px-4">
                    <span className="text-[11px] font-bold text-slate-500">
                      Total Invoices: {gstData?.total_invoices_count || gstInvoices.length}
                    </span>
                    <p className="text-slate-400 text-[11px] font-medium">
                      Showing {gstInvoices.length} of {gstData?.total_invoices_count || gstInvoices.length} invoices
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <Receipt size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">No GST invoices found</p>
                  <p className="text-[10px] text-slate-400 mt-1">Try adjusting your date range filter or search term.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
