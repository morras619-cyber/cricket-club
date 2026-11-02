import test from 'node:test';
import assert from 'node:assert/strict';
import { Innings } from '../js/match.js';

const innings = () => { const inn = new Innings('player'); inn.setBatter({ id: 'a', name: 'A' }); inn.setPartner({ id: 'b', name: 'B' }); inn.setBowler({ id: 'x', name: 'X', short: 'X' }); return inn; };

test('a no-ball that is played: +1 extra, the runs count, but it is not a legal ball', () => {
  const inn = innings();
  inn.extra(1, true); inn.nbPlay = true;
  inn.ball({ runs: 4 });
  inn.nbPlay = false;
  assert.equal(inn.runs, 5);
  assert.equal(inn.balls, 0, 'still no legal ball bowled');
  assert.equal(inn.log.length, 0);
  assert.equal(inn.cur.runs, 4);
  assert.equal(inn.cur.fours, 1);
  assert.equal(inn.bowler.runs, 5);
  assert.deepEqual(inn.noBalls, [0]);
});

test('on a no-ball only a run-out ends a batter\'s innings; an odd number of runs changes the strike', () => {
  const inn = innings();
  inn.nbPlay = true;
  inn.ball({ runs: 0, wicket: true });          // (the game never sends this: it must still not count)
  assert.equal(inn.wkts, 0);
  assert.equal(inn.cur.id, 'a');
  inn.ball({ runs: 1 });
  assert.equal(inn.cur.id, 'b');
});

test('a run-out on a no-ball counts, and the next legal ball is counted as usual', () => {
  const inn = innings();
  inn.extra(1, true); inn.nbPlay = true;
  inn.ball({ runs: 1, wicket: true, runOut: true });
  inn.nbPlay = false;
  assert.equal(inn.wkts, 1);
  assert.equal(inn.stints.at(-1).how, 'run out');
  inn.ball({ runs: 1 });
  assert.equal(inn.balls, 1);
  assert.equal(inn.runs, 3);
});
