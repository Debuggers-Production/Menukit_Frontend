import React, { useEffect, useState, useCallback } from 'react';
import { X, Sparkles } from 'lucide-react';
import { ChalkWritingEngine } from './ChalkWritingEngine';

interface ChalkboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  title?: string | null;
}

/**
 * Fullscreen physical A-frame chalkboard experience with sequential animations,
 * backdrop blur, woodgrain easel sign frame, and realistic chalk writing.
 */
export const ChalkboardModal: React.FC<ChalkboardModalProps> = ({
  isOpen,
  onClose,
  message,
  title,
}) => {
  const [animStep, setAnimStep] = useState<number>(0);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);

  const displayTitle = title && title.trim() ? title.trim().toUpperCase() : "TODAY'S SPECIAL";
  // Dynamically calculate dashed flourish line spacing around the title so it never collides
  const halfTextWidth = Math.min(125, Math.max(22, displayTitle.length * (displayTitle.length > 20 ? 3.6 : 4.4)));
  const leftLineEnd = Math.max(74, Math.round(210 - halfTextWidth - 10));
  const rightLineStart = Math.min(346, Math.round(210 + halfTextWidth + 10));

  // Check prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Lock background scroll when open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Handle Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  // Staged entrance animation sequence
  useEffect(() => {
    if (!isOpen) {
      setAnimStep(0);
      return;
    }

    if (reducedMotion) {
      setAnimStep(4);
      return;
    }

    // Step 1: Backdrop & Initial scale
    setAnimStep(1);

    // Step 2: Overlay fades in & board expands
    const t1 = setTimeout(() => setAnimStep(2), 120);

    // Step 3: Large A-frame settles
    const t2 = setTimeout(() => setAnimStep(3), 320);

    // Step 4: Chalk piece begins writing
    const t3 = setTimeout(() => setAnimStep(4), 550);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isOpen, reducedMotion]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-6 transition-all duration-300 ${
        animStep >= 1 ? 'bg-black/75 backdrop-blur-md opacity-100' : 'bg-transparent opacity-0'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Restaurant Chalkboard Special"
    >
      {/* Top Right Close Button */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 sm:top-6 sm:right-6 p-2 sm:p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white/90 hover:text-white border border-white/20 shadow-2xl backdrop-blur-md transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer z-50 focus:outline-none focus:ring-2 focus:ring-amber-400"
        aria-label="Close chalkboard"
      >
        <X size={22} />
      </button>

      {/* Main Large A-Frame Physical Board Container */}
      <div
        className={`relative w-full max-w-[430px] sm:max-w-[460px] aspect-[420/560] max-h-[94vh] sm:max-h-[88vh] transition-all duration-500 ease-out transform ${
          animStep >= 3
            ? 'scale-100 translate-y-0 opacity-100'
            : animStep >= 2
            ? 'scale-90 translate-y-8 opacity-70'
            : 'scale-75 translate-y-16 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Physical 3D A-Frame Easel SVG Container */}
        <div className="relative w-full h-full drop-shadow-2xl">
          <svg
            viewBox="0 0 420 560"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full select-none"
          >
            <defs>
              {/* Rich Wood Frame Gradients */}
              <linearGradient id="woodFrontLeg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#78350f" />
                <stop offset="25%" stopColor="#9a3412" />
                <stop offset="50%" stopColor="#b45309" />
                <stop offset="85%" stopColor="#78350f" />
                <stop offset="100%" stopColor="#451a03" />
              </linearGradient>
              
              <linearGradient id="woodBackLeg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#291102" />
                <stop offset="100%" stopColor="#1a0a01" />
              </linearGradient>

              <linearGradient id="topHingeMetal" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#cbd5e1" />
                <stop offset="35%" stopColor="#f8fafc" />
                <stop offset="70%" stopColor="#94a3b8" />
                <stop offset="100%" stopColor="#475569" />
              </linearGradient>

              <radialGradient id="slateBoardSurface" cx="50%" cy="45%" r="65%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="60%" stopColor="#0f172a" />
                <stop offset="100%" stopColor="#020617" />
              </radialGradient>

              {/* Slate Texture Filter for authentic grain */}
              <filter id="slateGrain">
                <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" result="grain" />
                <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.04 0" />
                <feBlend mode="screen" in="SourceGraphic" />
              </filter>

              {/* Heavy Shadow for Frame Depth */}
              <filter id="boardDropShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="16" stdDeviation="12" floodColor="#000000" floodOpacity="0.6" />
              </filter>
            </defs>

            {/* Floor Contact Ground Shadows */}
            <ellipse cx="210" cy="548" rx="170" ry="12" fill="#000000" fillOpacity="0.45" filter="blur(6px)" />

            {/* Rear Supporting Legs (creating physical 3D stance) */}
            <polygon points="56,36 78,36 32,538 12,538" fill="url(#woodBackLeg)" />
            <polygon points="364,36 342,36 388,538 408,538" fill="url(#woodBackLeg)" />

            {/* Side Stay Hinged Metal Struts connecting front & rear legs */}
            <line x1="38" y1="365" x2="68" y2="365" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />
            <circle cx="38" cy="365" r="3" fill="#475569" />
            <circle cx="68" cy="365" r="3" fill="#475569" />
            <line x1="382" y1="365" x2="352" y2="365" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />
            <circle cx="382" cy="365" r="3" fill="#475569" />
            <circle cx="352" cy="365" r="3" fill="#475569" />

            {/* Front A-Frame Left Leg */}
            <polygon points="68,28 92,28 54,534 30,534" fill="url(#woodFrontLeg)" filter="url(#boardDropShadow)" />
            {/* Front A-Frame Right Leg */}
            <polygon points="352,28 328,28 366,534 390,534" fill="url(#woodFrontLeg)" filter="url(#boardDropShadow)" />

            {/* Top Horizontal Wood Header Bar */}
            <rect x="68" y="28" width="284" height="24" rx="4" fill="url(#woodFrontLeg)" />
            {/* Bottom Wood Base Bar */}
            <rect x="46" y="442" width="328" height="24" rx="4" fill="url(#woodFrontLeg)" />

            {/* Top Metal Heavy Duty Hinges with Screws */}
            <rect x="94" y="16" width="30" height="20" rx="3" fill="url(#topHingeMetal)" stroke="#334155" strokeWidth="1" />
            <circle cx="109" cy="22" r="2.5" fill="#1e293b" />
            <circle cx="109" cy="30" r="2.5" fill="#1e293b" />
            
            <rect x="296" y="16" width="30" height="20" rx="3" fill="url(#topHingeMetal)" stroke="#334155" strokeWidth="1" />
            <circle cx="311" cy="22" r="2.5" fill="#1e293b" />
            <circle cx="311" cy="30" r="2.5" fill="#1e293b" />

            {/* Inner Recessed Slate Blackboard Area */}
            <rect
              x="62"
              y="52"
              width="296"
              height="390"
              rx="6"
              fill="url(#slateBoardSurface)"
              stroke="#0f172a"
              strokeWidth="2"
            />
            {/* Slate Grain Overlay */}
            <rect
              x="64"
              y="54"
              width="292"
              height="386"
              rx="5"
              fill="#ffffff"
              fillOpacity="0.02"
              filter="url(#slateGrain)"
            />

            {/* Chalkboard Header Flourish: Dynamic Header Title */}
            <g opacity="0.92">
              {leftLineEnd > 84 && (
                <line
                  x1="74"
                  y1="74"
                  x2={leftLineEnd}
                  y2="74"
                  stroke="#fef08a"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeDasharray="3 3"
                />
              )}
              {rightLineStart < 336 && (
                <line
                  x1={rightLineStart}
                  y1="74"
                  x2="346"
                  y2="74"
                  stroke="#fef08a"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeDasharray="3 3"
                />
              )}
              
              <text
                x="210"
                y="75"
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#fef08a"
                fontSize={displayTitle.length > 22 ? "13.5" : displayTitle.length > 15 ? "15" : "17"}
                fontWeight="700"
                letterSpacing={displayTitle.length > 20 ? "1.8" : "2.5"}
                fontFamily="'Patrick Hand', 'Caveat', cursive, sans-serif"
              >
                {displayTitle}
              </text>
              
              {/* Decorative Double Chalk Divider */}
              <path
                d="M 90 85 Q 210 88 330 85"
                stroke="#ffffff"
                strokeWidth="1.4"
                strokeLinecap="round"
                opacity="0.8"
              />
            </g>

            {/* Bottom Chalk Tray Ledge (Sticks out physically) */}
            <rect x="42" y="440" width="336" height="12" rx="3" fill="#9a3412" stroke="#451a03" strokeWidth="1" />
            <rect x="44" y="441" width="332" height="3" fill="#fed7aa" fillOpacity="0.25" />

            {/* Chalk Tray Items */}
            {/* White chalk stick */}
            <rect x="75" y="434" width="34" height="6.5" rx="2" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.5" filter="drop-shadow(0 1px 2px rgba(0,0,0,0.5))" />
            {/* Yellow chalk stick */}
            <rect x="118" y="435" width="26" height="5.5" rx="1.8" fill="#fef08a" filter="drop-shadow(0 1px 2px rgba(0,0,0,0.4))" />
            {/* Wooden Felt Eraser */}
            <rect x="270" y="430" width="46" height="11" rx="2.5" fill="#78350f" stroke="#451a03" strokeWidth="0.8" />
            <rect x="270" y="438" width="46" height="3.5" rx="1" fill="#1e293b" />
          </svg>

          {/* Embedded Chalk Writing Interactive Engine Area - Percentage positioned to match blackboard slate precisely on mobile & desktop */}
          <div className="absolute top-[15.7%] left-[14.7%] right-[14.7%] bottom-[22.3%] flex items-center justify-center p-0 pointer-events-none">
            {animStep >= 4 && (
              <ChalkWritingEngine
                message={message}
                reducedMotion={reducedMotion}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
