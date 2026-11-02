import test from 'node:test';
import assert from 'node:assert/strict';
const A = await import('../js/academy.js');
const C = await import('../js/career.js');
const { ACAD, HOUR, DAY } = A;

const club = () => { const c = C.newCareer(41); C.chooseClub(c, c.divisions.d3[0]); c.academy = A.freshAcademy(0); return c; };
const ctxOf = (c, now, o = {}) => ({ now, trusted: o.trusted ?? true,
  bank: { money: o.money ?? 5000, spend(k) { const need = Math.ceil(k / 50) * 50; if (this.money < need) return 0; this.money -= need; return need; } },
  has: id => !!c.players[id]?.prospect && c.academy.prospects.includes(id) || c.academy.prospects.includes(id) && !!c.players[id]?.prospect,
  make: t => C.makeProspect(c, t) });
// bring a prospect in quickly: a trip, and the time for it
const bring = (c, hours = 12, t0 = 0) => { const x = ctxOf(c, t0); assert.ok(A.startTrip(c.academy, 'oceania', hours, x).ok); A.tick(c.academy, ctxOf(c, t0 + hours * HOUR + 1)); return c.academy.prospects.at(-1); };

test('a trip costs money, takes its hours, and brings back a teenager outside the squad', () => {
  const c = club(), x = ctxOf(c, 0, { money: 0 });
  assert.equal(A.startTrip(c.academy, 'oceania', 12, x).ok, false, 'no money, no trip');
  const ok = ctxOf(c, 0);
  assert.ok(A.startTrip(c.academy, 'oceania', 12, ok).ok);
  assert.equal(ok.bank.money, 5000 - 100);
  A.tick(c.academy, ctxOf(c, 11 * HOUR));
  assert.equal(c.academy.prospects.length, 0, 'not back yet');
  const r = A.tick(c.academy, ctxOf(c, 12 * HOUR + 1));
  assert.equal(r.arrived.length, 1);
  const p = c.players[r.arrived[0]];
  assert.ok(p.age >= 15 && p.age <= 17 && p.prospect && !p.team);
  assert.ok(C.clubPlayers(c, c.club).every(q => q.id !== p.id), 'not in the squad');
  assert.ok(Math.max(p.bat, p.bowlSkill) <= 41);
});

test('a prospect is never on the auction block', () => {
  const c = club(); const id = bring(c);
  C.startAuction(c);
  assert.ok(!c.auction.lots.includes(id));
});

test('the academy has places for two at level 1, and a trip out holds a place', () => {
  const c = club();
  assert.ok(A.startTrip(c.academy, 'europe', 12, ctxOf(c, 0)).ok);
  assert.equal(A.startTrip(c.academy, 'europe', 12, ctxOf(c, 0)).ok, false, 'only one scout at level 1');
  const c2 = club(); bring(c2, 12, 0); bring(c2, 12, 13 * HOUR);
  assert.equal(c2.academy.prospects.length, 2);
  assert.equal(A.startTrip(c2.academy, 'europe', 12, ctxOf(c2, 30 * HOUR)).ok, false, 'full');
});

test('longer trips find better prospects, and a Superhero is rare', () => {
  const pick = hours => { let hi = 0; for (let i = 0; i < 4000; i++) if (A.pickTier(hours, (i + 0.5) / 4000) === 3) hi++; return hi / 4000; };
  assert.ok(Math.abs(pick(12) - 0.02) < 0.01);
  assert.ok(Math.abs(pick(24) - 0.05) < 0.01);
  assert.ok(Math.abs(pick(48) - 0.10) < 0.01);
  assert.equal(A.tierOf(91), 3); assert.equal(A.tierOf(80), 2); assert.equal(A.tierOf(70), 1); assert.equal(A.tierOf(60), 0);
});

test('a trial drill takes six hours and then shows what he can become', () => {
  const c = club(), id = bring(c);
  assert.ok(A.startDrill(c.academy, id, ctxOf(c, 20 * HOUR)).ok);
  assert.equal(A.startDrill(c.academy, id, ctxOf(c, 20 * HOUR)).ok, false);
  A.tick(c.academy, ctxOf(c, 25 * HOUR));
  assert.ok(!c.academy.revealed[id]);
  const r = A.tick(c.academy, ctxOf(c, 26 * HOUR + 1));
  assert.deepEqual(r.revealed, [id]);
  assert.ok(c.academy.revealed[id]);
});

test('he cannot play until he is 18; then he can be promoted if there is room, or sold for half his worth', () => {
  const c = club(), id = bring(c), p = c.players[id];
  p.age = 16;
  assert.match(C.promoteProspect(c, id).why, /18/);
  p.age = 18;
  const squad = C.clubPlayers(c, c.club).length;
  const r = C.promoteProspect(c, id);
  assert.ok(r.ok && p.team === c.club && !p.prospect && p.contract === 3);
  assert.equal(C.clubPlayers(c, c.club).length, squad + 1);
  A.tick(c.academy, ctxOf(c, 40 * HOUR));
  assert.ok(!c.academy.prospects.includes(id));
  const c2 = club(), id2 = bring(c2), before = c2.money;
  const s = C.sellProspect(c2, id2);
  assert.ok(s.ok && c2.money >= before + s.price - 0.01 && s.price >= 0.05);
  assert.ok(C.seasonBooks(c2).in.transfers > 0, 'in the books');
});

test('a full squad cannot take him', () => {
  const c = club(), id = bring(c); c.players[id].age = 18;
  let n = 0; for (const p of Object.values(c.players)) if (!p.team && !p.prospect && !p.retired && C.clubPlayers(c, c.club).length < C.MAX_SQUAD && n++ < 30) { p.team = c.club; p.contract = 2; }
  assert.match(C.promoteProspect(c, id).why, /full/);
});

test('each season a prospect grows quickly, and faster beside a mentor aged 30 or more', () => {
  const grow = mentored => {
    const c = club(), id = bring(c), p = c.players[id];
    p.age = 16; p.bat = 30; p.bowlSkill = 30; p.role = 'bat'; p.pot = 95;
    if (mentored) { const vet = C.clubPlayers(c, c.club)[0]; vet.age = 33; A.setMentor(c.academy, id, vet.id); }
    C.academySeason(c, { int: (a, b) => a, next: () => 0.5, pick: a => a[0], chance: () => false });
    return p.bat - 30;
  };
  const plain = grow(false);
  assert.equal(plain, ACAD.GROW[0]);
  assert.equal(grow(true), plain + ACAD.MENTOR_GROW);
});

test('one veteran mentors one prospect', () => {
  const c = club(), a = bring(c), b = bring(c, 12, 13 * HOUR);
  const vet = C.clubPlayers(c, c.club)[0];
  assert.ok(A.setMentor(c.academy, a, vet.id).ok);
  assert.equal(A.setMentor(c.academy, b, vet.id).ok, false);
});

test('upkeep comes from the fund, then the club; unpaid, the scouts and drills stand still', () => {
  const c = club(); bring(c);
  c.academy.fund = 0; A.seal(c.academy);
  const x = ctxOf(c, 30 * HOUR, { money: 0 });
  assert.ok(A.startTrip(c.academy, 'europe', 12, ctxOf(c, 30 * HOUR)).ok);
  const end0 = c.academy.trips[0].end;
  A.tick(c.academy, x);
  assert.ok(c.academy.trips[0].end > end0, 'the trip was held up while the upkeep could not be paid');
  const paid = club(); bring(paid); paid.academy.fund = 0; A.seal(paid.academy);
  const y = ctxOf(paid, 30 * HOUR, { money: 500 });
  A.tick(paid.academy, y);
  assert.ok(y.bank.money < 500, 'paid by the club');
});

test('the clock going back changes nothing, and an edited fund is noticed', () => {
  const c = club(); bring(c);
  const before = JSON.stringify(c.academy);
  assert.equal(A.tick(c.academy, ctxOf(c, 1 * HOUR)).skipped, 'clock');
  assert.equal(JSON.stringify(c.academy), before);
  c.academy.fund = 999999;
  assert.equal(A.tick(c.academy, ctxOf(c, 40 * HOUR)).tampered, true);
  assert.equal(c.academy.fund, 0);
});

test('a bigger academy opens places and scouts', () => {
  const c = club();
  A.setLevel(c.academy, 5);
  assert.equal(c.academy.level, 5);
  assert.ok(A.sealed(c.academy), 'the books still add up');
  assert.ok(A.startTrip(c.academy, 'europe', 12, ctxOf(c, 0)).ok && A.startTrip(c.academy, 'africa', 12, ctxOf(c, 0)).ok);
});

test('a prospect raised for years still takes long to become good: a Superhero is far from a star after two seasons', () => {
  const c = club(), id = bring(c, 48), p = c.players[id];
  p.age = 16; p.bat = 32; p.bowlSkill = 32; p.role = 'bat'; p.pot = 95;
  c.academy.mentors[id] = null;
  for (let s = 0; s < 2; s++) { p.age++; C.grow(c, p, 2); C.academySeason(c, { int: (a, b) => Math.round((a + b) / 2), next: () => 0.5, pick: a => a[0], chance: () => false }); }
  assert.ok(p.bat < 60, `rating after two seasons: ${p.bat}`);
});
