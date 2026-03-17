import React, { useRef, useEffect, useState } from 'react';
import { ArrowLeft, Eraser, Check, RotateCcw, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// --- XP Helper ---
const awardXP = (amount) => {
  try {
    const p = JSON.parse(localStorage.getItem('zen_profile') || '{"totalXP":0,"spentXP":0}');
    p.totalXP += amount;
    localStorage.setItem('zen_profile', JSON.stringify(p));
  } catch { /* ignore */ }
};

const HEART_SUTRA =`观自在菩萨行深般若波罗蜜多时照见五蕴皆空度一切苦厄舍利子色不异空空不异色色即是空空即是色受想行识亦复如是舍利子是诸法空相不生不灭不垢不净不增不减`;

export default function Sutra() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const refCanvasRef = useRef(null);
  const advanceTimerRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(() => parseInt(localStorage.getItem('zen_sutra_index') || '0'));
  const [isDrawing, setIsDrawing] = useState(false);
  const [feedback, setFeedback] = useState(null); // 'success', 'retry'

  const currentChar = HEART_SUTRA[currentIndex];

  useEffect(() => {
    localStorage.setItem('zen_sutra_index', currentIndex);
  }, [currentIndex]);

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
    // Make sure we use the full container size
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
    
    // Calculate Box Size - Limit to 80% of width or height (whichever is smaller) to ensure padding
    const size = Math.min(width, height) * 0.75; 
    const startX = (width - size) / 2;
    const startY = (height - size) / 2;

    // Save dimensions for font scaling
    ctx.save();
    
    // Draw Grid (Tian Zi Ge)
    ctx.beginPath();
    ctx.strokeStyle = '#e5e5e5';
    ctx.lineWidth = 1;
    
    // Box
    ctx.strokeRect(startX, startY, size, size);
    
    // Diagonals
    ctx.moveTo(startX, startY); ctx.lineTo(startX + size, startY + size);
    ctx.moveTo(startX + size, startY); ctx.lineTo(startX, startY + size);
    
    // Middle lines
    ctx.moveTo(startX, startY + size/2); ctx.lineTo(startX + size, startY + size/2);
    ctx.moveTo(startX + size/2, startY); ctx.lineTo(startX + size/2, startY + size);
    ctx.stroke();

    // Draw Text Guide (KaiTi / Serif)
    // Font size should be slightly smaller than the box to fit comfortably
    ctx.font = `400 ${size * 0.8}px "Noto Serif SC", serif`;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'; 
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Center text exactly in the box
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

    // Render target character in solid black — same positioning as drawGuide
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
        // User ink: dark (r < 80) and opaque (a > 180)
        // This excludes the guide (alpha ~38) and grid lines (r ~229)
        if (userData[i + 3] > 180 && userData[i] < 80) {
          overlapPixels++;
        }
      }
    }

    return refPixels === 0 ? 0 : overlapPixels / refPixels;
  };

  const triggerAdvance = () => {
    setFeedback('success');
    awardXP(1);
    advanceTimerRef.current = setTimeout(() => {
      if (currentIndex < HEART_SUTRA.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setFeedback(null);
      }
    }, 1500);
  };

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
        x: clientX - rect.left,
        y: clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    setIsDrawing(true);
    setFeedback(null); 
    const { x, y } = getPos(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 12; 
    ctx.strokeStyle = '#2c2c2c';
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const { x, y } = getPos(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if(isDrawing) {
        const ctx = canvasRef.current.getContext('2d');
        ctx.closePath();
        setIsDrawing(false);

        // Auto-check overlap after each stroke
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
      // Lower threshold for manual button press (user is asking to proceed)
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
        <Link to="/" className="p-2 text-zen-stone rounded-full hover:bg-zen-sand/50 transition">
            <ArrowLeft size={24} />
        </Link>
        <div className="flex flex-col items-center">
            <h2 className="text-lg font-serif font-bold text-zen-ink">
              <span className="text-zen-red/60">般若</span>波罗蜜多心经
            </h2>
            <span className="text-xs text-zen-stone">{currentIndex + 1} / {HEART_SUTRA.length}</span>
        </div>
        <div className="w-10"></div>
        {/* Progress bar */}
        <div
          className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-zen-red/60 to-zen-gold/40 transition-all duration-500"
          style={{ width: `${((currentIndex + 1) / HEART_SUTRA.length) * 100}%` }}
        />
      </div>

      {/* Main Canvas Area - Padded to prevent edge cutting */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden p-4">
         <canvas 
            ref={canvasRef}
            className="touch-none"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
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
        <button onClick={clearCanvas} className="flex flex-col items-center text-zen-stone active:text-zen-ink transition">
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
             onClick={() => setCurrentIndex(prev => Math.min(prev + 1, HEART_SUTRA.length - 1))}
             className="flex flex-col items-center text-zen-stone active:text-zen-ink transition"
        >
            <ChevronRight size={22} />
            <span className="text-xs mt-1">跳过</span>
        </button>
      </div>

    </div>
  );
}
