import React from 'react';

interface MiniAFrameProps {
  className?: string;
  title?: string | null;
}

/**
 * Miniature physical sidewalk A-frame board illustration used for the floating action element.
 * Designed with 3D perspective, wooden texture, top hinges, and chalk writing appearance.
 */
export const MiniAFrame: React.FC<MiniAFrameProps> = ({ className = '', title }) => {
  const miniTitle = title && title.trim()
    ? (title.trim().length > 8 ? title.trim().slice(0, 7) + '..' : title.trim().toUpperCase())
    : 'TODAY';
  return (
    <div className={`relative select-none pointer-events-none ${className}`}>
      <svg
        viewBox="0 0 120 140"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-xl"
      >
        <defs>
          {/* Wood Frame Gradients */}
          <linearGradient id="miniWoodLeft" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#451a03" />
            <stop offset="50%" stopColor="#78350f" />
            <stop offset="100%" stopColor="#291102" />
          </linearGradient>
          <linearGradient id="miniWoodFront" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#9a3412" />
            <stop offset="30%" stopColor="#b45309" />
            <stop offset="70%" stopColor="#78350f" />
            <stop offset="100%" stopColor="#451a03" />
          </linearGradient>
          <linearGradient id="miniSlate" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="50%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>
          <linearGradient id="miniHinge" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="50%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>
          <filter id="miniShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="4" floodColor="#000000" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* Physical Drop Shadow on Ground */}
        <ellipse cx="60" cy="134" rx="42" ry="5" fill="#000000" fillOpacity="0.35" filter="blur(2px)" />

        {/* Back Leg (Left) giving 3D stance */}
        <polygon points="26,16 33,16 19,132 12,132" fill="#291102" />
        {/* Back Leg (Right) giving 3D stance */}
        <polygon points="94,16 87,16 101,132 108,132" fill="#291102" />

        {/* Metal Spreader Brace / Wire between legs */}
        <line x1="22" y1="92" x2="31" y2="92" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="98" y1="92" x2="89" y2="92" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />

        {/* Main Front A-Frame Left Leg */}
        <polygon points="30,12 39,12 25,130 16,130" fill="url(#miniWoodFront)" filter="url(#miniShadow)" />
        {/* Main Front A-Frame Right Leg */}
        <polygon points="90,12 81,12 95,130 104,130" fill="url(#miniWoodFront)" filter="url(#miniShadow)" />

        {/* Top Horizontal Wood Bar */}
        <rect x="30" y="12" width="60" height="9" rx="2" fill="url(#miniWoodFront)" />
        {/* Bottom Horizontal Wood Bar (Chalk Ledge Base) */}
        <rect x="23" y="103" width="74" height="8" rx="2" fill="url(#miniWoodFront)" />

        {/* Chalkboard Slate Panel */}
        <rect
          x="28"
          y="21"
          width="64"
          height="82"
          rx="3"
          fill="url(#miniSlate)"
          stroke="#1e293b"
          strokeWidth="1"
        />

        {/* Inner Chalkboard Vignette / Texture */}
        <rect
          x="30"
          y="23"
          width="60"
          height="78"
          rx="2"
          fill="#ffffff"
          fillOpacity="0.03"
        />

        {/* Top Metal Hinges */}
        <rect x="36" y="9" width="10" height="6" rx="1.5" fill="url(#miniHinge)" stroke="#475569" strokeWidth="0.5" />
        <circle cx="41" cy="12" r="1" fill="#334155" />
        <rect x="74" y="9" width="10" height="6" rx="1.5" fill="url(#miniHinge)" stroke="#475569" strokeWidth="0.5" />
        <circle cx="79" cy="12" r="1" fill="#334155" />

        {/* Miniature Chalkboard Content ("SPECIAL" + Chalk Strokes) */}
        <g opacity="0.95">
          {/* Header Dash Flourish (without diamond) */}
          <line x1="42" y1="28" x2="78" y2="28" stroke="#fef08a" strokeWidth="1" strokeLinecap="round" strokeDasharray="2 2" />

          {/* Hand-drawn "SPECIAL" styled strokes */}
          <text
            x="60"
            y="41"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="9"
            fontWeight="bold"
            letterSpacing="0.8"
            fontFamily="'Patrick Hand', 'Caveat', cursive, sans-serif"
            filter="drop-shadow(0 0 1px rgba(255,255,255,0.6))"
          >
            {miniTitle}
          </text>

          {/* Chalk Divider Line */}
          <path
            d="M 37 47 Q 60 48.5 83 47"
            stroke="#94a3b8"
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity="0.8"
          />

          {/* Simulated Handwritten Menu Lines */}
          <path
            d="M 40 57 Q 52 56 65 57 M 69 57 Q 74 57.5 79 57"
            stroke="#ffffff"
            strokeWidth="1.4"
            strokeLinecap="round"
            opacity="0.85"
          />
          <path
            d="M 38 67 Q 50 67.5 61 67 M 66 67 Q 73 66.5 81 67"
            stroke="#fef08a"
            strokeWidth="1.4"
            strokeLinecap="round"
            opacity="0.9"
          />
          <path
            d="M 43 77 Q 54 76.5 64 77 M 69 77 Q 73 77 77 77"
            stroke="#ffffff"
            strokeWidth="1.4"
            strokeLinecap="round"
            opacity="0.75"
          />

          {/* Special price tag doodle */}
          <circle cx="60" cy="89" r="6.5" stroke="#f97316" strokeWidth="1.2" strokeDasharray="2 1.5" fill="#f97316" fillOpacity="0.2" />
          <text
            x="60"
            y="92"
            textAnchor="middle"
            fill="#fdba74"
            fontSize="7"
            fontWeight="bold"
            fontFamily="sans-serif"
          >
            ✦
          </text>
        </g>

        {/* Chalk Tray Ledge with Chalk Stick */}
        <rect x="23" y="102" width="74" height="4" rx="1" fill="#78350f" stroke="#451a03" strokeWidth="0.5" />
        {/* White Chalk Piece sitting on tray */}
        <rect x="36" y="100.5" width="12" height="3" rx="1" fill="#ffffff" filter="drop-shadow(0 1px 1px rgba(0,0,0,0.4))" />
        {/* Yellow Chalk Piece */}
        <rect x="52" y="101" width="8" height="2.5" rx="0.8" fill="#fef08a" />
        {/* Tiny Felt Eraser */}
        <rect x="66" y="99.5" width="14" height="5" rx="1" fill="#92400e" stroke="#451a03" strokeWidth="0.5" />
        <rect x="66" y="103" width="14" height="1.5" rx="0.5" fill="#1e293b" />
      </svg>
    </div>
  );
};
