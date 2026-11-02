#!/usr/bin/env python3
"""Player cards: crop each painted card to its frame and save it as img/cards/<key>.webp, then
list the cards the game has in js/cards-list.js. The key is the player's name in lower case
with dashes (Aryan Malhotra -> aryan-malhotra).

usage: python3 tools/build_player_cards.py aryan-malhotra=CARD.png thunder-raja=CARD.png ...
Cards already in img/cards/ stay listed. Needs numpy and Pillow.
"""
import os
import sys
import numpy as np
from PIL import Image

for arg in sys.argv[1:]:
    key, path = arg.split('=', 1)
    im = Image.open(path).convert('RGBA')
    a = np.array(im)
    ys, xs = np.nonzero(a[..., 3] > 16)
    im = im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    im = im.resize((480, round(im.height * 480 / im.width)), Image.LANCZOS)
    im.save(f'img/cards/{key}.webp', 'WEBP', quality=88, method=6)
    print(key, im.size)

keys = sorted(f[:-5] for f in os.listdir('img/cards') if f.endswith('.webp'))
with open('js/cards-list.js', 'w') as f:
    f.write('// The players with a painted card (img/cards/<key>.webp). Made by tools/build_player_cards.py.\n')
    f.write('export const CARD_KEYS = [' + ', '.join(f"'{k}'" for k in keys) + '];\n')
