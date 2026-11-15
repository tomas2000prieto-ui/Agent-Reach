"""Genera public/fx.wav: música suave + efectos de sonido sincronizados con las escenas.
Uso: python herramientas/fx.py public/fx.wav
"""
import sys, wave
import numpy as np

SR = 44100
DUR = 58.0
rng = np.random.default_rng(7)
out = np.zeros(int(SR * DUR))
music = np.zeros_like(out)


def add(buf, t, sig, gain=1.0):
    i = int(t * SR)
    if i >= len(buf):
        return
    n = min(len(sig), len(buf) - i)
    buf[i:i + n] += sig[:n] * gain


def env(n, a=0.005, d=0.1):
    e = np.ones(n)
    na, nd = max(1, int(a * SR)), max(1, int(d * SR))
    e[:na] = np.linspace(0, 1, na)
    e[-nd:] *= np.linspace(1, 0, nd)
    return e


def lowpass(x, k):
    k = max(1, int(k))
    return np.convolve(x, np.ones(k) / k, mode="same")


def noise(dur, lp=20):
    n = int(dur * SR)
    return lowpass(rng.standard_normal(n), lp)


def tone(f, dur, decay=4.0, harm=(1.0, 0.4, 0.15)):
    t = np.arange(int(dur * SR)) / SR
    s = sum(h * np.sin(2 * np.pi * f * (k + 1) * t) for k, h in enumerate(harm))
    return s * np.exp(-decay * t)


# ---------- efectos ----------
def scratch(t, dur, gain=0.35):
    n = noise(dur, 6) * (0.6 + 0.4 * np.sin(np.arange(int(dur * SR)) / SR * 55))
    add(out, t, n * env(len(n), 0.02, 0.05), gain)


def scrape(t):  # pala en la tierra
    n = noise(0.35, 10)
    add(out, t, n * env(len(n), 0.03, 0.2), 0.7)
    add(out, t + 0.32, tone(90, 0.2, 18, (1,)), 0.5)


def clink(t):  # varilla de acero
    add(out, t, tone(2400 + rng.integers(0, 600), 0.5, 9, (1, 0.5)), 0.28)


def pour(t, dur):
    n = noise(dur, 14)
    add(out, t, n * env(len(n), 0.2, 0.3), 0.9)


def thud(t, f=70, g=0.9):
    add(out, t, tone(f, 0.35, 11, (1, 0.5)), g)
    n = noise(0.08, 4)
    add(out, t, n * env(len(n), 0.001, 0.07), 0.4)


def click(t):  # ladrillo
    add(out, t, tone(900 + rng.integers(0, 300), 0.09, 55, (1, 0.6)), 0.35)
    n = noise(0.03, 2)
    add(out, t, n * env(len(n), 0.001, 0.025), 0.25)


def pop(t, f=420):
    tt = np.arange(int(0.12 * SR)) / SR
    s = np.sin(2 * np.pi * (f + 600 * tt * 8) * tt) * np.exp(-tt * 30)
    add(out, t, s, 0.5)


def whoosh(t, dur, g=0.6):
    n = noise(dur, 5) - noise(dur, 60)
    e = np.sin(np.linspace(0, np.pi, len(n)))
    add(out, t, n * e, g)


def bloop(t, f=520):
    tt = np.arange(int(0.2 * SR)) / SR
    s = np.sin(2 * np.pi * (f - 300 * tt) * tt * 2) * np.exp(-tt * 14)
    add(out, t, s, 0.5)


def buzz(t, dur):
    tt = np.arange(int(dur * SR)) / SR
    s = np.sign(np.sin(2 * np.pi * 110 * tt)) * 0.25 * (np.sin(2 * np.pi * 7 * tt) > 0.2)
    add(out, t, s * env(len(s), 0.05, 0.1), 0.25)


def creak(t, dur=0.9):
    tt = np.arange(int(dur * SR)) / SR
    f = 180 + 120 * tt / dur + 18 * np.sin(2 * np.pi * 14 * tt)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.35
    add(out, t, s * env(len(s), 0.05, 0.3), 0.7)


def bell(t):
    for f, g in ((880, 0.6), (1318, 0.4), (1760, 0.25)):
        add(out, t, tone(f, 2.2, 2.2, (1,)), g * 0.5)


# ---------- guion de sonidos (segundos del audio) ----------
scratch(0.0, 1.3)                      # se dibuja la casa
scratch(1.4, 1.0, 0.5)                 # tachón
whoosh(2.6, 0.6, 0.3)                  # se borra
scratch(2.8, 0.8)                      # suelo
scratch(3.8, 1.2)                      # el agujero
for t in np.arange(5.5, 9.2, 0.7):     # excavar
    scrape(t)
for i, t in enumerate((9.6, 9.95, 10.3, 10.65, 11.0)):  # jaula de acero
    clink(t)
pour(11.6, 1.4)
for t in (13.4, 14.0, 14.6):           # el peso
    thud(t)
for t in (17.9, 18.25, 18.6):          # pilares
    pop(t)
whoosh(18.9, 0.9, 0.5)                 # viga
for i in range(12):                    # ladrillos, fila a fila
    for j in range(5):
        click(22.2 + i * 0.5 + j * 0.08)
whoosh(26.0, 0.8, 0.3)                 # hilo tenso
for t in np.arange(33.0, 34.5, 0.37):  # martillazos del tejado
    thud(t, 140, 0.7)
for t in np.arange(34.7, 35.9, 0.17):  # tejas
    click(t)
thud(36.1, 90)
buzz(40.6, 1.4)                        # cables
for t, f in ((42.5, 560), (42.95, 500), (43.4, 620)):  # gotas de agua
    bloop(t, f)
whoosh(44.1, 1.1, 0.6)                 # tapar con yeso
whoosh(47.9, 0.8, 0.6)                 # yeso por toda la pared
pop(49.6, 380)
pop(49.95, 460)
whoosh(50.4, 1.3, 0.55)                # pintura
creak(52.4)
bell(54.8)

# ---------- música ----------
ACORDES = [
    (130.81, (261.63, 329.63, 392.00, 329.63, 523.25, 392.00, 329.63, 392.00)),  # Do
    (110.00, (220.00, 261.63, 329.63, 261.63, 440.00, 329.63, 261.63, 329.63)),  # La menor
    (87.31, (174.61, 261.63, 349.23, 261.63, 440.00, 349.23, 261.63, 349.23)),   # Fa
    (98.00, (196.00, 293.66, 392.00, 293.66, 493.88, 392.00, 293.66, 392.00)),   # Sol
]
paso = 0.3
for b in range(int(DUR / (paso * 8)) + 1):
    bajo, notas = ACORDES[b % 4]
    t0 = b * paso * 8
    add(music, t0, tone(bajo, 2.2, 1.6, (1, 0.3)), 0.5)
    for k, f in enumerate(notas):
        add(music, t0 + k * paso, tone(f, 1.0, 4.5, (1, 0.35, 0.1)), 0.32)

tt = np.arange(len(music)) / SR
music *= np.clip(tt / 1.5, 0, 1) * np.clip((DUR - tt) / 2.5, 0, 1)
music *= 0.55 / max(1e-9, np.abs(music).max())
out *= 0.85 / max(1e-9, np.abs(out).max())
mix = np.clip(out * 0.9 + music * 0.4, -1, 1)

with wave.open(sys.argv[1], "wb") as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype(np.int16).tobytes())
print("ok", sys.argv[1], len(mix) / SR, "s")
