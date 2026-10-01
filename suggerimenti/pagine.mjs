// Pagine HTML del form pubblico e del pannello. Niente script in linea (la Content-Security-Policy
// li vieta): il poco JavaScript sta in public/modulo.js.

const esc = (testo) => String(testo ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function pagina(titolo, corpo, { turnstile = false } = {}) {
  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="robots" content="noindex">
  <meta name="theme-color" content="#fff8ec" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#230505" media="(prefers-color-scheme: dark)">
  <title>${esc(titolo)}</title>
  <link rel="stylesheet" href="/stile.css">
  <script src="/modulo.js" defer></script>
  ${turnstile ? '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>' : ''}
</head>
<body>
${corpo}
</body>
</html>`;
}

const CALENDARIO = 'https://taffa-dev.github.io/Calendario/';

export function paginaModulo({ chiaveTurnstile, errore = '', valori = {} }) {
  return pagina('Proponi una frase', `<main class="foglio">
  <h1>Proponi una frase</h1>
  <p class="sottotitolo">Una frase celebre di un collega, per il <a href="${CALENDARIO}">Calendario</a>.</p>
  ${errore ? `<p class="errore" role="alert">${esc(errore)}</p>` : ''}
  <form method="post" action="/">
    <label for="testo">La frase</label>
    <textarea id="testo" name="testo" rows="4" maxlength="300" required>${esc(valori.testo)}</textarea>

    <label for="iniziali">Iniziali di chi l'ha detta</label>
    <input id="iniziali" name="iniziali" maxlength="12" autocomplete="off" placeholder="M.G." value="${esc(valori.iniziali)}">
    <label class="spunta"><input type="checkbox" id="anonimo" name="anonimo" ${valori.anonimo ? 'checked' : ''}> Anonimo</label>

    <!-- Trappola per i programmi automatici: le persone non la vedono -->
    <div class="nascosto" aria-hidden="true">
      <label for="sito">Sito</label><input id="sito" name="sito" tabindex="-1" autocomplete="off">
    </div>

    <div class="cf-turnstile" data-sitekey="${esc(chiaveTurnstile)}" data-language="it"></div>
    <button type="submit">Invia</button>
  </form>
</main>`, { turnstile: true });
}

export function paginaGrazie() {
  return pagina('Grazie', `<main class="foglio">
  <h1>Grazie!</h1>
  <p>La frase è arrivata. Se passa la verifica, prima o poi comparirà nel <a href="${CALENDARIO}">Calendario</a>.</p>
  <p><a href="/">Proponine un'altra</a></p>
</main>`);
}

const STATI = { nuova: 'Da vedere', approvata: 'Approvata', scartata: 'Scartata', pubblicata: 'Pubblicata' };

function schedaProposta(p, repo) {
  const r = p.regole;
  const modificabile = p.stato !== 'pubblicata';
  const bottoni = {
    nuova: ['salva:Salva', 'approva:Approva', 'scarta:Scarta'],
    approvata: ['salva:Salva', 'ripristina:Rimetti da vedere', 'scarta:Scarta'],
    scartata: ['ripristina:Rimetti da vedere', 'elimina:Elimina'],
    pubblicata: []
  }[p.stato];
  return `<article class="proposta ${p.stato}">
  <header><span class="stato">${STATI[p.stato]}</span> <time>${esc(p.ricevuta.slice(0, 16).replace('T', ' '))}</time>
    ${p.commit_sha ? `<a href="https://github.com/${esc(repo)}/commit/${esc(p.commit_sha)}">commit</a>` : ''}</header>
  <form method="post" action="/admin/proposte/${p.id}">
    <textarea name="testo" rows="3" maxlength="300" ${modificabile ? '' : 'readonly'}>${esc(p.testo)}</textarea>
    <div class="riga">
      <label>Autore <input name="autore" maxlength="40" value="${esc(p.autore)}" ${modificabile ? '' : 'readonly'}></label>
      <label>Giorni <input name="giorni" placeholder="giovedì, venerdì" value="${esc((r.giorni ?? []).join(', '))}" ${modificabile ? '' : 'readonly'}></label>
      <label>Date <input name="date" placeholder="12-25, 2026-10-31" value="${esc((r.date ?? []).join(', '))}" ${modificabile ? '' : 'readonly'}></label>
      <label>Probabilità <input name="probabilita" type="number" min="0" max="1" step="0.05" placeholder="sempre" value="${esc(r.probabilita ?? '')}" ${modificabile ? '' : 'readonly'}></label>
    </div>
    <div class="bottoni">${bottoni.map((b) => { const [azione, etichetta] = b.split(':'); return `<button name="azione" value="${azione}">${etichetta}</button>`; }).join('')}</div>
  </form>
</article>`;
}

export function paginaAdmin({ proposte, email, repo, messaggio = '' }) {
  const approvate = proposte.filter((p) => p.stato === 'approvata').length;
  return pagina('Proposte', `<main class="pannello">
  <h1>Proposte</h1>
  <p class="sottotitolo">${esc(email)} · <a href="${CALENDARIO}">Calendario</a></p>
  ${messaggio ? `<p class="avviso" role="status">${esc(messaggio)}</p>` : ''}
  <form method="post" action="/admin/pubblica" class="pubblica">
    <button ${approvate ? '' : 'disabled'}>Pubblica ${approvate === 1 ? '1 frase approvata' : `${approvate} frasi approvate`}</button>
    <p>Le aggiunge a <code>src/frasi.json</code> con un commit: GitHub ricostruisce il sito da solo. Meglio pubblicarne diverse insieme.</p>
  </form>
  <p class="aiuto">Giorni e date: la frase esce solo in quei giorni (date come <code>MM-GG</code> ogni anno o <code>AAAA-MM-GG</code> una volta). Probabilità: quante volte esce nei suoi giorni (vuota = sempre). Senza giorni né date entra nel mazzo normale.</p>
  ${proposte.length ? proposte.map((p) => schedaProposta(p, repo)).join('\n') : '<p>Nessuna proposta, per ora.</p>'}
</main>`);
}

export const paginaErrore = (titolo, testo) => pagina(titolo, `<main class="foglio"><h1>${esc(titolo)}</h1><p>${esc(testo)}</p></main>`);
