"""Tras generar la voz: reparte el tiempo de cada palabra del guion dentro de su trozo (por longitud)
y apunta cuándo empieza cada frase. Escribe src/palabras.json y src/frases.json. Uso: python herramientas/sync.py"""
import json, re
d = json.load(open("public/voz-trozos.json")); words = []; frases = []
for tz in d["trozos"]:
    toks = []
    for fr in [p for p in re.split(r"(?<=[.!?])\s+", tz["texto"]) if p.strip()]:
        for j, w in enumerate(fr.split()):
            pausa = 5 if (w.endswith(".") or w.endswith("!")) else 3 if w.endswith(",") else 0
            toks.append((w, len(re.sub(r"\W", "", w)) + 1.5 + pausa, j == 0, fr))
    tot = sum(x[1] for x in toks); t = tz["s"]; span = tz["e"] - tz["s"]
    for w, peso, ini, fr in toks:
        dur = span * peso / tot; pausa = 5 if (w.endswith(".") or w.endswith("!")) else 3 if w.endswith(",") else 0
        voz = dur * (1 - pausa / peso) if pausa else dur
        words.append({"w": w, "s": round(t, 2), "e": round(t + voz, 2)})
        if ini: frases.append({"texto": fr, "s": round(t, 2)})
        t += dur
json.dump({"dur": d["dur"], "words": words}, open("src/palabras.json", "w"), ensure_ascii=False)
json.dump({"dur": d["dur"], "frases": frases}, open("src/frases.json", "w"), ensure_ascii=False)
print("ok", d["dur"], len(words), "palabras,", len(frases), "frases")
