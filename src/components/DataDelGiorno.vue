<script setup>
import { MESI, impaginazione } from '../foglio.js';

const props = defineProps({
  data: { type: Date, required: true },
  ricorrenze: { type: Array, default: () => [] } // nomi, sotto il mese e sopra la riga
});

const giorno = props.data.getDate();
const mese = MESI[props.data.getMonth()];
// Correzioni dall'inchiostro reale delle cifre (vedi foglio.js), in unità --u
const { spostaGiorno, vicinoAnno, spazioMese } = impaginazione(giorno, mese);
const correzioni = { '--sposta-giorno': spostaGiorno, '--vicino-anno': vicinoAnno, '--spazio-mese': spazioMese };
const anno = props.data.getFullYear();
// Estate: la riga è un'onda continua (un periodo ogni 50 unità, 8 periodi)
let onda = 'M0 7 Q12.5 1.5 25 7';
for (let x = 50; x <= 400; x += 25) onda += ` T${x} 7`;
</script>

<template>
  <div class="data" :style="correzioni">
    <div class="numeri">
      <div class="giorno" :data-g="giorno">{{ giorno }}</div>
      <div class="anno">{{ anno }}</div>
    </div>
    <div :class="['mese', { 'con-ricorrenze': ricorrenze.length }]">
      <span>{{ mese }}</span>
      <!-- Ornamento delle stagioni (luna a Halloween, stella a Natale), al centro della riga: vedi sotto -->
      <span class="luna" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M15 2a10 10 0 1 0 7 17A8 8 0 0 1 15 2z" /></svg>
      </span>
      <span class="stella" aria-hidden="true">
        <svg viewBox="-12 -12 24 24"><path d="M0-12 2.2-2.2 12 0 2.2 2.2 0 12-2.2 2.2-12 0-2.2-2.2Z" /></svg>
      </span>
      <!-- Estate: onda che scorre piano al posto della riga, con le estremità sfumate -->
      <span class="mare" aria-hidden="true">
        <svg viewBox="0 0 400 14" preserveAspectRatio="none"><path :d="onda" /></svg>
      </span>
      <p v-if="ricorrenze.length" class="ricorrenze">
        <span v-for="nome in ricorrenze" :key="nome">{{ nome }}</span>
      </p>
    </div>
  </div>
</template>

<style scoped>
.data {
  /* Unità delle misure: 1px sugli schermi larghi, meno sui telefoni, dove "28 2026" a 300px non ci
     starebbe; lascia libere ai lati le frecce dei giorni passati */
  --u: min(1px, (100vw - 5.5rem) / 440);
  font-family: "Abhaya Libre", serif;
  font-weight: 800;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: fit-content;
}

.numeri {
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 0.6;
}

.giorno,
.anno,
.mese {
  transition: color var(--cambio-tema), border-color var(--cambio-tema);
}

.giorno {
  color: var(--color-1);
  font-size: calc(300 * var(--u));
  padding-right: calc(10 * var(--u));
  padding-bottom: calc(8 * var(--u));
  position: relative;
  top: calc(var(--sposta-giorno) * var(--u));
  margin-right: calc(var(--vicino-anno) * var(--u));
}

.anno {
  color: var(--color-3);
  writing-mode: vertical-lr;
  font-size: calc(96 * var(--u));
}

.mese {
  color: var(--color-2);
  font-size: calc(78 * var(--u));
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 0.8;
  margin-top: calc(var(--spazio-mese) * var(--u));
  border-bottom: 1px solid var(--color-3);
  padding: 0 15%;
  padding-bottom: 10%;
}

/* Halloween: una luna inclinata al centro della riga, che si interrompe attorno a lei (la riga diventa
   un filo mascherato, il bordo resta per non spostare nulla). A Natale lo stesso con una stella d'oro,
   un po' più piccola. Nelle altre stagioni non ci sono */
.luna,
.stella {
  display: none;
}

:root[stagione="halloween"] .mese,
:root[stagione="natale"] .mese {
  position: relative;
  /* Mezzo ornamento più un respiro di 10 unità (almeno 7px) per lato */
  --vuoto: calc(max(18px, 24 * var(--u)) / 2 + max(7px, 10 * var(--u)));
  border-bottom-color: transparent;
}

:root[stagione="natale"] .mese {
  --vuoto: calc(max(11px, 16 * var(--u)) / 2 + max(7px, 10 * var(--u)));
}

:root[stagione="halloween"] .mese::after,
:root[stagione="natale"] .mese::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 1px;
  background-color: var(--color-3);
  transition: background-color var(--cambio-tema);
  -webkit-mask: linear-gradient(90deg, #000 calc(50% - var(--vuoto)), transparent calc(50% - var(--vuoto)) calc(50% + var(--vuoto)), #000 calc(50% + var(--vuoto)));
  mask: linear-gradient(90deg, #000 calc(50% - var(--vuoto)), transparent calc(50% - var(--vuoto)) calc(50% + var(--vuoto)), #000 calc(50% + var(--vuoto)));
}

:root[stagione="halloween"] .luna {
  display: block;
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translate(-50%, calc(50% + 0.5px)) rotate(-25deg);
  line-height: 0;
}

:root[stagione="natale"] .stella {
  display: block;
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translate(-50%, calc(50% + 0.5px));
  line-height: 0;
}

.stella svg {
  display: block;
  height: max(11px, calc(16 * var(--u)));
  aspect-ratio: 1;
  overflow: visible;
  animation: brilla 4.5s ease-in-out infinite alternate;
}

.stella path {
  fill: var(--ornamento);
  stroke: var(--ornamento);
  transition: fill var(--cambio-tema), stroke var(--cambio-tema);
}

@keyframes brilla {
  from { opacity: 0.75; }
  to { opacity: 1; }
}

.luna svg {
  display: block;
  height: max(18px, calc(24 * var(--u)));
  aspect-ratio: 1;
}

.luna path {
  fill: var(--color-1);
  transition: fill var(--cambio-tema);
}

/* Estate: la riga diventa un'onda continua che scorre piano. Il bordo resta (trasparente) per non
   spostare nulla; l'onda è centrata su di lui e sfuma alle estremità. Di notte la linea è più marcata */
.mare {
  display: none;
}

:root[stagione="estate"] .mese {
  position: relative;
  border-bottom-color: transparent;
}

:root[stagione="estate"] .mare {
  display: block;
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: max(10px, calc(14 * var(--u)));
  transform: translateY(calc(50% + 0.5px));
  overflow: hidden;
  -webkit-mask: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent);
  mask: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent);
}

.mare svg {
  display: block;
  width: 200%;
  height: 100%;
  animation: mare 18s linear infinite;
}

.mare path {
  fill: none;
  stroke: var(--mare);
  stroke-width: 1.8;
  stroke-linecap: round;
  vector-effect: non-scaling-stroke;
  transition: stroke var(--cambio-tema);
}

:root[color-theme="dark"] .mare path {
  stroke-width: 2.4;
}

@keyframes mare {
  to { transform: translateX(-50%); }
}

/* Lume di candela (solo di notte): il bagliore è una copia sfocata del numero dietro di lui, e si
   anima solo l'opacità. L'alone arancio sta in Halloween.vue */
:root[stagione="halloween"] .giorno::after {
  content: attr(data-g);
  position: absolute;
  inset: 0;
  z-index: -1;
  color: #ffb050;
  filter: blur(calc(20 * var(--u)));
  opacity: 0;
  transition: opacity var(--cambio-tema);
  pointer-events: none;
}

:root[stagione="halloween"][color-theme="dark"] .giorno::after {
  opacity: 0.3;
  animation: fiamma 7.3s ease-in-out infinite;
}

@keyframes fiamma {
  0%, 100% { opacity: 0.28; }
  18% { opacity: 0.34; }
  31% { opacity: 0.23; }
  52% { opacity: 0.32; }
  67% { opacity: 0.22; }
  84% { opacity: 0.36; }
}

@media (prefers-reduced-motion: reduce) {
  :root[stagione="halloween"][color-theme="dark"] .giorno::after,
  .stella svg,
  .mare svg {
    animation: none;
  }
}

/* Con le ricorrenze la riga sta subito sotto di loro */
.mese.con-ricorrenze {
  padding-bottom: calc(16 * var(--u));
}

.ricorrenze {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin: calc(24 * var(--u)) 0 0;
  font-size: 0.95rem;
  font-weight: 700;
  line-height: normal;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-align: center;
  white-space: nowrap;
  color: var(--color-1);
  transition: color var(--cambio-tema);
}
</style>
