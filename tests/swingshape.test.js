import test from 'node:test';
import assert from 'node:assert/strict';
import { makeDelivery } from '../js/physics.js';
import { gestureToDelivery } from '../js/tactics.js';

// the ball swings when and how the finger curved: its sideways path off the straight line follows the swipe's curve
const dev = (d, u) => { const t1 = d.bounceT, chord = d.pos(0).x + (d.bounce.x - d.pos(0).x) * u; return d.pos(t1 * u).x - chord; };
const argPeak = (d) => { let best = 0, at = 0; for (let k = 1; k < 20; k++) { const v = Math.abs(dev(d, k / 20)); if (v > best) { best = v; at = k / 20; } } return at; };
// a swipe up the screen whose finger bulges to the right by `bulge` px, the bulge peaking `peak` of the way up
const swipe = (bulge, peak) => { const p = []; for (let i = 0; i <= 12; i++) { const u = i / 12, w = u < peak ? Math.sin(u / peak * Math.PI / 2) : Math.cos((u - peak) / (1 - peak) * Math.PI / 2); p.push({ x: 200 + bulge * (u === 0 || u === 1 ? 0 : w), y: 700 - i * 25, t: i * 20 }); } return p; };

test('an AI ball (no swipe) swings in an even bulge that peaks halfway, as it always did', () => {
  const d = makeDelivery({ x: 0, length: 'good', kmh: 135, swing: 0.2 });
  assert.ok(Math.abs(argPeak(d) - 0.5) < 0.06);
  assert.ok(Math.abs(Math.abs(dev(d, 0.5)) - 0.2) < 0.01, 'by as much as its swing');
});
test('a swipe that curved early swings early, one that curved late swings late, and the ball pitches and arrives on the same line', () => {
  const early = gestureToDelivery(swipe(80, 0.25), 'swing', 1), late = gestureToDelivery(swipe(80, 0.75), 'swing', 1);
  assert.ok(early.swingProfile && late.swingProfile);
  const de = makeDelivery({ x: 0.05, length: 'good', kmh: 135, swing: early.swing, profile: early.swingProfile }), dl = makeDelivery({ x: 0.05, length: 'good', kmh: 135, swing: late.swing, profile: late.swingProfile }), d0 = makeDelivery({ x: 0.05, length: 'good', kmh: 135, swing: 0 });
  assert.ok(argPeak(de) < 0.4 && argPeak(dl) > 0.6, `early ${argPeak(de)}, late ${argPeak(dl)}`);
  for (const d of [de, dl]) { assert.ok(Math.abs(d.pos(d.bounceT).x - d0.pos(d0.bounceT).x) < 1e-9); assert.ok(Math.abs(d.atContact.x - d0.atContact.x) < 1e-9); }
});
test('a straight swipe has no profile, and a bigger bulge swings more', () => {
  assert.equal(gestureToDelivery(swipe(0, 0.5), 'swing', 1).swingProfile, null);
  assert.ok(Math.abs(gestureToDelivery(swipe(90, 0.5), 'swing', 1).swing) > Math.abs(gestureToDelivery(swipe(30, 0.5), 'swing', 1).swing));
});
