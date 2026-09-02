import React from 'react';
import { Globe } from 'lucide-react';

interface CountryFlagProps {
  code: string;
  className?: string;
  size?: number;
}

export const CountryFlag: React.FC<CountryFlagProps> = ({ code, className = "w-4 h-4", size = 18 }) => {
  const upperCode = (code || '').toUpperCase();

  switch (upperCode) {
    case 'IN':
      return (
        <svg viewBox="0 0 640 480" width={size} height={(size * 3) / 4} className={`rounded-[3px] shadow-sm inline-block object-cover ${className}`}>
          <path fill="#f93" d="M0 0h640v160H0z" />
          <path fill="#fff" d="M0 160h640v160H0z" />
          <path fill="#128807" d="M0 320h640v160H0z" />
          <g transform="translate(320 240)">
            <circle r="70" fill="none" stroke="#008" strokeWidth="6" />
            <circle r="14" fill="#008" />
            {Array.from({ length: 24 }).map((_, i) => (
              <line
                key={i}
                x1="0"
                y1="0"
                x2="0"
                y2="-70"
                stroke="#008"
                strokeWidth="2.5"
                transform={`rotate(${i * 15})`}
              />
            ))}
          </g>
        </svg>
      );

    case 'US':
      return (
        <svg viewBox="0 0 640 480" width={size} height={(size * 3) / 4} className={`rounded-[3px] shadow-sm inline-block object-cover ${className}`}>
          <g fillRule="evenodd">
            {Array.from({ length: 13 }).map((_, i) => (
              <path key={i} fill={i % 2 === 0 ? "#b22234" : "#fff"} d={`M0 ${i * 36.92}h640v36.93H0z`} />
            ))}
          </g>
          <path fill="#3c3b6e" d="M0 0h260v258.46H0z" />
          <g fill="#fff">
            <circle cx="35" cy="30" r="10" />
            <circle cx="95" cy="30" r="10" />
            <circle cx="155" cy="30" r="10" />
            <circle cx="215" cy="30" r="10" />
            <circle cx="65" cy="70" r="10" />
            <circle cx="125" cy="70" r="10" />
            <circle cx="185" cy="70" r="10" />
            <circle cx="35" cy="110" r="10" />
            <circle cx="95" cy="110" r="10" />
            <circle cx="155" cy="110" r="10" />
            <circle cx="215" cy="110" r="10" />
            <circle cx="65" cy="150" r="10" />
            <circle cx="125" cy="150" r="10" />
            <circle cx="185" cy="150" r="10" />
            <circle cx="35" cy="190" r="10" />
            <circle cx="95" cy="190" r="10" />
            <circle cx="155" cy="190" r="10" />
            <circle cx="215" cy="190" r="10" />
            <circle cx="65" cy="230" r="10" />
            <circle cx="125" cy="230" r="10" />
            <circle cx="185" cy="230" r="10" />
          </g>
        </svg>
      );

    case 'GB':
      return (
        <svg viewBox="0 0 640 480" width={size} height={(size * 3) / 4} className={`rounded-[3px] shadow-sm inline-block object-cover ${className}`}>
          <clipPath id="gb-a-dash"><path d="M0 0v480h640V0z"/></clipPath>
          <g clipPath="url(#gb-a-dash)">
            <path fill="#012169" d="M0 0v480h640V0z"/>
            <path stroke="#fff" strokeWidth="60" d="m0 0 640 480M640 0 0 480"/>
            <path stroke="#c8102e" strokeWidth="40" d="m0 0 640 480M640 0 0 480"/>
            <path fill="#fff" d="M260 0h120v480H260zM0 180h640v120H0z"/>
            <path fill="#c8102e" d="M280 0h80v480H280zM0 200h640v80H0z"/>
          </g>
        </svg>
      );

    case 'AU':
      return (
        <svg viewBox="0 0 640 480" width={size} height={(size * 3) / 4} className={`rounded-[3px] shadow-sm inline-block object-cover ${className}`}>
          <path fill="#00008b" d="M0 0h640v480H0z"/>
          <g transform="scale(0.5)">
            <path fill="#012169" d="M0 0v480h640V0z"/>
            <path stroke="#fff" strokeWidth="60" d="m0 0 640 480M640 0 0 480"/>
            <path stroke="#c8102e" strokeWidth="40" d="m0 0 640 480M640 0 0 480"/>
            <path fill="#fff" d="M260 0h120v480H260zM0 180h640v120H0z"/>
            <path fill="#c8102e" d="M280 0h80v480H280zM0 200h640v80H0z"/>
          </g>
          <circle cx="160" cy="360" r="40" fill="#fff"/>
          <circle cx="480" cy="100" r="14" fill="#fff"/>
          <circle cx="560" cy="200" r="14" fill="#fff"/>
          <circle cx="480" cy="380" r="14" fill="#fff"/>
          <circle cx="400" cy="240" r="14" fill="#fff"/>
          <circle cx="510" cy="270" r="9" fill="#fff"/>
        </svg>
      );

    case 'CA':
      return (
        <svg viewBox="0 0 640 480" width={size} height={(size * 3) / 4} className={`rounded-[3px] shadow-sm inline-block object-cover ${className}`}>
          <path fill="#ff0000" d="M0 0h160v480H0zm480 0h160v480H480z"/>
          <path fill="#ffffff" d="M160 0h320v480H160z"/>
          <path fill="#ff0000" d="M320 100l25 65 60-15-20 60 55 25-55 35 15 65-70-35-10 65-10-65-70 35 15-65-55-35 55-25-20-60 60 15z"/>
        </svg>
      );

    case 'OTHER':
    default:
      return (
        <div className={`inline-flex items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 p-0.5 ${className}`}>
          <Globe size={size - 2} className="shrink-0" />
        </div>
      );
  }
};
