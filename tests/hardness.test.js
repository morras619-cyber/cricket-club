import test from 'node:test';
import assert from 'node:assert/strict';
import { simulateHit, buildField } from '../js/fieldsim.js';
import { resolveContact } from '../js/shots.js';
import { makeDelivery } from '../js/physics.js';
import { makeRng } from '../js/rng.js';
import { aiSpread, matchup } from '../js/ratings.js';
import { pitchOf } from '../js/grounds.js';
import { pitchFeel } from '../js/pitches.js';

// the share of fielded balls on which the AI sets off for a second run, and the worst margin it accepted
function attempts(opts) {
  const rng = makeRng(21), field = buildField('balanced', false);
  let n = 0, worst = Infinity;
  for (let i = 0; i < 2000; i++) {
    const shot = { kind: 'drive', angle: rng.range(-1.5, 1.5), loft: false, len: 200 };
    const res = resolveContact({ grade: rng.pick(['good', 'early', 'late']), shot, d: makeDelivery({ x: 0.1, length: 'good', kmh: 135 }), rng });
    const s = simulateHit(res, field, rng, { aiBatting: true, ...opts });
    if (s.runOut) { n++; worst = Math.min(worst, s.runOut.margins.striker, s.runOut.margins.bowler); }
  }
  return { n, worst };
}

test('the AI does not set off for a run that is clearly lost, unless it needs the runs', () => {
  const calm = attempts({}), need = attempts({ gamble: true });
  assert.ok(calm.worst > -0.3 - 1e-9, `margin ${calm.worst}`);
  assert.ok(need.worst >= -0.5 - 1e-9 && need.worst < calm.worst, 'it takes closer ones when it must');
  assert.ok(need.n > calm.n);
});

test('a rating changes the AI batter\'s timing a lot, in both directions', () => {
  assert.ok(aiSpread(93) < 0.92 && aiSpread(55) > 1.2 && aiSpread(40) > 1.3);
  assert.equal(aiSpread(75), 1);
});

test('the pitch is felt by the batter: a bouncy one finds edges, a dusty one is hard to time, a flat one is not', () => {
  const b = { bat: 75 }, pace = { bowl: 'seam', bowlSkill: 80 };
  const feel = c => pitchFeel(pitchOf(c), {});
  assert.ok(matchup(b, pace, { feel: feel('eagles'), length: 'good' }).edgeP > 0.1, 'bounce finds the edge');
  assert.ok(matchup(b, pace, { feel: feel('eagles'), length: 'yorker' }).edgeP === 0, 'but not off a yorker');
  const win = c => matchup(b, { bowl: 'offspin', bowlSkill: 80 }, { feel: feel(c), length: 'good' }).win;
  assert.ok(win('vipers') < win('thunder') - 0.2, 'a spinner on a turner against a spinner on a road');
  assert.ok(matchup(b, { bowl: 'seam', bowlSkill: 80 }, { feel: feel('titans'), length: 'good' }).win < matchup(b, { bowl: 'seam', bowlSkill: 80 }, { feel: feel('thunder'), length: 'good' }).win - 0.15, 'a green seamer bites and a flat road does not');
});
