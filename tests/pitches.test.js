import test from 'node:test';
import assert from 'node:assert/strict';
import { pitchFeel, PITCH_BASE } from '../js/pitches.js';
import { GROUNDS, pitchOf } from '../js/grounds.js';
import { makeDelivery } from '../js/physics.js';
import { resolveContact } from '../js/shots.js';
import { makePath } from '../js/fieldsim.js';
import { makeRng } from '../js/rng.js';

const feelAt = (club, p) => pitchFeel(pitchOf(club), p);

test('every painted ground has its own signature, and a neutral pitch changes nothing', () => {
  assert.deepEqual(pitchFeel({}, {}), PITCH_BASE);
  const f = Object.fromEntries(['thunder', 'cyclones', 'vipers', 'eagles', 'phoenix', 'titans', 'storm', 'royals'].map(c => [c, feelAt(c, {})]));
  assert.ok(f.thunder.carry > 1.05 && f.thunder.uneven === 0, 'a flat road: shots carry, a true bounce');
  assert.ok(f.cyclones.swing > 1.3, 'the swinger hoops');
  assert.ok(f.vipers.uneven > 0.1 && f.vipers.bounce < 0.9 && f.vipers.turn > 1.3, 'the turner keeps low and uneven');
  assert.ok(f.eagles.bounce > 1.2 && f.eagles.kmh > 1.05, 'the ball rears up and arrives fast');
  assert.ok(f.titans.seam > 1.5, 'the green seamer nips about');
  assert.ok(f.storm.skid < 0.9 && f.storm.carry < 1 && f.storm.roll < 1, 'the slow pitch holds the ball up and shots die');
  assert.ok(f.royals.roll > 1.15 && f.royals.field < 1, 'a glass-fast outfield');
});

test('a pitch changes as the match goes on: spin grips, the seam flattens, the ball ages, the dew settles', () => {
  assert.ok(feelAt('vipers', { wear: 1 }).turn > feelAt('vipers', { wear: 0 }).turn + 0.5, 'the turner turns more');
  assert.ok(feelAt('vipers', { wear: 1 }).bounce < feelAt('vipers', { wear: 0 }).bounce, 'and keeps lower');
  assert.ok(feelAt('titans', { wear: 1 }).seam < feelAt('titans', { wear: 0 }).seam - 0.7, 'the seam flattens');
  assert.ok(feelAt('cyclones', { wear: 1 }).swing < feelAt('cyclones', { wear: 0 }).swing - 0.5, 'the ball stops swinging');
  const first = feelAt('phoenix', { innings: 1, balls: 30 }), late = feelAt('phoenix', { innings: 2, balls: 30 }), early = feelAt('phoenix', { innings: 2, balls: 0 });
  assert.deepEqual(first, feelAt('phoenix', { innings: 1, balls: 0 }), 'no dew in the first innings');
  assert.ok(early.bat === 1 && late.bat > 1.09 && late.skid > 1.09 && late.swing < 0.65, 'the dew builds over the second innings');
});

test('the pitch changes how a delivery arrives and how far a shot goes', () => {
  const spec = { x: 0, length: 'good', kmh: 130, swing: 0, move: 0 };
  const normal = makeDelivery(spec), slow = makeDelivery({ ...spec, skid: 0.84 }), quick = makeDelivery({ ...spec, skid: 1.1 });
  assert.ok(slow.tContact > normal.tContact + 0.03 && quick.tContact < normal.tContact - 0.015, 'a slow pitch holds the ball up, a quick one skids it on');
  const d = makeDelivery({ ...spec, h: 0.8 });
  const hit = pitch => resolveContact({ grade: 'perfect', errMs: 0, shot: { kind: 'drive', angle: 0.2, loft: false, len: 150 }, d, fx: { pitch }, rng: makeRng(5), strength: 1 });
  const flat = hit({ carry: 1.07, roll: 1 }), dead = hit({ carry: 0.9, roll: 0.85 }), fast = hit({ carry: 1, roll: 1.2 });
  assert.ok(flat.v > dead.v * 1.15, 'shots carry on a flat deck and die on a slow one');
  const reach = r => makePath(r).along(8);
  assert.ok(reach(fast) > reach(hit({ carry: 1, roll: 1 })) * 1.1, 'a fast outfield runs the ball on');
});

test('every ground and pitch still has the neutral defaults it needs', () => {
  for (const g of Object.values(GROUNDS)) for (const k of Object.keys(PITCH_BASE)) assert.equal(typeof pitchOf(Object.keys(GROUNDS).find(c => GROUNDS[c] === g))[k], 'number', k);
});
