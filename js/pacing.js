// How fast a season can go: a league match costs a token. A token comes every four real hours, up to four are kept (they never run out),
// and you start with four. It is a recharging meter, and waiting costs you nothing: only time you could not have used is lost.
// The time is the server's (main.js), never the phone's clock. Pure data and functions (career.pace is the state).
export const HOUR = 3600000;
export const PACE = { EVERY: 4 * HOUR, BANK: 4 };

function mark(p) {
  let h = 2166136261;
  const s = `${p.tokens}|${p.at}|pc3`;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const seal = p => { p.seal = mark(p); return p; };
export const freshPace = now => seal({ tokens: PACE.BANK, at: now, seal: 0 });

// bring the meter up to date: now (ms, the server's); trusted: false when the server gave no time (then one token a visit at most)
export function refill(p, now, trusted = true) {
  if (p.seal !== mark(p)) { p.tokens = 0; p.at = now; return seal(p); }   // somebody has been at the numbers: it starts empty
  if (now < p.at) return p;                                              // the clock went back: nothing happens
  if (p.tokens >= PACE.BANK) { p.at = now; return seal(p); }             // full: it does not fill while full
  let gained = Math.floor((now - p.at) / PACE.EVERY);
  if (!trusted) gained = Math.min(1, gained);
  if (gained > 0) { p.tokens = Math.min(PACE.BANK, p.tokens + gained); p.at += gained * PACE.EVERY; }
  if (p.tokens >= PACE.BANK) p.at = now;
  return seal(p);
}
export function spend(p, now, trusted = true) {
  refill(p, now, trusted);
  if (p.tokens < 1) return false;
  if (p.tokens >= PACE.BANK) p.at = now;   // (the next one starts counting from now)
  p.tokens--;
  seal(p); return true;
}
// ms until the next token (0 when full)
export const nextIn = (p, now) => (p.tokens >= PACE.BANK ? 0 : Math.max(0, p.at + PACE.EVERY - now));
export const fmtWait = ms => { const m = Math.ceil(ms / 60000); return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${Math.max(1, m)} min`; };

// ---------- the club's level, the builders and the diamonds ----------
// Winning and playing earns the club XP; the club's level (1 to 10) is the highest level any building may reach. A building goes up one level at a time,
// and each level costs money and builder time: one builder builds one thing (a second can be bought with diamonds). A building's picture changes at
// level 5 and level 10 (look: 1, 2, 3), and what it can do is read off its three anchor rows (level 1, 5, 10) with the levels between filled in.
// State: career.build = { xp, diamonds, builders, jobs: [{ id, to, end }], seal }. Pure data and functions; the time is the server's.
export const MAX_LEVEL = 10;
export const XP_AT = [0, 0, 150, 400, 800, 1400, 2200, 3200, 4400, 5600, 7000];    // the XP that makes level n (index n)
export const XP = { MATCH: 8, WIN: 8, DRAW: 3, DRILL: 3, PROMOTED: 150, CHAMPION: 300 };
export const BUILD = { COST: 1.0, GROWTH: 1.38, HOURS: [0, 0, 2, 2, 3, 4, 4, 5, 6, 8, 12], MULT: { stadium: 1.5, merch: 1, training: 1, academy: 1, medical: 0.8 }, BUILDER2: 100 };   // $M to reach level 2 and the rise for each level after; hours to reach level n
export const IDS = ['stadium', 'training', 'academy', 'medical', 'merch', 'office', 'clubhouse', 'shop'];
export const lookOf = level => (level >= MAX_LEVEL ? 3 : level >= 5 ? 2 : 1);
export const costOf = (id, to) => Math.round(BUILD.COST * (BUILD.MULT[id] ?? 1) * BUILD.GROWTH ** (to - 2) * 20) / 20;   // $M to reach level `to`
export const hoursOf = to => BUILD.HOURS[to];
export const clubLevel = xp => { let n = 1; while (n < MAX_LEVEL && xp >= XP_AT[n + 1]) n++; return n; };
// the share of the way to the next club level (0..1; 1 at the top)
export const levelShare = xp => { const n = clubLevel(xp); return n >= MAX_LEVEL ? 1 : (xp - XP_AT[n]) / (XP_AT[n + 1] - XP_AT[n]); };

// what a building can do at a level: rows are its three anchors { level 1, level 5, level 10 }; whole numbers stay whole
export function levelRow(rows, level) {
  const lv = Math.max(1, Math.min(MAX_LEVEL, level)), [a, b, c] = [rows[1], rows[2], rows[3]];
  const [x, y, t] = lv <= 5 ? [a, b, (lv - 1) / 4] : [b, c, (lv - 5) / 5], out = {};
  for (const k of Object.keys(x)) {
    const v = x[k] + (y[k] - x[k]) * t;
    out[k] = Number.isInteger(x[k]) && Number.isInteger(y[k]) ? Math.round(v) : v;
  }
  return out;
}

function bmark(b) {
  let h = 2166136261;
  const s = `${b.xp}|${b.diamonds}|${b.builders}|${b.jobs.map(j => `${j.id}${j.to}${j.end}`).join(',')}|bd1`;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const bseal = b => { b.seal = bmark(b); return b; };
export const freshBuild = (xp = 0) => bseal({ xp, diamonds: 0, builders: 1, jobs: [], seal: 0 });
// the books of a career: made when it is first needed, and a number edited by hand empties the XP and the diamonds
export function buildOf(c) {
  const b = c.build || (c.build = freshBuild());
  if (b.seal !== bmark(b)) { b.xp = 0; b.diamonds = 0; bseal(b); }
  return b;
}
export function addXp(c, n) {
  const b = buildOf(c), before = clubLevel(b.xp);
  b.xp += Math.max(0, Math.round(n)); bseal(b);
  return clubLevel(b.xp) > before ? clubLevel(b.xp) : 0;     // the new club level, if it went up
}
export const addDiamonds = (c, n) => { const b = buildOf(c); b.diamonds = Math.max(0, b.diamonds + n); bseal(b); return b.diamonds; };

// ctx: { now, trusted, level(id) -> the building's level, apply(id, level), bank: { spend(k) -> k spent or 0 }, blocked(id, to) -> why not, or null }
const no = why => ({ ok: false, why });
export function whyNot(c, id, ctx) {
  const b = buildOf(c), lv = ctx.level(id), to = lv + 1;
  if (!lv) return 'Not built';
  if (lv >= MAX_LEVEL) return 'As big as it gets';
  if (b.jobs.some(j => j.id === id)) return 'Being built already';
  if (b.jobs.length >= b.builders) return 'All your builders are busy';
  if (to > clubLevel(b.xp)) return `Needs club level ${to}`;
  const other = ctx.blocked?.(id, to);
  if (other) return other;
  return null;
}
export function startBuild(c, id, ctx) {
  const why = whyNot(c, id, ctx), b = buildOf(c), to = ctx.level(id) + 1;
  if (why) return no(why);
  if (!ctx.trusted) return no('The builders need the server clock: try again when you are online');
  if (!ctx.bank.spend(costOf(id, to) * 1000)) return no('Not enough money in the club');
  b.jobs.push({ id, to, end: ctx.now + hoursOf(to) * HOUR }); bseal(b);
  return { ok: true, to };
}
// the buildings that are finished by now (only on a time the server confirmed)
export function settleBuilds(c, ctx) {
  const b = buildOf(c), done = [];
  if (!ctx.trusted) return done;
  for (const j of [...b.jobs].sort((x, y) => x.end - y.end)) {
    if (j.end > ctx.now) continue;
    b.jobs = b.jobs.filter(x => x !== j); ctx.apply(j.id, j.to); done.push(j);
  }
  if (done.length) bseal(b);
  return done;
}
export function buyBuilder(c) {
  const b = buildOf(c);
  if (b.builders >= 2) return no('You have both builders');
  if (b.diamonds < BUILD.BUILDER2) return no(`A second builder costs ${BUILD.BUILDER2} diamonds`);
  b.diamonds -= BUILD.BUILDER2; b.builders = 2; bseal(b); return { ok: true };
}
// (testing only) the clock jumps forward: the builders come nearer to finishing
export function skipBuild(c, ms) { const b = buildOf(c); for (const j of b.jobs) j.end -= ms; bseal(b); }
