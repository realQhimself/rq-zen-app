/**
 * Build script: extract median stroke data from hanzi-writer-data
 *
 * Reads the character list from src/data/strokeCounts.js, loads the median
 * polylines for each character from the hanzi-writer-data npm package, and
 * writes a single bundled JSON file at src/data/charMedians.json.
 *
 * Usage:  node scripts/build-medians.js
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── Parse character list from strokeCounts.js ──────────────────────────────
const strokeCountsSrc = readFileSync(
  resolve(ROOT, 'src/data/strokeCounts.js'),
  'utf-8',
);

// Match all single-character keys like '佛': 7
const charPattern = /'(.)'\s*:/g;
const chars = [];
let m;
while ((m = charPattern.exec(strokeCountsSrc)) !== null) {
  chars.push(m[1]);
}

console.log(`Found ${chars.length} characters in strokeCounts.js`);

// ── Load median data for each character ────────────────────────────────────
const medians = {};
let missing = 0;

for (const char of chars) {
  const jsonPath = resolve(
    ROOT,
    'node_modules/hanzi-writer-data',
    `${char}.json`,
  );
  try {
    const data = JSON.parse(readFileSync(jsonPath, 'utf-8'));
    if (data.medians) {
      medians[char] = data.medians;
    } else {
      console.warn(`  ⚠ No medians field for "${char}"`);
      missing++;
    }
  } catch {
    console.warn(`  ⚠ Could not load data for "${char}" (${jsonPath})`);
    missing++;
  }
}

console.log(
  `Loaded medians for ${Object.keys(medians).length}/${chars.length} characters` +
    (missing > 0 ? ` (${missing} missing)` : ''),
);

// ── Write output ───────────────────────────────────────────────────────────
const outPath = resolve(ROOT, 'src/data/charMedians.json');
writeFileSync(outPath, JSON.stringify(medians), 'utf-8');

console.log(`Wrote ${outPath}`);
