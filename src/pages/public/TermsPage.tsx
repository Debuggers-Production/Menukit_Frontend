import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { 
  ArrowLeft, 
  FileText, 
  ShieldCheck, 
  Printer, 
  Building2, 
  CreditCard, 
  ShoppingBag, 
  RefreshCcw,
  RotateCcw, 
  AlertTriangle, 
  HelpCircle, 
  ChevronRight,
  ExternalLink,
  Lock,
  Mail,
  MapPin,
  Clock,
  Megaphone,
  Gift,
  Store,
  Layers,
  Cake
} from 'lucide-react';
import logo from '@/assets/menukit-logo.svg';

const TOC_SECTIONS = [
  { id: 'introduction', label: '1. Introduction & Multi-Industry Scope' },
  { id: 'acceptance', label: '2. Acceptance & IT Act Compliance' },
  { id: 'services', label: '3. Platform Role & Technology Intermediary' },
  { id: 'subscriptions-ads', label: '4. Subscriptions, Free Trials & Ad Placement' },
  { id: 'account', label: '5. User Verification & OTP Security' },
  { id: 'ordering', label: '6. Ordering Channels & Fulfilment' },
  { id: 'pricing-payments', label: '7. Pricing, Taxes & Payments' },
  { id: 'cancellation-refunds', label: '8. Cancellation, Refunds & Replacements' },
  { id: 'discounts-contests', label: '9. Discounts, Price Drops & Lucky Draws' },
  { id: 'acceptable-use', label: '10. Prohibited Conduct & Fair Use' },
  { id: 'intellectual-property', label: '11. Intellectual Property' },
  { id: 'disclaimers-liability', label: '12. Warranties & Limitation of Liability' },
  { id: 'governing-law', label: '13. Governing Law & Jurisdiction' },
  { id: 'grievance', label: '14. Grievance Redressal & Contact' },
];

export function TermsPage() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('introduction');

  useEffect(() => {
    document.title = 'Terms of Service | Menukit';
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
              <div className="hidden sm:block">
                <span className="font-extrabold text-base tracking-tight">
                  <span className="text-orange-600 dark:text-orange-500">Menukit</span>
                </span>
                <span className="text-[10px] block text-slate-400 font-medium -mt-1">by Debuggers Technologies</span>
              </div>
            </Link>
          </div>

          {/* Toggle Pills: Terms vs Privacy */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1 text-xs font-bold">
            <Link
              to="/terms"
              className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-xs flex items-center gap-1.5"
            >
              <FileText size={14} />
              <span>Terms of Service</span>
            </Link>
            <Link
              to="/privacy"
              className="px-3.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1.5"
            >
              <ShieldCheck size={14} />
              <span>Privacy Policy</span>
            </Link>
            <Link
              to="/refund-policy"
              className="px-3.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1.5 hidden sm:flex"
            >
              <RotateCcw size={14} />
              <span>Refund Policy</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              title="Print Documentation"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
            >
              <Printer size={15} />
              <span>Print</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Sticky Sidebar (TOC) */}
          <aside className="hidden lg:block lg:col-span-4 sticky top-24 space-y-4 print:hidden">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3.5 flex items-center gap-2">
                <FileText size={14} className="text-orange-500" />
                <span>Table of Contents</span>
              </h3>
              <nav className="space-y-1 text-xs">
                {TOC_SECTIONS.map((sec) => (
                  <a
                    key={sec.id}
                    href={`#${sec.id}`}
                    onClick={() => setActiveSection(sec.id)}
                    className={`block px-3 py-2 rounded-xl transition-all font-medium ${
                      activeSection === sec.id
                        ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {sec.label}
                  </a>
                ))}
              </nav>

              <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 space-y-2">
                <div className="flex items-center gap-1.5 font-semibold text-slate-600 dark:text-slate-300">
                  <Clock size={13} className="text-orange-500" />
                  <span>Last Updated: October 2026</span>
                </div>
                <p>Governed by the Information Technology Act, 2000 & Consumer Protection E-Commerce Rules, 2020.</p>
              </div>
            </div>
          </aside>

          {/* Right Main Legal Text */}
          <main className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-10 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-10 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            
            {/* Header Badge */}
            <div className="border-b border-slate-200/80 dark:border-slate-800 pb-6 space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100/80 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 text-xs font-bold">
                <ShieldCheck size={14} />
                <span>Official Legal Agreement</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Terms of Service
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Please review these Terms carefully before browsing digital catalogs, scanning QR codes, or ordering through the MenuKit platform.
              </p>
            </div>

            {/* Sections */}
            <div className="space-y-10 divide-y divide-slate-100 dark:divide-slate-800">
              
              {/* 1. Introduction */}
              <section id="introduction" className="scroll-mt-24 space-y-3">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center text-xs font-extrabold">1</span>
                  Introduction & Multi-Industry Scope
                </h2>
                <p>
                  Welcome to <strong>MenuKit</strong>, a multi-category digital commerce, cataloging, and order management platform developed, owned, and operated by{' '}
                  <a href="https://debuggerstechnologies.com/" target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline font-semibold inline-flex items-center gap-1">
                    Debuggers Technologies <ExternalLink size={12} />
                  </a>.
                </p>
                <p>
                  MenuKit powers modern digital storefronts, interactive QR code catalogs, POS billing, kitchen and pick-slip printing, live order tracking, customer discounts, and marketing tools across a broad spectrum of commercial industries, including but not limited to:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
                  <div className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 font-medium flex items-center gap-2">
                    <Store size={14} className="text-orange-500 shrink-0" />
                    <span>Restaurants, Cafes & Hotels</span>
                  </div>
                  <div className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 font-medium flex items-center gap-2">
                    <Layers size={14} className="text-orange-500 shrink-0" />
                    <span>Fashion Boutiques & Apparel</span>
                  </div>
                  <div className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 font-medium flex items-center gap-2">
                    <ShoppingBag size={14} className="text-orange-500 shrink-0" />
                    <span>Grocery & Supermarkets</span>
                  </div>
                  <div className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 font-medium flex items-center gap-2">
                    <Cake size={14} className="text-orange-500 shrink-0" />
                    <span>Bakeries & Sweet Stalls</span>
                  </div>
                  <div className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 font-medium flex items-center gap-2">
                    <CreditCard size={14} className="text-orange-500 shrink-0" />
                    <span>Electronics & Mobile Shops</span>
                  </div>
                  <div className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 font-medium flex items-center gap-2">
                    <Building2 size={14} className="text-orange-500 shrink-0" />
                    <span>Retail & Service Businesses</span>
                  </div>
                </div>
                <p className="text-xs pt-1">
                  Throughout these Terms, the words <strong>"MenuKit"</strong>, <strong>"we"</strong>, <strong>"us"</strong>, and <strong>"our"</strong> refer to Debuggers Technologies. <strong>"Merchant"</strong> or <strong>"Business Partner"</strong> refers to any shop, restaurant, retail vendor, boutique, or enterprise subscribing to our software. <strong>"Customer"</strong>, <strong>"User"</strong>, or <strong>"you"</strong> refers to any individual accessing digital menus, catalogs, placing orders, or utilizing merchant services powered by MenuKit.
                </p>
              </section>

              {/* 2. Acceptance & IT Act */}
              <section id="acceptance" className="scroll-mt-24 space-y-3 pt-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center text-xs font-extrabold">2</span>
                  Acceptance & Regulatory Compliance
                </h2>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
                  <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                    Electronic Contract Notice (IT Act, 2000):
                  </p>
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    This document constitutes an electronic record published pursuant to the provisions of Rule 3(1) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, and the Consumer Protection (E-Commerce) Rules, 2020. This electronic agreement does not require physical or digital signatures.
                  </p>
                </div>
                <p>
                  By scanning a MenuKit QR code, browsing our store discovery portal, exploring a merchant catalog, participating in discount contests, or placing an order, you unequivocally agree to be bound by these Terms and our companion <Link to="/privacy" className="text-orange-600 hover:underline font-semibold">Privacy Policy</Link>. If you do not accept these Terms, you must discontinue use of the Platform immediately.
                </p>
              </section>

              {/* 3. Platform Role */}
              <section id="services" className="scroll-mt-24 space-y-3 pt-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center text-xs font-extrabold">3</span>
                  Platform Role & Technology Intermediary
                </h2>
                <p>
                  MenuKit acts purely as a <strong>software-as-a-service (SaaS) technology intermediary</strong>. We supply the digital tools, cloud software, QR generation, catalog hosting, and dispatch routing enabling independent Merchants to sell their products and services directly to consumers.
                </p>
                <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/40 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                    <span>Independent Merchant Responsibility Disclaimer</span>
                  </div>
                  <p>
                    All manufacturing, cooking, ingredient safety, product quality, packaging, freshness, warranty claims, legal metrology standards, and physical fulfillment are strictly the sole operational and legal liability of the respective Merchant Partner. MenuKit does not manufacture, package, store, or sell any items listed on merchant menus or catalogs.
                  </p>
                </div>
              </section>

              {/* 4. Subscriptions, Free Trials & Ad Placement */}
              <section id="subscriptions-ads" className="scroll-mt-24 space-y-4 pt-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center text-xs font-extrabold">4</span>
                  Merchant Subscriptions, Free Trials & Ad Placement Policy
                </h2>
                <p>
                  MenuKit provides tiered software subscription plans (including promotional Free Trials, Monthly, Annual, and Enterprise tiers) that empower Merchants to operate their digital storefronts and access advanced platform features.
                </p>

                <div className="p-4 rounded-2xl bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200/70 dark:border-orange-900/40 space-y-2.5 text-xs text-orange-950 dark:text-orange-200">
                  <div className="font-bold flex items-center gap-2 text-orange-800 dark:text-orange-300">
                    <Megaphone size={16} className="text-orange-600 shrink-0" />
                    <span>Free Trial, Plan Expiration & Advertisement Injection Terms</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-1.5 leading-relaxed">
                    <li>
                      <strong>Promotional Free Trials:</strong> MenuKit may, at its sole discretion, grant Merchants access to trial periods without upfront software license charges. During free trial periods, digital menus and catalogs may display sponsored advertisements or partner promotions.
                    </li>
                    <li>
                      <strong>Subscription Expiration & Non-Renewal:</strong> If a Merchant's paid subscription expires, lapses, fails auto-renewal, or is not timely renewed, the Merchant's storefront automatically transitions into a sponsored, ad-supported tier.
                    </li>
                    <li>
                      <strong>Insertion of Third-Party Advertisements:</strong> In the ad-supported state (free tier, promotional trial, or expired/unrenewed status), MenuKit holds the unrestricted and absolute right to inject, display, rotate, and serve <strong>third-party advertisements, affiliate promotions, brand banners, and sponsored merchant recommendations</strong> on the Merchant’s public QR catalog, category pages, cart screen, and checkout confirmation.
                    </li>
                    <li>
                      <strong>Ad-Free Exclusivity:</strong> Completely ad-free digital menus and catalogs are exclusively reserved for Merchants maintaining an active, fully paid, and unexpired subscription plan. Advertisements are automatically suppressed upon successful subscription renewal.
                    </li>
                  </ul>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-xs space-y-1">
                  <p className="font-bold text-slate-800 dark:text-slate-200">Notice to End-Users / Customers Regarding Advertisements:</p>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    Customers browsing digital catalogs on trial or expired merchant accounts acknowledge that advertisements or sponsored banners are provided by independent third parties. MenuKit does not endorse, verify, or warrant products, services, or claims displayed in third-party advertisements. Clicking on any sponsored banner redirects you to third-party destinations governed by their respective terms and privacy policies.
                  </p>
                </div>
              </section>

              {/* 5. Accounts & OTP */}
              <section id="account" className="scroll-mt-24 space-y-3 pt-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center text-xs font-extrabold">5</span>
                  User Verification, Customer Accounts & Merchant Deactivation Architecture
                </h2>
                <p>
                  To place orders, track live order status, access merchant replacement credit balances, and participate in exclusive promotional contests, you may authenticate using your 10-digit mobile number via a One-Time Password (OTP).
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <li>You must provide an accurate, active, and legally registered mobile phone number.</li>
                  <li>You are solely responsible for maintaining the confidentiality of OTP codes sent to your device. Any order, redemption, or request verified via your mobile number is deemed authorized by you.</li>
                  <li>MenuKit reserves the right to suspend or block mobile numbers suspected of fraudulent activity, order abandonment, bot usage, or discount policy abuse.</li>
                </ul>

                <div className="p-4 rounded-2xl bg-orange-50/70 dark:bg-orange-950/30 border border-orange-200/70 dark:border-orange-800/40 text-xs text-orange-950 dark:text-orange-200 space-y-2 mt-3">
                  <h4 className="font-bold flex items-center gap-1.5 text-orange-800 dark:text-orange-300">
                    Merchant Account & Storefront Deactivation & Restoration Terms
                  </h4>
                  <ul className="list-disc pl-5 space-y-1 text-[11px] text-orange-900/90 dark:text-orange-200/90">
                    <li><strong>Mandatory Email OTP Verification:</strong> To protect merchants against unauthorized disruptions or malicious requests, self-service deactivation of a master merchant account or an individual shop profile strictly requires OTP verification sent to the merchant's registered email address.</li>
                    <li><strong>Soft-Deletion Policy (<code>is_deleted = True</code>):</strong> Confirming a deactivation request immediately revokes access sessions and takes the storefront offline. However, MenuKit preserves business configurations, menu catalogs, and transaction ledgers in the database under a deactivated flag (<code>is_deleted = True</code>) rather than performing an unrecoverable hard delete.</li>
                    <li><strong>Restoration Guarantee & Client Claims:</strong> The merchant may restore their deactivated shop profile or master account at any time by submitting an official restoration request from their registered email to <a href="mailto:debuggerstechs@gmail.com" className="font-bold underline text-orange-700 dark:text-orange-300">debuggerstechs@gmail.com</a>. Once verified, the storefront is restored with all items and settings intact.</li>
                    <li><strong>Individual Shop Deactivation:</strong> Merchants operating multiple shops or franchises may deactivate individual shop profiles without affecting other branches or their primary merchant account.</li>
                  </ul>
                </div>
              </section>

              {/* 6. Ordering Channels */}
              <section id="ordering" className="scroll-mt-24 space-y-3 pt-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center text-xs font-extrabold">6</span>
                  Ordering Channels, Catalog Browsing & Fulfilment
                </h2>
                <p>
                  MenuKit facilitates multiple order fulfillment channels based on the individual Merchant's business configuration:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs mb-1">In-Store / On-Premises</h4>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      Orders placed inside the shop, table, counter, trial room, or salon chair by scanning a localized QR code.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs mb-1">Takeaway & Store Pickup</h4>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      Click-and-collect orders where customers browse the catalog online and pick up packaged goods at the store counter.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs mb-1">Doorstep Delivery</h4>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      Dispatched directly to the customer's delivery address via the Merchant's in-house riders or local courier logistics.
                    </p>
                  </div>
                </div>
                <p className="text-xs">
                  For delivery orders, delivery fees are computed based on geographic distance steps set by the Merchant. Orders placed beyond a Merchant's maximum permissible delivery radius cannot be fulfilled.
                </p>
              </section>

              {/* 7. Pricing, Taxes & Payments */}
              <section id="pricing-payments" className="scroll-mt-24 space-y-3 pt-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center text-xs font-extrabold">7</span>
                  Pricing, Taxes & Payment Processing
                </h2>
                <p>
                  All catalog prices, item variants, and optional add-on charges are established solely by the Merchant Partner. Final checkout totals may include:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                  <li><strong>Item Subtotal:</strong> Base price of items, sizes, customizations, and add-ons selected by the customer.</li>
                  <li><strong>Goods & Services Tax (GST):</strong> CGST, SGST, or IGST as applicable under Indian tax laws, determined according to the Merchant's GST registration.</li>
                  <li><strong>Packaging & Delivery Charges:</strong> Packing materials, parcel bags, and distance-based delivery fees configured by the Merchant.</li>
                  <li><strong>Convenience & Gateway Charges:</strong> Nominal technology charges covering secure online transaction infrastructure.</li>
                </ul>
                <p className="text-xs">
                  Online payments are processed securely via RBI-licensed payment aggregators (such as <strong>Razorpay</strong>, UPI, Net Banking, and Credit/Debit Cards). MenuKit never stores or accesses your CVV, debit/credit card numbers, or UPI PINs.
                </p>
              </section>

              {/* 8. Cancellation, Refunds & Replacements */}
              <section id="cancellation-refunds" className="scroll-mt-24 space-y-3 pt-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center text-xs font-extrabold">8</span>
                  Cancellation, Refund & Replacement Policies
                </h2>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2.5 text-xs">
                  <p className="font-bold text-slate-900 dark:text-white">Shop-Level Discretion & Multi-Industry Policies:</p>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    Because MenuKit serves all commercial categories (retail stores, boutiques, supermarkets, bakeries, salons, pharmacies, electronics, home hardware, fireworks, restaurants, and general retail), <strong>refund, return, exchange, and cancellation terms are configured independently by each individual Merchant Partner purely based on their choice and business model</strong>.
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-300">
                    <li>
                      <strong>Independent Shop Policies:</strong> Return windows, restocking conditions, exchange rules, or strict no-refund policies are established solely by each respective shop. Customers should review the shop's individual posted policy prior to ordering.
                    </li>
                    <li>
                      <strong>Online Payment Refunds (7 Business Working Days):</strong> Where a digital prepaid order is approved for a refund by the merchant or platform (e.g. out-of-stock items or unfulfilled orders), prepaid funds are refunded back to the customer's original payment source within <strong>7 business working days</strong> via licensed payment aggregators.
                    </li>
                    <li>
                      <strong>In-Store / Offline Purchases:</strong> Counter returns, physical exchanges, cash refunds, or replacement store credits depend entirely on the individual shop's operating policy.
                    </li>
                  </ul>
                </div>
              </section>

              {/* 9. Discounts & Contests */}
              <section id="discounts-contests" className="scroll-mt-24 space-y-3 pt-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center text-xs font-extrabold">9</span>
                  Discounts, Price Drops & Lucky Draw Contests
                </h2>
                <p>
                  Merchants may run dynamic promotional campaigns through MenuKit’s marketing engine:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <li>
                    <strong>Automatic Price Drops & Spend Range Discounts:</strong> Store discounts configured for specific cart spend brackets (e.g. ₹100 – ₹299). These require no coupon code and permit unlimited repeat usage across eligible orders.
                  </li>
                  <li>
                    <strong>Single-Use Coupon Codes:</strong> Promotional coupons issued to a verified customer mobile number that automatically deactivate once successfully applied and ordered.
                  </li>
                  <li>
                    <strong>Promotional Contest Wheels & Lucky Spins:</strong> Gamified spin-the-wheel promotions that award discount coupons. Participation is restricted to verified phone numbers with fair anti-fraud safeguards. Contest rewards carry no cash redemption value, are non-transferable, and cannot be stacked unless permitted by the Merchant.
                  </li>
                </ul>
              </section>

              {/* 10. Prohibited Conduct */}
              <section id="acceptable-use" className="scroll-mt-24 space-y-3 pt-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center text-xs font-extrabold">10</span>
                  Prohibited Conduct & Fair Use
                </h2>
                <p>
                  Users and Merchants agree never to engage in the following prohibited behaviors:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <li>Submitting false, prank, or abusive test orders causing commercial harm or inventory loss.</li>
                  <li>Deploying automated bots, scrapers, or scripts to manipulate discount codes, spin wheels, or catalog pricing.</li>
                  <li>Decompiling, reverse engineering, or exploiting vulnerabilities in the MenuKit software or API endpoints.</li>
                  <li>Posting defamatory, fraudulent, obscene, or infringing content in product descriptions, order instructions, or review widgets.</li>
                  <li>Attempting to bypass subscription tiers or maliciously block advertisement injection mechanisms on unpaid or expired merchant menus.</li>
                </ul>
              </section>

              {/* 11. Intellectual Property */}
              <section id="intellectual-property" className="scroll-mt-24 space-y-3 pt-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center text-xs font-extrabold">11</span>
                  Intellectual Property
                </h2>
                <p>
                  The MenuKit brand, logos, software source code, cloud architecture, user interfaces, algorithms, and design elements are the exclusive intellectual property of <strong>Debuggers Technologies</strong>.
                </p>
                <p className="text-xs">
                  Merchant logos, brand marks, catalog photos, and product trademarks displayed on individual digital storefronts belong to their respective proprietors and are hosted under license solely for commercial display on the Platform.
                </p>
              </section>

              {/* 12. Disclaimers & Liability */}
              <section id="disclaimers-liability" className="scroll-mt-24 space-y-3 pt-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center text-xs font-extrabold">12</span>
                  Disclaimer of Warranties & Limitation of Liability
                </h2>
                <p>
                  The Platform is provided on an <strong>"as is" and "as available"</strong> basis without warranties of any kind. MenuKit disclaims all implied warranties of merchantability, fitness for a particular commercial purpose, or uninterrupted service.
                </p>
                <p className="text-xs">
                  To the maximum extent permitted by applicable Indian law, Debuggers Technologies shall not be liable for any indirect, incidental, punitive, or consequential damages resulting from merchant product defects, food allergies, delivery transit delays, third-party advertisements, or banking gateway failures. In all circumstances, MenuKit’s cumulative aggregate liability shall not exceed the technology platform convenience fee received by MenuKit for the specific transaction giving rise to the claim.
                </p>
              </section>

              {/* 13. Governing Law */}
              <section id="governing-law" className="scroll-mt-24 space-y-3 pt-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center text-xs font-extrabold">13</span>
                  Governing Law & Dispute Resolution
                </h2>
                <p>
                  These Terms shall be governed by, interpreted, and construed exclusively in accordance with the laws of <strong>India</strong>. Any legal dispute, arbitration, or claim arising out of or in connection with these Terms or the use of MenuKit shall be submitted to the exclusive jurisdiction of the competent courts in <strong>Madurai, Tamil Nadu, India</strong>.
                </p>
              </section>

              {/* 14. Grievance Officer */}
              <section id="grievance" className="scroll-mt-24 space-y-4 pt-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center text-xs font-extrabold">14</span>
                  Grievance Redressal & Contact Information
                </h2>
                <p className="text-xs">
                  In accordance with the Information Technology Act, 2000, and the Consumer Protection (E-Commerce) Rules, 2020, our designated Grievance Officer and official contact details are provided below:
                </p>

                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                  <p className="font-extrabold text-sm text-slate-900 dark:text-white">
                    <a href="https://debuggerstechnologies.com/" target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-orange-600 transition-colors">
                      Debuggers Technologies
                    </a> (<span className="text-orange-600 dark:text-orange-500">Menukit</span>)
                  </p>
                  <p className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <Mail size={14} className="text-orange-500 shrink-0" />
                    <span><strong>Email:</strong> <a href="mailto:debuggerstechs@gmail.com" className="text-orange-600 hover:underline">debuggerstechs@gmail.com</a></span>
                  </p>
                  <p className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <Building2 size={14} className="text-orange-500 shrink-0" />
                    <span>
                      <strong>Entity:</strong>{' '}
                      <a 
                        href="https://debuggerstechnologies.com/" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-orange-600 hover:underline inline-flex items-center gap-1 font-semibold"
                      >
                        Debuggers Technologies <ExternalLink size={12} />
                      </a>
                    </span>
                  </p>
                  <p className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                    <MapPin size={14} className="text-orange-500 shrink-0 mt-0.5" />
                    <span><strong>Registered Address:</strong> Perungudi, Madurai, Tamil Nadu - 625022, India</span>
                  </p>
                  <p className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <Clock size={14} className="text-orange-500 shrink-0" />
                    <span><strong>Support & Grievance Hours:</strong> 9:00 AM – 6:00 PM IST (Monday – Saturday)</span>
                  </p>
                  <p className="pt-2 text-[11px] text-slate-500 border-t border-slate-200/60 dark:border-slate-700/60">
                    Turnaround time: Grievances are acknowledged within 48 hours and resolved in accordance with statutory guidelines.
                  </p>
                </div>
              </section>

            </div>

            {/* Bottom Actions */}
            <div className="pt-6 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between flex-wrap gap-4 text-xs font-medium">
              <span className="text-slate-400">© 2026 Debuggers Technologies. All rights reserved.</span>
              <div className="flex items-center gap-4">
                <Link to="/privacy" className="text-orange-600 hover:underline font-bold flex items-center gap-1">
                  <span>Read Privacy Policy</span>
                  <ChevronRight size={14} />
                </Link>
              </div>
            </div>

          </main>
        </div>
      </div>
    </div>
  );
}
