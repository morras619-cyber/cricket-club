// The cricket nets: the cage the trials are played in, 3.8 m wide and 5 m tall, from 12 m behind the batter's stumps to 40 m beyond them (the same
// cage tools/build_nets.py draws). A ball hit in the nets flies as it would, hits a net, loses its pace and drops: the path is worked out once.
export const CAGE = { x: 1.9, z0: -12, z1: 40, y: 5 };
export function netBall(f, t) {
  if (!f.net) {
    const path = [], dt = 1 / 120;
    let { x, y, z } = f.p0, vx = f.vx, vy = f.vy, vz = f.vz;
    for (let i = 0; i < 120 * 8; i++) {
      vy -= 9.8 * dt; x += vx * dt; y += vy * dt; z += vz * dt;
      if (x > CAGE.x) { x = CAGE.x; vx *= -0.15; vz *= 0.5; vy *= 0.6; } else if (x < -CAGE.x) { x = -CAGE.x; vx *= -0.15; vz *= 0.5; vy *= 0.6; }
      if (z > CAGE.z1) { z = CAGE.z1; vz *= -0.15; vx *= 0.5; vy *= 0.6; } else if (z < CAGE.z0) { z = CAGE.z0; vz *= -0.15; vx *= 0.5; vy *= 0.6; }
      if (y > CAGE.y) { y = CAGE.y; vy *= -0.15; vx *= 0.6; vz *= 0.6; }
      if (y < 0.03) { y = 0.03; vy = Math.abs(vy) * 0.4; vx *= 0.75; vz *= 0.75; if (vy < 0.4) vy = 0; }
      path.push({ x, y, z });
    }
    f.net = path;
  }
  return f.net[Math.min(f.net.length - 1, Math.max(0, Math.round(t * 120)))];
}
