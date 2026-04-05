# Sutra Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the sutra copying feature from a basic character tracer into a full ritual experience with dedication flow, improved brush, progress tracking, and export.

**Architecture:** The current monolithic `Sutra.jsx` (556 lines) is split into a multi-stage flow (Selection → Dedication → Writer → Completion) with shared state managed via React state in the parent. Data layer is extracted into standalone JSON/JS files. IndexedDB stores handwritten stroke images for export. A new `SutraProgress` component is added to the Home page.

**Tech Stack:** React 19, Canvas 2D, IndexedDB (via idb-keyval or raw API), Framer Motion, Tailwind CSS 4, Vitest

---

## File Map

### New Files

| File | Responsibility |
|------|----------------|
| `src/data/sutras/heart-sutra.json` | Heart Sutra data |
| `src/data/sutras/diamond-verse.json` | Diamond Sutra verse data |
| `src/data/sutras/platform-verse.json` | Platform Sutra verse data |
| `src/data/sutras/avalokitesvara.json` | Avalokitesvara chapter data |
| `src/data/sutras/great-compassion.json` | Great Compassion Mantra data |
| `src/data/sutras/three-char.json` | Three Character Classic data |
| `src/data/sutras/tao-ch1.json` | Daodejing Ch.1 data |
| `src/data/sutras/diamond-opening.json` | Diamond Sutra opening data |
| `src/data/sutras/index.js` | Import all JSON, export SUTRAS array + getSutraById |
| `src/data/dedications.js` | Dedication label presets |
| `src/data/achievements.js` | Achievement definitions (name, icon, condition) |
| `src/utils/sutraDb.js` | IndexedDB helpers for stroke image storage |
| `src/utils/sutraDb.test.js` | Tests for IndexedDB helpers |
| `src/utils/sutraProgress.js` | Progress, streak, session, achievement logic |
| `src/utils/sutraProgress.test.js` | Tests for progress/streak/achievement logic |
| `src/hooks/useBrushEngine.js` | Canvas brush physics hook |
| `src/hooks/useCharRecognition.js` | Overlap detection + auto-advance hook |
| `src/components/sutra/SutraSelection.jsx` | Sutra list with progress |
| `src/components/sutra/SutraDedication.jsx` | Pre-writing dedication page |
| `src/components/sutra/SutraWriter.jsx` | Full-screen writing canvas |
| `src/components/sutra/SutraCompletion.jsx` | Post-writing dedication + export |
| `src/components/sutra/SutraProgress.jsx` | Home page progress block (heatmap, streaks, achievements) |
| `public/sounds/brush-stroke.mp3` | Brush touch sound effect (real recording) |

### Modified Files

| File | Changes |
|------|---------|
| `src/pages/Sutra.jsx` | Rewrite: thin orchestrator routing between 4 stages |
| `src/pages/Home.jsx` | Add SutraProgress component import + render |
| `src/utils/zen.js` | Add new KEYS for sutra sessions/streak/achievements |
| `src/data/sutras.js` | Delete (replaced by `src/data/sutras/index.js`) |

---

## Task 1: Data Layer — Extract Sutra Content to JSON

**Files:**
- Create: `src/data/sutras/heart-sutra.json`, `src/data/sutras/diamond-verse.json`, `src/data/sutras/platform-verse.json`, `src/data/sutras/avalokitesvara.json`, `src/data/sutras/great-compassion.json`, `src/data/sutras/three-char.json`, `src/data/sutras/tao-ch1.json`, `src/data/sutras/diamond-opening.json`
- Create: `src/data/sutras/index.js`
- Create: `src/data/dedications.js`
- Create: `src/data/achievements.js`
- Delete: `src/data/sutras.js`
- Modify: `src/pages/Sutra.jsx` — update import path

- [ ] **Step 1: Create JSON files for all 8 sutras**

Each file follows this format (example for heart-sutra.json):

```json
{
  "id": "heart-sutra",
  "name": "般若波罗蜜多心经",
  "author": "玄奘译",
  "description": "佛教核心经典，阐述空性智慧",
  "category": "buddhist",
  "text": "观自在菩萨行深般若波罗蜜多时照见五蕴皆空度一切苦厄舍利子色不异空空不异色色即是空空即是色受想行识亦复如是舍利子是诸法空相不生不灭不垢不净不增不减"
}
```

Create all 8 files in `src/data/sutras/` with the exact text from the current `src/data/sutras.js`. Add `"category": "buddhist"` for the 6 Buddhist texts, `"category": "confucian"` for 三字经, `"category": "taoist"` for 道德经.

- [ ] **Step 2: Create the index file**

Create `src/data/sutras/index.js`:

```js
import heartSutra from './heart-sutra.json';
import diamondVerse from './diamond-verse.json';
import platformVerse from './platform-verse.json';
import avalokitesvara from './avalokitesvara.json';
import greatCompassion from './great-compassion.json';
import threeChar from './three-char.json';
import taoCh1 from './tao-ch1.json';
import diamondOpening from './diamond-opening.json';

export const SUTRAS = [
  heartSutra,
  diamondVerse,
  platformVerse,
  avalokitesvara,
  greatCompassion,
  threeChar,
  taoCh1,
  diamondOpening,
];

export function getSutraById(id) {
  return SUTRAS.find((s) => s.id === id) || null;
}
```

- [ ] **Step 3: Create dedications data**

Create `src/data/dedications.js`:

```js
export const DEDICATIONS = [
  { id: 'family', label: '家人平安' },
  { id: 'beings', label: '众生安乐' },
  { id: 'self', label: '自我修行' },
  { id: 'karma', label: '消除业障' },
];
```

- [ ] **Step 4: Create achievements data**

Create `src/data/achievements.js`:

```js
export const ACHIEVEMENTS = [
  {
    id: 'hundred-chars',
    name: '百字成文',
    icon: '🏮',
    description: '累计抄写 100 字',
    condition: { type: 'total_chars', threshold: 100 },
  },
  {
    id: 'seven-days',
    name: '七日精进',
    icon: '🔥',
    description: '连续抄经 7 天',
    condition: { type: 'streak_days', threshold: 7 },
  },
  {
    id: 'bodhi-sprout',
    name: '菩提发芽',
    icon: '🌳',
    description: '完成第一部经文',
    condition: { type: 'completed_sutras', threshold: 1 },
  },
  {
    id: 'thousand-chars',
    name: '千字入心',
    icon: '📿',
    description: '累计抄写 1000 字',
    condition: { type: 'total_chars', threshold: 1000 },
  },
  {
    id: 'thirty-days',
    name: '月轮圆满',
    icon: '🌕',
    description: '连续抄经 30 天',
    condition: { type: 'streak_days', threshold: 30 },
  },
  {
    id: 'hundred-days',
    name: '百日筑基',
    icon: '🏔️',
    description: '连续抄经 100 天',
    condition: { type: 'streak_days', threshold: 100 },
  },
  {
    id: 'sutra-complete',
    name: '经书圆满',
    icon: '🪷',
    description: '完成所有经文',
    condition: { type: 'completed_all_sutras' },
  },
];
```

- [ ] **Step 5: Update imports in Sutra.jsx**

In `src/pages/Sutra.jsx`, change:
```js
import { SUTRAS, getSutraById } from '../data/sutras';
```
to:
```js
import { SUTRAS, getSutraById } from '../data/sutras/index';
```

- [ ] **Step 6: Delete old data file**

Delete `src/data/sutras.js`.

- [ ] **Step 7: Verify build and tests pass**

Run: `cd /Users/qsmini/zen-app-local && npx vitest run && npm run build`
Expected: All tests pass, build succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/data/sutras/ src/data/dedications.js src/data/achievements.js src/pages/Sutra.jsx
git rm src/data/sutras.js
git commit -m "refactor: extract sutra data to JSON, add dedications and achievements data"
```

---

## Task 2: Progress & Streak Utilities

**Files:**
- Modify: `src/utils/zen.js` — add new storage keys
- Create: `src/utils/sutraProgress.js`
- Create: `src/utils/sutraProgress.test.js`

- [ ] **Step 1: Add new storage keys to zen.js**

In `src/utils/zen.js`, add to the KEYS object:

```js
SUTRA_SESSIONS: 'zen_sutra_sessions',
SUTRA_STREAK: 'zen_sutra_streak',
SUTRA_ACHIEVEMENTS: 'zen_sutra_achievements',
```

- [ ] **Step 2: Write failing tests for sutraProgress**

Create `src/utils/sutraProgress.test.js`:

```js
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
    mod.checkAchievements(); // first unlock
    const second = mod.checkAchievements();
    expect(second).toHaveLength(0);
  });
});

describe('getCompletedSutraCount', () => {
  it('counts sutras where progress >= text length', () => {
    mod.saveSutraProgress('heart-sutra', 160); // heart sutra has 160 chars
    expect(mod.getCompletedSutraCount()).toBe(1);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd /Users/qsmini/zen-app-local && npx vitest run src/utils/sutraProgress.test.js`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement sutraProgress.js**

Create `src/utils/sutraProgress.js`:

```js
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
  // Keep legacy key in sync for Heart Sutra
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

  // Get unique dates sorted descending
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
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd /Users/qsmini/zen-app-local && npx vitest run src/utils/sutraProgress.test.js`
Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/utils/zen.js src/utils/sutraProgress.js src/utils/sutraProgress.test.js
git commit -m "feat: add sutra progress, streak, session, and achievement utilities"
```

---

## Task 3: IndexedDB Stroke Storage

**Files:**
- Create: `src/utils/sutraDb.js`
- Create: `src/utils/sutraDb.test.js`

- [ ] **Step 1: Write failing tests**

Create `src/utils/sutraDb.test.js`:

```js
/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { saveStroke, getStroke, getAllStrokes, clearStrokes } from './sutraDb';

// jsdom has a minimal indexedDB via fake-indexeddb
// If not available, install: npm install -D fake-indexeddb
// and add to test setup

beforeEach(async () => {
  await clearStrokes('test-sutra');
});

describe('sutraDb', () => {
  it('saves and retrieves a stroke image', async () => {
    await saveStroke('test-sutra', 0, 'data:image/png;base64,abc');
    const result = await getStroke('test-sutra', 0);
    expect(result).toBe('data:image/png;base64,abc');
  });

  it('overwrites existing stroke at same index', async () => {
    await saveStroke('test-sutra', 0, 'old');
    await saveStroke('test-sutra', 0, 'new');
    const result = await getStroke('test-sutra', 0);
    expect(result).toBe('new');
  });

  it('returns null for missing stroke', async () => {
    const result = await getStroke('test-sutra', 999);
    expect(result).toBeNull();
  });

  it('getAllStrokes returns ordered array', async () => {
    await saveStroke('test-sutra', 2, 'c');
    await saveStroke('test-sutra', 0, 'a');
    await saveStroke('test-sutra', 1, 'b');
    const all = await getAllStrokes('test-sutra');
    expect(all).toEqual([
      { index: 0, dataUrl: 'a' },
      { index: 1, dataUrl: 'b' },
      { index: 2, dataUrl: 'c' },
    ]);
  });

  it('clearStrokes removes all for a sutra', async () => {
    await saveStroke('test-sutra', 0, 'a');
    await saveStroke('test-sutra', 1, 'b');
    await clearStrokes('test-sutra');
    const all = await getAllStrokes('test-sutra');
    expect(all).toEqual([]);
  });
});
```

- [ ] **Step 2: Check if fake-indexeddb is needed and install**

Run: `cd /Users/qsmini/zen-app-local && npx vitest run src/utils/sutraDb.test.js 2>&1 | head -20`

If indexedDB is not available in jsdom, install:
Run: `cd /Users/qsmini/zen-app-local && npm install -D fake-indexeddb`

- [ ] **Step 3: Implement sutraDb.js**

Create `src/utils/sutraDb.js`:

```js
const DB_NAME = 'zen-sutra-strokes';
const DB_VERSION = 1;
const STORE_NAME = 'strokes';

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: ['sutraId', 'index'] });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveStroke(sutraId, index, dataUrl) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({ sutraId, index, dataUrl });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getStroke(sutraId, index) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get([sutraId, index]);
    request.onsuccess = () => resolve(request.result?.dataUrl ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllStrokes(sutraId) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      const filtered = request.result
        .filter((r) => r.sutraId === sutraId)
        .sort((a, b) => a.index - b.index)
        .map(({ index, dataUrl }) => ({ index, dataUrl }));
      resolve(filtered);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function clearStrokes(sutraId) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      for (const item of request.result) {
        if (item.sutraId === sutraId) {
          store.delete([item.sutraId, item.index]);
        }
      }
      tx.oncomplete = () => resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}
```

- [ ] **Step 4: Run tests**

Run: `cd /Users/qsmini/zen-app-local && npx vitest run src/utils/sutraDb.test.js`
Expected: All tests PASS. If indexedDB not available, add `import 'fake-indexeddb/auto';` to the top of the test file and retry.

- [ ] **Step 5: Commit**

```bash
git add src/utils/sutraDb.js src/utils/sutraDb.test.js
git commit -m "feat: add IndexedDB storage for handwritten stroke images"
```

---

## Task 4: Brush Engine Hook

**Files:**
- Create: `src/hooks/useBrushEngine.js`

This extracts and improves the brush logic currently inline in `Sutra.jsx:286-409`.

- [ ] **Step 1: Create useBrushEngine.js**

Create `src/hooks/useBrushEngine.js`:

```js
import { useRef, useCallback } from 'react';

const BASE_WIDTH = 12;
const MIN_WIDTH = 4;
const MAX_WIDTH = 16;
const TAPER_POINTS = 5;
// Ink fading: alpha decreases over continuous drawing, resets on pen lift
const INK_FADE_RATE = 0.003; // per point drawn
const INK_MIN_ALPHA = 0.55;
const INK_INITIAL_ALPHA = 1.0;

export default function useBrushEngine() {
  const brushRef = useRef({
    prevX: 0,
    prevY: 0,
    prevTime: 0,
    pointCount: 0,
    prevWidth: MIN_WIDTH,
    inkAlpha: INK_INITIAL_ALPHA,
  });

  // Audio ref for brush sound
  const audioRef = useRef(null);

  const getPos = useCallback((e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const getPressure = useCallback((e) => {
    if (e.pressure !== undefined && e.pressure > 0 && e.pressure < 1) return e.pressure;
    if (e.touches?.[0]?.force > 0) return e.touches[0].force;
    return -1;
  }, []);

  const calcBrushWidth = useCallback((speed, pressure, pointCount) => {
    let width;
    if (pressure >= 0) {
      width = MIN_WIDTH + pressure * (MAX_WIDTH - MIN_WIDTH);
    } else {
      const speedFactor = 1.3 - Math.min(speed * 0.5, 1.0);
      width = BASE_WIDTH * speedFactor;
    }
    width = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width));
    // Taper start
    if (pointCount < TAPER_POINTS) {
      const t = pointCount / TAPER_POINTS;
      width = MIN_WIDTH + t * (width - MIN_WIDTH);
    }
    return width;
  }, []);

  const startStroke = useCallback((e, canvas) => {
    if (e.type.startsWith('touch') && e.cancelable) e.preventDefault();
    const { x, y } = getPos(e, canvas);
    const ctx = canvas.getContext('2d');

    brushRef.current = {
      prevX: x,
      prevY: y,
      prevTime: Date.now(),
      pointCount: 0,
      prevWidth: MIN_WIDTH,
      inkAlpha: INK_INITIAL_ALPHA, // Fresh ink on pen down
    };

    // Starting dot
    ctx.fillStyle = `rgba(44, 44, 44, ${brushRef.current.inkAlpha})`;
    ctx.beginPath();
    ctx.arc(x, y, MIN_WIDTH / 2, 0, Math.PI * 2);
    ctx.fill();

    // Play brush sound
    playBrushSound();
  }, [getPos]);

  const continueStroke = useCallback((e, canvas) => {
    if (e.type.startsWith('touch') && e.cancelable) e.preventDefault();
    const { x, y } = getPos(e, canvas);
    const now = Date.now();
    const brush = brushRef.current;

    const dx = x - brush.prevX;
    const dy = y - brush.prevY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return;

    const dt = Math.max(now - brush.prevTime, 1);
    const speed = dist / dt;

    brush.pointCount++;

    const pressure = getPressure(e);
    const targetWidth = calcBrushWidth(speed, pressure, brush.pointCount);
    // Smoother width transitions (0.35 instead of 0.5)
    const smoothWidth = brush.prevWidth + (targetWidth - brush.prevWidth) * 0.35;

    // Ink fade: gradually decrease alpha as user draws
    brush.inkAlpha = Math.max(INK_MIN_ALPHA, brush.inkAlpha - INK_FADE_RATE);

    // Speed-based alpha variation on top of ink fade
    const speedAlpha = 1.0 - Math.min(speed * 0.15, 0.25);
    const finalAlpha = brush.inkAlpha * Math.max(0.75, Math.min(1.0, speedAlpha));

    const ctx = canvas.getContext('2d');
    const steps = Math.max(1, Math.floor(dist / 2.5));

    ctx.fillStyle = `rgba(44, 44, 44, ${finalAlpha})`;

    for (let i = 0; i <= steps; i++) {
      const t = steps > 0 ? i / steps : 0;
      const px = brush.prevX + dx * t;
      const py = brush.prevY + dy * t;
      const pwidth = brush.prevWidth + (smoothWidth - brush.prevWidth) * t;
      ctx.beginPath();
      ctx.arc(px, py, pwidth / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // End taper: if this looks like a stroke ending (speed decreasing rapidly)
    // the natural width calculation already handles this via speed factor

    brush.prevX = x;
    brush.prevY = y;
    brush.prevTime = now;
    brush.prevWidth = smoothWidth;
  }, [getPos, getPressure, calcBrushWidth]);

  const endStroke = useCallback(() => {
    // Ink resets on next pen-down, not here
    stopBrushSound();
  }, []);

  // --- Audio ---
  const playBrushSound = useCallback(() => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(`${import.meta.env.BASE_URL}sounds/brush-stroke.mp3`);
        audioRef.current.loop = true;
        audioRef.current.volume = 0.3;
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    } catch {
      // Audio not available, silent fail
    }
  }, []);

  const stopBrushSound = useCallback(() => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    } catch {
      // silent
    }
  }, []);

  return { startStroke, continueStroke, endStroke };
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/qsmini/zen-app-local && npm run build`
Expected: Build succeeds (hook is not yet used, but should compile).

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useBrushEngine.js
git commit -m "feat: extract brush engine into reusable hook with ink fade effect"
```

---

## Task 5: Character Recognition Hook

**Files:**
- Create: `src/hooks/useCharRecognition.js`

Extracts overlap detection from `Sutra.jsx:242-267` and handles auto-advance logic.

- [ ] **Step 1: Create useCharRecognition.js**

Create `src/hooks/useCharRecognition.js`:

```js
import { useRef, useCallback } from 'react';

const AUTO_ADVANCE_THRESHOLD = 0.25;

export default function useCharRecognition() {
  const refCanvasRef = useRef(null);

  const buildReference = useCallback((char, width, height) => {
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
    ctx.fillText(char, width / 2, height / 2);
  }, []);

  const calculateOverlap = useCallback((canvas) => {
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
  }, []);

  const shouldAdvance = useCallback((canvas) => {
    return calculateOverlap(canvas) >= AUTO_ADVANCE_THRESHOLD;
  }, [calculateOverlap]);

  return { buildReference, calculateOverlap, shouldAdvance };
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/qsmini/zen-app-local && npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useCharRecognition.js
git commit -m "feat: extract character recognition into reusable hook"
```

---

## Task 6: SutraSelection Component

**Files:**
- Create: `src/components/sutra/SutraSelection.jsx`

Extracts from `Sutra.jsx:37-112`, updated to use new data imports.

- [ ] **Step 1: Create SutraSelection.jsx**

Create `src/components/sutra/SutraSelection.jsx`:

```jsx
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SUTRAS } from '../../data/sutras/index';
import { loadSutraProgress } from '../../utils/sutraProgress';

export default function SutraSelection({ onSelect }) {
  const progress = loadSutraProgress();

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
      <div className="h-16 flex items-center justify-between px-4 bg-zen-bg/80 backdrop-blur-lg -webkit-backdrop-filter:blur(16px) border-b border-zen-sand/50">
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
          const inProgress = idx > 0 && !completed;
          const pct = total > 0 ? Math.min((idx / total) * 100, 100) : 0;

          return (
            <motion.button
              key={sutra.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(sutra.id, { completed, inProgress })}
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
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/qsmini/zen-app-local && npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/sutra/SutraSelection.jsx
git commit -m "feat: create SutraSelection component"
```

---

## Task 7: SutraDedication Component

**Files:**
- Create: `src/components/sutra/SutraDedication.jsx`

- [ ] **Step 1: Create SutraDedication.jsx**

Create `src/components/sutra/SutraDedication.jsx`:

```jsx
import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { DEDICATIONS } from '../../data/dedications';
import { getSutraById } from '../../data/sutras/index';
import { getSessions } from '../../utils/sutraProgress';

export default function SutraDedication({ sutraId, onStart, onBack }) {
  const sutra = getSutraById(sutraId);
  const [selected, setSelected] = useState(DEDICATIONS[0]?.id || null);
  const [custom, setCustom] = useState('');

  // Count how many times this sutra has been completed
  const completedCount = getSessions().filter(
    (s) => s.sutraId === sutraId
  ).length;

  const dedication = custom.trim() || DEDICATIONS.find((d) => d.id === selected)?.label || '';

  return (
    <div
      className="h-full flex flex-col"
      style={{ backgroundColor: '#f5f0e8' }}
    >
      {/* Header */}
      <div className="h-16 flex items-center px-4">
        <button
          onClick={onBack}
          className="p-2 text-zen-stone rounded-full hover:bg-zen-sand/50 transition"
        >
          <ArrowLeft size={24} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <p className="text-sm text-zen-stone tracking-[4px] mb-6">发 愿</p>
        <h2 className="text-2xl font-serif font-bold text-zen-ink mb-2">
          {sutra.name}
        </h2>
        <p className="text-sm text-zen-stone mb-8">
          第 {completedCount + 1} 次抄写 · 共 {sutra.text.length} 字
        </p>

        {/* Dedication selection */}
        <div className="w-full max-w-sm bg-white/60 backdrop-blur rounded-xl p-5 mb-6"
          style={{ WebkitBackdropFilter: 'blur(12px)' }}>
          <p className="text-xs text-zen-stone mb-3">今日回向</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {DEDICATIONS.map((d) => (
              <button
                key={d.id}
                onClick={() => { setSelected(d.id); setCustom(''); }}
                className={`px-3.5 py-1.5 rounded-full text-sm transition ${
                  selected === d.id && !custom.trim()
                    ? 'bg-zen-gold text-white'
                    : 'bg-zen-gold/10 text-zen-gold border border-zen-gold/20'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="或自定义回向..."
            className="w-full px-3.5 py-2.5 border border-zen-sand rounded-lg text-sm text-zen-ink bg-white focus:outline-none focus:border-zen-gold/50"
          />
        </div>

        {/* Start button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => onStart(dedication)}
          className="w-full max-w-sm py-3.5 bg-zen-red text-white rounded-xl text-base tracking-[6px] font-serif"
        >
          开始抄经
        </motion.button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/qsmini/zen-app-local && npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/components/sutra/SutraDedication.jsx
git commit -m "feat: create SutraDedication component for pre-writing ritual"
```

---

## Task 8: SutraWriter Component (Full-Screen Writing)

**Files:**
- Create: `src/components/sutra/SutraWriter.jsx`

This is the core rewrite. Full-screen, large character, no "善" feedback, auto-advance, responsive.

- [ ] **Step 1: Create SutraWriter.jsx**

Create `src/components/sutra/SutraWriter.jsx`:

```jsx
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
      onComplete({ duration, chars: sutraText.length });
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

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    drawGuide(ctx, width, height);
    buildReference(currentChar, width, height);
  }, [currentIndex, currentChar, buildReference, sutraText.length]);

  const drawGuide = (ctx, width, height) => {
    ctx.clearRect(0, 0, width, height);

    // Make grid fill available space (large character)
    const size = Math.min(width, height) * 0.85;
    const startX = (width - size) / 2;
    const startY = (height - size) / 2;

    ctx.save();

    // Grid lines
    ctx.beginPath();
    ctx.strokeStyle = '#e5e5e5';
    ctx.lineWidth = 1;
    ctx.strokeRect(startX, startY, size, size);
    ctx.moveTo(startX, startY); ctx.lineTo(startX + size, startY + size);
    ctx.moveTo(startX + size, startY); ctx.lineTo(startX, startY + size);
    ctx.moveTo(startX, startY + size / 2); ctx.lineTo(startX + size, startY + size / 2);
    ctx.moveTo(startX + size / 2, startY); ctx.lineTo(startX + size / 2, startY + size);
    ctx.stroke();

    // Ghost character
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
    // Capture just the character area as a small image
    const dataUrl = canvas.toDataURL('image/png', 0.6);
    await saveStroke(sutraId, currentIndex, dataUrl).catch(() => {});
  }, [sutraId, currentIndex]);

  const advanceToNext = useCallback(async () => {
    addXP(1);
    await captureStroke();
    setCurrentIndex((prev) => prev + 1);
  }, [captureStroke]);

  // --- Pointer handlers ---
  const handlePointerDown = (e) => {
    if (currentIndex >= sutraText.length) return;
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

    // Check overlap — auto-advance if sufficient
    if (shouldAdvance(canvasRef.current)) {
      advanceToNext();
    }
  };

  const clearCanvas = () => {
    initCanvas();
  };

  const skipChar = () => {
    setCurrentIndex((prev) => Math.min(prev + 1, sutraText.length));
  };

  if (currentIndex >= sutraText.length) return null;

  // Upcoming characters preview
  const upcoming = sutraText.slice(currentIndex + 1, currentIndex + 6).split('');

  return (
    <div className="h-full flex" style={{ backgroundColor: '#f5f0e8' }}>
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

        {/* Canvas */}
        <div
          ref={containerRef}
          className="flex-1 relative flex items-center justify-center p-3"
        >
          <canvas
            ref={canvasRef}
            className="touch-none"
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
            className="flex items-center gap-1.5 px-5 py-2 border border-zen-sand rounded-lg text-sm text-zen-stone active:bg-zen-sand/30 transition"
          >
            <RotateCcw size={14} />
            清除
          </button>
          <button
            onClick={skipChar}
            className="flex items-center gap-1.5 px-5 py-2 border border-zen-sand rounded-lg text-sm text-zen-stone active:bg-zen-sand/30 transition"
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
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/qsmini/zen-app-local && npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/components/sutra/SutraWriter.jsx
git commit -m "feat: create full-screen SutraWriter with large character, auto-advance, responsive layout"
```

---

## Task 9: SutraCompletion Component (Dedication + Export)

**Files:**
- Create: `src/components/sutra/SutraCompletion.jsx`

- [ ] **Step 1: Create SutraCompletion.jsx**

Create `src/components/sutra/SutraCompletion.jsx`:

```jsx
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

    // Build a composite image — vertical scroll layout
    const charSize = 60; // px per character in export
    const cols = 10;
    const rows = Math.ceil(strokes.length / cols);
    const padding = 40;
    const titleHeight = 80;
    const footerHeight = 80;
    const width = cols * charSize + padding * 2;
    const height = titleHeight + rows * charSize + footerHeight + padding * 2;

    const canvas = document.createElement('canvas');
    canvas.width = width * 2; // 2x for quality
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

      // Try using canvas.toBlob for better quality
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));

      if (navigator.share && blob) {
        // Mobile: use Web Share API
        const file = new File([blob], `${sutra.name}.png`, { type: 'image/png' });
        await navigator.share({ files: [file] }).catch(() => {});
      } else {
        // Desktop: download
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
    // Clean up stroke data to free storage
    await clearStrokes(sutraId).catch(() => {});
    onDone();
  }, [sutraId, onDone]);

  const minutes = Math.floor(stats.duration / 60);

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
          用时 {minutes} 分钟 · +{stats.chars} XP
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
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/qsmini/zen-app-local && npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/components/sutra/SutraCompletion.jsx
git commit -m "feat: create SutraCompletion component with dedication display and scroll export"
```

---

## Task 10: Rewrite Sutra.jsx as Orchestrator

**Files:**
- Modify: `src/pages/Sutra.jsx`

Replace the entire file with a thin orchestrator that routes between the 4 stages.

- [ ] **Step 1: Rewrite Sutra.jsx**

Replace `src/pages/Sutra.jsx` with:

```jsx
import React, { useState, useCallback } from 'react';
import SutraSelection from '../components/sutra/SutraSelection';
import SutraDedication from '../components/sutra/SutraDedication';
import SutraWriter from '../components/sutra/SutraWriter';
import SutraCompletion from '../components/sutra/SutraCompletion';
import { getSutraCharIndex, saveSutraProgress } from '../utils/sutraProgress';
import { clearStrokes } from '../utils/sutraDb';
import { getSutraById } from '../data/sutras/index';

// Stages: select → dedicate → write → complete
export default function Sutra() {
  const [stage, setStage] = useState('select');
  const [sutraId, setSutraId] = useState(null);
  const [dedication, setDedication] = useState('');
  const [completionStats, setCompletionStats] = useState(null);

  const handleSelect = useCallback((id, { completed, inProgress }) => {
    setSutraId(id);
    if (inProgress) {
      // Resume writing — skip dedication
      setStage('write');
    } else {
      if (completed) {
        // Reset progress for re-copy, clear old strokes
        saveSutraProgress(id, 0);
        clearStrokes(id).catch(() => {});
      }
      setStage('dedicate');
    }
  }, []);

  const handleStartWriting = useCallback((dedicationText) => {
    setDedication(dedicationText);
    setStage('write');
  }, []);

  const handleWritingComplete = useCallback(({ duration, chars }) => {
    setCompletionStats({ duration, chars });
    setStage('complete');
  }, []);

  const handleExit = useCallback(() => {
    // Progress already auto-saved
    setSutraId(null);
    setDedication('');
    setStage('select');
  }, []);

  const handleDone = useCallback(() => {
    setSutraId(null);
    setDedication('');
    setCompletionStats(null);
    setStage('select');
  }, []);

  switch (stage) {
    case 'select':
      return <SutraSelection onSelect={handleSelect} />;
    case 'dedicate':
      return (
        <SutraDedication
          sutraId={sutraId}
          onStart={handleStartWriting}
          onBack={handleExit}
        />
      );
    case 'write':
      return (
        <SutraWriter
          sutraId={sutraId}
          onComplete={handleWritingComplete}
          onExit={handleExit}
        />
      );
    case 'complete':
      return (
        <SutraCompletion
          sutraId={sutraId}
          dedication={dedication}
          stats={completionStats}
          onDone={handleDone}
        />
      );
    default:
      return <SutraSelection onSelect={handleSelect} />;
  }
}
```

- [ ] **Step 2: Run build and tests**

Run: `cd /Users/qsmini/zen-app-local && npx vitest run && npm run build`
Expected: All tests pass, build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Sutra.jsx
git commit -m "refactor: rewrite Sutra.jsx as thin orchestrator for 4-stage flow"
```

---

## Task 11: SutraProgress Component for Home Page

**Files:**
- Create: `src/components/sutra/SutraProgress.jsx`
- Modify: `src/pages/Home.jsx`

- [ ] **Step 1: Create SutraProgress.jsx**

Create `src/components/sutra/SutraProgress.jsx`:

```jsx
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ACHIEVEMENTS } from '../../data/achievements';
import {
  getStreak,
  getTotalChars,
  getHeatmapData,
  getUnlockedAchievements,
} from '../../utils/sutraProgress';

// Generate last N days for heatmap
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
          style={{ gridTemplateColumns: `repeat(15, 1fr)` }}>
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
```

- [ ] **Step 2: Add SutraProgress to Home.jsx**

In `src/pages/Home.jsx`, add import at top:

```js
import SutraProgress from '../components/sutra/SutraProgress';
```

Then insert the component after the Quick Stats grid (after line 532 — the closing `</motion.div>` of the Quick Stats grid), before the Quick Actions section:

```jsx
        {/* Sutra Practice Progress */}
        <motion.div variants={fadeUp} className="mb-5">
          <SutraProgress />
        </motion.div>
```

- [ ] **Step 3: Update Home.jsx stats to use new progress data**

In the `StatsPanel` component (around line 142-203), update the 抄经进度 stat. Change:

```js
const sutraIndex = safeLoad(KEYS.SUTRA_INDEX, 0);
```
to:
```js
import { getTotalChars } from '../utils/sutraProgress';
```
(add at top of file)

And update the stat entry from:
```js
{
  icon: BookOpen,
  value: `${sutraIndex} / 72`,
  label: '抄经进度',
  color: 'text-zen-ink',
},
```
to:
```js
{
  icon: BookOpen,
  value: `${getTotalChars().toLocaleString()} 字`,
  label: '累计抄写',
  color: 'text-zen-ink',
},
```

- [ ] **Step 4: Run build and tests**

Run: `cd /Users/qsmini/zen-app-local && npx vitest run && npm run build`

- [ ] **Step 5: Commit**

```bash
git add src/components/sutra/SutraProgress.jsx src/pages/Home.jsx
git commit -m "feat: add sutra progress heatmap and achievements to Home page"
```

---

## Task 12: Brush Sound Effect

**Files:**
- Create: `public/sounds/brush-stroke.mp3`

- [ ] **Step 1: Source a real brush sound**

The CLAUDE.md requires real audio recordings only — no synthesis. Options:
1. Record a real brush-on-paper sound
2. Source a royalty-free brush sound effect (e.g., from freesound.org)

Download or create the sound file and place at `public/sounds/brush-stroke.mp3`. The file should be:
- Short (1-3 seconds, loopable)
- Quiet, subtle brush-on-paper texture
- MP3 format, small file size (< 100KB ideal for PWA)

Note: This step requires Q to provide or approve the audio file. Create a placeholder note if needed.

- [ ] **Step 2: Create sounds directory and add file**

Run: `mkdir -p /Users/qsmini/zen-app-local/public/sounds`

Place the audio file at `public/sounds/brush-stroke.mp3`.

- [ ] **Step 3: Commit**

```bash
git add public/sounds/brush-stroke.mp3
git commit -m "feat: add brush stroke sound effect"
```

---

## Task 13: Integration Test & Polish

**Files:**
- All modified files

- [ ] **Step 1: Run full test suite**

Run: `cd /Users/qsmini/zen-app-local && npx vitest run`
Expected: All tests pass.

- [ ] **Step 2: Run production build**

Run: `cd /Users/qsmini/zen-app-local && npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 3: Run dev server and manually test the flow**

Run: `cd /Users/qsmini/zen-app-local && npm run dev`

Test these flows:
1. Navigate to 抄经 → see sutra list with progress
2. Select a sutra → see dedication page with tags
3. Start writing → full-screen canvas with large character
4. Write a few characters → auto-advance, no "善" feedback
5. Press ✕ → return to selection, progress saved
6. Re-enter same sutra → resume from where you left off
7. Complete a short sutra → see completion/dedication page
8. Export → image downloads / share sheet opens
9. Return to Home → see heatmap + streak + achievements
10. Resize to desktop width → left panel appears in writer

- [ ] **Step 4: Fix any issues found**

Address any bugs from manual testing.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "polish: fix integration issues from manual testing"
```

---

## Task 14: Add .superpowers to .gitignore

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Add .superpowers to .gitignore**

Add `.superpowers/` to `.gitignore` if not already present.

- [ ] **Step 2: Commit**

```bash
echo '.superpowers/' >> .gitignore
git add .gitignore
git commit -m "chore: add .superpowers to gitignore"
```
