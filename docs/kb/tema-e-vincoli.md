# Tema e vincoli tecnici

Scopo: tema chiaro/scuro, icone, niente app installabile, safe area, hover, font.
Leggere quando: tocchi il tema, `index.html`, i colori, le icone in alto, il service worker, i font o le regole hover/touch.
Ultimo aggiornamento: 22/10/2026 (spostato da CLAUDE.md senza modifiche al contenuto)

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
- Font senza lampo: `index.html` precarica i tre pesi latin, `font.css` usa `font-display: block` e `main.js` monta l'app solo a font caricati (al massimo 1,5s di attesa; lo sfondo è già su `html`/`body`). Prima compariva un istante col font di ripiego e poi tutto si spostava (anche l'impaginazione dei numeri).

## Sincronia con Pills (decisione dell'utente, 26/10/2026)
I temi stagionali sono gli stessi di Pills (`../Pills/src/stagioni.js`): stessi periodi, colori ed effetti. Cambiando una stagione qui, cambiarla anche in Pills (e viceversa). Estate = tutto agosto.

## Halloween (26/10/2026)
- Attivo la settimana lun-dom che contiene il 31/10 (`stagioneDi` in `src/stagione.js`, copiato anche nello script di `index.html` per il primo disegno; test in `test/stagione.test.mjs`). Colori in `tema.css` (`:root[stagione="halloween"]`), effetti in `components/Halloween.vue` (pipistrelli, ragnatele solo di giorno, grana e alone candela solo di notte; a livello pagina, fuori dai fogli), luna e bagliore del numero in `DataDelGiorno.vue`. Provino di riferimento: `recupero-stagioni/index.html`.
- Vue scoped CSS: `:global(sel) .x` butta via `.x` e la regola vale per tutto. Scrivere `:root[stagione="halloween"] .x` senza `:global` (viene scopato solo il selettore più a destra).
- La riga sotto il mese è il `border-bottom` di `.mese`; in Halloween diventa trasparente e la riga è un `::after` con maschera lineare, interrotta attorno alla luna: l'altezza non cambia e non serve un riquadro con lo sfondo (di notte si vedrebbe sull'alone arancio).
- Il bagliore del numero è `::after` di `.giorno` con `content: attr(data-g)`: segue il foglio quando si strappa. La grana sta a z-index 3, sopra il foglio (trasparente).
- Con `prefers-reduced-motion` alone e ragnatele hanno `animation: none` (non `paused`: restavano a opacità 0 per il fade di ingresso).
- Per testare `stagioneDi` in Node serve un `document` finto con `createElement`/`createElementNS` prima dell'import dinamico (`stagione.js` importa `tema.js` e Vue).
- Pipistrelli: 2 fissi (1 sotto i 600px), non legati a `getNumeroDelGiorno` come in Pills.
- 26/10/2026: i pipistrelli NON spariscono vicino alle ragnatele (tolta la maschera del provino, su richiesta dell'utente): passano sopra e sotto senza sfumare.

## Natale (26/10/2026)
- Attivo dall'8/12 al 6/1, a cavallo d'anno, date confrontate a giorno intero (`stagioneDi` e script di `index.html`; test in `test/stagione.test.mjs`). Colori in `tema.css`; effetti in `components/Natale.vue`: neve su canvas, luccichii d'oro solo di giorno, ghirlanda di luci solo di notte. Provino di riferimento: `recupero-stagioni/index.html?s=natale`.
- `Natale.vue` è a livello pagina (fixed, z-index 1, sotto il foglio a 2 e le icone a 10). L'HTML della ghirlanda è iniettato con `v-html`: lo scoped CSS non lo raggiunge, servono i `:deep(...)`.
- La neve usa le dimensioni del viewport e distribuisce le celle su tutta la larghezza (nel provino era tutta a sinistra); al cambio tema azzera i fiocchi. Le zone dove sfuma (testo, frecce, angoli) vengono da `.data` e `.frase` del foglio visibile, osservando `.pila`. I luccichii nascono solo fuori da `.data` e `.frase`.
- Bagliore e ornamento usano la variabile `--ornamento` (oro `#9c7520` di giorno, `#ecdcaa` di notte). `DataDelGiorno.vue` ha due ornamenti, `.luna` (Halloween) e `.stella` (Natale), con la stessa regola `--vuoto`; la stella è più piccola (16u contro 24u).
- `Natale.vue` usa `window.matchMedia`: non è testabile in Node. Nei test un apostrofo nel titolo (`d'anno`) rompeva la stringa a virgolette singole.
- Da fare: confronto a occhio col provino su un telefono vero.
