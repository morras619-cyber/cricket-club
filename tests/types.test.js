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

import { matchup } from '../js/ratings.js';
const bat = (label, rating, id = label + rating) => ({ id, label, role: 'bat', bat: rating, trait: '' });
const bowl = (type, skill) => ({ bowl: type, bowlSkill: skill });

test('matchups: a power batter struggles against quality swing on a green pitch, a 93 far less than a 53', () => {
  const green = { feel: { swing: 1.3, seam: 1, turn: 1 } };
  const hi = matchup(bat('Power batter', 93), bowl('swing', 90), green), lo = matchup(bat('Power batter', 53), bowl('swing', 90), green);
  assert.ok(hi.win < 1 && lo.win < hi.win, `93 → ${hi.win.toFixed(3)}, 53 → ${lo.win.toFixed(3)}`);
  assert.ok(hi.power > lo.power, 'and he hits it harder');
  const flat = matchup(bat('Power batter', 75), bowl('swing', 90), { feel: { swing: 0.7 } });
  assert.ok(flat.win > matchup(bat('Power batter', 75), bowl('swing', 90), green).win, 'the same bowler is easier on a flat pitch');
});

test('matchups: a spinner wins on a turner and loses on a true pitch; a poor bowler is exposed more', () => {
  const b = bat('Anchor', 75);
  assert.ok(matchup(b, bowl('legspin', 85), { feel: { turn: 1.4 } }).win < matchup(b, bowl('legspin', 85), { feel: { turn: 0.7 } }).win);
  assert.ok(matchup(b, bowl('offspin', 90), { feel: { turn: 1.4 } }).win < matchup(b, bowl('offspin', 55), { feel: { turn: 1.4 } }).win, 'the better spinner dominates more');
});

test('matchups: touch batters hate the short ball, finishers start slowly, openers lose wickets early, anchors score slowly', () => {
  const pace = bowl('express', 80);
  const touch = bat('Touch batter', 75);
  assert.ok(matchup(touch, pace, { length: 'bouncer' }).win < matchup(touch, pace, { length: 'good' }).win);
  const fin = bat('Finisher', 75);
  assert.ok(matchup(fin, pace, { ballNo: 3 }).win < matchup(fin, pace, { ballNo: 27 }).win);
  const op = bat('Opener', 75); op.trait = 'Clears the rope';
  assert.ok(matchup(op, pace, { ballNo: 4 }).edgeP > 0 && matchup(op, pace, { ballNo: 20 }).edgeP === 0);
  assert.ok(matchup(bat('Anchor', 75), pace, {}).power < 1);
});

test('matchups: a 93 is never as weak as a 53 of the same type', () => {
  for (const label of ['Power batter', 'Touch batter', 'Finisher', 'Opener', 'Anchor']) {
    const ctx = { ballNo: 3, length: 'bouncer', feel: { swing: 1.3, seam: 1.3, turn: 1.3 } };
    for (const b of [bowl('swing', 90), bowl('offspin', 90), bowl('express', 90)]) {
      const hi = matchup(bat(label, 93), b, ctx), lo = matchup(bat(label, 53), b, ctx);
      assert.ok(hi.win >= lo.win - 1e-9 && hi.edgeP <= lo.edgeP + 1e-9, `${label} vs ${b.bowl}`);
    }
  }
});

import { keeperEase } from '../js/ratings.js';
test('a better keeper gets more time and room, a poor one is rushed, and a 75 changes nothing', () => {
  assert.equal(keeperEase(75), 1);
  assert.ok(keeperEase(93) > 1.15 && keeperEase(53) < 0.85);
  assert.equal(keeperEase(120), 1.2); assert.equal(keeperEase(10), 0.8);
});
