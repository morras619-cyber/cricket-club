#!/usr/bin/env python3
"""Puts the fitted head tables together: tools/kit/spin2-heads.json (sheet pixels).
front.hair / back.hair: the optimised tables (optimize.mjs: haircuts, caps), front.beard: the detected heads with 60% of their tilt
(a beard follows the jaw, which a leaning torso over-tilts), opts: how js/hair.js dressSheet places the pieces on this sheet.
usage: python3 masks.py && node optimize.mjs && python3 make_table.py   (from tools/kit/headfit)"""
import json
raw = json.load(open('out/heads-front.json'))
tbl = {'front': {'hair': json.load(open('out/heads-front-opt.json')), 'beard': [[h[0], h[1], h[2], round(h[3] * 0.6, 3)] for h in raw]},
       'back': {'hair': json.load(open('out/heads-back-opt.json'))},
       'opts': {'front': {'lift': -0.03, 'hairGrow': 1.06, 'beardLift': -0.03}, 'back': {'lift': -0.02, 'hairGrow': 1.06}}}
json.dump(tbl, open('../spin2-heads.json', 'w'), separators=(',', ':'))
print('written', {k: len(v['hair']) for k, v in tbl.items() if k != 'opts'})
