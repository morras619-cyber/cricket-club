#!/usr/bin/env python3
"""The crowd's moods (snd/crowd-sing.wav, crowd-boo.wav), from tools/audio/src/crowd-{sing,boo}.mp3 (js/audio.js plays them):
  crowd-sing.wav  a happy crowd singing. The recording is 3 s, loud at both ends (cut off at both). Faded in, its middle
                  section carried on (folded over itself with crossfades, no repeat heard) to 10 s, and faded out
  crowd-boo.wav   an angry crowd booing: attack, hold, a natural decay to silence (kept whole)
  crowd-boo2.wav, crowd-boo3.wav  two more boos (the same shape), so the booing is not always the same one; each is
                  levelled to crowd-boo's loudest moment
  crowd-booing.wav  a heated crowd: the steady part of all three boos joined in turn with crossfades (a different crowd
                  at each seam, so no repeat is heard), swelling in, then boo 3's natural decay (~5 s)
The recordings have a narrow whistle line near 6 kHz: any bin in 1.5-8 kHz that stands out from its neighbours is pulled
down to them. Each file starts and ends on silence.
usage: python3 tools/build_crowd_mood.py   (needs ffmpeg, numpy, scipy)
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
SING_LEN = 10.0      # seconds of singing: js/audio.js plays as much of it as a moment needs
SING_IN = 0.35       # fade in
SING_OUT = 1.6       # fade out


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


def save(name, x, peak=0.92):
    x = x * min(1.0, peak / max(abs(x).max(), 1e-9))
    p = os.path.join(OUT, name)
    w.write(p, SR, (np.clip(x, -1, 1) * 32767).astype(np.int16))
    print('wrote', p, f'{len(x) / SR:.2f}s', os.path.getsize(p) // 1024, 'KB', '| peak', round(float(abs(x).max()), 2), '| rms', round(float(np.sqrt((x.mean(1) ** 2).mean())), 3))


os.makedirs(OUT, exist_ok=True)
sing = untone(load('crowd-sing.mp3'))
mid = sing[int(0.4 * SR):int(2.7 * SR)]                 # the steady middle, away from the cut-off ends
clip = mid
rng = np.random.default_rng(21)
want = int(SING_LEN * SR)
while len(clip) < want:
    skip = int(rng.uniform(0, 0.35) * SR)
    clip = xfade_append(clip, mid[skip:], int(0.4 * SR))
clip = clip[:want]
n_in, n_out = int(SING_IN * SR), int(SING_OUT * SR)
clip[:n_in] *= np.linspace(0, 1, n_in)[:, None] ** 1.5
clip[-n_out:] *= (np.cos(np.linspace(0, np.pi / 2, n_out)) ** 2)[:, None]
save('crowd-sing.wav', clip)
boo = untone(load('crowd-boo.mp3'))
n = int(0.04 * SR)
boo[-n:] *= np.linspace(1, 0, n)[:, None]; boo[:n // 2] *= np.linspace(0, 1, n // 2)[:, None]
save('crowd-boo.wav', boo)

# the two further boos, levelled to the first; and a longer one for a crowd that is really angry
def loud(x, win=int(0.25 * SR)):
    m = x.mean(1) if x.ndim > 1 else x
    return max(np.sqrt((m[i:i + win] ** 2).mean()) for i in range(0, len(m) - win, win // 4))
ref = loud(boo * min(1.0, 0.92 / abs(boo).max()))          # (as crowd-boo.wav was saved)
b = {'boo': boo}
for k in ('boo2', 'boo3'):
    x = untone(load(f'crowd-{k}.mp3'))
    x[-n:] *= np.linspace(1, 0, n)[:, None]; x[:n // 2] *= np.linspace(0, 1, n // 2)[:, None]
    b[k] = x
    save(f'crowd-{k}.wav', x * (ref / loud(x)))
lv = {k: x * (ref / loud(x)) for k, x in b.items()}
seg = lambda k, a, z: lv[k][int(a * SR):int(z * SR)]
XF = int(0.3 * SR)
long = seg('boo3', 0.15, 1.3)
for k, a, z in (('boo2', 0.15, 1.1), ('boo', 0.15, 1.1), ('boo3', 0.5, 1.3), ('boo2', 0.4, 1.0)):
    long = xfade_append(long, seg(k, a, z), XF)
long = xfade_append(long, seg('boo3', 1.3, 3.0), XF)
n_in = int(0.5 * SR)
long[:n_in] *= np.linspace(0, 1, n_in)[:, None] ** 1.5
long[-n:] *= np.linspace(1, 0, n)[:, None]
save('crowd-booing.wav', long)
