"""Draws the Android launcher icons and splash screens from img/logo-sixcharge.webp onto the game's navy (#101632).
Writes android/app/src/main/res/mipmap-*/ic_launcher*.png and drawable*/splash.png (same sizes as the files Capacitor generated). Run from the repo root."""
import glob, os
from PIL import Image, ImageDraw
BG = (16, 22, 50, 255)
logo = Image.open('img/logo-sixcharge.webp').convert('RGBA')
RES = 'android/app/src/main/res'

def fit(w):  # the logo scaled to width w
    return logo.resize((w, round(w * logo.height / logo.width)), Image.LANCZOS)

def paste_center(canvas, im):
    canvas.alpha_composite(im, ((canvas.width - im.width) // 2, (canvas.height - im.height) // 2))
    return canvas

for d, px in {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}.items():
    out = f'{RES}/mipmap-{d}'
    fgs = px * 108 // 48                                        # adaptive layers are 108 dp: 2.25 x the legacy size
    fg = paste_center(Image.new('RGBA', (fgs, fgs), (0, 0, 0, 0)), fit(round(fgs * 0.60)))   # (inside the 66% safe zone)
    fg.save(f'{out}/ic_launcher_foreground.png')
    sq = paste_center(Image.new('RGBA', (px, px), BG), fit(round(px * 0.82)))
    m = Image.new('L', (px, px), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, px - 1, px - 1), radius=px * 0.18, fill=255)
    sq.putalpha(m); sq.save(f'{out}/ic_launcher.png')
    rd = paste_center(Image.new('RGBA', (px, px), BG), fit(round(px * 0.70)))
    m = Image.new('L', (px, px), 0); ImageDraw.Draw(m).ellipse((0, 0, px - 1, px - 1), fill=255)
    rd.putalpha(m); rd.save(f'{out}/ic_launcher_round.png')

for f in glob.glob(f'{RES}/drawable*/splash.png'):
    w, h = Image.open(f).size
    paste_center(Image.new('RGBA', (w, h), BG), fit(round(min(w, h) * 0.62))).convert('RGB').save(f)

open(f'{RES}/drawable/ic_launcher_background.xml', 'w').write('''<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108">
    <path android:fillColor="#101632" android:pathData="M0,0h108v108h-108z" />
</vector>
''')
print('icons and splash written')
