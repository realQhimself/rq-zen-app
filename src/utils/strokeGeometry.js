/**
 * Pure geometry utilities for stroke median path matching.
 *
 * All functions are side-effect-free and work with point arrays
 * where each point is [x, y].  Coordinate systems:
 *
 *   Canvas:        origin top-left, Y increases downward, varies by device
 *   makemeahanzi:  1024 wide, origin bottom-left (Y=0 bottom, Y=900 top)
 *
 * The matching pipeline:
 *   1. Convert canvas coordinates → median space  (canvasToMedianSpace)
 *   2. Resample both curves to equal point counts  (resampleCurve)
 *   3. Normalize (center + scale)                  (normalizeCurve)
 *   4. Compute Frechet + average distance          (frechetDistance, averageDistance)
 */

// ── Helpers ────────────────────────────────────────────────────────────────

function dist(a, b) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return Math.sqrt(dx * dx + dy * dy);
}

function lerp(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

// ── Coordinate conversion ──────────────────────────────────────────────────

/**
 * Convert canvas pixel coordinates to makemeahanzi 1024×900 space.
 * Canvas Y goes top-down; median space Y goes bottom-up (0 at bottom, 900 at top).
 */
export function canvasToMedianSpace(points, canvasWidth, canvasHeight) {
  return points.map(([x, y]) => [
    (x / canvasWidth) * 1024,
    900 - (y / canvasHeight) * 900,
  ]);
}

// ── Resampling ─────────────────────────────────────────────────────────────

/**
 * Resample a polyline to exactly `n` equidistant points.
 * If the input has fewer than 2 points, returns as-is (padded to n by
 * repeating the single point).
 */
export function resampleCurve(points, n = 25) {
  if (points.length === 0) return [];
  if (points.length === 1) return Array(n).fill(points[0]);

  // Compute cumulative arc-lengths
  const segs = [0];
  for (let i = 1; i < points.length; i++) {
    segs.push(segs[i - 1] + dist(points[i - 1], points[i]));
  }
  const totalLen = segs[segs.length - 1];
  if (totalLen === 0) return Array(n).fill(points[0]);

  const result = [points[0].slice()];
  let segIdx = 1;

  for (let i = 1; i < n - 1; i++) {
    const target = (i / (n - 1)) * totalLen;
    while (segIdx < segs.length - 1 && segs[segIdx] < target) segIdx++;
    const segStart = segs[segIdx - 1];
    const segEnd = segs[segIdx];
    const t = segEnd === segStart ? 0 : (target - segStart) / (segEnd - segStart);
    result.push(lerp(points[segIdx - 1], points[segIdx], t));
  }
  result.push(points[points.length - 1].slice());
  return result;
}

// ── Centroid & Normalization ───────────────────────────────────────────────

/** Average of all points. */
export function centroid(points) {
  let sx = 0, sy = 0;
  for (const [x, y] of points) { sx += x; sy += y; }
  return [sx / points.length, sy / points.length];
}

/**
 * Center the curve at origin, then scale so that the bounding-box diagonal
 * becomes 1.0.  Returns a new array (does not mutate input).
 */
export function normalizeCurve(points) {
  if (points.length === 0) return [];

  const [cx, cy] = centroid(points);

  // Translate to origin
  const centered = points.map(([x, y]) => [x - cx, y - cy]);

  // Scale by bounding-box diagonal (more robust than start/end magnitude)
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of centered) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const diag = Math.sqrt((maxX - minX) ** 2 + (maxY - minY) ** 2) || 1;

  return centered.map(([x, y]) => [x / diag, y / diag]);
}

// ── Distance metrics ───────────────────────────────────────────────────────

/**
 * Discrete Frechet distance between two point arrays P and Q.
 * O(|P| * |Q|) dynamic programming.  Returns a scalar >= 0.
 */
export function frechetDistance(P, Q) {
  const n = P.length;
  const m = Q.length;
  if (n === 0 || m === 0) return Infinity;

  // Use flat array for performance (avoid 2D array allocation overhead)
  const dp = new Float64Array(n * m);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      const d = dist(P[i], Q[j]);
      if (i === 0 && j === 0) {
        dp[0] = d;
      } else if (i === 0) {
        dp[j] = Math.max(dp[j - 1], d);
      } else if (j === 0) {
        dp[i * m] = Math.max(dp[(i - 1) * m], d);
      } else {
        dp[i * m + j] = Math.max(
          Math.min(dp[(i - 1) * m + j], dp[i * m + (j - 1)], dp[(i - 1) * m + (j - 1)]),
          d,
        );
      }
    }
  }
  return dp[n * m - 1];
}

/**
 * Average minimum distance: for each point in A, find the closest point in B,
 * then average those minimum distances.
 */
export function averageDistance(A, B) {
  if (A.length === 0 || B.length === 0) return Infinity;

  let total = 0;
  for (const a of A) {
    let minD = Infinity;
    for (const b of B) {
      const d = dist(a, b);
      if (d < minD) minD = d;
    }
    total += minD;
  }
  return total / A.length;
}

// ── High-level matcher ─────────────────────────────────────────────────────

/**
 * Score how well a user stroke matches a reference median.
 * Both inputs should already be in the same coordinate space (median space).
 *
 * Returns { frechet, avgDist } — lower is better.
 *
 * Caller decides thresholds; this function just computes the numbers.
 */
export function matchScore(userStroke, refMedian, sampleCount = 25) {
  const uResampled = resampleCurve(userStroke, sampleCount);
  const rResampled = resampleCurve(refMedian, sampleCount);

  const uNorm = normalizeCurve(uResampled);
  const rNorm = normalizeCurve(rResampled);

  // Also try reversed user stroke (user might write a stroke backwards)
  const uNormRev = normalizeCurve([...uResampled].reverse());

  const frechetFwd = frechetDistance(uNorm, rNorm);
  const frechetRev = frechetDistance(uNormRev, rNorm);

  const avgDistFwd = averageDistance(uNorm, rNorm);
  const avgDistRev = averageDistance(uNormRev, rNorm);

  // Pick the better direction
  const useFwd = frechetFwd + avgDistFwd <= frechetRev + avgDistRev;

  return {
    frechet: useFwd ? frechetFwd : frechetRev,
    avgDist: useFwd ? avgDistFwd : avgDistRev,
  };
}
