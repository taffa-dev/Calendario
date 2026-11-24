# Istruzioni per gli agenti del progetto Calendario

Calendario: un foglio di calendario con la data di oggi e una frase celebre dei colleghi, uguale per tutti. Vue 3 + Vite, nessun backend (le proposte di frasi arrivano dal server sul Pi in `suggerimenti/`). Pubblicato su https://taffa-dev.github.io/Calendario/ (repo `taffa-dev/Calendario`, ramo `master`). Progetto gemello di Pills (`..\Pills`). Lingua del progetto: italiano.

Cose da fare: `ROADMAP.md`. Glossario: `CONTEXT.md`. Indice della conoscenza: `docs/kb/INDICE.md`. Decisioni dell'utente con data: `docs/kb/decisioni.md`. Server delle proposte: `suggerimenti/LEGGIMI.md`.

## Regole sempre valide

- **Il README resta volutamente scarno e misterioso**: la documentazione tecnica sta qui e in `docs/kb/`.
- **`mazzo.js`, `Icona.vue` e `volo.js` sono identici in Pills**: se cambiano in uno vanno copiati nell'altro (così anche le icone in alto). Dettagli: `struttura.md`, `tema-e-vincoli.md`.
- **I temi stagionali di Calendario e Pills restano sincronizzati** (decisione del 26/10/2026): stessi periodi, colori ed effetti; ogni modifica a una stagione va fatta in entrambi i progetti. Dettagli: `tema-e-vincoli.md`.
- **`src/programma.json` lo aggiorna solo `npm run programma`** (in pratica la GitHub Action): non modificarlo a mano. Dettagli: `scelta-frase.md`.
- **Le nuove frasi vanno in fondo a `src/frasi.json`** (l'ordine conta per il mazzo), il testo senza « ».
- **Non rinominare `color-theme`** (attributo su `<html>` e chiave `localStorage`).
- **Niente app installabile**: non rimettere un service worker che salva copie (scelta dell'utente).
- **Dopo un push fai `git pull` prima di lavorare** (la Action aggiunge il suo commit); commit e deploy solo quando l'utente lo chiede, messaggi in italiano. Dettagli: `sviluppo-e-deploy.md`.
- **L'utente ha già un `npm run dev` sulla 5173**: non chiuderlo, usa un'altra porta (`npx vite --port 5181 --strictPort`).

## Come lavorare con la conoscenza del progetto

- Prima di lavorare su un tema leggi SOLO il suo file da `docs/kb/INDICE.md`.
- Ogni cosa da fare trovata lavorando, o detta dall'utente "da fare dopo", va in `ROADMAP.md`.
- Le decisioni dell'utente vanno in `docs/kb/decisioni.md` con data e motivo.
- Procedura di fine lavoro: `docs/kb/PROTOCOLLO.md`.
