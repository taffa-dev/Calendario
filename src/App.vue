<script setup>
import { ref, onMounted, watch } from 'vue'
import Aphorism from './assets/Aphorism.vue'
import DateBox from './assets/DateBox.vue'

const PILLS_URL = 'https://taffa-dev.github.io/Pills/'

const today = new Date()

const THEME_KEY = 'color-theme'

function applyThemeToDocument(t) {
  const root = document.documentElement
  if (t === 'dark') {
    root.setAttribute('color-theme', 'dark')
  } else {
    root.removeAttribute('color-theme')
  }
}

function initialTheme() {
  const saved = localStorage.getItem(THEME_KEY)
  if (saved === 'dark' || saved === 'light') {
    return saved
  }
  return document.documentElement.getAttribute('color-theme') === 'dark' ? 'dark' : 'light'
}

const theme = ref(initialTheme())

onMounted(() => {
  applyThemeToDocument(theme.value)
  document.documentElement.classList.remove('no-transition');
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
  <div class="top-bar">
    <button class="theme-toggle" @click="toggleTheme" type="button"
      :aria-label="theme === 'light' ? 'Attiva tema scuro' : 'Attiva tema chiaro'">
      <font-awesome-icon :icon="theme === 'light' ? 'fa-solid fa-moon' : 'fa-solid fa-sun'" class="icon-theme" />
    </button>
    <a class="theme-toggle" :href="PILLS_URL" target="_blank" rel="noopener" aria-label="Vai a Pills">
      <font-awesome-icon icon="fa-solid fa-pills" class="icon-theme" />
    </a>
  </div>
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

.top-bar {
  display: flex;
  justify-content: space-between;
  padding: 1rem;
}

.theme-toggle {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--fg);
  padding: 0.5rem 0.8rem;
  border-radius: 10px;
  cursor: pointer;
  text-decoration: none;
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
  background-repeat: no-repeat;
  background-attachment: fixed;
  background-color: var(--color-bg);
  transition: background-color 2s ease-out;
}
</style>