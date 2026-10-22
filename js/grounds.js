import { LEAGUE_CLUBS, myClub } from './teams.js';
// Every club's home ground: how it looks (sky, crowd, landmark, outfield) and how its pitch
// plays. A match is played at the home side's ground; the painter in scene.js reads this.
//
// pitch: multipliers the match engine applies
//   swing / seam: pace bowlers' movement in the air / off the pitch; turn: spinners' turn
//   kmh: pace bowlers' speed; bat: batters' timing windows; ai: the AI batter's timing spread
//   (more, per pitch, in js/pitches.js: bounce, skid, uneven, carry, roll, wear)
//   field: fielders' speed; dew: from the second innings batting gets easier and the ball stops swinging
export const GROUNDS = {
  thunder: {
    name: 'The Thunderdome', time: 'day', landmark: 'bolts',
    sky: ['#1f56c0', '#2f7be0', '#9fd0ff'], skyline: '#0b1640', windows: ['#ffd23f', '#9fd8ff'],
    grass: ['#1c7a3e', '#2a9a4a'], pitchCol: '#e2c27f',
    pitch: { id: 'flat', name: 'Flat road', report: 'Rock hard, true bounce, and shots carry: time it and it flies. Expect sixes.', bat: 1.08, ai: 0.92, swing: 0.8, seam: 0.8, turn: 0.85, carry: 1.07 },
  },
  cyclones: {
    name: 'Cyclone Park', time: 'day', landmark: 'turbines',
    sky: ['#1f56c0', '#2f7be0', '#9fd0ff'], skyline: '#0a1a30', windows: ['#ffd21f', '#9fffb0'],
    grass: ['#1e6b36', '#2a8442'], pitchCol: '#cdb27a',
    pitch: { id: 'swing', name: 'Overcast swinger', report: 'The air is heavy: the new ball hoops late. Watch the line, it fades as the ball ages.', swing: 1.4, skid: 0.98, wear: { swing: -0.6 } },
  },
  vipers: {
    name: 'The Snakepit', time: 'sunset', landmark: 'snake',
    sky: ['#1a1418', '#4a1c1c', '#8a2a1e'], skyline: '#220a14', windows: ['#ff4b3e', '#ffb03e'],
    grass: ['#5f7d32', '#77923d'], pitchCol: '#e6c98e',
    pitch: { id: 'turner', name: 'Dusty turner', report: 'Bone dry and cracked: low, uneven bounce, and the turn gets sharper as it wears. Quicks lose their edge.', turn: 1.35, seam: 0.9, ai: 1.04, kmh: 0.96, bounce: 0.85, skid: 0.94, uneven: 0.12, wear: { turn: 0.7, bounce: -0.12 } },
  },
  eagles: {
    name: "Eagle's Nest", time: 'day', landmark: 'eagle',
    sky: ['#1f56c0', '#2f7be0', '#9fd0ff'], skyline: '#6d7f99', windows: [],
    grass: ['#2c9a46', '#3bb556'], pitchCol: '#d8b56c',
    pitch: { id: 'bouncy', name: 'Fast and bouncy', report: 'The ball arrives high and fast: edges, less time to react. Quicks will love it.', kmh: 1.07, seam: 1.1, bounce: 1.28, skid: 1.04, carry: 1.04 },
  },
  phoenix: {
    name: 'The Furnace', time: 'sunset', landmark: 'cauldrons',
    sky: ['#3a1610', '#7a2a14', '#c2451c'], skyline: '#3a1410', windows: ['#ffd36b'],
    grass: ['#257a3a', '#33924a'], pitchCol: '#dcb77a',
    pitch: { id: 'dew', name: 'Evening dew', report: 'Dew settles in the second innings: the ball skids on, swing dies, and the chase gets easier.', dew: true },
  },
  titans: {
    name: 'The Foundry', time: 'day', landmark: 'foundry',
    sky: ['#1f56c0', '#2f7be0', '#9fd0ff'], skyline: '#16191f', windows: ['#ffb347', '#ffe08a'],
    grass: ['#17703a', '#208746'], pitchCol: '#9fae6a',
    pitch: { id: 'green', name: 'Green seamer', report: 'A green tinge: the ball nips about early, then the pitch flattens out.', seam: 1.55, bat: 0.95, ai: 1.05, bounce: 1.05, wear: { seam: -0.9 } },
  },
  storm: {
    name: 'Eye of the Storm', time: 'day', landmark: 'storm',
    sky: ['#1f56c0', '#2f7be0', '#9fd0ff'], skyline: '#1d0c3a', windows: ['#c79bff', '#ffd23f'],
    grass: ['#1a6e3a', '#258447'], pitchCol: '#c9ab78',
    pitch: { id: 'slow', name: 'Slow and low', report: 'Damp and slow: the ball holds up and arrives late, shots die, the wrist spinners grip. Work the ones and twos.', kmh: 0.93, turn: 1.2, bat: 0.97, bounce: 0.9, skid: 0.84, carry: 0.9, roll: 0.85 },
  },
  royals: {
    name: 'Royal Palace Oval', time: 'day', landmark: 'palace',
    sky: ['#1f56c0', '#2f7be0', '#9fd0ff'], skyline: '#2a1a4a', windows: ['#ffe9a8'],
    grass: ['#239142', '#30ab51'], pitchCol: '#dfc183',
    pitch: { id: 'quick', name: 'Lightning outfield', report: 'A true pitch and a glass-fast outfield: the ball races to the rope and fielders can\'t cut it off.', field: 0.92, roll: 1.2, carry: 1.03, skid: 1.02 },
  },
};
// the lower-division clubs' grounds: smaller, simpler places (no landmark), each with its own
// light and a pitch that suits the way the club plays
const LOOKS = [
  { time: 'day', sky: ['#4aa3e0', '#8fcbf0', '#dff2ff'], skyline: '#6f8297', windows: [] },
  { time: 'evening', sky: ['#1d1b4a', '#4a3a86', '#f0a46a'], skyline: '#2a2346', windows: ['#ffe9a8'] },
  { time: 'sunset', sky: ['#3a1534', '#b8462a', '#ffbe5c'], skyline: '#3b1a1a', windows: ['#ffd36b'] },
  { time: 'overcast', sky: ['#6f7a86', '#9aa6b1', '#c9d1d6'], skyline: '#4c5a52', windows: [] },
];
const PITCHES = [
  { id: 'flat', name: 'Flat deck', report: 'Good for batting: the ball comes on nicely and carries.', bat: 1.04, carry: 1.04 },
  { id: 'swing', name: 'Damp and green', report: 'Some moisture early on: the new ball will move, then settle.', swing: 1.3, seam: 1.15, wear: { swing: -0.5, seam: -0.4 } },
  { id: 'turner', name: 'Dry and dusty', report: 'It will grip and turn more as the game goes on, with some uneven bounce.', turn: 1.25, bounce: 0.92, uneven: 0.08, wear: { turn: 0.6 } },
  { id: 'slow', name: 'Slow and low', report: 'The ball holds up and arrives late: work the ones and twos.', kmh: 0.96, bat: 0.98, skid: 0.88, carry: 0.94, bounce: 0.92 },
];
LEAGUE_CLUBS.forEach((t, i) => {
  const L = LOOKS[i % LOOKS.length];
  GROUNDS[t.id] = { name: t.ground, landmark: null, ...L, grass: ['#24803f', '#31994d'], pitchCol: '#d9b97a', pitch: PITCHES[(i * 3) % PITCHES.length] };
});
// the national sides' grounds: a club's ground and pitch under its own name
GROUNDS.india = { ...GROUNDS.thunder, name: 'Blue Lights Stadium' };
GROUNDS.pakistan = { ...GROUNDS.cyclones, name: 'Crescent Park', time: 'night', sky: ['#040a1e', '#0b1f45', '#1c4a5a'] }; // (the ground it borrowed, as it was)
// (your own club plays at the ground it took over, under the name you gave it)
// (your own club plays at the ground it took over, rebuilt as its own: a night ground under its name)
const OWN_SKY = { time: 'night', sky: ['#03061f', '#0f2363', '#2d4fb3'], skyline: '#0b1640', windows: ['#ffd23f', '#9fd8ff'] };
export const groundOf = teamId => (myClub()?.id === teamId ? { ...GROUNDS[teamId], ...OWN_SKY, name: myClub().ground } : GROUNDS[teamId] || GROUNDS.thunder);
export const PITCH_DEFAULT = { swing: 1, seam: 1, turn: 1, kmh: 1, bat: 1, ai: 1, field: 1, dew: false, bounce: 1, skid: 1, uneven: 0, carry: 1, roll: 1 };
export const pitchOf = teamId => ({ ...PITCH_DEFAULT, ...groundOf(teamId).pitch });

// Who's at home: league fixtures name the home side first; otherwise the seed decides.
export const homeFromSeed = (seed, a, b) => ((seed >>> 0) % 2 ? a : b);
