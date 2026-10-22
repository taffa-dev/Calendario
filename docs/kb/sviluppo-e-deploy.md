# Sviluppo, verifica e deploy

Scopo: come provare il sito in locale, come verificarlo, come viene pubblicato.
Leggere quando: avvii il dev server, fai screenshot/prove, o devi capire la GitHub Action e il deploy.
Ultimo aggiornamento: 22/10/2026 (spostato da CLAUDE.md senza modifiche al contenuto)

## Sviluppo e verifica
- `npm run dev`, poi `?data=AAAA-MM-GG` per simulare un giorno (solo in sviluppo). Un giovedì con la frase speciale: `?data=2026-10-01`; ricorrenze e tema di Pasqua: `?data=2027-03-29` (Pasquetta), `?data=2026-12-25`. `?strappo` mostra lo strappo del giorno nuovo a ogni apertura. Il pulsantino in basso è il Vue DevTools, solo in dev.
- L'utente spesso ha già un `npm run dev` aperto sulla 5173: non chiuderlo; usare un'altra porta (`npx vite --port 5181 --strictPort`).
- Screenshot/verifiche come in Pills: `playwright-core` in una cartella temporanea (mai nel progetto), Chrome di sistema, `?data=`. Controllare entrambi i temi (`colorScheme`) e una larghezza da telefono (360-390px, `scrollWidth` uguale alla larghezza). Per l'impaginazione, un provino di molti giorni affiancati (cifre diverse, mesi con e senza lettere alte).
- Prova da telefono in LAN: porta **3000** (`npx vite --host --port 3000`), come in Pills.

## Git e deploy
- La pubblicazione la fa la GitHub Action `.github/workflows/pubblica.yml` a ogni push su `master`, ogni lunedì notte e a mano: test, `npm run programma` (con `TZ=Europe/Rome`), commit di `src/programma.json` se cambia, build, ramo `gh-pages`. Dopo un push fare `git pull` prima di lavorare: la Action aggiunge il suo commit. Anche il server dei suggerimenti pubblica così (commit di `src/frasi.json` e `src/ricorrenze.json`).
- `npm run deploy` (`gh-pages -d dist` dal PC) resta come emergenza; usa il programma così com'è nel repo.
- Identità git, `GIT_TERMINAL_PROMPT=0`/`timeout`, messaggi in italiano: come in Pills. Commit e deploy solo quando l'utente lo chiede.
