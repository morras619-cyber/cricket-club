import test from 'node:test';
import assert from 'node:assert/strict';
import { Mind, COUNTERS, affordable, cheapest, BRACE } from '../js/counters.js';
import { aiBat } from '../js/ai.js';
import { resolveContact } from '../js/shots.js';
import { makeDelivery } from '../js/physics.js';
import { makeRng } from '../js/rng.js';

test('a counter needs the charge: Brace 20, Steady Hands 25, nothing below that', () => {
  assert.deepEqual(affordable(19), []);
  assert.deepEqual(affordable(20), ['brace']);
  assert.deepEqual(affordable(25), ['brace', 'steady']);
  assert.equal(cheapest, COUNTERS.brace.cost);
});

test('the AI answers only from its own hidden charge, pays for it, and keeps it back for a Spark', () => {
  const m = new Mind(makeRng(3));
  m.charge.value = 0;
  assert.equal(m.counter('thunder'), null, 'no charge, no answer');
  m.charge.value = 19; assert.equal(m.counter('thunder'), null);
  let got = null;
  for (let i = 0; i < 20 && !got; i++) { m.charge.value = 60; got = m.counter('thunder'); }
  assert.ok(got, 'a big power is nearly always answered');
  assert.ok(m.charge.value <= 60 - COUNTERS[got].cost + 0.001 || m.charge.value === 60 - COUNTERS[got].cost, 'and paid for');
  const n = new Mind(makeRng(4)); n.charge.value = 40;
  assert.equal(n.counter('focus'), null, 'a 30-charge Spark is not worth answering from a thin tank');
  const w = new Mind(makeRng(5)); w.charge.value = 80; let steady = false;
  for (let i = 0; i < 30; i++) { w.charge.value = 80; if (w.counter('tornado', { wicketsLeft: 1 }) === 'steady') steady = true; }
  assert.ok(steady, 'a batter with his wicket on the line takes Steady Hands against a yorker');
});

test('the AI earns charge from play, fires only when it can pay, and holds some back when you look able to answer', () => {
  const m = new Mind(makeRng(6));
  for (let i = 0; i < 6; i++) m.earn({ batting: false, runs: 0 });
  m.earn({ batting: false, wicket: true });
  assert.ok(m.value > 30, 'dots and a wicket fill it');
  m.earn({ batting: true, wicket: true });
  assert.ok(m.value < 70);
  const base = { kind: 'tornado', cost: 60, ball: 20, lastRuns: 4, setBat: true, pressure: false, yourCharge: 0, wicketsLeft: 3 };
  const low = new Mind(makeRng(7)); low.charge.value = 59;
  assert.equal(low.wantsToFire(base), false, 'cannot afford it');
  const rich = new Mind(makeRng(7)); rich.charge.value = 100;
  assert.equal(rich.wantsToFire(base), true, 'late, after a boundary, with a set batter: now');
  const early = new Mind(makeRng(7)); early.charge.value = 100;
  assert.equal(early.wantsToFire({ ...base, ball: 5, lastRuns: 0, setBat: false }), false, 'no reason yet: it waits');
  const careful = new Mind(makeRng(7)); careful.charge.value = 70;
  assert.equal(careful.wantsToFire({ ...base, yourCharge: 100, ball: 20 }), false, 'you look able to fire one: it keeps a counter back');
  assert.equal(careful.wantsToFire({ ...base, yourCharge: 100, ball: 27 }), true, 'but at the death it goes for it');
});

test('Brace halves a power, Steady Hands lifts timing to Good', () => {
  const d = makeDelivery({ x: 0, length: 'good', kmh: 135, swing: 0, move: 0, rx: 0.3 });
  const r = (grade, fx) => resolveContact({ grade, errMs: 0, shot: { kind: 'drive', angle: 0.2, loft: false, len: 150 }, d, fx, rng: makeRng(2), strength: 1 });
  assert.ok(r('good', { thunder: true }).forced.six, 'Thunderclap: a Good shot is a six');
  assert.ok(!r('good', { thunder: true, braced: true }).forced.six, 'braced: only a Perfect');
  assert.ok(r('perfect', { thunder: true, braced: true }).forced.six);
  assert.equal(r('good', { shatter: true }).outcome, 'edge', 'Shatter Seam edges a Good contact');
  assert.equal(r('good', { shatter: true, shatterHalf: true }).outcome, 'hit', 'braced: a Good contact is spared');
  const ctx = (extra = {}) => ({ skill: 75, bowlSkill: 75, style: {}, ballNo: 10, need: 40, ballsLeft: 20, wicketsLeft: 3, release: 'good', fx: {}, ...extra });
  const rng = makeRng(9); let steady = 0, plain = 0;
  for (let i = 0; i < 400; i++) {
    if (aiBat(d, ctx({ steady: true }), rng).grade === 'miss') steady++;
    if (aiBat(d, ctx(), rng).grade === 'miss') plain++;
  }
  assert.equal(steady, 0, 'Steady Hands: he is never beaten on timing');
  assert.ok(plain > 0);
  assert.ok(BRACE.tornadoKmh < 160 && BRACE.mayaFooled < 0.5);
});
