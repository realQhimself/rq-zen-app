import React, { useRef, useEffect, useState } from 'react';
import { ArrowLeft, Check, RotateCcw, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { addXP, safeLoad, safeSave, KEYS } from '../utils/zen';
import { SUTRAS, getSutraById } from '../data/sutras';

// --- Progress helpers ---

function loadProgress() {
  const progress = safeLoad(KEYS.SUTRA_PROGRESS, null);
  if (progress) return progress;

  // Migrate legacy zen_sutra_index (Heart Sutra only) into new format
  const legacyIndex = safeLoad(KEYS.SUTRA_INDEX, 0);
  const migrated = {};
  if (legacyIndex > 0) {
    migrated['heart-sutra'] = legacyIndex;
  }
  safeSave(KEYS.SUTRA_PROGRESS, migrated);
  return migrated;
}

function saveProgressForSutra(sutraId, index) {
  const progress = loadProgress();
  progress[sutraId] = index;
  safeSave(KEYS.SUTRA_PROGRESS, progress);
}

function getProgressForSutra(sutraId) {
  const progress = loadProgress();
  return progress[sutraId] || 0;
}

// --- Selection Screen ---

function SutraSelection({ onSelect }) {
  const progress = loadProgress();

  return (
    <div
      className="h-full flex flex-col"
      style={{
        backgroundImage: `url(${import.meta.env.BASE_URL}images/sutra-paper.png)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: '#f5f5f0',
      }}
    >
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 bg-zen-bg/80 backdrop-blur-lg border-b border-zen-sand/50">
        <Link to="/" className="p-2 text-zen-stone rounded-full hover:bg-zen-sand/50 transition">
          <ArrowLeft size={24} />
        </Link>
        <h2 className="text-lg font-serif font-bold text-zen-ink">选择经典</h2>
        <div className="w-10" />
      </div>

      {/* Sutra List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {SUTRAS.map((sutra) => {
          const idx = progress[sutra.id] || 0;
          const total = sutra.text.length;
          const completed = idx >= total;
          const pct = total > 0 ? Math.min((idx / total) * 100, 100) : 0;

          return (
            <motion.button
              key={sutra.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(sutra.id)}
              className="zen-card w-full p-4 text-left relative overflow-hidden"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-serif font-bold text-zen-ink truncate">
                      {sutra.name}
                    </h3>
                    {completed && (
                      <span className="shrink-0 w-5 h-5 rounded-full bg-zen-moss/80 text-white flex items-center justify-center text-xs">
                        ✓
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zen-stone mt-0.5">{sutra.author}</p>
                  <p className="text-xs text-zen-stone/70 mt-1">{sutra.description}</p>
                </div>
                <div className="shrink-0 text-right">
                  <span className="text-xs text-zen-stone">{total} 字</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-zen-sand/60 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-zen-red/60 to-zen-gold/40 rounded-full transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[10px] text-zen-stone whitespace-nowrap">
                  已抄 {Math.min(idx, total)} / {total} 字
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// --- Main Entry ---

export default function Sutra() {
  const [currentSutraId, setCurrentSutraId] = useState(null);

  if (!currentSutraId) {
    return <SutraSelection onSelect={(id) => setCurrentSutraId(id)} />;
  }

  return (
    <SutraWriter
      sutraId={currentSutraId}
      onBack={() => setCurrentSutraId(null)}
    />
  );
}

// --- Writing Screen ---

function SutraWriter({ sutraId, onBack }) {
  const sutra = getSutraById(sutraId);
  const sutraText = sutra.text;

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const refCanvasRef = useRef(null);
  const advanceTimerRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(() => getProgressForSutra(sutraId));
  const [isDrawing, setIsDrawing] = useState(false);
  const [feedback, setFeedback] = useState(null); // 'success', 'retry'

  const currentChar = sutraText[currentIndex];

  // Save progress whenever index changes
  useEffect(() => {
    saveProgressForSutra(sutraId, currentIndex);
    // Keep legacy key in sync for Heart Sutra
    if (sutraId === 'heart-sutra') {
      safeSave(KEYS.SUTRA_INDEX, currentIndex);
    }
  }, [currentIndex, sutraId]);

  // Initialize Canvas & Guide
  useEffect(() => {
    initCanvas();
    window.addEventListener('resize', initCanvas);
    return () => window.removeEventListener('resize', initCanvas);
  }, [currentIndex]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth;
    const height = container.clientHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);

    // Initial Styles
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 12;
    ctx.strokeStyle = '#2c2c2c';

    drawGuide(ctx, width, height);
    buildReferenceCanvas(width, height);
  };

  const drawGuide = (ctx, width, height) => {
    ctx.clearRect(0, 0, width, height);

    const size = Math.min(width, height) * 0.75;
    const startX = (width - size) / 2;
    const startY = (height - size) / 2;

    ctx.save();

    // Draw Grid (Tian Zi Ge)
    ctx.beginPath();
    ctx.strokeStyle = '#e5e5e5';
    ctx.lineWidth = 1;

    ctx.strokeRect(startX, startY, size, size);

    ctx.moveTo(startX, startY); ctx.lineTo(startX + size, startY + size);
    ctx.moveTo(startX + size, startY); ctx.lineTo(startX, startY + size);
    ctx.moveTo(startX, startY + size / 2); ctx.lineTo(startX + size, startY + size / 2);
    ctx.moveTo(startX + size / 2, startY); ctx.lineTo(startX + size / 2, startY + size);
    ctx.stroke();

    // Draw Text Guide
    ctx.font = `400 ${size * 0.8}px "Noto Serif SC", serif`;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(currentChar, width / 2, height / 2);

    ctx.restore();
  };

  const buildReferenceCanvas = (width, height) => {
    const dpr = window.devicePixelRatio || 1;
    if (!refCanvasRef.current) {
      refCanvasRef.current = document.createElement('canvas');
    }
    const offscreen = refCanvasRef.current;
    offscreen.width = width * dpr;
    offscreen.height = height * dpr;

    const ctx = offscreen.getContext('2d');
    ctx.scale(dpr, dpr);

    const size = Math.min(width, height) * 0.75;
    ctx.font = `400 ${size * 0.8}px "Noto Serif SC", serif`;
    ctx.fillStyle = 'rgba(0, 0, 0, 1)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(currentChar, width / 2, height / 2);
  };

  const calculateOverlap = () => {
    const canvas = canvasRef.current;
    const offscreen = refCanvasRef.current;
    if (!canvas || !offscreen) return 0;

    const width = canvas.width;
    const height = canvas.height;

    const userData = canvas.getContext('2d').getImageData(0, 0, width, height).data;
    const refData = offscreen.getContext('2d').getImageData(0, 0, width, height).data;

    let refPixels = 0;
    let overlapPixels = 0;

    for (let i = 0; i < userData.length; i += 4) {
      const refAlpha = refData[i + 3];
      if (refAlpha > 128) {
        refPixels++;
        if (userData[i + 3] > 180 && userData[i] < 80) {
          overlapPixels++;
        }
      }
    }

    return refPixels === 0 ? 0 : overlapPixels / refPixels;
  };

  const triggerAdvance = () => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    setFeedback('success');
    addXP(1);
    advanceTimerRef.current = setTimeout(() => {
      advanceTimerRef.current = null;
      if (currentIndex < sutraText.length - 1) {
        setCurrentIndex((prev) => prev + 1);
        setFeedback(null);
      }
    }, 1500);
  };

  // Brush state for calligraphy pressure/speed effects
  const brushRef = useRef({
    prevX: 0,
    prevY: 0,
    prevTime: 0,
    pointCount: 0,
    prevWidth: 12,
  });

  const BASE_WIDTH = 12;
  const MIN_WIDTH = 4;
  const MAX_WIDTH = 16;
  const TAPER_POINTS = 5;

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const getPressure = (e) => {
    if (e.pressure !== undefined && e.pressure > 0 && e.pressure < 1) return e.pressure;
    if (e.touches && e.touches[0] && e.touches[0].force > 0) return e.touches[0].force;
    return -1;
  };

  const calcBrushWidth = (speed, pressure, pointCount) => {
    let width;

    if (pressure >= 0) {
      width = MIN_WIDTH + pressure * (MAX_WIDTH - MIN_WIDTH);
    } else {
      const speedFactor = 1.3 - Math.min(speed * 0.5, 1.0);
      width = BASE_WIDTH * speedFactor;
    }

    width = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width));

    if (pointCount < TAPER_POINTS) {
      const t = pointCount / TAPER_POINTS;
      width = MIN_WIDTH + t * (width - MIN_WIDTH);
    }

    return width;
  };

  const calcInkAlpha = (speed) => {
    const alpha = 1.0 - Math.min(speed * 0.15, 0.25);
    return Math.max(0.75, Math.min(1.0, alpha));
  };

  const startDrawing = (e) => {
    if (e.type.startsWith('touch') && e.cancelable) e.preventDefault();
    setIsDrawing(true);
    setFeedback(null);
    const { x, y } = getPos(e);
    const ctx = canvasRef.current.getContext('2d');

    brushRef.current = {
      prevX: x,
      prevY: y,
      prevTime: Date.now(),
      pointCount: 0,
      prevWidth: MIN_WIDTH,
    };

    // Draw starting dot
    ctx.fillStyle = `rgba(44, 44, 44, 1.0)`;
    ctx.beginPath();
    ctx.arc(x, y, MIN_WIDTH / 2, 0, Math.PI * 2);
    ctx.fill();
  };

  const draw = (e) => {
    if (!isDrawing) return;
    if (e.type.startsWith('touch') && e.cancelable) e.preventDefault();

    const { x, y } = getPos(e);
    const now = Date.now();
    const brush = brushRef.current;

    const dx = x - brush.prevX;
    const dy = y - brush.prevY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 1) return; // Ignore tiny movements

    const dt = Math.max(now - brush.prevTime, 1);
    const speed = dist / dt;

    brush.pointCount++;

    const pressure = getPressure(e);
    const targetWidth = calcBrushWidth(speed, pressure, brush.pointCount);
    const smoothWidth = brush.prevWidth + (targetWidth - brush.prevWidth) * 0.5;
    const alpha = calcInkAlpha(speed);

    const ctx = canvasRef.current.getContext('2d');

    // Circle stamp approach: draw overlapping circles along the path
    const steps = Math.max(1, Math.floor(dist / 2.5));

    ctx.fillStyle = `rgba(44, 44, 44, ${alpha})`;

    for (let i = 0; i <= steps; i++) {
      const t = steps > 0 ? i / steps : 0;
      const px = brush.prevX + (x - brush.prevX) * t;
      const py = brush.prevY + (y - brush.prevY) * t;
      // Interpolate width along the segment
      const pwidth = brush.prevWidth + (smoothWidth - brush.prevWidth) * t;

      ctx.beginPath();
      ctx.arc(px, py, pwidth / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    brush.prevX = x;
    brush.prevY = y;
    brush.prevTime = now;
    brush.prevWidth = smoothWidth;
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);

      if (feedback !== 'success') {
        const overlap = calculateOverlap();
        if (overlap >= 0.25) {
          triggerAdvance();
        }
      }
    }
  };

  const clearCanvas = () => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    initCanvas();
    setFeedback(null);
  };

  const validate = () => {
    if (feedback === 'success') return;
    const overlap = calculateOverlap();
    if (overlap >= 0.12) {
      triggerAdvance();
    } else {
      setFeedback('retry');
    }
  };

  return (
    <div
      className="h-full flex flex-col relative"
      ref={containerRef}
      style={{
        backgroundImage: `url(${import.meta.env.BASE_URL}images/sutra-paper.png)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: '#f5f5f0',
      }}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 h-16 flex items-center justify-between px-4 z-10 bg-zen-bg/80 backdrop-blur-lg border-b border-zen-sand/50">
        <button
          onClick={onBack}
          className="p-2 text-zen-stone rounded-full hover:bg-zen-sand/50 transition"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="flex flex-col items-center">
          <h2 className="text-lg font-serif font-bold text-zen-ink">
            {sutra.name}
          </h2>
          <span className="text-xs text-zen-stone">
            {currentIndex + 1} / {sutraText.length}
          </span>
        </div>
        <div className="w-10" />
        {/* Progress bar */}
        <div
          className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-zen-red/60 to-zen-gold/40 transition-all duration-500"
          style={{ width: `${((currentIndex + 1) / sutraText.length) * 100}%` }}
        />
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden p-4">
        <canvas
          ref={canvasRef}
          className="touch-none"
          style={{ touchAction: 'none' }}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerLeave={stopDrawing}
          onPointerCancel={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />

        {/* Feedback Overlay */}
        <AnimatePresence>
          {feedback === 'success' && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 2, opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <div className="w-28 h-28 bg-gradient-to-br from-zen-gold/80 to-zen-red/60 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(196,168,98,0.4)] backdrop-blur">
                <span className="text-4xl font-serif font-bold text-white">善</span>
              </div>
            </motion.div>
          )}
          {feedback === 'retry' && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-10 bg-zen-sand text-zen-red px-4 py-2 rounded-lg shadow-sm pointer-events-none z-20 border border-zen-red/10"
            >
              笔墨不足，请再临摹
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Controls */}
      <div className="h-24 bg-white/70 backdrop-blur-xl border-t border-zen-sand/30 flex items-center justify-around px-8 pb-safe">
        <button
          onClick={clearCanvas}
          className="flex flex-col items-center text-zen-stone active:text-zen-ink transition"
        >
          <RotateCcw size={22} />
          <span className="text-xs mt-1">重写</span>
        </button>

        <button
          onClick={validate}
          className="w-16 h-16 bg-zen-ink text-white rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(44,44,44,0.25)] active:scale-95 transition"
        >
          <Check size={32} />
        </button>

        <button
          onClick={() => {
            if (advanceTimerRef.current) {
              clearTimeout(advanceTimerRef.current);
              advanceTimerRef.current = null;
            }
            setFeedback(null);
            setCurrentIndex((prev) => Math.min(prev + 1, sutraText.length - 1));
          }}
          className="flex flex-col items-center text-zen-stone active:text-zen-ink transition"
        >
          <ChevronRight size={22} />
          <span className="text-xs mt-1">跳过</span>
        </button>
      </div>
    </div>
  );
}
