import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Mail, ArrowRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '@/services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }
    
    setIsLoading(true);
    try {
      await api.post('/auth/request-otp', { email });
      toast.success('OTP sent to your email!');
      navigate('/verify-otp', { state: { email } });
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <Card>
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription>Enter your email to sign in to your dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <Input
              type="email"
              placeholder="name@restaurant.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail size={18} />}
              autoComplete="email"
              required
            />
            <Button 
              type="submit" 
              className="w-full h-12 text-base" 
              isLoading={isLoading}
            >
              {!isLoading && (
                <>
                  Continue with Email
                  <ArrowRight size={18} className="ml-2" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
      <p className="text-center text-sm text-slate-500 mt-6">
        No password required. We'll send you a secure login code.
      </p>
    </div>
  );
}
