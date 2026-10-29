import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { KIT_SHEETS } from '../js/kitsheets.js';

test('the painted ready stance is in the kit sheets: its three pictures, one frame, a print place and the painted colours to repaint from', () => {
  const m = KIT_SHEETS['bat-ready'];
  assert.ok(m, 'bat-ready entry');
  for (const f of ['bat-ready.webp', 'bat-ready-mask.png', 'bat-ready-tone.png']) assert.ok(existsSync(new URL(`../img/kit/${f}`, import.meta.url)), f);
  assert.equal(m.frames.length, 1); assert.equal(m.place.length, 1);
  const [x, y, w, h, ax, ay] = m.frames[0];
  assert.ok(ax > 0 && ax < w && ay > 0 && ay <= h, 'the feet are inside the frame');
  assert.equal(m.hsv.length, 3);
  for (const [hue, s, v] of m.hsv) { assert.ok(hue >= 0 && hue < 360); assert.ok(s > 0 && s <= 1 && v > 0 && v <= 1); }
  assert.equal(m.tones.length, 3);
});
