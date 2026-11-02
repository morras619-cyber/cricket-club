import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../js/career.js';
import { batTypeOf } from '../js/heroes.js';
import { bowlType } from '../js/squads.js';

const spec = { name: 'Harbour Kings', short: 'HAR', suit: '#1f5fd6', trim: '#ffd23f', emblem: 'bolt', ground: 'King Park', crest: 'x' };
const fresh = () => { const c = C.newCareer(11); assert.ok(C.createClub(c, spec, { trials: true })); return c; };

test('a new club starts with nobody but the founder and the keeper; six batters and six bowlers wait in the nets', () => {
  const c = fresh();
  assert.equal(c.phase, 'trials');
  const mine = C.clubPlayers(c, c.club);
  assert.deepEqual(mine.map(p => p.id).sort(), ['kabir-anand', c.trial.keeper].sort());
  assert.equal(c.trial.bats.length, 6); assert.equal(c.trial.bowls.length, 6);
  // the types: six different batters and the six bowling types
  assert.equal(new Set(c.trial.bats.map(id => batTypeOf(c.players[id]))).size, 6);
  assert.deepEqual(c.trial.bowls.map(id => c.players[id].bowl).sort(), ['express', 'leftpace', 'legspin', 'offspin', 'seam', 'swing']);
  // none of them is any good yet
  for (const id of c.trial.bats) assert.ok(c.players[id].bat <= 60);
  for (const id of c.trial.bowls) assert.ok(c.players[id].bowlSkill <= 62);
  // the regulars of the club it replaces are free agents
  assert.ok(Object.values(c.players).filter(p => p.team === null && !p.trial && !p.heroId).length >= 10);
});

test('signing 4 batters and 5 bowlers makes an eleven, with no money for the first auction, and the rest go to the market', () => {
  const c = fresh(), T = c.trial;
  assert.equal(C.signTrialists(c, T.bats.slice(0, 3), T.bowls.slice(0, 5)), false, 'three batters is not four');
  assert.equal(C.signTrialists(c, T.bats.slice(0, 4), T.bowls.slice(0, 4)), false, 'four bowlers is not five');
  assert.equal(C.signTrialists(c, [...T.bats.slice(0, 3), T.bowls[0]], T.bowls.slice(1, 6)), false, 'a bowler is not a batter pick');
  const bats = T.bats.slice(0, 4), bowls = T.bowls.slice(1, 6), left = [T.bats[4], T.bats[5], T.bowls[0]];
  assert.equal(C.signTrialists(c, bats, bowls), true);
  const squad = C.clubPlayers(c, c.club);
  assert.equal(squad.length, 11);
  assert.equal(c.money, 0);
  assert.equal(c.phase, 'auction');
  assert.ok(c.auction.lots.length > 0);
  for (const id of left) { assert.equal(c.players[id].team, null); assert.ok(!c.players[id].trial); assert.ok(c.auction.lots.includes(id), 'the ones not picked are sold at the auction'); }
  assert.equal(c.trial, undefined);
});

test('the founder cannot be released, and the old way of making a club is unchanged', () => {
  const c = fresh();
  assert.equal(C.releasePlayer(c, 'kabir-anand'), false);
  assert.ok(C.clubPlayers(c, c.club).some(p => p.id === 'kabir-anand'));
  const d = C.newCareer(12); assert.ok(C.createClub(d, spec));
  assert.equal(d.phase, 'auction'); assert.ok(C.clubPlayers(d, d.club).length >= 10);
});
