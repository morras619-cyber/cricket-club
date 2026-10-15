// Squads: bowler types, each team's regular players, the star heroes' roles, line-ups and
// how a side rotates its bowlers. Pure data and functions (no DOM), fixed by ids and seeds.
import { makeRng } from './rng.js';
import { HEROES, heroById } from './heroes.js';

// ---------- bowler types ----------
// kmh: stock speed range. swing/seam: how much the ball moves in the air / off the pitch (m).
// turn: spin off the pitch for a right-hander (+ = leg to off). runup: share of a full run-up.
export const BOWL_TYPES = {
  express: { id: 'express', name: 'Express pace', short: 'Express', spin: false, kmh: [142, 153], swing: 0.1, seam: 0.07, runup: 1,
    stock: ['Seam up', 'Outswinger'], variation: 'Slower bouncer' },
  swing: { id: 'swing', name: 'Swing bowler', short: 'Swing', spin: false, kmh: [128, 139], swing: 0.27, seam: 0.05, runup: 0.9,
    stock: ['Outswinger', 'Inswinger'], variation: 'Slower ball' },
  seam: { id: 'seam', name: 'Seam & cutters', short: 'Seam', spin: false, kmh: [117, 128], swing: 0.07, seam: 0.16, runup: 0.75,
    stock: ['Leg-cutter', 'Off-cutter'], variation: 'Knuckle ball' },
  leftpace: { id: 'leftpace', name: 'Left-arm pace', short: 'Left-arm', spin: false, left: true, kmh: [132, 143], swing: 0.2, seam: 0.06, runup: 0.9,
    stock: ['Angled across', 'Inswinger'], variation: 'Slower ball' },
  offspin: { id: 'offspin', name: 'Off-spin', short: 'Off-spin', spin: true, kmh: [80, 90], turn: -0.27, runup: 0.35,
    stock: ['Off-break'], variation: 'Arm ball' },
  legspin: { id: 'legspin', name: 'Leg-spin', short: 'Leg-spin', spin: true, kmh: [74, 86], turn: 0.34, runup: 0.35,
    stock: ['Leg-break'], variation: 'Googly' },
};
export const bowlType = id => BOWL_TYPES[id] || BOWL_TYPES.swing;

// Physics for a named delivery of a bowler type. k (0..1) picks a speed within the range.
export function deliveryParams(typeId, name, k = 0.6, rng = null) {
  const T = bowlType(typeId);
  const j = () => (rng ? rng.range(0.85, 1.15) : 1);
  const kmh = T.kmh[0] + (T.kmh[1] - T.kmh[0]) * k;
  const rx = T.left ? -0.3 : 0.3;
  const p = { kmh, swing: 0, move: 0, loop: T.spin ? 1.3 : 0.4, rx, type: name };
  switch (name) {
    case 'Outswinger': p.swing = T.swing * j(); p.move = T.seam * 0.4; break;
    case 'Inswinger': p.swing = -T.swing * j(); p.move = -T.seam * 0.4; break;
    case 'Angled across': p.swing = 0.05; p.move = T.seam * 0.5; break;
    case 'Seam up': p.move = (rng ? rng.range(-1, 1) : 0) * T.seam; break;
    case 'Leg-cutter': p.move = T.seam * j(); break;
    case 'Off-cutter': p.move = -T.seam * j(); break;
    case 'Off-break': case 'Leg-break': p.move = T.turn * j(); break;
    case 'Arm ball': p.move = 0.02; p.kmh = T.kmh[1] + 4; p.loop = 0.9; break;
    case 'Googly': p.move = -T.turn * 0.8 * j(); p.loop = 1.5; break;
    case 'Slower bouncer': case 'Slower ball': case 'Knuckle ball':
      p.kmh = T.kmh[0] * 0.8; p.loop = 1.1; p.slower = true; break;
    default: break;
  }
  return p;
}

// ---------- the regular players ----------
const FIRST = ['Arjun', 'Kabir', 'Rohan', 'Imad', 'Faisal', 'Dev', 'Ravi', 'Salman', 'Nikhil', 'Hamza', 'Vikram', 'Usman', 'Aarav', 'Zain',
  'Karan', 'Danish', 'Ishaan', 'Yasir', 'Pranav', 'Shoaib', 'Tariq', 'Neel', 'Adil', 'Sameer', 'Junaid', 'Varun', 'Bilawal', 'Kunal',
  'Omar', 'Siddharth', 'Rizwan', 'Aditya', 'Asif', 'Manish', 'Fawad', 'Harsh', 'Jibran', 'Ankit', 'Saad', 'Mohit', 'Ehsan', 'Rahul'];
const LAST = ['Sharma', 'Khan', 'Iqbal', 'Patel', 'Malik', 'Rao', 'Qureshi', 'Mehta', 'Butt', 'Nair', 'Sheikh', 'Kapoor', 'Mirza', 'Joshi',
  'Siddiqui', 'Verma', 'Hussain', 'Gill', 'Raza', 'Bhatt', 'Ansari', 'Desai', 'Chaudhry', 'Pillai', 'Shah', 'Saini', 'Abbasi', 'Reddy',
  'Ahmed', 'Kulkarni', 'Haider', 'Menon', 'Akhtar', 'Yadav', 'Javed', 'Bose'];

// each team's bowling mix: [all-rounder 1, all-rounder 2, bowler 1, bowler 2, bowler 3]
const MIX = {
  thunder: ['seam', 'offspin', 'express', 'swing', 'legspin'],
  cyclones: ['swing', 'legspin', 'seam', 'leftpace', 'offspin'],
  vipers: ['seam', 'offspin', 'express', 'leftpace', 'legspin'],
  eagles: ['leftpace', 'legspin', 'swing', 'seam', 'offspin'],
  phoenix: ['seam', 'legspin', 'express', 'swing', 'offspin'],
  titans: ['swing', 'offspin', 'seam', 'express', 'legspin'],
  storm: ['seam', 'legspin', 'leftpace', 'swing', 'offspin'],
  royals: ['leftpace', 'offspin', 'express', 'seam', 'legspin'],
};
// batting weak spots for the AI's regular batters, as the scouting report describes them
const WEAK = [
  { weak: { lengths: ['yorker'], lanes: null }, label: 'can\'t dig out yorkers' },
  { weak: { lengths: ['short', 'bouncer'], lanes: null }, label: 'hates the short ball' },
  { weak: { lengths: ['good', 'full'], lanes: ['wideoff'] }, label: 'chases wide ones outside off' },
  { weak: { lengths: ['full'], lanes: ['stumps', 'leg'] }, label: 'falls over to full balls on the pads' },
  { weak: { lengths: ['good'], lanes: ['off'] }, label: 'pokes at good length outside off' },
];

function hashStr(s) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }

const rosterCache = new Map();
// Ten regulars per team: two openers, a No.3, a middle-order bat, a keeper, two all-rounders, three bowlers.
export function roster(teamId) {
  if (rosterCache.has(teamId)) return rosterCache.get(teamId);
  const rng = makeRng(hashStr(teamId));
  const used = new Set();
  const name = () => {
    for (;;) {
      const n = `${rng.pick(FIRST)} ${rng.pick(LAST)}`;
      const first = n.split(' ')[0];
      if (!used.has(n) && !used.has(first)) { used.add(n); used.add(first); return n; }
    }
  };
  const mix = MIX[teamId] || MIX.thunder;
  const r = (a, b) => Math.round(rng.range(a, b));
  const spec = [
    ['bat', 'Opener', r(70, 80)], ['bat', 'Opener', r(68, 78)], ['bat', 'Top order', r(72, 82)], ['bat', 'Middle order', r(62, 72)],
    ['wk', 'Keeper-batter', r(55, 66)],
    ['all', 'All-rounder', r(48, 60), mix[0], r(56, 68)], ['all', 'All-rounder', r(45, 58), mix[1], r(56, 68)],
    ['bowl', 'Bowler', r(22, 34), mix[2], r(72, 84)], ['bowl', 'Bowler', r(18, 30), mix[3], r(70, 82)], ['bowl', 'Bowler', r(15, 26), mix[4], r(70, 82)],
  ];
  let nm;
  const list = spec.map(([role, label, bat, bowl, bowlSkill], i) => {
    const w = WEAK[(i + hashStr(teamId)) % WEAK.length];
    return {
      id: `${teamId}-${i}`, name: (nm = name()), short: nm.split(' ')[1], role, label, bat, bowl: bowl || null, bowlSkill: bowlSkill || 0, hero: false,
      ai: { ...w, honesty: rng.range(0.5, 0.85), fire: rng.range(0.2, 0.5), rattle: rng.range(0.25, 0.5) },
    };
  });
  rosterCache.set(teamId, list);
  return list;
}

// The star heroes as players: batting heroes bat like stars; bowling heroes bowl their type.
const HERO_PLAYER = {
  raja: { bat: 92 }, meher: { bat: 90 }, comet: { bat: 91 },
  zara: { bat: 24, bowl: 'express', bowlSkill: 92 }, babar: { bat: 30, bowl: 'offspin', bowlSkill: 92 }, imran: { bat: 34, bowl: 'seam', bowlSkill: 92 },
  rani: { bat: 66, keeper: true }, bilal: { bat: 58 },
};
export function heroPlayer(hero) {
  const h = typeof hero === 'string' ? heroById(hero) : hero;
  const x = HERO_PLAYER[h.id] || { bat: 50 };
  return {
    id: h.id, name: h.name, short: h.name.split(' ').slice(1).join(' '), role: h.slot === 'bat' ? 'bat' : h.slot === 'bowl' ? 'bowl' : x.keeper ? 'wk' : 'bat',
    label: h.role, bat: x.bat, bowl: x.bowl || null, bowlSkill: x.bowlSkill || 0, hero: h,
    ai: h.ai ? { ...h.ai } : { weak: { lengths: ['good'], lanes: ['off'] }, label: 'pokes at good length outside off', honesty: 0.7, fire: 0.3, rattle: 0.3 },
  };
}

// ---------- unlocking heroes ----------
export const STARTER_HEROES = ['raja', 'zara', 'rani'];
export const UNLOCK_COST = 250;
export const isUnlocked = (profile, id) => (profile.unlocked || STARTER_HEROES).includes(id);

// ---------- line-ups ----------
export const ORDER_SIZE = 4;  // batters who can come in (3 wickets in an innings)
export const ATTACK_SIZE = 3; // bowlers who share the 5 overs
export const MAX_OVERS = 2;   // overs any one bowler may bowl

// Everyone available to a side: the team's regulars plus its three chosen heroes.
export function squadPool(teamId, heroes) {
  return [...[heroes.bat, heroes.field, heroes.bowl].filter(Boolean).map(heroPlayer), ...roster(teamId)];
}
export const batCandidates = pool => pool.filter(p => p.role !== 'bowl' || p.hero).sort((a, b) => b.bat - a.bat);
export const bowlCandidates = pool => pool.filter(p => p.bowl).sort((a, b) => b.bowlSkill - a.bowlSkill);

// The default batting order (star batter opens) and a balanced three-man attack.
export function defaultLineup(teamId, heroes) {
  const pool = squadPool(teamId, heroes);
  const star = heroes.bat && pool.find(p => p.id === heroes.bat.id);
  const order = [star, ...batCandidates(pool).filter(p => p !== star)].filter(Boolean).slice(0, ORDER_SIZE);
  const bowlStar = heroes.bowl && pool.find(p => p.id === heroes.bowl.id);
  const others = bowlCandidates(pool).filter(p => p !== bowlStar);
  const attack = [bowlStar].filter(Boolean);
  const want = bowlStar && bowlType(bowlStar.bowl).spin ? [false, null] : [false, true]; // pace partner, then a spinner
  for (const spin of want) {
    const pick = others.find(p => !attack.includes(p) && (spin === null || bowlType(p.bowl).spin === spin));
    if (pick) attack.push(pick);
  }
  for (const p of others) if (attack.length < ATTACK_SIZE && !attack.includes(p)) attack.push(p);
  return { order: order.map(p => p.id), attack: attack.slice(0, ATTACK_SIZE).map(p => p.id) };
}

// Resolve saved ids against the pool, filling any gaps from the defaults.
export function resolveLineup(teamId, heroes, saved) {
  const pool = squadPool(teamId, heroes), byId = id => pool.find(p => p.id === id);
  const def = defaultLineup(teamId, heroes);
  const fill = (ids, defIds, n, ok) => {
    const out = [];
    for (const id of [...(ids || []), ...defIds]) { const p = byId(id); if (p && ok(p) && !out.includes(p)) out.push(p); }
    return out.slice(0, n);
  };
  return {
    order: fill(saved?.order, def.order, ORDER_SIZE, p => p.role !== 'bowl' || p.hero || true),
    attack: fill(saved?.attack, def.attack, ATTACK_SIZE, p => !!p.bowl),
  };
}

// Which bowler bowls each over: new ball to the quick, spin in the middle, the star twice
// (one of them the last over). Nobody bowls two in a row or more than MAX_OVERS.
export function overPlan(attack, overs = 5) {
  const star = attack.find(p => p.hero) || attack[0];
  const pace = attack.filter(p => p !== star && !bowlType(p.bowl).spin);
  const spin = attack.filter(p => p !== star && bowlType(p.bowl).spin);
  const prefer = [[...pace, ...spin, star], [star, ...spin, ...pace], [...spin, ...pace, star], [...pace, ...spin, star], [star, ...pace, ...spin]];
  const count = new Map(), plan = [];
  for (let o = 0; o < overs; o++) {
    const last = plan[o - 1];
    const ok = p => p !== last && (count.get(p) || 0) < MAX_OVERS;
    const pick = (prefer[o % prefer.length].find(ok)) || attack.find(ok) || attack.find(p => p !== last) || attack[0];
    plan.push(pick); count.set(pick, (count.get(pick) || 0) + 1);
  }
  return plan;
}

// May this bowler take the next over? (not two in a row, not more than MAX_OVERS)
export function canBowl(p, overs, lastId) { return p.id !== lastId && (overs[p.id] || 0) < MAX_OVERS; }

export const HERO_IDS = HEROES.map(h => h.id);
