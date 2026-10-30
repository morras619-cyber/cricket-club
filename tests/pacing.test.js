import test from 'node:test';
import assert from 'node:assert/strict';
const P = await import('../js/pacing.js');
const { PACE, HOUR } = P;

test('you start with three matches, and spending one starts the clock', () => {
  const p = P.freshPace(0);
  assert.equal(p.tokens, 3);
  assert.ok(P.spend(p, 0));
  assert.equal(p.tokens, 2);
  assert.equal(P.nextIn(p, 0), PACE.EVERY);
});
test('a match every two hours, and the bank holds three', () => {
  const p = P.freshPace(0);
  for (let i = 0; i < 3; i++) assert.ok(P.spend(p, 0));
  assert.equal(P.spend(p, 0), false, 'none left');
  P.refill(p, 2 * HOUR);
  assert.equal(p.tokens, 1);
  P.refill(p, 5 * HOUR);
  assert.equal(p.tokens, 2, 'the half hour is kept');
  P.refill(p, 5 * HOUR + 1 * HOUR);
  assert.equal(p.tokens, 3);
  P.refill(p, 5 * HOUR + 100 * HOUR);
  assert.equal(p.tokens, 3, 'three at most');
});
test('a full meter does not save up: spending one from full starts a fresh two hours', () => {
  const p = P.freshPace(0);
  P.refill(p, 50 * HOUR);
  assert.ok(P.spend(p, 50 * HOUR));
  assert.equal(P.nextIn(p, 50 * HOUR), PACE.EVERY);
});
test('the clock going back changes nothing, and a number edited in the save is noticed', () => {
  const p = P.freshPace(10 * HOUR);
  P.spend(p, 10 * HOUR);
  const before = JSON.stringify(p);
  P.refill(p, 5 * HOUR);
  assert.equal(JSON.stringify(p), before);
  p.tokens = 3;
  P.refill(p, 10 * HOUR + 1);
  assert.equal(p.tokens, 0, 'edited: it starts empty');
});
test('without a confirmed time at most one token comes back a visit', () => {
  const p = P.freshPace(0);
  for (let i = 0; i < 3; i++) P.spend(p, 0);
  P.refill(p, 20 * HOUR, false);
  assert.equal(p.tokens, 1);
});
test('ten seasons of fourteen matches cannot be played in a day or a week', () => {
  // the fastest play: the three banked at once, then one every two hours
  const hoursFor = n => Math.max(0, n - PACE.BANK) * (PACE.EVERY / HOUR);
  assert.ok(hoursFor(14) >= 22, 'a season takes about a day of constant play at the very least');
  assert.ok(hoursFor(140) >= 270, 'ten seasons take over eleven days of constant play');
});
