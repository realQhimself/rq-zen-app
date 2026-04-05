import React, { useMemo } from 'react';
import { ACHIEVEMENTS } from '../../data/achievements';
import {
  getStreak,
  getTotalChars,
  getHeatmapData,
  getUnlockedAchievements,
} from '../../utils/sutraProgress';

function getLastNDays(n) {
  const days = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

function getHeatColor(chars, maxChars) {
  if (chars === 0) return '#e8e4dc';
  const ratio = Math.min(chars / maxChars, 1);
  if (ratio < 0.25) return '#d4e8c4';
  if (ratio < 0.5) return '#b8d4a0';
  if (ratio < 0.75) return '#8aba6a';
  return '#4a7c34';
}

export default function SutraProgress() {
  const streak = getStreak(new Date().toISOString().split('T')[0]);
  const totalChars = getTotalChars();
  const heatmap = getHeatmapData();
  const unlocked = getUnlockedAchievements();

  // Skip rendering if no sutra activity yet
  if (totalChars === 0 && streak === 0) return null;

  const days = useMemo(() => getLastNDays(60), []);
  const maxChars = useMemo(() => {
    const vals = Object.values(heatmap);
    return vals.length > 0 ? Math.max(...vals) : 1;
  }, [heatmap]);

  return (
    <div className="zen-card p-4 space-y-3">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-[10px] text-zen-stone">抄经修行</p>
          <p className="text-xl font-bold font-mono text-zen-ink">
            连续 {streak} 天
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-zen-stone">累计抄写</p>
          <p className="text-base font-mono text-zen-gold">
            {totalChars.toLocaleString()} 字
          </p>
        </div>
      </div>

      {/* Heatmap */}
      <div className="bg-white/60 rounded-lg p-2">
        <div className="grid gap-[2px]"
          style={{ gridTemplateColumns: 'repeat(15, 1fr)' }}>
          {days.map((day) => (
            <div
              key={day}
              className="aspect-square rounded-[2px]"
              style={{ backgroundColor: getHeatColor(heatmap[day] || 0, maxChars) }}
              title={`${day}: ${heatmap[day] || 0} 字`}
            />
          ))}
        </div>
        <div className="flex justify-end items-center gap-1 mt-1.5">
          <span className="text-[9px] text-zen-stone/50">少</span>
          {['#e8e4dc', '#d4e8c4', '#8aba6a', '#4a7c34'].map((c) => (
            <div key={c} className="w-2.5 h-2.5 rounded-[2px]" style={{ backgroundColor: c }} />
          ))}
          <span className="text-[9px] text-zen-stone/50">多</span>
        </div>
      </div>

      {/* Achievements */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {ACHIEVEMENTS.map((a) => {
          const isUnlocked = unlocked.includes(a.id);
          return (
            <div
              key={a.id}
              className={`shrink-0 w-[72px] text-center rounded-lg py-2 px-1 ${
                isUnlocked ? 'bg-white' : 'bg-white/30 opacity-40'
              }`}
            >
              <span className="text-xl">{a.icon}</span>
              <p className="text-[9px] text-zen-ink mt-1 leading-tight">{a.name}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
