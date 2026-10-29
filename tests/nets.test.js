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
