import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../js/career.js';
import { matchup } from '../js/ratings.js';

const mk = () => {
  const c = C.newCareer(5);
  C.createClub(c, { name: 'Harbour Kings', short: 'HAR', suit: '#1f3fb0', trim: '#ffd23f', crest: 'bolt', chant: 'vipers', pitch: 'turner' }, { trials: true });
  const T = c.trial;
  T.results = {
    bats: Object.fromEntries(T.bats.map((id, i) => [id, { balls: 3, runs: [11, 0, 6, 10, 3, 2][i], outs: [0, 1, 0, 0, 0, 1][i], fours: 1, sixes: 0, dots: 0, seq: [4, 1, 6] }])),
    bowls: Object.fromEntries(T.bowls.map((id, i) => [id, { balls: 3, runs: [11, 5, 9, 12, 3, 14][i], outs: [0, 1, 0, 0, 0, 0][i], fours: 0, sixes: 0, dots: 1, seq: [0, 'W', 2] }])),
  };
  return c;
};

test('a batter\'s fit says what the squad lacks, what the engine gives him, the nets and his growth: every row with a tone', () => {
  const c = mk(), T = c.trial;
  for (const id of T.bats) {
    const f = C.trialFit(c, id, 'bat', []);
    assert.ok(['STRONG FIT', 'GOOD FIT', 'BACK-UP OPTION', 'POOR FIT'].includes(f.verdict));
    assert.ok(f.rows.length >= 4 && f.rows.every(r => ['pro', 'con', 'info'].includes(r.tone) && r.text.length > 8 && !/undefined|NaN/.test(r.text)), f.rows.map(r => r.text).join(' | '));
    assert.ok(f.rows.some(r => /^Nets: /.test(r.text)) && f.rows.some(r => /years old/.test(r.text)) && f.rows.some(r => /^Bat \d+/.test(r.text)));
  }
});

test('the numbers in a batter\'s row are the engine\'s own (the opener\'s first-8-balls timing is matchup\'s)', () => {
  const c = mk(), T = c.trial, id = T.bats[0], p = c.players[id];   // (the aggressive opener)
  const mid = matchup(p, { bowl: null, bowlSkill: 60 }, { ballNo: 15, length: 'good' }), early = matchup(p, { bowl: null, bowlSkill: 60 }, { ballNo: 5, length: 'good' });
  const dw = Math.round((early.win / mid.win - 1) * 100), want = `timing +${dw}%`;
  const f = C.trialFit(c, id, 'bat', []);
  assert.ok(f.rows.some(r => r.text.includes('first 8 balls') && r.text.includes(want)), `${want} in ${f.rows.map(r => r.text).join(' | ')}`);
  assert.ok(f.rows.some(r => /edge chance \+\d+ points/.test(r.text)), 'the opener\'s early edge risk is named');
});

test('a role the squad already has is a mark against him; a role it lacks is for him', () => {
  const c = mk(), T = c.trial, opener = T.bats[0];
  const first = C.trialFit(c, opener, 'bat', []).rows[0];
  assert.equal(first.tone, 'pro'); assert.match(first.text, /Adds an opener/);
  const other = T.bats.slice(1).find(id => c.players[id].label !== c.players[opener].label);
  // the founder is a tactical batter: another tactical batter duplicates him
  const tactical = T.bats.find(id => /tactical/i.test(c.players[id].label));
  const f = C.trialFit(c, tactical, 'bat', []).rows[0];
  assert.equal(f.tone, 'con'); assert.match(f.text, /Same role as Anand/);
  assert.ok(other);
});

test('a bowler\'s fit counts the attack so far, uses the club\'s own pitch, stamina and the nets', () => {
  const c = mk(), T = c.trial, spin = T.bowls.find(id => c.players[id].bowl === 'offspin'), pace = T.bowls.filter(id => c.players[id].bowl !== 'offspin' && c.players[id].bowl !== 'legspin');
  const f = C.trialFit(c, spin, 'bowl', pace.slice(0, 2));
  assert.equal(f.rows[0].tone, 'pro'); assert.match(f.rows[0].text, /Adds spin: your 2 pace picks have no spinner/);
  assert.ok(f.rows.some(r => /On your dusty turner pitch .*timing window is −\d+% against him/.test(r.text)), f.rows.map(r => r.text).join(' | '));
  assert.ok(f.rows.some(r => /^Stamina: drains 40% slower/.test(r.text)) && f.rows.some(r => /^Nets: /.test(r.text)));
  const express = T.bowls.find(id => c.players[id].bowl === 'express'), g = C.trialFit(c, express, 'bowl', []);
  assert.ok(g.rows.some(r => r.tone === 'con' && /Stamina: drains 30% faster/.test(r.text)));
  const dup = C.trialFit(c, pace[0], 'bowl', [pace[0], pace[1]].filter(x => x !== pace[0]));
  assert.ok(dup.rows.length >= 4);
});

test('picking the same kind of bowler makes the next one a duplicate', () => {
  const c = mk(), T = c.trial, p = T.bowls[0];
  const twin = Object.values(c.players).find(q => q.bowl === c.players[p].bowl && q.id !== p);
  if (twin) { T.bowls.push(twin.id); assert.equal(C.trialFit(c, p, 'bowl', [twin.id]).rows[0].tone, 'con'); }
});
