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
- `src/movimento.js` — movimenti del foglio (Web Animations): strappo, ritorno, resistenza ai bordi (sotto, in Pagina).
- `src/oggi.js` — data di oggi (`?data=` in sviluppo) e cambio giorno a mezzanotte / al ritorno sulla scheda.
- `src/stagione.js` — tema di Pasqua (dal lunedì santo a Pasquetta, come in Pills): `stagione="pasqua"` su `<html>`, colori in `tema.css` (chiaro: carta rosata; scuro: prugna, petali scuri col bordo argentato dalla luna) e `Petali` (piccoli dietro il foglio, pochi grandi e sfocati davanti, "vicini alla telecamera"; il vento va verso destra, al contrario di Pills). Lo script in `index.html` lo applica prima del primo disegno (Pasqua ricalcolata lì: tenerla allineata). L'utente ha scartato i rami di ciliegio, sia disegnati sia come ombra.
- `src/coriandoli.js` + `components/Coriandoli.vue` — coriandoli e stelle filanti (canvas, fisica semplice) che esplodono dal basso quando il foglio visto ha una ricorrenza che inizia con "Compleanno": all'apertura e ogni volta che ci si torna navigando i giorni (watch in `App.vue`, 700ms dopo l'entrata del foglio). Con `prefers-reduced-motion` niente. Prova: `?data=2026-09-30`.
- `src/tema.js` + script in `index.html` — tema chiaro/scuro; `src/tema.css` colori e `--cambio-tema` (2s); `src/font.css` + `src/assets/fonts/` Abhaya Libre in casa (stessi file di Google Fonts: latin e latin-ext, pesi 400/700/800).
- `src/components/` — `DataDelGiorno`, `Frase`, `Icona` (icone a contorno sottile nello stile di Lucide, ISC: griglia 24×24, tratto 2, 1em × 1em; sono le icone che aveva Pills, l'utente le preferisce alle Font Awesome piene, "meno ingombranti, più eleganti"). `Icona.vue` è **identico in Pills**: se cambia in uno va copiato nell'altro.
- `public/` — favicon, `icona-192.png` (icona dei segnalibri) e `sw.js`, che serve solo a disinstallare (sotto).
- `suggerimenti/` — server delle proposte, gira sul Raspberry Pi (vedi `suggerimenti/LEGGIMI.md`). Il pannello `/admin` ha tre schede: Proposte (salvataggio automatico di ogni scheda, un commit con "Pubblica"), Frasi e Ricorrenze (modificano `src/frasi.json` e `src/ricorrenze.json` già nel repo: modifiche locali nel browser, "Pubblica" = un solo commit; le nuove frasi vanno sempre in fondo al file perché l'ordine conta per il mazzo). Un file nuovo del server va aggiunto anche al `COPY` del Dockerfile.

## Scelta della frase
- **Frasi speciali** (con `giorni` e/o `date`): `giorni: ["giovedì"]` (accenti facoltativi), `date: ["12-25"]` ogni anno o `["2026-12-25"]` una volta. Escono solo in quei giorni. Quelle per data escono sempre; quelle per giorno della settimana sono N e ognuna ha probabilità automatica 1/(N+1) (una sola: metà e metà; due: un terzo ciascuna e un terzo per il mazzo): non c'è un campo probabilità, l'utente non vuole sceglierla. Un sorteggio del giorno, separato dal mazzo, diviso in fette nell'ordine: prima le frasi per data, poi quelle per giorno della settimana (il 25/12 vince sul giovedì).
- **Tutte le altre** formano un mazzo a giri: ognuna esce una volta per giro, in ordine casuale ma uguale per tutti, nessuna torna prima che siano uscite tutte le altre; a cavallo tra due giri le ultime N/3 non tornano subito. Il mazzo avanza solo nei giorni senza frase speciale.
- `src/programma.json` (`{ "AAAA-MM-GG": chiave }`, chiave = hash di testo|autore) è la memoria: i giorni passati che servono al mazzo (almeno 7, per la settimana) e 60 giorni avanti. Lo aggiorna **solo** `npm run programma` (in pratica la GitHub Action): passato e oggi non si toccano, il futuro si ricalcola con le frasi attuali, quindi le frasi nuove entrano nel giro in corso. Correggere un refuso cambia la chiave: la frase conta come nuova.
- Oltre la fine del programma il sito prosegue con lo stesso mazzo (stesso risultato per tutti anche se la Action si ferma); prima dell'inizio usa il vecchio sistema (casuale puro, numero del giorno identico a Pills). Programma vuoto: il primo giorno è quello del vecchio sistema, così alla prima pubblicazione nessuno vede cambiare la frase.
- `npm test` verifica: primo giorno = vecchio sistema, sito e generatore danno le stesse frasi, nessuna ripetizione nel giro e distanza minima, frasi aggiunte senza toccare passato e oggi, speciali (giovedì circa metà, venerdì con due frasi un terzo ciascuna, date sempre).

## Pagina
- Frecce ai lati, frecce della tastiera e scorrimento col dito: i giorni passati **della settimana in corso** (da lunedì a oggi, mai il futuro). In alto a sinistra un'icona a **quattro quadratini** (disegnata in `Icona.vue`) che apre a ventaglio (quarto di cerchio verso il foglio; da sinistra a destra, cioè da sotto i quadratini al loro fianco: tema, proponi una frase, condividi; aperto, l'icona ruota di 45°). Proponi apre `frase-celebre.taffa-dev.site/?tema=dark|light`: il form prende il tema del Calendario e lo ricorda in un cookie. Il tema lascia aperto il ventaglio; si chiude toccando altrove, con Esc o dopo aver condiviso. In alto a destra, da solo, il link a Pills (dove Pills ha il link al Calendario). L'utente ha scartato le icone nei quattro angoli ("sembra una pulsantiera"), il colophon in basso e la guida della prima visita.
- Il foglio è centrato in verticale. La pagina lasciata aperta passa al giorno nuovo a mezzanotte.
- **Movimento come un blocco a strappo** (`movimento.js`, ricerche: "Designing Fluid Interfaces" di Apple, Material 3, calendari a strappo su CodePen e GitHub):
  - Avanti il foglio sopra si strappa e cade verso sinistra, sotto c'è il giorno dopo; indietro quello di prima risale dal basso e si riattacca sopra (più piano, 1,1s: "si posa, non scatta"). Un passaggio alla volta.
  - Strappo: ruota su un angolo in alto, il fondo si solleva verso chi guarda (`rotateX`), poi cade. Ogni foglio ha la sua `.carta` (colore della pagina, bordo di sopra frastagliato con `clip-path`) e l'ombra su `.ombra-carta`, fuori dalla carta perché il ritaglio la taglierebbe. Colori dell'ombra in `tema.css` (`--ombra-foglio`): al buio bordeaux scuro e morbido; l'utente ha scartato sia la luce dietro il foglio sia l'ombra nera.
  - Col dito le animazioni sono ferme e il dito le fa scorrere: verso sinistra il foglio si solleva (sotto c'è già il giorno dopo), verso destra quello di ieri risale; al rilascio finiscono se si va oltre un quarto di schermo (con la spinta), altrimenti tornano indietro. Il foglio di oggi resta fermo: l'utente ha scartato l'effetto "frusta" (foglio che segue il dito e poi scatta). Dove non c'è un giorno, resistenza come iOS.
  - Strappo del giorno nuovo: aprendo il sito il giorno dopo l'ultima visita (`localStorage` `calendario-ultimo-giorno`: l'origine è condivisa con Pills) o a mezzanotte con la pagina aperta, il foglio di ieri si strappa e cade verso destra dopo una pausa. All'apertura le parti del foglio entrano a cascata.
  - `prefers-reduced-motion`: solo dissolvenze.
- **Impaginazione di numero, anno e mese** (`foglio.js`): le cifre di Abhaya Libre hanno ingombri diversi (3, 4, 5, 7, 9 scendono sotto la riga; 2 e 8 lasciano molto vuoto a destra). Il numero è centrato sull'inchiostro dell'anno, sta a 14px dall'anno e il mese 7px sotto la parte più bassa dei due (misure a grandezza piena). `impaginazione()` usa misure della pagina senza correzioni (`BASE_GIORNO`, `ANNO_SU/GIU`, `BASE_MESE`...): se cambia il CSS dei numeri in `DataDelGiorno` vanno rimisurate (elemento vuoto sulla riga di base del giorno e del mese, pixel dell'anno). L'immagine da condividere fa lo stesso calcolo con `measureText`. Dopo un 1 finale (e un po' dopo un 7) c'è aria in più (`ariaDopo`): il piede dell'1 arriva sotto l'anno e a distanza misurata uguale sembrava attaccato.
- `DataDelGiorno` misura tutto in `--u` (1px su schermi larghi, meno sui telefoni, lasciando spazio alle frecce): nuove misure lì dentro come `calc(N * var(--u))`.

## Tema
- Lo script in `index.html` applica il tema prima del primo disegno (scelta salvata, altrimenti quella del sistema): niente lampo del tema sbagliato. `tema.js` lo legge e lo cambia.
- Attributo `color-theme="dark"` su `<html>` e chiave `localStorage` `color-theme` (`dark`/`light`): non rinominarli, le scelte già salvate andrebbero perse.
- Ogni testo colorato ha `transition: color var(--cambio-tema)`, così sfuma insieme allo sfondo. `prefers-reduced-motion` azzera la durata.
- `theme-color` (barre del telefono) segue il tema e la stagione, anche quando lo si cambia col pulsante (`aggiornaBarre()` legge `--color-bg`).

## Vincoli tecnici
- Icone in alto identiche a quelle di Pills (stesso `Icona.vue`; colore del testo, opacità 0.55 che sale a 1 con hover/focus e sul quadratino aperto, messa sull'`svg` per non sommarsi a quella del ventaglio): `top: env(safe-area-inset-top)` (e così il lato), `padding: 0.875rem`, `font-size: 1.25rem`: icona di 20px in un'area da toccare di 48px (Material 48dp, Apple 44pt, WCAG 2.5.5 44px: l'utente le trovava piccole e scomode); frecce laterali 44×48, ventaglio con raggio 4.25rem perché le aree non si sovrappongano; il link a Pills sta dove in Pills c'è il link al Calendario. Se cambiano qui, vanno cambiate anche là. I link tra i due si aprono nella stessa pagina.
- **Niente app installabile** (scelta dell'utente: aprire Pills dal Calendario o viceversa apriva il browser interno dell'app). Niente manifest; `public/sw.js` resta solo per chi l'aveva installata: cancella le copie salvate e si disattiva; `main.js` disattiva i service worker rimasti. Non rimettere un service worker che salva copie.
- `viewport-fit=cover`: sfondo su `html` e `body`, `env(safe-area-inset-*)` per tutto ciò che è fisso ai bordi.
- Effetti hover solo dentro `@media (hover: hover) and (pointer: fine)`: sui touch screen `:hover` resta attivo dopo il tocco.
- Nessuna risorsa esterna (font e icone sono in casa).

## Sviluppo e verifica
- `npm run dev`, poi `?data=AAAA-MM-GG` per simulare un giorno (solo in sviluppo). Un giovedì con la frase speciale: `?data=2026-10-01`; ricorrenze e tema di Pasqua: `?data=2027-03-29` (Pasquetta), `?data=2026-12-25`. `?strappo` mostra lo strappo del giorno nuovo a ogni apertura. Il pulsantino in basso è il Vue DevTools, solo in dev.
- L'utente spesso ha già un `npm run dev` aperto sulla 5173: non chiuderlo; usare un'altra porta (`npx vite --port 5181 --strictPort`).
- Screenshot/verifiche come in Pills: `playwright-core` in una cartella temporanea (mai nel progetto), Chrome di sistema, `?data=`. Controllare entrambi i temi (`colorScheme`) e una larghezza da telefono (360-390px, `scrollWidth` uguale alla larghezza). Per l'impaginazione, un provino di molti giorni affiancati (cifre diverse, mesi con e senza lettere alte).
- Prova da telefono in LAN: porta **3000** (`npx vite --host --port 3000`), come in Pills.

## Git e deploy
- La pubblicazione la fa la GitHub Action `.github/workflows/pubblica.yml` a ogni push su `master`, ogni lunedì notte e a mano: test, `npm run programma` (con `TZ=Europe/Rome`), commit di `src/programma.json` se cambia, build, ramo `gh-pages`. Dopo un push fare `git pull` prima di lavorare: la Action aggiunge il suo commit. Anche il server dei suggerimenti pubblica così (commit di `src/frasi.json` e `src/ricorrenze.json`).
- `npm run deploy` (`gh-pages -d dist` dal PC) resta come emergenza; usa il programma così com'è nel repo.
- Identità git, `GIT_TERMINAL_PROMPT=0`/`timeout`, messaggi in italiano: come in Pills. Commit e deploy solo quando l'utente lo chiede.
