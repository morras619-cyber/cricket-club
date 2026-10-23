import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../js/career.js';
import { TEAMS, CLUBS, teamById, logoSrc, setMyClub } from '../js/teams.js';
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

test('a new career: everyone signed up, heroes and youngsters in the auction, you start in Division 3', () => {
  const c = C.newCareer(7);
  for (const t of CLUBS) assert.equal(C.clubPlayers(c, t.id).length, 10);
  for (const d of C.DIV_ORDER) assert.equal(c.divisions[d].length, 8);
  const free = Object.values(c.players).filter(p => !p.team);
  assert.equal(free.filter(p => p.heroId).length, 8);
  assert.ok(free.some(p => p.youth && p.age <= 20));
  assert.equal(C.chooseClub(c, 'thunder'), false); // the Super League: earned by promotion
  assert.equal(C.chooseClub(c, 'monsoon'), false); // Division 2
  assert.equal(C.chooseClub(c, 'harbour'), true);
  assert.equal(c.phase, 'auction');
  assert.ok(C.clubRating(c, 'thunder') > C.clubRating(c, 'monsoon') && C.clubRating(c, 'monsoon') > C.clubRating(c, 'harbour'));
});

test('the auction: you can be outbid, you can win, and every club ends with a full squad', () => {
  const c = C.newCareer(8);
  C.chooseClub(c, 'kites');
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
  for (const t of CLUBS) assert.ok(C.clubPlayers(c, t.id).length >= C.MIN_SQUAD && C.clubPlayers(c, t.id).length <= C.MAX_SQUAD, t.id);
  assert.equal(c.phase, 'season');
});

test('a season pays prize money by position and goes into the records', () => {
  const c = C.newCareer(9);
  C.chooseClub(c, 'jaguars'); C.finishAuction(c);
  const before = c.money;
  playSeason(c);
  assert.equal(c.phase, 'done');
  const h = c.history[0];
  assert.ok(h.pos >= 1 && h.pos <= 8);
  assert.equal(h.div, 'd3');
  assert.ok(c.money >= before + C.PRIZE[h.pos - 1] * 0.35 + C.SPONSOR - 0.01);
  assert.equal(Object.values(c.titles).reduce((a, b) => a + b, 0), 1);
  assert.ok(C.leaders(c, 'all', 'runs', 1)[0].stats.all.runs > 50);
  assert.ok(C.leaders(c, 'all', 'wkts', 1)[0].stats.all.wkts > 3);
  assert.ok(c.records.hs.length && c.records.bb.length);
});

test('the off-season: a year older, contracts end, youngsters arrive, you stay with your club', () => {
  const c = C.newCareer(10);
  C.chooseClub(c, 'jaguars'); C.finishAuction(c); playSeason(c);
  const p = Object.values(c.players).find(x => !x.retired && x.age < 30);
  const age = p.age, count = Object.keys(c.players).length;
  C.nextSeason(c);
  assert.equal(c.season, 2); assert.equal(c.phase, 'auction'); assert.equal(c.club, 'jaguars');
  assert.equal(c.players[p.id].age, age + 1);
  assert.equal(Object.keys(c.players).length, count + 7);
  const runs = c.players[C.leaders(c, 'all', 'runs', 1)[0].id].stats.all.runs;
  C.finishAuction(c); playSeason(c, 5);
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
  C.chooseClub(c, 'lanterns'); C.finishAuction(c);
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
  assert.equal(c.phase, 'scouts');
  const finds = C.scoutFinds(c);
  assert.equal(finds.length, found.length);
  c.money = 50;
  const pick = finds[0], price = pick.scouted.price;
  assert.equal(C.signFind(c, pick.id), true);
  assert.equal(pick.team, 'lanterns');
  assert.equal(c.money, Math.round((50 - price) * 100) / 100);
  C.finishScouts(c);
  assert.equal(c.phase, 'auction');
  // the rest go under the hammer
  for (const p of finds.slice(1)) assert.ok(c.auction.lots.includes(p.id));
});

test('promotion and relegation: one club up and one down between each pair of divisions', () => {
  const c = C.newCareer(21);
  C.chooseClub(c, 'rockets'); C.finishAuction(c);
  const before = JSON.parse(JSON.stringify(c.divisions));
  playSeason(c, 7);
  // (if you were in the play-off it would wait for you; in Division 3 you never are)
  assert.equal(c.phase, 'done');
  const M = c.moves;
  for (const d of C.DIV_ORDER) assert.equal(c.divisions[d].length, 8, d);
  assert.ok(before.d3.includes(M.d3up) && c.divisions.d2.includes(M.d3up));
  assert.ok(before.d2.includes(M.d2down) && c.divisions.d3.includes(M.d2down));
  assert.ok(before.d2.includes(M.d2up) && c.divisions.asl.includes(M.d2up));
  assert.ok(M.playoff.includes(M.aslDown) && c.divisions.d2.includes(M.aslDown));
  assert.equal(c.history[0].promoted ? c.club === M.d3up : c.club !== M.d3up, true);
});

test('the Super League play-off: yours to play when you finish 7th or 8th', () => {
  const c = C.newCareer(23);
  C.chooseClub(c, 'rockets'); C.finishAuction(c);
  // put your club in the Super League in place of the Royals
  c.divisions.asl = c.divisions.asl.map(id => (id === 'royals' ? 'rockets' : id));
  c.divisions.d3 = c.divisions.d3.map(id => (id === 'rockets' ? 'royals' : id));
  C.startSeason(c);
  // lose every match: bottom of the table
  let f, n = 0;
  while ((f = nextFixture(c.league)) && n++ < 12) {
    const m = { ia: { runs: 40, wkts: 3, balls: 30 }, ib: { runs: 41, wkts: 0, balls: 20 } };
    C.afterLeagueMatch(c, { innings: [fakeInn('player', m.ia), fakeInn('ai', m.ib)], result: { outcome: 'loss' }, oppTeam: { id: f.opp } });
  }
  assert.equal(c.phase, 'playoff');
  assert.ok(c.playoff.opp && c.playoff.opp !== 'rockets');
  C.afterPlayoff(c, { innings: [fakeInn('player', { runs: 60, wkts: 1, balls: 30 }), fakeInn('ai', { runs: 30, wkts: 3, balls: 30 })], result: { outcome: 'win' }, oppTeam: { id: c.playoff.opp } });
  assert.equal(c.phase, 'done');
  assert.ok(c.divisions.asl.includes('rockets'), 'won the play-off: stays up');
  assert.ok(c.history.at(-1).playoff.won);
});

test('your own club takes the weakest Division 3 place with a young squad', () => {
  const { newCareer, createClub, clubPlayers } = C;
  const c = newCareer(7);
  const before = [...c.divisions.d3];
  assert.ok(createClub(c, { name: 'Mumbai Meteors', short: 'MUM', suit: '#6a22c4', trim: '#ffcf1a', emblem: 'comet', ground: 'Meteor Park', crest: 'data:x' }));
  assert.ok(before.includes(c.club));
  assert.equal(c.custom.base, c.club);
  assert.equal(teamById(c.club).name, 'Mumbai Meteors');
  assert.equal(teamById(c.club).suit, '#6a22c4');
  assert.equal(logoSrc(c.club), 'data:x');
  for (const p of clubPlayers(c, c.club)) assert.ok(p.age <= 21 && p.pot > ovr(p));
  assert.equal(createClub(c, { name: 'Again' }), false);
  setMyClub(null);
  assert.notEqual(teamById(c.club).name, 'Mumbai Meteors');
});

test('your own ground: three levels, the Arena only out of Division 3, ticket money at home', () => {
  const c = C.newCareer(11);
  C.createClub(c, { name: 'Harbour Heroes', short: 'HH', suit: '#123a7a', trim: '#ffffff', emblem: 'anchor', ground: 'Dock Park', crest: 'data:y' });
  assert.equal(C.stadiumLevel(c), 1);
  c.money = 1; assert.equal(C.upgradeBlock(c), 'money'); assert.equal(C.upgradeStadium(c), false);
  c.money = 10; assert.ok(C.upgradeStadium(c)); assert.equal(C.stadiumLevel(c), 2); assert.equal(c.money, 7.5);
  assert.equal(teamById(c.club).stadium, 2);
  assert.equal(C.upgradeBlock(c), 'division');
  c.divisions.d3 = c.divisions.d3.filter(x => x !== c.club); c.divisions.d2.push(c.club);
  assert.ok(C.upgradeStadium(c)); assert.equal(C.stadiumLevel(c), 3); assert.equal(C.upgradeBlock(c), 'top');
  setMyClub(null);
});

test('the Thunder Strikers take the Super League every year until you join it, and you play it as normal after', () => {
  const c = C.newCareer(31);
  C.chooseClub(c, 'kites'); C.finishAuction(c);
  for (let s = 1; s <= 4; s++) {
    playSeason(c, s);
    // (the season ends in Division 3, or it would wait for you: stay there)
    assert.equal(c.history.at(-1).champions.asl, 'thunder', `season ${s}`);
    assert.ok(c.divisions.asl.includes('thunder'), 'they never go down');
    if (c.divisions.d3.includes(c.club) === false) break; // (promoted: the rest of the test is the other half)
    C.nextSeason(c); C.finishAuction(c);
  }
  assert.ok((c.titles.thunder || 0) >= 1);
  // the other half: with you in the Super League, nothing is turned for them
  const d = C.newCareer(32);
  C.chooseClub(d, 'harbour');
  d.divisions.asl = d.divisions.asl.filter(x => x !== 'royals').concat('harbour');
  d.divisions.d3 = d.divisions.d3.filter(x => x !== 'harbour').concat('royals');
  C.finishAuction(d);
  assert.equal(C.divisionOf(d, 'harbour'), 'asl');
  let lost = 0;
  for (let s = 1; s <= 3 && d.phase !== 'playoff'; s++) {
    playSeason(d, s + 10);
    if (d.phase === 'playoff') break;
    const ls = d.league.results.filter(r => !r.player && (r.a === 'thunder' || r.b === 'thunder') && r.winner !== 'thunder').length;
    lost += ls;
    C.nextSeason(d); C.finishAuction(d);
  }
  assert.ok(lost > 0 || d.history.some(h => h.champion !== 'thunder'), 'in the Super League they can lose');
});

test('simulated matches have two batters at the crease: nobody faces all thirty balls, and a favoured club that wins has its own scores', () => {
  const c = C.newCareer(41);
  C.chooseClub(c, 'kites'); C.finishAuction(c);
  const rng = makeRng(77), ids = CLUBS.map(t => t.id);
  for (let i = 0; i < 300; i++) {
    const a = ids[i % ids.length], b = ids[(i * 7 + 3) % ids.length];
    if (a !== b) C.simCareerMatch(c, a, b, rng);
  }
  const hs = c.records.hs;
  assert.ok(hs.length >= 5, 'big scores were recorded');
  const most = Math.max(...hs.map(r => r.balls));
  assert.ok(most <= 26, `no one faces all thirty (the most in 300 matches: ${most})`);
  // the favoured club: it wins every one, and the scores say so (nothing is turned round, so the stats and the table agree)
  for (let i = 0; i < 60; i++) {
    const m = C.simCareerMatch(c, i % 2 ? 'thunder' : 'harbour', i % 2 ? 'harbour' : 'thunder', rng, 'thunder');
    assert.equal(m.winner, 'thunder');
    const mine = m.a === 'thunder' ? [m.ia, m.ib] : [m.ib, m.ia];
    assert.ok(mine[0].runs >= mine[1].runs, 'their score is the higher');
  }
});
