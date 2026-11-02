import test from 'node:test';
import assert from 'node:assert/strict';
import { aiIntent, aiBat } from '../js/ai.js';
import { makeDelivery } from '../js/physics.js';
import { makeRng } from '../js/rng.js';

const ctx = o => ({ need: 40, ballsLeft: 24, wicketsLeft: 3, ballNo: 8, ...o });

test('the AI batter has a plan: build early, attack when behind or at the death, defend the last wicket', () => {
  assert.equal(aiIntent(ctx({ need: 20 })), 'build');                              // comfortable
  assert.equal(aiIntent(ctx({ need: 60, ballsLeft: 24 })), 'attack');              // behind the rate
  assert.equal(aiIntent(ctx({ ballsLeft: 5, need: 10, ballNo: 25 })), 'attack');   // the last over, runs to get
  assert.equal(aiIntent(ctx({ wicketsLeft: 1, need: 30 })), 'defend');             // a wicket left and no need to gamble it
  assert.equal(aiIntent(ctx({ wicketsLeft: 1, need: 60 })), 'attack');             // ...unless it must
  assert.equal(aiIntent(ctx({ freeHit: true })), 'attack');
});

test('roles shape the plan: an anchor guards two wickets, a power hitter attacks, a finisher waits for the death', () => {
  assert.equal(aiIntent(ctx({ wicketsLeft: 2, need: 30, batType: 'anchor' })), 'defend');
  assert.equal(aiIntent(ctx({ wicketsLeft: 2, need: 30 })), 'build');
  assert.equal(aiIntent(ctx({ need: 30, ballsLeft: 24, batType: 'power' })), 'attack');
  assert.equal(aiIntent(ctx({ need: 36, ballNo: 10, batType: 'finisher' })), 'build');
  assert.equal(aiIntent(ctx({ need: 36, ballNo: 24, ballsLeft: 12, batType: 'finisher' })), 'attack');
});

test('a defending AI batter leaves the wide ones and blocks the ones that threaten him', () => {
  const rng = makeRng(4), base = { skill: 75, bowlSkill: 75, need: 30, ballsLeft: 24, wicketsLeft: 1, ballNo: 10, release: 'good', fx: {}, stance: 'normal' };
  let wideLeft = 0, blocks = 0, n = 300;
  for (let i = 0; i < n; i++) {
    const wide = makeDelivery({ length: 'good', x: 0.55, kmh: 135 }), straight = makeDelivery({ length: 'good', x: 0, kmh: 135 });
    if (aiBat(wide, base, rng).res.outcome === 'leave') wideLeft++;
    if (aiBat(straight, base, rng).grade === 'defend') blocks++;
  }
  assert.ok(wideLeft > n * 0.9, `left ${wideLeft}`);
  assert.ok(blocks > n * 0.6, `blocked ${blocks}`);
  // the same batter with runs to get does not shut up shop
  const chase = { ...base, need: 70 };
  let defends = 0;
  for (let i = 0; i < n; i++) if (aiBat(makeDelivery({ length: 'good', x: 0, kmh: 135 }), chase, rng).grade === 'defend') defends++;
  assert.equal(defends, 0);
});
