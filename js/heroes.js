// The eight launch heroes. slot decides which squad slot they fill.
// power.kind is the id the game logic switches on.
// Extra powers a star carries besides his signature one (`alts` on each hero below). All last one ball unless the text says otherwise.
const LUCKY = { kind: 'luckybreak', name: 'Lucky Break', cost: 30, word: 'LUCKY!',
  desc: 'Next ball is a free hit: nothing can get you out (a catch drops, the stumps are spared).' };
const GAP = { kind: 'gapfinder', name: 'Gap Finder', cost: 50, word: 'FOUND IT!',
  desc: 'Your next shot heads for the biggest gap in their field. Good timing or better is a four.' };
const READ = { kind: 'readbowler', name: 'Read the Bowler', cost: 30, word: 'READ IT!',
  desc: 'See where the next ball will land before he even lets go of it.' };
const SHOWDOWN = { kind: 'showdown', name: 'Showdown', cost: 70, word: 'SHOWDOWN!',
  desc: 'Starts a full face-off for 6 balls: you hit 15% harder, he bowls faster or turns it more.' };
const BOUNCER = { kind: 'bouncer', name: 'Bouncer Barrage', cost: 60, word: 'BOUNCER!',
  desc: 'A rib-high bouncer. Any hit short of a Perfect goes up in the air: a catch chance, every time.' };
const GOOGLY = { kind: 'googly', name: 'Googly Switch', cost: 50, word: 'WRONG\'UN!',
  desc: 'Turns the opposite way after it pitches. The batter reads it wrong and mistimes far more.' };
const CUTTER = { kind: 'cutter', name: 'Cutter', cost: 50, word: 'CUTTER!',
  desc: 'Looks quick, arrives slow. The batter swings early and skies it.' };
const STORM = { kind: 'storm', name: 'Swing Storm', cost: 60, word: 'STORM!',
  desc: 'The next 3 balls swing and seam twice as much. The batter can\'t read them.' };
// Hat-trick Hunt: right after a wicket it takes the place of the Pinpoint Spark (any bowler), cheaper
export const HUNT = { kind: 'hunt', name: 'Hat-trick Hunt', cost: 20, word: 'HUNT!',
  desc: 'After a wicket: a Perfect release, and the new batter is rattled and mistimes more.' };

export const HEROES = [
  {
    id: 'raja', name: 'Thunder Raja', slot: 'bat', role: 'Power batter', emblem: 'bolt',
    look: { suit: '#1f6fe0', trim: '#ffd23f', cape: '#0b2f80', skin: '#a8714f', hair: '#1b1410', mask: '#ffd23f' , style: 'spiky' },
    quote: 'Sky high!',
    ai: { weak: { lengths: ['yorker'], lanes: ['stumps', 'leg'] }, label: 'can\'t dig out yorkers on the stumps', honesty: 0.85, fire: 0.55, rattle: 0.3 },
    power: { kind: 'thunder', name: 'Thunderclap Six', cost: 60, word: 'KRAKOOOM!',
      desc: 'Next Good-or-better shot is a six. A mistimed shot still goes for four.' },
    alts: [LUCKY],
  },
  {
    id: 'meher', name: 'Mirage Mehul', slot: 'bat', role: 'Touch batter', emblem: 'crescent',
    look: { suit: '#7a3fe0', trim: '#ff8ad8', cape: '#3a1680', skin: '#c48a64', hair: '#2a1a14', mask: '#ff8ad8' , style: 'long' },
    quote: 'You blinked.',
    ai: { weak: { lengths: ['short', 'bouncer'], lanes: null }, label: 'hates the short ball', honesty: 0.5, fire: 0.2, rattle: 0.3 },
    power: { kind: 'mirror', name: 'Mirror Gap', cost: 60, word: 'SHIMMER!',
      desc: 'For 3 balls, well-timed ground shots run to the rope for four. Wider timing.' },
    alts: [GAP, READ],
  },
  {
    id: 'comet', name: 'Captain Comet', slot: 'bat', role: 'Finisher', emblem: 'star',
    look: { suit: '#e2541b', trim: '#ffe066', cape: '#7a1d0c', skin: '#9c6546', hair: '#d9d9d9', mask: '#ffe066' , style: 'fins' },
    quote: 'The show\'s not over yet!',
    ai: { weak: { lengths: ['good', 'full'], lanes: ['wideoff'] }, label: 'chases wide ones outside off', honesty: 0.7, fire: 0.35, rattle: 0.45 },
    power: { kind: 'meteor', name: 'Meteor Six', cost: 100, ultimate: true, word: 'BOOOOM!',
      desc: 'Ultimate. Tap as the ring closes: Perfect 8, Good 6, Miss 4.' },
    alts: [SHOWDOWN],
  },
  {
    id: 'zara', name: 'Cyclone Zaheer', slot: 'bowl', role: 'Fast bowler', emblem: 'swirl', bowls: 'pace',
    look: { suit: '#3c4653', trim: '#5ff0ff', cape: '#1a2230', skin: '#c99273', hair: '#0f0f14', mask: '#5ff0ff' , style: 'ponytail' },
    quote: 'Your innings? Also complete.',
    power: { kind: 'tornado', name: 'Tornado Yorker', cost: 60, word: 'WHOOOSH!',
      desc: '160 km/h yorker. Halves the batter\'s timing. A miss is bowled; a hit makes 2 at most.' },
    alts: [BOUNCER],
  },
  {
    id: 'babar', name: 'Mystic Babar Bhai', slot: 'bowl', role: 'Spin bowler', emblem: 'eye', bowls: 'spin',
    look: { suit: '#1d8a4e', trim: '#ffd23f', cape: '#0c4a28', skin: '#a8714f', hair: '#f2f2f2', mask: '#ffd23f' , style: 'beard' },
    quote: 'Son, the ball has its own mind.',
    power: { kind: 'maya', name: 'Maya Ball', cost: 60, word: 'POOF!',
      desc: 'The ball splits in two. Pick the fake and you\'re out.' },
    alts: [GOOGLY],
  },
  {
    id: 'imran', name: 'Iron Wall Ian', slot: 'bowl', role: 'Seam bowler', emblem: 'hex', bowls: 'pace',
    look: { suit: '#8a95a5', trim: '#ff3b3b', cape: '#3a4250', skin: '#b07a58', hair: '#202020', mask: '#ff3b3b' , style: 'short' },
    quote: 'Calculated.',
    power: { kind: 'shatter', name: 'Shatter Seam', cost: 60, word: 'KRAK!',
      desc: 'Seams so hard that any Good-or-worse contact edges to the keeper.' },
    alts: [CUTTER, STORM],
  },
  {
    id: 'rani', name: 'Rubber Rocket Rory', slot: 'field', role: 'Wicket-keeper', emblem: 'spring',
    look: { suit: '#e0245e', trim: '#ffe14d', cape: '#7d0f33', skin: '#c48a64', hair: '#2a1a14', mask: '#ffe14d' , style: 'bun' },
    quote: 'Oh, try harder!',
    power: { kind: 'elastic', name: 'Elastic Grab', cost: 60, word: 'BOING!',
      desc: 'Keeper reach doubles and the catch window grows to 600 ms for 2 chances.' },
    ultimate: { kind: 'freeze', name: 'Time-Freeze Stumping', cost: 100, word: 'FREEZE!',
      desc: 'Next stumping chance freezes time for 1.5 s to break the stumps.' },
  },
  {
    id: 'bilal', name: 'Blur Bilal', slot: 'field', role: 'Outfielder', emblem: 'wing',
    look: { suit: '#f2b705', trim: '#1b1b1b', cape: '#8a5a00', skin: '#9c6546', hair: '#1b1410', mask: '#1b1b1b' , style: 'swept' },
    quote: 'Already there, brother.',
    power: { kind: 'relay', name: 'Lightning Relay', cost: 60, word: 'ZZZAP!',
      desc: 'Your next run-out throw homes in. The aim zone is 3× wider.' },
  },
];

// Generic Tier 1 Sparks, one per phase.
export const SPARKS = {
  bat: { kind: 'focus', name: 'Focus Spark', cost: 30, word: 'FOCUS!', desc: 'Next ball comes 40% slower, your timing window is much bigger, and you can\'t edge it.' },
  bowl: { kind: 'pinpoint', name: 'Pinpoint Spark', cost: 30, word: 'PINPOINT!', desc: 'Next ball: a Perfect release that moves 50% more and is far harder for the batter to time.' },
  field: { kind: 'burst', name: 'Speed Burst', cost: 30, word: 'ZOOM!', desc: 'Your fielder sprints at double speed, with a much wider window to catch or pick up.' },
};

// the one-word names a crowded powers row shows (five or six buttons across a phone)
export const SHORT = {
  thunder: 'Thunder', mirror: 'Mirror', meteor: 'Meteor', tornado: 'Tornado', maya: 'Maya', shatter: 'Shatter', elastic: 'Elastic', relay: 'Relay', freeze: 'Freeze',
  focus: 'Focus', pinpoint: 'Pinpoint', burst: 'Burst', hunt: 'Hunt', luckybreak: 'Lucky', gapfinder: 'Gap', readbowler: 'Read', showdown: 'Showdown',
  bouncer: 'Bouncer', googly: 'Googly', cutter: 'Cutter', storm: 'Storm',
};

export const heroById = id => HEROES.find(h => h.id === id);
export const heroesFor = slot => HEROES.filter(h => h.slot === slot);

// Generic sidekicks fill the rest of each XI.
export const SIDEKICK_LOOKS = [
  { suit: '#f3efe2', trim: '#1f6fe0', cape: null, skin: '#a8714f', hair: '#1b1410', mask: null },
  { suit: '#f3efe2', trim: '#e0245e', cape: null, skin: '#c48a64', hair: '#2a1a14', mask: null },
];
export const AI_LOOK = { suit: '#2b2b33', trim: '#ff3b3b', cape: '#121216', skin: '#b07a58', hair: '#101010', mask: '#ff3b3b', style: 'short' };
