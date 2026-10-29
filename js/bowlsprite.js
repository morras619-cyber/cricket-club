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
export const BAT_FRONT = {
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
// shot frames the drawn front view lacks: the nearest it has
for (const [n, to] of Object.entries({ cut4: 'cut3', rsweep1: 'cut1', rsweep2: 'cut2', rsweep3: 'cut3', cover1: 'drive2', straight1: 'drive2', straight2: 'drive3', ondrive1: 'drive2', ondrive2: 'drive3',
  cover0: 'drive2', cover2: 'drive2', cover3: 'drive3', cutflat: 'cut2', loft1: 'drive3', straight3: 'drive3' })) BAT_FRONT[n] = BAT_FRONT[to];
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

// the other clubs' spinners from behind, each drawn in his own kit
// name: [x, y, w, h, anchorX, anchorY (feet), scale]
const SPIN_BACKS = {
  thunder: SPIN_BACK,
  cyclones: {
    start: [0,  0,  200,  436,  99.5,  435,  1.0],
    run1: [202,  0,  175,  428,  81.0,  427,  1.0],
    run2: [379,  0,  191,  427,  82.5,  426,  1.0],
    gather: [572,  0,  164,  431,  121.5,  430,  1.0],
    coil: [738,  0,  150,  441,  94.0,  440,  1.0],
    release: [0,  443,  188,  443,  75.5,  442,  1.0],
    follow1: [190,  443,  262,  371,  116.5,  370,  1.0],
    follow2: [454,  443,  297,  372,  154.5,  371,  1.0],
    follow3: [753,  443,  183,  422,  88.0,  421,  1.0],
    finish: [0,  888,  196,  427,  97.5,  426,  1.0],
  },
  vipers: {
    start: [0,  0,  205,  435,  102.0,  434,  1.0],
    run1: [207,  0,  174,  426,  81.5,  425,  1.0],
    run2: [383,  0,  193,  425,  83.0,  424,  1.0],
    gather: [578,  0,  161,  430,  119.5,  429,  1.0],
    coil: [741,  0,  150,  439,  94.0,  438,  1.0],
    release: [0,  441,  190,  445,  76.0,  444,  1.0],
    follow1: [192,  441,  261,  371,  117.0,  370,  1.0],
    follow2: [455,  441,  298,  372,  155.0,  371,  1.0],
    follow3: [755,  441,  184,  423,  88.0,  422,  1.0],
    finish: [0,  888,  196,  427,  97.5,  426,  1.0],
  },
  eagles: {
    start: [0,  0,  206,  435,  102.5,  434,  1.0],
    run1: [208,  0,  175,  426,  81.5,  425,  1.0],
    run2: [385,  0,  193,  426,  82.0,  425,  1.0],
    gather: [580,  0,  163,  430,  121.0,  429,  1.0],
    coil: [745,  0,  149,  440,  94.0,  439,  1.0],
    release: [0,  442,  191,  445,  74.5,  444,  1.0],
    follow1: [193,  442,  264,  372,  118.5,  371,  1.0],
    follow2: [459,  442,  300,  372,  158.0,  371,  1.0],
    follow3: [761,  442,  186,  424,  90.0,  423,  1.0],
    finish: [0,  889,  196,  427,  97.5,  426,  1.0],
  },
  phoenix: {
    start: [0,  0,  206,  436,  102.5,  435,  1.0],
    run1: [208,  0,  175,  428,  80.5,  427,  1.0],
    run2: [385,  0,  194,  427,  80.5,  426,  1.0],
    gather: [581,  0,  164,  430,  120.0,  429,  1.0],
    coil: [747,  0,  149,  440,  93.5,  439,  1.0],
    release: [0,  442,  189,  445,  74.5,  444,  1.0],
    follow1: [191,  442,  262,  370,  116.5,  369,  1.0],
    follow2: [455,  442,  294,  371,  153.0,  370,  1.0],
    follow3: [751,  442,  186,  424,  89.5,  423,  1.0],
    finish: [0,  889,  194,  426,  96.5,  425,  1.0],
  },
  titans: {
    start: [0,  0,  207,  435,  103.0,  434,  1.0],
    run1: [209,  0,  175,  426,  82.0,  425,  1.0],
    run2: [386,  0,  193,  425,  81.5,  424,  1.0],
    gather: [581,  0,  163,  429,  120.5,  428,  1.0],
    coil: [746,  0,  149,  439,  94.0,  438,  1.0],
    release: [0,  441,  192,  445,  75.5,  444,  1.0],
    follow1: [194,  441,  263,  371,  118.5,  370,  1.0],
    follow2: [459,  441,  298,  372,  156.5,  371,  1.0],
    follow3: [759,  441,  185,  424,  90.0,  423,  1.0],
    finish: [0,  888,  196,  426,  97.5,  425,  1.0],
  },
  storm: {
    start: [0,  0,  206,  436,  102.5,  435,  1.0],
    run1: [208,  0,  175,  427,  81.5,  426,  1.0],
    run2: [385,  0,  193,  429,  82.0,  428,  1.0],
    gather: [580,  0,  166,  431,  124.0,  430,  1.0],
    coil: [748,  0,  149,  440,  95.0,  439,  1.0],
    release: [0,  442,  191,  445,  76.0,  444,  1.0],
    follow1: [193,  442,  262,  371,  117.0,  370,  1.0],
    follow2: [457,  442,  299,  372,  157.0,  371,  1.0],
    follow3: [758,  442,  185,  423,  87.5,  422,  1.0],
    finish: [0,  889,  197,  427,  98.0,  426,  1.0],
  },
  royals: {
    start: [0,  0,  202,  435,  100.5,  434,  1.0],
    run1: [204,  0,  172,  423,  80.0,  422,  1.0],
    run2: [378,  0,  191,  426,  79.5,  425,  1.0],
    gather: [571,  0,  156,  430,  120.0,  429,  1.0],
    coil: [729,  0,  146,  438,  91.0,  437,  1.0],
    release: [0,  440,  187,  441,  76.0,  440,  1.0],
    follow1: [189,  440,  260,  370,  113.5,  369,  1.0],
    follow2: [451,  440,  294,  370,  152.5,  369,  1.0],
    follow3: [747,  440,  181,  421,  86.0,  420,  1.0],
    finish: [0,  883,  194,  426,  96.5,  425,  1.0],
  },
};

// your partner at the bowler's end (tools/build_nonstriker.py): front view, backing up as the
// bowler runs in. name: [x, y, w, h, anchorX, anchorY (feet), scale]
const NONSTRIKER = {
  ns1: [0,  0,  284,  431,  134.5,  429,  1.0],
  ns2: [286,  0,  286,  404,  141.5,  402,  1.0],
  ns3: [574,  0,  274,  409,  138.5,  407,  1.0],
  ns4: [0,  433,  271,  408,  133.5,  406,  1.0],
  ns5: [273,  433,  279,  408,  124.0,  406,  1.0],
  ns6: [554,  433,  300,  403,  147.5,  402,  1.0],
  ns7: [0,  843,  237,  405,  105.8,  403,  1.0],
  ns8: [239,  843,  273,  407,  132.8,  405,  1.0],
  ns9: [514,  843,  268,  403,  118.8,  401,  1.0],
  ns10: [0,  1252,  270,  427,  131.0,  425,  1.0],
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
  nonstriker: { src: 'img/nonstriker.webp', frames: NONSTRIKER, refPx: NONSTRIKER.ns1[5] },
  batfront: { src: 'img/batter-front.webp', frames: BAT_FRONT, refPx: Math.round(291 * 1.081 * 1.85 / 1.72) },
};
for (const [id, frames] of Object.entries(BACK)) {
  VIEWS['back-' + id] = { src: `img/bowler-back-${id}.webp`, frames, refPx: frames.start[5], own: true };
}
for (const [id, frames] of Object.entries(SPIN_BACKS)) {
  VIEWS['spin-back-' + id] = { src: `img/spinner-back-${id}.webp`, frames, refPx: frames.start[5], own: true };
}
const RUN_CYCLE = ['run1', 'run2', 'run3', 'run2'];
const SPIN_CYCLE = ['run1', 'run2'];
// after release (ms of game time): release, follow-through, then he stands and watches
const DELIVERY = [['release', 90], ['follow1', 120], ['follow2', 140], ['follow3', 170], ['finish', Infinity]];
// a spinner, drawn from the fast bowler's sheets: an easier stride and an unhurried follow-through
const SPIN_DELIVERY = [['release', 90], ['follow1', 200], ['follow2', 240], ['follow3', 280], ['finish', Infinity]];

import { softShadow } from './light.js';
import { peopleSheet, peopleFrame, loadPeopleMask, hairHex, skinHex } from './looks.js';
import { loadKitSprites, drawKitSprite } from './kitsprite.js';
import { PACE_STEPS } from './squads.js';
import { loadHair, hairReady, piecesOf, piecesKey, headsOf, dressSheet } from './hair.js';
import { KIT_LOGOS } from './kitlogos.js';
import { sheetOf, logoSrc } from './teams.js';
import { buildOf } from './builds.js';
const tinted = new Map();

// club crests for the shirts and helmets (the front sheets have a blank badge spot for them)
const crests = new Map();
function crestOf(id) {
  const src = logoSrc(id);
  let c = crests.get(src);
  if (!c) {
    c = new Image();
    c.src = src;
    crests.set(src, c);
  }
  return c.complete && c.naturalWidth ? c : null;
}
const CREST_SCALE = 1.1; // the crest a little bigger than the bolt it replaces

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
export function loadBowlSprites(...ids) {
  const teamIds = ids.map(t => t && sheetOf(t));
  for (const key of ['front', 'spin-front', 'spin-back', 'batfront', 'nonstriker', 'keeper-back', 'keeper-front', 'field-top', 'field-front', ...teamIds.flatMap(id => ['back-' + id, 'spin-back-' + id])]) {
    const v = VIEWS[key];
    if (/^(front|batfront|nonstriker|spin-|back-|field-)/.test(key)) loadPeopleMask(key); // where the players' skin and hair are
    if (!v || v.ready || (v.img && !v.failed)) continue;
    loadView(v);
  }
  for (const id of ids) if (id) crestOf(id); // (a national side wears its own crest)
  loadHair();
  loadKitSprites(...ids);
  if (teamIds.length >= 2) {
    for (const [key, c] of tinted) {
      if ([...teamIds, ...ids].some(id => id && key.replace('+crest', '').endsWith(id))) continue;
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
      if (view.startsWith('spin') && KIT_VIEW[view] === view.slice(5)) {
        // the fast bowler's frames at about a third of his stride rate: a few easy, walking-pace strides
        if (view === 'spin-back') return spr.p < 0.72 ? RUN_CYCLE[Math.floor(spr.p * 5) % 4] : spr.p < 0.82 ? 'gather' : spr.p < 0.92 ? 'coil' : 'frontarm';
        return spr.p < 0.78 ? RUN_CYCLE[Math.floor(spr.p * 5) % 4] : spr.p < 0.9 ? 'gather' : 'coil';
      }
      if (view.startsWith('spin')) return spr.p < 0.7 ? SPIN_CYCLE[Math.floor(spr.p * 4) % 2] : spr.p < 0.85 ? 'gather' : 'coil';
      if (view === 'back') return spr.p < 0.74 ? RUN_CYCLE[Math.floor(spr.p * PACE_STEPS) % 4] : spr.p < 0.83 ? 'gather' : spr.p < 0.92 ? 'coil' : 'frontarm';
      return spr.p < 0.8 ? RUN_CYCLE[Math.floor(spr.p * PACE_STEPS) % 4] : spr.p < 0.9 ? 'gather' : 'coil';
    case 'deliver': {
      let t = (gameTime - spr.t0) * 1000;
      for (const [f, ms] of view.startsWith('spin') ? SPIN_DELIVERY : DELIVERY) { if (t < ms) return f; t -= ms; }
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

// the sheet repainted in a team's kit: blue suit -> suit colour, yellow trim -> trim colour, shading
// kept, and the club's crest on the chest and helmet (front views)
function sheetFor(view, team) {
  const atlas = VIEWS[view].img;
  const spots = KIT_LOGOS[view];
  if (VIEWS[view].own || !team) return atlas;
  const same = team.suit === SHEET.suit && team.trim === SHEET.trim;
  if (same && !spots) return atlas;
  const crest = spots ? crestOf(team.id) : null;
  const key = view + team.id + team.suit + team.trim + (crest ? '+crest' + crest.src.length + crest.src.slice(-12) : '');
  if (tinted.has(key)) return tinted.get(key);
  const plainKey = view + team.id + team.suit + team.trim; // the copy made before the crest had loaded is no longer needed
  if (crest && tinted.has(plainKey)) { const old = tinted.get(plainKey); if (old instanceof HTMLCanvasElement) { old.width = 0; old.height = 0; } tinted.delete(plainKey); }
  const c = document.createElement('canvas');
  c.width = atlas.naturalWidth; c.height = atlas.naturalHeight;
  const g = c.getContext('2d', { willReadFrequently: true });
  // out of canvas memory (iPhones cap it): draw the sheet in its own colours rather than nothing
  if (!g) { c.width = 0; c.height = 0; tinted.set(key, atlas); return atlas; }
  try { g.drawImage(atlas, 0, 0); } catch { tinted.set(key, atlas); return atlas; }
  const img = g.getImageData(0, 0, c.width, c.height), p = img.data;
  const suit = hexHsv(team.suit), trim = hexHsv(team.trim), rs = hexHsv(SHEET.suit), rt = hexHsv(SHEET.trim);
  // where the shirt is, and how light (the crest is shaded with the folds and kept behind arms)
  const shirt = crest ? new Float32Array(c.width * c.height) : null;
  for (let i = 0, q = 0; i < p.length; i += 4, q++) {
    if (p[i + 3] < 8) continue;
    const [h, s, v] = hsv(p[i], p[i + 1], p[i + 2]);
    let to, ref;
    if (h > 200 && h < 250 && s > 0.4) { to = suit; ref = rs; if (shirt) shirt[q] = v / rs[2]; }
    else if (h > 38 && h < 62 && s > 0.62 && v > 0.45) { to = trim; ref = rt; }
    else continue;
    if (same) continue;
    const out = rgb(to[0], Math.min(1, to[1] * (s / ref[1])), Math.min(1, to[2] * (v / ref[2])));
    p[i] = out[0]; p[i + 1] = out[1]; p[i + 2] = out[2];
  }
  if (crest) for (const spot of spots) stampCrest(p, shirt, c.width, c.height, crest, spot);
  g.putImageData(img, 0, 0);
  c.crest = !!crest;
  tinted.set(key, c);
  return c;
}

// one crest onto the sheet's pixels, only where there's shirt (so an arm in front hides it),
// darkened in the folds and lifted on the highlights like the cloth around it
const stamp = typeof document !== 'undefined' ? document.createElement('canvas') : null;
const sil = typeof document !== 'undefined' ? document.createElement('canvas') : null;
function stampCrest(p, shirt, W, H, crest, [cx, cy, size, squash = 1]) {
  const cw = Math.max(2, Math.round(size * CREST_SCALE)), ch = Math.max(2, Math.round(size * CREST_SCALE * squash));
  const o = Math.max(1, Math.round(cw / 24)); // a thin dark rim, so a pink crown still reads on a pink shirt
  const w = cw + 2 * o, h = ch + 2 * o;
  stamp.width = w; stamp.height = h; sil.width = w; sil.height = h;
  const g = stamp.getContext('2d', { willReadFrequently: true }), gs = sil.getContext('2d');
  if (!g || !gs) return;
  gs.drawImage(crest, o, o, cw, ch);
  gs.globalCompositeOperation = 'source-in';
  gs.fillStyle = 'rgba(12,10,24,0.85)'; gs.fillRect(0, 0, w, h);
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]]) g.drawImage(sil, dx * o, dy * o);
  g.drawImage(crest, o, o, cw, ch);
  const d = g.getImageData(0, 0, w, h).data;
  const x0 = Math.round(cx - w / 2), y0 = Math.round(cy - h / 2);
  for (let y = 0; y < h; y++) {
    const sy = y0 + y;
    if (sy < 0 || sy >= H) continue;
    for (let x = 0; x < w; x++) {
      const sx = x0 + x;
      if (sx < 0 || sx >= W) continue;
      const q = sy * W + sx, light = shirt[q];
      const a = d[(y * w + x) * 4 + 3] / 255;
      if (!light || !a) continue;
      const f = Math.min(1.12, Math.max(0.55, light)), i = q * 4, j = (y * w + x) * 4;
      for (let k = 0; k < 3; k++) p[i + k] = p[i + k] * (1 - a) + Math.min(255, d[j + k] * f) * a;
    }
  }
}

// the player's haircut, beard and headwear drawn onto the repainted sheet (hair.js)
// (not the batters: their helmets hide it)
function dressFor(view, v, look) {
  if (view === 'batfront' || view === 'nonstriker') return null;
  const pieces = look && piecesOf(look, look.seed || '');
  const facing = /^(front|spin-front)/.test(view) ? 'front' : 'back';
  if (!pieces || !hairReady(facing)) return null; // (drawn as soon as the pieces have loaded)
  return {
    key: piecesKey(pieces), bald: pieces.hair === 'bald',
    fn: (g, m, p, w) => dressSheet(g, pieces, headsOf(view, m, p, w, v.frames, v.refPx), facing, hairHex(look), skinHex(look)),
  };
}

// the bowler views drawn from the plain-kit sheets (kitsprite.js)
// (spinners wear the fast bowler's sheets too: one art style and finish for every bowler)
const KIT_VIEW = { front: 'front', 'spin-front': 'front', back: 'back', 'spin-back': 'back' };

// Draw a frame with its feet at (px, py); kPerM is pixels per metre at that depth. False until loaded.
// look: the player's skin and hair (looks.js), repainted onto the drawn sheet
export function drawBowlSprite(ctx, px, py, kPerM, frame, team, flip = false, view = 'front', look = null) {
  // a named bowler: the plain-kit sheets (his own skin, hair, crest, name and number), once loaded
  const kit = KIT_VIEW[view];
  if (kit && look?.who && drawKitSprite(ctx, px, py, kPerM, frame, team, flip, kit, look)) return true;
  // a club's own spinner sheet when it has loaded (the Thunder one, repainted, until then)
  if (view === 'spin-back' && team && VIEWS['spin-back-' + sheetOf(team.id)]?.ready) view = 'spin-back-' + sheetOf(team.id);
  // a spinner frame the spin sheets don't have, or a spin sheet still loading, comes from the
  // pace bowler's sheet (mapping the spinner's frame names onto his)
  if (view.startsWith('spin') && (!VIEWS[view]?.ready || !VIEWS[view].frames[frame])) {
    view = view.slice(5);
    if (view === 'back' && frame === 'coil') frame = 'frontarm';
  }
  if (view === 'back') view = 'back-' + (team ? sheetOf(team.id) : 'thunder');
  const v = VIEWS[view];
  if (!v || !v.ready || !v.frames[frame]) return false;
  const sheet = sheetFor(view, team);
  const img = peopleSheet(sheet, `${view}-${team?.id}${sheet.crest ? '+crest' : ''}`, look, view, v.img, dressFor(view, v, look)); // skin and hair, from the plain sheet's mask
  const [sx, sy, w, h, ax, ay, s] = v.frames[frame];
  const [bh, bw] = buildOf(look), k = kPerM * REF_HEIGHT_M / v.refPx * s * bh, kx = k * bw; // his own build
  ctx.save();
  softShadow(ctx, px, py, 0.5 * kPerM * bw, 0.11 * kPerM, 0.26);
  ctx.translate(px, py);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(img, sx, sy, w, h, -ax * kx, -ay * k, w * kx, h * k);
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
  softShadow(ctx, px, py, (frame.startsWith('dive') ? 1.1 : 0.55) * kPerM, 0.12 * kPerM, 0.26);
  ctx.translate(px, py - lift * kPerM);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(img, sx, sy, w, h, -ax * k, -ay * k, w * k, h * k);
  ctx.restore();
  return true;
}

// An Outfield Mode player centred at (px, py), sizePx tall, drawn upright as on the sheet.
// view 'top' looks up the screen (back to the camera), 'front' looks down it (face visible).
// look: the player's skin and hair (only this pose is repainted, so a whole team can be on screen)
export function drawTopSprite(ctx, px, py, sizePx, frame, team, view = 'top', flip = false, look = null) {
  const key = 'field-' + view, v = VIEWS[key];
  if (!v || !v.ready) return false;
  let img = sheetFor(key, team);
  let [sx, sy, w, h, cx, cy] = v.frames[frame];
  const own = look && peopleFrame(img, `${key}-${team?.id}`, look, [sx, sy, w, h], key, v.img);
  if (own) { img = own; sx = 0; sy = 0; }
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
