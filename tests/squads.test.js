import test from 'node:test';
import assert from 'node:assert/strict';
import { roster, defaultLineup, resolveLineup, overPlan, deliveryParams, canBowl, BOWL_TYPES, MAX_OVERS, heroPlayer } from '../js/squads.js';
import { heroById } from '../js/heroes.js';
import { Innings } from '../js/match.js';
import { aiBowlingScript } from '../js/ai.js';
import { gestureToDelivery } from '../js/tactics.js';
import { TEAMS } from '../js/teams.js';

const heroes = { bat: heroById('raja'), bowl: heroById('zara'), field: heroById('rani') };

test('every team has ten fixed regulars with pace and spin', () => {
  for (const t of TEAMS) {
    const r = roster(t.id);
    assert.equal(r.length, 10);
    assert.equal(new Set(r.map(p => p.name)).size, 10);
    assert.deepEqual(roster(t.id), r); // fixed
    const types = r.filter(p => p.bowl).map(p => BOWL_TYPES[p.bowl]);
    assert.ok(types.some(x => x.spin) && types.some(x => !x.spin), t.id);
  }
});

test('the star bats first and bowls in a mixed attack', () => {
  const l = resolveLineup('thunder', heroes, null);
  assert.equal(l.order[0].id, 'raja');
  assert.equal(l.order.length, 4);
  assert.equal(l.attack[0].id, 'zara');
  assert.ok(l.attack.some(p => BOWL_TYPES[p.bowl].spin));
  // saved picks win, gaps are filled from the defaults
  const saved = resolveLineup('thunder', heroes, { order: ['thunder-3', 'raja'], attack: ['thunder-9'] });
  assert.deepEqual(saved.order.slice(0, 2).map(p => p.id), ['thunder-3', 'raja']);
  assert.equal(saved.attack[0].id, 'thunder-9');
  assert.equal(saved.attack.length, 3);
  assert.deepEqual(defaultLineup('thunder', heroes).order, l.order.map(p => p.id));
});

test('over plan: nobody bowls twice in a row or more than the limit', () => {
  for (const t of TEAMS) {
    const plan = overPlan(resolveLineup(t.id, heroes, null).attack, 5);
    assert.equal(plan.length, 5);
    const n = {};
    plan.forEach((p, i) => { n[p.id] = (n[p.id] || 0) + 1; if (i) assert.notEqual(p.id, plan[i - 1].id); });
    assert.ok(Object.values(n).every(c => c <= MAX_OVERS));
    assert.equal(n.zara, 2);
  }
  assert.ok(!canBowl({ id: 'a' }, {}, 'a'));
  assert.ok(!canBowl({ id: 'a' }, { a: 2 }, 'b'));
  assert.ok(canBowl({ id: 'a' }, { a: 1 }, 'b'));
});

test('bowler types bowl at their own speeds and move the right way', () => {
  assert.ok(deliveryParams('express', 'Seam up', 1).kmh > deliveryParams('seam', 'Off-cutter', 1).kmh);
  assert.ok(deliveryParams('legspin', 'Leg-break').move > 0);
  assert.ok(deliveryParams('legspin', 'Googly').move < 0);
  assert.ok(deliveryParams('offspin', 'Off-break').move < 0);
  assert.ok(deliveryParams('swing', 'Slower ball').kmh < 110);
  assert.equal(deliveryParams('leftpace', 'Inswinger').rx, -0.3);
});

test('the AI script follows its over plan, with the star\'s power in his overs only', () => {
  const att = resolveLineup('vipers', { bat: heroById('meher'), bowl: heroById('imran') }, null).attack;
  const plan = overPlan(att, 5);
  const s = aiBowlingScript(7, plan, 'shatter');
  assert.equal(s.length, 30);
  s.forEach((d, i) => assert.equal(d.bowler, plan[Math.floor(i / 6)].id));
  const powered = s.filter(d => d.power);
  assert.equal(powered.length, 2);
  assert.ok(powered.every(d => d.bowler === 'imran'));
  assert.deepEqual(aiBowlingScript(7, plan, 'shatter'), s);
});

test('swipes become the bowler type\'s own deliveries', () => {
  const swipe = (bend) => [0, 0.5, 1].map((t, i) => ({ x: 200 + Math.sin(t * Math.PI) * bend, y: 700 - 220 * t, t: i * 90 }));
  assert.equal(gestureToDelivery(swipe(60), 'legspin').type, 'Leg-break');
  assert.equal(gestureToDelivery(swipe(-60), 'legspin').type, 'Googly');
  assert.equal(gestureToDelivery(swipe(-60), 'offspin').type, 'Off-break');
  assert.equal(gestureToDelivery(swipe(60), 'offspin').type, 'Arm ball');
  assert.equal(gestureToDelivery(swipe(60), 'seam').type, 'Leg-cutter');
  assert.equal(gestureToDelivery(swipe(0), 'leftpace').rx, -0.3);
  assert.ok(gestureToDelivery(swipe(0), 'express').kmh >= 142);
});

test('innings: each batter has a stint, each bowler his figures', () => {
  const [a, b] = roster('thunder'), raja = heroPlayer('raja');
  const inn = new Innings('player');
  inn.setBatter(raja); inn.setBowler(a);
  inn.ball({ runs: 4 }); inn.ball({ wicket: true });
  inn.setBatter(roster('thunder')[2]);
  inn.setBowler(b);
  inn.ball({ runs: 6 }); inn.ball({ wicket: true, runOut: true });
  const card = inn.battingCard();
  assert.equal(card[0].id, 'raja'); assert.equal(card[0].runs, 4);
  assert.match(card[0].how, /^b /);
  assert.equal(card[1].runs, 6); assert.equal(card[1].how, 'run out');
  assert.deepEqual(inn.bowlingCard().map(f => [f.id, f.wkts, f.runs]), [[a.id, 1, 4], [b.id, 0, 6]]);
  assert.equal(inn.bowlingFigures().wkts, 1);
  assert.deepEqual(inn.oversBy(), { [a.id]: 1, [b.id]: 1 });
});
