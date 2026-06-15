import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gift, Phone, ShieldCheck, User } from 'lucide-react';
import confetti from 'canvas-confetti';
import { customerService } from '../../services/customers';

interface DiscountUnlockPopupProps {
  shopId: string;
  onClose: () => void;
  onUnlock: (customerId: string | null) => void;
}

export const DiscountUnlockPopup: React.FC<DiscountUnlockPopupProps> = ({ shopId, onClose, onUnlock }) => {
  const [step, setStep] = useState<'intro' | 'mobile' | 'otp' | 'name' | 'success' | 'no_offers'>('intro');
  const [mobileNumber, setMobileNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isStrictMember, setIsStrictMember] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const handleClose = () => {
    if (isVerified) {
      onUnlock(isStrictMember ? 'verified-member' : 'unlocked');
    } else if (step === 'no_offers') {
      onUnlock(null);
    } else {
      onClose();
    }
  };

  const triggerConfetti = () => {
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
    setLoading(true);
    try {
      const res = await customerService.verifyMobile(mobileNumber, shopId);
      if (res.otp_required === false) {
        // Token was valid and matched!
        if (!res.is_global_customer) {
          setStep('name');
        } else {
          setIsStrictMember(res.is_strict_member || false);
          triggerConfetti();
          setIsVerified(true);
          setStep('success');
        }
      } else {
        setStep('otp');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send OTP');
    } finally {
      setLoading(false);
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
      const res = await customerService.verifyOtp(mobileNumber, otpCode, shopId);
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
      await customerService.register(name, mobileNumber, shopId, otpCode);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative"
      >
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <AnimatePresence mode="wait">
          {step === 'intro' && (
            <motion.div 
              key="intro"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-8 text-center"
            >
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Gift className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                🎉 Special Discounts Waiting For You!
              </h2>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Tired of seeing discounts that you can't unlock? Enter your mobile number and discover member-only offers instantly.
              </p>
              <div className="space-y-3">
                <button 
                  onClick={() => setStep('mobile')}
                  className="w-full py-4 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-[0.98]"
                >
                  Unlock My Offers
                </button>
                <button 
                  onClick={handleClose}
                  className="w-full py-4 text-gray-600 font-medium bg-white border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-xl transition-all"
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
              className="p-8"
            >
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Enter Mobile Number</h2>
                <p className="text-gray-500">We'll send you a secure OTP to verify.</p>
              </div>

              <form onSubmit={handleMobileSubmit} className="space-y-6">
                <div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="tel"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value.replace(/[^0-9]/g, ''))}
                      className="block w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-lg"
                      placeholder="Enter 10 digit number"
                      maxLength={15}
                      autoFocus
                      required
                    />
                  </div>
                  {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                </div>
                
                <button 
                  type="submit"
                  disabled={loading || mobileNumber.length < 10}
                  className="w-full py-4 bg-gray-900 text-white rounded-xl font-semibold hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending OTP...' : 'Send OTP'}
                </button>
              </form>
            </motion.div>
          )}

          {step === 'otp' && (
            <motion.div 
              key="otp"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-8"
            >
              <div className="mb-8">
                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                  <ShieldCheck className="w-6 h-6 text-blue-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify OTP</h2>
                <p className="text-gray-500">Code sent to +{mobileNumber}</p>
                <p className="text-xs text-amber-600 mt-1 font-medium bg-amber-50 p-2 rounded inline-block">Hint: Dev mode - use 123456 or check console</p>
              </div>

              <form onSubmit={handleOtpSubmit} className="space-y-6">
                <div>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                    className="block w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-center text-3xl tracking-widest font-mono"
                    placeholder="••••••"
                    maxLength={6}
                    autoFocus
                    required
                  />
                  {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
                </div>
                
                <button 
                  type="submit"
                  disabled={loading || otpCode.length !== 6}
                  className="w-full py-4 bg-gray-900 text-white rounded-xl font-semibold hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Verifying...' : 'Verify & Unlock'}
                </button>
              </form>
            </motion.div>
          )}

          {step === 'name' && (
            <motion.div 
              key="name"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-8"
            >
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Just One More Step!</h2>
                <p className="text-gray-500">Tell us your name to personalize your experience.</p>
              </div>

              <form onSubmit={handleNameSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="block w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-lg"
                      placeholder="Your Full Name"
                      autoFocus
                      required
                    />
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={mobileNumber}
                      disabled
                      className="block w-full pl-12 pr-4 py-4 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 outline-none text-lg cursor-not-allowed"
                    />
                  </div>
                  {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                </div>
                
                <button 
                  type="submit"
                  disabled={loading || name.length < 2}
                  className="w-full py-4 bg-gray-900 text-white rounded-xl font-semibold hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                🎉 Congratulations!
              </h2>
              <p className="text-xl text-green-600 font-medium mb-4">
                You have unlocked exclusive member discounts.
              </p>
              <p className="text-gray-500 mb-8">
                Applying all member-only discounts immediately...
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
