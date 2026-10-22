# CLAUDE.md

Indice per agenti. Dettagli non ovvi per tema: [docs/kb/INDICE.md](docs/kb/INDICE.md) (leggere solo il file del tema). Roadmap e cose da fare: [ROADMAP.md](ROADMAP.md). Server delle proposte: [suggerimenti/LEGGIMI.md](suggerimenti/LEGGIMI.md).

Calendario: un foglio di calendario con la data di oggi e una frase celebre dei colleghi, uguale per tutti. Vue 3 + Vite, nessun backend (le proposte di frasi arrivano dal server sul Pi in `suggerimenti/`). Pubblicato su https://taffa-dev.github.io/Calendario/ (repo `taffa-dev/Calendario`, ramo `master`). Progetto gemello di Pills (`../Pills`). Lingua del progetto: italiano.

## Regole sempre valide

- **Il README resta volutamente scarno e misterioso**: la documentazione tecnica sta qui e in `docs/kb/`.
- **`mazzo.js` e `Icona.vue` sono identici in Pills**: se cambiano in uno vanno copiati nell'altro (così anche le icone in alto). Dettagli: `docs/kb/struttura.md`, `docs/kb/tema-e-vincoli.md`.
- **`src/programma.json` lo aggiorna solo `npm run programma`** (in pratica la GitHub Action): non modificarlo a mano. Dettagli: `docs/kb/scelta-frase.md`.
- **Le nuove frasi vanno sempre in fondo a `src/frasi.json`**: l'ordine conta per il mazzo. Il testo senza « ». Dettagli: `docs/kb/struttura.md`.
- **Tema**: non rinominare `color-theme` (attributo su `<html>` e chiave `localStorage`). Dettagli: `docs/kb/tema-e-vincoli.md`.
- **Niente app installabile**: non rimettere un service worker che salva copie (scelta dell'utente). Dettagli: `docs/kb/tema-e-vincoli.md`.
- **Dopo un push `git pull` prima di lavorare** (la Action aggiunge il suo commit); commit e deploy solo quando l'utente lo chiede, messaggi in italiano. Dettagli: `docs/kb/sviluppo-e-deploy.md`.
- **L'utente ha già un `npm run dev` sulla 5173**: non chiuderlo, usa un'altra porta (`npx vite --port 5181 --strictPort`).

## Come lavorare con la KB (deciso dall'utente, 22/10/2026)

1. **Prima** di lavorare su un tema: leggi SOLO il suo file KB (scegli dall'INDICE).
2. **Alla fine di ogni sviluppo** aggiorna da solo, **senza chiedere permesso**: il file KB del tema (cose non ovvie, avvertenze, numeri di tenuta con data); `docs/kb/decisioni.md` se c'è una decisione dell'utente; `ROADMAP.md` (voci chiuse, cose nuove).
3. **Ogni cosa da sistemare o fare trovata lavorando, o detta dall'utente "da fare dopo", va subito in `ROADMAP.md`**, senza chiedere (procedura: `docs/kb/PROTOCOLLO.md`).
4. I sub-agent riportano le cose imparate nel rapporto; le scrive chi li ha lanciati.
5. Chiudi il messaggio finale con una riga: `KB: file toccati …`.

## Ruoli dei modelli (regola dell'utente, 12/10/2026)

Ricerca, analisi, specifiche e revisione con **Opus**; codice con **Sonnet via sub-agent**, a cui si passa una specifica completa (regole sopra + file KB del tema). Una richiesta di analisi o di roadmap non è una richiesta di codice. La regola sta anche nel CLAUDE.md globale dell'utente, ma le sessioni cloud non lo caricano: per questo è ripetuta qui.

## Indice breve (versione completa: docs/kb/INDICE.md)

- `struttura.md`: mappa dei file di `src/` e `suggerimenti/`, cosa è condiviso con Pills
- `scelta-frase.md`: frasi speciali, mazzo a giri, programma delle frasi, test
- `pagina-e-movimento.md`: frecce, ventaglio, strappo, gesto col dito, impaginazione di numero/anno/mese
- `tema-e-vincoli.md`: tema chiaro/scuro, icone, niente app installabile, font
- `sviluppo-e-deploy.md`: dev server, verifiche, GitHub Action e deploy
- `decisioni.md`: decisioni dell'utente per data, con motivo
- `PROTOCOLLO.md`: come si aggiorna e si pota la KB

## Manutenzione di questo file

CLAUDE.md resta < 6 KB (`wc -c CLAUDE.md`): i dettagli vanno nella KB. Ogni file KB < ~25 KB (se cresce, dividilo e aggiorna INDICE). Un fatto sta in UN solo file, gli altri lo linkano. Data (gg/mm/aaaa) su ogni decisione e su ogni numero di tenuta. Una voce falsa si corregge o si cancella, non si lascia.
