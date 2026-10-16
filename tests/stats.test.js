import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Innings } from '../js/match.js';
import { recordStats, careerStats, fmt } from '../js/profile.js';

const team = { bat: { id: 'raja' }, bowl: { id: 'zara' }, field: { id: 'rani' } };
function match(batBalls, bowlBalls) {
  const bat = new Innings('player'), bowl = new Innings('ai', 50);
  for (const b of batBalls) bat.ball(b);
  for (const b of bowlBalls) bowl.ball(b);
  return { innings: [bat, bowl], team };
}

test('career stats: high score, ducks, best figures', () => {
  const p = {};
  const r1 = recordStats(p, match([{ runs: 4 }, { runs: 6 }, { wicket: true }, { wicket: true }, { runs: 1 }], [{ wicket: true }, { runs: 4 }, { wicket: true }]));
  assert.equal(r1.newHS, false); // the first match sets the bar
  const s = careerStats(p);
  assert.equal(s.bat.inns, 3);
  assert.equal(s.bat.runs, 11);
  assert.equal(s.bat.hs, 10);
  assert.equal(s.bat.ducks, 1);
  assert.equal(s.bat.notOuts, 1);
  assert.equal(fmt.best(s.bowl), '2/4');
  assert.equal(s.heroes.raja.bat.runs, 11);
  assert.equal(s.heroes.zara.bowl.wkts, 2);
  const r2 = recordStats(p, match([{ runs: 6 }, { runs: 6 }], [{ wicket: true }, { wicket: true }, { wicket: true }]));
  assert.equal(r2.newHS, true);
  assert.equal(r2.newBest, true);
  assert.equal(fmt.hs(s.bat), '12*');
  assert.equal(fmt.best(s.bowl), '3/0');
  assert.equal(fmt.avg(s.bat.runs, s.bat.inns - s.bat.notOuts), '11.5');
  assert.equal(fmt.econ(4, 6), '4.0');
});

test('season pass: tiers from matches, claims pay coins and gems, then a new season', async () => {
  const { loadProfile, passState, claimPass, buyCoins, matchRewards, PASS_TIERS, passReward } = await import('../js/profile.js');
  const p = loadProfile();
  const sum = outcome => ({ mode: 'quick', result: { outcome }, stats: {}, innings: [] });
  const r = matchRewards(p, sum('win'));
  assert.equal(r.gems, 1);
  assert.equal(r.pass, 1);
  matchRewards(p, sum('loss'));
  assert.equal(passState(p).tier, 1);
  assert.equal(passState(p).progress, 0.5);
  const coins = p.coins;
  const got = claimPass(p);
  assert.deepEqual([got.tiers, got.coins], [1, passReward(1).coins]);
  assert.equal(p.coins, coins + got.coins);
  assert.equal(passState(p).ready, 0);
  p.pass.xp = PASS_TIERS * 100;
  const all = claimPass(p);
  assert.equal(all.tiers, PASS_TIERS - 1);
  assert.ok(all.newSeason);
  assert.deepEqual(p.pass, { season: 2, xp: 0, claimed: 0 });
  p.gems = 4;
  assert.equal(buyCoins(p, 0), false);
  p.gems = 5; const c = p.coins;
  assert.equal(buyCoins(p, 0), true);
  assert.deepEqual([p.gems, p.coins], [0, c + 300]);
});
