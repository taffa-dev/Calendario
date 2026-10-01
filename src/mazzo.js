// Mazzo a giri: ogni frase esce una volta per giro, in ordine casuale ma uguale per tutti,
// e nessuna torna prima che siano uscite tutte le altre.
// File identico in Calendario e Pills: se cambia in uno, va copiato nell'altro.

// Hash a 32 bit ben mescolato (FNV-1a + finalizzatore di MurmurHash3): da una stringa
// a un numero che sembra casuale, sempre lo stesso per la stessa stringa.
export function mescola(testo) {
  let h = 0x811c9dc5;
  for (let i = 0; i < testo.length; i++) {
    h = Math.imul(h ^ testo.charCodeAt(i), 0x01000193);
  }
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

// Chiave breve di una frase per il programma: cambia se cambia il testo (un refuso corretto
// fa contare la frase come nuova)
export const chiaveDi = (testo) => mescola(testo).toString(16).padStart(8, '0');

const dueCifre = (n) => String(n).padStart(2, '0');

// 'AAAA-MM-GG' in ora locale
export const giornoDi = (data) => `${data.getFullYear()}-${dueCifre(data.getMonth() + 1)}-${dueCifre(data.getDate())}`;

export const dataDi = (giorno) => new Date(`${giorno}T12:00`);

export function giornoDopo(giorno) {
  const data = dataDi(giorno);
  data.setDate(data.getDate() + 1);
  return giornoDi(data);
}

// Stato del mazzo di una lista: si "registrano" le frasi uscite, in ordine, e si "pesca" la prossima.
// - Le frasi già uscite nel giro in corso non si pescano finché il giro non è completo.
// - Distanza minima: le ultime N/3 uscite non si pescano se c'è altro, così a cavallo
//   tra due giri una frase non torna subito.
// - Le chiavi che non sono (più) nella lista si ignorano: frasi tolte o corrette.
export function creaMazzo(chiavi) {
  const lista = [...new Set(chiavi)];
  const presenti = new Set(lista);
  const distanza = Math.floor(lista.length / 3);
  let viste = new Set();
  const recenti = [];
  // Quante frasi sono state registrate da quando è iniziato il giro in corso, e dal precedente
  let nelGiro = 0;
  let nelGiroPrima = 0;

  return {
    // Restituisce false se la chiave non è della lista
    registra(chiave) {
      if (!presenti.has(chiave)) return false;
      viste.add(chiave);
      nelGiro++;
      if (viste.size === presenti.size) {
        viste = new Set();
        nelGiroPrima = nelGiro;
        nelGiro = 0;
      }
      recenti.push(chiave);
      if (recenti.length > distanza) recenti.shift();
      return true;
    },
    pesca(seme) {
      const rimaste = lista.filter((k) => !viste.has(k));
      const lontane = rimaste.filter((k) => !recenti.includes(k));
      const candidate = lontane.length ? lontane : rimaste;
      return candidate[mescola(seme) % candidate.length];
    },
    // Uscite da conservare nel programma perché il mazzo ricostruito dia lo stesso stato:
    // il giro in corso e quello prima
    get memoria() {
      return nelGiro + nelGiroPrima;
    }
  };
}

// Percorre i giorni dal primo del programma fino a `fino` compreso.
// - `programma`: { 'AAAA-MM-GG': voce } con le voci già decise (pubblicate)
// - `fissiFino`: le voci del programma fino a quel giorno compreso valgono come sono;
//   dopo si ricalcolano (il generatore ricalcola il futuro, il sito non ricalcola nulla)
// - `scegli(giorno, voceSalvata)`: restituisce la voce di quel giorno; riceve la voce del
//   programma se è fissa, altrimenti undefined. È lei a pescare e registrare nei mazzi.
// Restituisce { giorno: voce } per tutti i giorni percorsi.
export function percorri(programma, fino, fissiFino, scegli) {
  const giorni = Object.keys(programma).sort();
  const risultato = {};
  if (!giorni.length || fino < giorni[0]) return risultato;
  for (let g = giorni[0]; g <= fino; g = giornoDopo(g)) {
    const salvata = g <= fissiFino ? programma[g] : undefined;
    risultato[g] = scegli(g, salvata);
  }
  return risultato;
}
