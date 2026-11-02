import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../js/career.js';
import { TEAMS, CLUBS, teamById, logoSrc, setMyClub } from '../js/teams.js';
import { nextFixture } from '../js/tournament.js';
import { ovr, teamRating } from '../js/squads.js';
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

test('the auction report uses the game\'s own numbers: opening price, squad rating, the AI reserve', () => {
  const c = C.newCareer(8);
  C.chooseClub(c, 'kites');
  const lot = C.currentLot(c), p = c.players[lot.pid];
  assert.equal(lot.price, C.openingPrice(p), 'a fresh lot opens at the opening price');
  const now = C.squadNeeds(c), mine = C.clubPlayers(c, c.club);
  assert.equal(now.size, mine.length);
  assert.equal(now.rating, C.clubRating(c, c.club), 'the squad rating is the existing one');
  const after = C.squadNeeds(c, p);
  assert.equal(after.size, now.size + 1);
  assert.equal(after.rating, teamRating([...C.clubPool(c, c.club), C.enginePlayer(p)]));
  assert.equal(now.needed, Math.max(0, C.MIN_SQUAD - now.size));
  assert.equal(now.places, C.MAX_SQUAD - now.size);
  assert.equal(now.pace + now.spin, mine.filter(x => x.bowl).length);
  // reading the report changes nothing
  const snap = JSON.stringify(c);
  C.assessLot(c, lot); C.squadNeeds(c, p);
  assert.equal(JSON.stringify(c), snap);
});

test('the auction report: the four verdicts follow the next bid and your money', () => {
  const c = C.newCareer(8);
  C.chooseClub(c, 'kites');
  const lot = C.currentLot(c), p = c.players[lot.pid], worth = C.value(p);
  // price against his worth: 50% (the opening price) is a bargain; double is expensive
  lot.price = Math.round(worth * 50) / 100; lot.leader = null; c.money = 20;
  let a = C.assessLot(c, lot);
  assert.equal(a.bid, C.nextBid(lot));
  assert.equal(a.price.label, 'Bargain');
  assert.equal(a.left, Math.round((20 - a.bid) * 100) / 100, 'cash after is money minus the next bid');
  lot.price = Math.round(worth * 1.5 * 100) / 100;
  assert.equal(C.assessLot(c, lot).price.label, 'Expensive');
  // can't afford it: cash goes negative, the risk says so, and you are not charged by looking
  lot.price = 5; c.money = 1;
  a = C.assessLot(c, lot);
  assert.ok(a.left < 0 && a.cash.tone === 'bad' && a.cash.label.startsWith('-$'));
  assert.equal(a.risk.label, 'Too dear');
  assert.equal(c.money, 1);
  // a short squad that would spend nearly everything keeps too little for the places still to fill
  const mine = C.clubPlayers(c, c.club);
  for (const x of mine.slice(0, 3)) x.team = 'jaguars'; // 7 left: three more places needed after this one
  lot.price = 2; c.money = 2.5;
  a = C.assessLot(c, lot);
  assert.ok(a.left >= 0 && a.left < 2 * C.RESERVE_PER_PLACE, 'less than the reserve for the places still to fill');
  assert.ok(['High', 'Medium'].includes(a.risk.label));
  c.money = 20; lot.price = 0.5;
  assert.equal(C.assessLot(c, lot).risk.label, 'Low');
  // a full squad: blocked
  for (const x of Object.values(c.players).filter(x => !x.team).slice(0, 14)) { x.team = c.club; }
  assert.equal(C.assessLot(c, lot).risk.label, 'Full');
});

test('the rival contest: any club that can raise does, in a fixed order, and you win exactly when none can', () => {
  const play = () => {
    const c = C.newCareer(8);
    C.chooseClub(c, 'kites');
    const seen = [];
    let guard = 0;
    while (C.currentLot(c) && guard++ < 200) {
      const lot = C.currentLot(c), p = c.players[lot.pid];
      let r;
      do {
        if (c.money < C.nextBid(lot)) { r = null; break; }
        const price = C.nextBid(lot), raise = Math.round((price + (price < 1 ? 0.1 : price < 3 ? 0.25 : 0.5)) * 100) / 100;
        const could = Object.values(lot.maxes).some(m => m >= raise);
        r = C.bid(c);
        assert.equal(r === 'won', !could, 'you win exactly when no club can raise');
        if (r === 'outbid') {
          assert.notEqual(lot.leader, c.club);
          assert.ok(lot.maxes[lot.leader] >= lot.price, 'the raiser\'s limit allows his bid');
          assert.ok(c.budgets[lot.leader] >= lot.price - 1e-9, 'and so does his budget');
          assert.ok(!(lot.leader in (lot.out || {})), 'a club that is out does not come back');
          seen.push(`${lot.pid}:${lot.leader}:${lot.price}`);
        }
      } while (r === 'outbid');
      if (r !== 'won') C.pass(c);
    }
    return { seen, c };
  };
  const a = play(), b = play();
  assert.ok(a.seen.length > 5);
  assert.deepEqual(a.seen, b.seen, 'the same career bids the same way');
  assert.ok(new Set(a.seen.map(x => x.split(':')[1])).size > 1, 'more than one club raises across the auction');
  assert.ok(a.c.money >= 0);
});

test('the rival contest: dropouts are recorded when their turn comes, a full squad never bids, old lots still work', () => {
  const c = C.newCareer(8);
  C.chooseClub(c, 'kites');
  const lot = C.currentLot(c);
  const rivals = Object.keys(lot.maxes);
  const full = rivals[0];
  lot.maxes[full] = 0; // (a club with a full squad)
  c.money = 50;
  let guard = 0;
  while (C.bid(c) === 'outbid' && guard++ < 100) assert.notEqual(lot.leader, full);
  assert.ok(!(full in (lot.out || {})), 'a full squad is not counted as bidding');
  for (const [t, at] of Object.entries(lot.out || {})) assert.ok(lot.maxes[t] < at + 0.51, `${t} dropped out near its limit`);
  // a lot saved before the contest existed (no out, no last) still bids
  const c2 = C.newCareer(8); C.chooseClub(c2, 'kites'); c2.money = 50;
  c2.divisions.d3 = c2.divisions.d3.filter(id => id !== 'kites'); c2.divisions.asl.push('kites');   // (the top division: no star will refuse to sign)
  const l2 = C.currentLot(c2); delete l2.out; delete l2.last;
  assert.ok(['won', 'outbid'].includes(C.bid(c2)));
});

test('passing: the sale keeps who was outbid, and the price is still a step over the runner-up\'s limit', () => {
  const c = C.newCareer(8);
  C.chooseClub(c, 'kites');
  const lot = C.currentLot(c), p = c.players[lot.pid];
  const ms = Object.entries(lot.maxes).sort((x, y) => y[1] - x[1]);
  const w = C.pass(c), sale = c.auction.results.at(-1);
  assert.equal(w, ms[0][0], 'the club with the highest limit wins');
  const inc = x => (x < 1 ? 0.1 : x < 3 ? 0.25 : 0.5);
  assert.equal(sale.price, Math.max(C.openingPrice(p), Math.min(ms[0][1], Math.round((ms[1][1] + inc(ms[1][1])) * 100) / 100)));
  assert.ok(sale.out.length >= 1 && sale.out[0][0] === ms[1][0], 'the runner-up is listed first');
  for (const [t, at] of sale.out) assert.ok(t !== w && at <= sale.price);
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

test('your own ground: ten levels, the Arena only out of Division 3, ticket money at home', () => {
  const c = C.newCareer(11);
  C.createClub(c, { name: 'Harbour Heroes', short: 'HH', suit: '#123a7a', trim: '#ffffff', emblem: 'anchor', ground: 'Dock Park', crest: 'data:y' });
  assert.equal(C.stadiumLevel(c), 1, 'the look');
  assert.equal(C.stadiumLvl(c), 1, 'the level');
  assert.equal(C.ticketOf(c), 0.1);
  C.setStadiumLevel(c, 3);
  assert.equal(C.stadiumLvl(c), 3); assert.equal(C.stadiumLevel(c), 1, 'still the first look');
  assert.ok(C.ticketOf(c) > 0.1 && C.ticketOf(c) < 0.2, 'the levels between fill in');
  C.setStadiumLevel(c, 5);
  assert.equal(C.stadiumLevel(c), 2); assert.equal(teamById(c.club).stadium, 2); assert.equal(C.ticketOf(c), 0.2);
  assert.equal(C.stadiumBlocked(c, 6), null);
  assert.equal(C.stadiumBlocked(c, 10), 'The Arena is for clubs out of Division 3');
  c.divisions.d3 = c.divisions.d3.filter(x => x !== c.club); c.divisions.d2.push(c.club);
  assert.equal(C.stadiumBlocked(c, 10), null);
  C.setStadiumLevel(c, 10);
  assert.equal(C.stadiumLevel(c), 3); assert.equal(C.ticketOf(c), 0.4);
  // a career from before the ten levels has only the look, which stands for level 1, 5 or 10
  delete c.custom.stadiumLvl; c.custom.stadium = 2;
  assert.equal(C.stadiumLvl(c), 5);
  c.custom.stadium = 3; assert.equal(C.stadiumLvl(c), 10);
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

test('a saved career loses the impossible big scores (off more than 24 balls) from its records, and nothing else', () => {
  const c = C.newCareer(43);
  c.records.hs = [{ pid: 'a', runs: 71, balls: 30 }, { pid: 'b', runs: 55, balls: 20 }, { pid: 'c', runs: 40, balls: 24 }];
  C.migrateCareer(c);
  assert.deepEqual(c.records.hs.map(r => r.pid), ['b', 'c']);
  assert.equal(Object.keys(c.players).length > 100, true, 'the players are untouched');
});
