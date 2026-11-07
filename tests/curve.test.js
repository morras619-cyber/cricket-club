import test from 'node:test';
import assert from 'node:assert/strict';
import { gestureToDelivery, deliveryMods } from '../js/tactics.js';

// the way the finger is drawn is the way the ball moves: a swipe up the middle, a good-length distance, at a good speed, bulged to one side or the other by `bulge` px
const swipe = (bulge = 0) => { const p = []; for (let i = 0; i <= 8; i++) p.push({ x: 200 + Math.sin(i / 8 * Math.PI) * bulge, y: 700 - i * 30, t: i * 20 }); return p; };

test('a straight swipe is the stock ball; a bulge to one side swings or turns it that way, the other bulge the other way', () => {
  for (const kind of ['swing', 'seam', 'express']) { const s = gestureToDelivery(swipe(), kind, 1); assert.equal(s.lateWorld, 0); assert.equal(s.mag, 0); }
  const out = gestureToDelivery(swipe(90), 'swing', 1), inn = gestureToDelivery(swipe(-90), 'swing', 1);
  assert.equal(out.type, 'Outswinger'); assert.equal(inn.type, 'Inswinger');
  assert.ok(out.swing * inn.swing < 0, 'opposite ways');
  const leg = gestureToDelivery(swipe(90), 'legspin', 1), off = gestureToDelivery(swipe(-90), 'legspin', 1);
  assert.ok(leg.move * off.move < 0, 'a spinner turns it the way the finger bulged');
});
test('the more the finger curves, the more it moves', () => {
  const small = gestureToDelivery(swipe(25), 'swing', 1), big = gestureToDelivery(swipe(90), 'swing', 1);
  assert.ok(small.mag > 0 && big.mag > small.mag);
  assert.ok(Math.abs(big.swing) > Math.abs(small.swing));
});
test('movement itself makes the ball harder to play, and a batter who has seen the same way three times is set for it', () => {
  const d = (mag, lateWorld = 1) => ({ length: 'yorker', lane: 'stumps', lateWorld, mag });
  const still = deliveryMods(d(0), [], null, null, null), mild = deliveryMods(d(0.4), [], null, null, null), big = deliveryMods(d(1), [], null, null, null);
  assert.equal(still.sigmaMul, 1); assert.ok(mild.sigmaMul > 1 && big.sigmaMul > mild.sigmaMul, 'the more it moves the harder');
  assert.ok(big.edgeBoost > mild.edgeBoost);
  const seen = [{ length: 'good', lateWorld: 1, mag: 0.6 }, { length: 'full', lateWorld: 1, mag: 0.6 }];
  const set = deliveryMods(d(0.6), seen, null, null, null), fresh = deliveryMods(d(0.6), [{ length: 'good', lateWorld: -1, mag: 0.6 }, { length: 'full', lateWorld: -1, mag: 0.6 }], null, null, null);
  assert.ok(set.tags.some(t => t.id === 'settled') && !fresh.tags.some(t => t.id === 'settled'));
  assert.ok(set.sigmaMul < fresh.sigmaMul, 'the same ball again is easier');
});
