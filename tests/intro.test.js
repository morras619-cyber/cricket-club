import test from 'node:test';
import assert from 'node:assert/strict';

// intro.js pulls in the scene code, which expects a browser: the few things it touches at load are stood in for
globalThis.Image = class {};
globalThis.document = { createElement: () => ({ getContext: () => ({}) }) };
globalThis.window = { devicePixelRatio: 1 };
globalThis.localStorage = { getItem: () => null, setItem() {} };
const { MatchIntro, INTRO_MS } = await import('../js/intro.js');

const team = id => ({ id, name: id, suit: '#123456', trim: '#abcdef' });
const make = () => new MatchIntro({}, { batting: true, my: team('thunder'), opp: team('cyclones'), striker: { name: 'A', ovr: 80 }, bowler: { name: 'B', ovr: 70 } });

test('the match intro runs for its length, and a tap ends it at once', () => {
  assert.ok(INTRO_MS >= 6000 && INTRO_MS <= 10000, 'a few seconds, not a cutscene');
  const i = make();
  assert.equal(i.finished(1000), false, 'not started: it is not finished');
  i.t0 = 1000;
  assert.equal(i.finished(1000 + INTRO_MS - 1), false);
  assert.equal(i.finished(1000 + INTRO_MS), true);
  const j = make(); j.t0 = 1000;
  assert.equal(j.finished(1200), false);
  j.skip();
  assert.equal(j.finished(1201), true, 'skipped');
});
