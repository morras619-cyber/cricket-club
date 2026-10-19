import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../js/career.js';
import { TEAMS, teamById } from '../js/teams.js';
import { nextFixture } from '../js/tournament.js';
import { ovr } from '../js/squads.js';
import { makeRng } from '../js/rng.js';

const fakeInn = (side, i) => ({ side, runs: i.runs, wkts: i.wkts, balls: i.balls, log: [], battingCard: () => [], bowlingCard: () => [] });
function playSeason(c, k = 0) {
  let f, n = 0;
  while ((f = nextFixture(c.league)) && n++ < 12) {
    const m = C.simCareerMatch(c, c.club, f.opp, makeRng(n * 31 + k));
    C.afterLeagueMatch(c, { innings: [fakeInn('player', m.ia), fakeInn('ai', m.ib)], result: { outcome: m.winner === c.club ? 'win' : 'loss' }, oppTeam: { id: f.opp } });
  }
}

test('a new career: everyone signed up, heroes and youngsters in the auction, giants locked', () => {
  const c = C.newCareer(7);
  for (const t of TEAMS) assert.equal(C.clubPlayers(c, t.id).length, 10);
  const free = Object.values(c.players).filter(p => !p.team);
  assert.equal(free.filter(p => p.heroId).length, 8);
  assert.ok(free.some(p => p.youth && p.age <= 20));
  assert.equal(C.chooseClub(c, 'thunder'), false); // tier 4: season 4
  assert.equal(C.chooseClub(c, 'royals'), true);
  assert.equal(c.phase, 'auction');
  assert.ok(C.clubRating(c, 'thunder') > C.clubRating(c, 'royals'));
});

test('the auction: you can be outbid, you can win, and every club ends with a full squad', () => {
  const c = C.newCareer(8);
  C.chooseClub(c, 'titans');
  let won = 0, outbid = 0;
  while (C.currentLot(c)) {
    let r = C.bid(c);
    while (r === 'outbid') { outbid++; r = C.bid(c); } // keep bidding until you win it or run out
    if (r === 'won') won++;
    else C.pass(c);
  }
  assert.ok(outbid > 0, 'the AI clubs should outbid you for the heroes');
  assert.ok(won > 0, 'you should be able to afford a youngster');
  assert.ok(c.money >= 0);
  C.finishAuction(c);
  for (const t of TEAMS) assert.ok(C.clubPlayers(c, t.id).length >= C.MIN_SQUAD && C.clubPlayers(c, t.id).length <= C.MAX_SQUAD, t.id);
  assert.equal(c.phase, 'season');
});

test('a season pays prize money by position and goes into the records', () => {
  const c = C.newCareer(9);
  C.chooseClub(c, 'eagles'); C.finishAuction(c);
  const before = c.money;
  playSeason(c);
  assert.equal(c.phase, 'done');
  const h = c.history[0];
  assert.ok(h.pos >= 1 && h.pos <= 8);
  assert.ok(c.money >= before + C.PRIZE[h.pos - 1] + C.SPONSOR - 0.001);
  assert.equal(Object.values(c.titles).reduce((a, b) => a + b, 0), 1);
  assert.ok(C.leaders(c, 'all', 'runs', 1)[0].stats.all.runs > 50);
  assert.ok(C.leaders(c, 'all', 'wkts', 1)[0].stats.all.wkts > 3);
  assert.ok(c.records.hs.length && c.records.bb.length);
});

test('the off-season: a year older, contracts end, youngsters arrive, giants unlock', () => {
  const c = C.newCareer(10);
  C.chooseClub(c, 'eagles'); C.finishAuction(c); playSeason(c);
  const p = Object.values(c.players).find(x => !x.retired && x.age < 30);
  const age = p.age, count = Object.keys(c.players).length;
  C.nextSeason(c);
  assert.equal(c.season, 2); assert.equal(c.phase, 'pick');
  assert.equal(c.players[p.id].age, age + 1);
  assert.equal(Object.keys(c.players).length, count + 7);
  assert.ok(C.isUnlocked(teamById('vipers'), 2) && !C.isUnlocked(teamById('cyclones'), 2));
  const runs = c.players[C.leaders(c, 'all', 'runs', 1)[0].id].stats.all.runs;
  C.chooseClub(c, 'vipers'); C.finishAuction(c); playSeason(c, 5);
  assert.ok(C.leaders(c, 'all', 'runs', 1)[0].stats.all.runs >= runs, 'all-time stats keep growing');
});

test('players grow to their potential, stop at 33, and the best become stars', () => {
  const c = C.newCareer(11);
  const kid = Object.values(c.players).find(p => p.youth);
  kid.pot = 90; kid.age = 19;
  for (let i = 0; i < 60; i++) C.grow(c, kid, 1);
  assert.ok(ovr(kid) <= 90 + 6 && Object.entries(kid).filter(([k]) => k === 'bat' || k === 'bowlSkill').every(([, v]) => v <= 90));
  if (ovr(kid) >= C.STAR_OVR) assert.ok(kid.ability && C.ABILITIES[kid.ability]);
  const vet = Object.values(c.players).find(p => !p.heroId && p.team);
  vet.age = 33; vet.pot = 99;
  const o = ovr(vet);
  C.grow(c, vet, 5);
  assert.equal(ovr(vet), o, 'no growth from 33');
  assert.ok(C.value({ ...kid, age: 19 }) > C.value({ ...kid, age: 34 }));
});

test('painted players are as old as they look, in new and saved careers', async () => {
  const { newCareer, migrateCareer } = await import('../js/career.js');
  const { PORTRAIT_AGE } = await import('../js/portraits-list.js');
  const c = newCareer(42);
  const find = n => Object.values(c.players).find(p => p.name === n);
  assert.equal(find('Thabo Mthembu').age, PORTRAIT_AGE['thabo-mthembu']);
  assert.equal(find('Thunder Raja').age, PORTRAIT_AGE['thunder-raja']);
  // an older save: wrong ages get fixed once, older by the seasons played
  const p = find('Rakibul Karim'); p.age = 31; delete c.lookAges; c.season = 3;
  migrateCareer(c);
  assert.equal(p.age, PORTRAIT_AGE['rakibul-karim'] + 2);
  p.age += 1; migrateCareer(c); // not reset again after that
  assert.equal(p.age, PORTRAIT_AGE['rakibul-karim'] + 3);
});

test('travelling scouts: finds during the season, signed at a set price before the next auction', () => {
  const c = C.newCareer(11);
  C.chooseClub(c, 'royals'); C.finishAuction(c);
  const money0 = c.money;
  assert.equal(C.sendScout(c, 'africa'), true);
  assert.equal(C.sendScout(c, 'africa'), false); // already out there
  assert.equal(C.sendScout(c, 'samerica'), true);
  assert.equal(Math.round((money0 - c.money) * 100) / 100, 0.4);
  playSeason(c, 3);
  assert.equal(c.phase, 'done');
  const found = Object.values(c.players).filter(p => p.scouted);
  assert.ok(found.length >= 4 && found.length <= 6, `found ${found.length}`);
  for (const p of found.filter(p => p.scouted.region === 'africa')) assert.ok(p.age <= 20 && ['ZA', 'ZW', 'KE', 'NA', 'UG'].includes(p.nation));
  C.nextSeason(c);
  C.chooseClub(c, 'royals');
  assert.equal(c.phase, 'scouts');
  const finds = C.scoutFinds(c);
  assert.equal(finds.length, found.length);
  c.money = 50;
  const pick = finds[0], price = pick.scouted.price;
  assert.equal(C.signFind(c, pick.id), true);
  assert.equal(pick.team, 'royals');
  assert.equal(c.money, Math.round((50 - price) * 100) / 100);
  C.finishScouts(c);
  assert.equal(c.phase, 'auction');
  // the rest go under the hammer
  for (const p of finds.slice(1)) assert.ok(c.auction.lots.includes(p.id));
});
