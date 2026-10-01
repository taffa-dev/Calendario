# Calendario

Un foglio di calendario con la data di oggi e una frase celebre dei colleghi, uguale per tutti. Vue 3 + Vite, nessun backend (le proposte di frasi arrivano dal server sul Pi in `suggerimenti/`).
Pubblicato su https://taffa-dev.github.io/Calendario/ (repo `taffa-dev/Calendario`, ramo `master`).
Il README resta volutamente scarno e misterioso: la documentazione tecnica sta qui.
Progetto gemello di Pills (`../Pills`): vedi anche il suo CLAUDE.md.

## Struttura
- `src/frasi.json` — le frasi: `{ "testo", "autore" }` più regole opzionali (sotto). Il testo va senza « »: le aggiunge `Frase.vue`.
- `src/giorno.js` — scelta della frase (pura: frasi e programma come parametri, la usa anche lo script).
- `src/mazzo.js` — mazzo a giri, **identico in Pills**: se cambia in uno va copiato nell'altro.
- `src/programma.json` + `scripts/programma.mjs` — programma delle frasi (sotto).
- `src/ricorrenze.js` + `src/ricorrenze.json` — feste nazionali (calcolate, Pasqua compresa; 4 ottobre dal 2026, legge 151/2025) e ricorrenze nostre: `[{ "data": "MM-GG" o "AAAA-MM-GG", "nome": "Compleanno di M.G." }]`. Si vedono sotto il mese, sopra la riga, una per riga.
- `src/foglio.js` — mesi e impaginazione di numero, anno e mese (sotto), condivisa da pagina e immagine.
- `src/condividi.js` — immagine 1080×1350 del foglio (canvas, colori del tema attivo) passata al menu di condivisione; dove non c'è, si scarica.
- `src/oggi.js` — data di oggi (`?data=` in sviluppo) e cambio giorno a mezzanotte / al ritorno sulla scheda.
- `src/tema.js` + script in `index.html` — tema chiaro/scuro; `src/tema.css` colori e `--cambio-tema` (2s); `src/font.css` + `src/assets/fonts/` Abhaya Libre in casa (stessi file di Google Fonts: latin e latin-ext, pesi 400/700/800).
- `src/components/` — `DataDelGiorno`, `Frase`, `Icona` (tracciati di Font Awesome Free copiati, CC BY 4.0, stesse misure del pacchetto: 1em × 1.25em).
- `public/` — `manifest.webmanifest`, `sw.js`, icone dell'app installabile.
- `suggerimenti/` — server delle proposte, gira sul Raspberry Pi (vedi `suggerimenti/LEGGIMI.md`).

## Scelta della frase
- **Frasi speciali** (con `giorni` e/o `date`): `giorni: ["giovedì"]` (accenti facoltativi), `date: ["12-25"]` ogni anno o `["2026-12-25"]` una volta. Escono solo in quei giorni: con `probabilita` (0-1) con quella probabilità, senza sempre. Un sorteggio del giorno, separato dal mazzo, diviso in fette nell'ordine: prima le frasi per data, poi quelle per giorno della settimana (il 25/12 vince sul giovedì). La frase del giovedì ha `"probabilita": 0.5`.
- **Tutte le altre** formano un mazzo a giri: ognuna esce una volta per giro, in ordine casuale ma uguale per tutti, nessuna torna prima che siano uscite tutte le altre; a cavallo tra due giri le ultime N/3 non tornano subito. Il mazzo avanza solo nei giorni senza frase speciale.
- `src/programma.json` (`{ "AAAA-MM-GG": chiave }`, chiave = hash di testo|autore) è la memoria: i giorni passati che servono al mazzo (almeno 7, per la settimana) e 60 giorni avanti. Lo aggiorna **solo** `npm run programma` (in pratica la GitHub Action): passato e oggi non si toccano, il futuro si ricalcola con le frasi attuali, quindi le frasi nuove entrano nel giro in corso. Correggere un refuso cambia la chiave: la frase conta come nuova.
- Oltre la fine del programma il sito prosegue con lo stesso mazzo (stesso risultato per tutti anche se la Action si ferma); prima dell'inizio usa il vecchio sistema (casuale puro, numero del giorno identico a Pills). Programma vuoto: il primo giorno è quello del vecchio sistema, così alla prima pubblicazione nessuno vede cambiare la frase.
- `npm test` verifica: primo giorno = vecchio sistema, sito e generatore danno le stesse frasi, nessuna ripetizione nel giro e distanza minima, frasi aggiunte senza toccare passato e oggi, speciali (giovedì circa metà, date sempre).

## Pagina
- Frecce ai lati, frecce della tastiera e scorrimento col dito: i giorni passati **della settimana in corso** (da lunedì a oggi, mai il futuro). Icone: tema e Pills in alto, condividi e proponi una frase (`frase-celebre.taffa-dev.site`) in basso.
- Il foglio è centrato in verticale. La pagina lasciata aperta passa al giorno nuovo a mezzanotte.
- Prima visita (`Guida.vue`): cinque fumetti, uno per pulsante (tema, Pills, freccia dei giorni passati, condividi, proponi); non bloccano nulla, spariscono al primo tocco/tasto o dopo 8 secondi e non ricompaiono (`localStorage` `calendario-guida-vista`). Per rivederli: cancellare quella chiave.
- **Impaginazione di numero, anno e mese** (`foglio.js`): le cifre di Abhaya Libre hanno ingombri diversi (3, 4, 5, 7, 9 scendono sotto la riga; 2 e 8 lasciano molto vuoto a destra). Il numero è centrato sull'inchiostro dell'anno, sta a 14px dall'anno e il mese 7px sotto la parte più bassa dei due (misure a grandezza piena). `impaginazione()` usa misure della pagina senza correzioni (`BASE_GIORNO`, `ANNO_SU/GIU`, `BASE_MESE`...): se cambia il CSS dei numeri in `DataDelGiorno` vanno rimisurate (elemento vuoto sulla riga di base del giorno e del mese, pixel dell'anno). L'immagine da condividere fa lo stesso calcolo con `measureText`.
- `DataDelGiorno` misura tutto in `--u` (1px su schermi larghi, meno sui telefoni, lasciando spazio alle frecce): nuove misure lì dentro come `calc(N * var(--u))`.

## Tema
- Lo script in `index.html` applica il tema prima del primo disegno (scelta salvata, altrimenti quella del sistema): niente lampo del tema sbagliato. `tema.js` lo legge e lo cambia.
- Attributo `color-theme="dark"` su `<html>` e chiave `localStorage` `color-theme` (`dark`/`light`): non rinominarli, le scelte già salvate andrebbero perse.
- Ogni testo colorato ha `transition: color var(--cambio-tema)`, così sfuma insieme allo sfondo. `prefers-reduced-motion` azzera la durata.
- `theme-color` (barre del telefono) segue il tema, anche quando lo si cambia col pulsante.

## Vincoli tecnici
- Icone ai bordi gemelle di Pills: `top: calc(0.5rem + env(safe-area-inset-top))` (e così gli altri lati), `padding: 0.35rem`, `font-size: 1rem`, icone `1em`. Se cambiano qui, vanno cambiate anche là. I link tra i due si aprono nella stessa pagina.
- App installabile: `viewport-fit=cover`, quindi l'app disegna anche sotto le barre di Android: sfondo su `html` e `body`, `env(safe-area-inset-*)` per tutto ciò che è fisso ai bordi. Service worker solo nella build: pagina dalla rete (copia salvata se manca), `assets/` dalla copia salvata.
- Effetti hover solo dentro `@media (hover: hover) and (pointer: fine)`: sui touch screen `:hover` resta attivo dopo il tocco.
- Nessuna risorsa esterna (font e icone sono in casa).

## Sviluppo e verifica
- `npm run dev`, poi `?data=AAAA-MM-GG` per simulare un giorno (solo in sviluppo). Un giovedì con la frase speciale: `?data=2026-10-01`; ricorrenze: `?data=2027-03-29` (Pasquetta), `?data=2026-12-25`. Il pulsantino in basso è il Vue DevTools, solo in dev.
- L'utente spesso ha già un `npm run dev` aperto sulla 5173: non chiuderlo; usare un'altra porta (`npx vite --port 5181 --strictPort`).
- Screenshot/verifiche come in Pills: `playwright-core` in una cartella temporanea (mai nel progetto), Chrome di sistema, `?data=`. Controllare entrambi i temi (`colorScheme`) e una larghezza da telefono (360-390px, `scrollWidth` uguale alla larghezza). Per l'impaginazione, un provino di molti giorni affiancati (cifre diverse, mesi con e senza lettere alte).
- Prova da telefono in LAN: porta **3000** (`npx vite --host --port 3000`), come in Pills.

## Git e deploy
- La pubblicazione la fa la GitHub Action `.github/workflows/pubblica.yml` a ogni push su `master`, ogni lunedì notte e a mano: test, `npm run programma` (con `TZ=Europe/Rome`), commit di `src/programma.json` se cambia, build, ramo `gh-pages`. Dopo un push fare `git pull` prima di lavorare: la Action aggiunge il suo commit. Anche il server dei suggerimenti pubblica così (commit di `src/frasi.json`).
- `npm run deploy` (`gh-pages -d dist` dal PC) resta come emergenza; usa il programma così com'è nel repo.
- Identità git, `GIT_TERMINAL_PROMPT=0`/`timeout`, messaggi in italiano: come in Pills. Commit e deploy solo quando l'utente lo chiede.
