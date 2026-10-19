# The home crowd's FOUR!: the user's crowd roar made bigger and livelier: a dhol groove kicks in on
# the shot, two air-horn blasts, the roar doubled (a deeper copy, a beat later, spread wide), then
# the crowd clapping along to the drums as it settles.
import numpy as np, scipy.io.wavfile as w
from scipy.signal import butter, sosfilt
SR = 48000
sr, a = w.read('orig.wav'); a = a.astype(float) / 32768
T = 3.8; N = int(T * SR)
out = np.zeros((N, 2))
rng = np.random.default_rng(4)
def add(sig, t, pan=0.0, g=1.0):
    i = int(t * SR); sig = sig[:N - i]
    if sig.ndim == 1: sig = np.stack([sig * (1 - max(0, pan)), sig * (1 + min(0, pan))], 1)
    out[i:i + len(sig)] += sig * g
def env(n, att, rel):
    t = np.arange(n) / SR; return np.minimum(1, t / max(att, 1e-4)) * np.exp(-t / rel)
def bp(x, lo, hi, order=2): return sosfilt(butter(order, [lo, hi], 'band', fs=SR, output='sos'), x, axis=0)
def lp(x, f): return sosfilt(butter(2, f, 'low', fs=SR, output='sos'), x, axis=0)
def hp(x, f): return sosfilt(butter(2, f, 'high', fs=SR, output='sos'), x, axis=0)

# the roar: the original, plus a deeper, wider copy a beat behind (a bigger ground)
def resample(x, k):  # k > 1: lower and longer
    idx = np.arange(0, len(x) - 1, 1 / k); i0 = idx.astype(int); f = (idx - i0)[:, None]
    return x[i0] * (1 - f) + x[i0 + 1] * f
roar = a * 0.8
big = resample(a, 1.12)[:, ::-1] * 0.55
add(roar, 0.0); add(big, 0.12)
# a swell under it all: the roar's own low end, rising
add(lp(a, 400) * np.linspace(0.3, 0.9, len(a))[:, None], 0.05, g=0.6)

# the dhol: a deep bass boom (pitch falling) and a sharp slap, in a bhangra groove
def boom(g=1.0):
    n = int(0.42 * SR); t = np.arange(n) / SR
    f = 62 + 70 * np.exp(-t * 30)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.002, 0.16)
    s += lp(rng.standard_normal(n), 900) * env(n, 0.001, 0.025) * 0.4
    return s * g
def slap(g=1.0):
    n = int(0.16 * SR)
    s = bp(rng.standard_normal(n), 1800, 5200) * env(n, 0.0005, 0.035)
    s += np.sin(2 * np.pi * 420 * np.arange(n) / SR) * env(n, 0.001, 0.03) * 0.5
    return s * g
beat = 60 / 168     # a quick bhangra tempo
groove = [(0, 'B', 1.0), (0.5, 'S', 0.7), (0.75, 'S', 0.5), (1, 'B', 0.9), (1.5, 'S', 0.7), (1.75, 'B', 0.7),
          (2, 'B', 1.0), (2.5, 'S', 0.7), (2.75, 'S', 0.6), (3, 'B', 0.9), (3.25, 'S', 0.5), (3.5, 'S', 0.7), (3.75, 'S', 0.8)]
for bar in range(2):
    for b_, k, g in groove:
        t = 0.08 + (bar * 4 + b_) * beat
        if t > T - 0.3: continue
        if k == 'B': add(boom(g * 1.1), t, pan=-0.15)
        else: add(slap(g * 0.75), t, pan=0.25)
# a drum roll into the second bar
for i in range(8): add(slap(0.35 + i * 0.06), 0.08 + 3.5 * beat + i * beat / 8, pan=0.3)

# two air-horn blasts: a brassy chord with a little wobble
def horn(dur, f0):
    n = int(dur * SR); t = np.arange(n) / SR
    vib = 1 + 0.006 * np.sin(2 * np.pi * 6 * t)
    s = sum(np.sign(np.sin(2 * np.pi * f * vib * t)) * gg for f, gg in ((f0, 1), (f0 * 1.26, 0.7), (f0 * 1.5, 0.5)))
    s = bp(s, 300, 3500, 3)
    e = np.minimum(1, t / 0.03) * np.minimum(1, (dur - t) / 0.08)
    return s * e
add(horn(0.42, 233), 0.18, pan=0.35, g=0.22); add(horn(0.75, 233), 0.72, pan=0.35, g=0.24)

# the crowd clapping on the beat as the roar settles
def clap():
    n = int(0.09 * SR); s = np.zeros(n)
    for k in range(3):   # a few hands, a hair apart
        o = int(k * 0.006 * SR); s[o:] += bp(rng.standard_normal(n - o), 900, 3000) * env(n - o, 0.0005, 0.02)
    return s
for i in range(10):
    t = 1.45 + i * beat
    if t < T - 0.2: add(np.stack([clap(), clap()], 1) * (0.5 + 0.03 * i), t)

# a crowd tail: the roar's last second, softly, so it doesn't cut off
tail = a[int(1.6 * SR):] * 0.35
add(tail * np.linspace(1, 0, len(tail))[:, None], 2.5)

# finish: warm the low end, tame harshness, glue it with a soft limiter, fade the very end
out = out + 0.25 * lp(out, 160)
out = out - 0.15 * bp(out, 2500, 4500)
out = np.tanh(out * 1.2) * 0.92
out[-int(0.35 * SR):] *= np.linspace(1, 0, int(0.35 * SR))[:, None]
out[:int(0.004 * SR)] *= np.linspace(0, 1, int(0.004 * SR))[:, None]
w.write('four-home.wav', SR, (out * 32767).astype(np.int16))
print('peak', np.abs(out).max(), 'secs', N / SR)
