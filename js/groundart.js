// Painted grounds: sizes and measurements of the pieces in img/ground/<club>/, in their own
// pixels. Made by tools/build_ground_art.py; clubs not listed are painted by scene.js.
export const GROUND_ART = {
 "thunder": {
  "views": {"bat": {"f": 1600, "w": 2400, "h": 1536, "above": 480, "top": "#011a61", "bottom": "#33a01c", "board": {"r": 63.8, "h": 0.95}, "roof": {"r": 81, "h": 19}}, "bowl": {"f": 2400, "w": 2400, "h": 1536, "above": 576, "top": "#31589b", "bottom": "#2e9b1c", "board": {"r": 63.8, "h": 0.95}, "roof": {"r": 81, "h": 19}}, "keeper": {"f": 1200, "w": 2520, "h": 1704, "above": 480, "top": "#0b1d56", "bottom": "#339f1c", "board": {"r": 63.8, "h": 0.95}, "roof": {"r": 81, "h": 19}}},
  "far": {
   "w": 2172,
   "h": 452,
   "board": [
    402,
    452
   ],
   "screen": [
    853,
    231,
    1323,
    395
   ]
  },
  "near": {
   "w": 2172,
   "h": 463,
   "board": [
    413,
    463
   ]
  },
  "stumps": {
   "w": 136,
   "h": 400,
   "wood": 391,
   "foot": 67.5
  },
  "broken": [
   [
    0,
    0,
    212,
    480,
    101.0
   ],
   [
    214,
    0,
    286,
    475,
    166.5
   ],
   [
    502,
    0,
    365,
    490,
    191.0
   ],
   [
    869,
    0,
    317,
    426,
    141.0
   ]
  ]
 }
};
