import { giornoDi } from './mazzo.js';

// Solo con `npm run dev`: ?data=2026-12-20 simula un altro giorno
const simulata = import.meta.env.DEV && new URLSearchParams(location.search).get('data');

export function getOggi() {
  const data = simulata ? new Date(`${simulata}T12:00`) : null;
  return data && !isNaN(data) ? data : new Date();
}

// Pagina lasciata aperta: avvisa quando cambia il giorno (timer a mezzanotte, più un controllo
// quando la scheda torna visibile, perché i timer delle schede in background si fermano).
// `oggi` è il ref del giorno mostrato. Restituisce la funzione che ferma il controllo.
export function controllaCambioGiorno(oggi, cambiato) {
  if (simulata) return () => {};
  let timer;
  const controlla = () => {
    if (giornoDi(new Date()) !== giornoDi(oggi.value)) cambiato();
    programma();
  };
  const programma = () => {
    clearTimeout(timer);
    const mezzanotte = new Date();
    mezzanotte.setHours(24, 0, 1, 0);
    timer = setTimeout(controlla, mezzanotte - new Date());
  };
  const visibile = () => document.visibilityState === 'visible' && controlla();
  document.addEventListener('visibilitychange', visibile);
  programma();
  return () => {
    clearTimeout(timer);
    document.removeEventListener('visibilitychange', visibile);
  };
}
