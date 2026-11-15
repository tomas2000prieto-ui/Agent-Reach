"""Genera public/voz.wav con Chatterbox (multilingüe, español): un trozo por línea del guion.
Cada trozo se comprueba con Whisper contra el texto y se repite (hasta 3 veces) si suena distinto.
Uso: python herramientas/voz.py guion.txt public/voz.wav
Guarda public/voz-trozos.json con el segundo en que empieza y acaba cada trozo."""
import sys, json, re, difflib, unicodedata
import numpy as np, torch, torchaudio as ta
from chatterbox.mtl_tts import ChatterboxMultilingualTTS
from faster_whisper import WhisperModel

torch.set_num_threads(4)
lineas = [l.strip() for l in open(sys.argv[1], encoding="utf-8") if l.strip()]
tts = ChatterboxMultilingualTTS.from_pretrained(device="cpu"); sr = tts.sr
asr = WhisperModel("small", device="cpu", compute_type="int8")
NUM = {"80": "ochenta", "60": "sesenta", "15": "quince", "20": "veinte", "30": "treinta", "10": "diez", "2": "dos", "1": "un", "3": "tres", "4": "cuatro", "5": "cinco"}
def nz(s):
    s = re.sub(r"\d+", lambda x: NUM.get(x.group(), x.group()), s.lower())
    s = re.sub(r"[̀-ͯ]", "", unicodedata.normalize("NFD", s))
    return " ".join(re.sub(r"[^a-z ]", "", s).split())
def parecido(txt, w16):
    seg, _ = asr.transcribe(w16, language="es", beam_size=5)
    return difflib.SequenceMatcher(None, nz(txt), nz(" ".join(x.text for x in seg))).ratio()
def recorta(w):
    e = np.abs(w); v = np.convolve(e, np.ones(480) / 480, mode="same"); idx = np.where(v > 0.012)[0]
    return w[max(0, idx[0] - int(0.05 * sr)): idx[-1] + int(0.08 * sr)] if len(idx) else w
AJUSTES = [(0.6, 0.4), (0.5, 0.5), (0.7, 0.3), (0.55, 0.6), (0.6, 0.4)]
sil = np.zeros(int(sr * 0.4), dtype=np.float32); out = []; trozos = []; t = 0.0
for i, tx in enumerate(lineas):
    mejor, mr = None, -1
    for k, (ex, cfg) in enumerate(AJUSTES):
        w = recorta(tts.generate(tx, language_id="es", exaggeration=ex, cfg_weight=cfg).squeeze().numpy().astype(np.float32))
        w16 = torchaudio_w = ta.functional.resample(torch.from_numpy(w).unsqueeze(0), sr, 16000).squeeze().numpy()
        r = parecido(tx, w16); print(f"[{i+1}/{len(lineas)}] intento {k+1}: {r:.2f}  {tx[:50]}", flush=True)
        if r > mr: mejor, mr = w, r
        if r >= 0.9: break
    trozos.append({"texto": tx, "s": round(t, 2), "e": round(t + len(mejor) / sr, 2), "sim": round(mr, 2)})
    out += [mejor, sil]; t += (len(mejor) + len(sil)) / sr
a = np.concatenate(out)
ta.save(sys.argv[2], torch.from_numpy(a).unsqueeze(0), sr)
json.dump({"dur": round(len(a) / sr, 2), "trozos": trozos}, open("public/voz-trozos.json", "w"), ensure_ascii=False)
print("ok", round(len(a) / sr, 1), "s")
