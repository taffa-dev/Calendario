// Impaginazione del foglio di calendario, condivisa da pagina (DataDelGiorno) e immagine (condividi.js)

export const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

// Inchiostro delle cifre di Abhaya Libre 800 a 300px (canvas.measureText): quanto salgono sopra la
// riga di base, quanto scendono (3, 4, 5, 7, 9 sono cifre "antiche") e quanto vuoto lasciano a destra.
const CIFRE = {
  0: { su: 164, giu: 5, vuotoDestra: 7 },
  1: { su: 159, giu: 0, vuotoDestra: 3 },
  2: { su: 164, giu: 0, vuotoDestra: 13 },
  3: { su: 159, giu: 23, vuotoDestra: 8 },
  4: { su: 164, giu: 19, vuotoDestra: 11 },
  5: { su: 173, giu: 23, vuotoDestra: 8 },
  6: { su: 183, giu: 5, vuotoDestra: 7 },
  7: { su: 159, giu: 23, vuotoDestra: 2 },
  8: { su: 183, giu: 5, vuotoDestra: 14 },
  9: { su: 164, giu: 23, vuotoDestra: 12 }
};

// Distanze volute tra gli inchiostri, in px a grandezza piena (giorno a 300px)
export const SPAZIO_ANNO = 14;
export const SPAZIO_MESE = 7;

// Quanto sale e quanto scende l'inchiostro del giorno, e il vuoto a destra dell'ultima cifra
export function inchiostroGiorno(giorno) {
  const cifre = [...String(giorno)].map((c) => CIFRE[c]);
  return {
    su: Math.max(...cifre.map((c) => c.su)),
    giu: Math.max(...cifre.map((c) => c.giu)),
    vuotoDestra: cifre.at(-1).vuotoDestra
  };
}

// Altezza delle lettere del mese che possono finire sotto le cifre: con lettere alte (b, d, l...)
// conta la loro altezza, altrimenti quella delle maiuscole
export const altezzaMese = (mese) => (/[bdfhklt]/.test(mese) ? 49 : 47);

// --- Pagina ---
// Misure della pagina com'è impaginata in DataDelGiorno.vue, senza correzioni (a 1px per unità):
// riga di base del giorno e inchiostro dell'anno, dall'alto del blocco dei numeri; distanza tra la
// riga di base del giorno e quella del mese; vuoto tra il riquadro del giorno e l'inchiostro dell'anno.
// Se cambia il CSS dei numeri vanno rimisurate (vedi CLAUDE.md).
const BASE_GIORNO = 168;
const ANNO_SU = 3;
const ANNO_GIU = 189;
const BASE_MESE = 74.6;
const VUOTO_PRIMA_ANNO = 3;
const PADDING_GIORNO = 10;

// Correzioni (in unità) che applica DataDelGiorno: il giorno sale o scende per stare centrato
// sull'anno, si avvicina all'anno, e il mese si mette subito sotto la parte più bassa tra i due.
export function impaginazione(giorno, mese) {
  const { su, giu, vuotoDestra } = inchiostroGiorno(giorno);
  const spostaGiorno = (ANNO_SU + ANNO_GIU) / 2 - (BASE_GIORNO - (su - giu) / 2);
  const fondo = Math.max(BASE_GIORNO + giu + spostaGiorno, ANNO_GIU);
  const cimaMese = BASE_GIORNO + BASE_MESE - altezzaMese(mese);
  return {
    spostaGiorno,
    vicinoAnno: SPAZIO_ANNO - (vuotoDestra + PADDING_GIORNO + VUOTO_PRIMA_ANNO),
    spazioMese: fondo + SPAZIO_MESE - cimaMese
  };
}
