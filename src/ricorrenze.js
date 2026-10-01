import { giornoDi } from './mazzo.js';

// Ricorrenze mostrate sotto la data: feste nazionali italiane (calcolate) più quelle di
// ricorrenze.json ({ "data": "MM-GG" ogni anno o "AAAA-MM-GG" una volta, "nome": "..." }).

const FESTE_FISSE = {
  '01-01': 'Capodanno',
  '01-06': 'Epifania',
  '04-25': 'Festa della Liberazione',
  '05-01': 'Festa dei Lavoratori',
  '06-02': 'Festa della Repubblica',
  '08-15': 'Ferragosto',
  '10-04': 'San Francesco d’Assisi', // festa nazionale dal 2026 (legge 151/2025)
  '11-01': 'Ognissanti',
  '12-08': 'Immacolata Concezione',
  '12-25': 'Natale',
  '12-26': 'Santo Stefano'
};

// Domenica di Pasqua (algoritmo di Meeus/Jones/Butcher, calendario gregoriano)
function pasqua(anno) {
  const a = anno % 19, b = Math.floor(anno / 100), c = anno % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mese = Math.floor((h + l - 7 * m + 114) / 31);
  const giorno = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(anno, mese - 1, giorno, 12);
}

function festeMobili(anno) {
  const domenica = pasqua(anno);
  const lunedi = new Date(domenica);
  lunedi.setDate(lunedi.getDate() + 1);
  return { [giornoDi(domenica)]: 'Pasqua', [giornoDi(lunedi)]: 'Lunedì dell’Angelo' };
}

export function getRicorrenze(personali, data) {
  const giorno = giornoDi(data);
  const meseGiorno = giorno.slice(5);
  const nomi = [];
  if (meseGiorno !== '10-04' || data.getFullYear() >= 2026) {
    if (FESTE_FISSE[meseGiorno]) nomi.push(FESTE_FISSE[meseGiorno]);
  }
  const mobile = festeMobili(data.getFullYear())[giorno];
  if (mobile) nomi.push(mobile);
  for (const r of personali) {
    if (r.data === giorno || r.data === meseGiorno) nomi.push(r.nome);
  }
  return nomi;
}
