import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Gamepad2, Lightbulb, Trophy, RefreshCcw, Cookie, Palette, HelpCircle, XCircle, Circle, Heart, X, PlaySquare, CheckCircle2 } from 'lucide-react';
import { MenuItem } from '@/types';

interface EntertainmentHubProps {
  isOpen: boolean;
  onClose: () => void;
  primaryColor?: string;
  menuItems?: MenuItem[];
  currency?: string;
}

const FOOD_EMOJIS = ['🍔', '🍕', '🌭', '🍟', '🍦', '🍩', '🌮', '🍣'];

const FUN_FOOD_FACTS = [
  "Did you know? Honey never spoils! 🍯 Archaeologists have found pots of honey in ancient Egyptian tombs that are over 3,000 years old.",
  "Bananas are technically berries, but strawberries aren't! 🍓 Mind = blown.",
  "The sticker on your fruit is actually edible! 🍎 (Though we still recommend taking it off, it's totally safe).",
  "Peanuts aren't actually nuts! 🥜 They're legumes, which makes them closer relatives to peas and lentils.",
  "White chocolate doesn't actually contain any cocoa solids. 🍫 It's made of cocoa butter, sugar, and milk!",
  "The world's most expensive pizza costs $12,000! 🍕 It takes 72 hours to make.",
  "Carrots were originally purple, not orange! 🥕 The orange ones were cultivated in the 17th century.",
  "A single strand of spaghetti is technically called a 'spaghetto'. 🍝 Now you can impress your friends!",
  "Apples float in water because they are 25% air! 🍏 Perfect for bobbing.",
  "Ketchup was once sold as medicine in the 1830s to cure stomach ailments. 🍅"
];

const FOOD_TRIVIA = [
  { q: "What is the most consumed manufactured drink in the world?", options: ["Coffee", "Tea", "Coca-Cola", "Beer"], a: "Tea" },
  { q: "Which country invented ice cream?", options: ["Italy", "USA", "France", "China"], a: "China" },
  { q: "What is the main ingredient in guacamole?", options: ["Tomato", "Avocado", "Onion", "Lime"], a: "Avocado" },
  { q: "Which nut is used to make marzipan?", options: ["Almond", "Walnut", "Pecan", "Cashew"], a: "Almond" },
  { q: "What is the national dish of Spain?", options: ["Tacos", "Paella", "Pizza", "Sushi"], a: "Paella" },
];

const FORTUNES = [
  "A delicious surprise is in your near future! 🍕",
  "Your hunger will soon be cured. 🍔",
  "Great things come to those who wait (for their food). ⏳",
  "You will soon enjoy a meal to remember! 🌮",
  "A sweet treat is exactly what you need today. 🍦",
  "Your good taste in food reflects your good taste in life. ✨",
  "An unexpected spicy moment will bring you joy. 🌶️",
  "Share your fries today, and receive good karma tomorrow. 🍟"
];

export const EntertainmentHub: React.FC<EntertainmentHubProps> = ({ isOpen, onClose, primaryColor = '#f97316', menuItems = [], currency = '₹' }) => {
  const [activeTab, setActiveTab] = useState<'games' | 'facts' | 'fortune' | 'doodle' | 'cricket' | 'swiper' | 'shorts'>('swiper');
  const [subTab, setSubTab] = useState<'memory' | 'tictactoe' | 'trivia' | 'funfacts'>('memory');
  
  // Use actual images or a delicious food placeholder so the feature works even on test items!
  const validMenuItems = menuItems.map(i => ({
    ...i,
    image_url: i.image_url || i.thumbnail_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  }));
  
  // Swiper State (Crave or Pass)
  const [swiperIndex, setSwiperIndex] = useState(0);
  const [cravedItems, setCravedItems] = useState<MenuItem[]>([]);
  const [showCravingsList, setShowCravingsList] = useState(false);
  const [animateDirection, setAnimateDirection] = useState<'left' | 'right' | null>(null);

  // Shorts State
  const [heartedShorts, setHeartedShorts] = useState<Record<string, boolean>>({});
  const [showHeartAnim, setShowHeartAnim] = useState<string | null>(null);

  // Game State: Memory
  const [cards, setCards] = useState<{ id: number; emoji: string; isFlipped: boolean; isMatched: boolean }[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [isWon, setIsWon] = useState(false);

  // Game State: Tic-Tac-Toe
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState(true);
  const [isVsBot, setIsVsBot] = useState(true);
  const winner = calculateWinner(board);

  // Facts & Trivia State
  const [fact, setFact] = useState<string>(FUN_FOOD_FACTS[0]);
  const [isFactLoading, setIsFactLoading] = useState(false);
  const [triviaIndex, setTriviaIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  // Fortune Cookie State
  const [fortuneOpened, setFortuneOpened] = useState(false);
  const [fortuneText, setFortuneText] = useState("");

  // Doodle State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState('#000000');

  useEffect(() => {
    if (isOpen) {
      if (cards.length === 0) initializeMemoryGame();
      if (!fortuneText) setFortuneText(FORTUNES[Math.floor(Math.random() * FORTUNES.length)]);
      
      // Default to swiper if there are images, else games
      if (validMenuItems.length > 0 && activeTab !== 'swiper' && activeTab !== 'shorts') {
        setActiveTab('swiper');
      } else if (validMenuItems.length === 0 && (activeTab === 'swiper' || activeTab === 'shorts')) {
        setActiveTab('games');
      }
    }
  }, [isOpen]);

  // --- Swiper Logic ---
  const handleSwipe = (isCrave: boolean) => {
    if (swiperIndex >= validMenuItems.length) return;
    
    setAnimateDirection(isCrave ? 'right' : 'left');
    
    if (isCrave) {
      setCravedItems(prev => {
        if (!prev.find(item => item.id === validMenuItems[swiperIndex].id)) {
          return [...prev, validMenuItems[swiperIndex]];
        }
        return prev;
      });
    }

    setTimeout(() => {
      setAnimateDirection(null);
      if (swiperIndex + 1 >= validMenuItems.length) {
        setShowCravingsList(true);
      } else {
        setSwiperIndex(prev => prev + 1);
      }
    }, 300);
  };

  // --- Shorts Logic ---
  const handleShortDoubleTap = (itemId: string) => {
    setHeartedShorts(prev => ({ ...prev, [itemId]: true }));
    setShowHeartAnim(itemId);
    setTimeout(() => setShowHeartAnim(null), 1000);
  };

  // --- Memory Logic ---
  const initializeMemoryGame = () => {
    const shuffledCards = [...FOOD_EMOJIS, ...FOOD_EMOJIS]
      .sort(() => Math.random() - 0.5)
      .map((emoji, index) => ({ id: index, emoji, isFlipped: false, isMatched: false }));
    setCards(shuffledCards);
    setFlippedIndices([]);
    setMoves(0);
    setIsWon(false);
  };

  const handleCardClick = (index: number) => {
    if (flippedIndices.length === 2 || cards[index].isFlipped || cards[index].isMatched) return;

    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);

    const newFlippedIndices = [...flippedIndices, index];
    setFlippedIndices(newFlippedIndices);

    if (newFlippedIndices.length === 2) {
      setMoves(moves + 1);
      const [firstIndex, secondIndex] = newFlippedIndices;
      
      if (newCards[firstIndex].emoji === newCards[secondIndex].emoji) {
        newCards[firstIndex].isMatched = true;
        newCards[secondIndex].isMatched = true;
        setCards(newCards);
        setFlippedIndices([]);
        if (newCards.every(card => card.isMatched)) setIsWon(true);
      } else {
        setTimeout(() => {
          const resetCards = [...newCards];
          resetCards[firstIndex].isFlipped = false;
          resetCards[secondIndex].isFlipped = false;
          setCards(resetCards);
          setFlippedIndices([]);
        }, 1000);
      }
    }
  };

  // --- Tic Tac Toe Logic ---
  function calculateWinner(squares: (string | null)[]) {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
      [0, 4, 8], [2, 4, 6]             // diagonals
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    return null;
  }

  const handleTicTacClick = (i: number) => {
    if (board[i] || winner || (!xIsNext && isVsBot)) return; 
    const newBoard = [...board];
    newBoard[i] = xIsNext ? 'X' : 'O';
    setBoard(newBoard);
    setXIsNext(!xIsNext);
  };

  const resetTicTacToe = () => {
    setBoard(Array(9).fill(null));
    setXIsNext(true);
  };

  useEffect(() => {
    if (activeTab === 'games' && subTab === 'tictactoe' && isVsBot && !xIsNext && !winner && board.includes(null)) {
      const timer = setTimeout(() => {
        const available = board.map((val, i) => val === null ? i : null).filter(val => val !== null) as number[];
        if (available.length > 0) {
          const randomIdx = available[Math.floor(Math.random() * available.length)];
          const newBoard = [...board];
          newBoard[randomIdx] = 'O';
          setBoard(newBoard);
          setXIsNext(true);
        }
      }, 500); 
      return () => clearTimeout(timer);
    }
  }, [xIsNext, isVsBot, board, winner, activeTab, subTab]);

  // --- Facts & Trivia Logic ---
  const generateFact = () => {
    setIsFactLoading(true);
    setTimeout(() => {
      let newFact;
      do {
        newFact = FUN_FOOD_FACTS[Math.floor(Math.random() * FUN_FOOD_FACTS.length)];
      } while (newFact === fact && FUN_FOOD_FACTS.length > 1);
      setFact(newFact);
      setIsFactLoading(false);
    }, 400);
  };

  const nextTrivia = () => {
    setSelectedAnswer(null);
    setTriviaIndex((prev) => (prev + 1) % FOOD_TRIVIA.length);
  };

  // --- Fortune Cookie Logic ---
  const openFortune = () => {
    if (!fortuneOpened) {
      setFortuneOpened(true);
    } else {
      setFortuneOpened(false);
      setTimeout(() => {
        setFortuneText(FORTUNES[Math.floor(Math.random() * FORTUNES.length)]);
      }, 300);
    }
  };

  // --- Doodle Logic ---
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.beginPath();
    ctx.moveTo((clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.lineTo((clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY);
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  useEffect(() => {
    if (activeTab === 'doodle' && canvasRef.current) {
      const canvas = canvasRef.current;
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }
    }
  }, [activeTab]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Entertainment Hub" className="bg-white max-w-lg w-full !p-0 overflow-hidden rounded-2xl">
      <div className="flex flex-col h-[80vh] max-h-[700px] bg-slate-50">
        
        {/* Main Tabs - Scrollable */}
        <div className="flex bg-white px-3 pt-3 pb-2 shrink-0 overflow-x-auto no-scrollbar gap-2 border-b border-slate-100 shadow-sm z-10">
          {validMenuItems.length > 0 && (
            <>
              <button
                onClick={() => setActiveTab('swiper')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all shrink-0 ${
                  activeTab === 'swiper' ? 'bg-red-500 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                <Heart size={16} className={activeTab === 'swiper' ? "fill-white" : ""} /> Crave or Pass
              </button>
              <button
                onClick={() => setActiveTab('shorts')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all shrink-0 ${
                  activeTab === 'shorts' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                <PlaySquare size={16} className={activeTab === 'shorts' ? "fill-white text-slate-900" : ""} /> Menu Shorts
              </button>
            </>
          )}
          <button
            onClick={() => setActiveTab('games')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all shrink-0 ${
              activeTab === 'games' ? 'text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
            style={activeTab === 'games' ? { backgroundColor: primaryColor } : {}}
          >
            <Gamepad2 size={16} /> Games
          </button>
          <button
            onClick={() => setActiveTab('fortune')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all shrink-0 ${
              activeTab === 'fortune' ? 'bg-amber-500 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            <Cookie size={16} /> Fortune
          </button>
          <button
            onClick={() => setActiveTab('doodle')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all shrink-0 ${
              activeTab === 'doodle' ? 'bg-blue-500 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            <Palette size={16} /> Doodle
          </button>
          <button
            onClick={() => setActiveTab('facts')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all shrink-0 ${
              activeTab === 'facts' ? 'bg-purple-500 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            <Lightbulb size={16} /> Learn
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-hidden relative flex flex-col">
          
          {/* ================= SWIPER TAB ================= */}
          {activeTab === 'swiper' && validMenuItems.length > 0 && (
            <div className="flex flex-col h-full bg-slate-900">
              {showCravingsList ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white animate-in zoom-in duration-300">
                  <Heart size={48} className="text-red-500 fill-red-500 mb-4 animate-bounce" />
                  <h3 className="text-2xl font-black text-slate-900 mb-2">Your Cravings</h3>
                  <p className="text-slate-500 text-center mb-6">You liked {cravedItems.length} items!</p>
                  
                  {cravedItems.length > 0 ? (
                    <div className="w-full max-h-[40vh] overflow-y-auto mb-6 space-y-3 pr-2">
                      {cravedItems.map(item => (
                        <div key={item.id} className="flex items-center gap-3 p-3 border border-slate-100 rounded-xl bg-slate-50">
                          <img src={item.thumbnail_url || item.image_url!} alt={item.name} className="w-12 h-12 rounded-lg object-cover" />
                          <div className="flex-1">
                            <h4 className="font-bold text-sm text-slate-800 line-clamp-1">{item.name}</h4>
                            <p className="text-xs text-slate-500">{currency}{Number(item.price)}</p>
                          </div>
                          <CheckCircle2 size={18} className="text-green-500" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 italic mb-6">You didn't crave anything. Tough crowd!</p>
                  )}
                  
                  <div className="flex gap-3 w-full">
                    <button 
                      onClick={() => { setSwiperIndex(0); setCravedItems([]); setShowCravingsList(false); }}
                      className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors"
                    >
                      Restart
                    </button>
                    <button 
                      onClick={onClose}
                      className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors shadow-lg"
                    >
                      Close & Order
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 relative flex flex-col p-4 sm:p-6 overflow-hidden">
                  <div className="text-center mb-4 z-10">
                    <h3 className="text-white font-black text-xl tracking-tight">Crave or Pass?</h3>
                    <p className="text-slate-400 text-xs mt-1">{swiperIndex + 1} / {validMenuItems.length}</p>
                  </div>
                  
                  <div className="flex-1 relative w-full max-w-sm mx-auto">
                    {validMenuItems[swiperIndex] && (
                      <div 
                        className="absolute inset-0 bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-transform duration-300"
                        style={{
                          transform: animateDirection === 'left' ? 'translateX(-100%) rotate(-10deg) scale(0.9)' : 
                                     animateDirection === 'right' ? 'translateX(100%) rotate(10deg) scale(0.9)' : 
                                     'translateX(0) rotate(0) scale(1)',
                          opacity: animateDirection ? 0 : 1
                        }}
                      >
                        <div className="flex-1 relative">
                          <img 
                            src={validMenuItems[swiperIndex].image_url || validMenuItems[swiperIndex].thumbnail_url!} 
                            alt={validMenuItems[swiperIndex].name}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                            <h2 className="text-2xl font-black mb-1">{validMenuItems[swiperIndex].name}</h2>
                            <p className="font-bold text-red-400 text-lg mb-2">{currency}{Number(validMenuItems[swiperIndex].price)}</p>
                            {validMenuItems[swiperIndex].description && (
                              <p className="text-sm text-slate-200 line-clamp-2">{validMenuItems[swiperIndex].description}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-center gap-6 mt-8 mb-4 z-10">
                    <button 
                      onClick={() => handleSwipe(false)}
                      disabled={!!animateDirection}
                      className="w-16 h-16 rounded-full bg-white text-slate-400 flex items-center justify-center shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:scale-110 hover:text-slate-900 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <X size={32} strokeWidth={3} />
                    </button>
                    <button 
                      onClick={() => handleSwipe(true)}
                      disabled={!!animateDirection}
                      className="w-16 h-16 rounded-full bg-white text-red-500 flex items-center justify-center shadow-[0_8px_30px_rgba(239,68,68,0.3)] hover:scale-110 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <Heart size={32} strokeWidth={3} className="fill-red-500" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= SHORTS TAB ================= */}
          {activeTab === 'shorts' && validMenuItems.length > 0 && (
            <div className="flex-1 overflow-y-auto snap-y snap-mandatory scrollbar-hide bg-black h-full">
              {validMenuItems.map(item => (
                <div 
                  key={item.id} 
                  className="w-full h-full snap-start relative flex items-center justify-center"
                  onDoubleClick={() => handleShortDoubleTap(item.id)}
                >
                  <img 
                    src={item.image_url || item.thumbnail_url!} 
                    alt={item.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10" />
                  
                  <div className="absolute bottom-16 left-4 right-16 text-white z-10">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/20 backdrop-blur-sm text-xs font-bold mb-3 border border-white/10">
                      {currency}{Number(item.price)}
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black mb-2 leading-tight drop-shadow-md">{item.name}</h2>
                    {item.description && (
                      <p className="text-sm text-slate-300 line-clamp-3 font-medium">{item.description}</p>
                    )}
                  </div>
                  
                  <div className="absolute right-4 bottom-20 flex flex-col items-center gap-6 z-10">
                    <button 
                      onClick={() => {
                        setHeartedShorts(prev => ({ ...prev, [item.id]: !prev[item.id] }));
                      }}
                      className="flex flex-col items-center gap-1 group"
                    >
                      <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/10 group-hover:bg-black/60 transition-colors">
                        <Heart size={24} className={heartedShorts[item.id] ? "text-red-500 fill-red-500" : "text-white"} />
                      </div>
                      <span className="text-xs font-bold text-white shadow-black">{heartedShorts[item.id] ? 'Liked' : 'Like'}</span>
                    </button>
                    
                    <button className="flex flex-col items-center gap-1 group" onClick={onClose}>
                      <div className="w-12 h-12 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <CheckCircle2 size={24} className="text-slate-900" />
                      </div>
                      <span className="text-xs font-bold text-white shadow-black drop-shadow-md">Order</span>
                    </button>
                  </div>
                  
                  {/* Heart Animation */}
                  {showHeartAnim === item.id && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                      <Heart size={120} className="text-red-500 fill-red-500 animate-in zoom-in fade-out duration-1000 fill-mode-forwards drop-shadow-2xl" />
                    </div>
                  )}
                  
                  {/* Swipe Up Hint */}
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center opacity-50 pointer-events-none animate-bounce">
                    <div className="px-3 py-1 rounded-full bg-black/50 text-white text-[10px] uppercase font-bold tracking-widest backdrop-blur-sm border border-white/10">
                      Swipe Up
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ================= GAMES TAB ================= */}
          {activeTab === 'games' && (
            <div className="flex flex-col h-full bg-white">
              <div className="flex justify-center gap-2 p-3 bg-white border-b border-slate-100 shadow-sm z-10">
                <button 
                  onClick={() => setSubTab('memory')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${subTab === 'memory' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
                >
                  Memory Match
                </button>
                <button 
                  onClick={() => setSubTab('tictactoe')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${subTab === 'tictactoe' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
                >
                  Tic-Tac-Toe
                </button>
              </div>

              {subTab === 'memory' && (
                <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center bg-slate-50">
                  <div className="flex justify-between w-full max-w-[320px] mb-4">
                    <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-slate-100">
                      Moves: <span style={{ color: primaryColor }}>{moves}</span>
                    </span>
                    <button 
                      onClick={initializeMemoryGame}
                      className="text-xs font-bold text-slate-500 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-slate-100 flex items-center gap-1 hover:bg-slate-50 transition-colors"
                    >
                      <RefreshCcw size={12} /> Restart
                    </button>
                  </div>

                  {isWon ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center animate-in zoom-in duration-500 my-auto">
                      <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4 shadow-inner">
                        <Trophy size={32} className="text-amber-500" />
                      </div>
                      <h3 className="text-xl font-black mb-1 text-slate-800">You Won!</h3>
                      <p className="text-sm text-slate-500 mb-6">Completed in {moves} moves.</p>
                      <button 
                        onClick={initializeMemoryGame}
                        className="px-6 py-2.5 rounded-xl text-white text-sm font-bold shadow-lg hover:shadow-xl transition-all active:scale-95"
                        style={{ backgroundColor: primaryColor }}
                      >
                        Play Again
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2 w-full max-w-[320px] mx-auto mt-auto mb-auto">
                      {cards.map((card, index) => (
                        <button
                          key={card.id}
                          onClick={() => handleCardClick(index)}
                          disabled={card.isFlipped || card.isMatched}
                          className="aspect-square rounded-xl flex items-center justify-center text-2xl transition-all duration-300 transform perspective-1000 relative shadow-sm"
                          style={{ 
                            backgroundColor: card.isFlipped || card.isMatched ? 'white' : primaryColor,
                            border: `2px solid ${card.isFlipped || card.isMatched ? '#e2e8f0' : primaryColor}`,
                            transformStyle: 'preserve-3d',
                            transform: card.isFlipped || card.isMatched ? 'rotateY(180deg)' : 'rotateY(0deg)'
                          }}
                        >
                          <div className="absolute inset-0 flex items-center justify-center backface-hidden" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                            {card.emoji}
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center backface-hidden text-white/50" style={{ backfaceVisibility: 'hidden' }}>
                            <Gamepad2 size={20} />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {subTab === 'tictactoe' && (
                <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center bg-slate-50">
                  <div className="flex gap-1 mb-4 bg-slate-200 p-1 rounded-xl w-full max-w-[200px]">
                    <button 
                      onClick={() => { setIsVsBot(true); resetTicTacToe(); }}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${isVsBot ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      1 Player
                    </button>
                    <button 
                      onClick={() => { setIsVsBot(false); resetTicTacToe(); }}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${!isVsBot ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      2 Players
                    </button>
                  </div>

                  <div className="mb-6 flex flex-col items-center">
                    <span className="text-sm font-bold bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100 mb-2">
                      {winner ? `Winner: ${winner}` : !board.includes(null) ? 'Draw!' : `Next player: ${xIsNext ? 'X' : 'O'}`}
                    </span>
                    <button onClick={resetTicTacToe} className="text-xs text-slate-500 font-bold flex items-center gap-1 hover:text-slate-800">
                      <RefreshCcw size={12} /> Reset Board
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 bg-slate-300 p-2 rounded-2xl">
                    {board.map((square, i) => (
                      <button
                        key={i}
                        onClick={() => handleTicTacClick(i)}
                        className="w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-xl text-4xl sm:text-5xl font-black flex items-center justify-center shadow-sm hover:bg-slate-50 transition-colors"
                        style={{ color: square === 'X' ? primaryColor : '#334155' }}
                      >
                        {square === 'X' && <XCircle size={40} />}
                        {square === 'O' && <Circle size={36} className="text-slate-700" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= FORTUNE COOKIE TAB ================= */}
          {activeTab === 'fortune' && (
            <div className="flex flex-col h-full items-center justify-center text-center p-6 bg-gradient-to-b from-amber-50 to-orange-100">
              <div 
                className="relative cursor-pointer transition-transform hover:scale-105 active:scale-95"
                onClick={openFortune}
              >
                {!fortuneOpened ? (
                  <div className="w-40 h-40 bg-amber-200 rounded-full flex items-center justify-center shadow-2xl animate-bounce border-4 border-amber-300">
                    <Cookie size={80} className="text-amber-600 drop-shadow-md" />
                    <div className="absolute -bottom-6 font-black text-amber-800 text-sm uppercase tracking-widest whitespace-nowrap bg-white/80 backdrop-blur-sm px-4 py-1 rounded-full shadow-sm">
                      Tap to Crack
                    </div>
                  </div>
                ) : (
                  <div className="w-full max-w-sm flex flex-col items-center animate-in fade-in zoom-in duration-500">
                    <div className="flex gap-4 mb-6 opacity-50">
                      <Cookie size={40} className="text-amber-600 -rotate-12" />
                      <Cookie size={40} className="text-amber-600 rotate-12" />
                    </div>
                    <div className="bg-white p-6 rounded-sm shadow-xl border-y-2 border-amber-200 relative">
                      <div className="absolute left-0 top-0 bottom-0 w-2 border-l-4 border-dotted border-amber-300"></div>
                      <div className="absolute right-0 top-0 bottom-0 w-2 border-r-4 border-dotted border-amber-300"></div>
                      <p className="text-lg font-mono text-slate-800 leading-relaxed font-bold px-4">
                        "{fortuneText}"
                      </p>
                    </div>
                    <button 
                      onClick={openFortune}
                      className="mt-8 px-6 py-2 bg-white rounded-full text-xs font-bold text-slate-500 hover:text-amber-600 shadow-sm transition-colors flex items-center gap-1 border border-amber-100"
                    >
                      <RefreshCcw size={12} /> Get another fortune
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= DOODLE PAD TAB ================= */}
          {activeTab === 'doodle' && (
            <div className="flex flex-col h-full bg-white">
              <div className="flex justify-between items-center p-3 bg-white border-b border-slate-100 shrink-0 shadow-sm z-10">
                <div className="flex gap-2 bg-slate-100 p-1.5 rounded-full">
                  {['#000000', '#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7'].map(color => (
                    <button
                      key={color}
                      onClick={() => setDrawColor(color)}
                      className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 transition-all ${drawColor === color ? 'scale-110 shadow-md border-white ring-2 ring-slate-300' : 'border-transparent hover:scale-110'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <button 
                  onClick={clearCanvas}
                  className="text-xs font-bold text-slate-500 flex items-center gap-1 bg-slate-100 px-4 py-2 rounded-full hover:bg-slate-200 hover:text-slate-800 transition-colors"
                >
                  <RefreshCcw size={12} /> Clear
                </button>
              </div>
              <div className="flex-1 w-full bg-slate-50 relative cursor-crosshair overflow-hidden touch-none shadow-inner">
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-full absolute inset-0 touch-none bg-white"
                />
                {!isDrawing && canvasRef.current && canvasRef.current.toDataURL() === document.createElement('canvas').toDataURL() && (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-300 font-black text-3xl pointer-events-none opacity-50">
                    Draw here!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= FACTS/TRIVIA TAB ================= */}
          {activeTab === 'facts' && (
            <div className="flex flex-col h-full bg-white">
              <div className="flex justify-center gap-2 p-3 bg-white border-b border-slate-100 shadow-sm z-10">
                <button 
                  onClick={() => setSubTab('funfacts')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${subTab === 'funfacts' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
                >
                  Fun Facts
                </button>
                <button 
                  onClick={() => setSubTab('trivia')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${subTab === 'trivia' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
                >
                  Trivia Quiz
                </button>
              </div>

              {subTab === 'funfacts' && (
                <div className="flex flex-col h-full items-center justify-center text-center p-6 bg-slate-50">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-8 text-blue-500 shrink-0 shadow-inner border-4 border-white">
                    <Lightbulb size={40} />
                  </div>
                  
                  <div className="flex-1 flex items-center justify-center w-full">
                    {isFactLoading ? (
                      <div className="w-full space-y-4 animate-pulse max-w-sm">
                        <div className="h-4 bg-slate-200 rounded w-3/4 mx-auto"></div>
                        <div className="h-4 bg-slate-200 rounded w-full mx-auto"></div>
                        <div className="h-4 bg-slate-200 rounded w-5/6 mx-auto"></div>
                      </div>
                    ) : (
                      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 relative">
                        <div className="absolute -top-4 left-6 text-4xl opacity-20">"</div>
                        <p className="text-lg sm:text-xl font-bold text-slate-700 leading-relaxed relative z-10 animate-fade-in px-4">
                          {fact}
                        </p>
                        <div className="absolute -bottom-6 right-6 text-4xl opacity-20">"</div>
                      </div>
                    )}
                  </div>

                  <div className="mt-8 shrink-0">
                    <button 
                      onClick={generateFact}
                      disabled={isFactLoading}
                      className="px-8 py-4 rounded-full text-white text-sm font-black shadow-xl hover:shadow-2xl transition-all active:scale-95"
                      style={{ backgroundColor: primaryColor }}
                    >
                      Another Fun Fact!
                    </button>
                  </div>
                </div>
              )}

              {subTab === 'trivia' && (
                <div className="flex flex-col h-full p-4 sm:p-6 bg-slate-50 overflow-y-auto">
                  <div className="flex items-center gap-2 mb-6 justify-center">
                    <HelpCircle className="text-purple-500" size={28} />
                    <h3 className="font-black text-slate-800 text-xl">Food Trivia</h3>
                  </div>

                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-6 w-full max-w-md mx-auto">
                    <p className="font-black text-slate-800 mb-6 text-lg text-center">{FOOD_TRIVIA[triviaIndex].q}</p>
                    
                    <div className="space-y-3">
                      {FOOD_TRIVIA[triviaIndex].options.map(option => {
                        const isSelected = selectedAnswer === option;
                        const isCorrect = option === FOOD_TRIVIA[triviaIndex].a;
                        let btnClass = "w-full text-left px-5 py-4 rounded-2xl font-bold border-2 transition-all ";
                        
                        if (selectedAnswer) {
                          if (isCorrect) btnClass += "bg-green-100 border-green-500 text-green-800 shadow-sm";
                          else if (isSelected) btnClass += "bg-red-100 border-red-500 text-red-800 shadow-sm";
                          else btnClass += "bg-slate-50 border-slate-100 text-slate-400 opacity-50";
                        } else {
                          btnClass += "bg-white border-slate-200 hover:border-purple-400 hover:bg-purple-50 shadow-sm hover:shadow-md";
                        }

                        return (
                          <button
                            key={option}
                            disabled={selectedAnswer !== null}
                            onClick={() => setSelectedAnswer(option)}
                            className={btnClass}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {selectedAnswer && (
                    <div className="mt-auto animate-in fade-in slide-in-from-bottom-4 flex flex-col items-center w-full max-w-md mx-auto">
                      <div className={`w-full p-4 rounded-2xl font-bold mb-4 text-center border-2 ${selectedAnswer === FOOD_TRIVIA[triviaIndex].a ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                        {selectedAnswer === FOOD_TRIVIA[triviaIndex].a ? 'Correct! 🎉 You know your food!' : `Oops! The correct answer is ${FOOD_TRIVIA[triviaIndex].a}.`}
                      </div>
                      <button 
                        onClick={nextTrivia}
                        className="w-full py-4 rounded-2xl text-white font-black shadow-lg hover:shadow-xl transition-all active:scale-95"
                        style={{ backgroundColor: primaryColor }}
                      >
                        Next Question
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ================= CRICKET TAB ================= */}
          {activeTab === 'cricket' && (
            <div className="flex flex-col h-full bg-slate-50 p-2">
              <div className="flex-1 w-full bg-white rounded-2xl border border-slate-200 overflow-hidden relative shadow-sm">
                <iframe 
                  src="https://cricwaves.com/cricket/widgets/score_board.html" 
                  width="100%" 
                  height="100%" 
                  frameBorder="0"
                  scrolling="yes"
                  className="w-full h-full relative z-10 bg-white"
                  title="Live Cricket Scores"
                />
              </div>
            </div>
          )}

        </div>
      </div>
    </Modal>
  );
};
