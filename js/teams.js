// The eight teams. Each has a hand-drawn batting sprite sheet (img/batter-<id>.webp)
// and kit colours used for the drawn fielders, keeper and front-view batter.
export const TEAMS = [
  { id: 'thunder', name: 'Thunder Strikers', suit: '#1f5fd6', trim: '#ffd23f' },
  { id: 'cyclones', name: 'Green Cyclones', suit: '#1e7a32', trim: '#ffd21f' },
  { id: 'vipers', name: 'Volt Vipers', suit: '#1f1f26', trim: '#e8262b' },
  { id: 'eagles', name: 'Golden Eagles', suit: '#ffcf1a', trim: '#1a1a1a' },
  { id: 'phoenix', name: 'Phoenix Blaze', suit: '#f2711c', trim: '#1c1c1c' },
  { id: 'titans', name: 'Steel Titans', suit: '#8f9296', trim: '#1c1c1c' },
  { id: 'storm', name: 'Purple Storm', suit: '#6a22c4', trim: '#f2b21b' },
  { id: 'royals', name: 'Pink Royals', suit: '#ec2f9a', trim: '#ffffff' },
];

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
