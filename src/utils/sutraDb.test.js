/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { saveStroke, getStroke, getAllStrokes, clearStrokes } from './sutraDb';

beforeEach(async () => {
  await clearStrokes('test-sutra');
});

describe('sutraDb', () => {
  it('saves and retrieves a stroke image', async () => {
    await saveStroke('test-sutra', 0, 'data:image/png;base64,abc');
    const result = await getStroke('test-sutra', 0);
    expect(result).toBe('data:image/png;base64,abc');
  });

  it('overwrites existing stroke at same index', async () => {
    await saveStroke('test-sutra', 0, 'old');
    await saveStroke('test-sutra', 0, 'new');
    const result = await getStroke('test-sutra', 0);
    expect(result).toBe('new');
  });

  it('returns null for missing stroke', async () => {
    const result = await getStroke('test-sutra', 999);
    expect(result).toBeNull();
  });

  it('getAllStrokes returns ordered array', async () => {
    await saveStroke('test-sutra', 2, 'c');
    await saveStroke('test-sutra', 0, 'a');
    await saveStroke('test-sutra', 1, 'b');
    const all = await getAllStrokes('test-sutra');
    expect(all).toEqual([
      { index: 0, dataUrl: 'a' },
      { index: 1, dataUrl: 'b' },
      { index: 2, dataUrl: 'c' },
    ]);
  });

  it('clearStrokes removes all for a sutra', async () => {
    await saveStroke('test-sutra', 0, 'a');
    await saveStroke('test-sutra', 1, 'b');
    await clearStrokes('test-sutra');
    const all = await getAllStrokes('test-sutra');
    expect(all).toEqual([]);
  });
});
