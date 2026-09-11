import React, { useState } from 'react';
import { MiniAFrame } from './AFrameIllustration';
import { ChalkboardModal } from './ChalkboardModal';

interface FloatingChalkboardProps {
  message: string;
  title?: string | null;
  className?: string;
}

/**
 * Miniature physical A-frame chalkboard floating on the right side of the public menu.
 * Features an idle floating/bobbing animation, 3D tilt, hover expansion,
 * full keyboard accessibility, and opens the fullscreen chalkboard experience.
 */
export const FloatingChalkboard: React.FC<FloatingChalkboardProps> = ({
  message,
  title,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  return (
    <>
      {/* Floating Action A-Frame Element */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        aria-label="Open chalkboard message"
        className={`fixed left-3 sm:left-5 md:left-7 bottom-20 sm:bottom-22 z-40 cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 rounded-2xl transition-all duration-300 ${className}`}
        style={{
          // Hardware-accelerated gentle bobbing float animation
          animation: 'chalkboardBob 4s ease-in-out infinite',
        }}
      >
        <div className="relative w-24 sm:w-28 md:w-32 transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-rotate-2 group-active:scale-95 filter drop-shadow-2xl">
          <MiniAFrame className="w-full h-auto" title={title} />
        </div>
      </div>

      {/* Global CSS Animation for floating bobbing */}
      <style>{`
        @keyframes chalkboardBob {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-8px) rotate(1deg);
          }
        }
      `}</style>

      {/* Fullscreen Interactive Experience Modal */}
      <ChalkboardModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        message={message}
        title={title}
      />
    </>
  );
};
