import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Volume2, VolumeX } from 'lucide-react';
import useWeather from '../hooks/useWeather';
import { SkyOverlay, Stars, CloudOverlay, RainEffect, SnowEffect, FogEffect, SeasonalEffect, WeatherIndicator } from '../components/WeatherEffects';
import { safeLoad, safeSave, KEYS } from '../utils/zen';
import { GARDEN_ITEMS } from '../components/garden/gardenData';
import { BuddhaNPC, MuyuNPC } from '../components/garden/NPCs';
import { KeyboardHint } from '../components/garden/VirtualJoystick';
import ItemPicker from '../components/garden/ItemPicker';
import ItemRenderer from '../components/garden/ItemRenderer';
import useGardenState from '../hooks/useGardenState';
import useGardenAmbience from '../hooks/useGardenAmbience';
import { useIsMobile, useKeyboardControls, useMonkMovement } from '../hooks/useMonkMovement';

const BASE = import.meta.env.BASE_URL;

export default function Garden() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { garden, balance, cycleDay, hasCheckedInToday, checkIn, placeItem, removeItem } = useGardenState();
  const weather = useWeather();
  const [floatingPoints, setFloatingPoints] = useState([]);
  const gardenRef = useRef(null);
  const touchStartRef = useRef(null); // track touch start time for tap detection

  // Monk movement
  const joystickRef = useRef({ dx: 0, dy: 0 });
  useKeyboardControls(joystickRef, true); // keyboard always enabled
  const { monkPos, monkDirection, activeInteractions, npcProximity, setTarget, moveTarget, idleState } = useMonkMovement(joystickRef, garden.items);

  // Muyu sound
  const muyuPoolRef = useRef([]);
  const muyuPoolIdx = useRef(0);
  const [muyuHitting, setMuyuHitting] = useState(false);

  // Background music
  const audioRef = useRef(null);
  const [isMuted, setIsMuted] = useState(() => safeLoad(KEYS.GARDEN_MUTED, false));

  // Ambient audio layers (birds, crickets, rain — reacts to weather/time)
  useGardenAmbience(weather, isMuted);

  useEffect(() => {
    const audio = new Audio(`${BASE}audio/garden.mp3`);
    audio.loop = true;
    audio.volume = 0.4;
    audioRef.current = audio;
    if (!isMuted) audio.play().catch(() => {});
    return () => { audio.pause(); audio.src = ''; audioRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isMuted) audio.pause();
    else audio.play().catch(() => {});
    safeSave(KEYS.GARDEN_MUTED, isMuted);
  }, [isMuted]);

  // Muyu audio pool
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

  // Placement ding sound (800Hz sine wave, 100ms)
  const playPlacementDing = useRef(() => {});
  useEffect(() => {
    playPlacementDing.current = () => {
      if (isMuted) return;
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 800;
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
        // Clean up AudioContext after sound finishes
        setTimeout(() => ctx.close().catch(() => {}), 200);
      } catch { /* AudioContext not available */ }
    };
  }, [isMuted]);

  // Item placement state
  const [showPicker, setShowPicker] = useState(false);
  const [placingItem, setPlacingItem] = useState(null);
  const [ghostPos, setGhostPos] = useState(null);
  const [newlyPlacedId, setNewlyPlacedId] = useState(null);

  // --- Handlers ---
  // Resolve tap position from either mouse or touch event
  const resolveTapPos = (e) => {
    const rect = gardenRef.current.getBoundingClientRect();
    const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
    return {
      x: Math.max(5, Math.min(95, ((clientX - rect.left) / rect.width) * 100)),
      y: Math.max(5, Math.min(90, ((clientY - rect.top) / rect.height) * 100)),
    };
  };

  const handleGardenTap = (e) => {
    if (showPicker) return;
    if (e.target.closest('[data-garden-item]')) return;
    const { x, y } = resolveTapPos(e);

    if (placingItem) {
      const newItemId = placeItem(placingItem, x, y);
      if (newItemId) {
        if (navigator.vibrate) navigator.vibrate(30);
        playPlacementDing.current();
        // Track the newly placed item for spring-in animation
        setNewlyPlacedId(newItemId);
        setTimeout(() => setNewlyPlacedId(null), 600);
      }
      setPlacingItem(null);
      setGhostPos(null);
    } else {
      setTarget(x, y);
    }
  };

  // Touch handlers: only trigger move on quick tap (<300ms), prevents "save image" prompt
  const handleTouchStart = (e) => {
    touchStartRef.current = Date.now();
  };

  const handleTouchEnd = (e) => {
    const elapsed = Date.now() - (touchStartRef.current || 0);
    if (elapsed < 300) {
      // Quick tap — treat as move/place
      handleGardenTap(e);
    }
    touchStartRef.current = null;
  };

  const handleGardenTouchMove = (e) => {
    if (!placingItem) return;
    const rect = gardenRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const x = Math.max(5, Math.min(95, ((touch.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(5, Math.min(90, ((touch.clientY - rect.top) / rect.height) * 100));
    setGhostPos({ x, y });
  };

  const handleCheckIn = () => {
    if (hasCheckedInToday) return;
    checkIn();
    if (navigator.vibrate) navigator.vibrate(50);
    const id = Date.now();
    setFloatingPoints(prev => [...prev, { id }]);
    setTimeout(() => setFloatingPoints(prev => prev.filter(p => p.id !== id)), 1200);
  };

  const handleItemNavigate = (link) => {
    if (navigator.vibrate) navigator.vibrate(30);
    navigate(link);
  };

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

  const handleBuddhaTap = () => {
    if (navigator.vibrate) navigator.vibrate(30);
    navigate('/meditation');
  };

  // Walk animation frame cycling (1-4)
  const [walkFrame, setWalkFrame] = useState(1);
  const walkIntervalRef = useRef(null);
  const isMoving = monkDirection === 'left' || monkDirection === 'right';

  useEffect(() => {
    if (isMoving) {
      setWalkFrame(1);
      walkIntervalRef.current = setInterval(() => {
        setWalkFrame(prev => (prev % 4) + 1);
      }, 150);
    } else {
      clearInterval(walkIntervalRef.current);
      walkIntervalRef.current = null;
    }
    return () => { clearInterval(walkIntervalRef.current); };
  }, [isMoving]);

  // --- Footstep sounds (procedural gravel crunch via Web Audio API) ---
  const footstepCtxRef = useRef(null);
  const lastStepTimeRef = useRef(0);
  const STEP_INTERVAL = 350; // ms between steps

  const playFootstep = useCallback(() => {
    if (isMuted) return;
    try {
      if (!footstepCtxRef.current || footstepCtxRef.current.state === 'closed') {
        footstepCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = footstepCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;
      const duration = 0.08;

      // White noise buffer for gravel texture
      const bufferSize = Math.ceil(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1);
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      // Bandpass filter for gravel character — randomize pitch ±20%
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 800 * (0.8 + Math.random() * 0.4);
      filter.Q.value = 1;

      // Gain envelope: quick attack, fast decay
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      source.start(now);
      source.stop(now + duration);
    } catch { /* AudioContext not available */ }
  }, [isMuted]);

  useEffect(() => {
    if (!isMoving) return;
    const interval = setInterval(() => {
      const now = Date.now();
      if (now - lastStepTimeRef.current >= STEP_INTERVAL) {
        lastStepTimeRef.current = now;
        playFootstep();
      }
    }, 50); // check frequently, but only play at STEP_INTERVAL cadence
    return () => clearInterval(interval);
  }, [isMoving, playFootstep]);

  // Clean up footstep AudioContext on unmount
  useEffect(() => {
    return () => {
      if (footstepCtxRef.current && footstepCtxRef.current.state !== 'closed') {
        footstepCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  const SPRITE = `${BASE}images/garden/new-sprites/`;
  let monkSprite;
  if (monkDirection === 'left') {
    monkSprite = `${SPRITE}monk-walk-l${walkFrame}.png`;
  } else if (monkDirection === 'right') {
    monkSprite = `${SPRITE}monk-walk-r${walkFrame}.png`;
  } else if (idleState === 'sitting' || idleState === 'sleeping') {
    monkSprite = `${SPRITE}monk-sit.png`;
  } else {
    monkSprite = `${SPRITE}monk-idle.png`;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col relative overflow-hidden select-none touch-manipulation"
      onContextMenu={e => e.preventDefault()}
      style={{ WebkitTouchCallout: 'none' }}
    >
      {/* HUD */}
      <div className="absolute top-0 left-0 right-0 h-14 flex items-center justify-between px-4 z-20 garden-hud">
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
          {!weather.loading && (
            <WeatherIndicator
              condition={weather.condition}
              timeOfDay={weather.timeOfDay}
              temperature={weather.temperature}
            />
          )}
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
            <button onClick={() => { setPlacingItem(null); setGhostPos(null); }} aria-label="取消放置" className="p-1 text-white/80 active:text-white">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Garden Surface */}
      <div
        ref={gardenRef}
        onClick={(e) => { if (!('ontouchstart' in window)) handleGardenTap(e); }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
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

        {/* Weather overlays */}
        <SkyOverlay timeOfDay={weather.timeOfDay} />
        <Stars timeOfDay={weather.timeOfDay} />
        <CloudOverlay condition={weather.condition} />
        <RainEffect condition={weather.condition} />
        <SnowEffect condition={weather.condition} />
        <FogEffect condition={weather.condition} />
        <SeasonalEffect season={weather.season} timeOfDay={weather.timeOfDay} condition={weather.condition} />

        {/* Color harmonizer */}
        <div
          className="absolute inset-0 pointer-events-none mix-blend-multiply"
          style={{ background: 'rgba(232,228,220,0.25)', zIndex: 0 }}
        />

        {/* Vignette */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 70% 60% at 50% 45%, transparent 50%, rgba(44,44,44,0.12) 100%)',
            zIndex: 99,
          }}
        />

        {/* Paper grain texture */}
        <div className="garden-grain" />

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

        {/* Placed Items */}
        <ItemRenderer
          items={garden.items}
          activeInteractions={activeInteractions}
          placingItem={placingItem}
          onRemove={removeItem}
          onNavigate={handleItemNavigate}
          newlyPlacedId={newlyPlacedId}
        />

        {/* Fixed NPCs */}
        <BuddhaNPC npcProximity={npcProximity} onTap={handleBuddhaTap} />
        <MuyuNPC npcProximity={npcProximity} muyuHitting={muyuHitting} onTap={handleMuyuTap} />

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
              className="w-14 h-14"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
        )}

        {/* Monk */}
        <div
          className={`absolute ${monkDirection === 'idle' ? 'monk-idle' : ''} ${idleState === 'sitting' ? 'monk-sitting' : ''}`}
          style={{
            left: `${monkPos.x}%`,
            top: `${monkPos.y}%`,
            transform: 'translate(-50%, -50%)',
            zIndex: Math.floor(monkPos.y),
            transition: 'left 0.05s linear, top 0.05s linear',
          }}
        >
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-2.5 rounded-full"
            style={{ background: 'radial-gradient(ellipse, rgba(0,0,0,0.18), transparent)', filter: 'blur(1px)' }}
          />
          <img
            src={monkSprite}
            alt="monk"
            className="w-14 h-14 select-none"
            style={{ imageRendering: 'pixelated' }}
            draggable={false}
          />

          {/* Zzz bubble when sleeping */}
          <AnimatePresence>
            {idleState === 'sleeping' && (
              <motion.div
                key="zzz"
                className="absolute -top-6 -right-2 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                {['Z', 'z', 'z'].map((char, i) => (
                  <motion.span
                    key={i}
                    className="absolute font-serif font-bold text-zen-stone/70"
                    style={{ fontSize: `${14 - i * 3}px` }}
                    initial={{ opacity: 0, y: 0, x: i * 6 }}
                    animate={{
                      opacity: [0, 0.8, 0],
                      y: [0, -16 - i * 6],
                      x: [i * 6, i * 6 + 4],
                    }}
                    transition={{
                      duration: 2.5,
                      delay: i * 0.6,
                      repeat: Infinity,
                      ease: 'easeOut',
                    }}
                  >
                    {char}
                  </motion.span>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Tap target indicator */}
      <AnimatePresence>
        {moveTarget && (
          <motion.div
            key={`${moveTarget.x}-${moveTarget.y}`}
            initial={{ scale: 0.5, opacity: 0.6 }}
            animate={{ scale: 1.2, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="absolute w-5 h-5 rounded-full border-2 border-zen-ink/30 pointer-events-none"
            style={{
              left: `${moveTarget.x}%`,
              top: `${moveTarget.y}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 5,
            }}
          />
        )}
      </AnimatePresence>

      {/* Desktop keyboard hint */}
      {!isMobile && <KeyboardHint />}

      {/* Bottom-right buttons */}
      <div
        className="absolute right-4 z-30 flex flex-col gap-3 items-center"
        style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px) + 8px)' }}
      >
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation();
            if (placingItem) { setPlacingItem(null); setGhostPos(null); }
            else setShowPicker(true);
          }}
          aria-label={placingItem ? '取消放置' : '打开物品商店'}
          className="w-12 h-12 rounded-full flex items-center justify-center bg-white/70 backdrop-blur-sm text-zen-ink border border-white/50 shadow-md active:bg-white/90 transition"
        >
          <Plus size={22} />
        </motion.button>

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

      {/* Item Picker */}
      <AnimatePresence>
        {showPicker && (
          <ItemPicker
            balance={balance}
            onSelect={(type) => { setPlacingItem(type); setShowPicker(false); }}
            onClose={() => setShowPicker(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
