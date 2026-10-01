<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { tema, cambiaTema } from './tema.js';
import { getFrase } from './giorno.js';
import { getOggi, controllaCambioGiorno } from './oggi.js';
import { getRicorrenze } from './ricorrenze.js';
import { giornoDi } from './mazzo.js';
import { condividi } from './condividi.js';
import frasi from './frasi.json';
import programma from './programma.json';
import ricorrenzePersonali from './ricorrenze.json';
import DataDelGiorno from './components/DataDelGiorno.vue';
import Frase from './components/Frase.vue';
import Icona from './components/Icona.vue';
import Guida from './components/Guida.vue';

const PILLS_URL = 'https://taffa-dev.github.io/Pills/';
// Il form prende il tema del Calendario dal link (e se lo ricorda)
const SUGGERIMENTI_URL = 'https://frase-celebre.taffa-dev.site/';

const oggi = ref(getOggi());

// Giorni passati della settimana in corso: da lunedì a oggi, niente futuro
const indietro = ref(0);
const giorniDaLunedi = computed(() => (oggi.value.getDay() + 6) % 7);
const giornoVisto = computed(() => {
  const data = new Date(oggi.value);
  data.setDate(data.getDate() - indietro.value);
  return data;
});
const frase = computed(() => getFrase(frasi, programma, giornoVisto.value));
const ricorrenze = computed(() => getRicorrenze(ricorrenzePersonali, giornoVisto.value));

function vai(passi) {
  indietro.value = Math.min(giorniDaLunedi.value, Math.max(0, indietro.value - passi));
}

function condividiGiorno() {
  condividi({ data: giornoVisto.value, frase: frase.value, ricorrenze: ricorrenze.value });
}

// Frecce della tastiera e scorrimento col dito
function tasto(evento) {
  if (evento.key === 'ArrowLeft') vai(-1);
  if (evento.key === 'ArrowRight') vai(1);
}
let inizioTocco = null;
function toccoIniziato(evento) {
  inizioTocco = { x: evento.touches[0].clientX, y: evento.touches[0].clientY };
}
function toccoFinito(evento) {
  if (!inizioTocco) return;
  const dx = evento.changedTouches[0].clientX - inizioTocco.x;
  const dy = evento.changedTouches[0].clientY - inizioTocco.y;
  inizioTocco = null;
  if (Math.abs(dx) > 60 && Math.abs(dx) > 2 * Math.abs(dy)) vai(dx > 0 ? -1 : 1);
}

// Pagina lasciata aperta: a mezzanotte (o al ritorno sulla scheda) passa al giorno nuovo
let fermaControllo;
onMounted(() => {
  window.addEventListener('keydown', tasto);
  fermaControllo = controllaCambioGiorno(oggi, () => {
    oggi.value = getOggi();
    indietro.value = 0;
  });
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', tasto);
  fermaControllo?.();
});
</script>

<template>
  <button class="icona in-alto a-sinistra" type="button" @click="cambiaTema"
    :aria-label="tema === 'light' ? 'Attiva tema scuro' : 'Attiva tema chiaro'">
    <Icona :nome="tema === 'light' ? 'luna' : 'sole'" />
  </button>
  <a class="icona in-alto a-destra" :href="PILLS_URL" aria-label="Vai a Pills">
    <Icona nome="pillole" />
  </a>

  <button v-show="indietro < giorniDaLunedi" class="icona freccia a-sinistra" type="button" @click="vai(-1)"
    aria-label="Giorno prima">
    <Icona nome="indietro" />
  </button>
  <button v-show="indietro > 0" class="icona freccia a-destra" type="button" @click="vai(1)"
    aria-label="Giorno dopo">
    <Icona nome="avanti" />
  </button>

  <button class="icona in-basso a-sinistra" type="button" @click="condividiGiorno" aria-label="Condividi">
    <Icona nome="condividi" />
  </button>
  <a class="icona in-basso a-destra" :href="`${SUGGERIMENTI_URL}?tema=${tema}`" aria-label="Proponi una frase">
    <Icona nome="proponi" />
  </a>

  <Guida :lunedi="giorniDaLunedi === 0" />

  <main class="calendario" @touchstart.passive="toccoIniziato" @touchend="toccoFinito">
    <Transition name="sfuma" mode="out-in">
      <div :key="giornoDi(giornoVisto)" class="foglio">
        <DataDelGiorno :data="giornoVisto" :ricorrenze="ricorrenze" />
        <Frase :frase="frase" />
      </div>
    </Transition>
  </main>
</template>

<style scoped>
.calendario {
  box-sizing: border-box;
  min-height: 100vh;
  min-height: 100dvh;
  /* Spazio per le icone in alto e in basso (e per le barre di sistema) */
  padding: calc(3rem + env(safe-area-inset-top)) 0 calc(3rem + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.foglio {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.sfuma-enter-active,
.sfuma-leave-active {
  transition: opacity 0.18s ease;
}

.sfuma-enter-from,
.sfuma-leave-to {
  opacity: 0;
}

/* Posizione e misure gemelle di quelle di Pills: se cambiano qui, vanno cambiate anche là */
.icona {
  position: fixed;
  z-index: 10;
  display: inline-flex;
  align-items: center;
  border: none;
  background: transparent;
  color: var(--color-3);
  padding: 0.35rem;
  font-size: 1rem;
  cursor: pointer;
  text-decoration: none;
  -webkit-tap-highlight-color: transparent;
  transition: opacity 0.2s ease, color var(--cambio-tema);
}

/* env(safe-area-inset-*): nell'app installata le icone restano fuori dalle barre di sistema */
.in-alto {
  top: calc(0.5rem + env(safe-area-inset-top));
}

.in-basso {
  bottom: calc(0.5rem + env(safe-area-inset-bottom));
}

.freccia {
  top: 50%;
  transform: translateY(-50%);
}

.a-sinistra {
  left: calc(0.5rem + env(safe-area-inset-left));
}

.a-destra {
  right: calc(0.5rem + env(safe-area-inset-right));
}

.icona:focus-visible {
  outline: 1px solid var(--color-3);
}

@media (hover: hover) and (pointer: fine) {
  .icona:hover {
    opacity: 0.7;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sfuma-enter-active,
  .sfuma-leave-active {
    transition: none;
  }
}
</style>
