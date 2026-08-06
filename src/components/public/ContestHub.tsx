import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Trophy, Heart, Download, Play, Pause, Sparkles, Clock,
  Send, Eraser, Trash2, MessageSquare, Share2, X, Gift, FileText, Zap, Video, Check,
  Ticket, ThumbsUp, HeartCrack, ShieldCheck, AlertCircle, Palette, PenTool, ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'react-hot-toast';
import { contestService } from '@/services/contestService';
import { Contest, ContestParticipation, ContestComment } from '@/types/contest';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { api } from '@/services/api';
import { DiscountUnlockPopup } from './DiscountUnlockPopup';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import Particles, { ParticlesProvider } from '@tsparticles/react';
import { loadFull } from 'tsparticles';
import { BrushReplayCanvas } from './BrushReplayCanvas';
import { Excalidraw, exportToBlob, MainMenu } from '@excalidraw/excalidraw';
import { cn } from '@/utils/cn';
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const formatNumberCompact = (num: number) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
};

interface ContestHeaderProps {
  shopName: string;
  title: string;
  description?: string;
  rewardValue?: string;
  contestType: 'drawing' | 'kavithai';
  primaryColor: string;
  onRewardClick: () => void;
}

export const ContestHeader: React.FC<ContestHeaderProps> = ({
  shopName,
  title,
  description,
  rewardValue,
  contestType,
  primaryColor,
  onRewardClick,
}) => {
  return (
    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 p-4 sticky top-0 z-30 space-y-2 select-none shadow-xs">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-450 dark:text-slate-400">
          @{shopName}
        </span>
        <button
          onClick={onRewardClick}
          className="text-[9px] font-black px-2.5 py-1 rounded-full text-white uppercase tracking-wider cursor-pointer hover:scale-105 active:scale-95 transition-transform flex items-center gap-1"
          style={{ backgroundColor: primaryColor }}
        >
          <Gift size={11} className="shrink-0" />
          <span>Reward: Free {rewardValue}</span>
        </button>
      </div>
      <div className="space-y-1">
        <h2 className="text-sm font-black tracking-tight text-slate-850 dark:text-slate-100 flex items-center gap-1.5 leading-tight">
          <span>
            {contestType === 'drawing' ? <Palette size={14} className="text-slate-550 dark:text-slate-400 shrink-0" /> : <PenTool size={14} className="text-slate-550 dark:text-slate-400 shrink-0" />}
          </span>
          <span>{title}</span>
        </h2>
        {description && (
          <p className="text-[11px] text-slate-400 dark:text-slate-500 line-clamp-1 leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </div>
  );
};

interface ContestHubProps {
  shopId: string;
  initialViewMode?: 'dashboard' | 'reels';
  targetContestId?: string;
  onBack?: () => void;
  primaryColor?: string;
}

export const ContestHub: React.FC<ContestHubProps> = ({
  shopId,
  initialViewMode = 'dashboard',
  targetContestId,
  onBack,
  primaryColor = '#f97316'
}) => {
  const navigate = useNavigate();
  const [activeContest, setActiveContest] = useState<Contest | null>(null);
  const [shopName, setShopName] = useState<string>('');
  const [participations, setParticipations] = useState<ContestParticipation[]>([]);
  const [credits, setCredits] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{ reels_count: number; winners_count: number }>({ reels_count: 0, winners_count: 0 });
  const [galleryTextIndex, setGalleryTextIndex] = useState(0);

  // Auth & Pay flows
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [isFomoOpen, setIsFomoOpen] = useState(false);
  const [shakeModal, setShakeModal] = useState(false);
  const [isRewardInfoOpen, setIsRewardInfoOpen] = useState(false);

  // Participation states
  const [activeSession, setActiveSession] = useState<ContestParticipation | null>(null);
  const [timeLeft, setTimeLeft] = useState(600);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [poemText, setPoemText] = useState('');

  // Canvas drawing states
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [isEraser, setIsEraser] = useState(false);
  const [strokes, setStrokes] = useState<any[]>([]);
  const currentStrokeRef = useRef<any[]>([]);
  const [brushType, setBrushType] = useState<'pen' | 'marker' | 'spray'>('pen');
  const [shapeType, setShapeType] = useState<'freehand' | 'line' | 'rectangle' | 'circle' | 'triangle' | 'heart'>('freehand');

  // Reels, Info Popup, & Comments states
  const [isReelsOpen, setIsReelsOpen] = useState(initialViewMode === 'reels');
  const [isDetailPopupOpen, setIsDetailPopupOpen] = useState(false);
  const [activeReelIndex, setActiveReelIndex] = useState(0);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [comments, setComments] = useState<ContestComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [commentHeightMode, setCommentHeightMode] = useState<'normal' | 'full'>('normal');

  const touchStartY = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = e.changedTouches[0].clientY - touchStartY.current;
    if (diff < -40) {
      setCommentHeightMode('full');
    } else if (diff > 40) {
      if (commentHeightMode === 'full') {
        setCommentHeightMode('normal');
      } else {
        setIsCommentsOpen(false);
      }
    }
  };

  useEffect(() => {
    if (isReelsOpen && participations[activeReelIndex]) {
      const prefetchComments = async () => {
        try {
          const token = localStorage.getItem('customer_token') || undefined;
          const data = await contestService.getComments(participations[activeReelIndex].id, token);
          setComments(data);
        } catch (error) {
          console.warn("Failed to prefetch comments:", error);
        }
      };
      prefetchComments();
    }
  }, [activeReelIndex, isReelsOpen, participations]);

  const handleToggleLikeComment = async (commentId: string) => {
    const token = localStorage.getItem('customer_token');
    if (!token) {
      setIsAuthOpen(true);
      return;
    }
    try {
      const liked = await contestService.likeComment(commentId, token);
      setComments(prev =>
        prev.map(c => {
          if (c.id === commentId) {
            return {
              ...c,
              is_liked: liked,
              likes_count: Math.max(0, (c.likes_count || 0) + (liked ? 1 : -1))
            };
          }
          return c;
        })
      );
    } catch (error) {
      console.error("Failed to like comment", error);
    }
  };

  interface ThreadedComment extends ContestComment {
    replies: ThreadedComment[];
  }

  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());

  const handleToggleReplies = (commentId: string) => {
    setExpandedComments(prev => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  };

  const threadedComments = useMemo(() => {
    const sorted = [...comments].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const tree: ThreadedComment[] = [];
    const map = new Map<string, ThreadedComment>();

    sorted.forEach(c => {
      const tc = { ...c, replies: [] };
      map.set(c.id, tc);
    });

    sorted.forEach(c => {
      const tc = map.get(c.id)!;
      const match = c.text.match(/^@([a-zA-Z0-9_\u00C0-\u00FF-]+)\b/);
      if (match) {
        const targetUsername = match[1].toLowerCase();
        let parent: ThreadedComment | undefined = undefined;

        for (let i = sorted.indexOf(c) - 1; i >= 0; i--) {
          const candidate = map.get(sorted[i].id)!;
          if ((candidate.customer_name || 'Anonymous').toLowerCase() === targetUsername) {
            parent = candidate;
            break;
          }
        }

        if (parent) {
          parent.replies.push(tc);
        } else {
          tree.push(tc);
        }
      } else {
        tree.push(tc);
      }
    });

    return tree.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [comments]);

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-red-150 text-red-650 dark:bg-red-950/40 dark:text-red-400',
      'bg-blue-150 text-blue-650 dark:bg-blue-950/40 dark:text-blue-400',
      'bg-emerald-150 text-emerald-650 dark:bg-emerald-950/40 dark:text-emerald-400',
      'bg-amber-150 text-amber-650 dark:bg-amber-950/40 dark:text-amber-450',
      'bg-purple-150 text-purple-650 dark:bg-purple-950/40 dark:text-purple-400',
      'bg-pink-150 text-pink-650 dark:bg-pink-950/40 dark:text-pink-400',
    ];
    let sum = 0;
    for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
    return colors[sum % colors.length];
  };

  const renderCommentText = (text: string) => {
    const parts = text.split(/(\s+)/);
    return parts.map((part, idx) => {
      if (part.startsWith('@')) {
        return (
          <span key={idx} className="text-blue-600 dark:text-blue-400 font-extrabold hover:underline cursor-pointer">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  // Double tap states
  const [showHeartPop, setShowHeartPop] = useState(false);
  const [showPaintSplash, setShowPaintSplash] = useState(false);
  const [showLettersBurst, setShowLettersBurst] = useState(false);
  const lastTap = useRef<number>(0);
  const [ctaTextIndex, setCtaTextIndex] = useState(0);
  const [tapCoords, setTapCoords] = useState<{ x: number; y: number } | null>(null);
  const [pendingPart, setPendingPart] = useState<any>(null);
  const particlesInit = true;

  // Handwriting simulation states
  const [poetryCharIndex, setPoetryCharIndex] = useState(0);
  const [isWritingFinished, setIsWritingFinished] = useState(false);

  const [hasFiredEmptyConfetti, setHasFiredEmptyConfetti] = useState(false);
  const [isJoinSelectionOpen, setIsJoinSelectionOpen] = useState(false);
  const [selectedPartToJoin, setSelectedPartToJoin] = useState<any>(null);
  const [contestInfoToDisplay, setContestInfoToDisplay] = useState<any>(null);

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Caveat:wght@700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  useEffect(() => {
    setPoetryCharIndex(0);
    setIsWritingFinished(false);
  }, [activeReelIndex]);

  useEffect(() => {
    if (isWritingFinished) return;
    const currentPart = participations[activeReelIndex];
    if (!currentPart || currentPart.content_type !== 'kavithai' || !isReelsOpen) return;

    const text = currentPart.text_content || '';
    if (poetryCharIndex >= text.length) {
      setIsWritingFinished(true);
      return;
    }

    const nextDelay = text[poetryCharIndex] === ' ' ? 220 : text[poetryCharIndex] === '\n' ? 500 : 45;
    const timer = setTimeout(() => {
      setPoetryCharIndex(prev => prev + 1);
    }, nextDelay);

    return () => clearTimeout(timer);
  }, [poetryCharIndex, activeReelIndex, isReelsOpen, participations, isWritingFinished]);

  const penCoords = useMemo(() => {
    const currentPart = participations[activeReelIndex];
    if (!currentPart || currentPart.content_type !== 'kavithai') return { x: 290, y: 390, rotate: 45 };
    const text = currentPart.text_content || '';

    const writtenText = text.substring(0, poetryCharIndex);
    const lines = writtenText.split('\n');
    const lineCount = lines.length - 1;
    const currentLine = lines[lines.length - 1] || '';

    const startY = 82;
    const lineHeight = 28;
    const startX = 65;

    const targetY = isWritingFinished ? 390 : startY + lineCount * lineHeight;
    const targetX = isWritingFinished ? 290 : startX + currentLine.length * 6.8;
    const rotate = isWritingFinished ? 45 : -15 + (poetryCharIndex % 2 === 0 ? 12 : -12);

    return { x: targetX, y: targetY, rotate };
  }, [poetryCharIndex, activeReelIndex, participations, isWritingFinished]);

  const POETRY_GLYPHS = useMemo(() => ['A', 'அ', 'அ', 'అ', 'அ', 'മ', 'ക', 'જ', 'ક', 'Ñ', 'ß', 'Ö', '诗', '书', '爱', '가', 'あ', 'ا', 'অ', 'અ', 'അ'], []);
  const PASTEL_COLORS = useMemo(() => [
    'linear-gradient(135deg, #fbcfe8 0%, #f472b6 100%)',
    'linear-gradient(135deg, #c084fc 0%, #a855f7 100%)',
    'linear-gradient(135deg, #67e8f9 0%, #06b6d4 100%)',
    'linear-gradient(135deg, #fed7aa 0%, #f97316 100%)',
    'linear-gradient(135deg, #fef08a 0%, #eab308 100%)',
    'linear-gradient(135deg, #a7f3d0 0%, #10b981 100%)'
  ], []);



  const letters = useMemo(() => {
    if (!showLettersBurst) return [];
    return Array.from({ length: 18 }).map((_, i) => {
      const angle = (i * 20 + Math.random() * 15) * (Math.PI / 180);
      const distance = 160 + Math.random() * 240;
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance;
      const glyph = POETRY_GLYPHS[Math.floor(Math.random() * POETRY_GLYPHS.length)];
      const color = PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)];
      const size = 36 + Math.random() * 40;
      const delay = Math.random() * 0.15;
      const rotate = -90 + Math.random() * 180;
      return { id: i, tx, ty, glyph, color, size, delay, rotate };
    });
  }, [showLettersBurst, POETRY_GLYPHS, PASTEL_COLORS]);

  const [physicsBalloons, setPhysicsBalloons] = useState<any[]>([]);
  const [physicsDroplets, setPhysicsDroplets] = useState<any[]>([]);

  useEffect(() => {
    if (!showPaintSplash || !tapCoords) return;

    const VIEW_WIDTH = 380;
    const VIEW_HEIGHT = 600;

    import('matter-js').then((Matter) => {
      const { Engine, World, Bodies, Body, Composite } = Matter;

      const engine = Engine.create({
        gravity: { y: 0.25 }
      });

      const balloonsList: { body: any; color: string; size: number; id: number; targetX: number; targetY: number }[] = [];
      const dropletsList: { body: any; color: string; size: number; id: number; maxLife: number; life: number }[] = [];

      const targetX = tapCoords.x;
      const targetY = tapCoords.y;

      const colors = ['#ec4899', '#f43f5e', '#3b82f6', '#eab308', '#a855f7', '#10b981', '#f97316', '#06b6d4'];

      // Spawn 8 balloons at random edges directed at double-tap location
      for (let i = 0; i < 8; i++) {
        let startX = 0;
        let startY = 0;
        const edge = Math.floor(Math.random() * 4);
        if (edge === 0) {
          startX = -40;
          startY = Math.random() * VIEW_HEIGHT;
        } else if (edge === 1) {
          startX = VIEW_WIDTH + 40;
          startY = Math.random() * VIEW_HEIGHT;
        } else if (edge === 2) {
          startX = Math.random() * VIEW_WIDTH;
          startY = -40;
        } else {
          startX = Math.random() * VIEW_WIDTH;
          startY = VIEW_HEIGHT + 40;
        }

        const size = 35 + Math.random() * 20;
        const balloonBody = Bodies.circle(startX, startY, size / 2, {
          frictionAir: 0.02,
          isSensor: true
        });

        const dx = targetX - startX;
        const dy = targetY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Stagger speed vectors for different arrival times
        const speed = 7 + Math.random() * 5;
        const vx = (dx / distance) * speed;
        const vy = (dy / distance) * speed - (2 + Math.random() * 3);

        Body.setVelocity(balloonBody, { x: vx, y: vy });
        Composite.add(engine.world, balloonBody);

        balloonsList.push({
          id: i,
          body: balloonBody,
          color: colors[i % colors.length],
          size,
          targetX,
          targetY
        });
      }

      let dropletIdCounter = 0;
      let frameId = 0;
      let isSubscribed = true;

      const updateLoop = () => {
        if (!isSubscribed) return;
        Engine.update(engine, 1000 / 60);

        // Track and process balloon impacts
        const updatedBalloons: any[] = [];
        balloonsList.forEach(b => {
          if (b.body.isDead) return;

          const currentPos = b.body.position;
          const dx = targetX - currentPos.x;
          const dy = targetY - currentPos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Impact threshold trigger (collided / reached near click coordinates)
          if (dist < 26) {
            b.body.isDead = true;
            Composite.remove(engine.world, b.body);

            // Generate 18 water droplets spraying in random physics coordinates
            for (let k = 0; k < 18; k++) {
              const angle = Math.random() * Math.PI * 2;
              const speed = 1.5 + Math.random() * 5;
              const dropSize = 4 + Math.random() * 6;
              const droplet = Bodies.circle(currentPos.x, currentPos.y, dropSize / 2, {
                frictionAir: 0.015,
                restitution: 0.4
              });

              Body.setVelocity(droplet, {
                x: Math.cos(angle) * speed,
                y: Math.sin(angle) * speed - (1 + Math.random() * 2)
              });

              Composite.add(engine.world, droplet);
              dropletsList.push({
                id: dropletIdCounter++,
                body: droplet,
                color: b.color,
                size: dropSize,
                maxLife: 140 + Math.random() * 30,
                life: 0
              });
            }
          } else {
            updatedBalloons.push({
              id: b.id,
              x: currentPos.x,
              y: currentPos.y,
              color: b.color,
              size: b.size
            });
          }
        });

        // Filter and update gravity droplets
        const activeDroplets: any[] = [];
        for (let j = dropletsList.length - 1; j >= 0; j--) {
          const d = dropletsList[j];
          d.life++;
          if (d.life >= d.maxLife) {
            Composite.remove(engine.world, d.body);
            dropletsList.splice(j, 1);
          } else {
            const pos = d.body.position;
            activeDroplets.push({
              id: d.id,
              x: pos.x,
              y: pos.y,
              color: d.color,
              size: d.size,
              opacity: 1 - (d.life / d.maxLife)
            });
          }
        }

        setPhysicsBalloons(updatedBalloons);
        setPhysicsDroplets(activeDroplets);

        frameId = requestAnimationFrame(updateLoop);
      };

      frameId = requestAnimationFrame(updateLoop);

      return () => {
        isSubscribed = false;
        cancelAnimationFrame(frameId);
        World.clear(engine.world, false);
        Engine.clear(engine);
      };
    });
  }, [showPaintSplash, tapCoords]);

  const particlesOptions = useMemo(() => ({
    background: {
      color: {
        value: "transparent",
      },
    },
    fpsLimit: 60,
    particles: {
      color: {
        value: ["#FFD700", "#FFA500", "#FF2A6D", "#05D9E8", "#A855F7"],
      },
      move: {
        direction: "top" as const,
        enable: true,
        outModes: {
          default: "out" as const,
        },
        random: true,
        speed: 1.5,
        straight: false,
      },
      number: {
        density: {
          enable: true,
          area: 800,
        },
        value: 30,
      },
      opacity: {
        value: { min: 0.2, max: 0.6 },
        animation: {
          enable: true,
          speed: 1,
          sync: false,
        },
      },
      shape: {
        type: "circle",
      },
      size: {
        value: { min: 1.5, max: 4 },
      },
      wobble: {
        enable: true,
        distance: 5,
        speed: 5,
      },
    },
    detectRetina: true,
  }), []);

  useEffect(() => {
    const ctaInterval = setInterval(() => {
      setCtaTextIndex(prev => (prev + 1) % 4);
    }, 2800);
    const galleryInterval = setInterval(() => {
      setGalleryTextIndex(prev => (prev + 1) % 3);
    }, 2500);
    return () => {
      clearInterval(ctaInterval);
      clearInterval(galleryInterval);
    };
  }, []);

  // 3D Tilt & Shine calculations
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentShopParticipations = useMemo(() => {
    if (!activeContest) return [];
    return participations.filter(p => p.shop_id === shopId && p.contest_id === activeContest.id);
  }, [participations, activeContest, shopId]);

  useEffect(() => {
    if (activeContest && currentShopParticipations.length === 0 && !loading && !hasFiredEmptyConfetti) {
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval: any = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);

      setHasFiredEmptyConfetti(true);
    }
  }, [activeContest, currentShopParticipations, loading, hasFiredEmptyConfetti]);

  const loadContestDetails = async () => {
    try {
      setLoading(true);

      try {
        const shopRes = await api.get(`/public/shop/${shopId}`);
        if (shopRes.data && shopRes.data.name) {
          setShopName(shopRes.data.name);
        }
      } catch (err) {
        console.error("Failed to load shop details", err);
      }

      const contest = await contestService.getActiveContest(shopId);
      setActiveContest(contest);

      // Load all participations from all contests/shops for the reels view
      const parts = await contestService.getAllParticipations();
      setParticipations(parts);

      try {
        const statsData = await contestService.getContestStats();
        setStats(statsData);
      } catch (err) {
        console.error("Failed to load contest stats", err);
      }

      const searchParams = new URLSearchParams(window.location.search);
      const targetPartId = searchParams.get('participation_id') || searchParams.get('entry_id');

      if (targetPartId && parts.length > 0) {
        const targetIndex = parts.findIndex(p => p.id === targetPartId);
        if (targetIndex !== -1) {
          setActiveReelIndex(targetIndex);
          setIsReelsOpen(true);
        } else if (initialViewMode === 'reels') {
          setIsReelsOpen(true);
        }
      } else {
        const hasShopParts = parts.some(p => p.shop_id === shopId && p.contest_id === contest?.id);
        if (initialViewMode === 'reels' && parts.length > 0 && (!contest || hasShopParts)) {
          setIsReelsOpen(true);
        } else {
          setIsReelsOpen(false);
        }
      }

      const token = localStorage.getItem('customer_token');
      if (token) {
        try {
          const creds = await contestService.getCredits(token);
          setCredits(creds);
        } catch (err) {
          console.warn("Invalid customer token:", err);
          localStorage.removeItem('customer_token');
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContestDetails();

    const params = new URLSearchParams(window.location.search);
    const attendSessionId = params.get('attend_session_id');
    const contestType = params.get('contest_type');

    // Check for payment success callback
    const paymentSuccess = params.get('payment_success');
    const payLinkId = params.get('link_id');
    const payMobileNumber = params.get('mobile_number');

    if (paymentSuccess === 'true' && payLinkId && payMobileNumber) {
      const verifyPayment = async () => {
        const verifyToast = toast.loading("Verifying online payment...");
        try {
          // Normalize URL-encoded or spaced phone strings back to '+' prefix format
          let cleanedMobile = decodeURIComponent(payMobileNumber).trim();
          if (cleanedMobile.includes(' ')) {
            cleanedMobile = cleanedMobile.replace(/\s+/g, '+');
          }
          if (!cleanedMobile.startsWith('+')) {
            if (cleanedMobile.startsWith('91') && cleanedMobile.length > 10) {
              cleanedMobile = '+' + cleanedMobile;
            } else if (cleanedMobile.length === 10) {
              cleanedMobile = '+91' + cleanedMobile;
            }
          }

          const credRes = await contestService.verifyPayContest(payLinkId, cleanedMobile);
          setCredits(credRes.credits);
          toast.dismiss(verifyToast);
          toast.success("Payment verified successfully! 2 Credits added.");

          // Clear query params from URL so reloading doesn't re-trigger verification
          const cleanUrl = window.location.origin + window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        } catch (err) {
          toast.dismiss(verifyToast);
          toast.error("Payment verification failed. Please contact support.");
        }
      };
      verifyPayment();
    }

    if (attendSessionId && contestType) {
      setActiveSession({
        id: attendSessionId,
        contest_id: '',
        customer_id: '',
        content_type: contestType as 'drawing' | 'kavithai',
        text_content: null,
        media_url: null,
        likes_count: 0,
        time_remaining_seconds: 600,
        is_timer_running: true,
        is_submitted: false,
        timer_last_updated_at: null,
        created_at: new Date().toISOString()
      });
      setTimeLeft(600);
      setIsTimerRunning(true);
      setIsSubmitOpen(true);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [shopId]);

  useEffect(() => {
    if (isTimerRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            if (timerRef.current) clearInterval(timerRef.current);
            toast.error("Time expired!");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning, timeLeft]);

  // Trigger winner celebration confetti when activeReelIndex shifts to a winner reel
  useEffect(() => {
    if (isReelsOpen && participations.length > 0) {
      const currentPart = participations[activeReelIndex];
      if (currentPart && currentPart.is_winner) {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#FFD700', '#FFA500', '#FF8C00', '#ffffff', '#FF2A6D', '#05D9E8'],
        });
      }
    }
  }, [activeReelIndex, isReelsOpen, participations]);

  const handleMediaTap = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    if (now - lastTap.current < DOUBLE_PRESS_DELAY) {
      const rect = e.currentTarget.getBoundingClientRect();

      let clientX = 0;
      let clientY = 0;
      if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ('changedTouches' in e && e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
      } else {
        clientX = (e as React.MouseEvent).clientX;
        clientY = (e as React.MouseEvent).clientY;
      }

      const x = clientX - rect.left;
      const y = clientY - rect.top;

      setTapCoords({ x, y });
      handleLike(participations[activeReelIndex].id, true);

      if (navigator.vibrate) {
        navigator.vibrate([40, 30, 40]);
      }
    }
    lastTap.current = now;
  };

  const handleMouseMove3D = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const box = card.getBoundingClientRect();
    const x = e.clientX - box.left;
    const y = e.clientY - box.top;

    const rX = ((y / box.height) - 0.5) * -12;
    const rY = ((x / box.width) - 0.5) * 12;

    setRotateX(rX);
    setRotateY(rY);
  };

  const handleMouseLeave3D = () => {
    setRotateX(0);
    setRotateY(0);
  };

  const handleStartParticipation = async (targetContestId?: string, targetContestType?: 'drawing' | 'kavithai') => {
    const token = localStorage.getItem('customer_token');
    if (!token) {
      setIsAuthOpen(true);
      return;
    }

    try {
      let creds = 0;
      try {
        creds = await contestService.getCredits(token);
        setCredits(creds);
      } catch (err) {
        console.warn("Invalid token on participate, prompting auth");
        localStorage.removeItem('customer_token');
        setIsAuthOpen(true);
        return;
      }

      if (creds <= 0) {
        setIsPayOpen(true);
        return;
      }

      const finalContestId = targetContestId || activeContest?.id;
      const finalContestType = targetContestType || activeContest?.contest_type;

      if (!finalContestId || !finalContestType) {
        toast.error("Contest details not found");
        return;
      }

      const session = await contestService.participate(finalContestId, token, finalContestType);
      setActiveSession(session);
      setTimeLeft(session.time_remaining_seconds);
      setIsTimerRunning(true);

      await contestService.toggleTimer(session.id, token, true);
      
      // Open drawing/poetry canvas directly in full-screen modal (no window.open popups)
      setIsSubmitOpen(true);
      const cleanUrl = `${window.location.origin}/shop/${shopId}/contest?attend_session_id=${session.id}&contest_type=${finalContestType}`;
      window.history.pushState({}, '', cleanUrl);

      toast.success("Contest session started!");
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.detail || "Failed to participate");
    }
  };

  const handleToggleTimer = async () => {
    const token = localStorage.getItem('customer_token');
    if (!token || !activeSession) return;

    try {
      const nextState = !isTimerRunning;
      setIsTimerRunning(nextState);
      await contestService.toggleTimer(activeSession.id, token, nextState);
      toast.success(nextState ? "Timer resumed" : "Timer paused");
    } catch (error) {
      console.error(error);
    }
  };

  const handlePay = async () => {
    try {
      const savedMobile = localStorage.getItem('customer_mobile');
      if (!savedMobile) {
        setIsPayOpen(false);
        setIsAuthOpen(true);
        toast.error("Please enter and verify your mobile number first");
        return;
      }

      const loadingToast = toast.loading("Preparing secure Razorpay order...");

      try {
        const res = await contestService.payContest(savedMobile, shopId);
        toast.dismiss(loadingToast);

        // If Mock Gateway Mode
        if (res.mock_mode) {
          try {
            await contestService.verifyPayContest({
              razorpay_order_id: res.order_id,
              mobile_number: savedMobile,
            });
            confetti({ particleCount: 120, spread: 90, origin: { y: 0.5 } });
            toast.success("Payment successful! Contest Token added.");
            setIsPayOpen(false);
            const token = localStorage.getItem('customer_token');
            if (token) {
              const creds = await contestService.getCredits(token);
              setCredits(creds);
            }
          } catch (err) {
            toast.error("Payment verification failed");
          }
          return;
        }

        // Real Razorpay Mode
        const isLoaded = await loadRazorpayScript();
        if (!isLoaded) {
          toast.error("Razorpay SDK failed to load. Are you online?");
          return;
        }

        const basePrice = res.base_amount || 5.00;
        const pgFee = res.pg_fee || 0.15;
        const gstFee = res.gst_on_fee || 0.03;
        const totalAmt = res.final_total || 5.18;

        const options = {
          key: res.key,
          amount: res.amount,
          currency: res.currency || "INR",
          name: "Menukit - 1 Contest Credit",
          description: `1 Credit: ₹${basePrice} | PG Fee (3%): ₹${pgFee} | GST (18%): ₹${gstFee} = ₹${totalAmt}`,
          order_id: res.order_id,
          notes: {
            "1_Contest_Credit": `₹${basePrice}`,
            "2_Payment_Gateway_Fee_3pct": `₹${pgFee}`,
            "3_GST_18pct": `₹${gstFee}`,
            "4_Total_Payable": `₹${totalAmt}`
          },
          handler: async function (response: any) {
            try {
              await contestService.verifyPayContest({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                mobile_number: savedMobile,
              });
              confetti({ particleCount: 120, spread: 90, origin: { y: 0.5 } });
              toast.success("Payment successful! Contest Token added.");
              setIsPayOpen(false);
              const token = localStorage.getItem('customer_token');
              if (token) {
                const creds = await contestService.getCredits(token);
                setCredits(creds);
              }
            } catch (error) {
              toast.error("Payment verification failed. Please contact support.");
            }
          },
          theme: { color: primaryColor || "#f97316" }
        };

        const paymentObject = new (window as any).Razorpay(options);
        paymentObject.open();

      } catch (err: any) {
        toast.dismiss(loadingToast);
        console.error(err);
        toast.error(err.response?.data?.detail || "Failed to create payment order. Please try again.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Payment failed");
    }
  };

  const handleMakeEntry = async (part: any) => {
    if (part.contest_status !== 'active') {
      toast.error("This contest has ended / expired!");
      return;
    }

    const token = localStorage.getItem('customer_token');
    if (!token) {
      setPendingPart(part);
      setIsAuthOpen(true);
      return;
    }

    // If the participation's shop is different, navigate to its contest zone
    if (part.shop_id !== shopId) {
      toast.loading(`Switching to ${part.shop_name}'s Contest...`, { duration: 1000 });
      setTimeout(() => {
        navigate(`/shop/${part.shop_id}/contest`);
      }, 1000);
      return;
    }

    try {
      const creds = await contestService.getCredits(token);
      setCredits(creds);

      if (creds <= 0) {
        setIsPayOpen(true);
      } else {
        handleStartParticipation(part.contest_id, part.content_type);
      }
    } catch (err) {
      console.warn("Invalid token on join check, prompting auth:", err);
      localStorage.removeItem('customer_token');
      setPendingPart(part);
      setIsAuthOpen(true);
    }
  };

  const handleMakeEntryClick = (part: any) => {
    if (part.shop_id === shopId) {
      handleMakeEntry(part);
    } else {
      setSelectedPartToJoin(part);
      setIsJoinSelectionOpen(true);
    }
  };

  const drawShape = (ctx: CanvasRenderingContext2D, type: string, x1: number, y1: number, x2: number, y2: number, color: string, size: number, isEraser: boolean) => {
    ctx.strokeStyle = isEraser ? '#FFFFFF' : color;
    ctx.fillStyle = isEraser ? '#FFFFFF' : color;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const dx = x2 - x1;
    const dy = y2 - y1;

    if (type === 'line') {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    } else if (type === 'rectangle') {
      ctx.beginPath();
      ctx.rect(x1, y1, dx, dy);
      ctx.stroke();
    } else if (type === 'circle') {
      ctx.beginPath();
      const radius = Math.sqrt(dx * dx + dy * dy);
      ctx.arc(x1, y1, radius, 0, Math.PI * 2);
      ctx.stroke();
    } else if (type === 'triangle') {
      ctx.beginPath();
      ctx.moveTo(x1 + dx / 2, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x1, y2);
      ctx.closePath();
      ctx.stroke();
    } else if (type === 'heart') {
      ctx.beginPath();
      const topY = y1 + dy * 0.3;
      ctx.moveTo(x1 + dx / 2, y2);
      ctx.bezierCurveTo(x1, y1 + dy * 0.6, x1, y1, x1 + dx / 2, topY);
      ctx.bezierCurveTo(x2, y1, x2, y1 + dy * 0.6, x1 + dx / 2, y2);
      ctx.stroke();
    }
  };

  const redrawCanvas = (strokesList: any[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    strokesList.forEach(stroke => {
      if (stroke.points.length === 0) return;
      ctx.beginPath();

      const drawColor = stroke.isEraser ? '#FFFFFF' : stroke.color;
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = stroke.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (stroke.brushType === 'spray') {
        stroke.points.forEach((pt: any) => {
          ctx.fillStyle = drawColor;
          const radius = stroke.size * 2;
          for (let i = 0; i < 6; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * radius;
            const sx = pt.x + Math.cos(angle) * dist;
            const sy = pt.y + Math.sin(angle) * dist;
            ctx.fillRect(sx, sy, 1.5, 1.5);
          }
        });
      } else if (stroke.shapeType && stroke.shapeType !== 'freehand') {
        const start = stroke.points[0];
        const end = stroke.points[stroke.points.length - 1];
        drawShape(ctx, stroke.shapeType, start.x, start.y, end.x, end.y, stroke.color, stroke.size, stroke.isEraser);
      } else {
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        ctx.strokeStyle = stroke.isEraser ? '#FFFFFF' : (stroke.brushType === 'marker' ? `${stroke.color}40` : stroke.color);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      }
    });
  };

  const handleUndo = () => {
    if (strokes.length === 0) return;
    const nextStrokes = [...strokes];
    nextStrokes.pop();
    setStrokes(nextStrokes);
    redrawCanvas(nextStrokes);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getEventPos(e);
    setIsDrawing(true);

    const pressure = (e.nativeEvent && 'pressure' in e.nativeEvent) ? ((e.nativeEvent as any).pressure || 0.5) : 0.5;
    currentStrokeRef.current = [{ x: pos.x, y: pos.y, time: Date.now(), pressure }];

    if (shapeType === 'freehand' && brushType !== 'spray') {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getEventPos(e);
    const pressure = (e.nativeEvent && 'pressure' in e.nativeEvent) ? ((e.nativeEvent as any).pressure || 0.5) : 0.5;
    currentStrokeRef.current.push({ x: pos.x, y: pos.y, time: Date.now(), pressure });

    if (shapeType !== 'freehand') {
      redrawCanvas(strokes);
      const start = currentStrokeRef.current[0];
      drawShape(ctx, shapeType, start.x, start.y, pos.x, pos.y, isEraser ? '#FFFFFF' : brushColor, brushSize, isEraser);
    } else if (brushType === 'spray') {
      ctx.fillStyle = isEraser ? '#FFFFFF' : brushColor;
      const radius = brushSize * 2;
      for (let i = 0; i < 6; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * radius;
        const sx = pos.x + Math.cos(angle) * dist;
        const sy = pos.y + Math.sin(angle) * dist;
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }
    } else {
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = isEraser ? '#FFFFFF' : (brushType === 'marker' ? `${brushColor}40` : brushColor);
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (isDrawing && currentStrokeRef.current.length > 0) {
      const newStroke = {
        points: [...currentStrokeRef.current],
        color: isEraser ? '#FFFFFF' : brushColor,
        size: brushSize,
        isEraser: isEraser,
        brushType: brushType,
        shapeType: shapeType
      };
      const updatedStrokes = [...strokes, newStroke];
      setStrokes(updatedStrokes);
      currentStrokeRef.current = [];
      redrawCanvas(updatedStrokes);
    }
    setIsDrawing(false);
  };

  const getEventPos = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setStrokes([]);
  };

  const handleSubmitEntry = async () => {
    const token = localStorage.getItem('customer_token');
    if (!token || !activeSession) return;

    try {
      let mediaUrl = undefined;
      const isDrawingType = (activeSession?.content_type || activeContest?.contest_type) === 'drawing';

      if (isDrawingType) {
        let blob: Blob | null = null;
        if (excalidrawAPI) {
          try {
            const elements = excalidrawAPI.getSceneElements();
            const files = excalidrawAPI.getFiles();
            blob = await exportToBlob({
              elements,
              mimeType: "image/jpeg",
              appState: {
                exportWithDarkTheme: false,
                viewBackgroundColor: "#ffffff",
              },
              files,
            });
          } catch (err) {
            console.error("Excalidraw export failed, trying canvas fallback:", err);
          }
        }

        if (!blob) {
          const canvas = canvasRef.current;
          if (canvas) {
            blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg'));
          }
        }

        if (!blob) {
          toast.error("Please draw something before submitting");
          return;
        }

        const formData = new FormData();
        formData.append('file', blob, 'drawing.jpg');
        formData.append('folder', 'general');

        const uploadRes = await api.post('/upload/image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        mediaUrl = uploadRes.data.url;
      }

      const drawingData = isDrawingType ? JSON.stringify({
        width: canvasRef.current?.width || 600,
        height: canvasRef.current?.height || 350,
        strokes: strokes
      }) : undefined;

      const res = await contestService.submitEntry(activeSession.id, token, {
        text_content: isDrawingType ? drawingData : poemText,
        media_url: mediaUrl
      });

      toast.success("Entry submitted successfully!");
      setIsSubmitOpen(false);
      setActiveSession(null);
      loadContestDetails();

      if (res && res.id) {
        const shareUrl = `${window.location.origin}${window.location.pathname}?contest_participation_id=${res.id}`;
        window.open(shareUrl, '_blank');
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.detail || "Submission failed");
    }
  };

  const handleLike = async (participationId: string, isDoubleTap = false) => {
    const token = localStorage.getItem('customer_token');
    if (!token) {
      setIsAuthOpen(true);
      return;
    }

    const currentPart = participations.find(p => p.id === participationId) || participations[activeReelIndex];
    if (!currentPart) return;

    const alreadyLiked = currentPart.likes_count > 0;

    // Prevent unliking on repeated screen double-taps
    if (alreadyLiked && isDoubleTap) {
      if (!tapCoords) {
        setTapCoords({ x: 190, y: 250 });
      }
      setShowHeartPop(true);
      if (currentPart.content_type === 'drawing') {
        setShowPaintSplash(true);
        setTimeout(() => {
          setShowPaintSplash(false);
          setShowHeartPop(false);
          setTapCoords(null);
        }, 3050);
      } else if (currentPart.content_type === 'kavithai') {
        setShowLettersBurst(true);
        setTimeout(() => {
          setShowLettersBurst(false);
          setShowHeartPop(false);
          setTapCoords(null);
        }, 3050);
      }
      return;
    }

    // Trigger visual pop overlays instantly (both for double-tap and direct like)
    if (!tapCoords) {
      setTapCoords({ x: 190, y: 250 });
    }
    setShowHeartPop(true);

    if (currentPart.content_type === 'drawing') {
      setShowPaintSplash(true);
      setTimeout(() => {
        setShowPaintSplash(false);
        setShowHeartPop(false);
        setTapCoords(null);
      }, 3050);
    } else if (currentPart.content_type === 'kavithai') {
      setShowLettersBurst(true);
      setTimeout(() => {
        setShowLettersBurst(false);
        setShowHeartPop(false);
        setTapCoords(null);
      }, 3050);
    } else {
      setTimeout(() => {
        setShowHeartPop(false);
        setTapCoords(null);
      }, 1550);
    }

    // Optimistically update likes count locally to prevent re-fetch flickering
    setParticipations(prev => prev.map(p => {
      if (p.id === participationId) {
        return {
          ...p,
          likes_count: alreadyLiked ? p.likes_count - 1 : p.likes_count + 1
        };
      }
      return p;
    }));

    try {
      await contestService.likeParticipation(participationId, token);
      const parts = await contestService.getAllParticipations();
      setParticipations(parts);
    } catch (error) {
      console.error(error);
      loadContestDetails(); // Rollback to actual backend count on error
    }
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed", error);
      toast.error("Download failed");
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedPartId = params.get('contest_participation_id');
    if (sharedPartId && participations.length > 0) {
      const idx = participations.findIndex(p => p.id === sharedPartId);
      if (idx !== -1) {
        setActiveReelIndex(idx);
        setIsReelsOpen(true);
      }
    }
  }, [participations]);

  const handleOpenComments = async (participationId: string) => {
    setIsCommentsOpen(true);
    setLoadingComments(true);
    try {
      const token = localStorage.getItem('customer_token') || undefined;
      const data = await contestService.getComments(participationId, token);
      setComments(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleSendComment = async (participationId: string) => {
    if (!newComment.trim()) return;
    const token = localStorage.getItem('customer_token');
    if (!token) {
      setIsAuthOpen(true);
      return;
    }

    try {
      const comment = await contestService.addComment(participationId, token, newComment);
      setComments(prev => [...prev, comment]);
      setNewComment('');
    } catch (error) {
      console.error(error);
      toast.error("Failed to post comment");
    }
  };

  const handleShare = (participationId: string) => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?contest_participation_id=${participationId}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success("Share link copied to clipboard!");
  };

  if (loading) return null;

  // ---------------------------------------------------------------------------
  // 🎬 REELS PLAY viewport (PREMIUM CLEAN LIGHT THEME)
  if (isReelsOpen && participations.length > 0) {
    const currentPart = participations[activeReelIndex];
    return (
      <ParticlesProvider init={async (engine) => { await loadFull(engine); }}>
        <div className="fixed inset-0 z-50 bg-slate-100 text-slate-800 select-none animate-fade-in font-sans overflow-hidden">

          {/* Paint Splatters Background (for Drawings) */}
          {currentPart.content_type === 'drawing' && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-60">
              <div className="absolute w-24 h-24 rounded-[40%_60%_70%_30%_/_40%_50%_60%_50%] bg-rose-500/20 blur-xs animate-[float-orb-one_20s_infinite_alternate_ease-in-out]" style={{ left: '10%', top: '25%' }} />
              <div className="absolute w-32 h-28 rounded-[60%_40%_30%_70%_/_50%_60%_40%_60%] bg-sky-400/20 blur-xs animate-[float-orb-two_25s_infinite_alternate_ease-in-out]" style={{ left: '70%', top: '15%' }} />
              <div className="absolute w-20 h-20 rounded-[50%_50%_30%_70%_/_60%_40%_60%_40%] bg-yellow-400/25 blur-xs animate-[float-orb-three_18s_infinite_alternate_ease-in-out]" style={{ left: '20%', top: '70%' }} />
              <div className="absolute w-28 h-28 rounded-[30%_70%_50%_50%_/_50%_30%_70%_50%] bg-purple-500/20 blur-xs animate-[float-orb-one_22s_infinite_alternate_ease-in-out]" style={{ left: '75%', top: '65%' }} />
              <div className="absolute w-16 h-16 rounded-[45%_55%_35%_65%_/_55%_45%_55%_45%] bg-green-400/20 blur-xs animate-[float-orb-two_15s_infinite_alternate_ease-in-out]" style={{ left: '45%', top: '80%' }} />
            </div>
          )}

          {/* Multilingual Letters Background (for Kavithai) */}
          {currentPart.content_type === 'kavithai' && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-25 select-none">
              {/* Tamil */}
              <div className="absolute text-5xl font-serif text-slate-700/20 animate-[float-orb-one_18s_infinite_alternate_ease-in-out]" style={{ left: '8%', top: '15%' }}>அ</div>
              <div className="absolute text-5xl font-serif text-slate-700/20 animate-[float-orb-two_16s_infinite_alternate_ease-in-out]" style={{ left: '5%', top: '45%' }}>தமிழ்</div>

              {/* English */}
              <div className="absolute text-6xl font-serif text-slate-700/20 animate-[float-orb-two_22s_infinite_alternate_ease-in-out]" style={{ left: '85%', top: '20%' }}>A</div>

              {/* Hindi */}
              <div className="absolute text-5xl font-serif text-slate-700/20 animate-[float-orb-three_20s_infinite_alternate_ease-in-out]" style={{ left: '15%', top: '75%' }}>अ</div>
              <div className="absolute text-7xl font-serif text-slate-700/20 animate-[float-orb-one_24s_infinite_alternate_ease-in-out]" style={{ left: '78%', top: '70%' }}>क</div>

              {/* Malayalam */}
              <div className="absolute text-5xl font-serif text-slate-700/20 animate-[float-orb-two_26s_infinite_alternate_ease-in-out]" style={{ left: '88%', top: '48%' }}>മ</div>
              <div className="absolute text-6xl font-serif text-slate-700/20 animate-[float-orb-one_19s_infinite_alternate_ease-in-out]" style={{ left: '42%', top: '82%' }}>ക</div>

              {/* Gujarati */}
              <div className="absolute text-5xl font-serif text-slate-700/20 animate-[float-orb-two_21s_infinite_alternate_ease-in-out]" style={{ left: '50%', top: '8%' }}>જ</div>
              <div className="absolute text-6xl font-serif text-slate-700/20 animate-[float-orb-three_23s_infinite_alternate_ease-in-out]" style={{ left: '25%', top: '35%' }}>ક</div>

              {/* Spanish */}
              <div className="absolute text-6xl font-serif text-slate-700/20 animate-[float-orb-one_20s_infinite_alternate_ease-in-out]" style={{ left: '72%', top: '10%' }}>Ñ</div>
              <div className="absolute text-4xl font-serif text-slate-700/15 animate-[float-orb-two_18s_infinite_alternate_ease-in-out]" style={{ left: '60%', top: '85%' }}>poesía</div>

              {/* German */}
              <div className="absolute text-5xl font-serif text-slate-700/20 animate-[float-orb-three_25s_infinite_alternate_ease-in-out]" style={{ left: '30%', top: '65%' }}>ß</div>
              <div className="absolute text-5xl font-serif text-slate-700/20 animate-[float-orb-one_22s_infinite_alternate_ease-in-out]" style={{ left: '12%', top: '90%' }}>Ö</div>

              {/* Chinese */}
              <div className="absolute text-6xl font-serif text-slate-700/20 animate-[float-orb-two_27s_infinite_alternate_ease-in-out]" style={{ left: '80%', top: '35%' }}>诗</div>
              <div className="absolute text-5xl font-serif text-slate-700/20 animate-[float-orb-three_19s_infinite_alternate_ease-in-out]" style={{ left: '48%', top: '55%' }}>书</div>
            </div>
          )}

          {/* ❤️ INSTANT DOUBLE-TAP HEART POP OVERLAY */}
          <AnimatePresence>
            {showHeartPop && (
              <motion.div
                initial={{ scale: 0, opacity: 0, y: 150 }}
                animate={{
                  scale: [0, 1.4, 1, 0.4],
                  y: [150, 0, -250, -500],
                  opacity: [0, 1, 0.8, 0],
                  filter: ['drop-shadow(0 0 0px rgba(244,63,94,0))', 'drop-shadow(0 0 25px rgba(244,63,94,0.75))', 'drop-shadow(0 0 25px rgba(244,63,94,0.75))', 'drop-shadow(0 0 0px rgba(244,63,94,0))']
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 2.0,
                  times: [0, 0.15, 0.6, 1],
                  ease: "easeOut"
                }}
                className="absolute inset-x-0 bottom-32 flex items-center justify-center z-50 pointer-events-none"
              >
                <Heart size={80} className="text-rose-500 fill-rose-500" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* 🎨 Matter.js Color Water Balloon Impact Overlay */}
          <AnimatePresence>
            {showPaintSplash && (
              <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden flex items-center justify-center">
                <div className="relative w-full max-w-sm h-[58vh] overflow-hidden">
                  {/* Render flying water balloons */}
                  {physicsBalloons.map(b => (
                    <motion.div
                      key={`balloon-${b.id}`}
                      initial={{ scale: 0.8 }}
                      animate={{ scale: [0.8, 1.1, 0.9, 1] }}
                      transition={{ repeat: Infinity, duration: 0.4 }}
                      className="absolute z-40"
                      style={{
                        left: b.x,
                        top: b.y,
                        width: b.size,
                        height: b.size * 1.3,
                        backgroundColor: b.color,
                        borderRadius: '50% 50% 50% 50% / 40% 40% 60% 60%',
                        transform: 'translate(-50%, -50%)',
                        boxShadow: `inset -3px -5px 6px rgba(0,0,0,0.2), 0 3px 6px rgba(0,0,0,0.15)`
                      }}
                    />
                  ))}

                  {/* Render spraying droplets */}
                  {physicsDroplets.map(d => (
                    <div
                      key={`droplet-${d.id}`}
                      className="absolute z-30"
                      style={{
                        left: d.x,
                        top: d.y,
                        width: d.size,
                        height: d.size,
                        backgroundColor: d.color,
                        borderRadius: '50%',
                        opacity: d.opacity,
                        transform: 'translate(-50%, -50%)',
                        boxShadow: `0 2px 4px ${d.color}40`
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </AnimatePresence>

          {/* ✍️ Double-tap Letters Burst Overlay */}
          <AnimatePresence>
            {showLettersBurst && (
              <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center">
                {letters.map((l) => (
                  <motion.div
                    key={l.id}
                    initial={{ x: 0, y: 0, scale: 0.3, opacity: 0, rotate: 0 }}
                    animate={{
                      x: l.tx,
                      y: l.ty,
                      scale: 1,
                      opacity: [0, 0.95, 0.95, 0],
                      rotate: l.rotate
                    }}
                    transition={{
                      type: "spring",
                      damping: 20,
                      stiffness: 22,
                      delay: l.delay,
                      duration: 3.0
                    }}
                    className="absolute font-serif font-black select-none text-center"
                    style={{
                      fontSize: `${l.size}px`,
                      background: l.color,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      textShadow: '0 2px 10px rgba(255,255,255,0.7)'
                    }}
                  >
                    {l.glyph}
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>


          {/* Navigation Action Header */}
          <div className="flex items-center justify-between px-4 py-4 bg-gradient-to-b from-white/95 to-transparent absolute top-0 left-0 right-0 z-50">
            <button
              onClick={onBack || (() => setIsReelsOpen(false))}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full border border-slate-200 shadow-sm active:scale-95 transition-all"
            >
              ← Back
            </button>

            {/* Top info (Clickable to view full details in popup card) */}
            <button
              onClick={() => setIsDetailPopupOpen(true)}
              className="flex flex-col items-center text-center max-w-[120px] focus:outline-none cursor-pointer active:scale-95 transition-transform"
            >
              <span className="text-xs font-black text-slate-800 truncate w-full block">@{currentPart.customer_name || 'Anonymous'}</span>
              <div className="flex items-center gap-1.5 mt-0.5 w-full justify-center">
                <span className="text-[9px] font-bold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-full truncate max-w-[70px] block">{currentPart.shop_name}</span>
                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${currentPart.contest_status === 'active' ? 'bg-emerald-100 text-emerald-700 animate-pulse' : 'bg-rose-100 text-rose-600'
                  }`}>
                  {currentPart.contest_status === 'active' ? '● Live' : 'Expired'}
                </span>
              </div>
            </button>

            <button
              onClick={() => setIsDetailPopupOpen(true)}
              className="flex items-center gap-1.5 text-white px-4 py-2 rounded-full font-black text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all hover:brightness-110"
              style={{ backgroundColor: primaryColor }}
            >
              <Trophy size={13} className="fill-white" />
              <span>Rules</span>
            </button>
          </div>

          {/* Scrollable Reels Snap Container */}
          <div
            onScroll={(e) => {
              const container = e.currentTarget;
              const index = Math.round(container.scrollTop / container.clientHeight);
              if (index !== activeReelIndex && index >= 0 && index < participations.length) {
                setActiveReelIndex(index);
              }
            }}
            className={cn(
              "w-full h-full snap-y snap-mandatory scrollbar-hide no-scrollbar flex flex-col transition-all duration-300",
              isCommentsOpen ? "overflow-y-hidden touch-none" : "overflow-y-scroll"
            )}
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {participations.map((part, index) => {
              return (
                <div
                  key={part.id}
                  className={cn(
                    "w-full h-full snap-start shrink-0 flex flex-col items-center justify-center p-4 relative transition-all duration-300",
                    isCommentsOpen ? "pt-[80px] pb-[54vh] justify-start" : "pt-24 pb-32"
                  )}
                >

                  {/* 🏆 Golden winner banner overlay on the reel */}
                  {part.is_winner && (
                    <div className={cn(
                      "w-full max-w-sm z-45 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-white shadow-lg flex items-center justify-between border border-yellow-300/40 animate-pulse overflow-hidden transition-all duration-300 mb-3",
                      isCommentsOpen ? "py-1.5 px-3 rounded-xl scale-90" : "py-3 px-4 rounded-2xl"
                    )}>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_2s_infinite] pointer-events-none" />
                      <div className="flex items-center gap-2">
                        <Trophy size={isCommentsOpen ? 14 : 18} className="fill-white animate-bounce" />
                        <div>
                          {!isCommentsOpen && <span className="text-[10px] font-black uppercase tracking-widest block leading-none">Winner Entry</span>}
                          <span className="text-[11px] font-black text-white/95 truncate block max-w-[150px]">{part.contest_title}</span>
                        </div>
                      </div>
                      <span className="text-[9px] bg-white/20 px-2.5 py-1 rounded-full uppercase tracking-wider font-black">🏆 Winner</span>
                    </div>
                  )}

                  {/* DYNAMIC VIEWPORT RENDERING MATCH LOOP TYPE */}
                  {part.content_type === 'drawing' ? (
                    /* 🎨 WOODEN EASEL PAINTING STAND LEG STRUCTURE FOR DRAWING */
                    <div className={cn(
                      "relative w-full max-w-sm flex flex-col justify-center items-center transition-all duration-300",
                      isCommentsOpen ? "h-[32vh]" : "h-[58vh]"
                    )}>
                      {/* Easel Back vertical spine */}
                      <div
                        className="absolute top-0 w-2.5 bg-amber-800 rounded shadow-inner transition-all duration-300"
                        style={{
                          transform: 'translateZ(-10px)',
                          bottom: isCommentsOpen ? '-15px' : '-40px'
                        }}
                      />

                      {/* Left Leg */}
                      <div
                        className="absolute top-4 w-2 bg-amber-800 rounded shadow-md origin-top transition-all duration-300"
                        style={{
                          transform: 'rotate(12deg) translateZ(-5px)',
                          bottom: isCommentsOpen ? '-15px' : '-40px'
                        }}
                      />

                      {/* Right Leg */}
                      <div
                        className="absolute top-4 w-2 bg-amber-800 rounded shadow-md origin-top transition-all duration-300"
                        style={{
                          transform: 'rotate(-12deg) translateZ(-5px)',
                          bottom: isCommentsOpen ? '-15px' : '-40px'
                        }}
                      />

                      {/* Main Canvas Drawing (The Board) */}
                      <div
                        onClick={handleMediaTap}
                        className="w-[90%] h-[82%] bg-white rounded-lg border-8 border-amber-900 shadow-2xl p-2 z-20 flex items-center justify-center relative cursor-pointer active:scale-[0.98] transition-transform overflow-hidden"
                      >
                        {particlesInit && (
                          <Particles id={`tsparticles-drawing-${index}`} options={particlesOptions} className="absolute inset-0 z-0 pointer-events-none" />
                        )}
                        <BrushReplayCanvas
                          textContent={part.text_content || undefined}
                          mediaUrl={part.media_url || undefined}
                        />
                      </div>

                      {/* Canvas horizontal support shelf */}
                      <div className="w-[98%] h-3.5 bg-amber-900 rounded shadow-md z-30 -mt-1.5 border-b border-amber-950" />

                      {/* Small peg holding the top */}
                      <div className="absolute top-[6%] w-4 h-4 bg-amber-950 rounded z-30" />
                    </div>
                  ) : (
                    /* 📖 PREMIUM REALISTIC SPIRAL NOTEBOOK VIEWPORT FOR POETRY (KAVITHAI) */
                    <motion.div
                      onMouseMove={handleMouseMove3D}
                      onMouseLeave={handleMouseLeave3D}
                      onClick={handleMediaTap}
                      animate={isWritingFinished ? {
                        y: [0, -4, 0],
                        rotateZ: [1.5, 2.2, 1.5]
                      } : {}}
                      transition={isWritingFinished ? {
                        repeat: Infinity,
                        duration: 5,
                        ease: "easeInOut"
                      } : {}}
                      className={cn(
                        "w-full max-w-sm flex flex-col rounded-2xl overflow-hidden border border-slate-300 relative transition-all duration-300 ease-out shadow-2xl hover:scale-[1.01] cursor-pointer select-none",
                        isCommentsOpen ? "h-[32vh] py-3 px-6" : "h-[58vh] py-10 px-8"
                      )}
                      style={{
                        transform: `rotateX(${rotateX * 1.4}deg) rotateY(${rotateY * 1.4}deg) rotateZ(1.5deg)`,
                        transformStyle: 'preserve-3d',
                        background: 'linear-gradient(145deg, #fdfbf7 0%, #f5f2eb 100%)',
                        boxShadow: '5px 15px 35px rgba(0,0,0,0.12), inset 0 0 15px rgba(0,0,0,0.05)'
                      }}
                    >
                      {particlesInit && (
                        <Particles id={`tsparticles-poetry-${index}`} options={particlesOptions} className="absolute inset-0 z-0 pointer-events-none opacity-40" />
                      )}

                      {/* Metal Spiral Rings on Left Margin */}
                      <div className="absolute left-0 top-4 bottom-4 w-6 flex flex-col justify-between z-30 pointer-events-none">
                        {Array.from({ length: isCommentsOpen ? 7 : 14 }).map((_, i) => (
                          <div key={i} className="w-6 h-3 flex items-center relative">
                            <div className="absolute left-1.5 w-1.5 h-1.5 rounded-full bg-slate-800/80 shadow-inner" />
                            <div className="absolute left-0 w-4 h-2.5 rounded-full border-[1.8px] border-slate-400/90 bg-gradient-to-r from-slate-300 via-slate-100 to-slate-400 shadow-sm" style={{ transform: 'rotate(-10deg) translateX(-2px)' }} />
                          </div>
                        ))}
                      </div>

                      {/* Ruled lines inside notebook */}
                      <div className="absolute left-6 right-0 top-0 bottom-0 pointer-events-none z-0 flex flex-col">
                        <div className="absolute left-9 top-0 bottom-0 w-[1px] bg-red-400 opacity-60" />
                        <div className={cn("flex-1 flex flex-col", isCommentsOpen ? "mt-[40px]" : "mt-[82px]")}>
                          {Array.from({ length: isCommentsOpen ? 7 : 12 }).map((_, i) => (
                            <div key={i} className="border-b border-sky-100/70" style={{ height: isCommentsOpen ? '20px' : '28px' }} />
                          ))}
                        </div>
                      </div>

                      {/* Paper dog-eared fold corner */}
                      <div className="absolute right-0 bottom-0 w-8 h-8 pointer-events-none z-20 overflow-hidden">
                        <div className="absolute bottom-0 right-0 w-0 h-0 border-t-[16px] border-t-amber-100/50 border-r-[16px] border-r-transparent border-l-[16px] border-l-slate-300/40 border-b-[16px] border-b-slate-300/40 shadow-sm" />
                      </div>

                      {/* Laser shine shimmering overlay */}
                      {isWritingFinished && (
                        <motion.div
                          animate={{ x: ['-100%', '200%'] }}
                          transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none z-20"
                        />
                      )}

                      {/* Handwritten Poem Content */}
                      <div
                        className="relative z-10 pl-11 pr-2 select-none w-full text-left tracking-wide font-bold transition-all duration-300"
                        style={{
                          fontFamily: "'Caveat', cursive, sans-serif",
                          fontSize: isCommentsOpen ? '16px' : '22px',
                          color: '#1e293b',
                          textShadow: '0 0.5px 1px rgba(0,0,0,0.1)',
                          lineHeight: isCommentsOpen ? '20px' : '28px'
                        }}
                      >
                        {part.text_content ? part.text_content.substring(0, poetryCharIndex) : ''}
                      </div>

                      {/* Ink / Fountain Pen Follower */}
                      <motion.div
                        animate={{
                          x: penCoords.x,
                          y: penCoords.y - 48,
                          rotate: penCoords.rotate
                        }}
                        transition={{ type: "spring", stiffness: 120, damping: 14 }}
                        className="absolute z-40 pointer-events-none origin-bottom-left"
                        style={{ left: 0, top: 0 }}
                      >
                        <svg width="45" height="120" viewBox="0 0 45 120" fill="none">
                          <rect x="18" y="0" width="8" height="85" rx="3" fill="#0f172a" />
                          <rect x="18" y="20" width="8" height="5" fill="#f59e0b" />
                          <polygon points="17,85 27,85 26,105 18,105" fill="#94a3b8" />
                          <polygon points="18,105 26,105 24,118 20,118" fill="#e2e8f0" />
                          <polygon points="20,105 24,105 23,114 21,114" fill="#fbbf24" />
                          <line x1="22" y1="105" x2="22" y2="118" stroke="#0f172a" strokeWidth="1" />
                          <circle cx="22" cy="120" r="1.5" fill="#2563eb" opacity="0.8" />
                        </svg>
                      </motion.div>
                    </motion.div>
                  )}

                  {/* Paint Splash and Letters animations now run globally centered */}
                </div>
              );
            })}
          </div>

          {/* 📋 Interactive Swipeable Details Sheet Modal Component Layer */}
          {isDetailPopupOpen && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center animate-fade-in" onClick={() => setIsDetailPopupOpen(false)}>
              <div className="bg-white w-full max-w-md rounded-t-[32px] p-6 text-slate-800 space-y-5 animate-slide-up shadow-2xl touch-pan-y" onClick={(e) => e.stopPropagation()}>

                <button onClick={() => setIsDetailPopupOpen(false)} className="w-full pb-2 pt-0 flex justify-center group focus:outline-none cursor-pointer">
                  <div className="w-12 h-1.5 bg-slate-200 rounded-full group-hover:bg-slate-300 transition-colors" />
                </button>

                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest block mb-0.5" style={{ color: primaryColor }}>Active Event Hub Rules</span>
                  <h3 className="text-xl font-black tracking-tight text-slate-900">{currentPart.contest_title || "Contest Details"}</h3>

                  {/* Full User and Shop details */}
                  <div className="mt-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-left space-y-1.5">
                    <p className="text-xs text-slate-500 font-bold flex items-center justify-between">
                      <span>👤 Creator:</span>
                      <span className="text-slate-800 font-black text-right break-all">@{currentPart.customer_name || 'Anonymous'}</span>
                    </p>
                    <p className="text-xs text-slate-500 font-bold flex items-center justify-between">
                      <span>🏪 Shop Name:</span>
                      <span className="text-slate-800 font-black text-right break-all">{currentPart.shop_name}</span>
                    </p>
                  </div>

                  <p className="text-xs text-slate-500 mt-3 leading-relaxed">Participate in our creative challenges and stand a chance to win exciting rewards!</p>
                </div>

                <div className="space-y-2 border-t border-slate-100 pt-4">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">How This Challenge Works:</span>
                  <div className="space-y-2.5 text-xs">
                    <div className="flex gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 items-center">
                      <span className="w-5 h-5 font-black rounded-full flex items-center justify-center shrink-0 text-[10px]" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}>1</span>
                      <p className="text-slate-600 leading-snug">Launch your timed creative session. This contest uses a <b style={{ color: primaryColor }}>{currentPart.content_type}</b> submission format.</p>
                    </div>
                    <div className="flex gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 items-center">
                      <span className="w-5 h-5 font-black rounded-full flex items-center justify-center shrink-0 text-[10px]" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}>2</span>
                      <p className="text-slate-600 leading-snug">Complete and submit your entry within the 10-minute session countdown.</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-1.5">
                  <Badge variant="outline" className="border-slate-200 text-slate-600 px-3 py-1 text-[10px] font-bold bg-slate-50">
                    Available Credits: {credits}
                  </Badge>
                </div>

                <button
                  onClick={() => setIsDetailPopupOpen(false)}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-colors mt-2 border border-slate-200/60"
                >
                  Return to Reels Feed
                </button>
              </div>
            </div>
          )}

          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200/60 z-40 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] px-4 py-2.5 flex items-center justify-between gap-3 max-w-md sm:max-w-xl mx-auto rounded-t-2xl">

            {/* Left side compact actions row (shrink-0) */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => handleLike(currentPart.id)}
                className="flex flex-col items-center group cursor-pointer"
                title={`${currentPart.likes_count.toLocaleString()} likes`}
              >
                <div className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-full transition-all group-active:scale-125 flex items-center justify-center shadow-sm">
                  <Heart size={16} fill={currentPart.likes_count > 0 ? "currentColor" : "none"} />
                </div>
                <span className="text-[8px] font-black text-slate-700 mt-0.5">
                  {formatNumberCompact(currentPart.likes_count)}
                </span>
              </button>

              <button
                onClick={() => handleOpenComments(currentPart.id)}
                className="flex flex-col items-center group cursor-pointer"
                title={comments && comments[0]?.participation_id === currentPart.id ? `${comments.length.toLocaleString()} comments` : 'Chat'}
              >
                <div className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-full transition-colors flex items-center justify-center shadow-sm">
                  <MessageSquare size={16} />
                </div>
                <span className="text-[8px] font-black text-slate-700 mt-0.5">
                  {comments && comments[0]?.participation_id === currentPart.id
                    ? formatNumberCompact(comments.length)
                    : '0'}
                </span>
              </button>

              <button onClick={() => handleShare(currentPart.id)} className="flex flex-col items-center group">
                <div className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-full transition-colors flex items-center justify-center shadow-sm">
                  <Share2 size={16} />
                </div>
                <span className="text-[8px] font-bold text-slate-400 mt-0.5">Share</span>
              </button>

              <button
                onClick={() => {
                  if (currentPart.content_type === 'drawing' && currentPart.media_url) {
                    handleDownload(currentPart.media_url, `drawing_${currentPart.id}.jpg`);
                  } else if (currentPart.text_content) {
                    const blob = new Blob([currentPart.text_content], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    handleDownload(url, `poem_${currentPart.id}.txt`);
                  }
                }}
                className="flex flex-col items-center group"
              >
                <div className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-full transition-colors flex items-center justify-center shadow-sm">
                  <Download size={16} />
                </div>
                <span className="text-[8px] font-bold text-slate-400 mt-0.5">Save</span>
              </button>
            </div>

            {(() => {
              const sparks = Array.from({ length: 12 }).map((_, i) => {
                const angle = (i * 30 + Math.random() * 15) * (Math.PI / 180);
                const dist = 30 + Math.random() * 45;
                const tx = Math.cos(angle) * dist;
                const ty = Math.sin(angle) * dist;
                const delay = Math.random() * 1.8;
                const duration = 0.6 + Math.random() * 0.7;
                const colors = ['bg-yellow-300', 'bg-red-400', 'bg-emerald-300', 'bg-cyan-300', 'bg-pink-300', 'bg-amber-300'];
                const color = colors[i % colors.length];
                const size = 3 + (i % 3);

                return (
                  <div
                    key={`spark-${i}`}
                    className={`absolute rounded-full ${color} pointer-events-none z-0`}
                    style={{
                      left: '50%',
                      top: '50%',
                      width: `${size}px`,
                      height: `${size}px`,
                      animation: `cracker-spark ${duration}s ease-out infinite`,
                      animationDelay: `${delay}s`,
                      '--tx': `${tx}px`,
                      '--ty': `${ty}px`,
                      '--scale': `${0.4 + Math.random() * 0.8}`,
                    } as React.CSSProperties}
                  />
                );
              });

              return (
                <button
                  onClick={() => handleMakeEntryClick(currentPart)}
                  className="text-white font-black px-3 h-13 rounded-xl shadow-md flex items-center justify-center gap-1.5 text-[10px] sm:text-xs uppercase tracking-wider active:scale-95 transition-all hover:brightness-110 flex-1 overflow-hidden relative"
                  style={{
                    backgroundColor: primaryColor,
                    boxShadow: `0 4px 12px 0 ${primaryColor}30`
                  }}
                >
                  {sparks}
                  <Sparkles size={11} className="fill-white animate-pulse shrink-0 z-10" />
                  <span key={ctaTextIndex} className="cta-text-anim block truncate w-full z-10">
                    {(() => {
                      const labels = [
                        `Enter (${currentPart.shop_name}) ✨`,
                        "Still Waiting? Join Now 🙄",
                        "Register & Win Big! 🏆",
                        "Claim Your Reward 🎁"
                      ];
                      return labels[ctaTextIndex];
                    })()}
                  </span>
                </button>
              );
            })()}
          </div>

          {/* Comments drawer layout views setup below */}
          {isCommentsOpen && (
            <div
              className={cn(
                "fixed inset-x-0 bottom-0 bg-white dark:bg-[#0f1623] border-t border-slate-200 dark:border-slate-800 rounded-t-3xl z-50 flex flex-col animate-slide-up text-slate-800 dark:text-slate-100 shadow-2xl transition-all duration-300 ease-out select-text",
                commentHeightMode === 'full' ? "h-[88vh]" : "h-[54vh]"
              )}
            >
              {/* Swipe/Drag Handle at the top */}
              <div
                className="w-full py-3 flex justify-center cursor-row-resize shrink-0 select-none"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onClick={() => setCommentHeightMode(prev => prev === 'normal' ? 'full' : 'normal')}
              >
                <div
                  className="w-12 h-1.5 rounded-full opacity-80 hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: primaryColor }}
                />
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-900/30">
                {loadingComments ? (
                  <div className="text-center py-8 text-slate-400 text-xs font-medium animate-pulse tracking-wider">Loading...</div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs italic opacity-80">No comments yet.</div>
                ) : (
                  <div className="space-y-4">
                    {threadedComments.map(c => {
                      const isLiked = !!c.is_liked;
                      const name = c.customer_name || 'Anonymous';
                      const hasReplies = c.replies.length > 0;
                      const isExpanded = expandedComments.has(c.id);

                      return (
                        <div key={c.id} className="space-y-2">
                          <div className="flex gap-3 items-start group">
                            {/* Circle Avatar */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 select-none ${getAvatarColor(name)}`}>
                              {name[0].toUpperCase()}
                            </div>

                            {/* Comment Content Block */}
                            <div className="flex-1 min-w-0 bg-white dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/60 shadow-sm relative pr-10">
                              <div className="flex justify-between items-center text-[10px] text-slate-455 dark:text-slate-500">
                                <span className="font-black text-slate-700 dark:text-slate-300">@{name}</span>
                                <span>{new Date(c.created_at).toLocaleDateString()}</span>
                              </div>

                              <p className="text-xs text-slate-750 dark:text-slate-200 leading-relaxed font-medium mt-1 pr-1 break-words font-sans">
                                {renderCommentText(c.text)}
                              </p>

                              {/* Instagram style bottom actions row */}
                              <div className="flex items-center gap-4 mt-2 text-[10px] text-slate-400 font-bold select-none">
                                <button
                                  onClick={() => {
                                    setNewComment(`@${name} `);
                                    if (commentInputRef.current) {
                                      commentInputRef.current.focus();
                                    }
                                  }}
                                  className="hover:text-primary dark:hover:text-orange-400 transition-colors"
                                >
                                  Reply
                                </button>
                                {(c.likes_count || 0) > 0 && (
                                  <span className="text-rose-500 dark:text-rose-455">
                                    {c.likes_count} {(c.likes_count || 0) === 1 ? 'like' : 'likes'}
                                  </span>
                                )}
                              </div>

                              {/* Heart like button on the right */}
                              <button
                                onClick={() => handleToggleLikeComment(c.id)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-355 hover:text-rose-500 dark:text-slate-600 dark:hover:text-rose-500 p-1.5 transition-colors"
                              >
                                <Heart
                                  size={14}
                                  fill={isLiked ? "currentColor" : "none"}
                                  className={isLiked ? "text-rose-500" : ""}
                                />
                              </button>
                            </div>
                          </div>

                          {/* ── Threaded replies count indicator */}
                          {hasReplies && (
                            <div className="pl-11 mt-1 select-none">
                              <button
                                onClick={() => handleToggleReplies(c.id)}
                                className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 font-black tracking-wide flex items-center gap-2 transition-colors"
                              >
                                <span className="w-6 h-[1.5px] bg-slate-300 dark:bg-slate-700" />
                                {isExpanded
                                  ? "Hide replies"
                                  : `View ${c.replies.length} ${c.replies.length === 1 ? 'reply' : 'replies'}`}
                              </button>
                            </div>
                          )}

                          {/* Nested indented replies */}
                          {isExpanded && hasReplies && (
                            <div className="pl-11 border-l-2 border-slate-100 dark:border-slate-800/80 ml-4 mt-2 space-y-3">
                              {c.replies.map(reply => {
                                const isReplyLiked = !!reply.is_liked;
                                const replyName = reply.customer_name || 'Anonymous';
                                return (
                                  <div key={reply.id} className="flex gap-2.5 items-start group">
                                    {/* Circle Avatar (smaller) */}
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 select-none ${getAvatarColor(replyName)}`}>
                                      {replyName[0].toUpperCase()}
                                    </div>

                                    {/* Reply Content Card */}
                                    <div className="flex-1 min-w-0 bg-white/60 dark:bg-slate-800/25 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/40 shadow-2xs relative pr-8">
                                      <div className="flex justify-between items-center text-[9px] text-slate-450 dark:text-slate-500">
                                        <span className="font-black text-slate-650 dark:text-slate-350">@{replyName}</span>
                                        <span>{new Date(reply.created_at).toLocaleDateString()}</span>
                                      </div>

                                      <p className="text-[11px] text-slate-750 dark:text-slate-200 leading-relaxed font-medium mt-0.5 pr-1 break-words font-sans">
                                        {renderCommentText(reply.text)}
                                      </p>

                                      {/* Actions */}
                                      <div className="flex items-center gap-4 mt-1 text-[9px] text-slate-400 font-bold select-none">
                                        <button
                                          onClick={() => {
                                            setNewComment(`@${replyName} `);
                                            if (commentInputRef.current) {
                                              commentInputRef.current.focus();
                                            }
                                          }}
                                          className="hover:text-primary dark:hover:text-orange-400 transition-colors"
                                        >
                                          Reply
                                        </button>
                                        {(reply.likes_count || 0) > 0 && (
                                          <span className="text-rose-500 dark:text-rose-455">
                                            {reply.likes_count} {(reply.likes_count || 0) === 1 ? 'like' : 'likes'}
                                          </span>
                                        )}
                                      </div>

                                      {/* Heart like on right */}
                                      <button
                                        onClick={() => handleToggleLikeComment(reply.id)}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-rose-500 dark:text-slate-750 dark:hover:text-rose-500 p-1 transition-colors"
                                      >
                                        <Heart
                                          size={11}
                                          fill={isReplyLiked ? "currentColor" : "none"}
                                          className={isReplyLiked ? "text-rose-500" : ""}
                                        />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-100 dark:border-slate-800/60 bg-white dark:bg-[#0f1623] flex gap-2">
                <input
                  ref={commentInputRef}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Type a comment..."
                  className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl px-4 placeholder:text-slate-400 text-xs h-11 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-sans"
                />
                <Button
                  onClick={() => handleSendComment(currentPart.id)}
                  className="text-white px-5 rounded-xl flex items-center justify-center shadow-md shrink-0 h-11 font-bold hover:brightness-110"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Send size={14} />
                </Button>
              </div>
            </div>
          )}

          {renderModals()}

          <style>{`
            .cta-text-anim {
              display: block;
              width: 100%;
              animation: btn-swap 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
            @keyframes btn-swap {
              0% { transform: translateY(15px); opacity: 0; }
              100% { transform: translateY(0); opacity: 1; }
            }
            @keyframes cracker-spark {
              0% {
                transform: translate(-50%, -50%) translate(0, 0) scale(0);
                opacity: 0;
              }
              12% {
                opacity: 1;
              }
              88% {
                opacity: 1;
              }
              100% {
                transform: translate(-50%, -50%) translate(var(--tx), var(--ty)) scale(var(--scale, 1));
                opacity: 0;
              }
            }
          `}</style>
        </div>
      </ParticlesProvider>
    );
  }

  // Be the first to participate celebration empty state (when shop's active contest has 0 entries)
  if (activeContest && currentShopParticipations.length === 0) {
    const colors = [
      'from-rose-400 to-pink-500',
      'from-sky-400 to-blue-500',
      'from-amber-400 to-yellow-500',
      'from-emerald-400 to-green-500',
      'from-purple-400 to-violet-500',
      'from-orange-400 to-red-500',
      'from-teal-400 to-cyan-500'
    ];

    const bubbleTexts = [
      { text: "வணக்கம்", lang: "ta" },
      { text: "Hello", lang: "en" },
      { text: "नमस्ते", lang: "hi" },
      { text: "Welcome", lang: "en" },
      { text: "நல்வரவு", lang: "ta" },
      { text: "స్వాగതം", lang: "te" },
      { text: "സ്വാഗതം", lang: "ml" },
      { text: "ಸ್ವಾಗത", lang: "kn" },
      { text: "স্বাগতম", lang: "bn" },
      { text: "வாங்க", lang: "ta" },
      { text: "Namaste", lang: "en" },
      { text: "Hola", lang: "es" },
      { text: "Bonjour", lang: "fr" },
      { text: "Ciao", lang: "it" }
    ];

    // Seeded/deterministic-like values for stable rendering between renders
    const paperRollsList = Array.from({ length: 24 }).map((_, i) => {
      const left = (i * 17) % 95 + 2; // Spread across screen width
      const delay = (i * 0.7) % 7;
      const duration = 5 + ((i * 1.3) % 4);
      const width = 14 + (i % 3) * 6; // 14px to 26px
      const height = 28 + (i % 4) * 8; // 28px to 60px
      const color = colors[i % colors.length];
      const isCurled = i % 2 === 0;

      return (
        <div
          key={`roll-${i}`}
          className={`absolute bg-gradient-to-br ${color} opacity-90 shadow-md pointer-events-none`}
          style={{
            left: `${left}%`,
            width: `${width}px`,
            height: `${height}px`,
            animation: `paper-roll-fall ${duration}s linear infinite`,
            animationDelay: `${delay}s`,
            top: '-60px',
            borderRadius: isCurled ? '50% 10% 50% 10% / 10% 50% 10% 50%' : '8px',
            transformOrigin: 'center',
          }}
        />
      );
    });

    const textBubblesList = Array.from({ length: 18 }).map((_, i) => {
      const item = bubbleTexts[i % bubbleTexts.length];
      const left = (i * 23) % 85 + 5;
      const delay = (i * 0.9) % 11;
      const duration = 9 + ((i * 1.7) % 6);
      const fontSize = 13 + (i % 3) * 4; // 13px to 21px
      const drift = -50 + (i % 5) * 25; // -50px to 50px

      const textColors = [
        'text-rose-500/40 bg-rose-50/20 border-rose-200/20',
        'text-blue-500/40 bg-blue-50/20 border-blue-200/20',
        'text-amber-600/40 bg-amber-50/20 border-amber-200/20',
        'text-emerald-500/40 bg-emerald-50/20 border-emerald-200/20',
        'text-purple-500/40 bg-purple-50/20 border-purple-200/20',
        'text-cyan-500/40 bg-cyan-50/20 border-cyan-200/20'
      ];
      const colorClass = textColors[i % textColors.length];

      return (
        <div
          key={`bubble-${i}`}
          className={`absolute px-3 py-1 border backdrop-blur-xs font-black tracking-wide shadow-xs flex items-center justify-center pointer-events-none rounded-2xl ${colorClass}`}
          style={{
            left: `${left}%`,
            fontSize: `${fontSize}px`,
            animation: `text-bubble-up ${duration}s ease-in-out infinite`,
            animationDelay: `${delay}s`,
            bottom: '-80px',
            '--drift': `${drift}px`,
          } as React.CSSProperties}
        >
          {item.text}
        </div>
      );
    });

    return (
      <div className="fixed inset-0 bg-gradient-to-tr from-slate-50 via-amber-50/40 to-orange-50/30 z-50 overflow-hidden flex flex-col items-center justify-center p-4">
        {/* Continuous falling paper rolls and language text bubbles background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          {paperRollsList}
          {textBubblesList}
        </div>

        {/* Center Card */}
        <div className="w-full max-w-md p-8 bg-white/95 backdrop-blur-md border border-slate-200/60 rounded-3xl text-center space-y-6 shadow-2xl relative overflow-hidden animate-fade-in flex flex-col justify-center min-h-[450px] z-10">
          {/* Glow effect */}
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-orange-400/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-yellow-400/10 rounded-full blur-2xl pointer-events-none" />

          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(245,158,11,0.2)] border border-yellow-200 animate-bounce z-10">
            <Trophy size={40} className="text-slate-900 fill-amber-950/20" />
          </div>

          <div className="space-y-2 z-10">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 border border-amber-200 px-3 py-1 rounded-full">
              <Sparkles size={11} className="fill-amber-600/20" /> New Contest Live!
            </span>
            <h3 className="font-black text-2xl uppercase tracking-wider text-slate-800 mt-2">
              Be the First to Shine!
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              A brand new challenge, <b className="text-slate-700">{activeContest.title}</b>, has started at this shop. No one has submitted an entry yet. Be the pioneer and claim the glory!
            </p>
          </div>

          <div className="bg-slate-50/50 border border-slate-100 p-4 rounded-2xl text-left space-y-3.5 z-10 w-full">
            {/* Reward Section */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider flex items-center gap-1.5">
                <Gift size={12} className="text-slate-400" /> Reward Prize
              </span>
              <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl relative overflow-hidden">
                <p className="text-xs font-black text-amber-800 leading-snug">
                  {activeContest.reward_value && activeContest.reward_value.toLowerCase().startsWith('free')
                    ? activeContest.reward_value
                    : `Free ${activeContest.reward_value}`}
                </p>
                {/* Options list badges if there are choices */}
                {(() => {
                  if (!activeContest.reward_value) return null;
                  let cleanStr = activeContest.reward_value.replace(/^(Free:\s*)?Choose\s+any\s+\d+\s+from\s+/i, '');
                  cleanStr = cleanStr.replace(/^(Free\s+)?Reward:\s*/i, '');
                  const badges = cleanStr.split(/\s+or\s+|,/i).map(s => s.trim()).filter(Boolean);
                  if (badges.length > 1) {
                    return (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {badges.map((badge, bIdx) => (
                          <span key={bIdx} className="bg-amber-100 text-amber-800 text-[9px] font-black px-2 py-0.5 rounded-md border border-amber-250/20 shadow-2xs flex items-center gap-1">
                            <Gift size={9} className="shrink-0" /> {badge}
                          </span>
                        ))}
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>

            {/* Type Section */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200/50">
              <span className="text-[10px] text-slate-450 font-black uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={12} className="text-slate-400" /> Format
              </span>
              <span className="text-xs font-black text-slate-800 capitalize bg-slate-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                {activeContest.contest_type === 'drawing' ? <Palette size={11} className="shrink-0" /> : <PenTool size={11} className="shrink-0" />}
                <span>{activeContest.contest_type === 'drawing' ? 'Drawing Contest' : 'Poem Writing'}</span>
              </span>
            </div>
          </div>

          <div className="space-y-3 pt-2 z-10">
            <button
              onClick={() => handleStartParticipation()}
              className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-slate-950 font-black py-4 rounded-xl text-xs uppercase tracking-widest transition-all shadow-[0_4px_12px_rgba(245,158,11,0.25)] active:scale-95 hover:brightness-110 flex items-center justify-center gap-1.5"
            >
              <Zap size={13} className="fill-slate-950" /> Participate & Win
            </button>

            {participations.length > 0 && (
              <div className="relative p-[2.5px] rounded-xl overflow-hidden w-full flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.1)] z-10">
                {/* Spin border animation background */}
                <div className="absolute w-[250%] h-[250%] -top-[75%] -left-[75%] bg-[conic-gradient(from_0deg,#ff4545,#ffad26,#3eff4b,#2ae0ff,#d03cff,#ff4545)] animate-[spin-border_4s_linear_infinite] pointer-events-none z-0" />

                <button
                  onClick={() => setIsReelsOpen(true)}
                  className="relative w-full bg-slate-950 hover:bg-slate-900 text-white font-extrabold py-3.5 rounded-[10px] text-xs uppercase tracking-wider transition-colors flex items-center justify-center min-h-[46px] z-10"
                >
                  {galleryTextIndex === 0 && (
                    <span className="flex items-center justify-center gap-1.5 animate-fade-in">
                      <Video size={13} /> Watch Global Gallery
                    </span>
                  )}
                  {galleryTextIndex === 1 && (
                    <span className="flex items-center justify-center gap-1.5 animate-fade-in text-yellow-300">
                      <Zap size={13} className="fill-yellow-300" /> {stats.reels_count || participations.length} Live Reels
                    </span>
                  )}
                  {galleryTextIndex === 2 && (
                    <span className="flex items-center justify-center gap-1.5 animate-fade-in text-emerald-300">
                      <Trophy size={13} className="fill-emerald-300" /> {stats.winners_count || 0} Winners Crowned
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {renderModals()}

        <style>{`
          @keyframes spin-border {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes paper-roll-fall {
            0% {
              transform: translateY(-50px) rotate(0deg) rotateY(0deg) rotateX(0deg) scale(0.7);
              opacity: 0;
            }
            15% {
              opacity: 0.95;
            }
            85% {
              opacity: 0.95;
            }
            100% {
              transform: translateY(105vh) rotate(720deg) rotateY(360deg) rotateX(180deg) scale(1.1);
              opacity: 0;
            }
          }
          @keyframes text-bubble-up {
            0% {
              transform: translateY(0) translateX(0) scale(0.7);
              opacity: 0;
            }
            15% {
              opacity: 0.8;
            }
            85% {
              opacity: 0.8;
            }
            100% {
              transform: translateY(-110vh) translateX(var(--drift, 40px)) scale(1.1);
              opacity: 0;
            }
          }
        `}</style>
      </div>
    );
  }

  function renderModals() {
    return (
      <>
        {isJoinSelectionOpen && selectedPartToJoin && (
          <Modal
            isOpen={isJoinSelectionOpen}
            onClose={() => setIsJoinSelectionOpen(false)}
            title="Select a Contest"
          >
            {(() => {
              const isReelExpired = selectedPartToJoin.contest_status === 'ended';
              const isCurrentShopExpired = !activeContest || activeContest.status === 'ended';

              return (
                <div className="space-y-4 py-2 text-slate-950 font-sans">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    You can either join this specific reel's contest or join the current shop's active contest.
                  </p>

                  <div className="space-y-3 pt-2">
                    {/* Option 1: Reel's Contest */}
                    <button
                      disabled={isReelExpired}
                      onClick={() => {
                        setIsJoinSelectionOpen(false);
                        handleMakeEntry(selectedPartToJoin);
                      }}
                      className={cn(
                        "w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between group",
                        isReelExpired
                          ? "border-slate-100 bg-slate-50/40 opacity-50 cursor-not-allowed select-none"
                          : "border-slate-200 hover:border-orange-500/50 hover:bg-orange-50/30 cursor-pointer"
                      )}
                    >
                      <div className="space-y-1 pr-3 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-800 group-hover:text-orange-650 transition-colors truncate">
                            {selectedPartToJoin.contest_title || "Reel's Contest"} ({selectedPartToJoin.shop_name})
                          </span>
                          {isReelExpired ? (
                            <span className="px-2 py-0.5 text-[8px] bg-rose-100 border border-rose-250 text-rose-600 rounded-md font-black uppercase tracking-wider flex items-center gap-0.5 shrink-0 select-none">
                              <Clock size={8} /> Expired
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[8px] bg-emerald-105 border border-emerald-250 text-emerald-700 rounded-md font-black uppercase tracking-wider flex items-center gap-0.5 shrink-0 select-none animate-pulse">
                              {credits <= 0 ? "Pay & Join" : "Join Now"}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 block truncate">
                          {isReelExpired ? "This challenge has ended" : (credits <= 0 ? "Pay ₹5 to enter this challenge" : "Use 1 credit to participate")}
                        </span>
                      </div>
                      {!isReelExpired && <span className="text-orange-500 font-black group-hover:translate-x-1 transition-transform">➔</span>}
                    </button>

                    {/* Option 2: Current Host Shop's Contest */}
                    <button
                      disabled={isCurrentShopExpired}
                      onClick={() => {
                        setIsJoinSelectionOpen(false);
                        handleStartParticipation();
                      }}
                      className={cn(
                        "w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between group",
                        isCurrentShopExpired
                          ? "border-slate-100 bg-slate-50/40 opacity-50 cursor-not-allowed select-none"
                          : "border-slate-200 hover:border-orange-500/50 hover:bg-orange-50/30 cursor-pointer"
                      )}
                    >
                      <div className="space-y-1 pr-3 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-800 group-hover:text-orange-650 transition-colors truncate">
                            {activeContest?.title || "No Active Contest"} ({shopName})
                          </span>
                          {isCurrentShopExpired ? (
                            <span className="px-2 py-0.5 text-[8px] bg-rose-100 border border-rose-250 text-rose-600 rounded-md font-black uppercase tracking-wider flex items-center gap-0.5 shrink-0 select-none">
                              <Clock size={8} /> Expired
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[8px] bg-emerald-105 border border-emerald-250 text-emerald-700 rounded-md font-black uppercase tracking-wider flex items-center gap-0.5 shrink-0 select-none animate-pulse">
                              {credits <= 0 ? "Pay & Join" : "Join Now"}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 block truncate">
                          {isCurrentShopExpired ? "This challenge has ended" : (credits <= 0 ? "Pay ₹5 to enter this challenge" : "Use 1 credit to participate")}
                        </span>
                      </div>
                      {!isCurrentShopExpired && <span className="text-orange-500 font-black group-hover:translate-x-1 transition-transform">➔</span>}
                    </button>
                  </div>
                </div>
              );
            })()}
          </Modal>
        )}

        {isAuthOpen && (
          <DiscountUnlockPopup
            shopId={shopId}
            initialStep="mobile"
            onClose={() => setIsAuthOpen(false)}
            onUnlock={() => {
              setIsAuthOpen(false);
              loadContestDetails();
              if (pendingPart) {
                handleStartParticipation(pendingPart.contest_id, pendingPart.content_type);
                setPendingPart(null);
              } else {
                handleStartParticipation();
              }
            }}
          />
        )}

        <BottomSheet
          isOpen={isRewardInfoOpen}
          onClose={() => {
            setIsRewardInfoOpen(false);
            setContestInfoToDisplay(null);
          }}
          title="Contest & Reward Info"
        >
          {(() => {
            const infoData = contestInfoToDisplay || activeContest || activeSession;
            return (
              <div className="space-y-5 pb-6 text-slate-800 dark:text-slate-200">
                <div className="space-y-1 bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Contest Challenge</h4>
                  <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
                    {infoData?.title || infoData?.contest_title || "Contest Challenge"}
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {infoData?.description || "Participate in this creative challenge to win rewards!"}
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Reward Details</h4>
                  <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-black">Free Reward:</span>
                    <span className="text-xs font-extrabold text-white px-3 py-1 rounded-full capitalize" style={{ backgroundColor: primaryColor }}>
                      {infoData?.reward_value && infoData.reward_value.toLowerCase().startsWith('free')
                        ? infoData.reward_value
                        : `Free ${infoData?.reward_value || "Assured Gift"}`}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-normal italic">
                    Once you submit your entry within the timer, your submission will be live in the gallery. High likes and ratings will win you this reward coupon!
                  </p>
                </div>
              </div>
            );
          })()}
        </BottomSheet>

        {isPayOpen && (
          <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center">
            {/* Backdrop — click does nothing (no close on outside click) */}
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />

            {/* Sheet */}
            <div className={cn(
              "relative w-full max-w-md bg-white dark:bg-[#0f1623] rounded-t-3xl sm:rounded-3xl shadow-2xl z-10 flex flex-col max-h-[92dvh] overflow-hidden transition-all",
              shakeModal && "animate-shake"
            )}>

              {/* Fixed Header with X */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100 dark:border-slate-800/60 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/40 flex items-center justify-center shrink-0">
                    <AlertCircle size={16} className="text-rose-500" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 leading-tight">Not Enough Credits</h3>
                    <p className="text-[10px] text-slate-400 font-medium">You need 1 credit to participate</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShakeModal(true);
                    setTimeout(() => setShakeModal(false), 500);
                    setIsFomoOpen(true);
                  }}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 pb-36">

                {/* Don't Miss Out — Offer Card */}
                <div className="bg-gradient-to-r from-amber-500/10 via-primary/10 to-orange-500/10 dark:from-amber-500/15 dark:via-primary/15 dark:to-orange-500/15 border border-primary/30 dark:border-primary/25 rounded-2xl p-4 relative overflow-hidden group">
                  <div className="absolute -right-4 -bottom-4 text-primary/10 dark:text-primary/20 pointer-events-none group-hover:scale-110 transition-transform duration-500">
                    <Sparkles size={68} />
                  </div>
                  <div className="relative z-10 space-y-1">
                    <span className="text-[9px] bg-primary text-white font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm inline-block">
                      Don't Miss Out
                    </span>
                    <h4 className="font-black text-sm text-slate-900 dark:text-slate-100 mt-1.5">
                      Get 1 Token Instantly!
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                      Pay ₹5.18 to unlock your entry token (₹5 entry + 3% PG fee + 18% GST) — compete & win!
                    </p>
                  </div>
                </div>

                {/* What You Get — Benefits Grid */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-0.5">What you get for ₹5.18</p>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { icon: <Ticket size={15} />, title: '1 Contest Entry Token', desc: 'Participate in this live challenge immediately with 1 entry credit', highlight: true },
                      { icon: <ThumbsUp size={15} />, title: 'Votes & Gallery Exposure', desc: 'Your entry goes live — anyone can like & rate it', highlight: false },
                      {
                        icon: <Trophy size={15} />,
                        title: 'Winner Reward',
                        desc: activeContest?.reward_value
                          ? (activeContest.reward_value.toLowerCase().startsWith('free')
                            ? activeContest.reward_value
                            : `Free ${activeContest.reward_value}`)
                          : 'Free reward from the shop',
                        highlight: true,
                        isWinnerReward: true
                      },
                      { icon: <Gift size={15} />, title: 'Consolation Reward Too!', desc: "Even if you don't win, we still give you something special", highlight: false },
                      { icon: <ShieldCheck size={15} />, title: '100% Refund Guarantee', desc: 'If the contest is cancelled for any reason (e.g. minimum targets not reached), your credit will be automatically refunded back to your account!', highlight: true, isRefundPolicy: true },
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all ${item.isWinnerReward
                            ? 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/30 dark:border-amber-500/30 shadow-sm ring-1 ring-amber-500/15'
                            : item.isRefundPolicy
                              ? 'bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/30 dark:border-emerald-500/30 shadow-sm ring-1 ring-emerald-500/15'
                              : item.highlight
                                ? 'bg-primary/5 dark:bg-primary/10 border-primary/20 dark:border-primary/20'
                                : 'bg-slate-50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800/60'
                          }`}
                      >
                        <div className={`shrink-0 mt-0.5 ${item.isWinnerReward
                            ? 'text-amber-500 dark:text-amber-400'
                            : item.isRefundPolicy
                              ? 'text-emerald-500 dark:text-emerald-400'
                              : item.highlight
                                ? 'text-primary dark:text-orange-400'
                                : 'text-slate-400 dark:text-slate-500'
                          }`}>
                          {item.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-extrabold leading-tight ${item.isWinnerReward
                              ? 'text-amber-600 dark:text-amber-400'
                              : item.isRefundPolicy
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : item.highlight
                                  ? 'text-primary dark:text-orange-400'
                                  : 'text-slate-800 dark:text-slate-200'
                            }`}>
                            {item.title}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{item.desc}</p>

                          {/* Parse and display choices as badges if there are multiple options */}
                          {item.isWinnerReward && activeContest?.reward_value && (
                            (() => {
                              let cleanStr = activeContest.reward_value.replace(/^(Free:\s*)?Choose\s+any\s+\d+\s+from\s+/i, '');
                              cleanStr = cleanStr.replace(/^(Free\s+)?Reward:\s*/i, '');
                              const badges = cleanStr.split(/\s+or\s+|,/i).map(s => s.trim()).filter(Boolean);
                              if (badges.length > 1) {
                                return (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {badges.map((badge, bIdx) => (
                                      <span key={bIdx} className="bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-[9px] font-black px-2 py-0.5 rounded-md border border-amber-250/20 shadow-2xs flex items-center gap-1">
                                        <Gift size={9} className="shrink-0" /> {badge}
                                      </span>
                                    ))}
                                  </div>
                                );
                              }
                              return null;
                            })()
                          )}
                        </div>
                        {item.highlight && (
                          <span className={`ml-auto shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${item.isWinnerReward ? 'bg-amber-500' : item.isRefundPolicy ? 'bg-emerald-500' : 'bg-primary'
                            }`}>
                            <Check size={9} strokeWidth={3} className="text-white" />
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Itemized Bill Breakdown */}
                <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex justify-between font-medium">
                    <span>Base Entry Fee:</span>
                    <span className="font-bold text-slate-900 dark:text-white">₹5.00</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Gateway Fee (3%):</span>
                    <span>+₹0.15</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>GST on Gateway Fee (18%):</span>
                    <span>+₹0.03</span>
                  </div>
                  <div className="flex justify-between items-baseline pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span className="font-black text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">Total Payable:</span>
                    <span className="text-xl font-black text-slate-900 dark:text-white">₹5.18</span>
                  </div>
                </div>

                {/* Contest & Shop details */}
                <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 space-y-3 font-sans">
                  {/* Shop & Logo row */}
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-200/50 dark:border-slate-800/50">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-base shrink-0 shadow-sm" style={{ backgroundColor: primaryColor }}>
                      {(shopName || activeContest?.shop_name || 'M')[0].toUpperCase()}
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Contest by</span>
                      <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
                        {shopName || activeContest?.shop_name || 'Test Contest Shop'}
                      </span>
                    </div>
                  </div>

                  {/* Contest Type, Title & Description */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-450 dark:text-slate-400 font-bold uppercase tracking-wider">Challenge Info</span>
                      <span className="text-[10px] font-black text-white px-2 py-0.5 rounded-full capitalize flex items-center gap-1" style={{ backgroundColor: primaryColor }}>
                        {activeContest?.contest_type === 'drawing' ? <Palette size={10} className="shrink-0" /> : <PenTool size={10} className="shrink-0" />}
                        <span>{activeContest?.contest_type === 'drawing' ? 'Drawing Contest' : 'Poem Writing'}</span>
                      </span>
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 leading-snug">
                        {activeContest?.title}
                      </h4>
                      {activeContest?.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                          {activeContest.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Fixed Bottom CTA Button with Itemized Fee Breakdown Pill */}
              <div className="absolute bottom-0 left-0 right-0 bg-white/95 dark:bg-[#0f1623]/95 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 px-5 pt-2.5 pb-[calc(10px+env(safe-area-inset-bottom))] shrink-0 space-y-2">
                {/* Itemized Fee Breakdown Summary Pill */}
                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-3 py-1 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Fee Breakdown:</span>
                  <div className="flex items-center gap-1 font-medium">
                    <span>Base: <strong className="text-slate-900 dark:text-white">₹5.00</strong></span>
                    <span>+</span>
                    <span>PG: <strong className="text-slate-900 dark:text-white">₹0.15</strong></span>
                    <span>+</span>
                    <span>GST: <strong className="text-slate-900 dark:text-white">₹0.03</strong></span>
                  </div>
                </div>

                <button
                  onClick={handlePay}
                  className="w-full py-3 rounded-2xl font-black text-sm uppercase tracking-widest text-white shadow-lg transition-all active:scale-[0.98] hover:brightness-110 flex items-center justify-center gap-2"
                  style={{ background: `linear-gradient(135deg, ${primaryColor}, #f97316)` }}
                >
                  <Zap size={15} />
                  <span>Pay ₹5.18 — Unlock Contest Token</span>
                </button>
                <p className="text-center text-[9px] text-slate-400 dark:text-slate-500 mt-1 font-medium flex items-center justify-center gap-1">
                  <ShieldCheck size={10} className="text-slate-400" /> Secure payment powered by Razorpay
                </p>
              </div>
            </div>
          </div>
        )}

        {isFomoOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" />
            <div className="relative w-full max-w-sm bg-white dark:bg-[#0f1623] border border-slate-100 dark:border-slate-800/80 rounded-3xl p-6 shadow-2xl z-10 space-y-5 text-center animate-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto bg-rose-50 dark:bg-rose-950/30 text-rose-500">
                <HeartCrack size={22} className="animate-pulse" />
              </div>

              <div className="space-y-1.5">
                <span className="text-[9px] font-black uppercase tracking-widest block font-sans text-rose-500 dark:text-rose-450">
                  Are you missing out?
                </span>
                <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-100 leading-snug font-sans">
                  Even if you lose, we still reward you!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto font-sans">
                  Every participant gets a <span className="font-extrabold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1"><Gift size={13} /> free assured gift</span>. Don't close and miss out!
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  onClick={() => setIsFomoOpen(false)}
                  className="w-full text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider transition-all active:scale-[0.98] font-sans shadow-md"
                  style={{ background: `linear-gradient(135deg, ${primaryColor}, #f97316)` }}
                >
                  Wait, Keep Me in the Contest!
                </button>

                <button
                  onClick={() => {
                    setIsFomoOpen(false);
                    setIsPayOpen(false);
                    setIsReelsOpen(true);
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold py-3 rounded-xl text-xs transition-all active:scale-[0.98] border border-slate-200 dark:border-slate-800 font-sans"
                >
                  No thanks, watch Global Gallery
                </button>
              </div>
            </div>
          </div>
        )}

        {isSubmitOpen && activeSession && (
          <div className="fixed inset-0 z-40 bg-slate-50 dark:bg-slate-950 flex flex-col font-sans select-text">
            {/* 1. Reusable Contest Header */}
            <ContestHeader
              shopName={shopName || activeSession.shop_name || activeContest?.shop_name || "Merchant"}
              title={activeContest?.title || activeSession.contest_title || "Contest Challenge"}
              description={activeContest?.description || "Draw or write your entry to win rewards!"}
              rewardValue={activeContest?.reward_value || activeSession.reward_value || "Reward"}
              contestType={activeSession.content_type}
              primaryColor={primaryColor}
              onRewardClick={() => setIsRewardInfoOpen(true)}
            />

            {/* 2. Fullscreen Canvas/Editor Content */}
            <div className="flex-1 w-full bg-white dark:bg-slate-900 relative flex flex-col min-h-0">
              {activeSession.content_type === 'drawing' ? (
                <div className="flex-1 w-full min-h-0">
                  <Excalidraw
                    excalidrawAPI={(api: any) => setExcalidrawAPI(api)}
                    UIOptions={{
                      canvasActions: {
                        imageUpload: false,
                        loadScene: false,
                        export: false,
                        saveAsImage: false,
                        saveToActiveFile: false,
                      }
                    }}
                  >
                    <MainMenu>
                      <MainMenu.DefaultItems.ClearCanvas />
                      <MainMenu.DefaultItems.ToggleTheme />
                      <MainMenu.DefaultItems.ChangeCanvasBackground />
                    </MainMenu>
                  </Excalidraw>
                </div>
              ) : (
                <textarea
                  value={poemText}
                  onChange={(e) => setPoemText(e.target.value)}
                  className="flex-1 w-full p-6 text-slate-800 dark:text-slate-200 text-lg font-serif italic focus:outline-none focus:ring-0 border-0 bg-transparent resize-none leading-relaxed placeholder:text-slate-400"
                  placeholder="Tap here to write your poem..."
                />
              )}
            </div>

            {/* 3. Fixed Bottom Bar (Timer, Actions, Branding) */}
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 p-4 pb-6 space-y-3 z-30 select-none shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
              <div className="flex items-center gap-3">
                {/* Timer block */}
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-850 px-3 py-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <Clock size={14} className="text-slate-400 animate-pulse" />
                  <span className="font-mono font-black text-sm text-slate-750 dark:text-slate-350">
                    {formatTimer(timeLeft)}
                  </span>
                  <button
                    onClick={handleToggleTimer}
                    className="ml-1 text-[10px] font-black uppercase text-primary hover:brightness-110 active:scale-95 transition-all"
                  >
                    {isTimerRunning ? "Pause" : "Resume"}
                  </button>
                </div>

                {/* Cancel / Exit button */}
                <button
                  onClick={() => setIsCancelConfirmOpen(true)}
                  className="px-3.5 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-extrabold text-xs uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <X size={14} /> Cancel
                </button>

                {/* Submit button */}
                <Button
                  onClick={handleSubmitEntry}
                  className="flex-1 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 shadow-md border-0 text-xs uppercase tracking-widest transition-transform active:scale-[0.98]"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Send size={13} /> Submit Entry
                </Button>
              </div>

              {/* Branding Link */}
              <div className="flex items-center justify-center pt-1">
                <div className="flex items-center justify-center gap-1.5 px-3 py-1 bg-slate-50 dark:bg-slate-800/80 rounded-full border border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-[10px] text-slate-400 font-medium">Powered by</span>
                  <a
                    href="https://menukit.debuggers.co.in/landing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-black bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent no-underline flex items-center gap-1 hover:opacity-90 transition-opacity"
                  >
                    Menukit
                    <ExternalLink size={10} className="text-orange-500" />
                  </a>
                </div>
              </div>
            </div>

            {/* Custom Cancel Confirmation Popup */}
            {isCancelConfirmOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
                    <AlertCircle size={24} />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-slate-900 dark:text-white">
                      Cancel Contest Session?
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 leading-relaxed">
                      Your entry will not be submitted and your contest reservation will be released.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => setIsCancelConfirmOpen(false)}
                      className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                    >
                      Keep Drawing
                    </button>
                    <button
                      onClick={async () => {
                        const token = localStorage.getItem('customer_token');
                        const params = new URLSearchParams(window.location.search);
                        const sessionId = activeSession?.id || params.get('attend_session_id');

                        if (sessionId && token) {
                          try {
                            await contestService.cancelParticipation(sessionId, token);
                          } catch (err) {
                            console.error("Failed to cancel participation", err);
                          }
                        }
                        setIsCancelConfirmOpen(false);
                        setIsSubmitOpen(false);
                        setActiveSession(null);
                        setPoemText('');
                        const cleanUrl = `${window.location.origin}/shop/${shopId}/contest`;
                        window.history.pushState({}, '', cleanUrl);
                        window.location.href = cleanUrl;
                      }}
                      className="flex-1 py-3 rounded-xl bg-rose-500 hover:bg-rose-600 active:scale-95 text-white font-black text-xs shadow-md transition-all cursor-pointer"
                    >
                      Yes, Cancel & Exit
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </>
    );
  };

  const isDirectAttendMode = !!new URLSearchParams(window.location.search).get('attend_session_id');

  if (isDirectAttendMode) {
    return (
      <div className="fixed inset-0 z-50 bg-white">
        {renderModals()}
      </div>
    );
  }

  // Dashboard grid fallback card mode
  if (!activeContest) {
    return (
      <div className="w-full max-w-md p-6 bg-white border border-slate-200/60 rounded-3xl text-center space-y-4 shadow-xl flex flex-col items-center justify-center min-h-[250px]">
        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto shadow-sm border border-slate-100 bg-orange-50 text-orange-500">
          <Trophy size={22} />
        </div>
        <div>
          <h3 className="font-black text-lg uppercase tracking-wider text-slate-900">No Active Contest</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
            There is currently no active contest for this shop. Please check back later!
          </p>
        </div>
        {renderModals()}
      </div>
    );
  }

  return (
    <div className="w-full max-w-md p-6 bg-white border border-slate-200/60 rounded-3xl text-center space-y-4 shadow-xl">
      <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto shadow-sm border border-slate-100" style={{ backgroundColor: `${primaryColor}10`, color: primaryColor }}>
        <Trophy size={22} className="animate-pulse" />
      </div>
      <div>
        <h3 className="font-black text-lg uppercase tracking-wider text-slate-900">{activeContest.title}</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">{activeContest.description}</p>
      </div>
      <div className="flex justify-center gap-2">
        <Badge className="text-white font-bold uppercase tracking-wider text-[9px] px-2.5 py-0.5 border-0 shadow-sm" style={{ backgroundColor: primaryColor }}>
          Reward: Free {activeContest.reward_value}
        </Badge>
      </div>
      <button
        onClick={() => handleStartParticipation()}
        className="text-white font-black px-6 py-3 rounded-xl text-xs uppercase tracking-widest transition-all mx-auto block shadow-md hover:brightness-110 active:scale-95"
        style={{ backgroundColor: primaryColor }}
      >
        Participate Live
      </button>

      {/* Modals rendering helper */}
      {renderModals()}

      {/* CSS Overlay Keyframes for active center tap layout logic */}
      <style>{`
        @keyframes heart-bounce {
          0% { transform: scale(0) rotate(-15deg); opacity: 0; }
          15% { transform: scale(1.25) rotate(8deg); opacity: 0.95; }
          30% { transform: scale(0.9) rotate(-3deg); opacity: 1; }
          65% { transform: scale(1) rotate(0deg); opacity: 1; filter: drop-shadow(0 12px 24px rgba(244,63,94,0.45)); }
          100% { transform: scale(1.35) translateY(-45px); opacity: 0; }
        }
        @keyframes float-orb-one {
          0% { transform: translate(-10%, -10%) scale(1); }
          50% { transform: translate(40%, 30%) scale(1.15); }
          100% { transform: translate(-5%, 60%) scale(0.95); }
        }
        @keyframes float-orb-two {
          0% { transform: translate(90%, 60%) scale(1); }
          50% { transform: translate(15%, -15%) scale(0.9); }
          100% { transform: translate(70%, 15%) scale(1.1); }
        }
        @keyframes float-orb-three {
          0% { transform: translate(40%, 80%) scale(0.95); }
          50% { transform: translate(-20%, 20%) scale(1.05); }
          100% { transform: translate(30%, -10%) scale(1); }
        }
        .cta-text-anim {
          display: block;
          width: 100%;
          animation: btn-swap 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes btn-swap {
          0% { transform: translateY(15px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-6px); }
          20%, 40%, 60%, 80% { transform: translateX(6px); }
        }
        .animate-shake {
          animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
        }
        @keyframes card-shine {
          0% { transform: translate(-100%, -100%) rotate(45deg); }
          100% { transform: translate(100%, 100%) rotate(45deg); }
        }
        @keyframes splash-pop {
          0% { transform: scale(0.3); opacity: 0; }
          40% { opacity: 0.95; }
          100% { transform: scale(1.3); opacity: 0; }
        }
        @keyframes letter-pop {
          0% { transform: scale(0.4); opacity: 0; }
          30% { opacity: 0.95; }
          100% { transform: scale(1.3); opacity: 0; }
        }

        /* Hide Image and Web-Embed/Embeddable tools from Excalidraw toolbar */
        .excalidraw button[data-testid="image"],
        .excalidraw button[data-testid="web-embed"],
        .excalidraw button[data-testid="embeddable"],
        .excalidraw button[title*="Image"],
        .excalidraw button[title*="image"],
        .excalidraw button[title*="Embed"],
        .excalidraw button[title*="embed"],
        .excalidraw div[data-testid="image"],
        .excalidraw div[data-testid="embeddable"] {
          display: none !important;
        }
      `}</style>
    </div>
  );
};