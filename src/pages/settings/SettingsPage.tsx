import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Mail, Store, Shield, Smartphone, Star, ArrowRight, ChevronRight, CheckCircle2, Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { useShopStore } from '@/store/shopStore';
import { api } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';

export function SettingsPage() {
  const { user, changeEmail } = useAuthStore();
  const { shop } = useShopStore();
  const navigate = useNavigate();

  // Change Email State
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailStep, setEmailStep] = useState<1 | 2 | 3>(1);
  const [oldEmailOtp, setOldEmailOtp] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newEmailOtp, setNewEmailOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      // Send OTP to new email
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
    <div className="space-y-6 max-w-4xl animate-fade-in pb-24 lg:pb-12">
      <PageHeader
        title="Settings"
        subtitle="Manage your account, preferences, and shop."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="w-5 h-5 text-primary" />
              Account & Profile
            </CardTitle>
            <CardDescription>Manage your sign-in email</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xl font-bold uppercase">
                {user?.email?.charAt(0) || 'U'}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Current Email</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{user?.email}</p>
              </div>
            </div>

            <Button 
              variant="outline" 
              className="w-full justify-between group"
              onClick={() => setIsEmailModalOpen(true)}
            >
              <span className="flex items-center gap-2">
                <Mail size={16} className="text-slate-400 group-hover:text-primary transition-colors" />
                Change Email Address
              </span>
              <ChevronRight size={16} className="text-slate-400" />
            </Button>
          </CardContent>
        </Card>

        {/* Shop Settings Shortcut */}
        <Card className="hover:border-primary/50 transition-colors cursor-pointer group" onClick={() => navigate('/shop-setup')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Store className="w-5 h-5 text-indigo-500" />
              Shop Settings
            </CardTitle>
            <CardDescription>Update your public shop profile, logo, and links</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center justify-center">
                  {shop?.logo_url ? (
                    <img src={shop.logo_url} alt="Shop Logo" className="w-8 h-8 rounded-md object-cover" />
                  ) : (
                    <Store size={20} />
                  )}
                </div>
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-200 line-clamp-1">{shop?.name || 'My Shop'}</p>
                  <p className="text-xs text-slate-500">View Shop Setup</p>
                </div>
              </div>
              <ArrowRight size={18} className="text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
            </div>
          </CardContent>
        </Card>

        {/* Subscription Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Star className="w-5 h-5 text-amber-500" />
              Subscription Plan
            </CardTitle>
            <CardDescription>Your current billing and plan details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-xl flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-amber-700 text-lg">Freemium</span>
                  <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Active</span>
                </div>
                <p className="text-xs text-amber-600/80 font-medium">Free forever for basic features.</p>
              </div>
              <Star size={28} className="text-amber-200" />
            </div>
            
            <Button 
              className="w-full bg-amber-500 hover:bg-amber-600 text-white border-0" 
              onClick={() => navigate('/subscription')}
            >
              Manage Subscription
            </Button>
          </CardContent>
        </Card>

        {/* App Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Smartphone className="w-5 h-5 text-slate-500" />
              App Information
            </CardTitle>
            <CardDescription>Version and system details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-sm text-slate-600 dark:text-slate-400">Version</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">v1.0.0</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-sm text-slate-600 dark:text-slate-400">Environment</span>
              <span className="font-medium text-slate-800 dark:text-slate-200 capitalize">{import.meta.env.MODE || 'production'}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-slate-600 dark:text-slate-400">Notifications</span>
              <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Enabled</span>
            </div>
          </CardContent>
        </Card>
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
            <div className="space-y-6 animate-fade-in">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="text-emerald-600 w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-800 text-lg">Almost Done!</h3>
                <p className="text-sm text-slate-500">
                  Enter the 6-digit code sent to your new email: <br/>
                  <strong className="text-slate-700">{newEmail}</strong>
                </p>
              </div>
              
              <Input
                value={newEmailOtp}
                onChange={(e) => setNewEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                maxLength={6}
                required
                autoFocus
                className="text-center text-xl tracking-[0.5em] font-mono"
              />

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setEmailStep(2)} type="button">Back</Button>
                <Button 
                  onClick={handleFinalizeEmailChange}
                  disabled={isSubmitting || newEmailOtp.length !== 6}
                >
                  {isSubmitting ? 'Updating...' : 'Confirm & Change Email'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
