<script setup>
import { ref, computed, watchEffect, onMounted, onBeforeUnmount } from 'vue';
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
import Petali from './components/Petali.vue';
import { stagioneDi, applicaStagione } from './stagione.js';

const PILLS_URL = 'https://taffa-dev.github.io/Pills/';
// Il form prende il tema del Calendario dal link (e se lo ricorda)
const SUGGERIMENTI_URL = 'https://frase-celebre.taffa-dev.site/';

const oggi = ref(getOggi());

// Tema stagionale (Pasqua): colori e petali; segue il giorno se la pagina resta aperta
const stagione = computed(() => stagioneDi(oggi.value));
watchEffect(() => applicaStagione(stagione.value));

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

// Ventaglio delle azioni in alto a destra: si chiude toccando altrove o con Esc
const aperto = ref(false);
const gruppo = ref(null);
function toccoFuori(evento) {
  if (aperto.value && !gruppo.value?.contains(evento.target)) aperto.value = false;
}

function vai(passi) {
  indietro.value = Math.min(giorniDaLunedi.value, Math.max(0, indietro.value - passi));
}

function condividiGiorno() {
  condividi({ data: giornoVisto.value, frase: frase.value, ricorrenze: ricorrenze.value });
}

// Frecce della tastiera e scorrimento col dito
function tasto(evento) {
  if (evento.key === 'Escape') aperto.value = false;
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
  window.addEventListener('pointerdown', toccoFuori);
  fermaControllo = controllaCambioGiorno(oggi, () => {
    oggi.value = getOggi();
    indietro.value = 0;
  });
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', tasto);
  window.removeEventListener('pointerdown', toccoFuori);
  fermaControllo?.();
});
</script>

<template>
  <Petali v-if="stagione === 'pasqua'" />

  <button v-show="indietro < giorniDaLunedi" class="icona freccia a-sinistra" type="button" @click="vai(-1)"
    aria-label="Giorno prima">
    <Icona nome="indietro" />
  </button>
  <button v-show="indietro > 0" class="icona freccia a-destra" type="button" @click="vai(1)"
    aria-label="Giorno dopo">
    <Icona nome="avanti" />
  </button>

  <button class="icona tema" type="button" @click="cambiaTema"
    :aria-label="tema === 'light' ? 'Attiva tema scuro' : 'Attiva tema chiaro'">
    <Icona :nome="tema === 'light' ? 'luna' : 'sole'" />
  </button>

  <!-- Le altre azioni stanno raccolte in alto a destra: i quattro quadratini le aprono a ventaglio attorno a sé -->
  <div ref="gruppo" :class="['gruppo', { aperto }]">
    <button class="icona apri" type="button" @click="aperto = !aperto" :aria-expanded="aperto"
      aria-controls="azioni" :aria-label="aperto ? 'Chiudi le azioni' : 'Altre azioni'">
      <Icona nome="gruppo" />
    </button>
    <!-- Dal basso verso l'alto: Pills, condividi, proponi -->
    <nav id="azioni" class="voci" aria-label="Azioni">
      <a class="icona voce" style="--x: -2.7rem; --y: 0rem; --i: 0" :tabindex="aperto ? 0 : -1"
        :href="`${SUGGERIMENTI_URL}?tema=${tema}`" aria-label="Proponi una frase">
        <Icona nome="proponi" />
      </a>
      <button class="icona voce" style="--x: -1.95rem; --y: 1.95rem; --i: 1" type="button" :tabindex="aperto ? 0 : -1"
        @click="condividiGiorno(); aperto = false" aria-label="Condividi">
        <Icona nome="condividi" />
      </button>
      <a class="icona voce" style="--x: 0rem; --y: 2.7rem; --i: 2" :tabindex="aperto ? 0 : -1" :href="PILLS_URL"
        aria-label="Vai a Pills">
        <Icona nome="pillole" />
      </a>
    </nav>
  </div>

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
  /* Sopra i petali lontani, sotto quelli vicini */
  position: relative;
  z-index: 2;
  box-sizing: border-box;
  min-height: 100vh;
  min-height: 100dvh;
  /* Spazio per le icone in alto (e per le barre di sistema), uguale in basso per restare centrato */
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

/* Misure gemelle di quelle di Pills: se cambiano qui, vanno cambiate anche là */
.icona {
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
  transition: color var(--cambio-tema);
}

/* Discrete finché non le si indica: l'opacità sta sull'icona, così non si somma a quella del ventaglio */
.icona :deep(svg) {
  opacity: 0.55;
  transition: opacity 0.2s ease;
}

/* env(safe-area-inset-*): nell'app installata le icone restano fuori dalle barre di sistema */
.tema {
  position: fixed;
  top: calc(0.5rem + env(safe-area-inset-top));
  left: calc(0.5rem + env(safe-area-inset-left));
}

.gruppo {
  position: fixed;
  z-index: 10;
  top: calc(0.5rem + env(safe-area-inset-top));
  right: calc(0.5rem + env(safe-area-inset-right));
}

/* Aperto il ventaglio, i quattro quadratini ruotano e diventano un rombo */
.apri :deep(svg) {
  transition: opacity 0.2s ease, transform 0.3s ease;
}

.aperto .apri :deep(svg) {
  opacity: 1;
  transform: rotate(45deg);
}

/* Le voci partono da sotto il + e si aprono a quarto di cerchio verso il foglio, una dopo l'altra */
.voce {
  position: absolute;
  top: 0;
  right: 0;
  opacity: 0;
  visibility: hidden;
  transform: translate(0, 0) scale(0.6);
  transition: transform 0.28s ease, opacity 0.2s ease, visibility 0s linear 0.28s, color var(--cambio-tema);
  transition-delay: calc((2 - var(--i)) * 40ms), calc((2 - var(--i)) * 40ms), 0.28s, 0s;
}

.aperto .voce {
  opacity: 1;
  visibility: visible;
  transform: translate(var(--x), var(--y)) scale(1);
  transition-delay: calc(var(--i) * 50ms), calc(var(--i) * 50ms), 0s, 0s;
}

.freccia {
  position: fixed;
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
  outline: none;
}

.icona:focus-visible :deep(svg) {
  opacity: 1;
}

@media (hover: hover) and (pointer: fine) {
  .icona:hover :deep(svg) {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sfuma-enter-active,
  .sfuma-leave-active,
  .voce,
  .aperto .voce,
  .apri :deep(svg),
  .icona :deep(svg) {
    transition: none;
  }
}
</style>
