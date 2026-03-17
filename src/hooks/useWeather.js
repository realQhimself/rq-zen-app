import { useState, useEffect, useCallback } from 'react';

const CACHE_KEY = 'zen_weather_cache';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

const WEATHER_MAP = {
  0: 'clear',
  1: 'clear', 2: 'cloudy', 3: 'overcast',
  45: 'fog', 48: 'fog',
  51: 'drizzle', 53: 'drizzle', 55: 'drizzle',
  61: 'rain', 63: 'rain', 65: 'rain', 66: 'rain', 67: 'rain',
  80: 'rain', 81: 'rain', 82: 'rain',
  71: 'snow', 73: 'snow', 75: 'snow', 77: 'snow', 85: 'snow', 86: 'snow',
  95: 'storm', 96: 'storm', 99: 'storm',
};

function getSeason(latitude, month) {
  const isNorth = latitude >= 0;
  if (month >= 3 && month <= 5) return isNorth ? 'spring' : 'autumn';
  if (month >= 6 && month <= 8) return isNorth ? 'summer' : 'winter';
  if (month >= 9 && month <= 11) return isNorth ? 'autumn' : 'spring';
  return isNorth ? 'winter' : 'summer';
}

function getTimeOfDay(now, sunrise, sunset) {
  const h = now.getHours() + now.getMinutes() / 60;

  const parseTimes = (str) => {
    const d = new Date(str);
    return d.getHours() + d.getMinutes() / 60;
  };

  const rise = parseTimes(sunrise);
  const set = parseTimes(sunset);

  if (h < rise - 1 || h > set + 1) return 'night';
  if (h >= rise - 1 && h < rise + 1) return 'dawn';
  if (h >= set - 1 && h <= set + 1) return 'dusk';
  return 'day';
}

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (Date.now() - cached.timestamp < CACHE_TTL) return cached.data;
  } catch { /* ignore */ }
  return null;
}

function writeCache(data) {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
}

const DEFAULT_WEATHER = {
  condition: 'clear',
  weatherCode: 0,
  temperature: null,
  windSpeed: 0,
  timeOfDay: 'day',
  season: 'spring',
  loading: false,
  error: null,
  locationGranted: false,
};

export default function useWeather() {
  const [weather, setWeather] = useState(() => {
    const cached = readCache();
    if (cached) {
      const now = new Date();
      const tod = cached.sunrise
        ? getTimeOfDay(now, cached.sunrise, cached.sunset)
        : 'day';
      return {
        ...DEFAULT_WEATHER,
        condition: WEATHER_MAP[cached.weatherCode] || 'clear',
        weatherCode: cached.weatherCode,
        temperature: cached.temperature,
        windSpeed: cached.windSpeed,
        timeOfDay: tod,
        season: cached.season,
        locationGranted: true,
      };
    }
    // Guess time of day from system clock
    const h = new Date().getHours();
    let tod = 'day';
    if (h < 5 || h >= 21) tod = 'night';
    else if (h < 7) tod = 'dawn';
    else if (h >= 18) tod = 'dusk';
    return { ...DEFAULT_WEATHER, timeOfDay: tod, loading: true };
  });

  const fetchWeather = useCallback(async (lat, lon) => {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m&daily=sunrise,sunset&timezone=auto&forecast_days=1`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();

      const weatherCode = data.current.weather_code;
      const temperature = Math.round(data.current.temperature_2m);
      const windSpeed = data.current.wind_speed_10m;
      const sunrise = data.daily.sunrise[0];
      const sunset = data.daily.sunset[0];
      const now = new Date();
      const season = getSeason(lat, now.getMonth() + 1);
      const timeOfDay = getTimeOfDay(now, sunrise, sunset);

      const cacheData = { weatherCode, temperature, windSpeed, sunrise, sunset, season, lat, lon };
      writeCache(cacheData);

      setWeather({
        condition: WEATHER_MAP[weatherCode] || 'clear',
        weatherCode,
        temperature,
        windSpeed,
        timeOfDay,
        season,
        loading: false,
        error: null,
        locationGranted: true,
      });
    } catch (err) {
      setWeather(prev => ({
        ...prev,
        loading: false,
        error: err.message,
      }));
    }
  }, []);

  useEffect(() => {
    // If we have a fresh cache, skip geolocation
    const cached = readCache();
    if (cached) {
      setWeather(prev => ({ ...prev, loading: false }));
      return;
    }

    if (!navigator.geolocation) {
      setWeather(prev => ({ ...prev, loading: false, error: 'no-geolocation' }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
      () => {
        // Geolocation denied — use defaults
        setWeather(prev => ({ ...prev, loading: false, error: 'denied' }));
      },
      { timeout: 8000, maximumAge: CACHE_TTL }
    );
  }, [fetchWeather]);

  // Update time of day every 5 minutes (for dawn/dusk transitions)
  useEffect(() => {
    const interval = setInterval(() => {
      const cached = readCache();
      if (cached?.sunrise) {
        const tod = getTimeOfDay(new Date(), cached.sunrise, cached.sunset);
        setWeather(prev => prev.timeOfDay !== tod ? { ...prev, timeOfDay: tod } : prev);
      }
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return weather;
}
