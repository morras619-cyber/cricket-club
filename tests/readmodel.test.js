import test from 'node:test';
import assert from 'node:assert/strict';
import { planExpectationBw, deliveryMods } from '../js/tactics.js';

const ball = length => ({ length, lane: 'stumps', lateWorld: 0, mag: 0, air: 0, slower: false, after: 0, sweet: false });
const mods = (hist, length) => { const e = planExpectationBw(hist); return { e, m: deliveryMods(ball(length), hist, e.expect, { weak: null }, null, e.conf) }; };

test('Bowling 2.0: he expects what you have shown him, told straight, and is sure when you repeat', () => {
  const rep = [ball('good'), ball('good'), ball('good'), ball('good')];
  const e = planExpectationBw(rep);
  assert.equal(e.expect, 'good'); assert.equal(e.honest, true); assert.equal(e.conf, 1);
  assert.equal(planExpectationBw([]).expect, 'good');
  const mix = planExpectationBw([ball('short'), ball('full'), ball('yorker'), ball('good')]);
  assert.ok(mix.conf < 0.5, 'a bowler who mixes it up gives him nothing to be sure of');
  assert.equal(planExpectationBw([ball('good'), ball('full'), ball('full')]).expect, 'full', 'the recent balls count most');
});

test('Bowling 2.0: the ball he expects is ready for, the one he does not is hard to time and early', () => {
  const h = [ball('good'), ball('good'), ball('good')];
  const ready = mods(h, 'good').m, step = mods(h, 'full').m, fooled = mods(h, 'yorker').m, far = mods(h, 'fulltoss').m;
  assert.ok(ready.sigmaMul < 1 && ready.loftAdd > 0, 'he is ready for it and punishes it');
  assert.equal(step.sigmaMul, 1, 'a step off is nothing');
  assert.ok(fooled.sigmaMul > 1.4 && fooled.edgeBoost > 0.05 && fooled.bias < 0, 'two steps off he has committed to the wrong ball');
  assert.ok(far.sigmaMul > fooled.sigmaMul, 'the further off, the worse');
  // the surer he was, the harder he is caught out
  const unsure = mods([ball('short'), ball('full'), ball('yorker'), ball('good')], 'fulltoss').m;
  assert.ok(unsure.sigmaMul < far.sigmaMul);
});
