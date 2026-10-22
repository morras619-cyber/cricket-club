#!/usr/bin/env python3
"""The crowd's reaction to a four or a six (snd/boundary-cheer.wav): ONE continuous clip, so the build-up and the
roar can never be out of step. From two recordings, both 3 s and both stopped abruptly:
  tools/audio/src/boundary-part1.mp3   the build-up: near silence rising all the way to its end
  tools/audio/src/boundary-part2.mp3   the full cheer: it swells, holds, and is cut off at 3 s still at full strength
The build-up runs into the cheer through a crossfade, the cheer's steady part is carried on (folded over itself
with crossfades, so no repeat is heard) and faded out. The two are scaled together (one gain, then one soft
clip), so the join is the level they were recorded at. CUE is the moment in the clip where the ball clears the
rope: js/audio.js starts the clip CUE seconds before that moment (part-way in for a short flight, late for a
long one), so the roar arrives as the ball goes over.
usage: python3 tools/build_boundary_cheer.py   (needs ffmpeg, numpy, scipy)
"""
import os, subprocess, tempfile
import numpy as np
import scipy.io.wavfile as w

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'audio', 'src')
OUT = os.path.join(HERE, '..', 'snd', 'boundary-cheer.wav')
SR = 32000
XFADE = 0.35         # the build-up runs into the cheer over this long
CUE = 2.9            # where in the clip the ball clears the rope (as printed below)
EXTRA = 2.2          # seconds the cheer is carried on past the end of its recording
FADE = 1.8           # of which the last are the fade-out
TARGET = 0.40        # the cheer's steady level (rms, of a peak of 0.92): the roar you liked, loud


def load(name):
    tmp = os.path.join(tempfile.mkdtemp(), 'a.wav')
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', os.path.join(SRC, name), '-ar', str(SR), '-ac', '2', tmp], check=True)
    return w.read(tmp)[1].astype(np.float64) / 32768


def xfade_append(x, y, n):
    """y appended to x, the last n samples of x fading into the first n of y (equal power: they are noise)"""
    t = np.linspace(0, np.pi / 2, n)[:, None]
    return np.concatenate([x[:-n], x[-n:] * np.cos(t) + y[:n] * np.sin(t), y[n:]])


p1, p2 = load('boundary-part1.mp3'), load('boundary-part2.mp3')
xf = int(XFADE * SR)
clip = xfade_append(p1, p2, xf)                      # the build-up, into the cheer
join_end = len(p1)                                   # (the crossfade ends where the recording of the build-up did)

# the cheer carried on: its steady part, a different stretch each time so the repeat isn't heard
steady = p2[int(1.0 * SR):]
rng = np.random.default_rng(7)
want = len(clip) + int(EXTRA * SR)
while len(clip) < want:
    skip = int(rng.uniform(0, 0.3) * SR)
    clip = xfade_append(clip, steady[skip:], int(0.3 * SR))
clip = clip[:want]
nf = int(FADE * SR)
clip[-nf:] *= (np.cos(np.linspace(0, np.pi / 2, nf)) ** 2)[:, None]

# one gain, then one soft clip for the lot: the cheer's steady part lands on TARGET
steady_part = slice(int(4.0 * SR), int(5.0 * SR))


def finish(a):
    y = np.tanh(clip * a)
    return y * 0.92 / np.abs(y).max()


lo, hi = 0.5, 400.0                                   # (bisect for the gain that puts the steady part at TARGET)
for _ in range(40):
    a = (lo * hi) ** 0.5
    if np.sqrt((finish(a)[steady_part] ** 2).mean()) < TARGET: lo = a
    else: hi = a
clip = finish(a)
os.makedirs(os.path.dirname(OUT), exist_ok=True)
w.write(OUT, SR, (np.clip(clip, -1, 1) * 32767).astype(np.int16))
print('wrote', OUT, f'{len(clip) / SR:.2f}s', os.path.getsize(OUT) // 1024, 'KB', f'| join ends at {join_end / SR:.2f}s, CUE {CUE}s')
