import { mescola, chiaveDi, giornoDi, dataDi, creaMazzo, percorri } from './mazzo.js';

// Scelta della frase del giorno. Pura (frasi e programma arrivano come parametri):
// la usano sia il sito sia scripts/programma.mjs, che deve calcolare esattamente le stesse cose.

const GIORNI_SETTIMANA = ['domenica', 'lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato'];

export const chiaveFrase = (frase) => chiaveDi(`${frase.testo}|${frase.autore}`);

const senzaAccenti = (testo) => testo.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

const conRegole = (frase) => Boolean(frase.giorni || frase.date);

const perData = (frase, data) => (frase.date ?? []).some((d) => d === giornoDi(data) || d === giornoDi(data).slice(5));
const perGiorno = (frase, data) => (frase.giorni ?? []).some((g) => senzaAccenti(g) === GIORNI_SETTIMANA[data.getDay()]);

// Numero pseudo-casuale stabile per tutta la giornata: è quello del vecchio sistema,
// identico a Pills. Serve ancora per i giorni precedenti al programma.
export function getNumeroDelGiorno(data) {
  const giorno = [data.getFullYear(), data.getMonth(), data.getDate()].join('-');
  let hash = 0;
  for (let i = 0; i < giorno.length; i++) {
    hash = giorno.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

// Il vecchio sistema (casuale puro, la frase del giovedì un giovedì su due): ricostruisce
// i giorni precedenti al programma e fa da primo giorno quando il programma nasce
export function fraseVecchioSistema(frasi, data) {
  const vecchie = frasi.filter((f) => !conRegole(f));
  const indice = getNumeroDelGiorno(data) % vecchie.length;
  const giovedi = frasi.find((f) => (f.giorni ?? []).some((g) => senzaAccenti(g) === 'giovedi'));
  return giovedi && data.getDay() === 4 && indice % 2 === 0 ? giovedi : vecchie[indice];
}

// Scelta giorno per giorno: `scegli(giorno, salvata)` va chiamata in ordine di data (lo fa
// `percorri`). Usa la voce salvata se c'è, altrimenti sorteggia; registra ciò che esce nel mazzo.
export function creaSceltaDelGiorno(frasi) {
  const perChiave = new Map(frasi.map((f) => [chiaveFrase(f), f]));
  const speciali = frasi.filter(conRegole);
  const mazzo = creaMazzo(frasi.filter((f) => !conRegole(f)).map(chiaveFrase));
  const giorniDelMazzo = [];

  // Speciali: un sorteggio del giorno, indipendente dal mazzo, diviso in fette. Prima le frasi
  // legate alla data (escono sempre), poi quelle legate al giorno della settimana: il 25/12 vince
  // sul giovedì. Le frasi di un giorno della settimana sono N: ognuna ha 1/(N+1), l'ultima
  // fetta è per il mazzo (una frase di venerdì: metà e metà; due: un terzo ciascuna e un terzo mazzo).
  function speciale(giorno) {
    const data = dataDi(giorno);
    const sorteggio = mescola(`${giorno}#speciali`) / 2 ** 32;
    let soglia = 0;
    const dellaData = speciali.filter((f) => perData(f, data));
    const delGiorno = speciali.filter((f) => !perData(f, data) && perGiorno(f, data));
    for (const frase of dellaData) {
      soglia += 1;
      if (sorteggio < soglia) return chiaveFrase(frase);
    }
    for (const frase of delGiorno) {
      soglia += 1 / (delGiorno.length + 1);
      if (sorteggio < soglia) return chiaveFrase(frase);
    }
    return null;
  }

  return {
    scegli(giorno, salvata) {
      const chiave = salvata ?? speciale(giorno) ?? mazzo.pesca(`${giorno}#mazzo`);
      if (mazzo.registra(chiave)) giorniDelMazzo.push(giorno);
      return chiave;
    },
    frase: (chiave) => perChiave.get(chiave),
    // Primo giorno da conservare nel programma perché il mazzo ricostruito ricordi abbastanza
    get primoGiornoDaConservare() {
      return giorniDelMazzo[Math.max(0, giorniDelMazzo.length - mazzo.memoria)];
    }
  };
}

// Frase di un giorno per il sito: dal programma se c'è; oltre la fine del programma lo si
// prosegue col mazzo (stesso risultato per tutti); prima dell'inizio, il vecchio sistema.
export function getFrase(frasi, programma, data) {
  const giorno = giornoDi(data);
  const scelta = creaSceltaDelGiorno(frasi);
  const giorni = percorri(programma, giorno, '9999-12-31', (g, salvata) =>
    // Una voce salvata ma sconosciuta (frase tolta o corretta) si ricalcola solo per il giorno chiesto
    scelta.scegli(g, g === giorno && salvata && !scelta.frase(salvata) ? undefined : salvata));
  return scelta.frase(giorni[giorno]) ?? fraseVecchioSistema(frasi, data);
}
