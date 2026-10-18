// The eight launch heroes. slot decides which squad slot they fill.
// power.kind is the id the game logic switches on.
export const HEROES = [
  {
    id: 'raja', name: 'Thunder Raja', slot: 'bat', role: 'Power batter', emblem: 'bolt',
    look: { suit: '#1f6fe0', trim: '#ffd23f', cape: '#0b2f80', skin: '#a8714f', hair: '#1b1410', mask: '#ffd23f' , style: 'spiky' },
    quote: 'Sky high!',
    ai: { weak: { lengths: ['yorker'], lanes: ['stumps', 'leg'] }, label: 'can\'t dig out yorkers on the stumps', honesty: 0.85, fire: 0.55, rattle: 0.3 },
    power: { kind: 'thunder', name: 'Thunderclap Six', cost: 60, word: 'KRAKOOOM!',
      desc: 'Next Good-or-better shot is a six. A mistimed shot still goes for four.' },
  },
  {
    id: 'meher', name: 'Mirage Meher', slot: 'bat', role: 'Touch batter', emblem: 'crescent',
    look: { suit: '#7a3fe0', trim: '#ff8ad8', cape: '#3a1680', skin: '#c48a64', hair: '#2a1a14', mask: '#ff8ad8' , style: 'long' },
    quote: 'You blinked.',
    ai: { weak: { lengths: ['short', 'bouncer'], lanes: null }, label: 'hates the short ball', honesty: 0.5, fire: 0.2, rattle: 0.3 },
    power: { kind: 'mirror', name: 'Mirror Gap', cost: 60, word: 'SHIMMER!',
      desc: 'For 3 balls, well-timed ground shots run to the rope for four. Wider timing.' },
  },
  {
    id: 'comet', name: 'Captain Comet', slot: 'bat', role: 'Finisher', emblem: 'star',
    look: { suit: '#e2541b', trim: '#ffe066', cape: '#7a1d0c', skin: '#9c6546', hair: '#d9d9d9', mask: '#ffe066' , style: 'fins' },
    quote: 'The show\'s not over yet!',
    ai: { weak: { lengths: ['good', 'full'], lanes: ['wideoff'] }, label: 'chases wide ones outside off', honesty: 0.7, fire: 0.35, rattle: 0.45 },
    power: { kind: 'meteor', name: 'Meteor Six', cost: 100, ultimate: true, word: 'BOOOOM!',
      desc: 'Ultimate. Tap as the ring closes: Perfect 8, Good 6, Miss 4.' },
  },
  {
    id: 'zara', name: 'Cyclone Zara', slot: 'bowl', role: 'Fast bowler', emblem: 'swirl', bowls: 'pace',
    look: { suit: '#3c4653', trim: '#5ff0ff', cape: '#1a2230', skin: '#c99273', hair: '#0f0f14', mask: '#5ff0ff' , style: 'ponytail' },
    quote: 'Your innings? Also complete.',
    power: { kind: 'tornado', name: 'Tornado Yorker', cost: 60, word: 'WHOOOSH!',
      desc: '160 km/h yorker. Halves the batter\'s timing. A miss is bowled; a hit makes 2 at most.' },
  },
  {
    id: 'babar', name: 'Mystic Babar Bhai', slot: 'bowl', role: 'Spin bowler', emblem: 'eye', bowls: 'spin',
    look: { suit: '#1d8a4e', trim: '#ffd23f', cape: '#0c4a28', skin: '#a8714f', hair: '#f2f2f2', mask: '#ffd23f' , style: 'beard' },
    quote: 'Son, the ball has its own mind.',
    power: { kind: 'maya', name: 'Maya Ball', cost: 60, word: 'POOF!',
      desc: 'The ball splits in two. Pick the fake and you\'re out.' },
  },
  {
    id: 'imran', name: 'Iron Wall Imran', slot: 'bowl', role: 'Seam bowler', emblem: 'hex', bowls: 'pace',
    look: { suit: '#8a95a5', trim: '#ff3b3b', cape: '#3a4250', skin: '#b07a58', hair: '#202020', mask: '#ff3b3b' , style: 'short' },
    quote: 'Calculated.',
    power: { kind: 'shatter', name: 'Shatter Seam', cost: 60, word: 'KRAK!',
      desc: 'Seams so hard that any Good-or-worse contact edges to the keeper.' },
  },
  {
    id: 'rani', name: 'Rubber Rocket Rani', slot: 'field', role: 'Wicket-keeper', emblem: 'spring',
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
  bat: { kind: 'focus', name: 'Focus Spark', cost: 30, word: 'FOCUS!', desc: 'Ball slows 30% and the Perfect window grows by 30 ms.' },
  bowl: { kind: 'pinpoint', name: 'Pinpoint Spark', cost: 30, word: 'PINPOINT!', desc: 'Your next release is guaranteed Perfect.' },
  field: { kind: 'burst', name: 'Speed Burst', cost: 30, word: 'ZOOM!', desc: 'Your fielder sprints at double speed in the next outfield chance.' },
};

export const heroById = id => HEROES.find(h => h.id === id);
export const heroesFor = slot => HEROES.filter(h => h.slot === slot);

// Generic sidekicks fill the rest of each XI.
export const SIDEKICK_LOOKS = [
  { suit: '#f3efe2', trim: '#1f6fe0', cape: null, skin: '#a8714f', hair: '#1b1410', mask: null },
  { suit: '#f3efe2', trim: '#e0245e', cape: null, skin: '#c48a64', hair: '#2a1a14', mask: null },
];
export const AI_LOOK = { suit: '#2b2b33', trim: '#ff3b3b', cape: '#121216', skin: '#b07a58', hair: '#101010', mask: '#ff3b3b', style: 'short' };
