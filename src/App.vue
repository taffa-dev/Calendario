<script setup>
import Aphorism from './assets/Aphorism.vue';
import DateBox from './assets/DateBox.vue';

const today = new Date;
</script>

<template>

  <button class="theme-toggle" @click="toggleTheme"
    :aria-label="`Cambia tema: ${theme === 'light' ? 'scuro' : 'chiaro'}`" type="button">
    {{ theme === 'light' ? 'Tema scuro 🌙' : 'Tema chiaro ☀️' }}
  </button>
  <div class="calendar">
    <DateBox class="date" :today="today"></DateBox>
    <Aphorism class="aphorism" :today="today"></Aphorism>
  </div>
</template>

<style scoped>
.calendar {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.theme-toggle {
  justify-self: end;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--fg);
  padding: 0.5rem 0.8rem;
  border-radius: 10px;
  cursor: pointer;
  transition: transform 0.08s ease, background 0.2s ease, border-color 0.2s ease;
}

.theme-toggle:hover {
  transform: translateY(-1px);
}

.theme-toggle:active {
  transform: translateY(0);
}
</style>

<style>
body {
  background-color: rgb(255, 248, 236);
}
</style>
