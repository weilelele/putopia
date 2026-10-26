"""Voyager briefing theme ("Signal From Elsewhere") — an original, seamless 96 s loop synthesised from scratch.
D minor, 80 BPM, 32 bars. A (0-48s): pad, bass, search motif, radio static, arp fades in.
B (48-96s): low sonar pulse, full arp, brighter pad; pulse fades before the loop seam.
Everything is placed circularly (mod LOOP) and reverb/delay are circular, so the loop is gapless.

Rebuild the site asset (numpy only):
  python3 scripts/audio/briefing-theme.py /tmp/briefing-theme.wav
  ffmpeg -i /tmp/briefing-theme.wav -af volume=-6dB -c:a libmp3lame -b:a 128k public/assets/voyager-briefing/briefing-theme.mp3
The player (src/app/voyager-initiation/briefing/briefing-sound.ts) loops exactly BRIEFING_THEME.loopSeconds."""
import numpy as np, wave, sys

SR = 44100
BEAT = 60 / 80
BAR = 4 * BEAT                      # 3 s
LOOP = 32 * BAR                     # 96 s
N = int(LOOP * SR)
rng = np.random.default_rng(237)
L = np.zeros(N); R = np.zeros(N)    # dry
WL = np.zeros(N); WR = np.zeros(N)  # reverb send

def hz(m): return 440 * 2 ** ((m - 69) / 12)

def place(sig, start, pan=0.0, gain=1.0, send=0.3):
    """Add a mono signal at `start` seconds, wrapping around the loop."""
    idx = (int(start * SR) + np.arange(len(sig))) % N
    gl, gr = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    s = sig * gain
    np.add.at(L, idx, s * gl); np.add.at(R, idx, s * gr)
    np.add.at(WL, idx, s * gl * send); np.add.at(WR, idx, s * gr * send)

def env_ar(n, attack, release_at, release):
    t = np.arange(n) / SR
    a = np.clip(t / attack, 0, 1); a = 0.5 - 0.5 * np.cos(np.pi * a)
    r = np.clip(1 - (t - release_at) / release, 0, 1); r = 0.5 - 0.5 * np.cos(np.pi * r)
    return a * r

def section_level(t, a, b):
    """Intensity curve over loop time t: value a in section A, b in B, smooth ramps."""
    x = np.clip((t - 40) / 8, 0, 1) - np.clip((t - 88) / 8, 0, 1)
    return a + (b - a) * (0.5 - 0.5 * np.cos(np.pi * x))

# ---------- harmony: 8 chords x 6 s, played twice ----------
CHORDS = [  # (pad voicing, bass)
    ([50, 57, 64, 65], 38),   # Dm(add9)
    ([50, 53, 57, 62], 34),   # Bbmaj7
    ([48, 53, 57, 64], 41),   # Fmaj7
    ([48, 52, 55, 62], 36),   # Cadd9
    ([50, 57, 64, 65], 38),   # Dm(add9)
    ([50, 53, 57, 62], 34),   # Bbmaj7
    ([50, 55, 58, 65], 43),   # Gm7
    ([50, 52, 57, 64], 33),   # Asus4 -> A
]
CH = 2 * BAR

# Pad: additive, two detuned voices, brightness follows the section curve
for half in range(2):
    for c, (notes, bass) in enumerate(CHORDS):
        start = half * 48 + c * CH
        dur = CH + 3.0
        n = int(dur * SR); t = np.arange(n) / SR
        bright = 1.0 if half == 0 else 1.6
        env = env_ar(n, 1.8, CH, 3.0)
        for k, m in enumerate(notes):
            if c == 7 and k == 0:   # sus4 D resolves to C# halfway
                f = np.where(t < CH / 2, hz(50), hz(49))
                phase_base = 2 * np.pi * np.cumsum(f) / SR
            else:
                phase_base = 2 * np.pi * hz(m) * t
            sig = np.zeros(n)
            for det in (-0.0025, 0.0025):
                vib = 1 + det + 0.0012 * np.sin(2 * np.pi * (0.13 + k * 0.03) * t + k)
                for h in range(1, 9):
                    sig += np.sin(h * phase_base * vib + h * k) * h ** -(2.4 - 0.5 * bright)
            place(sig * env, start, pan=(-0.55, 0.35, -0.2, 0.55)[k], gain=0.040 * (0.8 if half == 0 else 1.0), send=0.45)
        # bass: sine + soft 2nd harmonic
        f = hz(bass); env = env_ar(n, 1.2, CH, 2.5)
        sig = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t) + 0.08 * np.sin(6 * np.pi * f * t)
        place(sig * env, start, gain=0.055 * (0.8 if half == 0 else 1.0), send=0.03)

# ---------- FM bell (search motif & arp) ----------
def bell(m, dur=2.4, ratio=2.0, index=2.2, decay=0.9):
    n = int(dur * SR); t = np.arange(n) / SR
    f = hz(m)
    mod = index * np.exp(-t / 0.18) * np.sin(2 * np.pi * f * ratio * t)
    e = np.exp(-t / decay) * np.clip(t / 0.004, 0, 1)
    return (np.sin(2 * np.pi * f * t + mod) + 0.15 * np.sin(2 * np.pi * f * 3.01 * t) * np.exp(-t / 0.3)) * e

# Search motif: a question that changes its last note each time
MOTIFS = [[69, 74, 76], [69, 74, 77], [69, 74, 76, 81], [72, 77, 76, 74]]
for i, motif in enumerate(MOTIFS):
    for j, m in enumerate(motif):
        place(bell(m, dur=4.0, ratio=3.5, index=1.4, decay=1.4), i * 24 + 0.4 + j * BEAT,
              pan=(-0.3 + 0.3 * j), gain=0.075, send=0.75)

# Arpeggio: 8th notes over chord tones, sparse, with circular ping-pong delay
ARP_SHAPE = [0, 2, 1, 3, 2, 1, 3, 2]
arpL = np.zeros(N); arpR = np.zeros(N)
eighth = BEAT / 2
for step in range(int(LOOP / eighth)):
    t0 = step * eighth
    c = int(t0 // CH) % 8
    notes = sorted(CHORDS[c][0])
    if c == 7 and (t0 % CH) >= CH / 2: notes = [49, 52, 57, 64]
    m = notes[ARP_SHAPE[step % 8]] + 12
    lvl = float(section_level(np.array([t0]), 0.0, 1.0)[0])
    lvl = max(lvl, np.clip((t0 - 26) / 18, 0, 0.45))       # creeps in during A
    if lvl < 0.02 or rng.random() > (0.55 + 0.3 * lvl): continue
    vel = (0.55 + 0.45 * rng.random()) * lvl
    if step % 8 == 0: vel *= 1.25
    sig = bell(m, dur=1.6, ratio=2.0, index=1.8, decay=0.45) * vel
    idx = (int(t0 * SR) + np.arange(len(sig))) % N
    pan = 0.35 if step % 2 else -0.35
    np.add.at(arpL, idx, sig * (1 - pan) / 2); np.add.at(arpR, idx, sig * (1 + pan) / 2)
d = int(BEAT * 0.75 * SR)
dl, dr = np.zeros(N), np.zeros(N)
fl, fr = arpL.copy(), arpR.copy()
for k in range(1, 7):                      # ping-pong
    fl, fr = np.roll(fr, d) * 0.42, np.roll(fl, d) * 0.42
    # darken repeats
    fl = np.convolve(fl, [0.5, 0.5], 'same'); fr = np.convolve(fr, [0.5, 0.5], 'same')
    dl += fl; dr += fr
ARP_G = 0.05
L += (arpL + dl) * ARP_G; R += (arpR + dr) * ARP_G
WL += (arpL + dl) * ARP_G * 0.5; WR += (arpR + dr) * ARP_G * 0.5

# ---------- sonar pulse (section B) ----------
for b in range(32 * 4):
    t0 = b * BEAT
    lvl = float(section_level(np.array([t0]), 0.0, 1.0)[0])
    if lvl < 0.02 or b % 4 not in (0, 2): continue
    n = int(0.9 * SR); t = np.arange(n) / SR
    f = 38 + 30 * np.exp(-t / 0.05)
    sig = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.28) * np.clip(t / 0.003, 0, 1)
    place(sig, t0, gain=0.12 * lvl * (1.0 if b % 4 == 0 else 0.6), send=0.08)

# ---------- radio static & tuning sweeps ----------
def band_noise(n, lo, hi, seed):
    spec = np.fft.rfft(np.random.default_rng(seed).standard_normal(n))
    fr_ = np.fft.rfftfreq(n, 1 / SR)
    spec *= np.exp(-0.5 * (np.log(np.maximum(fr_, 1) / np.sqrt(lo * hi)) / np.log(hi / lo) * 2.4) ** 2)
    out = np.fft.irfft(spec, n); return out / np.max(np.abs(out))
tt = np.arange(N) / SR
hiss_env = 0.5 + 0.5 * np.sin(2 * np.pi * tt / 24 + 1.0) * np.sin(2 * np.pi * tt / 9.6)
for ch, seed in ((L, 1), (R, 2)):
    ch += band_noise(N, 900, 5000, seed) * (0.006 + 0.006 * hiss_env)
# crackles: short clicks, sparse
for _ in range(220):
    t0 = rng.random() * LOOP; n = int(0.004 * SR)
    sig = rng.standard_normal(n) * np.exp(-np.arange(n) / (0.0008 * SR))
    place(sig, t0, pan=rng.uniform(-0.8, 0.8), gain=0.03 * rng.random(), send=0.1)
# tuning sweeps into each 24 s phrase: a carrier gliding into the motif's A
for i in range(4):
    n = int(2.6 * SR); t = np.arange(n) / SR
    glide = hz(57) * 2 ** (-(1.4 * (1 - t / 2.6) ** 2)) * (1 + 0.004 * np.sin(2 * np.pi * 5.5 * t))
    tone = np.sin(2 * np.pi * np.cumsum(glide) / SR)
    noise = band_noise(n, 600, 3000, 40 + i)
    e = env_ar(n, 0.8, 1.9, 0.7)
    mix = tone * np.clip(t / 2.2, 0, 1) * 0.6 + noise * (1 - np.clip(t / 2.2, 0, 1)) * 0.5
    place(mix * e, i * 24 - 2.2, pan=0.15, gain=0.05, send=0.5)

# ---------- circular reverb ----------
def impulse(seed, seconds=4.5):
    n = int(seconds * SR); t = np.arange(n) / SR
    g = np.random.default_rng(seed)
    full = g.standard_normal(n) * np.exp(-t * 6.9 / 1.6)       # bright, short
    dark = band_noise(n, 80, 1800, seed + 100) * np.exp(-t * 6.9 / 4.2)
    ir = 0.5 * full + dark
    ir[: int(0.025 * SR)] = 0                                    # pre-delay
    return ir / np.sqrt(np.sum(ir ** 2))
def circ_conv(x, ir):
    h = np.zeros(N); h[: len(ir)] = ir
    return np.fft.irfft(np.fft.rfft(x) * np.fft.rfft(h), N)
REV = 0.55
L += circ_conv(WL, impulse(7)) * REV
R += circ_conv(WR, impulse(8)) * REV

# ---------- master ----------
# gentle low cut at ~30 Hz, soft clip, peak normalise
def highpass(x, fc=30):
    spec = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    spec *= 1 / np.sqrt(1 + (fc / np.maximum(f, 1e-3)) ** 4); return np.fft.irfft(spec, len(x))
L, R = highpass(L), highpass(R)
mix = np.stack([L, R], 1)
mix /= np.max(np.abs(mix)); mix = np.tanh(mix * 1.2) / np.tanh(1.2)
mix *= 10 ** (-1 / 20)
out = sys.argv[1]
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print('wrote', out, f'{LOOP:.1f}s')
