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
import { newLeague, simLeague, advance, playerResult, table, finish, nextFixture } from './tournament.js';
import { NATIONS, pickNation } from './nations.js';
import { randomLook } from './looks.js';
import { ensureRivals, nemesisOf, say, afterMatch, messageNote, rivalKind } from './rivals.js';
import { ensureChirp, afterMatchPopularity, seasonPopularity, storyOf, sponsorBonus, compact } from './chirp.js';
import { chirpAfterMatch, chirpStory, chirpMilestone } from './chirpposts.js';
import { memOf } from './chirpfacts.js';
import { fameAfter, startFame } from './merch.js';
import { seasonGain } from './training.js';

export const PEAK_AGE = 33;           // no growth from this age
export const MIN_SQUAD = 10, MAX_SQUAD = 14;
export const START_MONEY = 3;          // $M in your first season
export const SPONSOR = 1;              // $M every season, whatever happens
export const WIN_BONUS = 0.4;          // $M per league win in the top division (less lower down: DIV_MONEY)
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
  c.money = round2(c.money - SCOUT_FEE); book(c, 'out', 'players', SCOUT_FEE);
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
  if (!p?.scouted || p.team || c.money < p.scouted.price || clubPlayers(c, c.club).length >= MAX_SQUAD || repBlock(c, p)) return false;
  sign(c, p, c.club, p.scouted.price);
  chirpSigned(c, p, p.scouted.price, 'scouted');
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
  // careers from before the simulated matches had two batters: a big score off more than 24 balls can't have happened, so it goes
  // from the records lists (only those lists; players' own totals stay as they are)
  if (c.records?.hs) c.records.hs = c.records.hs.filter(r => (r.balls || 0) <= 24);
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
  if (c.club && c.divisions) ensureChirp(c);   // careers from before Chirp get a feed
  if (c.club && !c.rivals && c.divisions) refreshRivals(c);   // careers from before the rivals get them
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

// ---------- rivals (js/rivals.js) ----------
// the nemesis and the rival of your division: made when you take a club, and again whenever you change division. The messages they send
// go into the inbox (the Newsroom); the first word from your nemesis comes with the club.
function refreshRivals(c) {
  const first = !c.rivals;
  const next = ensureRivals(c, id => clubRating(c, id), c.divisions[divisionOf(c, c.club)]);
  const out = [];
  if (first) out.push(say(c, 'nemesis', 'intro', nemesisOf(c)));
  if (next) out.push(say(c, 'division', 'new', next));
  return out.filter(Boolean);
}

// ---------- choosing a club ----------
export function chooseClub(c, teamId, { hold = false } = {}) {
  const t = teamById(teamId);
  // (a new career picks from Division 3; after that you stay with your club and climb)
  if (c.club ? teamId !== c.club : !isUnlocked(c, t)) return false;
  if (c.club !== teamId) c.lineup = null;
  c.club = teamId;
  ensureChirp(c).startDiv = c.chirp.startDiv || divisionOf(c, teamId);   // (where the club started: the fans remember it)
  refreshRivals(c);
  // your scouts' finds come first, at their set price; then the auction
  if (hold) c.phase = 'trials'; else if (scoutFinds(c).length) c.phase = 'scouts'; else startAuction(c);
  return true;
}

// ---------- the caretaker: your ground starts rough (a club from nothing) and he brings it up ----------
// The grass and the pitch of a new club are worn and dry. A caretaker costs a fee to hire and a wage every week (a week is each of your league matches), and
// as long as he is paid the ground gets better week by week; if he goes, or is never hired, it slowly goes back. A club saved before this has a ground in full condition.
export const CARE = { START: 0.08, FLOOR: 0.05, HIRE: 0.1, WAGE: 0.05, GAIN: 0.11, DECAY: 0.025 };
export const groundCond = c => c.custom?.cond ?? 1;
export const hasCaretaker = c => !!c.custom?.caretaker;
export function hireCaretaker(c) {
  if (!c.custom || c.custom.caretaker || c.money < CARE.HIRE) return false;
  c.money = round2(c.money - CARE.HIRE); book(c, 'out', 'buildings', CARE.HIRE);
  c.custom.caretaker = true; c.custom.careWeeks = 0;
  setMyClub(c.custom);
  return true;
}
export function dismissCaretaker(c) {
  if (!c.custom?.caretaker) return false;
  c.custom.caretaker = false; setMyClub(c.custom);
  return true;
}
// after each of your league matches: a week goes by on the ground
export function groundWeek(c) {
  const m = c.custom, notes = [];
  if (!m || m.cond === undefined) return notes;
  if (m.caretaker) {
    if (c.money >= CARE.WAGE) {
      c.money = round2(c.money - CARE.WAGE); book(c, 'out', 'buildings', CARE.WAGE);
      const before = m.cond; m.cond = Math.min(1, round3(m.cond + CARE.GAIN)); m.careWeeks = (m.careWeeks || 0) + 1;
      notes.push(`🌱 Your caretaker worked on ${m.ground} (wage ${money(CARE.WAGE)})${m.cond >= 1 ? ': it is in perfect order' : m.cond - before > 0 && m.careWeeks === 2 ? ': the grass is greening up' : ''}`);
    } else {
      m.caretaker = false;
      notes.push(`🌱 Your caretaker has left: you could not pay him. ${m.ground} will go back to seed`);
    }
  } else if (m.cond > CARE.FLOOR) m.cond = Math.max(CARE.FLOOR, round3(m.cond - CARE.DECAY));
  setMyClub(m);
  return notes;
}
const round3 = x => Math.round(x * 1000) / 1000;

// Your own club: it takes the place of the weakest Division 3 club (its budget and ground), and
// that club's regulars become a squad of young unknowns: rough now, with room to grow.
// spec: { name, short, suit, trim, emblem, ground, crest (an image URL) }
export function createClub(c, spec, { trials = false } = {}) {
  if (c.club) return false;
  const base = [...c.divisions.d3].sort((a, b) => clubRating(c, a) - clubRating(c, b))[0];
  const rng = makeRng(hashStr(`mine-${c.seed}`));
  if (trials) {
    // the story's way: the club starts with nobody. The regulars of the club it replaces go back on the market, and the squad is chosen in the nets (trialists, below)
    for (const p of clubPlayers(c, base)) { p.team = null; p.contract = 0; }
    c.custom = { ...spec, base, gone: teamById(base).name, stadium: 1, cond: CARE.START, caretaker: false };
    setMyClub(c.custom);
    if (!chooseClub(c, base, { hold: true })) return false;
    makeTrialists(c);
    return true;
  }
  for (const p of clubPlayers(c, base)) {
    const main = Math.max(...primary(p).map(k => p[k]));
    p.age = rng.int(18, 21);
    p.pot = Math.min(90, main + rng.int(12, 22));
    p.contract = 3;
  }
  c.custom = { ...spec, base, gone: teamById(base).name, stadium: 1, cond: CARE.START, caretaker: false };
  setMyClub(c.custom);
  return chooseClub(c, base);
}

// ---------- the net trials: a new club's first squad (the story) ----------
// Dev has found a keeper; the rest of the squad is picked in the nets from six batters and six bowlers (none of them any good yet: they are
// young, and each has a type). The founder, Kabir, is already in it and can't be sold. You pick 4 batters and 5 bowlers: 4 + 5 + the keeper + Kabir = 11.
export const TRIAL_BATS = [
  { label: 'Aggressive opener', trait: 'Quick starter' }, { label: 'Power batter', trait: 'Swings from the first ball' }, { label: 'Anchor', trait: 'Hard to dislodge' },
  { label: 'Finisher', trait: 'Calm when it counts' }, { label: 'Touch batter', trait: 'Sweet timing' }, { label: 'Tactical batter', trait: 'Finds the gaps' },
];
export const TRIAL_BOWLS = ['express', 'swing', 'seam', 'leftpace', 'offspin', 'legspin'];
export const TRIAL_PICKS = { bat: 4, bowl: 5 };
const KABIR = { id: 'kabir-anand', name: 'Kabir Anand', short: 'Kabir', nick: 'The Founder', nation: 'IN', role: 'bat', label: 'Tactical batter', trait: 'Plays through the pain', bat: 66, bowl: null, bowlSkill: 0, number: 9, hero: false };
function trialPlayer(c, rng, base, extra) {
  const nation = pickNation(rng), used = new Set(Object.values(c.players).map(p => p.name));
  let name;
  do { name = `${rng.pick(NATIONS[nation].first)} ${rng.pick(NATIONS[nation].last)}`; } while (used.has(name));
  const id = `tr-${++c.youthNo}`;
  const w = rng.int(0, WEAK.length - 1);
  return newPlayer({ id, name, nation, nick: rng.pick(NICKS), short: name.split(' ').slice(1).join(' '), hero: false, ...base,
    ai: { ...WEAK[w], honesty: rng.range(0.5, 0.85), fire: rng.range(0.2, 0.5), rattle: rng.range(0.3, 0.55) } },
  { age: rng.int(18, 24), pot: rng.int(62, 84), team: null, contract: 0, trial: true, app: randomLook(nation, rng), ...extra });
}
function makeTrialists(c) {
  const rng = makeRng(hashStr(`trial-${c.seed}`));
  const T = { bats: [], bowls: [], keeper: null, results: null };
  for (const b of TRIAL_BATS) {
    const bat = rng.int(46, 60), p = trialPlayer(c, rng, { role: 'bat', label: b.label, trait: b.trait, bat, bowl: null, bowlSkill: 0 }, {});
    c.players[p.id] = p; T.bats.push(p.id);
  }
  for (const type of TRIAL_BOWLS) {
    const p = trialPlayer(c, rng, { role: 'bowl', label: `${bowlType(type).name}`, trait: 'A net bowler with something to prove', bat: rng.int(12, 28), bowl: type, bowlSkill: rng.int(46, 62) }, {});
    c.players[p.id] = p; T.bowls.push(p.id);
  }
  const k = trialPlayer(c, rng, { role: 'wk', label: 'Keeper-batter', trait: 'Safe hands, quick feet', bat: rng.int(48, 58), bowl: null, bowlSkill: 0 }, { trial: false, age: rng.int(22, 27) });
  k.team = c.club; k.contract = 3; c.players[k.id] = k; T.keeper = k.id;
  // the founder: in the squad from the start, on a contract that never ends, and never sold
  const kab = newPlayer({ ...KABIR, ai: { ...WEAK[0], honesty: 0.7, fire: 0.3, rattle: 0.4 } }, { age: 24, pot: 82, team: c.club, contract: 99, founder: true, app: { skin: 2, hair: 1, style: 'curly', beard: 'none', cut: 'curly' } });
  c.players[kab.id] = kab;
  c.trial = T;
}
// the picks: 4 batters and 5 bowlers from the trialists. They join; the others stay on the market (the auction sells them). The club has no money for its first auction.
export function signTrialists(c, batIds, bowlIds) {
  const T = c.trial;
  if (!T || batIds.length !== TRIAL_PICKS.bat || bowlIds.length !== TRIAL_PICKS.bowl) return false;
  if (!batIds.every(id => T.bats.includes(id)) || !bowlIds.every(id => T.bowls.includes(id)) || new Set([...batIds, ...bowlIds]).size !== batIds.length + bowlIds.length) return false;
  for (const id of [...T.bats, ...T.bowls]) c.players[id].trial = false;
  for (const id of [...batIds, ...bowlIds]) { const p = c.players[id]; p.team = c.club; p.contract = 3; }
  c.money = 0;
  c.lineup = null;
  c.trialDone = { bats: batIds, bowls: bowlIds };
  delete c.trial;
  startAuction(c);
  return true;
}
// the auction's pool must not include the trialists still being judged
const inTrial = p => !!p.trial;

// Your club's ground, in three levels: bigger crowds pay more at every home match. The Arena
// is for clubs out of Division 3.
export const STADIUMS = [null,
  { name: 'Community Ground', fans: '4,000', ticket: 0.1 },
  { name: 'Club Stadium', fans: '18,000', ticket: 0.2, cost: 2.5 },
  { name: 'Arena', fans: '45,000', ticket: 0.4, cost: 6, needs: 'd2' },
];
export const stadiumLevel = c => (c.custom ? c.custom.stadium || 1 : 0);
// what stops the next level (null: it can be built)
export function upgradeBlock(c) {
  const lv = stadiumLevel(c), next = STADIUMS[lv + 1];
  if (!lv || !next) return 'top';
  if (next.needs && divisionOf(c, c.club) === 'd3') return 'division';
  if (c.money < next.cost) return 'money';
  return null;
}
export function upgradeStadium(c) {
  if (upgradeBlock(c)) return false;
  const next = STADIUMS[stadiumLevel(c) + 1];
  c.money = round2(c.money - next.cost); book(c, 'out', 'buildings', next.cost);
  c.custom.stadium = stadiumLevel(c) + 1;
  setMyClub(c.custom);
  return true;
}

// ---------- the auction ----------
const inc = price => (price < 1 ? 0.1 : price < 3 ? 0.25 : 0.5);
export const RESERVE_PER_PLACE = 0.3; // $M a club keeps back for each place it still has to fill (aiMaxes; the auction report's squad risk)
export const openingPrice = p => Math.max(0.1, round2(value(p) * 0.5));
const squadSize = (c, teamId) => clubPlayers(c, teamId).length;
function aiMaxes(c, p) {
  const rng = makeRng(hashStr(`${c.seed}-${c.season}-${p.id}`));
  const out = {};
  for (const t of CLUBS) {
    if (t.id === c.club) continue;
    const n = squadSize(c, t.id);
    if (n >= MAX_SQUAD) { out[t.id] = 0; continue; }
    const reserve = Math.max(0, MIN_SQUAD - n - 1) * RESERVE_PER_PLACE;
    const free = c.budgets[t.id] - reserve;
    const need = n < MIN_SQUAD ? 1.25 : n < 12 ? 1 : 0.7;
    const homecoming = p.home === t.id ? 1.25 : 1; // a hero's old club wants him back
    out[t.id] = Math.max(0, Math.min(free, round2(value(p) * (0.75 + rng.next() * 0.6) * need * (p.heroId ? 1.2 : 1) * homecoming)));
  }
  return out;
}
export function startAuction(c) {
  const pool = Object.values(c.players).filter(p => !p.team && !p.retired && !inTrial(p)).sort((a, b) => value(b) - value(a));
  c.auction = { lots: pool.map(p => p.id), idx: 0, lot: null, results: [] };
  c.phase = 'auction';
  openLot(c);
}
function openLot(c) {
  const A = c.auction;
  while (A.idx < A.lots.length && c.players[A.lots[A.idx]].team) A.idx++;
  if (A.idx >= Math.min(A.lots.length, LOTS)) { A.lot = null; return; }
  const p = c.players[A.lots[A.idx]];
  A.lot = { pid: p.id, price: openingPrice(p), leader: null, maxes: aiMaxes(c, p) };
}
export const currentLot = c => c.auction?.lot || null;
export const nextBid = lot => (lot.leader ? round2(lot.price + inc(lot.price)) : lot.price);

// ---------- the auction report: what a lot would do for your squad (the auction screen) ----------
// Only existing measures: the squad rating is squads.js teamRating (best four batters, best three
// bowlers); the money a place still to fill needs is the AI clubs' own reserve.
const topAvg = (xs, n) => { const t = [...xs].sort((a, b) => b - a).slice(0, n); return t.length ? Math.round(t.reduce((a, b) => a + b, 0) / t.length) : 0; };
// Your squad as it stands; with `extra` (a player), as it would be with him signed.
export function squadNeeds(c, extra = null) {
  const pool = [...clubPlayers(c, c.club), ...(extra ? [extra] : [])];
  const bowlers = pool.filter(p => p.bowl);
  return {
    size: pool.length, needed: Math.max(0, MIN_SQUAD - pool.length), places: Math.max(0, MAX_SQUAD - pool.length),
    rating: teamRating(pool.map(enginePlayer)), bat: topAvg(pool.map(p => p.bat), 4), bowl: topAvg(bowlers.map(p => p.bowlSkill), 3),
    pace: bowlers.filter(p => !bowlType(p.bowl).spin).length, spin: bowlers.filter(p => bowlType(p.bowl).spin).length,
    allr: pool.filter(p => p.role === 'all').length,
  };
}
// The decision in four verdicts, each { label, tone: 'good' | 'ok' | 'warn' | 'bad', detail }, for the next bid on this lot.
export function assessLot(c, lot) {
  const p = c.players[lot.pid], bid = nextBid(lot), now = squadNeeds(c), after = squadNeeds(c, p);
  const gain = after.rating - now.rating;
  const fit = gain >= 3 ? ['Excellent', 'good'] : gain >= 1 ? ['Good', 'good'] : ['Depth', 'ok'];
  const ratio = bid / Math.max(0.1, value(p));
  const price = ratio < 0.8 ? ['Bargain', 'good'] : ratio <= 1.1 ? ['Fair', 'ok'] : ['Expensive', 'warn'];
  const left = round2(c.money - bid), needAfter = Math.max(0, MIN_SQUAD - (now.size + 1)), reserve = round2(needAfter * RESERVE_PER_PLACE);
  const cash = left < 0 ? [`-${money(-left)}`, 'bad'] : [money(left), left < reserve ? 'warn' : 'ok'];
  const risk = now.size >= MAX_SQUAD ? ['Full', 'bad'] : left < 0 ? ['Too dear', 'bad'] : left < reserve ? ['High', 'bad'] : needAfter > 0 && left < 2 * reserve ? ['Medium', 'warn'] : ['Low', 'good'];
  return {
    fit: { label: fit[0], tone: fit[1], detail: gain > 0 ? `Rating ${now.rating} → ${after.rating}` : `Rating stays ${now.rating}` },
    price: { label: price[0], tone: price[1], detail: `${Math.round(ratio * 100)}% of his worth` },
    cash: { label: cash[0], tone: cash[1], detail: left < 0 ? `Short by ${money(-left)}` : c.money > 0 ? `Uses ${Math.round(bid / c.money * 100)}% of your cash` : 'No cash' },
    risk: { label: risk[0], tone: risk[1], detail: now.size >= MAX_SQUAD ? 'Squad is full' : left < 0 ? 'Not enough money' : needAfter > 0 ? `Then ${needAfter} more to sign` : 'Squad complete' },
    now, after, bid, left,
  };
}
// ---------- what Chirp makes of the club's story ----------
// where the club started and where it is now, for the fans who remember (null before there is anything to remember)
export function journeyOf(c) {
  const from = c.chirp?.startDiv || c.history?.[0]?.div, now = c.club && divisionOf(c, c.club);
  return from && now ? { from: divisionName(from), div: divisionName(now), yrs: Math.max(1, c.history?.length || 0), yrsn: `${Math.max(1, c.history?.length || 0)} season${Math.max(1, c.history?.length || 0) === 1 ? '' : 's'}` } : null;
}
const notable = p => ovr(p) >= 72 || (p.stats?.all?.runs || 0) >= 60 || (p.stats?.all?.wkts || 0) >= 8;
// a post for a big signing (a few a season, so the feed is not all signings)
function chirpSigned(c, p, price, kind = null) {
  if (!c.chirp || c.phase === 'pick') return;
  const mem = memOf(c);
  mem.signs = mem.signs?.season === c.season ? mem.signs : { season: c.season, n: 0 };
  const type = kind || (ovr(p) >= 82 ? 'signedStar' : price >= 1.2 && ovr(p) < 70 ? 'signedOverpay' : price >= 1.2 ? 'signedBig' : p.age <= 20 && (p.pot || 0) >= 80 ? 'signedYoung' : ovr(p) >= 74 && price <= 0.4 ? 'signedBargain' : null);
  if (!type || mem.signs.n >= 3) { chirpStoryQuiet(c, { t: kind || 'signed', pid: p.id, price }); return; }
  mem.signs.n++;
  chirpStory(c, { t: type, pid: p.id, price, journey: journeyOf(c) });
}
// only the memory: the fans will remember him (who left, who came), but there is no post
function chirpStoryQuiet(c, ev) { if (c.chirp) { memOf(c).events = [...memOf(c).events, { ...ev, season: c.season }].slice(-40); if (ev.t === 'signed' || ev.t === 'scouted') delete memOf(c).former[ev.pid]; } }
// a player of mine leaves (his contract ended, he retired, he was let go): the fans remember, and say so if he mattered
function chirpLeft(c, p, kind) {
  if (!c.chirp) return;
  const mem = memOf(c);
  mem.lefts = mem.lefts?.season === c.season ? mem.lefts : { season: c.season, n: 0 };
  if (notable(p) && mem.lefts.n < 3) { mem.lefts.n++; chirpStory(c, { t: kind, pid: p.id, journey: journeyOf(c) }); } else chirpStoryQuiet(c, { t: kind === 'contractEnd' ? 'left' : kind, pid: p.id });
  mem.former[p.id] = { season: c.season, kind };
}
// at the start of the season: a good player whose deal is in its last season (a couple of posts, so the feed is not all contracts)
function chirpContracts(c) {
  if (!c.chirp || !c.club) return;
  let n = 0;
  for (const p of clubPlayers(c, c.club).sort((a, b) => ovr(b) - ovr(a))) {
    if (n >= 2 || ovr(p) < 76 || p.contract !== 1 || p.heroId) continue;
    n++; chirpStory(c, { t: 'contractWorry', pid: p.id, left: 1, journey: journeyOf(c) });
  }
}
// you let a player go
export function releasePlayer(c, id) {
  const p = c.players[id];
  if (!p || p.team !== c.club || p.founder) return false;   // (the founder is never let go)
  chirpLeft(c, p, 'released');
  p.team = null; p.contract = 0;
  return true;
}
// after the auction: a player who left us and joined another club (the fans notice)
function chirpPoached(c) {
  if (!c.chirp) return;
  const mem = memOf(c);
  let posts = 0;
  for (const [pid, f] of Object.entries(mem.former)) {
    const p = c.players[pid];
    if (!p || f.poached || !p.team || p.team === c.club || p.retired) continue;
    f.poached = true;
    if (posts < 2 && notable(p)) { posts++; chirpStory(c, { t: 'poached', pid, they: p.team, journey: journeyOf(c) }); }
  }
}
function sign(c, p, teamId, price, out = null) {
  const was = p.team;
  p.team = teamId;
  const rng = makeRng(hashStr(`${p.id}-${c.season}-c`));
  p.contract = p.age >= PEAK_AGE ? 1 : rng.int(1, 3);
  if (teamId === c.club) { c.money = round2(c.money - price); book(c, 'out', 'players', price); } else c.budgets[teamId] = round2(c.budgets[teamId] - price);
  c.auction?.results.push(out?.length ? { pid: p.id, team: teamId, price, out } : { pid: p.id, team: teamId, price });
  if (teamId === c.club && was !== c.club) chirpSigned(c, p, price);
}
// The rival clubs bid in a fixed order for each lot (seeded: the same career and lot always go the same way).
const bidOrder = (c, lot) => {
  const rng = makeRng(hashStr(`${c.seed}-${c.season}-${lot.pid}-order`));
  return Object.keys(lot.maxes).sort().map(t => [rng.next(), t]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
};
// A rival raises to `raise`: the next club in the order, after the last one who bid, whose limit allows it. A club whose limit is
// below it is out for this lot at the price it could not match (a club whose squad is full never bids). Null if none can: your bid stands.
function rivalRaise(c, lot, raise) {
  const order = bidOrder(c, lot), at = order.indexOf(lot.last);
  lot.out = lot.out || {};
  for (let k = 1; k <= order.length; k++) {
    const t = order[(at + k + order.length) % order.length];
    if (lot.out[t] != null || !(lot.maxes[t] > 0)) continue;
    if (lot.maxes[t] >= raise) return t;
    lot.out[t] = lot.price;
  }
  return null;
}
// The rival clubs for the screen, in their bidding order: leading, out (with the price they could not match), full (a full squad does not
// bid), or still in (they have not had to answer yet: their limits stay hidden until they drop out).
export function rivalsOf(c, lot) {
  return bidOrder(c, lot).map(team => (lot.leader === team ? { team, state: 'lead' }
    : lot.out?.[team] != null ? { team, state: 'out', at: lot.out[team] }
    : !(lot.maxes[team] > 0) ? { team, state: 'full' } : { team, state: 'in' }));
}
// You bid. Returns 'won' | 'outbid' | 'broke' | 'full' | 'rep' (he will not sign for a club of your standing).
export function bid(c) {
  const lot = c.auction.lot, p = c.players[lot.pid];
  if (squadSize(c, c.club) >= MAX_SQUAD) return 'full';
  if (repBlock(c, p)) return 'rep';
  const price = nextBid(lot);
  if (c.money < price) return 'broke';
  lot.price = price; lot.leader = c.club;
  // a rival raises if any club still can (the same limits as ever: you win exactly when none can)
  const raise = round2(price + inc(price)), rival = rivalRaise(c, lot, raise);
  if (rival) { lot.price = raise; lot.leader = rival; lot.last = rival; return 'outbid'; }
  sign(c, p, c.club, price, Object.entries(lot.out || {}).sort((x, y) => y[1] - x[1]));
  c.auction.idx++; openLot(c);
  return 'won';
}
// You let this one go: the AI clubs settle it between themselves (the keenest wins, at a step over the next keenest's limit).
// The sale keeps who was outbid and where, for the sold list.
export function pass(c) {
  const lot = c.auction.lot, p = c.players[lot.pid];
  const order = Object.entries(lot.maxes).sort((x, y) => y[1] - x[1]);
  const [top, top2] = order;
  let winner = null, price = lot.price;
  if (top && top[1] >= lot.price) {
    winner = top[0];
    price = Math.max(lot.price, Math.min(top[1], round2((top2?.[1] || 0) + inc(top2?.[1] || 0))));
  }
  if (winner) {
    const out = order.slice(1).filter(([, m]) => m >= openingPrice(p)).map(([team, m]) => [team, Math.min(m, round2(price))]);
    sign(c, p, winner, round2(price), out);
  } else c.auction.results.push({ pid: p.id, team: null, price: 0 });
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
  chirpPoached(c);
  startSeason(c);
}

// ---------- the season ----------
export function startSeason(c) {
  c.phase = 'season';
  c.league = newLeague(c.club, hashStr(`${c.seed}-league-${c.season}`), c.divisions[divisionOf(c, c.club)]);
  c.league.div = divisionOf(c, c.club);
  c.league.season = c.season;
  refreshRivals(c);   // (a new division has a new rival)
  for (const p of Object.values(c.players)) p.stats.season = blankStats();
  chirpContracts(c);
  setObjective(c);
}

// A simulated match between two AI clubs, ball by ball, so every player gets a scorecard. favour: a club that is stronger in it
// and must win (the match is played again, off the record, until it does: only the match that stands is written into the stats).
export function simCareerMatch(c, a, b, rng, favour = null) {
  let ia, ib, winner, tries = 0;
  do {
    ia = simInnings(c, a, b, rng, null, favour); ib = simInnings(c, b, a, rng, ia.runs + 1, favour);
    winner = ib.runs > ia.runs ? b : ib.runs < ia.runs ? a : rng.chance(0.5) ? a : b; // (a tie goes to a super over)
  } while (favour && (a === favour || b === favour) && winner !== favour && ++tries < 25);
  // (a result that would still not go their way after all that has its scores turned round: practically never)
  if (favour && (a === favour || b === favour) && winner !== favour) { [ia, ib] = [ib, ia]; winner = favour; }
  commitInnings(c, ia); commitInnings(c, ib);
  const la = lineupOf(c, a), lb = lineupOf(c, b);
  played(c, [...la.order, ...la.attack, ...lb.order, ...lb.attack].filter(Boolean).map(p => p.id));
  return { a, b, ia: stripInnings(ia), ib: stripInnings(ib), winner };
}
const stripInnings = ({ runs, wkts, balls, boundaries }) => ({ runs, wkts, balls, boundaries });
function lineupOf(c, teamId) {
  const pool = clubPool(c, teamId);
  const l = defaultLineup(teamId, clubHeroes(pool), {}, pool);
  const byId = id => pool.find(p => p.id === id);
  return { order: l.order.map(byId), attack: l.attack.map(byId) };
}
// The Thunder Strikers' dynasty: until you reach the Super League nobody can beat them, so they take the title every year and you
// build up to meeting them there. They are simply better in those matches (and win them, see simCareerMatch). Once you are in
// the Super League its matches are played as normal.
const DYNASTY = 'thunder';
const dynastyMatch = c => (a, b, rng) => simCareerMatch(c, a, b, rng, DYNASTY);
// One innings: two batters at the crease, as in the game: an odd number of runs and the end of an over change the strike, and a
// new batter comes in on strike when one is out. Its cards are only written into the stats by commitInnings.
function simInnings(c, batId, bowlId, rng, target = null, favour = null) {
  const L = lineupOf(c, batId), B = lineupOf(c, bowlId);
  // (a club whose bowlers have retired still bowls: its batters fill in, as part-timers)
  const attack = B.attack.filter(Boolean);
  const bowlers = attack.length ? attack : B.order.filter(Boolean).slice(0, 3).map(p => ({ ...p, bowlSkill: Math.min(p.bat, 55) - 10 }));
  const plan = overPlan(bowlers, CFG.balls / 6);
  let runs = 0, wkts = 0, balls = 0, boundaries = 0;
  let strike = 0, other = 1, next = 2;
  const last = L.order.length - 1;
  const bat = new Map(), bowl = new Map();
  const card = (m, id) => m.get(id) || (m.set(id, { runs: 0, balls: 0, fours: 0, sixes: 0, out: false, wkts: 0 }), m.get(id));
  while (balls < CFG.balls && wkts < CFG.wickets && (target == null || runs < target)) {
    const s = L.order[Math.min(strike, last)], bw = plan[Math.min(Math.floor(balls / 6), plan.length - 1)];
    balls++;
    const sc = card(bat, s.id), bc = card(bowl, bw.id);
    sc.balls++; bc.balls++;
    let d = (s.bat - bw.bowlSkill) / 100;
    if (favour) d += (batId === favour ? 0.1 : 0) - (bowlId === favour ? 0.1 : 0);
    if (s.ability === 'eagleEye') d += 0.05;
    if (bw.ability === 'mystery' || bw.ability === 'swingMaster') d -= 0.04;
    let x = 0;
    if (rng.chance(Math.max(0.03, Math.min(0.16, 0.075 - 0.08 * d)))) { wkts++; sc.out = true; bc.wkts++; strike = next++; }
    else {
      const r = rng.next();
      x = r < 0.32 - 0.2 * d ? 0 : r < 0.6 ? 1 : r < 0.73 ? 2 : r < 0.9 + 0.1 * d ? 4 : 6;
      runs += x; sc.runs += x; bc.runs += x;
      if (x === 4) { sc.fours++; boundaries++; }
      if (x === 6) { sc.sixes++; boundaries++; }
      if (x === 1) [strike, other] = [other, strike];
    }
    if (balls % 6 === 0) [strike, other] = [other, strike];   // (the end of an over: the other batter faces)
  }
  for (const p of L.order) if (p) card(bat, p.id); // the order all count as having played
  return { runs, wkts, balls, boundaries, bat, bowl, L };
}
// write an innings into the players' stats, form and the records
function commitInnings(c, { bat, bowl, L }) {
  for (const [id, s] of bat) recordBat(c, id, s);
  for (const [id, f] of bowl) recordBowl(c, id, f);
  for (const p of [...L.order, ...L.attack]) if (p) formFrom(c, c.players[p.id], bat.get(p.id), bowl.get(p.id));
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
  const ids = [], perf = new Map();
  for (const inn of summary.innings) {
    const bat = new Map(), bowl = new Map();
    for (const st of inn.battingCard()) if (st.id) bat.set(st.id, { runs: st.runs, balls: st.balls, fours: st.fours, sixes: st.sixes, out: st.out });
    for (const f of inn.bowlingCard()) bowl.set(f.id, { balls: f.balls, runs: f.runs, wkts: f.wkts });
    for (const [id, s] of bat) { recordBat(c, id, s); perf.set(id, { ...perf.get(id), bat: s }); }
    for (const [id, f] of bowl) { recordBowl(c, id, f); perf.set(id, { ...perf.get(id), bowl: f }); }
    for (const id of new Set([...bat.keys(), ...bowl.keys()])) formFrom(c, c.players[id], bat.get(id), bowl.get(id));
    ids.push(...bat.keys(), ...bowl.keys());
  }
  played(c, ids);
  const sixes = [...perf].reduce((n, [id, x]) => n + (c.players[id]?.team === c.club ? (x.bat?.sixes || 0) : 0), 0);
  const dealNotes = officeMatch(c, { won: summary.result.outcome === 'win', sixes });
  for (const p of clubPlayers(c, c.club)) p.fame = fameAfter(fameOf(p), perf.get(p.id), summary.result.outcome === 'win');   // the fans' love, for the jerseys (js/merch.js)
  if (summary.result.outcome === 'win') { const wb = round2(WIN_BONUS * (DIV_MONEY[divisionOf(c, c.club)] ?? 1)); c.money = round2(c.money + wb); book(c, 'in', 'wins', wb); }   // (the lower the division, the smaller the bonus: as with the prizes)
  const ups = clubPlayers(c, c.club).filter(p => ovr(p) > (before.get(p.id) ?? 99)).map(p => `⬆ ${p.name} ${before.get(p.id)} → ${ovr(p)}`);
  return [...ups, ...c.news.slice(newsAt), ...dealNotes];
}
// ---------- the club office: the books, the sponsors, the board ----------
// The books: every $M that comes in or goes out of the club is written down by season (office.led[season] = { in: {...}, out: {...} }).
export const INCOME = { prizes: 'Prizes & season sponsor', wins: 'Win bonuses', tickets: 'Ticket money', sponsors: 'Sponsor deals', merch: 'Merchandise', board: 'Board bonus' };
export const OUTGOING = { players: 'Players & scouts', buildings: 'Buildings & staff' };
export const office = c => (c.office ||= { led: {}, deal: null, pend: 0, objective: null, board: [], log: [] });
export function book(c, dir, cat, amount) {
  if (!amount || !c.club) return;
  const l = (office(c).led[c.season] ||= { in: {}, out: {} });
  l[dir][cat] = round3((l[dir][cat] || 0) + amount);
}
export const seasonBooks = (c, season = c.season) => office(c).led[season] || { in: {}, out: {} };
export const totalOf = o => Object.values(o).reduce((a, b) => a + b, 0);

// The sponsors: a deal lasts seven of your league matches. The better the division, the bigger the money. (Pennies are kept until they make $0.05M.)
export const DEAL = { MATCHES: 7, SCALE: { asl: 1, d2: 0.6, d3: 0.4 } };
export const SPONSORS = {
  steady: { name: 'Harbour Bank', tag: 'Steady', about: 'Pays something every match, whatever happens', per: 0.05, bonus: 0, goal: null },
  form: { name: 'Volt Drinks', tag: 'Form', about: 'A little each match and a big bonus if you win 4 of the 7', per: 0.02, bonus: 0.45, goal: { kind: 'wins', n: 4, text: 'Win 4 of the 7 matches' } },
  power: { name: 'Meteor Energy', tag: 'Risky', about: 'Nothing at all unless you hit 9 sixes in the 7 matches', per: 0, bonus: 0.9, goal: { kind: 'sixes', n: 9, text: 'Hit 9 sixes in the 7 matches' } },
};
export const dealScale = c => DEAL.SCALE[divisionOf(c, c.club)] ?? 1;
export const dealWorth = (c, id) => { const S = SPONSORS[id], k = dealScale(c); return { per: S.per * k, bonus: S.bonus * k, top: (S.per * DEAL.MATCHES + S.bonus) * k }; };
export function signSponsor(c, id) {
  const o = office(c);
  if (!SPONSORS[id] || o.deal) return false;
  o.deal = { id, played: 0, wins: 0, sixes: 0, paid: 0 };
  return true;
}
function payOut(c, amount, cat) {
  const o = office(c);
  o.pend = round3((o.pend || 0) + amount);
  const whole = Math.floor(o.pend * 20 + 1e-9) / 20;
  if (whole > 0) { c.money = round2(c.money + whole); o.pend = round3(o.pend - whole); book(c, 'in', cat, whole); if (o.deal) o.deal.paid = round3(o.deal.paid + whole); }
}
// one of your league matches is over: the deal runs on
export function officeMatch(c, { won, sixes }) {
  const o = office(c), d = o.deal, notes = [];
  if (!d) return notes;
  const S = SPONSORS[d.id], w = dealWorth(c, d.id);
  d.played++; if (won) d.wins++; d.sixes += sixes || 0;
  payOut(c, w.per, 'sponsors');
  if (d.played >= DEAL.MATCHES) {
    const got = S.goal ? (S.goal.kind === 'wins' ? d.wins : d.sixes) >= S.goal.n : false;
    if (S.goal && got) payOut(c, w.bonus, 'sponsors');
    o.log = [...(o.log || []), { season: c.season, id: d.id, got: !S.goal || got, paid: d.paid }].slice(-6);
    notes.push(`📣 The ${S.name} deal is over: ${money(d.paid)} paid${S.goal ? (got ? ', and you earned the bonus!' : `, and the bonus was missed (${S.goal.kind === 'wins' ? d.wins + ' wins' : d.sixes + ' sixes'})`) : ''}`);
    o.deal = null;
  }
  return notes;
}
// The board: each season it sets a target for the table. Reach it and it pays a bonus.
export function setObjective(c) {
  if (!c.club || !c.league) return null;
  const div = divisionOf(c, c.club), ids = c.divisions[div];
  const rank = [...ids].sort((a, b) => clubRating(c, b) - clubRating(c, a)).indexOf(c.club) + 1;
  const target = Math.max(2, Math.ceil(rank * 0.6));
  return (office(c).objective = { season: c.season, div, rank, target, reward: round2(0.5 * (DIV_MONEY[div] ?? 1)) });
}
export const objectiveOf = c => { const o = office(c); if (!o.objective && c.league && c.phase === 'season') setObjective(c); return o.objective; };
export function settleObjective(c, pos) {
  const o = office(c), ob = o.objective;
  if (!ob) return [];
  const met = pos <= ob.target;
  if (met) { c.money = round2(c.money + ob.reward); book(c, 'in', 'board', ob.reward); }
  o.board = [...(o.board || []), { season: ob.season, div: ob.div, target: ob.target, pos, met, reward: ob.reward }].slice(-6);
  o.objective = null;
  return [met ? `🏛️ The board is pleased: you finished ${pos}${['st', 'nd', 'rd'][pos - 1] || 'th'}, inside their target of ${ob.target}. A bonus of ${money(ob.reward)}.` : `🏛️ The board wanted a top ${ob.target} finish. You came ${pos}${['st', 'nd', 'rd'][pos - 1] || 'th'}: no bonus this year.`];
}
// who is on a short contract (seasons left; the soonest to go first)
export const contractList = c => clubPlayers(c, c.club).filter(p => p.contract < 50).sort((a, b) => a.contract - b.contract || ovr(b) - ovr(a));

// ---------- a club's standing: which players will sign for it ----------
// The best players only sign for clubs with the standing: none rated 80 or more for a Division 3 club, a few for Division 2 (up to 84), any for the top division.
// (players you already have stay, whatever happens)
export const REP_CAP = { asl: 99, d2: 84, d3: 79 };
export const repCap = c => REP_CAP[divisionOf(c, c.club)] ?? 99;
export function repBlock(c, p) {
  const cap = repCap(c);
  return ovr(p) > cap ? `Players rated ${cap + 1} or more will not sign for a ${divisionName(divisionOf(c, c.club))} club` : null;
}

// ---------- the training ground's view of the club (js/training.js) ----------
// the coaches a player can learn from: batters from a batting coach, bowlers from a pace or a spin coach, all-rounders from either
function coachKinds(p) {
  const k = [];
  if (p.role === 'bat' || p.role === 'wk' || p.role === 'all') k.push('bat');
  if (p.role === 'bowl' || p.role === 'all') k.push(bowlType(p.bowl).spin ? 'spin' : 'pace');
  return k;
}
export const trainingRoster = c => new Map(clubPlayers(c, c.club).map(p => [p.id, { name: p.name, ovr: ovr(p), age: p.age, pot: p.pot, kinds: coachKinds(p) }]));

// ---------- the merchandise factory's view of the club (js/merch.js) ----------
export const fameOf = p => p.fame ?? startFame(ovr(p));
// the players under contract: id -> { fame, name }
export const merchRoster = c => new Map(clubPlayers(c, c.club).map(p => [p.id, { fame: fameOf(p), name: p.name }]));
// the jerseys a day the fans want, in all: your ground's size and your followers on Chirp
export const merchDemand = c => 150 + (+String(STADIUMS[Math.max(1, stadiumLevel(c))]?.fans || '4000').replace(/\D/g, '')) / 40 + (c.chirp?.fans || 0) / 30;
// the league matches left in a player's contract (the season he is in, and the full seasons after it)
export function matchesLeft(c, p) {
  const per = c.league?.rounds?.length || 14, now = c.league && c.league.stage === 'group' ? Math.max(0, per - c.league.round) : 0;
  return now + Math.max(0, (p.contract || 1) - 1) * per;
}
// After your league match: play the rest of the round, and close the season when it's over.
export function afterLeagueMatch(c, summary) {
  const f = nextFixture(c.league), home = f && f.home === c.club && stadiumLevel(c);
  const notes = recordPlayerMatch(c, summary);
  // your own ground's gate money
  if (home) { const tk = STADIUMS[home].ticket; c.money = round2(c.money + tk); book(c, 'in', 'tickets', tk); notes.push(`🎟️ ${STADIUMS[home].fans} fans at ${c.custom.ground}: +${money(tk)} in ticket money`); }
  notes.push(...scoutReports(c));
  notes.push(...groundWeek(c));
  const result = playerResult(c.league, summary);
  notes.push(...advance(c.league, result, (a, b, rng) => simCareerMatch(c, a, b, rng)));
  // the rivals have their say (a rival who beat you, or whom you beat; your nemesis, watching)
  const top = table(c.league)[0]?.id === c.club ? 1 : 0;
  notes.push(...afterMatch(c, summary.oppTeam.id, result.winner === c.club, id => clubRating(c, id), top).map(messageNote));
  // Chirp: the press and a fan post about it, and your club's followers and buzz move
  const mine = summary.innings.find(i => i.side === 'player'), theirs = summary.innings.find(i => i.side === 'ai'), won = result.winner === c.club, opp = summary.oppTeam.id;
  const gained = afterMatchPopularity(c, { won, derby: !!rivalKind(c, opp), upset: clubRating(c, opp) > clubRating(c, c.club) + 3, bigWin: Math.abs(mine.runs - theirs.runs) >= 25 });
  const story = storyOf(c, { won, first: summary.innings[0], second: summary.innings[1], tiebreak: summary.result.tiebreak });
  chirpAfterMatch(c, summary, { won, opp, derby: !!rivalKind(c, opp), mine: `${mine.runs}/${mine.wkts}`, theirs: `${theirs.runs}/${theirs.wkts}`, story, journey: journeyOf(c) });
  notes.push(`📈 ${gained >= 0 ? '+' : '−'}${compact(Math.abs(gained))} followers on Chirp`);
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
  for (const d of DIV_ORDER) if (d !== myDiv) leagues[d] = simLeague(c.divisions[d], hashStr(`${c.seed}-${d}-${c.season}`), d === 'asl' ? dynastyMatch(c) : (a, b, rng) => simCareerMatch(c, a, b, rng));
  for (const d of DIV_ORDER) {
    const ord = d === myDiv ? order : finalOrder(leagues[d]), k = DIV_MONEY[d];
    ord.forEach((id, i) => {
      const prize = round2(PRIZE[i] * k);
      if (id === c.club) { const fans = sponsorBonus(c); c.money = round2(c.money + prize + SPONSOR + fans); book(c, 'in', 'prizes', prize + SPONSOR + fans); notes.push(`You finished ${i + 1}${['st', 'nd', 'rd'][i] || 'th'} in ${divisionName(d)}: ${money(prize)} prize money + ${money(SPONSOR)} sponsorship${fans > 0 ? ` + ${money(fans)} from your ${compact(c.chirp.fans)} fans` : ''}`); }
      else c.budgets[id] = round2((c.budgets[id] || 0) + prize + AI_INCOME * k);
    });
  }
  notes.push(...settleObjective(c, order.indexOf(c.club) + 1));
  c.titles[leagues.asl.champion] = (c.titles[leagues.asl.champion] || 0) + 1;
  if (myDiv !== 'asl' && leagues.asl.champion === DYNASTY) notes.push(`⚡ ${teamById(DYNASTY).name} win the Asian Super League again: title number ${c.titles[DYNASTY]}. They look unbeatable. Climb to the Super League and take them on!`);
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
// what the fans remember when a big moment comes: the club's own seasons, from c.history (the last entry is the season just played)
export function clubMemory(c, ev) {
  const past = c.history.slice(0, -1), first = past[0], nth = n => `${n}${['th', 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10] || 'th'}`;
  if (!first) return '';
  if (ev === 'relegated' && past.at(-1)?.promoted) return ' They went up only a year ago.';
  if (ev === 'champion' && first.div !== c.history.at(-1).div) return ` Remember when they started in ${divisionName(first.div)}, finishing ${nth(first.pos)}? Look at them now.`;
  if (ev === 'champion' && first.pos > 4) return ` Their first season ended ${nth(first.pos)}. Look at them now.`;
  if (ev === 'promoted' && past.length >= 2 && past.every(p => p.div === first.div)) return ` ${past.length + 1} seasons in the same division, and finally they are going up.`;
  return '';
}
function applyMoves(c, notes) {
  const M = c.moves, D = c.divisions;
  const move = (id, from, to) => { D[from] = D[from].filter(x => x !== id); D[to] = [...D[to], id]; };
  move(M.d3up, 'd3', 'd2'); move(M.d2down, 'd2', 'd3');
  move(M.d2up, 'd2', 'asl'); move(M.aslDown, 'asl', 'd2');
  const h = c.history.at(-1);
  if (M.d3up === c.club || M.d2up === c.club) { h.promoted = divisionOf(c, c.club); notes.push(`⬆️ PROMOTED! Next season ${teamById(c.club).name} play in ${divisionName(h.promoted)}.`); }
  if (M.d2down === c.club || M.aslDown === c.club) { h.relegated = divisionOf(c, c.club); notes.push(`⬇️ Relegated. Next season ${teamById(c.club).name} play in ${divisionName(h.relegated)}.`); }
  // your nemesis has a word on where you are going
  const ev = h.promoted ? 'promoted' : h.relegated ? 'relegated' : h.pos === 1 ? 'champion' : null;
  if (ev) { const m = say(c, 'nemesis', ev, nemesisOf(c)); if (m) notes.push(messageNote(m)); }
  if (ev) {
    seasonPopularity(c, ev);
    const club = teamById(c.club).name;
    const text = (ev === 'promoted' ? `PROMOTED! ${club} are heading up to ${divisionName(h.promoted)} next season. 🎉` : ev === 'relegated' ? `${club} are relegated to ${divisionName(h.relegated)}. They will need a big rebuild. 💔` : `CHAMPIONS! ${club} win the title in ${divisionName(h.div)}! 🏆`) + clubMemory(c, ev);
    chirpMilestone(c, text, ev, { div: divisionName(h.promoted || h.relegated || h.div), pos: `${h.pos}${['th', 'st', 'nd', 'rd'][h.pos % 100 > 10 && h.pos % 100 < 14 ? 0 : h.pos % 10] || 'th'}`, journey: journeyOf(c) });
  }
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
  if (won) chirpMilestone(c, `SAFE! ${teamById(c.club).name} win the relegation play-off and stay in the Super League. 🛡️`, 'survivedPlayoff', { div: divisionName('asl'), journey: journeyOf(c) });
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
    const mine = p.team === c.club;
    // the training ground: the points his coach earned him this season become rating (on top of the natural growth, up to his potential)
    if (mine && c.training) {
      const n = seasonGain(c.training, p.id, { ovr: ovr(p), age: p.age, pot: p.pot });
      if (n && grow(c, p, n)) c.news.push(`💪 ${p.name} trained hard: +${n} rating`);
    }
    if (!p.heroId && p.age >= 36 && rng.chance(0.35 + (p.age - 36) * 0.3)) {
      if (mine) chirpLeft(c, p, 'retired');
      p.retired = true; p.team = null; p.retiredIn = c.season;
      c.news.push(`👋 ${p.name} retires at ${p.age}`);
      continue;
    }
    if (p.team && --p.contract <= 0) { if (mine) chirpLeft(c, p, 'contractEnd'); p.team = null; p.contract = 0; }
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
