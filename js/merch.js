// The club's merchandise factory: a real business that runs on real time, also while you are away. Fans want jerseys of the players they
// love (fame, from how they play); designers draw a jersey, printers make it (faster with machines), packers waste less; you pay the staff
// by the day. Pure data and functions (no screen): the state is career.merch, and every number is in $k (thousands) until you collect it.
// The time comes in as `now` (ms) from the server, never from the phone's clock (main.js), and away time is capped, so playing with the
// clock gets you nothing. A jersey belongs to a live contract: when the player goes, what is not yet printed is cancelled (and refunded),
// what is printed sells at full demand for two days, then as vintage stock (cheap, fading over a week), and a re-signed player brings it back.
import { levelRow, lookOf } from './pacing.js';
const HIRE_AT = { 1: 1, 2: 5, 3: 10 };   // (the building level a 1, 2 or 3-star hand joins at: career.js HIRE_AT)
export const MIN = 60000, HOUR = 3600000, DAY = 86400000;
export const MERCH = {
  LEVELS: [null,
    { staff: 2, machines: 0, batch: 20, stock: 60 },      // the rows for level 1, 5 and 10 (pacing.js levelRow fills in the levels between)
    { staff: 5, machines: 2, batch: 50, stock: 200 },
    { staff: 9, machines: 4, batch: 100, stock: 600 }],
  JERSEY_MIN: 3,       // minutes a jersey takes a level 1 printer, by hand
  DESIGN_MIN: 15,      // minutes a level 1 designer takes to design one player's jersey
  PRICE: 1.2, MATERIAL: 0.2,        // $k a jersey sells for, and costs to make
  MACHINE_COST: 300, MACHINE_RUN: 2, MACHINE_BOOST: 2,   // $k to buy, $k a day to run, and how many times faster a printer is with one
  STAFF_LVL_MAX: 3, TRAIN: 20,      // a staff level is 25% faster and 25% more wage; training costs $k x the level
  WASTE: 0.1, WASTE_PACKER: 0.03, WASTE_MIN: 0.02,
  CAP: 10 * HOUR, CAP_UNVERIFIED: HOUR,   // the most away time that counts in one visit (the time was not checked with the server: less)
  GRACE: 48 * HOUR, VINTAGE_DAYS: 7, VINTAGE_PRICE: 0.4, VINTAGE_DEMAND: 0.25, LEGEND_FAME: 80, LEGEND_FLOOR: 0.3,
  QUIT: 72 * HOUR,     // unpaid this long and the staff start to leave (one a day)
  START_TILL: 20,      // $k the founders put in
};
export const ROLES = {
  designer: { name: 'Designer', wage: 10, about: 'Draws a player\'s jersey before it can be made. A better designer makes jerseys more wanted.' },
  printer: { name: 'Printer', wage: 8, about: 'Makes the jerseys. A machine makes one printer twice as fast.' },
  packer: { name: 'Packer', wage: 6, about: 'Fewer jerseys are spoiled on the way out.' },
};
const NAMES = ['Imran', 'Dilshan', 'Noor', 'Chaman', 'Rahul', 'Meera', 'Sana', 'Tariq', 'Anwar', 'Lakshmi', 'Farah', 'Hari', 'Zoya', 'Kabir', 'Nisha', 'Omar', 'Ravi', 'Salma', 'Tanvir', 'Uma'];
const speedOf = s => 1 + 0.25 * (s.lvl - 1);
const wageOf = s => ROLES[s.role].wage * speedOf(s);
const cap = m => levelRow(MERCH.LEVELS, m.level);
const sum = o => Object.values(o).reduce((a, b) => a + b, 0);

export function freshMerch(now) {
  const m = { level: 1, staff: [], machines: 0, live: {}, vint: {}, left: {}, designs: {}, designing: {}, queue: [], want: {}, vwant: {}, till: MERCH.START_TILL,
    last: now, owed: 0, unpaidMs: 0, wasteAcc: 0, nextId: 1, sold: 0, earned: 0, pace: 8 * MIN, lastRate: {}, lastFame: {}, log: [], seal: 0 };
  return seal(m);
}

// ---------- fame: how much the fans love a player (0-100) ----------
export const startFame = ovr => Math.round(Math.max(5, Math.min(75, (ovr - 40) * 1.3)));
// perf: { bat: { runs, balls, fours, sixes, out }, bowl: { balls, runs, wkts } } for the match (or none: he did not play)
export function fameAfter(fame, perf, won) {
  let d = won ? 0.4 : 0;
  if (!perf) return Math.max(2, Math.min(100, fame - 0.3));   // not in the side: the fans drift away
  const b = perf.bat, w = perf.bowl;
  if (b) d += b.runs * 0.08 + b.sixes * 0.5 + b.fours * 0.15 + (b.out && b.runs === 0 ? -1.5 : 0) + (b.runs >= 50 ? 2 : 0);
  if (w) d += w.wkts * 2 + (w.balls >= 12 && w.runs / (w.balls / 6) > 12 ? -1 : 0) + (w.wkts >= 3 ? 2 : 0);
  return Math.max(2, Math.min(100, fame + d - 0.2));
}

// ---------- the seal: a casual edit of the saved game is noticed (a deterrent, not a lock: it all runs on the phone) ----------
function mark(m) {
  let h = 2166136261;
  const s = `${m.till.toFixed(2)}|${m.last}|${m.level}|${m.machines}|${m.staff.length}|${sum(m.live)}|${sum(Object.fromEntries(Object.entries(m.vint).map(([k, v]) => [k, v.n])))}|mx7`;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export const seal = m => { m.seal = mark(m); return m; };
export const sealed = m => m.seal === mark(m);

// ---------- what the staff can do ----------
export const staffOf = (m, role) => m.staff.filter(s => s.role === role);
export function printRate(m) {   // jerseys a millisecond
  const ps = staffOf(m, 'printer').sort((a, b) => b.lvl - a.lvl), boosted = Math.min(m.machines, ps.length);
  return ps.reduce((r, s, i) => r + speedOf(s) * (i < boosted ? MERCH.MACHINE_BOOST : 1) / (MERCH.JERSEY_MIN * MIN), 0);
}
export const designRate = m => staffOf(m, 'designer').reduce((r, s) => r + speedOf(s), 0) / (MERCH.DESIGN_MIN * MIN);   // designs a millisecond
export const wasteRate = m => Math.max(MERCH.WASTE_MIN, MERCH.WASTE - MERCH.WASTE_PACKER * staffOf(m, 'packer').reduce((a, s) => a + s.lvl, 0));
export const wagePerDay = m => m.staff.reduce((a, s) => a + wageOf(s), 0) + m.machines * MERCH.MACHINE_RUN;   // $k
const quality = m => Math.max(0, ...staffOf(m, 'designer').map(s => s.lvl));

// jerseys a day the fans want, by player: ctx.squad is a Map id -> { fame, name } of the players under contract, ctx.demand the jerseys a day in all
export function demandMap(m, ctx) {
  const w = new Map();
  let tot = 0;
  for (const [id, p] of ctx.squad) { const x = Math.pow(Math.max(2, p.fame) / 100, 1.5) + 0.02; w.set(id, x); tot += x; }
  const out = new Map();
  for (const [id, x] of w) { const q = m.designs[id]; out.set(id, ctx.demand * x / tot * (q ? 1 + 0.1 * (q - 1) : 1)); }
  return out;
}

// ---------- time passes ----------
// ctx: { now, trusted, squad, demand, bank: { spend(k) -> k spent or 0, give(k) } }
export function tick(m, ctx) {
  if (!sealed(m)) {   // somebody has been at the numbers: what is in the till is gone and the clock starts again
    m.till = 0; m.live = {}; m.vint = {}; m.queue = []; m.last = ctx.now; m.log.push({ t: ctx.now, text: 'The books did not add up: the till was emptied and the stock written off' });
    seal(m); return { tampered: true };
  }
  const dt = ctx.now - m.last;
  if (dt < 0) return { skipped: 'clock' };    // the time went backwards: nothing happens
  const rates = demandMap(m, ctx);
  syncRoster(m, ctx);
  for (const [id, r] of rates) { m.lastRate[id] = r; m.lastFame[id] = ctx.squad.get(id).fame; }
  const t0 = m.last, run = Math.min(dt, ctx.trusted ? MERCH.CAP : MERCH.CAP_UNVERIFIED);
  const before = { till: m.till, sold: m.sold };
  if (dt > 0) {
    const n = Math.max(1, Math.ceil(run / MIN)), s = run / n;
    for (let i = 0; i < n; i++) step(m, ctx, rates, t0 + (i + 1) * s, s);
    if (dt > run && m.unpaidMs > 0) m.unpaidMs += dt - run;   // (unpaid, and away: the staff notice)
    m.last = ctx.now;
    quit(m, ctx.now);
  }
  seal(m);
  return { ms: run, away: dt, capped: dt > run, sold: m.sold - before.sold, till: m.till - before.till };
}

function step(m, ctx, rates, t, s) {
  // the wages and the machines' running costs, as the time goes by
  m.owed += (wagePerDay(m) / DAY) * s;
  while (m.owed > 1e-9) {
    const pay = Math.min(m.owed, Math.max(0, m.till));
    m.till -= pay; m.owed -= pay;
    if (m.owed <= 1e-9) break;
    const got = ctx.bank.spend(50);
    if (!got) break;
    m.till += got;
  }
  const paid = m.owed <= 1e-9;
  m.unpaidMs = paid ? 0 : m.unpaidMs + s;
  if (paid) work(m, s);
  // the fans who want a jersey today (and the ones of a player who has just left)
  for (const [id, lf] of Object.entries(m.left)) {
    if (t - lf.at >= MERCH.GRACE) {
      if (m.live[id] > 0) m.vint[id] = { n: (m.vint[id]?.n || 0) + m.live[id], since: t, rate: lf.rate, legend: lf.legend };
      delete m.live[id]; delete m.left[id]; delete m.want[id];
    }
  }
  for (const id of new Set([...rates.keys(), ...Object.keys(m.left)])) {
    const perDay = rates.get(id) ?? m.left[id].rate;
    m.want[id] = Math.min(Math.max(perDay, 1), (m.want[id] || 0) + (perDay / DAY) * s);   // (a day's wanting at most, but a jersey if there is any at all)
    const n = Math.min(Math.floor(m.want[id]), m.live[id] || 0);
    if (n > 0) { m.live[id] -= n; m.want[id] -= n; sell(m, n, MERCH.PRICE); }
  }
  for (const [id, v] of Object.entries(m.vint)) {
    const fade = Math.max(v.legend ? MERCH.LEGEND_FLOOR : 0, 1 - (t - v.since) / (MERCH.VINTAGE_DAYS * DAY));
    const perDay = v.rate * MERCH.VINTAGE_DEMAND * fade;
    m.vwant[id] = Math.min(Math.max(perDay, 1), (m.vwant[id] || 0) + (perDay / DAY) * s);
    const n = Math.min(Math.floor(m.vwant[id]), v.n);
    if (n > 0) { v.n -= n; m.vwant[id] -= n; sell(m, n, MERCH.PRICE * MERCH.VINTAGE_PRICE); }
    if (v.n <= 0) { delete m.vint[id]; delete m.vwant[id]; }
  }
}
function sell(m, n, price) { m.till += n * price; m.earned += n * price; m.sold += n; }

// the designers and printers work down the orders
function work(m, s) {
  let dw = designRate(m) * s, pw = printRate(m) * s;
  const q = quality(m);
  for (const o of m.queue) {
    if (!m.designs[o.pid]) {
      if (dw <= 0) continue;
      const need = 1 - (m.designing[o.pid] || 0), use = Math.min(dw, need);
      m.designing[o.pid] = (m.designing[o.pid] || 0) + use; dw -= use;
      if (m.designing[o.pid] >= 1 - 1e-9) { m.designs[o.pid] = q || 1; delete m.designing[o.pid]; }
      if (!m.designs[o.pid]) continue;
    }
    if (pw <= 0) continue;
    const room = cap(m).stock - (m.live[o.pid] || 0);
    const take = Math.min(pw, o.left, Math.max(0, room - (o.frac || 0)));
    if (take <= 0) continue;
    o.left -= take; o.frac = (o.frac || 0) + take; pw -= take;
    const whole = Math.floor(o.frac + 1e-9);
    if (whole > 0) {
      o.frac -= whole;
      let good = 0;
      for (let i = 0; i < whole; i++) { m.wasteAcc += wasteRate(m); if (m.wasteAcc >= 1) m.wasteAcc -= 1; else good++; }
      m.live[o.pid] = (m.live[o.pid] || 0) + good;
    }
  }
  m.queue = m.queue.filter(o => o.left > 1e-6);
}

// a player has gone (or come back): what he had on the shelves and on order
function syncRoster(m, ctx) {
  const ids = new Set([...Object.keys(m.live), ...m.queue.map(o => o.pid), ...Object.keys(m.vint), ...Object.keys(m.left)]);
  for (const id of ids) {
    if (ctx.squad.has(id)) {
      if (m.left[id]) delete m.left[id];
      if (m.vint[id]) { m.live[id] = (m.live[id] || 0) + m.vint[id].n; delete m.vint[id]; m.log.push({ t: ctx.now, text: `${ctx.squad.get(id).name} is back: his jerseys are wanted again` }); }
    } else if (!m.left[id] && !m.vint[id]) {
      let refund = 0;
      for (const o of m.queue) if (o.pid === id) refund += o.left * MERCH.MATERIAL;
      m.queue = m.queue.filter(o => o.pid !== id);
      m.till += refund;
      m.left[id] = { at: ctx.now, rate: m.lastRate[id] || 0, legend: (m.lastFame[id] || 0) >= MERCH.LEGEND_FAME };
      m.log.push({ t: ctx.now, text: `A player left: the jerseys not yet made are cancelled (${refund.toFixed(1)}k back); the rest sell for two more days, then as vintage` });
    }
  }
  m.log = m.log.slice(-8);
}
function quit(m, now) {
  while (m.unpaidMs >= MERCH.QUIT && m.staff.length) {
    const gone = m.staff.pop(); m.unpaidMs -= DAY;
    m.log.push({ t: now, text: `${gone.name} (${ROLES[gone.role].name}) walked out: the wages were not paid` });
  }
}

// ---------- what you do ----------
const ok = { ok: true }, no = why => ({ ok: false, why });
function payFrom(m, cost, ctx) {   // from the till first, then the club's money (in its own steps)
  if (m.till >= cost) { m.till -= cost; return true; }
  const need = cost - m.till, got = ctx.bank.spend(need);
  if (!got || got < need) return false;
  m.till += got - cost; return true;
}
// cand: a person from the roster (career.js CANDIDATES): he comes with his name, his stars as his level, and his id (for his portrait)
export function hire(m, role, cand = null) {
  if (!ROLES[role]) return no('No such job');
  if (m.staff.length >= cap(m).staff) return no(`The factory has room for ${cap(m).staff} staff: upgrade it for more`);
  if (cand && (cand.kind !== 'merch' || cand.role !== role)) return no('He does not do that job');
  if (cand && m.staff.some(s => s.cand === cand.id)) return no('He is hired already');
  if (cand && m.level < HIRE_AT[cand.rating]) return no(`He joins when the factory is level ${HIRE_AT[cand.rating]}`);
  const id = m.nextId++;
  m.staff.push(cand ? { id, role, lvl: cand.rating, name: cand.name, cand: cand.id } : { id, role, lvl: 1, name: NAMES[(id * 7 + role.length) % NAMES.length] });
  seal(m); return ok;
}
export function fire(m, id) { const i = m.staff.findIndex(s => s.id === id); if (i < 0) return no('Not on the staff'); m.staff.splice(i, 1); seal(m); return ok; }
export const trainCost = s => MERCH.TRAIN * s.lvl;
export const staffMax = m => Math.min(MERCH.STAFF_LVL_MAX, lookOf(m.level) + 1);
export function train(m, id, ctx) {
  const s = m.staff.find(x => x.id === id);
  if (!s) return no('Not on the staff');
  if (s.lvl >= staffMax(m)) return no(s.lvl >= MERCH.STAFF_LVL_MAX ? 'Already the best' : 'Upgrade the factory to train further');
  if (!payFrom(m, trainCost(s), ctx)) return no('Not enough money');
  s.lvl++; seal(m); return ok;
}
export function buyMachine(m, ctx) {
  if (m.machines >= cap(m).machines) return no(cap(m).machines ? 'All the machine places are taken' : 'Upgrade the factory to fit machines');
  if (!payFrom(m, MERCH.MACHINE_COST, ctx)) return no('Not enough money');
  m.machines++; seal(m); return ok;
}
// a finished building (pacing.js): the factory is one level bigger
export function setLevel(m, level) { m.level = level; seal(m); }
// an order: qty jerseys of one player (he must be under contract)
export const maxOrder = m => cap(m).batch * Math.max(1, staffOf(m, 'printer').length);
export function order(m, pid, qty, ctx) {
  if (!ctx.squad.has(pid)) return no('He is not under contract');
  qty = Math.floor(qty);
  if (qty < 1) return no('How many?');
  if (!staffOf(m, 'printer').length) return no('Hire a printer first');
  if (qty > maxOrder(m)) return no(`At most ${maxOrder(m)} at a time`);
  const room = cap(m).stock - (m.live[pid] || 0) - m.queue.filter(o => o.pid === pid).reduce((a, o) => a + o.left, 0);
  if (qty > room) return no(room > 0 ? `The warehouse has room for ${Math.floor(room)} more of his` : 'The warehouse is full of his jerseys');
  if (!payFrom(m, qty * MERCH.MATERIAL, ctx)) return no('Not enough money for the cloth');
  m.queue.push({ pid, qty, left: qty, frac: 0 });
  seal(m); return ok;
}
export function cancel(m, index) {
  const o = m.queue[index];
  if (!o) return no('No such order');
  m.till += o.left * MERCH.MATERIAL; m.queue.splice(index, 1); seal(m); return ok;
}
// how long until an order of qty is made (ms, Infinity when it can't be), with what is already waiting ahead of it
export function forecast(m, pid, qty) {
  const pr = printRate(m), dr = designRate(m);
  const ahead = m.queue.reduce((a, o) => a + o.left, 0), design = m.designs[pid] ? 0 : dr > 0 ? (1 - (m.designing[pid] || 0)) / dr : Infinity;
  return pr > 0 ? design + (ahead + qty) / pr : Infinity;
}
export function collect(m, ctx) {
  const k = Math.floor(m.till / 50) * 50;
  if (k <= 0) return { ok: false, why: 'Less than $50k in the till' };
  const given = ctx.bank.give(k);
  m.till -= given; seal(m); return { ok: true, k: given };
}
export function notePace(m, ms) { m.pace = Math.round(Math.max(MIN, Math.min(60 * MIN, 0.7 * m.pace + 0.3 * ms))); seal(m); }
