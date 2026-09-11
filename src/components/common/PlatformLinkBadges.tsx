import React, { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { ExtractedLink } from '@/utils/urlPlatformHelper';
import { ExternalLinkModal, MultiExternalLinkModal, PlatformIcon } from './ExternalLinkModal';

interface PlatformLinkBadgesProps {
  links: ExtractedLink[];
  variant?: 'chalkboard' | 'card' | 'inline';
  className?: string;
}

export const PlatformLinkBadges: React.FC<PlatformLinkBadgesProps> = ({
  links,
  variant = 'card',
  className = '',
}) => {
  const [selectedSingleLink, setSelectedSingleLink] = useState<ExtractedLink | null>(null);
  const [isMultiModalOpen, setIsMultiModalOpen] = useState(false);

  if (!links || links.length === 0) return null;

  const isChalkboard = variant === 'chalkboard';

  // Single link rendering: Compact, clean pill
  if (links.length === 1) {
    const link = links[0];
    return (
      <>
        <div className={`inline-flex items-center ${className}`}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedSingleLink(link);
            }}
            className={`group inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all transform hover:scale-105 active:scale-95 cursor-pointer shadow-md ${
              isChalkboard
                ? 'bg-slate-950/95 text-white border border-amber-400/50 hover:border-amber-300 backdrop-blur-md'
                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 hover:border-primary/50'
            }`}
            title={`Open ${link.platform.name}`}
          >
            <div className={`w-4.5 h-4.5 rounded-full flex items-center justify-center shrink-0 shadow-xs ${link.platform.badgeBg}`}>
              <PlatformIcon platform={link.platform} size={11} className="text-white" />
            </div>
            <span className="font-bold">{link.platform.name}</span>
            <ExternalLink size={10} className="opacity-60 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>

        {selectedSingleLink && (
          <ExternalLinkModal link={selectedSingleLink} onClose={() => setSelectedSingleLink(null)} />
        )}
      </>
    );
  }

  // Multiple links rendering: Instagram post likes / avatar stack style!
  // Renders strictly the overlapping circular icons + "N Links ↗" without long text!
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsMultiModalOpen(true);
        }}
        className={`inline-flex items-center gap-2 py-1 pl-1.5 pr-2.5 rounded-full shadow-md backdrop-blur-md transition-all transform hover:scale-105 active:scale-95 cursor-pointer ${
          isChalkboard
            ? 'bg-slate-950/95 border border-amber-400/50 hover:border-amber-300 text-white'
            : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-primary/50 text-slate-800 dark:text-slate-100'
        } ${className}`}
        title={`View all ${links.length} links`}
      >
        {/* Overlapping circular social icon avatar stack (like Instagram likes) */}
        <div className="flex items-center -space-x-2 relative z-10">
          {links.map((link, idx) => (
            <div
              key={idx}
              className={`w-6 h-6 rounded-full flex items-center justify-center shadow-md ${
                link.platform.badgeBg
              } ${
                isChalkboard
                  ? 'ring-2 ring-slate-950'
                  : 'ring-2 ring-white dark:ring-slate-800'
              }`}
              style={{ zIndex: 10 - idx }}
            >
              <PlatformIcon platform={link.platform} size={12} className="text-white" />
            </div>
          ))}
        </div>

        {/* Compact count badge */}
        <div className="flex items-center gap-1 text-xs font-bold">
          <span>{links.length} Links</span>
          <ExternalLink size={10} className="opacity-60" />
        </div>
      </button>

      {/* Multi-Link Selection Modal */}
      {isMultiModalOpen && (
        <MultiExternalLinkModal
          isOpen={isMultiModalOpen}
          links={links}
          onClose={() => setIsMultiModalOpen(false)}
        />
      )}
    </>
  );
};

export default PlatformLinkBadges;
