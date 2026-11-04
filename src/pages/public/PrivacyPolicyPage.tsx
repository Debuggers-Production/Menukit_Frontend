import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { 
  ArrowLeft,
  RotateCcw, 
  ShieldCheck, 
  FileText, 
  Printer, 
  Database, 
  Lock, 
  Eye, 
  Share2, 
  Server, 
  UserCheck, 
  Bell, 
  MapPin, 
  Mail, 
  Building2,
  Clock,
  ChevronRight,
  Cookie,
  ExternalLink,
  Megaphone,
  Store
} from 'lucide-react';
import logo from '@/assets/menukit-logo.svg';

const TOC_SECTIONS = [
  { id: 'overview', label: '1. Privacy Overview & Multi-Industry Scope' },
  { id: 'data-we-collect', label: '2. Information We Collect' },
  { id: 'how-we-use', label: '3. How We Use Your Data' },
  { id: 'cookies-storage', label: '4. Cookies & Local Session Storage' },
  { id: 'ads-telemetry', label: '5. Advertising & Free Tier Telemetry' },
  { id: 'third-parties', label: '6. Third-Party Sharing & Processors' },
  { id: 'data-security', label: '7. Data Security & Storage' },
  { id: 'data-retention', label: '8. Retention Period' },
  { id: 'your-rights', label: '9. User Rights under DPDP Act, 2023' },
  { id: 'children-privacy', label: '10. Minors & Children' },
  { id: 'policy-updates', label: '11. Changes to this Policy' },
  { id: 'contact-grievance', label: '12. Grievance Officer & Contact' },
];

export function PrivacyPolicyPage() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => {
    document.title = 'Privacy Policy | Menukit';
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
              className="px-3.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1.5"
            >
              <FileText size={14} />
              <span>Terms of Service</span>
            </Link>
            <Link
              to="/privacy"
              className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs flex items-center gap-1.5"
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
                <ShieldCheck size={14} className="text-emerald-500" />
                <span>Privacy Topics</span>
              </h3>
              <nav className="space-y-1 text-xs">
                {TOC_SECTIONS.map((sec) => (
                  <a
                    key={sec.id}
                    href={`#${sec.id}`}
                    onClick={() => setActiveSection(sec.id)}
                    className={`block px-3 py-2 rounded-xl transition-all font-medium ${
                      activeSection === sec.id
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {sec.label}
                  </a>
                ))}
              </nav>

              <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 space-y-2">
                <div className="flex items-center gap-1.5 font-semibold text-slate-600 dark:text-slate-300">
                  <Clock size={13} className="text-emerald-500" />
                  <span>Last Updated: October 2026</span>
                </div>
                <p>Compliant with the Digital Personal Data Protection Act, 2023 (DPDP Act) and the Information Technology Act, 2000.</p>
              </div>
            </div>
          </aside>

          {/* Right Main Privacy Text */}
          <main className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-10 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-10 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            
            {/* Header Badge */}
            <div className="border-b border-slate-200/80 dark:border-slate-800 pb-6 space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                <Lock size={14} />
                <span>Privacy & Data Protection</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Privacy Policy
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Your privacy is paramount. This policy discloses how MenuKit collects, uses, protects, and handles your personal data across multi-category digital stores.
              </p>
            </div>

            {/* Document Content */}
            <div className="space-y-10 divide-y divide-slate-100 dark:divide-slate-800">
              
              {/* 1. Overview */}
              <section id="overview" className="scroll-mt-24 space-y-3">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-extrabold">1</span>
                  Privacy Overview & Multi-Industry Scope
                </h2>
                <p>
                  At <strong>MenuKit</strong> (a software product of{' '}
                  <a href="https://debuggerstechnologies.com/" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline font-semibold inline-flex items-center gap-1">
                    Debuggers Technologies <ExternalLink size={12} />
                  </a>), we respect your fundamental right to privacy and are committed to safeguarding your personal data.
                </p>
                <p>
                  This Privacy Policy describes how we collect, process, store, and protect your information when you access our QR digital catalogs, store discovery portal, online delivery, pickup, in-store ordering, promotional contest wheels, and merchant dashboards across all supported commercial sectors:
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Including Restaurants, Cafes, Bakeries, Fashion Boutiques, Apparel Stores, Grocery & Supermarkets, Electronics, Health & Wellness, Salons & Spas, and General Retail/Service Establishments.
                </p>
                <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-800/40 text-xs text-emerald-900 dark:text-emerald-200">
                  By using our Platform, you explicitly consent to the data practices described in this Privacy Policy in accordance with the <strong>Digital Personal Data Protection Act, 2023 (DPDP Act)</strong> and the <strong>Information Technology Act, 2000</strong>.
                </div>
              </section>

              {/* 2. Data We Collect */}
              <section id="data-we-collect" className="scroll-mt-24 space-y-4 pt-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-extrabold">2</span>
                  Information We Collect
                </h2>
                <p>
                  We collect information necessary to deliver seamless digital shopping and ordering experiences:
                </p>
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs mb-1">A. Customer Profile & Contact Details</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Mobile phone number (for OTP verification, active order lookup, live status alerts, and contest spin tracking), optional customer display name, and delivery address / table number / token number.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs mb-1">B. Transaction & Order Details</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Catalog items selected, sizes, variants, customizations, order subtotal, GST calculations, promotional discount codes redeemed, replacement credits used, and payment status (Success/Pending/Failed).
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs mb-1">C. Geolocation Data</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      With your explicit browser or device permission, GPS coordinates are collected solely to calculate delivery distance fees, verify store delivery radiuses, and show nearby shops on the discovery portal.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs mb-1">D. Device & Technical Telemetry</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      IP address, browser type, operating system, screen dimensions, and Web Push / Firebase Cloud Messaging tokens for real-time order notifications.
                    </p>
                  </div>
                </div>
              </section>

              {/* 3. How We Use Data */}
              <section id="how-we-use" className="scroll-mt-24 space-y-3 pt-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-extrabold">3</span>
                  How We Use Your Information
                </h2>
                <p>We process your data exclusively for legitimate operational purposes:</p>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <li><strong>Order Routing & Fulfilment:</strong> Relaying order items, item notes, and customer address/table details to the Merchant's billing counter and preparation stations.</li>
                  <li><strong>Live Notifications:</strong> Dispatching real-time SMS updates and browser push alerts as your order moves from accepted to preparing, ready, or dispatched.</li>
                  <li><strong>Promotional Rewards & Fair Contests:</strong> Verifying unique phone numbers for lucky wheel contest plays, tracking automatic price drop eligibility, and maintaining replacement credit balances.</li>
                  <li><strong>Billing & Statutory Tax Compliance:</strong> Generating GST-compliant digital invoices and accounting audit logs.</li>
                  <li><strong>Platform Security:</strong> Detecting bot manipulation, fake test orders, and payment fraud.</li>
                </ul>
              </section>

              {/* 4. Cookies & Local Storage */}
              <section id="cookies-storage" className="scroll-mt-24 space-y-3 pt-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-extrabold">4</span>
                  Cookies & Browser Local Storage
                </h2>
                <p>
                  MenuKit utilizes browser <strong>LocalStorage</strong> and <strong>SessionStorage</strong> to deliver high-speed, frictionless browsing without forcing repetitive logins:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                    <p className="font-bold text-slate-800 dark:text-slate-200 mb-1">Cart & Order Persistence</p>
                    <p className="text-[11px] text-slate-500">Preserves your selected items, variants, and table/room number if the browser reloads.</p>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                    <p className="font-bold text-slate-800 dark:text-slate-200 mb-1">Customer Verification & Contests</p>
                    <p className="text-[11px] text-slate-500">Stores verified phone tokens, lucky spin eligibility, and discount codes claimed during your visit.</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  You can clear your browser storage at any time via your browser settings; clearing storage simply resets your active cart and cached preferences.
                </p>
              </section>

              {/* 5. Advertising & Free Tier Telemetry */}
              <section id="ads-telemetry" className="scroll-mt-24 space-y-3 pt-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-extrabold">5</span>
                  Advertising & Free Tier Telemetry
                </h2>
                <p>
                  As outlined in our Terms of Service, when a Merchant is operating on a <strong>Free Trial</strong> or has an <strong>Expired / Unrenewed Subscription</strong>, MenuKit serves third-party advertisements and sponsored merchant recommendations on their public catalog.
                </p>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                  <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Megaphone size={14} className="text-emerald-500" />
                    <span>How Advertising Data is Handled:</span>
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-400">
                    <li>
                      <strong>Zero PII Sharing with Advertisers:</strong> We do <strong>NOT</strong> sell, share, or disclose your personal identifiable information (name, phone number, delivery address, or order items) to third-party advertisers.
                    </li>
                    <li>
                      <strong>Non-Personal Telemetry:</strong> Only non-identifiable, aggregated technical metrics (e.g. ad banner impressions, clicks, screen dimensions, and coarse city-level geo-location) are processed to deliver and count ad displays.
                    </li>
                    <li>
                      <strong>External Ad Redirections:</strong> Clicking an advertisement redirects you away from MenuKit to the external advertiser’s website. Your interactions on external websites are governed entirely by that third party's independent privacy policies.
                    </li>
                  </ul>
                </div>
              </section>

              {/* 6. Third-Party Sharing */}
              <section id="third-parties" className="scroll-mt-24 space-y-3 pt-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-extrabold">6</span>
                  Third-Party Service Providers & Processors
                </h2>
                <p>
                  We share personal information strictly with trusted technological partners under confidentiality agreements to operate the Platform:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <li><strong>Merchant Partners:</strong> The specific shop or retail business you place an order with receives your contact details, delivery address, and ordered items to fulfill and invoice your transaction.</li>
                  <li><strong>Payment Aggregators (Razorpay):</strong> Transaction details are routed through PCI-DSS certified payment gateways for UPI, net banking, and card processing. MenuKit never stores CVVs or card details.</li>
                  <li><strong>Telecom & SMS Gateways:</strong> Fast2SMS / Twilio for automated delivery of OTPs and order status text messages.</li>
                  <li><strong>Cloud Infrastructure:</strong> High-security cloud hosting providers maintaining encrypted databases and protected APIs.</li>
                  <li><strong>Legal Compliance:</strong> If mandated by law enforcement or court orders under Indian jurisdiction.</li>
                </ul>
              </section>

              {/* 7. Security */}
              <section id="data-security" className="scroll-mt-24 space-y-3 pt-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-extrabold">7</span>
                  Data Security & Encryption
                </h2>
                <p>
                  MenuKit implements industry-standard technical and organizational security controls:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                    <Lock size={16} className="text-emerald-500 mb-1" />
                    <p className="font-bold text-slate-800 dark:text-slate-200">256-Bit SSL/TLS</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">All communications between client devices and MenuKit servers are encrypted in transit.</p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                    <Database size={16} className="text-emerald-500 mb-1" />
                    <p className="font-bold text-slate-800 dark:text-slate-200">Encrypted Storage</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Database credentials, tokens, and session records are cryptographically secured at rest.</p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                    <UserCheck size={16} className="text-emerald-500 mb-1" />
                    <p className="font-bold text-slate-800 dark:text-slate-200">Role-Based Access</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Strict administrative access privileges with audit trail logging.</p>
                  </div>
                </div>
              </section>

              {/* 8. Retention & Soft-Deletion Architecture */}
              <section id="data-retention" className="scroll-mt-24 space-y-3 pt-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-extrabold">8</span>
                  Data Retention & Restorable Soft-Deletion Architecture
                </h2>
                <p>
                  We retain personal order records for as long as necessary to complete commercial fulfillment, facilitate replacement credits, resolve disputes, and comply with tax and statutory financial audit mandates under Indian law (typically 7–8 years for financial ledgers). Non-transactional profile sessions are retained until an erasure or deactivation request is submitted.
                </p>
                <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 text-xs text-emerald-900 dark:text-emerald-200 space-y-2">
                  <h4 className="font-bold flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                    Merchant Account & Storefront Soft-Deletion Policy (is_deleted = True)
                  </h4>
                  <p className="leading-relaxed">
                    To safeguard merchants against accidental deletion, malicious takeovers, and business disruption, MenuKit implements a <strong>soft-deletion protocol</strong>:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-[11px] text-emerald-800/90 dark:text-emerald-300/90">
                    <li><strong>Mandatory Email OTP:</strong> Any deactivation of a master merchant account or an individual shop profile requires two-factor verification via a 6-digit OTP delivered to the owner's registered email address.</li>
                    <li><strong>Safe Preservation:</strong> Upon OTP verification, the target account or shop is flagged as deactivated (<code>is_deleted = True</code>, <code>is_active = False</code>). Public storefronts, catalogs, and ordering portals are immediately taken offline, but underlying catalogs, images, and sales ledgers are safely retained in our database.</li>
                    <li><strong>Client Restoration Claims:</strong> Merchants retain the right to restore deactivated shops or accounts at any time. Simply send an official restoration claim from your registered email to <a href="mailto:debuggerstechs@gmail.com" className="font-bold underline text-emerald-700 dark:text-emerald-300">debuggerstechs@gmail.com</a>, and our support team will reactivate your storefront with zero data loss.</li>
                    <li><strong>Granular Shop Control:</strong> Merchants managing multiple outlets can deactivate individual shop profiles independently without affecting other branches or their master login credentials.</li>
                  </ul>
                </div>
              </section>

              {/* 9. User Rights */}
              <section id="your-rights" className="scroll-mt-24 space-y-3 pt-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-extrabold">9</span>
                  User Rights under DPDP Act, 2023
                </h2>
                <p>As a data principal under Indian data protection regulations, you hold the following rights:</p>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <li><strong>Right to Access:</strong> View a summary of personal information processed on MenuKit.</li>
                  <li><strong>Right to Correction:</strong> Update outdated delivery addresses or customer profile details.</li>
                  <li><strong>Right to Erasure:</strong> Request the deletion of your personal contact records from our systems (subject to statutory tax retention exemptions).</li>
                  <li><strong>Right to Grievance Redressal:</strong> Submit grievances regarding data handling to our Data Protection & Grievance Officer.</li>
                </ul>
                <p className="text-xs">
                  To exercise any of these rights, email us at <a href="mailto:debuggerstechs@gmail.com" className="text-emerald-600 hover:underline font-bold">debuggerstechs@gmail.com</a>.
                </p>
              </section>

              {/* 10. Children */}
              <section id="children-privacy" className="scroll-mt-24 space-y-3 pt-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-extrabold">10</span>
                  Minors & Children's Privacy
                </h2>
                <p>
                  MenuKit does not knowingly market to or collect personal data from children under 18 years of age. If a parent or guardian becomes aware that a child has provided us with personal information without consent, please contact us immediately for prompt deletion.
                </p>
              </section>

              {/* 11. Updates */}
              <section id="policy-updates" className="scroll-mt-24 space-y-3 pt-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-extrabold">11</span>
                  Changes to this Privacy Policy
                </h2>
                <p>
                  We may periodically revise this Privacy Policy to reflect platform enhancements or changes in statutory data privacy regulations. Updated versions will display an updated revision date. Continued usage of our Platform after revisions constitutes acceptance.
                </p>
              </section>

              {/* 12. Grievance */}
              <section id="contact-grievance" className="scroll-mt-24 space-y-4 pt-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-extrabold">12</span>
                  Data Protection Officer & Grievance Contact
                </h2>
                <p className="text-xs">
                  For privacy queries, data access requests, or regulatory grievances, please contact our Grievance Officer:
                </p>

                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                  <p className="font-extrabold text-sm text-slate-900 dark:text-white">
                    <a href="https://debuggerstechnologies.com/" target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-orange-600 transition-colors">
                      Debuggers Technologies
                    </a> (<span className="text-orange-600 dark:text-orange-500">Menukit</span>)
                  </p>
                  <p className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <Mail size={14} className="text-emerald-500 shrink-0" />
                    <span><strong>Email:</strong> <a href="mailto:debuggerstechs@gmail.com" className="text-emerald-600 hover:underline">debuggerstechs@gmail.com</a></span>
                  </p>
                  <p className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <Building2 size={14} className="text-emerald-500 shrink-0" />
                    <span>
                      <strong>Entity:</strong>{' '}
                      <a 
                        href="https://debuggerstechnologies.com/" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-emerald-600 hover:underline inline-flex items-center gap-1 font-semibold"
                      >
                        Debuggers Technologies <ExternalLink size={12} />
                      </a>
                    </span>
                  </p>
                  <p className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                    <MapPin size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>Registered Address:</strong> Perungudi, Madurai, Tamil Nadu - 625022, India</span>
                  </p>
                  <p className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <Clock size={14} className="text-emerald-500 shrink-0" />
                    <span><strong>Support & Grievance Hours:</strong> 9:00 AM – 6:00 PM IST (Monday – Saturday)</span>
                  </p>
                  <p className="pt-2 text-[11px] text-slate-500 border-t border-slate-200/60 dark:border-slate-700/60">
                    All privacy grievances are acknowledged within 48 hours and resolved in accordance with DPDP Act timelines.
                  </p>
                </div>
              </section>

            </div>

            {/* Bottom Actions */}
            <div className="pt-6 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between flex-wrap gap-4 text-xs font-medium">
              <span className="text-slate-400">© 2026 Debuggers Technologies. All rights reserved.</span>
              <div className="flex items-center gap-4">
                <Link to="/terms" className="text-orange-600 hover:underline font-bold flex items-center gap-1">
                  <span>View Terms of Service</span>
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
