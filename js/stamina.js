// Stamina: how tired a batter or a bowler is. Everyone starts an innings on 100 (Innings.energy in match.js keeps it).
// A batter tires from hitting out (a power batter faster, an anchor slower) and rests on singles and dots; a bowler tires
// from every ball and from being hit, and rests while the others bowl. The effects are felt through ratings.js matchup.
import { CFG } from './config.js';
import { batTypeOf } from './heroes.js';

const S = CFG.stamina;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const FULL = 100;

// 0 (fresh) to 1 (spent): nothing until `from`, then growing
export const tiredness = e => clamp((S.from - (e ?? FULL)) / S.span, 0, 1);
export const isTired = e => tiredness(e) >= 0.5;

// what one ball does to the batter's energy: runs off the bat, and whether he swung and missed
export function batDrain(player, { runs = 0, missed = false } = {}) {
  const mul = S.batMul[batTypeOf(player)] ?? 1;
  const base = runs >= 6 ? S.bat.six : runs === 4 ? S.bat.four : runs > 0 && runs % 2 === 1 ? S.bat.single : runs > 0 ? 0 : missed ? S.bat.miss : S.bat.dot;
  return base > 0 ? base * mul : base;   // (a rest is the same for everyone)
}

// what one ball does to the bowler's energy: runs off the bat, and whether it was a wide or a no-ball
export function bowlDrain(player, { runs = 0, extra = false } = {}) {
  const mul = S.bowlMul[player?.bowl] ?? 1;
  return mul * (S.bowl.ball + (runs >= 6 ? S.bowl.six : runs === 4 ? S.bowl.four : 0) + (extra ? S.bowl.extra : 0));
}

// the effect numbers for a pair, 1 / 0 when both are fresh: { power, win, edgeP } to apply to ratings.js matchup's output
export function staminaEffect(batEnergy, bowlEnergy) {
  const tb = tiredness(batEnergy), tw = tiredness(bowlEnergy), E = S.effect;
  return {
    power: (1 - E.batPower * tb) * (1 + E.bowlPower * tw),
    win: (1 - E.batWin * tb) * (1 + E.bowlWin * tw),
    edgeP: E.batEdge * tb,
  };
}

// a tired bowler is slower: the factor on his speed
export const paceTired = e => 1 - S.effect.bowlPace * tiredness(e);

// ---------- the medical centre: fitness between matches ----------
// Every player has a fitness (0-100). A match tires those who play (a share of the stamina they used); resting brings it back slowly, a bed with a
// physio brings it back fast. A player who plays while unfit may pick up a knock: until it is treated his fitness stops at 50. Fitness is the energy
// he starts the next match with (match.js), so the rules above are all the match needs. Pure data and functions: the state is career.medical, money in $k.
// The time is the server's (main.js), as for the other buildings.
import { levelRow, lookOf } from './pacing.js';
export const MIN = 60000, HOUR = 3600000, DAY = 86400000;
export const MED = {
  LEVELS: [null,
    { beds: 2, physios: 1, prevent: 1 },       // the rows for level 1, 5 and 10 (pacing.js levelRow fills in the levels between); beds; physios (each looks after two beds); prevent: the share of the knock chance that is left
    { beds: 4, physios: 2, prevent: 0.7 },
    { beds: 6, physios: 3, prevent: 0.5 }],
  REST: 3, BED: 12,                    // fitness points an hour: resting, and in a bed with a level 1 physio
  LOSS: 0.6,                           // the share of the stamina a player used in a match that he loses in fitness
  RISK_BELOW: 40, RISK_MAX: 0.4,       // a player who starts a match under 40 fitness risks a knock: 40% at 0, none at 40
  KNOCK_CAP: 50, KNOCK_BED_H: 6, KNOCK_REST_H: 36,
  WAGE: 10, PHYSIO_TRAIN: 20, PHYSIO_MAX: 3,   // $k a day for a level 1 physio (+25% a level); training him costs $k x his level
  CAP: 10 * HOUR, CAP_UNVERIFIED: HOUR, START_FUND: 10,
};
const physioSpeed = p => 1 + 0.25 * (p.lvl - 1);
const mcap = m => levelRow(MED.LEVELS, m.level);
const msum = o => Object.values(o).reduce((a, b) => a + b, 0);
const PHYSIOS = ['Dr Nair', 'Dr Silva', 'Dr Okafor', 'Dr Hussain', 'Dr Perera', 'Dr Banerjee', 'Dr Khan', 'Dr Fernando'];

export function freshMedical() {
  return medSeal({ level: 1, fund: MED.START_FUND, fit: {}, knocked: {}, bedMs: {}, beds: [null, null], physios: [], matches: 0, last: null, owed: 0, unpaidMs: 0, nextId: 1, log: [], seal: 0 });
}
function medMark(m) {
  let h = 2166136261;
  const s = `${m.fund.toFixed(2)}|${m.last}|${m.level}|${m.physios.length}|${Math.round(msum(m.fit))}|${Object.keys(m.knocked).length}|${m.matches}|md2`;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export const medSeal = m => { m.seal = medMark(m); return m; };
export const medSealed = m => m.seal === medMark(m);
export const fitOf = (m, id) => (m ? m.fit[id] ?? 100 : 100);
export const isKnocked = (m, id) => !!m && id in m.knocked;
export const fitCap = (m, id) => (isKnocked(m, id) ? MED.KNOCK_CAP : 100);
export const medWagePerDay = m => m.physios.reduce((a, p) => a + MED.WAGE * physioSpeed(p), 0);
// the chance that a player who starts a match on this fitness comes away with a knock
export const knockChance = (fit, level) => (fit >= MED.RISK_BELOW ? 0 : MED.RISK_MAX * (1 - fit / MED.RISK_BELOW) * levelRow(MED.LEVELS, level).prevent);
// the beds that are working: the occupied ones, as many as the physios can look after
export function workingBeds(m) {
  const cap = m.physios.length * 2, out = [];
  for (let i = 0; i < m.beds.length; i++) if (m.beds[i] && out.length < cap) out.push(i);
  return out;
}
export const bedSpeed = m => (m.physios.length ? m.physios.reduce((a, p) => a + physioSpeed(p), 0) / m.physios.length : 0);

// after a match: list = [{ id, start, drain }] (the fitness he started on, and the stamina he used); rng: a function giving 0..1 for the knocks
export function medAfterMatch(m, list, rnd) {
  const knocked = [];
  m.matches++;
  for (const { id, start, drain } of list) {
    const was = m.fit[id] ?? 100;
    m.fit[id] = Math.max(0, Math.min(fitCap(m, id), was - MED.LOSS * Math.max(0, drain)));
    if (!isKnocked(m, id) && rnd() < knockChance(start, m.level)) { m.knocked[id] = null; m.bedMs[id] = 0; m.fit[id] = Math.min(m.fit[id], MED.KNOCK_CAP); knocked.push(id); }
  }
  medSeal(m);
  return knocked;
}

// ctx: { now, trusted, bank: { spend(k) -> k spent or 0 }, has(id) -> he is still in the squad }
export function medTick(m, ctx) {
  if (!medSealed(m)) {   // somebody has been at the numbers: the fund is gone and so is everyone's fitness
    m.fund = 0; m.fit = {}; m.knocked = {}; m.last = ctx.now;
    m.log.push({ t: ctx.now, text: 'The books did not add up: the fund was emptied and the records lost' });
    medSeal(m); return { tampered: true };
  }
  if (m.last == null) { m.last = ctx.now; medSeal(m); return { first: true }; }
  const dt = ctx.now - m.last;
  if (dt < 0) return { skipped: 'clock' };
  for (const k of Object.keys(m.fit)) if (!ctx.has(k)) { delete m.fit[k]; delete m.knocked[k]; delete m.bedMs[k]; }
  m.beds = m.beds.map(id => (id && ctx.has(id) ? id : null));
  for (const id of Object.keys(m.knocked)) if (m.knocked[id] == null) m.knocked[id] = m.last;   // (a knock from the last match: from when we last looked)
  const before = { ...m.fit }, knocksBefore = Object.keys(m.knocked).length;
  const run = Math.min(dt, ctx.trusted ? MED.CAP : MED.CAP_UNVERIFIED);
  if (dt > 0) {
    const n = Math.max(1, Math.ceil(run / MIN)), s = run / n;
    for (let i = 0; i < n; i++) {
      const t = m.last + (i + 1) * s;
      m.owed += (medWagePerDay(m) / DAY) * s;
      while (m.owed > 1e-9) {
        const pay = Math.min(m.owed, Math.max(0, m.fund));
        m.fund -= pay; m.owed -= pay;
        if (m.owed <= 1e-9) break;
        const got = ctx.bank.spend(50);
        if (!got) break;
        m.fund += got;
      }
      const paid = m.owed <= 1e-9;
      m.unpaidMs = paid ? 0 : m.unpaidMs + s;
      const beds = paid ? new Set(workingBeds(m).map(b => m.beds[b])) : new Set(), sp = bedSpeed(m);
      for (const id of Object.keys(m.fit)) {
        const inBed = beds.has(id), rate = inBed ? MED.BED * sp : MED.REST;
        m.fit[id] = Math.min(fitCap(m, id), m.fit[id] + rate * s / HOUR);
        if (inBed) m.bedMs[id] = (m.bedMs[id] || 0) + s;
        if (isKnocked(m, id) && ((m.bedMs[id] || 0) >= MED.KNOCK_BED_H * HOUR || t >= m.knocked[id] + MED.KNOCK_REST_H * HOUR)) { delete m.knocked[id]; m.bedMs[id] = 0; m.log.push({ t, text: `${ctx.nameOf?.(id) || 'A player'} has recovered from his knock` }); }
      }
    }
    // the time beyond the ten hours: resting only (nothing is lost by being away)
    if (dt > run) {
      for (const id of Object.keys(m.fit)) {
        if (isKnocked(m, id) && ctx.now >= m.knocked[id] + MED.KNOCK_REST_H * HOUR) { delete m.knocked[id]; m.bedMs[id] = 0; }   // (healed first: then he can get all the way back)
        m.fit[id] = Math.min(fitCap(m, id), m.fit[id] + MED.REST * (dt - run) / HOUR);
      }
    }
    m.last = ctx.now;
  }
  // a player who is fit again leaves his bed
  for (let i = 0; i < m.beds.length; i++) { const id = m.beds[i]; if (id && m.fit[id] >= 100 && !isKnocked(m, id)) { m.beds[i] = null; m.bedMs[id] = 0; } }
  m.log = m.log.slice(-8);
  medSeal(m);
  return { away: dt, gained: Math.round(msum(m.fit) - msum(before)), healed: knocksBefore - Object.keys(m.knocked).length };
}

// ---------- what you do ----------
const mok = { ok: true }, mno = why => ({ ok: false, why });
function medPay(m, cost, ctx) {
  if (m.fund >= cost) { m.fund -= cost; return true; }
  const need = cost - m.fund, got = ctx.bank.spend(need);
  if (!got || got < need) return false;
  m.fund += got - cost; return true;
}
export function hirePhysio(m) {
  if (m.physios.length >= mcap(m).physios) return mno(`The centre has room for ${mcap(m).physios} physio${mcap(m).physios > 1 ? 's' : ''}: upgrade it for more`);
  const id = m.nextId++;
  m.physios.push({ id, lvl: 1, name: PHYSIOS[(id * 5) % PHYSIOS.length] });
  medSeal(m); return mok;
}
export function firePhysio(m, id) { const i = m.physios.findIndex(p => p.id === id); if (i < 0) return mno('Not on the staff'); m.physios.splice(i, 1); medSeal(m); return mok; }
export const physioTrainCost = p => MED.PHYSIO_TRAIN * p.lvl;
export const physioMax = m => Math.min(MED.PHYSIO_MAX, lookOf(m.level) + 1);
export function trainPhysio(m, id, ctx) {
  const p = m.physios.find(x => x.id === id);
  if (!p) return mno('Not on the staff');
  if (p.lvl >= physioMax(m)) return mno(p.lvl >= MED.PHYSIO_MAX ? 'Already the best' : 'Upgrade the centre to train further');
  if (!medPay(m, physioTrainCost(p), ctx)) return mno('Not enough money');
  p.lvl++; medSeal(m); return mok;
}
// a finished building (pacing.js): the centre is one level bigger, with the beds for it
export function medSetLevel(m, level) { m.level = level; while (m.beds.length < mcap(m).beds) m.beds.push(null); medSeal(m); }
export function putInBed(m, index, id, ctx) {
  if (!ctx.has(id)) return mno('He is not in your squad');
  if (index < 0 || index >= m.beds.length) return mno('No such bed');
  if (m.beds.includes(id)) return mno('He is in a bed already');
  if (m.beds[index]) return mno('That bed is taken');
  if ((m.fit[id] ?? 100) >= 100 && !isKnocked(m, id)) return mno('He is fully fit');
  m.beds[index] = id; medSeal(m); return mok;
}
export function leaveBed(m, index) { if (!m.beds[index]) return mno('Nobody there'); m.beds[index] = null; medSeal(m); return mok; }
// (testing only) the clock jumps forward
export function medSkip(m, ms) { m.last -= ms; for (const id of Object.keys(m.knocked)) if (m.knocked[id] != null) m.knocked[id] -= ms; medSeal(m); }
