import test from 'node:test';
import assert from 'node:assert/strict';
import { aiBat, ballQuality } from '../js/ai.js';
import { makeDelivery } from '../js/physics.js';
import { makeRng } from '../js/rng.js';
import { bowlWhy } from '../js/tactics.js';

const B = { fulltoss: null, yorker: 1.2, full: 3.2, good: 5.6, short: 8.3, bouncer: 10.5 }, H = { fulltoss: 0.85, yorker: 0.12, full: 0.4, good: 0.8, short: 1.25, bouncer: 1.75 };
const ball = (length, x = 0.1, kmh = 135, extra = {}) => makeDelivery({ x, length, bounce: B[length], h: H[length], kmh, swing: 0, move: 0, rx: 0.3, ...extra });
const ctx = (more = {}) => ({ ballNo: 12, need: 40, ballsLeft: 20, wicketsLeft: 3, skill: 75, bowlSkill: 75, release: 'good', style: {}, batType: 'power', mods: { sigmaMul: 1, edgeBoost: 0 }, bowlNew: true, ...more });
const tally = (length, x, n = 600, more = {}) => {
  const t = { lofted: 0, blocked: 0, hard: 0 };
  for (let s = 1; s <= n; s++) {
    const r = aiBat(ball(length, x + (s % 5) * 0.01), ctx(more), makeRng(s * 3 + 1));
    if (r.grade === 'defend') t.blocked++;
    if (r.res.outcome === 'hit' && r.res.loft) t.lofted++;
    if (r.res.outcome === 'hit' && r.res.v > 28) t.hard++;
  }
  return t;
};

test('each length has its own character', () => {
  const q = l => ballQuality(ball(l, 0.05));
  assert.ok(q('yorker').loft < q('full').loft && q('good').loft < q('full').loft && q('full').loft < q('fulltoss').loft, 'a yorker cannot be lifted, a full toss is');
  assert.ok(q('good').power < q('full').power || q('good').power < 1, 'a good length is respected');
  assert.ok(q('good').block > q('full').block && q('full').block >= q('fulltoss').block, 'and played out more often');
  assert.ok(q('fulltoss').sigma < q('good').sigma, 'a full toss is easy to time');
});

test('the line matters: the pads are flicked, the channel is hard, a wide one is reached for', () => {
  const pads = ballQuality(ball('good', -0.25)), channel = ballQuality(ball('good', 0.2)), wide = ballQuality(ball('good', 0.45));
  assert.ok(pads.power > channel.power && pads.sigma < channel.sigma, 'on the pads he gets it away');
  assert.ok(channel.edge > pads.edge, 'the channel finds the edge');
  assert.ok(wide.loft < channel.loft, 'reaching, he does not lift it');
});

test('pace gives him less time; the same length again and again, he is set for it', () => {
  const slow = ballQuality(ball('good', 0.1, 112)), fast = ballQuality(ball('good', 0.1, 148));
  assert.ok(fast.sigma > slow.sigma && fast.edge >= slow.edge);
  const first = ballQuality(ball('yorker', 0.05), 1), fourth = ballQuality(ball('yorker', 0.05), 4);
  assert.ok(fourth.loft > first.loft && fourth.block < first.block && fourth.sigma < first.sigma);
});

test('the batter plays the ball he is given: yorkers are not lifted, full tosses are, good lengths are respected', () => {
  const y = tally('yorker', 0.05), ft = tally('fulltoss', 0.05), g = tally('good', 0.15), f = tally('full', 0.15);
  assert.ok(y.lofted < ft.lofted * 0.5, `lofted: yorker ${y.lofted}, full toss ${ft.lofted}`);
  assert.ok(g.blocked > f.blocked * 2, `blocked: good ${g.blocked}, full ${f.blocked}`);
  assert.ok(g.hard < f.hard, `hard hits: good ${g.hard}, full ${f.hard}`);
  const spam = tally('yorker', 0.05, 600, { sameLen: 4 });
  assert.ok(spam.lofted > y.lofted, 'he plans for a yorker he has seen coming');
});

test('with Bowling 2.0 off, the batter is exactly as before', () => {
  const a = aiBat(ball('good', 0.15), ctx({ bowlNew: false }), makeRng(5)), b = aiBat(ball('good', 0.15), ctx({ bowlNew: undefined }), makeRng(5));
  assert.deepEqual(a, b);
});

test('the line after the ball says why', () => {
  assert.match(bowlWhy({ length: 'yorker', x: 0.02, runs: 0 }), /YORKER · ON THE STUMPS · NOTHING TO HIT/);
  assert.match(bowlWhy({ length: 'full', x: 0.05, runs: 4 }), /A BALL TO HIT/);
  assert.match(bowlWhy({ length: 'good', x: -0.25, runs: 4 }), /FLICKED OFF THE PADS/);
  assert.match(bowlWhy({ length: 'good', x: 0.2, runs: 0, defended: true }), /HE RESPECTED IT/);
  assert.match(bowlWhy({ length: 'short', x: 0.05, runs: 1, label: 'SKIED!' }), /HE TRIED TO LIFT IT/);
  assert.match(bowlWhy({ length: 'full', x: 0.05, runs: 6, same: 3 }), /HE SAW IT COMING/);
  assert.match(bowlWhy({ length: 'good', x: 0.2, wicket: true, outcome: 'bowled' }), /BEAT HIM/);
  assert.equal(bowlWhy({ length: 'good', x: 0.2, runs: 2 }), null);
});
