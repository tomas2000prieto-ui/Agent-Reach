import React, { createContext, useContext } from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import datos from "./palabras.json";
import fr from "./frases.json";

export const FPS = 30;
export const DURACION = Math.ceil((fr.dur + 2.2) * 10) / 10;

// ---------- paleta ----------
const BG = "#0b1034", GRID = "#141c52", BLANCO = "#eef1ff", AZUL = "#4a5be0", AMARILLO = "#ffc233", NARANJA = "#ff9f1c", ROJO = "#ff4d4d", AGUA = "#4aa8ff", SUELO = "#16215e", HORMIGON = "#8e98d8";

const TC = createContext(0);
const useT = () => useContext(TC);
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const suave = (x: number) => { const p = clamp(x); return p * p * (3 - 2 * p); };
const prog = (T: number, t0: number, dur: number) => suave((T - t0) / dur);

// ---------- tiempos a partir de la voz ----------
const S = fr.frases.map((f) => f.s);
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
const PAL = datos.words as { w: string; s: number; e: number }[];
// segundo en que se dice la palabra (la primera que aparece a partir de "desde")
const W = (txt: string, desde: number): number => { const n = norm(txt); const p = PAL.find((x) => x.s >= desde - 0.05 && norm(x.w) === n); return p ? p.s : desde; };
const PASOS = [0, 1, 2, 3, 4].map((k) => ({ s: S[2 + 2 * k], d: S[3 + 2 * k], e: S[4 + 2 * k] ?? S[12] }));
const OUT = S[12], OUT_W = S[13], OUT_B = S[14];
const NOMBRES = ["CIMIENTOS", "MUROS", "ALTURA", "ABERTURAS", "TECHO"];

const T1 = { prof: W("ochenta", PASOS[0].d), ancho: W("sesenta", PASOS[0].d) };
const T2 = { esp: W("quince", PASOS[1].d), capa: W("aisladora", PASOS[1].d), cm30: W("treinta", PASOS[1].d), hum: W("humedad", PASOS[1].d) };
const T3 = { alt: W("dos", PASOS[2].d) };
const T4 = { puerta: W("puerta", PASOS[3].d), vent: W("ventana", PASOS[3].d), metro: W("metro", W("ventana", PASOS[3].d)) };
const T5 = { pend: W("pendiente", PASOS[4].d), pct: W("diez", PASOS[4].d), agua: W("agua", PASOS[4].d) };
const POPS = [T1.prof, T1.ancho, T2.esp, T2.capa, T2.cm30, T3.alt, T4.puerta, T4.metro, T5.pct, OUT_B];

// ---------- piezas ----------
const Pill: React.FC<{ x: number; y: number; t: number; texto: string; c?: string; tc?: string; size?: number }> = ({ x, y, t, texto, c = AMARILLO, tc = "#1a1a1a", size = 40 }) => {
  const T = useT(); const p = prog(T, t, 0.25); if (p <= 0) return null;
  const w = texto.length * size * 0.66 + 48, h = size + 26;
  return (
    <g transform={`translate(${x} ${y}) scale(${0.6 + 0.4 * p})`} opacity={p}>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h / 2} fill={c} stroke="#fff" strokeWidth={3} />
      <text x={0} y={size * 0.36} textAnchor="middle" fontFamily="'DejaVu Sans',Arial,sans-serif" fontWeight={800} fontSize={size} fill={tc}>{texto}</text>
    </g>
  );
};
const Linea: React.FC<{ x1: number; y1: number; x2: number; y2: number; t: number; dur?: number; c?: string; w?: number; dash?: string }> = ({ x1, y1, x2, y2, t, dur = 0.5, c = BLANCO, w = 6, dash }) => {
  const T = useT(); const p = prog(T, t, dur); if (p <= 0) return null;
  return <line x1={x1} y1={y1} x2={x1 + (x2 - x1) * p} y2={y1 + (y2 - y1) * p} stroke={c} strokeWidth={w} strokeLinecap="round" strokeDasharray={dash} />;
};
// cota con flechas en los extremos
const Cota: React.FC<{ x1: number; y1: number; x2: number; y2: number; t: number; c?: string }> = ({ x1, y1, x2, y2, t, c = AMARILLO }) => {
  const T = useT(); const p = prog(T, t, 0.45); if (p <= 0) return null;
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2; const ex = mx + (x2 - mx) * p, ey = my + (y2 - my) * p, sx = mx + (x1 - mx) * p, sy = my + (y1 - my) * p;
  const a = Math.atan2(y2 - y1, x2 - x1), L = 18;
  const fl = (x: number, y: number, ang: number) => `M${x} ${y} L${x - Math.cos(ang - 0.45) * L} ${y - Math.sin(ang - 0.45) * L} M${x} ${y} L${x - Math.cos(ang + 0.45) * L} ${y - Math.sin(ang + 0.45) * L}`;
  return <g stroke={c} strokeWidth={6} strokeLinecap="round" fill="none"><line x1={sx} y1={sy} x2={ex} y2={ey} /><path d={fl(ex, ey, a) + fl(sx, sy, a + Math.PI)} /></g>;
};
const Aparece: React.FC<{ t: number; dur?: number; children: React.ReactNode }> = ({ t, dur = 0.4, children }) => {
  const T = useT(); const p = prog(T, t, dur); if (p <= 0) return null; return <g opacity={p}>{children}</g>;
};
const Persona: React.FC<{ x: number; y: number; h: number; t: number }> = ({ x, y, h, t }) => {
  const T = useT(); const p = prog(T, t, 0.4); if (p <= 0) return null; const k = h / 262;
  return (
    <g opacity={p} stroke={BLANCO} strokeWidth={7} strokeLinecap="round" fill="none" transform={`translate(${x} ${y}) scale(${k})`}>
      <circle cx={0} cy={-238} r={24} fill={SUELO} />
      <line x1={0} y1={-212} x2={0} y2={-120} /><line x1={0} y1={-120} x2={-24} y2={0} /><line x1={0} y1={-120} x2={24} y2={0} />
      <line x1={0} y1={-190} x2={-38} y2={-130} /><line x1={0} y1={-190} x2={38} y2={-130} />
    </g>
  );
};

// ---------- pasos ----------
const Intro: React.FC = () => {
  const T = useT(); if (T > PASOS[0].s + 0.6) return null;
  const f = 1 - prog(T, PASOS[0].s, 0.5);
  const luz = (i: number) => prog(T, S[1] + 0.8 + i * 0.45, 0.3);
  return (
    <g opacity={f}>
      <Linea x1={340} y1={1000} x2={340} y2={780} t={0.2} dur={0.5} /><Linea x1={340} y1={780} x2={740} y2={780} t={0.5} dur={0.5} />
      <Linea x1={740} y1={780} x2={740} y2={1000} t={0.8} dur={0.5} /><Linea x1={300} y1={1000} x2={780} y2={1000} t={0.1} dur={0.8} w={8} />
      <Linea x1={310} y1={790} x2={540} y2={620} t={1.1} dur={0.45} c={NARANJA} w={12} /><Linea x1={540} y1={620} x2={770} y2={790} t={1.4} dur={0.45} c={NARANJA} w={12} />
      <Aparece t={1.9}><rect x={500} y={880} width={80} height={120} fill="none" stroke={AMARILLO} strokeWidth={6} /><rect x={380} y={840} width={70} height={70} fill="none" stroke={AGUA} strokeWidth={6} /><rect x={630} y={840} width={70} height={70} fill="none" stroke={AGUA} strokeWidth={6} /></Aparece>
      <text x={540} y={330} textAnchor="middle" fontFamily="'DejaVu Sans',Arial,sans-serif" fontWeight={900} fontSize={96} fill={BLANCO} opacity={prog(T, 0.1, 0.4)}>MEDIDAS CLAVE</text>
      <text x={540} y={430} textAnchor="middle" fontFamily="'DejaVu Sans',Arial,sans-serif" fontWeight={900} fontSize={62} fill={NARANJA} opacity={prog(T, 0.4, 0.4)}>PARA CONSTRUIR UNA CASA</text>
      {[1, 2, 3, 4, 5].map((n, i) => <g key={n} opacity={luz(i)}><circle cx={240 + i * 150} cy={1180} r={44} fill={AMARILLO} stroke="#fff" strokeWidth={4} /><text x={240 + i * 150} y={1198} textAnchor="middle" fontFamily="'DejaVu Sans',Arial,sans-serif" fontWeight={900} fontSize={52} fill="#1a1a1a">{n}</text></g>)}
    </g>
  );
};

const Cimientos: React.FC = () => {
  const P = PASOS[0]; const T = useT(); if (T < P.s || T > P.e + 0.3) return null; const g = 560;
  const ff = T > P.e - 0.3 ? 1 - prog(T, P.e - 0.3, 0.3) : 1;
  return (
    <g opacity={ff}>
      <Aparece t={P.s + 0.1}><rect x={60} y={g} width={960} height={740} fill={SUELO} /></Aparece>
      <Linea x1={60} y1={g} x2={1020} y2={g} t={P.s + 0.1} dur={0.5} w={8} />
      <Aparece t={P.s + 0.5}><rect x={390} y={g} width={300} height={450} fill="none" stroke={BLANCO} strokeWidth={5} strokeDasharray="14 10" /></Aparece>
      {(() => { const p = prog(T, P.s + 1.0, Math.max(0.6, T1.prof - P.s - 0.3)); return p > 0 ? <rect x={390} y={g + 450 * (1 - p)} width={300} height={450 * p} fill={HORMIGON} stroke={BLANCO} strokeWidth={5} /> : null; })()}
      <Aparece t={P.s + 1.4}><rect x={450} y={g - 120} width={180} height={120} fill={BLANCO} stroke={BLANCO} strokeWidth={4} /></Aparece>
      <Cota x1={770} y1={g} x2={770} y2={g + 450} t={T1.prof} />
      <Pill x={900} y={g + 225} t={T1.prof} texto="80 cm – 1 m" size={34} />
      <Cota x1={390} y1={g + 500} x2={690} y2={g + 500} t={T1.ancho} />
      <Pill x={540} y={g + 575} t={T1.ancho} texto="60 cm" />
    </g>
  );
};

const Muros: React.FC = () => {
  const P = PASOS[1]; const T = useT(); if (T < P.s || T > P.e + 0.3) return null; const g = 900;
  const ff = T > P.e - 0.3 ? 1 - prog(T, P.e - 0.3, 0.3) : 1; const lay = g - 210;
  const dots = Array.from({ length: 9 }, (_, i) => { const y = g - ((T * 45 + i * 24) % 205); return <circle key={i} cx={455 + (i % 3) * 65} cy={y} r={7} fill={AGUA} opacity={T > T2.capa ? 0.9 : 0} />; });
  return (
    <g opacity={ff}>
      <Aparece t={P.s + 0.1}><rect x={60} y={g} width={960} height={400} fill={SUELO} /></Aparece>
      <Linea x1={60} y1={g} x2={1020} y2={g} t={P.s + 0.1} dur={0.5} w={8} />
      {(() => { const p = prog(T, P.s + 0.5, 1.2); return p > 0 ? <rect x={450} y={g - 420 * p} width={130 * 1.0} height={420 * p} fill={BLANCO} stroke={BLANCO} strokeWidth={4} /> : null; })()}
      {Array.from({ length: 12 }, (_, i) => <Linea key={i} x1={450} y1={g - 35 * (i + 1)} x2={580} y2={g - 35 * (i + 1)} t={P.s + 0.8 + i * 0.07} dur={0.2} c={AZUL} w={3} />)}
      <Cota x1={450} y1={g - 470} x2={580} y2={g - 470} t={T2.esp} />
      <Pill x={515} y={g - 540} t={T2.esp} texto="15 – 20 cm" size={34} />
      <Aparece t={T2.capa}><rect x={420} y={lay - 8} width={190} height={16} fill={NARANJA} /></Aparece>
      <Pill x={270} y={lay} t={T2.capa} texto="CAPA AISLADORA" c={NARANJA} size={28} />
      <Cota x1={720} y1={g} x2={720} y2={lay} t={T2.cm30} />
      <Pill x={860} y={(g + lay) / 2} t={T2.cm30} texto="30 cm" />
      <g>{dots}</g>
      <Aparece t={T2.hum}><g stroke={ROJO} strokeWidth={8} strokeLinecap="round"><line x1={600} y1={lay + 12} x2={640} y2={lay + 52} /><line x1={640} y1={lay + 12} x2={600} y2={lay + 52} /></g></Aparece>
    </g>
  );
};

const Sala: React.FC<{ t0: number; mostrarAlt?: boolean }> = ({ t0 }) => {
  const f = 1; return (
    <g opacity={f}>
      <Linea x1={150} y1={1000} x2={930} y2={1000} t={t0} dur={0.5} w={9} />
      <Linea x1={150} y1={610} x2={930} y2={610} t={t0 + 0.1} dur={0.5} w={9} />
      <Linea x1={180} y1={610} x2={180} y2={1000} t={t0 + 0.2} dur={0.4} w={5} c={AZUL} />
      <Linea x1={900} y1={610} x2={900} y2={1000} t={t0 + 0.2} dur={0.4} w={5} c={AZUL} />
    </g>
  );
};
const Altura: React.FC = () => {
  const P = PASOS[2]; const T = useT(); if (T < P.s || T > P.e + 0.3) return null;
  const ff = T > P.e - 0.3 ? 1 - prog(T, P.e - 0.3, 0.3) : 1;
  return (
    <g opacity={ff}>
      <Sala t0={P.s + 0.1} /><Persona x={330} y={1000} h={262} t={P.s + 0.6} />
      <Cota x1={790} y1={610} x2={790} y2={1000} t={T3.alt} />
      <Pill x={790} y={805} t={T3.alt} texto="2,60 m" size={44} />
      <Pill x={540} y={540} t={T3.alt + 0.8} texto="ALTURA MÍNIMA" c={NARANJA} size={30} />
    </g>
  );
};
const Aberturas: React.FC = () => {
  const P = PASOS[3]; const T = useT(); if (T < P.s || T > P.e + 0.3) return null;
  const ff = T > P.e - 0.3 ? 1 - prog(T, P.e - 0.3, 0.3) : 1;
  return (
    <g opacity={ff}>
      <Sala t0={P.s + 0.1} />
      <Aparece t={T4.puerta}><rect x={300} y={700} width={120} height={300} fill="none" stroke={AMARILLO} strokeWidth={7} /><circle cx={398} cy={860} r={8} fill={AMARILLO} /></Aparece>
      <Cota x1={250} y1={700} x2={250} y2={1000} t={T4.puerta + 0.3} />
      <Pill x={130} y={850} t={T4.puerta + 0.3} texto="2 m" size={44} />
      <Aparece t={T4.vent}><rect x={600} y={685} width={180} height={165} fill="#14307a" stroke={AGUA} strokeWidth={7} /><line x1={690} y1={685} x2={690} y2={850} stroke={AGUA} strokeWidth={4} /></Aparece>
      <Cota x1={840} y1={850} x2={840} y2={1000} t={T4.metro} />
      <Pill x={940} y={925} t={T4.metro} texto="1 m" size={44} />
      <Pill x={690} y={640} t={T4.vent + 0.2} texto="VENTANA" c={AGUA} tc="#04122e" size={26} />
    </g>
  );
};
const Techo: React.FC = () => {
  const P = PASOS[4]; const T = useT(); if (T < P.s || T > P.e + 0.6) return null;
  const ff = T > P.e - 0.3 ? 1 - prog(T, P.e - 0.3, 0.5) : 1;
  const ax = 160, ay = 700, bx = 920, by = 768;
  const gotas = [0, 1, 2, 3].map((i) => { const u = ((T * 0.35 + i * 0.25) % 1); const x = ax + 40 + u * (bx - ax - 80); const y = ay + (x - ax) * (by - ay) / (bx - ax) - 22; return <circle key={i} cx={x} cy={y} r={11} fill={AGUA} opacity={T > T5.agua ? 1 : 0} />; });
  return (
    <g opacity={ff}>
      <Linea x1={ax} y1={ay} x2={ax} y2={1000} t={P.s + 0.1} dur={0.5} c={AZUL} w={6} /><Linea x1={bx} y1={by} x2={bx} y2={1000} t={P.s + 0.1} dur={0.5} c={AZUL} w={6} />
      <Linea x1={120} y1={1000} x2={960} y2={1000} t={P.s + 0.1} dur={0.5} w={8} />
      <Linea x1={ax} y1={ay} x2={bx} y2={by} t={P.s + 0.5} dur={0.8} w={16} />
      <Linea x1={ax} y1={ay} x2={bx} y2={ay} t={T5.pend} dur={0.6} c={AMARILLO} w={4} dash="14 10" />
      <Cota x1={bx + 50} y1={ay} x2={bx + 50} y2={by} t={T5.pct} />
      <Pill x={540} y={900} t={T5.pct} texto="10 %" size={72} />
      <Pill x={540} y={1090} t={T5.pct + 0.5} texto="10 cm por cada metro" c={NARANJA} size={30} />
      <g>{gotas}</g>
    </g>
  );
};

const FILAS: [string, string][] = [["CIMIENTOS", "80 cm – 1 m  ·  ancho 60 cm"], ["MURO DE LADRILLO", "15 – 20 cm de espesor"], ["CAPA AISLADORA", "30 cm del suelo"], ["ALTURA LIBRE", "2,60 m mínimo"], ["PUERTA", "2 m de alto"], ["VENTANA", "arranca a 1 m del piso"], ["TECHO", "pendiente del 10 %"]];
const Tabla: React.FC = () => {
  const T = useT(); if (T < OUT) return null; const a = prog(T, OUT, 0.4);
  const bp = prog(T, OUT_B, 0.3); const pulso = 1 + 0.04 * Math.sin((T - OUT_B) * 7) * (T > OUT_B ? 1 : 0);
  return (
    <g opacity={a}>
      <rect x={60} y={260} width={960} height={900} rx={40} fill="#0a0d2c" stroke={AMARILLO} strokeWidth={5} />
      {FILAS.map(([a1, b1], i) => { const p = prog(T, OUT + 0.4 + i * 0.35, 0.3); return (
        <g key={a1} opacity={p} transform={`translate(0 ${(1 - p) * 20})`}>
          <text x={110} y={355 + i * 120} fontFamily="'DejaVu Sans',Arial,sans-serif" fontWeight={800} fontSize={34} fill={BLANCO}>{a1}</text>
          <text x={970} y={355 + i * 120} textAnchor="end" fontFamily="'DejaVu Sans',Arial,sans-serif" fontWeight={800} fontSize={34} fill={NARANJA}>{b1}</text>
          <line x1={110} x2={970} y1={385 + i * 120} y2={385 + i * 120} stroke={GRID} strokeWidth={3} />
        </g>); })}
      <Aparece t={OUT_W}><path d="M120 1250 L170 1160 L220 1250 Z" fill={AMARILLO} /><text x={170} y={1238} textAnchor="middle" fontFamily="'DejaVu Sans',Arial,sans-serif" fontWeight={900} fontSize={44} fill="#1a1a1a">!</text><text x={250} y={1218} fontFamily="'DejaVu Sans',Arial,sans-serif" fontWeight={700} fontSize={30} fill={BLANCO}>Medidas orientativas: verificá siempre</text><text x={250} y={1256} fontFamily="'DejaVu Sans',Arial,sans-serif" fontWeight={700} fontSize={30} fill={BLANCO}>con un profesional</text></Aparece>
      <g opacity={bp} transform={`translate(540 1400) scale(${pulso})`}>
        <rect x={-340} y={-60} width={680} height={120} rx={60} fill={NARANJA} stroke="#fff" strokeWidth={4} />
        <path d="M-290 -28 H-252 V32 L-271 18 L-290 32 Z" fill="#1a1a1a" />
        <text x={34} y={14} textAnchor="middle" fontFamily="'DejaVu Sans',Arial,sans-serif" fontWeight={900} fontSize={44} fill="#1a1a1a">GUARDÁ ESTE VIDEO</text>
      </g>
    </g>
  );
};

// ---------- insignia del paso y subtítulos ----------
const Insignia: React.FC = () => {
  const T = useT(); let k = -1; for (let i = 0; i < 5; i++) if (T >= PASOS[i].s - 0.05 && T < (PASOS[i + 1]?.s ?? OUT)) k = i;
  if (k < 0) return null; const p = prog(T, PASOS[k].s, 0.3);
  return <g transform={`translate(540 150) scale(${0.7 + 0.3 * p})`} opacity={p}><rect x={-270} y={-46} width={540} height={92} rx={46} fill={AMARILLO} stroke="#fff" strokeWidth={4} /><text x={0} y={16} textAnchor="middle" fontFamily="'DejaVu Sans',Arial,sans-serif" fontWeight={900} fontSize={46} fill="#1a1a1a">{k + 1}/5 · {NOMBRES[k]}</text></g>;
};
const CLAVE = new Set(["ochenta", "sesenta", "quince", "veinte", "treinta", "diez", "dos", "un", "metro", "metros", "centimetros", "cimientos", "muros", "altura", "aberturas", "techo", "uno", "tres", "cuatro", "cinco", "profundidad", "ancho", "humedad", "pendiente", "orientativas", "profesional", "guarda", "video"]);
type Pal = { w: string; s: number; e: number };
const grupos = (() => {
  const g: { p: Pal[]; s: number }[] = []; let cur: Pal[] = [];
  const cierra = () => { if (cur.length) { g.push({ p: cur, s: cur[0].s }); cur = []; } };
  for (const p of PAL) { cur.push(p); if (cur.length >= 3 || /[.,!?]$/.test(p.w)) cierra(); }
  cierra(); return g;
})();
const Subs: React.FC = () => {
  const T = useT(); let k = -1; for (let i = 0; i < grupos.length; i++) if (grupos[i].s <= T) k = i; if (k < 0) return null;
  const g = grupos[k]; const fin = g.p[g.p.length - 1].e; if (T > fin + 0.6 && !grupos[k + 1]) return null; if (T > fin + 1.2) return null;
  const e = clamp((T - g.s) / 0.12);
  return (
    <div style={{ position: "absolute", left: 50, right: 50, top: 1480, height: 260, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${0.85 + 0.15 * e})`, opacity: e, textAlign: "center" }}>
      <span style={{ fontFamily: "'DejaVu Sans',Arial,sans-serif", fontWeight: 900, fontSize: 96, lineHeight: 1.1, textShadow: "0 6px 0 rgba(0,0,0,.35)" }}>
        {g.p.map((p, i) => <span key={i} style={{ color: CLAVE.has(norm(p.w)) ? NARANJA : BLANCO }}>{p.w}{i < g.p.length - 1 ? " " : ""}</span>)}
      </span>
    </div>
  );
};

export const Casa: React.FC = () => {
  const frame = useCurrentFrame(); const T = frame / FPS;
  return (
    <TC.Provider value={T}>
      <AbsoluteFill style={{ background: BG }}>
        <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
          {Array.from({ length: 33 }, (_, i) => <line key={`h${i}`} x1={0} x2={1080} y1={i * 60} y2={i * 60} stroke={GRID} strokeWidth={2} />)}
          {Array.from({ length: 19 }, (_, i) => <line key={`v${i}`} y1={0} y2={1920} x1={i * 60} x2={i * 60} stroke={GRID} strokeWidth={2} />)}
          <Intro /><Cimientos /><Muros /><Altura /><Aberturas /><Techo /><Tabla /><Insignia />
        </svg>
        <Subs />
        <Audio src={staticFile("voz.wav")} />
        <Audio src={staticFile("musica.wav")} volume={0.3} />
        {POPS.map((t, i) => <Sequence key={i} from={Math.round(t * FPS)}><Audio src={staticFile("pop.wav")} volume={0.45} /></Sequence>)}
      </AbsoluteFill>
    </TC.Provider>
  );
};
