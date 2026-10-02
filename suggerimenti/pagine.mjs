// Pagine HTML del form pubblico e del pannello. Niente script in linea (la Content-Security-Policy
// li vieta): il poco JavaScript sta in public/modulo.js.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { ordinaRicorrenze } from './liste.mjs';

// Impronta del contenuto negli URL di stile e script: Cloudflare e i browser li tengono un giorno,
// così a ogni modifica cambia l'URL e nessuno vede la pagina nuova con lo stile vecchio
const versione = (file) => createHash('sha256').update(readFileSync(new URL(`./public/${file}`, import.meta.url))).digest('hex').slice(0, 10);
const STILE = `/stile.css?v=${versione('stile.css')}`;
const MODULO = `/modulo.js?v=${versione('modulo.js')}`;

const esc = (testo) => String(testo ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const SFONDO = { light: '#fff8ec', dark: '#230505' };

const CALENDARIO = 'https://taffa-dev.github.io/Calendario/';

// Freccia "indietro" dello stesso Icona.vue di Calendario e Pills (contorno sottile, 1em × 1em)
const FRECCIA = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>';

// Barra in alto con la via del ritorno al Calendario: sempre visibile, in ogni pagina pubblica
const barra = `<nav class="barra" aria-label="Navigazione">
  <a class="indietro" href="${CALENDARIO}">${FRECCIA}<span>Calendario</span></a>
</nav>`;

// tema: 'light' o 'dark' se scelto (arriva dal Calendario, poi resta nel cookie), altrimenti segue il sistema
function pagina(titolo, corpo, { turnstile = false, tema = '', ritorno = true } = {}) {
  const coloreBarre = tema
    ? `<meta name="theme-color" content="${SFONDO[tema]}">`
    : `<meta name="theme-color" content="${SFONDO.light}" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="${SFONDO.dark}" media="(prefers-color-scheme: dark)">`;
  return `<!DOCTYPE html>
<html lang="it"${tema ? ` color-theme="${tema}"` : ''}>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="robots" content="noindex">
  ${coloreBarre}
  <title>${esc(titolo)}</title>
  <link rel="stylesheet" href="${STILE}">
  <script src="${MODULO}" defer></script>
  ${turnstile ? '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>' : ''}
</head>
<body>
${ritorno ? barra : ''}
${corpo}
</body>
</html>`;
}

const MAX_TESTO = 300;

// errore: { testo, campo? }. Con il campo ('testo' o 'iniziali') il messaggio sta sotto quel campo,
// che viene segnato e riceve il focus; senza (limiti, verifica anti-robot) sta in cima
export function paginaModulo({ chiaveTurnstile, errore = null, valori = {}, tema }) {
  const sulCampo = (campo) => errore?.campo === campo;
  const attributiErrore = (campo) => sulCampo(campo) ? ` aria-invalid="true" aria-describedby="errore-${campo}" autofocus` : '';
  const messaggio = (campo) => sulCampo(campo) ? `<p class="errore-campo" id="errore-${campo}">${esc(errore.testo)}</p>` : '';
  const lunghezza = [...String(valori.testo ?? '')].length;
  return pagina('Proponi una frase', `<main class="foglio">
  <h1>Proponi una frase</h1>
  <p class="sottotitolo">Una frase celebre di un collega, per il Calendario.</p>
  ${errore && !errore.campo ? `<p class="errore" role="alert">${esc(errore.testo)}</p>` : ''}
  <form method="post" action="/">
    <div class="campo">
      <label for="testo">La frase</label>
      <textarea id="testo" name="testo" rows="4" maxlength="${MAX_TESTO}" required${attributiErrore('testo')}>${esc(valori.testo)}</textarea>
      ${messaggio('testo')}
      <p class="nota" id="conta" aria-hidden="true">${lunghezza ? `${lunghezza} / ${MAX_TESTO}` : `Fino a ${MAX_TESTO} caratteri`}</p>
    </div>

    <div class="campo">
      <label for="iniziali">Iniziali di chi l'ha detta</label>
      <input id="iniziali" name="iniziali" maxlength="12" autocomplete="off" placeholder="A.T." value="${esc(valori.iniziali)}"${attributiErrore('iniziali')}>
      ${messaggio('iniziali')}
      <label class="spunta"><input type="checkbox" id="anonimo" name="anonimo" ${valori.anonimo ? 'checked' : ''}> Anonimo</label>
    </div>

    <!-- Trappola per i programmi automatici: le persone non la vedono -->
    <div class="nascosto" aria-hidden="true">
      <label for="sito">Sito</label><input id="sito" name="sito" tabindex="-1" autocomplete="off">
    </div>

    <!-- Invia resta spento finché la verifica non è passata (lo accende modulo.js; senza JavaScript è sempre acceso) -->
    <div class="cf-turnstile" data-sitekey="${esc(chiaveTurnstile)}" data-language="it" data-theme="${tema || 'auto'}"
      data-callback="verificaPassata" data-expired-callback="verificaScaduta" data-error-callback="verificaGuasta"></div>
    <button type="submit" class="principale" id="invia">Invia</button>
  </form>
</main>`, { turnstile: true, tema });
}

export function paginaGrazie({ tema } = {}) {
  return pagina('Grazie', `<main class="foglio">
  <h1>Grazie!</h1>
  <p class="sottotitolo">La frase è arrivata. Se passa la verifica, prima o poi comparirà nel Calendario.</p>
  <div class="azioni">
    <a class="pulsante principale" href="${CALENDARIO}">Torna al Calendario</a>
    <a class="pulsante secondario" href="/">Proponine un'altra</a>
  </div>
</main>`, { tema });
}

// Le date "MM-GG" (ogni anno) nel selettore hanno l'anno in corso (il 29/2 il prossimo bisestile)
function annoPer(meseGiorno) {
  let anno = new Date().getFullYear();
  if (meseGiorno === '02-29') while (new Date(anno, 1, 29).getMonth() !== 1) anno++;
  return anno;
}

// Una data: selettore di sistema + ogni anno / una volta. Il server le rimette in MM-GG / AAAA-MM-GG
function rigaData(data, modificabile, { togli = modificabile } = {}) {
  const ogniAnno = !/^\d{4}-/.test(data);
  const valore = data && ogniAnno ? `${annoPer(data)}-${data}` : data;
  return `<div class="data">
        <input type="date" name="data" value="${esc(valore)}" aria-label="Data" ${modificabile ? '' : 'readonly'}>
        <select name="ripeti" aria-label="Quando" ${modificabile ? '' : 'disabled'}>
          <option value="anno" ${ogniAnno ? 'selected' : ''}>ogni anno</option>
          <option value="una" ${ogniAnno ? '' : 'selected'}>una volta</option>
        </select>
        ${togli ? '<button type="button" class="secondario togli" aria-label="Togli la data">×</button>' : ''}
      </div>`;
}

const giornoRicevuta = (iso) => new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Rome' });

const STATI = { nuova: 'Da vedere', approvata: 'Approvata', scartata: 'Scartata', pubblicata: 'Pubblicata' };

function schedaProposta(p, repo) {
  const r = p.regole;
  const modificabile = p.stato !== 'pubblicata';
  const bottoni = {
    nuova: ['approva:Approva', 'scarta:Scarta'],
    approvata: ['ripristina:Rimetti da vedere', 'scarta:Scarta'],
    scartata: ['ripristina:Rimetti da vedere', 'elimina:Elimina'],
    pubblicata: []
  }[p.stato];
  // Nuove e approvate si salvano da sole mentre si scrive (modulo.js); le altre non si salvano
  const autosalva = ['nuova', 'approvata'].includes(p.stato);
  return `<article class="proposta ${p.stato}">
  <header><span class="stato">${STATI[p.stato]}</span> <time datetime="${esc(p.ricevuta)}">${esc(giornoRicevuta(p.ricevuta))}</time>
    ${p.commit_sha ? `<a href="https://github.com/${esc(repo)}/commit/${esc(p.commit_sha)}">commit</a>` : ''}</header>
  <form method="post" action="/admin/proposte/${p.id}"${autosalva ? ' data-autosalva autocomplete="off"' : ''}>
    <textarea name="testo" rows="3" maxlength="300" ${modificabile ? '' : 'readonly'}>${esc(p.testo)}</textarea>
    <div class="riga">
      <label>Autore <input name="autore" maxlength="40" value="${esc(p.autore)}" ${modificabile ? '' : 'readonly'}></label>
      <label>Giorni <input name="giorni" placeholder="giovedì, venerdì" value="${esc((r.giorni ?? []).join(', '))}" ${modificabile ? '' : 'readonly'}></label>
      <label>Probabilità <input name="probabilita" type="number" min="0" max="1" step="0.05" placeholder="sempre" value="${esc(r.probabilita ?? '')}" ${modificabile ? '' : 'readonly'}></label>
    </div>
    <fieldset class="date">
      <legend>Date</legend>
      ${[...(r.date ?? []), ...(modificabile ? [''] : [])].map((d) => rigaData(d, modificabile)).join('\n      ')}
      ${modificabile ? '<button type="button" class="secondario aggiungi">+ Aggiungi data</button>' : ''}
    </fieldset>
    <div class="bottoni">${bottoni.map((b) => { const [azione, etichetta] = b.split(':'); return `<button name="azione" value="${azione}">${etichetta}</button>`; }).join('')}
      ${autosalva ? '<span class="salvataggio" aria-live="polite"></span>' : ''}</div>
  </form>
</article>`;
}

// Schede del pannello: Proposte · Frasi · Ricorrenze
const SCHEDE = [['/admin', 'Proposte'], ['/admin/frasi', 'Frasi'], ['/admin/ricorrenze', 'Ricorrenze']];
const schede = (corrente) => `<nav class="schede" aria-label="Pannello">
    ${SCHEDE.map(([href, nome]) => `<a href="${href}"${nome === corrente ? ' aria-current="page"' : ''}>${nome}</a>`).join('\n    ')}
  </nav>`;

export function paginaAdmin({ proposte, email, repo, messaggio = '', tema }) {
  const approvate = proposte.filter((p) => p.stato === 'approvata').length;
  return pagina('Proposte', `<main class="pannello">
  ${schede('Proposte')}
  <h1>Proposte</h1>
  <p class="sottotitolo">${esc(email)}</p>
  ${messaggio ? `<p class="avviso" role="status">${esc(messaggio)}</p>` : ''}
  <form method="post" action="/admin/pubblica" class="pubblica">
    <button ${approvate ? '' : 'disabled'}>Pubblica ${approvate === 1 ? '1 frase approvata' : `${approvate} frasi approvate`}</button>
    <p>Le aggiunge a <code>src/frasi.json</code> con un commit: GitHub ricostruisce il sito da solo. Meglio pubblicarne diverse insieme.</p>
  </form>
  <p class="aiuto">Le modifiche a testo, autore e regole si salvano da sole (accanto ai bottoni compare "Salvato"); Approva salva anche le ultime. Giorni e date: la frase esce solo in quei giorni (ogni anno o una volta sola; le date vuote non contano). Probabilità: quante volte esce nei suoi giorni (vuota = sempre). Senza giorni né date entra nel mazzo normale.</p>
  ${proposte.length ? proposte.map((p) => schedaProposta(p, repo)).join('\n') : '<p>Nessuna proposta, per ora.</p>'}
</main>`, { tema });
}

export const paginaErrore = (titolo, testo, tema) => pagina(titolo, `<main class="foglio"><h1>${esc(titolo)}</h1><p>${esc(testo)}</p></main>`, { tema });

// --- Frasi e ricorrenze già pubblicate: si modificano in locale, poi un solo "Pubblica" = un commit ---

// Barra con contatore, stato e Pubblica; resta in vista mentre si scorre l'elenco
const barraEditor = (filtro) => `<div class="barra-editor">
    ${filtro}
    <p class="contatore" id="contatore"></p>
    <p class="modifiche" id="modifiche" aria-live="polite">Nessuna modifica</p>
    <button type="submit" id="pubblica-lista" disabled>Pubblica</button>
  </div>`;

// Pagina di una lista. Errore di lettura: niente editor, solo il messaggio
function paginaLista({ titolo, tipo, aiuto, errore, messaggio, email, sha, conferma, corpo, tema }) {
  return pagina(titolo, `<main class="pannello">
  ${schede(titolo)}
  <h1>${titolo}</h1>
  <p class="sottotitolo">${esc(email)}</p>
  ${errore
    ? `<p class="avviso in-errore" role="alert">${esc(errore)}</p>`
    : `<div id="esito" role="status" class="${messaggio ? 'avviso' : ''}">${esc(messaggio)}</div>
  <p class="aiuto">${aiuto}</p>
  <form class="editor" method="post" action="/admin/${tipo}" autocomplete="off" data-tipo="${tipo}" data-sha="${esc(sha)}" data-conferma="${esc(conferma)}">
  ${corpo}
  </form>`}
</main>`, { tema });
}

// Una ricorrenza: nome + data (stesso selettore delle proposte). Senza `indice` è nuova
function voceRicorrenza(r, indice) {
  return `<div class="voce voce-ricorrenza"${indice === undefined ? '' : ` data-indice="${indice}"`}>
    <input name="nome" class="nome-voce" maxlength="60" placeholder="Compleanno di M.G." aria-label="Nome della ricorrenza" value="${esc(r.nome)}">
    ${rigaData(r.data ?? '', true, { togli: false })}
    <button type="button" class="secondario elimina-voce" aria-label="Elimina la ricorrenza">×</button>
  </div>`;
}

export function paginaRicorrenze({ voci, sha, errore = '', messaggio = '', email, tema }) {
  const righe = ordinaRicorrenze(voci.map((r, indice) => ({ ...r, indice }))).map((r) => voceRicorrenza(r, r.indice));
  return paginaLista({
    titolo: 'Ricorrenze', tipo: 'ricorrenze', errore, messaggio, email, sha, tema,
    aiuto: 'Compaiono nel Calendario sotto il mese. "Ogni anno" vale ogni anno alla stessa data, "una volta" solo in quell\'anno. Le modifiche restano qui nel browser finché non premi Pubblica, che le manda al repo con un solo commit (poi la GitHub Action ripubblica il sito).',
    conferma: 'Pubblicare le ricorrenze nel Calendario?',
    corpo: `${barraEditor('')}
  <div class="elenco" data-vuoto="Nessuna ricorrenza.">${righe.join('')}</div>
  <button type="button" class="secondario aggiungi-voce">+ Aggiungi ricorrenza</button>
  <template id="modello-voce">${voceRicorrenza({})}</template>`
  });
}

// Una frase: testo, autore e, in "Regole", giorni, probabilità e date. Senza `indice` è nuova
function voceFrase(f, indice) {
  const haRegole = Boolean(f.giorni?.length || f.date?.length || f.probabilita);
  return `<div class="voce voce-frase"${indice === undefined ? '' : ` data-indice="${indice}"`}>
    <textarea name="testo" rows="3" maxlength="300" aria-label="Testo della frase">${esc(f.testo)}</textarea>
    <div class="testa-voce">
      <label>Autore <input name="autore" maxlength="40" value="${esc(f.autore)}"></label>
      <button type="button" class="secondario elimina-voce" aria-label="Elimina la frase">×</button>
    </div>
    <details class="regole"${haRegole ? ' open' : ''}>
      <summary>Regole</summary>
      <div class="riga">
        <label>Giorni <input name="giorni" placeholder="giovedì, venerdì" value="${esc((f.giorni ?? []).join(', '))}"></label>
        <label>Probabilità <input name="probabilita" type="number" min="0" max="1" step="0.05" placeholder="sempre" value="${esc(f.probabilita ?? '')}"></label>
      </div>
      <fieldset class="date">
        <legend>Date</legend>
        ${[...(f.date ?? []), ''].map((d) => rigaData(d, true)).join('\n        ')}
        <button type="button" class="secondario aggiungi">+ Aggiungi data</button>
      </fieldset>
    </details>
  </div>`;
}

export function paginaFrasi({ voci, sha, errore = '', messaggio = '', email, tema }) {
  return paginaLista({
    titolo: 'Frasi', tipo: 'frasi', errore, messaggio, email, sha, tema,
    aiuto: 'Le frasi già nel Calendario. Correggere un refuso cambia la chiave della frase: conta come nuova. Eliminare una frase già programmata nei giorni futuri va bene: il programma si ricalcola. Le nuove vanno in fondo al file (l\'ordine conta per il mazzo). Le modifiche restano qui nel browser finché non premi Pubblica: un solo commit.',
    conferma: 'Pubblicare le frasi nel Calendario?',
    corpo: `${barraEditor('<input type="search" id="filtro" placeholder="Cerca per testo o autore" aria-label="Cerca nelle frasi" autocomplete="off">')}
  <button type="button" class="secondario aggiungi-voce">+ Aggiungi frase</button>
  <div class="elenco" data-vuoto="Nessuna frase.">${voci.map((f, i) => voceFrase(f, i)).join('')}</div>
  <template id="modello-voce">${voceFrase({})}</template>`
  });
}
