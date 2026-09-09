import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { 
  Mail, Store, Shield, Smartphone, ChevronRight, Sliders, Globe, 
  Coins, Truck, ShoppingBag, QrCode, Tag, MapPin, Zap, CheckCircle2, Lock, Info, AlertCircle,
  CreditCard, Printer, Plus, Trash2, Edit2, UtensilsCrossed, FileText, Check, RotateCcw,
  Wifi, Usb, Volume2, Terminal, Copy, Receipt, Search, X, Tags, Layers, Sparkles, Eye, EyeOff, Loader2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { useShopStore } from '@/store/shopStore';
import { usePrinterStore, PrinterStation, BillingPrinterConfig, BillingPrinter } from '@/store/usePrinterStore';
import { printThermalKot, printBillToPrinter, testNetworkPrinterConnection, checkLocalPrintBridgeStatus } from '@/utils/thermalPrinter';
import { requestWebUsbPrinter, sendEscPosToDevice } from '@/utils/webUsbPrinter';
import { buildKotEscPos } from '@/utils/escpos';
import { api } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useHeaderStore } from '@/store/useHeaderStore';
import { HeaderActions } from '@/components/HeaderActions';
import { Switch } from '@/components/ui/Switch';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import menukitLogo from '@/assets/menukit-logo.svg';
const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

// Sleek Clean Setting Row with Right-Aligned Toggle
function SettingRow({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
  disabled,
}: {
  icon?: any;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-3 px-3.5 rounded-xl transition-colors border border-transparent ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:border-slate-200/60 dark:hover:border-slate-700/60'}`}>
      <div className="flex items-start gap-3 min-w-0 pr-4">
        {Icon && (
          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0 mt-0.5">
            <Icon size={16} />
          </div>
        )}
        <div>
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{title}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-tight mt-0.5">{description}</p>
        </div>
      </div>
      <Switch
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="shrink-0 ml-2"
      />
    </div>
  );
}

export function SettingsPage() {
  const { user, changeEmail } = useAuthStore();
  const { shop, setShop, categories, setCategories } = useShopStore();
  const navigate = useNavigate();

  // Tab State
  const [activeTab, setActiveTab] = useState<'general' | 'ordering' | 'discovery' | 'payments' | 'gst' | 'printers' | 'account'>('general');
  const [printerSection, setPrinterSection] = useState<'all' | 'kot' | 'billing'>('all');

  // Printer & KOT Store
  const {
    paperWidth,
    setPaperWidth,
    autoPrintOnAccept,
    setAutoPrintOnAccept,
    stations,
    addStation,
    updateStation,
    removeStation,
    billingPrinter,
    billingPrinters,
    autoPrintOnPayment,
    billingPaperWidth,
    addBillingPrinter,
    updateBillingPrinter,
    removeBillingPrinter,
    setDefaultBillingPrinter,
    setAutoPrintOnPayment,
    setBillingPaperWidth,
    setBillingPrinter,
  } = usePrinterStore();

  // Fetch categories if needed for printer station routing
  useEffect(() => {
    if (!categories || categories.length === 0) {
      api.get('/categories', { params: { limit: 500 } })
        .then(res => setCategories(res.data || []))
        .catch(err => console.error('Failed to load categories for printer routing', err));
    }
  }, [categories, setCategories]);

  // Printer Station Form State
  const [isStationModalOpen, setIsStationModalOpen] = useState(false);
  const [editingStationId, setEditingStationId] = useState<string | null>(null);
  const [isTestingLan, setIsTestingLan] = useState(false);
  const [pairedUsbName, setPairedUsbName] = useState<string | null>(null);
  const [bridgeStatus, setBridgeStatus] = useState<{ online: boolean; ip?: string } | null>(null);

  // Quick Multi-Category Assign Modal State
  const [quickAssignStation, setQuickAssignStation] = useState<PrinterStation | null>(null);
  const [quickAssignCategoryIds, setQuickAssignCategoryIds] = useState<string[]>(['all']);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');

  const [stationForm, setStationForm] = useState<{
    name: string;
    paperWidth: '80mm' | '58mm';
    categoryIds: string[];
    autoPrintOnAccept: boolean;
    enabled: boolean;
    connectionType: 'browser' | 'network' | 'usb';
    ipAddress: string;
    port: number;
    soundBuzzer: boolean;
  }>({
    name: '',
    paperWidth: '80mm',
    categoryIds: ['all'],
    autoPrintOnAccept: true,
    enabled: true,
    connectionType: 'browser',
    ipAddress: '',
    port: 9100,
    soundBuzzer: true,
  });

  const openNewStationModal = () => {
    setEditingStationId(null);
    setCategorySearchQuery('');
    setStationForm({
      name: '',
      paperWidth,
      categoryIds: ['all'],
      autoPrintOnAccept: true,
      enabled: true,
      connectionType: 'network',
      ipAddress: '127.0.0.1',
      port: 9100,
      soundBuzzer: true,
    });
    setIsStationModalOpen(true);
  };

  const openEditStationModal = (station: PrinterStation) => {
    setEditingStationId(station.id);
    setCategorySearchQuery('');
    setStationForm({
      name: station.name,
      paperWidth: station.paperWidth || paperWidth,
      categoryIds: station.categoryIds || ['all'],
      autoPrintOnAccept: station.autoPrintOnAccept !== false,
      enabled: station.enabled !== false,
      connectionType: station.connectionType || 'network',
      ipAddress: station.ipAddress || '127.0.0.1',
      port: station.port || 9100,
      soundBuzzer: station.soundBuzzer !== false,
    });
    setIsStationModalOpen(true);
  };

  const handlePairUsb = async () => {
    try {
      const dev = await requestWebUsbPrinter();
      if (dev) {
        setPairedUsbName(dev.name);
        setStationForm(prev => ({ ...prev, connectionType: 'usb' }));
        toast.success(`Paired: ${dev.name}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to pair USB printer');
    }
  };

  const handleTestLanSocket = async (ip: string, port: number = 9100, name: string = 'Test') => {
    if (!ip.trim()) {
      toast.error('Please enter a valid IP address first');
      return;
    }
    setIsTestingLan(true);
    const toastId = toast.loading(`Connecting to LAN printer at ${ip}:${port}...`);
    try {
      const res = await testNetworkPrinterConnection(ip, port, name);
      toast.success(res.message, { id: toastId });
      if (res.via === 'bridge') {
        setBridgeStatus({ online: true, ip });
      }
    } catch (err: any) {
      toast.error(err.message || 'Printer unreachable. Verify IP, power, and LAN cable.', { id: toastId, duration: 6000 });
    } finally {
      setIsTestingLan(false);
    }
  };

  const handleSaveStation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stationForm.name.trim()) {
      toast.error('Please enter a printer station name');
      return;
    }
    if (stationForm.connectionType === 'network' && !stationForm.ipAddress.trim()) {
      toast.error('Please specify the Printer IP address for Network LAN mode');
      return;
    }
    if (stationForm.categoryIds.length === 0) {
      toast.error('Please select at least one food category or choose "All Categories"');
      return;
    }

    if (editingStationId) {
      updateStation(editingStationId, stationForm);
      toast.success('Printer station updated');
    } else {
      addStation(stationForm);
      toast.success('Printer station added');
    }
    setIsStationModalOpen(false);
  };

  const handleTestPrint = async (station?: PrinterStation) => {
    const mockOrder = {
      id: 'demo-kot-001',
      created_at: new Date().toISOString(),
      order_type: 'dine_in',
      table_number: '5',
      customer_name: 'Test Customer',
      customer_phone: '+919876543210',
      items: [
        {
          id: 'item-1',
          name: 'Butter Naan',
          quantity: 2,
          price: 45,
          notes: 'Crispy & well buttered',
        },
        {
          id: 'item-2',
          name: 'Paneer Butter Masala',
          quantity: 1,
          price: 240,
          notes: 'Medium spicy',
        },
      ],
    };

    const targetWidth = station?.paperWidth || paperWidth;
    const targetName = station?.name || 'Kitchen Printer Test';

    // If Network LAN
    if (station?.connectionType === 'network' && station.ipAddress) {
      await handleTestLanSocket(station.ipAddress, station.port || 9100, targetName);
      return;
    }

    // If Direct USB
    if (station?.connectionType === 'usb') {
      const toastId = toast.loading('Sending ESC/POS bytes to USB printer...');
      try {
        const bytes = buildKotEscPos(mockOrder, shop, {
          paperWidth: targetWidth,
          stationName: targetName,
          soundBuzzer: station.soundBuzzer !== false,
        });
        const ok = await sendEscPosToDevice(bytes);
        if (ok) {
          toast.success('Test KOT sent to USB thermal printer!', { id: toastId });
        } else {
          toast.error('No USB printer paired. Click edit station and pair your printer.', { id: toastId });
        }
      } catch (e: any) {
        toast.error('Failed to send to USB printer', { id: toastId });
      }
      return;
    }

    // System Browser / Kiosk Print
    toast.loading('Sending test KOT slip...', { id: 'test-kot' });
    try {
      const ok = await printThermalKot(mockOrder, shop, {
        paperWidth: targetWidth,
        stationName: targetName,
        invocationMode: 'full',
      });
      if (ok) {
        toast.success(`Test KOT sent to ${targetWidth} printer!`, { id: 'test-kot' });
      } else {
        toast.error('Print dialog canceled or printer unavailable', { id: 'test-kot' });
      }
    } catch (err) {
      toast.error('Failed to run test print', { id: 'test-kot' });
    }
  };

  // Cashier Billing Printer Modal State
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [editingBillingPrinterId, setEditingBillingPrinterId] = useState<string | null>(null);
  const [billingPrinterForm, setBillingPrinterForm] = useState<{
    name: string;
    paperWidth: '80mm' | '58mm';
    connectionType: 'browser' | 'network' | 'usb';
    ipAddress: string;
    port: number;
    enabled: boolean;
    isDefault: boolean;
  }>({
    name: '',
    paperWidth: '80mm',
    connectionType: 'network',
    ipAddress: '127.0.0.1',
    port: 9100,
    enabled: true,
    isDefault: false,
  });

  // Check Local Print Bridge health when printer settings or modals are opened
  useEffect(() => {
    if (activeTab === 'printers' || isStationModalOpen || isBillingModalOpen) {
      checkLocalPrintBridgeStatus().then(setBridgeStatus);
    }
  }, [activeTab, isStationModalOpen, isBillingModalOpen]);

  const openNewBillingPrinterModal = () => {
    setEditingBillingPrinterId(null);
    setBillingPrinterForm({
      name: `Cashier Counter ${billingPrinters.length + 1}`,
      paperWidth: billingPaperWidth || '80mm',
      connectionType: 'network',
      ipAddress: '127.0.0.1',
      port: 9100,
      enabled: true,
      isDefault: billingPrinters.length === 0,
    });
    setIsBillingModalOpen(true);
  };

  const openEditBillingPrinterModal = (printer: BillingPrinter) => {
    setEditingBillingPrinterId(printer.id);
    setBillingPrinterForm({
      name: printer.name,
      paperWidth: printer.paperWidth || billingPaperWidth || '80mm',
      connectionType: printer.connectionType || 'network',
      ipAddress: printer.ipAddress || '127.0.0.1',
      port: printer.port || 9100,
      enabled: printer.enabled !== false,
      isDefault: Boolean(printer.isDefault),
    });
    setIsBillingModalOpen(true);
  };

  const handlePairBillingPrinterUsb = async () => {
    try {
      const dev = await requestWebUsbPrinter();
      if (dev) {
        setBillingPrinterForm(prev => ({ ...prev, connectionType: 'usb' }));
        toast.success(`Paired USB printer: ${dev.name}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to pair USB printer');
    }
  };

  const handleSaveBillingPrinter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!billingPrinterForm.name.trim()) {
      toast.error('Please enter a cashier printer name');
      return;
    }
    if (billingPrinterForm.connectionType === 'network' && !billingPrinterForm.ipAddress.trim()) {
      toast.error('Please enter a valid IP address for LAN printing');
      return;
    }

    if (editingBillingPrinterId) {
      updateBillingPrinter(editingBillingPrinterId, billingPrinterForm);
      toast.success('Cashier printer updated');
    } else {
      addBillingPrinter(billingPrinterForm);
      toast.success('Cashier printer added');
    }
    setIsBillingModalOpen(false);
  };

  const handleTestBillPrint = async () => {
    const targetPrinter = billingPrinters?.find(p => p.isDefault && p.enabled) || billingPrinters?.[0] || billingPrinter;
    const mockOrder = {
      id: 'demo-inv-001',
      created_at: new Date().toISOString(),
      order_type: 'dine_in',
      table_number: '4',
      customer_name: 'Rahul Sharma',
      customer_phone: '+919876543210',
      payment_method: 'CASH',
      payment_status: 'paid',
      items: [
        {
          id: 'item-1',
          name: 'Paneer Butter Masala',
          quantity: 1,
          price: 240,
        },
        {
          id: 'item-2',
          name: 'Butter Naan',
          quantity: 3,
          price: 45,
        },
        {
          id: 'item-3',
          name: 'Sweet Lassi',
          quantity: 2,
          price: 60,
        },
      ],
      total_amount: 495,
    };

    await printBillToPrinter(mockOrder, shop, targetPrinter);
  };

  const handleTestSpecificBillPrint = async (printer: BillingPrinter) => {
    const mockOrder = {
      id: 'demo-inv-' + Math.floor(100 + Math.random() * 900),
      created_at: new Date().toISOString(),
      order_type: 'dine_in',
      table_number: '1',
      customer_name: 'Walk-in Customer',
      customer_phone: '+919876543210',
      payment_method: 'CASH',
      payment_status: 'paid',
      items: [
        {
          id: 'item-1',
          name: 'Paneer Butter Masala',
          quantity: 1,
          price: 240,
        },
        {
          id: 'item-2',
          name: 'Garlic Butter Naan',
          quantity: 2,
          price: 60,
        },
        {
          id: 'item-3',
          name: 'Fresh Lime Soda',
          quantity: 1,
          price: 40,
        },
      ],
      total_amount: 400,
    };

    await printBillToPrinter(mockOrder, shop, printer);
  };

  const handlePairBillingUsb = async () => {
    try {
      const dev = await requestWebUsbPrinter();
      if (dev) {
        setBillingPrinter({ connectionType: 'usb' });
        toast.success(`Paired USB billing printer: ${dev.name}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to pair USB printer');
    }
  };


  // Change Email State
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailStep, setEmailStep] = useState<1 | 2 | 3>(1);
  const [oldEmailOtp, setOldEmailOtp] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newEmailOtp, setNewEmailOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [liveRazorpayStatus, setLiveRazorpayStatus] = useState<string | null>(null);

  // Delivery Preview Test State
  const [testDistance, setTestDistance] = useState<number>(2);

  const [isDiscoveryModalOpen, setIsDiscoveryModalOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);

  const fetchSubscriptionStatus = async () => {
    try {
      const res = await api.get('/subscription/current');
      setSubscriptionStatus(res.data);
    } catch (err) {
      console.error("Failed to fetch subscription status", err);
    }
  };

  useEffect(() => {
    fetchSubscriptionStatus();
  }, []);

  // Shop Settings State
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsData, setSettingsData] = useState({
    currency: shop?.settings?.currency || '₹',
    language: shop?.settings?.language || 'en',
    show_prices: shop?.settings?.show_prices !== false,
    show_offers: shop?.settings?.show_offers !== false,
    is_discoverable: shop?.settings?.is_discoverable !== false,
    show_menus_in_discovery: shop?.settings?.show_menus_in_discovery !== false,
    hide_discovery_badge: shop?.settings?.hide_discovery_badge || false,
    delivery_enabled: shop?.settings?.delivery_enabled || false,
    base_delivery_charge: shop?.settings?.base_delivery_charge ?? 0,
    base_delivery_distance: shop?.settings?.base_delivery_distance ?? 0,
    extra_delivery_distance_step: shop?.settings?.extra_delivery_distance_step ?? 1,
    extra_delivery_charge_per_step: shop?.settings?.extra_delivery_charge_per_step ?? 0,
    takeaway_enabled: shop?.settings?.takeaway_enabled || false,
    dinein_enabled: shop?.settings?.dinein_enabled || false,
    auto_accept_orders: shop?.settings?.auto_accept_orders || false,
    online_payments_enabled: shop?.settings?.online_payments_enabled !== false,
    bank_account_number: '',
    ifsc_code: shop?.settings?.ifsc_code || '',
    beneficiary_name: shop?.settings?.beneficiary_name || '',
    upi_id: shop?.settings?.upi_id || '',
    gst_enabled: shop?.settings?.gst_enabled || false,
    gstin: shop?.settings?.gstin || '',
    legal_name: shop?.settings?.legal_name || '',
    fssai_license: shop?.settings?.fssai_license || '',
    cgst_rate: shop?.settings?.cgst_rate ?? 2.5,
    sgst_rate: shop?.settings?.sgst_rate ?? 2.5,
    inclusive_tax: shop?.settings?.inclusive_tax || false,
    tax_invoice_notes: shop?.settings?.tax_invoice_notes || '',
  });

  const discoveryModInfo = subscriptionStatus?.module_expirations?.['hide-discovery-badge'];
  const discoveryDaysLeft = discoveryModInfo?.days_left ?? subscriptionStatus?.days_left ?? 0;
  const discoveryExpiresAt = discoveryModInfo?.expires_at
    ? new Date(discoveryModInfo.expires_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  const isPaidDiscoveryActive = Boolean(
    (
      subscriptionStatus?.active_modules?.includes('hide-discovery-badge') ||
      (settingsData.is_discoverable && settingsData.hide_discovery_badge)
    ) &&
    discoveryDaysLeft > 0 &&
    !subscriptionStatus?.is_expired
  );

  // Fetch shop settings on mount
  useEffect(() => {
    const fetchShop = async () => {
      if (shop) return;
      try {
        const res = await api.get('/shops/me');
        if (res.data && res.data.id) {
          setShop(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch shop settings", err);
      }
    };
    fetchShop();
  }, [shop, setShop]);

  useEffect(() => {
    if (shop?.settings) {
      setSettingsData({
        currency: shop.settings.currency || '₹',
        language: shop.settings.language || 'en',
        show_prices: shop.settings.show_prices !== false,
        show_offers: shop.settings.show_offers !== false,
        is_discoverable: shop.settings.is_discoverable !== false,
        show_menus_in_discovery: shop.settings.show_menus_in_discovery !== false,
        hide_discovery_badge: shop.settings.hide_discovery_badge || false,
        delivery_enabled: shop.settings.delivery_enabled || false,
        base_delivery_charge: shop.settings.base_delivery_charge ?? 0,
        base_delivery_distance: shop.settings.base_delivery_distance ?? 0,
        extra_delivery_distance_step: shop.settings.extra_delivery_distance_step ?? 1,
        extra_delivery_charge_per_step: shop.settings.extra_delivery_charge_per_step ?? 0,
        takeaway_enabled: shop.settings.takeaway_enabled || false,
        dinein_enabled: shop.settings.dinein_enabled || false,
        auto_accept_orders: shop.settings.auto_accept_orders || false,
        online_payments_enabled: shop.settings.online_payments_enabled !== false,
        bank_account_number: '',
        ifsc_code: shop.settings.ifsc_code || '',
        beneficiary_name: shop.settings.beneficiary_name || '',
        upi_id: shop.settings.upi_id || '',
        gst_enabled: shop.settings.gst_enabled || false,
        gstin: shop.settings.gstin || '',
        legal_name: shop.settings.legal_name || '',
        fssai_license: shop.settings.fssai_license || '',
        cgst_rate: shop.settings.cgst_rate ?? 2.5,
        sgst_rate: shop.settings.sgst_rate ?? 2.5,
        inclusive_tax: shop.settings.inclusive_tax || false,
        tax_invoice_notes: shop.settings.tax_invoice_notes || '',
      });
    }
  }, [shop]);

  useEffect(() => {
    // Auto-sync Razorpay Route activation status if an account exists
    const syncRazorpayStatus = async () => {
      if (shop?.settings?.razorpay_account_id) {
        try {
          const res = await api.get('/shops/me/razorpay/status');
          // If status returned, update the live status state
          if (res.data?.status) {
            setLiveRazorpayStatus(res.data.status);
          }
        } catch (err) {
          console.error("Failed to sync Razorpay status on load", err);
        }
      }
    };
    syncRazorpayStatus();
  }, [shop?.settings?.razorpay_account_id]);

  const { setTitle } = useHeaderStore();

  useEffect(() => {
    setTitle('Settings', 'Manage your account, preferences, and shop ordering rules.');
  }, [setTitle]);

  const handleSaveShopSettings = async () => {
    setIsSavingSettings(true);
    try {
      const status = liveRazorpayStatus || shop?.settings?.razorpay_route_status;
      const isVerified = status === 'activated' || status === 'active';
      
      const payload = {
        ...settingsData,
        // Forcefully disable if not verified to prevent backend 400 errors if it was previously enabled
        online_payments_enabled: isVerified ? settingsData.online_payments_enabled : false
      };
      
      const res = await api.put('/shops/me/settings', payload);
      if (shop) {
        setShop({ ...shop, settings: res.data });
      } else {
        const freshShop = await api.get('/shops/me');
        setShop(freshShop.data);
      }
      toast.success('Shop settings updated successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update shop settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleSelectFreeDiscoveryOption = async () => {
    if (isPaidDiscoveryActive) {
      toast.error(`You have an active paid subscription for Discovery option (₹49/mo) with ${discoveryDaysLeft} day${discoveryDaysLeft === 1 ? '' : 's'} remaining. You cannot switch to Free until it expires.`);
      return;
    }
    try {
      const updated = {
        ...settingsData,
        is_discoverable: false,
        hide_discovery_badge: true,
        show_prices: false,
        show_offers: false,
        show_menus_in_discovery: false,
      };
      setSettingsData(updated);
      await api.put('/shops/me/settings', updated);
      if (shop) {
        setShop({ ...shop, settings: { ...shop.settings, ...updated } });
      }
      setIsDiscoveryModalOpen(false);
      toast.success('Store discovery disabled and Discover button removed from your menu.');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update discovery settings');
    }
  };

  const handleSelectPaidDiscoveryOption = async () => {
    setIsProcessingPayment(true);
    try {
      // 1. Create order for the hide-discovery-badge module (₹49/mo)
      const res = await api.post('/subscription/create-order', {
        is_all_access: false,
        selected_modules: ['hide-discovery-badge'],
        billing_cycle: 'monthly',
      });

      const orderData = res.data;

      const activatePaidDiscovery = async () => {
        const updated = {
          ...settingsData,
          is_discoverable: true,
          hide_discovery_badge: true,
          show_prices: true,
          show_offers: true,
          show_menus_in_discovery: true,
        };
        setSettingsData(updated);
        await api.put('/shops/me/settings', updated);
        if (shop) {
          setShop({ ...shop, settings: { ...shop.settings, ...updated } });
        }
        await fetchSubscriptionStatus();
        setIsDiscoveryModalOpen(false);
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
        toast.success('Paid Discovery activated! Your shop remains on discovery, and menu label is hidden.');
      };

      if (orderData.mock_mode) {
        await api.post('/subscription/verify', {
          razorpay_order_id: orderData.order_id,
          razorpay_payment_id: `pay_mock_${Date.now()}`,
          razorpay_signature: 'mock_signature_bypass',
        });
        await activatePaidDiscovery();
        setIsProcessingPayment(false);
        return;
      }

      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        toast.error('Razorpay SDK failed to load. Please check your connection.');
        setIsProcessingPayment(false);
        return;
      }

      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Menukit',
        description: 'Paid Discovery: Hide Menu Label (₹49/mo)',
        order_id: orderData.order_id,
        handler: async function (response: any) {
          try {
            await api.post('/subscription/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            await activatePaidDiscovery();
          } catch (error) {
            toast.error('Payment verification failed. Please contact support.');
          } finally {
            setIsProcessingPayment(false);
          }
        },
        theme: { color: '#f97316' },
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.on('payment.failed', function () {
        toast.error('Payment cancelled or failed. Please try again.');
        setIsProcessingPayment(false);
      });
      paymentObject.open();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to initiate payment.');
      setIsProcessingPayment(false);
    }
  };

  const handleResetToStandardDiscovery = async () => {
    if (isPaidDiscoveryActive) {
      toast.error(`You have an active paid subscription for Discovery option (₹49/mo) with ${discoveryDaysLeft} day${discoveryDaysLeft === 1 ? '' : 's'} remaining. You cannot switch to Free until it expires.`);
      return;
    }
    try {
      const updated = {
        ...settingsData,
        is_discoverable: true,
        hide_discovery_badge: false,
        show_prices: true,
        show_offers: true,
        show_menus_in_discovery: true,
      };
      setSettingsData(updated);
      await api.put('/shops/me/settings', updated);
      if (shop) {
        setShop({ ...shop, settings: { ...shop.settings, ...updated } });
      }
      setIsDiscoveryModalOpen(false);
      toast.success('Standard discovery enabled: Your shop is on the map and Discover label is visible on your menu.');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update discovery settings');
    }
  };

  const handleRequestOldEmailOtp = async () => {
    setIsSubmitting(true);
    try {
      await api.post('/auth/request-otp', { email: user?.email });
      toast.success('OTP sent to your current email');
      setEmailStep(2);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to send OTP');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOldEmailAndRequestNew = async () => {
    if (!oldEmailOtp || oldEmailOtp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }
    if (!newEmail || !newEmail.includes('@')) {
      toast.error('Please enter a valid new email address');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await api.post('/auth/request-otp', { email: newEmail });
      toast.success('OTP sent to your NEW email address');
      setEmailStep(3);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to send OTP to new email');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalizeEmailChange = async () => {
    if (!newEmailOtp || newEmailOtp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

    setIsSubmitting(true);
    try {
      await changeEmail(oldEmailOtp, newEmail, newEmailOtp);
      toast.success('Email changed successfully!');
      setIsEmailModalOpen(false);
      resetEmailFlow();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to change email');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetEmailFlow = () => {
    setEmailStep(1);
    setOldEmailOtp('');
    setNewEmail('');
    setNewEmailOtp('');
  };

  const closeEmailModal = () => {
    setIsEmailModalOpen(false);
    resetEmailFlow();
  };

  // Category Picker Component with Search, Multi-Select, & Quick Actions
  const renderCategoryPicker = (
    currentCategoryIds: string[],
    onChange: (ids: string[]) => void,
    searchQuery: string,
    onSearchChange: (q: string) => void
  ) => {
    const isUniversal = currentCategoryIds.includes('all');
    const filteredCategories = categories.filter((c) =>
      c.name.toLowerCase().includes((searchQuery || '').toLowerCase())
    );

    return (
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Tags size={14} className="text-amber-500" />
            <span>Category Routing (Assign Multiple)</span>
          </label>
          <span className="text-[11px] text-slate-400">Routes food items to this printer</span>
        </div>

        {/* Mode Toggle: Universal All Categories vs Choose Multiple Categories */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => onChange(['all'])}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              isUniversal
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Zap size={13} />
            <span>All Categories (Universal)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (isUniversal) {
                onChange([]);
              }
            }}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              !isUniversal
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Tags size={13} />
            <span>Choose Multiple ({isUniversal ? 0 : currentCategoryIds.length})</span>
          </button>
        </div>

        {isUniversal ? (
          <div className="p-3.5 rounded-xl border border-purple-200 dark:border-purple-800/60 bg-purple-50/60 dark:bg-purple-950/30 flex items-start gap-2.5">
            <CheckCircle2 size={16} className="text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-purple-900 dark:text-purple-200">
                Universal Machine Active
              </p>
              <p className="text-slate-600 dark:text-slate-400 mt-0.5 text-[11px] leading-relaxed">
                All food and drinks from every category will print to this station. Switch to "Choose Multiple" if you want to assign specific food categories only.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5 border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-900/40">
            {/* Search & Actions Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search categories..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 text-xs bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => onSearchChange('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2 text-xs shrink-0">
                <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100/80 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
                  {currentCategoryIds.length} of {categories.length} selected
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onChange(categories.map((c) => c.id))}
                    className="text-[11px] font-bold text-primary hover:underline px-1 py-0.5 cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <button
                    type="button"
                    onClick={() => onChange([])}
                    className="text-[11px] font-bold text-slate-400 hover:text-rose-500 hover:underline px-1 py-0.5 cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            {/* Selected Categories Tags Row */}
            {currentCategoryIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-white dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-800">
                {currentCategoryIds.map((catId) => {
                  const catObj = categories.find((c) => c.id === catId);
                  if (!catObj) return null;
                  return (
                    <span
                      key={catId}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700/60"
                    >
                      <span>{catObj.name}</span>
                      <button
                        type="button"
                        onClick={() => onChange(currentCategoryIds.filter((id) => id !== catId))}
                        className="hover:text-rose-600 cursor-pointer ml-0.5"
                        title={`Remove ${catObj.name}`}
                      >
                        <X size={11} strokeWidth={3} />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Category Grid Checklist */}
            <div className="max-h-56 overflow-y-auto space-y-1.5 border border-slate-200 dark:border-slate-800 rounded-xl p-2 custom-scrollbar bg-white dark:bg-slate-850">
              {filteredCategories.length === 0 ? (
                <div className="text-xs text-slate-400 py-6 text-center">
                  {searchQuery ? `No categories matching "${searchQuery}"` : 'No categories found in shop menu.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {filteredCategories.map((cat) => {
                    const isChecked = currentCategoryIds.includes(cat.id);
                    return (
                      <div
                        key={cat.id}
                        onClick={() => {
                          const exists = currentCategoryIds.includes(cat.id);
                          const updated = exists
                            ? currentCategoryIds.filter((id) => id !== cat.id)
                            : [...currentCategoryIds, cat.id];
                          onChange(updated);
                        }}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer text-xs select-none ${
                          isChecked
                            ? 'border-amber-500/80 bg-amber-50/80 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100 font-bold shadow-2xs'
                            : 'border-slate-200 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-1">
                          <div className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 transition-colors ${
                            isChecked
                              ? 'bg-amber-500 border-amber-500 text-white'
                              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                          }`}>
                            {isChecked && <Check size={11} strokeWidth={3} />}
                          </div>
                          <span className="truncate">{cat.name}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Helper to render Tab Button
  const TabButton = ({ id, label, icon: Icon }: { id: any, label: string, icon: any }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl whitespace-nowrap font-bold text-xs transition-colors shrink-0 ${
        activeTab === id 
          ? 'bg-primary text-white shadow-md' 
          : 'text-slate-600 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
      }`}
    >
      <Icon size={18} className={activeTab === id ? 'text-white' : 'text-slate-400'} />
      {label}
    </button>
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in pb-24 lg:pb-12">
      
      <HeaderActions>
        <Button
          onClick={handleSaveShopSettings}
          disabled={isSavingSettings}
          className="font-bold bg-primary text-white rounded-xl shadow-sm hover:shadow-md transition-all"
        >
          {isSavingSettings ? 'Saving...' : 'Save Settings'}
        </Button>
      </HeaderActions>

      <div className="flex flex-col md:flex-row gap-6 md:items-start pt-2">
        
        {/* Sidebar Navigation */}
        <div className="w-full md:w-64 shrink-0 flex md:flex-col gap-2 overflow-x-auto custom-scrollbar pb-2 md:pb-0 md:sticky md:top-4 md:h-fit z-10">
          <TabButton id="general" label="General" icon={Sliders} />
          <TabButton id="ordering" label="Ordering Channels" icon={ShoppingBag} />
          <TabButton id="discovery" label="Public Discovery" icon={MapPin} />
          <TabButton id="payments" label="Payments & Bank" icon={CreditCard} />
          <TabButton id="gst" label="GST & Compliances" icon={Receipt} />
          <TabButton id="printers" label="Kitchen & Printers" icon={Printer} />
          <TabButton id="account" label="Security & Account" icon={Shield} />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 space-y-6 min-w-0">
          
          {/* =========================================
              GENERAL SETTINGS TAB
          ========================================= */}
          {activeTab === 'general' && (
            <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs animate-in fade-in duration-300">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4 bg-slate-50/50 dark:bg-slate-900/50">
                <CardTitle className="text-base font-bold">Regional & Currency</CardTitle>
                <CardDescription className="text-xs">Configure how prices and language are displayed.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/60 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Coins size={14} className="text-amber-500" /> Currency Symbol
                    </label>
                    <SearchableSelect
                      options={[
                        { id: '₹', name: 'Indian Rupee (₹)' },
                        { id: '$', name: 'US Dollar ($)' },
                        { id: '€', name: 'Euro (€)' },
                        { id: '£', name: 'British Pound (£)' },
                        { id: '¥', name: 'Japanese Yen (¥)' },
                        { id: 'AED', name: 'Emirati Dirham (AED)' },
                        { id: 'SAR', name: 'Saudi Riyal (SAR)' },
                        { id: 'A$', name: 'Australian Dollar (A$)' },
                        { id: 'C$', name: 'Canadian Dollar (C$)' },
                        { id: 'S$', name: 'Singapore Dollar (S$)' },
                        { id: 'RM', name: 'Malaysian Ringgit (RM)' },
                      ]}
                      value={settingsData.currency}
                      onChange={(val) => setSettingsData(prev => ({ ...prev, currency: val }))}
                      showSearch={false}
                      className="bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Globe size={14} className="text-blue-500" /> Menu Language
                    </label>
                    <select
                      name="language"
                      value={settingsData.language}
                      onChange={(e) => setSettingsData(prev => ({ ...prev, language: e.target.value }))}
                      className="flex h-10 w-full rounded-xl border border-input bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                    >
                      <option value="en">English</option>
                      <option value="hi">Hindi</option>
                      <option value="ta">Tamil</option>
                      <option value="te">Telugu</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="ar">Arabic</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* =========================================
              ORDERING CHANNELS TAB
          ========================================= */}
          {activeTab === 'ordering' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4 bg-slate-50/50 dark:bg-slate-900/50">
                  <CardTitle className="text-base font-bold">Fulfillment Modes</CardTitle>
                  <CardDescription className="text-xs">Toggle available channels and auto-acceptance rules.</CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 divide-y divide-slate-100 dark:divide-slate-800">
                  <SettingRow
                    icon={QrCode}
                    title="Enable Dine-In Channel"
                    description="Allow customers to order directly from table QR codes."
                    checked={settingsData.dinein_enabled}
                    onChange={(c) => setSettingsData(prev => ({ ...prev, dinein_enabled: c }))}
                  />

                  <SettingRow
                    icon={ShoppingBag}
                    title="Enable Takeaway Channel"
                    description="Allow customers to pre-order food and pick up in store."
                    checked={settingsData.takeaway_enabled}
                    onChange={(c) => setSettingsData(prev => ({ ...prev, takeaway_enabled: c }))}
                  />

                  <SettingRow
                    icon={Truck}
                    title="Enable Delivery Channel"
                    description="Allow customers to place orders for doorstep home delivery."
                    checked={settingsData.delivery_enabled}
                    onChange={(c) => setSettingsData(prev => ({ ...prev, delivery_enabled: c }))}
                  />

                  <SettingRow
                    icon={Zap}
                    title="Auto Accept Incoming Orders"
                    description="Automatically confirm incoming orders without manual approval."
                    checked={settingsData.auto_accept_orders}
                    onChange={(c) => setSettingsData(prev => ({ ...prev, auto_accept_orders: c }))}
                  />
                </CardContent>
              </Card>

              {settingsData.delivery_enabled && (
                <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs border-amber-200/60 dark:border-amber-900/40">
                  <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4 bg-amber-50/30 dark:bg-amber-900/10">
                    <div className="flex items-center gap-2">
                      <Truck className="w-5 h-5 text-amber-500" />
                      <CardTitle className="text-base font-bold">Delivery Pricing Rules</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1">Base Cost ({settingsData.currency})</label>
                        <input
                          type="number" min="0" step="1"
                          value={settingsData.base_delivery_charge}
                          onChange={(e) => setSettingsData(prev => ({ ...prev, base_delivery_charge: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 font-semibold"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1">Included Distance (km)</label>
                        <input
                          type="number" min="0" step="0.5"
                          value={settingsData.base_delivery_distance}
                          onChange={(e) => setSettingsData(prev => ({ ...prev, base_delivery_distance: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 font-semibold"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1">Extra Step (km)</label>
                        <input
                          type="number" min="0.1" step="0.5"
                          value={settingsData.extra_delivery_distance_step}
                          onChange={(e) => setSettingsData(prev => ({ ...prev, extra_delivery_distance_step: Math.max(0.1, parseFloat(e.target.value) || 1) }))}
                          className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 font-semibold"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1">Extra Rate ({settingsData.currency})</label>
                        <input
                          type="number" min="0" step="1"
                          value={settingsData.extra_delivery_charge_per_step}
                          onChange={(e) => setSettingsData(prev => ({ ...prev, extra_delivery_charge_per_step: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 font-semibold"
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 text-xs text-slate-600">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 mb-3">
                        <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Preview
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-slate-500">Test Distance:</span>
                          <input
                            type="number" min="0" step="0.5"
                            value={testDistance}
                            onChange={(e) => setTestDistance(Math.max(0, parseFloat(e.target.value) || 0))}
                            className="w-16 px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg text-center font-bold text-primary focus:outline-none"
                          />
                          <span className="text-[11px] font-bold text-slate-500">km</span>
                        </div>
                      </div>
                      {(() => {
                        const dist = testDistance;
                        const baseDist = settingsData.base_delivery_distance || 0;
                        const baseCharge = settingsData.base_delivery_charge || 0;
                        const step = settingsData.extra_delivery_distance_step || 1;
                        const rate = settingsData.extra_delivery_charge_per_step || 0;

                        if (dist <= baseDist) {
                          return `Total Fee: ${settingsData.currency}${baseCharge} (Within base distance).`;
                        }
                        const extraKm = dist - baseDist;
                        const steps = Math.ceil(extraKm / step);
                        const extraFee = steps * rate;
                        return `Base: ${settingsData.currency}${baseCharge}. Extra: ${settingsData.currency}${extraFee} (${steps} steps). Total: ${settingsData.currency}${baseCharge + extraFee}.`;
                      })()}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* =========================================
              DISCOVERY TAB
          ========================================= */}
          {activeTab === 'discovery' && (
            <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs animate-in fade-in duration-300">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-bold">Public App Discovery</CardTitle>
                    <CardDescription className="text-xs">Control your visibility on the customer map and search.</CardDescription>
                  </div>
                  {/* Current Active Mode Badge */}
                  {settingsData.is_discoverable && settingsData.hide_discovery_badge ? (
                    <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 flex items-center gap-1.5 w-fit">
                      <img src={menukitLogo} alt="Menukit" className="w-3.5 h-3.5 object-contain shrink-0" />
                      Paid Discovery (₹49/mo){discoveryDaysLeft > 0 ? ` · ${discoveryDaysLeft}d left` : ''}
                    </span>
                  ) : settingsData.is_discoverable ? (
                    <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 flex items-center gap-1.5 w-fit">
                      <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                      Standard Discovery (Free)
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 flex items-center gap-1.5 w-fit">
                      <EyeOff size={13} className="shrink-0" />
                      Discovery Disabled
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-6">
                <SettingRow
                  icon={MapPin}
                  title="Enable Store Discovery"
                  description={
                    settingsData.is_discoverable && settingsData.hide_discovery_badge
                      ? `Paid mode active (${discoveryDaysLeft} days left): Shop is discoverable on public map, and 'Discover' label is hidden on your public menu.`
                      : settingsData.is_discoverable
                      ? "Standard mode active: Shop is discoverable on public map, and 'Discover' label is shown on your public menu."
                      : "Discovery disabled: Shop is removed from public map, and 'Discover' label is hidden on your menu."
                  }
                  checked={settingsData.is_discoverable}
                  onChange={(c) => {
                    if (isPaidDiscoveryActive && !c) {
                      toast.error(`You have an active paid subscription for Discovery option (₹49/mo) with ${discoveryDaysLeft} days remaining. You cannot switch to the Free option until it expires.`);
                      setIsDiscoveryModalOpen(true);
                      return;
                    }
                    if (!c) {
                      // Turning off -> show the 2 options modal!
                      setIsDiscoveryModalOpen(true);
                    } else {
                      // Turning back on -> standard discovery
                      handleResetToStandardDiscovery();
                    }
                  }}
                />

                {/* Option summary cards */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Discovery & Menu Label Options
                    </h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsDiscoveryModalOpen(true)}
                      className="text-xs h-8 cursor-pointer"
                    >
                      Change Option
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Free Option Card */}
                    <div
                      onClick={() => setIsDiscoveryModalOpen(true)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        !settingsData.is_discoverable
                          ? 'border-purple-500 bg-purple-50/40 dark:bg-purple-950/20 ring-1 ring-purple-500'
                          : isPaidDiscoveryActive
                          ? 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 opacity-80'
                          : 'border-border bg-card hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <EyeOff size={14} className="text-slate-500" />
                          Option 1: Free Option
                        </span>
                        {isPaidDiscoveryActive ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 flex items-center gap-1">
                            <Lock size={10} /> Locked
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            ₹0 Free
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Hides your shop completely from the public discovery map, and removes the "Discover" label from your customer menu.
                      </p>
                      {isPaidDiscoveryActive ? (
                        <div className="mt-2 text-[11px] font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1">
                          <Lock size={12} /> Locked until paid subscription expires ({discoveryDaysLeft}d left)
                        </div>
                      ) : !settingsData.is_discoverable ? (
                        <div className="mt-2 text-[11px] font-bold text-purple-700 dark:text-purple-400 flex items-center gap-1">
                          <Check size={12} strokeWidth={3} /> Currently Active
                        </div>
                      ) : null}
                    </div>

                    {/* Paid Option Card */}
                    <div
                      onClick={() => setIsDiscoveryModalOpen(true)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        settingsData.is_discoverable && settingsData.hide_discovery_badge
                          ? 'border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 ring-1 ring-amber-500'
                          : 'border-border bg-card hover:border-amber-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <img src={menukitLogo} alt="Menukit" className="w-3.5 h-3.5 object-contain shrink-0" />
                          Option 2: Paid Option
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                          ₹49 / mo
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Shows your shop on public discovery map & search, but completely removes the "Discover" label from your customer menu. Included in next renewal.
                      </p>
                      {settingsData.is_discoverable && settingsData.hide_discovery_badge && (
                        <div className="mt-2 text-[11px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                          <Check size={12} strokeWidth={3} /> Currently Active {discoveryDaysLeft > 0 ? `(${discoveryDaysLeft} days left)` : ''}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* =========================================
              PAYMENTS & BANK TAB
          ========================================= */}
          {activeTab === 'payments' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4 bg-slate-50/50 dark:bg-slate-900/50">
                  <CardTitle className="text-base font-bold">Online Payments</CardTitle>
                  <CardDescription className="text-xs">Gateway configuration and payment settings.</CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-6">
                  {/* Gateway */}
                  <div>
                    {(() => {
                      const status = liveRazorpayStatus || shop?.settings?.razorpay_route_status;
                      const isVerified = status === 'activated' || status === 'active';
                      return (
                        <>
                          <SettingRow
                            icon={Zap}
                            title="Accept Online Payments via Gateway"
                            description="Enable online checkout (UPI, Cards, Netbanking) for Takeaway & Delivery."
                            checked={settingsData.online_payments_enabled && isVerified}
                            onChange={(c) => {
                              if (isVerified) {
                                setSettingsData(prev => ({ ...prev, online_payments_enabled: c }));
                              }
                            }}
                            disabled={!isVerified}
                          />
                          {!isVerified && (
                            <div className="mt-2 p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 rounded-xl space-y-1 text-xs">
                              <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200">
                                <AlertCircle size={14} className="text-amber-600" />
                                <span>Verification Required</span>
                              </div>
                              <p className="text-amber-700 dark:text-amber-300">You must verify your Settlement Bank Account before accepting online payments.</p>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>

              {/* Settlement Bank */}
              <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4 bg-green-50/30 dark:bg-green-900/10">
                  <CardTitle className="text-base font-bold text-green-700 dark:text-green-500">Settlement Bank Account</CardTitle>
                  <CardDescription className="text-xs">Receive automatic payouts for online orders.</CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase mb-1 block">Beneficiary Name</label>
                      <input
                        type="text" placeholder="e.g. Siva Store"
                        value={settingsData.beneficiary_name || ''}
                        onChange={(e) => setSettingsData(prev => ({ ...prev, beneficiary_name: e.target.value }))}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 uppercase mb-1 block">Account Number</label>
                      <input
                        type="text"
                        placeholder={shop?.settings?.bank_account_last4 ? `•••• •••• ${shop.settings.bank_account_last4}` : "Account Number"}
                        value={settingsData.bank_account_number || ''}
                        onChange={(e) => setSettingsData(prev => ({ ...prev, bank_account_number: e.target.value }))}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 uppercase mb-1 block">IFSC Code</label>
                      <input
                        type="text" placeholder="e.g. HDFC0001234"
                        value={settingsData.ifsc_code || ''}
                        onChange={(e) => setSettingsData(prev => ({ ...prev, ifsc_code: e.target.value.toUpperCase() }))}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-green-500"
                      />
                    </div>
                  </div>
                  
                  {shop?.settings?.bank_account_last4 && (
                    <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-100">
                      <p className="text-xs text-green-600 font-bold">
                        ✓ Linked (ending in {shop.settings.bank_account_last4})
                      </p>
                      {(liveRazorpayStatus || shop.settings.razorpay_route_status) && (() => {
                        const status = liveRazorpayStatus || shop.settings.razorpay_route_status;
                        const isVerified = status === 'activated' || status === 'active';
                        return (
                          <div className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase ${isVerified ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {isVerified ? '✓ Verified & Active' : '⏳ Verification Pending'}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* =========================================
              GST & GOVERNMENT COMPLIANCES TAB
          ========================================= */}
          {activeTab === 'gst' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4 bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base font-bold">GST & Government Compliances</CardTitle>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          Tax Invoices & FSSAI
                        </span>
                      </div>
                      <CardDescription className="text-xs mt-1">
                        Configure GSTIN, FSSAI registration, tax rates (CGST/SGST), and invoice calculation mode.
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Enable GST Billing:</span>
                      <Switch
                        checked={settingsData.gst_enabled}
                        onCheckedChange={(checked) => setSettingsData(prev => ({ ...prev, gst_enabled: checked }))}
                      />
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 sm:p-6 space-y-6">
                  {!settingsData.gst_enabled ? (
                    <div className="p-6 text-center rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
                        <Receipt size={24} />
                      </div>
                      <div className="font-bold text-sm text-slate-800 dark:text-slate-200">GST Billing is Disabled</div>
                      <p className="text-xs text-slate-500 max-w-md mx-auto">
                        Turn on the switch above if your restaurant or business is registered under GST to calculate CGST/SGST on orders, issue legal Tax Invoices, and generate tax compliance audit reports.
                      </p>
                      <Button
                        size="sm"
                        onClick={() => setSettingsData(prev => ({ ...prev, gst_enabled: true }))}
                        className="font-bold bg-primary text-white text-xs h-8 px-4"
                      >
                        Enable GST Now
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Government Registrations */}
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                          <Store size={14} className="text-primary" />
                          Business & Government Identifiers
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                              <span>Goods & Services Tax ID (GSTIN)</span>
                              <span className="text-[10px] font-normal text-slate-400">15 Characters</span>
                            </label>
                            <Input
                              placeholder="e.g. 33AAAAA0000A1Z5"
                              value={settingsData.gstin}
                              onChange={(e) => setSettingsData(prev => ({ ...prev, gstin: e.target.value.toUpperCase().trim() }))}
                              maxLength={15}
                              className="font-mono uppercase font-bold tracking-wider"
                            />
                            <p className="text-[11px] text-slate-500">
                              Appears prominently on public customer receipts and cashier bills.
                            </p>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              Legal / Registered Business Name
                            </label>
                            <Input
                              placeholder="e.g. Siva Food Enterprises Pvt Ltd"
                              value={settingsData.legal_name}
                              onChange={(e) => setSettingsData(prev => ({ ...prev, legal_name: e.target.value }))}
                            />
                            <p className="text-[11px] text-slate-500">
                              Official registered trade entity name for legal Tax Invoices.
                            </p>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                              <span>FSSAI License Number</span>
                              <span className="text-[10px] font-normal text-slate-400">14 Digits</span>
                            </label>
                            <Input
                              placeholder="e.g. 12423008000123"
                              value={settingsData.fssai_license}
                              onChange={(e) => setSettingsData(prev => ({ ...prev, fssai_license: e.target.value.trim() }))}
                              maxLength={14}
                              className="font-mono tracking-wider font-bold"
                            />
                            <p className="text-[11px] text-slate-500">
                              Mandatory Food Safety license number printed on restaurant slips.
                            </p>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              Invoice Declaration / Footer Note
                            </label>
                            <Input
                              placeholder="e.g. Tax Invoice issued under Section 31 of CGST Act"
                              value={settingsData.tax_invoice_notes}
                              onChange={(e) => setSettingsData(prev => ({ ...prev, tax_invoice_notes: e.target.value }))}
                            />
                            <p className="text-[11px] text-slate-500">
                              Custom compliance or return policy note printed at the bottom of bills.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Tax Rates Configuration */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                            <Coins size={14} className="text-primary" />
                            Tax Rates & GST Slabs
                          </h4>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] font-medium text-slate-500">Quick Slabs:</span>
                            <button
                              type="button"
                              onClick={() => setSettingsData(prev => ({ ...prev, cgst_rate: 2.5, sgst_rate: 2.5 }))}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                settingsData.cgst_rate === 2.5 && settingsData.sgst_rate === 2.5
                                  ? 'bg-primary text-white shadow-xs'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                              }`}
                            >
                              5% (Standard)
                            </button>
                            <button
                              type="button"
                              onClick={() => setSettingsData(prev => ({ ...prev, cgst_rate: 6.0, sgst_rate: 6.0 }))}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                settingsData.cgst_rate === 6.0 && settingsData.sgst_rate === 6.0
                                  ? 'bg-primary text-white shadow-xs'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                              }`}
                            >
                              12%
                            </button>
                            <button
                              type="button"
                              onClick={() => setSettingsData(prev => ({ ...prev, cgst_rate: 9.0, sgst_rate: 9.0 }))}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                settingsData.cgst_rate === 9.0 && settingsData.sgst_rate === 9.0
                                  ? 'bg-primary text-white shadow-xs'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                              }`}
                            >
                              18% (AC/Bar)
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              Central GST (CGST %)
                            </label>
                            <div className="relative">
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
                                max="28"
                                value={settingsData.cgst_rate}
                                onChange={(e) => setSettingsData(prev => ({ ...prev, cgst_rate: parseFloat(e.target.value) || 0 }))}
                                className="pr-8 font-bold"
                              />
                              <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">%</span>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              State GST (SGST %)
                            </label>
                            <div className="relative">
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
                                max="28"
                                value={settingsData.sgst_rate}
                                onChange={(e) => setSettingsData(prev => ({ ...prev, sgst_rate: parseFloat(e.target.value) || 0 }))}
                                className="pr-8 font-bold"
                              />
                              <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">%</span>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              Combined Effective Tax
                            </label>
                            <div className="h-10 flex items-center px-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 font-black text-emerald-700 dark:text-emerald-300 text-sm">
                              {((Number(settingsData.cgst_rate) || 0) + (Number(settingsData.sgst_rate) || 0)).toFixed(1)}% Total GST
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Tax Calculation Mode: Exclusive vs Inclusive */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                          <Sliders size={14} className="text-primary" />
                          Tax Pricing Calculation Mode
                        </h4>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div 
                            onClick={() => setSettingsData(prev => ({ ...prev, inclusive_tax: false }))}
                            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                              !settingsData.inclusive_tax
                                ? 'border-primary bg-primary/5 dark:bg-primary/10'
                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                                Exclusive Tax (Added at checkout)
                              </span>
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                !settingsData.inclusive_tax ? 'border-primary bg-primary text-white' : 'border-slate-300'
                              }`}>
                                {!settingsData.inclusive_tax && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              Standard for restaurants. Menu prices represent net food amount; CGST & SGST are computed and added on top in the bill.
                            </p>
                            <div className="mt-3 text-[11px] font-mono bg-slate-100 dark:bg-slate-800 p-2 rounded-lg text-slate-600 dark:text-slate-400">
                              Item: ₹100 + 5% GST (₹5) = <strong>Total ₹105</strong>
                            </div>
                          </div>

                          <div 
                            onClick={() => setSettingsData(prev => ({ ...prev, inclusive_tax: true }))}
                            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                              settingsData.inclusive_tax
                                ? 'border-primary bg-primary/5 dark:bg-primary/10'
                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                                Inclusive Tax (Included in menu price)
                              </span>
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                settingsData.inclusive_tax ? 'border-primary bg-primary text-white' : 'border-slate-300'
                              }`}>
                                {settingsData.inclusive_tax && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              Ideal for cafes & QSR. Menu prices already include GST; the invoice automatically shows the extracted net taxable amount & tax breakdown.
                            </p>
                            <div className="mt-3 text-[11px] font-mono bg-slate-100 dark:bg-slate-800 p-2 rounded-lg text-slate-600 dark:text-slate-400">
                              Item: ₹100 (Taxable ₹95.24 + GST ₹4.76) = <strong>Total ₹100</strong>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Live Status Overview Banner */}
                      <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5">
                          <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <div>
                            <span className="font-extrabold text-emerald-950 dark:text-emerald-200">
                              GST Compliance Active ({((Number(settingsData.cgst_rate) || 0) + (Number(settingsData.sgst_rate) || 0)).toFixed(1)}% Total Tax)
                            </span>
                            <div className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                              Mode: {settingsData.inclusive_tax ? 'Inclusive Pricing' : 'Exclusive (Added to Bill)'} • GSTIN: {settingsData.gstin || 'Not configured'} • FSSAI: {settingsData.fssai_license || 'Not configured'}
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={handleSaveShopSettings}
                          disabled={isSavingSettings}
                          className="font-bold bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 h-8 cursor-pointer"
                        >
                          {isSavingSettings ? 'Saving...' : 'Save GST Settings'}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* =========================================
              KITCHEN PRINTERS & KOT SETTINGS TAB
          ========================================= */}
          {activeTab === 'printers' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Context Selector / Quick Filter Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2 sm:p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setPrinterSection('all')}
                    className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      printerSection === 'all'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Layers size={13} />
                    <span>All Setup</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrinterSection('kot')}
                    className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      printerSection === 'kot'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <UtensilsCrossed size={13} />
                    <span>Kitchen KOT ({stations.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrinterSection('billing')}
                    className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      printerSection === 'billing'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Receipt size={13} />
                    <span>Cashier Billing ({billingPrinters.length})</span>
                  </button>
                </div>
              </div>

              {/* =========================================================
                  SECTION 1: KITCHEN ORDER TICKETS (KOT)
              ========================================================= */}
              {(printerSection === 'all' || printerSection === 'kot') && (
                <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
                  <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4 bg-linear-to-r from-amber-50/70 via-orange-50/30 to-transparent dark:from-amber-950/20 dark:via-orange-950/10 dark:to-transparent flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                        <UtensilsCrossed size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-base font-bold">Kitchen Order Tickets (KOT)</CardTitle>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                            Kitchen Prep
                          </span>
                        </div>
                        <CardDescription className="text-xs mt-0.5">
                          Configure thermal tickets for cooks, station routing (Kitchen, Bar, Grill), and automated printing upon acceptance.
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTestPrint()}
                        leftIcon={<FileText size={13} className="text-amber-500" />}
                        className="text-xs font-bold"
                      >
                        Test Sample KOT
                      </Button>
                      <Button
                        size="sm"
                        onClick={openNewStationModal}
                        leftIcon={<Plus size={14} />}
                        className="bg-primary text-white font-bold text-xs shadow-xs"
                      >
                        Add Station
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 sm:p-5 space-y-5">
                    {/* Compact Quick Settings Bar: Auto-Print Toggle + Default Paper Width */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Auto-Print KOT Switch */}
                      <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                            <Zap size={16} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                              Auto-Print KOT on Acceptance
                            </p>
                            <p className="text-[10px] text-slate-500 truncate">
                              Print tickets when orders are accepted
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={autoPrintOnAccept}
                          onChange={(val) => {
                            setAutoPrintOnAccept(val);
                            toast.success(val ? 'Auto-print KOT enabled' : 'Auto-print KOT disabled');
                          }}
                        />
                      </div>

                      {/* Default KOT Roll Width Segmented Selector */}
                      <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            Default KOT Roll Width
                          </p>
                          <p className="text-[10px] text-slate-500">
                            Format for new station tickets
                          </p>
                        </div>
                        <div className="flex items-center bg-slate-200/80 dark:bg-slate-700/60 p-1 rounded-xl shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setPaperWidth('80mm');
                              toast.success('KOT width set to 80mm');
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              paperWidth === '80mm'
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            80mm
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPaperWidth('58mm');
                              toast.success('KOT width set to 58mm');
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              paperWidth === '58mm'
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            58mm
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Kitchen Printer Stations Subsection */}
                    <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                            Kitchen Printer Stations &amp; Category Routing
                          </label>
                          <p className="text-[11px] text-slate-500">
                            Route food items to specific printers (e.g., Main Kitchen, Bar, Grill) or print universally.
                          </p>
                        </div>
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                          {stations.length} {stations.length === 1 ? 'Station Configured' : 'Stations Configured'}
                        </span>
                      </div>

                      {stations.length === 0 ? (
                        <div className="text-center py-8 bg-slate-50 dark:bg-slate-850/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-5 space-y-2.5">
                          <Printer size={32} className="mx-auto text-slate-400" />
                          <div>
                            <p className="font-bold text-sm text-slate-700 dark:text-slate-300">No Printer Stations Configured</p>
                            <p className="text-xs text-slate-500 mt-0.5 max-w-md mx-auto">
                              Add your first station (e.g., Main Kitchen, Bar, Tandoor) to automatically route specific food categories.
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={openNewStationModal}
                            leftIcon={<Plus size={14} />}
                            className="font-bold"
                          >
                            Register Printer Machine
                          </Button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          {stations.map((station) => {
                            const isUniversal = !station.categoryIds || station.categoryIds.includes('all') || station.categoryIds.length === 0;
                            const matchedCategories = !isUniversal 
                              ? categories.filter(c => station.categoryIds.includes(c.id))
                              : [];

                            return (
                              <div
                                key={station.id}
                                className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between space-y-2.5 ${
                                  station.enabled !== false
                                    ? 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs'
                                    : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/40 dark:border-slate-800/40 opacity-70'
                                }`}
                              >
                                <div className="space-y-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="space-y-0.5">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="font-black text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                          <Printer size={15} className="text-primary" />
                                          {station.name}
                                        </h4>
                                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                          {station.paperWidth || '80mm'}
                                        </span>
                                        {station.connectionType === 'network' && (
                                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                                            <Wifi size={10} /> LAN {station.ipAddress || 'No IP'}
                                          </span>
                                        )}
                                        {station.connectionType === 'usb' && (
                                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border border-teal-200 dark:border-teal-800 flex items-center gap-1">
                                            <Usb size={10} /> Direct USB
                                          </span>
                                        )}
                                        {(!station.connectionType || station.connectionType === 'browser') && (
                                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                                            🖥️ System Default
                                          </span>
                                        )}
                                        {station.soundBuzzer !== false && (
                                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded text-amber-600 dark:text-amber-400 flex items-center gap-0.5" title="Kitchen Buzzer Alert Active">
                                            <Volume2 size={11} />
                                          </span>
                                        )}
                                        {station.enabled === false && (
                                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                                            Disabled
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => handleTestPrint(station)}
                                        title="Send Test Print to this Station"
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                      >
                                        <Printer size={14} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => openEditStationModal(station)}
                                        title="Edit Station"
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                      >
                                        <Edit2 size={14} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (confirm(`Remove printer station "${station.name}"?`)) {
                                            removeStation(station.id);
                                            toast.success('Station removed');
                                          }
                                        }}
                                        title="Delete Station"
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Category routing badges */}
                                  <div className="pt-0.5">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                                        Routing Categories:
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setQuickAssignStation(station);
                                          setQuickAssignCategoryIds(station.categoryIds || ['all']);
                                          setCategorySearchQuery('');
                                        }}
                                        className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:underline cursor-pointer"
                                        title="Choose & assign multiple categories to this printer"
                                      >
                                        <Tags size={12} />
                                        <span>Assign Categories</span>
                                      </button>
                                    </div>
                                    {isUniversal ? (
                                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                                        <Zap size={12} className="text-purple-600" />
                                        <span>All Categories (Universal - Prints All Food)</span>
                                      </div>
                                    ) : (
                                      <div className="flex flex-wrap gap-1">
                                        {matchedCategories.length > 0 ? (
                                          matchedCategories.map((c) => (
                                            <span
                                              key={c.id}
                                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60"
                                            >
                                              {c.name}
                                            </span>
                                          ))
                                        ) : (
                                          <span className="text-[11px] text-slate-400 italic">
                                            {station.categoryIds.length} categories assigned
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                                  <span className="text-slate-500 font-medium text-[11px]">
                                    Auto-print: <strong className={station.autoPrintOnAccept !== false ? 'text-emerald-600' : 'text-slate-400'}>{station.autoPrintOnAccept !== false ? 'Active' : 'Off'}</strong>
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => updateStation(station.id, { enabled: station.enabled === false ? true : false })}
                                    className="h-6 text-[11px] font-bold text-slate-600 dark:text-slate-300 px-2"
                                  >
                                    {station.enabled === false ? 'Enable' : 'Disable'}
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* =========================================================
                  SECTION 2: CASHIER & CUSTOMER BILL PRINTERS
              ========================================================= */}
              {(printerSection === 'all' || printerSection === 'billing') && (
                <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
                  <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3.5 bg-linear-to-r from-emerald-50/70 via-teal-50/30 to-transparent dark:from-emerald-950/20 dark:via-teal-950/10 dark:to-transparent flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Receipt size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-base font-bold">Customer Bill &amp; Tax Receipt Printers</CardTitle>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            Cashier Counter
                          </span>
                        </div>
                        <CardDescription className="text-xs mt-0.5">
                          Configure thermal printers for customer tax bills, invoices, and multiple billing counters.
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleTestBillPrint}
                        leftIcon={<Printer size={13} className="text-emerald-600" />}
                        className="text-xs font-bold border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                      >
                        Test Print Bill
                      </Button>
                      <Button
                        size="sm"
                        onClick={openNewBillingPrinterModal}
                        leftIcon={<Plus size={14} />}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
                      >
                        Add Cashier Printer
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-5 space-y-5">
                    {/* Compact Quick Settings Bar: Auto-Print Toggle + Receipt Paper Width */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Auto-Print Bill Switch */}
                      <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                            <Zap size={16} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                              Auto-Print on Completion
                            </p>
                            <p className="text-[10px] text-slate-500 truncate">
                              Print bill when order is paid or completed
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={autoPrintOnPayment || false}
                          onChange={(val) => {
                            setAutoPrintOnPayment(val);
                            toast.success(val ? 'Auto-print bill enabled' : 'Auto-print bill disabled');
                          }}
                        />
                      </div>

                      {/* Receipt Paper Width Segmented Selector */}
                      <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            Default Receipt Paper Width
                          </p>
                          <p className="text-[10px] text-slate-500">
                            Format for customer tax bills
                          </p>
                        </div>
                        <div className="flex items-center bg-slate-200/80 dark:bg-slate-700/60 p-1 rounded-xl shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setBillingPaperWidth('80mm');
                              toast.success('Bill paper width set to 80mm');
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              billingPaperWidth !== '58mm'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            80mm
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setBillingPaperWidth('58mm');
                              toast.success('Bill paper width set to 58mm');
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              billingPaperWidth === '58mm'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            58mm
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Cashier Billing Printers Subsection */}
                    <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                            Cashier Billing Printers &amp; Counters
                          </label>
                          <p className="text-[11px] text-slate-500">
                            Configure one or multiple bill printers (e.g., Main Cashier Counter, Bar Billing, Takeaway Desk).
                          </p>
                        </div>
                        <span className="text-[11px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                          {billingPrinters.length} {billingPrinters.length === 1 ? 'Printer' : 'Printers'} Configured
                        </span>
                      </div>

                      {billingPrinters.length === 0 ? (
                        <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                          <Receipt className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No Cashier Printers Added</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">Click below to register your first billing printer.</p>
                          <Button
                            size="sm"
                            onClick={openNewBillingPrinterModal}
                            leftIcon={<Plus size={14} />}
                            className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                          >
                            Add Cashier Printer
                          </Button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          {billingPrinters.map((printer) => (
                            <div
                              key={printer.id}
                              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                                printer.enabled === false
                                  ? 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 opacity-60'
                                  : 'border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/70 shadow-xs hover:border-emerald-300 dark:hover:border-emerald-800'
                              }`}
                            >
                              <div className="space-y-2.5">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <Receipt size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                                      <h5 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                                        {printer.name}
                                      </h5>
                                    </div>

                                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                        {printer.paperWidth || '80mm'}
                                      </span>
                                      {printer.connectionType === 'network' && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                                          <Wifi size={10} /> LAN {printer.ipAddress}:{printer.port || 9100}
                                        </span>
                                      )}
                                      {printer.connectionType === 'usb' && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border border-teal-200 dark:border-teal-800 flex items-center gap-1">
                                          <Usb size={10} /> Direct USB
                                        </span>
                                      )}
                                      {(!printer.connectionType || printer.connectionType === 'browser') && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                                          🖥️ System Default
                                        </span>
                                      )}
                                      {printer.isDefault && (
                                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                          Default Bill Printer
                                        </span>
                                      )}
                                      {printer.enabled === false && (
                                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                                          Disabled
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleTestSpecificBillPrint(printer)}
                                      title="Send Test Bill Print to this Printer"
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    >
                                      <Printer size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openEditBillingPrinterModal(printer)}
                                      title="Edit Cashier Printer"
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (billingPrinters.length <= 1) {
                                          toast.error('You must have at least one cashier billing printer.');
                                          return;
                                        }
                                        if (confirm(`Remove cashier printer "${printer.name}"?`)) {
                                          removeBillingPrinter(printer.id);
                                          toast.success('Cashier printer removed');
                                        }
                                      }}
                                      title="Delete Printer"
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>

                                <div className="pt-0.5">
                                  {printer.isDefault ? (
                                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                                      <Check size={12} strokeWidth={3} />
                                      <span>Primary Counter (Default target for quick bill print &amp; auto-printing)</span>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setDefaultBillingPrinter(printer.id);
                                        toast.success(`"${printer.name}" set as default bill printer`);
                                      }}
                                      className="text-[11px] font-bold text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline cursor-pointer"
                                    >
                                      ★ Set as Primary Bill Printer
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                                <span className="text-slate-500 font-medium text-[11px]">
                                  Auto-print: <strong className={printer.enabled !== false && autoPrintOnPayment ? 'text-emerald-600' : 'text-slate-400'}>{printer.enabled !== false && autoPrintOnPayment ? 'Active' : 'Off'}</strong>
                                </span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => updateBillingPrinter(printer.id, { enabled: printer.enabled === false ? true : false })}
                                  className="h-6 text-[11px] font-bold text-slate-600 dark:text-slate-300 px-2"
                                >
                                  {printer.enabled === false ? 'Enable' : 'Disable'}
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* =========================================
              SECURITY & ACCOUNT TAB
          ========================================= */}
          {activeTab === 'account' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4 bg-slate-50/50 dark:bg-slate-900/50">
                  <CardTitle className="text-base font-bold">Account Profile</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-6">
                  
                  {/* Shop Details Shortcut */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 cursor-pointer hover:border-primary/50 transition-colors group" onClick={() => navigate('/shop-setup')}>
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                        {shop?.logo_url ? <img src={shop.logo_url} alt="Logo" className="w-full h-full rounded-xl object-cover" /> : <Store size={20} />}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-800">{shop?.name || 'My Shop'}</p>
                        <p className="text-xs text-slate-500">Edit shop name, logo, banner & hours</p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-400 group-hover:text-primary transition-all shrink-0 ml-2" />
                  </div>

                  {/* Email & Security */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center font-black uppercase text-sm shrink-0">
                        {user?.email?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Signed In Email</p>
                        <p className="font-bold text-sm text-slate-800 truncate">{user?.email}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setIsEmailModalOpen(true)} className="rounded-xl font-bold">
                      Change Email
                    </Button>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-4 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-slate-700">App Version & Mode</p>
                      <p className="text-slate-500">v1.0.0 ({import.meta.env.MODE || 'production'})</p>
                    </div>
                    <div className="bg-emerald-100 text-emerald-700 font-bold px-3 py-1 rounded-full uppercase text-[10px]">
                      Stable
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

        </div>
      </div>

      {/* Change Email Modal (No changes to logic) */}
      <Modal
        isOpen={isEmailModalOpen}
        onClose={closeEmailModal}
        title="Change Email Address"
        className="max-w-md"
      >
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-8">
            <div className={`h-1.5 flex-1 rounded-full ${emailStep >= 1 ? 'bg-primary' : 'bg-slate-100'}`} />
            <div className={`h-1.5 flex-1 rounded-full ${emailStep >= 2 ? 'bg-primary' : 'bg-slate-100'}`} />
            <div className={`h-1.5 flex-1 rounded-full ${emailStep >= 3 ? 'bg-primary' : 'bg-slate-100'}`} />
          </div>

          {emailStep === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="text-primary w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-800 text-lg">Verify Identity</h3>
                <p className="text-sm text-slate-500">To protect your account, we need to send an OTP to your current email.</p>
                <div className="py-2 px-3 bg-slate-50 border rounded-lg font-medium text-slate-700 mt-2 inline-block">
                  {user?.email}
                </div>
              </div>
              <Button onClick={handleRequestOldEmailOtp} disabled={isSubmitting} className="w-full">
                {isSubmitting ? 'Sending...' : 'Send OTP'}
              </Button>
            </div>
          )}

          {emailStep === 2 && (
            <div className="space-y-5 animate-fade-in">
              <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm mb-2">
                We sent a code to <strong>{user?.email}</strong>
              </div>
              <Input
                label="Current Email OTP"
                value={oldEmailOtp}
                onChange={(e) => setOldEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456" maxLength={6} required autoFocus
              />
              <div className="pt-2 border-t border-slate-100">
                <Input
                  label="New Email Address"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="new@example.com" required
                />
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <Button variant="outline" onClick={closeEmailModal} type="button">Cancel</Button>
                <Button onClick={handleVerifyOldEmailAndRequestNew} disabled={isSubmitting || oldEmailOtp.length !== 6 || !newEmail.includes('@')}>
                  {isSubmitting ? 'Verifying...' : 'Verify & Send Next'}
                </Button>
              </div>
            </div>
          )}

          {emailStep === 3 && (
            <div className="space-y-5 animate-fade-in">
              <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm mb-2">
                We sent a code to <strong>{newEmail}</strong>
              </div>
              <Input
                label="New Email OTP"
                value={newEmailOtp}
                onChange={(e) => setNewEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456" maxLength={6} required autoFocus
              />
              <div className="pt-2 flex justify-end gap-3">
                <Button variant="outline" onClick={closeEmailModal} type="button">Cancel</Button>
                <Button onClick={handleFinalizeEmailChange} disabled={isSubmitting || newEmailOtp.length !== 6}>
                  {isSubmitting ? 'Finalizing...' : 'Complete Change'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Printer Station Configuration Modal */}
      <Modal
        isOpen={isStationModalOpen}
        onClose={() => setIsStationModalOpen(false)}
        title={editingStationId ? "Edit Kitchen Printer Station" : "Register Kitchen Printer Station"}
        className="max-w-lg"
      >
        <form onSubmit={handleSaveStation} className="space-y-5 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Station / Machine Name <span className="text-rose-500">*</span>
            </label>
            <Input
              value={stationForm.name}
              onChange={(e) => setStationForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Main Kitchen, Tandoor Counter, Bar & Beverages"
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Thermal Paper Width (mm)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStationForm((prev) => ({ ...prev, paperWidth: '80mm' }))}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  stationForm.paperWidth === '80mm'
                    ? 'border-primary bg-primary/10 font-bold text-primary shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                }`}
              >
                <div className="font-extrabold text-xs">80mm (Standard POS)</div>
                <div className="text-[11px] text-slate-500 mt-0.5">3 1/8 inches • 48 columns</div>
              </button>

              <button
                type="button"
                onClick={() => setStationForm((prev) => ({ ...prev, paperWidth: '58mm' }))}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  stationForm.paperWidth === '58mm'
                    ? 'border-primary bg-primary/10 font-bold text-primary shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                }`}
              >
                <div className="font-extrabold text-xs">58mm (Compact)</div>
                <div className="text-[11px] text-slate-500 mt-0.5">2 1/4 inches • Handheld/Mobile</div>
              </button>
            </div>
          </div>

          {/* Hardware Connection Mode */}
          <div className="space-y-2 pt-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Hardware Connection Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Browser / Kiosk */}
              <button
                type="button"
                onClick={() => setStationForm(prev => ({ ...prev, connectionType: 'browser' }))}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  stationForm.connectionType === 'browser'
                    ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                }`}
              >
                <div className="text-xs font-black">🖥️ System Default</div>
                <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">OS Print Spooler or Kiosk Silent</div>
              </button>

              {/* Network LAN IP */}
              <button
                type="button"
                onClick={() => setStationForm(prev => ({ ...prev, connectionType: 'network' }))}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  stationForm.connectionType === 'network'
                    ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                }`}
              >
                <div className="text-xs font-black flex items-center gap-1"><Wifi size={13} /> Network LAN</div>
                <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">Kitchen Ethernet / Wi-Fi IP (Port 9100)</div>
              </button>

              {/* Direct USB */}
              <button
                type="button"
                onClick={() => setStationForm(prev => ({ ...prev, connectionType: 'usb' }))}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  stationForm.connectionType === 'usb'
                    ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                }`}
              >
                <div className="text-xs font-black flex items-center gap-1"><Usb size={13} /> Direct USB</div>
                <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">WebUSB / Serial zero-dialog</div>
              </button>
            </div>

            {/* Network LAN IP Config Fields */}
            {stationForm.connectionType === 'network' && (
              <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-200/80 dark:border-blue-800/60 space-y-2.5 animate-fade-in">
                {bridgeStatus?.online ? (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="font-bold">Local Print Bridge Active</span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">({bridgeStatus.ip || '127.0.0.1'}:9101)</span>
                    </div>
                    <span className="text-[9px] font-extrabold uppercase bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded text-emerald-700 dark:text-emerald-300">Direct LAN</span>
                  </div>
                ) : (
                  <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                      <span className="truncate">For cloud to local printing, run <code className="font-mono font-bold">python -m virtual_kitchen_printer</code></span>
                    </div>
                    <button
                      type="button"
                      onClick={() => checkLocalPrintBridgeStatus().then(setBridgeStatus)}
                      className="text-[10px] font-bold text-amber-700 dark:text-amber-300 underline hover:text-amber-900 ml-2 shrink-0 cursor-pointer"
                    >
                      Check Bridge
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Printer IP Address *</label>
                      {bridgeStatus?.ip && stationForm.ipAddress !== bridgeStatus.ip && (
                        <button
                          type="button"
                          onClick={() => setStationForm(prev => ({ ...prev, ipAddress: bridgeStatus.ip! }))}
                          className="text-[10px] text-primary hover:underline font-semibold cursor-pointer"
                        >
                          Use Wi-Fi IP ({bridgeStatus.ip})
                        </button>
                      )}
                    </div>
                    <Input
                      value={stationForm.ipAddress}
                      onChange={(e) => setStationForm(prev => ({ ...prev, ipAddress: e.target.value }))}
                      placeholder="e.g. 192.168.1.150 or 127.0.0.1"
                      className="bg-white dark:bg-slate-900 text-xs h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">RAW Port</label>
                    <Input
                      type="number"
                      value={stationForm.port || 9100}
                      onChange={(e) => setStationForm(prev => ({ ...prev, port: parseInt(e.target.value) || 9100 }))}
                      placeholder="9100"
                      className="bg-white dark:bg-slate-900 text-xs h-9"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-500">Universal RAW ESC/POS port is 9100</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isTestingLan || !stationForm.ipAddress.trim()}
                    onClick={() => handleTestLanSocket(stationForm.ipAddress, stationForm.port, stationForm.name)}
                    className="h-7 text-xs font-bold bg-white dark:bg-slate-900 cursor-pointer"
                  >
                    {isTestingLan ? 'Testing...' : 'Test Connection'}
                  </Button>
                </div>
              </div>
            )}

            {/* Direct USB Config Fields */}
            {stationForm.connectionType === 'usb' && (
              <div className="p-3 bg-teal-50/60 dark:bg-teal-950/30 rounded-xl border border-teal-200/80 dark:border-teal-800/60 space-y-2 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {pairedUsbName ? `Paired: ${pairedUsbName}` : 'No USB Printer Paired Yet'}
                    </p>
                    <p className="text-[11px] text-slate-500">Chrome will connect directly via WebUSB/Serial with zero dialogs.</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handlePairUsb}
                    leftIcon={<Usb size={13} />}
                    className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold h-8 cursor-pointer"
                  >
                    {pairedUsbName ? 'Re-Pair USB' : 'Pair USB Printer'}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Kitchen Buzzer Option */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <Volume2 size={16} className="text-amber-500" />
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Sound Kitchen Buzzer / Beeper</p>
                <p className="text-[11px] text-slate-500">Rings printer beeper twice when a new KOT ticket arrives.</p>
              </div>
            </div>
            <Switch
              checked={stationForm.soundBuzzer !== false}
              onChange={(val) => setStationForm(prev => ({ ...prev, soundBuzzer: val }))}
            />
          </div>

          {/* Food Category Routing with Multi-Select */}
          {renderCategoryPicker(
            stationForm.categoryIds,
            (ids) => setStationForm((prev) => ({ ...prev, categoryIds: ids })),
            categorySearchQuery,
            setCategorySearchQuery
          )}

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={stationForm.enabled}
                onChange={(val) => setStationForm((prev) => ({ ...prev, enabled: val }))}
              />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Station Active</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsStationModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-primary text-white font-bold"
              >
                {editingStationId ? "Save Changes" : "Add Station"}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Quick Modal: Assign Multiple Categories to Single Printer */}
      <Modal
        isOpen={!!quickAssignStation}
        onClose={() => setQuickAssignStation(null)}
        title={`Assign Categories: ${quickAssignStation?.name || 'Printer Station'}`}
        className="max-w-xl"
      >
        <div className="space-y-4 pt-1">
          <p className="text-xs text-slate-500">
            Choose which menu categories should automatically route and print to{' '}
            <strong className="text-slate-800 dark:text-slate-200">{quickAssignStation?.name}</strong>.
            You can select multiple categories or set it as Universal.
          </p>

          {renderCategoryPicker(
            quickAssignCategoryIds,
            setQuickAssignCategoryIds,
            categorySearchQuery,
            setCategorySearchQuery
          )}

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setQuickAssignStation(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (!quickAssignStation) return;
                if (quickAssignCategoryIds.length === 0) {
                  toast.error('Please select at least one category or choose All Categories');
                  return;
                }
                updateStation(quickAssignStation.id, { categoryIds: quickAssignCategoryIds });
                toast.success(`Assigned ${quickAssignCategoryIds.includes('all') ? 'all' : quickAssignCategoryIds.length} categories to ${quickAssignStation.name}!`);
                setQuickAssignStation(null);
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              Save Categories ({quickAssignCategoryIds.includes('all') ? 'All' : quickAssignCategoryIds.length})
            </Button>
          </div>
        </div>
      </Modal>

      {/* Cashier Billing Printer Configuration Modal */}
      <Modal
        isOpen={isBillingModalOpen}
        onClose={() => setIsBillingModalOpen(false)}
        title={editingBillingPrinterId ? "Edit Cashier Bill Printer" : "Register Cashier Bill Printer"}
        className="max-w-lg"
      >
        <form onSubmit={handleSaveBillingPrinter} className="space-y-5 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Printer / Counter Name <span className="text-rose-500">*</span>
            </label>
            <Input
              value={billingPrinterForm.name}
              onChange={(e) => setBillingPrinterForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Main Cashier Desk, Counter 2, Bar Cashier"
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Receipt Paper Width (mm)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setBillingPrinterForm((prev) => ({ ...prev, paperWidth: '80mm' }))}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  billingPrinterForm.paperWidth === '80mm'
                    ? 'border-emerald-600 bg-emerald-500/10 font-bold text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                }`}
              >
                <div className="font-extrabold text-xs">80mm (Standard POS)</div>
                <div className="text-[11px] text-slate-500 mt-0.5">3 1/8 inches • Full Customer Bill</div>
              </button>

              <button
                type="button"
                onClick={() => setBillingPrinterForm((prev) => ({ ...prev, paperWidth: '58mm' }))}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  billingPrinterForm.paperWidth === '58mm'
                    ? 'border-emerald-600 bg-emerald-500/10 font-bold text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                }`}
              >
                <div className="font-extrabold text-xs">58mm (Compact)</div>
                <div className="text-[11px] text-slate-500 mt-0.5">2 1/4 inches • Compact Receipt</div>
              </button>
            </div>
          </div>

          {/* Hardware Connection Mode */}
          <div className="space-y-2 pt-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Hardware Connection Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Browser / System Default */}
              <button
                type="button"
                onClick={() => setBillingPrinterForm(prev => ({ ...prev, connectionType: 'browser' }))}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  billingPrinterForm.connectionType === 'browser'
                    ? 'border-emerald-600 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                }`}
              >
                <div className="text-xs font-black">🖥️ System Default</div>
                <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">OS Print Spooler / Browser Dialog</div>
              </button>

              {/* Network LAN IP */}
              <button
                type="button"
                onClick={() => setBillingPrinterForm(prev => ({ ...prev, connectionType: 'network' }))}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  billingPrinterForm.connectionType === 'network'
                    ? 'border-emerald-600 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                }`}
              >
                <div className="text-xs font-black flex items-center gap-1"><Wifi size={13} /> Network LAN</div>
                <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">Counter Ethernet / Wi-Fi IP (Port 9100)</div>
              </button>

              {/* Direct USB */}
              <button
                type="button"
                onClick={() => setBillingPrinterForm(prev => ({ ...prev, connectionType: 'usb' }))}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  billingPrinterForm.connectionType === 'usb'
                    ? 'border-emerald-600 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                }`}
              >
                <div className="text-xs font-black flex items-center gap-1"><Usb size={13} /> Direct USB</div>
                <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">WebUSB raw print zero-dialog</div>
              </button>
            </div>

            {/* Network LAN IP Config Fields */}
            {billingPrinterForm.connectionType === 'network' && (
              <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-200/80 dark:border-blue-800/60 space-y-2.5 animate-fade-in">
                {bridgeStatus?.online ? (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="font-bold">Local Print Bridge Active</span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">({bridgeStatus.ip || '127.0.0.1'}:9101)</span>
                    </div>
                    <span className="text-[9px] font-extrabold uppercase bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded text-emerald-700 dark:text-emerald-300">Direct LAN</span>
                  </div>
                ) : (
                  <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                      <span className="truncate">For cloud to local printing, run <code className="font-mono font-bold">python -m virtual_kitchen_printer</code></span>
                    </div>
                    <button
                      type="button"
                      onClick={() => checkLocalPrintBridgeStatus().then(setBridgeStatus)}
                      className="text-[10px] font-bold text-amber-700 dark:text-amber-300 underline hover:text-amber-900 ml-2 shrink-0 cursor-pointer"
                    >
                      Check Bridge
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Printer IP Address *</label>
                      {bridgeStatus?.ip && billingPrinterForm.ipAddress !== bridgeStatus.ip && (
                        <button
                          type="button"
                          onClick={() => setBillingPrinterForm(prev => ({ ...prev, ipAddress: bridgeStatus.ip! }))}
                          className="text-[10px] text-primary hover:underline font-semibold cursor-pointer"
                        >
                          Use Wi-Fi IP ({bridgeStatus.ip})
                        </button>
                      )}
                    </div>
                    <Input
                      value={billingPrinterForm.ipAddress}
                      onChange={(e) => setBillingPrinterForm(prev => ({ ...prev, ipAddress: e.target.value }))}
                      placeholder="e.g. 192.168.1.100 or 127.0.0.1"
                      className="bg-white dark:bg-slate-900 text-xs h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Port</label>
                    <Input
                      type="number"
                      value={billingPrinterForm.port}
                      onChange={(e) => setBillingPrinterForm(prev => ({ ...prev, port: parseInt(e.target.value) || 9100 }))}
                      placeholder="9100"
                      className="bg-white dark:bg-slate-900 text-xs h-9 font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <p className="text-[11px] text-slate-500">
                    Standard ESC/POS thermal printer port is <code className="text-slate-700 dark:text-slate-300 font-bold font-mono">9100</code>.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    isLoading={isTestingLan}
                    onClick={() => handleTestLanSocket(billingPrinterForm.ipAddress, billingPrinterForm.port, billingPrinterForm.name)}
                    className="h-7 text-xs font-bold shrink-0"
                  >
                    Test LAN Ping
                  </Button>
                </div>
              </div>
            )}

            {/* Direct USB Device Pairing Button */}
            {billingPrinterForm.connectionType === 'usb' && (
              <div className="p-3 bg-teal-50/60 dark:bg-teal-950/30 rounded-xl border border-teal-200/80 dark:border-teal-800/60 flex items-center justify-between gap-3 animate-fade-in">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                    <Usb size={13} />
                    <span>Direct WebUSB ESC/POS</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Pair USB cable connected receipt printer.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={handlePairBillingPrinterUsb}
                  leftIcon={<Usb size={13} />}
                  className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shrink-0 h-8"
                >
                  Pair USB Printer
                </Button>
              </div>
            )}
          </div>

          {/* Primary Counter & Active Checkboxes */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Primary Cashier Printer
                </div>
                <div className="text-[11px] text-slate-500">
                  Default target when printing bills and for automatic bill printing
                </div>
              </div>
              <Switch
                checked={billingPrinterForm.isDefault}
                onChange={(val) => setBillingPrinterForm(prev => ({ ...prev, isDefault: val }))}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <Switch
                  checked={billingPrinterForm.enabled}
                  onChange={(val) => setBillingPrinterForm(prev => ({ ...prev, enabled: val }))}
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Printer Active</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBillingModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  {editingBillingPrinterId ? "Save Changes" : "Add Printer"}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </Modal>

      {/* Discovery Options Modal */}
      <Modal
        isOpen={isDiscoveryModalOpen}
        onClose={() => setIsDiscoveryModalOpen(false)}
        title="Store Discovery Options"
        description="Choose how you want your store discovery and public menu to behave"
        className="max-w-xl"
      >
        <div className="space-y-4 py-2">
          {/* Option 1: Free Option */}
          <div className={`p-4 rounded-2xl border transition-all space-y-3 ${
            isPaidDiscoveryActive 
              ? 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 opacity-85' 
              : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
                  <EyeOff size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                    Option 1: Free Option
                    {isPaidDiscoveryActive && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 flex items-center gap-1">
                        <Lock size={10} /> Locked
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-muted-foreground">Remove from Discovery & Hide Menu Label</p>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200">
                ₹0 Free
              </span>
            </div>

            <ul className="text-xs text-muted-foreground space-y-1.5 pl-1">
              <li className="flex items-center gap-2">
                <span className="text-rose-500 font-bold">✕</span>
                <span>Will <strong>NOT</strong> show your shop on public discovery map & search.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-rose-500 font-bold">✕</span>
                <span>Will <strong>NOT</strong> show the "Discover" label on your public menu.</span>
              </li>
            </ul>

            {/* Lock explanation notice if paid discovery is active */}
            {isPaidDiscoveryActive && (
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 flex items-start gap-2 text-amber-900 dark:text-amber-300 text-xs">
                <Lock size={15} className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div>
                  <span className="font-bold">Active Paid Subscription:</span> You have already paid ₹49/mo for Discovery Option. Switching to Free is locked until your billing cycle expires in <strong>{discoveryDaysLeft} day{discoveryDaysLeft === 1 ? '' : 's'}</strong>{discoveryExpiresAt ? ` (${discoveryExpiresAt})` : ''}.
                </div>
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              disabled={isPaidDiscoveryActive}
              className={`w-full ${
                isPaidDiscoveryActive 
                  ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700' 
                  : 'cursor-pointer'
              }`}
              onClick={handleSelectFreeDiscoveryOption}
            >
              {isPaidDiscoveryActive ? (
                <span className="flex items-center justify-center gap-1.5">
                  <Lock size={14} /> Locked (Cannot Change to Free Until It Expires)
                </span>
              ) : (
                'Select Free Option (Turn Off Discovery)'
              )}
            </Button>
          </div>

          {/* Option 2: Paid Option */}
          <div className="p-4 rounded-2xl border-2 border-amber-300 dark:border-amber-700/60 bg-amber-50/50 dark:bg-amber-950/20 space-y-3 relative overflow-hidden">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0 shadow-xs p-2">
                  <img src={menukitLogo} alt="Menukit" className="w-6 h-6 object-contain shrink-0" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-amber-950 dark:text-amber-200">Option 2: Paid Option</h4>
                    {isPaidDiscoveryActive ? (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 uppercase tracking-wide border border-emerald-300">
                        Active Plan
                      </span>
                    ) : (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-amber-100 uppercase tracking-wide">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-amber-800/80 dark:text-amber-400">Keep on Discovery Map, Hide Menu Label</p>
                </div>
              </div>
              <span className="text-xs font-black px-2.5 py-1 rounded-full bg-amber-500 text-white shadow-xs">
                ₹49 / month
              </span>
            </div>

            <ul className="text-xs text-amber-900/90 dark:text-amber-300 space-y-1.5 pl-1">
              <li className="flex items-center gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span><strong>WILL show your shop</strong> on public discovery map & search for new customers.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span><strong>Hides the "Discover" label</strong> on your public menu so customers stay on your menu.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>Next time on your subscription renewal, this ₹49/mo module is <strong>automatically included</strong>.</span>
              </li>
            </ul>

            {isPaidDiscoveryActive && (
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200">
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                  <span>Currently Paid & Active: <strong>{discoveryDaysLeft} days remaining</strong>{discoveryExpiresAt ? ` (Expires ${discoveryExpiresAt})` : ''}</span>
                </div>
              </div>
            )}

            <Button
              type="button"
              isLoading={isProcessingPayment}
              disabled={isProcessingPayment}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold shadow-md shadow-amber-500/20 cursor-pointer"
              onClick={handleSelectPaidDiscoveryOption}
            >
              {isProcessingPayment 
                ? 'Processing...' 
                : isPaidDiscoveryActive 
                ? 'Extend / Renew Paid Discovery (₹49 / month)' 
                : 'Pay ₹49 / Month & Activate'}
            </Button>
          </div>

          {/* Reset Option (Standard Discovery) */}
          {!isPaidDiscoveryActive && (!settingsData.is_discoverable || settingsData.hide_discovery_badge) && (
            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={handleResetToStandardDiscovery}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors underline cursor-pointer"
              >
                Reset to Standard Discovery (Show on Map & Show Menu Label — Free)
              </button>
            </div>
          )}

          {isPaidDiscoveryActive && (
            <div className="pt-1 text-center">
              <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1.5 font-medium">
                <Lock size={12} className="text-amber-500 shrink-0" />
                Free Discovery option cannot be selected until current paid period expires ({discoveryDaysLeft} days left)
              </p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
