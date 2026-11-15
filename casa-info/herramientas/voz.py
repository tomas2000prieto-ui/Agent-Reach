"""Genera public/voz.wav con Chatterbox (multilingüe, español) frase a frase.
Uso: python herramientas/voz.py guion.txt public/voz.wav [max_frases]
Guarda también public/voz-frases.json con el segundo en que empieza cada línea del guion."""
import sys, json, re
import numpy as np, torch, torchaudio as ta
from chatterbox.mtl_tts import ChatterboxMultilingualTTS

torch.set_num_threads(4)
lineas = [l.strip() for l in open(sys.argv[1], encoding="utf-8") if l.strip()]
maxn = int(sys.argv[3]) if len(sys.argv) > 3 else None
trozos = []
for l in lineas:
    trozos += [p.strip() for p in re.split(r"(?<=[.!?])\s+", l) if p.strip()]
if maxn: trozos = trozos[:maxn]
m = ChatterboxMultilingualTTS.from_pretrained(device="cpu")
sr = m.sr; sil = np.zeros(int(sr * 0.28), dtype=np.float32); out = []; marcas = []; t = 0.0
for i, tx in enumerate(trozos):
    print(f"[{i+1}/{len(trozos)}] {tx}", flush=True)
    w = m.generate(tx, language_id="es", exaggeration=0.6, cfg_weight=0.4).squeeze().numpy().astype(np.float32)
    marcas.append({"texto": tx, "s": round(t, 2)}); out += [w, sil]; t += (len(w) + len(sil)) / sr
a = np.concatenate(out)
ta.save(sys.argv[2], torch.from_numpy(a).unsqueeze(0), sr)
json.dump({"dur": round(len(a) / sr, 2), "frases": marcas}, open(sys.argv[2].rsplit(".", 1)[0] + "-frases.json", "w"), ensure_ascii=False)
print("ok", round(len(a) / sr, 1), "s")
