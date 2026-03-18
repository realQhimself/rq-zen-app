// --- Storage helpers (with quota/error fallback) ---

const memoryFallback = {};

export function safeLoad(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    return memoryFallback[key] ?? fallback;
  }
}

export function safeSave(key, value) {
  const json = JSON.stringify(value);
  try {
    localStorage.setItem(key, json);
  } catch {
    // Quota exceeded — evict non-essential keys, retry once
    const evictable = ['zen_monk_pos', 'zen_garden_muted', 'zen_meditation_mode'];
    evictable.forEach((k) => {
      try { localStorage.removeItem(k); } catch { /* noop */ }
    });
    try {
      localStorage.setItem(key, json);
      return;
    } catch { /* still full, fall back to memory */ }
    memoryFallback[key] = value;
  }
}

// --- Storage keys ---

export const KEYS = {
  PROFILE: 'zen_profile',
  GARDEN: 'zen_garden',
  MEDITATION: 'zen_meditation',
  FISH_COUNT: 'zen_fish_count',
  SUTRA_INDEX: 'zen_sutra_index',
  MEDITATION_MODE: 'zen_meditation_mode',
  MEDITATION_TIMER: 'zen_meditation_timer',
  GARDEN_MUTED: 'zen_garden_muted',
  MONK_POS: 'zen_monk_pos',
};

// --- 13 Buddhist Ranks ---

export const RANKS = [
  { level: 1, name: '凡夫', meaning: 'Ordinary Person', xp: 0 },
  { level: 2, name: '信心', meaning: 'Heart of Faith', xp: 100 },
  { level: 3, name: '发心住', meaning: 'Aspiration Awakened', xp: 400 },
  { level: 4, name: '精进行', meaning: 'Diligent Practice', xp: 1000 },
  { level: 5, name: '回向位', meaning: 'Dedication of Merit', xp: 2000 },
  { level: 6, name: '欢喜地', meaning: 'Ground of Joy', xp: 3800 },
  { level: 7, name: '离垢地', meaning: 'Stainless Ground', xp: 6600 },
  { level: 8, name: '发光地', meaning: 'Luminous Ground', xp: 10600 },
  { level: 9, name: '焰慧地', meaning: 'Blazing Wisdom', xp: 16100 },
  { level: 10, name: '不动地', meaning: 'Immovable Ground', xp: 23600 },
  { level: 11, name: '法云地', meaning: 'Dharma Cloud', xp: 33600 },
  { level: 12, name: '等觉', meaning: 'Equal Enlightenment', xp: 47600 },
  { level: 13, name: '妙觉', meaning: 'Buddhahood', xp: 67600 },
];

// --- Profile (XP) helpers ---

const DEFAULT_XP = { totalXP: 0, spentXP: 0 };

export function readProfile() {
  return safeLoad(KEYS.PROFILE, DEFAULT_XP);
}

export function writeProfile(p) {
  safeSave(KEYS.PROFILE, p);
}

export function getBalance() {
  const p = readProfile();
  return p.totalXP - p.spentXP;
}

export function addXP(amount) {
  const p = readProfile();
  p.totalXP += amount;
  writeProfile(p);
}

/**
 * Spend XP. Returns true if successful, false if insufficient balance.
 */
export function spendXP(amount) {
  const p = readProfile();
  if (p.totalXP - p.spentXP < amount) return false;
  p.spentXP += amount;
  writeProfile(p);
  return true;
}

export function refundXP(amount) {
  const p = readProfile();
  p.spentXP = Math.max(0, p.spentXP - amount);
  writeProfile(p);
}

// --- Rank helpers ---

export function getRank(totalXP) {
  let rank = RANKS[0];
  for (const r of RANKS) {
    if (totalXP >= r.xp) rank = r;
    else break;
  }
  return rank;
}

export function getNextRank(totalXP) {
  for (const r of RANKS) {
    if (totalXP < r.xp) return r;
  }
  return null;
}
