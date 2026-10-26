import { pasqua } from './ricorrenze.js';
import { aggiornaBarre } from './tema.js';

// Tema stagionale: dal lunedì santo al lunedì dell'Angelo i colori dei ciliegi in fiore (in
// tema.css, `stagione="pasqua"` su <html>) e i petali che cadono; la settimana del 31 ottobre
// Halloween (`stagione="halloween"`, pipistrelli e ragnatele); dall'8 dicembre al 6 gennaio il Natale
// (`stagione="natale"`, neve, luccichii e ghirlanda). Come in Pills.
// Lo script in index.html lo applica già prima del primo disegno: qui lo si tiene aggiornato
// quando la pagina resta aperta e cambia il giorno.

export function stagioneDi(data) {
  // Natale: dall'8 dicembre al 6 gennaio compresi (a cavallo d'anno), come in Pills
  const mese = data.getMonth(), giornoDelMese = data.getDate();
  if ((mese === 11 && giornoDelMese >= 8) || (mese === 0 && giornoDelMese <= 6)) return 'natale';
  // Halloween: tutta la settimana (lunedì - domenica) in cui cade il 31 ottobre, come in Pills.
  // Le date si confrontano a giorno intero (mezzanotte)
  const trentuno = new Date(data.getFullYear(), 9, 31);
  const lunedi = new Date(data.getFullYear(), 9, 31 - (trentuno.getDay() + 6) % 7);
  const domenicaH = new Date(data.getFullYear(), 9, 31 - (trentuno.getDay() + 6) % 7 + 6);
  const oggi = new Date(data.getFullYear(), data.getMonth(), data.getDate());
  if (oggi >= lunedi && oggi <= domenicaH) return 'halloween';
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
