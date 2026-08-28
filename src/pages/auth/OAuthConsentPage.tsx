import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Navigate } from 'react-router';
import { ShieldCheck, AlertCircle, Loader2, Store, User as UserIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { useShopStore } from '@/store/shopStore';
import { api } from '@/services/api';
import logo from "@/assets/menukit-logo.svg";
import { Button } from '@/components/ui/Button';

export function OAuthConsentPage() {
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get('client_id');
  const redirectUri = searchParams.get('redirect_uri');
  const responseType = searchParams.get('response_type');
  const scope = searchParams.get('scope');
  const state = searchParams.get('state');
  const codeChallenge = searchParams.get('code_challenge');
  const codeChallengeMethod = searchParams.get('code_challenge_method');

  const { isAuthenticated, user, logout, isLoading: isAuthLoading } = useAuthStore();
  const { shop, setShop } = useShopStore();
  const [shopName, setShopName] = useState<string | null>(shop?.name || null);
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  const handleSwitchAccount = async () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    useAuthStore.setState({ user: null, isAuthenticated: false });
    const currentPath = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/login?redirect=${currentPath}`;
  };

  useEffect(() => {
    if (isAuthenticated) {
      if (shop?.name) {
        setShopName(shop.name);
      } else {
        api.get('/shops/me').then(res => {
          if (res.data?.name) {
            setShopName(res.data.name);
            setShop(res.data);
          }
        }).catch(() => {});
      }
    }
  }, [isAuthenticated, shop]);

  // If not authenticated, redirect to login with the current full path so they return here
  if (!isAuthLoading && !isAuthenticated) {
    const currentPath = encodeURIComponent(window.location.pathname + window.location.search);
    return <Navigate to={`/login?redirect=${currentPath}`} replace />;
  }

  const handleAuthorize = async () => {
    if (!clientId || !redirectUri || !responseType || !scope || !codeChallenge) {
      toast.error('Missing required OAuth parameters');
      return;
    }

    setIsAuthorizing(true);
    try {
      // Create FormData as expected by FastAPI Form(...)
      const formData = new FormData();
      formData.append('client_id', clientId);
      formData.append('redirect_uri', redirectUri);
      formData.append('response_type', responseType);
      formData.append('scope', scope);
      formData.append('code_challenge', codeChallenge);
      formData.append('code_challenge_method', codeChallengeMethod || 'S256');
      if (state) formData.append('state', state);

      const response = await api.post('/oauth/authorize', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // The backend returns a JSON with the redirect URL
      if (response.data && response.data.redirect_url) {
        window.location.href = response.data.redirect_url;
      } else {
        toast.error('Invalid response from authorization server');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to authorize application');
    } finally {
      setIsAuthorizing(false);
    }
  };

  const handleDeny = () => {
    if (redirectUri) {
      const url = new URL(redirectUri);
      url.searchParams.append('error', 'access_denied');
      if (state) url.searchParams.append('state', state);
      window.location.href = url.toString();
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-primary-200 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-amber-200 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob animation-delay-2000"></div>

      <div className="w-full max-w-md z-10 bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden border border-slate-100 dark:border-slate-800 p-8 text-center">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-primary/30">
            <img src={logo} alt="MenuKit-Logo" className="w-12 h-12" />
          </div>
          <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-white">Authorize Application</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            An external application (like ChatGPT) is requesting access to your Menukit account.
          </p>
        </div>
        {/* User Account & Shop Info Card */}
        <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-3.5 mb-5 border border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-left">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-base shrink-0">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Signed In Account</p>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                {user?.email || 'Authenticated User'}
              </p>
              {shopName && (
                <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <Store className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="truncate">{shopName}</span>
                </div>
              )}
              <button
                type="button"
                onClick={handleSwitchAccount}
                className="text-[11px] font-bold text-primary hover:underline block mt-1 transition-colors"
              >
                Switch Account / Log in as different user →
              </button>
            </div>
          </div>
          <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full dark:bg-emerald-950/60 dark:text-emerald-300 shrink-0">
            Active
          </span>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 text-left mb-6 border border-slate-100 dark:border-slate-700/50">
          <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            Requested Permissions
          </h3>
          <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              Read your shop data and menus (menukit.read)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              Modify your shop data and menus (menukit.write)
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <Button 
            className="w-full h-12 text-base font-semibold" 
            onClick={handleAuthorize}
            disabled={isAuthorizing}
          >
            {isAuthorizing ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
            Allow Access
          </Button>
          <Button 
            variant="outline" 
            className="w-full h-12 text-base" 
            onClick={handleDeny}
            disabled={isAuthorizing}
          >
            Cancel
          </Button>
        </div>
        
        <p className="text-xs text-slate-400 mt-6 flex items-center justify-center gap-1">
          <AlertCircle className="w-3 h-3" />
          You can revoke access at any time from your dashboard.
        </p>
      </div>
    </div>
  );
}
