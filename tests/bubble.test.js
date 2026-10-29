import test from 'node:test';
import assert from 'node:assert/strict';
import { bubbleLayout, FX } from '../js/fx.js';

test('a bubble sits above the speaker, with its tail pointing down at his mouth', () => {
  const r = bubbleLayout({ tx: 200, ty: 500, w: 180, h: 70, W: 390, H: 844, safeTop: 120 });
  assert.equal(r.below, false);
  assert.ok(r.y + 70 < 500, 'the bubble is above the mouth');
  assert.ok(r.x >= 8 && r.x + 180 <= 390 - 8, 'on the screen');
});

test('with no room above (the scorecard), it goes below the speaker', () => {
  const r = bubbleLayout({ tx: 200, ty: 150, w: 180, h: 70, W: 390, H: 844, safeTop: 120 });
  assert.equal(r.below, true);
  assert.ok(r.y > 150);
  assert.ok(r.y >= 120, 'never under the scorecard');
});

test('a speaker at the edge keeps the bubble on the screen', () => {
  for (const tx of [4, 386]) {
    const r = bubbleLayout({ tx, ty: 400, w: 220, h: 60, W: 390, H: 844 });
    assert.ok(r.x >= 8 && r.x + 220 <= 382);
  }
});

test('one speaker at a time, and the bubble knows who is speaking', () => {
  globalThis.Image = globalThis.Image || class {};   // (the effects load their pictures)
  const fx = new FX();
  fx.bubble('First', 100, 300, { name: 'Raja', color: '#1f6fe0', safeTop: 110 });
  fx.bubble('Second', 150, 320, { name: 'Zaheer' });
  assert.equal(fx.bubbles.length, 1);
  assert.equal(fx.bubbles[0].text, 'Second');
  assert.equal(fx.bubbles[0].name, 'Zaheer');
  assert.equal(fx.bubbles[0].safeTop, 8);
});
