// The training ground: coaches train the players you put in its slots, on real time, also while you are away. A coach earns his players
// training points (TP); at the end of the season the points turn into rating (never past a player's potential, never for a player of 33 or more,
// and at most a few points a season), on top of the natural growth. TP only comes from real time, so playing faster does not train anyone faster.
// Pure data and functions (no screen): the state is career.training, and money is in $k. The time is the server's (main.js).
export const MIN = 60000, HOUR = 3600000, DAY = 86400000;
export const TRAIN = {
  LEVELS: [null,
    { slots: 2, coaches: 2, cap: 1, up: 0 },      // cap: the most rating points a player gains from training in a season; up: $M to reach the level
    { slots: 4, coaches: 3, cap: 2, up: 1.2 },
    { slots: 6, coaches: 4, cap: 2, up: 3.5 }],
  TP_HOUR: 12, PER_COACH: 2,         // training points an hour at a level 1 coach, and the players one coach can teach at once
  WAGE: 12, COACH_TRAIN: 20,         // $k a day for a level 1 coach (+25% a level); training him costs $k x his level
  COACH_MAX: 3,
  CAP: 10 * HOUR, CAP_UNVERIFIED: HOUR, QUIT: 72 * HOUR,
  START_FUND: 15,                    // $k the club puts in
  PEAK_AGE: 33,
  DRILL_BALLS: 10, DRILLS_DAY: 3, DRILL_MIN: 10, DRILL_MAX: 45,   // net drills: balls faced, a day, and the training points a drill earns (a few hours of coaching at most)
};
export const KINDS = {
  bat: { name: 'Batting coach', about: 'Trains batters, wicketkeepers and all-rounders\' batting.' },
  pace: { name: 'Pace coach', about: 'Trains fast and swing bowlers.' },
  spin: { name: 'Spin coach', about: 'Trains spin bowlers.' },
};
const NAMES = ['Coach Rao', 'Coach Imtiaz', 'Coach Perera', 'Coach Khan', 'Coach Das', 'Coach Akram', 'Coach Fernando', 'Coach Sethi', 'Coach Malik', 'Coach Joshi'];
const speedOf = c => 1 + 0.25 * (c.lvl - 1);
const wageOf = c => TRAIN.WAGE * speedOf(c);
const cap = t => TRAIN.LEVELS[t.level];
const sum = o => Object.values(o).reduce((a, b) => a + b, 0);

export function freshTraining(now) {
  return seal({ level: 1, coaches: [], slots: [null, null], tp: {}, fund: TRAIN.START_FUND, last: now, owed: 0, unpaidMs: 0, nextId: 1, log: [], seal: 0 });
}
function mark(t) {
  let h = 2166136261;
  const s = `${t.fund.toFixed(2)}|${t.last}|${t.level}|${t.coaches.length}|${Math.round(sum(t.tp))}|tg9`;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export const seal = t => { t.seal = mark(t); return t; };
export const sealed = t => t.seal === mark(t);

// ---------- what a point of rating costs ----------
// ovr: the player's rating now; age. A youngster learns fastest, an older player slowest; the better he is, the more it takes.
export const tpCost = (ovr, age) => Math.round((150 + 25 * Math.max(0, ovr - 50)) * (age <= 23 ? 1 : age <= 28 ? 1.5 : 2.5));
// a player can learn if he is under 33 and has room to his potential
export const canLearn = p => p.age < TRAIN.PEAK_AGE && p.ovr < p.pot;

// who teaches whom: slotted players (in order) to the coaches of their kind, two to a coach, the better coach first
export function assignments(t, ctx) {
  const load = new Map(t.coaches.map(c => [c.id, 0])), out = new Map();
  for (const pid of t.slots) {
    const p = pid && ctx.squad.get(pid);
    if (!p || !canLearn(p)) continue;
    const pick = t.coaches.filter(c => p.kinds.includes(c.kind) && load.get(c.id) < TRAIN.PER_COACH).sort((a, b) => b.lvl - a.lvl)[0];
    if (pick) { load.set(pick.id, load.get(pick.id) + 1); out.set(pid, pick); }
  }
  return out;
}
export const wagePerDay = t => t.coaches.reduce((a, c) => a + wageOf(c), 0);

// ---------- time passes ----------
// ctx: { now, trusted, squad: Map id -> { name, ovr, age, pot, kinds }, bank: { spend(k) -> k spent or 0, give(k) } }
export function tick(t, ctx) {
  if (!sealed(t)) {   // somebody has been at the numbers: the fund is gone and the points with it
    t.fund = 0; t.tp = {}; t.last = ctx.now; t.log.push({ t: ctx.now, text: 'The books did not add up: the fund was emptied and the points lost' });
    seal(t); return { tampered: true };
  }
  const dt = ctx.now - t.last;
  if (dt < 0) return { skipped: 'clock' };
  // a player who has gone (sold, released, retired) leaves his slot
  t.slots = t.slots.map(pid => (pid && ctx.squad.has(pid) ? pid : null));
  for (const pid of Object.keys(t.tp)) if (!ctx.squad.has(pid)) delete t.tp[pid];
  const run = Math.min(dt, ctx.trusted ? TRAIN.CAP : TRAIN.CAP_UNVERIFIED);
  const before = Object.assign({}, t.tp);
  if (dt > 0) {
    const n = Math.max(1, Math.ceil(run / MIN)), s = run / n;
    const who = assignments(t, ctx);
    for (let i = 0; i < n; i++) step(t, ctx, who, s);
    if (dt > run && t.unpaidMs > 0) t.unpaidMs += dt - run;
    t.last = ctx.now;
    while (t.unpaidMs >= TRAIN.QUIT && t.coaches.length) { const g = t.coaches.pop(); t.unpaidMs -= DAY; t.log.push({ t: ctx.now, text: `${g.name} walked out: the wages were not paid` }); }
  }
  t.log = t.log.slice(-8);
  seal(t);
  return { ms: run, away: dt, capped: dt > run, gained: Math.round(sum(t.tp) - sum(before)) };
}
function step(t, ctx, who, s) {
  t.owed += (wagePerDay(t) / DAY) * s;
  while (t.owed > 1e-9) {
    const pay = Math.min(t.owed, Math.max(0, t.fund));
    t.fund -= pay; t.owed -= pay;
    if (t.owed <= 1e-9) break;
    const got = ctx.bank.spend(50);
    if (!got) break;
    t.fund += got;
  }
  const paid = t.owed <= 1e-9;
  t.unpaidMs = paid ? 0 : t.unpaidMs + s;
  if (!paid) return;
  for (const [pid, coach] of who) t.tp[pid] = (t.tp[pid] || 0) + (TRAIN.TP_HOUR * speedOf(coach) / HOUR) * s;
}

// ---------- the end of a season: points become rating ----------
// p: { ovr, age, pot } as he is now; returns the rating points he gains (the caller applies them). The points left over carry on.
export function seasonGain(t, pid, p) {
  let tp = t.tp[pid] || 0, n = 0;
  if (!canLearn(p)) return 0;
  while (n < cap(t).cap && p.ovr + n < p.pot && tp >= tpCost(p.ovr + n, p.age)) { tp -= tpCost(p.ovr + n, p.age); n++; }
  t.tp[pid] = tp;
  seal(t);
  return n;
}

// ---------- net drills ----------
// You pad up in the nets and face DRILL_BALLS balls yourself; the runs earn the player training points, a few times a day. The day is the server's
// (UTC), kept with its own small seal so that the main books (mark above) stay as they are. Points go in t.tp like any coach's.
const dmark = d => { let h = 2166136261; const s = `${d.day}|${d.n}|dr2`; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
export const drillDay = now => Math.floor(now / DAY);
export function drillsLeft(t, now) {
  const d = t.drills;
  if (!d) return TRAIN.DRILLS_DAY;                        // (a save from before the drills)
  if (d.seal !== dmark(d)) return 0;                      // edited: no more drills today
  return d.day === drillDay(now) ? Math.max(0, TRAIN.DRILLS_DAY - d.n) : TRAIN.DRILLS_DAY;
}
export const drillPoints = r => Math.max(TRAIN.DRILL_MIN, Math.min(TRAIN.DRILL_MAX, Math.round(15 + 3 * r.runs - 5 * r.outs)));
// a played drill: r is what the player did ({ balls, runs, outs }); returns the points given
export function finishDrill(t, pid, r, now, ctx) {
  const p = ctx.squad.get(pid);
  if (!sealed(t)) return no('The books do not add up');
  if (!p || !canLearn(p)) return no('He cannot learn more right now');
  if (!r || r.balls < TRAIN.DRILL_BALLS) return no('The drill was not finished');
  if (drillsLeft(t, now) < 1) return no('The nets are closed for today');
  const day = drillDay(now), used = t.drills && t.drills.day === day ? t.drills.n : 0;
  t.drills = { day, n: used + 1 }; t.drills.seal = dmark(t.drills);
  const pts = drillPoints(r);
  t.tp[pid] = (t.tp[pid] || 0) + pts;
  seal(t); return { ok: true, pts };
}

// ---------- what you do ----------
const ok = { ok: true }, no = why => ({ ok: false, why });
function payFrom(t, cost, ctx) {
  if (t.fund >= cost) { t.fund -= cost; return true; }
  const need = cost - t.fund, got = ctx.bank.spend(need);
  if (!got || got < need) return false;
  t.fund += got - cost; return true;
}
export function hire(t, kind) {
  if (!KINDS[kind]) return no('No such coach');
  if (t.coaches.length >= cap(t).coaches) return no(`The ground has room for ${cap(t).coaches} coaches: upgrade it for more`);
  const id = t.nextId++;
  t.coaches.push({ id, kind, lvl: 1, name: NAMES[(id * 3 + kind.length) % NAMES.length] });
  seal(t); return ok;
}
export function fire(t, id) { const i = t.coaches.findIndex(c => c.id === id); if (i < 0) return no('Not on the staff'); t.coaches.splice(i, 1); seal(t); return ok; }
export const coachTrainCost = c => TRAIN.COACH_TRAIN * c.lvl;
export const coachMax = t => Math.min(TRAIN.COACH_MAX, t.level + 1);
export function trainCoach(t, id, ctx) {
  const c = t.coaches.find(x => x.id === id);
  if (!c) return no('Not on the staff');
  if (c.lvl >= coachMax(t)) return no(c.lvl >= TRAIN.COACH_MAX ? 'Already the best' : 'Upgrade the ground to train further');
  if (!payFrom(t, coachTrainCost(c), ctx)) return no('Not enough money');
  c.lvl++; seal(t); return ok;
}
export const nextUpgrade = t => (t.level < 3 ? TRAIN.LEVELS[t.level + 1] : null);
export function upgrade(t, ctx) {
  const n = nextUpgrade(t);
  if (!n) return no('The training ground is as big as it gets');
  if (!ctx.bank.spend(n.up * 1000)) return no('Not enough money in the club');
  t.level++; while (t.slots.length < n.slots) t.slots.push(null);
  seal(t); return ok;
}
export function assign(t, index, pid, ctx) {
  const p = ctx.squad.get(pid);
  if (!p) return no('He is not in your squad');
  if (index < 0 || index >= t.slots.length) return no('No such place');
  if (t.slots.includes(pid)) return no('He is training already');
  if (!canLearn(p)) return no(p.age >= TRAIN.PEAK_AGE ? 'He is past learning new tricks' : 'He has reached his potential');
  t.slots[index] = pid; seal(t); return ok;
}
export function release(t, index) { if (!t.slots[index]) return no('Nobody there'); t.slots[index] = null; seal(t); return ok; }
