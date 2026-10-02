<script setup>
// Icone a contorno sottile nello stile di Lucide (ISC, https://lucide.dev/license), copiate qui
// per non caricare la libreria: griglia 24×24, tratto 2, estremità arrotondate, alte e larghe 1em.
// File identico in Pills: se cambia in uno va copiato nell'altro.
const ICONE = {
  sole: ['M8 12a4 4 0 1 0 8 0a4 4 0 1 0 -8 0', 'M12 2v2', 'M12 20v2', 'm4.93 4.93 1.41 1.41', 'm17.66 17.66 1.41 1.41', 'M2 12h2', 'M20 12h2', 'm6.34 17.66-1.41 1.41', 'm19.07 4.93-1.41 1.41'],
  luna: ['M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z'],
  pillole: ['m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z', 'm8.5 8.5 7 7'],
  condividi: ['M15 5a3 3 0 1 0 6 0a3 3 0 1 0 -6 0', 'M3 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0', 'M15 19a3 3 0 1 0 6 0a3 3 0 1 0 -6 0', 'm8.59 13.51 6.83 3.98', 'm15.41 6.51-6.82 3.98'],
  proponi: ['M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z', 'M16 8 2 22', 'M17.5 15H9'],
  // Quattro quadratini: raggruppano le altre azioni del Calendario
  gruppo: ['M4 3h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z', 'M15 3h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z', 'M4 14h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1z', 'M15 14h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1z'],
  calendario: ['M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', 'M16 2v4', 'M8 2v4', 'M3 10h18'],
  // Stato d'agitazione di Pills
  sirena: ['M7 18v-5a5 5 0 0 1 10 0v5', 'M5 18h14a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-1a1 1 0 0 1 1-1z', 'M12 2v2', 'M4.2 5.2l1.4 1.4', 'M19.8 5.2l-1.4 1.4', 'M2 12h2', 'M20 12h2'],
  indietro: ['m15 18-6-6 6-6'],
  avanti: ['m9 18 6-6-6-6']
};

defineProps({
  nome: { type: String, required: true }
});
</script>

<template>
  <svg class="icona-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <path v-for="d in ICONE[nome]" :key="d" :d="d" />
  </svg>
</template>

<style scoped>
.icona-svg {
  display: inline-block;
  width: 1em;
  height: 1em;
  overflow: visible;
}
</style>
