import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { KIT_SHEETS } from '../js/kitsheets.js';

// the painted batter (tools/build_bat_paint.py): every frame it names exists, has a print place and the feet inside it, and the painted colours are there to repaint from
test('the painted batter sheet is complete and consistent', () => {
  const m = KIT_SHEETS['bat-paint'];
  assert.ok(m, 'bat-paint entry');
  for (const f of ['bat-paint.webp', 'bat-paint-mask.png', 'bat-paint-tone.png']) assert.ok(existsSync(new URL(`../img/kit/${f}`, import.meta.url)), f);
  const names = Object.keys(m.names);
  for (const n of ['ready', 'backlift', 'drive1', 'drive2', 'drive3', 'pull1', 'pull2', 'cut1', 'cut4', 'def1', 'def3', 'rsweep1', 'rsweep3', 'celebrate', 'leave1', 'leave2']) assert.ok(names.includes(n), n);
  assert.equal(m.frames.length, names.length); assert.equal(m.place.length, names.length);
  const [SW, SH] = m.size;
  for (const n of names) {
    const [x, y, w, h, ax, ay] = m.frames[m.names[n]];
    assert.ok(x >= 0 && y >= 0 && x + w <= SW && y + h <= SH, `${n} is inside the sheet`);
    assert.ok(ax >= 0 && ax <= w && ay >= 0 && ay <= h, `${n}: the feet are inside the frame`);
  }
  assert.equal(m.hsv.length, 3);
  for (const [hue, s, v] of m.hsv) { assert.ok(hue >= 0 && hue < 360); assert.ok(s > 0 && s <= 1 && v > 0 && v <= 1); }
});
