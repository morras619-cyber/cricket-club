// Every club's home ground: how it looks (sky, crowd, landmark, outfield) and how its pitch
// plays. A match is played at the home side's ground; the painter in scene.js reads this.
//
// pitch: multipliers the match engine applies
//   swing / seam: pace bowlers' movement in the air / off the pitch; turn: spinners' turn
//   kmh: pace bowlers' speed; bat: batters' timing windows; ai: the AI batter's timing spread
//   field: fielders' speed; dew: from the second innings batting gets easier and the ball stops swinging
export const GROUNDS = {
  thunder: {
    name: 'The Thunderdome', time: 'night', landmark: 'bolts',
    sky: ['#03061f', '#0f2363', '#2d4fb3'], skyline: '#0b1640', windows: ['#ffd23f', '#9fd8ff'],
    grass: ['#1c7a3e', '#2a9a4a'], pitchCol: '#e2c27f',
    pitch: { id: 'flat', name: 'Flat road', report: 'Rock hard and flat: a batting paradise. Expect sixes.', bat: 1.08, ai: 0.92, swing: 0.8, seam: 0.8, turn: 0.85 },
  },
  cyclones: {
    name: 'Cyclone Park', time: 'night', landmark: 'turbines',
    sky: ['#040a1e', '#0b1f45', '#1c4a5a'], skyline: '#0a1a30', windows: ['#ffd21f', '#9fffb0'],
    grass: ['#1e6b36', '#2a8442'], pitchCol: '#cdb27a',
    pitch: { id: 'swing', name: 'Overcast swinger', report: 'A storm is brewing and the air is heavy: the new ball will hoop around.', swing: 1.45 },
  },
  vipers: {
    name: 'The Snakepit', time: 'dusk', landmark: 'snake',
    sky: ['#1a0610', '#5a0f22', '#c2462b'], skyline: '#220a14', windows: ['#ff4b3e', '#ffb03e'],
    grass: ['#5f7d32', '#77923d'], pitchCol: '#e6c98e',
    pitch: { id: 'turner', name: 'Dusty turner', report: 'Bone dry and cracked: the spinners will make it talk.', turn: 1.5, seam: 0.9, ai: 1.04 },
  },
  eagles: {
    name: "Eagle's Nest", time: 'day', landmark: 'eagle',
    sky: ['#3d9ee8', '#7cc4f2', '#d7f0ff'], skyline: '#6d7f99', windows: [],
    grass: ['#2c9a46', '#3bb556'], pitchCol: '#d8b56c',
    pitch: { id: 'bouncy', name: 'Fast and bouncy', report: 'Pace and carry: the quicks will love it, the ball flies off the bat.', kmh: 1.06, seam: 1.1, bat: 1.02 },
  },
  phoenix: {
    name: 'The Furnace', time: 'sunset', landmark: 'cauldrons',
    sky: ['#3a0d2e', '#c2451c', '#ffb347'], skyline: '#3a1410', windows: ['#ffd36b'],
    grass: ['#257a3a', '#33924a'], pitchCol: '#dcb77a',
    pitch: { id: 'dew', name: 'Evening dew', report: 'Dew will settle later on: chasing gets easier as the night goes on.', dew: true },
  },
  titans: {
    name: 'The Foundry', time: 'night', landmark: 'foundry',
    sky: ['#0b0d12', '#232a33', '#4a4f57'], skyline: '#16191f', windows: ['#ffb347', '#ffe08a'],
    grass: ['#17703a', '#208746'], pitchCol: '#9fae6a',
    pitch: { id: 'green', name: 'Green seamer', report: 'A green tinge on a hard deck: seamers will nip it both ways.', seam: 1.5, bat: 0.95, ai: 1.05 },
  },
  storm: {
    name: 'Eye of the Storm', time: 'storm', landmark: 'storm',
    sky: ['#120428', '#33115e', '#6a3fa0'], skyline: '#1d0c3a', windows: ['#c79bff', '#ffd23f'],
    grass: ['#1a6e3a', '#258447'], pitchCol: '#c9ab78',
    pitch: { id: 'slow', name: 'Slow and low', report: 'Damp and slow: hard to force the pace, and the wrist spinners grip.', kmh: 0.93, turn: 1.2, bat: 0.97 },
  },
  royals: {
    name: 'Royal Palace Oval', time: 'evening', landmark: 'palace',
    sky: ['#14143f', '#3b2a78', '#e88cc0'], skyline: '#2a1a4a', windows: ['#ffe9a8'],
    grass: ['#239142', '#30ab51'], pitchCol: '#dfc183',
    pitch: { id: 'quick', name: 'Lightning outfield', report: 'A true pitch and a glass-fast outfield: the ball races to the rope.', field: 0.92 },
  },
};
// the national sides' grounds: a club's ground and pitch under its own name
GROUNDS.india = { ...GROUNDS.thunder, name: 'Blue Lights Stadium' };
GROUNDS.pakistan = { ...GROUNDS.cyclones, name: 'Crescent Park' };
export const groundOf = teamId => GROUNDS[teamId] || GROUNDS.thunder;
export const PITCH_DEFAULT = { swing: 1, seam: 1, turn: 1, kmh: 1, bat: 1, ai: 1, field: 1, dew: false };
export const pitchOf = teamId => ({ ...PITCH_DEFAULT, ...groundOf(teamId).pitch });

// Who's at home: league fixtures name the home side first; otherwise the seed decides.
export const homeFromSeed = (seed, a, b) => ((seed >>> 0) % 2 ? a : b);
