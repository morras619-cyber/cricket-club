#!/usr/bin/env node
// The economy simulation: a career played in fast-forward with the game's real code (career.js, merch.js, training.js, academy.js, stamina.js, pacing.js),
// on a simulated clock, by a diligent and sensible player who opens every building at every check-in. Three kinds of player:
//   casual   one check-in a day (19:00)          regular  four check-ins (8, 13, 18, 22)          binge  a check-in every two hours from 8:00 to 22:00
// Your own matches are played by the computer (the same simulator as the other clubs'), so a result here is "an average player's", not yours.
// usage: node tools/sim_economy.mjs [days=120] [seeds=3] [profile]      (one player type alone: casual, regular or binge; all three by default)
import { makeRng } from '../js/rng.js';
import * as C from '../js/career.js';
import * as MF from '../js/merch.js';
import * as TG from '../js/training.js';
import * as AC from '../js/academy.js';
import * as MD from '../js/stamina.js';
import * as PC from '../js/pacing.js';
import { nextFixture } from '../js/tournament.js';
import { teamById } from '../js/teams.js';
import { ovr } from '../js/squads.js';

const DAYS = +process.argv[2] || 120, SEEDS = +process.argv[3] || 3, ONLY = process.argv[4] || null;
const HOUR = 3600000, DAY = 24 * HOUR, T0 = 1.7e12;
const SNAPS = [7, 30, 60, 90, 120, 180, 365].filter(d => d <= DAYS);
const PROFILES = {
  casual: [19],
  regular: [8, 13, 18, 22],
  binge: [8, 10, 12, 14, 16, 18, 20, 22],
};

const bankOf = c => ({
  spend(k) { const need = Math.ceil(k / 50 - 1e-9) * 0.05; if (c.money + 1e-9 < need) return 0; c.money = Math.round((c.money - need) * 20) / 20; C.book(c, 'out', 'buildings', need); return Math.round(need * 1000); },
  give(k) { const g = Math.floor(k / 50) * 0.05; c.money = Math.round((c.money + g) * 20) / 20; C.book(c, 'in', 'merch', g); return Math.round(g * 1000); },
});
const mctx = (c, now) => ({ now, trusted: true, squad: C.merchRoster(c), demand: C.merchDemand(c), bank: bankOf(c) });
const tctx = (c, now) => ({ now, trusted: true, squad: C.trainingRoster(c), bank: bankOf(c) });
const actx = (c, now) => ({ now, trusted: true, bank: bankOf(c), has: id => !!c.players[id]?.prospect, make: t => C.makeProspect(c, t) });
const dctx = (c, now) => ({ now, trusted: true, bank: bankOf(c), has: id => c.players[id]?.team === c.club, nameOf: id => c.players[id]?.name });

function newClub(seed) {
  const c = C.newCareer(seed);
  C.createClub(c, { name: 'Sim FC', short: 'SIM', suit: '#1f5fd6', trim: '#ffd23f', emblem: 0, ground: 'Sim Ground', crest: null, chant: 'default', pitch: 'flat' }, { trials: true });
  const T = c.trial;
  C.signTrialists(c, T.bats.slice(0, 4), T.bowls.slice(0, 5));
  C.finishAuction(c);
  return c;
}

// one of your league matches, played by the computer, written through the game's own money and stats code
function playMatch(c, rng) {
  const f = c.phase === 'playoff' ? c.playoff : nextFixture(c.league), me = c.club, opp = f.opp;
  const a = f.home === me ? me : opp, b = a === me ? opp : me, raw = {};
  const res = C.simCareerMatch(c, a, b, rng, null, raw);
  const mk = (inn, bats) => {
    const mine = bats === me, side = mine ? 'player' : 'ai', energy = {};
    // the stamina each of my players used: a batter about 1.2 a ball, a bowler about 3.5 a ball
    if (mine) for (const [id, s] of inn.bat) energy[id] = C.fitnessOf(c, id) - 1.2 * s.balls;
    else for (const [id, s] of inn.bowl) if (c.players[id]?.team === me) energy[id] = C.fitnessOf(c, id) - 3.5 * s.balls;
    return { side, runs: inn.runs, wkts: inn.wkts, balls: inn.balls, log: Array.from({ length: inn.boundaries }, () => '4'), energy,
      battingCard: () => [...inn.bat].map(([id, s]) => ({ id, ...s })), bowlingCard: () => [...inn.bowl].map(([id, x]) => ({ id, balls: x.balls, runs: x.runs, wkts: x.wkts })) };
  };
  const summary = { mode: 'career', oppTeam: teamById(opp), result: { outcome: res.winner === me ? 'win' : 'loss', tiebreak: false }, innings: [mk(raw.ia, a), mk(raw.ib, b)], home: f.home };
  c.phase === 'playoff' ? C.afterPlayoff(c, summary) : C.afterLeagueMatch(c, summary);
}

// the auction at the start of a season: bid for what would make the side better, within the money and the club's standing
function auction(c) {
  const me = c.club, rng = makeRng(c.season * 977 + 5);
  const keep = 0.3 + MF.wagePerDay(c.merch || { staff: [], machines: 0 }) / 1000 * 3;
  while (c.auction.lot) {
    const lot = c.auction.lot, p = c.players[lot.pid], squad = C.clubPlayers(c, me).sort((x, y) => ovr(y) - ovr(x));
    const floor = squad.length >= 11 ? ovr(squad[10]) : 0, budget = Math.max(0, c.money - keep);
    const want = squad.length < C.MAX_SQUAD && !C.repBlock(c, p) && ovr(p) > floor + 2 && C.nextBid(lot) <= budget;
    if (!want) { C.pass(c); continue; }
    const cap = Math.min(budget, C.value(p) * 1.1);
    let r;
    do { r = C.bid(c); } while (r === 'outbid' && c.auction.lot && C.nextBid(c.auction.lot) <= cap && c.money >= C.nextBid(c.auction.lot) && (r = 'again'));
    if (r === 'outbid' || r === 'again') { if (c.auction.lot === lot) C.pass(c); }
    else if (r !== 'won') { if (c.auction.lot === lot) C.pass(c); }
    void rng;
  }
  C.finishAuction(c);
}

function manage(c, now, rng) {
  const bank = bankOf(c), reserve = () => 0.3 + (MF.wagePerDay(c.merch || { staff: [], machines: 0 }) + (c.training ? TG.wagePerDay(c.training) : 0) + (c.medical ? MD.medWagePerDay(c.medical) : 0)) / 1000 * 3;
  const afford = cost => c.money - cost >= reserve();
  // the factory
  c.merch ||= MF.freshMerch(now);
  const m = c.merch, want = { 1: ['designer', 'printer'], 2: ['designer', 'printer', 'printer', 'printer', 'packer'], 3: ['designer', 'designer', 'printer', 'printer', 'printer', 'printer', 'printer', 'packer', 'packer'] }[PC.lookOf(m.level)];
  for (const role of want) { const have = MF.staffOf(m, role).length, need = want.filter(x => x === role).length; if (have < need) MF.hire(m, role); }
  if (m.level >= 2 && m.machines < PC.levelRow(MF.MERCH.LEVELS, m.level).machines && afford(0.3)) MF.buyMachine(m, mctx(c, now));
  if (MF.staffOf(m, 'printer').length && MF.staffOf(m, 'designer').length) {
    const dm = MF.demandMap(m, mctx(c, now)), top = [...dm].sort((x, y) => y[1] - x[1]).slice(0, 3).map(x => x[0]);
    for (const pid of top) { if (m.queue.length >= 4) break; for (let q = MF.maxOrder(m); q >= 5; q = Math.floor(q / 2)) if (MF.order(m, pid, q, mctx(c, now)).ok) break; }
  }
  // sponsors
  const o = C.office(c); if (!o.deal) C.signSponsor(c, 'steady');
  // training
  c.training ||= TG.freshTraining(now);
  const t = c.training, kinds = { 1: ['bat', 'pace'], 2: ['bat', 'pace', 'spin'], 3: ['bat', 'pace', 'spin', 'bat'] }[PC.lookOf(t.level)];
  kinds.forEach((k, i) => { if (t.coaches.filter(x => x.kind === k).length < kinds.slice(0, i + 1).filter(x => x === k).length) TG.hire(t, k); });
  const roster = C.trainingRoster(c);
  for (let i = 0; i < t.slots.length; i++) if (!t.slots[i]) {
    const cand = [...roster].filter(([id, p]) => TG.canLearn(p) && !t.slots.includes(id)).sort((x, y) => (y[1].pot - y[1].ovr) - (x[1].pot - x[1].ovr))[0];
    if (cand) TG.assign(t, i, cand[0], tctx(c, now));
  }
  // the academy
  c.academy ||= AC.freshAcademy(now);
  const a = c.academy;
  for (const p of C.prospectsOf(c)) {
    if (!a.revealed[p.id] && !a.drills[p.id]) AC.startDrill(a, p.id, actx(c, now));
    if (p.age >= AC.ACAD.PLAY_AGE) {
      const keepHim = a.revealed[p.id] && (p.academy.tier >= 1 || ovr(p) >= 45);
      if (keepHim && C.clubPlayers(c, c.club).length < C.MAX_SQUAD) C.promoteProspect(c, p.id); else C.sellProspect(c, p.id);
    }
  }
  if (afford(0.2) && AC.placesUsed(a) < PC.levelRow(AC.ACAD.LEVELS, a.level).slots) AC.startTrip(a, rng.pick(['africa', 'europe', 'namerica', 'samerica', 'oceania']), 24, actx(c, now));
  // the medical centre
  c.medical ||= MD.freshMedical();
  const md = c.medical;
  while (md.physios.length < PC.levelRow(MD.MED.LEVELS, md.level).physios) if (!MD.hirePhysio(md).ok) break;
  for (const p of C.clubPlayers(c, c.club).sort((x, y) => MD.fitOf(md, x.id) - MD.fitOf(md, y.id))) {
    const free = md.beds.findIndex(x => !x);
    if (free < 0) break;
    if (MD.fitOf(md, p.id) < 85 || MD.isKnocked(md, p.id)) MD.putInBed(md, free, p.id, dctx(c, now));
  }
  // upgrades: the finished ones are settled, then the cheapest level any building can have goes up, keeping a reserve (one builder; a second is never bought here)
  const bctx = { now, trusted: true, bank: bankOf(c), level: id => (id === 'stadium' ? C.stadiumLvl(c) : c[id]?.level || 0), blocked: (id, to) => (id === 'stadium' ? C.stadiumBlocked(c, to) : null),
    apply: (id, lv) => { if (id === 'stadium') C.setStadiumLevel(c, lv); else if (id === 'merch') MF.setLevel(m, lv); else if (id === 'training') TG.setLevel(t, lv); else if (id === 'academy') AC.setLevel(a, lv); else MD.medSetLevel(md, lv); } };
  for (const j of PC.settleBuilds(c, bctx)) c.upLog = [...(c.upLog || []), `${j.id}${j.to}@${Math.round((now - T0) / DAY)}`];
  const options = PC.IDS.filter(id => !PC.whyNot(c, id, bctx)).map(id => [id, PC.costOf(id, bctx.level(id) + 1)]).sort((x, y) => x[1] - y[1]);
  for (const [id, cost] of options) if (afford(cost)) { PC.startBuild(c, id, bctx); break; }
}

const tot = c => { const t = { in: {}, out: {} }; for (const l of Object.values(C.office(c).led)) for (const d of ['in', 'out']) for (const [k, v] of Object.entries(l[d])) t[d][k] = (t[d][k] || 0) + v; return t; };
const sum = o => Object.values(o).reduce((a, b) => a + b, 0);

function run(profile, seed) {
  const c = newClub(seed), rng = makeRng(seed * 31 + 7), hours = PROFILES[profile];
  let now = T0; c.pace = PC.freshPace(now); c.build = PC.freshBuild();
  const snaps = {}, hist = [];
  let matches = 0, last = tot(c);
  for (let day = 1; day <= DAYS; day++) {
    for (const h of hours) {
      now = T0 + (day - 1) * DAY + h * HOUR;
      // everything runs on the clock
      PC.refill(c.pace, now, true);
      if (c.merch) MF.tick(c.merch, mctx(c, now));
      if (c.training) TG.tick(c.training, tctx(c, now));
      if (c.academy) AC.tick(c.academy, actx(c, now));
      if (c.medical) MD.medTick(c.medical, dctx(c, now));
      if (c.merch && c.merch.till >= 50) MF.collect(c.merch, mctx(c, now));
      // the season turns over
      if (c.phase === 'done') C.nextSeason(c);
      if (c.phase === 'scouts') C.finishScouts(c);
      if (c.phase === 'auction') auction(c);
      // the matches the meter allows
      let guard = 0;
      while ((c.phase === 'season' || c.phase === 'playoff') && PC.spend(c.pace, now, true) && guard++ < 6) {
        playMatch(c, rng); matches++;
        if (c.medical && !c.academy) void 0;
        if (c.phase === 'done' || c.phase === 'scouts' || c.phase === 'auction') break;
      }
      manage(c, now, rng);
    }
    if (SNAPS.includes(day)) {
      const t = tot(c), d = { in: {}, out: {} };
      for (const k of ['in', 'out']) for (const key of new Set([...Object.keys(t[k]), ...Object.keys(last[k])])) d[k][key] = (t[k][key] || 0) - (last[k][key] || 0);
      last = t;
      const squad = C.clubPlayers(c, c.club).sort((x, y) => ovr(y) - ovr(x)), top11 = squad.slice(0, 11);
      snaps[day] = {
        money: c.money, matches, season: c.season, div: C.divisionOf(c, c.club), rating: C.clubRating(c, c.club),
        best: squad[0] ? ovr(squad[0]) : 0, avg11: top11.length ? top11.reduce((a, p) => a + ovr(p), 0) / top11.length : 0, n70: squad.filter(p => ovr(p) >= 70).length, n80: squad.filter(p => ovr(p) >= 80).length,
        inc: d.in, out: d.out, levels: `F${c.merch.level} T${c.training.level} A${c.academy.level} M${c.medical.level} S${C.stadiumLvl(c)} club${PC.clubLevel(PC.buildOf(c).xp)}`, titles: c.history.filter(h => h.pos === 1).length,
        merchSold: c.merch.sold, prospects: C.prospectsOf(c).length, promoted: c.history.filter(h => h.promoted).length,
      };
    }
  }
  return { snaps, hist, ups: c.upLog || [] };
}

const f = (x, n = 2) => (+x).toFixed(n);
const mean = (xs, g) => xs.reduce((a, x) => a + g(x), 0) / xs.length;
const out = [];
for (const profile of Object.keys(PROFILES).filter(p => !ONLY || p === ONLY)) {
  const runs = Array.from({ length: SEEDS }, (_, i) => run(profile, 101 + i * 13));
  out.push(`\n=== ${profile.toUpperCase()} (${PROFILES[profile].length} check-in${PROFILES[profile].length > 1 ? 's' : ''} a day, ${SEEDS} careers averaged) ===`);
  out.push('day | matches seasons division |  money | income (period): prizes wins tickets sponsor merch sold | out: players buildings | squad: rating best top11 70+ 80+ | levels');
  for (const day of SNAPS) {
    const s = runs.map(r => r.snaps[day]);
    const I = k => mean(s, x => x.inc[k] || 0);
    out.push(`${String(day).padStart(3)} | ${f(mean(s, x => x.matches), 0).padStart(4)} ${f(mean(s, x => x.season), 1).padStart(6)} ${s.map(x => x.div).join('/').padEnd(8)} | ${f(mean(s, x => x.money)).padStart(6)} | ${f(I('prizes')).padStart(6)} ${f(I('wins')).padStart(5)} ${f(I('tickets')).padStart(5)} ${f(I('sponsors')).padStart(5)} ${f(I('merch')).padStart(5)} ${f(I('transfers')).padStart(5)} | ${f(mean(s, x => x.out.players || 0)).padStart(6)} ${f(mean(s, x => x.out.buildings || 0)).padStart(6)} | ${f(mean(s, x => x.rating), 1).padStart(5)} ${f(mean(s, x => x.best), 0).padStart(3)} ${f(mean(s, x => x.avg11), 1).padStart(5)} ${f(mean(s, x => x.n70), 1).padStart(4)} ${f(mean(s, x => x.n80), 1).padStart(3)} | ${s[0].levels}`);
  }
  out.push(`upgrades bought (first career): ${runs[0].ups.join(', ') || 'none'}`);
}
console.log(out.join('\n'));
console.log('\n(money in $M. "income (period)" is what came in since the previous row. sold = players sold from the academy.)');
