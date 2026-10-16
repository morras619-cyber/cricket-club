import { peopleSheet, loadPeopleMask } from './looks.js';
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

// Teams drawn in several skin tones (img/batter-<team>-<tone>.webp, tools/build_batter_tones.py).
// Each sheet is drawn separately, so each has its own frame table. A player gets the sheet nearest
// his skin (looks.js SKIN index) and is drawn as drawn: no repainting.
const TONES = {
  thunder: {
    fair: {
      ready: [0,  0,  198,  286,  98.5,  285,  0.92],
      leave1: [200,  0,  195,  283,  96.5,  282,  0.93],
      leave2: [397,  0,  191,  282,  102.2,  281,  0.92],
      backlift: [590,  0,  185,  327,  97.5,  326,  1.0],
      drive1: [777,  0,  234,  271,  94.8,  270,  1.0],
      drive2: [0,  329,  289,  265,  138.0,  264,  1.0],
      drive3: [291,  329,  124,  329,  73.0,  328,  1.08],
      pull0: [417,  329,  235,  271,  119.8,  270,  0.952],
      pull1: [654,  329,  197,  270,  80.5,  269,  0.952],
      pull2: [0,  660,  223,  262,  95.2,  261,  0.976],
      pull3: [225,  660,  171,  286,  66.2,  285,  0.976],
      def1: [398,  660,  198,  266,  107.5,  265,  0.92],
      def2: [598,  660,  154,  263,  73.8,  262,  0.92],
      def3: [754,  660,  198,  272,  102.5,  271,  1.026],
      cut1: [0,  948,  248,  287,  110.0,  286,  0.952],
      cut2: [250,  948,  263,  254,  105.5,  253,  0.93],
      cut3: [515,  948,  238,  255,  84.8,  254,  1.0],
      bowled: [755,  948,  215,  238,  107.5,  237,  1.0],
    },
    fair2: {
      ready: [0,  0,  194,  284,  107.5,  283,  0.976],
      leave1: [196,  0,  189,  282,  101.8,  281,  0.952],
      leave2: [387,  0,  194,  281,  106.5,  280,  0.976],
      backlift: [583,  0,  185,  327,  98.8,  326,  1.026],
      drive1: [770,  0,  234,  270,  95.2,  269,  1.026],
      drive2: [0,  329,  288,  264,  138.5,  263,  1.0],
      drive3: [290,  329,  125,  330,  81.2,  329,  1.08],
      pull0: [417,  329,  235,  271,  120.0,  270,  0.976],
      pull1: [654,  329,  197,  270,  80.8,  269,  1.026],
      pull2: [0,  661,  222,  262,  95.0,  261,  1.0],
      pull3: [224,  661,  172,  286,  66.0,  285,  1.053],
      def1: [398,  661,  196,  266,  107.8,  265,  0.952],
      def2: [596,  661,  154,  262,  74.8,  261,  0.952],
      def3: [752,  661,  198,  271,  106.2,  270,  1.0],
      cut1: [0,  949,  248,  286,  109.5,  285,  0.952],
      cut2: [250,  949,  262,  254,  106.0,  253,  0.93],
      cut3: [514,  949,  238,  254,  85.0,  253,  1.0],
      bowled: [754,  949,  215,  237,  106.5,  236,  0.976],
    },
    tan: {
      ready: [0,  0,  197,  287,  100.8,  286,  0.92],
      leave1: [199,  0,  196,  284,  99.5,  283,  0.92],
      leave2: [397,  0,  197,  282,  105.2,  281,  0.92],
      backlift: [596,  0,  187,  327,  99.5,  326,  0.976],
      drive1: [785,  0,  234,  272,  94.8,  271,  1.0],
      drive2: [0,  329,  288,  265,  138.2,  264,  1.0],
      drive3: [290,  329,  125,  328,  82.2,  327,  1.08],
      pull0: [417,  329,  236,  271,  120.0,  270,  0.952],
      pull1: [655,  329,  197,  271,  80.0,  270,  1.0],
      pull2: [0,  659,  223,  262,  95.5,  261,  0.976],
      pull3: [225,  659,  173,  286,  67.0,  285,  0.976],
      def1: [400,  659,  198,  266,  108.5,  265,  0.952],
      def2: [600,  659,  154,  263,  73.5,  262,  0.92],
      def3: [756,  659,  197,  272,  102.5,  271,  1.0],
      cut1: [0,  947,  248,  287,  110.0,  286,  0.93],
      cut2: [250,  947,  262,  254,  105.8,  253,  0.93],
      cut3: [514,  947,  238,  255,  84.2,  254,  1.0],
      bowled: [754,  947,  215,  238,  107.8,  237,  1.0],
    },
    brown: {
      ready: [0,  0,  199,  287,  109.8,  286,  0.92],
      leave1: [201,  0,  189,  282,  97.5,  281,  0.93],
      leave2: [392,  0,  193,  281,  103.2,  280,  0.92],
      backlift: [587,  0,  188,  327,  99.8,  326,  0.976],
      drive1: [777,  0,  235,  272,  95.2,  271,  1.0],
      drive2: [0,  329,  290,  266,  139.2,  265,  0.976],
      drive3: [292,  329,  125,  330,  82.0,  329,  1.08],
      pull0: [419,  329,  236,  271,  120.5,  270,  0.952],
      pull1: [657,  329,  198,  271,  81.2,  270,  1.0],
      pull2: [0,  661,  224,  262,  96.5,  261,  1.0],
      pull3: [226,  661,  173,  286,  67.0,  285,  1.0],
      def1: [401,  661,  198,  267,  108.5,  266,  0.976],
      def2: [601,  661,  154,  263,  74.5,  262,  0.93],
      def3: [757,  661,  200,  272,  106.8,  271,  1.0],
      cut1: [0,  949,  249,  286,  110.8,  285,  0.952],
      cut2: [251,  949,  263,  254,  106.8,  253,  0.93],
      cut3: [516,  949,  240,  255,  85.2,  254,  1.0],
      bowled: [758,  949,  215,  239,  108.2,  238,  0.976],
    },
    dark: {
      ready: [0,  0,  200,  287,  101.2,  286,  0.92],
      leave1: [202,  0,  192,  283,  95.8,  282,  0.93],
      leave2: [396,  0,  194,  282,  105.0,  281,  0.92],
      backlift: [592,  0,  185,  327,  98.0,  326,  0.976],
      drive1: [779,  0,  234,  271,  94.8,  270,  0.976],
      drive2: [0,  329,  289,  266,  138.5,  265,  1.0],
      drive3: [291,  329,  124,  330,  81.5,  329,  1.08],
      pull0: [417,  329,  235,  271,  119.8,  270,  0.952],
      pull1: [654,  329,  197,  270,  80.8,  269,  0.976],
      pull2: [0,  661,  223,  262,  95.5,  261,  1.0],
      pull3: [225,  661,  171,  286,  66.0,  285,  1.0],
      def1: [398,  661,  198,  266,  108.8,  265,  0.93],
      def2: [598,  661,  155,  263,  74.2,  262,  0.92],
      def3: [755,  661,  199,  272,  106.0,  271,  1.026],
      cut1: [0,  949,  248,  287,  110.0,  286,  0.952],
      cut2: [250,  949,  264,  254,  106.5,  253,  0.93],
      cut3: [516,  949,  238,  255,  84.8,  254,  1.0],
      bowled: [756,  949,  215,  238,  107.5,  237,  1.0],
    },
  },
};
// looks.js SKIN index (0 lightest .. 5 darkest) -> sheet
const TONE_OF_SKIN = { thunder: ['fair', 'fair2', 'tan', 'brown', 'brown', 'dark'] };
const toneKey = (team, skin) => {
  const list = TONE_OF_SKIN[team];
  return list ? `${team}-${list[Math.max(0, Math.min(list.length - 1, skin ?? 2))]}` : null;
};
const framesOf = key => { const [team, tone] = key.split('-'); return TONES[team]?.[tone] || FRAMES; };

// frame, ms on screen. The swing starts when the finger lifts, which is the moment of contact,
// so the downswing is brief and the contact frame lands almost at once.
const SEQ = {
  drive: [['drive1', 45], ['drive2', 120], ['drive3', Infinity]],
  pull: [['pull0', 35], ['pull1', 45], ['pull2', 110], ['pull3', Infinity]],
  cut: [['cut1', 45], ['cut2', 120], ['cut3', Infinity]],
  block: [['def1', 60], ['def2', 220], ['def3', Infinity]],
  leave: [['leave1', 170], ['leave2', Infinity]],
  bowled: [['bowled', Infinity]], // beaten: looking back at the stumps
};
const BLEND_MS = 40;

// which animation a swipe plays: straight and cover drives, pulls to leg, cuts to off
export function shotAnim(shot) {
  if (!shot) return 'drive';
  if (shot.kind === 'block') return 'block';
  if (shot.kind === 'leave') return 'leave';
  if (shot.angle < -0.55) return 'pull';
  if (shot.angle > 0.95) return 'cut';
  return 'drive';
}

const atlases = new Map(); // team id -> { img, ready }

// start loading the sheets for the teams in this match (others stay unloaded)
export function loadBatSprites(...teamIds) {
  // a team drawn in skin tones loads its tone sheets too (the repaintable sheet stays as a fallback)
  teamIds = teamIds.flatMap(id => [id, ...[...new Set(TONE_OF_SKIN[id] || [])].map(t => `${id}-${t}`)]);
  for (const id of teamIds) {
    if (!id || atlases.has(id)) continue;
    if (!id.includes('-')) loadPeopleMask(`batter-${id}`);
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
  const a = atlases.get(teamId);
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
  if (b.anim === 'celebrate') return { f: 'drive3' };
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

function drawOne(ctx, img, name, px, py, k, alpha, frames = FRAMES) {
  const [sx, sy, w, h, ax, ay, s] = frames[name];
  const sc = k * s;
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, sx, sy, w, h, px - ax * sc, py - ay * sc, w * sc, h * sc);
}

// Draw at the projected feet position (px, py); kPerM is pixels per metre at that depth.
export function drawBatSprite(ctx, px, py, kPerM, b, now, opts = {}) {
  // his own skin tone, drawn, when the team has one; otherwise the team sheet repainted
  const tk = toneKey(b.team, b.people?.skin);
  const drawn = tk && atlases.get(tk);
  const atlas = drawn?.ready ? drawn : atlases.get(b.team);
  if (!atlas || !atlas.ready) return false;
  const frames = atlas === drawn ? framesOf(tk) : FRAMES;
  const img = atlas === drawn ? atlas.img : peopleSheet(atlas.img, `batter-${b.team}`, b.people); // the batter's own skin and hair
  const k = kPerM * REF_HEIGHT_M / REF_HEIGHT_PX;
  const { f, prev, a = 1 } = batFrame(b, now);
  ctx.save();
  // ground shadow
  ctx.fillStyle = 'rgba(10,8,20,0.28)';
  ctx.beginPath(); ctx.ellipse(px, py, 0.55 * kPerM, 0.12 * kPerM, 0, 0, Math.PI * 2); ctx.fill();
  if (opts.glow) { ctx.shadowColor = opts.glow; ctx.shadowBlur = 22; }
  // the previous frame fades out underneath, which reads as motion blur on a fast swing
  if (prev && a < 1) drawOne(ctx, img, prev, px, py, k, (1 - a) * 0.6, frames);
  drawOne(ctx, img, f, px, py, k, 1, frames);
  ctx.restore();
  return true;
}
