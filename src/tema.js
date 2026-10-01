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
  // Barre del telefono (e dell'app installata) dello stesso colore dello sfondo
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
    meta.content = tema.value === 'dark' ? '#230505' : '#fff8ec';
  }
  try {
    localStorage.setItem(CHIAVE, tema.value);
  } catch {
    // Archiviazione bloccata (navigazione privata): il tema vale solo per questa visita
  }
}
