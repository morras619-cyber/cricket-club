// Career mode: Super League seasons. You pick a club (the giants unlock in later seasons),
// bid for players in a pre-season auction against the AI clubs, play the league, and earn
// prize money by where you finish. Players have ages, ratings and a potential they can grow
// into (until 33), young players arrive every season, the best become stars with an ability,
// and every run and wicket goes into records that never reset. Pure data and functions:
// the state lives in the profile (profile.career).
import { CFG } from './config.js';
import { makeRng } from './rng.js';
import { TEAMS, teamById } from './teams.js';
import { HEROES, heroById } from './heroes.js';
import { roster, heroPlayer, defaultLineup, overPlan, bowlType, ovr, teamRating, WEAK, BOWL_TYPES } from './squads.js';
import { newLeague, advance, playerResult, table, finish } from './tournament.js';
import { NATIONS, pickNation } from './nations.js';

export const PEAK_AGE = 33;           // no growth from this age
export const MIN_SQUAD = 10, MAX_SQUAD = 14;
export const START_MONEY = 3;          // $M in your first season
export const SPONSOR = 1;              // $M every season, whatever happens
export const WIN_BONUS = 0.4;          // $M per league win
export const PRIZE = [10, 7, 5, 4.5, 3.5, 3, 2.5, 2]; // $M by final position
export const STAR_OVR = 86;            // a regular who gets here becomes a star
const AI_BUDGET = { 1: 6, 2: 8, 3: 10, 4: 13 };
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
export const isUnlocked = (team, season) => team.tier <= season;
export const unlockSeason = team => team.tier;
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
    budgets: {}, titles: {}, history: [], records: { hs: [], bb: [] }, news: [], lineup: null, youthNo: 0 };
  for (const t of TEAMS) {
    c.budgets[t.id] = AI_BUDGET[t.tier];
    for (const r of roster(t.id)) {
      const pr = makeRng(hashStr(r.id) ^ seed);
      const age = pr.int(19, 35);
      const main = Math.max(...primary(r).map(k => r[k]));
      const pot = Math.min(95, main + (age <= 22 ? pr.int(6, 16) : age <= 26 ? pr.int(2, 6) : age < PEAK_AGE ? pr.int(0, 2) : 0));
      const { hero, ...rest } = r;
      c.players[r.id] = newPlayer(rest, { age, pot, team: t.id, contract: pr.int(1, 3) });
    }
  }
  for (const h of HEROES) {
    const { hero, ...rest } = heroPlayer(h);
    const main = Math.max(...primary(rest).map(k => rest[k]));
    c.players[h.id] = newPlayer(rest, { heroId: h.id, age: rng.int(25, 31), pot: Math.min(97, main + 2), team: null, contract: 0, home: teamOfStar(h.id) });
  }
  youthIntake(c, rng, 6);
  return c;
}
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
    { age: rng.int(17, 20), pot, team: null, contract: 0, youth: true });
    c.players[id] = p;
    out.push(p);
  }
  return out;
}

// Careers saved before players had countries: the regulars take their new names and
// nations from the squads, heroes get theirs, and older academy graduates get one.
export function migrateCareer(c) {
  if (!c || c.nations) return c;
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
  if (!isUnlocked(t, c.season)) return false;
  if (c.club !== teamId) c.lineup = null;
  c.club = teamId;
  startAuction(c);
  return true;
}

// ---------- the auction ----------
const inc = price => (price < 1 ? 0.1 : price < 3 ? 0.25 : 0.5);
const squadSize = (c, teamId) => clubPlayers(c, teamId).length;
function aiMaxes(c, p) {
  const rng = makeRng(hashStr(`${c.seed}-${c.season}-${p.id}`));
  const out = {};
  for (const t of TEAMS) {
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
  for (const t of TEAMS) {
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
  c.league = newLeague(c.club, hashStr(`${c.seed}-league-${c.season}`));
  c.league.season = c.season;
  for (const p of Object.values(c.players)) p.stats.season = blankStats();
}

// A simulated match between two AI clubs, ball by ball, so every player gets a scorecard.
export function simCareerMatch(c, a, b, rng) {
  const ia = simInnings(c, a, b, rng), ib = simInnings(c, b, a, rng, ia.runs + 1);
  const la = lineupOf(c, a), lb = lineupOf(c, b);
  played(c, [...la.order, ...la.attack, ...lb.order, ...lb.attack].filter(Boolean).map(p => p.id));
  const winner = ib.runs > ia.runs ? b : ib.runs < ia.runs ? a : ia.boundaries === ib.boundaries ? null : ia.boundaries > ib.boundaries ? a : b;
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
  const L = c.league, order = finalOrder(L);
  const notes = [];
  order.forEach((id, i) => {
    const prize = PRIZE[i];
    if (id === c.club) { c.money = round2(c.money + prize + SPONSOR); notes.push(`You finished ${i + 1}${['st', 'nd', 'rd'][i] || 'th'}: ${money(prize)} prize money + ${money(SPONSOR)} sponsorship`); }
    else c.budgets[id] = round2(c.budgets[id] + prize + AI_INCOME);
  });
  c.titles[L.champion] = (c.titles[L.champion] || 0) + 1;
  const season = Object.values(c.players);
  const top = (f) => season.filter(p => p.stats.season.m).sort((a, b) => f(b) - f(a))[0];
  const orange = top(p => p.stats.season.runs), purple = top(p => p.stats.season.wkts * 1000 - p.stats.season.bruns);
  c.history.push({ season: c.season, champion: L.champion, runnerUp: order[1], club: c.club, pos: order.indexOf(c.club) + 1,
    orange: orange && { pid: orange.id, runs: orange.stats.season.runs }, purple: purple && { pid: purple.id, wkts: purple.stats.season.wkts } });
  c.phase = 'done';
  return notes;
}

// The off-season: everyone a year older, the young grow, the old fade and retire,
// contracts end (those players go into the auction), and new teenagers arrive.
export function nextSeason(c) {
  const rng = makeRng(hashStr(`${c.seed}-off-${c.season}`));
  c.news = [];
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
  c.phase = 'pick';
  c.league = null; c.auction = null;
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
