// The eight teams. Each has a hand-drawn batting sprite sheet (img/batter-<id>.webp)
// and kit colours used for the drawn fielders, keeper and front-view batter.
// tier: 1 (underdogs) to 4 (giants). Stronger squads, and in the career a club unlocks in
// season <tier>. star: the team's own hero. style: how the AI plays them (loft = extra chance of going aerial,
// sigma = timing spread, late = extra loft from ball 19, field = fielders' speed).
export const TEAMS = [
  { id: 'thunder', tier: 4, name: 'Thunder Strikers', suit: '#1f5fd6', trim: '#ffd23f', star: 'raja',
    style: { tag: 'Big hitters', desc: 'Swing at everything. Six or out.', loft: 0.2, sigma: 1.06 } },
  { id: 'cyclones', tier: 3, name: 'Green Cyclones', suit: '#1e7a32', trim: '#ffd21f', star: 'zara',
    style: { tag: 'Swing kings', desc: 'A new-ball attack that hoops it both ways.', loft: 0, sigma: 1 } },
  { id: 'vipers', tier: 2, name: 'Volt Vipers', suit: '#1f1f26', trim: '#e8262b', star: 'babar',
    style: { tag: 'Spin web', desc: 'Three spinners and a batting order that sells its wicket dearly.', loft: -0.05, sigma: 0.95 } },
  { id: 'eagles', tier: 1, name: 'Golden Eagles', suit: '#ffcf1a', trim: '#1a1a1a', star: 'bilal',
    style: { tag: 'Fast and fearless', desc: 'Express pace and batters who take on the short ball.', loft: 0.12, sigma: 1, field: 1.06 } },
  { id: 'phoenix', tier: 3, name: 'Phoenix Blaze', suit: '#f2711c', trim: '#1c1c1c', star: 'comet',
    style: { tag: 'Finishers', desc: 'They bat deep and come alive at the death.', loft: -0.05, late: 0.3, sigma: 1 } },
  { id: 'titans', tier: 1, name: 'Steel Titans', suit: '#8f9296', trim: '#1c1c1c', star: 'imran',
    style: { tag: 'The wall', desc: 'Block, nudge, grind. Seamers who never give you width.', loft: -0.18, sigma: 0.88 } },
  { id: 'storm', tier: 2, name: 'Purple Storm', suit: '#6a22c4', trim: '#f2b21b', star: 'meher',
    style: { tag: 'Wristy artists', desc: 'Touch players and wrist spin.', loft: 0, sigma: 0.92 } },
  { id: 'royals', tier: 1, name: 'Pink Royals', suit: '#ec2f9a', trim: '#ffffff', star: 'rani',
    style: { tag: 'Electric fielders', desc: 'Every run is a fight against the best fielding side.', loft: -0.03, sigma: 1, field: 1.14 } },
];
export const teamOfHero = heroId => TEAMS.find(t => t.star === heroId);

// The Super League's lower divisions (career only): sixteen clubs without a hero of their own.
// div: where they start (the eight teams above are the Asian Super League). sheet: the club
// whose drawn sheets they borrow (repainted in their own colours); emblem: their crest
// (tools/build_club_logos.py); ground: their home ground's name.
const club = (id, div, name, suit, trim, sheet, emblem, ground, tag, desc, style = {}) =>
  ({ id, div, tier: 0, name, suit, trim, star: null, sheet, emblem, ground, style: { tag, desc, loft: 0, sigma: 1, ...style } });
export const LEAGUE_CLUBS = [
  club('monsoon', 'd2', 'Monsoon Mavericks', '#0f8a8a', '#ffffff', 'cyclones', 'wave', 'Monsoon Park', 'Rain makers', 'Seamers who love a damp deck.', { loft: -0.04 }),
  club('falcons', 'd2', 'Desert Falcons', '#c8913a', '#3a2412', 'eagles', 'wing', 'Dune Stadium', 'Hunters', 'Quick bowlers who swoop on any loose shot.', { loft: 0.06 }),
  club('bengal', 'd2', 'Bengal Blasters', '#f26b1d', '#14234f', 'phoenix', 'tiger', 'Riverside Arena', 'Blasters', 'They try to hit every ball out of the ground.', { loft: 0.14, sigma: 1.04 }),
  club('lotus', 'd2', 'Lotus Lancers', '#d63c8a', '#1a5c3a', 'royals', 'lotus', 'Lotus Lake Oval', 'Graceful', 'Wristy batters and loopy spin.', { sigma: 0.96 }),
  club('hawks', 'd2', 'Himalaya Hawks', '#5fb4e8', '#ffffff', 'thunder', 'mountain', 'Summit Ground', 'High flyers', 'Bounce and carry from tall quicks.', { loft: 0.04 }),
  club('iron', 'd2', 'Indus Ironmen', '#8b1c24', '#b8bec6', 'titans', 'anvil', 'Foundry Field', 'Hard as iron', 'Dogged batting, nagging seam.', { loft: -0.12, sigma: 0.92 }),
  club('comets', 'd2', 'Coral Comets', '#ff6f61', '#16285a', 'phoenix', 'comet', 'Reef Oval', 'Quick starters', 'They go hard in the first over.', { loft: 0.08 }),
  club('tempest', 'd2', 'Tiger Tempest', '#ffb000', '#111111', 'eagles', 'claw', 'Jungle Bowl', 'Ferocious', 'Big hitters and fiery pace.', { loft: 0.1 }),
  club('harbour', 'd3', 'Harbour Hurricanes', '#123a7a', '#5ec8f2', 'thunder', 'anchor', 'Harbour Ground', 'Workmanlike', 'A gritty side of harbour workers.', { loft: -0.02 }),
  club('jaguars', 'd3', 'Jungle Jaguars', '#4d6b1f', '#ffd23f', 'cyclones', 'jaguar', 'Canopy Park', 'Prowlers', 'Patient, then they pounce.', { loft: 0.02 }),
  club('sultans', 'd3', 'Spice Sultans', '#7a1f2b', '#f2c14e', 'vipers', 'crescent', 'Bazaar Oval', 'Spin merchants', 'Slow bowlers and slower pitches.', { loft: -0.06, sigma: 0.96 }),
  club('lagoon', 'd3', 'Lagoon Lightning', '#19b3b0', '#ffe14d', 'cyclones', 'bolt', 'Lagoon Field', 'Livewires', 'Sharp in the field, quick between the wickets.', { field: 1.06 }),
  club('kites', 'd3', 'Kite Riders', '#e8262b', '#ffffff', 'vipers', 'kite', 'Windy Common', 'Flyers', 'Everything goes in the air.', { loft: 0.12, sigma: 1.05 }),
  club('elephants', 'd3', 'Ember Elephants', '#5c5f66', '#ff8a1c', 'titans', 'tusk', 'Elephant Fields', 'Heavy hitters', 'Slow to start, then they stampede.', { late: 0.25 }),
  club('rockets', 'd3', 'Rickshaw Rockets', '#9bd12a', '#151515', 'cyclones', 'rocket', 'Market Square', 'Zippy', 'Quick singles and quicker scoring.', { loft: 0.04 }),
  club('lanterns', 'd3', 'Lantern Knights', '#a3172f', '#fff1c9', 'phoenix', 'lantern', 'Festival Ground', 'Night fighters', 'At their best under lights.', { loft: 0 }),
];
// every club in the career, the eight teams first
export const CLUBS = [...TEAMS, ...LEAGUE_CLUBS];
export const DIVISIONS = [
  { id: 'asl', name: 'Asian Super League', short: 'Super League' },
  { id: 'd2', name: 'Division 2', short: 'Division 2' },
  { id: 'd3', name: 'Division 3', short: 'Division 3' },
];
export const divisionName = id => DIVISIONS.find(d => d.id === id)?.name || '';

// The national sides for the Weekend War (not in the clubs' leagues). sheet: the club whose drawn
// batter and back-view sheets they borrow (the same colours); heroes: their countrymen among the
// heroes, one per slot.
export const NATIONAL = [
  { id: 'india', national: true, tier: 4, name: 'India', suit: '#1c5ad6', trim: '#ff9933', star: 'raja', sheet: 'thunder', nation: 'IN',
    heroes: { bat: 'raja', bowl: null, field: 'rani' },
    style: { tag: 'Men in Blue', desc: 'Deep batting and a fearless top order.', loft: 0.08, sigma: 1 } },
  { id: 'pakistan', national: true, tier: 4, name: 'Pakistan', suit: '#0d7a3c', trim: '#ffffff', star: 'babar', sheet: 'cyclones', nation: 'PK',
    heroes: { bat: 'meher', bowl: 'babar', field: 'bilal' },
    style: { tag: 'Pace and mystery', desc: 'Raw pace, wrist spin and the unexpected.', loft: 0.05, sigma: 1.02 } },
];
// Your own club (Super League career, create-your-club): it takes a Division 3 club's place,
// its squad, budget and ground (base), under your name, colours and crest.
let MINE = null;
const LOGOS = new Map(); // crests painted in the game, by club id
export function setMyClub(m) {
  if (MINE) LOGOS.delete(MINE.id);
  const base = m?.base && LEAGUE_CLUBS.find(t => t.id === m.base);
  MINE = base ? { ...base, name: m.name, short: m.short, suit: m.suit, trim: m.trim, emblem: m.emblem, ground: m.ground || base.ground,
    custom: true, style: { ...base.style, tag: 'Your club', desc: 'Built from nothing. Every run is yours.' } } : null;
  if (MINE && m.crest) LOGOS.set(MINE.id, m.crest);
}
export const myClub = () => MINE;
export const setLogo = (id, src) => (src ? LOGOS.set(id, src) : LOGOS.delete(id));
export const logoSrc = id => LOGOS.get(id) || `img/logo-${id}.webp`;
export const teamById = id => (MINE && id === MINE.id ? MINE : null) || TEAMS.find(t => t.id === id) || LEAGUE_CLUBS.find(t => t.id === id) || NATIONAL.find(t => t.id === id) || TEAMS[0];
// the club whose drawn sheets a side uses (its own, or the one a national side borrows)
export const sheetOf = id => teamById(id).sheet || id;

// the opponents for a match: any other team, fixed by the match seed so challenges replay the same
export function rivalTeam(seed, myId) {
  const others = TEAMS.filter(t => t.id !== myId);
  return others[Math.abs(seed | 0) % others.length];
}

// a look for the drawn figures (fielders, keeper, front-view batter) in this team's kit
export function teamLook(team, k = 0) {
  return {
    suit: team.suit, trim: team.trim, cape: null, mask: null,
    skin: ['#a8714f', '#c48a64', '#9c6546', '#b07a58'][k % 4],
    hair: ['#1b1410', '#2a1a14', '#101010'][k % 3],
  };
}
