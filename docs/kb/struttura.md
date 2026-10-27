# Struttura del progetto

Scopo: mappa dei file di `src/`, `public/`, `suggerimenti/` e di cosa fa ciascuno.
Leggere quando: tocchi un file di `src/` o `suggerimenti/` e vuoi sapere cosa fa, cosa è condiviso con Pills, cosa va tenuto allineato.
Ultimo aggiornamento: 22/10/2026 (spostato da CLAUDE.md senza modifiche al contenuto)

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
- `src/coriandoli.js` + `components/Coriandoli.vue` — coriandoli e stelle filanti (canvas, fisica semplice) che esplodono dal basso quando il foglio visto ha una ricorrenza che inizia con "Compleanno": una sola volta per giorno di compleanno, come lo strappo: si ricorda in `localStorage` (`calendario-coriandoli`, elenco dei giorni) e ripartire non si può; partono ~2,8s dopo l'entrata del foglio (o dopo la caduta del foglio strappato), il tempo di leggere il giorno (richiesta utente 27/10/2026). In sviluppo `?coriandoli` li rifà sempre. Con `prefers-reduced-motion` niente. Prova: `?data=2026-09-30`.
- `src/tema.js` + script in `index.html` — tema chiaro/scuro; `src/tema.css` colori e `--cambio-tema` (2s); `src/font.css` + `src/assets/fonts/` Abhaya Libre in casa (stessi file di Google Fonts: latin e latin-ext, pesi 400/700/800).
- `src/components/` — `DataDelGiorno`, `Frase`, `Icona` (icone a contorno sottile nello stile di Lucide, ISC: griglia 24×24, tratto 2, 1em × 1em; sono le icone che aveva Pills, l'utente le preferisce alle Font Awesome piene, "meno ingombranti, più eleganti"). `Icona.vue` è **identico in Pills**: se cambia in uno va copiato nell'altro.
- `public/` — favicon, `icona-192.png` (icona dei segnalibri) e `sw.js`, che serve solo a disinstallare (sotto).
- `suggerimenti/` — server delle proposte, gira sul Raspberry Pi (vedi `suggerimenti/LEGGIMI.md`). Il pannello `/admin` (giorni della settimana scelti con sette caselle a chip, lunedì per primo, come lista nel campo `giorni`) ha tre schede: Proposte (salvataggio automatico di ogni scheda, un commit con "Pubblica"), Frasi e Ricorrenze (modificano `src/frasi.json` e `src/ricorrenze.json` già nel repo: modifiche locali nel browser, "Pubblica" = un solo commit; le nuove frasi vanno sempre in fondo al file perché l'ordine conta per il mazzo). Un file nuovo del server va aggiunto anche al `COPY` del Dockerfile.
