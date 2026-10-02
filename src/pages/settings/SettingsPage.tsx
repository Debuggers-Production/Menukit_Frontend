import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { 
  Mail, Store, Shield, Smartphone, Phone, ChevronRight, ChevronDown, ArrowRight, Sliders, Globe, 
  Coins, Truck, ShoppingBag, QrCode, Tag, MapPin, Zap, CheckCircle2, Lock, Info, AlertCircle,
  CreditCard, Printer, Plus, Trash2, Edit2, UtensilsCrossed, FileText, Check, RotateCcw,
  Wifi, Usb, Bluetooth, Volume2, Terminal, Copy, Receipt, Search, X, Tags, Layers, Sparkles, Eye, EyeOff, Loader2, Save,
  Laptop, Download, ArrowLeft, LayoutGrid, PackageCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { useShopStore } from '@/store/shopStore';
import { getBusinessCategory } from '@/config/businessCategories';
import { usePrinterStore, PrinterStation, BillingPrinterConfig, BillingPrinter } from '@/store/usePrinterStore';
import { 
  printThermalKot, 
  printBillToPrinter, 
  testNetworkPrinterConnection, 
  testBluetoothPrinterConnection,
  checkLocalPrintBridgeStatus 
} from '@/utils/thermalPrinter';
import { requestWebUsbPrinter, sendEscPosToDevice } from '@/utils/webUsbPrinter';
import { 
  requestWebBluetoothPrinter, 
  isBluetoothPrintingSupported, 
  getActiveBluetoothPrinter 
} from '@/utils/webBluetoothPrinter';
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
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { APP_VERSION } from '@/config/version';
import { WhatsNewModal } from '@/components/WhatsNewModal';
import { CountryCodeSelect } from '@/components/ui/CountryCodeSelect';
import { publicCache } from '@/utils/publicCache';
import menukitLogo from '@/assets/menukit-logo.svg';

const COUNTRY_CODES = [
  { code: '+91', flag: '🇮🇳', label: 'India (+91)' },
  { code: '+1', flag: '🇺🇸', label: 'USA / Canada (+1)' },
  { code: '+44', flag: '🇬🇧', label: 'UK (+44)' },
  { code: '+971', flag: '🇦🇪', label: 'UAE (+971)' },
  { code: '+65', flag: '🇸🇬', label: 'Singapore (+65)' },
  { code: '+61', flag: '🇦🇺', label: 'Australia (+61)' },
  { code: '+966', flag: '🇸🇦', label: 'Saudi Arabia (+966)' },
  { code: '+974', flag: '🇶🇦', label: 'Qatar (+974)' },
  { code: '+968', flag: '🇴🇲', label: 'Oman (+968)' },
  { code: '+965', flag: '🇰🇼', label: 'Kuwait (+965)' },
  { code: '+973', flag: '🇧🇭', label: 'Bahrain (+973)' },
  { code: '+94', flag: '🇱🇰', label: 'Sri Lanka (+94)' },
];

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
  const [isWhatsNewOpen, setIsWhatsNewOpen] = useState(false);
  const { setHeaderTitle } = useHeaderStore();
  const { user, fetchUser, changeEmail } = useAuthStore();
  const { shop, setShop, categories, setCategories } = useShopStore();
  const businessCategory = getBusinessCategory(shop?.category || user?.shops?.find(s => s.id === user?.current_shop_id)?.category || user?.shops?.[0]?.category);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const { isInstalled, promptInstall } = usePWAInstall();

  // Tab & Module State
  const [activeTab, setActiveTab] = useState<'overview' | 'general' | 'ordering' | 'discovery' | 'payments' | 'gst' | 'printers' | 'account'>(
    (tabFromUrl as any) || 'overview'
  );
  const [moduleSearchQuery, setModuleSearchQuery] = useState('');
  const [printerSection, setPrinterSection] = useState<'all' | 'kot' | 'billing'>('all');

  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl as any);
    }
  }, [tabFromUrl]);

  useEffect(() => {
    if (activeTab === 'overview') {
      setHeaderTitle('Account and Shop Settings', 'Select a module to configure ordering channels, payment accounts, taxes, printers, and preferences.');
    } else {
      const moduleTitles: Record<string, { title: string; desc: string }> = {
        general: { title: 'General Settings', desc: 'Manage currency, display languages, and app installation' },
        ordering: { title: 'Ordering Channels', desc: 'Set up table dine-in, takeaway counters, and deliveries' },
        discovery: { title: 'Public Discovery & SEO', desc: 'Boost public search visibility and customer store discovery' },
        payments: { title: 'Payments & Bank Accounts', desc: 'Manage bank settlement account, online UPI and card gateways' },
        gst: { title: 'GST & Tax Compliances', desc: 'Manage business legal entity, GSTIN, and FSSAI licenses' },
        printers: { title: businessCategory.settingsPrintersTabLabel || 'Dispatch & Thermal Printers', desc: 'Configure KOT station routing and USB / LAN receipt printers' },
        account: { title: 'Security & Account', desc: 'Account credentials, session devices, and deletion rules' },
      };
      const info = moduleTitles[activeTab] || { title: 'Shop Settings', desc: 'Shop preferences & rules' };
      setHeaderTitle(info.title, info.desc);
    }
  }, [activeTab, setHeaderTitle, businessCategory]);

  const handleSelectModule = (tabId: string) => {
    setActiveTab(tabId as any);
    if (tabId === 'overview') {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('tab');
      setSearchParams(nextParams);
    } else {
      setSearchParams({ tab: tabId });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
  const [isTestingBt, setIsTestingBt] = useState(false);
  const [pairedUsbName, setPairedUsbName] = useState<string | null>(null);
  const [pairedBtName, setPairedBtName] = useState<string>(() => {
    try { return localStorage.getItem('menukit_paired_bt_printer_name') || ''; } catch { return ''; }
  });
  const [bridgeStatus, setBridgeStatus] = useState<{ online: boolean; ip?: string } | null>(null);
  const [btPermissionBlocked, setBtPermissionBlocked] = useState(false);

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
    connectionType: 'browser' | 'network' | 'usb' | 'bluetooth';
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

  const handlePairBluetoothStation = async () => {
    setBtPermissionBlocked(false);
    try {
      const dev = await requestWebBluetoothPrinter();
      if (dev) {
        setPairedBtName(dev.name);
        setStationForm(prev => ({ ...prev, connectionType: 'bluetooth' }));
        toast.success(`Paired: ${dev.name}`);
      }
    } catch (err: any) {
      console.error('[BT Pair]', err?.name, err?.message);
      // Any error except user-cancelled = show the permission help panel
      if (err?.name !== 'NotFoundError' && !err?.message?.toLowerCase().includes('user cancel')) {
        setBtPermissionBlocked(true);
      }
    }
  };

  const handleTestBluetoothSlip = async (name: string = 'Bluetooth Thermal Printer', width: '80mm' | '58mm' = '80mm') => {
    setIsTestingBt(true);
    const toastId = toast.loading(`Streaming test slip to ${name} over Bluetooth...`);
    try {
      const res = await testBluetoothPrinterConnection(name, width);
      toast.success(res.message, { id: toastId });
    } catch (err: any) {
      toast.error(err.message || 'Bluetooth test print failed. Check power and pairing.', { id: toastId, duration: 5000 });
    } finally {
      setIsTestingBt(false);
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

    // If Direct Bluetooth
    if (station?.connectionType === 'bluetooth') {
      await handleTestBluetoothSlip(targetName, targetWidth);
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
    connectionType: 'browser' | 'network' | 'usb' | 'bluetooth';
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

  const handlePairBillingPrinterBt = async () => {
    setBtPermissionBlocked(false);
    try {
      const dev = await requestWebBluetoothPrinter();
      if (dev) {
        setPairedBtName(dev.name);
        setBillingPrinterForm(prev => ({ ...prev, connectionType: 'bluetooth' }));
        toast.success(`Paired: ${dev.name}`);
      }
    } catch (err: any) {
      console.error('[BT Pair Billing]', err?.name, err?.message);
      if (err?.name !== 'NotFoundError' && !err?.message?.toLowerCase().includes('user cancel')) {
        setBtPermissionBlocked(true);
      }
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

  // Change Phone State
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [phoneStep, setPhoneStep] = useState<1 | 2>(1);
  const [phoneCountryCode, setPhoneCountryCode] = useState('+91');
  const [newPhone, setNewPhone] = useState('');
  const [phoneOtp, setPhoneOtp] = useState(['', '', '', '', '', '']);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [isPhoneSubmitting, setIsPhoneSubmitting] = useState(false);
  const [phoneCountdown, setPhoneCountdown] = useState(60);
  const [phoneResendCount, setPhoneResendCount] = useState(0);

  useEffect(() => {
    let timer: any;
    if (phoneStep === 2 && phoneCountdown > 0) {
      timer = setInterval(() => setPhoneCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [phoneStep, phoneCountdown]);

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
    dinein_tables_count: (shop?.settings as any)?.dinein_tables_count ?? 10,
    auto_accept_orders: shop?.settings?.auto_accept_orders || false,
    online_payments_enabled: shop?.settings?.online_payments_enabled !== false,
    online_payments_dinein_enabled: shop?.settings?.online_payments_dinein_enabled !== false,
    online_payments_takeaway_enabled: shop?.settings?.online_payments_takeaway_enabled !== false,
    online_payments_delivery_enabled: shop?.settings?.online_payments_delivery_enabled !== false,
    accept_after_payment: shop?.settings?.accept_after_payment || false,
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
    serial_number_prefix: shop?.settings?.serial_number_prefix || '',
    serial_number_digits: shop?.settings?.serial_number_digits || 3,
    auto_serial_number_enabled: shop?.settings?.auto_serial_number_enabled || false,
  });

  const discoveryModInfo = subscriptionStatus?.module_expirations?.['hide-discovery-badge'];
  const discoveryDaysLeft = discoveryModInfo?.days_left ?? subscriptionStatus?.days_left ?? 0;
  const discoveryExpiresAt = discoveryModInfo?.expires_at
    ? new Date(discoveryModInfo.expires_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  const isPaidDiscoveryActive = Boolean(
    !subscriptionStatus?.is_all_access &&
    subscriptionStatus?.active_modules?.includes('hide-discovery-badge') &&
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
        dinein_tables_count: (shop.settings as any).dinein_tables_count ?? 10,
        auto_accept_orders: shop.settings.auto_accept_orders || false,
        online_payments_enabled: shop.settings.online_payments_enabled !== false,
        online_payments_dinein_enabled: shop.settings.online_payments_dinein_enabled !== false,
        online_payments_takeaway_enabled: shop.settings.online_payments_takeaway_enabled !== false,
        online_payments_delivery_enabled: shop.settings.online_payments_delivery_enabled !== false,
        accept_after_payment: shop.settings.accept_after_payment || false,
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
        serial_number_prefix: shop.settings.serial_number_prefix || '',
        serial_number_digits: shop.settings.serial_number_digits || 3,
        auto_serial_number_enabled: shop.settings.auto_serial_number_enabled || false,
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
    setTitle('Settings', 'Manage preferences & shop rules.');
  }, [setTitle]);

  const handleSaveShopSettings = async () => {
    setIsSavingSettings(true);
    try {
      const status = liveRazorpayStatus || shop?.settings?.razorpay_route_status;
      const isVerified = Boolean(shop?.settings?.bank_account_last4) && (status === 'activated' || status === 'active');
      
      const payload = {
        ...settingsData,
        // Forcefully disable if not verified to prevent backend 400 errors if it was previously enabled
        online_payments_enabled: isVerified ? settingsData.online_payments_enabled : false,
        dinein_enabled: isVerified ? settingsData.dinein_enabled : false,
        takeaway_enabled: isVerified ? settingsData.takeaway_enabled : false,
        delivery_enabled: isVerified ? settingsData.delivery_enabled : false,
        auto_accept_orders: isVerified ? settingsData.auto_accept_orders : false,
        accept_after_payment: isVerified ? Boolean(settingsData.accept_after_payment) : false,
      };
      
      const res = await api.put('/shops/me/settings', payload);
      publicCache.clear();
      window.dispatchEvent(new CustomEvent('menukit-shop-settings-updated', { detail: res.data }));
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
      const res = await api.put('/shops/me/settings', updated);
      publicCache.clear();
      window.dispatchEvent(new CustomEvent('menukit-shop-settings-updated', { detail: res.data }));
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

  // Change Phone Handlers
  const handleSendNewPhoneOTP = async () => {
    const cleanDigits = newPhone.replace(/\D/g, '');
    if (cleanDigits.length < 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }
    if (phoneStep === 2 && phoneResendCount >= 3) {
      toast.error('Maximum 3 resend attempts reached. Please wait 15 minutes before trying again.');
      return;
    }
    const fullPhone = `${phoneCountryCode}${cleanDigits.slice(-10)}`;
    setIsPhoneSubmitting(true);
    try {
      await api.post('/auth/phone/send-otp', {
        phone: fullPhone,
        country_code: phoneCountryCode,
      });
      if (phoneStep === 2) {
        const next = phoneResendCount + 1;
        setPhoneResendCount(next);
        toast.success(`New verification code sent! (${3 - next} resends left)`);
      } else {
        toast.success('Verification code sent to your mobile number!');
        setPhoneStep(2);
        setPhoneResendCount(0);
      }
      setPhoneCountdown(60);
      setPhoneOtp(['', '', '', '', '', '']);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to send OTP. Please try again.');
    } finally {
      setIsPhoneSubmitting(false);
    }
  };

  const handleVerifyNewPhoneOTP = async () => {
    const code = phoneOtp.join('');
    if (code.length !== 6) {
      toast.error('Please enter the 6-digit verification code');
      return;
    }
    const cleanDigits = newPhone.replace(/\D/g, '');
    const fullPhone = `${phoneCountryCode}${cleanDigits.slice(-10)}`;
    setIsPhoneSubmitting(true);
    try {
      const res = await api.post('/auth/phone/verify-otp', {
        phone: fullPhone,
        code: code,
      });
      useAuthStore.setState({ user: res.data });
      await fetchUser();
      toast.success('Mobile number updated successfully!');
      setIsPhoneModalOpen(false);
      resetPhoneFlow();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Invalid or expired OTP code');
    } finally {
      setIsPhoneSubmitting(false);
    }
  };

  const resetPhoneFlow = () => {
    setPhoneStep(1);
    setNewPhone('');
    setPhoneOtp(['', '', '', '', '', '']);
    setPhoneCountryCode('+91');
    setPhoneResendCount(0);
    setIsCountryDropdownOpen(false);
  };

  const closePhoneModal = () => {
    setIsPhoneModalOpen(false);
    resetPhoneFlow();
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

  const SETTING_MODULES = useMemo(() => [
    {
      id: 'general',
      title: 'General & Regional',
      description: 'Configure desktop app, currency, and language preferences',
      icon: Sliders,
      badgeColor: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/70 dark:border-blue-800/60',
      items: [
        'Desktop Web App',
        'Currency Symbol & Format',
        'Menu Display Language',
        'App Version & Release Notes'
      ]
    },
    {
      id: 'ordering',
      title: 'Ordering Channels',
      description: 'Set up table dine-in, takeaway counters, and deliveries',
      icon: ShoppingBag,
      badgeColor: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/60',
      items: [
        businessCategory.dineInChannelLabel,
        businessCategory.takeawayChannelLabel,
        businessCategory.deliveryChannelLabel,
        'Minimum Order Values & Auto-Accept',
        'Custom Delivery Fees'
      ]
    },
    {
      id: 'discovery',
      title: 'Public Discovery & SEO',
      description: 'Boost public search visibility and customer store discovery',
      icon: MapPin,
      badgeColor: 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200/70 dark:border-purple-800/60',
      items: [
        'Store Discovery & Nearby Listing',
        'Public Operating Hours & Days',
        'Physical Address & Map Geolocation',
        'Social Media & Public Profile'
      ]
    },
    {
      id: 'payments',
      title: 'Payments & Bank Accounts',
      description: 'Manage bank settlement account, online UPI and card gateways',
      icon: CreditCard,
      badgeColor: 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200/70 dark:border-sky-800/60',
      items: [
        'Settlement Bank Account',
        'Online Payment Gateway (UPI / Cards)',
        'Cash Payment at Counter',
        'Instant Razorpay Route Verification',
        'Live Settlement Status'
      ]
    },
    {
      id: 'gst',
      title: 'GST & Tax Compliances',
      description: 'Manage business legal entity, GSTIN, and FSSAI licenses',
      icon: Receipt,
      badgeColor: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/70 dark:border-amber-800/60',
      items: [
        'GSTIN Number & Tax Identification',
        'Legal Business Entity Name',
        'FSSAI Food Safety License',
        'Menu Inclusive / Exclusive Tax Mode',
        'CGST & SGST Rate Calculations'
      ]
    },
    {
      id: 'printers',
      title: businessCategory.settingsPrintersTabLabel || 'Dispatch & Thermal Printers',
      description: 'Configure KOT station routing and USB / LAN receipt printers',
      icon: Printer,
      badgeColor: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/70 dark:border-indigo-800/60',
      items: [
        'Production Station Printers',
        'Billing & Receipt Thermal Printers',
        'Auto-Print on Order Acceptance',
        'Network LAN & WebUSB Hardware Setup',
        'Sample Test Print'
      ]
    },
    {
      id: 'account',
      title: 'Security & Account',
      description: 'Account credentials, session devices, and deletion rules',
      icon: Shield,
      badgeColor: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/70 dark:border-rose-800/60',
      items: [
        'Merchant Profile & Email',
        'Active Browser Sessions & Devices',
        'Employee Roles & Permissions',
        'Danger Zone & Catalog Purge'
      ]
    }
  ], [businessCategory]);

  const filteredModules = useMemo(() => {
    if (!moduleSearchQuery.trim()) return SETTING_MODULES;
    const q = moduleSearchQuery.toLowerCase();
    return SETTING_MODULES.filter(m => 
      m.title.toLowerCase().includes(q) ||
      m.description.toLowerCase().includes(q) ||
      m.items.some(item => item.toLowerCase().includes(q))
    );
  }, [SETTING_MODULES, moduleSearchQuery]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in pb-24 lg:pb-12">
      
      {/* Desktop Header Actions (Portals to Desktop Top Bar) */}
      <HeaderActions>
        {activeTab !== 'overview' && (
          <Button
            onClick={handleSaveShopSettings}
            disabled={isSavingSettings}
            className="font-bold bg-primary text-white rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer"
          >
            {isSavingSettings ? 'Saving...' : 'Save Settings'}
          </Button>
        )}
      </HeaderActions>

      {/* =========================================
          MODULES OVERVIEW HUB (Grid Layout like Stripe / Razorpay)
      ========================================= */}
      {activeTab === 'overview' ? (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Sticky Left-Aligned Search Bar */}
          <div className="sticky top-[-16px] sm:top-[-24px] lg:top-[-32px] z-20 bg-background/95 backdrop-blur-md py-2.5 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-b border-border/80 mb-4 flex items-center justify-start">
            <div className="relative w-full sm:w-80">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={moduleSearchQuery}
                onChange={(e) => setModuleSearchQuery(e.target.value)}
                placeholder="Search settings & features..."
                className="w-full pl-8 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:outline-none focus:border-primary transition-colors shadow-xs"
              />
              {moduleSearchQuery && (
                <button
                  type="button"
                  onClick={() => setModuleSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Grid of Settings Modules */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filteredModules.map((module) => {
              const IconComponent = module.icon;
              return (
                <div
                  key={module.id}
                  onClick={() => handleSelectModule(module.id)}
                  className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-primary/50 dark:hover:border-primary/50 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${module.badgeColor}`}>
                          <IconComponent size={20} />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                            {module.title}
                          </h3>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-slate-400 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                    </div>

                    <ul className="mt-3.5 space-y-2">
                      {module.items.map((item, idx) => (
                        <li
                          key={idx}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectModule(module.id);
                          }}
                          className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5 transition-colors"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500/60 shrink-0" />
                          <span className="truncate">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Open full configuration</span>
                    <span className="font-bold text-primary flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                      Configure →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Sticky Back to Modules Header Bar */}
          <div className="sticky top-[-16px] sm:top-[-24px] lg:top-[-32px] z-20 bg-background/95 backdrop-blur-md py-2.5 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-b border-border/80 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleSelectModule('overview')}
                  className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0"
                  title="Back to All Modules"
                >
                  <ArrowLeft size={18} />
                </button>
                <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5 hidden sm:block" />
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
                    {SETTING_MODULES.find(m => m.id === activeTab)?.title || 'Shop Settings'}
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                    {SETTING_MODULES.find(m => m.id === activeTab)?.description}
                  </p>
                </div>
              </div>

              <Button
                onClick={handleSaveShopSettings}
                disabled={isSavingSettings}
                size="sm"
                className="font-bold bg-primary hover:bg-primary-600 text-white rounded-xl shadow-xs transition-all px-4 py-2 gap-1.5 shrink-0 cursor-pointer self-end sm:self-auto"
              >
                {isSavingSettings ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {isSavingSettings ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </div>

          <div className="space-y-6 pt-1">
            {/* =========================================
                GENERAL SETTINGS TAB
            ========================================= */}
            {activeTab === 'general' && (
              <>
              {/* Desktop Web App Installation Card */}
              <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs animate-in fade-in duration-300">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4 bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Laptop size={20} />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold">Desktop Web App</CardTitle>
                      <CardDescription className="text-xs">Run Menukit as a native desktop application on Windows, Mac, or Linux.</CardDescription>
                    </div>
                  </div>
                  {isInstalled ? (
                    <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 flex items-center gap-1.5 w-fit">
                      <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                      App Installed
                    </span>
                  ) : (
                    <Button
                      type="button"
                      onClick={promptInstall}
                      size="sm"
                      className="font-bold bg-primary hover:bg-primary-600 text-white rounded-xl shadow-xs gap-1.5 cursor-pointer shrink-0 w-fit"
                    >
                      <Download size={14} />
                      Install on Desktop
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <p className="font-bold text-slate-800 dark:text-slate-200 mb-1">⚡ Dedicated Window</p>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px]">Opens like a native software without browser tabs and search bars.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <p className="font-bold text-slate-800 dark:text-slate-200 mb-1">🖨️ POS & Receipt Printers</p>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px]">Direct integration with local USB and Wi-Fi thermal receipt printers.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <p className="font-bold text-slate-800 dark:text-slate-200 mb-1">🔔 Live Order Ringing</p>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px]">Desktop notifications and continuous bell sound on incoming orders.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

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
                    <SearchableSelect
                      options={[
                        { id: 'en', name: 'English' },
                        { id: 'hi', name: 'Hindi' },
                        { id: 'ta', name: 'Tamil' },
                        { id: 'te', name: 'Telugu' },
                        { id: 'es', name: 'Spanish' },
                        { id: 'fr', name: 'French' },
                        { id: 'ar', name: 'Arabic' },
                      ]}
                      value={settingsData.language}
                      onChange={(val) => setSettingsData(prev => ({ ...prev, language: val }))}
                      showSearch={false}
                      className="bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Product Serial Number & SKU Configuration */}
            <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs animate-in fade-in duration-300">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <Tag size={20} />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold">Product Serial Number & SKU</CardTitle>
                    <CardDescription className="text-xs">Configure auto-generation format, prefix, and digits padding for product serial numbers.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-5">
                <SettingRow
                  icon={Sparkles}
                  title="Auto-Generate Serial Numbers"
                  description="Automatically generate the next sequential serial number when adding new products."
                  checked={settingsData.auto_serial_number_enabled}
                  onChange={(checked) => setSettingsData(prev => ({ ...prev, auto_serial_number_enabled: checked }))}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/60 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Prefix (Optional)
                    </label>
                    <Input
                      value={settingsData.serial_number_prefix}
                      onChange={(e) => setSettingsData(prev => ({ ...prev, serial_number_prefix: e.target.value }))}
                      placeholder="e.g. CRK-, C-, SKU-"
                      className="bg-white dark:bg-slate-900"
                    />
                    <p className="text-[11px] text-muted-foreground">Appended before sequence number (e.g. C-101)</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Number Digits Padding
                    </label>
                    <SearchableSelect
                      options={[
                        { id: '1', name: '1 Digit (1, 2, 3...)' },
                        { id: '2', name: '2 Digits (01, 02...)' },
                        { id: '3', name: '3 Digits (001, 002...)' },
                        { id: '4', name: '4 Digits (0001, 0002...)' },
                        { id: '5', name: '5 Digits (00001, 00002...)' },
                      ]}
                      value={String(settingsData.serial_number_digits || 3)}
                      onChange={(val) => setSettingsData(prev => ({ ...prev, serial_number_digits: parseInt(val, 10) || 3 }))}
                      showSearch={false}
                      className="bg-white dark:bg-slate-900"
                    />
                    <p className="text-[11px] text-muted-foreground">Minimum number of digits with zero-padding</p>
                  </div>
                </div>

                {/* Live Preview Box */}
                <div className="p-3.5 bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/60 rounded-xl flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                      <Eye size={13} className="text-purple-600" /> Live Format Preview
                    </span>
                    <p className="text-xs text-purple-700 dark:text-purple-300 font-mono font-bold">
                      {settingsData.serial_number_prefix}{String(1).padStart(settingsData.serial_number_digits || 3, '0')},&nbsp;
                      {settingsData.serial_number_prefix}{String(2).padStart(settingsData.serial_number_digits || 3, '0')},&nbsp;
                      {settingsData.serial_number_prefix}{String(3).padStart(settingsData.serial_number_digits || 3, '0')}, ...
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveShopSettings}
                    disabled={isSavingSettings}
                    className="shrink-0 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg"
                  >
                    {isSavingSettings ? 'Saving...' : 'Save Format'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* App Version & Mode Card */}
            <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs animate-in fade-in duration-300">
              <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-sm text-slate-800 dark:text-slate-200">App Version & Mode</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">v{APP_VERSION} ({import.meta.env.MODE || 'production'})</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsWhatsNewOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/60 rounded-full font-bold text-xs transition-colors cursor-pointer shadow-2xs"
                  >
                    <Sparkles size={13} className="text-amber-500" />
                    <span>What's New</span>
                  </button>
                  <div className="bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-bold px-3 py-1.5 rounded-full uppercase text-[11px] border border-emerald-200 dark:border-emerald-800">
                    Stable
                  </div>
                </div>
              </CardContent>
            </Card>
            </>
          )}

          {/* =========================================
              ORDERING CHANNELS TAB
          ========================================= */}
          {activeTab === 'ordering' && (() => {
            const status = liveRazorpayStatus || shop?.settings?.razorpay_route_status;
            const isBankVerified = Boolean(shop?.settings?.bank_account_last4) && (status === 'activated' || status === 'active');

            return (
              <div className="space-y-6 animate-in fade-in duration-300">
                {!isBankVerified && (
                  <div className="p-4 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
                    <div className="flex items-start gap-3.5">
                      <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5">
                        <AlertCircle size={20} />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                            Bank Account & Verification Required
                          </h4>
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-amber-200/70 dark:bg-amber-900/70 text-amber-800 dark:text-amber-300">
                            Action Needed
                          </span>
                        </div>
                        <p className="text-xs text-amber-700 dark:text-amber-300/90 font-medium leading-relaxed max-w-2xl">
                          {!shop?.settings?.bank_account_last4
                            ? `To enable ordering channels (${businessCategory.orderTypeDineInTitle}, ${businessCategory.orderTypeTakeawayTitle}, ${businessCategory.orderTypeDeliveryTitle}) and receive customer payouts, you must add and link your settlement bank account.`
                            : "Your settlement bank account details have been submitted and are currently under verification. Ordering channels will unlock automatically once active."}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setActiveTab('payments')}
                      className="shrink-0 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs px-4 h-9 self-stretch sm:self-auto flex items-center justify-center gap-1.5"
                    >
                      <CreditCard size={15} />
                      <span>{!shop?.settings?.bank_account_last4 ? "Add Bank Account" : "View Bank Verification"}</span>
                    </Button>
                  </div>
                )}

                <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
                  <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base font-bold">Fulfillment Modes</CardTitle>
                        <CardDescription className="text-xs">Toggle available channels and auto-acceptance rules.</CardDescription>
                      </div>
                      {!isBankVerified && (
                        <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 px-2.5 py-1 rounded-lg flex items-center gap-1">
                          <Lock size={12} />
                          Locked
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 divide-y divide-slate-100 dark:divide-slate-800">
                    <SettingRow
                      icon={QrCode}
                      title={businessCategory.dineInChannelLabel}
                      description={businessCategory.dineInChannelDesc}
                      checked={isBankVerified && settingsData.dinein_enabled}
                      onChange={(c) => {
                        if (isBankVerified) {
                          setSettingsData(prev => ({ ...prev, dinein_enabled: c }));
                        } else {
                          toast.error(`Please add and verify your settlement bank account to enable ${businessCategory.orderTypeDineInTitle} ordering.`);
                        }
                      }}
                      disabled={!isBankVerified}
                    />

                    {isBankVerified && settingsData.dinein_enabled && businessCategory.isFood && (
                      <div className="py-3 px-4 sm:px-5 bg-amber-50/60 dark:bg-amber-950/20 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 my-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-800 dark:text-slate-100">Total Dine-In Tables</span>
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 rounded-md">Table-1 to Table-N</span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Configure total restaurant tables. Customers and staff will choose from a structured dropdown (Table-1, Table-2, etc.).
                          </p>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <input
                            type="number"
                            min={1}
                            max={500}
                            value={settingsData.dinein_tables_count || 10}
                            onChange={(e) => {
                              const val = Math.max(1, Math.min(500, parseInt(e.target.value) || 1));
                              setSettingsData(prev => ({ ...prev, dinein_tables_count: val }));
                            }}
                            className="w-24 px-3 py-1.5 text-xs font-black bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700/60 rounded-xl text-center focus:ring-2 focus:ring-primary focus:outline-none shadow-2xs font-mono"
                          />
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Tables</span>
                        </div>
                      </div>
                    )}

                    <SettingRow
                      icon={ShoppingBag}
                      title={businessCategory.takeawayChannelLabel}
                      description={businessCategory.takeawayChannelDesc}
                      checked={isBankVerified && settingsData.takeaway_enabled}
                      onChange={(c) => {
                        if (isBankVerified) {
                          setSettingsData(prev => ({ ...prev, takeaway_enabled: c }));
                        } else {
                          toast.error(`Please add and verify your settlement bank account to enable ${businessCategory.orderTypeTakeawayTitle} ordering.`);
                        }
                      }}
                      disabled={!isBankVerified}
                    />

                    <SettingRow
                      icon={Truck}
                      title={businessCategory.deliveryChannelLabel}
                      description={businessCategory.deliveryChannelDesc}
                      checked={isBankVerified && settingsData.delivery_enabled}
                      onChange={(c) => {
                        if (isBankVerified) {
                          setSettingsData(prev => ({ ...prev, delivery_enabled: c }));
                        } else {
                          toast.error(`Please add and verify your settlement bank account to enable ${businessCategory.orderTypeDeliveryTitle} ordering.`);
                        }
                      }}
                      disabled={!isBankVerified}
                    />

                    <SettingRow
                      icon={Zap}
                      title="Auto Accept Incoming Orders"
                      description="Automatically confirm incoming orders without manual approval."
                      checked={isBankVerified && settingsData.auto_accept_orders}
                      onChange={(c) => {
                        if (isBankVerified) {
                          setSettingsData(prev => ({ ...prev, auto_accept_orders: c }));
                        } else {
                          toast.error("Please add and verify your settlement bank account first.");
                        }
                      }}
                      disabled={!isBankVerified}
                    />

                    <SettingRow
                      icon={CreditCard}
                      title="Accept Orders Only After Payment"
                      description="When enabled, online orders placed via the public menu must be paid upfront before the order is accepted. When disabled (default), the order is submitted first for merchant acceptance, and then the customer pays."
                      checked={isBankVerified && settingsData.accept_after_payment}
                      onChange={(c) => {
                        if (isBankVerified) {
                          setSettingsData(prev => ({ ...prev, accept_after_payment: c }));
                        } else {
                          toast.error("Please add and verify your settlement bank account first.");
                        }
                      }}
                      disabled={!isBankVerified}
                    />
                  </CardContent>
                </Card>

                {isBankVerified && settingsData.delivery_enabled && (
                <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs border-amber-200/60 dark:border-amber-900/40">
                  <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4 bg-amber-50/30 dark:bg-amber-900/10">
                    <div className="flex items-center gap-2">
                      <Truck className="w-5 h-5 text-amber-500" />
                      <CardTitle className="text-base font-bold">Delivery Pricing Rules</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1.5 truncate">
                          Base Cost ({settingsData.currency})
                        </label>
                        <input
                          type="number" min="0" step="1"
                          value={settingsData.base_delivery_charge}
                          onChange={(e) => setSettingsData(prev => ({ ...prev, base_delivery_charge: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-amber-500 font-semibold text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1.5 truncate">
                          Included Distance (km)
                        </label>
                        <input
                          type="number" min="0" step="0.5"
                          value={settingsData.base_delivery_distance}
                          onChange={(e) => setSettingsData(prev => ({ ...prev, base_delivery_distance: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-amber-500 font-semibold text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1.5 truncate">
                          Extra Step (km)
                        </label>
                        <input
                          type="number" min="0.1" step="0.5"
                          value={settingsData.extra_delivery_distance_step}
                          onChange={(e) => setSettingsData(prev => ({ ...prev, extra_delivery_distance_step: Math.max(0.1, parseFloat(e.target.value) || 1) }))}
                          className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-amber-500 font-semibold text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1.5 truncate">
                          Extra Rate ({settingsData.currency})
                        </label>
                        <input
                          type="number" min="0" step="1"
                          value={settingsData.extra_delivery_charge_per_step}
                          onChange={(e) => setSettingsData(prev => ({ ...prev, extra_delivery_charge_per_step: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-amber-500 font-semibold text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1.5 flex items-center justify-between gap-1">
                          <span className="truncate">Coverable Radius</span>
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-normal shrink-0">(0 = ∞)</span>
                        </label>
                        <input
                          type="number" min="0" step="0.5"
                          placeholder="0"
                          value={(settingsData as any).max_delivery_distance ?? 0}
                          onChange={(e) => setSettingsData(prev => ({ ...prev, max_delivery_distance: Math.max(0, parseFloat(e.target.value) || 0) }))}
                          className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-amber-500 font-semibold text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-2.5">
                        <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Calculation Preview
                        </span>
                        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Test Distance:</span>
                          <input
                            type="number" min="0" step="0.5"
                            value={testDistance}
                            onChange={(e) => setTestDistance(Math.max(0, parseFloat(e.target.value) || 0))}
                            className="w-14 px-1.5 py-0.5 text-xs bg-transparent border-0 text-center font-bold text-primary focus:outline-none"
                          />
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">km</span>
                        </div>
                      </div>
                      <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        {(() => {
                          const dist = testDistance;
                          const baseDist = settingsData.base_delivery_distance || 0;
                          const baseCharge = settingsData.base_delivery_charge || 0;
                          const step = settingsData.extra_delivery_distance_step || 1;
                          const rate = settingsData.extra_delivery_charge_per_step || 0;
                          const maxDist = (settingsData as any).max_delivery_distance || 0;

                          if (maxDist > 0 && dist > maxDist) {
                            return <span className="text-rose-500 font-bold">⚠️ Outside Delivery Range: Test distance ({dist} km) exceeds maximum coverable distance ({maxDist} km). Orders will be blocked.</span>;
                          }

                          if (dist <= baseDist) {
                            return <span>Total Fee: <strong className="text-emerald-600 dark:text-emerald-400">{settingsData.currency}{baseCharge}</strong> (Within base distance).</span>;
                          }
                          const extraKm = dist - baseDist;
                          const steps = Math.ceil(extraKm / step);
                          const extraFee = steps * rate;
                          return <span>Base: <strong className="text-slate-900 dark:text-white">{settingsData.currency}{baseCharge}</strong> + Extra: <strong className="text-amber-600 dark:text-amber-400">{settingsData.currency}{extraFee}</strong> ({steps} steps) = Total: <strong className="text-emerald-600 dark:text-emerald-400 text-sm">{settingsData.currency}{baseCharge + extraFee}</strong></span>;
                        })()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                )}
              </div>
            );
          })()}

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
                            icon={CreditCard}
                            title="Accept Online Payments via Gateway"
                            description="Master switch to accept online payments (UPI, Cards, Netbanking) across your ordering channels."
                            checked={settingsData.online_payments_enabled && isVerified}
                            onChange={(c) => {
                              if (isVerified) {
                                setSettingsData(prev => ({ ...prev, online_payments_enabled: c }));
                              }
                            }}
                            disabled={!isVerified}
                          />

                          {/* Separate channel toggles when master is enabled & verified */}
                          {isVerified && settingsData.online_payments_enabled && (
                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4 pl-2 sm:pl-4 bg-slate-50/50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 animate-fade-in">
                              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                Ordering Channels Payment Options
                              </div>

                              <SettingRow
                                icon={businessCategory.isFood ? UtensilsCrossed : Store}
                                title={businessCategory.dineInOnlinePaymentTitle}
                                description={businessCategory.dineInOnlinePaymentDesc}
                                checked={settingsData.online_payments_dinein_enabled !== false}
                                onChange={(c) => setSettingsData(prev => ({ ...prev, online_payments_dinein_enabled: c }))}
                              />

                              <SettingRow
                                icon={businessCategory.isFood ? ShoppingBag : PackageCheck}
                                title={businessCategory.takeawayOnlinePaymentTitle}
                                description={businessCategory.takeawayOnlinePaymentDesc}
                                checked={settingsData.online_payments_takeaway_enabled !== false}
                                onChange={(c) => setSettingsData(prev => ({ ...prev, online_payments_takeaway_enabled: c }))}
                              />

                              <SettingRow
                                icon={Truck}
                                title={businessCategory.deliveryOnlinePaymentTitle}
                                description={businessCategory.deliveryOnlinePaymentDesc}
                                checked={settingsData.online_payments_delivery_enabled !== false}
                                onChange={(c) => setSettingsData(prev => ({ ...prev, online_payments_delivery_enabled: c }))}
                              />
                            </div>
                          )}

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
                        onChange={(checked) => setSettingsData(prev => ({ ...prev, gst_enabled: checked }))}
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
                    {businessCategory.isFood ? <UtensilsCrossed size={13} /> : <ShoppingBag size={13} />}
                    <span>{businessCategory.kotTabLabel} ({stations.length})</span>
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
                    <span>{businessCategory.billingTabLabel} ({billingPrinters.length})</span>
                  </button>
                </div>
              </div>

              {/* =========================================================
                  SECTION 1: KITCHEN / PACKING ORDER TICKETS (KOT / POT)
              ========================================================= */}
              {(printerSection === 'all' || printerSection === 'kot') && (
                <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
                  <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4 bg-linear-to-r from-amber-50/70 via-orange-50/30 to-transparent dark:from-amber-950/20 dark:via-orange-950/10 dark:to-transparent flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                        {businessCategory.isFood ? <UtensilsCrossed size={20} /> : <ShoppingBag size={20} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-base font-bold">{businessCategory.productionStationLabel}</CardTitle>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                            {businessCategory.kotShort} Station
                          </span>
                        </div>
                        <CardDescription className="text-xs mt-0.5">
                          {businessCategory.productionPrinterDesc}
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
                        {businessCategory.testKotButtonLabel}
                      </Button>
                      <Button
                        size="sm"
                        onClick={openNewStationModal}
                        leftIcon={<Plus size={14} />}
                        className="bg-primary text-white font-bold text-xs shadow-xs"
                      >
                        {businessCategory.addKotStationButtonLabel}
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 sm:p-5 space-y-5">
                    {/* Auto-Print KOT Switch */}
                    <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                          <Zap size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {businessCategory.autoPrintKotLabel}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {businessCategory.autoPrintKotDesc}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={autoPrintOnAccept}
                        onChange={(val) => {
                          setAutoPrintOnAccept(val);
                          toast.success(val ? `Auto-print ${businessCategory.kotShort} enabled` : `Auto-print ${businessCategory.kotShort} disabled`);
                        }}
                      />
                    </div>

                    {/* Kitchen Printer Stations Subsection */}
                    <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                            {businessCategory.productionStationLabel}
                          </label>
                          <p className="text-[11px] text-slate-500">
                            {businessCategory.productionPrinterDesc}
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
                            <p className="font-bold text-sm text-slate-700 dark:text-slate-300">{businessCategory.noKotStationsTitle}</p>
                            <p className="text-xs text-slate-500 mt-0.5 max-w-md mx-auto">
                              {businessCategory.isFood
                                ? 'Add your first station (e.g., Main Kitchen, Bar, Tandoor) to automatically route specific food categories.'
                                : 'Add your first station (e.g., Main Godown, Counter 1, Dispatch Desk) to automatically route items.'}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={openNewStationModal}
                            leftIcon={<Plus size={14} />}
                            className="font-bold"
                          >
                            {businessCategory.addKotStationButtonLabel}
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
                                        {station.connectionType === 'bluetooth' && (
                                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                                            <Bluetooth size={10} /> Direct Bluetooth
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
                                        <span>{businessCategory.routingDesc}</span>
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
                          <CardTitle className="text-base font-bold">{businessCategory.billingHeaderTitle}</CardTitle>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            {businessCategory.billingStationBadge}
                          </span>
                        </div>
                        <CardDescription className="text-xs mt-0.5">
                          {businessCategory.billingHeaderDesc}
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
                        {businessCategory.testBillButtonLabel}
                      </Button>
                      <Button
                        size="sm"
                        onClick={openNewBillingPrinterModal}
                        leftIcon={<Plus size={14} />}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
                      >
                        {businessCategory.addBillingPrinterButtonLabel}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-5 space-y-5">
                    {/* Auto-Print Bill Switch */}
                    <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                          <Zap size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {businessCategory.autoPrintBillLabel}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {businessCategory.autoPrintBillDesc}
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

                    {/* Cashier Billing Printers Subsection */}
                    <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                            {businessCategory.billingStationLabel}
                          </label>
                          <p className="text-[11px] text-slate-500">
                            {businessCategory.billingPrinterDesc}
                          </p>
                        </div>
                        <span className="text-[11px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                          {billingPrinters.length} {billingPrinters.length === 1 ? 'Printer' : 'Printers'} Configured
                        </span>
                      </div>

                      {billingPrinters.length === 0 ? (
                        <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                          <Receipt className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{businessCategory.noBillingPrintersTitle}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">Click below to register your first billing printer.</p>
                          <Button
                            size="sm"
                            onClick={openNewBillingPrinterModal}
                            leftIcon={<Plus size={14} />}
                            className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                          >
                            {businessCategory.addBillingPrinterButtonLabel}
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
                                      {printer.connectionType === 'bluetooth' && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                                          <Bluetooth size={10} /> Direct Bluetooth
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

                  {/* Mobile Number & Security */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center font-black shrink-0">
                        <Phone size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Registered Mobile</p>
                          {user?.phone_verified ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                              <CheckCircle2 size={10} /> Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400 px-2 py-0.5 rounded-full">
                              Unverified
                            </span>
                          )}
                        </div>
                        <p className="font-bold text-sm text-slate-800 dark:text-slate-200">
                          {user?.phone || 'No mobile number linked'}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        resetPhoneFlow();
                        setIsPhoneModalOpen(true);
                      }} 
                      className="rounded-xl font-bold cursor-pointer"
                    >
                      {user?.phone ? 'Change Mobile' : 'Link Mobile'}
                    </Button>
                  </div>

                  {/* Email & Security */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center font-black uppercase text-sm shrink-0">
                        {user?.email?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Signed In Email</p>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                            <CheckCircle2 size={10} /> Verified
                          </span>
                        </div>
                        <p className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{user?.email}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setIsEmailModalOpen(true)} className="rounded-xl font-bold cursor-pointer">
                      Change Email
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          </div>
        </div>
      )}

      {/* Change / Link Mobile Number Modal */}
      <Modal
        isOpen={isPhoneModalOpen}
        onClose={closePhoneModal}
        title={user?.phone ? "Change Mobile Number" : "Link Mobile Number"}
        className="max-w-md !overflow-visible"
      >
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-6">
            <div className={`h-1.5 flex-1 rounded-full ${phoneStep >= 1 ? 'bg-primary' : 'bg-slate-100 dark:bg-slate-800'}`} />
            <div className={`h-1.5 flex-1 rounded-full ${phoneStep >= 2 ? 'bg-primary' : 'bg-slate-100 dark:bg-slate-800'}`} />
          </div>

          {phoneStep === 1 && (
            <div className="space-y-5 animate-fade-in">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-2">
                  <Phone size={24} />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-white text-lg">
                  {user?.phone ? 'Update Mobile Number' : 'Link New Mobile'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                  We'll send an SMS verification code to verify your ownership.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                  New Mobile Number
                </label>
                <div className="flex items-center gap-2">
                  <CountryCodeSelect
                    value={phoneCountryCode}
                    onChange={setPhoneCountryCode}
                    heightClass="h-11"
                  />

                  <input
                    type="tel"
                    autoFocus
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="9876543210"
                    className="flex-1 h-11 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm font-bold tracking-wider text-slate-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              <Button
                onClick={handleSendNewPhoneOTP}
                isLoading={isPhoneSubmitting}
                disabled={newPhone.replace(/\D/g, '').length < 10}
                className="w-full h-11 text-sm font-bold shadow-md gap-2"
              >
                <span>Send Verification Code</span>
                <ArrowRight size={16} />
              </Button>
            </div>
          )}

          {phoneStep === 2 && (
            <div className="space-y-6 animate-fade-in text-center">
              <div className="space-y-2">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-2">
                  <Shield size={24} />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-white text-lg">Enter Verification Code</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                  Enter the 6-digit SMS code sent to <strong className="text-slate-800 dark:text-slate-200">{phoneCountryCode} {newPhone.slice(-10)}</strong>
                </p>
              </div>

              <div className="flex justify-center gap-2">
                {phoneOtp.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`settings-phone-otp-${idx}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      const next = [...phoneOtp];
                      next[idx] = val.slice(-1);
                      setPhoneOtp(next);
                      if (val && idx < 5) {
                        const nextInput = document.getElementById(`settings-phone-otp-${idx + 1}`);
                        nextInput?.focus();
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace' && !phoneOtp[idx] && idx > 0) {
                        const prevInput = document.getElementById(`settings-phone-otp-${idx - 1}`);
                        prevInput?.focus();
                      }
                    }}
                    className="w-10 h-12 text-center text-xl font-black rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-slate-900 dark:text-white"
                  />
                ))}
              </div>

              <Button
                onClick={handleVerifyNewPhoneOTP}
                isLoading={isPhoneSubmitting}
                disabled={phoneOtp.some(d => d === '')}
                className="w-full h-11 text-sm font-bold shadow-md"
              >
                Verify & Save Mobile
              </Button>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setPhoneStep(1);
                    setPhoneOtp(['', '', '', '', '', '']);
                  }}
                  className="font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline cursor-pointer"
                >
                  Change Number
                </button>

                <button
                  type="button"
                  onClick={handleSendNewPhoneOTP}
                  disabled={phoneCountdown > 0 || isPhoneSubmitting || phoneResendCount >= 3}
                  className="inline-flex items-center font-bold text-primary hover:underline disabled:text-slate-400 disabled:no-underline cursor-pointer disabled:cursor-not-allowed"
                >
                  {phoneResendCount >= 3
                    ? 'Resend limit reached (3/3)'
                    : phoneCountdown > 0
                    ? `Resend in ${phoneCountdown}s`
                    : `Resend Code (${3 - phoneResendCount} left)`}
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

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
        title={editingStationId 
          ? (businessCategory.isFood ? "Edit Kitchen Printer Station" : "Edit Packing & Godown Station") 
          : (businessCategory.isFood ? "Register Kitchen Printer Station" : "Register Packing & Godown Station")}
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
              placeholder={businessCategory.productionStationPlaceholder}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
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
                <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">Kitchen Ethernet / Wi-Fi IP (9100)</div>
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

              {/* Direct Bluetooth */}
              <button
                type="button"
                onClick={() => setStationForm(prev => ({ ...prev, connectionType: 'bluetooth' }))}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  stationForm.connectionType === 'bluetooth'
                    ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                }`}
              >
                <div className="text-xs font-black flex items-center gap-1"><Bluetooth size={13} /> Bluetooth</div>
                <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">Wireless BLE POS direct print</div>
              </button>
            </div>

            {/* Network LAN IP Config Fields */}
            {stationForm.connectionType === 'network' && (
              <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-200/80 dark:border-blue-800/60 space-y-2.5 animate-fade-in">
                {bridgeStatus?.online && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="font-bold">Local Print Bridge Active</span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">({bridgeStatus.ip || '127.0.0.1'}:9101)</span>
                    </div>
                    <span className="text-[9px] font-extrabold uppercase bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded text-emerald-700 dark:text-emerald-300">Direct LAN</span>
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

            {/* Direct Bluetooth Config Fields */}
            {stationForm.connectionType === 'bluetooth' && (
              <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-xl border border-indigo-200/80 dark:border-indigo-800/60 space-y-2.5 animate-fade-in">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                      <Bluetooth size={13} className="text-indigo-600 dark:text-indigo-400" />
                      <span>{pairedBtName ? `Paired: ${pairedBtName}` : 'Direct Bluetooth ESC/POS'}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Wireless direct connection to portable/desktop Bluetooth thermal printers (PT-210, GOOJPRT, MPT-II, Xprinter, etc.).
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => { setBtPermissionBlocked(false); handlePairBluetoothStation(); }}
                      leftIcon={<Bluetooth size={13} />}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold h-8 cursor-pointer"
                    >
                      {pairedBtName ? 'Re-Pair' : 'Pair Bluetooth'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isTestingBt}
                      onClick={() => handleTestBluetoothSlip(stationForm.name || 'Kitchen Station', stationForm.paperWidth || '80mm')}
                      className="border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold h-8 cursor-pointer bg-white dark:bg-slate-900"
                    >
                      {isTestingBt ? 'Testing...' : 'Test Slip'}
                    </Button>
                  </div>
                </div>
                {btPermissionBlocked && (
                  <div className="mt-2.5 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-[11px] text-red-800 dark:text-red-300 space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-red-700 dark:text-red-400">
                      <span>🔒</span>
                      <span>Bluetooth is blocked by your browser</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400">Follow these steps to allow it:</p>
                    <ol className="list-decimal list-inside space-y-1 text-slate-700 dark:text-slate-300">
                      <li>Click the <strong>🔒 lock icon</strong> in the browser address bar (top-left of the URL bar)</li>
                      <li>Click <strong>"Site settings"</strong> or <strong>"Permissions"</strong></li>
                      <li>Find <strong>Bluetooth</strong> and change it from <strong className="text-red-600">"Blocked"</strong> to <strong className="text-emerald-600">"Allow"</strong></li>
                      <li><strong>Refresh the page</strong> (Ctrl+R) then click Pair Bluetooth again</li>
                    </ol>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Buzzer Option */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <Volume2 size={16} className="text-amber-500" />
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {businessCategory.isFood ? 'Sound Kitchen Buzzer / Beeper' : 'Sound Station Buzzer / Beeper'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {businessCategory.isFood 
                    ? 'Rings printer beeper twice when a new KOT ticket arrives.' 
                    : 'Rings printer beeper twice when a new packing slip arrives.'}
                </p>
              </div>
            </div>
            <Switch
              checked={stationForm.soundBuzzer !== false}
              onChange={(val) => setStationForm(prev => ({ ...prev, soundBuzzer: val }))}
            />
          </div>

          {/* Category Routing with Multi-Select */}
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
        title={editingBillingPrinterId 
          ? (businessCategory.isFood ? "Edit Cashier Bill Printer" : "Edit Billing Counter Printer")
          : (businessCategory.isFood ? "Register Cashier Bill Printer" : "Register Billing Counter Printer")}
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
              placeholder={businessCategory.billingStationPlaceholder}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
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
                <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">Counter Ethernet / Wi-Fi IP (9100)</div>
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

              {/* Direct Bluetooth */}
              <button
                type="button"
                onClick={() => setBillingPrinterForm(prev => ({ ...prev, connectionType: 'bluetooth' }))}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  billingPrinterForm.connectionType === 'bluetooth'
                    ? 'border-emerald-600 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                }`}
              >
                <div className="text-xs font-black flex items-center gap-1"><Bluetooth size={13} /> Bluetooth</div>
                <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">Wireless BLE POS direct print</div>
              </button>
            </div>

            {/* Network LAN IP Config Fields */}
            {billingPrinterForm.connectionType === 'network' && (
              <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-200/80 dark:border-blue-800/60 space-y-2.5 animate-fade-in">
                {bridgeStatus?.online && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="font-bold">Local Print Bridge Active</span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">({bridgeStatus.ip || '127.0.0.1'}:9101)</span>
                    </div>
                    <span className="text-[9px] font-extrabold uppercase bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded text-emerald-700 dark:text-emerald-300">Direct LAN</span>
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

            {/* Direct Bluetooth Device Pairing Button */}
            {billingPrinterForm.connectionType === 'bluetooth' && (
              <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-xl border border-indigo-200/80 dark:border-indigo-800/60 space-y-2.5 animate-fade-in">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                      <Bluetooth size={13} className="text-indigo-600 dark:text-indigo-400" />
                      <span>{pairedBtName ? `Paired: ${pairedBtName}` : 'Direct Bluetooth ESC/POS'}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Pair wireless Bluetooth thermal bill printer (PT-210, GOOJPRT, MPT-II, Xprinter, etc.).
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => { setBtPermissionBlocked(false); handlePairBillingPrinterBt(); }}
                      leftIcon={<Bluetooth size={13} />}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shrink-0 h-8 cursor-pointer"
                    >
                      {pairedBtName ? 'Re-Pair' : 'Pair Bluetooth'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isTestingBt}
                      onClick={() => handleTestBluetoothSlip(billingPrinterForm.name || 'Cashier Counter', billingPrinterForm.paperWidth || '80mm')}
                      className="border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold h-8 cursor-pointer bg-white dark:bg-slate-900"
                    >
                      {isTestingBt ? 'Testing...' : 'Test Slip'}
                    </Button>
                  </div>
                </div>
                {btPermissionBlocked && (
                  <div className="mt-1 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-[11px] text-red-800 dark:text-red-300 space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-red-700 dark:text-red-400">
                      <span>🔒</span>
                      <span>Bluetooth is blocked by your browser</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400">Follow these steps to allow it:</p>
                    <ol className="list-decimal list-inside space-y-1 text-slate-700 dark:text-slate-300">
                      <li>Click the <strong>🔒 lock icon</strong> in the browser address bar (top-left of the URL bar)</li>
                      <li>Click <strong>"Site settings"</strong> or <strong>"Permissions"</strong></li>
                      <li>Find <strong>Bluetooth</strong> and change it from <strong className="text-red-600">"Blocked"</strong> to <strong className="text-emerald-600">"Allow"</strong></li>
                      <li><strong>Refresh the page</strong> (Ctrl+R) then click Pair Bluetooth again</li>
                    </ol>
                  </div>
                )}
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
                Reset to Standard Discovery (Show on Map & Show Menu Label – Free)
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

      <WhatsNewModal
        isOpen={isWhatsNewOpen}
        onClose={() => setIsWhatsNewOpen(false)}
        forceOpen={isWhatsNewOpen}
      />
    </div>
  );
}



