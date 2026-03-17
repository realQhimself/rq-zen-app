import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home, Wind, PenTool, Music } from 'lucide-react';
import HomePage from './pages/Home';
import MeditationPage from './pages/Meditation';
import SutraPage from './pages/Sutra';
import FishPage from './pages/Fish';

const Navigation = () => {
  const location = useLocation();
  
  const NavItem = ({ to, icon: Icon, label }) => {
    const isActive = location.pathname === to;
    return (
      <Link to={to} className={`flex flex-col items-center p-2 transition-colors ${isActive ? 'text-zen-red' : 'text-gray-500'}`}>
        <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
        <span className="text-xs mt-1">{label}</span>
      </Link>
    );
  };

  // Hide nav on Sutra page to give full screen space
  if (location.pathname === '/sutra') return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe pt-2 px-6 flex justify-around items-center h-16 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] z-50">
      <NavItem to="/" icon={Home} label="首页" />
      <NavItem to="/meditation" icon={Wind} label="禅修" />
      <NavItem to="/fish" icon={Music} label="木鱼" />
      <NavItem to="/sutra" icon={PenTool} label="抄经" />
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
          </Routes>
        </div>
        <Navigation />
      </div>
    </Router>
  );
}
