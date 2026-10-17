import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Coins, Gift, CheckCircle2, Clock, Calendar, 
  ArrowRight, Phone, User, MapPin, ShieldCheck, 
  ChevronRight, Award, Trophy, Info, Building2,
  QrCode, CreditCard, ExternalLink, Lock, ChevronLeft
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { toast } from 'react-hot-toast';
import { 
  schemeService, Scheme, CustomerSchemePass, SchemeMemberCreatePayload 
} from '@/services/schemeService';
import { customerService } from '@/services/customers';
import { DiscountUnlockPopup } from './DiscountUnlockPopup';
import { triggerHaptic, HAPTIC_PATTERNS } from '@/utils/haptic';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { BottomSheet } from '@/components/ui/BottomSheet';

const loadRazorpaySDK = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const formatPaidDateTime = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

export const COUNTRY_CODES = [
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+1', country: 'USA / Canada', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬' },
  { code: '+60', country: 'Malaysia', flag: '🇲🇾' },
  { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '+974', country: 'Qatar', flag: '🇶🇦' },
  { code: '+968', country: 'Oman', flag: '🇴🇲' },
  { code: '+965', country: 'Kuwait', flag: '🇰🇼' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
];

export const INDIAN_STATES = [
  'Tamil Nadu', 'Kerala', 'Karnataka', 'Andhra Pradesh', 'Telangana',
  'Maharashtra', 'Gujarat', 'Rajasthan', 'Uttar Pradesh', 'Madhya Pradesh',
  'Delhi', 'Punjab', 'Haryana', 'Bihar', 'West Bengal', 'Odisha',
  'Assam', 'Goa', 'Jharkhand', 'Chhattisgarh', 'Uttarakhand', 'Himachal Pradesh',
  'Puducherry', 'Jammu & Kashmir'
];

export const DISTRICTS_BY_STATE: Record<string, string[]> = {
  'Tamil Nadu': [
    'Virudhunagar (Sivakasi)', 'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli (Trichy)', 
    'Salem', 'Tirunelveli', 'Erode', 'Tiruppur', 'Vellore', 'Thanjavur', 'Dindigul', 
    'Kanchipuram', 'Chengalpattu', 'Cuddalore', 'Dharmapuri', 'Kallakurichi', 'Karur', 
    'Krishnagiri', 'Mayiladuthurai', 'Nagapattinam', 'Namakkal', 'Nilgiris (Ooty)', 
    'Perambalur', 'Pudukkottai', 'Ramanathapuram', 'Ranipet', 'Sivaganga', 'Tenkasi', 
    'Theni', 'Thoothukudi (Tuticorin)', 'Tirupathur', 'Tiruvallur', 'Tiruvannamalai', 
    'Tiruvarur', 'Viluppuram', 'Ariyalur', 'Kanyakumari (Nagercoil)', 'Other / Custom District'
  ],
  'Kerala': [
    'Thiruvananthapuram', 'Kochi / Ernakulam', 'Kozhikode', 'Thrissur', 'Kollam', 
    'Palakkad', 'Kannur', 'Alappuzha', 'Kottayam', 'Malappuram', 'Kasaragod', 
    'Pathanamthitta', 'Idukki', 'Wayanad', 'Other / Custom District'
  ],
  'Karnataka': [
    'Bengaluru Urban', 'Bengaluru Rural', 'Mysuru', 'Hubballi-Dharwad', 'Mangaluru', 
    'Belagavi', 'Kalaburagi', 'Ballari', 'Shivamogga', 'Tumakuru', 'Udupi', 'Davanagere', 'Other / Custom District'
  ],
  'Andhra Pradesh': [
    'Visakhapatnam', 'Vijayawada / NTR', 'Guntur', 'Nellore', 'Kurnool', 'Tirupati', 
    'Kakinada', 'Anantapur', 'Kadapa', 'Rajahmundry', 'Other / Custom District'
  ],
  'Telangana': [
    'Hyderabad', 'Warangal', 'Nizamabad', 'Khammam', 'Karimnagar', 'Rangareddy', 
    'Medchal-Malkajgiri', 'Sangareddy', 'Other / Custom District'
  ],
  'Maharashtra': [
    'Mumbai City', 'Mumbai Suburban', 'Pune', 'Nagpur', 'Thane', 'Nashik', 
    'Chhatrapati Sambhajinagar', 'Solapur', 'Kolhapur', 'Navi Mumbai', 'Other / Custom District'
  ],
  'Gujarat': [
    'Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Gandhinagar', 'Other / Custom District'
  ],
  'Delhi': [
    'Central Delhi', 'New Delhi', 'North Delhi', 'South Delhi', 'East Delhi', 'West Delhi', 'Other / Custom District'
  ],
  'Uttar Pradesh': [
    'Lucknow', 'Kanpur', 'Varanasi', 'Agra', 'Prayagraj', 'Noida / Gautam Buddha Nagar', 
    'Ghaziabad', 'Meerut', 'Bareilly', 'Aligarh', 'Other / Custom District'
  ],
  'Rajasthan': [
    'Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Bikaner', 'Ajmer', 'Alwar', 'Bhilwara', 'Other / Custom District'
  ],
  'West Bengal': [
    'Kolkata', 'Howrah', 'North 24 Parganas', 'South 24 Parganas', 'Hooghly', 'Darjeeling', 'Siliguri', 'Other / Custom District'
  ]
};

interface PublicSchemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopId: string;
  primaryColor?: string;
  shop?: any;
  isFullPage?: boolean;
}

export const PublicSchemeModal: React.FC<PublicSchemeModalProps> = ({
  isOpen,
  onClose,
  shopId,
  primaryColor = '#f97316',
  shop,
  isFullPage = false,
}) => {
  const currency = shop?.settings?.currency || '₹';
  const [activeTab, setActiveTab] = useState<'schemes' | 'my_pass'>('schemes');
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Joining state
  const [selectedSchemeForJoin, setSelectedSchemeForJoin] = useState<Scheme | null>(null);
  const [joinName, setJoinName] = useState(() => localStorage.getItem('customer_name') || '');
  const [joinCountryCode, setJoinCountryCode] = useState(() => localStorage.getItem('customer_country_code') || '+91');
  const [joinPhone, setJoinPhone] = useState(() => {
    const raw = localStorage.getItem('customer_mobile') || localStorage.getItem('customer_phone') || '';
    return raw.replace(/\D/g, '').slice(-10);
  });
  const [joinStreet, setJoinStreet] = useState(() => localStorage.getItem('customer_street') || localStorage.getItem('customer_address') || '');
  const [joinState, setJoinState] = useState(() => localStorage.getItem('customer_state') || 'Tamil Nadu');
  const [joinDistrict, setJoinDistrict] = useState(() => localStorage.getItem('customer_district') || 'Virudhunagar (Sivakasi)');
  const [customDistrict, setCustomDistrict] = useState('');
  const [joinPincode, setJoinPincode] = useState(() => localStorage.getItem('customer_pincode') || '');
  const [isJoining, setIsJoining] = useState(false);

  // My Passes State
  const [passCountryCode, setPassCountryCode] = useState(() => localStorage.getItem('customer_country_code') || '+91');
  const [customerPhone, setCustomerPhone] = useState(() => {
    const raw = localStorage.getItem('customer_mobile') || localStorage.getItem('customer_phone') || '';
    return raw.replace(/\D/g, '').slice(-10);
  });
  const [customerName, setCustomerName] = useState(() => localStorage.getItem('customer_name') || '');
  const [customerPasses, setCustomerPasses] = useState<CustomerSchemePass[]>([]);
  const [isLoadingPasses, setIsLoadingPasses] = useState(false);
  const [hasQueriedPasses, setHasQueriedPasses] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpModalStep, setOtpModalStep] = useState<'intro' | 'mobile' | 'otp'>('mobile');
  const [selectedPassForRewards, setSelectedPassForRewards] = useState<CustomerSchemePass | null>(null);
  const [previewRewardsScheme, setPreviewRewardsScheme] = useState<{
    title: string;
    items: SchemeItemInfo[];
  } | null>(null);

  const displayName = customerName || customerPasses[0]?.customer_name || localStorage.getItem('customer_name') || '';

  const [pendingEnrollScheme, setPendingEnrollScheme] = useState<Scheme | null>(null);

  const handleEnrollClick = (scheme: Scheme) => {
    const token = localStorage.getItem('customer_token');
    const storedMobile = localStorage.getItem('customer_mobile') || localStorage.getItem('customer_phone') || '';
    const cleanMobile = storedMobile.replace(/\D/g, '').slice(-10);

    if (!token || !cleanMobile || cleanMobile.length < 7) {
      // Require mobile & OTP verification before enrolling
      setPendingEnrollScheme(scheme);
      setOtpModalStep('mobile');
      setShowOtpModal(true);
      return;
    }

    // Number & token already verified -> pre-fill and proceed to enroll
    setJoinPhone(cleanMobile);
    const storedCountryCode = localStorage.getItem('customer_country_code') || '+91';
    setJoinCountryCode(storedCountryCode);
    const storedName = localStorage.getItem('customer_name') || '';
    if (storedName) setJoinName(storedName);
    setSelectedSchemeForJoin(scheme);
  };

  const handleChangeAccount = () => {
    localStorage.removeItem('pending_otp_verification');
    setOtpModalStep('mobile');
    setShowOtpModal(true);
  };

  // Installment Payment Modal State
  const [payingPass, setPayingPass] = useState<{
    pass: CustomerSchemePass;
    targetClickedNum: number;
  } | null>(null);
  const [isPayingInstallment, setIsPayingInstallment] = useState(false);

  useEffect(() => {
    if (isOpen && shopId) {
      fetchPublicSchemes();
      if (customerPhone && customerPhone.length >= 7) {
        const fullPhone = passCountryCode === '+91' ? customerPhone : `${passCountryCode}${customerPhone}`;
        // Auto-fetch ONLY if the current customer_token matches this mobile number
        customerService.verifyMobile(fullPhone, shopId).then(res => {
          if (res.otp_required === false) {
            fetchCustomerPasses(fullPhone);
          }
        }).catch(() => {});
      }
    }
  }, [isOpen, shopId]);

  useEffect(() => {
    if (activeTab === 'my_pass' && customerPhone && customerPhone.length >= 7 && !hasQueriedPasses) {
      const fullPhone = passCountryCode === '+91' ? customerPhone : `${passCountryCode}${customerPhone}`;
      fetchCustomerPasses(fullPhone);
    }
  }, [activeTab, customerPhone, passCountryCode, hasQueriedPasses]);

  // Sync default district when state changes
  useEffect(() => {
    const validDists = DISTRICTS_BY_STATE[joinState] || ['Other / Custom District'];
    if (!joinDistrict || !validDists.includes(joinDistrict)) {
      setJoinDistrict(validDists[0]);
    }
  }, [joinState]);

  const fetchPublicSchemes = async () => {
    setIsLoading(true);
    try {
      const data = await schemeService.getPublicSchemes(shopId);
      setSchemes(data);
    } catch (err) {
      console.error('Failed to load public schemes', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCustomerPasses = async (phone: string) => {
    if (!phone || phone.trim().length < 7) return;
    setIsLoadingPasses(true);
    try {
      const passes = await schemeService.getMySchemeStatus(shopId, phone.trim());
      setCustomerPasses(passes);
      if (passes.length > 0 && passes[0].customer_name && !customerName) {
        setCustomerName(passes[0].customer_name);
        if (!localStorage.getItem('customer_name')) {
          localStorage.setItem('customer_name', passes[0].customer_name);
        }
      }
      setHasQueriedPasses(true);
    } catch (err) {
      console.error('Failed to fetch scheme passes', err);
    } finally {
      setIsLoadingPasses(false);
    }
  };

  const handleLookupPasses = async () => {
    const clean = customerPhone.replace(/\D/g, '');
    if (clean.length < 7) {
      toast.error('Please enter a valid mobile number');
      return;
    }
    const fullPhone = passCountryCode === '+91' ? clean : `${passCountryCode}${clean}`;

    setIsLoadingPasses(true);
    try {
      // 1. Verify if the entered number matches the currently stored customer token
      const res = await customerService.verifyMobile(fullPhone, shopId);

      if (res.otp_required === false) {
        // Token is valid & matches! Directly fetch passes
        await fetchCustomerPasses(fullPhone);
      } else {
        // Token does NOT match or is missing -> prompt OTP verification modal
        localStorage.setItem('pending_otp_verification', JSON.stringify({
          shopId,
          mobileNumber: clean.slice(-10),
          countryCode: passCountryCode,
          timestamp: Date.now()
        }));
        setShowOtpModal(true);
      }
    } catch (err: any) {
      console.error('Failed to verify mobile token', err);
      // Fallback: prompt OTP modal
      localStorage.setItem('pending_otp_verification', JSON.stringify({
        shopId,
        mobileNumber: clean.slice(-10),
        countryCode: passCountryCode,
        timestamp: Date.now()
      }));
      setShowOtpModal(true);
    } finally {
      setIsLoadingPasses(false);
    }
  };

  const basePrice = selectedSchemeForJoin ? selectedSchemeForJoin.price : 0;
  const platformFee = Math.round(basePrice * 0.02 * 100) / 100;
  const pgFee = Math.round(basePrice * 0.03 * 100) / 100;
  const pgGst = Math.round(pgFee * 0.18 * 100) / 100;
  const totalPgFee = Math.round((pgFee + pgGst) * 100) / 100;
  const grandTotal = Math.round((basePrice + platformFee + totalPgFee) * 100) / 100;

  // Installment payment calculations
  const installmentBasePrice = payingPass ? payingPass.pass.price : 0;
  const instPlatformFee = Math.round(installmentBasePrice * 0.02 * 100) / 100;
  const instPgFee = Math.round(installmentBasePrice * 0.03 * 100) / 100;
  const instPgGst = Math.round(instPgFee * 0.18 * 100) / 100;
  const instTotalPgFee = Math.round((instPgFee + instPgGst) * 100) / 100;
  const instGrandTotal = Math.round((installmentBasePrice + instPlatformFee + instTotalPgFee) * 100) / 100;

  const handlePayInstallmentSubmit = async () => {
    if (!payingPass) return;
    const { pass } = payingPass;
    const nextDueNum = pass.paid_installments + 1;

    setIsPayingInstallment(true);
    try {
      const sdkLoaded = await loadRazorpaySDK();
      if (!sdkLoaded) {
        toast.error('Could not load payment gateway. Please check your internet connection.');
        setIsPayingInstallment(false);
        return;
      }

      const payData = await schemeService.initiateMemberInstallmentPayment(
        shopId,
        pass.scheme_id,
        pass.member_id
      );

      const onPaymentDone = (updatedPass: CustomerSchemePass) => {
        triggerHaptic(HAPTIC_PATTERNS.successUnlock);
        confetti({
          particleCount: 110,
          spread: 75,
          origin: { y: 0.6 },
          colors: [primaryColor, '#22c55e', '#eab308', '#3b82f6'],
          zIndex: 99999
        });
        toast.success(`Payment verified! Due #${nextDueNum} is now marked as PAID.`);
        setPayingPass(null);

        // Update customerPasses state with new pass info
        setCustomerPasses(prev => prev.map(p => p.member_id === updatedPass.member_id ? updatedPass : p));
      };

      if (payData.mock_mode) {
        const updated = await schemeService.verifyMemberInstallmentPayment(
          shopId,
          pass.scheme_id,
          pass.member_id,
          {
            customer_name: pass.customer_name,
            customer_phone: pass.customer_phone,
            razorpay_order_id: payData.razorpay_order_id,
            razorpay_payment_id: `pay_inst_${Date.now()}`,
            razorpay_signature: 'mock_signature',
          }
        );
        onPaymentDone(updated);
        return;
      }

      const rzpOptions = {
        key: payData.razorpay_key,
        amount: payData.amount,
        currency: payData.currency || 'INR',
        name: shop?.name || 'Savings Scheme',
        description: `${pass.scheme_title} - Due #${nextDueNum} Installment | Total: ${currency}${payData.grand_total}`,
        order_id: payData.razorpay_order_id,
        handler: async (response: any) => {
          try {
            setIsPayingInstallment(true);
            const updated = await schemeService.verifyMemberInstallmentPayment(
              shopId,
              pass.scheme_id,
              pass.member_id,
              {
                customer_name: pass.customer_name,
                customer_phone: pass.customer_phone,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }
            );
            onPaymentDone(updated);
          } catch (err: any) {
            console.error('Installment verification failed', err);
            toast.error(err.response?.data?.detail || 'Installment payment verification failed.');
          } finally {
            setIsPayingInstallment(false);
          }
        },
        prefill: {
          name: pass.customer_name,
          contact: pass.customer_phone.replace(/\D/g, '').slice(-10),
        },
        theme: { color: primaryColor },
        modal: {
          ondismiss: () => {
            toast.error('Payment was cancelled.');
            setIsPayingInstallment(false);
          }
        }
      };

      const rzp = new (window as any).Razorpay(rzpOptions);
      rzp.open();
    } catch (err: any) {
      console.error('Failed to initiate installment payment', err);
      toast.error(err.response?.data?.detail || 'Could not initiate installment payment.');
    } finally {
      setIsPayingInstallment(false);
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchemeForJoin) return;

    const token = localStorage.getItem('customer_token');
    const cleanPhone = joinPhone.replace(/\D/g, '');
    if (!token || cleanPhone.length < 7) {
      setPendingEnrollScheme(selectedSchemeForJoin);
      setOtpModalStep('mobile');
      setShowOtpModal(true);
      toast.error('Please verify your mobile number with OTP first.');
      return;
    }

    if (!joinName.trim()) {
      toast.error('Please enter your full name');
      return;
    }

    const finalPhone = joinCountryCode === '+91' ? cleanPhone : `${joinCountryCode}${cleanPhone}`;
    const effectiveDistrict = joinDistrict === 'Other / Custom District' ? customDistrict.trim() : joinDistrict.trim();
    if (!effectiveDistrict) {
      toast.error('Please specify your district or city');
      return;
    }

    const addressParts = [
      joinStreet.trim(),
      effectiveDistrict,
      joinState.trim() ? (joinPincode.trim() ? `${joinState.trim()} - ${joinPincode.trim()}` : joinState.trim()) : joinPincode.trim()
    ].filter(Boolean);
    const fullAddress = addressParts.join(', ');

    const onEnrollmentSuccess = (phone: string) => {
      // Save customer info in localStorage
      localStorage.setItem('customer_name', joinName.trim());
      localStorage.setItem('customer_country_code', joinCountryCode);
      localStorage.setItem('customer_mobile', cleanPhone);
      localStorage.setItem('customer_phone', cleanPhone);
      if (joinStreet.trim()) localStorage.setItem('customer_street', joinStreet.trim());
      if (effectiveDistrict) localStorage.setItem('customer_district', effectiveDistrict);
      if (joinState.trim()) localStorage.setItem('customer_state', joinState.trim());
      if (joinPincode.trim()) localStorage.setItem('customer_pincode', joinPincode.trim());
      if (fullAddress) localStorage.setItem('customer_address', fullAddress);

      setCustomerPhone(phone);

      // Trigger Confetti & Haptic
      triggerHaptic(HAPTIC_PATTERNS.successUnlock);
      confetti({
        particleCount: 120,
        spread: 85,
        origin: { y: 0.6 },
        colors: [primaryColor, '#eab308', '#22c55e', '#3b82f6', '#ec4899'],
        zIndex: 99999
      });

      toast.success(`Payment verified! Congratulations on joining ${selectedSchemeForJoin.title}!`);
      setSelectedSchemeForJoin(null);
      setActiveTab('my_pass');
      fetchCustomerPasses(phone);
    };

    setIsJoining(true);
    try {
      const sdkLoaded = await loadRazorpaySDK();
      if (!sdkLoaded) {
        toast.error('Could not load payment gateway. Please check your internet connection.');
        setIsJoining(false);
        return;
      }

      // 1. Create Razorpay order via backend with 2% platform fee & 3% PG fee (+18% GST)
      const payData = await schemeService.initiateJoinPayment(shopId, selectedSchemeForJoin.id, {
        customer_name: joinName.trim(),
        customer_phone: finalPhone,
        customer_address: fullAddress || undefined,
      });

      // 2. Mock mode handling
      if (payData.mock_mode) {
        await schemeService.verifyJoinPayment(shopId, selectedSchemeForJoin.id, {
          customer_name: joinName.trim(),
          customer_phone: finalPhone,
          customer_address: fullAddress || undefined,
          razorpay_order_id: payData.razorpay_order_id,
          razorpay_payment_id: `pay_mock_${Date.now()}`,
          razorpay_signature: 'mock_signature',
        });
        onEnrollmentSuccess(finalPhone);
        return;
      }

      // 3. Open standard Razorpay Checkout
      const rzpOptions = {
        key: payData.razorpay_key,
        amount: payData.amount,
        currency: payData.currency || 'INR',
        name: shop?.name || 'Savings Scheme',
        description: `${selectedSchemeForJoin.title} - 1st Installment | Total: ${currency}${payData.grand_total}`,
        order_id: payData.razorpay_order_id,
        handler: async (response: any) => {
          try {
            setIsJoining(true);
            await schemeService.verifyJoinPayment(shopId, selectedSchemeForJoin.id, {
              customer_name: joinName.trim(),
              customer_phone: finalPhone,
              customer_address: fullAddress || undefined,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            onEnrollmentSuccess(finalPhone);
          } catch (verifyErr: any) {
            console.error('Payment verification failed', verifyErr);
            toast.error(verifyErr.response?.data?.detail || 'Payment verification failed. Please contact store.');
          } finally {
            setIsJoining(false);
          }
        },
        prefill: {
          name: joinName.trim(),
          contact: cleanPhone,
        },
        theme: { color: primaryColor },
        modal: {
          ondismiss: () => {
            toast.error('Payment was not completed. You can complete enrollment anytime.');
            setIsJoining(false);
          }
        }
      };

      const rzp = new (window as any).Razorpay(rzpOptions);
      rzp.open();
    } catch (err: any) {
      console.error('Payment initiation failed', err);
      toast.error(err.response?.data?.detail || 'Failed to initiate payment. Please try again.');
      setIsJoining(false);
    }
  };

  if (!isOpen) return null;

  const modalInner = (
    <div className={`bg-card w-full ${isFullPage ? 'max-w-xl shadow-xl' : 'max-w-lg shadow-2xl max-h-[90vh]'} rounded-3xl border border-border overflow-hidden flex flex-col`}>
      {/* Header with gradient bar */}
      <div 
        className="p-4 sm:p-5 text-white relative flex items-center justify-between shrink-0"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}, #eab308)`
        }}
      >
        <div className="flex items-center gap-3">
          {isFullPage && (
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-black/20 hover:bg-black/30 text-white text-xs font-bold transition-all cursor-pointer shrink-0"
              title="Back to Menu"
            >
              <ChevronLeft size={16} />
              <span>Back</span>
            </button>
          )}
          <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-inner shrink-0">
            <Coins size={22} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="font-black text-lg tracking-tight leading-none text-white drop-shadow-xs">
                Savings Schemes
              </h2>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white/25 text-white backdrop-blur-sm uppercase">
                Fund
              </span>
            </div>
            <p className="text-[11px] text-white/90 font-medium mt-1">
              Save weekly or monthly and get rewarded with exclusive gifts!
            </p>
          </div>
        </div>

        {!isFullPage && (
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/30 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        )}
      </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-border bg-muted/40 p-1.5 gap-1.5 shrink-0">
          <button
            onClick={() => {
              setActiveTab('schemes');
              setSelectedSchemeForJoin(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'schemes'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Gift size={14} style={{ color: activeTab === 'schemes' ? primaryColor : undefined }} />
            <span>Available Schemes</span>
          </button>

          <button
            onClick={() => setActiveTab('my_pass')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 relative ${
              activeTab === 'my_pass'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Coins size={14} style={{ color: activeTab === 'my_pass' ? primaryColor : undefined }} />
            <span>My Scheme Pass</span>
            {customerPasses.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </button>
        </div>

        {/* Body content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
          {/* TAB 1: AVAILABLE SCHEMES LIST OR JOIN FORM */}
          {activeTab === 'schemes' && (
            <div>
              {selectedSchemeForJoin ? (
                /* JOIN SCHEME FORM */
                <form onSubmit={handleJoinSubmit} className="space-y-4">
                  <button
                    type="button"
                    onClick={() => setSelectedSchemeForJoin(null)}
                    className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <span>← Back to schemes</span>
                  </button>

                  <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 block">
                      Joining Scheme
                    </span>
                    <h3 className="font-black text-base text-foreground">{selectedSchemeForJoin.title}</h3>
                    <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                      <span className="bg-card px-2.5 py-1 rounded-lg border border-border shadow-2xs font-mono">
                        {currency}{selectedSchemeForJoin.price.toLocaleString()} / {selectedSchemeForJoin.frequency === 'weekly' ? 'week' : 'month'}
                      </span>
                      <span className="bg-card px-2.5 py-1 rounded-lg border border-border shadow-2xs">
                        Duration: {selectedSchemeForJoin.term_duration} {selectedSchemeForJoin.term_unit}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">
                        Your Full Name *
                      </label>
                      <div className="relative">
                        <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="text"
                          required
                          readOnly
                          placeholder="Your Name"
                          value={joinName}
                          className="w-full pl-9 pr-3 py-2.5 bg-muted/40 border border-border rounded-xl text-foreground font-semibold focus:outline-hidden text-xs cursor-not-allowed select-none"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-slate-700 dark:text-slate-200 block text-xs">
                          Mobile Number *
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            <ShieldCheck size={11} />
                            Verified
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              localStorage.removeItem('pending_otp_verification');
                              setPendingEnrollScheme(selectedSchemeForJoin);
                              setOtpModalStep('mobile');
                              setShowOtpModal(true);
                            }}
                            className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                          >
                            Change
                          </button>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="w-[110px] shrink-0">
                          <SearchableSelect
                            options={COUNTRY_CODES.map(c => ({
                              id: c.code,
                              name: `${c.flag} ${c.code}`,
                              subtext: c.country
                            }))}
                            value={joinCountryCode}
                            onChange={(val) => setJoinCountryCode(val)}
                            placeholder="+91"
                            showSearch={false}
                            className="w-full text-xs pointer-events-none opacity-80"
                          />
                        </div>
                        <div className="relative flex-1">
                          <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                          <input
                            type="tel"
                            required
                            readOnly
                            maxLength={joinCountryCode === '+91' ? 10 : 15}
                            placeholder={joinCountryCode === '+91' ? 'e.g. 9876543210' : 'Mobile number'}
                            value={joinPhone}
                            className="w-full pl-9 pr-3 py-2.5 bg-muted/40 border border-border rounded-xl text-foreground font-mono focus:outline-hidden text-xs cursor-not-allowed select-none"
                          />
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-0.5 block">
                        Verified mobile number linked to your scheme pass. Tap "Change" to use a different number.
                      </span>
                    </div>

                    {/* Full Delivery Address */}
                    <div className="p-3.5 rounded-2xl bg-muted/20 border border-border/80 space-y-3 text-left">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                        <MapPin size={14} className="text-amber-500" />
                        <span>Delivery & Dispatch Address</span>
                      </div>

                      {/* State and District */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1 text-[11px]">
                            State *
                          </label>
                          <SearchableSelect
                            options={INDIAN_STATES.map(s => ({ id: s, name: s }))}
                            value={joinState}
                            onChange={(val) => {
                              setJoinState(val);
                              const dists = DISTRICTS_BY_STATE[val] || ['Other / Custom District'];
                              setJoinDistrict(dists[0]);
                            }}
                            placeholder="Select State"
                            showSearch={true}
                            className="w-full text-xs"
                          />
                        </div>

                        <div>
                          <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1 text-[11px]">
                            District / City *
                          </label>
                          <SearchableSelect
                            options={(DISTRICTS_BY_STATE[joinState] || ['Other / Custom District']).map(d => ({ id: d, name: d }))}
                            value={joinDistrict}
                            onChange={(val) => setJoinDistrict(val)}
                            placeholder="Select District"
                            showSearch={true}
                            className="w-full text-xs"
                          />
                        </div>
                      </div>

                      {joinDistrict === 'Other / Custom District' && (
                        <div>
                          <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1 text-[11px]">
                            Specify District / City Name *
                          </label>
                          <div className="relative">
                            <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input
                              type="text"
                              required
                              placeholder="Enter your district name"
                              value={customDistrict}
                              onChange={(e) => setCustomDistrict(e.target.value)}
                              className="w-full pl-8 pr-3 py-2 bg-background border border-border rounded-xl text-foreground focus:outline-hidden text-xs"
                            />
                          </div>
                        </div>
                      )}

                      {/* Full Street Address */}
                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1 text-[11px]">
                          Full Address (Door No, Building, Street, Area) *
                        </label>
                        <textarea
                          rows={2}
                          required
                          placeholder="e.g. 12/4, Gandhi Road, Near Bus Stand"
                          value={joinStreet}
                          onChange={(e) => setJoinStreet(e.target.value)}
                          className="w-full px-3 py-2 bg-background border border-border rounded-xl text-foreground focus:outline-hidden text-xs resize-none"
                        />
                      </div>

                      {/* Pincode */}
                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1 text-[11px]">
                          Pincode / Postal Code (Optional)
                        </label>
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="e.g. 626123"
                          value={joinPincode}
                          onChange={(e) => setJoinPincode(e.target.value.replace(/\D/g, ''))}
                          className="w-full px-3 py-2 bg-background border border-border rounded-xl text-foreground font-mono focus:outline-hidden text-xs"
                        />
                      </div>
                    </div>

                    {/* RAZORPAY CENTRALIZED COMMISSIONS & PAYMENT SECTION */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-500/5 via-primary/5 to-muted/30 border border-border space-y-3.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                            <CreditCard size={16} />
                          </div>
                          <div>
                            <h4 className="font-black text-xs text-foreground">1st Installment Payment</h4>
                            <p className="text-[10px] text-muted-foreground">Secure & encrypted checkout</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                          <ShieldCheck size={12} />
                          <span>Instant Pass Activation</span>
                        </div>
                      </div>

                      {/* Itemized Fee Breakdown */}
                      <div className="bg-card border border-border/80 rounded-xl p-3.5 space-y-2 text-xs shadow-2xs">
                        <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                          <span>1st Installment (To Shop)</span>
                          <span className="font-mono font-bold text-foreground">{currency}{basePrice.toLocaleString()}</span>
                        </div>

                        <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                          <span>Platform Fee</span>
                          <span className="font-mono text-foreground">{currency}{platformFee.toFixed(2)}</span>
                        </div>

                        <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                          <span>Payment Gateway Fee</span>
                          <span className="font-mono text-foreground">{currency}{totalPgFee.toFixed(2)}</span>
                        </div>

                        <div className="border-t border-border/80 pt-2.5 flex justify-between items-center">
                          <div>
                            <span className="font-black text-foreground block">Total Amount to Pay</span>
                            <span className="text-[9px] text-muted-foreground">Includes all platform & PG charges</span>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-black text-base" style={{ color: primaryColor }}>
                              {currency}{grandTotal.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Payment Methods Supported Banner */}
                      <div className="flex items-center justify-between px-2.5 py-2 rounded-xl bg-muted/40 border border-border/50 text-[10px] text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Lock size={12} className="text-emerald-500 shrink-0" />
                          <span>256-bit SSL encrypted</span>
                        </div>
                        <span className="font-bold text-foreground">UPI • Cards • NetBanking</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isJoining}
                      className="w-full py-3.5 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50 text-sm"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <Lock size={15} />
                      <span>{isJoining ? 'Processing...' : `Confirm & Pay ${currency}${grandTotal.toFixed(2)}`}</span>
                      <ArrowRight size={16} />
                    </button>
                    <p className="text-[10px] text-center text-muted-foreground mt-2">
                      Clicking confirm opens secure checkout. Your scheme pass will be unlocked immediately after payment.
                    </p>
                  </div>
                </form>
              ) : (
                /* SCHEMES LIST */
                <div className="space-y-4">
                  {isLoading ? (
                    <div className="space-y-3">
                      {[1, 2].map(i => (
                        <div key={i} className="h-44 bg-muted animate-pulse rounded-2xl" />
                      ))}
                    </div>
                  ) : schemes.length === 0 ? (
                    <div className="text-center py-10 space-y-2">
                      <Coins size={36} className="mx-auto text-muted-foreground/40" />
                      <p className="text-xs text-muted-foreground">No active schemes available at the moment.</p>
                    </div>
                  ) : (
                    schemes.map(scheme => {
                      return (
                        <div
                          key={scheme.id}
                          className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-xs hover:border-amber-500/40 transition-all space-y-3.5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-black text-base text-foreground">{scheme.title}</h3>
                              </div>
                              {scheme.description && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{scheme.description}</p>
                              )}
                            </div>

                            <div className="text-right shrink-0">
                              <span className="font-mono font-black text-lg block" style={{ color: primaryColor }}>
                                {currency}{scheme.price.toLocaleString()}
                              </span>
                              <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                per {scheme.frequency === 'weekly' ? 'week' : 'month'}
                              </span>
                            </div>
                          </div>

                          <div className="bg-muted/50 p-2.5 rounded-xl flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Duration:</span>
                            <span className="font-bold text-foreground">{scheme.term_duration} {scheme.term_unit}</span>
                          </div>

                          {/* Included products count & preview */}
                          {scheme.items && scheme.items.length > 0 && (
                            <div className="flex items-center justify-between p-2.5 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 rounded-xl">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                                  <Gift size={13} />
                                </div>
                                <span className="text-[11px] font-bold text-amber-950 dark:text-amber-200 truncate">
                                  {scheme.items.length} Reward {scheme.items.length === 1 ? 'Product' : 'Products'}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewRewardsScheme({ title: scheme.title, items: scheme.items });
                                }}
                                className="px-2.5 py-1 bg-white dark:bg-slate-900 hover:bg-amber-100/50 text-amber-700 dark:text-amber-300 font-extrabold text-[10px] rounded-lg border border-amber-300 dark:border-amber-700/60 shadow-2xs transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
                              >
                                View Rewards
                              </button>
                            </div>
                          )}

                          <button
                            onClick={() => handleEnrollClick(scheme)}
                            className="w-full py-2.5 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 text-xs hover:brightness-110"
                            style={{ backgroundColor: primaryColor }}
                          >
                            <span>Enroll in Scheme</span>
                            <ArrowRight size={14} />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MY SCHEME PASS */}
          {activeTab === 'my_pass' && (
            <div className="space-y-4">
              {/* Sleek Top Banner */}
              <div className="bg-muted/40 border border-border/80 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20 font-bold text-xs">
                    {displayName ? displayName.charAt(0).toUpperCase() : <User size={16} />}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Member Pass
                    </span>
                    <h4 className="font-black text-foreground text-xs sm:text-sm truncate">
                      {displayName || (customerPhone ? `+91 ${customerPhone}` : 'Scheme Member')}
                    </h4>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleChangeAccount}
                  className="text-xs font-extrabold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:underline px-2.5 py-1 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer shrink-0"
                >
                  Change
                </button>
              </div>

              {/* Passes List */}
              {isLoadingPasses ? (
                <div className="p-8 text-center text-xs text-muted-foreground">Checking your passes...</div>
              ) : hasQueriedPasses && customerPasses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground space-y-2">
                  <ShieldCheck size={32} className="mx-auto text-muted-foreground/40" />
                  <p className="text-xs">No active schemes found for mobile number {customerPhone}.</p>
                  <button
                    onClick={() => setActiveTab('schemes')}
                    className="text-xs font-bold underline"
                    style={{ color: primaryColor }}
                  >
                    Browse available schemes to join
                  </button>
                </div>
              ) : (
                customerPasses.map(pass => {
                  const percent = Math.round((pass.paid_installments / pass.total_installments) * 100);
                  const isCompleted = pass.status === 'completed' || pass.paid_installments >= pass.total_installments;

                  return (
                    <div
                      key={pass.member_id}
                      className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-base text-foreground">{pass.scheme_title}</h3>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono">
                              {pass.member_number || 'SCH-001'}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Member: <strong className="text-foreground">{pass.customer_name}</strong> ({pass.customer_phone})
                          </p>
                        </div>

                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full capitalize ${
                          pass.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}>
                          {pass.status}
                        </span>
                      </div>

                      {/* Progress summary & Remaining indicator */}
                      <div className="bg-muted/50 p-3 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-foreground">
                            {pass.paid_installments} of {pass.total_installments} Installments Paid
                          </span>
                          <span className="font-black text-emerald-600 dark:text-emerald-400">
                            {percent}% Complete
                          </span>
                        </div>

                        <div className="w-full bg-border h-2 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${percent}%`, backgroundColor: primaryColor }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-1">
                          <span className="text-muted-foreground font-mono">
                            Paid: {currency}{(pass.paid_installments * pass.price).toLocaleString()}
                          </span>
                          <span className="font-bold text-amber-600 dark:text-amber-400">
                            ⏳ {pass.remaining_installments} {pass.frequency === 'weekly' ? 'weeks' : 'months'} remaining
                          </span>
                        </div>
                      </div>

                      {/* Installment History Grid */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                            Installments Breakdown
                          </span>
                          {!isCompleted && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                              Tap due to pay next pending (Due #{pass.paid_installments + 1})
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-56 overflow-y-auto custom-scrollbar p-1">
                          {pass.installment_schedule.map(inst => {
                            const isNextDue = !inst.is_paid && inst.installment_number === pass.paid_installments + 1;
                            const isFutureDue = !inst.is_paid && inst.installment_number > pass.paid_installments + 1;

                            return (
                              <button
                                key={inst.installment_number}
                                type="button"
                                disabled={inst.is_paid || isCompleted}
                                onClick={() => {
                                  if (!inst.is_paid && !isCompleted) {
                                    setPayingPass({ pass, targetClickedNum: inst.installment_number });
                                  }
                                }}
                                className={`p-2 rounded-xl text-center border text-[10px] font-semibold flex flex-col items-center justify-center transition-all ${
                                  inst.is_paid
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50 cursor-default'
                                    : isCompleted
                                      ? 'bg-muted/30 text-muted-foreground border-border opacity-60 cursor-not-allowed'
                                      : isNextDue
                                        ? 'bg-amber-500/10 text-amber-700 border-amber-400 dark:text-amber-300 dark:border-amber-600/70 shadow-2xs hover:scale-102 hover:bg-amber-500/20 cursor-pointer ring-1 ring-amber-500/30'
                                        : 'bg-background text-slate-600 border-border dark:text-slate-400 hover:border-amber-400/60 hover:bg-muted/50 cursor-pointer'
                                }`}
                              >
                                <div className="flex items-center gap-1 mb-0.5">
                                  {inst.is_paid ? (
                                    <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                                  ) : isNextDue ? (
                                    <CreditCard size={12} className="text-amber-500 shrink-0 animate-pulse" />
                                  ) : (
                                    <Clock size={12} className="text-slate-400 shrink-0" />
                                  )}
                                  <span className="font-bold">#{inst.installment_number}</span>
                                </div>

                                <span className="text-[9px] font-mono font-bold">
                                  {inst.is_paid ? 'PAID' : isNextDue ? 'PAY NOW' : 'DUE'}
                                </span>

                                {inst.is_paid && inst.paid_at && (
                                  <span className="text-[8px] text-emerald-700 dark:text-emerald-300 font-mono mt-0.5 leading-tight block text-center opacity-90">
                                    {formatPaidDateTime(inst.paid_at)}
                                  </span>
                                )}
                                {!inst.is_paid && !isCompleted && isFutureDue && (
                                  <span className="text-[7.5px] text-muted-foreground mt-0.5">
                                    Pays #{pass.paid_installments + 1}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Pay Next Due Installment Button or Scheme Completed Status */}
                      {pass.paid_installments < pass.total_installments && pass.status !== 'completed' ? (
                        <button
                          type="button"
                          onClick={() => setPayingPass({ pass, targetClickedNum: pass.paid_installments + 1 })}
                          className="w-full py-2.5 px-3 rounded-xl text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all hover:brightness-110"
                          style={{ backgroundColor: primaryColor }}
                        >
                          <CreditCard size={14} />
                          <span>Pay Next Due Installment #{pass.paid_installments + 1} ({currency}{pass.price.toLocaleString()})</span>
                          <ArrowRight size={14} />
                        </button>
                      ) : (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl text-center text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5">
                          <CheckCircle2 size={14} />
                          <span>Scheme Completed! All {pass.total_installments} installments have been fully paid.</span>
                        </div>
                      )}

                      {/* Reward Products reminder */}
                      {pass.items && pass.items.length > 0 && (
                        <div 
                          onClick={() => setSelectedPassForRewards(pass)}
                          className="bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 p-2.5 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-all group active:scale-99"
                        >
                          <span className="font-bold text-foreground flex items-center gap-1.5 text-[11px]">
                            <Gift size={13} className="text-amber-500 group-hover:scale-110 transition-transform" />
                            <span>Gift Box: {pass.items.length} items rewarded</span>
                          </span>
                          <span className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold underline group-hover:text-amber-800 flex items-center gap-1">
                            <span>View Rewards</span>
                            <ChevronRight size={12} />
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* INSTALLMENT PAYMENT MODAL */}
        <AnimatePresence>
          {payingPass && (
            <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border p-5 space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                      <CreditCard size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-foreground">Pay Scheme Installment</h4>
                      <span className="text-[10px] text-muted-foreground">{payingPass.pass.scheme_title}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPayingPass(null)}
                    className="w-7 h-7 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground flex items-center justify-center cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Member and Target Due Info */}
                <div className="bg-muted/40 p-3 rounded-xl space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Member:</span>
                    <span className="font-bold text-foreground">{payingPass.pass.customer_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pass Number:</span>
                    <span className="font-mono font-bold text-foreground">{payingPass.pass.member_number || 'SCH-001'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Installment Target:</span>
                    <span className="font-black text-amber-600 dark:text-amber-400 font-mono">
                      Due #{payingPass.pass.paid_installments + 1}
                    </span>
                  </div>
                </div>

                {/* Sequential allocation reminder if they selected a future due */}
                {payingPass.targetClickedNum > payingPass.pass.paid_installments + 1 && (
                  <div className="bg-blue-500/10 border border-blue-500/20 p-2.5 rounded-xl text-[11px] text-blue-700 dark:text-blue-300 flex items-start gap-2">
                    <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
                    <span>
                      You tapped <strong>Due #{payingPass.targetClickedNum}</strong>. Installments must be cleared sequentially, so this payment is automatically allocated to your next pending installment: <strong>Due #{payingPass.pass.paid_installments + 1}</strong>.
                    </span>
                  </div>
                )}

                {/* Fee Breakdown */}
                <div className="bg-background border border-border p-3.5 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Installment Amount ({payingPass.pass.frequency})</span>
                    <span className="font-mono font-semibold text-foreground">{currency}{installmentBasePrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground text-[11px]">
                    <span>Platform Fee</span>
                    <span className="font-mono">{currency}{instPlatformFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground text-[11px]">
                    <span>Payment Gateway Fee</span>
                    <span className="font-mono">{currency}{instTotalPgFee.toFixed(2)}</span>
                  </div>
                  <div className="pt-2 border-t border-border/80 flex justify-between items-center font-bold text-sm text-foreground">
                    <span>Total Payable</span>
                    <span className="font-mono text-base" style={{ color: primaryColor }}>
                      {currency}{instGrandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setPayingPass(null)}
                    className="flex-1 py-2.5 rounded-xl border border-border text-xs font-semibold hover:bg-muted cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handlePayInstallmentSubmit}
                    disabled={isPayingInstallment}
                    className="flex-2 py-2.5 rounded-xl text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all disabled:opacity-50 hover:brightness-110"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Lock size={14} />
                    <span>{isPayingInstallment ? 'Processing...' : `Confirm & Pay ${currency}${instGrandTotal.toFixed(2)}`}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
    </div>
  );

  if (isFullPage) {
    return (
      <div className="min-h-screen w-full bg-slate-50/70 dark:bg-slate-950 text-foreground flex flex-col">
        {/* Full-width Sticky Top Navigation Bar */}
        <header className="sticky top-0 z-30 w-full bg-card/95 backdrop-blur-md border-b border-border shadow-xs">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
            {/* Top Bar Row */}
            <div className="h-14 sm:h-16 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-border bg-background hover:bg-muted text-foreground text-xs font-bold transition-all cursor-pointer shadow-2xs shrink-0"
                  title="Back to Menu"
                >
                  <ChevronLeft size={16} />
                  <span className="hidden xs:inline">Back to </span>
                  <span>Menu</span>
                </button>
                <div className="h-5 w-px bg-border hidden sm:block shrink-0" />
                <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                  <div
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-white font-bold shadow-xs shrink-0"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Coins size={17} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <h1 className="font-extrabold text-xs sm:text-base text-foreground leading-tight truncate">
                        {shop?.name || 'Savings Schemes'}
                      </h1>
                      <span className="text-[9px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                        Fund
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground hidden sm:block">
                      Official Customer Savings & Festival Gift Schemes
                    </p>
                  </div>
                </div>
              </div>

              {/* Desktop Navigation Tabs (Hidden on mobile) */}
              <div className="hidden md:flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/60 shrink-0">
                <button
                  onClick={() => {
                    setActiveTab('schemes');
                    setSelectedSchemeForJoin(null);
                  }}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'schemes'
                      ? 'bg-card text-foreground shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Gift size={13} style={{ color: activeTab === 'schemes' ? primaryColor : undefined }} />
                  <span>Available Schemes</span>
                </button>

                <button
                  onClick={() => setActiveTab('my_pass')}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 relative ${
                    activeTab === 'my_pass'
                      ? 'bg-card text-foreground shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Coins size={13} style={{ color: activeTab === 'my_pass' ? primaryColor : undefined }} />
                  <span>My Scheme Pass</span>
                  {customerPasses.length > 0 && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  )}
                </button>
              </div>
            </div>

            {/* Mobile Navigation Tabs Bar (Visible only on < md, full-width segmented control) */}
            <div className="pb-2.5 pt-0.5 md:hidden">
              <div className="grid grid-cols-2 gap-1 bg-muted/60 p-1 rounded-xl border border-border/60 w-full">
                <button
                  onClick={() => {
                    setActiveTab('schemes');
                    setSelectedSchemeForJoin(null);
                  }}
                  className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'schemes'
                      ? 'bg-card text-foreground shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Gift size={13} style={{ color: activeTab === 'schemes' ? primaryColor : undefined }} />
                  <span>Available Schemes</span>
                </button>

                <button
                  onClick={() => setActiveTab('my_pass')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 relative ${
                    activeTab === 'my_pass'
                      ? 'bg-card text-foreground shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Coins size={13} style={{ color: activeTab === 'my_pass' ? primaryColor : undefined }} />
                  <span>My Scheme Pass</span>
                  {customerPasses.length > 0 && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Banner when viewing all available schemes */}
        {activeTab === 'schemes' && !selectedSchemeForJoin && (
          <div className="w-full bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-b border-amber-500/20 py-5 sm:py-8 px-3 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6">
              <div className="space-y-1.5 sm:space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] sm:text-xs font-bold">
                  <Coins size={13} className="text-amber-500" />
                  <span>Customer Savings Program</span>
                </div>
                <h2 className="text-xl sm:text-3xl font-black text-foreground tracking-tight leading-snug">
                  Save Small. Celebrate Big.
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Enroll in weekly or monthly savings schemes. Save conveniently, track your installments digitally, and collect guaranteed gift hampers, festival celebration boxes, or cakes upon completion!
                </p>
              </div>

              {/* 3 Value Pillars */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full md:w-auto shrink-0">
                <div className="bg-card/90 backdrop-blur-xs p-2.5 sm:p-3 rounded-2xl border border-border shadow-2xs text-center flex-1">
                  <ShieldCheck size={18} className="mx-auto text-emerald-500 mb-1" />
                  <span className="text-[10px] sm:text-[11px] font-bold block text-foreground leading-tight">Verified Pass</span>
                  <span className="text-[9px] text-muted-foreground hidden sm:block mt-0.5">Digital tracking</span>
                </div>
                <div className="bg-card/90 backdrop-blur-xs p-2.5 sm:p-3 rounded-2xl border border-border shadow-2xs text-center flex-1">
                  <Gift size={18} className="mx-auto text-amber-500 mb-1" />
                  <span className="text-[10px] sm:text-[11px] font-bold block text-foreground leading-tight">Bonus Gifts</span>
                  <span className="text-[9px] text-muted-foreground hidden sm:block mt-0.5">Guaranteed items</span>
                </div>
                <div className="bg-card/90 backdrop-blur-xs p-2.5 sm:p-3 rounded-2xl border border-border shadow-2xs text-center flex-1">
                  <CreditCard size={18} className="mx-auto text-blue-500 mb-1" />
                  <span className="text-[10px] sm:text-[11px] font-bold block text-foreground leading-tight">Easy UPI</span>
                  <span className="text-[9px] text-muted-foreground hidden sm:block mt-0.5">Instant activation</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-5 sm:py-8">
          {/* TAB 1: SCHEMES */}
          {activeTab === 'schemes' && (
            <div>
              {selectedSchemeForJoin ? (
                /* 2-COLUMN ENROLLMENT LAYOUT */
                <div className="max-w-5xl mx-auto">
                  <button
                    type="button"
                    onClick={() => setSelectedSchemeForJoin(null)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer mb-6 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted shadow-2xs transition-colors"
                  >
                    <ChevronLeft size={14} />
                    <span>Back to all schemes</span>
                  </button>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left Column: Scheme Summary Card */}
                    <div className="lg:col-span-5 bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-sm space-y-5 relative lg:sticky lg:top-24">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 block mb-1">
                          Selected Scheme
                        </span>
                        <h3 className="text-xl font-black text-foreground">{selectedSchemeForJoin.title}</h3>
                        {selectedSchemeForJoin.description && (
                          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{selectedSchemeForJoin.description}</p>
                        )}
                      </div>

                      <div className="bg-muted/40 p-4 rounded-2xl space-y-2 border border-border/60">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Installment:</span>
                          <span className="font-mono font-bold text-foreground">
                            {currency}{selectedSchemeForJoin.price.toLocaleString()} / {selectedSchemeForJoin.frequency === 'weekly' ? 'week' : 'month'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Term Duration:</span>
                          <span className="font-bold text-foreground">{selectedSchemeForJoin.term_duration} {selectedSchemeForJoin.term_unit}</span>
                        </div>
                        <div className="pt-2 border-t border-border/80 flex items-center justify-between text-xs">
                          <span className="font-bold text-foreground">Total Maturity Value:</span>
                          <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-sm">
                            {currency}{(selectedSchemeForJoin.price * selectedSchemeForJoin.term_duration).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Included Reward Products Count & View Action */}
                      {selectedSchemeForJoin.items && selectedSchemeForJoin.items.length > 0 && (
                        <div className="flex items-center justify-between p-3.5 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 rounded-2xl">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                              <Gift size={15} />
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-black text-amber-950 dark:text-amber-200 block truncate">
                                {selectedSchemeForJoin.items.length} Included Reward {selectedSchemeForJoin.items.length === 1 ? 'Product' : 'Products'}
                              </span>
                              <span className="text-[10px] text-amber-800/80 dark:text-amber-400/80 block">
                                Guaranteed upon completion
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPreviewRewardsScheme({ 
                              title: selectedSchemeForJoin.title, 
                              items: selectedSchemeForJoin.items 
                            })}
                            className="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-amber-100/50 text-amber-700 dark:text-amber-300 font-extrabold text-xs rounded-xl border border-amber-300 dark:border-amber-700/60 shadow-2xs transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
                          >
                            View Rewards
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Right Column: Enrollment Form */}
                    <div className="lg:col-span-7 bg-card border border-border rounded-3xl p-6 shadow-sm">
                      <form onSubmit={handleJoinSubmit} className="space-y-5">
                        <div>
                          <h4 className="text-lg font-black text-foreground">Enrollment & Delivery Details</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">Enter customer details to activate your digital pass</p>
                        </div>

                        <div className="space-y-4 text-xs">
                          <div>
                            <label className="font-bold text-foreground block mb-1.5">Your Full Name *</label>
                            <div className="relative">
                              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                              <input
                                type="text"
                                required
                                readOnly
                                placeholder="Your Name"
                                value={joinName}
                                className="w-full pl-9 pr-3.5 py-2.5 bg-muted/40 border border-border rounded-xl text-foreground font-semibold text-xs focus:outline-hidden cursor-not-allowed select-none"
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="font-bold text-foreground block text-xs">Mobile Number *</label>
                              <div className="flex items-center gap-2">
                                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                                  <ShieldCheck size={12} />
                                  Verified
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    localStorage.removeItem('pending_otp_verification');
                                    setPendingEnrollScheme(selectedSchemeForJoin);
                                    setOtpModalStep('mobile');
                                    setShowOtpModal(true);
                                  }}
                                  className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                                >
                                  Change
                                </button>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <div className="w-[120px] shrink-0">
                                <SearchableSelect
                                  options={COUNTRY_CODES.map(c => ({
                                    id: c.code,
                                    name: `${c.flag} ${c.code}`,
                                    subtext: c.country
                                  }))}
                                  value={joinCountryCode}
                                  onChange={(val) => setJoinCountryCode(val)}
                                  placeholder="+91"
                                  showSearch={false}
                                  className="w-full text-xs pointer-events-none opacity-80"
                                />
                              </div>
                              <div className="relative flex-1">
                                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input
                                  type="tel"
                                  required
                                  readOnly
                                  maxLength={joinCountryCode === '+91' ? 10 : 15}
                                  placeholder={joinCountryCode === '+91' ? 'e.g. 9876543210' : 'Mobile number'}
                                  value={joinPhone}
                                  className="w-full pl-9 pr-3.5 py-2.5 bg-muted/40 border border-border rounded-xl text-foreground font-mono text-xs focus:outline-hidden cursor-not-allowed select-none"
                                />
                              </div>
                            </div>
                            <span className="text-[10px] text-muted-foreground mt-1 block">
                              Verified mobile number linked to your scheme pass. Tap "Change" to use a different number.
                            </span>
                          </div>

                          {/* Full Delivery Address */}
                          <div className="p-4 rounded-2xl bg-muted/20 border border-border/80 space-y-3.5 text-left">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                              <MapPin size={15} className="text-amber-500" />
                              <span>Delivery & Dispatch Address (For Scheme Rewards)</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="font-bold text-foreground block mb-1 text-[11px]">State *</label>
                                <SearchableSelect
                                  options={INDIAN_STATES.map(s => ({ id: s, name: s }))}
                                  value={joinState}
                                  onChange={(val) => {
                                    setJoinState(val);
                                    const dists = DISTRICTS_BY_STATE[val] || [];
                                    setJoinDistrict(dists[0] || 'Other / Custom District');
                                  }}
                                  placeholder="Select State"
                                  showSearch={true}
                                  className="w-full text-xs"
                                />
                              </div>

                              <div>
                                <label className="font-bold text-foreground block mb-1 text-[11px]">District / City *</label>
                                <SearchableSelect
                                  options={(DISTRICTS_BY_STATE[joinState] || ['Other / Custom District']).map(d => ({ id: d, name: d }))}
                                  value={joinDistrict}
                                  onChange={(val) => setJoinDistrict(val)}
                                  placeholder="Select District"
                                  showSearch={true}
                                  className="w-full text-xs"
                                />
                              </div>
                            </div>

                            {joinDistrict === 'Other / Custom District' && (
                              <div>
                                <label className="font-bold text-foreground block mb-1 text-[11px]">Enter City / District Name *</label>
                                <input
                                  type="text"
                                  required
                                  placeholder="Type your district or city name"
                                  value={customDistrict}
                                  onChange={(e) => setCustomDistrict(e.target.value)}
                                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-foreground text-xs focus:outline-hidden focus:border-amber-500"
                                />
                              </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="sm:col-span-2">
                                <label className="font-bold text-foreground block mb-1 text-[11px]">Door / Street / Area Address *</label>
                                <input
                                  type="text"
                                  required
                                  placeholder="Door No, Street Name, Landmark"
                                  value={joinStreet}
                                  onChange={(e) => setJoinStreet(e.target.value)}
                                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-foreground text-xs focus:outline-hidden focus:border-amber-500"
                                />
                              </div>
                              <div>
                                <label className="font-bold text-foreground block mb-1 text-[11px]">Pincode *</label>
                                <input
                                  type="text"
                                  required
                                  maxLength={6}
                                  placeholder="6-digit pincode"
                                  value={joinPincode}
                                  onChange={(e) => setJoinPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-foreground font-mono text-xs focus:outline-hidden focus:border-amber-500"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Fee Breakdown */}
                          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-500/5 via-primary/5 to-muted/30 border border-border space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                  <CreditCard size={16} />
                                </div>
                                <div>
                                  <h4 className="font-bold text-xs text-foreground">1st Installment Payment</h4>
                                  <p className="text-[10px] text-muted-foreground">Secure & encrypted checkout</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                                <ShieldCheck size={12} />
                                <span>Instant Pass Activation</span>
                              </div>
                            </div>

                            <div className="bg-card border border-border/80 rounded-xl p-3.5 space-y-2 text-xs">
                              <div className="flex justify-between items-center text-muted-foreground">
                                <span>1st Installment (To Shop)</span>
                                <span className="font-mono font-bold text-foreground">{currency}{basePrice.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between items-center text-muted-foreground">
                                <span>Platform Fee</span>
                                <span className="font-mono text-foreground">{currency}{platformFee.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between items-center text-muted-foreground">
                                <span>Payment Gateway Fee</span>
                                <span className="font-mono text-foreground">{currency}{totalPgFee.toFixed(2)}</span>
                              </div>
                              <div className="border-t border-border pt-2.5 flex justify-between items-center">
                                <div>
                                  <span className="font-bold text-foreground block">Total Amount to Pay</span>
                                  <span className="text-[10px] text-muted-foreground">Includes all platform & PG charges</span>
                                </div>
                                <span className="font-mono font-black text-lg" style={{ color: primaryColor }}>
                                  {currency}{grandTotal.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="submit"
                            disabled={isJoining}
                            className="w-full py-3.5 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50 text-sm hover:brightness-110"
                            style={{ backgroundColor: primaryColor }}
                          >
                            <Lock size={15} />
                            <span>{isJoining ? 'Processing...' : `Confirm & Pay ${currency}${grandTotal.toFixed(2)}`}</span>
                            <ArrowRight size={16} />
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              ) : (
                /* RESPONSIVE 3-COLUMN SCHEMES GRID */
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5 sm:mb-6">
                    <div>
                      <h3 className="text-lg sm:text-xl font-black text-foreground">Available Savings Schemes</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Choose a scheme to begin your weekly or monthly savings plan</p>
                    </div>
                    <span className="text-[11px] sm:text-xs font-bold px-2.5 py-1 rounded-full bg-muted border border-border/60 self-start sm:self-center text-muted-foreground shrink-0">
                      {schemes.length} Scheme{schemes.length === 1 ? '' : 's'} Available
                    </span>
                  </div>

                  {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-64 bg-muted animate-pulse rounded-2xl sm:rounded-3xl" />
                      ))}
                    </div>
                  ) : schemes.length === 0 ? (
                    <div className="text-center py-16 sm:py-20 bg-card border border-dashed border-border rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-3">
                      <Coins size={40} className="mx-auto text-muted-foreground/40" />
                      <h4 className="text-base font-bold text-foreground">No Active Schemes Available</h4>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        This shop currently has no public savings schemes open for new enrollments. Please check back later.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      {schemes.map(scheme => {
                        const maturityVal = (scheme.price || 0) * (scheme.term_duration || 0);
                        return (
                          <div
                            key={scheme.id}
                            className="bg-card border border-border hover:border-amber-500/50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between group"
                          >
                            <div className="space-y-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
                                  <Coins size={22} />
                                </div>
                                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 uppercase tracking-wide border border-amber-300 dark:border-amber-700">
                                  {scheme.frequency === 'weekly' ? 'Weekly Scheme' : 'Monthly Scheme'}
                                </span>
                              </div>

                              <div>
                                <h4 className="text-base sm:text-lg font-black text-foreground group-hover:text-amber-500 transition-colors line-clamp-1">
                                  {scheme.title}
                                </h4>
                                {scheme.description && (
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                                    {scheme.description}
                                  </p>
                                )}
                              </div>

                              <div className="bg-muted/40 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl space-y-2 border border-border/60">
                                <div className="flex items-baseline justify-between">
                                  <span className="text-xs text-muted-foreground">Installment:</span>
                                  <div>
                                    <span className="font-mono font-black text-lg sm:text-xl" style={{ color: primaryColor }}>
                                      {currency}{scheme.price.toLocaleString()}
                                    </span>
                                    <span className="text-xs text-muted-foreground font-semibold"> / {scheme.frequency === 'weekly' ? 'week' : 'month'}</span>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">Term Duration:</span>
                                  <span className="font-bold text-foreground">{scheme.term_duration} {scheme.term_unit}</span>
                                </div>
                                <div className="pt-2 border-t border-border/80 flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground font-medium">Total Maturity:</span>
                                  <span className="font-mono font-black text-amber-600 dark:text-amber-400">
                                    {currency}{maturityVal.toLocaleString()}
                                  </span>
                                </div>
                              </div>

                              {/* Included Products Count & View Action */}
                              {scheme.items && scheme.items.length > 0 && (
                                <div className="flex items-center justify-between p-3 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 rounded-2xl">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                                      <Gift size={15} />
                                    </div>
                                    <div className="min-w-0">
                                      <span className="text-[11px] font-black text-amber-950 dark:text-amber-200 block truncate">
                                        {scheme.items.length} Reward {scheme.items.length === 1 ? 'Product' : 'Products'}
                                      </span>
                                      <span className="text-[10px] text-amber-800/80 dark:text-amber-400/80 block">
                                        Guaranteed upon completion
                                      </span>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPreviewRewardsScheme({ title: scheme.title, items: scheme.items });
                                    }}
                                    className="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-amber-100/50 text-amber-700 dark:text-amber-300 font-extrabold text-xs rounded-xl border border-amber-300 dark:border-amber-700/60 shadow-2xs transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
                                  >
                                    View Rewards
                                  </button>
                                </div>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleEnrollClick(scheme)}
                              className="w-full mt-5 sm:mt-6 py-3 text-white font-bold rounded-xl sm:rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 text-xs hover:brightness-110"
                              style={{ backgroundColor: primaryColor }}
                            >
                              <span>Enroll in Scheme</span>
                              <ArrowRight size={15} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MY SCHEME PASS */}
          {activeTab === 'my_pass' && (
            <div className="space-y-8">
              {/* Little Top Banner */}
              <div className="bg-card border border-border rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shrink-0 shadow-xs font-bold text-sm">
                    {displayName ? displayName.charAt(0).toUpperCase() : <User size={18} />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-foreground text-sm sm:text-base truncate">
                        {displayName || (customerPhone ? `+91 ${customerPhone}` : 'Scheme Member')}
                      </h4>
                      {customerPhone && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 shrink-0 flex items-center gap-1">
                          <CheckCircle2 size={10} /> Verified
                        </span>
                      )}
                    </div>
                    {customerPhone ? (
                      <p className="text-xs text-muted-foreground truncate mt-0.5 font-mono">
                        {passCountryCode} {customerPhone}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        Link mobile number to check pass status
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleChangeAccount}
                  className="text-xs font-extrabold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:underline px-3 py-1.5 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer shrink-0"
                >
                  Change
                </button>
              </div>

              {/* Passes List: 2-column Grid */}
              {isLoadingPasses ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {[1, 2].map(i => (
                    <div key={i} className="h-64 bg-muted animate-pulse rounded-3xl" />
                  ))}
                </div>
              ) : hasQueriedPasses && customerPasses.length === 0 ? (
                <div className="text-center py-16 bg-card border border-dashed border-border rounded-3xl p-8 space-y-3 max-w-lg mx-auto">
                  <ShieldCheck size={36} className="mx-auto text-muted-foreground/40" />
                  <h4 className="text-base font-bold text-foreground">No Schemes Found</h4>
                  <p className="text-xs text-muted-foreground">
                    No active scheme passes were found for mobile number <strong className="text-foreground">{customerPhone}</strong>.
                  </p>
                  <button
                    onClick={() => setActiveTab('schemes')}
                    className="text-xs font-bold underline cursor-pointer"
                    style={{ color: primaryColor }}
                  >
                    Browse available schemes to join
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {customerPasses.map(pass => {
                    const percent = Math.round((pass.paid_installments / pass.total_installments) * 100);
                    const isCompleted = pass.status === 'completed' || pass.paid_installments >= pass.total_installments;

                    return (
                      <div
                        key={pass.member_id}
                        className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-4 hover:border-amber-500/40 transition-all flex flex-col justify-between"
                      >
                        <div className="space-y-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-black text-lg text-foreground">{pass.scheme_title}</h4>
                                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono">
                                  {pass.member_number || 'SCH-001'}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                Member: <strong className="text-foreground">{pass.customer_name}</strong> ({pass.customer_phone})
                              </p>
                            </div>

                            <span className={`text-[10px] font-bold px-3 py-1 rounded-full capitalize shrink-0 ${
                              pass.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            }`}>
                              {pass.status}
                            </span>
                          </div>

                          {/* Progress Summary Card */}
                          <div className="bg-muted/40 p-4 rounded-2xl space-y-2 border border-border/60">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-foreground">
                                {pass.paid_installments} of {pass.total_installments} Installments Paid
                              </span>
                              <span className="font-black text-emerald-600 dark:text-emerald-400">
                                {percent}% Complete
                              </span>
                            </div>
                            <div className="w-full bg-border h-2 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${percent}%`, backgroundColor: primaryColor }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-xs pt-1">
                              <span className="text-muted-foreground font-mono">
                                Total Saved: {currency}{(pass.paid_installments * pass.price).toLocaleString()}
                              </span>
                              <span className="font-bold text-amber-600 dark:text-amber-400">
                                ⏳ {pass.remaining_installments} {pass.frequency === 'weekly' ? 'weeks' : 'months'} remaining
                              </span>
                            </div>
                          </div>

                          {/* Installments History Grid */}
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                                Installments Timeline
                              </span>
                              {!isCompleted && (
                                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                                  Next due: Due #{pass.paid_installments + 1}
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-56 overflow-y-auto custom-scrollbar p-1">
                              {pass.installment_schedule.map(inst => {
                                const isNextDue = !inst.is_paid && inst.installment_number === pass.paid_installments + 1;
                                const isFutureDue = !inst.is_paid && inst.installment_number > pass.paid_installments + 1;

                                return (
                                  <button
                                    key={inst.installment_number}
                                    type="button"
                                    disabled={inst.is_paid || isCompleted}
                                    onClick={() => {
                                      if (!inst.is_paid && !isCompleted) {
                                        setPayingPass({ pass, targetClickedNum: inst.installment_number });
                                      }
                                    }}
                                    className={`p-2.5 rounded-xl text-center border text-[10px] font-semibold flex flex-col items-center justify-center transition-all ${
                                      inst.is_paid
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50 cursor-default'
                                        : isCompleted
                                          ? 'bg-muted/30 text-muted-foreground border-border opacity-60 cursor-not-allowed'
                                          : isNextDue
                                            ? 'bg-amber-500/10 text-amber-700 border-amber-400 dark:text-amber-300 dark:border-amber-600/70 shadow-2xs hover:scale-102 hover:bg-amber-500/20 cursor-pointer ring-1 ring-amber-500/30'
                                            : 'bg-background text-slate-600 border-border dark:text-slate-400 hover:border-amber-400/60 hover:bg-muted/50 cursor-pointer'
                                    }`}
                                  >
                                    <div className="flex items-center gap-1 mb-0.5">
                                      {inst.is_paid ? (
                                        <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                                      ) : isNextDue ? (
                                        <CreditCard size={12} className="text-amber-500 shrink-0 animate-pulse" />
                                      ) : (
                                        <Clock size={12} className="text-slate-400 shrink-0" />
                                      )}
                                      <span className="font-bold">#{inst.installment_number}</span>
                                    </div>

                                    <span className="text-[9px] font-mono font-bold">
                                      {inst.is_paid ? 'PAID' : isNextDue ? 'PAY NOW' : 'DUE'}
                                    </span>

                                    {inst.is_paid && inst.paid_at && (
                                      <span className="text-[8px] text-emerald-700 dark:text-emerald-300 font-mono mt-0.5 leading-tight block text-center opacity-90">
                                        {formatPaidDateTime(inst.paid_at)}
                                      </span>
                                    )}
                                    {!inst.is_paid && !isCompleted && isFutureDue && (
                                      <span className="text-[7.5px] text-muted-foreground mt-0.5">
                                        Pays #{pass.paid_installments + 1}
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Attached Reward Products */}
                          {pass.items && pass.items.length > 0 && (
                            <div 
                              onClick={() => setSelectedPassForRewards(pass)}
                              className="bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/25 p-3 rounded-2xl text-xs flex items-center justify-between cursor-pointer transition-all group active:scale-99"
                            >
                              <span className="font-bold text-foreground flex items-center gap-1.5 text-[11px]">
                                <Gift size={14} className="text-amber-500 group-hover:scale-110 transition-transform" />
                                <span>Gift Box: {pass.items.length} items rewarded upon maturity</span>
                              </span>
                              <div className="flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 shrink-0">
                                <span className="underline group-hover:text-amber-800">View Rewards</span>
                                <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Action CTA */}
                        <div className="pt-4 border-t border-border mt-2">
                          {isCompleted ? (
                            <div className="w-full py-3 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold rounded-2xl text-center text-xs flex items-center justify-center gap-2">
                              <CheckCircle2 size={16} />
                              <span>Scheme Fully Paid & Completed! Contact shop for delivery/pickup.</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setPayingPass({ pass, targetClickedNum: pass.paid_installments + 1 })}
                              className="w-full py-3 text-white font-bold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 text-xs hover:brightness-110"
                              style={{ backgroundColor: primaryColor }}
                            >
                              <CreditCard size={15} />
                              <span>Pay Due #{pass.paid_installments + 1} ({currency}{pass.price.toLocaleString()})</span>
                              <ArrowRight size={15} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>

        {/* INSTALLMENT PAYMENT MODAL */}
        <AnimatePresence>
          {payingPass && (
            <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border p-5 space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                      <CreditCard size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-foreground">Pay Scheme Installment</h4>
                      <span className="text-[10px] text-muted-foreground">{payingPass.pass.scheme_title}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPayingPass(null)}
                    className="w-7 h-7 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground flex items-center justify-center cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Member and Target Due Info */}
                <div className="bg-muted/40 p-3 rounded-xl space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Member:</span>
                    <span className="font-bold text-foreground">{payingPass.pass.customer_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pass Number:</span>
                    <span className="font-mono font-bold text-foreground">{payingPass.pass.member_number || 'SCH-001'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Installment Target:</span>
                    <span className="font-black text-amber-600 dark:text-amber-400 font-mono">
                      Due #{payingPass.pass.paid_installments + 1}
                    </span>
                  </div>
                </div>

                {/* Sequential allocation reminder if they selected a future due */}
                {payingPass.targetClickedNum > payingPass.pass.paid_installments + 1 && (
                  <div className="bg-blue-500/10 border border-blue-500/20 p-2.5 rounded-xl text-[11px] text-blue-700 dark:text-blue-300 flex items-start gap-2">
                    <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
                    <span>
                      You tapped <strong>Due #{payingPass.targetClickedNum}</strong>. Installments must be cleared sequentially, so this payment is automatically allocated to your next pending installment: <strong>Due #{payingPass.pass.paid_installments + 1}</strong>.
                    </span>
                  </div>
                )}

                {/* Fee Breakdown */}
                <div className="bg-background border border-border p-3.5 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Installment Amount ({payingPass.pass.frequency})</span>
                    <span className="font-mono font-semibold text-foreground">{currency}{installmentBasePrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground text-[11px]">
                    <span>Platform Fee</span>
                    <span className="font-mono">{currency}{instPlatformFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground text-[11px]">
                    <span>Payment Gateway Fee</span>
                    <span className="font-mono">{currency}{instTotalPgFee.toFixed(2)}</span>
                  </div>
                  <div className="pt-2 border-t border-border/80 flex justify-between items-center font-bold text-sm text-foreground">
                    <span>Total Payable</span>
                    <span className="font-mono text-base" style={{ color: primaryColor }}>
                      {currency}{instGrandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setPayingPass(null)}
                    className="flex-1 py-2.5 rounded-xl border border-border text-xs font-semibold hover:bg-muted cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handlePayInstallmentSubmit}
                    disabled={isPayingInstallment}
                    className="flex-2 py-2.5 rounded-xl text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all disabled:opacity-50 hover:brightness-110"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Lock size={14} />
                    <span>{isPayingInstallment ? 'Processing...' : `Confirm & Pay ${currency}${instGrandTotal.toFixed(2)}`}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Reused Mobile Number OTP Verification Modal */}
        {showOtpModal && (
          <DiscountUnlockPopup
            shopId={shopId}
            initialStep={otpModalStep}
            onClose={() => {
              setShowOtpModal(false);
              setPendingEnrollScheme(null);
            }}
            onUnlock={() => {
              setShowOtpModal(false);
              const savedMobile = localStorage.getItem('customer_mobile') || localStorage.getItem('customer_phone') || customerPhone;
              const digits = savedMobile.replace(/\D/g, '').slice(-10);
              const savedCountryCode = localStorage.getItem('customer_country_code') || '+91';
              const savedName = localStorage.getItem('customer_name') || '';

              setCustomerPhone(digits);
              setPassCountryCode(savedCountryCode);
              if (savedName) setCustomerName(savedName);

              setJoinPhone(digits);
              setJoinCountryCode(savedCountryCode);
              if (savedName) setJoinName(savedName);

              const fullPhone = savedCountryCode === '+91' ? digits : `${savedCountryCode}${digits}`;
              fetchCustomerPasses(fullPhone);

              if (pendingEnrollScheme) {
                const targetScheme = pendingEnrollScheme;
                setPendingEnrollScheme(null);
                setSelectedSchemeForJoin(targetScheme);
                toast.success(`Verified! Ready to enroll in ${targetScheme.title}`);
              } else {
                toast.success('Mobile verified! Your scheme pass is unlocked.');
              }
            }}
          />
        )}

        {/* Rewards BottomSheet for Scheme Pass Items */}
        <BottomSheet
          isOpen={Boolean(selectedPassForRewards)}
          onClose={() => setSelectedPassForRewards(null)}
          title={selectedPassForRewards ? `${selectedPassForRewards.scheme_title} Rewards` : 'Scheme Rewards'}
        >
          {selectedPassForRewards && (
            <div className="space-y-4 pb-4">
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="font-extrabold text-foreground text-xs block">Guaranteed Completion Gift Box</span>
                  <span className="text-[11px] text-muted-foreground block">
                    {selectedPassForRewards.items?.length || 0} item{selectedPassForRewards.items?.length === 1 ? '' : 's'} rewarded upon completing all {selectedPassForRewards.total_installments} installments
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] border border-emerald-500/20 shrink-0">
                  Guaranteed
                </span>
              </div>

              <div className="space-y-2.5">
                {selectedPassForRewards.items && selectedPassForRewards.items.length > 0 ? (
                  selectedPassForRewards.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 bg-muted/40 border border-border/80 rounded-2xl shadow-2xs"
                    >
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-14 h-14 rounded-xl object-cover shrink-0 border border-border/80"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
                          <Gift size={24} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-foreground truncate">{item.name}</h4>
                        {item.variant_name && (
                          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 block mt-0.5">
                            {item.variant_name}
                          </span>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-background border border-border text-foreground font-bold">
                            Qty: {item.quantity}
                          </span>
                          {item.price > 0 && (
                            <span className="text-[11px] text-muted-foreground font-mono">
                              Worth {currency}{item.price.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-6">No specific items listed for this scheme.</p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedPassForRewards(null)}
                className="w-full py-3 bg-foreground text-background font-bold rounded-xl text-xs shadow-sm hover:opacity-90 active:scale-98 transition-all cursor-pointer mt-2"
              >
                Close
              </button>
            </div>
          )}
        </BottomSheet>

        {/* Scheme Rewards Preview BottomSheet */}
        <BottomSheet
          isOpen={Boolean(previewRewardsScheme)}
          onClose={() => setPreviewRewardsScheme(null)}
          title={previewRewardsScheme ? `${previewRewardsScheme.title} Rewards` : 'Scheme Rewards'}
        >
          {previewRewardsScheme && (
            <div className="space-y-4 pb-4">
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="font-extrabold text-foreground text-xs block">Guaranteed Completion Gift Box</span>
                  <span className="text-[11px] text-muted-foreground block">
                    {previewRewardsScheme.items?.length || 0} reward item{previewRewardsScheme.items?.length === 1 ? '' : 's'} included with this scheme
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] border border-emerald-500/20 shrink-0">
                  Guaranteed
                </span>
              </div>

              <div className="space-y-2.5">
                {previewRewardsScheme.items && previewRewardsScheme.items.length > 0 ? (
                  previewRewardsScheme.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 bg-muted/40 border border-border/80 rounded-2xl shadow-2xs"
                    >
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-14 h-14 rounded-xl object-cover shrink-0 border border-border/80"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
                          <Gift size={24} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-foreground truncate">{item.name}</h4>
                        {item.variant_name && (
                          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 block mt-0.5">
                            {item.variant_name}
                          </span>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-background border border-border text-foreground font-bold">
                            Qty: {item.quantity}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-6">No specific items listed for this scheme.</p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setPreviewRewardsScheme(null)}
                className="w-full py-3 bg-foreground text-background font-bold rounded-xl text-xs shadow-sm hover:opacity-90 active:scale-98 transition-all cursor-pointer mt-2"
              >
                Close
              </button>
            </div>
          )}
        </BottomSheet>
      </div>
    );
  }

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 15 }}
        transition={{ type: 'spring', damping: 26, stiffness: 360 }}
        className="w-full max-w-lg flex flex-col my-auto"
      >
        {modalInner}
      </motion.div>

      {/* Reused Mobile Number OTP Verification Modal */}
      {showOtpModal && (
        <DiscountUnlockPopup
          shopId={shopId}
          initialStep={otpModalStep}
          onClose={() => {
            setShowOtpModal(false);
            setPendingEnrollScheme(null);
          }}
          onUnlock={() => {
            setShowOtpModal(false);
            const savedMobile = localStorage.getItem('customer_mobile') || localStorage.getItem('customer_phone') || customerPhone;
            const digits = savedMobile.replace(/\D/g, '').slice(-10);
            const savedCountryCode = localStorage.getItem('customer_country_code') || '+91';
            const savedName = localStorage.getItem('customer_name') || '';

            setCustomerPhone(digits);
            setPassCountryCode(savedCountryCode);
            if (savedName) setCustomerName(savedName);

            setJoinPhone(digits);
            setJoinCountryCode(savedCountryCode);
            if (savedName) setJoinName(savedName);

            const fullPhone = savedCountryCode === '+91' ? digits : `${savedCountryCode}${digits}`;
            fetchCustomerPasses(fullPhone);

            if (pendingEnrollScheme) {
              const targetScheme = pendingEnrollScheme;
              setPendingEnrollScheme(null);
              setSelectedSchemeForJoin(targetScheme);
              toast.success(`Verified! Ready to enroll in ${targetScheme.title}`);
            } else {
              toast.success('Mobile verified! Your scheme pass is unlocked.');
            }
          }}
        />
      )}

      {/* Rewards BottomSheet for Scheme Pass Items */}
      <BottomSheet
        isOpen={Boolean(selectedPassForRewards)}
        onClose={() => setSelectedPassForRewards(null)}
        title={selectedPassForRewards ? `${selectedPassForRewards.scheme_title} Rewards` : 'Scheme Rewards'}
      >
        {selectedPassForRewards && (
          <div className="space-y-4 pb-4">
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="font-extrabold text-foreground text-xs block">Guaranteed Completion Gift Box</span>
                <span className="text-[11px] text-muted-foreground block">
                  {selectedPassForRewards.items?.length || 0} item{selectedPassForRewards.items?.length === 1 ? '' : 's'} rewarded upon completing all {selectedPassForRewards.total_installments} installments
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] border border-emerald-500/20 shrink-0">
                Guaranteed
              </span>
            </div>

            <div className="space-y-2.5">
              {selectedPassForRewards.items && selectedPassForRewards.items.length > 0 ? (
                selectedPassForRewards.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 bg-muted/40 border border-border/80 rounded-2xl shadow-2xs"
                  >
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-14 h-14 rounded-xl object-cover shrink-0 border border-border/80"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
                        <Gift size={24} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-foreground truncate">{item.name}</h4>
                      {item.variant_name && (
                        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 block mt-0.5">
                          {item.variant_name}
                        </span>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-background border border-border text-foreground font-bold">
                          Qty: {item.quantity}
                        </span>
                        {item.price > 0 && (
                          <span className="text-[11px] text-muted-foreground font-mono">
                            Worth {currency}{item.price.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-6">No specific items listed for this scheme.</p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelectedPassForRewards(null)}
              className="w-full py-3 bg-foreground text-background font-bold rounded-xl text-xs shadow-sm hover:opacity-90 active:scale-98 transition-all cursor-pointer mt-2"
            >
              Close
            </button>
          </div>
        )}
      </BottomSheet>

      {/* Scheme Rewards Preview BottomSheet */}
      <BottomSheet
        isOpen={Boolean(previewRewardsScheme)}
        onClose={() => setPreviewRewardsScheme(null)}
        title={previewRewardsScheme ? `${previewRewardsScheme.title} Rewards` : 'Scheme Rewards'}
      >
        {previewRewardsScheme && (
          <div className="space-y-4 pb-4">
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="font-extrabold text-foreground text-xs block">Guaranteed Completion Gift Box</span>
                <span className="text-[11px] text-muted-foreground block">
                  {previewRewardsScheme.items?.length || 0} reward item{previewRewardsScheme.items?.length === 1 ? '' : 's'} included with this scheme
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] border border-emerald-500/20 shrink-0">
                Guaranteed
              </span>
            </div>

            <div className="space-y-2.5">
              {previewRewardsScheme.items && previewRewardsScheme.items.length > 0 ? (
                previewRewardsScheme.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 bg-muted/40 border border-border/80 rounded-2xl shadow-2xs"
                  >
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-14 h-14 rounded-xl object-cover shrink-0 border border-border/80"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
                        <Gift size={24} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-foreground truncate">{item.name}</h4>
                      {item.variant_name && (
                        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 block mt-0.5">
                          {item.variant_name}
                        </span>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-background border border-border text-foreground font-bold">
                          Qty: {item.quantity}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-6">No specific items listed for this scheme.</p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setPreviewRewardsScheme(null)}
              className="w-full py-3 bg-foreground text-background font-bold rounded-xl text-xs shadow-sm hover:opacity-90 active:scale-98 transition-all cursor-pointer mt-2"
            >
              Close
            </button>
          </div>
        )}
      </BottomSheet>
    </div>
  );
};
