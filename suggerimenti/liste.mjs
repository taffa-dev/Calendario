// Cose pure delle liste del pannello (ricorrenze, frasi): date, ordine, confronti.
// Nessuna dipendenza: le usano sia il server sia le pagine.

// MM-GG o AAAA-MM-GG (stessa regola di src/frasi.json)
export const DATA = /^(?:(\d{4})-)?(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const GIORNI_NEL_MESE = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// Il giorno esiste nel mese (30/02 e 31/04 no). Senza anno il 29/02 è ammesso; con l'anno solo se bisestile
export function dataEsiste(data) {
  const m = DATA.exec(data);
  if (!m) return false;
  const [, anno, mese, giorno] = m;
  if (Number(giorno) > GIORNI_NEL_MESE[Number(mese) - 1]) return false;
  return !anno || new Date(Date.UTC(Number(anno), Number(mese) - 1, Number(giorno))).getUTCDate() === Number(giorno);
}

// Per mese e giorno, poi per anno (quelle di ogni anno prima), poi per nome. `voce` dice dove sta la ricorrenza
export function ordinaRicorrenze(elementi, voce = (x) => x) {
  const chiave = ({ data }) => `${data.slice(-5)}|${data.length > 5 ? data.slice(0, 4) : ''}`;
  return [...elementi].sort((a, b) => chiave(voce(a)).localeCompare(chiave(voce(b))) || voce(a).nome.localeCompare(voce(b).nome, 'it'));
}

// JSON con le chiavi in ordine: due voci uguali si confrontano anche se scritte con un altro ordine
export const canonica = (valore) => JSON.stringify(valore, (_, x) => (x && typeof x === 'object' && !Array.isArray(x)
  ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : 1)))
  : x));
