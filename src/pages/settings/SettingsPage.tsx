import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { 
  Mail, Store, Shield, Smartphone, ChevronRight, Sliders, Globe, 
  Coins, Truck, ShoppingBag, QrCode, Eye, Tag, MapPin, Zap, CheckCircle2, Lock, Info
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { useShopStore } from '@/store/shopStore';
import { api } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Switch } from '@/components/ui/Switch';
import { SearchableSelect } from '@/components/ui/SearchableSelect';

// Sleek Clean Setting Row with Right-Aligned Toggle
function SettingRow({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon?: any;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 px-3.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors border border-transparent hover:border-slate-200/60 dark:hover:border-slate-700/60">
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
        className="shrink-0 ml-2"
      />
    </div>
  );
}

export function SettingsPage() {
  const { user, changeEmail } = useAuthStore();
  const { shop, setShop } = useShopStore();
  const navigate = useNavigate();

  // Change Email State
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailStep, setEmailStep] = useState<1 | 2 | 3>(1);
  const [oldEmailOtp, setOldEmailOtp] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newEmailOtp, setNewEmailOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    upi_id: shop?.settings?.upi_id || '',
  });

  // Fetch shop settings on mount
  useEffect(() => {
    const fetchShop = async () => {
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
  }, [setShop]);

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
        upi_id: shop.settings.upi_id || '',
      });
    }
  }, [shop]);

  const handleSaveShopSettings = async () => {
    setIsSavingSettings(true);
    try {
      const res = await api.put('/shops/me/settings', settingsData);
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in pb-24 lg:pb-12">
      <PageHeader
        title="Settings"
        subtitle="Manage your account, preferences, currency, and shop ordering rules."
      />

      <div className="space-y-6">
        {/* SHOP PREFERENCES CARD */}
        <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-bold">
                  <Sliders className="w-5 h-5 text-primary shrink-0" />
                  Shop Settings & Preferences
                </CardTitle>
                <CardDescription className="text-xs">
                  Configure currency, menu display rules, discovery map, and order channels.
                </CardDescription>
              </div>

              <Button
                onClick={handleSaveShopSettings}
                disabled={isSavingSettings}
                size="sm"
                className="rounded-xl font-bold bg-primary text-white shrink-0 self-start sm:self-auto"
              >
                {isSavingSettings ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 space-y-6">
            {/* 1. REGIONAL & CURRENCY */}
            <div>
              <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <Globe size={14} className="text-blue-500" /> Regional & Currency
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/60 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
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
            </div>

            {/* 2. STORE DISCOVERY */}
            <div>
              <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <MapPin size={14} className="text-purple-500" /> Public Discovery & Map
              </h4>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
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
              </div>
            </div>

            {/* 3. ORDER CHANNELS & FULFILLMENT */}
            <div>
              <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <ShoppingBag size={14} className="text-emerald-500" /> Order Channels & Auto Accept
              </h4>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
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
              </div>
            </div>

            {/* 4. DELIVERY PRICING & DISTANCE RULES */}
            {settingsData.delivery_enabled && (
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <Truck size={14} className="text-amber-500" /> Delivery Pricing & Distance Rules
                </h4>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 rounded-2xl space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-primary" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                        Distance-Based Pricing Configuration
                      </h4>
                    </div>
                    <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                      Auto Calculated
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                        Base Delivery Cost ({settingsData.currency})
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="e.g. 100"
                        value={settingsData.base_delivery_charge}
                        onChange={(e) => setSettingsData(prev => ({ ...prev, base_delivery_charge: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-primary font-semibold text-slate-800 dark:text-slate-100"
                      />
                      <span className="text-[10px] text-slate-400 block mt-0.5">Base delivery fee</span>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                        Included Base Distance (km)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        placeholder="e.g. 5"
                        value={settingsData.base_delivery_distance}
                        onChange={(e) => setSettingsData(prev => ({ ...prev, base_delivery_distance: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-primary font-semibold text-slate-800 dark:text-slate-100"
                      />
                      <span className="text-[10px] text-slate-400 block mt-0.5">Covered in base cost</span>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                        Extra Distance Step (km)
                      </label>
                      <input
                        type="number"
                        min="0.1"
                        step="0.5"
                        placeholder="e.g. 1, 2 or 3"
                        value={settingsData.extra_delivery_distance_step}
                        onChange={(e) => setSettingsData(prev => ({ ...prev, extra_delivery_distance_step: Math.max(0.1, parseFloat(e.target.value) || 1) }))}
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-primary font-semibold text-slate-800 dark:text-slate-100"
                      />
                      <span className="text-[10px] text-slate-400 block mt-0.5">Every N extra km</span>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                        Extra Rate Per Step ({settingsData.currency})
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="e.g. 10"
                        value={settingsData.extra_delivery_charge_per_step}
                        onChange={(e) => setSettingsData(prev => ({ ...prev, extra_delivery_charge_per_step: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-primary font-semibold text-slate-800 dark:text-slate-100"
                      />
                      <span className="text-[10px] text-slate-400 block mt-0.5">Add per extra step</span>
                    </div>
                  </div>

                  {/* Dynamic Formula Calculation Preview */}
                  <div className="p-3 bg-white dark:bg-slate-900/80 rounded-xl border border-slate-200/60 dark:border-slate-700/50 text-xs text-slate-600 dark:text-slate-300 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-2">
                      <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                        Live Calculation Preview
                      </p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-slate-500">Test Order Distance:</span>
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={testDistance}
                          onChange={(e) => setTestDistance(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-16 px-2 py-0.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-center font-bold text-primary focus:outline-none focus:border-primary"
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
                        return (
                          <p className="text-[11px] leading-relaxed">
                            For a test order from <span className="font-bold text-primary">{dist} km</span> away:
                            Distance is within included base distance (<span className="font-bold">{baseDist} km</span>).
                            Total Delivery Fee = <span className="font-black text-emerald-600 dark:text-emerald-400">{settingsData.currency}{baseCharge}</span>.
                          </p>
                        );
                      }

                      const extraKm = dist - baseDist;
                      const steps = Math.ceil(extraKm / step);
                      const extraFee = steps * rate;
                      const totalFee = baseCharge + extraFee;

                      return (
                        <p className="text-[11px] leading-relaxed">
                          For a test order from <span className="font-bold text-primary">{dist} km</span> away:
                          Base {baseDist} km = <span className="font-bold">{settingsData.currency}{baseCharge}</span>.
                          Remaining {extraKm.toFixed(1)} km ({steps} step{steps > 1 ? 's' : ''} of {step} km @ {settingsData.currency}{rate}/step) = <span className="font-bold">{settingsData.currency}{extraFee}</span> extra.
                          Total Delivery Fee = <span className="font-black text-emerald-600 dark:text-emerald-400">{settingsData.currency}{totalFee}</span>.
                        </p>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* 5. ONLINE PAYMENT GATEWAY */}
            <div>
              <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Zap size={14} className="text-indigo-500" /> Online Payment Gateway
              </h4>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                <SettingRow
                  icon={Zap}
                  title="Accept Online Payments"
                  description="Enable online payment gateway checkout (UPI, Cards, Netbanking) for Takeaway & Delivery orders."
                  checked={settingsData.online_payments_enabled}
                  onChange={(c) => setSettingsData(prev => ({ ...prev, online_payments_enabled: c }))}
                />

                {settingsData.online_payments_enabled && (
                  <div className="ml-0 sm:ml-12 p-3.5 bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800 rounded-2xl space-y-1 my-2 text-xs animate-in fade-in duration-200">
                    <div className="flex items-center gap-1.5 font-bold text-blue-900 dark:text-blue-200">
                      <Info size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />
                      <span>Online Payment Rules</span>
                    </div>
                    <p className="text-blue-700 dark:text-blue-300 text-[11px] leading-relaxed">
                      • <strong>Takeaway & Delivery:</strong> Customers pay online securely before order placement.<br />
                      • <strong>Dine-In:</strong> Supports Pay at Counter (Cash) and Direct Shop UPI.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 6. DIRECT SHOP UPI PAYMENTS */}
            <div>
              <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Coins size={14} className="text-green-500" /> Direct Shop UPI Payments
              </h4>

              <div className="p-4 bg-slate-50/60 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-green-600 font-black text-sm">₹</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Shop UPI ID</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2 leading-tight">
                      Customers scanning your QR code can pay directly via UPI. Enter your shop UPI ID below.
                    </p>
                    <input
                      type="text"
                      placeholder="e.g. shop@okaxis or 9876543210@paytm"
                      value={settingsData.upi_id || ''}
                      onChange={(e) => setSettingsData(prev => ({ ...prev, upi_id: e.target.value }))}
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-green-500 font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400"
                    />
                    {settingsData.upi_id && (
                      <p className="text-[10px] text-green-600 dark:text-green-400 font-bold mt-1.5 flex items-center gap-1">
                        ✓ Direct UPI payments configured ({settingsData.upi_id})
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3-COLUMN / GRID FOR ACCOUNT, SHOP & APP INFO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Profile Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-bold">
                <Shield className="w-4 h-4 text-primary shrink-0" />
                Account & Email
              </CardTitle>
              <CardDescription className="text-xs">Manage sign-in email</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-1">
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center font-black uppercase text-sm shrink-0">
                  {user?.email?.charAt(0) || 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Current Email</p>
                  <p className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">{user?.email}</p>
                </div>
              </div>

              <Button 
                variant="outline" 
                size="sm"
                className="w-full justify-between rounded-xl font-bold text-xs"
                onClick={() => setIsEmailModalOpen(true)}
              >
                <span className="flex items-center gap-2">
                  <Mail size={14} className="text-slate-400" />
                  Change Email
                </span>
                <ChevronRight size={14} className="text-slate-400" />
              </Button>
            </CardContent>
          </Card>

          {/* Shop Setup Shortcut */}
          <Card className="hover:border-primary/50 transition-colors cursor-pointer group" onClick={() => navigate('/shop-setup')}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-bold">
                <Store className="w-4 h-4 text-indigo-500 shrink-0" />
                Shop Profile & Branding
              </CardTitle>
              <CardDescription className="text-xs">Edit shop name, logo, banner & hours</CardDescription>
            </CardHeader>
            <CardContent className="pt-1">
              <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center justify-center shrink-0">
                    {shop?.logo_url ? (
                      <img src={shop.logo_url} alt="Shop Logo" className="w-7 h-7 rounded-md object-cover" />
                    ) : (
                      <Store size={18} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">{shop?.name || 'My Shop'}</p>
                    <p className="text-[10px] text-slate-400 font-medium">Edit Profile & Logo</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all shrink-0 ml-1" />
              </div>
            </CardContent>
          </Card>

          {/* App Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-bold">
                <Smartphone className="w-4 h-4 text-slate-500 shrink-0" />
                System Details
              </CardTitle>
              <CardDescription className="text-xs">Version & environment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pt-1 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 font-medium">Version</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">v1.0.0</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 font-medium">Environment</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 capitalize">{import.meta.env.MODE || 'production'}</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-500 font-medium">Notifications</span>
                <span className="bg-emerald-100 text-emerald-700 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">Active</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Change Email Modal */}
      <Modal
        isOpen={isEmailModalOpen}
        onClose={closeEmailModal}
        title="Change Email Address"
        className="max-w-md"
      >
        <div className="mt-4">
          {/* Progress Indicator */}
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
                <p className="text-sm text-slate-500">
                  To protect your account, we need to send an OTP to your current email address.
                </p>
                <div className="py-2 px-3 bg-slate-50 border rounded-lg font-medium text-slate-700 mt-2 inline-block">
                  {user?.email}
                </div>
              </div>
              
              <Button 
                onClick={handleRequestOldEmailOtp} 
                disabled={isSubmitting}
                className="w-full"
              >
                {isSubmitting ? 'Sending...' : 'Send OTP to Current Email'}
              </Button>
            </div>
          )}

          {emailStep === 2 && (
            <div className="space-y-5 animate-fade-in">
              <div className="bg-blue-50 border border-blue-100 text-blue-800 p-3 rounded-lg text-sm mb-2">
                We sent a 6-digit code to <strong>{user?.email}</strong>
              </div>
              
              <Input
                label="Enter Current Email OTP"
                value={oldEmailOtp}
                onChange={(e) => setOldEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                maxLength={6}
                required
                autoFocus
              />

              <div className="pt-2 border-t border-slate-100">
                <Input
                  label="Enter New Email Address"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="new@example.com"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <Button variant="outline" onClick={closeEmailModal} type="button">Cancel</Button>
                <Button 
                  onClick={handleVerifyOldEmailAndRequestNew}
                  disabled={isSubmitting || oldEmailOtp.length !== 6 || !newEmail.includes('@')}
                >
                  {isSubmitting ? 'Verifying...' : 'Verify & Send Next OTP'}
                </Button>
              </div>
            </div>
          )}

          {emailStep === 3 && (
            <div className="space-y-5 animate-fade-in">
              <div className="bg-blue-50 border border-blue-100 text-blue-800 p-3 rounded-lg text-sm mb-2">
                We sent a 6-digit code to <strong>{newEmail}</strong>
              </div>

              <Input
                label="Enter New Email OTP"
                value={newEmailOtp}
                onChange={(e) => setNewEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                maxLength={6}
                required
                autoFocus
              />

              <div className="pt-2 flex justify-end gap-3">
                <Button variant="outline" onClick={closeEmailModal} type="button">Cancel</Button>
                <Button 
                  onClick={handleFinalizeEmailChange}
                  disabled={isSubmitting || newEmailOtp.length !== 6}
                >
                  {isSubmitting ? 'Finalizing...' : 'Complete Email Change'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
