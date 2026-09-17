import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Phone, ShieldCheck, User, ChevronDown, X, Crown, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { triggerHaptic, HAPTIC_PATTERNS } from '@/utils/haptic';
import { customerService } from '../../services/customers';

const COUNTRY_CODES = [
  { code: '+91', label: 'India (+91)' },
  { code: '+1', label: 'USA/Canada (+1)' },
  { code: '+44', label: 'UK (+44)' },
  { code: '+971', label: 'UAE (+971)' },
  { code: '+61', label: 'Australia (+61)' },
  { code: '+65', label: 'Singapore (+65)' },
  { code: '+94', label: 'Sri Lanka (+94)' },
];

interface DiscountUnlockPopupProps {
  shopId: string;
  onClose: () => void;
  onUnlock: (customerId: string | null, isExisting?: boolean) => void;
  /** Skip the intro/offers screen and go straight to phone entry or already unlocked */
  initialStep?: 'intro' | 'mobile' | 'otp' | 'already_unlocked';
}

export const DiscountUnlockPopup: React.FC<DiscountUnlockPopupProps> = ({ shopId, onClose, onUnlock, initialStep = 'intro' }) => {
  const [step, setStep] = useState<'intro' | 'mobile' | 'otp' | 'name' | 'success' | 'no_offers' | 'already_unlocked'>(() => {
    try {
      const saved = localStorage.getItem('pending_otp_verification');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (!parsed.shopId || parsed.shopId === shopId) && (Date.now() - parsed.timestamp < 10 * 60 * 1000)) {
          return 'otp';
        }
      }
    } catch (e) {}
    if (initialStep === 'intro') {
      const isShopUnlocked = Boolean(
        sessionStorage.getItem(`member_status_${shopId}`) ||
        sessionStorage.getItem('member_status') ||
        localStorage.getItem('customer_token')
      );
      if (isShopUnlocked) {
        return 'already_unlocked';
      }
    }
    return initialStep;
  });
  const [mobileNumber, setMobileNumber] = useState(() => {
    try {
      const saved = localStorage.getItem('pending_otp_verification');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.mobileNumber && (!parsed.shopId || parsed.shopId === shopId) && (Date.now() - parsed.timestamp < 10 * 60 * 1000)) {
          return parsed.mobileNumber;
        }
      }
    } catch (e) {}
    const savedMobile = localStorage.getItem('customer_mobile') || localStorage.getItem('customer_phone') || '';
    if (savedMobile) {
      const digits = savedMobile.replace(/\D/g, '');
      return digits.length >= 10 ? digits.slice(-10) : digits;
    }
    return '';
  });
  const [countryCode, setCountryCode] = useState(() => {
    try {
      const saved = localStorage.getItem('pending_otp_verification');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.countryCode && (!parsed.shopId || parsed.shopId === shopId) && (Date.now() - parsed.timestamp < 10 * 60 * 1000)) {
          return parsed.countryCode;
        }
      }
    } catch (e) {}
    return '+91';
  });
  const [otpCode, setOtpCode] = useState('');
  const [name, setName] = useState(() => {
    return localStorage.getItem('customer_name') || '';
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isStrictMember, setIsStrictMember] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isExistingCustomer, setIsExistingCustomer] = useState<boolean>(() => {
    return Boolean(
      localStorage.getItem('customer_token') ||
      localStorage.getItem('customer_is_existing') === 'true'
    );
  });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [resendTimer, setResendTimer] = useState(30);
  const [resendCount, setResendCount] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const [tabWarningVisible, setTabWarningVisible] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'otp' && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  // Navigation guards — active whenever user is in mobile number entry or OTP verification steps
  useEffect(() => {
    // Ensure warning is always hidden initially on step transition
    setTabWarningVisible(false);

    const isLockedStep = step === 'mobile' || step === 'otp';
    if (!isLockedStep) {
      return;
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Please complete your verification before leaving.';
      return e.returnValue;
    };

    // Lock browser back navigation — only shows warning when user actively presses back
    window.history.pushState({ unlockGuard: true }, '');
    const handlePopState = () => {
      window.history.pushState({ unlockGuard: true }, '');
      setTabWarningVisible(true);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [step]);

  useEffect(() => {
    // Detect IP country with a 3s timeout signal so it never hangs
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    fetch('https://ipapi.co/json/', { signal: controller.signal })
      .then(res => res.json())
      .then(data => {
        if (data.country_calling_code) {
          setCountryCode(data.country_calling_code);
        }
      })
      .catch(() => {
        // ignore error, default remains +91
      })
      .finally(() => clearTimeout(timeoutId));
  }, []);

  useEffect(() => {
    // Click outside to close
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // Only fire confetti and vibration on intro if we actually started there
    if (step === 'intro' && initialStep === 'intro') {
      triggerHaptic(HAPTIC_PATTERNS.popupOpen);
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#f97316', '#eab308', '#3b82f6', '#ec4899', '#8b5cf6'],
        zIndex: 9999
      });
    }
  }, [step]);

  const handleClose = () => {
    if (isVerified) {
      onUnlock(isStrictMember ? 'verified-member' : 'unlocked', isExistingCustomer);
    } else if (step === 'no_offers') {
      onUnlock(null, isExistingCustomer);
    } else {
      onClose();
    }
  };

  const triggerConfetti = () => {
    triggerHaptic(HAPTIC_PATTERNS.successUnlock);
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  };

  const handleMobileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mobileNumber.length < 10) {
      setError('Please enter a valid mobile number');
      return;
    }
    
    setError('');
    setTabWarningVisible(false);
    setLoading(true);
    try {
      const res = await customerService.verifyMobile(`${countryCode}${mobileNumber}`, shopId);
      const isExisting = Boolean(res.is_global_customer || res.is_member);
      if (isExisting) {
        setIsExistingCustomer(true);
        localStorage.setItem('customer_is_existing', 'true');
        sessionStorage.setItem('customer_is_existing', 'true');
      }

      if (res.otp_required === false) {
        // Token was valid and matched!
        if (res.access_token) {
          localStorage.setItem('customer_token', res.access_token);
        }
        if (res.customer_name) {
          localStorage.setItem('customer_name', res.customer_name);
        }
        if (res.delivery_address) {
          localStorage.setItem('customer_address', res.delivery_address);
        }
        localStorage.setItem('customer_mobile', `${countryCode}${mobileNumber}`);
        if (!res.is_global_customer) {
          setStep('name');
        } else {
          setIsStrictMember(res.is_strict_member || false);
          triggerConfetti();
          setIsVerified(true);
          setStep('success');
        }
      } else {
        localStorage.setItem('pending_otp_verification', JSON.stringify({
          shopId,
          mobileNumber,
          countryCode,
          timestamp: Date.now()
        }));
        setStep('otp');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCount >= 2) return;
    
    setError('');
    setIsResending(true);
    try {
      await customerService.verifyMobile(`${countryCode}${mobileNumber}`, shopId);
      
      localStorage.setItem('pending_otp_verification', JSON.stringify({
        shopId,
        mobileNumber,
        countryCode,
        timestamp: Date.now()
      }));
      setResendTimer(30);
      setResendCount(prev => prev + 1);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to resend OTP. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      setError('OTP must be 6 digits');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const res = await customerService.verifyOtp(`${countryCode}${mobileNumber}`, otpCode, shopId);
      const isExisting = Boolean(res.is_global_customer || res.is_member);
      if (isExisting) {
        setIsExistingCustomer(true);
        localStorage.setItem('customer_is_existing', 'true');
        sessionStorage.setItem('customer_is_existing', 'true');
      }
      localStorage.removeItem('pending_otp_verification');
      localStorage.removeItem('pending_otp_verification');
      if (res.access_token) {
        localStorage.setItem('customer_token', res.access_token);
      }
      localStorage.setItem('customer_mobile', `${countryCode}${mobileNumber}`);
      if (res.customer_name) {
        localStorage.setItem('customer_name', res.customer_name);
      }
      if (res.delivery_address) {
        localStorage.setItem('customer_address', res.delivery_address);
      }
      if (!res.is_global_customer) {
        setStep('name');
      } else {
        setIsStrictMember(res.is_strict_member);
        triggerConfetti();
        setIsVerified(true);
        setStep('success');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid OTP code');
    } finally {
      setLoading(false);
    }
  };

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError('Please enter your full name');
      return;
    }

    setError('');
    setLoading(true);
    try {
      // In a real flow, OTP code might be re-sent or stored in session. We pass "123456" or just the otpCode
      const res = await customerService.register(name, `${countryCode}${mobileNumber}`, shopId, otpCode);
      localStorage.setItem('customer_mobile', `${countryCode}${mobileNumber}`);
      localStorage.setItem('customer_name', name);
      if (res.delivery_address) {
        localStorage.setItem('customer_address', res.delivery_address);
      }
      if (res.access_token) {
        localStorage.setItem('customer_token', res.access_token);
      }
      setIsStrictMember(false); // newly registered users are not strict members
      triggerConfetti();
      setIsVerified(true);
      setStep('success');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeMobileNumber = () => {
    setMobileNumber('');
    setOtpCode('');
    setError('');
    setStep('mobile');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative overflow-hidden"
      >
        {/* Tab-switch / exit warning overlay during mobile entry & OTP verification */}
        {tabWarningVisible && (step === 'mobile' || step === 'otp') && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-900/95 backdrop-blur-md rounded-2xl p-6 text-center">
            <div className="w-14 h-14 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center text-2xl mb-4 animate-bounce">
              ⏳
            </div>
            <h3 className="text-white text-lg font-bold mb-2">
              {step === 'otp' ? "Don't leave yet!" : "Verification in progress"}
            </h3>
            <p className="text-slate-300 text-xs mb-5 leading-relaxed max-w-xs">
              {step === 'otp'
                ? "We sent an OTP to your phone. Leaving or switching tabs now will cancel your verification."
                : "Please complete entering your mobile number to unlock your exclusive discounts."}
            </p>
            <button
              type="button"
              onClick={() => setTabWarningVisible(false)}
              className="w-full py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/30 active:scale-[0.98] transition-all cursor-pointer"
            >
              {step === 'otp' ? "Enter OTP Now" : "Continue"}
            </button>
          </div>
        )}

        {/* Close X Button - hidden on mobile number entry & OTP steps to prevent abandoning */}
        {step !== 'mobile' && step !== 'otp' && (
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-all z-10 cursor-pointer"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        )}

        <AnimatePresence mode="wait">
          {step === 'already_unlocked' && (
            <motion.div 
              key="already_unlocked"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-6 sm:p-7 text-center"
            >
              <div className="w-16 h-16 bg-gradient-to-tr from-amber-400 to-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/20 text-white">
                <Crown className="w-8 h-8 text-white" />
              </div>

              <h2 className="text-xl font-black text-gray-900 mb-2">
                🎉 Discounts Unlocked!
              </h2>
              
              <p className="text-sm text-gray-600 mb-5 leading-relaxed">
                You have unlocked the discounts! You can find and use all your exclusive offers in the <strong className="text-gray-900 font-bold">Discounts & Offers</strong> section.
              </p>

              <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3.5 mb-5 space-y-1.5 text-center">
                {(name || localStorage.getItem('customer_name')) && (
                  <div className="flex items-center justify-center gap-1.5 font-black text-sm text-slate-900">
                    <User size={15} className="text-amber-600 shrink-0" />
                    <span>{name || localStorage.getItem('customer_name')}</span>
                  </div>
                )}
                {(mobileNumber || localStorage.getItem('customer_mobile')) && (
                  <div className="flex items-center justify-center gap-1.5 font-semibold text-amber-900 text-xs">
                    <ShieldCheck size={14} className="text-amber-600 shrink-0" />
                    <span>Linked Number: <span className="font-mono font-bold">{countryCode} {mobileNumber || localStorage.getItem('customer_mobile')?.slice(-10)}</span></span>
                  </div>
                )}
              </div>

              <div className="space-y-2.5">
                <button 
                  type="button"
                  onClick={() => {
                    handleClose();
                    window.scrollTo({ top: 350, behavior: 'smooth' });
                  }}
                  className="w-full py-3.5 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 active:scale-[0.98] text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Gift size={16} />
                  <span>View Discounts & Offers</span>
                </button>

                <button 
                  type="button"
                  onClick={handleChangeMobileNumber}
                  className="w-full py-2.5 text-xs font-bold text-gray-500 hover:text-gray-900 hover:bg-gray-100/80 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Phone size={13} />
                  <span>Change Mobile Number</span>
                </button>
              </div>
            </motion.div>
          )}

          {step === 'intro' && (
            <motion.div 
              key="intro"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-6 text-center"
            >
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Gift className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                🎉 Special Discounts Waiting For You!
              </h2>
              <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                Tired of seeing discounts that you can't unlock? Enter your mobile number and discover member-only offers instantly.
              </p>
              <div className="space-y-2.5">
                <button 
                  onClick={() => setStep('mobile')}
                  className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-[0.98] text-sm"
                >
                  Unlock My Offers
                </button>
                <button 
                  onClick={handleClose}
                  className="w-full py-3 text-gray-600 font-medium bg-white border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-xl transition-all text-sm"
                >
                  Maybe Later
                </button>
              </div>
            </motion.div>
          )}

          {step === 'mobile' && (
            <motion.div 
              key="mobile"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-6"
            >
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-1">Enter Mobile Number</h2>
                <p className="text-sm text-gray-500">We'll send you a secure OTP to verify.</p>
              </div>

              <form onSubmit={handleMobileSubmit} className="space-y-5">
                <div>
                  <div className="relative">
                    <div ref={dropdownRef} className="absolute inset-y-0 left-0 flex items-center pl-2">
                      <div 
                        className="flex items-center gap-1 cursor-pointer hover:bg-gray-100 p-1.5 rounded-lg transition-colors"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      >
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-700 font-medium text-base min-w-[32px]">{countryCode}</span>
                        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                      </div>

                      <AnimatePresence>
                        {isDropdownOpen && (
                          <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute top-[85%] left-2 mt-1 w-48 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden"
                          >
                            <div className="max-h-48 overflow-y-auto">
                              {COUNTRY_CODES.map((c) => (
                                <div 
                                  key={c.code}
                                  className={`px-4 py-2.5 hover:bg-gray-50 cursor-pointer flex items-center justify-between transition-colors ${countryCode === c.code ? 'bg-primary/5' : ''}`}
                                  onClick={() => {
                                    setCountryCode(c.code);
                                    setIsDropdownOpen(false);
                                  }}
                                >
                                  <span className={`text-sm ${countryCode === c.code ? 'font-semibold text-primary' : 'text-gray-700'}`}>{c.label}</span>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <input
                      type="tel"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value.replace(/[^0-9]/g, ''))}
                      className="block w-full pl-[105px] pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-base"
                      placeholder="Enter mobile number"
                      maxLength={15}
                      autoFocus
                      required
                    />
                  </div>
                  {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
                </div>
                
                <button 
                  type="submit"
                  disabled={loading || mobileNumber.length < 10}
                  className="w-full py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm cursor-pointer"
                >
                  {loading ? 'Sending OTP...' : 'Send OTP'}
                </button>

                {Boolean(sessionStorage.getItem(`member_status_${shopId}`) || localStorage.getItem('customer_token')) && (
                  <button 
                    type="button"
                    onClick={() => {
                      const savedMobile = localStorage.getItem('customer_mobile') || '';
                      if (savedMobile) {
                        const digits = savedMobile.replace(/\D/g, '');
                        setMobileNumber(digits.length >= 10 ? digits.slice(-10) : digits);
                      }
                      setStep('already_unlocked');
                    }}
                    className="w-full py-2 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors block text-center cursor-pointer"
                  >
                    Cancel & Keep Current Number
                  </button>
                )}
                
                <p className="text-xs text-center text-gray-500 mt-4">
                  By continuing, you accept our{' '}
                  <a href="https://menukit.debuggerstechnologies.com/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">
                    Terms and Conditions
                  </a>
                </p>
              </form>
            </motion.div>
          )}

          {step === 'otp' && (
            <motion.div 
              key="otp"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-6"
            >
              <div className="mb-6">
                <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center mb-3">
                  <ShieldCheck className="w-5 h-5 text-blue-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Verify OTP</h2>
                <p className="text-sm text-gray-500">Code sent to {countryCode} {mobileNumber}</p>
              </div>

              <form onSubmit={handleOtpSubmit} className="space-y-5">
                <div>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                    className="block w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-center text-2xl tracking-widest font-mono"
                    placeholder="••••••"
                    maxLength={6}
                    autoFocus
                    required
                  />
                  {error && <p className="text-red-500 text-sm mt-1 text-center">{error}</p>}
                </div>
                
                <div className="space-y-3">
                  <button 
                    type="submit"
                    disabled={loading || isResending || otpCode.length !== 6}
                    className="w-full py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {loading ? 'Verifying...' : 'Verify & Unlock'}
                  </button>

                  {resendCount < 2 && (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resendTimer > 0 || loading || isResending}
                      className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {isResending ? 'Sending...' : resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      localStorage.removeItem('pending_otp_verification');
                      setStep('mobile');
                      setResendTimer(30);
                      setResendCount(0);
                    }}
                    className="w-full py-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    Change Mobile Number
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {step === 'name' && (
            <motion.div 
              key="name"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-6"
            >
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-1">Just One More Step!</h2>
                <p className="text-sm text-gray-500">Tell us your name to personalize your experience.</p>
              </div>

              <form onSubmit={handleNameSubmit} className="space-y-5">
                <div className="space-y-3">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="block w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-base"
                      placeholder="Your Full Name"
                      autoFocus
                      required
                    />
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none gap-1">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-500 font-medium text-base">{countryCode}</span>
                    </div>
                    <input
                      type="text"
                      value={mobileNumber}
                      disabled
                      className="block w-full pl-[95px] pr-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 outline-none text-base cursor-not-allowed"
                    />
                  </div>
                  {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
                </div>
                
                <button 
                  type="submit"
                  disabled={loading || name.length < 2}
                  className="w-full py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {loading ? 'Completing...' : 'Complete Registration'}
                </button>
              </form>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-10 text-center"
            >
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Gift className="w-12 h-12 text-green-500" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                {isExistingCustomer ? '🎉 Welcome Back!' : '🎉 Congratulations!'}
              </h2>
              <p className="text-xl text-green-600 font-medium mb-4">
                {isExistingCustomer
                  ? 'Your member account is verified.'
                  : 'You have unlocked exclusive newcomer offers!'}
              </p>
              <p className="text-gray-500 mb-8">
                {isExistingCustomer
                  ? 'Applying all your active member discounts immediately...'
                  : 'Applying all eligible newcomer & shop discounts immediately...'}
              </p>
              <button 
                onClick={handleClose}
                className="w-full py-4 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-all shadow-lg shadow-green-500/30"
              >
                Continue
              </button>
            </motion.div>
          )}

          {step === 'no_offers' && (
            <motion.div 
              key="no_offers"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-10 text-center"
            >
              <div className="text-5xl mb-6">😊</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                You're verified!
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed mb-8">
                No exclusive offers found today. Don't worry! Keep visiting us. Amazing discounts may be waiting for you next time.
              </p>
              <button 
                onClick={handleClose}
                className="w-full py-4 bg-gray-900 text-white rounded-xl font-semibold hover:bg-black transition-all"
              >
                Close
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
