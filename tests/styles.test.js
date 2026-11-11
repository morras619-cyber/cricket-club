import test from 'node:test';
import assert from 'node:assert/strict';
import { styleOf } from '../js/builds.js';
import { batFrame } from '../js/batsprite.js';
import { bowlFrame } from '../js/bowlsprite.js';

const names = Array.from({ length: 120 }, (_, i) => `Player ${String.fromCharCode(65 + i % 26)}${i} Khan${i * 7}`);

test('a player has the same style every time, a nameless one none', () => {
  assert.deepEqual(styleOf({ who: 'Aryan Malhotra' }), styleOf({ who: 'Aryan Malhotra' }));
  assert.equal(styleOf({}).bat.tempo, 1);
  assert.equal(styleOf(null).bowl.cad, 1);
});

test('players differ: several batting and bowling styles across a squad, and no two alike in the numbers', () => {
  const s = names.map(n => styleOf({ who: n }));
  assert.ok(new Set(s.map(x => x.bat.id)).size >= 6, 'batting styles');
  assert.ok(new Set(s.map(x => x.bowl.id)).size >= 5, 'bowling styles');
  assert.ok(new Set(s.map(x => x.bat.tempo.toFixed(3))).size > 60, 'tempo varies per man');
});

test('styles stay in a sane range (drawing only, never a different game)', () => {
  for (const n of names) {
    const { bat, bowl } = styleOf({ who: n });
    assert.ok(bat.tempo > 0.7 && bat.tempo < 1.4 && bat.hold > 200 && bat.hold < 700 && Math.abs(bat.lean) < 0.05 && bat.crouch >= 0.9 && bat.crouch <= 1.05, n);
    assert.ok(bowl.cad > 0.7 && bowl.cad < 1.7 && Math.abs(bowl.load) < 0.1 && bowl.follow > 0.7 && bowl.follow < 1.5 && Math.abs(bowl.lean) < 0.1, n);
  }
});

test('a slow stylist and a slugger both start in the drive pose and settle back to the stance', () => {
  const find = id => names.map(n => ({ who: n })).find(l => styleOf(l).bat.id === id);
  const slow = find('stylist'), fast = find('slugger');
  const at = (people, ms) => batFrame({ people, angle: 0, shot: { anim: 'drive', t0: 0 } }, ms).f;
  assert.ok(styleOf(slow).bat.tempo > styleOf(fast).bat.tempo);
  assert.equal(at(slow, 20), 'drive1');
  assert.equal(at(slow, 5000), 'ready');
  assert.equal(at(fast, 5000), 'ready');
});

test('a bowler without a name runs and delivers exactly as before', () => {
  const run = p => bowlFrame({ anim: 'run', p }, 0, 0, 'back');
  assert.equal(run(0.1), bowlFrame({ anim: 'run', p: 0.1 }, 0, 0, 'back', null));
  assert.equal(run(0.76), 'gather');
  assert.equal(bowlFrame({ anim: 'deliver', t0: 0 }, 0.05, 0, 'front'), 'release');
  assert.equal(bowlFrame({ anim: 'deliver', t0: 0 }, 5, 0, 'front'), 'finish');
});

test('bowlers load up and follow through at their own pace', () => {
  const find = id => names.map(n => ({ who: n })).find(l => styleOf(l).bowl.id === id);
  const slow = find('upright'), fast = find('hurried');
  const at = (look, ms) => bowlFrame({ anim: 'deliver', t0: 0 }, ms / 1000, 0, 'front', look);
  assert.equal(at(fast, 100), 'follow1');            // 90 ms x ~0.85 is over
  assert.equal(at(slow, 100), 'release');            // 90 ms x ~1.25 is not
  assert.equal(at(slow, 6000), 'finish');
});
