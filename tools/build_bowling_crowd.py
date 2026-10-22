#!/usr/bin/env python3
"""The home crowd's reactions to its side bowling (snd/crowd-ohh.wav, crowd-hoo.wav, crowd-wicket.wav), from
tools/audio/src/crowd-{ohh,hoo,wicket}.mp3 (js/audio.js plays them):
  crowd-ohh.wav     the build-up as the bowler runs in: near silence rising for 3 s, where the recording stops
                    abruptly. Carried on (its last stretch folded over itself with crossfades, no repeat heard) so a
                    catch that takes a while to resolve still has a held, tense crowd under it, then faded out
  crowd-hoo.wav     the "hoooo" for a miss, a block or a dot: attack, swell, and a natural decay (kept whole)
  crowd-wicket.wav  the wicket cheer: it rises and decays naturally (kept whole), lifted to the level of the hoo
The recordings have a narrow whistle line near 2-3 kHz (strongest in the build-up): any bin in 1.5-8 kHz that stands
out from its neighbours is pulled down to them. Each file starts and ends on silence.
usage: python3 tools/build_bowling_crowd.py   (needs ffmpeg, numpy, scipy)
"""
import os, subprocess, tempfile
import numpy as np
import scipy.io.wavfile as w
from scipy.signal import stft, istft
from scipy.ndimage import median_filter

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'audio', 'src')
OUT = os.path.join(HERE, '..', 'snd')
SR = 32000
HOLD = 5.5           # seconds the build-up is carried on past the end of its recording
FADE = 1.8           # of which the last are the fade-out
HOLD_LEVEL = 0.8     # the held crowd is this much of the level the recording reached
WICKET_LIFT = 2.4    # the wicket recording is a quarter the level of the others


def load(name):
    tmp = os.path.join(tempfile.mkdtemp(), 'a.wav')
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', os.path.join(SRC, name), '-ar', str(SR), '-ac', '2', tmp], check=True)
    return w.read(tmp)[1].astype(np.float64) / 32768


def untone(x, lo=1500, hi=8000, ratio=1.3, passes=3):
    out = []
    for c in range(x.shape[1]):
        y = x[:, c]
        for _ in range(passes):
            f, t, Z = stft(y, SR, nperseg=2048, noverlap=1536)
            mag, ph = np.abs(Z), np.angle(Z)
            floor = median_filter(mag, size=(41, 5))
            band = ((f >= lo) & (f <= hi))[:, None]
            mag = np.where(band & (mag > ratio * floor), floor, mag)
            y = istft(mag * np.exp(1j * ph), SR, nperseg=2048, noverlap=1536)[1][:len(x)]
        out.append(y)
    return np.stack(out, 1)


def xfade_append(x, y, n):
    t = np.linspace(0, np.pi / 2, n)[:, None]
    return np.concatenate([x[:-n], x[-n:] * np.cos(t) + y[:n] * np.sin(t), y[n:]])


def ends_on_silence(x, ms=40):
    n = int(ms / 1000 * SR)
    x = x.copy(); x[-n:] *= np.linspace(1, 0, n)[:, None]; x[:n // 2] *= np.linspace(0, 1, n // 2)[:, None]
    return x


def save(name, x, peak=0.92):
    x = x * min(1.0, peak / max(abs(x).max(), 1e-9))
    p = os.path.join(OUT, name)
    w.write(p, SR, (np.clip(x, -1, 1) * 32767).astype(np.int16))
    mono = x.mean(1)
    print('wrote', p, f'{len(x) / SR:.2f}s', os.path.getsize(p) // 1024, 'KB', '| peak', round(float(abs(x).max()), 2), '| rms', round(float(np.sqrt((mono ** 2).mean())), 3))


os.makedirs(OUT, exist_ok=True)
# the build-up
ohh = untone(load('crowd-ohh.mp3'))
tail = ohh[-int(0.5 * SR):] * HOLD_LEVEL
build = ohh
rng = np.random.default_rng(11)
want = len(ohh) + int(HOLD * SR)
build = xfade_append(build, tail, int(0.3 * SR))                       # the last stretch eases to the held level
while len(build) < want:
    skip = int(rng.uniform(0, 0.15) * SR)
    build = xfade_append(build, tail[skip:], int(0.2 * SR))
build = build[:want]
nf = int(FADE * SR)
build[-nf:] *= (np.cos(np.linspace(0, np.pi / 2, nf)) ** 2)[:, None]
save('crowd-ohh.wav', ends_on_silence(build))
# the hoo and the wicket cheer: kept whole
hoo = load('crowd-hoo.mp3')
save('crowd-hoo.wav', ends_on_silence(hoo))
wk = untone(load('crowd-wicket.mp3')) * WICKET_LIFT
save('crowd-wicket.wav', ends_on_silence(wk))
