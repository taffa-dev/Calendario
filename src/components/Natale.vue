<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { tema } from '../tema.js';

// Natale (8/12 - 6/1): neve su canvas (di giorno e di notte), luccichii d'oro solo di giorno, ghirlanda di
// luci solo di notte; la stella sulla riga sta in DataDelGiorno.vue. A livello pagina, dietro al foglio
// (che sta a 2) e sotto le icone (10), come Halloween. Colori da tema.css. Provino: recupero-stagioni/.
const rnd = (a, b) => a + Math.random() * (b - a);
const scuro = () => tema.value === 'dark';

const radice = ref(null);
const canvas = ref(null);
const ghirlandaSvg = ref('');
const luccichii = ref([]);
let altezzaGhirlanda = 0;

// Rettangoli del testo (numero, anno, mese, frase) e degli angoli delle icone: dietro di loro i fiocchi
// quasi spariscono e i luccichii non nascono
function zoneDelTesto(margine) {
  const foglio = document.querySelector('.calendario .foglio:not([aria-hidden="true"])');
  return ['.data', '.frase'].map((q) => foglio?.querySelector(q)).filter(Boolean).map((el) => {
    const b = el.getBoundingClientRect();
    return [b.left - margine, b.top - margine, b.right + margine, b.bottom + margine];
  });
}

// Luccichii: una griglia 4×3 con un po' di disordine, le celle sul testo restano vuote. Posizioni in %
function mettiLuccichii() {
  const W = innerWidth, H = innerHeight, zone = zoneDelTesto(8);
  const nuovi = [];
  for (let c = 0; c < 12; c++) {
    for (let tentativo = 0; tentativo < 6; tentativo++) {
      const cx = (c % 4 + rnd(.15, .85)) * 25, cy = (Math.floor(c / 4) + rnd(.15, .85)) * 33.3;
      const x = cx / 100 * W, y = cy / 100 * H;
      if (cx > 28 && cx < 72 && cy > 22 && cy < 78) break;
      if (zone.some(([l, t, r, b]) => x > l && x < r && y > t && y < b)) continue;
      nuovi.push({ left: cx.toFixed(1) + '%', top: cy.toFixed(1) + '%', d: rnd(5, 9).toFixed(1) + 's', r: (-rnd(0, 9)).toFixed(1) + 's' });
      break;
    }
  }
  luccichii.value = nuovi;
}

// Ghirlanda: festoni appesi fuori dalla pagina, lucine equidistanti lungo il filo; ogni festone dondola.
function disegnaGhirlanda(W, H) {
  // Festoni appesi sopra il bordo e oltre i lati: dentro la pagina si vede solo la parte che pende
  const festoni = W < 600 ? 1 : 2;
  // Sul telefono lucine più grandi e più rade: stesso effetto che sullo schermo largo
  const u = W < 600 ? 1.3 : Math.max(.8, Math.min(1.6, Math.min(W, H) / 600)) * (W > 1200 ? 1.25 : 1);
  const sporge = W * (festoni > 1 ? .06 : .12);
  const largo = (W + 2 * sporge) / festoni;
  // Profondo: circa un terzo della larghezza, almeno un sesto dell'altezza, mai oltre un quarto (resta sopra il numero)
  const profondo = Math.min(Math.max(largo * .32, H * .17), H * .25, 280);
  const su = profondo * .22; // gli agganci stanno sopra il bordo
  const passo = (W < 600 ? 36 : 30) * u;
  let corpo = '', n = 0;
  for (let k = 0; k < festoni; k++) {
    const x0 = -sporge + k * largo, x1 = x0 + largo, y0 = -su;
    const fondo = (profondo + su) * (1 + ((k * 3571) % 7) / 7 * .08);
    const P = [[x0, y0], [x0 + largo * .2, y0 + fondo * 4 / 3], [x1 - largo * .2, y0 + fondo * 4 / 3], [x1, y0]];
    const pt = (t) => { const m = 1 - t, c = [m ** 3, 3 * m * m * t, 3 * m * t * t, t ** 3]; return [0, 1].map((j) => c.reduce((a, w, i) => a + w * P[i][j], 0)); };
    // Lucine alla stessa distanza lungo il filo (lunghezza vera, non il parametro della curva)
    const campioni = [[0, ...pt(0)]];
    for (let i = 1; i <= 400; i++) { const [x, y] = pt(i / 400), [l, a, b] = campioni.at(-1); campioni.push([l + Math.hypot(x - a, y - b), x, y]); }
    const lunghezza = campioni.at(-1)[0], quante = Math.round(lunghezza / passo);
    let punti = '', j = 0;
    for (let i = 1; i < quante; i++) {
      const target = (i / quante) * lunghezza;
      while (campioni[j + 1][0] < target) j++;
      const [l0, xa, ya] = campioni[j], [l1, xb, yb] = campioni[j + 1], f = (target - l0) / (l1 - l0 || 1);
      const x = xa + (xb - xa) * f, y = ya + (yb - ya) * f;
      // Fuori dalla pagina o sotto le icone negli angoli: niente lucina
      if (y < 4 || x < 0 || x > W || (y < 56 && (x < 56 || x > W - 56))) continue;
      const c = (-(1 - x / W) * 3.2).toFixed(2), sc = rnd(5, 11).toFixed(2), r = (-rnd(0, 11)).toFixed(2);
      const tinta = ['#fff1cc', '#f6cf73', '#ff9e86'][n++ % 3];
      punti += `<circle class="alone-luce" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(11 * u).toFixed(1)}" fill="url(#alone-luce)" style="--c:${c}s"/>`;
      punti += `<circle class="punto" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(1.7 * u).toFixed(2)}" style="--tinta:${tinta};--s:${sc}s;--r:${r}s"/>`;
    }
    corpo += `<g class="festone" style="transform-origin:${((x0 + x1) / 2).toFixed(0)}px ${y0.toFixed(0)}px;--d:${(5 + k * 1.3).toFixed(1)}s;--r:${(-k * 2.1).toFixed(1)}s">
      <path class="filo" d="M${P[0]} C${P[1]} ${P[2]} ${P[3]}"/>${punti}</g>`;
  }
  const alto = profondo + 24 * u;
  altezzaGhirlanda = alto;
  ghirlandaSvg.value = `<svg viewBox="0 0 ${W} ${alto}" style="height:${alto}px">
    <defs><radialGradient id="alone-luce">
      <stop offset="0" stop-color="#ffe7b0" stop-opacity=".7"/>
      <stop offset=".3" stop-color="#f5c46a" stop-opacity=".25"/>
      <stop offset="1" stop-color="#e8a84a" stop-opacity="0"/>
    </radialGradient></defs>${corpo}</svg>`;
}

// Neve su canvas: tre profondità disegnate in anticipo come sprite; densità in proporzione all'area,
// con un tetto. Di giorno solo pochi cristalli stampati con l'inchiostro, come sulla carta.
const fermo = window.matchMedia('(prefers-reduced-motion: reduce)');
let ctx, W = 0, H = 0, dpr = 1, testo = [], giro = 0, prima = 0;
const fiocchi = [];
const sprite = {};

function creaSprite() {
  for (const buio of [false, true]) {
    // Cristallo a sei bracci con due rametti per braccio (di giorno più grande: è l'unico segno)
    const r = Math.max(buio ? 4.5 : 6, Math.min(W, H) * (buio ? .0075 : .011)), pad = 3, s = Math.ceil((r + pad) * 2 * dpr);
    const c = document.createElement('canvas'); c.width = c.height = s;
    const g = c.getContext('2d'); g.scale(dpr, dpr); g.translate(r + pad, r + pad);
    g.strokeStyle = buio ? 'rgba(240,246,244,1)' : '#2e6b4f'; g.lineWidth = Math.max(.9, r * .13); g.lineCap = 'round';
    g.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = k * Math.PI / 3, ca = Math.cos(a), sa = Math.sin(a);
      g.moveTo(0, 0); g.lineTo(ca * r, sa * r);
      for (const [t, l] of [[.45, .32], [.72, .22]]) {
        const px = ca * r * t, py = sa * r * t;
        for (const sgn of [1, -1]) {
          const b = a + sgn * Math.PI / 3.2;
          g.moveTo(px, py); g.lineTo(px + Math.cos(b) * r * l, py + Math.sin(b) * r * l);
        }
      }
    }
    g.stroke();
    sprite[`${buio}-3`] = { c, m: s / dpr };
  }
  for (const buio of [false, true]) for (const liv of [0, 1, 2]) {
    const r = [1.1, 1.8, 2.8][liv], pad = 3, s = Math.ceil((r + pad) * 2 * dpr);
    const c = document.createElement('canvas'); c.width = c.height = s;
    const g = c.getContext('2d'); g.scale(dpr, dpr);
    // Nel chiaro un'ombra morbida (non un contorno, che sembrava una bolla) stacca il bianco dalla carta
    if (!buio) { g.shadowColor = 'rgba(30,60,45,.5)'; g.shadowBlur = 1.2 * dpr; }
    g.beginPath(); g.arc(r + pad, r + pad, r, 0, 7);
    g.fillStyle = buio ? 'rgba(240,246,244,1)' : '#fff'; g.fill();
    sprite[`${buio}-${liv}`] = { c, m: s / dpr };
  }
}

function nuovo(chiaro) {
  const z = chiaro ? rnd(.5, 1) : Math.random() ** 1.6; // pochi vicini, molti lontani
  const liv = chiaro ? 3 : z < .35 ? 0 : z < .75 ? 1 : Math.random() < .25 ? 3 : 2;
  const a = chiaro ? rnd(.13, .21) : .35 + z * .55;
  return { x: rnd(0, W), y: rnd(0, H), z, liv, v: 14 + z * 26, f: rnd(0, 6.28), a, rot: rnd(0, 6.28), vr: rnd(-.5, .5) };
}

// Zone dove i fiocchi svaniscono: testo, ghirlanda (solo di notte) e frecce ai lati
function misuraZone() {
  const ghirlanda = scuro() ? altezzaGhirlanda + 10 : 10;
  testo = [[0, -40, W, ghirlanda], [-20, H * .4, 56, H * .6], [W - 56, H * .4, W + 20, H * .6], ...zoneDelTesto(40)];
}

function misura() {
  dpr = devicePixelRatio || 1;
  const prec = W;
  W = innerWidth; H = innerHeight;
  canvas.value.width = Math.round(W * dpr); canvas.value.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  creaSprite();
  const chiaro = !scuro();
  const quanti = chiaro ? Math.max(6, Math.min(10, Math.round(W * H / 120000))) : Math.max(14, Math.min(24, Math.round(W * H / 60000)));
  misuraZone();
  // Solo i fiocchi nuovi prendono un posto a caso: quelli esistenti restano dove sono
  if (!chiaro && fiocchi.length === 0) for (let k = 0; k < 2; k++) { const n = nuovo(false); n.liv = 3; n.z = .85; n.a = .8; fiocchi.push(n); }
  while (fiocchi.length < quanti) {
    const n = nuovo(chiaro);
    // Di giorno: distribuiti su tutta la larghezza, almeno 120px dagli altri cristalli (pochi tentativi)
    const cella = fiocchi.length % 9;
    const fascia = () => { n.x = W * (.08 + (cella % 3 + rnd(.1, .9)) * .28); n.y = (Math.floor(cella / 3) + rnd(.1, .9)) * H / 3; };
    if (chiaro) { fascia(); for (let k = 0; k < 12 && fiocchi.some((o) => Math.hypot(o.x - n.x, o.y - n.y) < 120); k++) fascia(); }
    fiocchi.push(n);
  }
  fiocchi.length = quanti;
  // Cambia la larghezza: i fiocchi si spostano in proporzione
  if (prec && W !== prec) for (const p of fiocchi) p.x *= W / prec;
}

function disegna() {
  ctx.clearRect(0, 0, W, H);
  const buio = scuro();
  for (const p of fiocchi) {
    const x = p.x + Math.sin(p.f) * (6 + p.z * 14);
    const sp = sprite[`${buio}-${p.liv}`];
    // Dietro al testo e negli angoli delle icone spariscono, con una sfumatura di 30px
    let vela = 1;
    for (const [l, t, rr, bb] of testo) {
      const dx = Math.max(l - x, 0, x - rr), dy = Math.max(t - p.y, 0, p.y - bb);
      vela = Math.min(vela, Math.min(1, Math.hypot(dx, dy) / 30));
    }
    for (const [cx, cy] of [[0, 0], [W, 0], [0, H], [W, H]]) vela = Math.min(vela, Math.min(1, Math.max(0, Math.hypot(x - cx, p.y - cy) - 56) / 30));
    ctx.globalAlpha = p.a * vela;
    if (p.liv === 3) {
      ctx.save(); ctx.translate(x, p.y); ctx.rotate(p.rot);
      ctx.drawImage(sp.c, -sp.m / 2, -sp.m / 2, sp.m, sp.m); ctx.restore();
    } else ctx.drawImage(sp.c, x - sp.m / 2, p.y - sp.m / 2, sp.m, sp.m);
  }
  ctx.globalAlpha = 1;
}

function passo(ora) {
  if (ora - prima < 30) { giro = requestAnimationFrame(passo); return; }
  const dt = Math.min(.07, (ora - prima) / 1000); prima = ora;
  for (const p of fiocchi) {
    p.y += p.v * dt; p.f += dt * (.4 + p.z * .6); p.rot += p.vr * dt;
    if (p.y > H + 5) { p.y = -5; p.x = rnd(14, W - 14); }
  }
  disegna();
  // Scheda nascosta: requestAnimationFrame si ferma da solo; qui si smette di chiederlo
  giro = fermo.matches || document.hidden ? 0 : requestAnimationFrame(passo);
}

function avvia() {
  cancelAnimationFrame(giro);
  if (fermo.matches) disegna();
  else { prima = performance.now(); giro = requestAnimationFrame(passo); }
}

function ripresa() {
  if (!document.hidden) avvia();
}

// Cambia la finestra: ghirlanda, neve e luccichii si rifanno solo se la misura è davvero un'altra
let osservatore, osservatorePila, ultima = '';
function ridisegna() {
  const misuraAttuale = `${innerWidth}x${innerHeight}`;
  if (misuraAttuale === ultima) return;
  ultima = misuraAttuale;
  disegnaGhirlanda(innerWidth, innerHeight);
  misura();
  mettiLuccichii();
  if (fermo.matches) disegna();
}

// Cambia l'impaginazione del foglio (ricorrenze, frase lunga): solo le zone dei fiocchi
function seguiPila() {
  misuraZone();
  if (fermo.matches) disegna();
}

// Cambia il tema: altri fiocchi (densità e disegno diversi) e altra zona della ghirlanda
watch(tema, () => {
  if (!ctx) return;
  fiocchi.length = 0;
  misura();
  if (fermo.matches) disegna();
});

onMounted(() => {
  ctx = canvas.value.getContext('2d');
  ridisegna();
  osservatore = new ResizeObserver(ridisegna);
  osservatore.observe(radice.value);
  osservatorePila = new ResizeObserver(seguiPila);
  const pila = document.querySelector('.calendario .pila');
  if (pila) osservatorePila.observe(pila);
  fermo.addEventListener('change', avvia);
  document.addEventListener('visibilitychange', ripresa);
  avvia();
});
onBeforeUnmount(() => {
  cancelAnimationFrame(giro);
  osservatore?.disconnect();
  osservatorePila?.disconnect();
  fermo.removeEventListener('change', avvia);
  document.removeEventListener('visibilitychange', ripresa);
});
</script>

<template>
  <div ref="radice" class="natale" aria-hidden="true">
    <div class="ghirlanda" v-html="ghirlandaSvg"></div>
    <div class="luccichii">
      <svg v-for="(l, i) in luccichii" :key="i" viewBox="-12 -12 24 24"
        :style="{ left: l.left, top: l.top, '--d': l.d, '--r': l.r }">
        <path d="M0-12 2.2-2.2 12 0 2.2 2.2 0 12-2.2 2.2-12 0-2.2-2.2Z" />
      </svg>
    </div>
    <div class="neve"><canvas ref="canvas"></canvas></div>
  </div>
</template>

<style scoped>
/* Tutto dietro il foglio (che sta a 2), sotto le icone (10): il testo non è mai coperto */
.natale {
  --u: min(1px, (100vw - 5.5rem) / 440);
  position: fixed;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 1;
}

.ghirlanda,
.luccichii,
.neve {
  position: absolute;
  inset: 0;
  /* Gli effetti entrano piano dopo il primo disegno */
  animation: entra 3s ease-out both;
}

@keyframes entra {
  from { opacity: 0; }
}

.neve canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}

/* Luccichii d'oro, solo di giorno: piccole stelle a quattro punte (come quella sulla riga) che
   compaiono e svaniscono */
:root[color-theme="dark"] .luccichii {
  display: none;
}

.luccichii svg {
  position: absolute;
  width: max(13px, calc(19 * var(--u)));
  height: auto;
  overflow: visible;
  opacity: 0;
  animation: luccica var(--d) ease-in-out var(--r) infinite;
}

.luccichii path {
  fill: #b8902e;
}

@keyframes luccica {
  0%, 45%, 100% { opacity: 0; transform: scale(.2) rotate(0); }
  62% { opacity: .9; transform: scale(1) rotate(15deg); }
  72% { opacity: .75; transform: scale(.85) rotate(22deg); }
  88% { opacity: 0; transform: scale(.4) rotate(35deg); }
}

/* Ghirlanda di lucine, solo di notte: puntini caldi su un filo appena visibile. Dondola piano, appesa
   in alto. Di giorno niente: spente, le luci sembravano oggetti o puntini a caso */
.ghirlanda {
  bottom: auto;
}

:root:not([color-theme="dark"]) .ghirlanda {
  display: none;
}

.ghirlanda :deep(svg) {
  display: block;
  width: 100%;
  overflow: visible;
}

.ghirlanda :deep(.festone) {
  transform-box: view-box;
  animation: dondola var(--d) ease-in-out var(--r) infinite alternate;
}

@keyframes dondola {
  from { transform: skewX(-1.6deg); }
  to { transform: skewX(1.6deg); }
}

.ghirlanda :deep(.filo) {
  fill: none;
  stroke: var(--color-1);
  stroke-width: .8;
  opacity: .22;
}

.ghirlanda :deep(.alone-luce) {
  opacity: .3;
  animation: corsa 3.2s ease-in-out var(--c) infinite;
}

/* Un'onda di luce corre lungo il filo (ritardo crescente da una lucina all'altra) e ogni tanto una
   lucina brilla per conto suo. Bianco caldo, oro e un rosso tenue a turno */
.ghirlanda :deep(.punto) {
  fill: var(--tinta);
  transform-box: fill-box;
  transform-origin: center;
  animation: scintilla var(--s) ease-in-out var(--r) infinite;
}

@keyframes corsa {
  0%, 100% { opacity: .28; }
  12% { opacity: 1; }
  30% { opacity: .55; }
}

@keyframes scintilla {
  0%, 86%, 100% { transform: scale(1); }
  90% { transform: scale(1.9); }
  94% { transform: scale(1.1); }
}

/* Movimento ridotto: tutto fermo (la neve è disegnata una volta sola) */
@media (prefers-reduced-motion: reduce) {
  .ghirlanda,
  .luccichii,
  .neve {
    animation: none;
  }

  .luccichii svg {
    animation: none;
    opacity: .5;
  }

  .ghirlanda :deep(.alone-luce),
  .ghirlanda :deep(.festone),
  .ghirlanda :deep(.punto) {
    animation: none;
  }
}
</style>
