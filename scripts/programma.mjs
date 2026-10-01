// Aggiorna src/programma.json: la frase di ogni giorno, dal passato che serve al mazzo
// fino a GIORNI_AVANTI giorni da oggi. Lo esegue la GitHub Action (a ogni push e ogni settimana).
// - I giorni passati non si toccano mai; oggi neppure, se la sua frase esiste ancora.
// - Il futuro si ricalcola con le frasi attuali: le frasi nuove entrano nel giro in corso.
// - Programma vuoto: il primo giorno è oggi, con la frase del vecchio sistema (nessuno vede cambiare nulla).
// Uso: node scripts/programma.mjs [--oggi=AAAA-MM-GG]
import { readFileSync, writeFileSync } from 'node:fs';
import { giornoDi, dataDi, giornoDopo, percorri } from '../src/mazzo.js';
import { creaSceltaDelGiorno, chiaveFrase, fraseVecchioSistema } from '../src/giorno.js';

const GIORNI_AVANTI = 60;
// Sempre conservati: servono a mostrare i giorni passati della settimana
const GIORNI_INDIETRO = 7;

const FRASI = new URL('../src/frasi.json', import.meta.url);
const PROGRAMMA = new URL('../src/programma.json', import.meta.url);

const spostaGiorno = (giorno, n) => {
  const data = dataDi(giorno);
  data.setDate(data.getDate() + n);
  return giornoDi(data);
};

const argOggi = process.argv.find((a) => a.startsWith('--oggi='))?.slice(7);
const oggi = argOggi ?? giornoDi(new Date());
const frasi = JSON.parse(readFileSync(FRASI, 'utf8'));
let programma = JSON.parse(readFileSync(PROGRAMMA, 'utf8'));

if (!Object.keys(programma).length) {
  programma = { [oggi]: chiaveFrase(fraseVecchioSistema(frasi, dataDi(oggi))) };
}

const scelta = creaSceltaDelGiorno(frasi);
const fine = spostaGiorno(oggi, GIORNI_AVANTI);
const giorni = percorri(programma, fine, oggi, (g, salvata) =>
  scelta.scegli(g, g === oggi && salvata && !scelta.frase(salvata) ? undefined : salvata));

const conserva = [scelta.primoGiornoDaConservare, spostaGiorno(oggi, -GIORNI_INDIETRO)]
  .filter(Boolean).sort()[0];
const righe = Object.entries(giorni)
  .filter(([g]) => g >= conserva)
  .map(([g, chiave]) => `  "${g}": "${chiave}"`);
const testo = `{\n${righe.join(',\n')}\n}\n`;

if (testo !== readFileSync(PROGRAMMA, 'utf8')) {
  writeFileSync(PROGRAMMA, testo);
  console.log(`programma aggiornato: ${righe.length} giorni, fino al ${fine}`);
} else {
  console.log('programma già aggiornato');
}

// Controllo: ogni giorno dal primo all'ultimo ha una voce, senza buchi
for (let g = Object.keys(giorni).find((x) => x >= conserva); g <= fine; g = giornoDopo(g)) {
  if (!giorni[g]) throw new Error(`manca il ${g}`);
}
