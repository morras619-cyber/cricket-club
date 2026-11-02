// The pitch guide (the screen a player reads to know what a pitch will do): hand-written for each kind of pitch, with the
// meters worked out from the real numbers (js/pitches.js), so what it says is what the game does.
import { pitchFeel } from './pitches.js';

export const GUIDE = {
  flat: {
    sum: 'Rock hard and true: the easiest pitch to bat on.',
    does: ['A true bounce: the ball does what it looks like it will', 'Shots carry: a well-timed one flies', 'Swing, seam and spin are all held back'],
    bat: 'Back yourself. Time it and go big, and loft early.',
    bowl: 'Do not expect help: vary your length and hunt the stumps with yorkers.',
  },
  swing: {
    sum: 'The air is heavy: the new ball hoops late.',
    does: ['The new ball swings late, then straightens as it ages', 'Pace bowlers get the most out of it', 'The movement fades as the match goes on'],
    bat: 'Watch the line, not the first look. Be patient early.',
    bowl: 'Bowl full and straight with the new ball, and bend it late with aftertouch.',
  },
  turner: {
    sum: 'Bone dry and cracked: low, uneven, and it turns.',
    does: ['Spinners turn it sharply, and more as the pitch wears', 'Low, uneven bounce: some balls keep low', 'Quicks lose some of their edge'],
    bat: 'Stay patient and work the ones and twos: no two balls behave the same.',
    bowl: 'Bring on the spinners and let the turn find the stumps.',
  },
  bouncy: {
    sum: 'Fast and bouncy: the ball rears up at you.',
    does: ['The ball arrives high and fast: less time to read it', 'The extra bounce brings edges and mistimed shots', 'Shots carry a little further'],
    bat: 'Be ready early. High balls can be left, short ones pulled.',
    bowl: 'Go short and fast: a bouncer is a real weapon here.',
  },
  dew: {
    sum: 'Dew settles in the second innings: the chase gets easier.',
    does: ['In the second innings the ball skids on and swing dies away', 'Batting eases as the overs go by', 'A damp outfield runs quicker'],
    bat: 'Chasing is the edge here: do not panic early, the pitch comes to you.',
    bowl: 'Set a total big enough to survive the dew, and save your yorkers for the second innings.',
  },
  green: {
    sum: 'A green tinge: the ball nips about, then it flattens out.',
    does: ['Big seam movement off the pitch early', 'It flattens after the first couple of overs', 'Timing is a little harder at first'],
    bat: 'Survive the first overs, then score once it settles.',
    bowl: 'Use the new ball: pitch it up and let it seam.',
  },
  slow: {
    sum: 'Damp and slow: the ball holds up and arrives late.',
    does: ['The ball holds up off the pitch and arrives late', 'Shots die: boundaries are hard to find', 'Wrist spinners grip'],
    bat: 'Wait for it: tapping early mistimes. Work the ones and twos.',
    bowl: 'Bowl at the stumps. Spinners are very effective here.',
  },
  quick: {
    sum: 'A true pitch and a lightning-fast outfield.',
    does: ['A true pitch for batting', 'Ground shots run on all the way to the rope', 'Fielders cannot cut the ball off'],
    bat: 'Keep it on the floor: it will find the rope.',
    bowl: 'Pitch it up and keep the boundaries guarded.',
  },
};
// the order they are shown in
export const GUIDE_ORDER = ['flat', 'swing', 'turner', 'bouncy', 'dew', 'green', 'slow', 'quick'];

// 1 to 5 pips from a multiplier (1.0 is the middle)
const pips = v => Math.max(1, Math.min(5, Math.round(3 + (v - 1) * 8)));
export const meters = P => {
  const f = pitchFeel(P, {});
  return [
    ['Batting', pips(f.bat * f.carry)],
    ['Pace', pips(f.kmh * f.skid)],
    ['Swing and seam', pips(Math.max(f.swing, f.seam))],
    ['Spin', pips(f.turn)],
    ['Bounce', pips(f.bounce)],
    ['Outfield', pips(f.roll * (2 - f.field))],
  ];
};
