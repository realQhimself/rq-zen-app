import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { getSutraById } from '../../data/sutras/index';
import { recordSession, checkAchievements } from '../../utils/sutraProgress';
import { getAllStrokes, clearStrokes } from '../../utils/sutraDb';
import { addXP } from '../../utils/zen';

export default function SutraCompletion({ sutraId, dedication, stats, onDone }) {
  const sutra = getSutraById(sutraId);
  const [scrollPreview, setScrollPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [newAchievements, setNewAchievements] = useState([]);
  const exportCanvasRef = useRef(null);
  const recorded = useRef(false);

  // Record session and check achievements on mount
  useEffect(() => {
    if (recorded.current) return;
    recorded.current = true;

    const today = new Date().toISOString().split('T')[0];
    recordSession({
      date: today,
      sutraId,
      chars: stats.chars,
      duration: stats.duration,
      dedication,
    });

    const unlocked = checkAchievements();
    if (unlocked.length > 0) {
      setNewAchievements(unlocked);
    }
  }, [sutraId, stats, dedication]);

  // Build scroll preview from saved strokes
  useEffect(() => {
    buildScrollPreview();
  }, []);

  const buildScrollPreview = async () => {
    const strokes = await getAllStrokes(sutraId);
    if (strokes.length === 0) return;

    const charSize = 60;
    const cols = 10;
    const rows = Math.ceil(strokes.length / cols);
    const padding = 40;
    const titleHeight = 80;
    const footerHeight = 80;
    const width = cols * charSize + padding * 2;
    const height = titleHeight + rows * charSize + footerHeight + padding * 2;

    const canvas = document.createElement('canvas');
    canvas.width = width * 2;
    canvas.height = height * 2;
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);

    // Background
    ctx.fillStyle = '#f5f0e8';
    ctx.fillRect(0, 0, width, height);

    // Title
    ctx.fillStyle = '#8a3b3b';
    ctx.font = '18px "Noto Serif SC", serif';
    ctx.textAlign = 'center';
    ctx.fillText(sutra.name, width / 2, padding + 30);

    ctx.fillStyle = '#a8a8a0';
    ctx.font = '11px "Noto Serif SC", serif';
    ctx.fillText(sutra.author, width / 2, padding + 52);

    // Draw each character stroke
    for (let i = 0; i < strokes.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = padding + col * charSize;
      const y = padding + titleHeight + row * charSize;

      await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, x, y, charSize, charSize);
          resolve();
        };
        img.onerror = resolve;
        img.src = strokes[i].dataUrl;
      });
    }

    // Footer
    const footerY = padding + titleHeight + rows * charSize + 20;
    ctx.fillStyle = '#a8a8a0';
    ctx.font = '10px "Noto Serif SC", serif';
    ctx.textAlign = 'center';

    const dateStr = new Date().toLocaleDateString('zh-CN', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    ctx.fillText(dateStr, width / 2, footerY);

    if (dedication) {
      ctx.fillStyle = '#c4a862';
      ctx.font = '12px "Noto Serif SC", serif';
      ctx.fillText(`愿以此功德 · ${dedication}`, width / 2, footerY + 20);
    }

    exportCanvasRef.current = canvas;
    setScrollPreview(canvas.toDataURL('image/png'));
  };

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const canvas = exportCanvasRef.current;
      if (!canvas) return;

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));

      if (navigator.share && blob) {
        const file = new File([blob], `${sutra.name}.png`, { type: 'image/png' });
        await navigator.share({ files: [file] }).catch(() => {});
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${sutra.name}-${new Date().toISOString().split('T')[0]}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setSaving(false);
    }
  }, [sutra.name]);

  const handleDone = useCallback(async () => {
    await clearStrokes(sutraId).catch(() => {});
    onDone();
  }, [sutraId, onDone]);

  const minutes = Math.floor(stats.duration / 60);
  const xpEarned = stats.written ?? stats.chars;

  return (
    <div className="h-full flex flex-col items-center justify-center px-6"
      style={{ background: 'linear-gradient(180deg, #2c2c2c 0%, #1a1a18 100%)' }}>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-sm text-center"
      >
        <p className="text-sm text-zen-gold tracking-[6px] mb-6">回 向</p>

        {/* Scroll preview */}
        {scrollPreview && (
          <div className="mb-6 mx-auto max-w-[200px] rounded-lg overflow-hidden shadow-lg">
            <img src={scrollPreview} alt="作品预览" className="w-full" />
          </div>
        )}

        {dedication && (
          <>
            <p className="text-sm text-zen-stone">愿以此功德</p>
            <p className="text-base text-zen-gold mt-1 mb-4">{dedication}</p>
          </>
        )}

        {/* New achievements */}
        {newAchievements.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-4 py-3 px-4 bg-white/5 rounded-xl"
          >
            <p className="text-xs text-zen-gold mb-2">新成就解锁</p>
            <div className="flex justify-center gap-3">
              {newAchievements.map((a) => (
                <div key={a.id} className="text-center">
                  <span className="text-2xl">{a.icon}</span>
                  <p className="text-[10px] text-white/70 mt-1">{a.name}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Stats */}
        <p className="text-xs text-white/30 mb-6">
          用时 {minutes > 0 ? `${minutes} 分钟` : '< 1 分钟'} · +{xpEarned} XP
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving || !scrollPreview}
            className="flex-1 py-3.5 border border-zen-gold/30 text-zen-gold rounded-xl text-sm bg-zen-gold/10 active:bg-zen-gold/20 transition disabled:opacity-30"
          >
            {saving ? '保存中...' : '保存作品'}
          </button>
          <button
            onClick={handleDone}
            className="flex-1 py-3.5 bg-zen-gold text-zen-dark rounded-xl text-sm font-bold active:bg-zen-gold/80 transition"
          >
            完成
          </button>
        </div>
      </motion.div>
    </div>
  );
}
