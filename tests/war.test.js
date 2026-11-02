import test from 'node:test';
import assert from 'node:assert/strict';
import { warClock, weekendSpan, totals, feed, leader, countdown } from '../js/war.js';

test('four weekends, Saturday to Sunday night, from 24 October', () => {
  const [s1, e1] = weekendSpan(1);
  assert.equal(new Date(s1).getDay(), 6);
  assert.equal(new Date(s1).getDate(), 24);
  assert.equal(new Date(e1).getDay(), 1);
  assert.equal(new Date(weekendSpan(4)[0]).getDate(), 14);
  assert.equal(warClock(new Date(2026, 9, 18, 12).getTime()).phase, 'before');
  assert.deepEqual(warClock(new Date(2026, 9, 24, 9).getTime()).weekend, 1);
  assert.equal(warClock(new Date(2026, 9, 25, 23, 59).getTime()).weekend, 1);
  const mid = warClock(new Date(2026, 9, 27).getTime());
  assert.equal(mid.phase, 'between'); assert.equal(mid.next, 2);
  assert.equal(warClock(new Date(2026, 10, 15, 22).getTime()).weekend, 4);
  assert.equal(warClock(new Date(2026, 10, 16, 1).getTime()).phase, 'over');
});

test('a win is a point for the country, a loss is nothing', () => {
  const docs = [
    { country: 'pakistan', r: { 1: { win: true, at: 1 }, 2: { win: false, at: 2 } } },
    { country: 'india', r: { 1: { win: true, at: 3 } } },
    { country: 'india', r: { 1: { win: false, at: 4 }, 3: { win: true, at: 5 } } },
    { country: 'nowhere', r: { 1: { win: true } } },
  ];
  const t = totals(docs);
  assert.equal(t.india, 2); assert.equal(t.pakistan, 1);
  assert.deepEqual(t.players, { india: 2, pakistan: 1 });
  assert.deepEqual(t.weeks[0], { india: 1, pakistan: 1 });
  assert.equal(leader(t), 'india');
  assert.equal(leader(totals([])), null);
});

test('the feed lists finished results, newest first, not matches still being played', () => {
  const f = feed([['a', { country: 'india', r: { 1: { win: true, at: 10, line: '42*' }, 2: { win: false, at: 30, pending: true } } }],
    ['b', { country: 'pakistan', r: { 1: { win: false, at: 20 } } }]]);
  assert.deepEqual(f.map(x => x.at), [20, 10]);
  assert.equal(countdown(3 * 864e5 + 12 * 36e5), '3d 12h');
});
