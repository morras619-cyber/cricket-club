import test from 'node:test';
import assert from 'node:assert/strict';
import { idealAngle, lineMatch, ballDifficulty, resolveContact } from '../js/shots.js';
import { makeDelivery } from '../js/physics.js';
import { makeRng } from '../js/rng.js';
import { heightForBounce } from '../js/tactics.js';

const BOUNCE = { good: 5.5, full: 3, short: 8.5 };
const ball = (x, length = 'good', extra = {}) => makeDelivery({ x, length, bounce: BOUNCE[length], h: heightForBounce(BOUNCE[length]), kmh: 125, ...extra });
const shotAt = angle => ({ kind: 'drive', angle, loft: false, len: 200 });
const tally = (d, angle, grade, n = 3000, seed = 5) => {
  const rng = makeRng(seed), o = { bowled: 0, edge: 0, beaten: 0, hit: 0, v: 0 };
  for (let i = 0; i < n; i++) { const r = resolveContact({ grade, errMs: 0, shot: shotAt(angle), d: ball(d.x, d.length, d.extra), rng }); o[r.outcome] = (o[r.outcome] || 0) + 1; if (r.outcome === 'hit') o.v += r.v; }
  return { ...o, p: k => o[k] / n, speed: o.v / Math.max(1, o.hit) };
};

test('every ball has a way it is best played: off to the off side, on the pads to leg, straight down the ground, the short ones pulled or cut', () => {
  assert.ok(idealAngle(ball(0.5)) > 0.6, 'wide of off: the off side');
  assert.ok(idealAngle(ball(-0.3)) < -0.3, 'on the pads: the leg side');
  assert.ok(Math.abs(idealAngle(ball(0))) < 0.2, 'straight: down the ground');
  assert.ok(idealAngle(ball(0.4, 'short')) > 1, 'a wide short ball is cut');
  assert.ok(idealAngle(ball(0, 'short')) < -0.5, 'a short ball at the body is pulled');
});
test('a shot with the line is matched, one against it is not', () => {
  const d = ball(0.5);
  assert.equal(lineMatch(0.8, d).q, 1);
  assert.ok(lineMatch(-0.8, d).q < 0.05);
  assert.ok(lineMatch(0.1, d).q > lineMatch(-0.3, d).q, 'the nearer to the line the better');
});
test('the better the ball (movement, pace), the harder it is to play against its line', () => {
  assert.ok(ballDifficulty({ swing: 0, move: 0, kmh: 110 }) < ballDifficulty({ swing: 0.5, move: 0.2, kmh: 140 }));
});
test('going with the line is struck harder than going against it, whatever the timing', () => {
  const d = { x: 0.45, length: 'good' };
  for (const g of ['perfect', 'good']) { const withL = tally(d, 0.8, g), against = tally(d, -0.8, g); assert.ok(withL.speed > against.speed * 1.2, `${g}: ${withL.speed.toFixed(1)} v ${against.speed.toFixed(1)}`); }
});
test('against the line is how the batter is beaten, edged or bowled; with the line he almost never is', () => {
  const d = { x: 0.0, length: 'full', extra: { swing: 0.5, move: 0.15 } };
  const withL = tally(d, 0.0, 'good'), against = tally(d, -1.0, 'good');
  const bad = o => o.p('bowled') + o.p('edge') + o.p('beaten');
  assert.ok(bad(withL) < 0.03, `with the line ${bad(withL)}`);
  assert.ok(bad(against) > 0.15 && bad(against) > bad(withL) * 5, `against the line ${bad(against)}`);
  assert.ok(against.p('bowled') > 0.03, 'a ball on the stumps played against its line is bowled, not just edged');
});
test('a better ball punishes the same mistake more', () => {
  const easy = { x: 0, length: 'good', extra: { kmh: 105, swing: 0, move: 0 } }, hard = { x: 0, length: 'good', extra: { kmh: 145, swing: 0.6, move: 0.3 } };
  const bad = o => o.p('bowled') + o.p('edge') + o.p('beaten');
  assert.ok(bad(tally(hard, -1.0, 'good')) > bad(tally(easy, -1.0, 'good')) * 1.3);
});
test('a well-timed shot is spared more often than a late one', () => {
  const d = { x: 0, length: 'full', extra: { swing: 0.4 } };
  const bad = o => o.p('bowled') + o.p('edge') + o.p('beaten');
  assert.ok(bad(tally(d, -1.0, 'perfect')) < bad(tally(d, -1.0, 'late')));
});
test('a mistimed swing at a full ball on the stumps can go through the gate for the batter in the nets of the player as well', () => {
  const d = { x: 0, length: 'full' }, o = tally(d, 0, 'late', 4000);
  assert.ok(o.p('bowled') > 0.04, `bowled ${o.p('bowled')}`);
  const none = (() => { const rng = makeRng(9); let b = 0; for (let i = 0; i < 4000; i++) if (resolveContact({ grade: 'late', errMs: 0, shot: shotAt(0), d: ball(0, 'full'), fx: { noGate: true }, rng }).outcome === 'bowled') b++; return b / 4000; })();
  assert.ok(none < o.p('bowled'), 'the AI asks for no gate here: ai.js has its own');
});
