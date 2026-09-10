import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
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
    if (isLoading) return;
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
              onChange={(e) => setEmail(e.target.value.toLowerCase())}
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
      <p className="text-center text-xs text-slate-400 mt-4 px-6">
        By continuing, you are accepting our <Link to="/terms" className="text-primary font-medium hover:underline">Terms of Service</Link> and <Link to="/privacy" className="text-primary font-medium hover:underline">Privacy Policy</Link>.
      </p>
    </div>
  );
}
