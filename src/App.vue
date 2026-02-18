<script setup>
import { ref, onMounted, watch } from 'vue'
import Aphorism from './assets/Aphorism.vue'
import DateBox from './assets/DateBox.vue'

const today = new Date()

const THEME_KEY = 'color-theme'
const theme = ref('light')

function applyThemeToDocument(t) {
  const root = document.documentElement
  if (t === 'dark') {
    root.setAttribute('color-theme', 'dark')
  } else {
    root.removeAttribute('color-theme')
  }
}

// Inizializza: leggi localStorage o prefers-color-scheme
onMounted(() => {
  let saved = localStorage.getItem(THEME_KEY)
  if (saved === 'dark' || saved === 'light') {
    theme.value = saved
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    theme.value = 'dark'
  }
  applyThemeToDocument(theme.value)
})

watch(theme, (t) => {
  localStorage.setItem(THEME_KEY, t)
  applyThemeToDocument(t)
})

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
}

</script>

<template>
  <button class="theme-toggle" @click="toggleTheme" type="button">
    <font-awesome-icon :icon="theme === 'light' ? 'fa-solid fa-moon' : 'fa-solid fa-sun'" class="icon-theme" />
  </button>
  <div class="calendar">
    <DateBox class="date" :today="today" />
    <Aphorism class="aphorism" :today="today" />
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

.icon-theme {
  color: var(--color-3)
}
</style>

<style>
body {
  background-color: var(--color-bg);
}
</style>