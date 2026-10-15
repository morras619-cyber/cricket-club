// The eight teams. Each has a hand-drawn batting sprite sheet (img/batter-<id>.webp)
// and kit colours used for the drawn fielders, keeper and front-view batter.
// star: the team's own hero. style: how the AI plays them (loft = extra chance of going aerial,
// sigma = timing spread, late = extra loft from ball 19, field = fielders' speed).
export const TEAMS = [
  { id: 'thunder', name: 'Thunder Strikers', suit: '#1f5fd6', trim: '#ffd23f', star: 'raja',
    style: { tag: 'Big hitters', desc: 'Swing at everything. Six or out.', loft: 0.2, sigma: 1.06 } },
  { id: 'cyclones', name: 'Green Cyclones', suit: '#1e7a32', trim: '#ffd21f', star: 'zara',
    style: { tag: 'Swing kings', desc: 'A new-ball attack that hoops it both ways.', loft: 0, sigma: 1 } },
  { id: 'vipers', name: 'Volt Vipers', suit: '#1f1f26', trim: '#e8262b', star: 'babar',
    style: { tag: 'Spin web', desc: 'Three spinners and a batting order that sells its wicket dearly.', loft: -0.05, sigma: 0.95 } },
  { id: 'eagles', name: 'Golden Eagles', suit: '#ffcf1a', trim: '#1a1a1a', star: 'bilal',
    style: { tag: 'Fast and fearless', desc: 'Express pace and batters who take on the short ball.', loft: 0.12, sigma: 1, field: 1.06 } },
  { id: 'phoenix', name: 'Phoenix Blaze', suit: '#f2711c', trim: '#1c1c1c', star: 'comet',
    style: { tag: 'Finishers', desc: 'They bat deep and come alive at the death.', loft: -0.05, late: 0.3, sigma: 1 } },
  { id: 'titans', name: 'Steel Titans', suit: '#8f9296', trim: '#1c1c1c', star: 'imran',
    style: { tag: 'The wall', desc: 'Block, nudge, grind. Seamers who never give you width.', loft: -0.18, sigma: 0.88 } },
  { id: 'storm', name: 'Purple Storm', suit: '#6a22c4', trim: '#f2b21b', star: 'meher',
    style: { tag: 'Wristy artists', desc: 'Touch players and wrist spin.', loft: 0, sigma: 0.92 } },
  { id: 'royals', name: 'Pink Royals', suit: '#ec2f9a', trim: '#ffffff', star: 'rani',
    style: { tag: 'Electric fielders', desc: 'Every run is a fight against the best fielding side.', loft: -0.03, sigma: 1, field: 1.14 } },
];
export const teamOfHero = heroId => TEAMS.find(t => t.star === heroId);

export const teamById = id => TEAMS.find(t => t.id === id) || TEAMS[0];

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
