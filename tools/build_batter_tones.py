#!/usr/bin/env python3
"""Cut a team's batter sheets drawn in different skin tones, one atlas each.

usage: python3 tools/build_batter_tones.py OUT_DIR team_id name=sheet.png [name=sheet.png ...]

Each sheet is the usual 19-pose labelled batting layout (1536x1024, transparent background).
Unlike build_batter_sprites.py, every sheet is cut with its own outlines, because the skin-tone
sheets are drawn separately and the poses differ a little (one may even stand differently).
Writes OUT_DIR/batter-<team>-<name>.webp and prints a frame table per sheet for js/batsprite.js.
Needs numpy, scipy and Pillow.
"""
import sys, json
from PIL import Image
from build_batter_sprites import USE, reference, cut, anchors


def main():
    out_dir, team, *specs = sys.argv[1:]
    tables = {}
    for spec in specs:
        name, path = spec.split('=', 1)
        frames, labels = reference(path)
        imgs = cut(path, frames, labels, 0)
        pad, W, x, y, rowh, table = 2, 1024, 0, 0, 0, {}
        for f in USE.values():
            w, h = imgs[f].size
            if x + w > W:
                x, y, rowh = 0, y + rowh + pad, 0
            table[f] = [x, y, w, h, *anchors(imgs[f])]
            x += w + pad
            rowh = max(rowh, h)
        atlas = Image.new('RGBA', (W, y + rowh), (0, 0, 0, 0))
        for f, im in imgs.items():
            atlas.alpha_composite(im, tuple(table[f][:2]))
        atlas.save(f'{out_dir}/batter-{team}-{name}.webp', quality=88, method=6)
        tables[name] = table
    print(json.dumps(tables))


if __name__ == '__main__':
    main()
