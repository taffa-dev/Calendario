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
  if (document.documentElement.getAttribute('color-theme') === 'dark') {
    return 'dark'
  }
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
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
  <button class="theme-toggle theme-toggle--left" @click="toggleTheme" type="button"
    :aria-label="theme === 'light' ? 'Attiva tema scuro' : 'Attiva tema chiaro'">
    <font-awesome-icon :icon="theme === 'light' ? 'fa-solid fa-moon' : 'fa-solid fa-sun'" class="icon-theme" />
  </button>
  <a class="theme-toggle theme-toggle--right" :href="PILLS_URL" aria-label="Vai a Pills">
    <font-awesome-icon icon="fa-solid fa-pills" class="icon-theme" />
  </a>
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
  position: fixed;
  top: 0.5rem;
  z-index: 10;
  display: inline-flex;
  align-items: center;
  border: none;
  background: transparent;
  color: var(--color-3);
  padding: 0.35rem;
  cursor: pointer;
  text-decoration: none;
  transition: opacity 0.2s ease;
}

.theme-toggle--left {
  left: 0.5rem;
}

.theme-toggle--right {
  right: 0.5rem;
}

.theme-toggle:hover {
  opacity: 0.7;
}

.icon-theme {
  color: var(--color-3)
}
</style>

<style>
body {
  margin: 0;
  background-repeat: no-repeat;
  background-attachment: fixed;
  background-color: var(--color-bg);
  transition: background-color 2s ease-out;
}
</style>