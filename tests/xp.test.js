import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../js/career.js';
import * as TG from '../js/training.js';
import { ovr } from '../js/squads.js';

const kid = (o = {}) => ({ id: 'k', name: 'Kid Test', role: 'bat', bat: 60, bowlSkill: 30, age: 22, pot: 85, ...o });
const career = () => { const c = C.newCareer(7); C.chooseClub(c, c.divisions.d3[0]); return c; };

test('the next rating point costs more for a better and for an older player', () => {
  assert.ok(C.xpCost(80, 22) > C.xpCost(60, 22));
  assert.ok(C.xpCost(60, 26) > C.xpCost(60, 22));
  assert.ok(C.xpCost(60, 31) > C.xpCost(60, 26));
});

test('a full XP bar is one rating point, and the rest carries over', () => {
  const c = career(), p = kid(), cost = C.xpCost(ovr(p), p.age);
  assert.equal(C.addPlayerXp(c, p, cost - 1), 0, 'one short: no point yet');
  assert.equal(ovr(p), 60);
  assert.equal(C.addPlayerXp(c, p, cost + 10), 1, 'over the line: one point');
  assert.equal(ovr(p), 61);
  assert.ok(p.xp >= 9 && p.xp < C.xpCost(61, 22), `the rest carries over (${p.xp})`);
});

test('a full bar always pays out at once, and each point gained this season makes the next one dearer', () => {
  const c = career(), p = kid();
  const c0 = C.xpCost(60, 22, 0), c1 = C.xpCost(60, 22, 1), c2 = C.xpCost(60, 22, 2);
  assert.ok(c1 > c0 && c2 > c1, 'the surcharge grows with every point gained this season');
  assert.equal(c1, Math.round(c0 * (1 + C.PXP.SEASON_STEP)));
  assert.equal(C.addPlayerXp(c, p, c0), 1, 'a full bar is a point, straight away');
  assert.equal(p.xpSeason, 1);
  assert.equal(C.xpNeed(p), C.xpCost(ovr(p), 22, 1), 'his next point costs the surcharge now');
  const q = kid();
  const gained = C.addPlayerXp(c, q, 100000);
  assert.ok(gained >= 8, `plenty of XP still pays out, in full (${gained})`);
  assert.ok(q.xp < C.xpNeed(q), 'the bar is never left full and waiting');
  q.xpSeason = 0;
  assert.ok(C.xpNeed(q) < C.xpCost(ovr(q), 22, 3), 'a new season starts the surcharge again');
});

test('the academy\'s growth is not surcharged', () => {
  const c = career(), p = kid({ age: 17 }); p.xpSeason = 5;
  assert.equal(C.addPlayerXp(c, p, C.xpCost(60, 17, 0), { soft: false }), 1);
});

test('no XP past his potential or after 33', () => {
  const c = career(), top = kid({ bat: 85, pot: 85 }), old = kid({ age: 33 });
  assert.equal(C.addPlayerXp(c, top, 5000), 0);
  assert.equal(top.xp || 0, 0);
  assert.equal(C.addPlayerXp(c, old, 5000), 0);
  assert.equal(ovr(old), 60);
});

test('XP from a match: playing, a good innings, wickets, an economical spell and a win', () => {
  assert.equal(C.matchXp(null, null, false), C.PXP.APPEAR);
  assert.ok(C.matchXp({ runs: 55 }, null) > C.matchXp({ runs: 32 }, null));
  assert.ok(C.matchXp({ runs: 32 }, null) > C.matchXp({ runs: 16 }, null));
  assert.ok(C.matchXp({ runs: 16 }, null) > C.matchXp({ runs: 5 }, null));
  assert.equal(C.matchXp(null, { balls: 12, runs: 20, wkts: 2 }), C.PXP.APPEAR + 2 * C.PXP.WKT);
  assert.equal(C.matchXp(null, { balls: 12, runs: 8, wkts: 0 }), C.PXP.APPEAR + C.PXP.ECON);
  assert.equal(C.matchXp(null, null, true), C.PXP.APPEAR + C.PXP.WIN);
});

test('the training ground\'s points are handed over as XP, and its books stay sealed', () => {
  const c = career(), p = C.clubPlayers(c, c.club).find(x => x.age < 30 && x.pot > ovr(x) + 6);
  p.xp = 0; p.xpSeason = 0;
  c.training = TG.freshTraining(0); c.training.tp[p.id] = 50; TG.seal(c.training);
  const got = C.absorbTraining(c);
  assert.equal(got, 50);
  assert.ok(p.xp === 50 || p.xpSeason === 1, 'the points are his XP now');
  assert.equal(c.training.tp[p.id], undefined);
  assert.ok(TG.sealed(c.training), 'the training books are sealed after the hand-over');
});

test('a career saved before XP keeps its progress: form points and training points become XP', () => {
  const c = career(), [a, b] = C.clubPlayers(c, c.club); delete c.xpv;
  for (const p of [a, b]) { p.age = 22; p.pot = 90; }
  a.form = 2; a.xp = undefined;
  c.training = TG.freshTraining(0); c.training.tp[b.id] = 40; TG.seal(c.training); b.xp = undefined;
  C.migrateCareer(c);
  assert.equal(c.xpv, 1);
  assert.equal(a.form, undefined);
  assert.equal(a.xp, Math.round(C.xpCost(ovr(a), a.age) / 2), 'two form points of four: half a bar');
  assert.equal(b.xp, 40, 'the training points are his XP');
  assert.ok(TG.sealed(c.training));
  const before = JSON.stringify(c.players);
  C.migrateCareer(c);
  assert.equal(JSON.stringify(c.players), before, 'migrating twice changes nothing');
});

test('a young player grows over seasons at the pace the game is built for: about two to three a season', () => {
  const c = career(), ids = C.clubPlayers(c, c.club).slice(0, 4).map(p => p.id);
  for (const id of ids) Object.assign(c.players[id], { role: 'bat', bat: 60, bowlSkill: 30, age: 21, pot: 95, xp: 0 });
  const start = Object.fromEntries(ids.map(id => [id, ovr(c.players[id])]));
  let seasons = 0;
  for (let s = 0; s < 3; s++) { for (const id of ids) C.addPlayerXp(c, c.players[id], 8 * 7 + 20 * 7); C.nextSeason(c); seasons++; }
  const avg = ids.reduce((n, id) => n + (ovr(c.players[id]) - start[id]), 0) / ids.length / seasons;
  assert.ok(avg >= 1 && avg <= 4, `average gain a season: ${avg.toFixed(2)}`);
});
