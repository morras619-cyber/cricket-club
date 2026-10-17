// What a rating means in a match. 75 is a solid regular; 64 a squad player; 94 a superstar.
// Every number a player has should be felt: a 94 hits it 100 m when he middles it, a 64 can
// clear the short side of the ground at best.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// how hard he hits: the ball's speed off the bat, 1 for a 75. A perfect loft carries about 62 m
// for a 64 (a six only over the short side), 71 m for a 75 and 100 m and more for a 94 (carry
// grows with the square of the speed)
export const hitStrength = bat => { const b = bat ?? 75; return clamp(1 + (b - 75) * (b > 75 ? 0.009 : 0.006), 0.85, 1.25); };

// your timing windows, batting: wider for a better batter, narrower against a better bowler
export const timingFor = bat => clamp(0.4 + (bat ?? 75) / 150, 0.7, 1.1);
export const bowlerSqueeze = bowlSkill => clamp(1 - ((bowlSkill ?? 75) - 75) / 300, 0.9, 1.08);

// the computer batting: how widely his timing strays (bigger = more mistimed). A 94 is
// clean almost every ball, a 64 mistimes plenty; a good bowler (yours) makes him mistime more
export const aiSpread = skill => clamp(1 + (75 - (skill ?? 75)) / 100, 0.92, 1.4);
export const bowlerTrouble = bowlSkill => clamp(1 + ((bowlSkill ?? 75) - 75) / 150, 0.85, 1.15);

// your bowler: a better one moves it more and bowls quicker
export const movementFor = bowlSkill => clamp(0.7 + (bowlSkill ?? 75) / 250, 0.85, 1.1);
export const paceFor = bowlSkill => clamp(0.95 + (bowlSkill ?? 75) / 1500, 0.97, 1.02);

// a fielding side: how fast its men get to the ball, from the side's average overall
export const fieldSpeed = avgOvr => clamp(1 + ((avgOvr ?? 72) - 72) / 120, 0.85, 1.15);
