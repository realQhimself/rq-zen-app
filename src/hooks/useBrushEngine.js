import { useRef, useCallback } from 'react';
import { getStroke } from 'perfect-freehand';

// Warm ink color (not pure black/gray — feels like real Chinese ink)
const INK_R = 35;
const INK_G = 25;
const INK_B = 20;
const INK_ALPHA_START = 0.92;
const INK_ALPHA_END = 0.7;
// Points threshold for full alpha fade
const FADE_POINT_COUNT = 120;

// perfect-freehand options tuned for calligraphy
const STROKE_OPTIONS = {
  size: 14,
  thinning: 0.5,
  smoothing: 0.5,
  streamline: 0.5,
  start: { taper: true },
  end: { taper: true },
  simulatePressure: true,
};

/**
 * Convert getStroke outline points into an SVG path string
 * for use with Path2D. Uses quadratic curves for smooth edges.
 */
function getSvgPathFromStroke(stroke) {
  if (stroke.length < 2) return '';
  const d = [];
  let [p0, p1] = stroke;
  d.push(`M ${p0[0]} ${p0[1]}`);
  for (let i = 1; i < stroke.length; i++) {
    const midX = (p0[0] + p1[0]) / 2;
    const midY = (p0[1] + p1[1]) / 2;
    d.push(`Q ${p0[0]} ${p0[1]} ${midX} ${midY}`);
    p0 = p1;
    p1 = stroke[(i + 1) % stroke.length];
  }
  d.push('Z');
  return d.join(' ');
}

export default function useBrushEngine() {
  // inputPoints: [x, y, pressure] for perfect-freehand
  // rawPoints: [x, y] for character recognition
  // snapshotUrl: data URL of canvas state before current stroke began
  const brushRef = useRef({
    inputPoints: [],
    rawPoints: [],
    snapshotUrl: null,
  });

  const audioRef = useRef(null);

  /**
   * Get CSS-space coordinates from a pointer event.
   * Canvas rendering uses DPR scaling internally, but getStroke
   * works in CSS coordinates — the ctx.scale(dpr) handles the rest.
   */
  const getPos = useCallback((e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  /**
   * Read pressure from the event. Returns 0.5 as fallback
   * so perfect-freehand can use its velocity-based simulation.
   */
  const getPressure = useCallback((e) => {
    if (e.pressure !== undefined && e.pressure > 0 && e.pressure < 1) return e.pressure;
    if (e.touches?.[0]?.force > 0) return e.touches[0].force;
    return 0.5;
  }, []);

  /**
   * Compute ink alpha based on how many points are in the stroke.
   * Long strokes fade slightly like real ink running dry.
   */
  const getInkAlpha = useCallback((pointCount) => {
    const t = Math.min(pointCount / FADE_POINT_COUNT, 1);
    return INK_ALPHA_START - t * (INK_ALPHA_START - INK_ALPHA_END);
  }, []);

  /**
   * Render the current accumulated stroke onto the canvas.
   * Restores the pre-stroke snapshot first so we don't double-draw.
   */
  const renderCurrentStroke = useCallback((canvas) => {
    const ctx = canvas.getContext('2d');
    const brush = brushRef.current;
    if (brush.inputPoints.length < 2) return;

    const dpr = window.devicePixelRatio || 1;

    // Restore snapshot (canvas state before this stroke started)
    if (brush.snapshotImage) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(brush.snapshotImage, 0, 0);
      ctx.restore();
    }

    // Generate stroke outline from accumulated points
    const outlinePoints = getStroke(brush.inputPoints, {
      ...STROKE_OPTIONS,
      // If real pressure data is available, don't simulate
      simulatePressure: !brush.hasRealPressure,
    });

    const pathData = getSvgPathFromStroke(outlinePoints);
    if (!pathData) return;

    const alpha = getInkAlpha(brush.inputPoints.length);

    ctx.save();
    ctx.fillStyle = `rgba(${INK_R}, ${INK_G}, ${INK_B}, ${alpha})`;
    const path = new Path2D(pathData);
    ctx.fill(path);

    // Subtle bristle texture — thin semi-transparent lines along the stroke
    if (brush.inputPoints.length > 4) {
      ctx.globalAlpha = 0.06;
      ctx.strokeStyle = `rgba(${INK_R}, ${INK_G}, ${INK_B}, 1)`;
      ctx.lineWidth = 0.5;
      const pts = brush.inputPoints;
      // Draw a few bristle lines offset from the center path
      for (let offset = -3; offset <= 3; offset += 2) {
        ctx.beginPath();
        for (let i = 0; i < pts.length; i++) {
          // Perpendicular offset for bristle effect
          let nx = 0, ny = 0;
          if (i < pts.length - 1) {
            const dx = pts[i + 1][0] - pts[i][0];
            const dy = pts[i + 1][1] - pts[i][1];
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            nx = -dy / len;
            ny = dx / len;
          }
          const px = pts[i][0] + nx * offset;
          const py = pts[i][1] + ny * offset;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }, [getInkAlpha]);

  /**
   * Take a snapshot of the current canvas state (before a new stroke).
   * Uses createImageBitmap for performance when available, falls back to Image.
   */
  const takeSnapshot = useCallback((canvas) => {
    const brush = brushRef.current;
    // Use ImageBitmap for zero-copy snapshot (fast on mobile)
    if (typeof createImageBitmap === 'function') {
      createImageBitmap(canvas).then((bmp) => {
        brush.snapshotImage = bmp;
      }).catch(() => {
        // Fallback: use data URL + Image
        const img = new Image();
        img.src = canvas.toDataURL();
        brush.snapshotImage = img;
      });
    } else {
      const img = new Image();
      img.src = canvas.toDataURL();
      brush.snapshotImage = img;
    }
  }, []);

  // --- Public API ---

  const startStroke = useCallback((e, canvas) => {
    if (e.type.startsWith('touch') && e.cancelable) e.preventDefault();
    const { x, y } = getPos(e, canvas);
    const pressure = getPressure(e);
    const hasRealPressure = e.pressure !== undefined && e.pressure > 0 && e.pressure < 1;

    // Snapshot the canvas so we can redraw cleanly on each pointermove
    takeSnapshot(canvas);

    brushRef.current = {
      inputPoints: [[x, y, pressure]],
      rawPoints: [[x, y]],
      snapshotImage: brushRef.current.snapshotImage || null,
      hasRealPressure,
    };

    playBrushSound();
  }, [getPos, getPressure, takeSnapshot]);

  const continueStroke = useCallback((e, canvas) => {
    if (e.type.startsWith('touch') && e.cancelable) e.preventDefault();
    const { x, y } = getPos(e, canvas);
    const pressure = getPressure(e);
    const brush = brushRef.current;

    // Skip if point is too close (avoid redundant work)
    const last = brush.inputPoints[brush.inputPoints.length - 1];
    if (last) {
      const dx = x - last[0];
      const dy = y - last[1];
      if (dx * dx + dy * dy < 1) return;
    }

    // Track real pressure availability
    if (e.pressure !== undefined && e.pressure > 0 && e.pressure < 1) {
      brush.hasRealPressure = true;
    }

    brush.inputPoints.push([x, y, pressure]);
    brush.rawPoints.push([x, y]);

    // Live render the growing stroke
    renderCurrentStroke(canvas);
  }, [getPos, getPressure, renderCurrentStroke]);

  const endStroke = useCallback(() => {
    stopBrushSound();
    // Return raw [x,y] points for character recognition
    const points = brushRef.current.rawPoints || [];
    // Clean up snapshot reference
    brushRef.current.snapshotImage = null;
    return points;
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
