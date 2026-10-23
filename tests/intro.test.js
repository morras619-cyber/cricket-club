import test from 'node:test';
import assert from 'node:assert/strict';

// intro.js pulls in the scene code, which expects a browser: the few things it touches at load are stood in for
globalThis.Image = class {};
globalThis.document = { createElement: () => ({ getContext: () => ({}), classList: { toggle() {} }, append() {}, replaceChildren() {}, remove() {} }), getElementById: () => null };
globalThis.window = { devicePixelRatio: 1 };
globalThis.localStorage = { getItem: () => null, setItem() {} };
const { MatchIntro, INTRO_MS, introLength } = await import('../js/intro.js');

const team = id => ({ id, name: id, suit: '#123456', trim: '#abcdef' });
const make = (batting = true) => new MatchIntro({}, { batting, my: team('thunder'), opp: team('cyclones'), cards: { openers: [], bowler: null }, order: 'YOU BAT FIRST' });

test('the match intro runs for its length, and a tap ends it at once', () => {
  assert.ok(INTRO_MS >= 6000 && INTRO_MS <= 10000, 'a few seconds, not a cutscene');
  const i = make();
  assert.equal(i.finished(1000), false, 'not started: it is not finished');
  i.t0 = 1000;
  assert.equal(i.finished(1000 + INTRO_MS - 1), false);
  assert.equal(i.finished(1000 + INTRO_MS), true);
  // bowling first you pick the bowler yourself, so the bowler's shot is left out
  assert.ok(introLength(false) < introLength(true));
  const k = make(false); k.t0 = 1000;
  assert.equal(k.finished(1000 + introLength(false)), true);
  assert.equal(k.finished(1000 + introLength(false) - 1), false);
  const j = make(); j.t0 = 1000;
  assert.equal(j.finished(1200), false);
  j.skip();
  assert.equal(j.finished(1201), true, 'skipped');
});
