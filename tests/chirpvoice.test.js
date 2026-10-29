import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../js/career.js';
import { WORDS, fill, personaOfFan, PERSONAS, usable } from '../js/chirpvoice.js';
import { REGISTER, OPENERS, CLOSERS, REPLY, REPLY_TEAM, REPLY_STORY, CALLBACK, PERSONA_OF } from '../js/chirpwords-voice.js';
import { JOURNEY } from '../js/chirpwords-story.js';
import { FANS } from '../js/chirp.js';
import { nextFixture } from '../js/tournament.js';
import { makeRng } from '../js/rng.js';
import { career, playMatch, play } from './chirphelp.js';

const KNOWN = new Set(['p', 'pf', 'nick', 'runs', 'balls', 'sixes', 'fours', 'sr', 'sixn', 'fourn', 'duckn', 'sruns', 'swk', 'cruns', 'cwk', 'ducks', 'w', 'r', 'econ', 'me', 'they', 'mine', 'theirs', 'by', 'n', 'tag', 'pos', 'div', 'from', 'yrs', 'yrsn', 'k', 'last', 'price', 'ovr', 'age', 'left']);
const lines = list => (Array.isArray(list) ? list : Object.values(list).flatMap(lines));
const all = () => [...lines(WORDS), ...lines(REPLY), ...lines(REPLY_TEAM), ...lines(REPLY_STORY), ...lines(CALLBACK), ...lines(OPENERS), ...lines(CLOSERS), ...JOURNEY];

test('there are thousands of different things Chirp can say', () => {
  const authored = new Set(all());
  assert.ok(authored.size >= 2000, `only ${authored.size}`);
  assert.ok(lines(WORDS).length >= 1700, 'a moment has plenty of lines');
});

test('every line only asks for things a fact can give, and every line fits a post', () => {
  for (const l of all()) {
    for (const m of l.matchAll(/\{(\w+)\}/g)) assert.ok(KNOWN.has(m[1]), `{${m[1]}} in "${l}"`);
    assert.ok(l.length > 1 && l.length <= 160, `"${l}" is ${l.length} long`);
    assert.equal(l, l.trim());
  }
});

test('no line is in a group twice, and each moment has a voice for every kind of fan', () => {
  for (const [type, regs] of Object.entries(WORDS)) {
    for (const [reg, list] of Object.entries(regs)) {
      assert.equal(new Set(list).size, list.length, `${type}/${reg} repeats a line`);
      assert.ok(list.length >= 2, `${type}/${reg} has ${list.length}`);
    }
    const good = ['hype', 'stat', 'wry', 'warm', 'old'], bad = ['rage', 'stat', 'wry', 'warm', 'old'];
    const have = Object.keys(regs);
    assert.ok(good.filter(r => have.includes(r)).length >= 4 || bad.filter(r => have.includes(r)).length >= 4, `${type} has voices ${have}`);
  }
  for (const p of PERSONAS) assert.ok(REGISTER[p] && OPENERS[p] && CLOSERS[p], p);
});

test('the lines are clean: nothing a fan should not say', () => {
  const bad = /\b(damn|hell|crap|shit|fuck|bastard|bitch|idiot|stupid|dumb|ugly|fat|loser|kill|die|racist|hate you|moron|retard|slut)\b/i;
  for (const l of all()) assert.ok(!bad.test(l), l);
});

test('fill puts the numbers in, leaves no slot, and says nothing about a missing one', () => {
  assert.equal(fill('{p} made {runs} off {balls}!', { p: 'Raza', runs: 31, balls: 14 }), 'Raza made 31 off 14!');
  assert.equal(fill('Hello {x}, ok', { x: '' }), 'Hello, ok');
  assert.throws(() => fill('{p}', {}, true), /no value/);
  assert.deepEqual(usable(['{p} scored {runs}', 'A line'], { p: 'Raza' }), ['A line']);
});

test('every fan has a persona, and the personas are spread across the fans', () => {
  const counts = {};
  for (const f of FANS) { const p = personaOfFan(f); assert.ok(REGISTER[p], p); counts[p] = (counts[p] || 0) + 1; }
  assert.ok(Object.keys(counts).length >= 6, JSON.stringify(counts));
  for (const p of PERSONAS.filter(x => x !== 'rival')) assert.ok(counts[p] >= 3, `${p} has ${counts[p]}`);
  assert.ok(FANS.every(f => PERSONA_OF[f[1]]), 'every fan is on the list');
});

// play seasons and read every word: no leftover slot, no gap, no odd stop, and a lot of different sentences
test('after seasons of matches, everything on the feed reads like a person wrote it, and almost nothing repeats', () => {
  const texts = [];
  for (const seed of [3, 4, 5, 6]) {
    const c = career(seed), rng = makeRng(seed);
    const ball = (i, r) => { const x = r.next(); return x < 0.07 ? 'W' : x < 0.3 ? '0' : x < 0.58 ? '1' : x < 0.65 ? '2' : x < 0.82 ? '4' : '6'; };
    let f, n = 0;
    while ((f = nextFixture(c.league)) && n++ < 14) { play(c, playMatch(c, f.opp, ball, ball, { seed: n * 13 + seed })); for (const p of c.chirp.feed) texts.push(p.text, ...p.comments.map(x => x.text)); }
  }
  const bad = [];
  for (const t of texts) if (/[{}]|undefined|NaN|\s{2,}|^[,.!?')]|\s[,.!?]|\(\s*\)|\bnull\b| 's\b|\$M\b/.test(t) || t.length < 4) bad.push(t);
  assert.deepEqual([...new Set(bad)].slice(0, 10), []);
  const uniq = new Set(texts);
  assert.ok(uniq.size >= 400, `only ${uniq.size} different texts`);
});
