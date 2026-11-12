import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../js/career.js';
import { HOME_NATIONS, homeNations, pickNationFrom } from '../js/nations.js';
import { makeRng } from '../js/rng.js';

const SA = HOME_NATIONS.asia;

test('a new career starts in South Asia: every regular, free agent, youngster and hero is from the home region', () => {
  for (const seed of [8, 77, 2024]) {
    const c = C.newCareer(seed);
    const out = Object.values(c.players).filter(p => !SA.includes(p.nation));
    assert.equal(out.length, 0, `seed ${seed}: ${out.map(p => `${p.name} ${p.nation}`).join(', ')}`);
  }
});

test('turning a foreign player into a home-region one keeps him the same player: role, ratings, age, club and way of playing; names stay unique', () => {
  const before = (() => { const c = C.newCareer(8); return c; })();
  const c = C.newCareer(8);
  const thunder = Object.values(c.players).filter(p => p.team === 'thunder');
  assert.equal(thunder.length, Object.values(before.players).filter(p => p.team === 'thunder').length);
  for (const p of thunder) assert.ok(p.name && p.short && p.nation && p.role && p.bat != null, p.id);
  const names = Object.values(c.players).map(p => p.name);
  assert.equal(new Set(names).size, names.length, 'no two players share a name');
  assert.deepEqual(Object.keys(c.players).sort(), Object.keys(before.players).sort(), 'the same players, by id');
  assert.deepEqual(C.newCareer(8).players['thunder-6']?.name, C.newCareer(8).players['thunder-6']?.name, 'the same career every time for a seed');
});

test('the nets candidates and the yearly youth intake come from the home region', () => {
  const c = C.newCareer(5);
  C.createClub(c, { name: 'Mumbai Meteors', short: 'MUM', suit: '#1f5fd6', trim: '#ffd23f', emblem: 'lion', ground: 'Meteor Park', pitch: 'flat', chant: 'default' }, { trials: true });
  const T = c.trial;
  for (const id of [...T.bats, ...T.bowls]) assert.ok(SA.includes(c.players[id].nation), `${c.players[id].name} ${c.players[id].nation}`);
  for (let s = 0; s < 6; s++) for (const p of C.youthIntake(c, makeRng(100 + s), 8)) assert.ok(SA.includes(p.nation), p.nation);
});

test('a scout still finds players from other regions: that is the way to get them', () => {
  for (const [r, R] of Object.entries(C.SCOUT_REGIONS)) assert.ok(R.nations.every(n => !SA.includes(n)), r);
});

test('pickNationFrom only picks from the list, by weight; the home region is Asia by default', () => {
  const rng = makeRng(3), seen = new Set();
  for (let i = 0; i < 400; i++) seen.add(pickNationFrom(rng, ['IN', 'PK']));
  assert.deepEqual([...seen].sort(), ['IN', 'PK']);
  assert.deepEqual(homeNations({}), SA); assert.deepEqual(homeNations({ region: 'asia' }), SA);
});

test('a career saved with the old hero names and countries takes the current ones, and the portraits are found under the new names', async () => {
  const c = C.newCareer(8);
  const imran = c.players.imran, rani = c.players.rani;
  Object.assign(imran, { name: 'Iron Wall Ian', short: 'Wall Ian', nation: 'ZA' }); Object.assign(rani, { name: 'Rubber Rocket Rory', short: 'Rocket Rory', nation: 'AU' });
  C.migrateCareer(c);
  assert.deepEqual([imran.name, imran.nation, rani.name, rani.nation], ['Iron Wall Imran', 'PK', 'Rubber Rocket Rohan', 'IN']);
  const { PORTRAIT_KEYS } = await import('../js/portraits-list.js');
  assert.ok(PORTRAIT_KEYS.includes('iron-wall-imran') && PORTRAIT_KEYS.includes('rubber-rocket-rohan'));
  assert.ok(!PORTRAIT_KEYS.includes('iron-wall-ian') && !PORTRAIT_KEYS.includes('rubber-rocket-rory'));
});
