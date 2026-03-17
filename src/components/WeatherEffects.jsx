import React, { useMemo } from 'react';

// --- Sky Overlay (time of day gradient) ---
const SKY_GRADIENTS = {
  night: 'linear-gradient(180deg, rgba(10,15,40,0.55) 0%, rgba(20,25,50,0.35) 100%)',
  dawn:  'linear-gradient(180deg, rgba(220,140,80,0.25) 0%, rgba(180,120,160,0.15) 50%, rgba(100,140,200,0.1) 100%)',
  day:   'linear-gradient(180deg, rgba(135,180,220,0.08) 0%, rgba(135,180,220,0.03) 100%)',
  dusk:  'linear-gradient(180deg, rgba(200,100,60,0.25) 0%, rgba(140,80,140,0.2) 50%, rgba(40,40,80,0.15) 100%)',
};

export function SkyOverlay({ timeOfDay }) {
  const gradient = SKY_GRADIENTS[timeOfDay] || SKY_GRADIENTS.day;
  return (
    <div
      className="absolute inset-0 pointer-events-none transition-all duration-[3000ms]"
      style={{ background: gradient, zIndex: 1 }}
    />
  );
}

// --- Stars (visible at night) ---
export function Stars({ timeOfDay }) {
  const stars = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: `${5 + Math.random() * 90}%`,
      top: `${3 + Math.random() * 45}%`,
      size: 1 + Math.random() * 2,
      delay: Math.random() * 4,
      duration: 2 + Math.random() * 3,
    })),
  []);

  if (timeOfDay !== 'night') return null;

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
      {stars.map(s => (
        <div
          key={s.id}
          className="weather-star"
          style={{
            position: 'absolute',
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            '--star-delay': `${s.delay}s`,
            '--star-duration': `${s.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

// --- Cloud Overlay (for cloudy/overcast) ---
export function CloudOverlay({ condition }) {
  if (condition !== 'cloudy' && condition !== 'overcast') return null;
  const opacity = condition === 'overcast' ? 0.25 : 0.12;
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        background: `rgba(120,120,130,${opacity})`,
        zIndex: 1,
      }}
    />
  );
}

// --- Rain Effect ---
export function RainEffect({ condition }) {
  const isRain = condition === 'rain' || condition === 'drizzle' || condition === 'storm';
  const drops = useMemo(() => {
    if (!isRain) return [];
    const count = condition === 'storm' ? 60 : condition === 'rain' ? 35 : 15;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: Math.random() * 2,
      duration: 0.5 + Math.random() * 0.4,
      height: condition === 'drizzle' ? 8 : 14,
      opacity: 0.15 + Math.random() * 0.2,
    }));
  }, [isRain, condition]);

  if (!isRain) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 2 }}>
      {drops.map(d => (
        <div
          key={d.id}
          className="weather-rain"
          style={{
            position: 'absolute',
            left: d.left,
            top: '-20px',
            width: 1.5,
            height: d.height,
            opacity: d.opacity,
            '--rain-delay': `${d.delay}s`,
            '--rain-duration': `${d.duration}s`,
          }}
        />
      ))}
      {/* Storm flash */}
      {condition === 'storm' && (
        <div className="weather-lightning" style={{ zIndex: 3 }} />
      )}
    </div>
  );
}

// --- Snow Effect ---
export function SnowEffect({ condition }) {
  const flakes = useMemo(() => {
    if (condition !== 'snow') return [];
    return Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: Math.random() * 5,
      duration: 4 + Math.random() * 4,
      size: 2 + Math.random() * 4,
      drift: -15 + Math.random() * 30,
    }));
  }, [condition]);

  if (condition !== 'snow') return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 2 }}>
      {flakes.map(f => (
        <div
          key={f.id}
          className="weather-snow"
          style={{
            position: 'absolute',
            left: f.left,
            top: '-10px',
            width: f.size,
            height: f.size,
            '--snow-delay': `${f.delay}s`,
            '--snow-duration': `${f.duration}s`,
            '--snow-drift': `${f.drift}px`,
          }}
        />
      ))}
    </div>
  );
}

// --- Fog Effect ---
export function FogEffect({ condition }) {
  if (condition !== 'fog') return null;
  return (
    <div
      className="absolute inset-0 pointer-events-none weather-fog"
      style={{ zIndex: 2 }}
    />
  );
}

// --- Seasonal Effects ---
export function SeasonalEffect({ season, timeOfDay, condition }) {
  // Don't show seasonal effects during heavy weather
  if (condition === 'rain' || condition === 'storm' || condition === 'snow') return null;

  if (season === 'spring') return <CherryBlossoms />;
  if (season === 'summer' && timeOfDay === 'night') return <Fireflies />;
  if (season === 'autumn') return <FallingLeaves />;
  // Winter: snow handles it, or just the cold sky overlay
  return null;
}

function CherryBlossoms() {
  const petals = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: Math.random() * 8,
      duration: 6 + Math.random() * 6,
      drift: -30 + Math.random() * 60,
      size: 4 + Math.random() * 4,
    })),
  []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 2 }}>
      {petals.map(p => (
        <div
          key={p.id}
          className="weather-petal"
          style={{
            position: 'absolute',
            left: p.left,
            top: '-10px',
            width: p.size,
            height: p.size,
            '--petal-delay': `${p.delay}s`,
            '--petal-duration': `${p.duration}s`,
            '--petal-drift': `${p.drift}px`,
          }}
        />
      ))}
    </div>
  );
}

function Fireflies() {
  const flies = useMemo(() =>
    Array.from({ length: 10 }, (_, i) => ({
      id: i,
      left: `${10 + Math.random() * 80}%`,
      top: `${20 + Math.random() * 60}%`,
      delay: Math.random() * 5,
      duration: 3 + Math.random() * 4,
      driftX: -20 + Math.random() * 40,
      driftY: -20 + Math.random() * 40,
    })),
  []);

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 2 }}>
      {flies.map(f => (
        <div
          key={f.id}
          className="weather-firefly"
          style={{
            position: 'absolute',
            left: f.left,
            top: f.top,
            '--fly-delay': `${f.delay}s`,
            '--fly-duration': `${f.duration}s`,
            '--fly-dx': `${f.driftX}px`,
            '--fly-dy': `${f.driftY}px`,
          }}
        />
      ))}
    </div>
  );
}

function FallingLeaves() {
  const leaves = useMemo(() =>
    Array.from({ length: 8 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: Math.random() * 10,
      duration: 7 + Math.random() * 6,
      drift: -40 + Math.random() * 80,
      size: 5 + Math.random() * 4,
    })),
  []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 2 }}>
      {leaves.map(l => (
        <div
          key={l.id}
          className="weather-leaf"
          style={{
            position: 'absolute',
            left: l.left,
            top: '-10px',
            width: l.size,
            height: l.size * 0.7,
            '--leaf-delay': `${l.delay}s`,
            '--leaf-duration': `${l.duration}s`,
            '--leaf-drift': `${l.drift}px`,
          }}
        />
      ))}
    </div>
  );
}

// --- Weather Icon (for HUD) ---
const WEATHER_ICONS = {
  clear:    { day: '☀️', night: '🌙', dawn: '🌅', dusk: '🌇' },
  cloudy:   { day: '⛅', night: '☁️', dawn: '⛅', dusk: '⛅' },
  overcast: { day: '☁️', night: '☁️', dawn: '☁️', dusk: '☁️' },
  fog:      { day: '🌫️', night: '🌫️', dawn: '🌫️', dusk: '🌫️' },
  drizzle:  { day: '🌦️', night: '🌧️', dawn: '🌦️', dusk: '🌦️' },
  rain:     { day: '🌧️', night: '🌧️', dawn: '🌧️', dusk: '🌧️' },
  snow:     { day: '🌨️', night: '🌨️', dawn: '🌨️', dusk: '🌨️' },
  storm:    { day: '⛈️', night: '⛈️', dawn: '⛈️', dusk: '⛈️' },
};

export function WeatherIndicator({ condition, timeOfDay, temperature }) {
  const iconSet = WEATHER_ICONS[condition] || WEATHER_ICONS.clear;
  const icon = iconSet[timeOfDay] || iconSet.day;

  return (
    <div className="flex items-center gap-1 bg-white/40 backdrop-blur-sm px-2 py-1 rounded-full">
      <span className="text-xs">{icon}</span>
      {temperature !== null && (
        <span className="text-xs font-mono text-zen-ink">{temperature}°</span>
      )}
    </div>
  );
}
