"""Genera public/musica.wav (fondo suave) y public/pop.wav (sonido de etiqueta)."""
import wave, numpy as np
SR = 44100; DUR = 62
def tone(f, d, dec, harm):
    t = np.arange(int(d * SR)) / SR
    return sum(h * np.sin(2 * np.pi * f * (k + 1) * t) for k, h in enumerate(harm)) * np.exp(-dec * t)
m = np.zeros(int(DUR * SR))
ACORDES = [(110.0, (220.0, 277.18, 329.63, 277.18, 440.0, 329.63, 277.18, 329.63)), (87.31, (174.61, 220.0, 261.63, 220.0, 349.23, 261.63, 220.0, 261.63)),
           (98.0, (196.0, 246.94, 293.66, 246.94, 392.0, 293.66, 246.94, 293.66)), (82.41, (164.81, 207.65, 246.94, 207.65, 329.63, 246.94, 207.65, 246.94))]
for b in range(int(DUR / 2.8) + 1):
    bajo, notas = ACORDES[b % 4]; t0 = b * 2.8
    def add(t, s, g):
        i = int(t * SR)
        if i < len(m): n = min(len(s), len(m) - i); m[i:i + n] += s[:n] * g
    add(t0, tone(bajo, 2.8, 1.2, (1, 0.3)), 0.5)
    for k, f in enumerate(notas): add(t0 + k * 0.35, tone(f, 1.2, 4, (1, 0.3)), 0.28)
tt = np.arange(len(m)) / SR; m *= np.clip(tt / 2, 0, 1) * np.clip((DUR - tt) / 3, 0, 1); m *= 0.8 / np.abs(m).max()
def guarda(n, x):
    with wave.open(n, "wb") as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes())
guarda("public/musica.wav", m)
t = np.arange(int(0.22 * SR)) / SR
guarda("public/pop.wav", (np.sin(2 * np.pi * (700 + 900 * t * 4) * t) * np.exp(-t * 22) * 0.8))
print("ok")
