import test from 'node:test';
import assert from 'node:assert/strict';
const C = await import('../js/career.js');
const { APT } = C;

const club = () => { const c = C.newCareer(61); C.chooseClub(c, c.divisions.d3[0]); C.finishAuction(c); return c; };
const season = (c, o) => c.history.push({ season: c.history.length + 1, div: 'd3', pos: 5, ...o });

test('a new apartment is empty, and a career with a history finds its cabinet already full', () => {
  const c = club();
  assert.deepEqual(C.trophiesOf(c), []);
  assert.equal(C.mgrLevel(c), 1);
  assert.equal(C.salaryCash(c), 0);
  season(c, { pos: 1 }); season(c, { pos: 2, promoted: 'd2', div: 'd3' });
  const ids = C.trophiesOf(c).map(t => t.id).sort();
  assert.deepEqual(ids, ['promo-d2', 'title-d3']);
});
test('each kind of trophy gives one small permanent bonus, once', () => {
  const c = club();
  assert.deepEqual(C.trophyBuffs(c), { sponsor: 0, fans: 0, tickets: 0, merch: 0 });
  season(c, { pos: 1 });
  assert.equal(C.trophyBuffs(c).fans, 0.02);
  season(c, { pos: 1 });
  assert.equal(C.trophyBuffs(c).fans, 0.02, 'a second title of the same kind adds nothing');
  assert.equal(C.trophiesOf(c).find(t => t.id === 'title-d3').count, 2, 'but the cabinet counts it');
  season(c, { pos: 1, div: 'asl' });
  const b = C.trophyBuffs(c);
  assert.ok(Math.abs(b.fans - 0.07) < 1e-9 && Math.abs(b.merch - 0.05) < 1e-9 && Math.abs(b.tickets - 0.05) < 1e-9);
  assert.ok(Object.values(b).every(v => v <= 0.2), 'small: popularity and money only');
});
test('the bonuses work: sponsors, gate money, jersey demand and follower growth', () => {
  const lo = club(), hi = club();
  season(hi, { pos: 2, promoted: 'asl', div: 'd2' }); season(hi, { pos: 1, div: 'asl' }); season(hi, { pos: 1, div: 'd2' });
  assert.ok(C.dealWorth(hi, 'form').top > C.dealWorth(lo, 'form').top, 'sponsors pay more');
  hi.custom = lo.custom = { stadium: 1 };
  assert.ok(C.ticketOf(hi) > C.ticketOf(lo));
  hi.merch = lo.merch = { level: 1 };
  assert.ok(C.merchDemand(hi) > C.merchDemand(lo));
});
test('the manager gains points from every season, titles and promotions, and levels up slowly', () => {
  const c = club();
  assert.equal(C.mgrPoints(c), 0);
  season(c);
  assert.equal(C.mgrPoints(c), APT.SEASON);
  season(c, { pos: 1, div: 'd2' });
  assert.equal(C.mgrPoints(c), APT.SEASON * 2 + APT.TITLE * 1.5);
  for (let i = 0; i < 12; i++) season(c, { pos: 1, div: 'asl', promoted: 'asl' });
  assert.ok(C.mgrLevel(c) >= 5 && C.mgrLevel(c) <= 10);
  const many = club();
  for (let i = 0; i < 20; i++) season(many);
  assert.ok(C.mgrLevel(many) <= 4, 'twenty ordinary seasons are not enough for a high level');
  assert.equal(C.mgrShare(many) >= 0 && C.mgrShare(many) <= 1, true);
});
test('a bigger name raises sponsor pay a little and lets better players sign', () => {
  const c = club();
  assert.equal(C.managerPay(c), 1); assert.equal(C.repBonus(c), 0);
  const cap0 = C.repCap(c);
  for (let i = 0; i < 30; i++) season(c, { pos: 1, div: 'asl', promoted: 'asl' });
  assert.equal(C.mgrLevel(c), 10);
  assert.ok(Math.abs(C.managerPay(c) - 1.18) < 1e-9);
  assert.equal(C.repBonus(c), 5);
  assert.equal(C.repCap(c), Math.min(99, cap0 + 5));
});
test('the salary is paid for seasons played and spent on decor, which counts towards the manager', () => {
  const c = club();
  assert.equal(C.buyDecor(c, 'lamp').ok, false, 'nothing saved yet');
  season(c, { pos: 1, div: 'asl' }); season(c, { pos: 1, div: 'asl' }); season(c, { pos: 1, div: 'asl' });
  const cash = C.salaryCash(c);
  assert.ok(cash > 1, `salary saved: ${cash}`);
  const p0 = C.mgrPoints(c);
  assert.ok(C.buyDecor(c, 'sofa').ok);
  assert.ok(Math.abs(cash - C.salaryCash(c) - 0.15) < 0.011);
  assert.equal(C.mgrPoints(c), p0 + 15);
  assert.equal(C.buyDecor(c, 'sofa').ok, false, 'one of each');
  assert.equal(C.buyDecor(c, 'nothing').ok, false);
  C.buyDecor(c, 'lamp'); C.buyDecor(c, 'plant');
  assert.equal(C.buyDecor(c, 'rug').ok, false, 'three places at level 1');
  C.apartment(c).level = 5; assert.equal(C.decorSlots(c), 6);
  C.apartment(c).level = 10; assert.equal(C.decorSlots(c), 9);
  const rich = C.salaryEarned(c); C.apartment(c).level = 1;
  assert.ok(rich > C.salaryEarned(c), 'a bigger apartment pays a bigger salary');
});
test('the lifetime record and the story', () => {
  const c = club();
  C.aptMatch(c, true); C.aptMatch(c, false); C.aptMatch(c, true);
  assert.deepEqual(C.apartment(c).life, { played: 3, won: 2 });
  season(c, { pos: 1, promoted: 'd2' }); season(c, { pos: 4, div: 'd2' });
  const log = C.storyLog(c);
  assert.equal(log.length, 2);
  assert.match(log[1].text, /Champions in Division 3 · promoted/);
  assert.equal(log[0].season, 2);
});
