import React, { createContext, useContext } from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import datos from "./palabras.json";

export const FPS = 30;
export const DURACION = 57.2;

const INK = "#2b2b2b";
const PAPER = "#f7f1e1";
const LADRILLO = "#e08a5b";
const G = 1100; // y del suelo

const TC = createContext(0);
const useT = () => useContext(TC);
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const suave = (x: number) => { const p = clamp(x); return p * p * (3 - 2 * p); };
const prog = (T: number, t0: number, dur: number) => suave((T - t0) / dur);

// ---------- trazo a mano ----------
const azar = (seed: number) => { let s = (seed * 9301 + 49297) % 233280; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; };
type P = [number, number];
function tembl(pts: P[], seed = 1, amp = 2.6, paso = 40): string {
  const r = azar(seed); const o: P[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
    const L = Math.hypot(x2 - x1, y2 - y1) || 1; const n = Math.max(1, Math.round(L / paso));
    const nx = -(y2 - y1) / L, ny = (x2 - x1) / L;
    for (let k = 0; k < n; k++) {
      const u = k / n; const d = (r() - 0.5) * 2 * amp;
      o.push([x1 + (x2 - x1) * u + nx * d, y1 + (y2 - y1) * u + ny * d]);
    }
  }
  const u = pts[pts.length - 1]; o.push([u[0] + (r() - 0.5) * amp, u[1] + (r() - 0.5) * amp]);
  return "M" + o.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("L");
}
const linea = (x1: number, y1: number, x2: number, y2: number, s = 1) => tembl([[x1, y1], [x2, y2]], s);
const rect = (x: number, y: number, w: number, h: number, s = 1) => tembl([[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]], s);
const poli = (p: P[], s = 1) => tembl(p, s);
const circulo = (cx: number, cy: number, r: number, s = 1) => {
  const p: P[] = []; for (let i = 0; i <= 24; i++) { const a = (i / 24) * Math.PI * 2; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return tembl(p, s, 1.4, 30);
};

// dibuja un trazo entre t0 y t0+dur
const D: React.FC<{ d: string; t: number; dur: number; w?: number; c?: string; fill?: string }> = ({ d, t, dur, w = 7, c = INK, fill = "none" }) => {
  const T = useT(); const p = prog(T, t, dur); if (p <= 0) return null;
  return <path d={d} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} stroke={c} strokeWidth={w} fill={fill} strokeLinecap="round" strokeLinejoin="round" />;
};
// relleno que aparece (fundido) entre t0 y t0+dur
const F: React.FC<{ d: string; t: number; dur: number; c: string; op?: number; hasta?: number }> = ({ d, t, dur, c, op = 1, hasta }) => {
  const T = useT(); const p = prog(T, t, dur); if (p <= 0 || (hasta !== undefined && T > hasta)) return null;
  return <path d={d} fill={c} opacity={p * op} />;
};
// rectángulo que se destapa de izquierda a derecha
const Barrido: React.FC<{ x: number; y: number; w: number; h: number; t: number; dur: number; c: string; stroke?: string; op?: number }> = ({ x, y, w, h, t, dur, c, stroke = "none", op = 1 }) => {
  const T = useT(); const p = prog(T, t, dur); if (p <= 0) return null;
  return <rect x={x} y={y} width={w * p} height={h} fill={c} stroke={stroke} strokeWidth={5} opacity={op} />;
};

// ---------- el obrero ----------
const Obrero: React.FC = () => {
  const T = useT(); if (T < 5.1 || (T > 38.4 && T < 46.9)) return null;
  const x = 95, y0 = G;
  const a = prog(T, 5.1, 0.4);
  let herr = "ninguna";
  if (T < 12) herr = "pala"; else if (T >= 22 && T < 29.3) herr = "llana"; else if (T >= 32.8 && T < 36.4) herr = "martillo"; else if (T >= 49.4 && T < 51.8) herr = "rodillo";
  const ang = herr === "ninguna" ? -1.2 + (T >= 52 ? 0.6 * Math.sin(T * 7) : 0) : -0.3 + 0.7 * Math.sin(T * 6);
  const hx = x + Math.cos(ang) * 58, hy = y0 - 105 + Math.sin(ang) * 58;
  const sv = circulo(x, y0 - 150, 28, 4);
  return (
    <g opacity={a} stroke={INK} strokeWidth={7} strokeLinecap="round" fill="none">
      <path d={sv} fill="#fff" />
      <path d={`M${x - 30} ${y0 - 160} A30 30 0 0 1 ${x + 30} ${y0 - 160} Z`} fill="#f2b705" />
      <line x1={x} y1={y0 - 122} x2={x} y2={y0 - 55} />
      <line x1={x} y1={y0 - 55} x2={x - 22} y2={y0} />
      <line x1={x} y1={y0 - 55} x2={x + 22} y2={y0} />
      <line x1={x} y1={y0 - 105} x2={x - 30} y2={y0 - 70} />
      <line x1={x} y1={y0 - 105} x2={hx} y2={hy} />
      {herr === "pala" && <><line x1={hx} y1={hy} x2={hx + 55} y2={hy + 60} /><path d={`M${hx + 50} ${hy + 54} l24 -10 l10 26 l-24 10 z`} fill="#8a8a8a" /></>}
      {herr === "llana" && <path d={`M${hx - 6} ${hy} l48 -8 l4 14 l-48 8 z`} fill="#bdbdbd" />}
      {herr === "martillo" && <><line x1={hx} y1={hy} x2={hx + 30} y2={hy - 40} /><rect x={hx + 14} y={hy - 58} width={36} height={18} fill="#6b6b6b" transform={`rotate(25 ${hx + 30} ${hy - 50})`} /></>}
      {herr === "rodillo" && <><line x1={hx} y1={hy} x2={hx + 14} y2={hy - 24} /><rect x={hx - 4} y={hy - 44} width={56} height={22} rx={8} fill="#2a9d8f" /></>}
    </g>
  );
};

// ---------- cámara ----------
const CAM: [number, number, number, number][] = [
  [0, 1.0, 540, 820], [3.5, 1.25, 540, 1100], [5.5, 1.2, 540, 1140], [15, 1.0, 540, 1000], [16.5, 1.0, 540, 900],
  [22, 1.4, 420, 950], [29, 1.0, 540, 850], [31, 1.0, 540, 760], [36.8, 1.0, 540, 850], [39.2, 2.0, 340, 940],
  [45.4, 2.0, 340, 940], [47, 1.0, 540, 850], [51.7, 0.95, 540, 850], [57.2, 0.88, 540, 800],
];
function camara(T: number): [number, number, number] {
  for (let i = 0; i < CAM.length - 1; i++) {
    const a = CAM[i], b = CAM[i + 1];
    if (T >= a[0] && T <= b[0]) { const u = suave((T - a[0]) / (b[0] - a[0])); return [a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u, a[3] + (b[3] - a[3]) * u]; }
  }
  const l = CAM[CAM.length - 1]; return [l[1], l[2], l[3]];
}

// ---------- la casa ----------
const XL = 190, XR = 890, TOP = 760, ALT = 28, FILAS = 12;
const Escena: React.FC = () => {
  const T = useT();
  const fCasa = T < 2.6 ? 1 : clamp(1 - (T - 2.6) / 0.6);
  const pilares = [220, 540, 860];
  const bloques: React.ReactNode[] = [];
  for (let i = 0; i < FILAS; i++) {
    for (let j = 0; j < 10; j++) {
      const off = i % 2 ? 35 : 0; const x = XL + j * 70 - off; const w = 70;
      const xx = Math.max(XL, x), ww = Math.min(XR, x + w) - xx; if (ww <= 4) continue;
      const t0 = 22.2 + i * 0.5 + j * 0.035; const p = prog(T, t0, 0.12); if (p <= 0) continue;
      bloques.push(<rect key={`b${i}-${j}`} x={xx} y={G - (i + 1) * ALT + (1 - p) * -14} width={ww} height={ALT} fill={LADRILLO} stroke={INK} strokeWidth={3} opacity={p} />);
    }
  }
  const filaAct = clamp(Math.floor((T - 22.2) / 0.5), 0, FILAS - 1);
  const humo = [0, 1, 2, 3].map((k) => {
    const u = ((T * 0.5 + k * 0.25) % 1); return <circle key={k} cx={770 + Math.sin(u * 9 + k) * 18} cy={560 - u * 190} r={14 + u * 26} fill="#e9e9e9" stroke={INK} strokeWidth={4} opacity={(1 - u) * 0.9} />;
  });
  const puertaAb = prog(T, 52.4, 0.8);
  return (
    <g>
      {/* 1. la casa que "no" empieza */}
      <g opacity={fCasa}>
        <D d={rect(XL, TOP, 700, 340, 11)} t={0} dur={0.9} w={6} c="#8a8a8a" />
        <D d={poli([[150, TOP], [540, 540], [930, TOP], [150, TOP]], 12)} t={0.6} dur={0.8} w={6} c="#8a8a8a" />
        <D d={linea(250, 680, 830, 1160, 21)} t={1.4} dur={0.5} w={16} c="#d9534f" />
        <D d={linea(830, 680, 250, 1160, 22)} t={1.8} dur={0.5} w={16} c="#d9534f" />
      </g>
      {/* suelo y agujero */}
      <D d={linea(-300, G, 1380, G, 31)} t={2.8} dur={0.8} w={8} />
      <F d="M-300 1100 H1380 V2700 H-300 Z" t={3.4} dur={0.6} c="#dcc7a1" />
      <Barrido x={XL - 20} y={G} w={740} h={105} t={3.8} dur={1.2} c={PAPER} />
      <D d={tembl([[XL - 20, G], [XL - 20, 1205], [XR + 20, 1205], [XR + 20, G]], 33)} t={3.8} dur={1.4} w={8} />
      {/* montón de tierra */}
      <F d="M930 1100 Q1010 960 1090 1100 Z" t={6} dur={3} c="#b89968" />
      <D d={tembl([[930, G], [1010, 985], [1090, G]], 35)} t={5.8} dur={1.0} w={6} />
      {/* 2. jaula de acero */}
      {[1135, 1175].map((y, i) => <D key={y} d={linea(XL, y, XR, y, 40 + i)} t={9.5} dur={1.2} w={5} c="#555" />)}
      {Array.from({ length: 11 }, (_, i) => <D key={i} d={linea(XL + 12 + i * 68, 1118, XL + 12 + i * 68, 1192, 50 + i)} t={9.8 + i * 0.1} dur={0.25} w={5} c="#555" />)}
      <Barrido x={XL - 10} y={1112} w={720} h={86} t={11.6} dur={1.3} c="#b9b9b9" stroke={INK} op={0.9} />
      {[300, 540, 780].map((x, i) => {
        const p = prog(T, 13.2 + i * 0.1, 0.4); if (p <= 0 || T > 15.6) return null; const m = Math.sin(T * 9 + i) * 6;
        return <g key={x} opacity={p} stroke="#d9534f" strokeWidth={9} strokeLinecap="round" fill="none"><line x1={x} y1={820 + m} x2={x} y2={1060 + m} /><path d={`M${x - 26} ${1030 + m} L${x} ${1070 + m} L${x + 26} ${1030 + m}`} /></g>;
      })}
      {/* 3. pilares y vigas */}
      {pilares.map((x, i) => <React.Fragment key={x}><D d={rect(x - 20, TOP - 20, 40, G - TOP + 20, 60 + i)} t={17.9 + i * 0.35} dur={0.9} w={7} fill="#cfcfcf" /></React.Fragment>)}
      <D d={rect(XL - 20, TOP - 40, 740, 40, 70)} t={18.9} dur={0.9} w={7} fill="#d8d8d8" />
      {T >= 19.6 && T < 21.2 && <g opacity={Math.sin(((T - 19.6) / 1.6) * Math.PI)} fill="none" stroke="#f2b705" strokeWidth={10}><path d={rect(XL - 30, TOP - 50, 760, G - TOP + 50, 71)} strokeDasharray="22 14" /></g>}
      {/* 4. muros de ladrillo */}
      <g>{bloques}</g>
      {T >= 26 && T < 28.9 && (() => { const y = G - (Math.min(filaAct, 8) + 1) * ALT - 6; const p = prog(T, 26, 0.5); return <g opacity={p}><line x1={XL - 30} y1={y} x2={XR + 30} y2={y} stroke="#d9534f" strokeWidth={5} strokeDasharray="14 8" /><circle cx={XL - 30} cy={y} r={9} fill="#d9534f" /><circle cx={XR + 30} cy={y} r={9} fill="#d9534f" /></g>; })()}
      {/* 5. tejado */}
      <D d={poli([[130, TOP - 40], [540, 520], [950, TOP - 40], [130, TOP - 40]], 80)} t={32.9} dur={1.6} w={9} />
      <F d="M130 720 L540 520 L950 720 Z" t={34.6} dur={0.9} c="#b5523b" />
      {[580, 640, 690].map((y, i) => <D key={y} d={linea(540 - (y - 520) * 2.02, y, 540 + (y - 520) * 2.02, y, 90 + i)} t={34.7 + i * 0.3} dur={0.45} w={4} c="#6e2d1f" />)}
      <D d={rect(740, 530, 60, 130, 95)} t={35.8} dur={0.5} w={7} fill="#c97a5f" />
      {/* 6. corte de la pared: cables y tuberías */}
      {T >= 38.6 && T < 44.9 && <rect x={200} y={800} width={300} height={290} fill={PAPER} stroke={INK} strokeWidth={6} opacity={prog(T, 38.6, 0.5)} strokeDasharray="18 10" />}
      <D d={tembl([[230, 840], [300, 840], [300, 920], [400, 920], [400, 1030], [470, 1030]], 100, 2)} t={40.6} dur={1.4} w={9} c="#f2b705" />
      <D d={tembl([[230, 880], [260, 880], [260, 960], [440, 960], [440, 850], [470, 850]], 101, 2)} t={40.9} dur={1.2} w={9} c="#d9534f" />
      <D d={tembl([[470, 1070], [350, 1070], [350, 1000], [240, 1000], [240, 830]], 102, 2)} t={42.0} dur={1.3} w={14} c="#3b82c4" />
      <Barrido x={196} y={796} w={308} h={298} t={44.1} dur={1.1} c="#efe2c2" stroke={INK} />
      {T >= 45.4 && T < 46.9 && (() => { const p = prog(T, 45.4, 0.6); return <g opacity={p} fill="none" stroke={INK} strokeWidth={7} strokeLinecap="round"><path d="M270 900 Q350 830 430 900 Q350 970 270 900 Z" fill="#fff" /><circle cx={350} cy={900} r={22} fill={INK} /><line x1={250} y1={960} x2={450} y2={840} stroke="#d9534f" strokeWidth={12} /></g>; })()}
      {/* 7. acabados */}
      <Barrido x={XL} y={TOP} w={700} h={G - TOP} t={47.9} dur={0.7} c="#efe2c2" />
      <Barrido x={XL} y={1060} w={700} h={40} t={48.7} dur={0.6} c="#b07a45" stroke={INK} />
      {[[300, 850], [700, 850]].map(([x, y], i) => <React.Fragment key={x}><D d={rect(x, y, 110, 130, 110 + i)} t={49.6 + i * 0.3} dur={0.5} w={7} fill="#cfe8f2" /><D d={tembl([[x + 55, y], [x + 55, y + 130]], 112 + i)} t={49.9 + i * 0.3} dur={0.2} w={5} /><D d={tembl([[x, y + 65], [x + 110, y + 65]], 114 + i)} t={49.9 + i * 0.3} dur={0.2} w={5} /></React.Fragment>)}
      <Barrido x={XL} y={TOP} w={700} h={300} t={50.4} dur={1.3} c="#9fd3c7" op={0.55} />
      {/* 8. un hogar */}
      <D d={rect(500, 930, 90, 170, 130)} t={51.9} dur={0.5} w={7} fill="#8a5a33" />
      {puertaAb > 0 && <path d={`M500 930 L${500 + 60 * puertaAb} ${930 - 10 * puertaAb} V${1100 - 12 * puertaAb} L500 1100 Z`} fill="#6e4524" stroke={INK} strokeWidth={5} />}
      {puertaAb > 0.05 && <rect x={512} y={940} width={66 * (1 - puertaAb * 0.6)} height={160} fill="#ffe9a8" opacity={0.9 * puertaAb} />}
      {T >= 52 && <g>{humo}</g>}
      <D d={circulo(1000, 400, 50, 140)} t={52.7} dur={0.7} w={7} c={INK} fill="#ffd54a" />
      {Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return <D key={i} d={linea(1000 + Math.cos(a) * 70, 400 + Math.sin(a) * 70, 1000 + Math.cos(a) * 100, 400 + Math.sin(a) * 100, 150 + i)} t={53.3 + i * 0.05} dur={0.2} w={6} c="#f2b705" />; })}
      {T >= 54.8 && (() => { const p = prog(T, 54.8, 0.5); return <path d="M540 470 C500 420 440 460 470 505 L540 575 L610 505 C640 460 580 420 540 470 Z" fill="#e5484d" stroke={INK} strokeWidth={6} transform={`translate(0 ${-30 * p}) scale(1)`} opacity={p} />; })()}
      {/* estructura final siempre con trazo encima */}
      <D d={rect(XL, TOP, 700, G - TOP, 170)} t={50.4} dur={0.01} w={7} />
    </g>
  );
};

// ---------- subtítulos ----------
type Pal = { w: string; s: number; e: number };
const grupos = (() => {
  const ps = datos.words as Pal[]; const g: { txt: string; s: number }[] = []; let cur: Pal[] = [];
  const cierra = () => { if (cur.length) { g.push({ txt: cur.map((p) => p.w).join(" "), s: cur[0].s }); cur = []; } };
  for (const p of ps) { cur.push(p); if (cur.length >= 2 || /[.,!?]$/.test(p.w)) cierra(); }
  cierra(); return g;
})();
const Subs: React.FC = () => {
  const T = useT(); let k = -1; for (let i = 0; i < grupos.length; i++) if (grupos[i].s <= T) k = i;
  if (k < 0) return null; const g = grupos[k]; const sig = grupos[k + 1]; if (sig === undefined && T > g.s + 1.8) return null;
  if (sig && sig.s - g.s > 2 && T > g.s + 1.6) return null;
  const e = clamp((T - g.s) / 0.12); const esc = 0.8 + 0.2 * e + (e < 1 ? 0 : 0);
  return (
    <div style={{ position: "absolute", left: 40, right: 40, top: 1500, height: 300, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${esc})`, opacity: e }}>
      <span style={{ fontFamily: "'Comic Sans MS','Chalkboard SE','DejaVu Sans',sans-serif", fontWeight: 900, fontSize: 124, color: "#fff", WebkitTextStroke: "16px " + INK, paintOrder: "stroke fill", textAlign: "center", lineHeight: 1.05 }}>{g.txt}</span>
    </div>
  );
};

export const Casa: React.FC = () => {
  const frame = useCurrentFrame(); const T = frame / FPS; const [s, cx, cy] = camara(T);
  return (
    <TC.Provider value={T}>
      <AbsoluteFill style={{ background: PAPER }}>
        <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
          {Array.from({ length: 32 }, (_, i) => <line key={i} x1={0} x2={1080} y1={80 + i * 60} y2={80 + i * 60} stroke="#e3d8bb" strokeWidth={2} />)}
          <line x1={90} x2={90} y1={0} y2={1920} stroke="#e8a9a0" strokeWidth={3} />
          <g transform={`translate(540 800) scale(${s}) translate(${-cx} ${-cy})`}>
            <Escena />
            <Obrero />
          </g>
        </svg>
        <Subs />
        <Audio src={staticFile("voz.mp3")} />
        <Audio src={staticFile("fx.wav")} volume={0.55} />
      </AbsoluteFill>
    </TC.Provider>
  );
};
