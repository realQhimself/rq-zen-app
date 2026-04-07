import { useRef, useCallback } from 'react';
import STROKE_COUNTS from '../data/strokeCounts';
import CHAR_MEDIANS from '../data/charMedians.json';
import {
  canvasToMedianSpace,
  matchScore,
} from '../utils/strokeGeometry';

// ── Tuning knobs ───────────────────────────────────────────────────────────
// Meditation app → generous thresholds. Lower = stricter.

const FRECHET_THRESHOLD = 0.55;   // max normalised Frechet distance to count a match
const AVG_DIST_THRESHOLD = 0.35;  // max normalised average distance
const LENIENCY = 1.8;            // multiplier applied to both thresholds
const COVERAGE_REQUIRED = 0.60;   // fraction of reference strokes that must be covered
const STROKE_REQUIRED_RATIO = 0.5; // min fraction of expected stroke count

// ── Pixel-overlap fallback (kept for chars without median data) ────────────

const W_OVERLAP = 0.35;
const W_ZONE = 0.35;
const W_STROKE = 0.30;
const AUTO_ADVANCE_SCORE = 0.6;
const ZONE_COVERAGE_MIN = 0.25;
const ZONE_REQUIRED_RATIO = 0.55;

function analyzeCanvasPixels(canvas, offscreen) {
  if (!canvas || !offscreen) return { overlap: 0, zoneCoverage: 0 };

  const width = canvas.width;
  const height = canvas.height;
  const userData = canvas.getContext('2d').getImageData(0, 0, width, height).data;
  const refData = offscreen.getContext('2d').getImageData(0, 0, width, height).data;

  const ZONES = 3;
  const zoneRefCount = new Array(ZONES * ZONES).fill(0);
  const zoneOverlapCount = new Array(ZONES * ZONES).fill(0);
  const zoneW = width / ZONES;
  const zoneH = height / ZONES;

  let totalRef = 0;
  let totalOverlap = 0;

  for (let i = 0; i < userData.length; i += 4) {
    const refAlpha = refData[i + 3];
    if (refAlpha > 128) {
      const pixelIndex = i / 4;
      const px = pixelIndex % width;
      const py = Math.floor(pixelIndex / width);
      const zx = Math.min(Math.floor(px / zoneW), ZONES - 1);
      const zy = Math.min(Math.floor(py / zoneH), ZONES - 1);
      const zi = zy * ZONES + zx;

      totalRef++;
      zoneRefCount[zi]++;

      if (userData[i + 3] > 180 && userData[i] < 80) {
        totalOverlap++;
        zoneOverlapCount[zi]++;
      }
    }
  }

  const overlap = totalRef === 0 ? 0 : totalOverlap / totalRef;

  let zonesWithContent = 0;
  let zonesCovered = 0;
  for (let z = 0; z < ZONES * ZONES; z++) {
    if (zoneRefCount[z] > 0) {
      zonesWithContent++;
      if (zoneOverlapCount[z] / zoneRefCount[z] >= ZONE_COVERAGE_MIN) {
        zonesCovered++;
      }
    }
  }
  const zoneCoverage = zonesWithContent === 0 ? 0 : zonesCovered / zonesWithContent;

  return { overlap, zoneCoverage };
}

// ── Hook ───────────────────────────────────────────────────────────────────

export default function useCharRecognition() {
  const refCanvasRef = useRef(null);        // offscreen canvas for pixel fallback
  const charRef = useRef('');
  const refMediansRef = useRef(null);       // median data for current char
  const canvasDimsRef = useRef({ w: 0, h: 0 }); // CSS dimensions (not DPR-scaled)
  const matchedRef = useRef(new Set());     // indices of covered reference medians

  // ── buildReference ─────────────────────────────────────────────────────

  const buildReference = useCallback((char, width, height) => {
    charRef.current = char;
    canvasDimsRef.current = { w: width, h: height };
    matchedRef.current = new Set();

    // Load median data (pre-bundled)
    refMediansRef.current = CHAR_MEDIANS[char] || null;

    // Always build the pixel reference too (used as fallback)
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

  // ── Median-based matching ──────────────────────────────────────────────

  /**
   * Try to match each user stroke against the reference medians.
   * Returns the fraction of reference medians that have been "covered".
   */
  const matchStrokes = useCallback((userStrokes) => {
    const refMedians = refMediansRef.current;
    if (!refMedians || refMedians.length === 0) return 0;

    const { w, h } = canvasDimsRef.current;
    if (w === 0 || h === 0) return 0;

    // Fresh matched set — re-match all user strokes each time so that
    // the order of writing doesn't matter.
    const matched = new Set();

    // For each user stroke, find the best-matching unmatched reference median
    for (const rawStroke of userStrokes) {
      if (!rawStroke || rawStroke.length < 2) continue;

      // Convert canvas coordinates to median space
      const userInMedian = canvasToMedianSpace(rawStroke, w, h);

      let bestIdx = -1;
      let bestCost = Infinity;

      for (let ri = 0; ri < refMedians.length; ri++) {
        if (matched.has(ri)) continue;
        const { frechet, avgDist } = matchScore(userInMedian, refMedians[ri]);
        const cost = frechet + avgDist;
        if (cost < bestCost) {
          bestCost = cost;
          bestIdx = ri;
        }
      }

      // Check if the best match passes thresholds
      if (bestIdx >= 0) {
        const { frechet, avgDist } = matchScore(userInMedian, refMedians[bestIdx]);
        if (
          frechet < FRECHET_THRESHOLD * LENIENCY &&
          avgDist < AVG_DIST_THRESHOLD * LENIENCY
        ) {
          matched.add(bestIdx);
        }
      }
    }

    matchedRef.current = matched;
    return matched.size / refMedians.length;
  }, []);

  // ── shouldAdvance ──────────────────────────────────────────────────────

  /**
   * Decide whether to auto-advance to the next character.
   *
   * @param {HTMLCanvasElement} canvas - the drawing canvas
   * @param {number} userStrokeCount - total strokes drawn so far
   * @param {Array<Array<[number,number]>>} [userStrokePoints] - collected stroke point arrays
   *        If provided and median data exists, uses median matching.
   *        Otherwise falls back to pixel overlap.
   */
  const shouldAdvance = useCallback(
    (canvas, userStrokeCount, userStrokePoints) => {
      const expectedStrokes = STROKE_COUNTS[charRef.current] || 8;
      const strokeRatio = Math.min(userStrokeCount / expectedStrokes, 1.0);

      // Hard gate: must have drawn enough strokes
      if (strokeRatio < STROKE_REQUIRED_RATIO) return false;

      // ── Median path matching (preferred) ─────────────────────────────
      if (
        userStrokePoints &&
        userStrokePoints.length > 0 &&
        refMediansRef.current
      ) {
        const coverage = matchStrokes(userStrokePoints);
        return coverage >= COVERAGE_REQUIRED;
      }

      // ── Pixel overlap fallback ───────────────────────────────────────
      const { overlap, zoneCoverage } = analyzeCanvasPixels(
        canvas,
        refCanvasRef.current,
      );

      if (zoneCoverage < ZONE_REQUIRED_RATIO) return false;

      const score =
        W_OVERLAP * overlap + W_ZONE * zoneCoverage + W_STROKE * strokeRatio;
      return score >= AUTO_ADVANCE_SCORE;
    },
    [matchStrokes],
  );

  return { buildReference, shouldAdvance };
}
