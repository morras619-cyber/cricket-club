import test from 'node:test';
import assert from 'node:assert/strict';
const C = await import('../js/career.js');

const club = () => { const c = C.newCareer(11); C.chooseClub(c, c.divisions.d3[0]); return c; };
const win = c => { const mine = C.clubPlayers(c, c.club)[0]; const inn = { side: 'player', battingCard: () => [{ id: mine.id, runs: 20, balls: 15, fours: 2, sixes: 0, out: false }], bowlingCard: () => [] }; return { innings: [inn, { side: 'ai', battingCard: () => [], bowlingCard: () => [] }], result: { outcome: 'win' } }; };

test('a win pays less in a lower division', () => {
  const lo = club(), hi = club();
  hi.divisions.asl.push(hi.club); hi.divisions.d3 = hi.divisions.d3.filter(id => id !== hi.club);   // (the same club, in the top division)
  const a = lo.money, b = hi.money;
  C.recordPlayerMatch(lo, win(lo)); C.recordPlayerMatch(hi, win(hi));
  const dLo = lo.money - a, dHi = hi.money - b;
  assert.ok(dHi >= 0.35 && dHi <= 0.45, `top division: ${dHi}`);
  assert.ok(dLo >= 0.1 && dLo <= 0.2, `division 3: ${dLo}`);
  assert.ok(dLo < dHi);
});

test('the best players will not sign for a small club', () => {
  const c = club();
  const star = ovrOf(82), good = ovrOf(79);
  assert.match(C.repBlock(c, star), /80 or more/);
  assert.equal(C.repBlock(c, good), null);
  c.divisions.d3 = c.divisions.d3.filter(id => id !== c.club); c.divisions.d2.push(c.club);
  assert.equal(C.repBlock(c, ovrOf(84)), null, 'division 2: up to 84');
  assert.ok(C.repBlock(c, ovrOf(85)));
  c.divisions.d2 = c.divisions.d2.filter(id => id !== c.club); c.divisions.asl.push(c.club);
  assert.equal(C.repBlock(c, ovrOf(95)), null, 'the top division: anyone');
});

test('a scouted star will not sign for a division 3 club either', () => {
  const c = club(); c.money = 50;
  const p = { ...ovrOf(85), id: 'scout-x', team: null, scouted: { price: 0.1, season: c.season, region: 'asia' } };
  c.players[p.id] = p;
  assert.equal(C.signFind(c, p.id), false);
});

function ovrOf(n) { return { id: `t${n}`, name: 'T', role: 'bat', bat: n, bowlSkill: 30, age: 25, pot: n }; }

test('the training ground adds rating at the season end, on top of the natural growth and never past his potential', () => {
  const T = import('../js/training.js');
  return T.then(TG => {
    const mk = () => { const c = C.newCareer(21); C.chooseClub(c, c.divisions.d3[0]); return c; };
    const a = mk(), b = mk();
    const pa = C.clubPlayers(a, a.club).find(p => p.age <= 21 && p.pot - Math.max(p.bat, p.bowlSkill) >= 8) || C.clubPlayers(a, a.club)[0];
    const pb = b.players[pa.id];
    pa.age = pb.age = 20; pa.pot = pb.pot = 95;
    a.training = TG.freshTraining(0); a.training.tp[pa.id] = 100000; TG.seal(a.training);
    const before = Math.max(pa.bat, pa.bowlSkill);
    C.nextSeason(a); C.nextSeason(b);
    const gain = Math.max(a.players[pa.id].bat, a.players[pa.id].bowlSkill) - Math.max(b.players[pb.id].bat, b.players[pb.id].bowlSkill);
    assert.ok(gain >= 1 && gain <= 1 + 0, `trained player is ${gain} ahead (level 1: one point)`);
    assert.ok(before >= 0);
  });
});
