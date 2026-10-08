<script setup>
import { ref, computed, watch, watchEffect, nextTick, onMounted, onBeforeUnmount } from 'vue';
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
import Coriandoli from './components/Coriandoli.vue';
import { stagioneDi, applicaStagione } from './stagione.js';
import {
  elastico, spostato, torna, strappa, porta, riprendi, compare, scompare,
  DURATA_PASSO, DURATA_RITORNO, ATTESA_STRAPPO, DURATA_STRAPPO, STACCO
} from './movimento.js';

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
const foglioDi = (data) => ({ data, frase: getFrase(frasi, programma, data), ricorrenze: getRicorrenze(ricorrenzePersonali, data) });

// Ventaglio delle azioni in alto a destra: si chiude toccando altrove o con Esc
const aperto = ref(false);
const gruppo = ref(null);
function toccoFuori(evento) {
  if (aperto.value && !gruppo.value?.contains(evento.target)) aperto.value = false;
}

// Passaggio tra i giorni come in un blocco a strappo: avanti il foglio sopra si strappa e cade e
// sotto c'è il giorno dopo; indietro il foglio di prima risale e si riattacca sopra. Uno alla volta.
let passo = 1;
let strappoDalDito = null;
let inCorso = 0;
const puoAndare = (passi) => passi < 0 ? indietro.value < giorniDaLunedi.value : indietro.value > 0;
function vai(passi, dalDito = null) {
  if (strappo.value || inCorso || !puoAndare(passi)) return;
  passo = passi;
  strappoDalDito = dalDito;
  cascata.value = false;
  indietro.value -= passi;
}

// Entrata a cascata all'apertura (e sotto lo strappo): numero, anno, mese, frase, autore
const cascata = ref(true);

function condividiGiorno() {
  condividi({ data: giornoVisto.value, frase: frase.value, ricorrenze: ricorrenze.value });
}

// Frecce della tastiera e scorrimento col dito
function tasto(evento) {
  if (evento.key === 'Escape') aperto.value = false;
  if (evento.key === 'ArrowLeft') vai(-1);
  if (evento.key === 'ArrowRight') vai(1);
}

// Col dito verso sinistra (avanti) il foglio si solleva quanto lo si tira, pronto a strapparsi;
// verso destra (indietro), o dove non c'è un giorno, si sposta appena con resistenza. Al rilascio
// passa al giorno accanto se, proseguendo alla stessa velocità, andrebbe oltre un quarto di schermo;
// altrimenti torna a posto
const foglio = ref(null);
const anteprima = ref(null);
let tocco = null;
function toccoIniziato(evento) {
  if (evento.pointerType === 'mouse' || tocco || strappo.value || inCorso) return;
  tocco = { id: evento.pointerId, x: evento.clientX, y: evento.clientY, dx: 0, asse: null, punti: [], strappo: null };
}
function toccoMosso(evento) {
  if (evento.pointerId !== tocco?.id) return;
  const dx = evento.clientX - tocco.x;
  const dy = evento.clientY - tocco.y;
  if (!tocco.asse) {
    if (Math.hypot(dx, dy) < 10) return;
    tocco.asse = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    if (tocco.asse === 'x') foglio.value.getAnimations().forEach((a) => a.cancel());
  }
  if (tocco.asse !== 'x') return;
  tocco.punti = [...tocco.punti.filter((p) => evento.timeStamp - p.t < 100), { t: evento.timeStamp, x: evento.clientX }];
  tocco.dx = dx;
  const strappabile = dx < 0 && puoAndare(1);
  const riattaccabile = dx > 0 && puoAndare(-1);
  if (strappabile && !tocco.strappo) {
    tocco.strappo = strappa(foglio.value, { lato: -1 });
    // Sotto il foglio sollevato c'è già il giorno dopo
    anteprima.value = foglioDi(spostaGiorno(1));
  }
  if (tocco.strappo) porta(tocco.strappo, strappabile ? Math.min(1, -dx / (innerWidth * 0.6)) * STACCO * DURATA_PASSO : 0);
  if (riattaccabile && !tocco.ritorno) {
    // Il foglio di ieri, caduto, risale col dito sopra quello di oggi, che resta fermo
    tocco.ritorno = [];
    ritorno.value = foglioDi(spostaGiorno(-1));
    const questo = tocco;
    nextTick(() => {
      if (tocco !== questo) return;
      questo.ritorno = strappa(foglioRitorno.value, { lato: -1, indietro: true, durata: DURATA_RITORNO });
      porta(questo.ritorno, tempoRitorno(questo.dx));
    });
  }
  if (tocco.ritorno?.length) porta(tocco.ritorno, tempoRitorno(dx));
  foglio.value.style.transform = strappabile || riattaccabile ? '' : spostato(elastico(dx, innerWidth) * 0.5);
}
// Il dito porta il foglio che risale da appena visibile a quasi riattaccato, su quasi tutto lo
// schermo: lo segue con calma
const tempoRitorno = (dx) => (0.22 + 0.63 * Math.min(1, Math.max(0, dx) / (innerWidth * 0.9))) * DURATA_RITORNO;
function spostaGiorno(passi) {
  const data = new Date(giornoVisto.value);
  data.setDate(data.getDate() + passi);
  return data;
}
function toccoFinito(evento) {
  if (evento.pointerId !== tocco?.id) return;
  const { asse, dx, punti, strappo: strappoTirato, ritorno: ritornoTirato } = tocco;
  tocco = null;
  if (asse !== 'x') return;
  const primo = punti[0], ultimo = punti.at(-1);
  const velocita = evento.type === 'pointerup' && ultimo.t > primo.t ? (ultimo.x - primo.x) / (ultimo.t - primo.t) : 0;
  const passi = dx > 0 ? -1 : 1;
  const arrivo = dx + velocita * 200;
  const va = puoAndare(passi) && Math.sign(arrivo) === Math.sign(dx) && Math.abs(arrivo) > innerWidth / 4;
  if (strappoTirato && !(va && passi === 1)) {
    riprendi(strappoTirato, -1).addEventListener('finish', () => (anteprima.value = null));
  }
  // Strappato oltre la soglia dopo essere andato a destra: il foglio che risaliva si scarta, altrimenti
  // restava lì (insieme al giorno dopo sotto, in anteprima) e il foglio fermo a metà
  if (va && passi === 1) {
    ritornoTirato?.forEach((a) => a.cancel());
    ritorno.value = null;
    return vai(1, strappoTirato);
  }
  if (ritornoTirato) {
    if (!ritornoTirato.length) ritorno.value = null;
    else if (va && passi === -1) riattacca(ritornoTirato);
    else riprendi(ritornoTirato, -1).addEventListener('finish', () => (ritorno.value = null));
    return;
  }
  if (va) return vai(passi);
  if (foglio.value.style.transform) torna(foglio.value, elastico(dx, innerWidth) * 0.5, velocita);
}
// Il foglio tirato su dal dito finisce di riattaccarsi mentre quello di oggi, sotto, svanisce; poi
// diventa il foglio vero senza altri movimenti
const ritorno = ref(null);
const foglioRitorno = ref(null);
let senzaMovimento = false;
function riattacca(animazioni) {
  inCorso++;
  const resto = DURATA_RITORNO - animazioni[0].currentTime;
  foglio.value.animate({ opacity: [1, 0] }, { duration: resto, fill: 'forwards' });
  riprendi(animazioni, 1).onfinish = () => {
    inCorso--;
    senzaMovimento = true;
    vai(-1);
    ritorno.value = null;
  };
}

// Avanti: esce il foglio sopra, strappandosi; quello nuovo è sotto e compare mentre si stacca.
// Indietro: il foglio che entra risale sopra; quello vecchio resta sotto e svanisce.
function esceFoglio(el, fatto) {
  if (strappo.value || senzaMovimento) return fatto();
  inCorso++;
  const finito = () => { inCorso--; fatto(); };
  if (passo === 1) {
    el.style.zIndex = 1;
    const animazioni = strappoDalDito ?? strappa(el, { lato: -1 });
    riprendi(animazioni, 1).onfinish = () => {
      anteprima.value = null;
      finito();
    };
  } else {
    scompare(el, DURATA_RITORNO).onfinish = finito;
  }
  strappoDalDito = null;
}
function entraFoglio(el, fatto) {
  if (senzaMovimento) {
    senzaMovimento = false;
    return fatto();
  }
  if (strappo.value || cascata.value) return fatto();
  // Se l'ha tirato il dito, il giorno nuovo era già sotto (anteprima)
  if (passo === 1) return anteprima.value ? fatto() : (compare(el).onfinish = fatto);
  inCorso++;
  el.style.zIndex = 1;
  strappa(el, { lato: -1, indietro: true, durata: DURATA_RITORNO })[0].onfinish = () => {
    inCorso--;
    el.style.zIndex = '';
    fatto();
  };
}

// Lo strappo: aprendo il sito il giorno dopo l'ultima visita, o a mezzanotte con la pagina aperta,
// il foglio del giorno prima si stacca e cade, e sotto c'è quello di oggi
const ULTIMO_GIORNO = 'calendario-ultimo-giorno';
const strappo = ref(null);
const foglioStrappato = ref(null);
function ricordaGiorno() {
  try { localStorage.setItem(ULTIMO_GIORNO, giornoDi(oggi.value)); } catch (e) { }
}
async function strappaFoglio(data) {
  strappo.value = foglioDi(data);
  cascata.value = true;
  await nextTick();
  strappa(foglioStrappato.value, { attesa: ATTESA_STRAPPO, durata: DURATA_STRAPPO })[0].onfinish = () => (strappo.value = null);
}

// Prima del primo disegno, perché il foglio di oggi aspetti lo strappo per entrare.
// In sviluppo ?strappo lo fa vedere a ogni apertura
let ultimo = null;
try { ultimo = localStorage.getItem(ULTIMO_GIORNO); } catch (e) { }
if ((import.meta.env.DEV && new URLSearchParams(location.search).has('strappo'))
  || (ultimo && ultimo < giornoDi(oggi.value))) {
  const ieri = new Date(oggi.value);
  ieri.setDate(ieri.getDate() - 1);
  strappaFoglio(ieri);
}
ricordaGiorno();

// Compleanno sul foglio visto (all'apertura o tornandoci indietro): coriandoli dal basso, a foglio già
// entrato. Dopo lo strappo del giorno nuovo il foglio entra più tardi
const scoppio = ref(0);
const compleanno = computed(() => ricorrenze.value.some((nome) => /^compleanno/i.test(nome)));
let attesaScoppio;
watch(() => [giornoDi(giornoVisto.value), compleanno.value], ([, festa]) => {
  clearTimeout(attesaScoppio);
  if (festa) attesaScoppio = setTimeout(() => scoppio.value++, strappo.value ? ATTESA_STRAPPO + 1100 : 700);
}, { immediate: true });
onBeforeUnmount(() => clearTimeout(attesaScoppio));

// Pagina lasciata aperta: a mezzanotte (o al ritorno sulla scheda) passa al giorno nuovo
let fermaControllo;
onMounted(() => {
  window.addEventListener('keydown', tasto);
  window.addEventListener('pointerdown', toccoFuori);
  fermaControllo = controllaCambioGiorno(oggi, () => {
    // Si strappa il foglio che si stava guardando, se era quello del giorno
    const visto = indietro.value === 0 && !strappo.value ? new Date(oggi.value) : null;
    if (visto) strappaFoglio(visto);
    oggi.value = getOggi();
    indietro.value = 0;
    ricordaGiorno();
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
  <Coriandoli :scoppio="scoppio" />

  <button v-show="indietro < giorniDaLunedi" class="icona freccia a-sinistra" type="button" @click="vai(-1)"
    aria-label="Giorno prima">
    <Icona nome="indietro" />
  </button>
  <button v-show="indietro > 0" class="icona freccia a-destra" type="button" @click="vai(1)"
    aria-label="Giorno dopo">
    <Icona nome="avanti" />
  </button>

  <!-- Le azioni stanno raccolte in alto a sinistra: i quattro quadratini le aprono a ventaglio attorno a sé -->
  <div ref="gruppo" :class="['gruppo', { aperto }]">
    <button class="icona apri" type="button" @click="aperto = !aperto" :aria-expanded="aperto"
      aria-controls="azioni" :aria-label="aperto ? 'Chiudi le azioni' : 'Altre azioni'">
      <Icona nome="gruppo" />
    </button>
    <!-- Da sinistra a destra (da sotto i quadratini al loro fianco): tema, proponi, condividi.
         Il tema lascia aperto il ventaglio, per riprovarlo -->
    <nav id="azioni" class="voci" aria-label="Azioni">
      <button class="icona voce" style="--x: 0rem; --y: 4.25rem; --i: 0" type="button" :tabindex="aperto ? 0 : -1"
        @click="cambiaTema" :aria-label="tema === 'light' ? 'Attiva tema scuro' : 'Attiva tema chiaro'">
        <Icona :nome="tema === 'light' ? 'luna' : 'sole'" />
      </button>
      <a class="icona voce" style="--x: 3rem; --y: 3rem; --i: 1" :tabindex="aperto ? 0 : -1"
        :href="`${SUGGERIMENTI_URL}?tema=${tema}`" aria-label="Proponi una frase">
        <Icona nome="proponi" />
      </a>
      <button class="icona voce" style="--x: 4.25rem; --y: 0rem; --i: 2" type="button" :tabindex="aperto ? 0 : -1"
        @click="condividiGiorno(); aperto = false" aria-label="Condividi">
        <Icona nome="condividi" />
      </button>
    </nav>
  </div>

  <!-- Pills in alto a destra, dove in Pills c'è il link al Calendario -->
  <a class="icona pills" :href="PILLS_URL" aria-label="Vai a Pills">
    <Icona nome="pillole" />
  </a>

  <main class="calendario" @pointerdown="toccoIniziato" @pointermove="toccoMosso" @pointerup="toccoFinito"
    @pointercancel="toccoFinito">
    <!-- I fogli stanno uno sopra l'altro: quello che esce, quello che entra e quello strappato -->
    <div class="pila">
      <div v-if="anteprima" class="foglio" aria-hidden="true">
        <DataDelGiorno :data="anteprima.data" :ricorrenze="anteprima.ricorrenze" />
        <Frase :frase="anteprima.frase" />
      </div>
      <Transition :css="false" @leave="esceFoglio" @enter="entraFoglio">
        <div :key="giornoDi(giornoVisto)" ref="foglio" :class="['foglio', { cascata }]"
          :style="{ '--attesa': strappo ? `${ATTESA_STRAPPO + 300}ms` : '0ms' }">
          <div class="ombra-carta">
            <div class="carta"></div>
          </div>
          <DataDelGiorno :data="giornoVisto" :ricorrenze="ricorrenze" />
          <Frase :frase="frase" />
        </div>
      </Transition>
      <div v-if="ritorno" ref="foglioRitorno" class="foglio sopra" aria-hidden="true">
        <div class="ombra-carta">
          <div class="carta"></div>
        </div>
        <DataDelGiorno :data="ritorno.data" :ricorrenze="ritorno.ricorrenze" />
        <Frase :frase="ritorno.frase" />
      </div>
      <div v-if="strappo" ref="foglioStrappato" class="foglio strappato" aria-hidden="true">
        <div class="ombra-carta">
          <div class="carta"></div>
        </div>
        <DataDelGiorno :data="strappo.data" :ricorrenze="strappo.ricorrenze" />
        <Frase :frase="strappo.frase" />
      </div>
    </div>
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
  /* Il foglio che esce o cade non allarga la pagina; lo scorrimento in verticale resta al browser */
  overflow: hidden;
  overflow: clip;
  touch-action: pan-y pinch-zoom;
}

/* I fogli nella stessa cella, centrati: quello che esce non sposta quello che entra */
.pila {
  display: grid;
}

/* Ogni foglio ha la sua carta (src/movimento.js), invisibile finché non si stacca */
.foglio {
  grid-area: 1 / 1;
  align-self: center;
  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Cascata: ogni parte sale di poco e si mette a fuoco, 70ms dopo la precedente */
.cascata :deep(.giorno),
.cascata :deep(.anno),
.cascata :deep(.mese),
.cascata :deep(blockquote),
.cascata :deep(.autore) {
  animation: entra 0.7s cubic-bezier(0.05, 0.7, 0.1, 1) both;
  animation-delay: calc(var(--attesa) + var(--n) * 70ms);
}

.cascata :deep(.giorno) { --n: 0; }
.cascata :deep(.anno) { --n: 1; }
.cascata :deep(.mese) { --n: 2; }
.cascata :deep(blockquote) { --n: 3; }
.cascata :deep(.autore) { --n: 4; }

@keyframes entra {
  from {
    opacity: 0;
    transform: translateY(10px);
    filter: blur(6px);
  }
}

@keyframes appare {
  from {
    opacity: 0;
  }
}

/* Il foglio strappato copre quello di oggi finché non cade: la carta ha il colore della pagina */
.strappato,
.sopra {
  pointer-events: none;
}

/* Il foglio di ieri che risale col dito sta sopra quello di oggi */
.sopra {
  z-index: 1;
}

/* L'ombra sta fuori dalla carta: il bordo strappato (clip-path) la taglierebbe */
.ombra-carta {
  position: absolute;
  inset: 0;
  z-index: -1;
}

.carta {
  position: absolute;
  background-color: var(--color-bg);
}

/* Misure gemelle di quelle di Pills: se cambiano qui, vanno cambiate anche là.
   Icona di 20px in un'area da toccare di 48px (Material 48dp, Apple 44pt, WCAG 2.5.5 44px) */
.icona {
  z-index: 10;
  display: inline-flex;
  align-items: center;
  border: none;
  background: transparent;
  color: var(--color-3);
  padding: 0.875rem;
  font-size: 1.25rem;
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
.gruppo {
  position: fixed;
  z-index: 10;
  top: env(safe-area-inset-top);
  left: env(safe-area-inset-left);
}

.pills {
  position: fixed;
  top: env(safe-area-inset-top);
  right: env(safe-area-inset-right);
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
  left: 0;
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

/* Frecce larghe 44px: lo spazio ai lati del foglio resta quello riservato da --u in DataDelGiorno */
.freccia {
  position: fixed;
  padding: 0.875rem 0.75rem;
  top: 50%;
  transform: translateY(-50%);
}

.a-sinistra {
  left: env(safe-area-inset-left);
}

.a-destra {
  right: env(safe-area-inset-right);
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
  /* Solo dissolvenze, senza spostamenti */
  .cascata :deep(.giorno),
  .cascata :deep(.anno),
  .cascata :deep(.mese),
  .cascata :deep(blockquote),
  .cascata :deep(.autore) {
    animation-name: appare;
  }

  .voce,
  .aperto .voce,
  .apri :deep(svg),
  .icona :deep(svg) {
    transition: none;
  }
}
</style>
