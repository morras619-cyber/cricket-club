#!/usr/bin/env python3
"""The menu music (snd/menu-music.mp3), from tools/audio/src/menu-music.m4a ("Stadium Walkout", 45.6 s, Opus in an m4a: Safari cannot be relied on to play
that, so it is made an mp3). Trimmed of its dead air, its click-free start and end faded a few milliseconds, levelled. js/audio.js plays it on
the menu screens and fades the end of each play into the start of the next, so it loops without a seam.
usage: python3 tools/build_menu_music.py   (needs ffmpeg with libmp3lame, numpy, scipy)
"""
import os, subprocess, tempfile
import numpy as np
import scipy.io.wavfile as w

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'audio', 'src', 'menu-music.m4a')
OUT = os.path.join(HERE, '..', 'snd', 'menu-music.mp3')
SR = 44100
TARGET_RMS = 0.11

tmp = os.path.join(tempfile.mkdtemp(), 'a.wav')
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', SRC, '-ar', str(SR), '-ac', '2', tmp], check=True)
x = w.read(tmp)[1].astype(np.float64) / 32768
n = int(0.01 * SR)
x[:n] *= np.linspace(0, 1, n)[:, None]; x[-n:] *= np.linspace(1, 0, n)[:, None]
x *= TARGET_RMS / np.sqrt((x ** 2).mean())
a = np.abs(x)
x = np.where(a < 0.8, x, np.sign(x) * (0.8 + 0.18 * np.tanh((a - 0.8) / 0.18)))     # (a soft ceiling: nothing clips)
w.write(tmp, SR, (np.clip(x, -1, 1) * 32767).astype(np.int16))
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', tmp, '-c:a', 'libmp3lame', '-b:a', '128k', OUT], check=True)
print('wrote', OUT, f'{len(x) / SR:.1f}s', os.path.getsize(OUT) // 1024, 'KB', '| peak', round(float(abs(x).max()), 2))
