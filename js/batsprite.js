import { peopleSheet, loadPeopleMask } from './looks.js';
import { sheetOf, teamById } from './teams.js';
import { drawKitBatter } from './kitsprite.js';
// Hand-drawn batter frames (back view) for the batting and keeper cameras.
// One atlas per team (img/batter-<team>.webp), all cut from the same layout by
// tools/build_batter_sprites.py, so a single frame table serves every team.

const REF_HEIGHT_PX = 286;   // helmet top to feet in the "ready" frame
const REF_HEIGHT_M = 1.72;   // that same stance in world metres (stumps reach mid-thigh)

// name: [x, y, w, h, anchorX, anchorY (feet), scale]
const FRAMES = {
  ready: [0, 0, 183, 290, 91.2, 289, 1.0],
  leave1: [185, 0, 158, 332, 64.0, 331, 1.053],
  leave2: [345, 0, 119, 332, 46.2, 331, 1.08],
  backlift: [466, 0, 185, 327, 98.8, 326, 1.026],
  drive1: [653, 0, 234, 271, 94.8, 270, 1.053],
  drive2: [0, 334, 289, 265, 138.2, 264, 1.0],
  drive3: [291, 334, 124, 330, 81.8, 329, 1.08],
  pull0: [417, 334, 236, 272, 120.0, 271, 1.0],
  pull1: [655, 334, 198, 272, 81.2, 271, 1.026],
  pull2: [0, 666, 222, 263, 95.0, 262, 1.0],
  pull3: [224, 666, 172, 286, 66.2, 285, 1.08],
  def1: [398, 666, 196, 267, 107.8, 266, 0.976],
  def2: [596, 666, 155, 263, 74.8, 262, 0.93],
  def3: [753, 666, 199, 272, 103.2, 271, 1.0],
  cut1: [0, 954, 247, 287, 109.5, 286, 0.976],
  cut2: [249, 954, 263, 254, 107.0, 253, 0.952],
  cut3: [514, 954, 239, 253, 85.2, 252, 1.0],
  bowled: [755, 954, 215, 238, 107.5, 237, 0.976],
};

// the frames the kit sheet has and the old per-team sheets (and the batter seen from the front) don't
export const OLD_FRAME = { drive4: 'drive3', drive5: 'drive3', pull4: 'pull3', pull5: 'pull3', cut4: 'cut3', cut5: 'cut3', cut6: 'cut3', rsweep1: 'cut1', rsweep2: 'cut2', rsweep3: 'cut3' };

// frame, ms on screen. The swing starts when the finger lifts, which is the moment of contact,
// so the downswing is brief and the contact frame lands almost at once.
const SEQ = {
  drive: [['drive1', 25], ['drive2', 30], ['drive3', 110], ['drive4', 120], ['drive5', Infinity]],
  pull: [['pull0', 20], ['pull1', 30], ['pull2', 100], ['pull3', 90], ['pull4', 110], ['pull5', Infinity]],
  cut: [['cut1', 25], ['cut2', 30], ['cut3', 100], ['cut4', 90], ['cut5', 110], ['cut6', Infinity]],
  rsweep: [['rsweep1', 60], ['rsweep2', 130], ['rsweep3', Infinity]], // down on one knee, swept fine on the off side
  block: [['def1', 60], ['def2', 220], ['def3', Infinity]],
  leave: [['leave1', 170], ['leave2', Infinity]],
  bowled: [['bowled', Infinity]], // beaten: looking back at the stumps
};
const BLEND_MS = 40;

// which animation a swipe plays: straight and cover drives, pulls to leg, cuts to off, the reverse
// sweep fine behind square on the off side
export function shotAnim(shot) {
  if (!shot) return 'drive';
  if (shot.kind === 'block') return 'block';
  if (shot.kind === 'leave') return 'leave';
  if (shot.angle < -0.55) return 'pull';
  if (shot.angle > 1.9) return 'rsweep'; // behind square on the off side
  if (shot.angle > 0.95) return 'cut';
  return 'drive';
}

const atlases = new Map(); // team id -> { img, ready }

// start loading the sheets for the teams in this match (others stay unloaded)
export function loadBatSprites(...teamIds) {
  for (const id of teamIds.map(t => t && sheetOf(t))) {
    if (!id || atlases.has(id)) continue;
    loadPeopleMask(`batter-${id}`);
    const a = { img: null, ready: false };
    // retried a few times if the download fails, instead of cartoon batters all session
    const load = (tries = 0) => {
      a.img = new Image();
      a.img.onload = () => { a.ready = true; a.failed = false; };
      a.img.onerror = () => { a.failed = true; if (tries < 4) setTimeout(() => load(tries + 1), 800 * 2 ** tries); };
      a.img.src = `img/batter-${id}.webp`;
    };
    load();
    atlases.set(id, a);
  }
}

// batter sheets not (yet) usable, for the pause screen
export function batSpriteMissing() {
  return [...atlases].filter(([, a]) => !a.ready).map(([id, a]) => `batter-${id}${a.failed ? ' (failed)' : ' (loading)'}`);
}

// a thumbnail of a team's batter in his ready stance, for the team picker
export function drawTeamThumb(canvas, teamId) {
  loadBatSprites(teamId);
  const a = atlases.get(sheetOf(teamId));
  const paint = () => {
    const g = canvas.getContext('2d'), [sx, sy, w, h] = FRAMES.ready;
    const k = Math.min(canvas.width / w, canvas.height / h);
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.drawImage(a.img, sx, sy, w, h, (canvas.width - w * k) / 2, canvas.height - h * k, w * k, h * k);
  };
  if (a.ready) paint(); else a.img.addEventListener('load', paint, { once: true });
}

// The frame (and the one before it, for a short cross-fade) for the batter right now.
export function batFrame(b, now) {
  if (b.forceFrame) return { f: b.forceFrame }; // (previews)
  if (b.anim === 'celebrate') return { f: 'celebrate' };
  if (b.shot) {
    const seq = SEQ[b.shot.anim] || SEQ.drive;
    let t = now - b.shot.t0, prev = b.shot.from || 'backlift';
    for (const [f, ms] of seq) {
      if (t < ms) return { f, prev, a: Math.min(1, t / BLEND_MS) };
      t -= ms; prev = f;
    }
  }
  return { f: b.angle <= -2 ? 'backlift' : 'ready' };
}

function drawOne(ctx, img, name, px, py, k, alpha) {
  const [sx, sy, w, h, ax, ay, s] = FRAMES[name];
  const sc = k * s;
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, sx, sy, w, h, px - ax * sc, py - ay * sc, w * sc, h * sc);
}

// Draw at the projected feet position (px, py); kPerM is pixels per metre at that depth.
export function drawBatSprite(ctx, px, py, kPerM, b, now, opts = {}) {
  // a named batter: the kit sheet (his club's colours, his skin, his name and number)
  const fr = batFrame(b, now);
  if (b.people?.who && drawKitBatter(ctx, px, py, kPerM, fr.f, fr.prev, fr.a ?? 1, teamById(b.team), b.people, opts.glow)) return true;
  const sheet = sheetOf(b.team), atlas = atlases.get(sheet);
  if (!atlas || !atlas.ready) return false;
  const img = peopleSheet(atlas.img, `batter-${sheet}`, b.people); // the batter's own skin and hair
  const k = kPerM * REF_HEIGHT_M / REF_HEIGHT_PX;
  // (the old sheets have no celebration or reverse sweep)
  const old = n => (n === 'celebrate' ? 'drive3' : OLD_FRAME[n] || n);
  const { a = 1 } = fr, f = old(fr.f), prev = old(fr.prev);
  ctx.save();
  // ground shadow
  ctx.fillStyle = 'rgba(10,8,20,0.28)';
  ctx.beginPath(); ctx.ellipse(px, py, 0.55 * kPerM, 0.12 * kPerM, 0, 0, Math.PI * 2); ctx.fill();
  if (opts.glow) { ctx.shadowColor = opts.glow; ctx.shadowBlur = 22; }
  // the previous frame fades out underneath, which reads as motion blur on a fast swing
  if (prev && a < 1) drawOne(ctx, img, prev, px, py, k, (1 - a) * 0.6);
  drawOne(ctx, img, f, px, py, k, 1);
  ctx.restore();
  return true;
}
