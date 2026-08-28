import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { api } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export function VerifyEmployeePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const hasCalledAPI = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Verification token is missing.');
      return;
    }

    if (!hasCalledAPI.current) {
      hasCalledAPI.current = true;
      verifyToken(token);
    }
  }, [token]);

  const verifyToken = async (verifyTokenStr: string) => {
    try {
      const res = await api.get(`/employees/verify?token=${verifyTokenStr}`);
      setStatus('success');
      setMessage(res.data.message || 'Email verified successfully.');
    } catch (error: any) {
      setStatus('error');
      setMessage(error.response?.data?.detail || 'Invalid or expired verification link.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Team Invitation</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center p-6 space-y-6">
          {status === 'loading' && (
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="text-slate-500">Verifying your invitation...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center space-y-4 text-center">
              <CheckCircle2 size={64} className="text-green-500" />
              <p className="text-slate-700 dark:text-slate-300 font-medium text-lg">
                {message}
              </p>
              <p className="text-slate-500 text-sm">
                You can now log in using your email address. We will send you an OTP code to verify your identity.
              </p>
              <Button onClick={() => navigate('/login')} className="w-full mt-4">
                Continue to Login <ArrowRight size={16} className="ml-2" />
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center space-y-4 text-center">
              <XCircle size={64} className="text-red-500" />
              <p className="text-red-600 dark:text-red-400 font-medium text-lg">
                {message}
              </p>
              <Button onClick={() => navigate('/login')} variant="outline" className="w-full mt-4">
                Back to Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
