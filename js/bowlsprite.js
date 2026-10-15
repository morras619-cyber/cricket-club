// Hand-drawn bowler and fielders: the front view faces the batting camera, the back view
// is seen from the bowling camera. Both sheets are in the blue/yellow kit (cut by
// tools/build_bowler_sprites.py) and repainted at load to the fielding team's colours.

const REF_HEIGHT_M = 1.85;  // the "start" stance, head to feet
const SHEET = { suit: '#1f5fd6', trim: '#ffd23f' };

// name: [x, y, w, h, anchorX, anchorY (feet), scale]
const FRONT = {
  start: [0, 0, 149, 324, 74.0, 323, 1.0],
  run1: [151, 0, 140, 304, 56.5, 303, 1.0],
  run2: [293, 0, 127, 280, 42.0, 279, 1.0],
  run3: [422, 0, 136, 301, 45.0, 300, 1.0],
  gather: [560, 0, 109, 307, 52.0, 306, 1.0],
  coil: [671, 0, 181, 333, 90.0, 332, 1.0],
  release: [0, 335, 175, 273, 105.0, 272, 1.12],
  follow1: [177, 335, 146, 243, 74.5, 242, 1.12],
  follow2: [325, 335, 147, 236, 123.5, 235, 1.12],
  follow3: [474, 335, 149, 255, 47.5, 254, 1.12],
  finish: [625, 335, 120, 280, 59.5, 279, 1.12],
  field: [747, 335, 262, 227, 130.5, 226, 1.0],
  react: [0, 617, 219, 233, 109.0, 232, 1.0],
  celebrate1: [221, 617, 179, 239, 88.0, 238, 1.0],
  celebrate2: [402, 617, 229, 266, 114.0, 265, 1.0],
};
// back view, one sheet per team (img/bowler-back-<team>.webp), each with its own cut
// name: [x, y, w, h, anchorX, anchorY (feet), scale]
const BACK = {
  thunder: {
    start: [0, 0, 137, 318, 68.0, 317, 1.0],
    run1: [139, 0, 128, 295, 55.0, 294, 1.0],
    run2: [269, 0, 125, 291, 77.5, 290, 1.0],
    run3: [396, 0, 128, 303, 47.5, 302, 1.0],
    gather: [526, 0, 142, 324, 110.5, 323, 1.0],
    coil: [670, 0, 171, 339, 130.0, 338, 1.0],
    frontarm: [0, 341, 211, 338, 101.5, 337, 1.0],
    release: [213, 341, 242, 280, 108.5, 279, 1.12],
    follow1: [457, 341, 156, 224, 88.5, 223, 1.12],
    follow2: [615, 341, 194, 235, 100.5, 234, 1.12],
    follow3: [811, 341, 133, 253, 60.5, 252, 1.12],
    finish: [0, 681, 141, 272, 82.0, 271, 1.12],
    field: [143, 681, 220, 240, 109.5, 239, 1.0],
    react: [365, 681, 208, 241, 103.5, 240, 1.0],
    celebrate1: [575, 681, 207, 239, 108.5, 238, 1.0],
    celebrate2: [784, 681, 201, 262, 102.0, 261, 1.0],
  },
  cyclones: {
    start: [0, 0, 141, 318, 70.0, 317, 1.0],
    run1: [143, 0, 129, 296, 59.5, 295, 1.0],
    run2: [274, 0, 124, 294, 79.0, 293, 1.0],
    run3: [400, 0, 133, 301, 53.0, 300, 1.0],
    gather: [535, 0, 144, 323, 113.5, 322, 1.0],
    coil: [681, 0, 174, 339, 132.0, 338, 1.0],
    frontarm: [0, 341, 208, 338, 100.0, 337, 1.0],
    release: [210, 341, 239, 281, 110.0, 280, 1.12],
    follow1: [451, 341, 157, 231, 91.0, 230, 1.12],
    follow2: [610, 341, 196, 241, 104.5, 240, 1.12],
    follow3: [808, 341, 133, 254, 60.5, 253, 1.12],
    finish: [0, 681, 141, 275, 86.0, 274, 1.12],
    field: [143, 681, 237, 241, 118.0, 240, 1.0],
    react: [382, 681, 238, 247, 118.5, 246, 1.0],
    celebrate1: [622, 681, 215, 232, 116.5, 231, 1.0],
    celebrate2: [0, 958, 223, 264, 111.0, 263, 1.0],
  },
  vipers: {
    start: [0, 0, 141, 316, 70.0, 315, 1.0],
    run1: [143, 0, 129, 297, 59.0, 296, 1.0],
    run2: [274, 0, 127, 293, 78.0, 292, 1.0],
    run3: [403, 0, 129, 305, 49.0, 304, 1.0],
    gather: [534, 0, 144, 320, 109.0, 319, 1.0],
    coil: [680, 0, 172, 338, 130.0, 337, 1.0],
    frontarm: [0, 340, 210, 337, 100.0, 336, 1.0],
    release: [212, 340, 242, 281, 109.0, 280, 1.12],
    follow1: [456, 340, 158, 228, 91.5, 227, 1.12],
    follow2: [616, 340, 195, 239, 106.5, 238, 1.12],
    follow3: [813, 340, 132, 252, 59.0, 251, 1.12],
    finish: [0, 679, 140, 275, 83.0, 274, 1.12],
    field: [142, 679, 228, 239, 113.5, 238, 1.0],
    react: [372, 679, 236, 239, 117.5, 238, 1.0],
    celebrate1: [610, 679, 210, 240, 110.0, 239, 1.0],
    celebrate2: [0, 956, 208, 261, 103.5, 260, 1.0],
  },
  eagles: {
    start: [0, 0, 143, 316, 71.0, 315, 1.0],
    run1: [145, 0, 128, 298, 57.0, 297, 1.0],
    run2: [275, 0, 127, 294, 78.0, 293, 1.0],
    run3: [404, 0, 132, 308, 50.5, 307, 1.0],
    gather: [538, 0, 142, 326, 109.5, 325, 1.0],
    coil: [682, 0, 173, 338, 131.0, 337, 1.0],
    frontarm: [0, 340, 211, 337, 100.5, 336, 1.0],
    release: [213, 340, 243, 283, 110.0, 282, 1.12],
    follow1: [458, 340, 159, 230, 92.0, 229, 1.12],
    follow2: [619, 340, 196, 238, 104.5, 237, 1.12],
    follow3: [817, 340, 133, 254, 60.0, 253, 1.12],
    finish: [0, 679, 142, 276, 85.0, 275, 1.12],
    field: [144, 679, 233, 244, 116.0, 243, 1.0],
    react: [379, 679, 243, 246, 121.0, 245, 1.0],
    celebrate1: [624, 679, 209, 240, 108.5, 239, 1.0],
    celebrate2: [0, 957, 213, 266, 106.0, 265, 1.0],
  },
  phoenix: {
    start: [0, 0, 142, 316, 70.5, 315, 1.0],
    run1: [144, 0, 130, 296, 59.5, 295, 1.0],
    run2: [276, 0, 127, 293, 79.0, 292, 1.0],
    run3: [405, 0, 130, 308, 51.0, 307, 1.0],
    gather: [537, 0, 145, 324, 109.5, 323, 1.0],
    coil: [684, 0, 174, 338, 131.5, 337, 1.0],
    frontarm: [0, 340, 211, 337, 100.0, 336, 1.0],
    release: [213, 340, 245, 281, 112.0, 280, 1.12],
    follow1: [460, 340, 157, 229, 92.0, 228, 1.12],
    follow2: [619, 340, 196, 237, 105.0, 236, 1.12],
    follow3: [817, 340, 132, 250, 59.0, 249, 1.12],
    finish: [0, 679, 141, 275, 84.5, 274, 1.12],
    field: [143, 679, 231, 242, 115.0, 241, 1.0],
    react: [376, 679, 240, 243, 119.5, 242, 1.0],
    celebrate1: [618, 679, 210, 240, 109.0, 239, 1.0],
    celebrate2: [0, 956, 212, 264, 105.5, 263, 1.0],
  },
  titans: {
    start: [0, 0, 142, 315, 70.5, 314, 1.0],
    run1: [144, 0, 129, 297, 58.5, 296, 1.0],
    run2: [275, 0, 129, 293, 79.5, 292, 1.0],
    run3: [406, 0, 132, 307, 50.5, 306, 1.0],
    gather: [540, 0, 143, 324, 110.5, 323, 1.0],
    coil: [685, 0, 172, 337, 130.5, 336, 1.0],
    frontarm: [0, 339, 212, 338, 101.0, 337, 1.0],
    release: [214, 339, 244, 281, 109.0, 280, 1.12],
    follow1: [460, 339, 158, 229, 91.0, 228, 1.12],
    follow2: [620, 339, 198, 237, 106.0, 236, 1.12],
    follow3: [820, 339, 132, 251, 59.5, 250, 1.12],
    finish: [0, 679, 141, 274, 84.0, 273, 1.12],
    field: [143, 679, 231, 242, 115.0, 241, 1.0],
    react: [376, 679, 240, 243, 119.5, 242, 1.0],
    celebrate1: [618, 679, 210, 241, 109.0, 240, 1.0],
    celebrate2: [0, 955, 209, 264, 104.0, 263, 1.0],
  },
  storm: {
    start: [0, 0, 146, 318, 72.5, 317, 1.0],
    run1: [148, 0, 129, 298, 59.0, 297, 1.0],
    run2: [279, 0, 127, 294, 79.0, 293, 1.0],
    run3: [408, 0, 133, 308, 53.0, 307, 1.0],
    gather: [543, 0, 144, 324, 111.5, 323, 1.0],
    coil: [689, 0, 176, 339, 133.5, 338, 1.0],
    frontarm: [0, 341, 210, 338, 100.0, 337, 1.0],
    release: [212, 341, 245, 283, 112.0, 282, 1.12],
    follow1: [459, 341, 161, 230, 96.0, 229, 1.12],
    follow2: [622, 341, 196, 240, 107.0, 239, 1.12],
    follow3: [820, 341, 134, 255, 60.5, 254, 1.12],
    finish: [0, 681, 143, 275, 85.5, 274, 1.12],
    field: [145, 681, 236, 244, 117.5, 243, 1.0],
    react: [383, 681, 243, 248, 121.0, 247, 1.0],
    celebrate1: [628, 681, 218, 233, 118.0, 232, 1.0],
    celebrate2: [0, 958, 221, 265, 110.0, 264, 1.0],
  },
  royals: {
    start: [0, 0, 145, 318, 72.0, 317, 1.0],
    run1: [147, 0, 130, 299, 59.0, 298, 1.0],
    run2: [279, 0, 129, 294, 79.5, 293, 1.0],
    run3: [410, 0, 132, 307, 51.0, 306, 1.0],
    gather: [544, 0, 143, 323, 109.5, 322, 1.0],
    coil: [689, 0, 177, 338, 136.5, 337, 1.0],
    frontarm: [0, 340, 210, 336, 100.5, 335, 1.0],
    release: [212, 340, 245, 283, 112.0, 282, 1.12],
    follow1: [459, 340, 159, 231, 94.5, 230, 1.12],
    follow2: [620, 340, 197, 239, 108.0, 238, 1.12],
    follow3: [819, 340, 134, 254, 60.5, 253, 1.12],
    finish: [0, 678, 145, 276, 87.5, 275, 1.12],
    field: [147, 678, 233, 243, 116.0, 242, 1.0],
    react: [382, 678, 242, 245, 120.5, 244, 1.0],
    celebrate1: [626, 678, 212, 241, 110.5, 240, 1.0],
    celebrate2: [0, 956, 216, 266, 107.5, 265, 1.0],
  },
};
// the opposing batter seen from the bowling camera (tools/build_front_batter.py); same frame
// names as the back-view batter in batsprite.js, so batFrame() drives both
const BAT_FRONT = {
  ready: [0, 0, 126, 291, 65.0, 290, 1.081],
  leave1: [128, 0, 111, 291, 50.5, 290, 1.026],
  leave2: [241, 0, 113, 284, 52.5, 283, 1.053],
  backlift: [356, 0, 148, 314, 85.5, 313, 1.0],
  drive1: [506, 0, 173, 284, 52.5, 283, 1.026],
  drive2: [681, 0, 133, 282, 71.0, 281, 1.026],
  drive3: [816, 0, 157, 315, 69.2, 314, 0.909],
  pull0: [0, 317, 127, 280, 70.5, 279, 1.026],
  pull1: [129, 317, 175, 275, 61.2, 274, 1.053],
  pull2: [306, 317, 263, 272, 103.2, 271, 1.053],
  pull3: [571, 317, 159, 275, 45.2, 274, 0.9],
  def1: [732, 317, 108, 274, 61.8, 273, 1.081],
  def2: [842, 317, 133, 273, 65.8, 272, 1.1],
  def3: [0, 599, 181, 272, 89.0, 271, 1.026],
  cut1: [183, 599, 182, 268, 79.8, 267, 1.0],
  cut2: [367, 599, 268, 266, 158.2, 265, 1.026],
  cut3: [637, 599, 254, 265, 151.0, 264, 1.053],
  bowled: [0, 873, 170, 256, 88.5, 255, 1.1],
};
// wicket-keeper (tools/build_keeper_sprites.py): back view for keeper mode, front view seen
// from the bowling camera. name: [x, y, w, h, anchorX, anchorY, helmet width px]
const KEEPER_BACK = {
  ready: [0, 0, 246, 238, 122.5, 237, 49],
  rise: [248, 0, 244, 296, 121.5, 295, 49],
  waist: [494, 0, 251, 277, 125.0, 276, 49],
  high: [0, 298, 284, 327, 141.5, 326, 44],
  diveL: [286, 298, 577, 186, 288.5, 185, 51],
  diveR: [0, 627, 538, 191, 269.0, 190, 48],
  juggle: [540, 627, 301, 280, 150.0, 279, 49],
  stump: [0, 909, 394, 272, 147.5, 271, 51],
  celebrate: [396, 909, 329, 328, 146.5, 327, 47],
};
const KEEPER_FRONT = {
  ready: [0, 0, 276, 238, 137.5, 237, 48],
  rise: [278, 0, 269, 301, 134.0, 300, 49],
  waist: [549, 0, 269, 296, 134.0, 295, 47],
  high: [0, 303, 295, 326, 147.0, 325, 43],
  diveL: [297, 303, 583, 185, 291.5, 184, 49],
  diveR: [0, 631, 577, 184, 288.5, 183, 50],
  juggle: [579, 631, 320, 289, 159.5, 288, 50],
  stump: [0, 922, 399, 282, 159.5, 281, 52],
  celebrate: [401, 922, 357, 308, 178.5, 307, 52],
};
const HELMET_M = 0.24;  // helmet width in metres sets each keeper frame's scale

// Outfield Mode players seen from above (tools/build_field_sprites.py).
// name: [x, y, w, h, centreX, centreY, facing in degrees on the image (-90 = up)]
const FIELD_TOP = {
  ready: [0, 0, 197, 228, 98.5, 114.0, -90],
  run1: [199, 0, 165, 244, 82.5, 122.0, -90],
  run2: [366, 0, 147, 269, 73.5, 134.5, -90],
  run3: [515, 0, 176, 267, 88.0, 133.5, -90],
  dive: [0, 271, 352, 270, 176.0, 135.0, 145],
  catch1: [354, 271, 179, 240, 89.5, 120.0, -90],
  catch2: [535, 271, 187, 260, 93.5, 130.0, -90],
  throw1: [724, 271, 226, 229, 113.0, 114.5, -90],
  throw2: [0, 543, 218, 244, 109.0, 122.0, -90],
  throw3: [220, 543, 259, 269, 129.5, 134.5, -90],
  batA1: [481, 543, 224, 245, 112.0, 122.5, -90],
  batA2: [707, 543, 169, 256, 84.5, 128.0, -90],
  batB1: [0, 814, 179, 202, 89.5, 101.0, -90],
  batB2: [181, 814, 249, 275, 124.5, 137.5, -90],
};
// the same poses drawn facing the camera (faces visible), for players looking down the screen
const FIELD_FRONT = {
  ready: [0, 0, 225, 234, 112.5, 117.0, -90],
  run1: [227, 0, 168, 246, 84.0, 123.0, -90],
  run2: [397, 0, 151, 271, 75.5, 135.5, -90],
  run3: [550, 0, 170, 267, 85.0, 133.5, -90],
  dive: [0, 273, 368, 268, 184.0, 134.0, 145],
  catch1: [370, 273, 181, 241, 90.5, 120.5, -90],
  catch2: [553, 273, 190, 250, 95.0, 125.0, -90],
  throw1: [745, 273, 185, 228, 92.5, 114.0, -90],
  throw2: [0, 543, 232, 226, 116.0, 113.0, -90],
  throw3: [234, 543, 277, 249, 138.5, 124.5, -90],
  batA1: [513, 543, 213, 239, 106.5, 119.5, -90],
  batA2: [728, 543, 170, 250, 85.0, 125.0, -90],
  batB1: [0, 795, 167, 192, 83.5, 96.0, -90],
  batB2: [169, 795, 246, 222, 123.0, 111.0, -90],
};

// the spin bowler (tools/build_spinner_sprites.py): front and back views, shorter and more
// upright than the quick. Frames it lacks (fielding, reactions, celebrations) come from the pace sheets.
// name: [x, y, w, h, anchorX, anchorY (feet), scale]
const SPIN_FRONT = {
  start: [0,  0,  211,  436,  105.0,  435,  1.0],
  run1: [213,  0,  176,  417,  73.5,  416,  1.0],
  run2: [391,  0,  194,  427,  91.0,  426,  1.0],
  gather: [587,  0,  173,  443,  62.0,  442,  1.0],
  coil: [762,  0,  147,  442,  87.0,  441,  1.0],
  release: [0,  445,  166,  441,  115.0,  440,  1.0],
  follow1: [168,  445,  164,  384,  62.5,  383,  1.0],
  follow2: [334,  445,  192,  384,  62.5,  383,  1.0],
  follow3: [528,  445,  184,  424,  87.5,  423,  1.0],
  finish: [714,  445,  187,  426,  93.0,  425,  1.0],
};
const SPIN_BACK = {
  start: [0,  0,  187,  437,  93.0,  436,  1.0],
  run1: [189,  0,  171,  425,  66.0,  424,  1.0],
  run2: [362,  0,  192,  429,  86.5,  428,  1.0],
  gather: [556,  0,  176,  429,  114.0,  428,  1.0],
  coil: [734,  0,  152,  439,  95.5,  438,  1.0],
  release: [0,  441,  175,  439,  66.5,  438,  1.0],
  follow1: [177,  441,  235,  358,  101.5,  357,  1.0],
  follow2: [414,  441,  271,  350,  141.5,  349,  1.0],
  follow3: [687,  441,  171,  426,  82.5,  425,  1.0],
  finish: [0,  882,  181,  420,  90.0,  419,  1.0],
};

const VIEWS = {
  'field-top': { src: 'img/field-top.webp', frames: FIELD_TOP },
  'field-front': { src: 'img/field-front.webp', frames: FIELD_FRONT },
  'keeper-back': { src: 'img/keeper-back.webp', frames: KEEPER_BACK },
  'keeper-front': { src: 'img/keeper-front.webp', frames: KEEPER_FRONT },
  front: { src: 'img/bowler.webp', frames: FRONT, refPx: 323 },
  'spin-front': { src: 'img/spinner-front.webp', frames: SPIN_FRONT, refPx: SPIN_FRONT.start[5] },
  // drawn in the blue kit: other teams get it repainted in theirs
  'spin-back': { src: 'img/spinner-back-thunder.webp', frames: SPIN_BACK, refPx: SPIN_BACK.start[5] },
  // the ready stance is 1.72 m tall, as for the back-view batter
  batfront: { src: 'img/batter-front.webp', frames: BAT_FRONT, refPx: Math.round(291 * 1.081 * 1.85 / 1.72) },
};
for (const [id, frames] of Object.entries(BACK)) {
  VIEWS['back-' + id] = { src: `img/bowler-back-${id}.webp`, frames, refPx: frames.start[5], own: true };
}
const RUN_CYCLE = ['run1', 'run2', 'run3', 'run2'];
const SPIN_CYCLE = ['run1', 'run2'];
// after release (ms of game time): release, follow-through, then he stands and watches
const DELIVERY = [['release', 90], ['follow1', 120], ['follow2', 140], ['follow3', 170], ['finish', Infinity]];

import { peopleSheet, warmPeople } from './looks.js';
const tinted = new Map();

// Load one sheet. A failed download (a flaky connection, or a phone short of memory) is
// retried a few times rather than leaving the plain cartoon figures for the whole session.
function loadView(v, tries = 0) {
  v.img = new Image();
  v.failed = false;
  v.img.onload = () => { v.ready = true; v.failed = false; };
  v.img.onerror = () => {
    v.failed = true;
    if (tries < 4) setTimeout(() => { if (!v.ready) loadView(v, tries + 1); }, 800 * 2 ** tries);
  };
  v.img.src = v.src;
}

// the front sheets plus the back sheets of the teams in this match. Repainted copies for
// teams that aren't playing are thrown away, so memory doesn't pile up match after match.
export function loadBowlSprites(...teamIds) {
  for (const key of ['front', 'spin-front', 'spin-back', 'batfront', 'keeper-back', 'keeper-front', 'field-top', 'field-front', ...teamIds.map(id => 'back-' + id)]) {
    const v = VIEWS[key];
    if (!v || v.ready || (v.img && !v.failed)) continue;
    loadView(v);
  }
  if (teamIds.length >= 2) {
    for (const [key, c] of tinted) {
      if (teamIds.some(id => key.endsWith(id))) continue;
      if (c instanceof HTMLCanvasElement) { c.width = 0; c.height = 0; } // frees the memory now on iOS
      tinted.delete(key);
    }
  }
}

// What the sprite sheets are doing, for the pause screen: { ready, total, missing: [names] }
export function spriteStatus() {
  const used = Object.entries(VIEWS).filter(([, v]) => v.img);
  const missing = used.filter(([, v]) => !v.ready).map(([k, v]) => `${k}${v.failed ? ' (failed)' : ' (loading)'}`);
  return { ready: used.length - missing.length, total: used.length, missing, tinted: tinted.size };
}

// Which frame the bowler shows. spr: { anim: 'start'|'run'|'deliver'|'react'|'celebrate', p, t0 }
// The back view has a fuller load-up: gather, coil, then front arm up.
// Spinners ('spin-front' / 'spin-back') take a few walking strides, then gather and coil.
export function bowlFrame(spr, gameTime, realTime, view = 'front') {
  if (!spr) return 'start';
  switch (spr.anim) {
    case 'run':
      if (view.startsWith('spin')) return spr.p < 0.7 ? SPIN_CYCLE[Math.floor(spr.p * 8) % 2] : spr.p < 0.85 ? 'gather' : 'coil';
      if (view === 'back') return spr.p < 0.74 ? RUN_CYCLE[Math.floor(spr.p * 14) % 4] : spr.p < 0.83 ? 'gather' : spr.p < 0.92 ? 'coil' : 'frontarm';
      return spr.p < 0.8 ? RUN_CYCLE[Math.floor(spr.p * 14) % 4] : spr.p < 0.9 ? 'gather' : 'coil';
    case 'deliver': {
      let t = (gameTime - spr.t0) * 1000;
      for (const [f, ms] of DELIVERY) { if (t < ms) return f; t -= ms; }
      return 'finish';
    }
    case 'react': return 'react';
    case 'celebrate': return realTime - spr.t0 < 650 ? 'celebrate2' : 'celebrate1';
    default: return 'start';
  }
}

function hsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), d = mx - Math.min(r, g, b);
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, mx ? d / mx : 0, mx];
}
const hexHsv = hex => { const n = parseInt(hex.slice(1), 16); return hsv((n >> 16) & 255, (n >> 8) & 255, n & 255); };
function rgb(h, s, v) {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

// the sheet repainted in a team's kit: blue suit -> suit colour, yellow trim -> trim colour, shading kept
function sheetFor(view, team) {
  const atlas = VIEWS[view].img;
  if (VIEWS[view].own || !team || (team.suit === SHEET.suit && team.trim === SHEET.trim)) return atlas;
  const key = view + team.id;
  if (tinted.has(key)) return tinted.get(key);
  const c = document.createElement('canvas');
  c.width = atlas.naturalWidth; c.height = atlas.naturalHeight;
  const g = c.getContext('2d', { willReadFrequently: true });
  // out of canvas memory (iPhones cap it): draw the sheet in its own colours rather than nothing
  if (!g) { c.width = 0; c.height = 0; tinted.set(key, atlas); return atlas; }
  try { g.drawImage(atlas, 0, 0); } catch { tinted.set(key, atlas); return atlas; }
  const img = g.getImageData(0, 0, c.width, c.height), p = img.data;
  const suit = hexHsv(team.suit), trim = hexHsv(team.trim), rs = hexHsv(SHEET.suit), rt = hexHsv(SHEET.trim);
  for (let i = 0; i < p.length; i += 4) {
    if (p[i + 3] < 8) continue;
    const [h, s, v] = hsv(p[i], p[i + 1], p[i + 2]);
    let to, ref;
    if (h > 200 && h < 250 && s > 0.4) { to = suit; ref = rs; }
    else if (h > 38 && h < 62 && s > 0.62 && v > 0.45) { to = trim; ref = rt; }
    else continue;
    const out = rgb(to[0], Math.min(1, to[1] * (s / ref[1])), Math.min(1, to[2] * (v / ref[2])));
    p[i] = out[0]; p[i + 1] = out[1]; p[i + 2] = out[2];
  }
  g.putImageData(img, 0, 0);
  tinted.set(key, c);
  return c;
}

// Draw a frame with its feet at (px, py); kPerM is pixels per metre at that depth. False until loaded.
// look: the player's skin and hair (looks.js), repainted onto the drawn sheet
export function drawBowlSprite(ctx, px, py, kPerM, frame, team, flip = false, view = 'front', look = null) {
  // a spinner frame the spin sheets don't have, or a spin sheet still loading, comes from the
  // pace bowler's sheet (mapping the spinner's frame names onto his)
  if (view.startsWith('spin') && (!VIEWS[view]?.ready || !VIEWS[view].frames[frame])) {
    view = view.slice(5);
    if (view === 'back' && frame === 'coil') frame = 'frontarm';
  }
  if (view === 'back') view = 'back-' + (team?.id || 'thunder');
  const v = VIEWS[view];
  if (!v || !v.ready || !v.frames[frame]) return false;
  const img = peopleSheet(sheetFor(view, team), `${view}-${team?.id}`, look);
  const [sx, sy, w, h, ax, ay, s] = v.frames[frame];
  const k = kPerM * REF_HEIGHT_M / v.refPx * s;
  ctx.save();
  ctx.fillStyle = 'rgba(10,8,20,0.26)';
  ctx.beginPath(); ctx.ellipse(px, py, 0.5 * kPerM, 0.11 * kPerM, 0, 0, Math.PI * 2); ctx.fill();
  ctx.translate(px, py);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(img, sx, sy, w, h, -ax * k, -ay * k, w * k, h * k);
  ctx.restore();
  return true;
}

// The keeper, feet (or the lowest point of a dive) at (px, py). lift raises a dive off the
// ground, in metres. False until the sheet has loaded.
export function drawKeeperSprite(ctx, px, py, kPerM, frame, team, view, { flip = false, lift = 0 } = {}) {
  const key = 'keeper-' + view, v = VIEWS[key];
  if (!v || !v.ready) return false;
  const img = sheetFor(key, team);
  const [sx, sy, w, h, ax, ay, hw] = v.frames[frame];
  const k = kPerM * HELMET_M / hw;
  ctx.save();
  ctx.fillStyle = 'rgba(10,8,20,0.26)';
  ctx.beginPath(); ctx.ellipse(px, py, (frame.startsWith('dive') ? 1.1 : 0.55) * kPerM, 0.12 * kPerM, 0, 0, Math.PI * 2); ctx.fill();
  ctx.translate(px, py - lift * kPerM);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(img, sx, sy, w, h, -ax * k, -ay * k, w * k, h * k);
  ctx.restore();
  return true;
}

// An Outfield Mode player centred at (px, py), sizePx tall, drawn upright as on the sheet.
// view 'top' looks up the screen (back to the camera), 'front' looks down it (face visible).
export function drawTopSprite(ctx, px, py, sizePx, frame, team, view = 'top', flip = false) {
  const key = 'field-' + view, v = VIEWS[key];
  if (!v || !v.ready) return false;
  const img = sheetFor(key, team);
  const [sx, sy, w, h, cx, cy] = v.frames[frame];
  const k = sizePx / 240;
  ctx.save();
  ctx.translate(px, py);
  ctx.fillStyle = 'rgba(10,8,20,0.28)';
  ctx.beginPath(); ctx.ellipse(2, h * k * 0.42, sizePx * 0.3, sizePx * 0.1, 0, 0, Math.PI * 2); ctx.fill();
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(img, sx, sy, w, h, -cx * k, -cy * k, w * k, h * k);
  ctx.restore();
  return true;
}

// Prepare the skin-and-hair masks of the sheets a match will use (one per call: they're slow-ish).
export function bowlWarmJobs(myTeam, oppTeam) {
  const jobs = [];
  for (const [view, team] of [['front', oppTeam], ['spin-front', oppTeam], ['batfront', oppTeam], ['back', myTeam], ['spin-back', myTeam]]) {
    const key = view === 'back' ? 'back-' + (myTeam?.id || 'thunder') : view;
    jobs.push(() => { const v = VIEWS[key]; if (v?.ready) warmPeople(sheetFor(key, team), `${key}-${team?.id}`); });
  }
  return jobs;
}
