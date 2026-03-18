import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Settings, X, Volume2, VolumeX, Timer, Infinity as InfinityIcon } from 'lucide-react';
import { MOODS, getGuidedLines } from '../data/guidedScripts';
import { addXP, safeLoad, safeSave, KEYS } from '../utils/zen';

const PHASES = {
  IDLE: 'idle',
  INHALE: 'inhale',
  HOLD: 'hold',
  EXHALE: 'exhale',
};

// Timer presets in minutes (0 = infinite)
const TIMER_PRESETS = [0, 5, 10, 15];

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

  // --- Timer State ---
  const [timerMinutes, setTimerMinutes] = useState(() => safeLoad(KEYS.MEDITATION_TIMER, 0));
  const [showCustomTimer, setShowCustomTimer] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [sessionTimeLeft, setSessionTimeLeft] = useState(0); // remaining seconds for timed mode
  const sessionEndRef = useRef(null); // Date.now() when session should end

  // Save timer preference
  useEffect(() => {
    safeSave(KEYS.MEDITATION_TIMER, timerMinutes);
  }, [timerMinutes]);

  // --- Guided Meditation State ---
  const [mode, setMode] = useState(() => safeLoad(KEYS.MEDITATION_MODE, 'free'));
  const [selectedMood, setSelectedMood] = useState(null);
  const [guidedLines, setGuidedLines] = useState([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const cycleCountRef = useRef(0);

  useEffect(() => {
    safeSave(KEYS.MEDITATION_MODE, mode);
  }, [mode]);

  // Load guided lines when mood is selected (preload, no async in toggleStatus)
  useEffect(() => {
    if (selectedMood) {
      getGuidedLines(selectedMood).then(setGuidedLines);
    } else {
      setGuidedLines([]);
    }
  }, [selectedMood]);

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
  const phaseStartRef = useRef(null);
  const phaseDurationRef = useRef(0);
  const wakeLockRef = useRef(null);

  // Haptic Feedback Helper
  const vibrate = (pattern) => {
    if (navigator.vibrate) {
        navigator.vibrate(pattern);
    }
  };

  // Wake Lock — keep screen on during meditation
  useEffect(() => {
    if (status === 'running') {
      const acquireWakeLock = async () => {
        try {
          if ('wakeLock' in navigator) {
            wakeLockRef.current = await navigator.wakeLock.request('screen');
          }
        } catch { /* user denied or unsupported */ }
      };
      acquireWakeLock();
      const onVisChange = () => { if (document.visibilityState === 'visible') acquireWakeLock(); };
      document.addEventListener('visibilitychange', onVisChange);
      return () => {
        document.removeEventListener('visibilitychange', onVisChange);
        if (wakeLockRef.current) { wakeLockRef.current.release(); wakeLockRef.current = null; }
      };
    }
    if (wakeLockRef.current) { wakeLockRef.current.release(); wakeLockRef.current = null; }
  }, [status]);

  // Start a new phase with Date.now() anchor
  const startPhase = useCallback((newPhase, duration) => {
    setPhase(newPhase);
    setTimeLeft(duration);
    phaseStartRef.current = Date.now();
    phaseDurationRef.current = duration;
  }, []);

  // --- Stop session helper (used by both manual stop and timer auto-stop) ---
  const stopSession = useCallback(() => {
    if (startTimeRef.current) {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      if (elapsed > 5) {
        const stats = safeLoad(KEYS.MEDITATION, { sessions: 0, totalSeconds: 0 });
        stats.sessions += 1;
        stats.totalSeconds += elapsed;
        safeSave(KEYS.MEDITATION, stats);
        addXP(Math.max(1, Math.floor(elapsed / 60) * 5));
      }
      startTimeRef.current = null;
    }
    setStatus('idle');
    setCurrentLineIndex(0);
    cycleCountRef.current = 0;
    sessionEndRef.current = null;
  }, []);

  // Advance to next phase
  const advancePhase = useCallback(() => {
    switch (phase) {
      case PHASES.INHALE:
        startPhase(PHASES.HOLD, config.hold);
        vibrate(100);
        break;
      case PHASES.HOLD:
        startPhase(PHASES.EXHALE, config.exhale);
        vibrate([50, 50, 50]);
        break;
      case PHASES.EXHALE:
        startPhase(PHASES.INHALE, config.inhale);
        vibrate(50);
        cycleCountRef.current += 1;
        if (mode === 'guided' && guidedLines.length > 0) {
          if (cycleCountRef.current < guidedLines.length) {
            setCurrentLineIndex(cycleCountRef.current);
          }
        }
        break;
    }
  }, [phase, config, mode, guidedLines.length, startPhase]);

  // Date.now()-based tick: resilient to screen lock / setTimeout drift
  useEffect(() => {
    if (status === 'running') {
      if (phase === PHASES.IDLE) {
        startPhase(PHASES.INHALE, config.inhale);
        vibrate(50);
        return;
      }

      const tick = () => {
        const elapsed = (Date.now() - phaseStartRef.current) / 1000;
        const remaining = Math.max(0, Math.ceil(phaseDurationRef.current - elapsed));
        setTimeLeft(remaining);
        if (remaining <= 0) {
          advancePhase();
        }

        // Update session timer countdown
        if (sessionEndRef.current) {
          const sessRemaining = Math.max(0, Math.ceil((sessionEndRef.current - Date.now()) / 1000));
          setSessionTimeLeft(sessRemaining);
          if (sessRemaining <= 0) {
            stopSession();
          }
        }
      };

      const timer = setInterval(tick, 250);
      return () => clearInterval(timer);
    } else {
      setPhase(PHASES.IDLE);
      setTimeLeft(0);
    }
  }, [status, phase, config, startPhase, advancePhase, stopSession]);

  // Format seconds to MM:SS
  const formatTime = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const toggleStatus = () => {
    if (status === 'running') {
      stopSession();
    } else {
      setCurrentLineIndex(0);
      cycleCountRef.current = 0;
      startTimeRef.current = Date.now();

      // Set session end time if timed mode
      if (timerMinutes > 0) {
        sessionEndRef.current = Date.now() + timerMinutes * 60 * 1000;
        setSessionTimeLeft(timerMinutes * 60);
      } else {
        sessionEndRef.current = null;
        setSessionTimeLeft(0);
      }

      setStatus('running');
    }
  };

  // Handle custom timer input
  const handleCustomTimerSubmit = () => {
    const val = parseInt(customInput, 10);
    if (val > 0 && val <= 120) {
      setTimerMinutes(val);
      setShowCustomTimer(false);
      setCustomInput('');
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

      {/* Session Countdown Timer (top of screen, visible when timed and running) */}
      <AnimatePresence>
        {status === 'running' && sessionEndRef.current && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 left-0 right-0 z-20 flex justify-center pt-4"
          >
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10">
              <Timer size={14} className="text-zen-gold" />
              <span className="text-sm font-mono text-zen-gold tracking-wider">
                {formatTime(sessionTimeLeft)}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

        {/* Mode Toggle (idle only) */}
        {status === 'idle' && (
          <div className="flex gap-1 bg-white/5 rounded-lg p-0.5 mb-4">
            {[
              { key: 'free', label: '自由呼吸' },
              { key: 'guided', label: '引导冥想' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => { setMode(t.key); if (t.key === 'free') setSelectedMood(null); }}
                className={`px-4 py-2 text-xs font-serif rounded-md transition ${
                  mode === t.key ? 'bg-white/15 text-white font-bold' : 'text-gray-500'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Timer Duration Selector (idle only) */}
        {status === 'idle' && (
          <div className="flex flex-col items-center gap-2 mb-4">
            <div className="flex items-center gap-1.5">
              {TIMER_PRESETS.map(mins => (
                <button
                  key={mins}
                  onClick={() => { setTimerMinutes(mins); setShowCustomTimer(false); }}
                  className={`px-3 py-1.5 text-xs font-serif rounded-full transition border ${
                    timerMinutes === mins && !showCustomTimer
                      ? 'bg-white/15 border-white/30 text-white'
                      : 'bg-white/5 border-white/10 text-gray-500'
                  }`}
                >
                  {mins === 0 ? (
                    <span className="flex items-center gap-1">
                      <InfinityIcon size={12} />
                      无限
                    </span>
                  ) : `${mins}分钟`}
                </button>
              ))}
              <button
                onClick={() => setShowCustomTimer(v => !v)}
                className={`px-3 py-1.5 text-xs font-serif rounded-full transition border ${
                  showCustomTimer || (!TIMER_PRESETS.includes(timerMinutes) && timerMinutes > 0)
                    ? 'bg-white/15 border-white/30 text-white'
                    : 'bg-white/5 border-white/10 text-gray-500'
                }`}
              >
                {!TIMER_PRESETS.includes(timerMinutes) && timerMinutes > 0 ? `${timerMinutes}分钟` : '自定义'}
              </button>
            </div>

            {/* Custom timer input */}
            <AnimatePresence>
              {showCustomTimer && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 overflow-hidden"
                >
                  <input
                    type="number"
                    min="1"
                    max="120"
                    placeholder="分钟数"
                    value={customInput}
                    onChange={e => setCustomInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleCustomTimerSubmit(); }}
                    className="w-20 px-3 py-1.5 text-sm bg-white/10 border border-white/20 rounded-lg text-white text-center placeholder-gray-500 focus:outline-none focus:border-white/40"
                  />
                  <button
                    onClick={handleCustomTimerSubmit}
                    className="px-3 py-1.5 text-xs font-serif bg-white/15 border border-white/20 rounded-lg text-white"
                  >
                    确定
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Mood Selection (idle + guided mode) */}
        <AnimatePresence mode="wait">
          {status === 'idle' && mode === 'guided' ? (
            <motion.div
              key="mood-select"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center gap-3 mb-8"
            >
              <div className="flex flex-wrap justify-center gap-2 px-4">
                {MOODS.map(mood => (
                  <button
                    key={mood.id}
                    onClick={() => setSelectedMood(mood.id)}
                    className={`px-3 py-2 rounded-xl text-sm font-serif transition border ${
                      selectedMood === mood.id
                        ? 'bg-white/15 border-white/30 text-white'
                        : 'bg-white/5 border-white/10 text-gray-400'
                    }`}
                  >
                    <span className="mr-1">{mood.emoji}</span>
                    {mood.label}
                  </button>
                ))}
              </div>
              {selectedMood && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-gray-400 text-sm font-serif"
                >
                  {MOODS.find(m => m.id === selectedMood)?.desc}
                </motion.p>
              )}
            </motion.div>
          ) : status === 'idle' ? (
            <motion.p
              key="free-subtitle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-gray-500 text-sm mb-8"
            >
              跟随呼吸的节奏
            </motion.p>
          ) : null}
        </AnimatePresence>

        {/* Guided Text (running + guided mode) */}
        {status === 'running' && (
          <div className="h-12 flex items-center justify-center mb-8">
            {mode === 'guided' && guidedLines.length > 0 ? (
              <AnimatePresence mode="wait">
                <motion.p
                  key={currentLineIndex}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 1.2, ease: 'easeInOut' }}
                  className="text-gray-300 text-sm font-serif text-center px-8 leading-relaxed"
                >
                  {guidedLines[currentLineIndex]}
                </motion.p>
              </AnimatePresence>
            ) : (
              <p className="text-gray-500 text-sm">
                {phase === PHASES.HOLD ? '保持静止，感受当下' : '跟随呼吸的节奏'}
              </p>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-8 items-center">
            <button
                onClick={() => setShowSettings(true)}
                aria-label="呼吸节奏设置"
                className="p-4 rounded-full bg-white/5 hover:bg-white/10 transition border border-white/10"
            >
                <Settings size={24} />
            </button>

            <button
                onClick={toggleStatus}
                disabled={status === 'idle' && mode === 'guided' && !selectedMood}
                aria-label={status === 'running' ? '暂停禅修' : '开始禅修'}
                className={`p-6 rounded-full transition ${
                  status === 'running'
                    ? 'bg-gray-700 hover:bg-gray-600 shadow-lg'
                    : (mode === 'guided' && !selectedMood)
                      ? 'bg-white/30 text-zen-dark/50 cursor-not-allowed'
                      : 'bg-white text-zen-dark hover:bg-gray-100 shadow-[0_0_30px_rgba(255,255,255,0.2)]'
                }`}
            >
                {status === 'running' ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
            </button>

            <button
                onClick={() => setMuted(m => !m)}
                aria-label={muted ? '取消静音' : '静音'}
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
                        <button onClick={() => setShowSettings(false)} aria-label="关闭设置"><X /></button>
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
