// Career mode: Super League seasons. You pick a club (the giants unlock in later seasons),
// bid for players in a pre-season auction against the AI clubs, play the league, and earn
// prize money by where you finish. Players have ages, ratings and a potential they can grow
// into (until 33), young players arrive every season, the best become stars with an ability,
// and every run and wicket goes into records that never reset. Pure data and functions:
// the state lives in the profile (profile.career).
import { PORTRAIT_AGE } from './portraits-list.js';
import { CFG } from './config.js';
import { makeRng } from './rng.js';
import { TEAMS, CLUBS, LEAGUE_CLUBS, teamById, divisionName, setMyClub } from './teams.js';
import { HEROES, heroById } from './heroes.js';
import { roster, heroPlayer, defaultLineup, overPlan, bowlType, ovr, teamRating, WEAK, BOWL_TYPES } from './squads.js';
import { newLeague, simLeague, advance, playerResult, table, finish } from './tournament.js';
import { NATIONS, pickNation } from './nations.js';
import { randomLook } from './looks.js';

export const PEAK_AGE = 33;           // no growth from this age
export const MIN_SQUAD = 10, MAX_SQUAD = 14;
export const START_MONEY = 3;          // $M in your first season
export const SPONSOR = 1;              // $M every season, whatever happens
export const WIN_BONUS = 0.4;          // $M per league win
export const PRIZE = [10, 7, 5, 4.5, 3.5, 3, 2.5, 2]; // $M by final position
export const STAR_OVR = 86;            // a regular who gets here becomes a star
const AI_BUDGET = { 1: 6, 2: 8, 3: 10, 4: 13 };
// the three divisions, top to bottom: prize money and income shrink the lower you go
export const DIV_ORDER = ['asl', 'd2', 'd3'];
const DIV_MONEY = { asl: 1, d2: 0.55, d3: 0.35 };
const START_BUDGET = { d2: 4.5, d3: 3 };
const AI_INCOME = 3;
const LOTS = 16;                       // lots you bid on yourself; the rest are settled quickly

export const ABILITIES = {
  eagleEye: { name: 'Eagle Eye', role: 'bat', desc: 'Wider timing windows whenever he bats' },
  finisher: { name: 'Finisher', role: 'bat', desc: 'Far wider timing in the last over' },
  swingMaster: { name: 'Swing Master', role: 'bowl', desc: '30% more swing and seam' },
  deathKing: { name: 'Death King', role: 'bowl', desc: 'Never sprays it in the last over' },
  mystery: { name: 'Mystery Ball', role: 'bowl', desc: 'Batters find him harder to time' },
};

const round2 = x => Math.round(x * 20) / 20; // to $0.05M
export const money = x => `$${(Math.round(x * 100) / 100).toFixed(x >= 10 ? 1 : 2).replace(/\.?0+$/, '')}M`;
function hashStr(s) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
const blankStats = () => ({ m: 0, inns: 0, runs: 0, balls: 0, hs: 0, fours: 0, sixes: 0, outs: 0, wkts: 0, bballs: 0, bruns: 0, bb: null });

// ---------- players ----------
// Every career starts in Division 3: the clubs you can pick are the ones there now.
export const divisionOf = (c, teamId) => DIV_ORDER.find(d => c.divisions?.[d]?.includes(teamId)) || 'asl';
export const isUnlocked = (c, team) => divisionOf(c, team.id) === 'd3';
export { divisionName };
const primary = p => (p.role === 'bowl' ? ['bowlSkill'] : p.role === 'all' ? ['bat', 'bowlSkill'] : ['bat']);

// What a player is worth in $M: rating above all, young potential adds, age takes away.
export function value(p) {
  const o = ovr(p);
  let v = 0.15 + 8 * Math.max(0, Math.min(1, (o - 45) / 50)) ** 2.4;
  if (p.age <= 23) v += 2.5 * Math.max(0, Math.min(1, (p.pot - o) / 40)) ** 1.4;
  if (p.heroId) v = Math.max(5, v * 1.25);
  if (p.age >= 34) v *= 0.5; else if (p.age >= 32) v *= 0.75;
  return round2(v);
}
// Potential as stars (1-5), from what he could grow into.
export const potentialStars = p => Math.max(1, Math.min(5, Math.round((p.pot - 55) / 8)));
export const ageNote = p => (p.age >= PEAK_AGE ? 'at his peak' : p.age <= 21 ? 'still growing fast' : 'still improving');

function newPlayer(base, extra) {
  return { ...base, ...extra, form: 0, ability: null, stats: { all: blankStats(), season: blankStats() } };
}

// The whole league at the start: every club's regulars, the eight heroes (all up for auction
// in the first season) and the first youth intake.
export function newCareer(seed = Date.now() >>> 0) {
  const rng = makeRng(seed);
  const c = { nations: true, seed, season: 1, phase: 'pick', club: null, money: START_MONEY, players: {}, league: null, auction: null,
    budgets: {}, titles: {}, history: [], records: { hs: [], bb: [] }, news: [], lineup: null, youthNo: 0,
    divisions: startDivisions() };
  for (const t of CLUBS) addClub(c, t);
  for (const h of HEROES) {
    const { hero, ...rest } = heroPlayer(h);
    const main = Math.max(...primary(rest).map(k => rest[k]));
    c.players[h.id] = newPlayer(rest, { heroId: h.id, age: lookAge(rest) ?? rng.int(25, 31), pot: Math.min(97, main + 2), team: null, contract: 0, home: teamOfStar(h.id) });
  }
  youthIntake(c, rng, 6);
  c.lookAges = {};
  for (const p of Object.values(c.players)) { const a = lookAge(p); if (a != null) c.lookAges[p.id] = a; }
  return c;
}
function startDivisions() {
  return { asl: TEAMS.map(t => t.id), d2: LEAGUE_CLUBS.filter(t => t.div === 'd2').map(t => t.id), d3: LEAGUE_CLUBS.filter(t => t.div === 'd3').map(t => t.id) };
}
// a club's regulars join the career, with its budget
function addClub(c, t) {
  c.budgets[t.id] = t.div ? START_BUDGET[t.div] : AI_BUDGET[t.tier];
  for (const r of roster(t.id)) {
    const pr = makeRng(hashStr(r.id) ^ c.seed);
    const age = lookAge(r) ?? pr.int(19, 35);
    const main = Math.max(...primary(r).map(k => r[k]));
    const pot = Math.min(95, main + (age <= 22 ? pr.int(6, 16) : age <= 26 ? pr.int(2, 6) : age < PEAK_AGE ? pr.int(0, 2) : 0));
    const { hero, ...rest } = r;
    c.players[r.id] = newPlayer(rest, { age, pot, team: t.id, contract: pr.int(1, 3) });
  }
}
// a player with a painted portrait is as old as he looks in it
const portraitKey = name => name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const lookAge = p => PORTRAIT_AGE[portraitKey(p.name || '')];
const teamOfStar = id => TEAMS.find(t => t.star === id)?.id || null;

const NICKS = ['Kid', 'Rookie', 'Spark', 'Pocket Rocket', 'Wonderboy', 'Junior', 'Prodigy', 'Rising Sun', 'Little Master', 'Cub', 'Comet', 'Bullet', 'Whiz', 'Ace'];
const ROLES = [['bat', 'Top-order prospect'], ['bat', 'Hard-hitting prospect'], ['wk', 'Keeper prospect'], ['all', 'All-round prospect'], ['bowl', 'Pace prospect'], ['bowl', 'Spin prospect']];

// New teenagers each season: cheap, raw, and a few will be special.
export function youthIntake(c, rng, n) {
  const used = new Set(Object.values(c.players).map(p => p.name));
  const out = [];
  for (let i = 0; i < n; i++) {
    // academy graduates come from every cricket nation
    let name, nation;
    do { nation = pickNation(rng); name = `${rng.pick(NATIONS[nation].first)} ${rng.pick(NATIONS[nation].last)}`; } while (used.has(name));
    used.add(name);
    const [role, label] = rng.pick(ROLES);
    const spin = label.startsWith('Spin');
    const bowl = role === 'bowl' || role === 'all' ? rng.pick(spin ? ['offspin', 'legspin'] : role === 'all' ? Object.keys(BOWL_TYPES) : ['express', 'swing', 'seam', 'leftpace']) : null;
    const r = rng.next();
    const pot = r < 0.15 ? rng.int(86, 95) : r < 0.45 ? rng.int(76, 85) : rng.int(64, 75); // one in seven is a future star
    const bat = role === 'bowl' ? rng.int(10, 26) : role === 'all' ? rng.int(40, 52) : rng.int(44, 58);
    const bowlSkill = bowl ? (role === 'all' ? rng.int(40, 52) : rng.int(46, 60)) : 0;
    const id = `y${c.season}-${++c.youthNo}`;
    const w = rng.int(0, WEAK.length - 1);
    const p = newPlayer({ id, name, nation, nick: rng.pick(NICKS), short: name.split(' ').slice(1).join(' '), role, label, bat, bowl, bowlSkill,
      trait: pot >= 86 ? 'Academy wonderkid' : 'Academy graduate', hero: false,
      ai: { ...WEAK[w], honesty: rng.range(0.5, 0.85), fire: rng.range(0.2, 0.5), rattle: rng.range(0.3, 0.55) } },
    { age: rng.int(17, 20), pot, team: null, contract: 0, youth: true, app: randomLook(nation, rng) });
    c.players[id] = p;
    out.push(p);
  }
  return out;
}

// ---------- travelling scouts ----------
// Send a scout to a region for the season: every second match he finds a player there (up to
// three). At the start of next season you can sign his finds at a set price before the auction;
// anyone you don't sign goes into the auction for every club to bid on.
export const SCOUT_FEE = 0.2;
export const SCOUT_REGIONS = {
  africa: { name: 'Africa', nations: ['ZA', 'ZW', 'KE', 'NA', 'UG'], tag: 'Raw talent' },
  europe: { name: 'Europe', nations: ['EN', 'IE', 'SC', 'NL'], tag: 'Accurate bowlers' },
  namerica: { name: 'North America', nations: ['US', 'CA', 'WI'], tag: 'Power hitters' },
  samerica: { name: 'South America', nations: ['AR', 'BR'], tag: 'Unpredictable talent' },
  oceania: { name: 'Oceania', nations: ['AU', 'NZ', 'PG'], tag: 'Fast bowlers' },
};
const FINDS = 3, EVERY = 2;
export const scoutOut = (c, region) => c.scouting?.[region]?.season === c.season;
export function sendScout(c, region) {
  if (scoutOut(c, region) || c.money < SCOUT_FEE || c.phase !== 'season') return false;
  c.money = round2(c.money - SCOUT_FEE);
  c.scouting = { ...c.scouting, [region]: { season: c.season, matches: 0, finds: [] } };
  return true;
}
// what each region's players are like
function scoutPlayer(c, region, rng) {
  const R = SCOUT_REGIONS[region];
  const used = new Set(Object.values(c.players).map(p => p.name));
  let name, nation;
  do { nation = rng.pick(R.nations); name = `${rng.pick(NATIONS[nation].first)} ${rng.pick(NATIONS[nation].last)}`; } while (used.has(name));
  const pace = () => rng.pick(['express', 'swing', 'seam', 'leftpace']);
  let role, label, bat, bowl = null, bowlSkill = 0, age, pot, ability = null;
  if (region === 'africa') {
    // young and raw: low now, a lot later
    [role, label] = rng.pick([['bat', 'Raw batting talent'], ['bowl', 'Raw pace talent'], ['all', 'Raw all-round talent']]);
    age = rng.int(17, 20);
    bat = role === 'bowl' ? rng.int(14, 26) : rng.int(46, 58);
    if (role !== 'bat') { bowl = pace(); bowlSkill = rng.int(48, 60); }
    pot = rng.next() < 0.35 ? rng.int(86, 94) : rng.int(76, 86);
  } else if (region === 'europe') {
    // tidy, accurate bowlers and the odd correct batter
    [role, label] = rng.pick([['bowl', 'Accurate seamer'], ['bowl', 'Swing specialist'], ['bat', 'Technically correct batter']]);
    age = rng.int(22, 28);
    if (role === 'bowl') { bat = rng.int(14, 28); bowl = label.startsWith('Swing') ? 'swing' : 'seam'; bowlSkill = rng.int(64, 76); } else bat = rng.int(62, 72);
    pot = Math.min(92, Math.max(bat, bowlSkill) + rng.int(2, 8));
  } else if (region === 'namerica') {
    // big hitters
    [role, label] = rng.pick([['bat', 'Power hitter'], ['bat', 'Six machine'], ['all', 'Big-hitting all-rounder']]);
    age = rng.int(20, 27);
    bat = rng.int(62, 74);
    if (role === 'all') { bowl = pace(); bowlSkill = rng.int(50, 62); }
    pot = Math.min(93, bat + rng.int(3, 10));
  } else if (region === 'samerica') {
    // anything can happen: some arrive with a special ability
    [role, label] = rng.pick([['bat', 'Unorthodox batter'], ['bowl', 'Mystery spinner'], ['all', 'Maverick all-rounder']]);
    age = rng.int(19, 26);
    bat = role === 'bowl' ? rng.int(14, 30) : rng.int(54, 68);
    if (role !== 'bat') { bowl = role === 'bowl' ? rng.pick(['offspin', 'legspin']) : pace(); bowlSkill = rng.int(56, 68); }
    pot = Math.min(93, Math.max(bat, bowlSkill) + rng.int(4, 14));
    if (rng.next() < 0.4) ability = role === 'bat' ? rng.pick(['eagleEye', 'finisher']) : role === 'bowl' ? 'mystery' : rng.pick(['eagleEye', 'swingMaster']);
  } else {
    // quick bowlers and athletes
    [role, label] = rng.pick([['bowl', 'Tearaway quick'], ['bowl', 'Left-arm quick'], ['all', 'Athletic all-rounder']]);
    age = rng.int(19, 26);
    bat = role === 'bowl' ? rng.int(16, 30) : rng.int(52, 64);
    bowl = label.startsWith('Left') ? 'leftpace' : 'express'; bowlSkill = rng.int(62, 74);
    pot = Math.min(93, bowlSkill + rng.int(3, 10));
  }
  const id = `s${c.season}-${region}-${(c.scoutNo = (c.scoutNo || 0) + 1)}`;
  const w = rng.int(0, WEAK.length - 1);
  const p = newPlayer({ id, name, nation, nick: rng.pick(NICKS), short: name.split(' ').slice(1).join(' '), role, label, bat, bowl, bowlSkill,
    trait: `Scouted in ${R.name}`, hero: false,
    ai: { ...WEAK[w], honesty: rng.range(0.5, 0.85), fire: rng.range(0.2, 0.5), rattle: rng.range(0.3, 0.55) } },
  { age, pot, team: null, contract: 0, app: randomLook(nation, rng) });
  p.ability = ability;
  p.scouted = { region, season: c.season, price: Math.max(0.1, round2(value(p) * 0.8)) };
  c.players[id] = p;
  return p;
}
const findFor = (c, region, n) => scoutPlayer(c, region, makeRng(hashStr(`${c.seed}-${c.season}-${region}-${n}`)));
// after each of your league matches: the scouts out this season report back
function scoutReports(c) {
  const notes = [];
  for (const [region, s] of Object.entries(c.scouting || {})) {
    if (s.season !== c.season) continue;
    s.matches++;
    if (s.matches % EVERY || s.finds.length >= FINDS) continue;
    const p = findFor(c, region, s.finds.length);
    s.finds.push(p.id);
    notes.push(`🔎 Your scout in ${SCOUT_REGIONS[region].name} has found ${p.name} (${p.age}), ${p.label.toLowerCase()}. You can sign him before next season's auction.`);
  }
  return notes;
}
// the finds you can sign now, before this season's auction
export const scoutFinds = c => Object.values(c.players).filter(p => p.scouted && p.scouted.season === c.season - 1 && !p.team && !p.retired);
export function signFind(c, id) {
  const p = c.players[id];
  if (!p?.scouted || p.team || c.money < p.scouted.price || clubPlayers(c, c.club).length >= MAX_SQUAD) return false;
  sign(c, p, c.club, p.scouted.price);
  return true;
}
export function finishScouts(c) { if (c.phase === 'scouts') startAuction(c); }

// Careers saved before players had countries: the regulars take their new names and
// nations from the squads, heroes get theirs, and older academy graduates get one.
export function migrateCareer(c) {
  if (!c) return c;
  // careers from before the divisions: the eight are the Super League (where a club already
  // chosen stays), and the sixteen lower-division clubs join with their squads
  if (!c.divisions) {
    c.divisions = startDivisions();
    for (const t of LEAGUE_CLUBS) addClub(c, t);
  }
  // painted players get the age they look (as of season 1, older by the seasons since)
  c.lookAges = c.lookAges || {};
  for (const p of Object.values(c.players)) {
    const a = lookAge(p);
    if (a == null || c.lookAges[p.id] === a) continue;
    const pot = p.pot, main = Math.max(...primary(p).map(k => p[k] || 0));
    p.age = a + (c.season - 1);
    // a young face keeps room to grow; an older one doesn't keep a youngster's ceiling
    if (p.age <= 22) p.pot = Math.max(pot, Math.min(95, main + 8));
    else if (p.age >= 28) p.pot = Math.min(pot, Math.max(main, main + 2));
    c.lookAges[p.id] = a;
  }
  if (c.nations) return c;
  for (const p of Object.values(c.players)) {
    const [team] = p.id.split('-');
    const r = TEAMS.some(t => t.id === team) && roster(team).find(x => x.id === p.id);
    if (r) Object.assign(p, { name: r.name, nick: r.nick, short: r.short, nation: r.nation, trait: r.trait });
    else if (p.heroId) p.nation = heroPlayer(heroById(p.heroId)).nation;
    else if (!p.nation) p.nation = ['IN', 'PK', 'BD'][hashStr(p.id) % 3];
  }
  c.nations = true;
  return c;
}

// ---------- clubs ----------
export const clubPlayers = (c, teamId) => Object.values(c.players).filter(p => p.team === teamId && !p.retired);
// The squad as the match engine wants it (heroes carry their hero card).
export const enginePlayer = p => ({ ...p, hero: p.heroId ? heroById(p.heroId) : false });
export const clubPool = (c, teamId) => clubPlayers(c, teamId).map(enginePlayer);
// The club's heroes by slot (first one of each slot): their powers are the club's powers.
export function clubHeroes(pool) {
  const sq = { bat: null, bowl: null, field: null };
  for (const p of pool) if (p.hero && !sq[p.hero.slot]) sq[p.hero.slot] = p.hero;
  return sq;
}
export const clubRating = (c, teamId) => teamRating(clubPool(c, teamId));

// ---------- choosing a club ----------
export function chooseClub(c, teamId) {
  const t = teamById(teamId);
  // (a new career picks from Division 3; after that you stay with your club and climb)
  if (c.club ? teamId !== c.club : !isUnlocked(c, t)) return false;
  if (c.club !== teamId) c.lineup = null;
  c.club = teamId;
  // your scouts' finds come first, at their set price; then the auction
  if (scoutFinds(c).length) c.phase = 'scouts'; else startAuction(c);
  return true;
}

// Your own club: it takes the place of the weakest Division 3 club (its budget and ground), and
// that club's regulars become a squad of young unknowns: rough now, with room to grow.
// spec: { name, short, suit, trim, emblem, ground, crest (an image URL) }
export function createClub(c, spec) {
  if (c.club) return false;
  const base = [...c.divisions.d3].sort((a, b) => clubRating(c, a) - clubRating(c, b))[0];
  const rng = makeRng(hashStr(`mine-${c.seed}`));
  for (const p of clubPlayers(c, base)) {
    const main = Math.max(...primary(p).map(k => p[k]));
    p.age = rng.int(18, 21);
    p.pot = Math.min(90, main + rng.int(12, 22));
    p.contract = 3;
  }
  c.custom = { ...spec, base, gone: teamById(base).name };
  setMyClub(c.custom);
  return chooseClub(c, base);
}

// ---------- the auction ----------
const inc = price => (price < 1 ? 0.1 : price < 3 ? 0.25 : 0.5);
const squadSize = (c, teamId) => clubPlayers(c, teamId).length;
function aiMaxes(c, p) {
  const rng = makeRng(hashStr(`${c.seed}-${c.season}-${p.id}`));
  const out = {};
  for (const t of CLUBS) {
    if (t.id === c.club) continue;
    const n = squadSize(c, t.id);
    if (n >= MAX_SQUAD) { out[t.id] = 0; continue; }
    const reserve = Math.max(0, MIN_SQUAD - n - 1) * 0.3;
    const free = c.budgets[t.id] - reserve;
    const need = n < MIN_SQUAD ? 1.25 : n < 12 ? 1 : 0.7;
    const homecoming = p.home === t.id ? 1.25 : 1; // a hero's old club wants him back
    out[t.id] = Math.max(0, Math.min(free, round2(value(p) * (0.75 + rng.next() * 0.6) * need * (p.heroId ? 1.2 : 1) * homecoming)));
  }
  return out;
}
export function startAuction(c) {
  const pool = Object.values(c.players).filter(p => !p.team && !p.retired).sort((a, b) => value(b) - value(a));
  c.auction = { lots: pool.map(p => p.id), idx: 0, lot: null, results: [] };
  c.phase = 'auction';
  openLot(c);
}
function openLot(c) {
  const A = c.auction;
  while (A.idx < A.lots.length && c.players[A.lots[A.idx]].team) A.idx++;
  if (A.idx >= Math.min(A.lots.length, LOTS)) { A.lot = null; return; }
  const p = c.players[A.lots[A.idx]];
  A.lot = { pid: p.id, price: Math.max(0.1, round2(value(p) * 0.5)), leader: null, maxes: aiMaxes(c, p) };
}
export const currentLot = c => c.auction?.lot || null;
export const nextBid = lot => (lot.leader ? round2(lot.price + inc(lot.price)) : lot.price);
function sign(c, p, teamId, price) {
  p.team = teamId;
  const rng = makeRng(hashStr(`${p.id}-${c.season}-c`));
  p.contract = p.age >= PEAK_AGE ? 1 : rng.int(1, 3);
  if (teamId === c.club) c.money = round2(c.money - price); else c.budgets[teamId] = round2(c.budgets[teamId] - price);
  c.auction?.results.push({ pid: p.id, team: teamId, price });
}
// You bid. Returns 'won' | 'outbid' | 'broke' | 'full'.
export function bid(c) {
  const lot = c.auction.lot, p = c.players[lot.pid];
  if (squadSize(c, c.club) >= MAX_SQUAD) return 'full';
  const price = nextBid(lot);
  if (c.money < price) return 'broke';
  lot.price = price; lot.leader = c.club;
  // the keenest AI club raises if it still can
  const [best, max] = Object.entries(lot.maxes).sort((x, y) => y[1] - x[1])[0] || [];
  const raise = round2(price + inc(price));
  if (best && max >= raise) { lot.price = raise; lot.leader = best; return 'outbid'; }
  sign(c, p, c.club, price);
  c.auction.idx++; openLot(c);
  return 'won';
}
// You let this one go: the AI clubs settle it between themselves.
export function pass(c) {
  const lot = c.auction.lot, p = c.players[lot.pid];
  const order = Object.entries(lot.maxes).sort((x, y) => y[1] - x[1]);
  const [top, top2] = order;
  let winner = null, price = lot.price;
  if (top && top[1] >= lot.price) {
    winner = top[0];
    price = Math.max(lot.price, Math.min(top[1], round2((top2?.[1] || 0) + inc(top2?.[1] || 0))));
  }
  if (winner) sign(c, p, winner, round2(price));
  else c.auction.results.push({ pid: p.id, team: null, price: 0 });
  c.auction.idx++; openLot(c);
  return winner;
}
// Settle the rest, make sure every club has a full squad, and start the season.
export function finishAuction(c) {
  while (c.auction.lot) pass(c);
  const rng = makeRng(hashStr(`${c.seed}-${c.season}-fill`));
  // the lower lots go quickly: each AI club takes what it can use
  for (const id of c.auction.lots.slice(LOTS)) {
    const p = c.players[id];
    if (p.team) continue;
    const m = aiMaxes(c, p);
    const [top] = Object.entries(m).sort((x, y) => y[1] - x[1]);
    if (top && top[1] >= value(p) * 0.5) sign(c, p, top[0], round2(value(p) * 0.5));
  }
  // unsold heroes go home to their own club
  for (const p of Object.values(c.players)) {
    if (p.heroId && !p.team && p.home && squadSize(c, p.home) < MAX_SQUAD && p.home !== c.club) sign(c, p, p.home, 0);
  }
  // every club needs at least MIN_SQUAD players: the cheapest free agents, then fresh youth
  for (const t of CLUBS) {
    while (squadSize(c, t.id) < MIN_SQUAD) {
      let p = Object.values(c.players).filter(x => !x.team && !x.retired && !x.heroId).sort((a, b) => value(a) - value(b))[0];
      if (!p) p = youthIntake(c, rng, 1)[0];
      sign(c, p, t.id, t.id === c.club ? Math.min(c.money, round2(value(p) * 0.5)) : round2(value(p) * 0.5));
    }
  }
  c.auction.done = true;
  startSeason(c);
}

// ---------- the season ----------
export function startSeason(c) {
  c.phase = 'season';
  c.league = newLeague(c.club, hashStr(`${c.seed}-league-${c.season}`), c.divisions[divisionOf(c, c.club)]);
  c.league.div = divisionOf(c, c.club);
  c.league.season = c.season;
  for (const p of Object.values(c.players)) p.stats.season = blankStats();
}

// A simulated match between two AI clubs, ball by ball, so every player gets a scorecard.
export function simCareerMatch(c, a, b, rng) {
  const ia = simInnings(c, a, b, rng), ib = simInnings(c, b, a, rng, ia.runs + 1);
  const la = lineupOf(c, a), lb = lineupOf(c, b);
  played(c, [...la.order, ...la.attack, ...lb.order, ...lb.attack].filter(Boolean).map(p => p.id));
  const winner = ib.runs > ia.runs ? b : ib.runs < ia.runs ? a : rng.chance(0.5) ? a : b; // (a tie goes to a super over)
  return { a, b, ia, ib, winner };
}
function lineupOf(c, teamId) {
  const pool = clubPool(c, teamId);
  const l = defaultLineup(teamId, clubHeroes(pool), {}, pool);
  const byId = id => pool.find(p => p.id === id);
  return { order: l.order.map(byId), attack: l.attack.map(byId) };
}
function simInnings(c, batId, bowlId, rng, target = null) {
  const L = lineupOf(c, batId), B = lineupOf(c, bowlId);
  const plan = overPlan(B.attack.filter(Boolean), CFG.balls / 6);
  let runs = 0, wkts = 0, balls = 0, boundaries = 0;
  const bat = new Map(), bowl = new Map();
  const card = (m, id) => m.get(id) || (m.set(id, { runs: 0, balls: 0, fours: 0, sixes: 0, out: false, wkts: 0 }), m.get(id));
  while (balls < CFG.balls && wkts < CFG.wickets && (target == null || runs < target)) {
    const s = L.order[Math.min(wkts, L.order.length - 1)], bw = plan[Math.floor(balls / 6)];
    balls++;
    const sc = card(bat, s.id), bc = card(bowl, bw.id);
    sc.balls++; bc.balls++;
    let d = (s.bat - bw.bowlSkill) / 100;
    if (s.ability === 'eagleEye') d += 0.05;
    if (bw.ability === 'mystery' || bw.ability === 'swingMaster') d -= 0.04;
    if (rng.chance(Math.max(0.03, Math.min(0.16, 0.075 - 0.08 * d)))) { wkts++; sc.out = true; bc.wkts++; continue; }
    const r = rng.next();
    const x = r < 0.32 - 0.2 * d ? 0 : r < 0.6 ? 1 : r < 0.73 ? 2 : r < 0.9 + 0.1 * d ? 4 : 6;
    runs += x; sc.runs += x; bc.runs += x;
    if (x === 4) { sc.fours++; boundaries++; }
    if (x === 6) { sc.sixes++; boundaries++; }
  }
  for (const p of L.order) if (p) card(bat, p.id); // the order all count as having played
  for (const [id, s] of bat) recordBat(c, id, s);
  for (const [id, f] of bowl) recordBowl(c, id, f);
  for (const p of [...L.order, ...L.attack]) if (p) formFrom(c, c.players[p.id], bat.get(p.id), bowl.get(p.id));
  return { runs, wkts, balls, boundaries };
}

// ---------- stats that never go away ----------
function bump(st, s) {
  if (s.balls > 0 || s.out) { st.inns++; st.runs += s.runs; st.balls += s.balls; st.fours += s.fours; st.sixes += s.sixes; if (s.out) st.outs++; st.hs = Math.max(st.hs, s.runs); }
}
function bumpBowl(st, f) {
  st.wkts += f.wkts; st.bballs += f.balls; st.bruns += f.runs;
  if (!st.bb || f.wkts > st.bb.w || (f.wkts === st.bb.w && f.runs < st.bb.r)) st.bb = { w: f.wkts, r: f.runs };
}
// one appearance each, however many times he batted or bowled
function played(c, ids) {
  for (const id of new Set(ids)) { const p = c.players[id]; if (p) { p.stats.all.m++; p.stats.season.m++; } }
}
function recordBat(c, id, s) {
  const p = c.players[id];
  if (!p) return;
  bump(p.stats.all, s); bump(p.stats.season, s);
  if (s.runs >= 15) pushTop(c.records.hs, { pid: id, runs: s.runs, balls: s.balls, out: s.out, team: p.team, season: c.season }, (a, b) => b.runs - a.runs || a.balls - b.balls);
}
function recordBowl(c, id, f) {
  const p = c.players[id];
  if (!p || !f.balls) return;
  bumpBowl(p.stats.all, f); bumpBowl(p.stats.season, f);
  if (f.wkts >= 1) pushTop(c.records.bb, { pid: id, w: f.wkts, r: f.runs, balls: f.balls, team: p.team, season: c.season }, (a, b) => b.w - a.w || a.r - b.r);
}
function pushTop(list, item, cmp) { list.push(item); list.sort(cmp); list.length = Math.min(list.length, 10); }

// ---------- growing ----------
// Good games build form; every 4 points of form is a rating point, up to his potential,
// and only until he turns 33.
function formFrom(c, p, s, f) {
  if (!p) return;
  let pts = 0;
  if (s) pts += s.runs >= 30 ? 2 : s.runs >= 15 ? 1 : 0;
  if (f && f.balls) pts += (f.wkts >= 2 ? 2 : f.wkts >= 1 ? 1 : 0) + (f.balls >= 6 && f.runs / f.balls < 1 ? 1 : 0);
  p.form = (p.form || 0) + pts;
  while (p.form >= 4) { p.form -= 4; grow(c, p, 1); }
}
export function grow(c, p, n) {
  if (p.age >= PEAK_AGE || n <= 0) return 0;
  let g = 0;
  for (const k of primary(p)) { const to = Math.min(p.pot, p[k] + n); g = Math.max(g, to - p[k]); p[k] = to; }
  if (g) checkStar(c, p);
  return g;
}
function checkStar(c, p) {
  if (p.heroId || p.ability || ovr(p) < STAR_OVR) return;
  const rng = makeRng(hashStr(p.id + 'star'));
  const batter = p.role === 'bat' || p.role === 'wk' || (p.role === 'all' && p.bat >= p.bowlSkill);
  p.ability = batter ? rng.pick(['eagleEye', 'finisher']) : bowlType(p.bowl).spin ? 'mystery' : rng.pick(['swingMaster', 'deathKing']);
  c.news.push(`⭐ ${p.name} is now a STAR: ${ABILITIES[p.ability].name}!`);
}

// ---------- your matches ----------
// Every player in both innings gets his runs and wickets; returns what changed for your club.
export function recordPlayerMatch(c, summary) {
  const before = new Map(clubPlayers(c, c.club).map(p => [p.id, ovr(p)]));
  const newsAt = c.news.length;
  const ids = [];
  for (const inn of summary.innings) {
    const bat = new Map(), bowl = new Map();
    for (const st of inn.battingCard()) if (st.id) bat.set(st.id, { runs: st.runs, balls: st.balls, fours: st.fours, sixes: st.sixes, out: st.out });
    for (const f of inn.bowlingCard()) bowl.set(f.id, { balls: f.balls, runs: f.runs, wkts: f.wkts });
    for (const [id, s] of bat) recordBat(c, id, s);
    for (const [id, f] of bowl) recordBowl(c, id, f);
    for (const id of new Set([...bat.keys(), ...bowl.keys()])) formFrom(c, c.players[id], bat.get(id), bowl.get(id));
    ids.push(...bat.keys(), ...bowl.keys());
  }
  played(c, ids);
  if (summary.result.outcome === 'win') c.money = round2(c.money + WIN_BONUS);
  const ups = clubPlayers(c, c.club).filter(p => ovr(p) > (before.get(p.id) ?? 99)).map(p => `⬆ ${p.name} ${before.get(p.id)} → ${ovr(p)}`);
  return [...ups, ...c.news.slice(newsAt)];
}
// After your league match: play the rest of the round, and close the season when it's over.
export function afterLeagueMatch(c, summary) {
  const notes = recordPlayerMatch(c, summary);
  notes.push(...scoutReports(c));
  notes.push(...advance(c.league, playerResult(c.league, summary), (a, b, rng) => simCareerMatch(c, a, b, rng)));
  if (finish(c.league)) notes.push(...endSeason(c));
  return notes;
}

// Final positions 1-8: champion, runner-up, the beaten semi-finalists, then the table.
export function finalOrder(L) {
  const t = table(L).map(r => r.id);
  const final = L.ko.find(k => k.stage === 'final'), semi = L.ko.find(k => k.stage === 'semi');
  const top2 = [L.champion, final.ties[0].find(x => x !== L.champion)];
  const semis = semi.ties.flat().filter(x => !top2.includes(x)).sort((a, b) => t.indexOf(a) - t.indexOf(b));
  return [...top2, ...semis, ...t.filter(x => !top2.includes(x) && !semis.includes(x))];
}
export function endSeason(c) {
  const L = c.league, myDiv = divisionOf(c, c.club), order = finalOrder(L);
  const notes = [];
  // the other two divisions play their seasons too
  const leagues = { [myDiv]: L };
  for (const d of DIV_ORDER) if (d !== myDiv) leagues[d] = simLeague(c.divisions[d], hashStr(`${c.seed}-${d}-${c.season}`), (a, b, rng) => simCareerMatch(c, a, b, rng));
  for (const d of DIV_ORDER) {
    const ord = d === myDiv ? order : finalOrder(leagues[d]), k = DIV_MONEY[d];
    ord.forEach((id, i) => {
      const prize = round2(PRIZE[i] * k);
      if (id === c.club) { c.money = round2(c.money + prize + SPONSOR); notes.push(`You finished ${i + 1}${['st', 'nd', 'rd'][i] || 'th'} in ${divisionName(d)}: ${money(prize)} prize money + ${money(SPONSOR)} sponsorship`); }
      else c.budgets[id] = round2((c.budgets[id] || 0) + prize + AI_INCOME * k);
    });
  }
  c.titles[leagues.asl.champion] = (c.titles[leagues.asl.champion] || 0) + 1;
  const season = Object.values(c.players);
  const top = (f) => season.filter(p => p.stats.season.m).sort((a, b) => f(b) - f(a))[0];
  const orange = top(p => p.stats.season.runs), purple = top(p => p.stats.season.wkts * 1000 - p.stats.season.bruns);
  c.history.push({ season: c.season, div: myDiv, champion: L.champion, runnerUp: order[1], club: c.club, pos: order.indexOf(c.club) + 1,
    champions: Object.fromEntries(DIV_ORDER.map(d => [d, leagues[d].champion])),
    orange: orange && { pid: orange.id, runs: orange.stats.season.runs }, purple: purple && { pid: purple.id, wkts: purple.stats.season.wkts } });
  // promotion and relegation: Division 3's champion up and Division 2's bottom club down; Division 2's
  // champion up and the loser of the Super League's play-off (7th v 8th) down
  const groupTable = d => table(leagues[d]).map(r => r.id);
  const asl = groupTable('asl');
  c.moves = { d3up: leagues.d3.champion, d2down: groupTable('d2').at(-1), d2up: leagues.d2.champion, playoff: [asl[6], asl[7]], aslDown: null };
  if (c.moves.playoff.includes(c.club)) {
    // you're in it: the play-off is yours to play
    const opp = c.moves.playoff.find(id => id !== c.club);
    c.playoff = { opp, home: asl[6], label: 'Relegation play-off' };
    c.phase = 'playoff';
    notes.push(`You finished ${asl.indexOf(c.club) + 1}th: a play-off against ${teamById(opp).name} to stay in the Super League!`);
  } else {
    const m = simCareerMatch(c, asl[6], asl[7], makeRng(hashStr(`${c.seed}-playoff-${c.season}`)));
    c.moves.aslDown = m.winner === asl[6] ? asl[7] : asl[6];
    applyMoves(c, notes);
  }
  // a scout sent out late still comes home with two names
  for (const [region, sc] of Object.entries(c.scouting || {})) {
    if (sc.season !== c.season) continue;
    while (sc.finds.length < 2) {
      const p = findFor(c, region, sc.finds.length);
      sc.finds.push(p.id);
      notes.push(`🔎 Your scout in ${SCOUT_REGIONS[region].name} comes home with ${p.name}, ${p.label.toLowerCase()}`);
    }
  }
  if (c.phase !== 'playoff') c.phase = 'done';
  return notes;
}

// the season's movements between the divisions, and what they mean for you
function applyMoves(c, notes) {
  const M = c.moves, D = c.divisions;
  const move = (id, from, to) => { D[from] = D[from].filter(x => x !== id); D[to] = [...D[to], id]; };
  move(M.d3up, 'd3', 'd2'); move(M.d2down, 'd2', 'd3');
  move(M.d2up, 'd2', 'asl'); move(M.aslDown, 'asl', 'd2');
  const h = c.history.at(-1);
  if (M.d3up === c.club || M.d2up === c.club) { h.promoted = divisionOf(c, c.club); notes.push(`⬆️ PROMOTED! Next season ${teamById(c.club).name} play in ${divisionName(h.promoted)}.`); }
  if (M.d2down === c.club || M.aslDown === c.club) { h.relegated = divisionOf(c, c.club); notes.push(`⬇️ Relegated. Next season ${teamById(c.club).name} play in ${divisionName(h.relegated)}.`); }
  c.moveNews = [
    `⬆️ ${teamById(M.d2up).name} are promoted to the Asian Super League`, `⬇️ ${teamById(M.aslDown).name} lose the play-off and go down to Division 2`,
    `⬆️ ${teamById(M.d3up).name} are promoted to Division 2`, `⬇️ ${teamById(M.d2down).name} finish bottom and go down to Division 3`,
  ];
}
// your relegation play-off, played: the winner stays up
export function afterPlayoff(c, summary) {
  const notes = recordPlayerMatch(c, summary);
  const r = playerResult({ team: c.club, stage: 'playoff' }, summary);
  const won = r.winner === c.club;
  c.moves.aslDown = won ? c.playoff.opp : c.club;
  c.history.at(-1).playoff = { opp: c.playoff.opp, won };
  notes.push(won ? `🛡️ You win the play-off: ${teamById(c.club).name} stay in the Super League!` : `The play-off is lost.`);
  applyMoves(c, notes);
  c.playoff = null;
  c.phase = 'done';
  return notes;
}

// The off-season: everyone a year older, the young grow, the old fade and retire,
// contracts end (those players go into the auction), and new teenagers arrive.
export function nextSeason(c) {
  const rng = makeRng(hashStr(`${c.seed}-off-${c.season}`));
  c.news = [...(c.moveNews || [])]; c.moveNews = null;
  for (const p of Object.values(c.players)) {
    if (p.retired) continue;
    p.age++;
    if (p.age < PEAK_AGE) grow(c, p, p.age <= 23 ? rng.int(1, 4) : p.age <= 28 ? rng.int(0, 2) : rng.int(0, 1));
    else if (p.age >= 34 && !p.heroId) for (const k of primary(p)) p[k] = Math.max(30, p[k] - rng.int(0, 2));
    if (!p.heroId && p.age >= 36 && rng.chance(0.35 + (p.age - 36) * 0.3)) {
      p.retired = true; p.team = null; p.retiredIn = c.season;
      c.news.push(`👋 ${p.name} retires at ${p.age}`);
      continue;
    }
    if (p.team && --p.contract <= 0) { p.team = null; p.contract = 0; }
    p.form = 0;
  }
  const kids = youthIntake(c, rng, 7);
  c.news.push(`🎓 ${kids.length} academy graduates join the auction`);
  c.season++;
  c.league = null; c.auction = null;
  // you stay with your club: on to your scouts' finds, then the auction
  if (c.club) { if (scoutFinds(c).length) c.phase = 'scouts'; else startAuction(c); } else c.phase = 'pick';
}

// ---------- leaderboards ----------
export function leaders(c, scope = 'all', key = 'runs', n = 10) {
  const val = {
    runs: s => s.runs, wkts: s => s.wkts, sixes: s => s.sixes, hs: s => s.hs,
    avg: s => (s.outs ? s.runs / s.outs : s.inns >= 3 ? s.runs : 0),
  }[key];
  return Object.values(c.players).filter(p => p.stats[scope].m).sort((a, b) => val(b.stats[scope]) - val(a.stats[scope])).slice(0, n);
}
export const playerName = (c, id) => c.players[id]?.name || id;
