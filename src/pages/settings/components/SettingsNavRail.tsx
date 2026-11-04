import React from 'react';
import { 
  Sliders, ShoppingBag, RotateCcw, MapPin, CreditCard, 
  Receipt, Printer, Shield, Search, X, CheckCircle2, ChevronRight,
  Headphones, Phone, Mail
} from 'lucide-react';

export type SettingsTabId = 
  | 'general'
  | 'ordering'
  | 'policies'
  | 'discovery'
  | 'payments'
  | 'gst'
  | 'printers'
  | 'account'
  | 'support';

// Crisp WhatsApp SVG Icon
export const WhatsAppIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="currentColor"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

interface NavItem {
  id: SettingsTabId;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
}

interface NavGroup {
  groupTitle: string;
  items: NavItem[];
}

interface SettingsNavRailProps {
  activeTab: SettingsTabId;
  onSelectTab: (tabId: SettingsTabId) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  gstActive?: boolean;
  printersCount?: number;
  isDiscoverable?: boolean;
  businessCategory?: any;
}

export const SettingsNavRail: React.FC<SettingsNavRailProps> = ({
  activeTab,
  onSelectTab,
  searchQuery,
  onSearchChange,
  gstActive,
  printersCount,
  isDiscoverable,
  businessCategory,
}) => {
  const groups: NavGroup[] = [
    {
      groupTitle: 'Store & Fulfillment',
      items: [
        {
          id: 'general',
          title: 'General & Regional',
          subtitle: 'Currency, language, desktop app & wholesale',
          icon: Sliders,
        },
        {
          id: 'ordering',
          title: 'Ordering Channels',
          subtitle: `${businessCategory?.dineInChannelLabel || 'Dine-In'}, takeaway & delivery fees`,
          icon: ShoppingBag,
        },
        {
          id: 'policies',
          title: 'Policies & Returns',
          subtitle: 'Cancellation terms, food refunds & replacement rules',
          icon: RotateCcw,
        },
      ],
    },
    {
      groupTitle: 'Visibility & Revenue',
      items: [
        {
          id: 'discovery',
          title: 'Public Discovery & SEO',
          subtitle: 'Nearby store map listing & hours',
          icon: MapPin,
          badge: isDiscoverable ? 'Live on Map' : undefined,
          badgeColor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        },
        {
          id: 'payments',
          title: 'Payments & Settlement',
          subtitle: 'Online Razorpay gateway, UPI & counter cash',
          icon: CreditCard,
        },
        {
          id: 'gst',
          title: 'GST & Compliances',
          subtitle: 'GSTIN, FSSAI safety license & invoices',
          icon: Receipt,
          badge: gstActive ? 'GST Active' : undefined,
          badgeColor: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
        },
      ],
    },
    {
      groupTitle: 'Hardware & Printers',
      items: [
        {
          id: 'printers',
          title: businessCategory?.settingsPrintersTabLabel || 'Dispatch & Printers',
          subtitle: 'KOT production routing, USB & Bluetooth slips',
          icon: Printer,
          badge: printersCount && printersCount > 0 ? `${printersCount} configured` : undefined,
          badgeColor: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        },
      ],
    },
    {
      groupTitle: 'Administration & Safety',
      items: [
        {
          id: 'account',
          title: 'Security & Account',
          subtitle: 'Profile, legal disclosures, OTP & danger zone',
          icon: Shield,
        },
      ],
    },
    {
      groupTitle: 'Help & Support',
      items: [
        {
          id: 'support',
          title: 'Help & Support',
          subtitle: 'WhatsApp, phone & email assistance',
          icon: Headphones,
        },
      ],
    },
  ];

  // Filter items based on query
  const q = searchQuery.toLowerCase().trim();
  const filteredGroups = groups.map(g => ({
    ...g,
    items: g.items.filter(item => 
      !q || 
      item.title.toLowerCase().includes(q) || 
      item.subtitle.toLowerCase().includes(q) ||
      (item.id === 'support' && ('whatsapp'.includes(q) || 'email'.includes(q) || 'phone'.includes(q) || 'help'.includes(q) || 'debuggerstechs'.includes(q)))
    )
  })).filter(g => g.items.length > 0);

  // Desktop rail items: show the 4 core settings groups in the middle list,
  // while Support is permanently pinned at the bottom footer (or included if searching)
  const desktopGroups = q 
    ? filteredGroups 
    : filteredGroups.filter(g => g.groupTitle !== 'Help & Support');

  const isSupportSearchMatch = Boolean(
    q && ('whatsapp'.includes(q) || 'email'.includes(q) || 'phone'.includes(q) || 'help'.includes(q) || 'support'.includes(q) || 'debuggerstechs'.includes(q))
  );

  return (
    <aside className="w-full lg:w-72 shrink-0 space-y-3">
      {/* Search Input for Quick Section Filter */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Filter settings sections..."
          className="w-full pl-8 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:outline-none focus:border-primary transition-all shadow-2xs"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Mobile Horizontal Tabs (< lg) */}
      <div className="flex lg:hidden items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        {groups.flatMap(g => g.items).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Icon size={13} />
              <span>{item.title}</span>
            </button>
          );
        })}
      </div>

      {/* Desktop Vertical Nav Rail (Fixed/Sticky on Desktop) */}
      <div className="hidden lg:flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs max-h-[calc(100vh-6rem)] overflow-hidden">
        {/* Navigation Groups (Compact, fits all viewports without chopping items) */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 no-scrollbar min-h-0">
          {desktopGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-0.5">
              <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2 pt-0.5 pb-0.5">
                {group.groupTitle}
              </h4>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectTab(item.id)}
                      className={`w-full text-left py-2 px-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between group ${
                        isActive
                          ? 'bg-primary/10 dark:bg-primary/20 text-primary border border-primary/30 shadow-xs'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isActive
                            ? 'bg-primary text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-white dark:group-hover:bg-slate-700 group-hover:text-primary'
                        }`}>
                          <Icon size={15} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className={`text-xs font-bold truncate leading-tight ${isActive ? 'text-primary' : 'text-slate-800 dark:text-slate-200 group-hover:text-primary'}`}>
                              {item.title}
                            </p>
                            {item.badge && (
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${item.badgeColor || ''}`}>
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5 leading-tight">
                            {item.subtitle}
                          </p>
                        </div>
                      </div>

                      <ChevronRight size={13} className={`shrink-0 ml-1.5 transition-transform ${
                        isActive ? 'text-primary translate-x-0.5' : 'text-slate-400 opacity-0 group-hover:opacity-100'
                      }`} />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {desktopGroups.length === 0 && (
            <div className="p-4 text-center space-y-1">
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400">No matching sections</p>
              <p className="text-[11px] text-slate-400">Try searching for currency, print, or tax</p>
            </div>
          )}
        </div>

        {/* Pinned Bottom Merchant Support Footer - Compact, Clean, Never Overlaps */}
        <div className={`shrink-0 p-2.5 border-t transition-all ${
          activeTab === 'support' || isSupportSearchMatch
            ? 'border-primary/40 bg-primary/5 dark:bg-primary/10 rounded-b-2xl'
            : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/70 rounded-b-2xl'
        }`}>
          {/* Header Row: Link to Support Tab & Contact */}
          <div className="flex items-center justify-between px-1 mb-1.5">
            <button
              type="button"
              onClick={() => onSelectTab('support')}
              className="flex items-center gap-1.5 text-left group cursor-pointer"
            >
              <Headphones size={13} className={activeTab === 'support' ? 'text-primary' : 'text-slate-500 dark:text-slate-400 group-hover:text-primary'} />
              <span className={`text-[10px] font-extrabold uppercase tracking-wider transition-colors ${
                activeTab === 'support' ? 'text-primary' : 'text-slate-700 dark:text-slate-300 group-hover:text-primary'
              }`}>
                Merchant Support
              </span>
              {activeTab === 'support' && (
                <span className="text-[8px] font-bold px-1.5 py-0.2 rounded-full bg-primary text-white">
                  Active
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('support')}
              className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
            >
              Hub →
            </button>
          </div>

          {/* Quick Action Tiles: WhatsApp, Phone Call, Email */}
          <div className="grid grid-cols-3 gap-1">
            {/* WhatsApp Direct Chat */}
            <a
              href="https://wa.me/918248692839?text=Hello%20Menukit%20Support%2C%20I%20need%20assistance%20with%20my%20store."
              target="_blank"
              rel="noopener noreferrer"
              title="WhatsApp: +91 82486 92839"
              className="flex items-center justify-center gap-1 py-1 px-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs hover:border-emerald-300 dark:hover:border-emerald-700 text-[10px] font-bold transition-all text-center group cursor-pointer"
            >
              <WhatsAppIcon className="w-3.5 h-3.5 fill-slate-600 dark:fill-slate-300 group-hover:fill-emerald-600 transition-colors" />
              <span className="group-hover:text-emerald-700 dark:group-hover:text-emerald-300">WhatsApp</span>
            </a>

            {/* Direct Phone Call */}
            <a
              href="tel:+918248692839"
              title="Call: +91 82486 92839"
              className="flex items-center justify-center gap-1 py-1 px-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-primary/5 dark:hover:bg-primary/10 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs hover:border-primary/40 text-[10px] font-bold transition-all text-center group cursor-pointer"
            >
              <Phone size={12} className="text-slate-600 dark:text-slate-300 group-hover:text-primary transition-colors" />
              <span className="group-hover:text-primary">Call</span>
            </a>

            {/* Direct Email */}
            <a
              href="mailto:debuggerstechs@gmail.com?subject=Menukit%20Store%20Support%20Request"
              title="Email: debuggerstechs@gmail.com"
              className="flex items-center justify-center gap-1 py-1 px-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-primary/5 dark:hover:bg-primary/10 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs hover:border-primary/40 text-[10px] font-bold transition-all text-center group cursor-pointer"
            >
              <Mail size={12} className="text-slate-600 dark:text-slate-300 group-hover:text-primary transition-colors" />
              <span className="group-hover:text-primary">Email</span>
            </a>
          </div>

          <div className="pt-1 flex items-center justify-between text-[10px] px-1 text-slate-500 dark:text-slate-400">
            <a href="tel:+918248692839" className="font-medium hover:text-slate-800 dark:hover:text-slate-200 hover:underline">
              +91 82486 92839
            </a>
            <span className="text-[9px]">Debuggers Tech</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
