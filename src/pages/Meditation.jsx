import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Settings, X, Volume2, VolumeX } from 'lucide-react';

// --- XP Helper ---
const awardXP = (amount) => {
  try {
    const p = JSON.parse(localStorage.getItem('zen_profile') || '{"totalXP":0,"spentXP":0}');
    p.totalXP += amount;
    localStorage.setItem('zen_profile', JSON.stringify(p));
  } catch { /* ignore */ }
};

const PHASES = {
  IDLE: 'idle',
  INHALE: 'inhale',
  HOLD: 'hold',
  EXHALE: 'exhale',
};

export default function Meditation() {
  const [status, setStatus] = useState('idle'); // idle, running
  const [phase, setPhase] = useState(PHASES.IDLE);
  const [timeLeft, setTimeLeft] = useState(0);
  
  // Settings (Seconds)
  const [config, setConfig] = useState({
    inhale: 4,
    hold: 7,
    exhale: 8,
  });
  const [showSettings, setShowSettings] = useState(false);
  const [muted, setMuted] = useState(false);

  // BGM refs
  const audioRef = useRef(null);
  const gainNodeRef = useRef(null);
  const audioCtxRef = useRef(null);
  const fadeIntervalRef = useRef(null);

  // --- BGM helpers ---
  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
    }
    return audioCtxRef.current;
  }, []);

  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      const ctx = getAudioContext();
      const audio = new Audio(`${import.meta.env.BASE_URL}audio/bowl-horizon.mp3`);
      audio.loop = true;
      const source = ctx.createMediaElementSource(audio);
      const gain = ctx.createGain();
      gain.gain.value = 0; // start silent for fade-in
      source.connect(gain).connect(ctx.destination);
      audioRef.current = audio;
      gainNodeRef.current = gain;
    }
    return { audio: audioRef.current, gain: gainNodeRef.current };
  }, [getAudioContext]);

  const fadeTo = useCallback((targetVol, durationMs = 1500) => {
    clearInterval(fadeIntervalRef.current);
    const { gain } = getAudio();
    const steps = 30;
    const stepTime = durationMs / steps;
    const delta = (targetVol - gain.gain.value) / steps;
    let step = 0;
    fadeIntervalRef.current = setInterval(() => {
      step++;
      gain.gain.value = Math.min(1, Math.max(0, gain.gain.value + delta));
      if (step >= steps) {
        clearInterval(fadeIntervalRef.current);
        gain.gain.value = targetVol;
      }
    }, stepTime);
  }, [getAudio]);

  // BGM play/pause tied to meditation status
  useEffect(() => {
    if (status === 'running') {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') ctx.resume();
      const { audio, gain } = getAudio();
      gain.gain.value = 0;
      audio.play().catch(() => {});
      fadeTo(muted ? 0 : 1, 1500);
    } else {
      if (audioRef.current) {
        fadeTo(0, 1000);
        // Pause audio after fade completes
        const pauseTimer = setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
          }
        }, 1050);
        return () => clearTimeout(pauseTimer);
      }
    }
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mute / unmute while running
  useEffect(() => {
    if (status === 'running' && gainNodeRef.current) {
      fadeTo(muted ? 0 : 1, 400);
    }
  }, [muted]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount (navigate away)
  useEffect(() => {
    return () => {
      clearInterval(fadeIntervalRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, []);

  // Animation variants
  const variants = {
    [PHASES.IDLE]: { scale: 1, opacity: 0.8 },
    [PHASES.INHALE]: { scale: 1.5, opacity: 1, transition: { duration: config.inhale, ease: "easeInOut" } },
    [PHASES.HOLD]: { scale: 1.5, opacity: 1, transition: { duration: config.hold, ease: "linear" } },
    [PHASES.EXHALE]: { scale: 1, opacity: 0.8, transition: { duration: config.exhale, ease: "easeInOut" } },
  };

  const phaseText = {
    [PHASES.IDLE]: "准备",
    [PHASES.INHALE]: "吸气",
    [PHASES.HOLD]: "止息",
    [PHASES.EXHALE]: "呼气",
  };

  const phaseColor = {
    [PHASES.IDLE]: "text-gray-400",
    [PHASES.INHALE]: "text-blue-300",
    [PHASES.HOLD]: "text-yellow-200", // 'Daniel' pause highlight
    [PHASES.EXHALE]: "text-gray-400",
  };

  // Session tracking
  const startTimeRef = useRef(null);

  // Haptic Feedback Helper
  const vibrate = (pattern) => {
    if (navigator.vibrate) {
        navigator.vibrate(pattern);
    }
  };

  useEffect(() => {
    let timer;
    if (status === 'running') {
      if (phase === PHASES.IDLE) {
        setPhase(PHASES.INHALE);
        setTimeLeft(config.inhale);
        vibrate(50); // Short blip for start
      } else {
        if (timeLeft > 0) {
          timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
        } else {
          // Phase transition
          switch (phase) {
            case PHASES.INHALE:
              setPhase(PHASES.HOLD);
              setTimeLeft(config.hold);
              vibrate(100); // Pulse for Hold
              break;
            case PHASES.HOLD:
              setPhase(PHASES.EXHALE);
              setTimeLeft(config.exhale);
              vibrate([50, 50, 50]); // Double pulse for Exhale
              break;
            case PHASES.EXHALE:
              setPhase(PHASES.INHALE); // Loop back
              setTimeLeft(config.inhale);
              vibrate(50); // Short blip for Inhale
              break;
          }
        }
      }
    } else {
        setPhase(PHASES.IDLE);
        setTimeLeft(0);
    }
    return () => clearTimeout(timer);
  }, [status, phase, timeLeft, config]);

  const toggleStatus = () => {
    if (status === 'running') {
      // Save session stats
      if (startTimeRef.current) {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        if (elapsed > 5) { // Only count sessions longer than 5 seconds
          try {
            const saved = JSON.parse(localStorage.getItem('zen_meditation') || '{"sessions":0,"totalSeconds":0}');
            saved.sessions += 1;
            saved.totalSeconds += elapsed;
            localStorage.setItem('zen_meditation', JSON.stringify(saved));
          } catch { /* ignore */ }
          awardXP(Math.max(1, Math.floor(elapsed / 60) * 5)); // +5 XP per minute, min 1
        }
        startTimeRef.current = null;
      }
      setStatus('idle');
    } else {
      startTimeRef.current = Date.now();
      setStatus('running');
    }
  };

  return (
    <div className="h-full flex flex-col bg-zen-dark text-white relative overflow-hidden">

      {/* Background — Pixel Art Temple */}
      <div className="absolute inset-0" style={{
        backgroundImage: `url(${import.meta.env.BASE_URL}images/meditation-bg.png)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }} />
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Floating Light Specks */}
      {[...Array(8)].map((_, i) => (
        <div
          key={`star-${i}`}
          className="zen-particle"
          style={{
            left: `${5 + i * 12}%`,
            top: `${10 + (i * 17) % 70}%`,
            '--size': `${1.5 + (i % 3)}px`,
            '--duration': `${8 + i * 2}s`,
            '--delay': `${i * 1.5}s`,
            '--dx': `${(i % 2 ? 10 : -10)}px`,
            '--dy': `${(i % 2 ? -20 : 20)}px`,
            '--dx2': `${(i % 2 ? -5 : 5)}px`,
            '--dy2': `${(i % 2 ? -40 : 40)}px`,
            '--max-opacity': '0.3',
            background: 'radial-gradient(circle, rgba(255,255,240,0.6), transparent)',
          }}
        />
      ))}

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-8">

        {/* Breathing Circle */}
        <div className="relative w-64 h-64 flex items-center justify-center mb-12">
            {/* Outer Glow (double layer) */}
            <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(255,255,255,0.15), transparent 60%)',
                  filter: 'blur(20px)',
                }}
                animate={phase === PHASES.INHALE || phase === PHASES.HOLD ? { opacity: 0.4, scale: 1.3 } : { opacity: 0.15, scale: 1 }}
                transition={{ duration: 2 }}
            />

            {/* Core Circle */}
            <motion.div
                className="w-40 h-40 bg-white rounded-full shadow-[0_0_60px_rgba(255,255,255,0.25),0_0_120px_rgba(255,255,255,0.1)] flex items-center justify-center"
                variants={variants}
                initial={PHASES.IDLE}
                animate={phase}
            >
                <div className="text-zen-dark font-serif text-2xl font-bold">
                    {status === 'running' ? timeLeft : "禅"}
                </div>
            </motion.div>
        </div>

        <div className={`text-3xl font-serif font-light tracking-[0.5em] mb-4 ${phaseColor[phase]}`}>
            {phaseText[phase]}
        </div>

        <p className="text-gray-500 text-sm mb-12">
           {phase === PHASES.HOLD ? "保持静止，感受当下" : "跟随呼吸的节奏"}
        </p>

        {/* Controls */}
        <div className="flex gap-8 items-center">
            <button
                onClick={() => setShowSettings(true)}
                className="p-4 rounded-full bg-white/5 hover:bg-white/10 transition border border-white/10"
            >
                <Settings size={24} />
            </button>

            <button
                onClick={toggleStatus}
                className={`p-6 rounded-full transition ${status === 'running' ? 'bg-gray-700 hover:bg-gray-600 shadow-lg' : 'bg-white text-zen-dark hover:bg-gray-100 shadow-[0_0_30px_rgba(255,255,255,0.2)]'}`}
            >
                {status === 'running' ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
            </button>

            <button
                onClick={() => setMuted(m => !m)}
                className="p-4 rounded-full bg-white/5 hover:bg-white/10 transition border border-white/10"
            >
                {muted ? <VolumeX size={24} /> : <Volume2 size={24} />}
            </button>
        </div>

      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6"
            >
                <div className="bg-zen-dark border border-gray-700 w-full max-w-sm rounded-2xl p-6 shadow-2xl">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold">呼吸节奏</h3>
                        <button onClick={() => setShowSettings(false)}><X /></button>
                    </div>
                    
                    {[
                        { key: 'inhale', label: '吸气 (秒)' },
                        { key: 'hold', label: '止息 (秒)' },
                        { key: 'exhale', label: '呼气 (秒)' }
                    ].map(({ key, label }) => (
                        <div key={key} className="mb-6">
                            <label className="block text-sm text-gray-400 mb-2 flex justify-between">
                                <span>{label}</span>
                                <span className="text-white font-mono">{config[key]}s</span>
                            </label>
                            <input 
                                type="range" min="1" max="15" step="1"
                                value={config[key]}
                                onChange={(e) => setConfig({...config, [key]: parseInt(e.target.value)})}
                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-white"
                            />
                        </div>
                    ))}
                    
                    <button 
                        onClick={() => setShowSettings(false)}
                        className="w-full py-3 bg-white text-zen-dark rounded-xl font-bold mt-2"
                    >
                        完成
                    </button>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
