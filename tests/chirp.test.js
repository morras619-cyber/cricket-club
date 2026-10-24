import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../js/career.js';
import * as K from '../js/chirp.js';
import { makeRng } from '../js/rng.js';
import { nextFixture } from '../js/tournament.js';

const career = (seed = 7) => { const c = C.newCareer(seed); C.chooseClub(c, 'harbour'); return c; };

test('numbers read like a feed: 1.2K, 48K, 3.2M', () => {
  assert.deepEqual([999, 1200, 12400, 48000, 250000, 3200000, 12000000].map(K.compact), ['999', '1.2K', '12.4K', '48K', '250K', '3.2M', '12M']);
});

test('every face has a place in the atlas', () => {
  const n = K.FANS.length + K.PRESS.length;
  assert.ok(n <= K.ATLAS.cols * K.ATLAS_ROWS);
  assert.equal(K.FANS.length, 38);
  assert.equal(K.PRESS.length, 13);
  assert.equal(K.faceStyle(0), 'background-position: 0% 0%');
  assert.match(K.faceStyle(n - 1), /^background-position: [\d.]+% 100%$/);
  assert.equal(new Set(K.FANS.map(f => f[1])).size, K.FANS.length, 'handles are unique');
  assert.ok(K.FANS.filter(f => f[3] === 'f').length >= 18, 'women are well represented');
});

test('the giants have millions of followers, a Division 3 club a few thousand, and yours starts small', () => {
  const c = career();
  assert.ok(K.followersOf(c, 'thunder') > 1e6);
  assert.ok(K.followersOf(c, 'kites') < 60000);
  assert.equal(K.followersOf(c, 'harbour'), K.START_FANS);
});

test('wins add followers and buzz, derbies add more, losses take a little away', () => {
  const a = career(), b = career(), d = career();
  const win = K.afterMatchPopularity(a, { won: true }), der = K.afterMatchPopularity(b, { won: true, derby: true }), loss = K.afterMatchPopularity(d, { won: false });
  assert.ok(win > 0 && der > win && loss < 0);
  assert.ok(b.chirp.buzz > a.chirp.buzz && d.chirp.buzz < a.chirp.buzz);
  for (let i = 0; i < 400; i++) K.afterMatchPopularity(a, { won: false });
  assert.ok(a.chirp.fans >= 100 && a.chirp.buzz >= 0);
});

test('a big club earns more from sponsors, up to a cap, and a big crowd lifts your timing a little', () => {
  const c = career();
  const small = K.sponsorBonus(c), cr0 = K.crowdOf(c);
  c.chirp.fans = 400000; c.chirp.buzz = 0.9;
  assert.ok(K.sponsorBonus(c) > small && K.crowdOf(c) > cr0);
  c.chirp.fans = 1e9;
  assert.equal(K.sponsorBonus(c), K.SPONSOR_CAP);
  assert.ok(K.crowdOf(c) <= 1 && K.CROWD_TIMING <= 0.1);
});

test('a post has the same likes every time, and likes follow the poster and the buzz', () => {
  const c = career(), by = { type: 'star', club: 'thunder', name: 'Thunder Raja' };
  assert.equal(K.engagement(c, by, 'x').likes, K.engagement(c, by, 'x').likes);
  const fan = K.engagement(c, { type: 'fan', name: 'Priya Nair' }, 'x').likes;
  assert.ok(K.engagement(c, by, 'x').likes > fan * 100, 'a star out-posts a fan by far');
  const cool = K.engagement(c, by, 'x').likes; c.chirp.buzz = 1;
  assert.ok(K.engagement(c, by, 'x').likes > cool);
});

test('fans reply in a way that fits: no one answers himself, no gaps, no one twice', () => {
  const c = career();
  for (const kind of ['taunt', 'win', 'loss', 'milestone', 'star', 'fan']) {
    for (let s = 0; s < 12; s++) {
      const post = { kind, by: kind === 'fan' ? { type: 'fan', name: K.FANS[s][0], face: s } : { type: 'star', club: 'thunder', name: 'Thunder Raja' } };
      const cs = K.commentsFor(c, post, makeRng(s * 13 + 1), 4);
      assert.ok(cs.length >= 2, kind);
      assert.equal(new Set(cs.map(x => x.face)).size, cs.length, 'no fan replies twice');
      if (kind === 'fan') assert.ok(cs.every(x => x.face !== s), 'no one replies to himself');
      for (const x of cs) assert.ok(x.text.length > 8 && !x.text.includes('{') && x.handle.startsWith('@'), x.text);
    }
  }
});

test('playing the season fills the feed and moves the followers', () => {
  const c = career(9); C.finishAuction(c);
  const fan0 = c.chirp.fans;
  const fakeInn = (side, i) => ({ side, runs: i.runs, wkts: i.wkts, balls: i.balls, log: [], battingCard: () => [], bowlingCard: () => [] });
  let f, n = 0;
  while ((f = nextFixture(c.league)) && n++ < 14) {
    const m = C.simCareerMatch(c, c.club, f.opp, makeRng(n * 23));
    const notes = C.afterLeagueMatch(c, { innings: [fakeInn('player', m.ia), fakeInn('ai', m.ib)], result: { outcome: m.winner === c.club ? 'win' : 'loss' }, oppTeam: { id: f.opp } });
    assert.ok(notes.some(x => x.includes('followers on Chirp')));
  }
  assert.ok(c.chirp.feed.length >= 10 && c.chirp.feed.length <= 40);
  assert.notEqual(c.chirp.fans, fan0);
  assert.ok(c.chirp.feed.some(p => p.by.type === 'press') && c.chirp.feed.some(p => p.by.type === 'fan') && c.chirp.feed.some(p => p.by.type === 'star'));
  assert.ok(c.chirp.feed.every(p => p.comments.length >= 2 && p.likes > 0));
});

test('careers saved before Chirp get a feed when they load', () => {
  const c = career();
  delete c.chirp;
  C.migrateCareer(c);
  assert.equal(c.chirp.fans, K.START_FANS);
});
