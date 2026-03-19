import { useEffect, useRef, useCallback } from 'react';

// ---- Sound layer generators ----

/**
 * Create a bird chirp layer (day/dawn).
 * Short sine sweeps from 1000-2000Hz at random intervals (3-8s).
 */
function createBirdLayer(ctx, masterGain) {
  let timeoutId = null;
  let stopped = false;

  const chirp = () => {
    if (stopped) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      // Sweep from random start to random end within 1000-2000Hz range
      const startFreq = 1000 + Math.random() * 600;
      const endFreq = 1400 + Math.random() * 600;
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.linearRampToValueAtTime(endFreq, now + 0.08);
      osc.frequency.linearRampToValueAtTime(startFreq * 0.9, now + 0.15);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.05, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(now);
      osc.stop(now + 0.15);

      // Sometimes do a double chirp
      if (Math.random() > 0.5) {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        const offset = 0.2;
        osc2.frequency.setValueAtTime(startFreq * 1.2, now + offset);
        osc2.frequency.linearRampToValueAtTime(endFreq * 1.1, now + offset + 0.06);
        gain2.gain.setValueAtTime(0, now + offset);
        gain2.gain.linearRampToValueAtTime(0.04, now + offset + 0.015);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.12);
        osc2.connect(gain2);
        gain2.connect(masterGain);
        osc2.start(now + offset);
        osc2.stop(now + offset + 0.12);
      }
    } catch { /* ignore audio errors */ }

    // Schedule next chirp at random interval (3-8 seconds)
    const nextDelay = 3000 + Math.random() * 5000;
    timeoutId = setTimeout(chirp, nextDelay);
  };

  // Start after a short random delay
  timeoutId = setTimeout(chirp, 1000 + Math.random() * 3000);

  return {
    stop() {
      stopped = true;
      if (timeoutId) clearTimeout(timeoutId);
    },
  };
}

/**
 * Create a cricket layer (night/dusk).
 * Fast oscillation at ~4000Hz, amplitude modulated, continuous but quiet.
 */
function createCricketLayer(ctx, masterGain) {
  // Carrier: high frequency tone
  const carrier = ctx.createOscillator();
  carrier.type = 'sine';
  carrier.frequency.value = 4000 + Math.random() * 500;

  // Amplitude modulation via LFO for the chirping rhythm
  const lfo = ctx.createOscillator();
  lfo.type = 'square';
  lfo.frequency.value = 18 + Math.random() * 8; // fast on/off rate

  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.04; // modulation depth

  // Envelope LFO — controls chirp-pause pattern
  const envelopeLfo = ctx.createOscillator();
  envelopeLfo.type = 'sine';
  envelopeLfo.frequency.value = 0.4 + Math.random() * 0.3; // slow chirp bursts

  const envelopeGain = ctx.createGain();
  envelopeGain.gain.value = 0.04;

  const outputGain = ctx.createGain();
  outputGain.gain.value = 0;

  // Route: carrier → outputGain → masterGain
  // LFO → outputGain.gain (amplitude modulation)
  carrier.connect(outputGain);
  lfo.connect(lfoGain);
  lfoGain.connect(outputGain.gain);
  envelopeLfo.connect(envelopeGain);
  envelopeGain.connect(outputGain.gain);
  outputGain.connect(masterGain);

  carrier.start();
  lfo.start();
  envelopeLfo.start();

  return {
    stop() {
      try { carrier.stop(); } catch { /* */ }
      try { lfo.stop(); } catch { /* */ }
      try { envelopeLfo.stop(); } catch { /* */ }
      carrier.disconnect();
      lfo.disconnect();
      lfoGain.disconnect();
      envelopeLfo.disconnect();
      envelopeGain.disconnect();
      outputGain.disconnect();
    },
  };
}

/**
 * Create a rain layer (drizzle/rain/storm).
 * White noise filtered through lowpass (~1000Hz). Volume scales with intensity.
 */
function createRainLayer(ctx, masterGain, intensity) {
  // Generate a long white noise buffer (2 seconds, looped)
  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 800 + intensity * 400; // higher cutoff for heavier rain
  filter.Q.value = 0.5;

  // Volume scales: drizzle=0.03, rain=0.05, storm=0.06
  const gainValue = 0.03 + intensity * 0.03;
  const gain = ctx.createGain();
  gain.gain.value = gainValue;

  source.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  source.start();

  return {
    stop() {
      try { source.stop(); } catch { /* */ }
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    },
  };
}

// ---- Determine which layers to play based on weather ----

function getActiveLayers(weather) {
  const layers = [];
  const { condition, timeOfDay } = weather;

  // Time-based layers
  if (timeOfDay === 'dawn' || timeOfDay === 'day') {
    layers.push('birds');
  }
  if (timeOfDay === 'dusk' || timeOfDay === 'night') {
    layers.push('crickets');
  }

  // Weather-based layers
  if (condition === 'drizzle') {
    layers.push('rain-light');
  } else if (condition === 'rain') {
    layers.push('rain-medium');
  } else if (condition === 'storm') {
    layers.push('rain-heavy');
  }

  return layers;
}

/**
 * Hook: useGardenAmbience
 * Manages procedural ambient audio layers that react to weather/time.
 */
export default function useGardenAmbience(weather, isMuted) {
  const ctxRef = useRef(null);
  const masterGainRef = useRef(null);
  const activeLayersRef = useRef({}); // { layerName: { controller, gain } }
  const prevLayerKeysRef = useRef([]);

  // Crossfade duration in seconds
  const FADE_TIME = 1.5;

  const ensureContext = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      ctxRef.current = ctx;
      const master = ctx.createGain();
      master.gain.value = 1;
      master.connect(ctx.destination);
      masterGainRef.current = master;
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  const stopLayer = useCallback((layerName) => {
    const layer = activeLayersRef.current[layerName];
    if (!layer) return;

    const ctx = ctxRef.current;
    if (ctx && layer.gain) {
      try {
        // Fade out before stopping
        const now = ctx.currentTime;
        layer.gain.gain.setValueAtTime(layer.gain.gain.value, now);
        layer.gain.gain.linearRampToValueAtTime(0, now + FADE_TIME);
        // Stop after fade completes
        setTimeout(() => {
          try { layer.controller.stop(); } catch { /* */ }
          try { layer.gain.disconnect(); } catch { /* */ }
        }, FADE_TIME * 1000 + 100);
      } catch {
        try { layer.controller.stop(); } catch { /* */ }
      }
    } else {
      try { layer.controller.stop(); } catch { /* */ }
    }
    delete activeLayersRef.current[layerName];
  }, []);

  const startLayer = useCallback((layerName) => {
    const ctx = ensureContext();
    if (!ctx) return;

    // Create a per-layer gain node for crossfade control
    const layerGain = ctx.createGain();
    layerGain.gain.setValueAtTime(0, ctx.currentTime);
    layerGain.gain.linearRampToValueAtTime(1, ctx.currentTime + FADE_TIME);
    layerGain.connect(masterGainRef.current);

    let controller;
    if (layerName === 'birds') {
      controller = createBirdLayer(ctx, layerGain);
    } else if (layerName === 'crickets') {
      controller = createCricketLayer(ctx, layerGain);
    } else if (layerName === 'rain-light') {
      controller = createRainLayer(ctx, layerGain, 0);
    } else if (layerName === 'rain-medium') {
      controller = createRainLayer(ctx, layerGain, 0.5);
    } else if (layerName === 'rain-heavy') {
      controller = createRainLayer(ctx, layerGain, 1);
    }

    if (controller) {
      activeLayersRef.current[layerName] = { controller, gain: layerGain };
    }
  }, [ensureContext]);

  // React to weather changes — diff layers, add/remove as needed
  useEffect(() => {
    if (isMuted || weather.loading) {
      // Muted: stop all layers
      Object.keys(activeLayersRef.current).forEach(stopLayer);
      prevLayerKeysRef.current = [];
      return;
    }

    const desiredLayers = getActiveLayers(weather);
    const currentKeys = Object.keys(activeLayersRef.current);

    // Layers to add
    const toAdd = desiredLayers.filter(l => !currentKeys.includes(l));
    // Layers to remove
    const toRemove = currentKeys.filter(l => !desiredLayers.includes(l));

    toRemove.forEach(stopLayer);
    toAdd.forEach(startLayer);

    prevLayerKeysRef.current = desiredLayers;
  }, [weather.condition, weather.timeOfDay, weather.loading, isMuted, stopLayer, startLayer]);

  // Clean up everything on unmount
  useEffect(() => {
    return () => {
      Object.keys(activeLayersRef.current).forEach((key) => {
        try { activeLayersRef.current[key].controller.stop(); } catch { /* */ }
        try { activeLayersRef.current[key].gain.disconnect(); } catch { /* */ }
      });
      activeLayersRef.current = {};
      if (masterGainRef.current) {
        try { masterGainRef.current.disconnect(); } catch { /* */ }
      }
      if (ctxRef.current && ctxRef.current.state !== 'closed') {
        ctxRef.current.close().catch(() => {});
      }
    };
  }, []);
}
