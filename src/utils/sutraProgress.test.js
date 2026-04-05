/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

let mod;

beforeEach(async () => {
  localStorage.clear();
  vi.resetModules();
  mod = await import('./sutraProgress.js');
});

describe('loadSutraProgress / saveSutraProgress', () => {
  it('returns empty object when no progress saved', () => {
    expect(mod.loadSutraProgress()).toEqual({});
  });

  it('saves and loads progress for a sutra', () => {
    mod.saveSutraProgress('heart-sutra', 42);
    expect(mod.getSutraCharIndex('heart-sutra')).toBe(42);
  });

  it('migrates legacy zen_sutra_index key', () => {
    localStorage.setItem('zen_sutra_index', '15');
    const progress = mod.loadSutraProgress();
    expect(progress['heart-sutra']).toBe(15);
  });
});

describe('recordSession', () => {
  it('adds a session record', () => {
    mod.recordSession({
      date: '2026-04-05',
      sutraId: 'heart-sutra',
      chars: 260,
      duration: 1920,
      dedication: '家人平安',
    });
    const sessions = mod.getSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].sutraId).toBe('heart-sutra');
  });
});

describe('streak', () => {
  it('returns 0 when no sessions', () => {
    expect(mod.getStreak()).toBe(0);
  });

  it('counts consecutive days', () => {
    mod.recordSession({ date: '2026-04-03', sutraId: 'a', chars: 10, duration: 60, dedication: '' });
    mod.recordSession({ date: '2026-04-04', sutraId: 'a', chars: 10, duration: 60, dedication: '' });
    mod.recordSession({ date: '2026-04-05', sutraId: 'a', chars: 10, duration: 60, dedication: '' });
    expect(mod.getStreak('2026-04-05')).toBe(3);
  });

  it('breaks streak on gap', () => {
    mod.recordSession({ date: '2026-04-01', sutraId: 'a', chars: 10, duration: 60, dedication: '' });
    mod.recordSession({ date: '2026-04-05', sutraId: 'a', chars: 10, duration: 60, dedication: '' });
    expect(mod.getStreak('2026-04-05')).toBe(1);
  });
});

describe('getTotalChars', () => {
  it('sums chars across sessions', () => {
    mod.recordSession({ date: '2026-04-04', sutraId: 'a', chars: 100, duration: 60, dedication: '' });
    mod.recordSession({ date: '2026-04-05', sutraId: 'b', chars: 200, duration: 120, dedication: '' });
    expect(mod.getTotalChars()).toBe(300);
  });
});

describe('getHeatmapData', () => {
  it('returns date-to-chars map', () => {
    mod.recordSession({ date: '2026-04-05', sutraId: 'a', chars: 100, duration: 60, dedication: '' });
    mod.recordSession({ date: '2026-04-05', sutraId: 'b', chars: 50, duration: 30, dedication: '' });
    const data = mod.getHeatmapData();
    expect(data['2026-04-05']).toBe(150);
  });
});

describe('checkAchievements', () => {
  it('unlocks total_chars achievement', () => {
    mod.recordSession({ date: '2026-04-05', sutraId: 'a', chars: 150, duration: 60, dedication: '' });
    const newlyUnlocked = mod.checkAchievements();
    expect(newlyUnlocked.map(a => a.id)).toContain('hundred-chars');
  });

  it('does not re-unlock already unlocked achievements', () => {
    mod.recordSession({ date: '2026-04-05', sutraId: 'a', chars: 150, duration: 60, dedication: '' });
    mod.checkAchievements();
    const second = mod.checkAchievements();
    expect(second).toHaveLength(0);
  });
});

describe('getCompletedSutraCount', () => {
  it('counts sutras where progress >= text length', () => {
    mod.saveSutraProgress('heart-sutra', 160);
    expect(mod.getCompletedSutraCount()).toBe(1);
  });
});
