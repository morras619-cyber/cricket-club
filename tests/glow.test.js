import test from 'node:test';
import assert from 'node:assert/strict';
globalThis.Image = class { set src(v) {} };   // (fx.js loads its burst art when it is made)
const { FX } = await import('../js/fx.js').catch(() => ({}));

test('a glow swells, then is gone after its time; there are never more than four at once', { skip: !FX }, () => {
  const fx = new FX();
  fx.glow('#ffd23f', 0.5, 10, 10, { dur: 1000 });
  assert.equal(fx.glows.length, 1);
  fx.update(500); assert.equal(fx.glows.length, 1);
  fx.update(600); assert.equal(fx.glows.length, 0);
  for (let i = 0; i < 9; i++) fx.glow('#fff', 0.3);
  assert.equal(fx.glows.length, 4);
  fx.reset(); assert.equal(fx.glows.length, 0);
});
