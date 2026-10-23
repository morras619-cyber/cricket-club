#!/usr/bin/env python3
"""The home crowds' songs (snd/crowd-songs.mp3), from tools/audio/src/song-<club>.mp3. Each recording is 3 s and loud at both
ends (cut off), so each is made the way tools/build_crowd_mood.py makes the default singing: the whistle line near 6 kHz taken out,
the steady middle carried on (folded over itself with crossfades) to 10 s, faded in and out, and levelled to the default singing.
The seven are laid end to end (Thunder Strikers sing the default, snd/crowd-sing.wav), one slot of SLOT seconds each in CLUBS order, in a single file (the published game is at its file
limit): js/audio.js cuts the home club's song out of it. Keep CLUBS and SLOT in step with js/audio.js.
usage: python3 tools/build_crowd_songs.py   (needs ffmpeg with libmp3lame, numpy, scipy)
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
CLUBS = ['cyclones', 'vipers', 'eagles', 'phoenix', 'titans', 'storm', 'royals']
SONG_LEN, SLOT = 10.0, 10.5      # seconds of song, and the slot it sits in (the gap is silence: room for the mp3 encoder's delay)
SING_IN, SING_OUT = 0.35, 1.6
TARGET_RMS = 0.185               # the default singing (snd/crowd-sing.wav), both channels


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


def song(name, seed):
    x = untone(load(name))
    mid = x[int(0.4 * SR):int(2.7 * SR)]
    clip, rng, want = mid, np.random.default_rng(seed), int(SONG_LEN * SR)
    while len(clip) < want:
        clip = xfade_append(clip, mid[int(rng.uniform(0, 0.35) * SR):], int(0.4 * SR))
    clip = clip[:want].copy()
    n_in, n_out = int(SING_IN * SR), int(SING_OUT * SR)
    clip[:n_in] *= np.linspace(0, 1, n_in)[:, None] ** 1.5
    clip[-n_out:] *= (np.cos(np.linspace(0, np.pi / 2, n_out)) ** 2)[:, None]
    rms = np.sqrt((clip ** 2).mean())                   # (both channels: some recordings are wide and would be louder than they measure as a mix)
    clip = clip * (TARGET_RMS / rms)
    a = np.abs(clip)                                  # a soft ceiling: a track with a few big peaks is not made quieter for them
    return np.where(a < 0.7, clip, np.sign(clip) * (0.7 + 0.25 * np.tanh((a - 0.7) / 0.25)))


tracks = []
for i, club in enumerate(CLUBS):
    s = song(f'song-{club}.mp3', 21 + i)
    slot = np.zeros((int(SLOT * SR), 2)); slot[:len(s)] = s
    tracks.append(slot)
    print(club, f'peak {abs(s).max():.2f}', f'rms {np.sqrt((s ** 2).mean()):.3f}')
all_ = np.concatenate(tracks)
tmp = os.path.join(tempfile.mkdtemp(), 'songs.wav')
w.write(tmp, SR, (np.clip(all_, -1, 1) * 32767).astype(np.int16))
os.makedirs(OUT, exist_ok=True)
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', tmp, '-c:a', 'libmp3lame', '-b:a', '112k', os.path.join(OUT, 'crowd-songs.mp3')], check=True)
print('wrote snd/crowd-songs.mp3', os.path.getsize(os.path.join(OUT, 'crowd-songs.mp3')) // 1024, 'KB', f'{len(all_) / SR:.1f}s')
