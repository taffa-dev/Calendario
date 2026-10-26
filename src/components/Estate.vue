<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';

// Estate (agosto): ombra di rami solo di giorno (due rami, dagli angoli alto-destra e basso-sinistra) e
// lucciole solo di notte nella metà bassa; l'onda sulla riga sta in DataDelGiorno.vue. A livello pagina,
// dietro al foglio (che sta a 2) e sotto le icone (10), come Natale. Colori da tema.css. Provino: recupero-stagioni/.
// I rami si dimensionano sullo spazio libero attorno al testo (non sul viewport): restano piccoli e radi.
const rnd = (a, b) => a + Math.random() * (b - a);

const radice = ref(null);
const lucciole = ref([]);
// Misure in px dei due rami (0 = nascosto perché non c'è posto)
const grande = ref(0);
const piccolo = ref(0);

// Rami con foglie a punta e picciolo, alternate sui due lati. Seme fisso: sempre gli stessi rami.
// Foglie piccole (rispetto al ramo) e rade; la sfocatura sta dentro l'SVG, si anima solo il div.
function ombraDiRami() {
  let seme = 11;
  const caso = (a, b) => { seme = (seme * 16807) % 2147483647; return a + (seme / 2147483647) * (b - a); };
  const foglia = (L, W) => `M0 0 L5 0 C${5 + L * .2} ${-W} ${5 + L * .65} ${-W * .9} ${5 + L} 0 C${5 + L * .65} ${W * .9} ${5 + L * .2} ${W} 5 0Z`;
  function ramo(x, y, ang, len, sp, liv) {
    let out = '', d = `M${x} ${y}`, cx = x, cy = y, a = ang;
    const passi = Math.round(len / 18), piega = caso(-.05, .05);
    for (let i = 1; i <= passi; i++) {
      a += piega;
      const nx = cx + Math.cos(a) * 18, ny = cy + Math.sin(a) * 18;
      d += ` L${nx.toFixed(1)} ${ny.toFixed(1)}`;
      const lato = i % 2 ? 1 : -1;
      // Qualche foglia manca (circa una su tre), così il ramo respira
      if (i > 1 && caso(0, 1) > .3) {
        const fa = a + lato * caso(.55, .9), L = caso(22, 32) * (1 - i / passi * .3);
        out += `<path d="${foglia(L, L * .3)}" transform="translate(${nx.toFixed(1)} ${ny.toFixed(1)}) rotate(${(fa * 180 / Math.PI).toFixed(1)})"/>`;
      }
      if (liv < 2 && i % 4 === 0 && i < passi - 1) out += ramo(nx, ny, a - lato * caso(.5, .8), len * .5, sp * .6, liv + 1);
      cx = nx; cy = ny;
    }
    out += `<path d="${foglia(28, 8)}" transform="translate(${cx.toFixed(1)} ${cy.toFixed(1)}) rotate(${(a * 180 / Math.PI).toFixed(1)})"/>`;
    return `<path class="stelo" stroke-width="${sp}" d="${d}"/>` + out;
  }
  const strato = (cls, box, corpo) => `<svg viewBox="${box}"><filter id="sf-${cls}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.4"/></filter>
    <g filter="url(#sf-${cls})">${corpo}</g></svg>`;
  // I rami nascono fuori dal foglio, così sembrano entrare dal bordo
  const alto = ramo(480, -60, 2.4, 300, 4, 0) + ramo(480, 90, 2.8, 230, 3, 0);
  const basso = ramo(-70, 750, -.6, 230, 3, 0);
  return [strato('alto', '40 -40 390 400', alto), strato('basso', '-30 480 260 260', basso)];
}
const [svgGrande, svgPiccolo] = ombraDiRami();
const RAPPORTO_GRANDE = 390 / 400;

// Rettangoli del testo (numero, anno, mese, frase): i rami non li toccano e le lucciole non nascono lì
function zoneDelTesto(margine) {
  const foglio = document.querySelector('.calendario .foglio:not([aria-hidden="true"])');
  return ['.data', '.frase'].map((q) => foglio?.querySelector(q)).filter(Boolean).map((el) => {
    const b = el.getBoundingClientRect();
    return [b.left - margine, b.top - margine, b.right + margine, b.bottom + margine];
  });
}

const secanti = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];

// Un ramo parte dal massimo consentito (quota della larghezza e dell'altezza) e si rimpicciolisce finché
// il suo riquadro non tocca più testo e frecce; sotto la metà del massimo sparisce
function adatta(massimo, ancora, rapporto, zone, W, H) {
  for (let s = 1; s >= .5; s *= .93) {
    const w = massimo * s, h = w / rapporto;
    const r = ancora === 'alto' ? [W - w, 0, W, h] : [0, H - h, w, H];
    if (!zone.some((z) => secanti(r, z))) return Math.round(w);
  }
  return 0;
}

function misura() {
  const W = innerWidth, H = innerHeight;
  const frecce = [[0, H / 2 - 34, 60, H / 2 + 34], [W - 60, H / 2 - 34, W, H / 2 + 34]];
  const zone = [...zoneDelTesto(8), ...frecce];
  grande.value = adatta(Math.min(.4 * W, .35 * H * RAPPORTO_GRANDE), 'alto', RAPPORTO_GRANDE, zone, W, H);
  piccolo.value = adatta(Math.min(.28 * W, .28 * H), 'basso', 1, zone, W, H);
  mettiLucciole(W, H);
}

// Lucciole di notte: nella metà bassa, mai sul testo né sulle frecce; densità in proporzione all'area, con un tetto
function mettiLucciole(W, H) {
  const zone = [...zoneDelTesto(36), [0, H / 2 - 40, 70, H / 2 + 40], [W - 70, H / 2 - 40, W, H / 2 + 40]];
  const quante = Math.max(6, Math.min(16, Math.round(W * H / 60000)));
  const prese = [], nuove = [];
  for (let i = 0; i < quante; i++) {
    for (let k = 0; k < 40; k++) {
      const x = rnd(.05, .95) * W, y = rnd(.52, .95) * H;
      if (zone.some(([l, t, r, b]) => x > l && x < r && y > t && y < b)) continue;
      if (prese.some(([a, c]) => Math.hypot(a - x, c - y) < 70)) continue;
      prese.push([x, y]);
      const ciclo = rnd(4.5, 8);
      nuove.push({
        left: (x / W * 100).toFixed(1) + '%', top: (y / H * 100).toFixed(1) + '%',
        x: rnd(-24, 24).toFixed(0) + 'px', y: rnd(-18, 12).toFixed(0) + 'px',
        d: rnd(7, 13).toFixed(1) + 's', l: ciclo.toFixed(1) + 's', r: (-(i / quante) * ciclo).toFixed(1) + 's',
        lontana: i % 2 === 1
      });
      break;
    }
  }
  lucciole.value = nuove;
}

let osservatore, osservatorePila, ultima = '';
function ridisegna() {
  const m = `${innerWidth}x${innerHeight}`;
  if (m === ultima) return;
  ultima = m;
  misura();
}

// Cambia l'impaginazione del foglio (ricorrenze, frase lunga): si rimisurano rami e lucciole
function seguiPila() {
  ultima = '';
  ridisegna();
}

onMounted(() => {
  ridisegna();
  osservatore = new ResizeObserver(ridisegna);
  osservatore.observe(radice.value);
  osservatorePila = new ResizeObserver(seguiPila);
  const pila = document.querySelector('.calendario .pila');
  if (pila) osservatorePila.observe(pila);
});
onBeforeUnmount(() => {
  osservatore?.disconnect();
  osservatorePila?.disconnect();
});
</script>

<template>
  <div ref="radice" class="estate" aria-hidden="true">
    <div class="rami">
      <div v-if="grande" class="ramo alto" :style="{ width: grande + 'px', '--d': '9.5s', '--r': '-2.4s' }" v-html="svgGrande"></div>
      <div v-if="piccolo" class="ramo basso" :style="{ width: piccolo + 'px', '--d': '8.2s', '--r': '-5.1s' }" v-html="svgPiccolo"></div>
    </div>
    <div class="lucciole">
      <i v-for="(l, i) in lucciole" :key="i" :class="{ lontana: l.lontana }"
        :style="{ left: l.left, top: l.top, '--x': l.x, '--y': l.y, '--d': l.d, '--l': l.l, '--r': l.r }"></i>
    </div>
  </div>
</template>

<style scoped>
/* Tutto dietro il foglio (che sta a 2), sotto le icone (10): il testo non è mai coperto */
.estate {
  position: fixed;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 1;
}

.rami,
.lucciole {
  position: absolute;
  inset: 0;
  /* Gli effetti entrano piano dopo il primo disegno */
  animation: entra 3s ease-out both;
}

@keyframes entra {
  from { opacity: 0; }
}

/* Ombra di rami, solo di giorno: ombra calda molto trasparente sulla carta, che ondeggia piano attorno
   al punto d'attacco (l'angolo) */
:root[color-theme="dark"] .rami {
  display: none;
}

.ramo {
  position: absolute;
  opacity: .14;
  will-change: transform;
  animation: brezza var(--d) ease-in-out var(--r) infinite alternate;
}

.ramo.alto {
  top: 0;
  right: 0;
  aspect-ratio: 390 / 400;
  transform-origin: 100% 0;
}

.ramo.basso {
  bottom: 0;
  left: 0;
  aspect-ratio: 1;
  transform-origin: 0 100%;
}

.ramo :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.ramo :deep(path) {
  fill: #4a3a1a;
}

.ramo :deep(.stelo) {
  fill: none;
  stroke: #4a3a1a;
  stroke-linecap: round;
}

@keyframes brezza {
  0% { transform: rotate(-1.2deg); }
  55% { transform: rotate(.6deg); }
  100% { transform: rotate(1.4deg); }
}

/* Lucciole, solo di notte: puntini caldi che si accendono e si spengono vagando piano */
:root:not([color-theme="dark"]) .lucciole {
  display: none;
}

.lucciole i {
  --max: .9;
  position: absolute;
  width: max(4.5px, .6vmin);
  aspect-ratio: 1;
  border-radius: 50%;
  background: #f8e2a0;
  box-shadow: 0 0 max(16px, 2.4vmin) max(3px, .6vmin) #f0c88e66;
  opacity: 0;
  will-change: transform, opacity;
  animation: vaga var(--d) ease-in-out var(--r) infinite alternate, accendi var(--l) ease-in-out var(--r) infinite;
}

.lucciole i.lontana {
  --max: .72;
  filter: blur(1px);
}

@keyframes vaga {
  to { transform: translate(var(--x), var(--y)); }
}

@keyframes accendi {
  0%, 100% { opacity: 0; }
  12%, 34% { opacity: var(--max); }
  48% { opacity: 0; }
}

/* Movimento ridotto: rami fermi, lucciole ferme e meno */
@media (prefers-reduced-motion: reduce) {
  .rami,
  .lucciole,
  .ramo {
    animation: none;
  }

  .lucciole i {
    animation: none;
    opacity: .5;
  }

  .lucciole i:nth-child(n+6) {
    display: none;
  }
}
</style>
