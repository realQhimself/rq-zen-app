import React, { useRef, useEffect, useState, useCallback } from 'react';
import { X, RotateCcw, ChevronRight } from 'lucide-react';
import { getSutraById } from '../../data/sutras/index';
import { saveSutraProgress, getSutraCharIndex } from '../../utils/sutraProgress';
import { saveStroke } from '../../utils/sutraDb';
import { addXP } from '../../utils/zen';
import useBrushEngine from '../../hooks/useBrushEngine';
import useCharRecognition from '../../hooks/useCharRecognition';

export default function SutraWriter({ sutraId, onComplete, onExit }) {
  const sutra = getSutraById(sutraId);
  const sutraText = sutra.text;

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(() => getSutraCharIndex(sutraId));
  const [isDrawing, setIsDrawing] = useState(false);
  const startTimeRef = useRef(Date.now());
  const strokeCountRef = useRef(0);
  const advanceTimerRef = useRef(null);
  const writtenCountRef = useRef(0);

  const { startStroke, continueStroke, endStroke } = useBrushEngine();
  const { buildReference, shouldAdvance } = useCharRecognition();

  const currentChar = sutraText[currentIndex];
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;

  // Save progress whenever index changes
  useEffect(() => {
    saveSutraProgress(sutraId, currentIndex);
  }, [currentIndex, sutraId]);

  // Check if sutra is complete
  useEffect(() => {
    if (currentIndex >= sutraText.length) {
      const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
      onComplete({ duration, chars: sutraText.length, written: writtenCountRef.current });
    }
  }, [currentIndex, sutraText.length, onComplete]);

  // Init canvas
  useEffect(() => {
    initCanvas();
    const handleResize = () => initCanvas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentIndex]);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || currentIndex >= sutraText.length) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Only set buffer resolution — CSS handles display size (prevents iOS zoom)
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    drawGuide(ctx, width, height);
    buildReference(currentChar, width, height);
    strokeCountRef.current = 0;
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  }, [currentIndex, currentChar, buildReference, sutraText.length]);

  const drawGuide = (ctx, width, height) => {
    ctx.clearRect(0, 0, width, height);

    // Make grid fill available space (large character)
    const size = Math.min(width, height) * 0.85;
    const startX = (width - size) / 2;
    const startY = (height - size) / 2;

    ctx.save();

    // Grid lines (田字格 + diagonal)
    ctx.beginPath();
    ctx.strokeStyle = '#e5e5e5';
    ctx.lineWidth = 1;
    ctx.strokeRect(startX, startY, size, size);
    ctx.moveTo(startX, startY); ctx.lineTo(startX + size, startY + size);
    ctx.moveTo(startX + size, startY); ctx.lineTo(startX, startY + size);
    ctx.moveTo(startX, startY + size / 2); ctx.lineTo(startX + size, startY + size / 2);
    ctx.moveTo(startX + size / 2, startY); ctx.lineTo(startX + size / 2, startY + size);
    ctx.stroke();

    // Ghost character (very faint)
    ctx.font = `400 ${size * 0.8}px "Noto Serif SC", serif`;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(currentChar, width / 2, height / 2);

    ctx.restore();
  };

  const captureStroke = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png', 0.6);
    await saveStroke(sutraId, currentIndex, dataUrl).catch(() => {});
  }, [sutraId, currentIndex]);

  const advanceToNext = useCallback(async () => {
    addXP(1);
    writtenCountRef.current++;
    await captureStroke();
    setCurrentIndex((prev) => prev + 1);
  }, [captureStroke]);

  // --- Pointer handlers ---
  const handlePointerDown = (e) => {
    if (currentIndex >= sutraText.length) return;
    // Cancel any pending advance — user is still writing
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    setIsDrawing(true);
    startStroke(e, canvasRef.current);
  };

  const handlePointerMove = (e) => {
    if (!isDrawing) return;
    continueStroke(e, canvasRef.current);
  };

  const handlePointerUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    endStroke();
    strokeCountRef.current++;

    // Delay check — wait 0.5s after last stroke before deciding
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    advanceTimerRef.current = setTimeout(() => {
      if (shouldAdvance(canvasRef.current, strokeCountRef.current)) {
        advanceToNext();
      }
    }, 500);
  };

  // Cleanup advance timer on unmount
  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, []);

  // Prevent iOS pinch/gesture zoom while writing
  useEffect(() => {
    const prevent = (e) => e.preventDefault();
    document.addEventListener('gesturestart', prevent, { passive: false });
    document.addEventListener('gesturechange', prevent, { passive: false });
    return () => {
      document.removeEventListener('gesturestart', prevent);
      document.removeEventListener('gesturechange', prevent);
    };
  }, []);

  const clearCanvas = () => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    // Only redraw guide — don't resize canvas (avoids layout shift → Safari zoom)
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (canvas && container) {
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      const width = container.clientWidth;
      const height = container.clientHeight;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
      drawGuide(ctx, width, height);
      buildReference(currentChar, width, height);
      strokeCountRef.current = 0;
    }
  };

  const skipChar = () => {
    setCurrentIndex((prev) => Math.min(prev + 1, sutraText.length));
  };

  if (currentIndex >= sutraText.length) return null;

  // Upcoming characters preview
  const upcoming = sutraText.slice(currentIndex + 1, currentIndex + 6).split('');

  return (
    <div className="h-full flex" style={{ backgroundColor: '#f5f0e8', touchAction: 'manipulation' }}>
      {/* Desktop: left panel */}
      {isDesktop && (
        <div className="w-60 bg-white/50 border-r border-zen-sand/50 p-5 flex flex-col"
          style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
          <h3 className="font-serif font-bold text-zen-ink text-sm">{sutra.name}</h3>
          <p className="text-xs text-zen-stone mt-1">{sutra.author} · {sutra.text.length}字</p>

          {/* Progress */}
          <div className="mt-4">
            <div className="flex justify-between text-[10px] text-zen-stone mb-1">
              <span>进度</span>
              <span>{Math.round((currentIndex / sutraText.length) * 100)}%</span>
            </div>
            <div className="h-1 bg-zen-sand rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-zen-gold to-zen-gold/60 rounded-full transition-all duration-300"
                style={{ width: `${(currentIndex / sutraText.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Already written */}
          <p className="text-[10px] text-zen-stone mt-4 mb-1">已抄经文</p>
          <div className="flex-1 overflow-y-auto text-xs text-zen-stone/70 leading-relaxed font-serif">
            {sutraText.slice(0, currentIndex)}
          </div>

          <button
            onClick={onExit}
            className="mt-4 py-2.5 border border-zen-sand rounded-lg text-xs text-zen-stone hover:bg-zen-sand/30 transition"
          >
            暂停（自动保存）
          </button>
        </div>
      )}

      {/* Main writing area */}
      <div className="flex-1 flex flex-col relative">
        {/* Top bar */}
        <div className="flex items-center px-3 py-2 bg-zen-bg/60"
          style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
          {!isDesktop && (
            <button
              onClick={onExit}
              className="w-8 h-8 rounded-full bg-zen-stone/10 flex items-center justify-center text-zen-stone"
            >
              <X size={16} />
            </button>
          )}
          <div className="flex-1 mx-3 h-0.5 bg-zen-sand rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-zen-gold to-zen-gold/60 rounded-full transition-all duration-500"
              style={{ width: `${((currentIndex + 1) / sutraText.length) * 100}%` }}
            />
          </div>
          <span className="text-xs text-zen-stone">{currentIndex + 1}/{sutraText.length}</span>
        </div>

        {/* Canvas — absolutely positioned to avoid layout shift */}
        <div
          ref={containerRef}
          className="flex-1 relative overflow-hidden"
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full touch-none"
            style={{ touchAction: 'none' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onPointerCancel={handlePointerUp}
          />
        </div>

        {/* Bottom controls */}
        <div className="flex items-center justify-center gap-4 py-3 pb-safe">
          <button
            onClick={clearCanvas}
            className="flex items-center gap-1.5 px-5 py-2.5 border border-zen-sand rounded-lg text-base text-zen-stone active:bg-zen-sand/30 transition"
            style={{ touchAction: 'manipulation' }}
          >
            <RotateCcw size={14} />
            清除
          </button>
          <button
            onClick={skipChar}
            className="flex items-center gap-1.5 px-5 py-2.5 border border-zen-sand rounded-lg text-base text-zen-stone active:bg-zen-sand/30 transition"
            style={{ touchAction: 'manipulation' }}
          >
            <ChevronRight size={14} />
            跳过
          </button>
        </div>

        {/* Upcoming characters preview */}
        {upcoming.length > 0 && (
          <div className="flex items-center justify-center gap-1.5 pb-3">
            <span className="text-[10px] text-zen-stone/50 mr-1">接下来</span>
            {upcoming.map((ch, i) => (
              <span
                key={`${currentIndex}-${i}`}
                className="text-lg font-serif"
                style={{ color: `rgba(168, 168, 160, ${0.5 - i * 0.08})` }}
              >
                {ch}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
