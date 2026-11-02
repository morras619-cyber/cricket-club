import test from 'node:test';
import assert from 'node:assert/strict';
import { confidenceStart, confidenceEffect, updateConfidence, aiSpread } from '../js/ratings.js';
import { Innings } from '../js/match.js';
import { roster, heroPlayer } from '../js/squads.js';
import { TEAMS, LEAGUE_CLUBS } from '../js/teams.js';
import { heroById } from '../js/heroes.js';

test('every generated regular and hero has a separate bounded composure rating', () => {
  for (const team of [...TEAMS, ...LEAGUE_CLUBS]) {
    for (const player of roster(team.id)) {
      assert.ok(Number.isFinite(player.composure), team.id + ' ' + player.name);
      assert.ok(player.composure >= 25 && player.composure <= 90);
    }
  }
  for (const id of ['raja', 'meher', 'zara', 'rani', 'bilal']) {
    const player = heroPlayer(heroById(id));
    assert.ok(player.composure >= 25 && player.composure <= 90, id);
  }
});

test('composure sets a bounded starting confidence without changing batting skill', () => {
  assert.equal(confidenceStart(50), 50);
  assert.ok(confidenceStart(90) > confidenceStart(30));
  assert.ok(confidenceStart(0) >= 42);
  assert.ok(confidenceStart(100) <= 58);
});

test('confidence responds to match events and composure reduces setbacks', () => {
  assert.ok(updateConfidence(50, { runs: 4 }, 70) > 50);
  assert.ok(updateConfidence(50, { missed: true }, 80) > updateConfidence(50, { missed: true }, 20));
  assert.ok(updateConfidence(50, { wicket: true }, 80) > updateConfidence(50, { wicket: true }, 20));
  assert.equal(updateConfidence(2, { wicket: true }, 50), 0);
  assert.equal(updateConfidence(98, { runs: 6 }, 50), 100);
});

test('confidence has a small, capped influence on execution', () => {
  assert.equal(confidenceEffect(50), 1);
  assert.equal(confidenceEffect(0), 0.95);
  assert.equal(confidenceEffect(100), 1.05);
  assert.ok(aiSpread(75, 20) > aiSpread(75, 80));
});

test('innings confidence follows the batter, updates on outcomes and survives strike changes', () => {
  const inn = new Innings('player');
  const [a, b] = roster('thunder');
  inn.setBatter(a);
  inn.setPartner(b);
  const startA = inn.confidenceOf(a.id);
  inn.ball({ runs: 4 });
  assert.ok(inn.confidenceOf(a.id) > startA);
  const afterFour = inn.confidenceOf(a.id);
  inn.ball({ runs: 0, missed: true });
  assert.ok(inn.confidenceOf(a.id) < afterFour);
  inn.ball({ runs: 1 });
  assert.equal(inn.cur.id, b.id);
  const startB = inn.confidenceOf(b.id);
  assert.notEqual(startB, undefined);
  inn.ball({ runs: 6 });
  assert.ok(inn.confidenceOf(b.id) > startB);
  assert.ok(inn.confidenceOf(a.id) < afterFour);
});

test('a dismissed batter loses confidence without transferring it to the incoming batter', () => {
  const inn = new Innings('player');
  const [a, b] = roster('thunder');
  inn.setBatter(a);
  const start = inn.confidenceOf(a.id);
  inn.ball({ wicket: true });
  assert.ok(inn.confidenceOf(a.id) < start);
  inn.setBatter(b);
  assert.equal(inn.confidenceOf(b.id), confidenceStart(b.composure));
});
