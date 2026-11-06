import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveContact, isWide, WIDE, HIT_ARC, idealAngle } from '../js/shots.js';
import { makeDelivery } from '../js/physics.js';
import { makeRng } from '../js/rng.js';
import { Innings } from '../js/match.js';

const ball = (x, length = 'good') => makeDelivery({ x, length, bounce: length === 'short' ? 9 : 6, kmh: 128, swing: 0, move: 0, rx: 0.3, h: 0.8 });
const play = (d, angle, seed, grade = 'perfect') => resolveContact({ grade, errMs: 0, shot: { kind: 'drive', angle, loft: false, len: 160 }, d, fx: {}, rng: makeRng(seed), strength: 1 });

test('a ball on the left cannot be hit to the right', () => {
  const d = ball(-0.3);                                  // on the leg side: its natural shot goes left
  assert.ok(idealAngle(d) < 0);
  let hit = 0, across = 0, offSide = 0;
  for (let s = 1; s <= 300; s++) {
    const r = play(d, 1.2, s);                           // swung hard to the off side
    if (r.outcome === 'hit') { hit++; if (r.across) across++; if (r.angle > idealAngle(d) + HIT_ARC + 0.2) offSide++; }
  }
  assert.equal(offSide, 0, 'it never goes where it was aimed, beyond the arc');
  assert.equal(across, hit, 'every one that is hit is marked as across the line');
  assert.ok(hit < 200, `most of them are beaten or edged (${hit} of 300 were hit)`);
});

test('a ball played with its line is not held back by the arc', () => {
  const d = ball(0.25);
  let hit = 0, across = 0;
  for (let s = 1; s <= 200; s++) { const r = play(d, idealAngle(d), s); if (r.outcome === 'hit') { hit++; if (r.across) across++; } }
  assert.equal(across, 0);
  assert.ok(hit > 170, `${hit} of 200`);
});

test('a short ball can be pulled or cut: its arc is wider, but still an arc', () => {
  const d = ball(0.0, 'short');
  assert.ok(Math.abs(idealAngle(d)) > 0.5);
  const r = play(d, idealAngle(d) + 0.8, 5);
  assert.ok(!r.across, 'a pull a little different from the natural one is fine');
  assert.equal(play(d, idealAngle(d) + 1.6, 5).across || play(d, idealAngle(d) + 1.6, 5).outcome !== 'hit', true);
});

test('the scoop over the keeper is its own shot, not held to the arc', () => {
  const d = ball(0.0, 'full');
  const r = play(d, 3.0, 9);
  assert.ok(!r.across);
});

test('wides: wide of leg beyond 0.5 m, wide of off beyond 0.75 m, and the left-hander the other way round', () => {
  assert.equal(isWide(0.1), false); assert.equal(isWide(0.5), false); assert.equal(isWide(0.8), true);
  assert.equal(isWide(-0.4), false); assert.equal(isWide(-0.6), true);
  assert.equal(isWide(0.6, true), true, 'on the leg side for a left-hander');
  assert.equal(isWide(-0.6, true), false);
  assert.equal(isWide(-0.8, true), true);
  assert.ok(WIDE.leg > -WIDE.off, 'the leg side is called tighter');
});

test('a wide is an extra: a run, the ball does not count, and it shows in the over', () => {
  const inn = new Innings('ai');
  inn.setBowler({ id: 'b', name: 'B', bowl: 'swing' });
  inn.wide();
  assert.equal(inn.runs, 1); assert.equal(inn.balls, 0); assert.deepEqual(inn.wides, [0]);
  assert.equal(inn.bowler.runs, 1);
  inn.ball({ runs: 0 }); inn.wide();
  assert.equal(inn.balls, 1); assert.deepEqual(inn.wides, [0, 1]); assert.equal(inn.runs, 2);
});

const rate = (d, angle, grade = 'perfect', n = 400) => { let hit = 0; for (let s = 1; s <= n; s++) if (play(d, angle, s, grade).outcome === 'hit') hit++; return hit / n; };

test('cuts: a ball outside off can be cut square and late, whatever the length', () => {
  for (const length of ['good', 'full', 'short']) {
    const d = ball(0.5, length);
    for (const a of [1.4, 1.8, 2.1]) assert.ok(rate(d, a) > 0.9, `${length} cut at ${a} rad: ${rate(d, a)}`);
  }
});

test('pulls and hooks: a short ball on the pads or on the stumps is pulled all the way round to fine leg', () => {
  for (const x of [-0.3, 0, 0.1]) for (const a of [-1.2, -1.8, -2.3]) assert.ok(rate(ball(x, 'short'), a) > 0.85, `x ${x} pull at ${a}: ${rate(ball(x, 'short'), a)}`);
});

test('a short ball outside off may be pulled across the line: a risk, not a bar', () => {
  const d = ball(0.4, 'short');
  const p = rate(d, -1.0), q = rate(d, -1.0, 'late');
  assert.ok(p > 0.85 && q > 0.7 && q < p, `perfect ${p}, late ${q}`);
});

test('the rule that started it still holds: going the other way round the ball is across the line', () => {
  assert.ok(rate(ball(-0.3), 1.2) < 0.7, 'a leg-side ball swung to the off side');
  assert.ok(rate(ball(0.4), -1.2) < 0.7, 'a good ball outside off swung to leg');
  assert.ok(rate(ball(0.0, 'good'), 1.6) < 0.7, 'a straight good ball cannot be cut square');
});
