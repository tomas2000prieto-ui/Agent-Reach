"""Tras generar la voz: saca el segundo de cada palabra (Whisper) y copia las frases a src/.
Uso: python herramientas/sync.py public/voz.wav   (con el Python del proyecto curiosidades-animadas)"""
import sys, json, shutil
from faster_whisper import WhisperModel
m = WhisperModel("small", device="cpu", compute_type="int8")
seg, info = m.transcribe(sys.argv[1], language="es", word_timestamps=True)
words = [{"w": w.word.strip(), "s": round(w.start, 2), "e": round(w.end, 2)} for s in seg for w in s.words]
json.dump({"dur": round(info.duration, 2), "words": words}, open("src/palabras.json", "w"), ensure_ascii=False)
shutil.copy(sys.argv[1].rsplit(".", 1)[0] + "-frases.json", "src/frases.json")
print("ok", info.duration, len(words))
