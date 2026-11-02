#!/usr/bin/env python3
"""The match's crowd bed (snd/crowd-loop.wav) from tools/audio/src/low-level-crowd-loop.mp3.
The recording fades out over its last quarter-second, which is heard as a stop and a restart when it
loops. So: the faded tail is cut off, and the end is crossfaded (equal power) into the start, so the
last sample runs straight into the first. Written as a 16-bit WAV: unlike an MP3 it has no encoder
padding, so the browser loops it with no gap.
usage: python3 tools/build_crowd_loop.py   (needs ffmpeg, numpy, scipy)
"""
import os, subprocess, tempfile
import numpy as np
import scipy.io.wavfile as w

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'audio', 'src', 'low-level-crowd-loop.mp3')
OUT = os.path.join(HERE, '..', 'snd', 'crowd-loop.wav')
SR = 32000          # a crowd murmur has nothing above 16 kHz worth the bytes
KEEP = 2.72         # seconds kept: before the fade-out
XFADE = 0.55        # seconds of crossfade at the seam

tmp = os.path.join(tempfile.mkdtemp(), 'a.wav')
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', SRC, '-ar', str(SR), tmp], check=True)
sr, a = w.read(tmp)
a = a.astype(np.float64) / 32768
s = a[:int(KEEP * SR)]
n, x = len(s), int(XFADE * SR)
t = np.linspace(0, np.pi / 2, x)[:, None]
seam = s[n - x:] * np.cos(t) + s[:x] * np.sin(t)      # the end fades out as the start fades in
loop = np.concatenate([s[x:n - x], seam])             # ...and runs on into s[x] when it wraps
# the level of the whole loop, a touch more even (the swell that would repeat every few seconds)
env = np.sqrt(np.convolve((loop ** 2).mean(1), np.ones(int(0.4 * SR)) / int(0.4 * SR), 'same'))
loop = loop / np.clip(env / env.mean(), 0.85, 1.15)[:, None]
loop *= 0.9 / max(1e-9, np.abs(loop).max()) if np.abs(loop).max() > 0.9 else 1
os.makedirs(os.path.dirname(OUT), exist_ok=True)
w.write(OUT, SR, (np.clip(loop, -1, 1) * 32767).astype(np.int16))
print('wrote', OUT, f'{len(loop) / SR:.2f}s', os.path.getsize(OUT) // 1024, 'KB')
