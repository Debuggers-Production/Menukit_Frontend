import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { 
  ArrowLeft, 
  RotateCcw, 
  FileText, 
  Printer, 
  ShieldCheck, 
  HelpCircle, 
  AlertTriangle, 
  Clock, 
  CreditCard, 
  Building2, 
  Mail, 
  CheckCircle2, 
  ShoppingBag,
  ExternalLink,
  Store,
  Layers
} from 'lucide-react';
import logo from '@/assets/menukit-logo.svg';

const TOC_SECTIONS = [
  { id: 'overview', label: '1. Refund Policy Overview & Multi-Industry Scope' },
  { id: 'saas-subscriptions', label: '2. Merchant SaaS Subscriptions & Plans' },
  { id: 'shop-policies', label: '3. Shop-Level Return & Cancellation Policies' },
  { id: 'damaged-defective', label: '4. Damaged, Defective or Incorrect Items' },
  { id: 'processing-timelines', label: '5. Refund Processing Timelines (7 Working Days)' },
  { id: 'disputes-chargebacks', label: '6. Payment Disputes & Chargebacks' },
  { id: 'contact-support', label: '7. Support & Merchant Assistance' },
];

export function RefundPolicyPage() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => {
    document.title = 'Refund & Cancellation Policy | MenuKit';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/discover');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 transition-colors">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-all cursor-pointer"
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>

            <Link to="/discover" className="flex items-center gap-2 group">
              <img src={logo} alt="MenuKit" className="w-8 h-8 group-hover:scale-105 transition-transform" />
              <div>
                <span className="font-extrabold text-base tracking-tight">
                  <span className="text-orange-600 dark:text-orange-500">Menukit</span>
                </span>
                <span className="text-[10px] text-slate-400 block -mt-1 font-medium">by Debuggers Technologies</span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-all cursor-pointer"
              title="Print or Save as PDF"
            >
              <Printer size={15} />
              <span className="hidden sm:inline">Print / PDF</span>
            </button>
            <Link
              to="/terms"
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-2.5 py-1.5 rounded-lg transition-colors hidden md:inline-block"
            >
              Terms
            </Link>
            <Link
              to="/privacy"
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-2.5 py-1.5 rounded-lg transition-colors hidden md:inline-block"
            >
              Privacy
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="bg-gradient-to-b from-orange-50/60 via-amber-50/20 to-transparent dark:from-orange-950/20 dark:via-transparent border-b border-slate-200/60 dark:border-slate-800/60 py-10 sm:py-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100/80 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 text-xs font-bold tracking-wide">
            <RotateCcw size={14} className="shrink-0" />
            <span>Multi-Industry Commerce & Consumer Trust</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Refund & Cancellation Policy
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Clear guidelines on SaaS subscriptions, shop-level customer policies, and transparent 7-working-day banking reversals.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Clock size={13} className="text-orange-500" />
              Effective Date: November 1, 2026
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <ShieldCheck size={13} className="text-emerald-500" />
              RBI & Consumer Protection (E-Commerce) Rules Compliant
            </span>
          </div>
        </div>
      </div>

      {/* Content Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Table of Contents - Desktop Sticky Sidebar */}
          <aside className="hidden lg:block lg:col-span-4 sticky top-24 space-y-4 print:hidden">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
                <FileText size={16} className="text-orange-600" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Contents
                </h3>
              </div>
              <nav className="space-y-1">
                {TOC_SECTIONS.map((sec) => (
                  <a
                    key={sec.id}
                    href={`#${sec.id}`}
                    onClick={() => setActiveSection(sec.id)}
                    className={`block px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      activeSection === sec.id
                        ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 font-bold border-l-2 border-orange-600 pl-2.5'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {sec.label}
                  </a>
                ))}
              </nav>
            </div>

            {/* Quick Contact Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500/5 via-amber-500/5 to-transparent border border-orange-200/60 dark:border-orange-900/30 text-xs space-y-2">
              <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400 font-bold">
                <HelpCircle size={15} />
                <span>Need Assistance?</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                Reach our customer care and merchant helpdesk directly (9:00 AM – 6:00 PM IST):
              </p>
              <a
                href="mailto:debuggerstechs@gmail.com"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline pt-1"
              >
                <Mail size={13} />
                debuggerstechs@gmail.com
              </a>
            </div>
          </aside>

          {/* Main Legal Document Content */}
          <main className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-10 shadow-xs space-y-8 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            {/* 1. Overview */}
            <section id="overview" className="scroll-mt-24 space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center text-xs font-extrabold">1</span>
                Refund Policy Overview & Multi-Industry Scope
              </h2>
              <p>
                This Refund & Cancellation Policy governs the terms under which refunds, order cancellations, and subscription credits are issued across the <strong>MenuKit</strong> platform, developed, owned, and operated by{' '}
                <a href="https://debuggerstechnologies.com/" target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline font-semibold inline-flex items-center gap-1">
                  Debuggers Technologies <ExternalLink size={12} />
                </a>.
              </p>
              <p>
                MenuKit is a versatile multi-category digital cataloging, POS billing, and ordering technology platform. We support businesses across all commercial categories—including <strong>retail stores, boutiques, supermarkets, bakeries, salons, pharmacies, electronics, home hardware, fireworks & celebratory stores, hospitality, and general commercial establishments</strong>.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-xl border border-orange-200/80 dark:border-orange-900/40 bg-orange-50/50 dark:bg-orange-950/20">
                  <div className="font-bold text-xs text-orange-900 dark:text-orange-300 flex items-center gap-1.5 mb-1">
                    <Layers size={14} className="text-orange-600" />
                    <span>Part A: Merchant Software Subscriptions</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                    Applies to business owners subscribing to MenuKit Pro, Starter, or Enterprise SaaS platform tiers.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                  <div className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-1">
                    <Store size={14} className="text-slate-600" />
                    <span>Part B: Shop-Level Customer Orders</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                    Applies to orders placed with independent merchants, where refund and return rules are determined by each respective shop.
                  </p>
                </div>
              </div>
            </section>

            {/* 2. Merchant SaaS Subscriptions */}
            <section id="saas-subscriptions" className="scroll-mt-24 space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center text-xs font-extrabold">2</span>
                Merchant SaaS Subscriptions & Plans
              </h2>
              <p>
                Business partners subscribe to MenuKit software plans on monthly or annual billing cycles:
              </p>
              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2 text-xs">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-500" />
                    <span>14-Day Statutory Cooling-Off & Initial Satisfaction Guarantee</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    If you are a newly subscribed Merchant and are not satisfied with MenuKit software features, you may request a <strong>100% full refund</strong> within <strong>14 calendar days</strong> of your initial paid subscription date.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2 text-xs">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <RotateCcw size={15} className="text-indigo-500" />
                    <span>Auto-Renewal & Cancellation Rules</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-300">
                    <li>
                      <strong>Self-Service Cancellation:</strong> Merchants can toggle auto-renewal off at any time from the <em>Subscription Marketplace</em> or <em>Settings &gt; Security & Account</em> tab.
                    </li>
                    <li>
                      <strong>Grace Period:</strong> Features remain active through the end of the paid billing period.
                    </li>
                    <li>
                      <strong>Accidental Renewal Notice:</strong> If an annual plan renews automatically and you did not intend to continue, a full refund may be requested within <strong>48 hours</strong> of the renewal charge.
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 3. Shop-Level Return & Cancellation Policies */}
            <section id="shop-policies" className="scroll-mt-24 space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center text-xs font-extrabold">3</span>
                Shop-Level Return & Cancellation Policies
              </h2>
              <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/40 text-xs text-amber-900 dark:text-amber-200 space-y-2">
                <div className="font-bold flex items-center gap-2 text-amber-800 dark:text-amber-300">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                  <span>Refund and Return Policies are Purely Determined by Each Independent Shop</span>
                </div>
                <p className="leading-relaxed">
                  <span className="text-orange-600 dark:text-orange-500">Menukit</span> and Debuggers Technologies operate strictly as a <strong>software technology provider</strong> and do not own, manufacture, package, sell, or deliver any products listed on merchant catalogs.
                </p>
                <p className="leading-relaxed">
                  Because MenuKit serves all types of commercial businesses, <strong>the refund, return, exchange, and cancellation policy is set entirely by each individual shop and varies from store to store purely based on their choice and business model</strong>:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 leading-relaxed">
                  <li>Some shops operate on a strict <em>no-refund / no-cancellation</em> policy once an order is placed or fulfilled.</li>
                  <li>Other shops offer returns, size exchanges, or store credits within their own specified return window (e.g. 24 hours, 7 days, or 14 days).</li>
                  <li>In-store refunds, replacements, cash reversals, or credit balances depend purely on the specific shop's operating rules.</li>
                </ul>
                <p className="leading-relaxed pt-1 font-medium">
                  Customers are encouraged to review the specific shop's posted cancellation notes visible on their digital storefront, catalog description, or order confirmation prior to placing an order.
                </p>

                {/* Savings Schemes & Festive Hamper Plans Notice */}
                <div className="mt-3 p-3.5 rounded-xl bg-orange-50/70 dark:bg-orange-950/20 border border-orange-200/70 dark:border-orange-900/40 space-y-1.5 text-xs text-orange-950 dark:text-orange-200">
                  <div className="font-bold flex items-center gap-1.5 text-orange-800 dark:text-orange-300">
                    <ShieldCheck size={14} className="text-orange-600 shrink-0" />
                    <span>Customer Savings Schemes & Festive Hamper Plans (Pandu Schemes)</span>
                  </div>
                  <p className="leading-relaxed text-[11px]">
                    Installments contributed toward customer savings schemes (e.g. Deepavali cracker funds, monthly savings clubs, jewelry hampers) are paid or transmitted directly to the respective shop owner. <strong>MenuKit acts solely as a SaaS software provider and does not hold custody of scheme funds. MenuKit cannot process scheme cancellations, midway withdrawals, or installment refunds.</strong> Any claim for mid-term exit, cash surrender, or dispute must be resolved directly with the physical store management under their bilateral scheme agreement. Customers are advised to verify the credibility of the shop twice before joining.
                  </p>
                </div>
              </div>
            </section>

            {/* 4. Damaged, Defective or Incorrect Items */}
            <section id="damaged-defective" className="scroll-mt-24 space-y-3 pt-6 border-t border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center text-xs font-extrabold">4</span>
                Damaged, Defective or Incorrect Items
              </h2>
              <p>
                In cases where an order cannot be fulfilled by the shop (e.g., store closure, out-of-stock items, or merchant cancellation), or if delivered items are verified as missing or defective:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                <li>The merchant may issue a direct replacement, in-store credit, or approve a full refund.</li>
                <li>For prepaid digital orders cancelled by the merchant due to stockout, the online payment will be reversed back to the customer's account.</li>
                <li>Please notify the merchant or support desk promptly with your Order ID and photo evidence if items arrive damaged or incorrect.</li>
              </ul>
            </section>

            {/* 5. Processing Timelines (7 Working Days) */}
            <section id="processing-timelines" className="scroll-mt-24 space-y-3 pt-6 border-t border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center text-xs font-extrabold">5</span>
                Refund Processing Timelines (7 Business Working Days)
              </h2>
              <p>
                When an online payment refund is approved by the merchant or platform, the payment is initiated through licensed banking aggregators (Razorpay / UPI / Card Networks):
              </p>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-3 text-xs">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                  <CreditCard size={16} className="text-orange-600" />
                  <span>Standard 7 Business Working Days Turnaround</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  All online payment refunds (UPI, Debit/Credit Cards, Net Banking) are credited back to the customer's original payment source within <strong>7 business working days</strong>, subject to standard bank clearance schedules.
                </p>
                <div className="pt-1 text-[11px] text-slate-500 space-y-1">
                  <p>• <strong>Online Payments (UPI, Cards, Net Banking):</strong> Credited to original source account within 7 business working days.</p>
                  <p>• <strong>In-Store / Offline Purchases:</strong> Handled directly at the store counter in accordance with the individual shop's policy.</p>
                </div>
              </div>
            </section>

            {/* 6. Disputes & Chargebacks */}
            <section id="disputes-chargebacks" className="scroll-mt-24 space-y-3 pt-6 border-t border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center text-xs font-extrabold">6</span>
                Payment Disputes & Chargebacks
              </h2>
              <p>
                If you encounter any billing anomaly or an unfulfilled prepaid order, we strongly encourage contacting our support team at <a href="mailto:debuggerstechs@gmail.com" className="text-orange-600 font-semibold hover:underline">debuggerstechs@gmail.com</a> or the merchant before lodging a bank dispute. Most inquiries are resolved amicably within 24 to 48 hours.
              </p>
            </section>

            {/* 7. Contact Support */}
            <section id="contact-support" className="scroll-mt-24 space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center text-xs font-extrabold">7</span>
                Support & Merchant Assistance
              </h2>
              <p>
                For questions regarding subscriptions, technical order disputes, or platform policies, reach out through the official contact points below:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-1.5">
                  <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Mail size={14} className="text-orange-600" />
                    Customer & Merchant Helpdesk
                  </p>
                  <p className="text-slate-600 dark:text-slate-400">
                    Email: <a href="mailto:debuggerstechs@gmail.com" className="text-orange-600 font-semibold hover:underline">debuggerstechs@gmail.com</a>
                  </p>
                  <p className="text-slate-500 text-[11px]">Hours: 9:00 AM – 6:00 PM IST (Mon–Sat)</p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-1.5">
                  <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Building2 size={14} className="text-orange-600" />
                    Operating Entity
                  </p>
                  <p className="text-slate-600 dark:text-slate-400">
                    <a href="https://debuggerstechnologies.com/" target="_blank" rel="noopener noreferrer" className="text-orange-600 font-semibold hover:underline inline-flex items-center gap-1">
                      Debuggers Technologies <ExternalLink size={12} />
                    </a>
                  </p>
                  <p className="text-slate-500 text-[11px]">Perungudi, Madurai, Tamil Nadu - 625022, India</p>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
