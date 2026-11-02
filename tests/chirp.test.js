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

test('the feed does not say the same thing twice: a season of results, wins or losses, has no repeated wording close together', () => {
  for (const won of [true, false]) {
    const c = career(13);
    const texts = [];
    for (let m = 0; m < 14; m++) {
      const opp = m % 2 ? 'kites' : 'lagoon';
      const mine = `${60 + m}/3`, theirs = `${won ? 40 + m : 90 + m}/5`;
      const rng = makeRng(m * 37 + (won ? 1 : 2));
      const story = K.storyOf(c, { won, first: { runs: 40 + (m % 5) * 9, wkts: 2, ballsLeft: 0 }, second: { runs: won ? 60 : 30, wkts: m % 3, ballsLeft: m * 2 } });
      const a = K.postMatch(c, { me: c.club, they: opp, mine, theirs, won, story }), b = K.postFan(c, { won, they: opp, mine, theirs, story }, rng);
      for (const post of [b, a]) texts.push(post.text, ...post.comments.map(x => x.text));
    }
    const counts = new Map();
    for (const t of texts) counts.set(t, (counts.get(t) || 0) + 1);
    // the press recaps differ by the score; the replies and fans' posts must not repeat inside a stretch of 24
    const body = texts.filter(t => !t.startsWith('FT:'));
    for (let i = 0; i < body.length; i++) for (let j = i + 1; j < Math.min(body.length, i + 24); j++) assert.notEqual(body[i], body[j], `repeated: ${body[i]}`);
    const worst = [...counts].sort((a, b) => b[1] - a[1])[0]; assert.ok(worst[1] <= 3, `a line said more than three times (${won ? "wins" : "losses"}): ${worst[0]} x${worst[1]}`);
  }
});

test('lines about the score are only used when there is a score', () => {
  const c = career();
  for (let s = 0; s < 40; s++) {
    const cs = K.commentsFor(c, { kind: 'win', by: { type: 'press', name: 'X', face: 38 } }, makeRng(s), 3);
    for (const x of cs) assert.ok(!/ to \s|^\s*v |\{|-run gap/.test(x.text) && !/\bv\b {2,}/.test(x.text), x.text);
  }
});

const inn = (runs, wkts = 0, ballsLeft = 0) => ({ runs, wkts, ballsLeft });
test('the story of a match: how it was won, and how close it was', () => {
  const c = career();
  // lost by 6 runs, all out chasing 42: a thriller, whoever it is
  let st = K.storyOf(c, { won: false, first: inn(42, 2), second: inn(36, 3) });
  assert.deepEqual([st.how, st.amount, st.by, st.tone], ['runs', '6 runs', 'by 6 runs', 'thriller']);
  // a chase won with wickets and plenty of balls left is a rout; one with a ball to spare is a thriller
  assert.equal(K.storyOf(c, { won: true, first: inn(30, 3), second: inn(31, 0, 20) }).tone, 'rout');
  assert.equal(K.storyOf(c, { won: true, first: inn(30, 3), second: inn(31, 2, 1) }).tone, 'thriller');
  assert.equal(K.storyOf(c, { won: true, first: inn(60, 1), second: inn(20, 3) }).tone, 'rout');
  assert.equal(K.storyOf(c, { won: false, first: inn(40, 1), second: inn(30, 3) }).tone, 'solid');
  assert.equal(K.storyOf(c, { won: true, first: inn(40, 1), second: inn(40, 3), tiebreak: 'super' }).by, 'in the Super Over');
});

test('a close match is never called a one-sided one, and a rout is never called close', () => {
  const close = /so close|painfully|too close|that finish|fine margins|thriller|wire|nerves|heartbreak|gutting|right there|nearly/i, rout = /not even close|gap|hardly broke|miles ahead|dismantl|domination|never got into|demolition|masterclass/i;
  for (let s = 0; s < 40; s++) {
    for (const [tone, bad] of [['thriller', rout], ['rout', close]]) for (const won of [true, false]) {
      const c = career(s);
      const story = { won, how: 'runs', amount: '30 runs', by: 'by 30 runs', tone, streak: { kind: won ? 'W' : 'L', n: 1 }, snap: false };
      const post = K.postMatch(c, { me: c.club, they: 'kites', mine: '60/3', theirs: '30/5', won, story });
      for (const t of [post.text.replace(/^FT:.*?\. /, ''), ...post.comments.map(x => x.text)]) assert.ok(!bad.test(t), `${tone} ${won ? 'win' : 'loss'}: ${t}`);
    }
  }
});

test('the fans notice a run of results, and the first win after a bad run', () => {
  const c = career(3), won = (w, f, s) => K.storyOf(c, { won: w, first: f, second: s });
  for (let i = 0; i < 3; i++) won(false, inn(40), inn(30, 3));
  const lost = won(false, inn(40), inn(30, 3));
  assert.deepEqual([lost.streak.kind, lost.streak.n], ['L', 4]);
  const back = won(true, inn(40), inn(41, 1, 6));
  assert.equal(back.snap, true);
  assert.equal(back.streak.n, 1);
  // four defeats: the first reply is about the run, and it says the number
  const c2 = career(5); let st; for (let i = 0; i < 4; i++) st = K.storyOf(c2, { won: false, first: inn(40), second: inn(30, 3) });
  const post = K.postMatch(c2, { me: c2.club, they: 'kites', mine: '30/3', theirs: '40/2', won: false, story: st });
  assert.match(post.comments[0].text, /4|straight|in a row|bounce/i);
});

test('a title remembers where the club started; the first season has nothing to remember', () => {
  const c = career(2);
  c.history = [{ season: 1, div: 'd3', pos: 6 }, { season: 2, div: 'd3', pos: 3 }, { season: 3, div: 'asl', pos: 1 }];
  assert.match(C.clubMemory(c, 'champion'), /started in .*6th/);
  c.history = [{ season: 1, div: 'd3', pos: 1 }];
  assert.equal(C.clubMemory(c, 'champion'), '');
});
