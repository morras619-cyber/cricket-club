#!/usr/bin/env python3
"""The crowd's reaction to a four or a six (snd/boundary-build.wav and snd/boundary-cheer.wav), from
tools/audio/src/boundary-cheer.mp3: a 3 s clip, a low murmur and then, at about 1.6 s, a sudden roar
that is cut off at 3.0 s while still at full strength.
  boundary-build.wav   the murmur, made to loop with no seam: it plays from the moment the ball is hit and
                       swells with the ball's flight (the crowd getting to its feet)
  boundary-cheer.wav   the roar, from its rise to the end of the clip, then carried on (the steady part of
                       the roar, folded over itself with crossfades so no repeat is heard) and faded out:
                       it plays when the ball clears the rope, and no longer stops mid-cheer
usage: python3 tools/build_boundary_cheer.py   (needs ffmpeg, numpy, scipy)
"""
import os, subprocess, tempfile
import numpy as np
import scipy.io.wavfile as w

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'audio', 'src', 'boundary-cheer.mp3')
OUT = os.path.join(HERE, '..', 'snd')
SR = 32000
MURMUR = (0.45, 1.55)      # seconds of the source: the steady low crowd before the roar
RISE = 1.40                # where the cheer's file begins: just before the roar swells
PLATEAU = (2.0, 2.7)       # the roar at full strength (the clip is cut off after 3.0)
TOTAL = 5.2                # seconds of cheer, from RISE
FADE = 1.9                 # of which the last are the fade-out

tmp = os.path.join(tempfile.mkdtemp(), 'a.wav')
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', SRC, '-ar', str(SR), '-ac', '2', tmp], check=True)
sr, a = w.read(tmp)
a = a.astype(np.float64) / 32768
sl = lambda t0, t1: a[int(t0 * SR):int(t1 * SR)]


def xfade_append(x, y, n):
    """y appended to x, the last n samples of x fading into the first n of y (equal power)"""
    t = np.linspace(0, np.pi / 2, n)[:, None]
    return np.concatenate([x[:-n], x[-n:] * np.cos(t) + y[:n] * np.sin(t), y[n:]])


# 1. the murmur as a loop: its end crossfaded into its start
m = sl(*MURMUR)
x = int(0.3 * SR)
t = np.linspace(0, np.pi / 2, x)[:, None]
seam = m[len(m) - x:] * np.cos(t) + m[:x] * np.sin(t)
build = np.concatenate([m[x:len(m) - x], seam])

# 2. the cheer: the rise and the roar as recorded, then more of the roar's steady part, then a fade
roar = sl(RISE, PLATEAU[1])
plat = sl(*PLATEAU)
xf = int(0.25 * SR)
cheer = roar
rng = np.random.default_rng(3)
while len(cheer) < int(TOTAL * SR):
    # a different stretch of the steady part each time, so it isn't a loop you can hear
    skip = int(rng.uniform(0, 0.18) * SR)
    cheer = xfade_append(cheer, plat[skip:], xf)
cheer = cheer[:int(TOTAL * SR)]
nf = int(FADE * SR)
fade = np.cos(np.linspace(0, np.pi / 2, nf)) ** 2
cheer[-nf:] *= fade[:, None]

peak = max(abs(cheer).max(), 1e-9)
g = 0.92 / peak
os.makedirs(OUT, exist_ok=True)
for name, buf in (('boundary-build', build * g), ('boundary-cheer', cheer * g)):
    p = os.path.join(OUT, name + '.wav')
    w.write(p, SR, (np.clip(buf, -1, 1) * 32767).astype(np.int16))
    print('wrote', p, f'{len(buf) / SR:.2f}s', os.path.getsize(p) // 1024, 'KB')
