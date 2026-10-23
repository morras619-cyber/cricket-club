import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// story.js reaches for the browser when loaded: the few things it touches are stood in for
globalThis.Image = class { addEventListener() {} };
globalThis.document = { createElement: () => ({ getContext: () => ({}), classList: { toggle() {}, add() {} }, style: {}, append() {} }), getElementById: () => null };
globalThis.window = { devicePixelRatio: 1 };
globalThis.localStorage = { getItem: () => null, setItem() {} };
const { TAUNTS, PANELS } = await import('../js/story.js');
const { DEV } = await import('../js/coach.js');

test('every line the first-time story asks for exists', () => {
  const src = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
  for (const [, g] of src.matchAll(/say\([^,]+, '(\w+)'/g)) assert.ok(TAUNTS[g]?.length >= 2, `taunts: ${g}`);
  for (const [, k] of src.matchAll(/coach\?\.\('(story\w+)'\)/g)) assert.ok(DEV[k]?.length, `Uncle Dev: ${k}`);
  assert.ok(DEV.storyDone.length >= 3, 'the ending sends you on to the career');
  assert.ok(PANELS.length >= 3 && PANELS.every(p => p.head && p.dev && p.bg), 'every story panel has its picture and words');
});
