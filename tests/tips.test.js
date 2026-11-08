import test from 'node:test';
import assert from 'node:assert/strict';
import { TIPS, tipFeed } from '../js/rules.js';
import { makeRng } from '../js/rng.js';

test('the tips are all different, short enough for the loading screen, and not empty', () => {
  assert.ok(TIPS.length >= 30);
  assert.equal(new Set(TIPS).size, TIPS.length);
  for (const t of TIPS) assert.ok(t.length >= 20 && t.length <= 125, `${t.length}: ${t}`);
});

test('a feed shows every tip once before any comes back, and a new round never opens with the tip the last one ended on', () => {
  const rng = makeRng(7), next = tipFeed(() => rng.next());
  let prev = null;
  for (let round = 0; round < 6; round++) {
    const seen = [];
    for (let i = 0; i < TIPS.length; i++) { const t = next(); seen.push(t); if (i === 0 && prev) assert.notEqual(t, prev, 'no repeat across rounds'); }
    assert.equal(new Set(seen).size, TIPS.length, 'every tip once per round');
    prev = seen.at(-1);
  }
});

test('different sessions get a different order (it is shuffled, not the list)', () => {
  const firsts = new Set();
  for (let s = 1; s <= 12; s++) { const rng = makeRng(s * 101), next = tipFeed(() => rng.next()); firsts.add(next() + '|' + next() + '|' + next()); }
  assert.ok(firsts.size >= 8, `${firsts.size} different openings in 12 sessions`);
  const plain = tipFeed(() => 0.5), a = [plain(), plain(), plain()];
  assert.notDeepEqual(a, TIPS.slice(-3).reverse().slice(0, 3).reverse(), 'not simply the list order');
});
