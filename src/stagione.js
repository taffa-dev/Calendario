import { pasqua } from './ricorrenze.js';
import { aggiornaBarre } from './tema.js';

// Tema stagionale: dal lunedì santo al lunedì dell'Angelo i colori dei ciliegi in fiore (in
// tema.css, `stagione="pasqua"` su <html>) e i petali che cadono. Come in Pills.
// Lo script in index.html lo applica già prima del primo disegno: qui lo si tiene aggiornato
// quando la pagina resta aperta e cambia il giorno.

export function stagioneDi(data) {
  const domenica = pasqua(data.getFullYear());
  const giorno = new Date(data.getFullYear(), data.getMonth(), data.getDate(), 12);
  const giorni = Math.round((giorno - domenica) / 86400000);
  return giorni >= -6 && giorni <= 1 ? 'pasqua' : null;
}

export function applicaStagione(stagione) {
  const radice = document.documentElement;
  if (radice.getAttribute('stagione') === stagione) return;
  if (stagione) radice.setAttribute('stagione', stagione);
  else radice.removeAttribute('stagione');
  aggiornaBarre();
}
