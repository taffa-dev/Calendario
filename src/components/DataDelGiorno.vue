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
</script>

<template>
  <div class="data" :style="correzioni">
    <div class="numeri">
      <div class="giorno">{{ giorno }}</div>
      <div class="anno">{{ anno }}</div>
    </div>
    <div :class="['mese', { 'con-ricorrenze': ricorrenze.length }]">
      <span>{{ mese }}</span>
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
