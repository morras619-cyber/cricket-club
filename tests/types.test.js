import test from 'node:test';
import assert from 'node:assert/strict';
import { HEROES, BAT_TYPES, BOWL_POWERS, POWERS, batTypeOf, bowlPowerOf, powersOf } from '../js/heroes.js';
import { roster, heroPlayer, BOWL_TYPES } from '../js/squads.js';
import { TEAMS, LEAGUE_CLUBS } from '../js/teams.js';

const everyone = () => [...TEAMS, ...LEAGUE_CLUBS].flatMap(t => roster(t.id));

test('every type points at a real power, and every bowling type has one', () => {
  for (const t of Object.values(BAT_TYPES)) assert.ok(POWERS[t.power], `${t.id} → ${t.power}`);
  for (const id of Object.keys(BOWL_TYPES)) assert.ok(POWERS[BOWL_POWERS[id]], `bowler ${id}`);
  assert.ok(POWERS.cutter && POWERS.shatter, 'both seam powers exist');
});

test('every batter has a type; only a bowler who hardly bats goes without; every bowler has a power', () => {
  for (const p of everyone()) {
    const b = batTypeOf(p), w = bowlPowerOf(p);
    if (p.role === 'bowl' && p.bat < 40) assert.equal(b, null, `${p.name} is a tail-ender`);
    else assert.ok(BAT_TYPES[b], `${p.name} (${p.label}) has a batter type`);
    if (p.bowl) assert.ok(POWERS[w], `${p.name} bowls ${p.bowl}`); else assert.equal(w, null);
    const { bat, bowl } = powersOf(p);
    assert.equal(!!bat, !!b); assert.equal(!!bowl, !!w);
  }
});

test('a type is the same every time, and the old heroes land where their game said they would', () => {
  for (const p of everyone().slice(0, 40)) assert.equal(batTypeOf(p), batTypeOf({ ...p }));
  const type = id => batTypeOf(heroPlayer(id)), bowl = id => bowlPowerOf(heroPlayer(id));
  assert.equal(type('raja'), 'power'); assert.equal(type('meher'), 'touch'); assert.equal(type('comet'), 'finisher'); assert.equal(type('rani'), 'keeper');
  assert.equal(bowl('zara'), 'tornado'); assert.equal(bowl('babar'), 'maya'); assert.equal(bowl('imran'), 'shatter');
});

test('all eight types are in use somewhere in the leagues', () => {
  const used = new Set(everyone().map(batTypeOf));
  for (const id of Object.keys(BAT_TYPES)) assert.ok(used.has(id), `nobody is a ${id}`);
  assert.equal(HEROES.length, 8);
});
