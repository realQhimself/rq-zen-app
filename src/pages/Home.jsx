import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Wind, Music, PenTool, Leaf, Plus, Minus, Check, Trash2, X } from 'lucide-react';

// --- 13 Buddhist Ranks (选佛图 Inspired) ---
const RANKS = [
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

// --- Default Profile ---
const DEFAULT_HABITS = [
  { id: 'h1', text: '帮助他人', positive: true, negative: false, custom: false },
  { id: 'h2', text: '布施', positive: true, negative: false, custom: false },
  { id: 'h3', text: '感恩', positive: true, negative: false, custom: false },
  { id: 'h4', text: '发脾气', positive: false, negative: true, custom: false },
  { id: 'h5', text: '妄语', positive: false, negative: true, custom: false },
];

const DEFAULT_DAILIES = [
  { id: 'd1', text: '禅修10分钟', streak: 0, custom: false, completedDates: [] },
  { id: 'd2', text: '敲木鱼', streak: 0, custom: false, completedDates: [] },
  { id: 'd3', text: '抄经一页', streak: 0, custom: false, completedDates: [] },
  { id: 'd4', text: '禅园打卡', streak: 0, custom: false, completedDates: [] },
];

const DEFAULT_TODOS = [
  { id: 't1', text: '读完心经', completed: false, custom: false },
  { id: 't2', text: '参加一次法会', completed: false, custom: false },
];

const DEFAULT_PROFILE = {
  totalXP: 0,
  spentXP: 0,
  habits: DEFAULT_HABITS,
  dailies: DEFAULT_DAILIES,
  todos: DEFAULT_TODOS,
};

// --- XP Helpers ---
const getProfile = () => {
  try {
    const saved = localStorage.getItem('zen_profile');
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }

  // Migration: if zen_garden exists with points, carry them over
  let startXP = 0;
  try {
    const garden = JSON.parse(localStorage.getItem('zen_garden') || '{}');
    if (garden.points != null) {
      const itemCosts = { rock: 10, moss: 10, pine: 15, bamboo: 15, lantern: 20 };
      const spent = (garden.items || []).reduce((sum, i) => sum + (itemCosts[i.type] || 0), 0);
      startXP = (garden.points || 0) + spent;
    }
  } catch { /* ignore */ }

  return { ...DEFAULT_PROFILE, totalXP: startXP, spentXP: 0 };
};

const saveProfile = (profile) => {
  localStorage.setItem('zen_profile', JSON.stringify(profile));
};

const getRank = (totalXP) => {
  let rank = RANKS[0];
  for (const r of RANKS) {
    if (totalXP >= r.xp) rank = r;
    else break;
  }
  return rank;
};

const getNextRank = (totalXP) => {
  for (const r of RANKS) {
    if (totalXP < r.xp) return r;
  }
  return null; // Already at max
};

// --- Zen Quotes ---
const QUOTES = [
  "心无挂碍，无挂碍故，无有恐怖。",
  "应无所住，而生其心。",
  "本来无一物，何处惹尘埃。",
  "一花一世界，一叶一菩提。",
  "凡所有相，皆是虚妄。",
  "不思善，不思恶，正与么时，那个是明上座本来面目。",
  "春有百花秋有月，夏有凉风冬有雪。",
  "照见五蕴皆空，度一切苦厄。",
  "色不异空，空不异色。",
  "行亦禅，坐亦禅，语默动静体安然。",
  "万法归一，一归何处。",
  "吃茶去。",
  "日日是好日。",
  "青青翠竹，尽是法身；郁郁黄花，无非般若。",
  "若能一切随他去，便是世间自在人。",
];

// --- Monk SVG (from Garden) ---
const MonkSVG = () => (
  <svg viewBox="0 0 50 65" fill="none">
    <circle cx="25" cy="15" r="10" fill="#e8d5b7" />
    <path d="M20,15 Q22,17 24,15" stroke="#2c2c2c" strokeWidth="1" fill="none" />
    <path d="M26,15 Q28,17 30,15" stroke="#2c2c2c" strokeWidth="1" fill="none" />
    <path d="M22,19 Q25,21 28,19" stroke="#2c2c2c" strokeWidth="0.5" fill="none" />
    <path d="M12,25 Q12,55 25,55 Q38,55 38,25 Q30,30 25,28 Q20,30 12,25Z" fill="#8a8a82" />
    <path d="M18,28 Q25,35 32,28" stroke="#6a6a62" strokeWidth="1" fill="none" />
    <ellipse cx="25" cy="42" rx="6" ry="3" fill="#e8d5b7" />
  </svg>
);

// --- Add Task Modal ---
const AddTaskModal = ({ type, onAdd, onClose }) => {
  const [text, setText] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    onClose();
  };

  const typeLabels = { habit: '习惯', daily: '日课', todo: '待办' };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/30 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <motion.form
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full bg-white rounded-t-2xl p-6 pb-safe shadow-2xl"
        onClick={e => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
        <h3 className="font-serif font-bold text-zen-ink mb-3">添加{typeLabels[type]}</h3>
        <input
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={`输入${typeLabels[type]}内容...`}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zen-red/50"
        />
        <button
          type="submit"
          className="w-full mt-3 py-3 bg-zen-red text-white rounded-xl font-bold text-sm active:bg-red-900 transition"
        >
          添加
        </button>
      </motion.form>
    </motion.div>
  );
};

// --- Animations ---
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

// --- Profile Page ---
export default function Home() {
  const [profile, setProfile] = useState(getProfile);
  const [activeTab, setActiveTab] = useState('daily');
  const [addModal, setAddModal] = useState(null); // 'habit'|'daily'|'todo'|null
  const [levelUpName, setLevelUpName] = useState(null);
  const prevLevelRef = useRef(getRank(getProfile().totalXP).level);

  const today = new Date().toISOString().split('T')[0];

  // Persist profile
  useEffect(() => { saveProfile(profile); }, [profile]);

  // Daily quote
  const [quote] = useState(() => {
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    return QUOTES[dayOfYear % QUOTES.length];
  });

  // Re-read profile on focus (XP may have changed from other pages)
  useEffect(() => {
    const refresh = () => {
      const fresh = getProfile();
      setProfile(prev => ({ ...prev, totalXP: fresh.totalXP, spentXP: fresh.spentXP }));
    };
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);

  // Check for level up
  useEffect(() => {
    const currentLevel = getRank(profile.totalXP).level;
    if (currentLevel > prevLevelRef.current) {
      setLevelUpName(getRank(profile.totalXP).name);
      setTimeout(() => setLevelUpName(null), 2500);
    }
    prevLevelRef.current = currentLevel;
  }, [profile.totalXP]);

  const addXP = (amount) => {
    setProfile(prev => ({ ...prev, totalXP: prev.totalXP + amount }));
  };

  const deductBalance = (amount) => {
    setProfile(prev => ({ ...prev, spentXP: prev.spentXP + amount }));
  };

  // Rank info
  const rank = getRank(profile.totalXP);
  const nextRank = getNextRank(profile.totalXP);
  const xpInLevel = nextRank ? profile.totalXP - rank.xp : 0;
  const xpForLevel = nextRank ? nextRank.xp - rank.xp : 1;
  const progressPct = nextRank ? Math.min(100, (xpInLevel / xpForLevel) * 100) : 100;
  const balance = profile.totalXP - profile.spentXP;

  // --- Task Handlers ---
  const handleHabitTap = (id, direction) => {
    if (direction === '+') {
      addXP(5);
      if (navigator.vibrate) navigator.vibrate(30);
    } else {
      deductBalance(2);
      if (navigator.vibrate) navigator.vibrate([20, 30, 20]);
    }
  };

  const handleDailyToggle = (id) => {
    setProfile(prev => {
      const dailies = prev.dailies.map(d => {
        if (d.id !== id) return d;
        const alreadyDone = d.completedDates.includes(today);
        if (alreadyDone) return d; // Can't un-complete
        return { ...d, completedDates: [...d.completedDates, today], streak: d.streak + 1 };
      });
      return { ...prev, dailies };
    });
    addXP(10);
    if (navigator.vibrate) navigator.vibrate(30);
  };

  const handleTodoToggle = (id) => {
    setProfile(prev => ({
      ...prev,
      todos: prev.todos.map(t => t.id === id && !t.completed ? { ...t, completed: true } : t),
    }));
    addXP(15);
    if (navigator.vibrate) navigator.vibrate(30);
  };

  const handleDeleteTask = (type, id) => {
    setProfile(prev => {
      if (type === 'habit') return { ...prev, habits: prev.habits.filter(h => h.id !== id) };
      if (type === 'daily') return { ...prev, dailies: prev.dailies.filter(d => d.id !== id) };
      if (type === 'todo') return { ...prev, todos: prev.todos.filter(t => t.id !== id) };
      return prev;
    });
  };

  const handleAddTask = (type, text) => {
    const id = `${type[0]}${Date.now()}`;
    setProfile(prev => {
      if (type === 'habit') return { ...prev, habits: [...prev.habits, { id, text, positive: true, negative: false, custom: true }] };
      if (type === 'daily') return { ...prev, dailies: [...prev.dailies, { id, text, streak: 0, custom: true, completedDates: [] }] };
      if (type === 'todo') return { ...prev, todos: [...prev.todos, { id, text, completed: false, custom: true }] };
      return prev;
    });
  };

  // --- Read feature stats ---
  const fishCount = parseInt(localStorage.getItem('zen_fish_count') || '0');
  const sutraIndex = parseInt(localStorage.getItem('zen_sutra_index') || '0');
  let meditation = { sessions: 0, totalSeconds: 0 };
  try { meditation = JSON.parse(localStorage.getItem('zen_meditation') || '{"sessions":0,"totalSeconds":0}'); } catch {}

  const tabs = [
    { key: 'daily', label: '日课' },
    { key: 'habit', label: '习惯' },
    { key: 'todo', label: '待办' },
  ];

  return (
    <div className="min-h-full pb-20 relative overflow-hidden" style={{
      backgroundImage: `url(${import.meta.env.BASE_URL}images/home-bg.png)`,
      backgroundSize: 'cover',
      backgroundPosition: 'center top',
      backgroundColor: '#f5f5f0',
    }}>
      {/* Ambient Particles */}
      {[...Array(5)].map((_, i) => (
        <div key={`p-${i}`} className="zen-particle fixed" style={{
          left: `${10 + i * 20}%`,
          top: `${30 + (i % 3) * 20}%`,
          '--size': `${2 + i * 0.5}px`,
          '--duration': `${15 + i * 4}s`,
          '--delay': `${i * 3}s`,
          '--dx': `${(i % 2 ? 15 : -15)}px`,
          '--dy': `-${50 + i * 10}px`,
          '--dx2': `${(i % 2 ? -8 : 8)}px`,
          '--dy2': `-${90 + i * 15}px`,
          '--max-opacity': '0.15',
        }} />
      ))}

      <motion.div variants={stagger} initial="hidden" animate="show" className="max-w-md mx-auto px-5 relative z-10">

        {/* Rank Header */}
        <motion.div variants={fadeUp} className="pt-6 pb-4 flex items-center gap-4">
          <div className="w-16 h-20 flex-shrink-0">
            <MonkSVG />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-serif font-bold text-zen-ink">{rank.name}</span>
              <span className="text-xs text-zen-stone">Lv.{rank.level}</span>
            </div>
            <p className="text-xs text-zen-stone mt-0.5">{rank.meaning}</p>
            <div className="h-0.5 w-12 mt-1 rounded-full bg-gradient-to-r from-zen-red/60 to-transparent" />
            {/* XP Bar */}
            <div className="mt-2 h-2.5 bg-zen-sand rounded-full overflow-hidden shadow-inner">
              <motion.div
                className="h-full bg-gradient-to-r from-zen-red to-zen-gold rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-zen-stone font-mono">{profile.totalXP} XP</span>
              {nextRank && <span className="text-[10px] text-zen-stone font-mono">→ {nextRank.name} ({nextRank.xp})</span>}
            </div>
          </div>
        </motion.div>

        {/* Balance */}
        <motion.div variants={fadeUp} className="inline-flex items-center gap-1.5 mb-4 bg-zen-cloud px-3 py-1.5 rounded-full shadow-sm border border-zen-sand">
          <span className="text-zen-red text-xs">●</span>
          <span className="text-xs font-mono font-bold text-zen-ink">{balance}</span>
          <span className="text-[10px] text-zen-stone">功德</span>
        </motion.div>

        {/* Zen Quote */}
        <motion.div variants={fadeUp} className="zen-card p-5 mb-5 relative overflow-hidden">
          <p className="text-sm text-zen-stone leading-relaxed font-serif italic">
            <span className="text-zen-red/30 text-2xl leading-none mr-1 not-italic">"</span>
            {quote}
            <span className="text-zen-red/30 text-2xl leading-none ml-1 not-italic">"</span>
          </p>
        </motion.div>

        {/* Task Tabs */}
        <motion.div variants={fadeUp} className="flex gap-1 mb-3 bg-zen-sand/50 rounded-lg p-0.5">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex-1 py-2 text-xs font-serif rounded-md transition ${
                activeTab === t.key ? 'bg-white/80 backdrop-blur text-zen-ink shadow-sm font-bold' : 'text-zen-stone'
              }`}
            >
              {t.label}
            </button>
          ))}
        </motion.div>

        {/* Task List */}
        <motion.div variants={fadeUp} className="space-y-2 mb-5">
          {activeTab === 'habit' && profile.habits.map(h => (
            <div key={h.id} className="zen-card px-4 py-3 flex items-center gap-3">
              {h.positive && (
                <button
                  onClick={() => handleHabitTap(h.id, '+')}
                  aria-label={`${h.text} +1`}
                  className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center active:bg-green-100 transition"
                >
                  <Plus size={16} />
                </button>
              )}
              <span className="flex-1 text-sm text-zen-ink font-serif">{h.text}</span>
              {h.negative && (
                <button
                  onClick={() => handleHabitTap(h.id, '-')}
                  aria-label={`${h.text} -1`}
                  className="w-8 h-8 rounded-lg bg-red-50 text-red-400 flex items-center justify-center active:bg-red-100 transition"
                >
                  <Minus size={16} />
                </button>
              )}
              {h.custom && (
                <button onClick={() => handleDeleteTask('habit', h.id)} aria-label={`删除 ${h.text}`} className="text-gray-300 active:text-red-400">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}

          {activeTab === 'daily' && profile.dailies.map(d => {
            const done = d.completedDates.includes(today);
            return (
              <div key={d.id} className="zen-card px-4 py-3 flex items-center gap-3">
                <button
                  onClick={() => !done && handleDailyToggle(d.id)}
                  aria-label={done ? `${d.text} 已完成` : `完成 ${d.text}`}
                  className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition ${
                    done ? 'bg-zen-red border-zen-red text-white' : 'border-gray-300 active:border-zen-red'
                  }`}
                >
                  {done && <Check size={14} />}
                </button>
                <span className={`flex-1 text-sm font-serif ${done ? 'text-gray-400 line-through' : 'text-zen-ink'}`}>{d.text}</span>
                {d.streak > 0 && (
                  <span className="text-[10px] text-orange-400 font-mono">{d.streak}天</span>
                )}
                {d.custom && (
                  <button onClick={() => handleDeleteTask('daily', d.id)} aria-label={`删除 ${d.text}`} className="text-gray-300 active:text-red-400">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            );
          })}

          {activeTab === 'todo' && (
            <>
              {profile.todos.filter(t => !t.completed).map(t => (
                <div key={t.id} className="zen-card px-4 py-3 flex items-center gap-3">
                  <button
                    onClick={() => handleTodoToggle(t.id)}
                    aria-label={`完成 ${t.text}`}
                    className="w-6 h-6 rounded-md border-2 border-gray-300 flex items-center justify-center active:border-zen-red transition"
                  />
                  <span className="flex-1 text-sm text-zen-ink font-serif">{t.text}</span>
                  {t.custom && (
                    <button onClick={() => handleDeleteTask('todo', t.id)} aria-label={`删除 ${t.text}`} className="text-gray-300 active:text-red-400">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
              {profile.todos.filter(t => t.completed).length > 0 && (
                <p className="text-[10px] text-zen-stone/50 px-1">已完成</p>
              )}
              {profile.todos.filter(t => t.completed).map(t => (
                <div key={t.id} className="bg-gray-50 rounded-xl px-4 py-2 flex items-center gap-3 opacity-50">
                  <div className="w-6 h-6 rounded-md bg-zen-red/20 flex items-center justify-center">
                    <Check size={14} className="text-zen-red" />
                  </div>
                  <span className="flex-1 text-sm text-gray-400 font-serif line-through">{t.text}</span>
                </div>
              ))}
            </>
          )}

          {/* Add Task Button */}
          <button
            onClick={() => setAddModal(activeTab)}
            className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-xs font-serif active:bg-gray-50 transition flex items-center justify-center gap-1"
          >
            <Plus size={14} /> 添加{tabs.find(t => t.key === activeTab)?.label}
          </button>
        </motion.div>

        {/* Quick Stats */}
        <motion.div variants={fadeUp} className="grid grid-cols-4 gap-2 mb-5">
          <div className="zen-card p-3 text-center">
            <Music size={14} className="text-zen-stone mx-auto mb-1" />
            <p className="text-lg font-mono font-bold text-zen-ink">{fishCount.toLocaleString()}</p>
            <p className="text-[10px] text-zen-stone">木鱼</p>
          </div>
          <div className="zen-card p-3 text-center">
            <Wind size={14} className="text-zen-stone mx-auto mb-1" />
            <p className="text-lg font-mono font-bold text-zen-ink">{meditation.sessions}</p>
            <p className="text-[10px] text-zen-stone">禅修</p>
          </div>
          <div className="zen-card p-3 text-center">
            <PenTool size={14} className="text-zen-stone mx-auto mb-1" />
            <p className="text-lg font-mono font-bold text-zen-ink">{sutraIndex}</p>
            <p className="text-[10px] text-zen-stone">抄经</p>
          </div>
          <div className="zen-card p-3 text-center">
            <Leaf size={14} className="text-zen-stone mx-auto mb-1" />
            <p className="text-lg font-mono font-bold text-zen-ink">{balance}</p>
            <p className="text-[10px] text-zen-stone">功德</p>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={fadeUp}>
          <p className="text-[10px] text-zen-stone mb-2 font-serif">开始修行</p>
          <div className="grid grid-cols-4 gap-2">
            {[
              { to: '/meditation', icon: Wind, label: '禅修' },
              { to: '/fish', icon: Music, label: '木鱼' },
              { to: '/sutra', icon: PenTool, label: '抄经' },
              { to: '/garden', icon: Leaf, label: '禅园' },
            ].map(({ to, icon: Icon, label }) => (
              <Link
                key={to}
                to={to}
                className="flex flex-col items-center gap-1 p-3 zen-card active:bg-white/50 transition"
              >
                <Icon size={18} className="text-zen-ink" />
                <span className="text-[10px] text-zen-stone font-serif">{label}</span>
              </Link>
            ))}
          </div>
        </motion.div>

      </motion.div>

      {/* Level Up Animation */}
      <AnimatePresence>
        {levelUpName && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
          >
            <div className="bg-zen-red/90 text-white px-8 py-6 rounded-2xl shadow-2xl text-center backdrop-blur">
              <p className="text-sm opacity-80 mb-1">境界提升</p>
              <p className="text-3xl font-serif font-bold">{levelUpName}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Task Modal */}
      <AnimatePresence>
        {addModal && (
          <AddTaskModal
            type={addModal}
            onAdd={(text) => handleAddTask(addModal, text)}
            onClose={() => setAddModal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
