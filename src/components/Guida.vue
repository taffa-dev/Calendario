<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';

// Guida della prima visita: un fumetto accanto a ogni pulsante (tema, Pills, giorni passati, condividi, proponi).
// Non bloccano nulla e spariscono al primo tocco, clic o tasto, oppure da soli dopo qualche secondo.
// Si vedono una volta sola per browser (localStorage).
const CHIAVE = 'calendario-guida-vista';
const DURATA = 8000;

// Di lunedì non ci sono giorni passati (e la freccia non c'è)
defineProps({ lunedi: { type: Boolean, default: false } });

const aperta = ref(false);
const touch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;

function giaVista() {
  try {
    return localStorage.getItem(CHIAVE) === '1';
  } catch {
    return false;
  }
}

let timer;
function chiudi() {
  aperta.value = false;
  clearTimeout(timer);
  window.removeEventListener('pointerdown', chiudi, true);
  window.removeEventListener('keydown', chiudi, true);
}

onMounted(() => {
  if (giaVista()) return;
  try {
    localStorage.setItem(CHIAVE, '1');
  } catch {
    // Archiviazione bloccata: la guida ricomparirà alla prossima visita
  }
  timer = setTimeout(() => {
    aperta.value = true;
    timer = setTimeout(chiudi, DURATA);
    window.addEventListener('pointerdown', chiudi, true);
    window.addEventListener('keydown', chiudi, true);
  }, 600);
});
onBeforeUnmount(chiudi);
</script>

<template>
  <Transition name="guida">
    <div v-if="aperta" class="guida" aria-live="polite">
      <p class="fumetto tema">Tema chiaro o scuro</p>
      <p class="fumetto pills">Vai a Pills</p>
      <p class="fumetto giorni">
        {{ lunedi ? 'Da martedì, qui' : 'Qui' }} i giorni passati della settimana{{ touch ? ' (o scorri col dito)' : '' }}
      </p>
      <p class="fumetto condividi">Condividi la frase</p>
      <p class="fumetto proponi">Proponi una frase</p>
    </div>
  </Transition>
</template>

<style scoped>
.guida {
  position: fixed;
  inset: 0;
  z-index: 15;
  pointer-events: none;
}

.fumetto {
  --punta: 0.45rem;
  position: absolute;
  margin: 0;
  max-width: 11rem;
  padding: 0.4rem 0.6rem;
  border-radius: 6px;
  background: var(--color-guida);
  color: var(--color-bg);
  font-family: "Abhaya Libre", serif;
  font-weight: 700;
  font-size: 0.95rem;
  line-height: 1.2;
  box-shadow: 0 2px 8px rgb(0 0 0 / 0.18);
}

/* La punta del fumetto: un triangolo dello stesso colore verso il pulsante */
.fumetto::after {
  content: '';
  position: absolute;
  border: var(--punta) solid transparent;
}

/* Sotto le icone in alto, punta in su */
.tema,
.pills {
  top: calc(2.9rem + env(safe-area-inset-top));
}

.tema {
  left: calc(0.4rem + env(safe-area-inset-left));
}

.pills {
  right: calc(0.4rem + env(safe-area-inset-right));
}

.tema::after,
.pills::after {
  bottom: 100%;
  border-bottom-color: var(--color-guida);
}

.tema::after {
  left: 0.75rem;
}

.pills::after {
  right: 0.75rem;
}

/* Accanto alla freccia sinistra, punta a sinistra */
.giorni {
  left: calc(2.9rem + env(safe-area-inset-left));
  top: 50%;
  transform: translateY(-50%);
}

.giorni::after {
  right: 100%;
  top: 50%;
  margin-top: calc(-1 * var(--punta));
  border-right-color: var(--color-guida);
}

/* Sopra le icone in basso, punta in giù */
.condividi,
.proponi {
  bottom: calc(2.9rem + env(safe-area-inset-bottom));
}

.condividi {
  left: calc(0.4rem + env(safe-area-inset-left));
}

.proponi {
  right: calc(0.4rem + env(safe-area-inset-right));
}

.condividi::after,
.proponi::after {
  top: 100%;
  border-top-color: var(--color-guida);
}

.condividi::after {
  left: 0.75rem;
}

.proponi::after {
  right: 0.75rem;
}

.guida-enter-active,
.guida-leave-active {
  transition: opacity 0.35s ease;
}

.guida-enter-from,
.guida-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .guida-enter-active,
  .guida-leave-active {
    transition: none;
  }
}
</style>
