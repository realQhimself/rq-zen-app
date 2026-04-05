import { safeLoad, safeSave, KEYS } from './zen';
import { SUTRAS } from '../data/sutras/index';
import { ACHIEVEMENTS } from '../data/achievements';

// --- Character Progress (per-sutra index) ---

export function loadSutraProgress() {
  const progress = safeLoad(KEYS.SUTRA_PROGRESS, null);
  if (progress) return progress;

  // Migrate legacy key
  const legacyIndex = safeLoad(KEYS.SUTRA_INDEX, 0);
  const migrated = {};
  if (legacyIndex > 0) {
    migrated['heart-sutra'] = legacyIndex;
  }
  safeSave(KEYS.SUTRA_PROGRESS, migrated);
  return migrated;
}

export function getSutraCharIndex(sutraId) {
  const progress = loadSutraProgress();
  return progress[sutraId] || 0;
}

export function saveSutraProgress(sutraId, index) {
  const progress = loadSutraProgress();
  progress[sutraId] = index;
  safeSave(KEYS.SUTRA_PROGRESS, progress);
  if (sutraId === 'heart-sutra') {
    safeSave(KEYS.SUTRA_INDEX, index);
  }
}

// --- Session Records ---

export function getSessions() {
  return safeLoad(KEYS.SUTRA_SESSIONS, []);
}

export function recordSession({ date, sutraId, chars, duration, dedication }) {
  const sessions = getSessions();
  sessions.push({ date, sutraId, chars, duration, dedication });
  safeSave(KEYS.SUTRA_SESSIONS, sessions);
}

// --- Streak ---

export function getStreak(today) {
  const sessions = getSessions();
  if (sessions.length === 0) return 0;

  const todayStr = today || new Date().toISOString().split('T')[0];
  const dates = [...new Set(sessions.map((s) => s.date))].sort().reverse();

  if (dates[0] !== todayStr) return 0;

  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diffDays = (prev - curr) / (1000 * 60 * 60 * 24);
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// --- Aggregations ---

export function getTotalChars() {
  return getSessions().reduce((sum, s) => sum + s.chars, 0);
}

export function getHeatmapData() {
  const sessions = getSessions();
  const map = {};
  for (const s of sessions) {
    map[s.date] = (map[s.date] || 0) + s.chars;
  }
  return map;
}

export function getCompletedSutraCount() {
  const progress = loadSutraProgress();
  let count = 0;
  for (const sutra of SUTRAS) {
    if ((progress[sutra.id] || 0) >= sutra.text.length) {
      count++;
    }
  }
  return count;
}

// --- Achievements ---

export function getUnlockedAchievements() {
  return safeLoad(KEYS.SUTRA_ACHIEVEMENTS, []);
}

export function checkAchievements() {
  const unlocked = getUnlockedAchievements();
  const newlyUnlocked = [];

  for (const achievement of ACHIEVEMENTS) {
    if (unlocked.includes(achievement.id)) continue;

    const { condition } = achievement;
    let met = false;

    if (condition.type === 'total_chars') {
      met = getTotalChars() >= condition.threshold;
    } else if (condition.type === 'streak_days') {
      met = getStreak() >= condition.threshold;
    } else if (condition.type === 'completed_sutras') {
      met = getCompletedSutraCount() >= condition.threshold;
    } else if (condition.type === 'completed_all_sutras') {
      met = getCompletedSutraCount() >= SUTRAS.length;
    }

    if (met) {
      unlocked.push(achievement.id);
      newlyUnlocked.push(achievement);
    }
  }

  if (newlyUnlocked.length > 0) {
    safeSave(KEYS.SUTRA_ACHIEVEMENTS, unlocked);
  }

  return newlyUnlocked;
}
