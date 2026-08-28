import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { 
  Mail, Store, Shield, Smartphone, ChevronRight, Sliders, Globe, 
  Coins, Truck, ShoppingBag, QrCode, Tag, MapPin, Zap, CheckCircle2, Lock, Info, AlertCircle,
  CreditCard
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { useShopStore } from '@/store/shopStore';
import { api } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useHeaderStore } from '@/store/useHeaderStore';
import { HeaderActions } from '@/components/HeaderActions';
import { Switch } from '@/components/ui/Switch';
import { SearchableSelect } from '@/components/ui/SearchableSelect';

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
  const { shop, setShop } = useShopStore();
  const navigate = useNavigate();

  // Tab State
  const [activeTab, setActiveTab] = useState<'general' | 'ordering' | 'discovery' | 'payments' | 'account'>('general');

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

  // Shop Settings State
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsData, setSettingsData] = useState({
    currency: shop?.settings?.currency || '₹',
    language: shop?.settings?.language || 'en',
    show_prices: shop?.settings?.show_prices !== false,
    show_offers: shop?.settings?.show_offers !== false,
    is_discoverable: shop?.settings?.is_discoverable !== false,
    show_menus_in_discovery: shop?.settings?.show_menus_in_discovery !== false,
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
  });

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
                <CardTitle className="text-base font-bold">Public App Discovery</CardTitle>
                <CardDescription className="text-xs">Control your visibility on the customer map and search.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <SettingRow
                  icon={MapPin}
                  title="Enable Store Discovery"
                  description="Allow customers to discover your restaurant on the public map, view menu links, prices, and active offers."
                  checked={settingsData.is_discoverable}
                  onChange={(c) => setSettingsData(prev => ({
                    ...prev,
                    is_discoverable: c,
                    show_prices: c,
                    show_offers: c,
                    show_menus_in_discovery: c,
                  }))}
                />
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
                  <CardDescription className="text-xs">Gateway configuration and Direct UPI.</CardDescription>
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

                  <hr className="border-slate-100 dark:border-slate-800" />

                  {/* Direct UPI */}
                  <div>
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                      <Coins size={14} className="text-emerald-500" /> Direct Shop UPI (Zero Fee)
                    </h4>
                    <div className="p-4 bg-slate-50/60 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xs shrink-0">UPI</div>
                        <div className="flex-1 space-y-2">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Shop UPI ID</p>
                          <p className="text-[11px] text-slate-500">Enable customers dining in to pay you directly via their UPI apps without gateway fees.</p>
                          <input
                            type="text"
                            placeholder="e.g. 9876543210@ybl"
                            value={settingsData.upi_id || ''}
                            onChange={(e) => setSettingsData(prev => ({ ...prev, upi_id: e.target.value.toLowerCase() }))}
                            className="w-full sm:max-w-md px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 font-medium"
                          />
                        </div>
                      </div>
                    </div>
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
    </div>
  );
}
