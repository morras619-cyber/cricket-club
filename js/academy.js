// The youth academy: scouts go on trips (real hours) and come back with a raw teenager; a trial drill (real hours) shows how good he can become;
// he cannot play until he is 18, so he is raised over several seasons, then promoted to the squad or sold. Prospects live outside the squad limit.
// Pure data and functions (no screen): the state is career.academy, money in $k. The time is the server's (main.js), as for the other buildings:
// a trip or a drill takes its hours whenever you look; the upkeep counts away time for ten hours at most. The players are made by career.js (ctx.make).
import { levelRow } from './pacing.js';
export const MIN = 60000, HOUR = 3600000, DAY = 86400000;
export const TIERS = ['Common', 'Rare', 'Epic', 'Superhero'];
export const tierOf = pot => (pot >= 90 ? 3 : pot >= 80 ? 2 : pot >= 70 ? 1 : 0);
export const POT_RANGE = [[58, 69], [70, 79], [80, 89], [90, 96]];
export const ACAD = {
  LEVELS: [null,
    { slots: 2, trips: 1 },       // the rows for level 1, 5 and 10 (pacing.js levelRow fills in the levels between); slots: prospects held (a trip out holds a place); trips: scouts away at once
    { slots: 4, trips: 2 },
    { slots: 6, trips: 3 }],
  TRIPS: { 12: { cost: 100, odds: [70, 22, 6, 2] }, 24: { cost: 200, odds: [55, 30, 10, 5] }, 48: { cost: 350, odds: [35, 35, 20, 10] } },   // $k, and the odds (%) of Common, Rare, Epic, Superhero
  DRILL_H: 6, UPKEEP: 4,                 // hours a trial drill takes; $k a day for each prospect
  PLAY_AGE: 18, MENTOR_AGE: 30,
  GROW: [4, 8], MENTOR_GROW: 1,          // the rating points a prospect gains each season, on top of the natural growth; and a mentor's extra
  CAP: 10 * HOUR, CAP_UNVERIFIED: HOUR,
  START_FUND: 10,                        // $k the club puts in
};
const sum = o => Object.values(o).reduce((a, b) => a + b, 0);

export function freshAcademy(now) {
  return seal({ level: 1, fund: ACAD.START_FUND, prospects: [], trips: [], drills: {}, revealed: {}, mentors: {}, last: now, owed: 0, unpaidMs: 0, nextId: 1, log: [], seal: 0 });
}
function mark(a) {
  let h = 2166136261;
  const s = `${a.fund.toFixed(2)}|${a.last}|${a.level}|${a.prospects.length}|${a.trips.length}|${a.trips.reduce((x, t) => x + t.end, 0)}|${sum(a.drills)}|ac4`;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export const seal = a => { a.seal = mark(a); return a; };
export const sealed = a => a.seal === mark(a);
const cap = a => levelRow(ACAD.LEVELS, a.level);
export const placesUsed = a => a.prospects.length + a.trips.length;
export const upkeepPerDay = a => a.prospects.length * ACAD.UPKEEP;

// what a trip finds: the tier from the odds (r in 0..1)
export function pickTier(hours, r) {
  const odds = ACAD.TRIPS[hours].odds;
  let x = r * 100;
  for (let i = 0; i < 4; i++) { if (x < odds[i]) return i; x -= odds[i]; }
  return 0;
}

// ctx: { now, trusted, bank: { spend(k) -> k spent or 0 }, has(pid) -> he is still a prospect of ours, make(trip) -> the new prospect's id }
export function tick(a, ctx) {
  if (!sealed(a)) {   // somebody has been at the numbers: the fund and the trips out are lost
    a.fund = 0; a.trips = []; a.drills = {}; a.last = ctx.now;
    a.log.push({ t: ctx.now, text: 'The books did not add up: the fund was emptied and the trips lost' });
    seal(a); return { tampered: true };
  }
  const dt = ctx.now - a.last;
  if (dt < 0) return { skipped: 'clock' };
  // a prospect who has gone (promoted, sold) leaves
  a.prospects = a.prospects.filter(id => ctx.has(id));
  for (const id of Object.keys(a.drills)) if (!a.prospects.includes(id)) delete a.drills[id];
  for (const id of Object.keys(a.mentors)) if (!a.prospects.includes(id)) delete a.mentors[id];
  let paused = 0;
  if (dt > 0) {
    const run = Math.min(dt, ctx.trusted ? ACAD.CAP : ACAD.CAP_UNVERIFIED), n = Math.max(1, Math.ceil(run / MIN)), s = run / n;
    for (let i = 0; i < n; i++) {
      a.owed += (upkeepPerDay(a) / DAY) * s;
      while (a.owed > 1e-9) {
        const pay = Math.min(a.owed, Math.max(0, a.fund));
        a.fund -= pay; a.owed -= pay;
        if (a.owed <= 1e-9) break;
        const got = ctx.bank.spend(50);
        if (!got) break;
        a.fund += got;
      }
      if (a.owed > 1e-9) { a.unpaidMs += s; paused += s; } else a.unpaidMs = 0;
    }
    // unpaid time is time the scouts and the drills stood still
    if (paused) { for (const t of a.trips) t.end += paused; for (const id of Object.keys(a.drills)) a.drills[id] += paused; }
    a.last = ctx.now;
  }
  const arrived = [], revealed = [];
  for (const t of [...a.trips].sort((x, y) => x.end - y.end)) {
    if (t.end > ctx.now) continue;
    const pid = ctx.make(t);
    a.trips = a.trips.filter(x => x !== t);
    if (pid) { a.prospects.push(pid); arrived.push(pid); }
  }
  for (const [id, end] of Object.entries(a.drills)) if (end <= ctx.now) { a.revealed[id] = true; delete a.drills[id]; revealed.push(id); }
  a.log = a.log.slice(-8);
  seal(a);
  return { away: dt, arrived, revealed };
}

// ---------- what you do ----------
const ok = { ok: true }, no = why => ({ ok: false, why });
export function startTrip(a, region, hours, ctx) {
  const T = ACAD.TRIPS[hours];
  if (!T) return no('No such trip');
  if (a.trips.length >= cap(a).trips) return no(`Only ${cap(a).trips} scout${cap(a).trips > 1 ? 's' : ''} can be away at once: upgrade the academy for more`);
  if (placesUsed(a) >= cap(a).slots) return no('The academy is full: promote or sell a prospect first');
  if (!ctx.bank.spend(T.cost)) return no('Not enough money in the club');
  a.trips.push({ id: a.nextId++, region, hours, end: ctx.now + hours * HOUR });
  seal(a); return ok;
}
export function startDrill(a, pid, ctx) {
  if (!a.prospects.includes(pid)) return no('He is not in the academy');
  if (a.revealed[pid]) return no('You already know what he can become');
  if (a.drills[pid]) return no('He is drilling already');
  a.drills[pid] = ctx.now + ACAD.DRILL_H * HOUR;
  seal(a); return ok;
}
export function setMentor(a, pid, vetId) {
  if (!a.prospects.includes(pid)) return no('He is not in the academy');
  for (const [k, v] of Object.entries(a.mentors)) if (v === vetId && k !== pid) return no('That veteran mentors another prospect');
  if (vetId) a.mentors[pid] = vetId; else delete a.mentors[pid];
  seal(a); return ok;
}
// a finished building (pacing.js): the academy is one level bigger
export function setLevel(a, level) { a.level = level; seal(a); }
// (testing only) the clock jumps forward: trips and drills come nearer
export function skipTime(a, ms) {
  a.last -= ms;
  for (const t of a.trips) t.end -= ms;
  for (const id of Object.keys(a.drills)) a.drills[id] -= ms;
  seal(a);
}
