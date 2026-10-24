import test from 'node:test';
import assert from 'node:assert/strict';
import { CutIn } from '../js/cutin.js';

// a canvas context that records how deep its save stack is, and ignores the drawing
function fakeCtx() {
  const t = { depth: 0, save() { t.depth++; }, restore() { t.depth--; } };
  return new Proxy(t, { get: (o, k) => (k in o ? o[k] : () => ({ width: 10, addColorStop() {} })), set: (o, k, v) => { o[k] = v; return true; }, deleteProperty: (o, k) => delete o[k] });
}
const power = { name: 'Swing Storm', desc: 'Three balls that swing and seam twice as much', kind: 'storm', cost: 60 };
const look = { suit: '#161616', trim: '#ffffff', skin: '#a8714f', hair: '#1b1410', mask: null, cape: null };

test('a cut-in that fails to draw leaves the canvas as it found it, and is dropped', () => {
  const c = new CutIn(), ctx = fakeCtx();
  c.start({ id: 'x', name: 'Andre Granger', slot: 'bowl', plain: true, face: null, quote: 'hi', look: { ...look, skin: 4 } }, power, 1000);   // (a tone number, not a colour: the bug that froze a career match)
  const origError = console.error; console.error = () => {};
  try { c.draw(ctx, 390, 844, 1300); } finally { console.error = origError; }
  assert.equal(ctx.depth, 0, 'every save was restored');
  assert.equal(c.busy, false, 'the cut-in is gone');
});

test('a good cut-in draws and is balanced, and ends after its time', () => {
  const c = new CutIn(), ctx = fakeCtx();
  c.start({ id: 'x', name: 'Andre Granger', slot: 'bowl', plain: true, face: null, quote: 'hi', look }, power, 1000);
  c.draw(ctx, 390, 844, 1300);
  assert.equal(ctx.depth, 0);
  assert.equal(c.busy, true);
  c.draw(ctx, 390, 844, 3000);
  assert.equal(c.busy, false);
});
