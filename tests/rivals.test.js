import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../js/career.js';
import * as R from '../js/rivals.js';
import { nextFixture } from '../js/tournament.js';
import { makeRng } from '../js/rng.js';

const fakeInn = (side, i) => ({ side, runs: i.runs, wkts: i.wkts, balls: i.balls, log: [], battingCard: () => [], bowlingCard: () => [] });
const career = (seed = 7, club = 'harbour') => { const c = C.newCareer(seed); C.chooseClub(c, club); return c; };
const rate = c => id => C.clubRating(c, id);

test('a new career has a nemesis and a rival in your division, and your nemesis has already spoken', () => {
  const c = career();
  assert.equal(R.nemesisOf(c), 'thunder');
  assert.ok(c.divisions.d3.includes(c.rivals.div) && c.rivals.div !== c.club, c.rivals.div);
  assert.equal(R.rivalKind(c, 'thunder'), 'nemesis');
  assert.equal(R.rivalKind(c, c.rivals.div), 'division');
  assert.equal(R.rivalKind(c, c.club), null);
  const intro = c.rivals.inbox.find(m => m.event === 'intro');
  assert.equal(intro.from, 'thunder');
  assert.ok(!intro.text.includes('{'), intro.text);
  assert.ok(c.rivals.inbox.some(m => m.event === 'new' && m.from === c.rivals.div));
});

test('the same career has the same rival every time, and a club that is Thunder gets another nemesis', () => {
  assert.equal(career(11).rivals.div, career(11).rivals.div);
  const c = career();
  c.club = 'thunder';
  assert.equal(R.nemesisOf(c), 'cyclones');
});

test('a move to another division gives a new rival, who is never you and never your nemesis while there is another club', () => {
  const c = career();
  const old = c.rivals.div;
  c.divisions.d3 = c.divisions.d3.filter(x => x !== c.club); c.divisions.d2 = [...c.divisions.d2, c.club];   // (promoted)
  const next = R.ensureRivals(c, rate(c), c.divisions.d2);
  assert.ok(next && next !== old && c.divisions.d2.includes(next) && next !== c.club);
  const asl = [...c.divisions.asl, c.club];
  const top = R.ensureRivals(c, rate(c), asl);
  assert.ok(top && top !== 'thunder', 'in the Super League the rival is another club, as Thunder is the nemesis');
  assert.equal(R.ensureRivals(c, rate(c), asl), null, 'a rival stays your rival while you share a division');
});

test('playing a season keeps the record against every club, and a rival answers when you meet', () => {
  const c = career(9);
  C.finishAuction(c);
  let n = 0, f, played = 0, rivalNotes = 0;
  while ((f = nextFixture(c.league)) && n++ < 14) {
    const m = C.simCareerMatch(c, c.club, f.opp, makeRng(n * 17));
    const notes = C.afterLeagueMatch(c, { innings: [fakeInn('player', m.ia), fakeInn('ai', m.ib)], result: { outcome: m.winner === c.club ? 'win' : 'loss' }, oppTeam: { id: f.opp } });
    played++;
    if (f.opp === c.rivals.div || f.opp === 'thunder') rivalNotes += notes.filter(x => x.startsWith('📣')).length;
  }
  const total = Object.values(c.rivals.h2h).reduce((s, h) => s + h.w + h.l, 0);
  assert.equal(total, played);
  const rivalGames = R.meetings(c, c.rivals.div).w + R.meetings(c, c.rivals.div).l;
  assert.ok(rivalGames >= 1 && rivalNotes >= rivalGames - 0, `${rivalGames} games, ${rivalNotes} words`);
});

test('every line fills in properly and none is empty', () => {
  const c = career();
  for (const [kind, events] of Object.entries(R.LINES)) for (const [ev, lines] of Object.entries(events)) {
    assert.ok(lines.length >= 2, `${kind}.${ev}`);
    for (let i = 0; i < 6; i++) {
      const l = R.line(c, kind, ev, kind === 'nemesis' ? 'thunder' : c.rivals.div, String(i));
      assert.ok(l.text.length > 8 && !l.text.includes('{'), `${kind}.${ev}: ${l.text}`);
    }
  }
});

test('the line before a match is steady, and the last line said is not said again straight away', () => {
  const c = career();
  const a = R.preMatch(c, 'thunder'), b = R.preMatch(c, 'thunder');
  assert.deepEqual(a, b);
  assert.equal(a.kind, 'nemesis');
  assert.equal(R.preMatch(c, c.divisions.d3.find(x => x !== c.club && x !== c.rivals.div)), null);
  const first = R.say(c, 'nemesis', 'watch', 'thunder', '1'), second = R.say(c, 'nemesis', 'watch', 'thunder', '1');
  assert.notEqual(first.text, second.text);
});

test('careers saved before the rivals get them when they load', () => {
  const c = career();
  delete c.rivals;
  C.migrateCareer(c);
  assert.ok(c.rivals.div && c.rivals.inbox.some(m => m.event === 'intro'));
});
