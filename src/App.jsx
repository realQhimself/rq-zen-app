import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { User, Wind, PenTool, Music, Leaf } from 'lucide-react';
import HomePage from './pages/Home';
import MeditationPage from './pages/Meditation';
import SutraPage from './pages/Sutra';
import FishPage from './pages/Fish';
import GardenPage from './pages/Garden';

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
    <nav className="fixed bottom-0 left-0 right-0 bg-white/60 backdrop-blur-xl border-t border-white/30 pb-safe pt-2 px-6 flex justify-around items-center h-16 z-50">
      <NavItem to="/" icon={User} label="修行" />
      <NavItem to="/meditation" icon={Wind} label="禅修" />
      <NavItem to="/fish" icon={Music} label="木鱼" />
      <NavItem to="/sutra" icon={PenTool} label="抄经" />
      <NavItem to="/garden" icon={Leaf} label="禅园" />
    </nav>
  );
};

export default function App() {
  return (
    <Router basename="/zen-app">
      <div className="h-[100dvh] flex flex-col">
        <div className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/meditation" element={<MeditationPage />} />
            <Route path="/sutra" element={<SutraPage />} />
            <Route path="/fish" element={<FishPage />} />
            <Route path="/garden" element={<GardenPage />} />
          </Routes>
        </div>
        <Navigation />
      </div>
    </Router>
  );
}
