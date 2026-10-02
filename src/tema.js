import { ref } from 'vue';

// Il tema iniziale lo applica già lo script in index.html (prima del primo disegno, senza lampi):
// qui lo si legge dalla pagina e lo si cambia. La scelta resta salvata; senza scelta segue il sistema.
const CHIAVE = 'color-theme';
const radice = document.documentElement;

export const tema = ref(radice.getAttribute(CHIAVE) === 'dark' ? 'dark' : 'light');

export function cambiaTema() {
  tema.value = tema.value === 'dark' ? 'light' : 'dark';
  if (tema.value === 'dark') {
    radice.setAttribute(CHIAVE, 'dark');
  } else {
    radice.removeAttribute(CHIAVE);
  }
  aggiornaBarre();
  try {
    localStorage.setItem(CHIAVE, tema.value);
  } catch {
    // Archiviazione bloccata (navigazione privata): il tema vale solo per questa visita
  }
}

// Barre del telefono dello stesso colore dello sfondo (che dipende da tema e stagione)
export function aggiornaBarre() {
  const sfondo = getComputedStyle(radice).getPropertyValue('--color-bg').trim();
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) meta.content = sfondo;
}
