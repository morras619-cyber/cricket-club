// Squads: bowler types, each team's regular players, the star heroes' roles, line-ups and
// how a side rotates its bowlers. Pure data and functions (no DOM), fixed by ids and seeds.
import { makeRng } from './rng.js';
import { HEROES, heroById } from './heroes.js';
import { teamById, teamOfHero, TEAMS, NATIONAL } from './teams.js';
import { flag } from './nations.js';

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
// Every team is its own squad: hand-picked names, nicknames, a trait the commentary and team
// sheet show, and a different make-up (Thunder bat deep, Vipers are all spin, Titans grind).
// [name, nickname, role, label, batting, bowler type, bowling skill, trait, weak spot, nation (nations.js)]
// role: 'bat' | 'wk' | 'all' | 'bowl'. Weak spot indexes WEAK below (what the scouting report finds).
const SQUADS = {
  thunder: [
    ['Aryan Malhotra', 'Sixer', 'bat', 'Opener', 82, null, 0, 'Clears the rope from ball one', 0, 'IN'],
    ['Jake Thornton', 'Bulldozer', 'bat', 'Opener', 77, null, 0, 'Hits through the line, hates dot balls', 1, 'AU'],
    ['Dev Rana', 'Helicopter', 'bat', 'No. 3', 80, null, 0, 'Flicks yorkers into the crowd', 2, 'IN'],
    ['Andre Belgrave', 'Long Handle', 'bat', 'Finisher', 75, null, 0, 'Saves the big swings for the death', 3, 'WI'],
    ['Sunny Bhatia', 'Gloves', 'wk', 'Keeper-batter', 68, null, 0, 'Quick hands, quicker temper', 4, 'IN'],
    ['Zubair Khan', 'Zoom', 'all', 'Seam all-rounder', 63, 'seam', 66, 'Cutters on a slow pitch', 1, 'PK'],
    ['Rocky van Wyk', 'Rocket', 'bowl', 'Fast bowler', 30, 'express', 77, 'Raw pace, sprays a few', 0, 'ZA'],
    ['Aamir Lodhi', 'Banana', 'bowl', 'Swing bowler', 22, 'swing', 74, 'Late outswing with the new ball', 2, 'PK'],
    ['Rakibul Karim', 'Twirl', 'bowl', 'Off-spinner', 18, 'offspin', 70, 'Flat and quick through the air', 3, 'BD'],
    ['Hamid Noorzai', 'Magic', 'bowl', 'Leg-spinner', 16, 'legspin', 69, 'Big turner, the odd full toss', 4, 'AF'],
  ],
  cyclones: [
    ['Rohan Pillai', 'Rock', 'bat', 'Opener', 74, null, 0, 'Sees off the new ball', 4, 'IN'],
    ['Faraz Mirza', 'Flash', 'bat', 'Opener', 71, null, 0, 'Loves width outside off', 2, 'PK'],
    ['Callum Fraser', 'Anchor', 'bat', 'No. 3', 76, null, 0, 'Bats through the innings', 0, 'NZ'],
    ['Saad Ahmed', 'Smasher', 'wk', 'Keeper-batter', 64, null, 0, 'Sweeps everything', 3, 'PK'],
    ['Mitchell Doyle', 'Lefty', 'all', 'Left-arm all-rounder', 60, 'leftpace', 72, 'Angles it across the right-hander', 1, 'AU'],
    ['Ankit Desai', 'Hurricane', 'all', 'Swing all-rounder', 56, 'swing', 74, 'Banana inswinger at the stumps', 0, 'IN'],
    ['Varun Gill', 'Viper', 'all', 'Spin all-rounder', 52, 'legspin', 68, 'Googly he hides well', 2, 'IN'],
    ['Oliver Hartley', 'Gale', 'bowl', 'Swing bowler', 24, 'swing', 82, 'Swings it both ways', 1, 'EN'],
    ['Jaspreet Dhillon', 'Jassi', 'bowl', 'Left-arm quick', 20, 'leftpace', 80, 'Yorkers at the end', 3, 'IN'],
    ['Mahfuz Rahman', 'Breeze', 'bowl', 'Off-spinner', 15, 'offspin', 70, 'Tidy and patient', 4, 'BD'],
  ],
  vipers: [
    ['Kunal Saini', 'Snake', 'bat', 'Opener', 72, null, 0, 'Nudges and nurdles', 3, 'IN'],
    ['Yasir Abbasi', 'Fang', 'bat', 'Opener', 70, null, 0, 'Charges the spinners', 1, 'PK'],
    ['Dinesh Wickramasinghe', 'The Wall', 'bat', 'No. 3', 78, null, 0, 'Never gets out early', 2, 'LK'],
    ['Hamza Iqbal', 'Hooks', 'wk', 'Keeper-batter', 62, null, 0, 'Reads spin from behind the stumps', 0, 'PK'],
    ['Dev Kulkarni', 'Coil', 'all', 'Spin all-rounder', 64, 'offspin', 76, 'Arm ball that skids on', 4, 'IN'],
    ['Tharindu Jayasena', 'Hiss', 'all', 'Spin all-rounder', 58, 'legspin', 78, 'Leg-break, googly, leg-break', 2, 'LK'],
    ['Aditya Rao', 'Venom', 'all', 'Seam all-rounder', 55, 'seam', 66, 'Knuckle balls and cutters', 3, 'IN'],
    ['Shoaib Raza', 'Cobra', 'bowl', 'Leg-spinner', 18, 'legspin', 84, 'The best googly in the league', 0, 'PK'],
    ['Farid Jalali', 'Sting', 'bowl', 'Off-spinner', 14, 'offspin', 80, 'Spins it square on a dry pitch', 1, 'AF'],
    ['Bilawal Gul', 'Strike', 'bowl', 'Left-arm quick', 20, 'leftpace', 72, 'One fast bowler to keep you honest', 4, 'PK'],
  ],
  eagles: [
    ['Harsh Reddy', 'Talon', 'bat', 'Opener', 79, null, 0, 'Takes on the short ball', 2, 'IN'],
    ['Danish Haider', 'Swoop', 'bat', 'Opener', 74, null, 0, 'Runs like the wind', 0, 'PK'],
    ['Ryan McAllister', 'Kingfisher', 'bat', 'No. 3', 77, null, 0, 'Dances down the pitch', 4, 'AU'],
    ['Shane Granger', 'Soar', 'bat', 'Middle order', 72, null, 0, 'Picks the gaps for twos', 3, 'WI'],
    ['Aarav Nair', 'Hawkeye', 'wk', 'Keeper-batter', 66, null, 0, 'Never misses a stumping', 1, 'IN'],
    ['Thabo Mthembu', 'Javelin', 'bowl', 'Fast bowler', 28, 'express', 82, '150 km/h and a bouncer', 3, 'ZA'],
    ['Rizwan Akram', 'Falcon', 'bowl', 'Left-arm quick', 24, 'leftpace', 76, 'Swings it into the pads', 0, 'PK'],
    ['Priyank Yadav', 'Feather', 'bowl', 'Swing bowler', 20, 'swing', 72, 'Away swing on a cloudy day', 2, 'IN'],
    ['Liam Buckley', 'Glide', 'bowl', 'Leg-spinner', 18, 'legspin', 70, 'Loops it high', 1, 'IE'],
    ['Nadir Sheikh', 'Nest', 'bowl', 'Off-spinner', 15, 'offspin', 66, 'Bowls dry in the middle overs', 4, 'PK'],
  ],
  phoenix: [
    ['Bilal Akhtar', 'Spark', 'bat', 'Opener', 73, null, 0, 'Quick starts, quick exits', 1, 'PK'],
    ['Yuvraj Sodhi', 'Flame', 'bat', 'Opener', 75, null, 0, 'Lofts over cover', 2, 'IN'],
    ['Faisal Naqvi', 'Ember', 'bat', 'No. 3', 74, null, 0, 'Rotates the strike', 4, 'PK'],
    ['Dwayne Hollis', 'Inferno', 'wk', 'Keeper-batter', 71, null, 0, 'Hits the death overs for fun', 0, 'WI'],
    ['Siddharth Verma', 'Blaze', 'all', 'Seam all-rounder', 68, 'seam', 70, 'Slower balls at the death', 3, 'IN'],
    ['Marlon Greaves', 'Ash', 'all', 'Spin all-rounder', 64, 'legspin', 70, 'Wrist spin and big hitting', 1, 'WI'],
    ['Marco Pienaar', 'Torch', 'all', 'Pace all-rounder', 60, 'express', 74, 'Short and fast, swings hard', 2, 'ZA'],
    ['Fawad Bhatt', 'Cinder', 'bowl', 'Swing bowler', 34, 'swing', 76, 'Yorker on demand', 0, 'PK'],
    ['Ashik Talukder', 'Smoke', 'bowl', 'Off-spinner', 30, 'offspin', 72, 'Even the No. 10 can bat', 3, 'BD'],
    ['Tariq Butt', 'Coal', 'bowl', 'Left-arm quick', 26, 'leftpace', 72, 'Bowls the 20th over', 4, 'PK'],
  ],
  titans: [
    ['Tariq Mirza', 'Anvil', 'bat', 'Opener', 76, null, 0, 'Leaves anything outside off', 3, 'PK'],
    ['Ben Ashworth', 'Bolt', 'bat', 'Opener', 72, null, 0, 'Blocks, blocks, then boom', 4, 'EN'],
    ['James Whitfield', 'Girder', 'bat', 'No. 3', 79, null, 0, 'Plays straight, always', 1, 'EN'],
    ['Tendai Moyo', 'Rivet', 'bat', 'Middle order', 73, null, 0, 'Grinds out 30s', 0, 'ZW'],
    ['Henry Blackwood', 'Forge', 'wk', 'Keeper-batter', 64, null, 0, 'Sharp behind the stumps', 2, 'EN'],
    ['Sameer Javed', 'Hammer', 'all', 'Seam all-rounder', 60, 'seam', 76, 'Hits the deck hard', 3, 'PK'],
    ['Craig Lockhart', 'Steel', 'all', 'Seam all-rounder', 56, 'seam', 74, 'Line and length all day', 0, 'NZ'],
    ['Sipho Nkosi', 'Crane', 'bowl', 'Fast bowler', 22, 'express', 78, 'Short ball specialist', 1, 'ZA'],
    ['Rizwan Khan', 'Weld', 'bowl', 'Swing bowler', 18, 'swing', 74, 'Inswinger to the pads', 2, 'PK'],
    ['Manish Gupta', 'Lathe', 'bowl', 'Off-spinner', 15, 'offspin', 70, 'Darts it in at the stumps', 4, 'IN'],
  ],
  storm: [
    ['Ravi Malik', 'Wrist', 'bat', 'Opener', 77, null, 0, 'Flicks off the pads with a flourish', 3, 'IN'],
    ['Shoaib Haider', 'Silk', 'bat', 'Opener', 74, null, 0, 'All timing, no muscle', 1, 'PK'],
    ['Arjun Iyer', 'Brush', 'bat', 'No. 3', 78, null, 0, 'Late cuts and ramps', 2, 'IN'],
    ['Niroshan Silva', 'Mist', 'wk', 'Keeper-batter', 66, null, 0, 'Reverse-sweeps for fun', 0, 'LK'],
    ['Rafiq Alam', 'Rumble', 'all', 'Left-arm all-rounder', 58, 'leftpace', 72, 'Angles it in from wide', 4, 'BD'],
    ['Dilan Wijesekara', 'Drizzle', 'all', 'Spin all-rounder', 60, 'legspin', 76, 'Wrist spin that drifts', 1, 'LK'],
    ['Neel Chawla', 'Lightning', 'all', 'Seam all-rounder', 54, 'seam', 68, 'Off-cutters into the pitch', 3, 'IN'],
    ['Hamza Nawaz', 'Hail', 'bowl', 'Off-spinner', 20, 'offspin', 78, 'Loop and dip', 2, 'PK'],
    ['Ehan Rizvi', 'Squall', 'bowl', 'Leg-spinner', 16, 'legspin', 80, 'Two googlies an over', 0, 'PK'],
    ['Kashif Lone', 'Gust', 'bowl', 'Swing bowler', 22, 'swing', 74, 'New-ball swing', 4, 'PK'],
  ],
  royals: [
    ['Finn Gallagher', 'Prince', 'bat', 'Opener', 75, null, 0, 'Classic cover drive', 4, 'IE'],
    ['Sameer Raza', 'Duke', 'bat', 'Opener', 73, null, 0, 'Pulls anything short', 0, 'PK'],
    ['Rohan Bhatt', 'Crown', 'bat', 'No. 3', 76, null, 0, 'Quick between the wickets', 2, 'IN'],
    ['Corbin Hayes', 'Baron', 'bat', 'Middle order', 70, null, 0, 'Dives to save every run', 1, 'NZ'],
    ['Danish Iqbal', 'Count', 'wk', 'Keeper-batter', 65, null, 0, 'Direct hits from anywhere', 3, 'PK'],
    ['Ethan van der Berg', 'Knight', 'all', 'Pace all-rounder', 62, 'express', 72, 'Fast, and fast in the field', 1, 'ZA'],
    ['Dev Pillai', 'Squire', 'all', 'Spin all-rounder', 58, 'offspin', 72, 'Off-spin and a rocket arm', 4, 'IN'],
    ['Jermaine Alleyne', 'Jester', 'bowl', 'Left-arm quick', 22, 'leftpace', 78, 'Left-arm swing, both ways', 2, 'WI'],
    ['Zain Mirza', 'Sceptre', 'bowl', 'Seam bowler', 20, 'seam', 76, 'Cutters that stop on you', 0, 'PK'],
    ['Hamid Usmani', 'Bishop', 'bowl', 'Leg-spinner', 16, 'legspin', 74, 'Flighted leg-breaks', 3, 'PK'],
  ],
};
// batting weak spots for the AI's regular batters, as the scouting report describes them
export const WEAK = [
  { weak: { lengths: ['yorker'], lanes: null }, label: 'can\'t dig out yorkers' },
  { weak: { lengths: ['short', 'bouncer'], lanes: null }, label: 'hates the short ball' },
  { weak: { lengths: ['good', 'full'], lanes: ['wideoff'] }, label: 'chases wide ones outside off' },
  { weak: { lengths: ['full'], lanes: ['stumps', 'leg'] }, label: 'falls over to full balls on the pads' },
  { weak: { lengths: ['good'], lanes: ['off'] }, label: 'pokes at good length outside off' },
];

function hashStr(s) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }

const TIER_OFFSET = { 1: -5, 2: -2, 3: 1, 4: 4 };
const rosterCache = new Map();
// A national side: the country's best ten from all the clubs (five batters with the best keeper,
// two all-rounders, three bowlers with at least one spinner). Each keeps his club id and his look.
function nationalRoster(team) {
  const pool = TEAMS.flatMap(t => roster(t.id)).filter(p => p.nation === team.nation).sort((a, b) => ovr(b) - ovr(a));
  const keeper = pool.find(p => p.role === 'wk');
  const bats = pool.filter(p => p.role === 'bat').slice(0, 4);
  const alls = pool.filter(p => p.role === 'all').slice(0, 2);
  const bowlers = pool.filter(p => p.role === 'bowl');
  const spinner = bowlers.find(p => bowlType(p.bowl).spin) || alls.find(p => bowlType(p.bowl).spin);
  const pace = bowlers.filter(p => p !== spinner).slice(0, spinner && bowlers.includes(spinner) ? 2 : 3);
  return [...bats, keeper, ...alls, ...pace, ...(spinner && bowlers.includes(spinner) ? [spinner] : [])]
    .filter(Boolean).map(p => ({ ...p, team: team.id, ai: { ...p.ai } }));
}
// A team's ten regulars, in squad order. Ids are stable (`<team>-<index>`) so saved line-ups keep.
export function roster(teamId) {
  if (rosterCache.has(teamId)) return rosterCache.get(teamId);
  const nat = NATIONAL.find(t => t.id === teamId);
  if (nat) { const list = nationalRoster(nat); rosterCache.set(teamId, list); return list; }
  const rng = makeRng(hashStr(teamId));
  // the giants have better players than the underdogs
  const off = TIER_OFFSET[teamById(teamId).tier] || 0;
  const list = (SQUADS[teamId] || SQUADS.thunder).map(([name, nick, role, label, bat, bowl, bowlSkill, trait, w, nation], i) => ({
    id: `${teamId}-${i}`, name, nick, short: name.split(' ').slice(1).join(' '), role, label, team: teamId, trait, hero: false, bowl, nation,
    bat: role === 'bowl' ? bat : Math.min(95, bat + off), bowlSkill: bowl ? Math.min(95, bowlSkill + off) : 0,
    ai: { ...WEAK[w], honesty: rng.range(0.5, 0.85), fire: rng.range(0.2, 0.5), rattle: rng.range(0.25, 0.5) },
  }));
  rosterCache.set(teamId, list);
  return list;
}
// "Aryan 'Sixer' Malhotra"
export const fullName = p => (p.nick ? `${p.name.split(' ')[0]} '${p.nick}' ${p.name.split(' ').slice(1).join(' ')}` : p.name);
// with the flag of his country in front
export const flagName = p => `${flag(p)} ${fullName(p)}`.trim();

// The star heroes as players: batting heroes bat like stars; bowling heroes bowl their type.
const HERO_PLAYER = {
  raja: { bat: 92, nation: 'IN' }, meher: { bat: 90, nation: 'PK' }, comet: { bat: 91, nation: 'IN' },
  zara: { bat: 24, bowl: 'express', bowlSkill: 92, nation: 'BD' }, babar: { bat: 30, bowl: 'offspin', bowlSkill: 92, nation: 'PK' }, imran: { bat: 34, bowl: 'seam', bowlSkill: 92, nation: 'PK' },
  rani: { bat: 66, keeper: true, nation: 'IN' }, bilal: { bat: 58, nation: 'PK' },
};
// lv: the hero's level (progress.js); each level above 1 adds a point to his batting or bowling
export function heroPlayer(hero, lv = 1) {
  const h = typeof hero === 'string' ? heroById(hero) : hero;
  const base = HERO_PLAYER[h.id] || { bat: 50 }, up = Math.max(0, (lv || 1) - 1);
  const x = { ...base, bat: base.bat + (h.slot === 'bowl' ? 0 : up), bowlSkill: base.bowlSkill ? base.bowlSkill + up : 0 };
  return {
    id: h.id, name: h.name, short: h.name.split(' ').slice(1).join(' '), role: h.slot === 'bat' ? 'bat' : h.slot === 'bowl' ? 'bowl' : x.keeper ? 'wk' : 'bat',
    label: h.role, bat: x.bat, bowl: x.bowl || null, bowlSkill: x.bowlSkill || 0, hero: h, nation: base.nation,
    ai: h.ai ? { ...h.ai } : { weak: { lengths: ['good'], lanes: ['off'] }, label: 'pokes at good length outside off', honesty: 0.7, fire: 0.3, rattle: 0.3 },
  };
}

// ---------- team ratings ----------
// A player's overall: batters by batting, bowlers by bowling, all-rounders a bit of both.
export function ovr(p) {
  if (p.role === 'bowl') return p.bowlSkill;
  if (p.role === 'all') return Math.round((p.bat + p.bowlSkill) / 2 + 6);
  if (p.role === 'wk') return Math.min(99, p.bat + 3);
  return p.bat;
}
// A squad's rating out of 100: its best four batters and best three bowlers.
export function teamRating(pool) {
  const top = (xs, n) => { const s = xs.sort((a, b) => b - a).slice(0, n); return s.reduce((a, b) => a + b, 0) / Math.max(1, s.length); };
  const bat = top(pool.map(p => p.bat), 4), bowl = top(pool.filter(p => p.bowl).map(p => p.bowlSkill), 3);
  return Math.round(bat * 0.5 + bowl * 0.5);
}
export const ratingStars = r => Math.max(1, Math.min(5, Math.round((r - 60) / 4.5)));

// ---------- whose heroes play ----------
// A team's own star, in his slot: { bat, bowl, field } with the other slots empty.
export function starSquad(teamId) {
  const T = teamById(teamId);
  if (T.heroes) return Object.fromEntries(Object.entries(T.heroes).map(([slot, id]) => [slot, id ? heroById(id) : null]));
  const h = heroById(T.star);
  return { bat: null, bowl: null, field: null, [h.slot]: h };
}
// Your side: your team's star, plus the heroes you've signed for the other slots. A signed
// star never plays against his own team (he goes home for that match).
export function playerSquad(teamId, picks = {}, unlocked = [], oppId = null) {
  const sq = starSquad(teamId), star = heroById(teamById(teamId).star);
  for (const slot of ['bat', 'bowl', 'field']) {
    if (sq[slot]) continue;
    const h = heroById(picks[slot]);
    if (h && h.slot === slot && h !== star && unlocked.includes(h.id) && teamOfHero(h.id)?.id !== oppId) sq[slot] = h;
  }
  return sq;
}

// ---------- unlocking heroes ----------
export const UNLOCK_COST = 250;
// your own team's star is always yours; the others are signed with coins
export const isUnlocked = (profile, id) => (profile.unlocked || []).includes(id) || teamById(profile.team || 'thunder').star === id;

// ---------- line-ups ----------
export const ORDER_SIZE = 4;  // batters who can come in (3 wickets in an innings)
export const ATTACK_SIZE = 3; // bowlers who share the 5 overs
export const MAX_OVERS = 2;   // overs any one bowler may bowl

// Everyone available to a side: the team's regulars plus its three chosen heroes.
// pool: an explicit list of players (the career mode's squads) instead of the team's regulars
export function squadPool(teamId, heroes, levels = {}, pool = null) {
  if (pool) return pool;
  return [...[heroes.bat, heroes.field, heroes.bowl].filter(Boolean).map(h => heroPlayer(h, levels[h.id])), ...roster(teamId)];
}
export const batCandidates = pool => pool.filter(p => p.role !== 'bowl' || p.hero).sort((a, b) => b.bat - a.bat);
export const bowlCandidates = pool => pool.filter(p => p.bowl).sort((a, b) => b.bowlSkill - a.bowlSkill);

// The default batting order (star batter opens) and a balanced three-man attack.
export function defaultLineup(teamId, heroes, levels = {}, given = null) {
  const pool = squadPool(teamId, heroes, levels, given);
  const star = (heroes.bat && pool.find(p => p.id === heroes.bat.id)) || null;
  const order = [star, ...batCandidates(pool).filter(p => p !== star)].filter(Boolean).slice(0, ORDER_SIZE);
  const bowlStar = (heroes.bowl && pool.find(p => p.id === heroes.bowl.id)) || null;
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
export function resolveLineup(teamId, heroes, saved, levels = {}, given = null) {
  const pool = squadPool(teamId, heroes, levels, given), byId = id => pool.find(p => p.id === id);
  const def = defaultLineup(teamId, heroes, levels, pool);
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
