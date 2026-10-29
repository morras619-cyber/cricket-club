import test from 'node:test';
import assert from 'node:assert/strict';

// the net trials: a ball hit in the nets hits a net and drops, it never leaves the cage (3.8 m wide, 5 m tall, 12 m behind the batter's stumps to 40 m beyond)
test('a ball struck in the nets stays inside the cage and comes to rest', async () => {
  const { netBall } = await import('../js/nets.js');
  for (const [ang, v, deg] of [[0, 40, 4], [0.6, 35, 30], [-1.2, 30, 10], [3.0, 20, 5], [0.1, 45, 55], [1.5, 38, 2]]) {
    const vl = deg * Math.PI / 180, f = { p0: { x: 0, y: 1, z: 0 }, vx: Math.sin(ang) * v * Math.cos(vl), vz: Math.cos(ang) * v * Math.cos(vl), vy: v * Math.sin(vl) };
    for (let t = 0; t < 8; t += 0.1) {
      const p = netBall(f, t);
      assert.ok(Math.abs(p.x) <= 1.9001 && p.z >= -12.001 && p.z <= 40.001 && p.y <= 5.001 && p.y >= 0, `inside the cage at ${t.toFixed(1)} s (angle ${ang}, ${v} m/s, ${deg} deg): ${JSON.stringify(p)}`);
    }
    const a = netBall(f, 7.5), b = netBall(f, 8);
    assert.ok(Math.hypot(a.x - b.x, a.z - b.z) < 0.3, 'at rest');
  }
});

// the nets have no crowd: with the mute on, the crowd's sounds do nothing (no audio is started, and none is needed to be)
test('the crowd is muted in the nets', async () => {
  const a = await import('../js/audio.js');
  a.crowdMute.on = true;
  try {
    assert.equal(a.sixMusic(1), 0);
    a.startAmbience(); a.cheerStart(1); a.crowdOhh(); a.crowdResolve('wicket'); a.crowdRuns(0); a.crowdSing(0); a.crowdClap(0); a.crowdBoo(0); a.sfx.crowd(1);
  } finally { a.crowdMute.on = false; }
});

// the nets have one batter: runs never swap him with a partner, and being out does not start a new stint (the scoreboard keeps his score)
test('a solo innings keeps the one batter and his score', async () => {
  const { Innings } = await import('../js/match.js');
  const inn = new Innings('player', null, { balls: 12, wkts: 99, solo: true });
  inn.setBatter({ id: 'a', name: 'A' });
  for (const r of [1, 1, 2, 1]) inn.ball({ runs: r });
  assert.equal(inn.cur.id, 'a'); assert.equal(inn.cur.runs, 5); assert.equal(inn.cur.balls, 4);
  inn.ball({ wicket: true });
  assert.equal(inn.cur.id, 'a'); assert.equal(inn.cur.runs, 5); assert.equal(inn.wkts, 1);
  const normal = new Innings('player');
  normal.setBatter({ id: 'a', name: 'A' }); normal.setPartner({ id: 'b', name: 'B' });
  normal.ball({ runs: 1 });
  assert.equal(normal.cur.id, 'b', 'in a real innings one run still changes the strike');
});

// every frame a shot plays has a drawing in the front view too (the batter seen from the bowler's end): a missing one falls back to the plain figure
test('the batter seen from the front has every frame the swings use', async () => {
  const { SEQ } = await import('../js/batsprite.js');
  const { BAT_FRONT } = await import('../js/bowlsprite.js');
  for (const [anim, steps] of Object.entries(SEQ)) for (const [f] of steps) assert.ok(BAT_FRONT[f], `${anim}: ${f}`);
});
