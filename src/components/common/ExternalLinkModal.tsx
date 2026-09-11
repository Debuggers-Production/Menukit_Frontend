import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ExternalLink,
  X,
  Copy,
  Check,
  Globe,
  Instagram,
  Youtube,
  Facebook,
  MessageCircle,
  MapPin,
  Star,
  Twitter,
  Linkedin,
  Send,
  Music,
  Utensils,
  ChevronRight
} from 'lucide-react';
import { ExtractedLink, PlatformInfo } from '@/utils/urlPlatformHelper';

export const PlatformIcon: React.FC<{ platform: PlatformInfo; size?: number; className?: string }> = ({
  platform,
  size = 18,
  className = '',
}) => {
  switch (platform.iconName) {
    case 'Instagram':
      return <Instagram size={size} className={className || 'text-pink-500'} />;
    case 'Youtube':
      return <Youtube size={size} className={className || 'text-red-500'} />;
    case 'Facebook':
      return <Facebook size={size} className={className || 'text-blue-500'} />;
    case 'MessageCircle':
      return <MessageCircle size={size} className={className || 'text-emerald-500'} />;
    case 'MapPin':
      return <MapPin size={size} className={className || 'text-blue-500'} />;
    case 'Star':
      return <Star size={size} className={className || 'text-amber-500 fill-amber-500'} />;
    case 'Twitter':
      return <Twitter size={size} className={className || 'text-slate-800 dark:text-white'} />;
    case 'Linkedin':
      return <Linkedin size={size} className={className || 'text-blue-600'} />;
    case 'Send':
      return <Send size={size} className={className || 'text-sky-500'} />;
    case 'Music':
      return <Music size={size} className={className || 'text-emerald-500'} />;
    case 'Utensils':
      return <Utensils size={size} className={className || 'text-orange-500'} />;
    default:
      return <Globe size={size} className={className || 'text-indigo-500'} />;
  }
};

interface ExternalLinkModalProps {
  link: ExtractedLink | null;
  onClose: () => void;
}

export const ExternalLinkModal: React.FC<ExternalLinkModalProps> = ({ link, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!link) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(link.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpen = () => {
    window.open(link.href, '_blank', 'noopener,noreferrer');
    onClose();
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        {/* Platform Badge Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 shadow-inner">
            <PlatformIcon platform={link.platform} size={24} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              External Link
            </span>
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>{link.platform.name}</span>
            </h3>
          </div>
        </div>

        {/* Confirmation Question */}
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium mb-4 leading-relaxed">
          You are about to leave this page and open an external website. Would you like to continue?
        </p>

        {/* Full URL Display Box */}
        <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 mb-5 flex items-center justify-between gap-2">
          <div className="overflow-hidden">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
              Destination URL
            </span>
            <span className="text-xs font-mono text-slate-700 dark:text-slate-300 break-all select-all font-semibold block line-clamp-2">
              {link.href}
            </span>
          </div>
          <button
            onClick={handleCopy}
            className="p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0 transition-colors cursor-pointer"
            title="Copy URL"
          >
            {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
          </button>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-sm transition-colors cursor-pointer"
          >
            Stay Here
          </button>
          <button
            type="button"
            onClick={handleOpen}
            className="w-full py-3 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-lg shadow-primary/30 flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all cursor-pointer"
          >
            <span>Open Link</span>
            <ExternalLink size={15} />
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};

interface MultiExternalLinkModalProps {
  isOpen: boolean;
  links: ExtractedLink[];
  onClose: () => void;
}

export const MultiExternalLinkModal: React.FC<MultiExternalLinkModalProps> = ({
  isOpen,
  links,
  onClose,
}) => {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  if (!isOpen || !links || links.length === 0) return null;

  const handleCopy = (href: string, idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(href);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleOpen = (href: string) => {
    window.open(href, '_blank', 'noopener,noreferrer');
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 relative animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer z-10"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div className="mb-4 pr-8">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
            External Links
          </span>
          <h3 className="text-xl font-black text-slate-900 dark:text-white">
            Attached Links ({links.length})
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Select a link below to visit:
          </p>
        </div>

        {/* Links List */}
        <div className="space-y-2.5 overflow-y-auto pr-1 flex-1 py-1">
          {links.map((link, idx) => (
            <div
              key={idx}
              onClick={() => handleOpen(link.href)}
              className="group p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-primary dark:hover:border-primary/80 bg-slate-50 dark:bg-slate-950/60 hover:bg-primary/5 transition-all cursor-pointer flex items-center justify-between gap-3 shadow-xs hover:shadow-md"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${link.platform.badgeBg}`}>
                  <PlatformIcon platform={link.platform} size={18} className="text-white" />
                </div>
                <div className="overflow-hidden">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {link.platform.name}
                  </h4>
                  <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                    {link.href}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={(e) => handleCopy(link.href, idx, e)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                  title="Copy Link"
                >
                  {copiedIdx === idx ? (
                    <Check size={14} className="text-emerald-500" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
                <div className="w-8 h-8 rounded-xl bg-primary/10 group-hover:bg-primary text-primary group-hover:text-white flex items-center justify-center transition-all">
                  <ExternalLink size={14} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Close */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};
