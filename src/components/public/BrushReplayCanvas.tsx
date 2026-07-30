import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Point {
  x: number;
  y: number;
}

interface BrushReplayCanvasProps {
  textContent?: string;
  mediaUrl?: string;
  onComplete?: () => void;
}

export const BrushReplayCanvas: React.FC<BrushReplayCanvasProps> = ({
  textContent,
  mediaUrl,
  onComplete
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const brushRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isAnimationFinished, setIsAnimationFinished] = useState(false);
  const [activeBrushColor, setActiveBrushColor] = useState('hsl(200, 90%, 55%)');
  const [splatters, setSplatters] = useState<Array<{ id: number; x: number; y: number; size: number; color: string }>>([]);

  useEffect(() => {
    let animationFrameId: number;
    let isDestroyed = false;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Match parent container size
    const container = containerRef.current;
    const width = container ? container.clientWidth : 340;
    const height = container ? container.clientHeight : 450;
    canvas.width = width;
    canvas.height = height;

    // Create offscreen cover canvas
    const coverCanvas = document.createElement('canvas');
    coverCanvas.width = width;
    coverCanvas.height = height;
    const coverCtx = coverCanvas.getContext('2d');
    if (!coverCtx) return;

    // Fill cover canvas with white
    coverCtx.fillStyle = '#fdfcf7';
    coverCtx.fillRect(0, 0, width, height);

    // Apply soft realistic paper texture
    const textureImg = new Image();
    textureImg.crossOrigin = "anonymous";
    textureImg.src = 'https://www.transparenttextures.com/patterns/canvas-paper.png';
    textureImg.onload = () => {
      if (isDestroyed) return;
      const pattern = coverCtx.createPattern(textureImg, 'repeat');
      if (pattern) {
        coverCtx.save();
        coverCtx.globalCompositeOperation = 'multiply';
        coverCtx.fillStyle = pattern;
        coverCtx.fillRect(0, 0, width, height);
        coverCtx.restore();
      }
    };

    // Draw user's pencil sketch if it exists
    let originalWidth = 600;
    let originalHeight = 350;
    let originalStrokes: any[] = [];
    try {
      if (textContent && textContent.trim().startsWith('{')) {
        const parsed = JSON.parse(textContent);
        originalWidth = parsed.width || 600;
        originalHeight = parsed.height || 350;
        originalStrokes = parsed.strokes || [];
      }
    } catch (e) {
      console.warn("Could not parse original drawing strokes:", e);
    }

    if (originalStrokes.length > 0) {
      const scaleX = width / originalWidth;
      const scaleY = height / originalHeight;
      const scale = Math.min(scaleX, scaleY);
      const offsetX = (width - originalWidth * scale) / 2;
      const offsetY = (height - originalHeight * scale) / 2;

      coverCtx.save();
      coverCtx.lineCap = 'round';
      coverCtx.lineJoin = 'round';
      coverCtx.strokeStyle = '#475569'; // Pencil charcoal color

      originalStrokes.forEach((stroke: any) => {
        if (!stroke.points || stroke.points.length < 1) return;
        coverCtx.beginPath();
        coverCtx.lineWidth = (stroke.size || 5) * scale;
        
        const firstPt = stroke.points[0];
        coverCtx.moveTo(firstPt.x * scale + offsetX, firstPt.y * scale + offsetY);
        
        for (let i = 1; i < stroke.points.length; i++) {
          const pt = stroke.points[i];
          coverCtx.lineTo(pt.x * scale + offsetX, pt.y * scale + offsetY);
        }
        coverCtx.stroke();
      });
      coverCtx.restore();
    }

    // Load final AI painting image
    const aiImg = new Image();
    aiImg.crossOrigin = "anonymous";
    let isAiImgLoaded = false;
    if (mediaUrl) {
      aiImg.src = mediaUrl;
      aiImg.onload = () => {
        isAiImgLoaded = true;
      };
    }

    // Generate high-coverage Zigzag Path
    const generateZigzagPath = (w: number, h: number) => {
      const path: Point[] = [];
      const numSweeps = 8;
      const verticalSpacing = h / (numSweeps + 1);

      // Start offscreen top-left
      path.push({ x: -50, y: verticalSpacing * 0.5 });

      for (let i = 0; i <= numSweeps; i++) {
        const y = (i + 0.5) * verticalSpacing;
        const isLeftToRight = i % 2 === 0;
        const startX = isLeftToRight ? -30 : w + 30;
        const endX = isLeftToRight ? w + 30 : -30;

        const stepsPerSweep = 25;
        for (let s = 0; s <= stepsPerSweep; s++) {
          const t = s / stepsPerSweep;
          const x = startX + (endX - startX) * t;
          const curveY = y + Math.sin(t * Math.PI) * 22;
          path.push({ x, y: curveY });
        }
      }
      // Finish offscreen bottom-right
      path.push({ x: width + 50, y: height - 10 });
      return path;
    };

    const zigzagPath = generateZigzagPath(width, height);

    // Animation states
    let pathIndex = 0;
    let currentX = zigzagPath[0].x;
    let currentY = zigzagPath[0].y;
    let prevX = currentX;
    let prevY = currentY;

    let lastTime = performance.now();
    let segmentProgress = 0;
    let splatterId = 0;
    
    // Position history for lagging reveal
    const positionHistory: Point[] = [];
    const speedPixelsPerMs = 1.35;

    const runLoop = (timestamp: number) => {
      if (isDestroyed) return;

      const elapsed = timestamp - lastTime;
      lastTime = timestamp;

      if (pathIndex >= zigzagPath.length - 1) {
        // Complete! Wait, then fade in final masterpiece
        setTimeout(() => {
          if (!isDestroyed) {
            setIsAnimationFinished(true);
            if (onComplete) onComplete();
          }
        }, 350);
        return;
      }

      const pA = zigzagPath[pathIndex];
      const pB = zigzagPath[pathIndex + 1];
      const dx = pB.x - pA.x;
      const dy = pB.y - pA.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const stepDist = speedPixelsPerMs * elapsed;
      if (dist > 0) {
        segmentProgress += stepDist / dist;
      } else {
        segmentProgress = 1;
      }

      if (segmentProgress >= 1) {
        segmentProgress = 0;
        pathIndex++;
      }

      const t = Math.min(1, segmentProgress);
      prevX = currentX;
      prevY = currentY;
      currentX = pA.x + dx * t;
      currentY = pA.y + dy * t;

      // Track history for lagging reveal
      positionHistory.push({ x: currentX, y: currentY });

      // Calculate path progress percentage to map dynamic color shifting
      const progressOffset = pathIndex + t;
      
      // Update bristle tip color dynamically to match the current color shift
      const activeHue = Math.floor((progressOffset * 4) % 360);
      const activeColorStr = `hsl(${activeHue}, 90%, 55%)`;
      setActiveBrushColor(activeColorStr);

      // --- Draw Realistic Textured Bristle Brush Stroke with shifting colors ---
      const strokeDistX = currentX - prevX;
      const strokeDistY = currentY - prevY;
      const strokeLen = Math.sqrt(strokeDistX * strokeDistX + strokeDistY * strokeDistY);

      if (strokeLen > 0) {
        const nx = -strokeDistY / strokeLen;
        const ny = strokeDistX / strokeLen;

        const numBristles = 28;
        const brushWidth = 85;

        for (let b = 0; b < numBristles; b++) {
          const offset = ((b / (numBristles - 1)) - 0.5) * brushWidth;
          
          // Color changes dynamically along the line as the brush moves!
          const bristleHue = Math.floor((progressOffset * 4 + b * 2) % 360);
          const color = `hsl(${bristleHue}, 90%, 55%)`;
          
          const bristleWidth = 1.8 + Math.random() * 2.2;
          const opacity = 0.5 + Math.random() * 0.45;

          coverCtx.save();
          coverCtx.globalCompositeOperation = 'source-over';
          coverCtx.strokeStyle = color;
          coverCtx.globalAlpha = opacity;
          coverCtx.lineWidth = bristleWidth;
          coverCtx.lineCap = 'round';
          
          coverCtx.beginPath();
          coverCtx.moveTo(prevX + nx * offset, prevY + ny * offset);
          coverCtx.lineTo(currentX + nx * offset, currentY + ny * offset);
          coverCtx.stroke();
          coverCtx.restore();
        }
      }

      // --- Lagging Smooth Erase/Reveal Mask ---
      // We reveal the final AI image slightly behind the brush path (e.g. 16 frames lag)
      const lagFrames = 16;
      if (positionHistory.length > lagFrames) {
        const lagPt = positionHistory[positionHistory.length - lagFrames];
        
        coverCtx.save();
        // Feathered edge for smooth transition
        const grad = coverCtx.createRadialGradient(lagPt.x, lagPt.y, 45, lagPt.x, lagPt.y, 70);
        grad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
        
        coverCtx.globalCompositeOperation = 'destination-out';
        coverCtx.fillStyle = grad;
        coverCtx.beginPath();
        coverCtx.arc(lagPt.x, lagPt.y, 70, 0, Math.PI * 2);
        coverCtx.fill();
        coverCtx.restore();
      }

      // --- Draw Scene to Main Canvas ---
      ctx.clearRect(0, 0, width, height);

      // Draw final AI image underneath
      if (isAiImgLoaded) {
        ctx.drawImage(aiImg, 0, 0, width, height);
      } else {
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(0, 0, width, height);
      }

      // Draw cover on top (sketched paper being painted over/revealed)
      ctx.drawImage(coverCanvas, 0, 0);

      // --- Update Paintbrush Sprite ---
      if (brushRef.current) {
        const brushAngleRad = Math.atan2(dy, dx);
        const angleDeg = brushAngleRad * (180 / Math.PI) + 45;

        brushRef.current.style.left = `${currentX}px`;
        brushRef.current.style.top = `${currentY}px`;
        brushRef.current.style.transform = `translate(-20px, -115px) scale(1.6) rotate(${angleDeg}deg)`;
      }

      // Paint splatters on turns matching the active shifting color
      if (pathIndex > 1 && pathIndex < zigzagPath.length - 2) {
        const pPrev = zigzagPath[pathIndex - 1];
        const angle1 = Math.atan2(pA.y - pPrev.y, pA.x - pPrev.x);
        const angle2 = Math.atan2(pB.y - pA.y, pB.x - pA.x);
        let angleDiff = Math.abs(angle2 - angle1);
        if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

        if (angleDiff > (40 * Math.PI / 180) && Math.random() < 0.22) {
          const newSplatters = Array.from({ length: 3 + Math.floor(Math.random() * 4) }).map(() => {
            const splatAngle = Math.random() * Math.PI * 2;
            const splatDist = 40 + Math.random() * 30;
            return {
              id: splatterId++,
              x: currentX + Math.cos(splatAngle) * splatDist,
              y: currentY + Math.sin(splatAngle) * splatDist,
              size: 2 + Math.random() * 4,
              color: activeColorStr
            };
          });
          setSplatters(prev => [...prev.slice(-40), ...newSplatters]);
        }
      }

      animationFrameId = requestAnimationFrame(runLoop);
    };

    animationFrameId = requestAnimationFrame(runLoop);

    return () => {
      isDestroyed = true;
      cancelAnimationFrame(animationFrameId);
    };
  }, [textContent, mediaUrl, onComplete]);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-white select-none overflow-hidden">
      {/* Splatters */}
      <div className="absolute inset-0 pointer-events-none z-15">
        {splatters.map(s => (
          <div
            key={s.id}
            className="absolute rounded-full"
            style={{
              left: s.x,
              top: s.y,
              width: s.size,
              height: s.size,
              backgroundColor: s.color,
              transform: 'translate(-50%, -50%)',
              opacity: 0.8
            }}
          />
        ))}
      </div>

      <canvas ref={canvasRef} className="w-full h-full block relative z-10" />

      {/* Glow */}
      <div className="absolute inset-0 pointer-events-none z-14 shadow-[inset_0_0_20px_rgba(37,99,235,0.12)] mix-blend-multiply" />

      {/* Paintbrush Sprite */}
      <div
        ref={brushRef}
        className="absolute pointer-events-none z-30 transition-transform duration-[0ms] ease-linear"
        style={{
          width: '40px',
          height: '140px',
          left: '0px',
          top: '0px',
          transform: 'translate(-20px, -115px) scale(1.6) rotate(45deg)',
          transformOrigin: '20px 120px'
        }}
      >
        <svg width="40" height="140" viewBox="0 0 40 140" fill="none">
          <path d="M16 0H24V80C24 84 22 86 20 86C18 86 16 84 16 80V0Z" fill="#b45309" />
          <rect x="13" y="80" width="14" height="20" fill="#cbd5e1" rx="2" />
          <line x1="13" y1="86" x2="27" y2="86" stroke="#94a3b8" strokeWidth="1.5" />
          <line x1="13" y1="93" x2="27" y2="93" stroke="#94a3b8" strokeWidth="1.5" />
          <path d="M13 100C13 100 9 112 12 124H28C31 112 27 100 27 100H13Z" fill="#d97706" />
          <path
            d="M12 124C12 124 15 140 20 140C25 140 28 124 28 124H12Z"
            fill={activeBrushColor}
          />
          <path d="M15 125C15 125 16 134 18 136" stroke="#ffffff" strokeWidth="1" opacity="0.5" />
        </svg>
      </div>

      {/* Crossfade */}
      <AnimatePresence>
        {isAnimationFinished && mediaUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="absolute inset-0 z-20 bg-white flex items-center justify-center"
          >
            <img
              src={mediaUrl}
              alt="Final AI Masterpiece"
              className="w-full h-full object-contain"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};