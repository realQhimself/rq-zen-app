import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { User, Wind, PenTool, Music, Leaf } from 'lucide-react';
import HomePage from './pages/Home';
import MeditationPage from './pages/Meditation';
import SutraPage from './pages/Sutra';
import FishPage from './pages/Fish';
import GardenPage from './pages/Garden';

// Zen quotes for splash screen
const ZEN_QUOTES = [
  { text: '本来无一物，何处惹尘埃。', author: '六祖慧能' },
  { text: '一花一世界，一叶一菩提。', author: '《华严经》' },
  { text: '菩提本无树，明镜亦非台。', author: '六祖慧能' },
  { text: '春有百花秋有月，夏有凉风冬有雪。', author: '无门慧开' },
  { text: '行到水穷处，坐看云起时。', author: '王维' },
  { text: '万法归一，一归何处。', author: '赵州禅师' },
  { text: '吃茶去。', author: '赵州禅师' },
  { text: '心无挂碍，无有恐怖。', author: '《心经》' },
  { text: '不思善，不思恶，正与么时，哪个是明上座本来面目？', author: '六祖慧能' },
  { text: '青青翠竹，尽是法身；郁郁黄花，无非般若。', author: '天然禅师' },
  { text: '日日是好日。', author: '云门禅师' },
  { text: '照顾脚下。', author: '临济禅师' },
  { text: '应无所住而生其心。', author: '《金刚经》' },
  { text: '山中无甲子，寒尽不知年。', author: '太上隐者' },
  { text: '竹影扫阶尘不动，月穿潭底水无痕。', author: '佛家偈语' },
];

// Splash screen component — shows a random zen quote on app open
const ZenSplash = ({ onComplete }) => {
  const quote = useMemo(
    () => ZEN_QUOTES[Math.floor(Math.random() * ZEN_QUOTES.length)],
    []
  );

  useEffect(() => {
    // Total: 0.3s fade-in + 1.5s hold + 0.5s fade-out ≈ 2.3s
    const timer = setTimeout(onComplete, 2300);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] bg-zen-bg flex items-center justify-center px-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{
        enter: { duration: 0.3 },
        exit: { duration: 0.5 },
      }}
    >
      <motion.div
        className="text-center max-w-sm"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.5 }}
      >
        <p className="text-lg font-serif text-zen-ink leading-relaxed">
          {quote.text}
        </p>
        <p className="mt-4 text-sm font-serif text-zen-stone">
          —— {quote.author}
        </p>
      </motion.div>
    </motion.div>
  );
};

const Navigation = () => {
  const location = useLocation();
  
  const NavItem = ({ to, icon: Icon, label }) => {
    const isActive = location.pathname === to;
    return (
      <Link to={to} className={`flex flex-col items-center p-2 transition-colors ${isActive ? 'text-zen-red' : 'text-zen-stone'}`}>
        <Icon size={24} strokeWidth={isActive ? 2.5 : 1.8} />
        <span className="text-xs mt-0.5">{label}</span>
        {isActive && <div className="nav-dot mt-0.5" />}
      </Link>
    );
  };

  // Hide nav on Sutra page to give full screen space
  if (location.pathname === '/sutra') return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/60 backdrop-blur-xl border-t border-white/30 pb-safe pt-2 px-6 flex justify-around items-center h-16 z-50 md:max-w-md md:left-1/2 md:-translate-x-1/2 md:right-auto">
      <NavItem to="/" icon={User} label="修行" />
      <NavItem to="/meditation" icon={Wind} label="禅修" />
      <NavItem to="/fish" icon={Music} label="木鱼" />
      <NavItem to="/sutra" icon={PenTool} label="抄经" />
      <NavItem to="/garden" icon={Leaf} label="禅园" />
    </nav>
  );
};

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <Router basename="/zen-app">
      {/* Splash overlay — removed from DOM after fade-out */}
      <AnimatePresence>
        {showSplash && (
          <ZenSplash onComplete={() => setShowSplash(false)} />
        )}
      </AnimatePresence>

      <div className="h-[100dvh] flex flex-col">
        <div className="flex-1 overflow-auto md:flex md:justify-center">
          <div className="h-full w-full md:max-w-md">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/meditation" element={<MeditationPage />} />
              <Route path="/sutra" element={<SutraPage />} />
              <Route path="/fish" element={<FishPage />} />
              <Route path="/garden" element={<GardenPage />} />
            </Routes>
          </div>
        </div>
        <Navigation />
      </div>
    </Router>
  );
}
