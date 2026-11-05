import test from 'node:test';
import assert from 'node:assert/strict';
import { gestureToDelivery, gripCap, overcook, gripSweet, deliveryMods } from '../js/tactics.js';

// a straight swipe up the middle, a good-length distance, at a good speed
const swipe = () => { const p = []; for (let i = 0; i <= 8; i++) p.push({ x: 200, y: 700 - i * 30, t: i * 20 }); return p; };
const grip = (lat, air = 0) => ({ lat, air, cap: 1 });

test('a ball in the middle of the grip is the stock ball, as a straight swipe always was', () => {
  for (const kind of ['swing', 'seam', 'express', 'offspin', 'legspin']) {
    const a = gestureToDelivery(swipe(), kind, 1), b = gestureToDelivery(swipe(), kind, 1, grip(0, 0));
    for (const k of ['kmh', 'swing', 'move', 'loop', 'type', 'length', 'lateWorld', 'mag']) assert.equal(b[k], a[k], `${kind} ${k}`);
  }
});
test('the grip decides which way it moves; the swipe\'s own curve no longer does', () => {
  const curved = swipe().map((p, i) => ({ ...p, x: p.x + Math.sin(i / 8 * Math.PI) * 90 }));
  const out = gestureToDelivery(swipe(), 'swing', 1, grip(0.8)), inn = gestureToDelivery(swipe(), 'swing', 1, grip(-0.8));
  assert.equal(out.type, 'Outswinger'); assert.equal(inn.type, 'Inswinger');
  assert.ok(out.swing * inn.swing < 0, 'opposite ways');
  const ignore = gestureToDelivery(curved, 'swing', 1, grip(0));
  assert.equal(ignore.lateWorld, 0, 'the bulge is ignored when the grip is in use');
  assert.equal(gestureToDelivery(curved, 'swing', 1).lateWorld, 1, 'and still counts with no grip');
});
test('down is in the air (more swing, less seam), up is off the pitch (more seam, less swing); for spin, up turns more and is flatter', () => {
  const air = gestureToDelivery(swipe(), 'swing', 1, grip(0.8, -0.8)), pitch = gestureToDelivery(swipe(), 'swing', 1, grip(0.8, 0.8));
  assert.ok(Math.abs(air.swing) > Math.abs(pitch.swing) && Math.abs(air.move) < Math.abs(pitch.move));
  const flight = gestureToDelivery(swipe(), 'legspin', 1, grip(0.8, -0.8)), flat = gestureToDelivery(swipe(), 'legspin', 1, grip(0.8, 0.8));
  assert.ok(flight.loop > flat.loop && Math.abs(flat.move) > Math.abs(flight.move));
});
test('the more it moves the more it can go wrong, and a better bowler controls more', () => {
  const s = gestureToDelivery(swipe(), 'swing', 1, grip(0.9, -0.9)).strength, mild = gestureToDelivery(swipe(), 'swing', 1, grip(0.3)).strength;
  assert.ok(s > mild);
  assert.equal(overcook(mild, 70), 0, 'a little movement is safe');
  assert.ok(overcook(s, 50) > overcook(s, 90), 'a weaker bowler overdoes it more often');
  assert.ok(overcook(2, 40) <= 0.5, 'never more than a coin flip');
  assert.ok(gripCap(90) > gripCap(50) && gripCap(50) >= 0.6 && gripCap(99, 'swingMaster') <= 1);
});
test('the right length for the movement unsettles the batter', () => {
  assert.equal(gripSweet('full', -0.6, 0.7, false), true); assert.equal(gripSweet('short', -0.6, 0.7, false), false);
  assert.equal(gripSweet('short', 0.6, 0.7, false), true); assert.equal(gripSweet('good', 0, 0.2, false), false, 'barely moving is no skill');
  const m = deliveryMods({ length: 'full', lane: 'off', lateWorld: 1, mag: 0.7, sweet: true }, [], null, null, null);
  assert.ok(m.sigmaMul > 1.15 && m.tags.some(t => t.id === 'sweet'));
});
test('movement itself makes the ball harder to play, and a batter who has seen the same way three times is set for it', () => {
  const d = (mag, air = 0, lateWorld = 1) => ({ length: 'yorker', lane: 'stumps', lateWorld, mag, air });
  const still = deliveryMods(d(0), [], null, null, null), mild = deliveryMods(d(0.4), [], null, null, null), big = deliveryMods(d(1, -1), [], null, null, null);
  assert.equal(still.sigmaMul, 1); assert.ok(mild.sigmaMul > 1 && big.sigmaMul > mild.sigmaMul, 'the more it moves the harder');
  assert.ok(big.edgeBoost > mild.edgeBoost);
  const seen = [{ length: 'good', lateWorld: 1, mag: 0.6 }, { length: 'full', lateWorld: 1, mag: 0.6 }];
  const set = deliveryMods(d(0.6), seen, null, null, null), fresh = deliveryMods(d(0.6), [{ length: 'good', lateWorld: -1, mag: 0.6 }, { length: 'full', lateWorld: 1, mag: 0.6 }], null, null, null);
  assert.ok(set.tags.some(t => t.id === 'settled') && !fresh.tags.some(t => t.id === 'settled'));
  assert.ok(set.sigmaMul < fresh.sigmaMul, 'the same ball again is easier');
});
