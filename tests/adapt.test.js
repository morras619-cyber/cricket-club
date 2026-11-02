import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSkill, levelOf, dialsFor, NO_DIALS, adaptScale, performance, learn, levelName } from '../js/adapt.js';

const match = (mine, theirs, st = {}) => ({ innings: [{ side: 'player', runs: mine }, { side: 'ai', runs: theirs }], stats: { swings: 20, swingGood: 11, rel: 20, relGood: 11, ...st } });

test('the AI learns from how you play: strong play raises the estimate, weak play lowers it', () => {
  let strong = freshSkill(), weak = freshSkill();
  for (let i = 0; i < 6; i++) {
    strong = learn(strong, match(90, 40, { swingGood: 18, relGood: 17 }));
    weak = learn(weak, match(30, 70, { swingGood: 5, relGood: 4 }));
  }
  assert.ok(levelOf(strong) > 0.6, `strong ${strong.est}`);
  assert.ok(levelOf(weak) < -0.6, `weak ${weak.est}`);
  assert.equal(strong.n, 6);
});

test('a typical player stays in the middle, and the first matches count most', () => {
  let s = freshSkill();
  for (let i = 0; i < 8; i++) s = learn(s, match(60, 60));
  assert.ok(Math.abs(levelOf(s)) < 0.15, `${s.est}`);
  const first = learn(freshSkill(), match(100, 20, { swingGood: 19, relGood: 19 }));
  const late = learn({ est: 50, n: 10 }, match(100, 20, { swingGood: 19, relGood: 19 }));
  assert.ok(first.est > late.est, 'an early match moves it further than a late one');
});

test('a stronger player gets a stronger AI, a weaker one a gentler AI', () => {
  const hi = dialsFor(1), lo = dialsFor(-1);
  assert.ok(hi.bat > 0 && hi.bowl > 0 && hi.field > 1 && hi.mind > 1);
  assert.ok(lo.bat < 0 && lo.bowl < 0 && lo.field < 1 && lo.mind < 1);
  assert.deepEqual(dialsFor(0), { bat: 0, bowl: 0, field: 1, mind: 1 });
});

test('fixed modes never adapt, and a career adapts gently', () => {
  for (const m of ['daily', 'challenge', 'war', 'tutorial']) assert.equal(adaptScale(m), 0, m);
  assert.equal(adaptScale('quick'), 1);
  assert.equal(adaptScale('career'), 0.5);
  assert.deepEqual(dialsFor(1, 0), NO_DIALS);
  assert.equal(dialsFor(1, 0.5).bat, dialsFor(1, 1).bat / 2);
});

test('the estimate stays on its scale, and the level names read in order', () => {
  let s = freshSkill();
  for (let i = 0; i < 40; i++) s = learn(s, match(200, 0, { swingGood: 20, relGood: 20 }));
  assert.ok(s.est <= 100 && levelOf(s) === 1);
  assert.equal(performance({ innings: [], stats: {} }), null);
  assert.deepEqual([-1, -0.4, 0, 0.4, 1].map(levelName), ['a very low', 'a low', 'a medium', 'a high', 'a very high']);
});
