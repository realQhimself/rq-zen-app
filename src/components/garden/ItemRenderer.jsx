import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GARDEN_ITEMS } from './gardenData';

function DeleteModal({ itemName, onConfirm, onCancel }) {
  return (
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
}

function getInteractionClass(item, activeInteractions) {
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
}

export default function ItemRenderer({ items, activeInteractions, placingItem, onRemove, onNavigate, newlyPlacedId }) {
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [longPressProgress, setLongPressProgress] = useState(null);
  const longPressTimerRef = useRef(null);
  const longPressTouchStart = useRef(null);

  const handleTouchStart = (e, item) => {
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

  const handleTouchMove = (e) => {
    if (!longPressTouchStart.current) return;
    const touch = e.touches ? e.touches[0] : e;
    const dx = touch.clientX - longPressTouchStart.current.x;
    const dy = touch.clientY - longPressTouchStart.current.y;
    if (Math.sqrt(dx * dx + dy * dy) > 10) {
      clearTimeout(longPressTimerRef.current);
      setLongPressProgress(null);
    }
  };

  const handleTouchEnd = () => {
    clearTimeout(longPressTimerRef.current);
    longPressTouchStart.current = null;
    setLongPressProgress(null);
  };

  const confirmDelete = () => {
    if (deleteCandidate) {
      onRemove(deleteCandidate.itemId);
      if (navigator.vibrate) navigator.vibrate(30);
    }
    setShowDeleteConfirm(false);
    setDeleteCandidate(null);
  };

  return (
    <>
      {items.map((item) => {
        const def = GARDEN_ITEMS.find(d => d.id === item.type);
        if (!def) return null;
        const isNearMonk = activeInteractions.has(item.id);
        const interactionClass = getInteractionClass(item, activeInteractions);
        const isBeingDeleted = longPressProgress?.itemId === item.id;
        const hasLink = def.link && isNearMonk;
        const isNewlyPlaced = item.id === newlyPlacedId;

        return (
          <motion.div
            key={item.id}
            data-garden-item="true"
            className={`absolute ${interactionClass}`}
            initial={isNewlyPlaced ? { scale: 0, opacity: 0 } : false}
            animate={{ scale: 1, opacity: 1 }}
            transition={isNewlyPlaced ? { type: 'spring', stiffness: 400, damping: 15 } : undefined}
            style={{
              left: `${item.x}%`,
              top: `${item.y}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: Math.floor(item.y),
              pointerEvents: placingItem ? 'none' : 'auto',
            }}
            onTouchStart={(e) => handleTouchStart(e, item)}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={(e) => handleTouchStart(e, item)}
            onMouseMove={handleTouchMove}
            onMouseUp={handleTouchEnd}
            onMouseLeave={handleTouchEnd}
          >
            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-3 rounded-full"
              style={{ background: 'radial-gradient(ellipse, rgba(0,0,0,0.15), transparent)', filter: 'blur(1px)' }}
            />
            <img
              src={def.image}
              alt={def.name}
              className="w-16 h-16 select-none"
              style={{ imageRendering: 'pixelated' }}
              draggable={false}
            />

            <AnimatePresence>
              {hasLink && (
                <motion.button
                  initial={{ opacity: 0, y: 8, scale: 0.8 }}
                  animate={{ opacity: 1, y: -6, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.8 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  onClick={(e) => { e.stopPropagation(); onNavigate(def.link); }}
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

            {isBeingDeleted && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 64 64">
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
          </motion.div>
        );
      })}

      <AnimatePresence>
        {showDeleteConfirm && deleteCandidate && (
          <DeleteModal
            itemName={deleteCandidate.itemName}
            onConfirm={confirmDelete}
            onCancel={() => { setShowDeleteConfirm(false); setDeleteCandidate(null); }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
