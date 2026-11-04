import { useState, useEffect, useMemo, useRef } from 'react';
import { SettingsNavRail, SettingsTabId } from './components/SettingsNavRail';
import { GeneralSettingsTab } from './tabs/GeneralSettingsTab';
import { OrderingSettingsTab } from './tabs/OrderingSettingsTab';
import { PoliciesSettingsTab } from './tabs/PoliciesSettingsTab';
import { DiscoverySettingsTab } from './tabs/DiscoverySettingsTab';
import { PaymentsSettingsTab } from './tabs/PaymentsSettingsTab';
import { TaxSettingsTab } from './tabs/TaxSettingsTab';
import { PrinterSettingsTab } from './tabs/PrinterSettingsTab';
import { AccountSettingsTab } from './tabs/AccountSettingsTab';
import { SupportSettingsTab } from './tabs/SupportSettingsTab';
import { useNavigate, useSearchParams, Link } from 'react-router';
import { 
  Mail, Store, Shield, ShieldCheck, Smartphone, Phone, ChevronRight, ChevronDown, ArrowRight, Sliders, Globe, 
  Coins, Truck, ShoppingBag, QrCode, Tag, MapPin, Zap, CheckCircle2, Lock, Info, AlertCircle,
  CreditCard, Printer, Plus, Trash2, Edit2, UtensilsCrossed, FileText, Check, RotateCcw,
  Wifi, Usb, Bluetooth, Volume2, Terminal, Copy, Receipt, Search, X, Tags, Layers, Eye, EyeOff, Loader2, Save,
  Laptop, Download, ArrowLeft, LayoutGrid, PackageCheck, Package, Clock, Timer, Scissors, Hash, Lightbulb
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { useShopStore } from '@/store/shopStore';
import { getBusinessCategory, isFireworksBusiness } from '@/config/businessCategories';
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
import { BILL_LANGUAGES } from '@/utils/billTranslations';
import { getActiveSystemLanguage, setSystemLanguage } from '@/utils/language';
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

  // Account Deletion OTP State
  const [isLicensesModalOpen, setIsLicensesModalOpen] = useState(false);
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);
  const [accountOtpSent, setAccountOtpSent] = useState(false);
  const [accountOtpCode, setAccountOtpCode] = useState('');
  const [isSendingAccountOtp, setIsSendingAccountOtp] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Shop Deletion OTP State
  const [isDeleteShopModalOpen, setIsDeleteShopModalOpen] = useState(false);
  const [shopOtpSent, setShopOtpSent] = useState(false);
  const [shopOtpCode, setShopOtpCode] = useState('');
  const [isSendingShopOtp, setIsSendingShopOtp] = useState(false);
  const [isDeletingShop, setIsDeletingShop] = useState(false);

  // Tab & Module State
  const [activeTab, setActiveTab] = useState<SettingsTabId>(
    (tabFromUrl && tabFromUrl !== 'overview' ? tabFromUrl : 'general') as SettingsTabId
  );
  const [moduleSearchQuery, setModuleSearchQuery] = useState('');
  const [printerSection, setPrinterSection] = useState<'all' | 'kot' | 'billing'>('all');

  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab && tabFromUrl !== 'overview') {
      setActiveTab(tabFromUrl as any);
    } else if (!tabFromUrl || tabFromUrl === 'overview') {
      setActiveTab('general');
    }
  }, [tabFromUrl]);

  useEffect(() => {
    const moduleTitles: Record<string, { title: string; desc: string }> = {
      general: { title: 'General Settings', desc: 'Manage currency, display languages, and app installation' },
      ordering: { title: 'Ordering Channels', desc: 'Set up table dine-in, takeaway counters, and deliveries' },
      policies: { title: 'Cancellation & Replacement Policy', desc: 'Configure order cancellation refund processing and item replacement rules' },
      discovery: { title: 'Public Discovery & SEO', desc: 'Boost public search visibility and customer store discovery' },
      payments: { title: 'Payments & Bank Accounts', desc: 'Manage bank settlement account, online UPI and card gateways' },
      gst: { title: 'GST & Tax Compliances', desc: 'Manage business legal entity, GSTIN, and FSSAI licenses' },
      printers: { title: businessCategory.settingsPrintersTabLabel || 'Dispatch & Thermal Printers', desc: 'Configure KOT station routing and USB / LAN receipt printers' },
      account: { title: 'Security & Account', desc: 'Account credentials, session devices, and deletion rules' },
      support: { title: 'Merchant Care & Support', desc: 'Direct WhatsApp, phone and email assistance by Debuggers Technologies' },
    };
    const info = moduleTitles[activeTab] || { title: 'Shop Settings', desc: 'Shop preferences & rules' };
    setHeaderTitle(info.title, info.desc);
  }, [activeTab, setHeaderTitle, businessCategory]);

  const handleRequestAccountDeletionOtp = async () => {
    setIsSendingAccountOtp(true);
    try {
      await api.post('/auth/delete-account/request-otp');
      toast.success(`Verification OTP sent to ${user?.email || 'your email'}`);
      setAccountOtpSent(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to send deletion OTP. Please try again.');
    } finally {
      setIsSendingAccountOtp(false);
    }
  };

  const handleConfirmDeleteAccount = async () => {
    if (!accountOtpCode.trim() || accountOtpCode.trim().length < 4) {
      toast.error('Please enter the verification OTP sent to your email.');
      return;
    }
    setIsDeletingAccount(true);
    try {
      await api.delete(`/auth/me?code=${encodeURIComponent(accountOtpCode.trim())}`);
      toast.success('Your account and shops have been deactivated. Contact debuggerstechs@gmail.com to restore anytime.');
      setIsDeleteAccountModalOpen(false);
      await useAuthStore.getState().logout();
      navigate('/login');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to deactivate account. Please contact debuggerstechs@gmail.com');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleRequestShopDeletionOtp = async () => {
    if (!shop?.id) return;
    setIsSendingShopOtp(true);
    try {
      await api.post(`/shops/${shop.id}/delete/request-otp`);
      toast.success(`Verification OTP sent to ${user?.email || 'your email'}`);
      setShopOtpSent(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to send shop deletion OTP. Please try again.');
    } finally {
      setIsSendingShopOtp(false);
    }
  };

  const handleConfirmDeleteShop = async () => {
    if (!shop?.id) return;
    if (!shopOtpCode.trim() || shopOtpCode.trim().length < 4) {
      toast.error('Please enter the verification OTP sent to your email.');
      return;
    }
    setIsDeletingShop(true);
    try {
      await api.delete(`/shops/${shop.id}?code=${encodeURIComponent(shopOtpCode.trim())}`);
      toast.success(`Shop "${shop.name}" has been deactivated. Data is preserved and can be restored anytime via debuggerstechs@gmail.com.`);
      setIsDeleteShopModalOpen(false);
      setShopOtpSent(false);
      setShopOtpCode('');
      
      // Refresh user and switch to another shop if available
      await fetchUser();
      const updatedUser = useAuthStore.getState().user;
      const remainingShops = (updatedUser?.shops || []).filter((s: any) => s.id !== shop.id && !s.is_deleted);
      if (remainingShops.length > 0) {
        setShop(remainingShops[0]);
        navigate('/settings?tab=general');
      } else {
        setShop(null);
        navigate('/');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to deactivate shop. Please contact debuggerstechs@gmail.com');
    } finally {
      setIsDeletingShop(false);
    }
  };

  const handleSelectModule = (tabId: string) => {
    const target = (tabId === 'overview' ? 'general' : tabId) as SettingsTabId;
    setActiveTab(target);
    setSearchParams({ tab: target });
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
    language: string;
  }>({
    name: '',
    paperWidth: '80mm',
    connectionType: 'network',
    ipAddress: '127.0.0.1',
    port: 9100,
    enabled: true,
    isDefault: false,
    language: 'store',
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
      language: 'store',
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
      language: printer.language || 'store',
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
    max_delivery_distance: (shop?.settings as any)?.max_delivery_distance ?? 0,
    takeaway_enabled: shop?.settings?.takeaway_enabled || false,
    dinein_enabled: shop?.settings?.dinein_enabled || false,
    dinein_tables_enabled: (shop?.settings as any)?.dinein_tables_enabled !== false,
    dinein_tables_count: (shop?.settings as any)?.dinein_tables_count ?? 10,
    auto_accept_orders: shop?.settings?.auto_accept_orders || false,
    online_payments_enabled: shop?.settings?.online_payments_enabled !== false,
    online_payments_dinein_enabled: shop?.settings?.online_payments_dinein_enabled !== false,
    online_payments_takeaway_enabled: shop?.settings?.online_payments_takeaway_enabled !== false,
    online_payments_delivery_enabled: shop?.settings?.online_payments_delivery_enabled !== false,
    accept_after_payment: shop?.settings?.accept_after_payment || false,
    payment_timeout_minutes: (shop?.settings as any)?.payment_timeout_minutes ?? 15,
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
    wholesale_pricing_enabled: shop?.settings?.wholesale_pricing_enabled !== undefined && shop?.settings?.wholesale_pricing_enabled !== null
      ? Boolean(shop.settings.wholesale_pricing_enabled)
      : isFireworksBusiness(shop?.category),
    return_allowed: shop?.settings?.return_allowed || false,
    return_window_days: shop?.settings?.return_window_days ?? 0,
    return_policy_notes: shop?.settings?.return_policy_notes || '',
    refund_allowed: shop?.settings?.refund_allowed === true,
    refund_policy_notes: shop?.settings?.refund_policy_notes || (shop?.settings?.refund_allowed === true ? 'If any item is cancelled, 100% of the food item price is refunded to your account within 5-7 business days.' : 'This store operates under a strict no-refund policy. Orders cannot be refunded upon cancellation.'),
    replacement_allowed: shop?.settings?.replacement_allowed !== false,
    replacement_window_days: shop?.settings?.replacement_window_days ?? 0,
    replacement_policy_notes: shop?.settings?.replacement_policy_notes || (shop?.settings?.replacement_allowed !== false ? 'Free replacement available for damaged or incorrect delivered items.' : 'Item replacements are not accepted on public orders.'),
  });

  const [timeoutMode, setTimeoutMode] = useState<string>(() => {
    const initialMins = Number((shop?.settings as any)?.payment_timeout_minutes ?? 15);
    return [5, 10, 15, 20, 30, 45, 60].includes(initialMins) ? String(initialMins) : 'custom';
  });

  // Sync settingsData when shop settings load or change from server
  useEffect(() => {
    if (shop?.settings) {
      setSettingsData(prev => ({
        ...prev,
        ...shop.settings,
        show_prices: shop.settings.show_prices !== false,
        payment_timeout_minutes: (shop.settings as any).payment_timeout_minutes ?? 15,
        max_delivery_distance: (shop.settings as any).max_delivery_distance ?? 0,
        dinein_tables_enabled: (shop.settings as any).dinein_tables_enabled !== false,
        dinein_tables_count: (shop.settings as any).dinein_tables_count ?? 10,
        refund_allowed: shop.settings.refund_allowed === true,
        replacement_allowed: shop.settings.replacement_allowed !== false,
        wholesale_pricing_enabled: shop.settings.wholesale_pricing_enabled !== undefined && shop.settings.wholesale_pricing_enabled !== null
          ? Boolean(shop.settings.wholesale_pricing_enabled)
          : isFireworksBusiness(shop?.category),
      }));
      const serverMins = Number((shop.settings as any).payment_timeout_minutes ?? 15);
      setTimeoutMode([5, 10, 15, 20, 30, 45, 60].includes(serverMins) ? String(serverMins) : 'custom');
    }
  }, [shop?.id, (shop?.settings as any)?.id, (shop?.settings as any)?.max_delivery_distance, (shop?.settings as any)?.payment_timeout_minutes]);

  // Dirty state tracking for Smart Floating Save Bar
  const initialSettingsRef = useRef<string>('');
  useEffect(() => {
    if (shop?.settings && !initialSettingsRef.current && settingsData) {
      initialSettingsRef.current = JSON.stringify(settingsData);
    }
  }, [shop?.settings, settingsData]);

  const isDirty = useMemo(() => {
    if (!initialSettingsRef.current || !settingsData) return false;
    return JSON.stringify(settingsData) !== initialSettingsRef.current;
  }, [settingsData]);

  const handleResetSettings = () => {
    if (initialSettingsRef.current) {
      try {
        setSettingsData(JSON.parse(initialSettingsRef.current));
        toast('Settings reset to saved state', { icon: '🔄' });
      } catch (e) {
        console.error(e);
      }
    }
  };

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
        base_delivery_charge: parseFloat(String(settingsData.base_delivery_charge)) || 0,
        base_delivery_distance: parseFloat(String(settingsData.base_delivery_distance)) || 0,
        extra_delivery_distance_step: Math.max(0.1, parseFloat(String(settingsData.extra_delivery_distance_step)) || 1),
        extra_delivery_charge_per_step: parseFloat(String(settingsData.extra_delivery_charge_per_step)) || 0,
        max_delivery_distance: Math.max(0, parseFloat(String((settingsData as any).max_delivery_distance)) || 0),
        payment_timeout_minutes: Math.max(1, parseInt(String((settingsData as any).payment_timeout_minutes)) || 15),
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
      setSettingsData(prev => ({
        ...prev,
        ...res.data,
        max_delivery_distance: res.data.max_delivery_distance ?? 0,
        payment_timeout_minutes: res.data.payment_timeout_minutes ?? 15,
      }));
      const savedMins = Number(res.data.payment_timeout_minutes ?? 15);
      setTimeoutMode([5, 10, 15, 20, 30, 45, 60].includes(savedMins) ? String(savedMins) : 'custom');
      toast.success('Shop settings updated successfully!');

      // Synchronize system language across the application
      if (settingsData.language) {
        const currentActive = getActiveSystemLanguage();
        if (currentActive !== settingsData.language) {
          setSystemLanguage(settingsData.language, true);
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update shop settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleSelectFreeDiscoveryOption = async () => {
    try {
      const updated = {
        ...settingsData,
        is_discoverable: false,
        hide_discovery_badge: true,
        show_prices: settingsData.show_prices !== false,
        show_offers: settingsData.show_offers !== false,
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
      toast.success('Free Option activated: Shop is removed from public discovery map, and Discover label is removed from your customer menu & orders.');
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
      const res = await api.put('/shops/me/settings', updated);
      publicCache.clear();
      window.dispatchEvent(new CustomEvent('menukit-shop-settings-updated', { detail: res.data }));
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

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in pb-24 lg:pb-12">
      {/* Desktop Header Actions (Portals to Desktop Top Bar) */}
      <HeaderActions>
        <Button
          onClick={handleSaveShopSettings}
          disabled={isSavingSettings}
          isLoading={isSavingSettings}
          size="sm"
          leftIcon={<Save size={13} className="shrink-0" />}
          className="h-8 px-3 rounded-md text-xs font-semibold shadow-2xs cursor-pointer"
        >
          Save Settings
        </Button>
      </HeaderActions>

      {/* Two-Column Modern Settings Layout (Shopify / Stripe style) */}
      <div className="flex flex-col lg:flex-row items-start gap-6 lg:gap-8">
        {/* Left Settings Navigation Rail (Fixed / Sticky on Desktop) */}
        <div className="w-full lg:w-72 shrink-0 lg:sticky lg:top-4 lg:self-start z-10">
          <SettingsNavRail
            activeTab={activeTab}
            onSelectTab={handleSelectModule}
            searchQuery={moduleSearchQuery}
            onSearchChange={setModuleSearchQuery}
            gstActive={Boolean(settingsData.gst_enabled)}
            printersCount={stations.length + billingPrinters.length}
            isDiscoverable={Boolean(settingsData.is_discoverable)}
            businessCategory={businessCategory}
          />
        </div>

        {/* Right Configuration Canvas (Scrollable) */}
        <main className="flex-1 min-w-0 w-full space-y-6">
          {activeTab === 'general' && (
            <GeneralSettingsTab
              settingsData={settingsData}
              setSettingsData={setSettingsData}
              timeoutMode={timeoutMode}
              setTimeoutMode={setTimeoutMode}
              isInstalled={isInstalled}
              promptInstall={promptInstall}
              setIsWhatsNewOpen={setIsWhatsNewOpen}
              businessCategory={businessCategory}
              onSave={handleSaveShopSettings}
              isSaving={isSavingSettings}
            />
          )}

          {activeTab === 'ordering' && (
            <OrderingSettingsTab
              settingsData={settingsData}
              setSettingsData={setSettingsData}
              shop={shop}
              liveRazorpayStatus={liveRazorpayStatus}
              onNavigateToPayments={() => handleSelectModule('payments')}
              businessCategory={businessCategory}
              onSave={handleSaveShopSettings}
              isSaving={isSavingSettings}
            />
          )}

          {activeTab === 'policies' && (
            <PoliciesSettingsTab
              settingsData={settingsData}
              setSettingsData={setSettingsData}
              businessCategory={businessCategory}
              onSave={handleSaveShopSettings}
              isSaving={isSavingSettings}
            />
          )}

          {activeTab === 'discovery' && (
            <DiscoverySettingsTab
              settingsData={settingsData}
              setSettingsData={setSettingsData}
              discoveryDaysLeft={discoveryDaysLeft}
              discoveryExpiresAt={discoveryExpiresAt}
              isPaidDiscoveryActive={isPaidDiscoveryActive}
              onOpenDiscoveryModal={() => setIsDiscoveryModalOpen(true)}
              onNavigateToShopSetup={() => navigate('/shop-setup')}
              onSelectFreeDiscoveryOption={handleSelectFreeDiscoveryOption}
              onResetToStandardDiscovery={handleResetToStandardDiscovery}
              shop={shop}
              setShop={setShop}
            />
          )}

          {activeTab === 'payments' && (
            <PaymentsSettingsTab
              settingsData={settingsData}
              setSettingsData={setSettingsData}
              shop={shop}
              user={user}
              liveRazorpayStatus={liveRazorpayStatus}
              businessCategory={businessCategory}
            />
          )}

          {activeTab === 'gst' && (
            <TaxSettingsTab
              settingsData={settingsData}
              setSettingsData={setSettingsData}
              shop={shop}
              onSave={handleSaveShopSettings}
              isSaving={isSavingSettings}
            />
          )}

          {activeTab === 'printers' && (
            <PrinterSettingsTab
              printerSection={printerSection}
              setPrinterSection={setPrinterSection}
              stations={stations}
              billingPrinters={billingPrinters}
              primaryBillingPrinter={billingPrinter as any}
              paperWidth={paperWidth}
              setPaperWidth={setPaperWidth}
              autoPrintOnAccept={autoPrintOnAccept}
              setAutoPrintOnAccept={setAutoPrintOnAccept}
              bridgeStatus={bridgeStatus}
              setBridgeStatus={setBridgeStatus}
              pairedUsbName={pairedUsbName}
              pairedBtName={pairedBtName}
              btPermissionBlocked={btPermissionBlocked}
              setBtPermissionBlocked={setBtPermissionBlocked}
              isTestingBt={isTestingBt}
              isPairingUsb={false}
              categories={categories}
              onOpenStationModal={(st) => st ? openEditStationModal(st) : openNewStationModal()}
              onDeleteStation={removeStation}
              onOpenBillingPrinterModal={(bp) => bp ? openEditBillingPrinterModal(bp) : openNewBillingPrinterModal()}
              onDeleteBillingPrinter={removeBillingPrinter}
              onTestStation={handleTestPrint}
              onTestBillingPrinter={handleTestSpecificBillPrint}
              onTestBluetoothSlip={handleTestBluetoothSlip}
              onPairBillingPrinterUsb={handlePairBillingPrinterUsb}
              onPairBillingPrinterBt={handlePairBillingPrinterBt}
              businessCategory={businessCategory}
            />
          )}

          {activeTab === 'account' && (
            <AccountSettingsTab
              user={user}
              shop={shop}
              onNavigateToShopSetup={() => navigate('/shop-setup')}
              onOpenPhoneModal={() => {
                resetPhoneFlow();
                setIsPhoneModalOpen(true);
              }}
              onOpenEmailModal={() => {
                resetEmailFlow();
                setIsEmailModalOpen(true);
              }}
              onOpenLicensesModal={() => setIsLicensesModalOpen(true)}
              onOpenDeleteShopModal={() => {
                setShopOtpSent(false);
                setShopOtpCode('');
                setIsDeleteShopModalOpen(true);
              }}
              onOpenDeleteAccountModal={() => {
                setAccountOtpSent(false);
                setAccountOtpCode('');
                setIsDeleteAccountModalOpen(true);
              }}
            />
          )}

          {activeTab === 'support' && (
            <SupportSettingsTab
              shop={shop}
              user={user}
            />
          )}
        </main>
      </div>



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
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
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
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
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

          {/* Bill Print Language */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Globe size={13} className="text-primary" />
                <span>Bill Print Language</span>
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                Printed Receipt Format
              </span>
            </label>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Customer receipts, tax breakdown, and item headers from this printer will be printed in this language.
            </p>
            <SearchableSelect
              options={BILL_LANGUAGES}
              value={billingPrinterForm.language || 'store'}
              onChange={(val) => setBillingPrinterForm(prev => ({ ...prev, language: val }))}
              placeholder="Select receipt language..."
              className="w-full"
            />
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

            <Button
              type="button"
              variant="outline"
              className="w-full cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 font-bold"
              onClick={handleSelectFreeDiscoveryOption}
            >
              Select Free Option (Turn Off Discovery & Hide Menu Label)
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

      {/* Individual Shop Deactivation Modal */}
      <Modal
        isOpen={isDeleteShopModalOpen}
        onClose={() => setIsDeleteShopModalOpen(false)}
        title={`Deactivate Shop: ${shop?.name || 'Storefront'}`}
        className="max-w-md"
      >
        <div className="space-y-4 pt-2">
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
            <p className="font-bold flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
              <AlertCircle size={15} />
              <span>Restorable Shop Deactivation (is_deleted = True)</span>
            </p>
            <p className="leading-relaxed">
              Deactivating this shop will immediately take it offline and hide it from customer discovery.
            </p>
            <ul className="list-disc pl-4 space-y-1 text-[11px]">
              <li>Your master login and any other registered shops remain completely active.</li>
              <li>Catalog items, QR codes, and past order records will be preserved in our database.</li>
              <li>You can request instant restoration anytime by emailing <strong>debuggerstechs@gmail.com</strong>.</li>
            </ul>
          </div>

          {!shopOtpSent ? (
            <div className="space-y-3 pt-1">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                To confirm this deactivation, a 6-digit verification OTP will be sent to your registered email: <strong>{user?.email}</strong>.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDeleteShopModalOpen(false)}
                  className="rounded-xl font-bold"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  isLoading={isSendingShopOtp}
                  onClick={handleRequestShopDeletionOtp}
                  className="rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Send Verification OTP
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Enter 6-digit OTP sent to <span className="text-orange-600 font-semibold">{user?.email}</span>:
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={shopOtpCode}
                  onChange={(e) => setShopOtpCode(e.target.value)}
                  placeholder="e.g. 123456"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-center tracking-widest text-lg font-mono font-bold text-slate-900 dark:text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  disabled={isSendingShopOtp}
                  onClick={handleRequestShopDeletionOtp}
                  className="text-xs text-orange-600 hover:underline font-bold disabled:opacity-50"
                >
                  Resend OTP
                </button>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsDeleteShopModalOpen(false)}
                    className="rounded-xl font-bold"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!shopOtpCode || shopOtpCode.length < 4}
                    isLoading={isDeletingShop}
                    onClick={handleConfirmDeleteShop}
                    className="rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    Confirm & Deactivate Shop
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Account Deletion Confirmation Modal */}
      <Modal
        isOpen={isDeleteAccountModalOpen}
        onClose={() => setIsDeleteAccountModalOpen(false)}
        title="Deactivate Account & Storefronts"
        className="max-w-md"
      >
        <div className="space-y-4 pt-2">
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 text-xs text-rose-900 dark:text-rose-200 space-y-1.5">
            <p className="font-bold flex items-center gap-1.5 text-rose-700 dark:text-rose-300">
              <AlertCircle size={15} />
              <span>Restorable Account Deactivation (is_deleted = True)</span>
            </p>
            <p className="leading-relaxed">
              Confirming this action will immediately revoke your active login session and take all your shops offline:
            </p>
            <ul className="list-disc pl-4 space-y-1 text-[11px]">
              <li>All registered storefronts and public QR codes will be deactivated (is_deleted=True).</li>
              <li>Your database records are NOT erased — they remain safely archived and preserved.</li>
              <li>You can request full restoration of your account and shops anytime by emailing <strong>debuggerstechs@gmail.com</strong>.</li>
            </ul>
          </div>

          {!accountOtpSent ? (
            <div className="space-y-3 pt-1">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                To protect against unauthorized closure, a 6-digit confirmation OTP will be sent to your registered email: <strong>{user?.email}</strong>.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDeleteAccountModalOpen(false)}
                  className="rounded-xl font-bold"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  isLoading={isSendingAccountOtp}
                  onClick={handleRequestAccountDeletionOtp}
                  className="rounded-xl font-bold bg-rose-600 hover:bg-rose-700 text-white"
                >
                  Send Deletion OTP
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Enter 6-digit OTP sent to <span className="text-orange-600 font-semibold">{user?.email}</span>:
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={accountOtpCode}
                  onChange={(e) => setAccountOtpCode(e.target.value)}
                  placeholder="e.g. 123456"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-center tracking-widest text-lg font-mono font-bold text-slate-900 dark:text-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  disabled={isSendingAccountOtp}
                  onClick={handleRequestAccountDeletionOtp}
                  className="text-xs text-orange-600 hover:underline font-bold disabled:opacity-50"
                >
                  Resend OTP
                </button>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsDeleteAccountModalOpen(false)}
                    className="rounded-xl font-bold"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!accountOtpCode || accountOtpCode.length < 4}
                    isLoading={isDeletingAccount}
                    onClick={handleConfirmDeleteAccount}
                    className="rounded-xl font-bold bg-rose-600 hover:bg-rose-700 text-white"
                  >
                    Verify & Deactivate Account
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Open-Source Software Notices Modal */}
      <Modal
        isOpen={isLicensesModalOpen}
        onClose={() => setIsLicensesModalOpen(false)}
        title="Open-Source Software Notices"
        className="max-w-xl"
      >
        <div className="space-y-4 pt-2 max-h-[70vh] overflow-y-auto pr-1">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            MenuKit is built with modern open-source technologies under permissible community licenses (MIT, Apache 2.0, BSD):
          </p>

          <div className="space-y-2.5">
            {[
              { name: 'React & React DOM', license: 'MIT License', desc: 'The library for web and native user interfaces' },
              { name: 'Lucide Icons', license: 'ISC / MIT License', desc: 'Beautiful & consistent icons made by the community' },
              { name: 'Tailwind CSS', license: 'MIT License', desc: 'A utility-first CSS framework for rapid UI development' },
              { name: 'Vite', license: 'MIT License', desc: 'Next generation frontend tooling' },
              { name: 'Canvas Confetti', license: 'ISC License', desc: 'Performant celebratory canvas animations' },
              { name: 'Zustand', license: 'MIT License', desc: 'Bear necessities for state management in React' },
              { name: 'Axios', license: 'MIT License', desc: 'Promise-based HTTP client for the browser and node.js' },
            ].map((pkg, idx) => (
              <div key={idx} className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between gap-3 text-xs">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">{pkg.name}</h4>
                  <p className="text-[11px] text-slate-500">{pkg.desc}</p>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                  {pkg.license}
                </span>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLicensesModalOpen(false)}
              className="rounded-xl font-bold"
            >
              Close
            </Button>
          </div>
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



