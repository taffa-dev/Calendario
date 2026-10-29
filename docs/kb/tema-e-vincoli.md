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
- 29/10/2026: tornando indietro di notte il bagliore del foglio vecchio (blur 20u) sbucava oltre il bordo della carta del foglio nuovo (inchiostro + 24px). Ora `App.vue` lo nasconde (`display: none`) sul foglio che esce all'indietro (classe `.uscente`) e su quello coperto dal foglio tirato dal dito (`.in-ritorno` sulla `.pila`). Non verificato a occhio: da controllare.
- 29/10/2026, **la carta (`.carta`) restava visibile dopo ogni ritorno indietro** (freccia o dito): `strappa()` la dimensiona (`preparaCarta`) e l'animazione `indietro` resta in `fill: both` o l'inline-style resta, quindi la carta, opaca del colore della pagina, copriva l'alone `.alone` di Halloween (fixed, z-index 1, dietro il foglio) e si vedeva come un rettangolo col bordo strappato (segnalato dall'utente su telefono; online c'era già il fix del bagliore, era un altro difetto). Ora `.carta` è `opacity: 0` e `strappa()` la anima `[0, 1, 1]` con offset `[0, .05, 1]` insieme al foglio: si vede solo da staccata. Verificato con Chrome headless via CDP (script in scratchpad; pixel prima 32 fuori e 28 dentro la carta, dopo senza salto; durante lo strappo la carta copre ancora il giorno sotto). Lo stesso problema valeva per neve (Natale) e lucciole (Estate) dietro la carta.
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

## Estate (26/10/2026)
- Tutto agosto (`getMonth() === 7`, come Pills): `stagioneDi` e script di `index.html`; test in `test/stagione.test.mjs`. Colori e `--mare` in `tema.css`; effetti in `components/Estate.vue` (ombra di rami solo di giorno, lucciole solo di notte, a livello pagina); l'onda è la riga sotto il mese (`.mare` in `DataDelGiorno.vue`: svg al 200% di larghezza con `translateX(-50%)` perché è periodica; il `border-bottom` resta trasparente, altezza invariata; di notte linea più spessa, 2.4 contro 1.8). Provino: `recupero-stagioni/index.html?s=estate`.
- Rami: dimensionati sullo spazio libero, non sul viewport (il provino usava `36vmax`/`64vmin`/`60vw` e in finestre strette e alte copriva il testo: segnalato dall'utente il 26/10/2026). Il ramo grande parte da min(40% larghezza, 35% altezza), il piccolo da min(28%, 28%) e si rimpicciolisce a passi del 7% finché non tocca più `.data`, `.frase` e le frecce; sotto la metà del massimo sparisce. Si rimisura al resize e osservando `.pila`. Foglie più piccole e rade del provino, opacità .14.
- I rami non usano `mix-blend-mode: multiply`: `.estate` crea uno stacking context e il multiply non avrebbe nulla da mescolare; basta `#4a3a1a` a bassa opacità.
- Lucciole: da 6 a 16, distanti almeno 70px, solo sotto il 52% dell'altezza, fuori da `.data`/`.frase` (margine 36px) e dalle frecce; con `prefers-reduced-motion` ferme a opacità .5.
- Da fare: controllo su un telefono vero.

## Modalità musica: provini (29/10/2026)
- Radio vera sul Pi (Icecast+Liquidsoap), icona solo in Calendario; piano e decisioni in [ROADMAP.md](../../ROADMAP.md) e [decisioni.md](decisioni.md). Provino: `recupero-stagioni/musica.html` (file singolo, nessuna risorsa esterna; `?v=a|b|c|tutto`, `?tema=scuro`, `?src=URL`; senza file suona un sintetizzatore lofi integrato). a = numero che respira e riga ondulata, b = anelli come cerchi d'acqua, c = pulviscolo. Scritto da Sonnet: sintassi controllata (`node --check`), **non visto né sentito**; da giudicare a occhio e a orecchio, e da misurare su telefono vero (CPU).
- L'analisi (`creaAnalisi(ctx, ingresso).leggi(dt, attivo)` → `{bassi, medi, alti, energia, picco, spettro, spettroMax, nonDisponibile}`) non tocca il DOM: va riusata in un componente Vue. Attacco 50 ms, rilascio 550 ms, massimo che scende del 3%/s; fft 2048, smoothing 0.85.
- **CORS**: con `createMediaElementSource` una sorgente senza `Access-Control-Allow-Origin` esce **muta**, non solo senza analisi. Lo stream Icecast deve mandare l'intestazione e l'`<audio>` ha `crossOrigin='anonymous'` impostato prima di `src`. Su iOS Safari l'analisi di uno stream è inaffidabile: serve un ripiego (animazione finta) da decidere dopo la prova.
- Vincoli visivi: niente variazioni sopra ~3 al secondo; con `prefers-reduced-motion` nessuna reazione.
- Da rifinire nel provino: `play` per `?src=` è sovrascritta più in basso (rattoppo), colore del pulviscolo che non sfuma col tema, riga con estremità sempre sfumate (quasi, ma non del tutto, identica a riposo).
- Esposizione dello stream (da decidere): Cloudflare Tunnel per l'audio continuo è zona grigia (termini CDN); alternativa sottodominio "solo DNS" con Caddy se c'è IPv4 pubblica.

## Pipistrelli: nuovo motore di volo (26/10/2026)
- I pipistrelli di Halloween non sono più loop CSS: `.pipistrelli` è un div vuoto riempito da `src/volo.js` (rAF, un solo transform per pipistrello, ali interpolate in JS con `setAttribute('d')`, quindi animate anche su Safari). `volo.js` e `test/volo.test.mjs` sono IDENTICI in Pills (come `mazzo.js` e `Icona.vue`): ogni modifica va copiata nell'altro progetto. Provini approvati: `recupero-stagioni/pipistrelli.html` e `pipistrelli-pills.html`.
- Volo: raffiche di battiti e planate sincronizzate con la salita del corpo, traiettoria a molla con virate e inversioni a U, profondità (qualche pipistrello grande e sfocato in primo piano), voli a eventi (uno ogni 10-40 s, all'apertura già 2 in volo, tetto `MAX_PIP` 5), fasce libere da `metti()` con fallback sopra il numero. Costanti in `TARATURA` in cima a `volo.js`; le differenze di un progetto passano da `config.taratura`.
- Stile in Vue scoped solo con `:deep(.pip)` e `:deep(svg)` (gli elementi nascono da JS). L'opacità dell'svg sta nel CSS (.42 chiaro, .7 scuro) e il motore ci moltiplica la sua.
- In dev `window.__pip` espone il motore: `__pip.setRitmoReale(false)` e `__pip.evento()` per le prove. Con `prefers-reduced-motion` non parte nulla.
- Decisione dell'utente (26/10/2026) ancora valida: nessuna maschera, i pipistrelli passano sopra le ragnatele senza sparire.
