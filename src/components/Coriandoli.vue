<script setup>
import { ref, watch, onBeforeUnmount } from 'vue';
import { esplodi } from '../coriandoli.js';

// Ogni volta che `scoppio` cambia parte un'esplosione di coriandoli dal basso (compleanni)
const props = defineProps({ scoppio: { type: Number, default: 0 } });
const canvas = ref(null);
let ferma = null;

watch(() => props.scoppio, () => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  ferma?.();
  ferma = esplodi(canvas.value);
});

onBeforeUnmount(() => ferma?.());
</script>

<template>
  <canvas ref="canvas" class="coriandoli" aria-hidden="true"></canvas>
</template>

<style scoped>
/* Davanti al foglio (2) e ai petali vicini, sotto le icone (10) */
.coriandoli {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 5;
  pointer-events: none;
}
</style>
