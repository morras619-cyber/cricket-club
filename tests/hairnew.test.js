import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { HAIR_ATLAS } from '../js/hairatlas.js';
import { KIT_SHEETS } from '../js/kitsheets.js';
import { PORTRAIT_STYLES } from '../js/portrait-styles.js';

const NEW = ['sweep', 'shag', 'wavy', 'ringlets', 'quiff', 'fuzz', 'fringe', 'slick', 'afro', 'swoop'];
const OLD = ['part', 'messy', 'buzz', 'bald', 'long', 'ponytail', 'bun', 'dreads', 'curly', 'spiky'];

test('every hairstyle has its piece on the match sprites and its layer on the kit sheets, front and back', () => {
  for (const view of ['front', 'back']) for (const name of [...OLD, ...NEW]) assert.ok(HAIR_ATLAS[`${view}:hair:${name}`], `${view}:hair:${name} in the atlas`);
  for (const view of ['front', 'back']) for (const name of [...OLD.filter(n => n !== 'bald'), ...NEW]) {
    assert.ok(KIT_SHEETS[view].hair[name] > 0.1, `${view} ${name} reference light`);
    assert.ok(existsSync(new URL(`../img/kit/${view}-hair-${name}.webp`, import.meta.url)), `${view}-hair-${name}.webp`);
  }
});

test('the painted portraits only use hairstyles that are drawn', () => {
  for (const [who, s] of Object.entries(PORTRAIT_STYLES)) if (s.cut && s.cut !== 'bald') assert.ok(HAIR_ATLAS[`front:hair:${s.cut}`], `${who}: ${s.cut}`);
});
