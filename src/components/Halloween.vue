<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { tema } from '../tema.js';
import { creaMotore, TARATURA } from '../volo.js';

// Halloween (settimana del 31/10): pipistrelli (stesso motore di Pills) che volano dietro il foglio, ragnatele negli
// angoli (solo di giorno), grana della carta e, di notte, il lume di candela (alone; il bagliore del
// numero sta in DataDelGiorno.vue). A livello pagina, non per foglio. Colori da tema.css.
const rnd = (a, b) => a + Math.random() * (b - a);

// Ragnatela d'angolo: il primo e l'ultimo raggio corrono lungo i due bordi, così i fili partono e finiscono
// sul bordo dello schermo; tra un raggio e l'altro fili tesi che cedono un po' verso l'angolo. Seme fisso.
function disegnaRagnatela(seme) {
  const caso = (a, b) => { seme = (seme * 16807) % 2147483647; return a + (seme / 2147483647) * (b - a); };
  const O = [300, 0], R = 300;
  const interni = [104, 119, 133, 148, 163].map((a) => a + caso(-4, 4));
  const angoli = [90, ...interni, 180].map((a) => a * Math.PI / 180);
  const pt = (a, r) => [O[0] + Math.cos(a) * r, O[1] + Math.sin(a) * r];
  let d = '';
  for (const a of angoli) { const [x, y] = pt(a, R * 1.6); d += `M${O} L${x.toFixed(1)} ${y.toFixed(1)} `; }
  let rr = R * caso(.1, .16);
  for (let k = 1; k <= 7; k++) {
    rr += R * caso(.1, .17);
    for (let i = 0; i < angoli.length - 1; i++) {
      // Ogni tanto un filo manca (spezzato), e ogni tratto cede un po' a modo suo
      if (k > 1 && caso(0, 1) < .1) continue;
      const r0 = rr * caso(.95, 1.05), r1 = rr * caso(.95, 1.05);
      const [x0, y0] = pt(angoli[i], r0), [x1, y1] = pt(angoli[i + 1], r1);
      const am = (angoli[i] + angoli[i + 1]) / 2, [cx, cy] = pt(am, (r0 + r1) / 2 * caso(.8, .92));
      d += `M${x0.toFixed(1)} ${y0.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)} `;
    }
  }
  return d;
}
const filiAlto = disegnaRagnatela(5);
const filiBasso = disegnaRagnatela(23);

// Pipistrelli: il motore di volo (src/volo.js, identico in Pills) disegna voli sporadici ogni 10-40 s,
// più due già in volo all'apertura. Volano solo nelle fasce libere sopra il numero e sotto la frase
// (mai sul testo); sul telefono ne basta una, la più bassa. Se non ce n'è nessuna (schermo largo e
// basso) si vola subito sopra il numero.
const contenitore = ref(null);
const fermo = window.matchMedia('(prefers-reduced-motion: reduce)');
let motore, osservatore, ultima = '';

function metti() {
  const foglio = document.querySelector('.calendario .foglio:not([aria-hidden="true"])');
  const data = foglio?.querySelector('.data'), frase = foglio?.querySelector('.frase');
  if (!data || !frase) return;
  const H = innerHeight;
  const cima = data.getBoundingClientRect().top;
  const fondo = frase.getBoundingClientRect().bottom;
  const tutte = [[110, cima - 95], [fondo + 90, H - 130]].filter(([a, b]) => b - a > 24);
  const comode = tutte.filter(([a, b]) => b - a >= 60);
  const usate = (comode.length ? comode : tutte.length ? tutte : [[40, Math.max(100, cima - 30)]]).slice(innerWidth < 600 ? -1 : 0);
  motore.setFasce(usate);
}

function controlla() {
  const misura = `${innerWidth}x${innerHeight}`;
  if (misura !== ultima) { ultima = misura; metti(); }
}

// Movimento ridotto: nessun volo. Altrimenti parte (la prima volta con due pipistrelli già in volo)
function avvia() {
  if (fermo.matches) { motore.ferma(); return; }
  if (motore.pipistrelli.length) return;
  motore.avvia(contenitore.value);
  metti();
  motore.iniziale(2);
}

onMounted(() => {
  // L'opacità dell'svg (.42 di giorno, .7 di notte) sta nel CSS: il motore ci moltiplica la sua
  const baseSvg = () => (tema.value === 'dark' ? .7 : .42);
  motore = creaMotore({
    larghezzaBase(W, H) { const v = Math.min(W, H); return Math.min(Math.max(32 * (.75 + .14 * v / 100), 30), 34 + .06 * v); },
    velocita: (z) => 40 + 40 * z,           // px/s: i lontani sono più lenti
    sfocaturaMax: 1,                        // px di blur per i più lontani
    opacita: (z) => .55 + .45 * z,
    opacitaFg: () => TARATURA.FG_OPACITA / baseSvg()
  });
  if (import.meta.env.DEV) window.__pip = motore; // solo in sviluppo: per le prove
  // L'altezza dipende dall'impaginazione del foglio (ricorrenze, frase lunga): si segue la pila
  osservatore = new ResizeObserver(() => { ultima = ''; controlla(); });
  const pila = document.querySelector('.calendario .pila');
  if (pila) osservatore.observe(pila);
  window.addEventListener('resize', controlla);
  fermo.addEventListener('change', avvia);
  avvia();
});
onBeforeUnmount(() => {
  osservatore?.disconnect();
  window.removeEventListener('resize', controlla);
  fermo.removeEventListener('change', avvia);
  motore?.ferma();
  if (import.meta.env.DEV && window.__pip === motore) delete window.__pip;
});
</script>

<template>
  <div class="halloween" aria-hidden="true">
    <div class="grana"></div>
    <div class="alone"></div>
    <div class="ragnatela">
      <svg viewBox="-180 0 480 480"><path class="fili" :d="filiAlto" /></svg>
      <svg class="basso" viewBox="-180 0 480 480"><path class="fili" :d="filiBasso" /></svg>
    </div>
    <div ref="contenitore" class="pipistrelli"></div>
  </div>
</template>

<style scoped>
/* Ragnatele grandi come lo schermo: l'angolo in alto, più piccola quella in basso */
.halloween {
  --ragno-alto: clamp(260px, 34vmax, 560px);
  --ragno-basso: clamp(170px, 20vmax, 330px);
}

/* Tutto dietro il foglio (che sta a 2), sotto le icone (10); la grana sopra di lui, che è trasparente */
.grana,
.alone,
.ragnatela,
.pipistrelli {
  position: fixed;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 1;
}

/* Gli effetti entrano piano dopo il primo disegno */
.alone,
.ragnatela,
.pipistrelli {
  animation: entra 3s ease-out both;
}

@keyframes entra {
  from { opacity: 0; }
}

/* Grana della carta: più grossa sugli schermi densi, dove a 1:1 non si vedrebbe */
.grana {
  z-index: 3;
  opacity: .13;
  mix-blend-mode: multiply;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .3  0 0 0 0 .2  0 0 0 0 .1  0 0 0 .9 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

@media (min-resolution: 2dppx) {
  .grana {
    background-size: 330px;
    opacity: .15;
  }
}

:root[color-theme="dark"] .grana {
  mix-blend-mode: screen;
  opacity: .04;
}

/* Lume di candela (solo scuro): alone arancio morbido che tremola; il bagliore del numero è in
   DataDelGiorno.vue */
.alone {
  display: none;
  animation: entra 3s ease-out both, tremola 5.1s ease-in-out 3s infinite alternate;
  background: radial-gradient(ellipse 70% 55% at 50% 42%, #ff8a2a18, #ff8a2a0c 40%, #ff8a2a08 55%, #ff8a2a04 72%, #ff8a2a00 100%);
}

:root[color-theme="dark"] .alone {
  display: block;
}

@keyframes tremola {
  0% { opacity: .8; }
  45% { opacity: 1; }
  100% { opacity: .88; }
}

/* Ragnatela (solo di giorno): fili sottili nell'inchiostro scuro, come un'ombra stampata nell'angolo.
   I raggi continuano oltre l'ultimo giro e svaniscono (maschera circolare dall'angolo): niente fili
   che finiscono nel nulla */
:root[color-theme="dark"] .ragnatela {
  display: none;
}

.ragnatela svg {
  position: absolute;
  top: 0;
  right: 0;
  width: var(--ragno-alto);
  height: auto;
  -webkit-mask: radial-gradient(circle farthest-corner at 100% 0, #000 40%, rgb(0 0 0 / .5) 45%, rgb(0 0 0 / .15) 50%, transparent 55%);
  mask: radial-gradient(circle farthest-corner at 100% 0, #000 40%, rgb(0 0 0 / .5) 45%, rgb(0 0 0 / .15) 50%, transparent 55%);
}

/* La seconda nell'angolo opposto: stessa costruzione ruotata di mezzo giro, più piccola */
.ragnatela svg.basso {
  top: auto;
  right: auto;
  bottom: 0;
  left: 0;
  width: var(--ragno-basso);
  transform: rotate(180deg);
}

.fili {
  fill: none;
  stroke: var(--color-3);
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
  opacity: .22;
  transition: stroke var(--cambio-tema);
}

/* Pipistrelli: li crea e li muove volo.js (un transform per pipistrello); qui solo l'aspetto. Passano
   sopra le ragnatele senza sfumare (nessuna maschera) */
.pipistrelli :deep(.pip) {
  position: absolute;
  left: 0;
  top: 0;
  will-change: transform, opacity;
}

.pipistrelli :deep(svg) {
  display: block;
  width: 100%;
  aspect-ratio: 100 / 60;
  overflow: visible;
  fill: var(--color-3);
  opacity: .42;
  filter: blur(var(--sf, 0px));
  transition: fill var(--cambio-tema);
}

:root[color-theme="dark"] .pipistrelli :deep(svg) {
  fill: #553848;
  opacity: .7;
}

/* Movimento ridotto: i pipistrelli spariscono, il resto resta fermo */
@media (prefers-reduced-motion: reduce) {
  .pipistrelli {
    display: none;
  }

  .alone,
  .ragnatela {
    animation: none;
  }
}
</style>
