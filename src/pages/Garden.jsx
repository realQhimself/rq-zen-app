import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Volume2, VolumeX } from 'lucide-react';

// --- Garden Items (Pixel Art) ---
const BASE = import.meta.env.BASE_URL;
const GARDEN_ITEMS = [
  { id: 'lantern',  name: '禅灯',   cost: 20, image: `${BASE}images/garden/item-lantern.png`,  interaction: 'glow',   link: '/meditation', linkPrompt: '点灯禅修' },
  { id: 'bonsai',   name: '盆栽',   cost: 15, image: `${BASE}images/garden/item-bonsai.png`,   interaction: 'sway',   link: null, linkPrompt: null },
  { id: 'statue',   name: '佛像',   cost: 25, image: `${BASE}images/garden/item-statue.png`,   interaction: 'bow',    link: '/', linkPrompt: '参拜修行' },
  { id: 'pond',     name: '锦鲤池', cost: 20, image: `${BASE}images/garden/item-pond.png`,     interaction: 'ripple', link: '/fish', linkPrompt: '池边敲鱼' },
  { id: 'incense',  name: '香炉',   cost: 15, image: `${BASE}images/garden/item-incense.png`,  interaction: 'smoke',  link: '/sutra', linkPrompt: '焚香抄经' },
];

// --- Fixed NPCs (permanent garden fixtures) ---
const GARDEN_NPCS = [
  { id: 'buddha', name: '佛像', x: 50, y: 22 },
  { id: 'muyu',   name: '木鱼', x: 75, y: 40 },
];
const NPC_INTERACTION_RADIUS = 15;

// --- Buddha Statue SVG ---
const BuddhaStatueSVG = ({ glowing }) => (
  <svg viewBox="0 0 80 100" className="select-none" style={{
    width: 80, height: 100,
    filter: glowing ? 'drop-shadow(0 0 16px rgba(196,168,98,0.7))' : 'none',
    transition: 'filter 0.6s ease',
  }}>
    {glowing && (
      <circle cx="40" cy="28" r="28" fill="none" stroke="rgba(196,168,98,0.2)" strokeWidth="1" className="npc-halo" />
    )}
    {/* Ushnisha */}
    <ellipse cx="40" cy="11" rx="5" ry="6" fill="#d4b96a" />
    {/* Head */}
    <ellipse cx="40" cy="22" rx="12" ry="14" fill="#c4a862" />
    {/* Ears */}
    <ellipse cx="27" cy="24" rx="3" ry="6" fill="#b89d58" />
    <ellipse cx="53" cy="24" rx="3" ry="6" fill="#b89d58" />
    {/* Closed eyes */}
    <path d="M34 21 Q36 23 38 21" fill="none" stroke="#7a6a3a" strokeWidth="1" strokeLinecap="round" />
    <path d="M42 21 Q44 23 46 21" fill="none" stroke="#7a6a3a" strokeWidth="1" strokeLinecap="round" />
    {/* Serene smile */}
    <path d="M37 27 Q40 29 43 27" fill="none" stroke="#7a6a3a" strokeWidth="0.8" strokeLinecap="round" />
    {/* Neck */}
    <rect x="36" y="34" width="8" height="4" fill="#b39755" rx="2" />
    {/* Body / robe */}
    <path d="M20 44 Q28 37 40 36 Q52 37 60 44 L62 72 Q40 77 18 72 Z" fill="#b39755" />
    {/* Robe folds */}
    <path d="M28 46 Q36 54 38 64" fill="none" stroke="#a08845" strokeWidth="0.7" opacity="0.6" />
    <path d="M52 46 Q44 54 42 64" fill="none" stroke="#a08845" strokeWidth="0.7" opacity="0.6" />
    <path d="M24 55 Q40 60 56 55" fill="none" stroke="#a08845" strokeWidth="0.6" opacity="0.4" />
    {/* Hands in dhyana mudra */}
    <ellipse cx="40" cy="60" rx="12" ry="5" fill="#c4a862" opacity="0.9" />
    {/* Crossed legs */}
    <ellipse cx="40" cy="72" rx="24" ry="6" fill="#a08845" />
    {/* Lotus base */}
    <path d="M10 86 Q18 78 26 80 Q33 75 40 80 Q47 75 54 80 Q62 78 70 86 Q62 90 54 88 Q47 92 40 88 Q33 92 26 88 Q18 90 10 86Z" fill="#dcc88a" />
    <path d="M14 86 Q22 82 30 83 Q35 79 40 83 Q45 79 50 83 Q58 82 66 86" fill="none" stroke="#c4b078" strokeWidth="0.5" />
  </svg>
);

// --- Muyu Drum SVG ---
const MuyuDrumSVG = ({ hitting }) => (
  <svg viewBox="0 0 80 80" className="select-none" style={{
    width: 72, height: 72,
    transform: hitting ? 'scale(0.9)' : 'scale(1)',
    transition: 'transform 0.08s ease',
  }}>
    {/* Stand */}
    <path d="M28 65 L52 65" stroke="#4A2810" strokeWidth="3" strokeLinecap="round" />
    <rect x="36" y="52" width="3.5" height="14" fill="#5D3318" rx="1" />
    <rect x="40.5" y="52" width="3.5" height="14" fill="#5D3318" rx="1" />
    {/* Shadow */}
    <ellipse cx="40" cy="68" rx="18" ry="3" fill="rgba(0,0,0,0.08)" />
    {/* Drum body */}
    <ellipse cx="40" cy="34" rx="30" ry="24" fill="#8B4513" />
    <ellipse cx="40" cy="34" rx="27" ry="21" fill="#A0522D" />
    <ellipse cx="40" cy="34" rx="24" ry="18" fill="#B5633A" />
    {/* Scale pattern */}
    <path d="M22 28 Q30 34 22 38" fill="none" stroke="#8B4513" strokeWidth="0.8" opacity="0.4" />
    <path d="M28 24 Q36 30 28 34" fill="none" stroke="#8B4513" strokeWidth="0.8" opacity="0.4" />
    <path d="M52 24 Q44 30 52 34" fill="none" stroke="#8B4513" strokeWidth="0.8" opacity="0.4" />
    <path d="M58 28 Q50 34 58 38" fill="none" stroke="#8B4513" strokeWidth="0.8" opacity="0.4" />
    {/* Fish mouth */}
    <ellipse cx="40" cy="42" rx="7" ry="3.5" fill="#3D1F0A" />
    {/* Fish eyes */}
    <circle cx="30" cy="30" r="3" fill="#3D1F0A" />
    <circle cx="50" cy="30" r="3" fill="#3D1F0A" />
    <circle cx="30.5" cy="29.5" r="1.2" fill="#5D3318" />
    <circle cx="50.5" cy="29.5" r="1.2" fill="#5D3318" />
    {/* Highlight */}
    <ellipse cx="35" cy="26" rx="10" ry="5" fill="rgba(255,255,255,0.08)" />
    {/* Striker */}
    <line x1="64" y1="16" x2="52" y2="28" stroke="#5D3318" strokeWidth="3.5" strokeLinecap="round" />
    <circle cx="66" cy="14" r="5" fill="#8B4513" />
    <circle cx="66" cy="14" r="3.5" fill="#A0522D" />
    {/* Hit flash */}
    {hitting && <ellipse cx="48" cy="30" rx="8" ry="6" fill="rgba(255,255,200,0.4)" />}
  </svg>
);

// --- XP Helpers (reads unified profile) ---
const readProfile = () => {
  try { return JSON.parse(localStorage.getItem('zen_profile') || '{"totalXP":0,"spentXP":0}'); }
  catch { return { totalXP: 0, spentXP: 0 }; }
};
const writeProfile = (p) => localStorage.setItem('zen_profile', JSON.stringify(p));
const getBalance = () => { const p = readProfile(); return p.totalXP - p.spentXP; };
const addXP = (amount) => { const p = readProfile(); p.totalXP += amount; writeProfile(p); };
const spendXP = (amount) => { const p = readProfile(); p.spentXP += amount; writeProfile(p); };
const refundXP = (amount) => { const p = readProfile(); p.spentXP = Math.max(0, p.spentXP - amount); writeProfile(p); };

// --- Default State ---
const DEFAULT_GARDEN = {
  cycleStartDate: new Date().toISOString().split('T')[0],
  checkIns: [],
  items: [],
};

// --- Garden State Hook ---
const useGardenState = () => {
  const [garden, setGarden] = useState(() => {
    const saved = localStorage.getItem('zen_garden');
    if (saved) {
      try { return JSON.parse(saved); }
      catch { return { ...DEFAULT_GARDEN }; }
    }
    return { ...DEFAULT_GARDEN };
  });
  const [balance, setBalance] = useState(getBalance);

  useEffect(() => {
    localStorage.setItem('zen_garden', JSON.stringify(garden));
  }, [garden]);

  const today = new Date().toISOString().split('T')[0];
  const hasCheckedInToday = garden.checkIns.includes(today);

  const cycleStart = new Date(garden.cycleStartDate);
  const now = new Date(today);
  const cycleDay = Math.min(30, Math.floor((now - cycleStart) / (1000 * 60 * 60 * 24)) + 1);

  const checkIn = () => {
    if (hasCheckedInToday) return;
    addXP(10);
    setBalance(getBalance() + 10);
    setGarden(prev => ({
      ...prev,
      checkIns: [...prev.checkIns, today],
    }));
  };

  const placeItem = (type, x, y) => {
    const itemDef = GARDEN_ITEMS.find(i => i.id === type);
    if (!itemDef || balance < itemDef.cost) return false;
    spendXP(itemDef.cost);
    setBalance(prev => prev - itemDef.cost);
    setGarden(prev => ({
      ...prev,
      items: [...prev.items, { id: `item_${Date.now()}`, type, x, y }],
    }));
    return true;
  };

  const removeItem = (itemId) => {
    const item = garden.items.find(i => i.id === itemId);
    if (item) {
      const def = GARDEN_ITEMS.find(d => d.id === item.type);
      if (def) {
        refundXP(def.cost);
        setBalance(prev => prev + def.cost);
      }
    }
    setGarden(prev => ({
      ...prev,
      items: prev.items.filter(i => i.id !== itemId),
    }));
  };

  return { garden, balance, cycleDay, hasCheckedInToday, checkIn, placeItem, removeItem, setBalance };
};

// --- Monk Movement Constants ---
const MONK_SPEED = 0.4;
const INTERACTION_RADIUS = 12;
const BOUNDS = { minX: 5, maxX: 95, minY: 10, maxY: 85 };

// --- Device Detection Hook ---
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints >= 1 && window.innerWidth < 1024);
  });
  useEffect(() => {
    const check = () => {
      setIsMobile(
        /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
        (navigator.maxTouchPoints > 1 && window.innerWidth < 1024)
      );
    };
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
};

// --- Keyboard Controls Hook (Desktop) ---
const useKeyboardControls = (joystickRef, enabled) => {
  const keysRef = useRef(new Set());

  useEffect(() => {
    if (!enabled) return;
    const onDown = (e) => {
      const key = e.key.toLowerCase();
      if (['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(key)) {
        e.preventDefault();
        keysRef.current.add(key);
        updateJoystick();
      }
    };
    const onUp = (e) => {
      const key = e.key.toLowerCase();
      keysRef.current.delete(key);
      updateJoystick();
    };
    const updateJoystick = () => {
      const keys = keysRef.current;
      let dx = 0, dy = 0;
      if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
      if (keys.has('d') || keys.has('arrowright')) dx += 1;
      if (keys.has('w') || keys.has('arrowup')) dy -= 1;
      if (keys.has('s') || keys.has('arrowdown')) dy += 1;
      // Normalize diagonal
      if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }
      joystickRef.current = { dx, dy };
    };
    const onBlur = () => { keysRef.current.clear(); joystickRef.current = { dx: 0, dy: 0 }; };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [enabled, joystickRef]);
};

// --- Virtual Joystick Component (Mobile only, iPhone safe-area aware) ---
const VirtualJoystick = ({ joystickRef }) => {
  const stickRef = useRef(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  const centerRef = useRef({ x: 0, y: 0 });
  const OUTER_R = 44;
  const KNOB_R = 20;

  const handleStart = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const rect = stickRef.current.getBoundingClientRect();
    centerRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    setActive(true);
    handleMove(e);
  };

  const handleMove = (e) => {
    if (!active && !e.touches) return;
    e.preventDefault();
    const cx = centerRef.current.x;
    const cy = centerRef.current.y;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > OUTER_R) {
      dx = (dx / dist) * OUTER_R;
      dy = (dy / dist) * OUTER_R;
    }
    setKnobPos({ x: dx, y: dy });
    joystickRef.current = { dx: dx / OUTER_R, dy: dy / OUTER_R };
  };

  const handleEnd = (e) => {
    e.preventDefault();
    setActive(false);
    setKnobPos({ x: 0, y: 0 });
    joystickRef.current = { dx: 0, dy: 0 };
  };

  return (
    <div
      ref={stickRef}
      data-joystick="true"
      className="absolute left-4 z-30 touch-none"
      style={{
        width: OUTER_R * 2,
        height: OUTER_R * 2,
        bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px) + 8px)',
      }}
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
    >
      {/* Outer ring */}
      <div
        className="absolute inset-0 rounded-full border-2"
        style={{
          borderColor: active ? 'rgba(44,44,44,0.5)' : 'rgba(44,44,44,0.25)',
          background: active ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.4)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
        }}
      />
      {/* Inner knob */}
      <div
        className="absolute rounded-full"
        style={{
          width: KNOB_R * 2,
          height: KNOB_R * 2,
          left: OUTER_R - KNOB_R + knobPos.x,
          top: OUTER_R - KNOB_R + knobPos.y,
          background: active ? 'rgba(44,44,44,0.6)' : 'rgba(44,44,44,0.35)',
          boxShadow: active ? '0 2px 8px rgba(0,0,0,0.25)' : '0 1px 4px rgba(0,0,0,0.12)',
          transition: active ? 'none' : 'all 0.15s ease',
        }}
      />
      {/* Direction arrows hint */}
      {!active && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path d="M14 4L14 24M4 14L24 14" stroke="#2c2c2c" strokeWidth="2" strokeLinecap="round"/>
            <path d="M14 4L10 8M14 4L18 8" stroke="#2c2c2c" strokeWidth="2" strokeLinecap="round"/>
            <path d="M14 24L10 20M14 24L18 20" stroke="#2c2c2c" strokeWidth="2" strokeLinecap="round"/>
            <path d="M4 14L8 10M4 14L8 18" stroke="#2c2c2c" strokeWidth="2" strokeLinecap="round"/>
            <path d="M24 14L20 10M24 14L20 18" stroke="#2c2c2c" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
      )}
    </div>
  );
};

// --- Delete Confirmation Modal ---
const DeleteModal = ({ itemName, onConfirm, onCancel }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="absolute inset-0 z-50 flex items-center justify-center"
  >
    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onCancel} />
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      className="relative bg-white/90 backdrop-blur-xl rounded-2xl p-6 shadow-2xl border border-white/50 mx-8 max-w-xs w-full text-center"
    >
      <p className="font-serif text-zen-ink text-lg mb-1">移除 {itemName}？</p>
      <p className="text-xs text-zen-stone mb-5">功德将返还</p>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl bg-zen-sand/60 text-zen-stone font-serif text-sm active:bg-zen-sand transition"
        >
          取消
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-2.5 rounded-xl bg-zen-red text-white font-serif text-sm active:bg-red-900 transition"
        >
          确认移除
        </button>
      </div>
    </motion.div>
  </motion.div>
);

// --- Garden Page ---
export default function Garden() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { garden, balance, cycleDay, hasCheckedInToday, checkIn, placeItem, removeItem } = useGardenState();
  const [floatingPoints, setFloatingPoints] = useState([]);
  const gardenRef = useRef(null);

  // Monk state
  const [monkPos, setMonkPos] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('zen_monk_pos'));
      if (saved && saved.x && saved.y) return saved;
    } catch {}
    return { x: 50, y: 50 };
  });
  const [monkDirection, setMonkDirection] = useState('idle');
  const joystickRef = useRef({ dx: 0, dy: 0 });
  const monkPosRef = useRef(monkPos);
  const animFrameRef = useRef(null);

  // Keyboard controls for desktop
  useKeyboardControls(joystickRef, !isMobile);

  // Interaction state
  const [activeInteractions, setActiveInteractions] = useState(new Set());

  // Long-press delete state
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const longPressTimerRef = useRef(null);
  const longPressTouchStart = useRef(null);
  const [longPressProgress, setLongPressProgress] = useState(null);

  // --- NPC State ---
  const [npcProximity, setNpcProximity] = useState(new Set());

  // Muyu sound
  const muyuPoolRef = useRef([]);
  const muyuPoolIdx = useRef(0);
  const [muyuHitting, setMuyuHitting] = useState(false);

  // Background music
  const audioRef = useRef(null);
  const [isMuted, setIsMuted] = useState(() => {
    try { return JSON.parse(localStorage.getItem('zen_garden_muted') ?? 'false'); }
    catch { return false; }
  });

  useEffect(() => {
    const audio = new Audio(`${BASE}audio/garden.mp3`);
    audio.loop = true;
    audio.volume = 0.4;
    audioRef.current = audio;

    if (!isMuted) {
      audio.play().catch(() => {});
    }

    return () => {
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isMuted) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }
    localStorage.setItem('zen_garden_muted', JSON.stringify(isMuted));
  }, [isMuted]);

  // Muyu audio pool (3 elements for rapid tapping)
  useEffect(() => {
    const pool = [];
    for (let i = 0; i < 3; i++) {
      const audio = new Audio(`${BASE}audio/muyu-sample2.mp3`);
      audio.volume = 0.7;
      pool.push(audio);
    }
    muyuPoolRef.current = pool;
    return () => pool.forEach(a => { a.pause(); a.src = ''; });
  }, []);

  // Item placement state
  const [showPicker, setShowPicker] = useState(false);
  const [placingItem, setPlacingItem] = useState(null);
  const [ghostPos, setGhostPos] = useState(null);

  // --- Game Loop ---
  const gameLoop = useCallback(() => {
    const { dx, dy } = joystickRef.current;
    const isMoving = Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1;

    if (isMoving) {
      const pos = monkPosRef.current;
      const newX = Math.max(BOUNDS.minX, Math.min(BOUNDS.maxX, pos.x + dx * MONK_SPEED));
      const newY = Math.max(BOUNDS.minY, Math.min(BOUNDS.maxY, pos.y + dy * MONK_SPEED));
      const newPos = { x: newX, y: newY };
      monkPosRef.current = newPos;
      setMonkPos(newPos);

      if (Math.abs(dx) > 0.15) {
        setMonkDirection(dx < 0 ? 'left' : 'right');
      }
    } else {
      setMonkDirection(prev => prev !== 'idle' ? 'idle' : prev);
    }

    // Proximity detection
    const newInteractions = new Set();
    for (const item of garden.items) {
      const dist = Math.sqrt(
        Math.pow(monkPosRef.current.x - item.x, 2) +
        Math.pow(monkPosRef.current.y - item.y, 2)
      );
      if (dist < INTERACTION_RADIUS) {
        newInteractions.add(item.id);
      }
    }
    setActiveInteractions(prev => {
      if (prev.size !== newInteractions.size || [...prev].some(id => !newInteractions.has(id))) {
        return newInteractions;
      }
      return prev;
    });

    // NPC proximity detection
    const newNpcProximity = new Set();
    for (const npc of GARDEN_NPCS) {
      const dist = Math.sqrt(
        Math.pow(monkPosRef.current.x - npc.x, 2) +
        Math.pow(monkPosRef.current.y - npc.y, 2)
      );
      if (dist < NPC_INTERACTION_RADIUS) {
        newNpcProximity.add(npc.id);
      }
    }
    setNpcProximity(prev => {
      if (prev.size !== newNpcProximity.size || [...prev].some(id => !newNpcProximity.has(id))) {
        return newNpcProximity;
      }
      return prev;
    });

    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, [garden.items]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      localStorage.setItem('zen_monk_pos', JSON.stringify(monkPosRef.current));
    };
  }, [gameLoop]);

  useEffect(() => {
    const interval = setInterval(() => {
      localStorage.setItem('zen_monk_pos', JSON.stringify(monkPosRef.current));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // --- Long Press Handlers ---
  const handleItemTouchStart = (e, item) => {
    if (placingItem) return;
    e.stopPropagation();
    const touch = e.touches ? e.touches[0] : e;
    longPressTouchStart.current = { x: touch.clientX, y: touch.clientY };
    setLongPressProgress({ itemId: item.id });

    longPressTimerRef.current = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(50);
      const def = GARDEN_ITEMS.find(d => d.id === item.type);
      setDeleteCandidate({ itemId: item.id, itemName: def?.name || item.type });
      setShowDeleteConfirm(true);
      setLongPressProgress(null);
    }, 1000);
  };

  const handleItemTouchMove = (e) => {
    if (!longPressTouchStart.current) return;
    const touch = e.touches ? e.touches[0] : e;
    const dx = touch.clientX - longPressTouchStart.current.x;
    const dy = touch.clientY - longPressTouchStart.current.y;
    if (Math.sqrt(dx * dx + dy * dy) > 10) {
      clearTimeout(longPressTimerRef.current);
      setLongPressProgress(null);
    }
  };

  const handleItemTouchEnd = () => {
    clearTimeout(longPressTimerRef.current);
    longPressTouchStart.current = null;
    setLongPressProgress(null);
  };

  const confirmDelete = () => {
    if (deleteCandidate) {
      removeItem(deleteCandidate.itemId);
      if (navigator.vibrate) navigator.vibrate(30);
    }
    setShowDeleteConfirm(false);
    setDeleteCandidate(null);
  };

  // --- Placement Handlers ---
  const handleGardenTap = (e) => {
    if (showPicker || showDeleteConfirm) return;
    if (e.target.closest('[data-garden-item]') || e.target.closest('[data-joystick]')) return;

    const rect = gardenRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = Math.max(5, Math.min(95, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(5, Math.min(90, ((clientY - rect.top) / rect.height) * 100));

    if (placingItem) {
      const success = placeItem(placingItem, x, y);
      if (success && navigator.vibrate) navigator.vibrate(30);
      setPlacingItem(null);
      setGhostPos(null);
    }
  };

  const handleGardenTouchMove = (e) => {
    if (!placingItem) return;
    const rect = gardenRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const x = Math.max(5, Math.min(95, ((touch.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(5, Math.min(90, ((touch.clientY - rect.top) / rect.height) * 100));
    setGhostPos({ x, y });
  };

  const handlePickerSelect = (itemType) => {
    setPlacingItem(itemType);
    setShowPicker(false);
  };

  const cancelPlacement = () => {
    setPlacingItem(null);
    setGhostPos(null);
  };

  // --- Check-in ---
  const handleCheckIn = () => {
    if (hasCheckedInToday) return;
    checkIn();
    if (navigator.vibrate) navigator.vibrate(50);
    const id = Date.now();
    setFloatingPoints(prev => [...prev, { id }]);
    setTimeout(() => setFloatingPoints(prev => prev.filter(p => p.id !== id)), 1200);
  };

  // --- Navigation from item ---
  const handleItemNavigate = (link) => {
    if (navigator.vibrate) navigator.vibrate(30);
    navigate(link);
  };

  // --- Muyu Tap → Navigate to Fish/木鱼 page ---
  const handleMuyuTap = () => {
    if (!isMuted) {
      const pool = muyuPoolRef.current;
      if (pool.length > 0) {
        const audio = pool[muyuPoolIdx.current % pool.length];
        audio.currentTime = 0;
        audio.play().catch(() => {});
        muyuPoolIdx.current++;
      }
    }
    if (navigator.vibrate) navigator.vibrate(30);
    setMuyuHitting(true);
    setTimeout(() => navigate('/fish'), 200);
  };

  // --- Buddha Tap → Navigate to Meditation/禅修 page ---
  const handleBuddhaTap = () => {
    if (navigator.vibrate) navigator.vibrate(30);
    navigate('/meditation');
  };

  // --- Get interaction CSS class for an item ---
  const getInteractionClass = (item) => {
    if (!activeInteractions.has(item.id)) return '';
    const def = GARDEN_ITEMS.find(d => d.id === item.type);
    if (!def) return '';
    switch (def.interaction) {
      case 'glow': return 'garden-item-glow';
      case 'sway': return 'garden-item-sway';
      case 'ripple': return 'garden-item-ripple';
      case 'smoke': return 'garden-item-smoke';
      default: return '';
    }
  };

  // --- Monk sprite source ---
  const monkSprite = monkDirection === 'left'
    ? `${BASE}images/garden/monk-left.png`
    : monkDirection === 'right'
      ? `${BASE}images/garden/monk-right.png`
      : `${BASE}images/garden/monk-idle.png`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col relative overflow-hidden select-none touch-manipulation"
    >
      {/* HUD */}
      <div className="absolute top-0 left-0 right-0 h-14 flex items-center justify-between px-4 z-20">
        <div className="flex flex-col">
          <span className="text-xs text-zen-stone font-serif bg-white/40 backdrop-blur-sm px-3 py-1 rounded-full">
            第 {cycleDay} 天 / 30
          </span>
          <div className="mt-1 ml-1 h-0.5 w-16 bg-zen-stone/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-zen-red/50 to-zen-gold/40 rounded-full transition-all duration-500"
              style={{ width: `${(cycleDay / 30) * 100}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMuted(m => !m)}
            className="w-8 h-8 flex items-center justify-center bg-white/50 backdrop-blur-sm rounded-full border border-white/40 text-zen-ink active:bg-white/70 transition"
            aria-label={isMuted ? '取消静音' : '静音'}
          >
            {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          <div className="flex items-center gap-1.5 bg-white/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <span className="text-zen-red text-xs">●</span>
            <span className="text-sm font-mono font-bold text-zen-ink">{balance}</span>
          </div>
        </div>
      </div>

      {/* Placement mode banner */}
      <AnimatePresence>
        {placingItem && (
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            className="absolute top-14 left-4 right-4 z-20 bg-zen-gold/80 backdrop-blur-sm rounded-xl px-4 py-2 flex items-center justify-between"
          >
            <span className="text-xs font-serif text-white font-bold">
              点击花园放置 {GARDEN_ITEMS.find(i => i.id === placingItem)?.name}
            </span>
            <button onClick={cancelPlacement} className="p-1 text-white/80 active:text-white">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Garden Surface */}
      <div
        ref={gardenRef}
        onClick={handleGardenTap}
        onTouchMove={handleGardenTouchMove}
        className="flex-1 relative"
        style={{
          backgroundImage: `url(${BASE}images/garden-bg.png)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: '#e8e4dc',
        }}
      >
        {/* Garden border */}
        <div className="absolute inset-2 border border-zen-stone/15 rounded pointer-events-none" />
        <div className="absolute inset-3.5 border border-zen-stone/8 rounded pointer-events-none" />

        {/* Ambient Particles */}
        {[...Array(4)].map((_, i) => (
          <div
            key={`particle-${i}`}
            className="zen-particle"
            style={{
              left: `${15 + i * 22}%`,
              top: `${20 + (i % 2) * 30}%`,
              '--size': `${2 + i}px`,
              '--duration': `${10 + i * 3}s`,
              '--delay': `${i * 2.5}s`,
              '--dx': `${(i % 2 === 0 ? 20 : -20)}px`,
              '--dy': `-${40 + i * 15}px`,
              '--dx2': `${(i % 2 === 0 ? -10 : 10)}px`,
              '--dy2': `-${80 + i * 20}px`,
              '--max-opacity': '0.25',
            }}
          />
        ))}

        {/* Placed Items (z-5) */}
        {garden.items.map((item) => {
          const def = GARDEN_ITEMS.find(d => d.id === item.type);
          if (!def) return null;
          const isNearMonk = activeInteractions.has(item.id);
          const interactionClass = getInteractionClass(item);
          const isBeingDeleted = longPressProgress?.itemId === item.id;
          const hasLink = def.link && isNearMonk;

          return (
            <div
              key={item.id}
              data-garden-item="true"
              className={`absolute ${interactionClass}`}
              style={{
                left: `${item.x}%`,
                top: `${item.y}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 5,
                pointerEvents: placingItem ? 'none' : 'auto',
              }}
              onTouchStart={(e) => handleItemTouchStart(e, item)}
              onTouchMove={handleItemTouchMove}
              onTouchEnd={handleItemTouchEnd}
              onMouseDown={(e) => handleItemTouchStart(e, item)}
              onMouseMove={handleItemTouchMove}
              onMouseUp={handleItemTouchEnd}
              onMouseLeave={handleItemTouchEnd}
            >
              <img
                src={def.image}
                alt={def.name}
                className="w-16 h-16 select-none"
                style={{ imageRendering: 'pixelated' }}
                draggable={false}
              />

              {/* Navigation prompt when monk is near a linked item */}
              <AnimatePresence>
                {hasLink && (
                  <motion.button
                    initial={{ opacity: 0, y: 8, scale: 0.8 }}
                    animate={{ opacity: 1, y: -6, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.8 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    onClick={(e) => { e.stopPropagation(); handleItemNavigate(def.link); }}
                    className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1.5 rounded-full font-serif text-xs font-bold text-white shadow-lg active:scale-95 transition-transform"
                    style={{
                      background: 'linear-gradient(135deg, rgba(138,59,59,0.9), rgba(196,168,98,0.9))',
                      boxShadow: '0 3px 12px rgba(138,59,59,0.3)',
                    }}
                  >
                    {def.linkPrompt}
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Floating name label (only for non-linked items when monk is near) */}
              <AnimatePresence>
                {isNearMonk && !def.link && (
                  <motion.span
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: -4 }}
                    exit={{ opacity: 0 }}
                    className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-serif text-zen-ink bg-white/60 backdrop-blur-sm px-2 py-0.5 rounded-full whitespace-nowrap pointer-events-none"
                  >
                    {def.name}
                  </motion.span>
                )}
              </AnimatePresence>

              {/* Long-press delete progress ring */}
              {isBeingDeleted && (
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox="0 0 64 64"
                >
                  <circle
                    cx="32" cy="32" r="25"
                    fill="none"
                    stroke="rgba(138,59,59,0.6)"
                    strokeWidth="3"
                    strokeDasharray="157"
                    className="delete-ring"
                    style={{ transformOrigin: 'center', transform: 'rotate(-90deg)' }}
                  />
                </svg>
              )}
            </div>
          );
        })}

        {/* === Fixed NPCs === */}

        {/* Buddha Statue */}
        <div
          className="absolute"
          style={{
            left: '50%',
            top: '22%',
            transform: 'translate(-50%, -50%)',
            zIndex: 6,
          }}
        >
          <BuddhaStatueSVG glowing={npcProximity.has('buddha')} />

          {/* Navigate to meditation */}
          <AnimatePresence>
            {npcProximity.has('buddha') && (
              <motion.button
                initial={{ opacity: 0, y: 8, scale: 0.8 }}
                animate={{ opacity: 1, y: -6, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.8 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                onClick={(e) => { e.stopPropagation(); handleBuddhaTap(); }}
                className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1.5 rounded-full font-serif text-xs font-bold text-white shadow-lg active:scale-95 transition-transform"
                style={{
                  background: 'linear-gradient(135deg, rgba(196,168,98,0.9), rgba(138,59,59,0.9))',
                  boxShadow: '0 3px 12px rgba(196,168,98,0.3)',
                }}
              >
                参拜禅修
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Big Muyu Drum */}
        <div
          className="absolute"
          data-garden-item="true"
          style={{
            left: '75%',
            top: '40%',
            transform: 'translate(-50%, -50%)',
            zIndex: 6,
          }}
        >
          <div
            onClick={(e) => {
              if (npcProximity.has('muyu')) {
                e.stopPropagation();
                handleMuyuTap();
              }
            }}
            style={{ cursor: npcProximity.has('muyu') ? 'pointer' : 'default' }}
          >
            <MuyuDrumSVG hitting={muyuHitting} />
          </div>

          {/* Navigate to fish/muyu page */}
          <AnimatePresence>
            {npcProximity.has('muyu') && (
              <motion.button
                initial={{ opacity: 0, y: 8, scale: 0.8 }}
                animate={{ opacity: 1, y: -6, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.8 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                onClick={(e) => { e.stopPropagation(); handleMuyuTap(); }}
                className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1.5 rounded-full font-serif text-xs font-bold text-white shadow-lg active:scale-95 transition-transform"
                style={{
                  background: 'linear-gradient(135deg, rgba(139,69,19,0.9), rgba(160,82,45,0.9))',
                  boxShadow: '0 3px 12px rgba(139,69,19,0.3)',
                }}
              >
                敲木鱼
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Ghost preview during placement */}
        {placingItem && ghostPos && (
          <div
            className="absolute placement-ghost"
            style={{
              left: `${ghostPos.x}%`,
              top: `${ghostPos.y}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 8,
            }}
          >
            <img
              src={GARDEN_ITEMS.find(i => i.id === placingItem)?.image}
              alt=""
              className="w-16 h-16"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
        )}

        {/* Monk (z-10) */}
        <div
          className={`absolute ${monkDirection === 'idle' ? 'monk-idle' : ''}`}
          style={{
            left: `${monkPos.x}%`,
            top: `${monkPos.y}%`,
            transform: 'translate(-50%, -50%)',
            zIndex: 10,
            transition: 'left 0.05s linear, top 0.05s linear',
          }}
        >
          <img
            src={monkSprite}
            alt="monk"
            className="w-12 h-12 select-none"
            style={{ imageRendering: 'pixelated' }}
            draggable={false}
          />
        </div>
      </div>

      {/* Controls: joystick for mobile, keyboard hint for desktop */}
      {isMobile ? (
        <VirtualJoystick joystickRef={joystickRef} />
      ) : (
        <div
          className="absolute left-4 z-30 flex items-center gap-2 bg-white/50 backdrop-blur-sm px-3 py-2 rounded-xl border border-white/40"
          style={{ bottom: 'calc(5rem + 8px)' }}
        >
          <div className="flex flex-col items-center gap-0.5">
            <kbd className="w-6 h-6 bg-white/70 border border-zen-stone/20 rounded text-[10px] font-mono flex items-center justify-center text-zen-ink shadow-sm">W</kbd>
            <div className="flex gap-0.5">
              <kbd className="w-6 h-6 bg-white/70 border border-zen-stone/20 rounded text-[10px] font-mono flex items-center justify-center text-zen-ink shadow-sm">A</kbd>
              <kbd className="w-6 h-6 bg-white/70 border border-zen-stone/20 rounded text-[10px] font-mono flex items-center justify-center text-zen-ink shadow-sm">S</kbd>
              <kbd className="w-6 h-6 bg-white/70 border border-zen-stone/20 rounded text-[10px] font-mono flex items-center justify-center text-zen-ink shadow-sm">D</kbd>
            </div>
          </div>
          <span className="text-[10px] text-zen-stone font-serif">移动</span>
        </div>
      )}

      {/* Bottom-right buttons */}
      <div
        className="absolute right-4 z-30 flex flex-col gap-3 items-center"
        style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px) + 8px)' }}
      >
        {/* Place Item button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation();
            if (placingItem) {
              cancelPlacement();
            } else {
              setShowPicker(true);
            }
          }}
          className="w-12 h-12 rounded-full flex items-center justify-center bg-white/70 backdrop-blur-sm text-zen-ink border border-white/50 shadow-md active:bg-white/90 transition"
        >
          <Plus size={22} />
        </motion.button>

        {/* Check-in button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={(e) => { e.stopPropagation(); handleCheckIn(); }}
          disabled={hasCheckedInToday}
          className={`w-14 h-14 rounded-full flex items-center justify-center font-serif text-sm font-bold ${
            hasCheckedInToday
              ? 'bg-gray-300 text-gray-500 shadow-md'
              : 'bg-zen-red text-white active:bg-red-900 shadow-[0_4px_15px_rgba(138,59,59,0.35)]'
          }`}
        >
          {hasCheckedInToday ? '已签' : '打卡'}
        </motion.button>

        {/* Floating +10 */}
        <AnimatePresence>
          {floatingPoints.map(p => (
            <motion.div
              key={p.id}
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 0, y: -60 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="absolute -top-2 left-1/2 -translate-x-1/2 text-zen-red font-bold text-sm pointer-events-none whitespace-nowrap"
            >
              +10 功德
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Item Picker Bottom Sheet */}
      <AnimatePresence>
        {showPicker && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm z-30"
              onClick={() => setShowPicker(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 bg-white/85 backdrop-blur-xl rounded-t-2xl p-6 pb-safe z-40 shadow-2xl border-t border-white/50"
            >
              <div className="text-center mb-4">
                <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-3" />
                <h3 className="font-serif font-bold text-zen-ink">选择物品</h3>
                <p className="text-xs text-zen-stone mt-1">
                  选择后点击花园放置 · 功德: <span className="font-mono">{balance}</span>
                </p>
              </div>
              <div className="flex justify-around items-end">
                {GARDEN_ITEMS.map(item => {
                  const canAfford = balance >= item.cost;
                  return (
                    <motion.button
                      key={item.id}
                      whileTap={canAfford ? { scale: 0.9 } : {}}
                      onClick={() => canAfford && handlePickerSelect(item.id)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl transition ${
                        canAfford ? 'active:bg-gray-100' : 'opacity-30 cursor-not-allowed'
                      }`}
                    >
                      <div className="w-14 h-14 flex items-center justify-center">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-12 h-12"
                          style={{ imageRendering: 'pixelated' }}
                        />
                      </div>
                      <span className="text-xs font-serif">{item.name}</span>
                      <span className="text-xs text-zen-stone font-mono">{item.cost}</span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && deleteCandidate && (
          <DeleteModal
            itemName={deleteCandidate.itemName}
            onConfirm={confirmDelete}
            onCancel={() => { setShowDeleteConfirm(false); setDeleteCandidate(null); }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
