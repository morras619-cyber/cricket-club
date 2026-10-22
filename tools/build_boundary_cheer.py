#!/usr/bin/env python3
"""The crowd's reaction to a four or a six (snd/boundary-build.wav and snd/boundary-cheer.wav).
  boundary-build.wav   from tools/audio/src/boundary-build.mp3: 3 s of a crowd getting to its feet, near
                       silent at first and rising all the way to its end, where the recording stops while it is
                       still rising. Carried on past that point (its last stretch folded over itself with
                       crossfades, no repeat heard) and faded out, so a ball in the air for longer than 3 s
                       still has a crowd. It plays from the moment the ball is hit, started part-way in so
                       its rise ends as the ball clears the rope (js/audio.js).
  boundary-cheer.wav   from tools/audio/src/boundary-cheer.mp3: 3 s, a murmur and then, at about 1.6 s, a sudden
                       roar that is cut off at 3.0 s while still at full strength. From its rise to the end of
                       the clip, carried on (the roar's steady part, folded over itself) and faded out. It
                       plays when the ball clears the rope, and no longer stops mid-cheer
usage: python3 tools/build_boundary_cheer.py   (needs ffmpeg, numpy, scipy)
"""
import os, subprocess, tempfile
import numpy as np
import scipy.io.wavfile as w
from scipy.signal import stft, istft
from scipy.ndimage import median_filter

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'audio', 'src', 'boundary-cheer.mp3')
OUT = os.path.join(HERE, '..', 'snd')
SR = 32000
BUILD_SRC = os.path.join(HERE, 'audio', 'src', 'boundary-build.mp3')
BUILD_HOLD = 1.6           # seconds the build-up is carried on past the end of its recording
BUILD_FADE = 0.5           # of which the last are the fade-out
BUILD_TO = 1.0             # the build-up's level at its end, as the roar's level at its start: it hands over to the roar with no dip or jump
RISE = 1.62                # where the cheer's file begins: at the foot of the roar's swell, so it starts at the level the build-up ends on
PLATEAU = (2.0, 2.7)       # the roar at full strength (the clip is cut off after 3.0)
TOTAL = 5.2                # seconds of cheer, from RISE
FADE = 1.9                 # of which the last are the fade-out

tmp = os.path.join(tempfile.mkdtemp(), 'a.wav')
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', SRC, '-ar', str(SR), '-ac', '2', tmp], check=True)
sr, a = w.read(tmp)
a = a.astype(np.float64) / 32768


def untone(x, lo=1500, hi=8000, ratio=1.3, passes=3):
    """the recording has a whistle in it: thin sweeping lines near 2-3 kHz (with its second harmonic near
    5.5-6 kHz and another near 7 kHz) through the murmur and the start of the roar. Looped and swelled it is
    irritating. A crowd is noise, so in lo-hi any bin that stands out even a little from the bins round it
    (a whistle is a line a bin or two wide) is pulled down to what is round it, keeping its phase. Three
    passes, as the lines drift and one pass takes only the strongest."""
    out = []
    for c in range(x.shape[1]):
        y = x[:, c]
        for _ in range(passes):
            f, t, Z = stft(y, SR, nperseg=2048, noverlap=1536)
            mag, ph = np.abs(Z), np.angle(Z)
            floor = median_filter(mag, size=(41, 5))          # what the bins either side (and the frames round it) are doing
            band = ((f >= lo) & (f <= hi))[:, None]
            mag = np.where(band & (mag > ratio * floor), floor, mag)
            y = istft(mag * np.exp(1j * ph), SR, nperseg=2048, noverlap=1536)[1][:len(x)]
        out.append(y)
    return np.stack(out, 1)


a = untone(a)
sl = lambda t0, t1: a[int(t0 * SR):int(t1 * SR)]


def xfade_append(x, y, n):
    """y appended to x, the last n samples of x fading into the first n of y (equal power)"""
    t = np.linspace(0, np.pi / 2, n)[:, None]
    return np.concatenate([x[:-n], x[-n:] * np.cos(t) + y[:n] * np.sin(t), y[n:]])


# 1. the build-up: the recording, then its last stretch carried on, then a fade
tmpb = os.path.join(tempfile.mkdtemp(), 'b.wav')
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', BUILD_SRC, '-ar', str(SR), '-ac', '2', tmpb], check=True)
_, b0 = w.read(tmpb)
b0 = b0.astype(np.float64) / 32768
tail = b0[-int(0.35 * SR):]                          # the last stretch, still rising: the steady level it reached
build = b0
rngb = np.random.default_rng(5)
while len(build) < len(b0) + int(BUILD_HOLD * SR):
    skip = int(rngb.uniform(0, 0.1) * SR)
    build = xfade_append(build, tail[skip:], int(0.12 * SR))
build = build[:len(b0) + int(BUILD_HOLD * SR)]
nb = int(BUILD_FADE * SR)
build[-nb:] *= (np.cos(np.linspace(0, np.pi / 2, nb)) ** 2)[:, None]

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

cheer = np.tanh(cheer * 2.2) / np.tanh(2.2)           # the roar sat at about a quarter of full scale: lifted (a soft clip, so no harsh peaks)
peak = max(abs(cheer).max(), 1e-9)
g = 0.92 / peak
os.makedirs(OUT, exist_ok=True)
# the build-up is lifted by a soft clip too (it was peaky: a few loud claps in a quiet crowd), then set so it ends
# at BUILD_TO of the roar's level: it meets the roar instead of dropping away from it
bpk = max(abs(build).max(), 1e-9)
build = np.tanh(build / bpk * 2.4) / np.tanh(2.4)
end_rms = np.sqrt((build[len(b0) - int(0.3 * SR):len(b0)] ** 2).mean())
roar_rms = np.sqrt((cheer[:int(0.25 * SR)] ** 2).mean())
build = build * (BUILD_TO * roar_rms / end_rms)
build *= min(1, 0.92 / max(abs(build * g).max(), 1e-9))
for name, buf in (('boundary-build', build * g), ('boundary-cheer', cheer * g)):
    p = os.path.join(OUT, name + '.wav')
    w.write(p, SR, (np.clip(buf, -1, 1) * 32767).astype(np.int16))
    print('wrote', p, f'{len(buf) / SR:.2f}s', os.path.getsize(p) // 1024, 'KB')
