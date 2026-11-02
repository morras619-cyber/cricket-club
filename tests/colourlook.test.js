import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../js/career.js';
import { lookOf, colourLook, skinHex, hairHex } from '../js/looks.js';
import { shade } from '../js/figure.js';

// the signature-power cut-in draws a player's skin and hair with shade(), which needs colours: a generated player's look holds tone numbers
test('every player in a career has skin and hair as colours the cut-in can draw', () => {
  const c = C.newCareer(21);
  C.chooseClub(c, 'harbour');
  let generated = 0;
  for (const p of Object.values(c.players)) {
    const lk = lookOf(p);
    if (typeof lk.skin === 'number') generated++;
    const col = colourLook(lk, { skin: '#a8714f', hair: '#1b1410' });
    assert.match(col.skin, /^#[0-9a-f]{6}$/i, p.name);
    assert.match(col.hair, /^#[0-9a-f]{6}$/i, p.name);
    assert.doesNotThrow(() => { shade(col.skin, 0.15); shade(col.hair, 0.2); }, p.name);
  }
  assert.ok(generated > 20, 'the career has plenty of generated players, which is what crashed the cut-in');
});

test('colourLook keeps painted colours and fills what is missing', () => {
  assert.deepEqual(colourLook({ skin: '#112233', hair: '#445566' }, {}), { skin: '#112233', hair: '#445566' });
  assert.deepEqual(colourLook(null, { skin: '#aaaaaa', hair: '#bbbbbb' }), { skin: '#aaaaaa', hair: '#bbbbbb' });
  assert.equal(colourLook({ skin: 1, hair: 2 }).skin, skinHex({ skin: 1 }));
  assert.equal(colourLook({ skin: 1, hair: 2 }).hair, hairHex({ hair: 2 }));
});
