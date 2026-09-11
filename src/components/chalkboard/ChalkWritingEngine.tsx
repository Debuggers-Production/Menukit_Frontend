import React, { useEffect, useState, useRef, useMemo } from 'react';
import { loadGoogleFont } from '@/utils/fontLoader';
import { extractUrlsAndCleanText } from '@/utils/urlPlatformHelper';

interface ChalkParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
}

interface ChalkWritingEngineProps {
  message: string;
  onAnimationComplete?: () => void;
  reducedMotion?: boolean;
}

/**
 * High-performance handwritten chalk stroke engine.
 * Features:
 * - Dynamic auto-scaling typography based on line count and character length
 * - Strict word-wrapping that breaks long unbroken strings
 * - Physical chalk stick motion and particle dust physics
 * - Clip boundary so text never overflows the slate easel
 */
export const ChalkWritingEngine: React.FC<ChalkWritingEngineProps> = ({
  message,
  onAnimationComplete,
  reducedMotion = false,
}) => {
  const [activeLineIdx, setActiveLineIdx] = useState<number>(0);
  const [activeCharIdx, setActiveCharIdx] = useState<number>(0);
  const [chalkPos, setChalkPos] = useState<{ x: number; y: number; angle: number; isWriting: boolean }>({
    x: 60,
    y: 80,
    angle: -30,
    isWriting: false,
  });
  const [particles, setParticles] = useState<ChalkParticle[]>([]);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const particleIdCounter = useRef<number>(0);

  // Load beautiful handwritten Google Fonts for authentic restaurant chalkboard aesthetic
  useEffect(() => {
    loadGoogleFont('Patrick Hand');
    loadGoogleFont('Caveat');
  }, []);

  // Split, wrap, and chunk text so it fits comfortably on the physical board
  const lines = useMemo(() => {
    // Automatically strip any raw URLs from chalkboard text rendering
    const { cleanText } = extractUrlsAndCleanText(message);
    const textToRender = cleanText || 'Welcome!';

    // Normalize literal \n strings and real newlines
    const normalized = textToRender.replace(/\\n/g, '\n');
    const rawLines = normalized.split('\n');
    const wrappedLines: string[] = [];

    // Max chars per line dynamically chosen: ~22 chars comfortably fits on the blackboard width
    const maxCharsPerLine = 22;

    rawLines.forEach((raw) => {
      const words = raw.trim().split(/\s+/);
      if (words.length === 0 || (words.length === 1 && words[0] === '')) return;

      let currentLine = '';
      words.forEach((word) => {
        // If an individual word/token is longer than maxCharsPerLine, break it up into chunks
        if (word.length > maxCharsPerLine) {
          if (currentLine) {
            wrappedLines.push(currentLine.trim());
            currentLine = '';
          }
          for (let i = 0; i < word.length; i += maxCharsPerLine) {
            const chunk = word.slice(i, i + maxCharsPerLine);
            if (i + maxCharsPerLine >= word.length) {
              currentLine = chunk;
            } else {
              wrappedLines.push(chunk);
            }
          }
        } else if ((currentLine + ' ' + word).trim().length > maxCharsPerLine) {
          if (currentLine) wrappedLines.push(currentLine.trim());
          currentLine = word;
        } else {
          currentLine = currentLine ? `${currentLine} ${word}` : word;
        }
      });
      if (currentLine) wrappedLines.push(currentLine.trim());
    });

    // Support up to 8 lines on the board
    return wrappedLines.slice(0, 8);
  }, [message]);

  // Dynamic typography & vertical centering based on line count AND character length
  const layout = useMemo(() => {
    const count = Math.max(1, lines.length);
    const maxLineChars = Math.max(...lines.map((l) => l.length), 1);

    // Dynamic font sizing: scales down for longer lines or more lines
    let size = 32;
    if (count <= 2 && maxLineChars <= 14) {
      size = 35;
    } else if (count <= 3 && maxLineChars <= 18) {
      size = 30;
    } else if (count <= 4 && maxLineChars <= 20) {
      size = 26;
    } else if (count <= 6) {
      size = 22;
    } else {
      size = 19;
    }

    // Additional width safeguard: ensure line width doesn't exceed 260px (slate usable width)
    const maxAllowedWidth = 250;
    const estWidth = maxLineChars * (size * 0.52);
    if (estWidth > maxAllowedWidth) {
      size = Math.max(15, Math.floor(maxAllowedWidth / (maxLineChars * 0.52)));
    }

    const height = Math.round(size * 1.35);
    const cWidth = size * 0.52;

    // Usable vertical space in SVG is ~310px. Center of text area is y: 180
    const totalHeight = count * height;
    const computedStartY = Math.max(45, Math.round(180 - totalHeight / 2 + height * 0.72));

    return {
      fontSize: size,
      lineHeight: height,
      charWidth: cWidth,
      startY: computedStartY,
    };
  }, [lines]);

  const totalChars = useMemo(() => lines.reduce((acc, l) => acc + l.length, 0), [lines]);

  // Handle immediate render if reduced motion is preferred
  useEffect(() => {
    if (reducedMotion) {
      setIsFinished(true);
      setActiveLineIdx(lines.length - 1);
      setActiveCharIdx(lines[lines.length - 1]?.length || 0);
      setChalkPos({ x: 190, y: 395, angle: 90, isWriting: false }); // Rests on tray
      onAnimationComplete?.();
      return;
    }
  }, [reducedMotion, lines, onAnimationComplete]);

  // Writing Animation Loop
  useEffect(() => {
    if (reducedMotion || lines.length === 0) return;

    let currentLine = 0;
    let currentChar = 0;
    let isCancelled = false;

    const { startY, lineHeight, charWidth } = layout;
    const boardCenterX = 190;

    // Adaptive speed: scale up writing speed for longer messages so it feels snappy
    const baseCharDelay = totalChars > 100 ? 25 : totalChars > 50 ? 38 : 55;
    const spaceDelay = Math.round(baseCharDelay * 1.5);
    const punctDelay = Math.round(baseCharDelay * 2.2);
    const lineEndPause = Math.round(baseCharDelay * 2.0);

    const advanceWriting = () => {
      if (isCancelled) return;

      if (currentLine >= lines.length) {
        // Finished writing all lines!
        setIsFinished(true);
        // Move chalk to rest on bottom chalk ledge
        setChalkPos({ x: boardCenterX + 30, y: 395, angle: 88, isWriting: false });
        onAnimationComplete?.();
        return;
      }

      const lineText = lines[currentLine];
      const totalLineWidth = lineText.length * charWidth;
      const lineStartX = Math.max(35, boardCenterX - totalLineWidth / 2);

      if (currentChar <= lineText.length) {
        // Calculate chalk position at current character
        const targetX = lineStartX + currentChar * charWidth;
        const targetY = startY + currentLine * lineHeight;

        // Slight organic oscillation simulating natural hand stroke arc
        const strokeWiggleX = Math.sin(currentChar * 1.5) * 1.5;
        const strokeWiggleY = Math.cos(currentChar * 1.8) * 1.8;
        const strokeAngle = -25 + Math.sin(currentChar * 2) * 10;

        setChalkPos({
          x: targetX + strokeWiggleX,
          y: targetY + strokeWiggleY,
          angle: strokeAngle,
          isWriting: true,
        });

        setActiveLineIdx(currentLine);
        setActiveCharIdx(currentChar);

        // Emit tiny chalk dust particles at the tip
        if (currentChar > 0 && lineText[currentChar - 1] !== ' ') {
          const newParticles: ChalkParticle[] = [];
          for (let p = 0; p < 2; p++) {
            newParticles.push({
              id: particleIdCounter.current++,
              x: targetX + (Math.random() - 0.5) * 5,
              y: targetY + 4 + (Math.random() - 0.5) * 3,
              vx: (Math.random() - 0.5) * 1.0,
              vy: 0.4 + Math.random() * 0.7,
              size: 1.0 + Math.random() * 1.8,
              opacity: 0.8,
              color: Math.random() > 0.3 ? '#ffffff' : '#fef08a',
            });
          }
          setParticles((prev) => [...prev.slice(-20), ...newParticles]);
        }

        currentChar++;

        // Determine timing
        const isSpace = currentChar < lineText.length && lineText[currentChar] === ' ';
        const isPunctuation = currentChar < lineText.length && ['.', '!', '?', ','].includes(lineText[currentChar]);
        const delay = isPunctuation ? punctDelay : isSpace ? spaceDelay : baseCharDelay;

        setTimeout(advanceWriting, delay);
      } else {
        // Finished line: brief pause before moving to next line
        currentLine++;
        currentChar = 0;
        setChalkPos((prev) => ({ ...prev, isWriting: false }));
        setTimeout(advanceWriting, lineEndPause);
      }
    };

    // Initial slight pause before chalk touches down
    const startTimer = setTimeout(() => {
      advanceWriting();
    }, 300);

    return () => {
      isCancelled = true;
      clearTimeout(startTimer);
    };
  }, [lines, layout, totalChars, reducedMotion, onAnimationComplete]);

  // Particle physics animation (drifts and fades)
  useEffect(() => {
    if (particles.length === 0) return;

    const interval = setInterval(() => {
      setParticles((prev) =>
        prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            opacity: p.opacity - 0.05,
          }))
          .filter((p) => p.opacity > 0)
      );
    }, 40);

    return () => clearInterval(interval);
  }, [particles.length]);

  return (
    <div className="relative w-full h-full select-none">
      <svg
        viewBox="0 0 380 440"
        className="w-full h-full overflow-hidden"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Subtle Chalk Texture Filter */}
          <filter id="chalkFilter" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.2" xChannelSelector="R" yChannelSelector="G" />
          </filter>

          {/* Slate Boundaries ClipPath so text never bleeds outside the physical board */}
          <clipPath id="slateClip">
            <rect x="30" y="10" width="320" height="345" rx="6" />
          </clipPath>

          {/* Chalk Shadow */}
          <filter id="chalkPieceShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="2" dy="5" stdDeviation="3" floodColor="#000000" floodOpacity="0.5" />
          </filter>
        </defs>

        {/* Written Chalk Text Lines (clipped inside blackboard) */}
        <g filter="url(#chalkFilter)" clipPath="url(#slateClip)">
          {lines.map((line, lIdx) => {
            const lineY = layout.startY + lIdx * layout.lineHeight;
            const isCurrentLine = lIdx === activeLineIdx;
            const isPastLine = lIdx < activeLineIdx || isFinished;

            // Text to reveal for this line
            const textToDisplay = isPastLine
              ? line
              : isCurrentLine
              ? line.slice(0, activeCharIdx)
              : '';

            if (!textToDisplay) return null;

            return (
              <text
                key={lIdx}
                x="190"
                y={lineY}
                textAnchor="middle"
                fill="#f8fafc"
                opacity="0.95"
                fontSize={layout.fontSize}
                fontWeight="500"
                fontFamily="'Patrick Hand', 'Caveat', cursive, sans-serif"
                letterSpacing="0.2"
                className="transition-all duration-75"
              >
                {textToDisplay}
              </text>
            );
          })}
        </g>

        {/* Falling / Drifting Chalk Dust Particles */}
        {particles.map((pt) => (
          <circle
            key={pt.id}
            cx={pt.x}
            cy={pt.y}
            r={pt.size}
            fill={pt.color}
            opacity={pt.opacity}
          />
        ))}

        {/* Physical 3D Chalk Piece with Dynamic Rotation & Position */}
        {!reducedMotion && (
          <g
            transform={`translate(${chalkPos.x}, ${chalkPos.y}) rotate(${chalkPos.angle})`}
            filter="url(#chalkPieceShadow)"
            className="transition-transform duration-75 ease-out pointer-events-none"
          >
            {/* Chalk Body: Tapered White Cylinder with Shading */}
            <defs>
              <linearGradient id="chalkShading" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="40%" stopColor="#f1f5f9" />
                <stop offset="85%" stopColor="#cbd5e1" />
                <stop offset="100%" stopColor="#94a3b8" />
              </linearGradient>
            </defs>

            {/* Main Chalk Stick */}
            <rect
              x="-4"
              y="-32"
              width="8"
              height="32"
              rx="2.5"
              fill="url(#chalkShading)"
              stroke="#e2e8f0"
              strokeWidth="0.5"
            />
            {/* Writing Tip (slanted chalk contact edge) */}
            <path
              d="M -3.8 0 L 3.8 0 L 2.5 4 Q 0 5.5 -2.5 4 Z"
              fill="#ffffff"
            />
            {/* Tiny bevel ring on chalk base */}
            <ellipse cx="0" cy="-30" rx="3.5" ry="1.2" fill="#e2e8f0" />
          </g>
        )}
      </svg>
    </div>
  );
};
