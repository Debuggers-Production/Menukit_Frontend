import React from 'react';
import { 
  Store, Shield, Phone, Mail, CheckCircle2, ChevronRight, 
  Trash2, AlertCircle, ShieldCheck 
} from 'lucide-react';
import { Link } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface AccountSettingsTabProps {
  user: any;
  shop: any;
  onNavigateToShopSetup: () => void;
  onOpenPhoneModal: () => void;
  onOpenEmailModal: () => void;
  onOpenLicensesModal: () => void;
  onOpenDeleteShopModal: () => void;
  onOpenDeleteAccountModal: () => void;
}

export const AccountSettingsTab: React.FC<AccountSettingsTabProps> = ({
  user,
  shop,
  onNavigateToShopSetup,
  onOpenPhoneModal,
  onOpenEmailModal,
  onOpenLicensesModal,
  onOpenDeleteShopModal,
  onOpenDeleteAccountModal,
}) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Account Profile Card */}
      <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4 bg-slate-50/50 dark:bg-slate-900/50">
          <CardTitle className="text-base font-bold">Account Profile</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-6">
          {/* Shop Details Shortcut */}
          <div 
            className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 cursor-pointer hover:border-primary/50 transition-colors group" 
            onClick={onNavigateToShopSetup}
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                {shop?.logo_url ? <img src={shop.logo_url} alt="Logo" className="w-full h-full rounded-xl object-cover" /> : <Store size={20} />}
              </div>
              <div>
                <p className="font-bold text-sm text-slate-800 dark:text-slate-100">{shop?.name || 'My Shop'}</p>
                <p className="text-xs text-slate-500">Edit shop name, logo, banner & hours</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-slate-400 group-hover:text-primary transition-all shrink-0 ml-2" />
          </div>

          {/* Mobile Number & Security */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center font-black shrink-0">
                <Phone size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Registered Mobile</p>
                  {user?.phone_verified ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                      <CheckCircle2 size={10} /> Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400 px-2 py-0.5 rounded-full">
                      Unverified
                    </span>
                  )}
                </div>
                <p className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  {user?.phone || 'No mobile number linked'}
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onOpenPhoneModal} 
              className="rounded-xl font-bold cursor-pointer"
            >
              {user?.phone ? 'Change Mobile' : 'Link Mobile'}
            </Button>
          </div>

          {/* Email & Security */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center font-black uppercase text-sm shrink-0">
                {user?.email?.[0] || 'U'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Signed In Email</p>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                    <CheckCircle2 size={10} /> Verified
                  </span>
                </div>
                <p className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{user?.email}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={onOpenEmailModal} className="rounded-xl font-bold cursor-pointer">
              Change Email
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 2. Compliance, Legal Disclosures & Licenses Card */}
      <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div>
              <CardTitle className="text-base font-bold">Compliance, Legal Disclosures & Licenses</CardTitle>
              <CardDescription className="text-xs">
                Statutory policies, privacy preferences, open-source attributions, and legal entity details.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-5">
          {/* 3-Column Policy Links */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              to="/terms"
              target="_blank"
              className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-primary/50 dark:hover:border-primary/50 transition-all bg-slate-50/40 dark:bg-slate-900/40 group block"
            >
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors">
                Terms of Service
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                SaaS usage rules & liability
              </p>
            </Link>

            <Link
              to="/privacy"
              target="_blank"
              className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-primary/50 dark:hover:border-primary/50 transition-all bg-slate-50/40 dark:bg-slate-900/40 group block"
            >
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors">
                Privacy Policy
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                DPDP Act, 2023 & data security
              </p>
            </Link>

            <Link
              to="/refund-policy"
              target="_blank"
              className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-primary/50 dark:hover:border-primary/50 transition-all bg-slate-50/40 dark:bg-slate-900/40 group block"
            >
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors">
                Refund Policy
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Cooling-off & cancellation rules
              </p>
            </Link>
          </div>

          {/* Cookie & Telemetry Preferences */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Cookie & Telemetry Preferences</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Manage analytics and advertising consent choices</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.dispatchEvent(new CustomEvent('open_cookie_preferences'))}
              className="rounded-xl font-bold cursor-pointer shrink-0"
            >
              Manage Cookies
            </Button>
          </div>

          {/* Open-Source Software Notices */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Open-Source Software Notices</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Third-party MIT, Apache 2.0 & BSD open source components</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenLicensesModal}
              className="rounded-xl font-bold cursor-pointer shrink-0"
            >
              View Licenses
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 3. Danger Zone: Account & Shop Deactivation */}
      <Card className="border-rose-200 dark:border-rose-950/60 bg-rose-50/20 dark:bg-rose-950/10 shadow-xs">
        <CardHeader className="border-b border-rose-100 dark:border-rose-950/40 pb-4">
          <CardTitle className="text-base font-bold text-rose-700 dark:text-rose-400 flex items-center gap-2">
            <Trash2 size={18} />
            <span>Danger Zone: Deactivation & Restoration Options</span>
          </CardTitle>
          <CardDescription className="text-rose-600/80 dark:text-rose-400/80">
            Secure deactivation protected by Email OTP. Data is safely preserved in our database (is_deleted=True) and fully restorable upon client claim.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-6">
          {/* Option 1: Individual Shop Deactivation */}
          {shop && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-rose-100 dark:border-rose-950/40">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Store size={14} className="text-rose-600" />
                  <span>Deactivate Current Shop Profile ({shop.name})</span>
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
                  Deactivates only this storefront ({shop.name}). The shop will be taken offline (is_deleted=True) and hidden from discovery. All menu items, orders, and settings are preserved in our database and can be restored anytime by contacting <span className="font-semibold text-rose-600">debuggerstechs@gmail.com</span>.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenDeleteShopModal}
                className="rounded-xl font-bold text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-950/40 shrink-0 cursor-pointer"
              >
                Deactivate This Shop
              </Button>
            </div>
          )}

          {/* Option 2: Full Master Account Deactivation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertCircle size={14} className="text-rose-600" />
                <span>Deactivate Master Account & All Storefronts</span>
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
                Deactivates your merchant login and takes all registered storefronts offline (is_deleted=True). Your data remains safely archived and preserved in our database. You can restore your account and all shops at any time upon request to <span className="font-semibold text-rose-600">debuggerstechs@gmail.com</span>.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenDeleteAccountModal}
              className="rounded-xl font-bold text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-950/40 shrink-0 cursor-pointer"
            >
              Deactivate Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
