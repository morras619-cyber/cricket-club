// What happened, remembered: Chirp's memory of the club. After a match this finds the moments worth talking about (a hat-trick missed by one
// ball, a duck from a star, a collapse, a former player coming back to hurt the club...), and keeps what it needs to remember across matches
// (a player's last scores, who has left, where the table stood). js/chirpvoice.js turns a fact into words; js/chirp.js posts them.
// A fact: { type, group, good, side: 'mine'|'theirs', pid, sal (how much it is worth saying), vars (what the words may use) }.
import { teamById } from './teams.js';
import { ovr } from './squads.js';
import { table } from './tournament.js';
import { CFG } from './config.js';

const surname = p => String(p?.name || '').split(' ').slice(-1)[0] || 'him';
const nickOf = p => p?.nick || surname(p);
const ord = n => `${n}${['th', 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10] || 'th'}`;
const ONE = (v, d = 1) => (Number.isFinite(v) ? (Math.round(v * 10 ** d) / 10 ** d).toFixed(d) : '0.0');

// the memory the facts need, kept in the career (c.chirp.mem). Capped, so a long career does not grow it.
export const freshMem = () => ({ v: 1, p: {}, former: {}, events: [], matches: [], pos: null, cap: null, said: {} });
export const memOf = c => {
  const P = c.chirp;
  return P.mem && P.mem.v === 1 ? P.mem : (P.mem = freshMem());
};
const playerMem = (m, id) => m.p[id] || (m.p[id] = { bat: [], bowl: [], ducks: {} });

// how much a fact is worth saying: its base, a little more for a better player
const BASE = {
  hatTrick: 100, nearHat: 86, cleanSweep: 76, masterclass: 82, sixFest: 72, blitz: 70, bigKnock: 60, finisher: 66, notOutHero: 50, oneManShow: 66,
  goldenDuck: 70, duck: 62, starFlop: 66, tooSlow: 55, expensive: 55, disaster: 70, maiden: 45, wicketMaiden: 64, tight: 50, twoWickets: 40,
  collapse: 72, comeback: 78, defended: 58, chaseEasy: 40, lastBallWin: 76, lastBallLoss: 74, bigTotal: 50, lowTotal: 55, sixesBonanza: 52,
  lostToBottom: 80, beatTop: 82, derbyWin: 80, derbyLoss: 78, revengeWin: 70, theirStar: 56, theirBowler: 50, formerHurt: 86, formerWickets: 86,
  formBat: 68, slumpBat: 70, formBowl: 66, dryBowl: 60, duckCount: 74, seasonRuns: 58, seasonWkts: 58, careerRuns: 60, capRace: 72,
  topSpot: 80, slide: 66, bottomThree: 76, bogeyTeam: 74, conquered: 84, contractWorry: 62,
};
const GOOD = new Set(['hatTrick', 'nearHat', 'cleanSweep', 'masterclass', 'sixFest', 'blitz', 'bigKnock', 'finisher', 'notOutHero', 'oneManShow', 'maiden', 'wicketMaiden', 'tight', 'twoWickets',
  'comeback', 'defended', 'chaseEasy', 'lastBallWin', 'bigTotal', 'sixesBonanza', 'beatTop', 'derbyWin', 'revengeWin', 'formBat', 'formBowl', 'seasonRuns', 'seasonWkts', 'careerRuns', 'capRace', 'topSpot', 'conquered']);
export const isGood = type => GOOD.has(type);
const GROUP = type => (['hatTrick', 'nearHat', 'cleanSweep', 'twoWickets', 'maiden', 'wicketMaiden', 'tight', 'expensive', 'disaster'].includes(type) ? 'bowl'
  : ['theirStar', 'theirBowler', 'formerHurt', 'formerWickets'].includes(type) ? 'opp' : ['formBat', 'slumpBat', 'formBowl', 'dryBowl', 'duckCount', 'seasonRuns', 'seasonWkts', 'careerRuns', 'capRace'].includes(type) ? 'mem'
    : ['topSpot', 'slide', 'bottomThree'].includes(type) ? 'table' : ['collapse', 'comeback', 'defended', 'chaseEasy', 'lastBallWin', 'lastBallLoss', 'bigTotal', 'lowTotal', 'sixesBonanza', 'lostToBottom', 'beatTop', 'derbyWin', 'derbyLoss', 'revengeWin', 'bogeyTeam', 'conquered'].includes(type) ? 'team' : 'bat');

export function make(type, p, extra, mem, opts = {}) {
  const base = BASE[type] ?? 40;
  const star = p ? Math.max(0, Math.min(12, (ovr(p) - 70) / 2)) : 0;
  const vars = { ...extra };
  if (p) {
    Object.assign(vars, { p: surname(p), pf: p.name, nick: nickOf(p) });
    vars.sruns = p.stats?.season?.runs ?? 0; vars.swk = p.stats?.season?.wkts ?? 0; vars.cruns = p.stats?.all?.runs ?? 0; vars.cwk = p.stats?.all?.wkts ?? 0;
    vars.ducks = mem ? Object.values(playerMem(mem, p.id).ducks).reduce((a, b) => a + b, 0) : 0;
    vars.ovr = ovr(p); vars.age = p.age;
    const nn = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
    if ('fours' in vars) { vars.fourn = nn(vars.fours, 'four'); vars.sixn = nn(vars.sixes, 'six').replace('sixs', 'sixes'); }
    vars.duckn = nn(vars.ducks, 'duck');
  }
  return { type, group: GROUP(type), good: isGood(type), side: opts.side || 'mine', pid: p?.id || null, club: p?.team || null, sal: Math.round(base + (opts.noStar ? 0 : star) + (opts.bonus || 0)), vars };
}

// per innings: every moment in it (the batters and the bowlers of both sides). mineBat: my club is batting in this innings
function inningsFacts(c, inn, mineBat, ctx, mem, out) {
  if (inn.kind && inn.kind !== 'main') return;
  const card = inn.battingCard(), figs = inn.bowlingCard(), detail = inn.detail || [];
  const player = id => c.players[id];
  const total = inn.runs, wkts = inn.maxWkts || CFG.wickets;
  // --- the batters
  for (const s of card) {
    const p = player(s.id);
    if (!p) continue;
    const sr = s.balls ? Math.round(s.runs / s.balls * 100) : 0;
    const vars = { runs: s.runs, balls: s.balls, sixes: s.sixes, fours: s.fours, sr };
    if (mineBat) {
      const m = playerMem(mem, p.id);
      if (s.out && s.runs === 0 && s.balls === 1) out.push(make('goldenDuck', p, vars, mem));
      else if (s.out && s.runs === 0) out.push(make('duck', p, vars, mem));
      else if (s.out && s.runs <= 4 && ovr(p) >= 80) out.push(make('starFlop', p, vars, mem));
      if (s.runs >= 35) out.push(make('masterclass', p, vars, mem));
      else if (s.runs >= 20 && s.balls <= 9) out.push(make('blitz', p, vars, mem));
      else if (s.runs >= 25) out.push(make('bigKnock', p, vars, mem));
      if (s.sixes >= 3) out.push(make('sixFest', p, vars, mem));
      if (!s.out && s.runs >= 15 && s.balls > 0) out.push(make(ctx.won && inn.target != null ? 'finisher' : 'notOutHero', p, vars, mem));
      if (s.runs >= 20 && total >= 30 && s.runs >= total * 0.5) out.push(make('oneManShow', p, vars, mem, { bonus: -6 }));
      if (s.balls >= 9 && s.runs <= s.balls * 0.55) out.push(make('tooSlow', p, vars, mem));
    } else {
      const former = mem.former[p.id];
      if (former && s.runs >= 15) out.push(make('formerHurt', p, vars, mem, { side: 'theirs', noStar: true }));
      else if (s.runs >= 25 || s.sixes >= 3) out.push(make('theirStar', p, vars, mem, { side: 'theirs' }));
    }
  }
  // --- who bowled what
  const byOver = [];
  detail.forEach((d, i) => { const o = Math.floor(i / 6); (byOver[o] = byOver[o] || []).push(d); });
  // two or three wickets in a row by one bowler
  for (let i = 0; i + 1 < detail.length; i++) {
    const a = detail[i], b = detail[i + 1];
    if (!(a.k && !a.ro && b.k && !b.ro && a.w && a.w === b.w)) continue;
    const bw = player(a.w), f = figs.find(x => x.id === a.w), n = detail[i + 2];
    const hat = n && n.k && !n.ro && n.w === a.w;
    const vars = { w: f?.wkts ?? 2, r: f?.runs ?? 0, balls: f?.balls ?? 0, econ: f?.balls ? ONE(f.runs / f.balls * 6) : '0.0' };
    if (mineBat) { if (bw) out.push(make('theirBowler', bw, { ...vars, w: hat ? 3 : 2 }, mem, { side: 'theirs', bonus: hat ? 40 : 25 })); }
    else if (bw) out.push(make(hat ? 'hatTrick' : 'nearHat', bw, vars, mem));
    if (hat) i += 2;
  }
  // overs: maidens, wicket maidens, expensive overs
  byOver.forEach(ov => {
    if (!ov || ov.length < 6) return;
    const w = ov[0].w, bw = player(w), runs = ov.reduce((a, d) => a + d.r, 0), wk = ov.filter(d => d.k && !d.ro).length;
    if (!bw || mineBat) return;
    const f = figs.find(x => x.id === w), vars = { w: f?.wkts ?? wk, r: f?.runs ?? runs, balls: f?.balls ?? 6, econ: f?.balls ? ONE(f.runs / f.balls * 6) : '0.0' };
    if (runs === 0 && wk > 0) out.push(make('wicketMaiden', bw, vars, mem));
    else if (runs === 0) out.push(make('maiden', bw, vars, mem));
  });
  // a bowler's whole spell
  if (!mineBat) {
    const spells = figs.filter(f => f.balls >= 6 && c.players[f.id]);
    const best = [...spells].sort((x, y) => x.runs / x.balls - y.runs / y.balls)[0];
    for (const f of spells) {
      const bw = player(f.id), vars = { w: f.wkts, r: f.runs, balls: f.balls, econ: ONE(f.runs / f.balls * 6) };
      const hasHat = out.some(o => o.pid === f.id && (o.type === 'hatTrick' || o.type === 'nearHat'));
      if (f.wkts >= wkts && !hasHat) out.push(make('cleanSweep', bw, vars, mem));
      else if (f.wkts === 2 && !hasHat) out.push(make('twoWickets', bw, vars, mem));
      if (f === best && f.runs / f.balls <= 0.75 && spells.length > 1) out.push(make('tight', bw, vars, mem));
      if (f.wkts === 0 && f.runs >= 20) out.push(make('disaster', bw, vars, mem));
      else if (f.runs / f.balls >= 2.6 && f.runs >= 16) out.push(make('expensive', bw, vars, mem));
    }
  } else {
    // (their bowlers, against my batters)
    for (const f of figs) {
      const bw = player(f.id);
      if (!bw || f.balls < 6) continue;
      const vars = { w: f.wkts, r: f.runs, balls: f.balls, econ: ONE(f.runs / f.balls * 6) };
      const former = mem.former[bw.id];
      if (former && f.wkts >= 2) out.push(make('formerWickets', bw, vars, mem, { side: 'theirs', noStar: true }));
      else if (f.wkts >= 2) out.push(make('theirBowler', bw, vars, mem, { side: 'theirs' }));
    }
  }
  // the innings itself: a collapse (two wickets inside three balls)
  if (mineBat) {
    for (let i = 0; i + 2 < detail.length + 1; i++) {
      const w = detail.slice(i, i + 3).filter(d => d.k).length;
      if (w >= 2 && !ctx.won) { out.push(make('collapse', null, {}, mem)); break; }
    }
    if (total <= 25 && !ctx.won) out.push(make('lowTotal', null, {}, mem));
    if (total >= 75) out.push(make('bigTotal', null, {}, mem));
    if (card.reduce((a, s) => a + s.sixes, 0) >= 5) out.push(make('sixesBonanza', null, {}, mem));
  }
}

// the moments of a match, most worth saying first. summary: the match (innings, result, oppTeam); ctx: { won, opp, derby, story, mine, theirs }
export function matchFacts(c, summary, ctx) {
  const mem = memOf(c), out = [];
  const opp = ctx.opp;
  ctx = { ...ctx };
  summary.innings.forEach(inn => inningsFacts(c, inn, inn.side === 'player', ctx, mem, out));
  const mine = summary.innings.find(i => i.side === 'player'), theirs = summary.innings.find(i => i.side === 'ai');
  const story = ctx.story || {}, margin = Math.abs((mine?.runs ?? 0) - (theirs?.runs ?? 0));
  const second = summary.innings[1], chaseWon = ctx.won && second?.side === 'player';
  // the team's day
  const lostW = mine ? (mine.detail || []).slice(0, 10).filter(d => d.k).length : 0;
  if (chaseWon && lostW >= 2 && story.tone !== 'rout') out.push(make('comeback', null, {}, mem));
  if (ctx.won && !chaseWon && story.tone !== 'rout') out.push(make('defended', null, {}, mem));
  if (chaseWon && (second.ballsLeft ?? 0) >= 12) out.push(make('chaseEasy', null, {}, mem));
  const close = story.tone === 'thriller' && story.how !== 'super';
  if (ctx.won && close) out.push(make('lastBallWin', null, {}, mem));
  if (!ctx.won && close) out.push(make('lastBallLoss', null, {}, mem));
  // the table, and who is above whom
  let rows = [];
  try { rows = c.league ? table(c.league) : []; } catch { rows = []; }
  const pos = rows.findIndex(r => r.id === c.club) + 1, oppPos = rows.findIndex(r => r.id === opp) + 1;
  if (pos && oppPos) {
    if (!ctx.won && oppPos >= pos + 3) out.push(make('lostToBottom', null, { pos: ord(oppPos) }, mem));
    if (ctx.won && oppPos <= 3 && oppPos < pos) out.push(make('beatTop', null, {}, mem));
  }
  if (ctx.derby) out.push(make(ctx.won ? 'derbyWin' : 'derbyLoss', null, {}, mem));
  // a run against this club: the one that keeps beating us, or the first win over it
  { let lost = 0; for (let i = mem.matches.length - 1; i >= 0; i--) { const m = mem.matches[i]; if (m.opp !== opp) continue; if (m.won) break; lost++; }
    if (!ctx.won && lost >= 2) out.push(make('bogeyTeam', null, { k: lost + 1 }, mem));
    if (ctx.won && lost >= 2) out.push(make('conquered', null, { k: lost }, mem)); }
  const earlier = mem.matches.filter(m => m.season === c.season && m.opp === opp);
  if (ctx.won && earlier.some(m => !m.won)) out.push(make('revengeWin', null, {}, mem));
  if (pos && rows.length) {
    const n = rows.length, prev = mem.pos;
    if (pos === 1 && prev !== 1 && (c.league?.results?.length ?? 0) >= 3) out.push(make('topSpot', null, { pos: ord(pos) }, mem));
    else if (!ctx.won && prev && prev <= 4 && pos > prev && pos >= 5) out.push(make('slide', null, { pos: ord(pos) }, mem));
    else if (pos >= n - 2 && prev != null && prev < pos && (c.league?.results?.length ?? 0) >= 4) out.push(make('bottomThree', null, { pos: ord(pos) }, mem));
  }
  // a player's run over several games (this match's score is added to what is remembered, but the memory itself is updated in remember())
  const thisBats = new Map(), thisBowls = new Map();
  for (const inn of summary.innings) {
    if (inn.kind && inn.kind !== 'main') continue;
    if (inn.side === 'player') { for (const s of inn.battingCard()) if (s.id && s.balls > 0) thisBats.set(s.id, s); }
    else { for (const f of inn.bowlingCard()) if (f.id && f.balls >= 6) thisBowls.set(f.id, f); }
  }
  for (const [id, s] of thisBats) {
    const p = c.players[id]; if (!p) continue;
    const prior = playerMem(mem, id).bat, scores = [...prior, s.runs].slice(-6);
    const last3 = scores.slice(-3);
    if (last3.length === 3 && last3.every(x => x >= 20)) out.push(make('formBat', p, { k: 3, last: last3.join(', ') }, mem));
    else if (last3.length === 3 && last3.every(x => x <= 5) && ovr(p) >= 70) out.push(make('slumpBat', p, { k: 3, last: last3.join(', ') }, mem));
    const ducks = Object.values(playerMem(mem, id).ducks).reduce((a, b) => a + b, 0) + (s.out && s.runs === 0 ? 1 : 0);
    if (s.out && s.runs === 0 && ducks >= 2) out.push(make('duckCount', p, { k: ducks, ducks, last: last3.join(', ') }, mem));
    // season and career milestones
    const sNow = p.stats.season.runs, sPrev = sNow - s.runs;
    for (const t of [50, 100, 150, 200, 300]) if (sPrev < t && sNow >= t) out.push(make('seasonRuns', p, { sruns: sNow, k: p.stats.season.m }, mem));
    const cNow = p.stats.all.runs, cPrev = cNow - s.runs;
    for (const t of [250, 500, 1000, 1500, 2000]) if (cPrev < t && cNow >= t) out.push(make('careerRuns', p, { cruns: cNow }, mem));
  }
  for (const [id, f] of thisBowls) {
    const p = c.players[id]; if (!p) continue;
    const prior = playerMem(mem, id).bowl, w = [...prior, f.wkts].slice(-6);
    if (w.length >= 3 && w.slice(-3).every(x => x >= 1)) out.push(make('formBowl', p, { k: 3 }, mem));
    else if (w.length >= 4 && w.slice(-4).every(x => x === 0)) out.push(make('dryBowl', p, { k: 4 }, mem));
    const sNow = p.stats.season.wkts, sPrev = sNow - f.wkts;
    for (const t of [3, 5, 8, 10, 15, 20]) if (sPrev < t && sNow >= t) out.push(make('seasonWkts', p, { swk: sNow, k: p.stats.season.m }, mem));
  }
  // the orange cap changes hands to one of mine
  const top = Object.values(c.players).filter(p => p.stats?.season?.runs).sort((a, b) => b.stats.season.runs - a.stats.season.runs)[0];
  if (top && top.team === c.club && mem.cap !== top.id && top.stats.season.runs >= 40 && (c.league?.results?.length ?? 0) >= 3) out.push(make('capRace', top, { sruns: top.stats.season.runs }, mem));
  // one fact of a kind per player; the same player does not get two posts
  const seen = new Set(), keep = [];
  for (const f of out.sort((a, b) => b.sal - a.sal)) {
    const key = `${f.type}:${f.pid || ''}`;
    if (seen.has(key)) continue;
    seen.add(key); keep.push(f);
  }
  return keep;
}

// what the memory keeps from this match (call it once, after the facts are made)
export function remember(c, summary, ctx, facts = []) {
  const mem = memOf(c);
  for (const inn of summary.innings) {
    if (inn.kind && inn.kind !== 'main') continue;
    if (inn.side === 'player') {
      for (const s of inn.battingCard()) {
        if (!s.id || !(s.balls > 0 || s.out)) continue;
        const m = playerMem(mem, s.id);
        m.bat = [...m.bat, s.runs].slice(-6);
        if (s.out && s.runs === 0) m.ducks[c.season] = (m.ducks[c.season] || 0) + 1;
      }
    } else {
      for (const f of inn.bowlingCard()) if (f.id && f.balls >= 6) { const m = playerMem(mem, f.id); m.bowl = [...m.bowl, f.wkts].slice(-6); }
    }
  }
  mem.matches = [...mem.matches, { season: c.season, opp: ctx.opp, won: !!ctx.won }].slice(-24);
  let rows = [];
  try { rows = c.league ? table(c.league) : []; } catch { rows = []; }
  const pos = rows.findIndex(r => r.id === c.club) + 1;
  if (pos) mem.pos = pos;
  const top = Object.values(c.players).filter(p => p.stats?.season?.runs).sort((a, b) => b.stats.season.runs - a.stats.season.runs)[0];
  if (top) mem.cap = top.id;
  // the old season's ducks are not carried: keep the last two seasons
  for (const m of Object.values(mem.p)) for (const s of Object.keys(m.ducks)) if (+s < c.season - 1) delete m.ducks[s];
}

// a life event of the club (a signing, a departure...): kept so the fans remember who left, and who came
export function noteEvent(c, ev) {
  const mem = memOf(c);
  mem.events = [...mem.events, { ...ev, season: c.season }].slice(-40);
  if (ev.t === 'left' || ev.t === 'released' || ev.t === 'retired') mem.former[ev.pid] = { season: c.season, kind: ev.t };
  if (ev.t === 'signed' || ev.t === 'scouted') delete mem.former[ev.pid];
}
export const pastSeasons = c => (c.history || []).filter(h => h.club === c.club || !h.club);
