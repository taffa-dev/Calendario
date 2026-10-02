<script setup>
import { onMounted, ref } from 'vue';

// Petali di ciliegio che cadono (Pasqua, come in Pills ma col vento al contrario, verso destra): quelli piccoli dietro il foglio, e pochi
// vicinissimi alla "telecamera", grandi, sfocati e più veloci, davanti. Colori da tema.css.
const lontani = ref([]);
const vicini = ref([]);

onMounted(() => {
  lontani.value = Array.from({ length: 18 }, () => ({
    x: Math.random() * 120 - 20, // posizione orizzontale in %: il vento li porta a destra
    size: Math.random() * 9 + 12, // tra 12px e 21px
    duration: Math.random() * 12 + 14, // caduta tra 14s e 26s
    delay: Math.random() * -26, // ritardo negativo per animazione continua
    sway: Math.random() * 2 + 2.5, // ondeggiamento tra 2.5s e 4.5s
    flutter: Math.random() * 2 + 1.5, // giravolta tra 1.5s e 3.5s
    opacity: Math.random() * 0.4 + 0.5
  }));
  vicini.value = Array.from({ length: 3 }, () => {
    const size = Math.random() * 40 + 45; // tra 45px e 85px
    return {
      x: Math.random() * 100 - 20,
      size,
      // Ciclo tra 24s e 36s, ma attraversano lo schermo nel primo terzo (vedi caduta-vicina):
      // da vicino sembrano più veloci, e passano di rado
      duration: Math.random() * 12 + 24,
      delay: Math.random() * -36,
      sway: Math.random() * 2 + 3,
      flutter: Math.random() * 2 + 3,
      opacity: Math.random() * 0.2 + 0.45,
      blur: size / 14
    };
  });
});
</script>

<template>
  <div aria-hidden="true">
    <svg width="0" height="0" class="definizioni">
      <defs>
        <!-- Base del petalo più chiara, punta più rosa -->
        <linearGradient id="petalo-sfumatura" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" class="stop-base" />
          <stop offset="100%" class="stop-punta" />
        </linearGradient>
      </defs>
    </svg>
    <div v-for="strato in [{ classe: 'petali', lista: lontani }, { classe: 'petali vicini', lista: vicini }]"
      :key="strato.classe" :class="strato.classe">
      <div v-for="(p, index) in strato.lista" :key="index" class="caduta" :style="{
        left: p.x + '%',
        animationDuration: p.duration + 's',
        animationDelay: p.delay + 's',
        opacity: p.opacity,
        filter: p.blur ? `blur(${p.blur}px)` : null
      }">
        <div class="ondeggia" :style="{ animationDuration: p.sway + 's', animationDelay: p.delay + 's' }">
          <svg class="petalo" viewBox="0 0 20 20" :width="p.size" :height="p.size"
            :style="{ animationDuration: p.flutter + 's', animationDelay: p.delay + 's' }">
            <path d="M10 19 C4 15 2 8 5 3 C6.5 1 8.5 2.5 10 4.5 C11.5 2.5 13.5 1 15 3 C18 8 16 15 10 19Z"
              fill="url(#petalo-sfumatura)" />
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Dietro il foglio (che sta a 2), sotto le icone (10) */
.petali {
  position: fixed;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 1;
}

/* Davanti al foglio, ancora sotto le icone */
.vicini {
  z-index: 5;
}

.definizioni {
  position: absolute;
}

.stop-base {
  stop-color: var(--petalo-base);
  transition: stop-color var(--cambio-tema);
}

.stop-punta {
  stop-color: var(--petalo-punta);
  transition: stop-color var(--cambio-tema);
}

.caduta {
  position: absolute;
  top: -20px;
  animation-name: caduta;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}

.vicini .caduta {
  top: -100px;
  animation-name: caduta-vicina;
}

.ondeggia {
  animation: ondeggia ease-in-out infinite alternate;
}

.petalo {
  display: block;
  animation: giravolta linear infinite;
}

@keyframes caduta {
  to {
    transform: translate(20vw, calc(100vh + 40px));
  }
}

@keyframes caduta-vicina {
  35%,
  100% {
    transform: translate(30vw, calc(100vh + 200px));
  }
}

@keyframes ondeggia {
  from { transform: translateX(-14px); }
  to { transform: translateX(14px); }
}

/* Il petalo si gira mentre cade: di taglio sembra più stretto */
@keyframes giravolta {
  from { transform: rotate3d(1, 0.6, 0.3, 0deg); }
  to { transform: rotate3d(1, 0.6, 0.3, 360deg); }
}

/* Movimento ridotto: i petali restano fermi dove si trovano */
@media (prefers-reduced-motion: reduce) {
  .caduta,
  .ondeggia,
  .petalo {
    animation-play-state: paused;
  }
}
</style>
