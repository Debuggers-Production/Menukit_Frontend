import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export function OTPVerifyPage() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();
  
  const email = location.state?.email;

  useEffect(() => {
    if (!email) {
      navigate('/login', { replace: true });
    }
    inputRefs.current[0]?.focus();
  }, [email, navigate]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d+$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      // Auto-focus previous input on backspace
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6).split('');
    if (pastedData.some(char => !/^\d+$/.test(char))) return;
    
    const newOtp = [...otp];
    pastedData.forEach((char, index) => {
      if (index < 6) newOtp[index] = char;
    });
    setOtp(newOtp);
    
    // Focus last filled input
    const focusIndex = Math.min(pastedData.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    const code = otp.join('');
    if (code.length !== 6) {
      toast.error('Please enter the complete 6-digit code');
      return;
    }

    setIsLoading(true);
    try {
      await login(email, code);
      toast.success('Login successful!');
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Invalid OTP code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-submit when all 6 digits are entered
  useEffect(() => {
    if (otp.every(digit => digit !== '') && !isLoading) {
      handleSubmit();
    }
  }, [otp]);

  const handleResend = async () => {
    if (countdown > 0) return;
    
    setIsResending(true);
    try {
      await api.post('/auth/request-otp', { email });
      toast.success('New code sent to your email!');
      setCountdown(60);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (error: any) {
      toast.error('Failed to resend code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <button 
        onClick={() => navigate('/login')}
        className="flex items-center text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white mb-4 transition-colors"
      >
        <ArrowLeft size={16} className="mr-1" />
        Back to email
      </button>

      <Card>
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl">Check your email</CardTitle>
          <CardDescription>
            We've sent a 6-digit code to <br/>
            <span className="font-medium text-slate-900 dark:text-white">{email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col items-center">
            <div className="flex gap-2 sm:gap-3 mb-8" onPaste={handlePaste}>
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={el => { inputRefs.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-semibold rounded-xl border border-input bg-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                />
              ))}
            </div>

            <Button 
              type="submit" 
              className="w-full h-12" 
              isLoading={isLoading}
              disabled={otp.some(d => d === '')}
            >
              Verify Code
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={handleResend}
              disabled={countdown > 0 || isResending}
              className="inline-flex items-center text-sm font-medium text-primary hover:text-primary-600 disabled:text-slate-400 transition-colors"
            >
              {isResending ? (
                <RefreshCw size={14} className="mr-2 animate-spin" />
              ) : null}
              {countdown > 0 
                ? `Resend code in ${countdown}s` 
                : 'Resend code'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
