import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Phone, RefreshCw, ArrowRight, LogOut, ChevronDown } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { useShopStore } from '@/store/shopStore';
import { api } from '@/services/api';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CountryCodeSelect } from '@/components/ui/CountryCodeSelect';

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

export function PhoneVerificationPage() {
  const { user, fetchUser, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  // If user is already phone verified, redirect forward
  useEffect(() => {
    if (user?.phone_verified) {
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [user, navigate, location]);

  const [step, setStep] = useState<'input_phone' | 'verify_otp'>('input_phone');
  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState(user?.phone?.replace(/^\+\d{1,3}/, '') || '');
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [resendCount, setResendCount] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Close country dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target as Node)) {
        setIsCountryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Countdown timer for resend
  useEffect(() => {
    let timer: any;
    if (step === 'verify_otp' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  // Handle Step 1: Send OTP to Mobile Number
  const handleSendPhoneOTP = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanDigits = phone.replace(/\D/g, '');
    if (cleanDigits.length < 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }

    setIsLoading(true);
    try {
      const fullPhone = `${countryCode}${cleanDigits.slice(-10)}`;
      await api.post('/auth/phone/send-otp', {
        phone: fullPhone,
        country_code: countryCode,
      });

      toast.success(`Verification OTP sent to ${fullPhone}`);
      setStep('verify_otp');
      setCountdown(60);
      setResendCount(0);
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to send OTP to mobile number');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      handleOtpPaste(value);
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (pastedText: string) => {
    const pastedData = pastedText.replace(/\D/g, '').slice(0, 6).split('');
    const newOtp = [...otp];
    pastedData.forEach((char, index) => {
      if (index < 6) newOtp[index] = char;
    });
    setOtp(newOtp);
    const focusIndex = Math.min(pastedData.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  const isSubmittingRef = useRef(false);

  // Handle Step 2: Verify OTP
  const handleVerifyPhoneOTP = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmittingRef.current || isLoading) return;

    const code = otp.join('');
    if (code.length !== 6) {
      toast.error('Please enter the complete 6-digit code');
      return;
    }

    const cleanDigits = phone.replace(/\D/g, '');
    const fullPhone = `${countryCode}${cleanDigits.slice(-10)}`;

    isSubmittingRef.current = true;
    setIsLoading(true);
    try {
      const res = await api.post('/auth/phone/verify-otp', {
        phone: fullPhone,
        code: code,
      });

      // Update auth store user state with verified phone
      useAuthStore.setState((state) => ({
        user: res.data,
      }));
      await fetchUser();

      toast.success('Mobile number verified successfully!');

      // Check user shops to route appropriately
      const shopsRes = await api.get('/shops/my-shops');
      const { owned, employed } = shopsRes.data;
      const totalShops = owned.length + employed.length;

      if (totalShops === 0) {
        navigate('/shop-setup?create=true', { state: { createNew: true }, replace: true });
      } else if (totalShops === 1) {
        const targetShop = owned.length > 0 ? owned[0] : employed[0];
        localStorage.setItem('current_shop_id', targetShop.id);
        useShopStore.getState().setShop(targetShop);
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/select-shop', { replace: true });
      }
    } catch (error: any) {
      isSubmittingRef.current = false;
      toast.error(error.response?.data?.detail || 'Invalid or expired OTP code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto submit when all 6 OTP digits are filled
  useEffect(() => {
    if (step === 'verify_otp' && otp.every((d) => d !== '') && !isLoading && !isSubmittingRef.current) {
      handleVerifyPhoneOTP();
    }
  }, [otp, step]);

  const handleResendPhoneOTP = async () => {
    if (countdown > 0 || isResending || resendCount >= 3) return;
    setIsResending(true);
    try {
      const cleanDigits = phone.replace(/\D/g, '');
      const fullPhone = `${countryCode}${cleanDigits.slice(-10)}`;
      await api.post('/auth/phone/send-otp', {
        phone: fullPhone,
        country_code: countryCode,
      });
      const nextCount = resendCount + 1;
      setResendCount(nextCount);
      toast.success(`New OTP sent! (${3 - nextCount} resend attempts left)`);
      setCountdown(60);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to resend code');
    } finally {
      setIsResending(false);
    }
  };

  const selectedCountry = COUNTRY_CODES.find((c) => c.code === countryCode) || COUNTRY_CODES[0];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        {/* Top Header Card */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto text-primary border border-primary/20 shadow-xs">
            <Phone size={28} />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-heading">
            {step === 'input_phone' ? 'Link Mobile Number' : 'Verify Mobile OTP'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
            {step === 'input_phone'
              ? 'To secure your account and manage shops, please verify your mobile number.'
              : `Enter the 6-digit verification code sent via SMS to ${countryCode} ${phone.slice(-10)}`}
          </p>
        </div>

        <Card className="border-slate-200/80 dark:border-slate-800 shadow-xl overflow-visible">
          <CardContent className="p-6 sm:p-8 overflow-visible">
            {step === 'input_phone' ? (
              <form onSubmit={handleSendPhoneOTP} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                    Mobile Number
                  </label>
                  <div className="flex items-center gap-2">
                    <CountryCodeSelect
                      value={countryCode}
                      onChange={setCountryCode}
                      heightClass="h-12"
                    />

                    {/* Phone Input */}
                    <input
                      type="tel"
                      required
                      autoFocus
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="9876543210"
                      className="flex-1 h-12 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm sm:text-base font-bold tracking-wider text-slate-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">
                    Used strictly for owner authentication & account recovery.
                  </p>
                </div>

                <Button
                  type="submit"
                  isLoading={isLoading}
                  disabled={phone.replace(/\D/g, '').length < 10}
                  className="w-full h-12 text-sm font-bold shadow-md gap-2"
                >
                  <span>Send Verification Code</span>
                  <ArrowRight size={16} />
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyPhoneOTP} className="flex flex-col items-center">
                <div
                  className="flex gap-2 sm:gap-3 mb-8"
                  onPaste={(e) => {
                    e.preventDefault();
                    handleOtpPaste(e.clipboardData.getData('text'));
                  }}
                >
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        inputRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-black rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-slate-900 dark:text-white"
                    />
                  ))}
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-sm font-bold shadow-md"
                  isLoading={isLoading}
                  disabled={otp.some((d) => d === '')}
                >
                  Verify & Continue
                </Button>

                <div className="mt-6 flex items-center justify-between w-full text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('input_phone');
                      setOtp(['', '', '', '', '', '']);
                    }}
                    className="font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline cursor-pointer"
                  >
                    Change Number
                  </button>

                  <button
                    type="button"
                    onClick={handleResendPhoneOTP}
                    disabled={countdown > 0 || isResending || resendCount >= 3}
                    className="inline-flex items-center font-bold text-primary hover:underline disabled:text-slate-400 disabled:no-underline cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isResending ? <RefreshCw size={13} className="mr-1.5 animate-spin" /> : null}
                    {resendCount >= 3
                      ? 'Resend limit reached (3/3)'
                      : countdown > 0
                      ? `Resend code in ${countdown}s`
                      : `Resend code (${3 - resendCount} left)`}
                  </button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Bottom Sign Out Link */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => logout()}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
          >
            <LogOut size={14} />
            <span>Sign out and use another account ({user?.email})</span>
          </button>
        </div>
      </div>
    </div>
  );
}
