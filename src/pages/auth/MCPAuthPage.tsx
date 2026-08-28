import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { Mail, CheckCircle2, AlertCircle, ArrowRight, LayoutDashboard } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import logo from "@/assets/menukit-logo.svg";

export function MCPAuthPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const aiName = searchParams.get('utm_source') || 'AI';
  const navigate = useNavigate();

  const { token, user } = useAuthStore();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'auto' | 'email' | 'otp' | 'success'>('auto');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // If user is already logged in, automatically bind the session!
    const autoBind = async () => {
      if (token && sessionId) {
        setIsLoading(true);
        try {
          await api.post('/mcp/bind-session', { session_id: sessionId });
          setStep('success');
          toast.success(`${aiName} connected successfully!`);
        } catch (err) {
          setStep('email');
        } finally {
          setIsLoading(false);
        }
      } else {
        setStep('email');
      }
    };
    autoBind();
  }, [token, sessionId]);

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/mcp/request-otp', { email });
      toast.success('Verification code sent to your email!');
      setStep('otp');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to send verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/mcp/verify-otp', {
        email,
        code: otp,
        session_id: sessionId || ''
      });
      toast.success('Authentication successful!');
      setStep('success');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Invalid verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-primary-200 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-amber-200 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob animation-delay-2000"></div>

      <div className="w-full max-w-md z-10">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-3 shadow-lg shadow-primary/30">
            <img src={logo} alt="MenuKit-Logo" className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-white">Menukit AI Assistant</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Connect your account with {aiName}</p>
        </div>

        {!sessionId ? (
          <Card className="text-center p-6 shadow-xl">
            <AlertCircle size={48} className="mx-auto text-amber-500 mb-4" />
            <CardTitle className="text-xl">Invalid Session</CardTitle>
            <CardDescription className="mt-2">
              No session ID was provided. Please return to {aiName} and click the link again.
            </CardDescription>
          </Card>
        ) : step === 'success' ? (
          <Card className="text-center p-6 shadow-xl animate-fade-in">
            <CheckCircle2 size={56} className="mx-auto text-emerald-500 mb-4" />
            <CardTitle className="text-2xl text-emerald-600 dark:text-emerald-400">Connected to {aiName}!</CardTitle>
            <CardDescription className="mt-2 text-base">
              {user ? `Signed in as ${user.email}.` : ''} Your Menukit account is now authorized. You can close this browser tab and return to {aiName}.
            </CardDescription>
            <div className="mt-6">
              <Button onClick={() => navigate('/dashboard')} className="w-full">
                <LayoutDashboard size={18} className="mr-2" />
                Go to Merchant Dashboard
              </Button>
            </div>
          </Card>
        ) : (step === 'auto' || isLoading) ? (
          <Card className="p-8 text-center shadow-xl">
            <div className="flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"></div>
              <p className="text-slate-600 dark:text-slate-300 font-medium">Authorizing {aiName} session...</p>
            </div>
          </Card>
        ) : (
          <Card className="shadow-xl">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl">Sign in to Authorize</CardTitle>
              <CardDescription>
                {step === 'email' 
                  ? 'Enter your Menukit account email' 
                  : `Enter the 6-digit code sent to ${email}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {step === 'email' ? (
                <form onSubmit={handleRequestOTP} className="space-y-4 mt-2">
                  <Input
                    type="email"
                    placeholder="name@restaurant.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    leftIcon={<Mail size={18} />}
                    required
                  />
                  <Button type="submit" className="w-full h-11" isLoading={isLoading}>
                    Send Verification Code
                    <ArrowRight size={18} className="ml-2" />
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOTP} className="space-y-4 mt-2">
                  <Input
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    maxLength={6}
                    required
                  />
                  <Button type="submit" className="w-full h-11" isLoading={isLoading}>
                    Verify & Authorize
                  </Button>
                  <button
                    type="button"
                    onClick={() => setStep('email')}
                    className="w-full text-center text-sm text-slate-500 hover:underline mt-2"
                  >
                    Use a different email
                  </button>
                </form>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
