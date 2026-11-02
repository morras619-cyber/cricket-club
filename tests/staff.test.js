import test from 'node:test';
import assert from 'node:assert/strict';
const C = await import('../js/career.js');
const MF = await import('../js/merch.js');
const TG = await import('../js/training.js');
const MD = await import('../js/stamina.js');
const { CANDIDATES, HIRE_AT } = C;

const FEMALE = new Set(['Meera', 'Sana', 'Anjali', 'Aisha', 'Emma', 'Priya', 'Neha', 'Farah']);
const MALE = new Set(['Tariq', 'Dilan', 'Omar', 'Ravi', 'Imtiaz', 'Brett', 'Kemar', 'Nuwan', 'Callum', 'Marcus', 'Devon', 'Lucas', 'Rajesh', 'Rohan', 'Vikram', 'Anwar']);

test('everyone you can hire has an unmistakably matching name, a country, an age and some words', () => {
  assert.equal(new Set(CANDIDATES.map(x => x.id)).size, CANDIDATES.length, 'unique portraits');
  assert.equal(new Set(CANDIDATES.map(x => x.name)).size, CANDIDATES.length, 'unique names');
  for (const x of CANDIDATES) {
    const first = x.name.replace(/^Dr /, '').split(' ')[0];
    assert.ok(x.sex === 'm' ? MALE.has(first) : FEMALE.has(first), `${x.name}: a ${x.sex === 'm' ? 'man' : 'woman'}'s name`);
    assert.ok(C.FLAGS[x.c], `${x.name}: a country`);
    assert.ok(x.age >= 22 && x.age <= 65, `${x.name}: an age`);
    assert.ok(x.about.length > 20 && x.about.length < 120, `${x.name}: a short description`);
    assert.ok([1, 2, 3].includes(x.rating));
    assert.ok(['merch', 'training', 'medical', 'office'].includes(x.kind));
  }
});
test('every building has a one-star hand from the start, and the better ones wait for the building to grow', () => {
  for (const kind of ['merch', 'training', 'medical', 'office']) {
    const list = C.candidatesOf(kind);
    assert.ok(list.some(x => x.rating === 1), `${kind}: someone at level 1`);
    assert.ok(list.some(x => x.rating === 3), `${kind}: a star for level 10`);
  }
  for (const role of ['designer', 'printer', 'packer']) assert.ok(C.candidatesOf('merch').some(x => x.role === role && x.rating === 1), `${role} at level 1`);
  for (const role of ['bat', 'pace', 'spin']) assert.ok(C.candidatesOf('training').some(x => x.role === role && x.rating === 1), `${role} coach at level 1`);
  for (const role of ['accountant', 'agent']) assert.ok(C.candidatesOf('office').some(x => x.role === role && x.rating === 1), `${role} at level 1`);
  assert.deepEqual(HIRE_AT, { 1: 1, 2: 5, 3: 10 });
});
test('the factory hires a chosen person with his name and stars, once, and only when the building is big enough', () => {
  const m = MF.freshMerch(0); m.level = 10; MF.seal(m);
  const w = C.candidateById('f2'), p = C.candidateById('f4');
  assert.ok(MF.hire(m, 'designer', w).ok);
  assert.deepEqual({ name: m.staff[0].name, lvl: m.staff[0].lvl, cand: m.staff[0].cand }, { name: 'Meera Iyer', lvl: 2, cand: 'f2' });
  assert.equal(MF.hire(m, 'designer', w).ok, false, 'not twice');
  assert.equal(MF.hire(m, 'packer', p).ok, false, 'a printer is not a packer');
  const low = MF.freshMerch(0);
  assert.equal(MF.hire(low, 'designer', w).ok, false, 'a 2-star waits for level 5');
  assert.ok(MF.hire(low, 'designer', C.candidateById('f3')).ok, 'a 1-star is there from the start');
  assert.ok(MF.sealed(low), 'the books still add up');
  assert.ok(MF.hire(MF.freshMerch(0), 'printer').ok, 'the old random hire still works');
});
test('coaches, physios and officers are hired the same way', () => {
  const t = TG.freshTraining(0);
  assert.equal(TG.hire(t, 'bat', C.candidateById('c1')).ok, false, 'a 3-star waits for level 10');
  assert.ok(TG.hire(t, 'bat', C.candidateById('c4')).ok);
  assert.equal(t.coaches[0].name, 'Anjali Deshmukh'); assert.equal(t.coaches[0].cand, 'c4'); assert.ok(TG.sealed(t));
  assert.equal(TG.hire(t, 'pace', C.candidateById('c3')).ok, false, 'a spin coach is not a pace coach');
  const m = MD.freshMedical();
  assert.equal(MD.hirePhysio(m, C.candidateById('m1')).ok, false, 'a 3-star waits for level 10');
  assert.ok(MD.hirePhysio(m, C.candidateById('m4')).ok); assert.equal(m.physios[0].name, 'Aisha Khan'); assert.ok(MD.medSealed(m));
  const c = C.newCareer(5); C.chooseClub(c, c.divisions.d3[0]);
  assert.equal(C.hireOfficer(c, 'agent', C.candidateById('o2')).ok, false, 'a 3-star waits for level 10');
  assert.equal(C.hireOfficer(c, 'accountant', C.candidateById('agent')).ok, false, 'an agent is not an accountant');
  assert.ok(C.hireOfficer(c, 'agent', C.candidateById('agent')).ok);
  assert.deepEqual({ n: C.office(c).staff[0].name, l: C.office(c).staff[0].lvl }, { n: 'Vikram Khanna', l: 1 });
});
test('a better hand is paid more: a star above the first adds a quarter to the wage', () => {
  assert.equal(C.wageText(12, 1), 12); assert.equal(C.wageText(12, 2), 15); assert.equal(C.wageText(12, 3), 18);
});
