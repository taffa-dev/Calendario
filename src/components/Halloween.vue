<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';

// Halloween (settimana del 31/10): pipistrelli di Pills che volano dietro il foglio, ragnatele negli
// angoli (solo di giorno), grana della carta e, di notte, il lume di candela (alone; il bagliore del
// numero sta in DataDelGiorno.vue). A livello pagina, non per foglio. Colori da tema.css.
const SU = 'M46 28 C40 18 26 8 9 3 C13 9 14 15 12 21 C18 19 24 21 26 27 C30 25 36 27 38 33 C41 30 44 30 46 35 Z';
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

// Pochi pipistrelli, a velocità costante in px/s così sugli schermi larghi non sfrecciano. Creati una
// volta sola; ne cambia l'altezza quando cambia la pagina
const voli = ref([]);
const QUANTI = 2;

// Fasce libere sopra il numero e sotto la frase (mai sul testo); sul telefono ne basta una, la più bassa
function metti() {
  const foglio = document.querySelector('.calendario .foglio:not([aria-hidden="true"])');
  const data = foglio?.querySelector('.data'), frase = foglio?.querySelector('.frase');
  if (!data || !frase) return;
  const H = innerHeight;
  const cima = data.getBoundingClientRect().top;
  const fondo = frase.getBoundingClientRect().bottom;
  const fasce = [[110, cima - 95], [fondo + 90, H - 130]].filter(([a, b]) => b - a > 24);
  const comode = fasce.filter(([a, b]) => b - a >= 60);
  const usate = (comode.length ? comode : fasce.length ? fasce : [[110, 130]]).slice(innerWidth < 600 ? -1 : 0);
  voli.value.forEach((volo, i) => {
    const [a, b] = usate[i % usate.length];
    volo.nascosto = i >= usate.length;
    volo.top = Math.round(a + volo.t * (b - a));
  });
}

let osservatore, ultima = '';
function controlla() {
  const misura = `${innerWidth}x${innerHeight}`;
  if (misura !== ultima) { ultima = misura; metti(); }
}

onMounted(() => {
  voli.value = Array.from({ length: QUANTI }, (_, i) => {
    const vic = rnd(.4, 1), durata = (innerWidth + 120) / (35 + vic * 45);
    return {
      t: Math.random(),
      top: 0,
      nascosto: false,
      daDestra: Math.random() < .5,
      opacity: .6 + vic * .4,
      durata,
      rit: -((i + Math.random()) / QUANTI) * durata,
      suGiu: rnd(2.6, 4.4),
      zigzag: rnd(1.2, 2),
      larghezza: `clamp(30px, calc(${(18 + vic * 22).toFixed(1)} * (.75px + .14vmin)), 34px + 6vmin)`,
      battito: rnd(.28, .4)
    };
  });
  // L'altezza dipende dall'impaginazione del foglio (ricorrenze, frase lunga): si segue la pila
  osservatore = new ResizeObserver(() => { ultima = ''; controlla(); });
  const pila = document.querySelector('.calendario .pila');
  if (pila) osservatore.observe(pila);
  window.addEventListener('resize', controlla);
  metti();
});
onBeforeUnmount(() => {
  osservatore?.disconnect();
  window.removeEventListener('resize', controlla);
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
    <div class="pipistrelli">
      <div v-for="(v, i) in voli" :key="i" :class="['volo', { 'da-destra': v.daDestra }]" :style="{
        top: v.top + 'px',
        display: v.nascosto ? 'none' : null,
        opacity: v.opacity,
        animationDuration: v.durata + 's',
        animationDelay: v.rit + 's'
      }">
        <div class="su-giu" :style="{ animationDuration: v.suGiu + 's', animationDelay: v.rit + 's' }">
          <div class="zigzag" :style="{ animationDuration: v.zigzag + 's', animationDelay: v.rit + 's' }">
            <svg viewBox="0 0 100 60" :style="{ width: v.larghezza, '--battito': v.battito + 's' }">
              <g class="ali-fluide">
                <path :d="SU" />
                <path :d="SU" transform="translate(100 0) scale(-1 1)" />
              </g>
              <ellipse cx="50" cy="32" rx="5" ry="9" />
              <circle cx="50" cy="22" r="5" />
              <path d="M45.5 20 L44 11 L49 17 Z M54.5 20 L56 11 L51 17 Z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
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

/* Pipistrelli di Pills: volo + su-giù + zigzag con durate diverse, ali interpolate. */
.pipistrelli {
  container-type: size;
}

.pipistrelli svg {
  display: block;
  aspect-ratio: 100 / 60;
  overflow: visible;
  fill: var(--color-3);
  opacity: .42;
  transition: fill var(--cambio-tema);
}

:root[color-theme="dark"] .pipistrelli svg {
  fill: #553848;
  opacity: .7;
}

.volo {
  position: absolute;
  left: 0;
  animation: da-sinistra linear infinite;
}

.volo.da-destra {
  animation-name: da-destra;
}

@keyframes da-sinistra {
  from { transform: translateX(-60px); }
  to { transform: translateX(calc(100cqw + 60px)); }
}

@keyframes da-destra {
  from { transform: translateX(calc(100cqw + 60px)); }
  to { transform: translateX(-60px); }
}

.su-giu {
  animation: su-giu ease-in-out infinite;
}

@keyframes su-giu {
  0%, 100% { transform: translateY(0); }
  15% { transform: translateY(-28px); }
  30% { transform: translateY(-10px); }
  42% { transform: translateY(22px); }
  58% { transform: translateY(6px); }
  70% { transform: translateY(34px); }
  85% { transform: translateY(-14px); }
}

.zigzag {
  animation: zigzag ease-in-out infinite;
}

@keyframes zigzag {
  0%, 100% { transform: translateX(0) rotate(0); }
  20% { transform: translateX(14px) rotate(9deg); }
  45% { transform: translateX(-10px) rotate(-12deg); }
  65% { transform: translateX(8px) rotate(5deg); }
  85% { transform: translateX(-16px) rotate(-8deg); }
}

.ali-fluide path {
  animation: battito-fluido var(--battito) ease-in-out infinite;
}

@keyframes battito-fluido {
  0%, 100% { d: path("M46 28 C40 18 26 8 9 3 C13 9 14 15 12 21 C18 19 24 21 26 27 C30 25 36 27 38 33 C41 30 44 30 46 35 Z"); }
  20% { d: path("M46 28 C38 22 20 20 3 24 C9 28 12 32 10 38 C16 34 22 35 24 41 C28 36 35 36 37 42 C40 37 43 36 46 38 Z"); }
  40% { d: path("M46 29 C38 31 25 39 13 53 C17 50 20 50 21 55 C24 50 28 49 30 53 C32 48 36 46 38 48 C40 44 43 41 46 40 Z"); }
  70% { d: path("M46 28 C38 22 20 20 3 24 C9 28 12 32 10 38 C16 34 22 35 24 41 C28 36 35 36 37 42 C40 37 43 36 46 38 Z"); }
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
