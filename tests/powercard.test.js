import test from 'node:test';
import assert from 'node:assert/strict';

// The cards that answer an AI power use the club's hero, or a stand-in "club captain" when the club has none (the lower divisions, your own
// club). The stand-in is not in the list of heroes: asking for his portrait used to throw, and the match froze.
test('a stand-in club captain has no painted portrait, and asking for it does not throw', async () => {
  const { portraitFace } = await import('../js/futcard.js');
  assert.equal(portraitFace({ heroId: 'captain-harbour-kings' }, null, 40), null);
  assert.equal(portraitFace({ heroId: 'nobody-at-all' }, null, 40), null);
});
