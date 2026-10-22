# Scelta della frase

Scopo: frasi speciali, mazzo a giri, programma delle frasi (`programma.json`), test.
Leggere quando: tocchi `giorno.js`, `mazzo.js`, `programma.json`, `scripts/programma.mjs`, `frasi.json` o le regole `giorni`/`date`.
Ultimo aggiornamento: 22/10/2026 (spostato da CLAUDE.md senza modifiche al contenuto)

## Scelta della frase
- **Frasi speciali** (con `giorni` e/o `date`): `giorni: ["giovedì"]` (accenti facoltativi), `date: ["12-25"]` ogni anno o `["2026-12-25"]` una volta. Escono solo in quei giorni. Quelle per data escono sempre; quelle per giorno della settimana sono N e ognuna ha probabilità automatica 1/(N+1) (una sola: metà e metà; due: un terzo ciascuna e un terzo per il mazzo): non c'è un campo probabilità, l'utente non vuole sceglierla. Un sorteggio del giorno, separato dal mazzo, diviso in fette nell'ordine: prima le frasi per data, poi quelle per giorno della settimana (il 25/12 vince sul giovedì).
- **Tutte le altre** formano un mazzo a giri: ognuna esce una volta per giro, in ordine casuale ma uguale per tutti, nessuna torna prima che siano uscite tutte le altre; a cavallo tra due giri le ultime N/3 non tornano subito. Il mazzo avanza solo nei giorni senza frase speciale.
- `src/programma.json` (`{ "AAAA-MM-GG": chiave }`, chiave = hash di testo|autore) è la memoria: i giorni passati che servono al mazzo (almeno 7, per la settimana) e 60 giorni avanti. Lo aggiorna **solo** `npm run programma` (in pratica la GitHub Action): passato e oggi non si toccano, il futuro si ricalcola con le frasi attuali, quindi le frasi nuove entrano nel giro in corso. Correggere un refuso cambia la chiave: la frase conta come nuova.
- Oltre la fine del programma il sito prosegue con lo stesso mazzo (stesso risultato per tutti anche se la Action si ferma); prima dell'inizio usa il vecchio sistema (casuale puro, numero del giorno identico a Pills). Programma vuoto: il primo giorno è quello del vecchio sistema, così alla prima pubblicazione nessuno vede cambiare la frase.
- `npm test` verifica: primo giorno = vecchio sistema, sito e generatore danno le stesse frasi, nessuna ripetizione nel giro e distanza minima, frasi aggiunte senza toccare passato e oggi, speciali (giovedì circa metà, venerdì con due frasi un terzo ciascuna, date sempre).
