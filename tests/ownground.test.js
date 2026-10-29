import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
import { GROUND_ART } from '../js/groundart.js';

// tools/build_own_paint.py: the grounds of your own club at its three levels, each from one painted stand, for the three match cameras
for (const level of [1, 2, 3]) test(`the level-${level} ground has its three views, each with its pictures and a horizon inside it`, () => {
  const m = GROUND_ART[`own${level}`].views;
  for (const v of ['bat', 'bowl', 'keeper']) {
    for (const x of ['', '-tint', '-uv']) {
      const f = new URL(`../img/ground/own${level}/view-${v}${x}.webp`, import.meta.url);
      assert.ok(existsSync(f) && statSync(f).size > 100, `view-${v}${x}.webp`);
    }
    const a = m[v];
    assert.ok(a.f > 0 && a.w > 0 && a.h > a.above && a.above > 0, `${v}: focal length, size and horizon`);
    assert.ok(a.tile, `${v}: mirrored copies on a wide screen`);
    assert.match(a.top, /^#[0-9a-f]{6}$/); assert.match(a.bottom, /^#[0-9a-f]{6}$/);
  }
  // the view from above: its centre is inside the picture and the field (128 m across) is wider than it is tall as the game draws it
  const t = GROUND_ART[`own${level}`].top;
  assert.ok(t.px > 0 && t.c[0] > 0 && t.c[0] < t.w && t.c[1] > 0 && t.c[1] < t.h, 'top view size and centre');
  assert.ok(128 * t.px < t.w && 128 * 0.78 * t.px < t.h, 'the whole field fits in the top view');
});
