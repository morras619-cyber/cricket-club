import test from 'node:test';
import assert from 'node:assert/strict';
import { Innings } from '../js/match.js';
import { matchup } from '../js/ratings.js';
import { tiredness, batDrain, bowlDrain, paceTired, FULL } from '../js/stamina.js';

const power = { id: 'p', name: 'Power Man', short: 'Man', bat: 90, label: 'Power batter', bowl: null };
const anchor = { id: 'a', name: 'Anchor Man', short: 'Man', bat: 90, label: 'Anchor batter', bowl: null };
const quick = { id: 'q', name: 'Quick', short: 'Quick', bat: 50, bowl: 'express', bowlSkill: 80 };
const spinner = { id: 's', name: 'Spin', short: 'Spin', bat: 50, bowl: 'offspin', bowlSkill: 80 };

test('everyone starts fresh: not tired, no change to the matchup', () => {
  assert.equal(tiredness(FULL), 0);
  assert.equal(tiredness(65), 0);
  assert.equal(tiredness(0), 1);
  const base = matchup(power, quick, { ballNo: 5, length: 'good', feel: {} });
  const fresh = matchup(power, quick, { ballNo: 5, length: 'good', feel: {}, batEnergy: FULL, bowlEnergy: FULL });
  assert.deepEqual(fresh, base);
});

test('a power batter tires faster than an anchor, and a quick faster than a spinner', () => {
  assert.ok(batDrain(power, { runs: 6 }) > batDrain(anchor, { runs: 6 }));
  assert.ok(batDrain(power, { runs: 6 }) > batDrain(power, { runs: 4 }));
  assert.ok(bowlDrain(quick, {}) > bowlDrain(spinner, {}));
  assert.ok(bowlDrain(quick, { runs: 6 }) > bowlDrain(quick, { runs: 0 }));
});

test('singles and dots rest a batter; a six costs him', () => {
  assert.ok(batDrain(power, { runs: 1 }) < 0);
  assert.ok(batDrain(power, { runs: 0 }) < 0);
  assert.ok(batDrain(power, { runs: 0, missed: true }) > 0);
  assert.ok(batDrain(power, { runs: 6 }) > 0);
});

test('the innings keeps each player\'s energy: sixes drain the batter, every ball drains the bowler', () => {
  const inn = new Innings('ai');
  inn.setBatter(power); inn.setBowler(quick);
  inn.ball({ runs: 6 }); inn.ball({ runs: 6 }); inn.ball({ runs: 6 });
  assert.ok(inn.energyOf('p') < 60);
  assert.ok(inn.energyOf('q') < 90);
  const tired = inn.energyOf('p');
  inn.ball({ runs: 1 });
  assert.ok(inn.energyOf('p') > tired, 'a single is a rest');
  assert.equal(inn.energyOf('nobody'), FULL);
});

test('a wide drains only the bowler; a bowler resting while others bowl gets a little back', () => {
  const inn = new Innings('ai');
  inn.setBatter(power); inn.setBowler(quick);
  inn.extra(1);
  assert.equal(inn.energyOf('p'), FULL);
  assert.ok(inn.energyOf('q') < FULL);
  const before = inn.energyOf('q');
  inn.setBowler(spinner);
  inn.ball({ runs: 0 });
  assert.ok(inn.energyOf('q') > before, 'the quick rests while the spinner bowls');
});

test('a new innings starts everyone fresh', () => {
  const a = new Innings('ai'); a.setBatter(power); a.setBowler(quick);
  for (let i = 0; i < 5; i++) a.ball({ runs: 6 });
  const b = new Innings('ai'); b.setBatter(power); b.setBowler(quick);
  assert.equal(b.energyOf('p'), FULL);
});

test('a tired batter hits shorter, times worse and edges more; a tired bowler is easier to hit and slower', () => {
  const ctx = { ballNo: 5, length: 'good', feel: {} };
  const fresh = matchup(power, quick, ctx);
  const spentBat = matchup(power, quick, { ...ctx, batEnergy: 0 });
  assert.ok(spentBat.power < fresh.power && spentBat.win < fresh.win && spentBat.edgeP > fresh.edgeP);
  assert.ok(spentBat.power > fresh.power * 0.6, 'never useless');
  const spentBowl = matchup(power, quick, { ...ctx, bowlEnergy: 0 });
  assert.ok(spentBowl.power > fresh.power && spentBowl.win > fresh.win);
  assert.ok(paceTired(0) < 1 && paceTired(0) > 0.9 && paceTired(FULL) === 1);
});
