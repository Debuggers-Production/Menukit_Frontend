import React, { useState } from 'react';
import { 
  Headphones, Phone, Mail, Copy, Check, 
  Terminal, ExternalLink, ShieldCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { APP_VERSION } from '@/config/version';
import { WhatsAppIcon } from '../components/SettingsNavRail';

export const SUPPORT_EMAIL = 'debuggerstechs@gmail.com';
export const SUPPORT_PHONE = '+918248692839';
export const SUPPORT_PHONE_DISPLAY = '+91 82486 92839';

interface SupportSettingsTabProps {
  shop: any;
  user: any;
}

export const SupportSettingsTab: React.FC<SupportSettingsTabProps> = ({ shop, user }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, label: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`${label} copied to clipboard!`);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2000);
  };

  const shopName = shop?.name || 'My Store';
  const shopId = shop?.id || 'N/A';
  const merchantEmail = user?.email || 'N/A';
  const merchantPhone = user?.phone || 'N/A';

  const whatsappMessage = encodeURIComponent(
    `Hello Menukit Support Team,\n\nI need assistance with my store:\n- Store Name: ${shopName}\n- Shop ID: ${shopId}\n- Contact: ${merchantPhone || merchantEmail}\n\nIssue Details:\n`
  );

  const whatsappUrl = `https://wa.me/918248692839?text=${whatsappMessage}`;
  const emailUrl = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    `Support Request - ${shopName} (ID: ${shopId})`
  )}&body=${encodeURIComponent(
    `Hello Support,\n\nStore: ${shopName}\nShop ID: ${shopId}\nAccount: ${merchantEmail}\n\nPlease help me with:\n`
  )}`;

  const copyDiagnostics = () => {
    const diag = `=== MENUKIT MERCHANT DIAGNOSTICS ===
Store Name: ${shopName}
Shop ID: ${shopId}
Merchant Email: ${merchantEmail}
Merchant Phone: ${merchantPhone}
App Version: v${APP_VERSION || '2.1.2'}
Browser UserAgent: ${navigator.userAgent}
Screen Resolution: ${window.innerWidth}x${window.innerHeight}
Timestamp: ${new Date().toISOString()}
=====================================`;
    handleCopy(diag, 'Diagnostics summary', 'diag');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Professional Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 text-xs font-semibold">
            <ShieldCheck size={14} className="text-slate-600 dark:text-slate-400" />
            <span>Debuggers Technologies Official Support</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Merchant Care & Technical Support
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl">
            Get direct assistance with Menukit POS, thermal printers, online payments, billing configuration, or general inquiries.
          </p>
        </div>

        <div className="shrink-0">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300">
            <Headphones size={22} />
          </div>
        </div>
      </div>

      {/* 2. Structured 3-Channel Support Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* WhatsApp Assistance */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300">
              <WhatsAppIcon className="w-5 h-5 fill-slate-800 dark:fill-slate-200" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                WhatsApp Chat
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Instant messaging, screenshot sharing & voice note troubleshooting.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {SUPPORT_PHONE_DISPLAY}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(SUPPORT_PHONE, 'WhatsApp number', 'wa')}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded transition-colors cursor-pointer"
                title="Copy Number"
              >
                {copiedKey === 'wa' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-bold text-xs transition-colors cursor-pointer"
          >
            <WhatsAppIcon className="w-4 h-4 fill-white dark:fill-slate-900" />
            <span>Chat on WhatsApp</span>
            <ExternalLink size={12} className="opacity-70" />
          </a>
        </div>

        {/* Direct Phone Support */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300">
              <Phone size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Phone Hotline
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Direct telephone support with our technical engineering team.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {SUPPORT_PHONE_DISPLAY}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(SUPPORT_PHONE, 'Phone number', 'phone')}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded transition-colors cursor-pointer"
                title="Copy Number"
              >
                {copiedKey === 'phone' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          <a
            href={`tel:${SUPPORT_PHONE}`}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer"
          >
            <Phone size={13} />
            <span>Call Hotline</span>
          </a>
        </div>

        {/* Email Desk */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300">
              <Mail size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Email Desk
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Official inquiries, billing requests, and documentation.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate pr-2">
                {SUPPORT_EMAIL}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(SUPPORT_EMAIL, 'Support email', 'email')}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded transition-colors cursor-pointer shrink-0"
                title="Copy Email"
              >
                {copiedKey === 'email' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          <a
            href={emailUrl}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer"
          >
            <Mail size={13} />
            <span>Send Email</span>
          </a>
        </div>
      </div>

      {/* 3. Structured Diagnostics Card */}
      <Card className="border-slate-200/90 dark:border-slate-800 shadow-xs">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Terminal size={15} className="text-slate-600 dark:text-slate-400" />
                <span>Store Diagnostics & Session Information</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Share this summary with support agents to expedite troubleshooting.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={copyDiagnostics}
              className="gap-1.5 text-xs font-bold cursor-pointer shrink-0"
            >
              {copiedKey === 'diag' ? (
                <>
                  <Check size={14} className="text-emerald-600" />
                  <span>Copied Diagnostics</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>Copy Store Diagnostics</span>
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <span className="text-[10px] font-bold uppercase text-slate-400">Store Name</span>
              <p className="font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5">{shopName}</p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <span className="text-[10px] font-bold uppercase text-slate-400">Shop ID</span>
              <p className="text-slate-800 dark:text-slate-200 truncate mt-0.5">{shopId}</p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <span className="text-[10px] font-bold uppercase text-slate-400">Merchant User</span>
              <p className="text-slate-800 dark:text-slate-200 truncate mt-0.5">{merchantEmail || merchantPhone}</p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <span className="text-[10px] font-bold uppercase text-slate-400">Platform Version</span>
              <p className="text-slate-800 dark:text-slate-200 mt-0.5">v{APP_VERSION || '2.1.2'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
