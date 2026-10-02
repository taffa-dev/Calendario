// Server delle proposte di frasi per Calendario (gira sul Raspberry Pi, dietro il tunnel Cloudflare).
// /        form pubblico (Turnstile, limiti di invio, trappola per i programmi automatici)
// /admin   pannello: si verificano, correggono, approvano e pubblicano le frasi (dietro Cloudflare Access)
// /admin/frasi, /admin/ricorrenze   si modificano le liste già nel repo (src/frasi.json, src/ricorrenze.json)
// La pubblicazione è un commit nel repo di Calendario: la GitHub Action fa il resto.
import http from 'node:http';
import { createHash, randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { apriArchivio } from './db.mjs';
import { verificaTurnstile, creaVerificaAccess, creaGitHub } from './esterni.mjs';
import { paginaModulo, paginaGrazie, paginaAdmin, paginaFrasi, paginaRicorrenze, paginaErrore } from './pagine.mjs';
import { DATA, dataEsiste, ordinaRicorrenze, canonica } from './liste.mjs';

const PUBBLICI = new URL('./public/', import.meta.url);
const TIPI = { '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.woff2': 'font/woff2' };
const INVII_ORA = 5;
const INVII_GIORNO = 200;
const TEMI = ['dark', 'light'];
const GIORNI_SETTIMANA =['lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato', 'domenica'];

export function configurazioneDaAmbiente(env = process.env) {
  return {
    porta: Number(env.PORT ?? 3000),
    archivio: env.ARCHIVIO ?? fileURLToPath(new URL('./data/proposte.db', import.meta.url)),
    // Origine pubblica: i POST da altre origini si rifiutano (un sito esterno non può far
    // approvare o pubblicare qualcosa sfruttando il login di Access)
    origine: env.ORIGINE ?? 'https://frase-celebre.taffa-dev.site',
    turnstile: {
      chiave: env.TURNSTILE_SITEKEY ?? '',
      segreto: env.TURNSTILE_SECRET ?? '',
      url: env.TURNSTILE_URL ?? 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
    },
    // access: identità dal token di Cloudflare Access. sviluppo: chiunque è ADMIN_EMAIL (solo in locale)
    accesso: env.ACCESSO ?? 'access',
    produzione: env.NODE_ENV === 'production',
    access: { team: env.CF_ACCESS_TEAM_DOMAIN, aud: env.CF_ACCESS_AUD, certificati: env.CF_ACCESS_CERTS },
    amministratori: (env.ADMIN_EMAIL ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean),
    github: {
      api: env.GITHUB_API ?? 'https://api.github.com',
      token: env.GITHUB_TOKEN ?? '',
      repo: env.GITHUB_REPO ?? 'taffa-dev/Calendario',
      ramo: env.GITHUB_BRANCH ?? 'master',
      percorso: 'src/frasi.json',
      percorsoRicorrenze: env.GITHUB_RICORRENZE ?? 'src/ricorrenze.json'
    },
    sale: env.SALE_IMPRONTE ?? randomBytes(16).toString('hex')
  };
}

// --- Pulizia dei dati in arrivo ---
const spazi = (testo) => String(testo ?? '').replace(/\s+/g, ' ').trim();

// Toglie virgolette esterne (« » " “ ”): le aggiunge il Calendario
export const pulisciTesto = (testo) => spazi(testo).replace(/^[«"“„']+\s*|\s*[»"”']+$/g, '');

// "mg" → "M.G.", "m. g." → "M.G."; altrimenti com'è scritto (in maiuscolo)
export function pulisciIniziali(iniziali) {
  const t = spazi(iniziali);
  const lettere = t.replace(/[.\s]/g, '');
  if (/^\p{L}{1,4}$/u.test(lettere)) return [...lettere.toUpperCase()].map((l) => `${l}.`).join('');
  return t.toUpperCase();
}

const senzaAccenti = (testo) => testo.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const elenco = (testo) => spazi(testo).split(/\s*,\s*/).filter(Boolean);

// Selettori di data del pannello (AAAA-MM-GG + "ogni anno" / "solo quell'anno") → "12-25, 2026-10-31"
export function dateDalModulo(date, ripeti) {
  const quando = [ripeti ?? []].flat();
  return [date ?? []].flat()
    .map((data, i) => (spazi(data) && quando[i] === 'anno' ? spazi(data).slice(5) : spazi(data)))
    .filter(Boolean)
    .filter((data, i, tutte) => tutte.indexOf(data) === i)
    .join(', ');
}

// Regole del pannello → regole di frasi.json; restituisce { regole } o { errore }
export function leggiRegole({ giorni, date, probabilita }) {
  const regole = {};
  const g = elenco(giorni);
  if (g.length) {
    const sbagliati = g.filter((x) => !GIORNI_SETTIMANA.includes(senzaAccenti(x)));
    if (sbagliati.length) return { errore: `Giorno non valido: ${sbagliati.join(', ')}` };
    regole.giorni = g.map((x) => x.toLowerCase());
  }
  const d = elenco(date);
  if (d.length) {
    const sbagliate = d.filter((x) => !DATA.test(x) || !dataEsiste(x));
    if (sbagliate.length) return { errore: `Data non valida (MM-GG o AAAA-MM-GG): ${sbagliate.join(', ')}` };
    regole.date = d;
  }
  const p = spazi(probabilita);
  if (p) {
    const n = Number(p.replace(',', '.'));
    if (!(n > 0 && n <= 1)) return { errore: 'La probabilità va da 0 a 1 (vuota = sempre)' };
    if (!regole.giorni && !regole.date) return { errore: 'La probabilità serve solo con giorni o date' };
    if (n < 1) regole.probabilita = n;
  }
  return { regole };
}

// --- Liste del pannello (frasi e ricorrenze già nel repo) ---
const MAX_NOME = 60;
const MAX_AUTORE = 40;
const NON_AGGIORNATO = "L'elenco non corrisponde più al file: ricarica la pagina.";

// Le voci in arrivo sono quelle del browser, ognuna con l'`indice` che aveva nel file all'apertura
// (null se nuova): un indice fuori posto o ripetuto vuol dire pagina vecchia o richiesta strana
function controllaIndici(voci, vecchie) {
  if (!Array.isArray(voci)) return { errore: 'Elenco non valido.' };
  const visti = new Set();
  for (const [riga, v] of voci.entries()) {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return { errore: 'Elenco non valido.', riga };
    if (v.indice == null) continue;
    if (!Number.isInteger(v.indice) || v.indice < 0 || v.indice >= vecchie.length || visti.has(v.indice)) return { errore: NON_AGGIORNATO, riga };
    visti.add(v.indice);
  }
  return null;
}

// Ricorrenze → { voci: [{ indice, valore: { data, nome } }] } in ordine di calendario, oppure { errore, riga }
export function leggiRicorrenze(voci, vecchie = []) {
  const sbagliato = controllaIndici(voci, vecchie);
  if (sbagliato) return sbagliato;
  const viste = new Set();
  const lista = [];
  for (const [riga, v] of voci.entries()) {
    const dove = `Riga ${riga + 1}: `;
    const nome = spazi(v.nome);
    if (!nome) return { errore: dove + 'manca il nome.', riga };
    if ([...nome].length > MAX_NOME) return { errore: dove + `il nome è più lungo di ${MAX_NOME} caratteri.`, riga };
    const data = dateDalModulo(v.data, v.ripeti);
    if (!data) return { errore: dove + 'manca la data.', riga };
    if (!dataEsiste(data)) return { errore: dove + `data non valida (${data}).`, riga };
    if (viste.has(`${data}|${nome}`)) return { errore: dove + "c'è già una ricorrenza uguale (stessa data e stesso nome).", riga };
    viste.add(`${data}|${nome}`);
    lista.push({ indice: v.indice ?? null, valore: { data, nome } });
  }
  return { voci: ordinaRicorrenze(lista, (x) => x.valore) };
}

// Frasi → stessa forma. L'ordine nel file conta (il mazzo pesca dalla lista nell'ordine in cui è scritta):
// quelle già presenti restano dove sono, le nuove vanno in fondo, in ordine di creazione (nel browser
// l'ultima creata sta in cima, quindi arrivano al contrario)
export function leggiFrasiPannello(voci, vecchie = []) {
  const sbagliato = controllaIndici(voci, vecchie);
  if (sbagliato) return sbagliato;
  if (!voci.length) return { errore: 'Non si pubblica una lista di frasi vuota.' };
  const viste = new Set();
  const lista = [];
  for (const [riga, v] of voci.entries()) {
    const vecchia = v.indice == null ? null : vecchie[v.indice];
    // Un testo o un autore che non si è toccato resta com'è nel file, senza ripulirlo né controllarne la lunghezza
    // (nel file ce ne sono di più corti del minimo: non devono bloccare la pubblicazione di altro)
    const testoInvariato = Boolean(vecchia) && String(v.testo ?? '') === vecchia.testo;
    const autoreInvariato = Boolean(vecchia) && String(v.autore ?? '') === vecchia.autore;
    const testo = testoInvariato ? vecchia.testo : pulisciTesto(v.testo);
    const autore = autoreInvariato ? vecchia.autore : spazi(v.autore);
    const lettere = [...testo];
    const dove = `«${lettere.slice(0, 30).join('')}${lettere.length > 30 ? '…' : ''}»: `;
    if (!testoInvariato && (lettere.length < 3 || lettere.length > 300)) return { errore: dove + 'la frase deve essere tra 3 e 300 caratteri.', riga };
    if (!autore) return { errore: dove + "manca l'autore.", riga };
    if (!autoreInvariato && [...autore].length > MAX_AUTORE) return { errore: dove + `l'autore è più lungo di ${MAX_AUTORE} caratteri.`, riga };
    const { regole, errore } = leggiRegole({ giorni: v.giorni, probabilita: v.probabilita, date: dateDalModulo(v.data, v.ripeti) });
    if (errore) return { errore: dove + errore, riga };
    if (viste.has(`${testo}|${autore}`)) return { errore: dove + "c'è già una frase uguale (stesso testo e stesso autore).", riga };
    viste.add(`${testo}|${autore}`);
    const valore = { testo, autore, ...regole };
    lista.push({ indice: v.indice ?? null, valore: vecchia && canonica(vecchia) === canonica(valore) ? vecchia : valore });
  }
  const presenti = lista.filter((x) => x.indice !== null).sort((a, b) => a.indice - b.indice);
  return { voci: [...presenti, ...lista.filter((x) => x.indice === null).reverse()] };
}

// --- Server ---
export function creaServer(config) {
  if (config.accesso === 'sviluppo' && config.produzione) {
    throw new Error('ACCESSO=sviluppo non è ammesso in produzione: chiunque entrerebbe nel pannello');
  }
  const archivio = apriArchivio(config.archivio);
  const github = creaGitHub(config.github);
  const verificaAccess = config.accesso === 'access' ? creaVerificaAccess(config.access) : null;

  async function chiEntra(richiesta) {
    if (config.accesso === 'sviluppo') return config.amministratori[0] ?? 'sviluppo@localhost';
    const email = await verificaAccess(richiesta);
    return email && config.amministratori.includes(email) ? email : null;
  }

  const sicurezza = {
    'content-security-policy': "default-src 'self'; script-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; style-src 'self'; img-src 'self' data:; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'same-origin'
  };

  const invia = (risposta, stato, corpo, tipo = 'text/html; charset=utf-8', extra = {}) => {
    risposta.writeHead(stato, { 'content-type': tipo, 'cache-control': 'no-store', ...sicurezza, ...extra });
    risposta.end(corpo);
  };
  const rispondiJson = (risposta, stato, dati) => invia(risposta, stato, JSON.stringify(dati), 'application/json; charset=utf-8');
  const vaiA = (risposta, dove) => {
    risposta.writeHead(303, { location: dove, ...sicurezza });
    risposta.end();
  };

  async function leggiGrezzo(richiesta, limite) {
    richiesta.setEncoding('utf8'); // i caratteri a cavallo di due pezzi non si spezzano
    let corpo = '';
    for await (const pezzo of richiesta) {
      corpo += pezzo;
      if (corpo.length > limite) throw Object.assign(new Error('troppo grande'), { stato: 413 });
    }
    return corpo;
  }

  // Le liste delle pagine Frasi e Ricorrenze arrivano in JSON e sono più grandi dei moduli
  async function leggiJson(richiesta, limite = 262_144) {
    if (!/^application\/json\b/.test(richiesta.headers['content-type'] ?? '')) throw Object.assign(new Error('serve JSON'), { stato: 415 });
    const corpo = await leggiGrezzo(richiesta, limite);
    try {
      return JSON.parse(corpo);
    } catch {
      throw Object.assign(new Error('JSON non valido'), { stato: 400 });
    }
  }

  async function leggiCorpo(richiesta) {
    const corpo = await leggiGrezzo(richiesta, 16_384);
    // I campi ripetuti (le date del pannello) diventano elenchi
    const campi = {};
    for (const [nome, valore] of new URLSearchParams(corpo)) {
      campi[nome] = Object.hasOwn(campi, nome) ? [campi[nome]].flat().concat(valore) : valore;
    }
    return campi;
  }

  async function proponi(richiesta, risposta, tema) {
    const campi = await leggiCorpo(richiesta);
    const valori = { testo: campi.testo, iniziali: campi.iniziali, anonimo: Boolean(campi.anonimo) };
    const errore = (testo, stato = 400, campo = null) => invia(risposta, stato, paginaModulo({ chiaveTurnstile: config.turnstile.chiave, errore: { testo, campo }, valori, tema }));

    // Trappola riempita: si finge che sia andata bene, senza salvare nulla
    if (campi.sito) return vaiA(risposta, '/grazie');

    const testo = pulisciTesto(campi.testo);
    if (testo.length < 3 || testo.length > 300) return errore('La frase deve essere tra 3 e 300 caratteri.', 400, 'testo');
    const autore = valori.anonimo ? 'Anonimo' : pulisciIniziali(campi.iniziali);
    if (!autore) return errore('Scrivi le iniziali di chi l\'ha detta, oppure spunta "Anonimo".', 400, 'iniziali');
    if (autore.length > 12 || !/^[\p{L}.' ]+$/u.test(autore)) return errore('Le iniziali possono contenere solo lettere e punti.', 400, 'iniziali');

    const ip = richiesta.headers['cf-connecting-ip'] ?? richiesta.socket.remoteAddress ?? '';
    const impronta = createHash('sha256').update(config.sale + ip).digest('hex');
    const { ultimaOra, ultimoGiorno } = archivio.contaInvii(impronta);
    if (ultimaOra >= INVII_ORA) return errore('Troppe proposte in poco tempo: riprova tra un\'ora.', 429);
    if (ultimoGiorno >= INVII_GIORNO) return errore('Oggi sono arrivate già tantissime proposte: riprova domani.', 429);

    if (!(await verificaTurnstile(config.turnstile, campi['cf-turnstile-response'], ip))) {
      return errore('Verifica anti-robot non riuscita: riprova.');
    }
    archivio.registraInvio(impronta);
    archivio.aggiungi({ testo, autore });
    vaiA(risposta, '/grazie');
  }

  async function aggiornaProposta(id, richiesta, risposta) {
    // Il salvataggio automatico della scheda (modulo.js) vuole una risposta JSON; i bottoni, un redirect
    const comeFetch = richiesta.headers['x-richiesta'] === 'fetch';
    const rifiuta = (errore, stato = 400) => (comeFetch
      ? rispondiJson(risposta, stato, { ok: false, errore })
      : vaiA(risposta, '/admin?m=' + encodeURIComponent(errore)));
    const proposta = archivio.proposta(id);
    if (!proposta) return rifiuta('Proposta non trovata.', 404);
    const campi = await leggiCorpo(richiesta);
    const azione = campi.azione;
    if (['salva', 'approva'].includes(azione)) {
      if (proposta.stato === 'pubblicata') return comeFetch ? rifiuta('La proposta è già pubblicata: non si modifica più.') : vaiA(risposta, '/admin');
      if ('data' in campi) campi.date = dateDalModulo(campi.data, campi.ripeti);
      const { regole, errore } = leggiRegole(campi);
      const testo = pulisciTesto(campi.testo);
      const autore = spazi(campi.autore);
      if (errore) return rifiuta(errore);
      if (testo.length < 3 || !autore) return rifiuta('Servono frase e autore.');
      archivio.modifica(id, { testo, autore, regole });
      if (azione === 'approva') archivio.cambiaStato(id, 'approvata');
    } else if (azione === 'scarta' && proposta.stato !== 'pubblicata') {
      archivio.cambiaStato(id, 'scartata');
    } else if (azione === 'ripristina' && proposta.stato !== 'pubblicata') {
      archivio.cambiaStato(id, 'nuova');
    } else if (azione === 'elimina' && proposta.stato === 'scartata') {
      archivio.elimina(id);
    }
    if (comeFetch) return rispondiJson(risposta, 200, { ok: true });
    vaiA(risposta, '/admin');
  }

  async function pubblica(risposta) {
    const approvate = archivio.approvate();
    if (!approvate.length) return vaiA(risposta, '/admin');
    if (!config.github.token) return vaiA(risposta, '/admin?m=' + encodeURIComponent('Manca GITHUB_TOKEN: non posso pubblicare.'));
    try {
      const { frasi, sha } = await github.leggiFrasi();
      const presenti = new Set(frasi.map((f) => `${f.testo}|${f.autore}`));
      const nuove = approvate.filter((p) => !presenti.has(`${p.testo}|${p.autore}`));
      let commit = null;
      if (nuove.length) {
        const aggiunte = nuove.map((p) => ({ testo: p.testo, autore: p.autore, ...p.regole }));
        const messaggio = nuove.length === 1
          ? `Aggiunge una frase proposta: «${nuove[0].testo}»`
          : `Aggiunge ${nuove.length} frasi proposte`;
        commit = await github.scriviFrasi([...frasi, ...aggiunte], sha, messaggio);
      }
      for (const p of approvate) archivio.cambiaStato(p.id, 'pubblicata', commit);
      const fatto = nuove.length
        ? `Pubblicate ${nuove.length} frasi: tra qualche minuto sono nel Calendario.`
        : 'Erano già tutte nel Calendario.';
      vaiA(risposta, '/admin?m=' + encodeURIComponent(fatto));
    } catch (errore) {
      console.error(errore);
      vaiA(risposta, '/admin?m=' + encodeURIComponent(`Pubblicazione non riuscita: ${errore.message}`));
    }
  }

  // Le liste modificabili del pannello: ognuna è un file del repo, riscritto per intero con UN commit
  const messaggioCommit = (cosa) => ({ aggiunte, tolte, modificate }) => `Aggiorna ${cosa} (+${aggiunte}, −${tolte}, ~${modificate})`;
  const LISTE = {
    frasi: {
      file: config.github.percorso,
      leggi: leggiFrasiPannello,
      normalizza: (vecchie) => vecchie,
      messaggio: messaggioCommit('le frasi')
    },
    ricorrenze: {
      file: config.github.percorsoRicorrenze ?? 'src/ricorrenze.json',
      leggi: leggiRicorrenze,
      normalizza: (vecchie) => ordinaRicorrenze(vecchie),
      messaggio: messaggioCommit('le ricorrenze')
    }
  };
  const CAMBIATO = 'Il file è cambiato nel frattempo: ricarica la pagina.';

  async function mostraLista(risposta, tipo, { email, messaggio, tema, extra }) {
    let letto = null;
    let errore = '';
    if (!config.github.token) errore = 'Manca GITHUB_TOKEN: non posso leggere il file dal repo.';
    else {
      try {
        letto = await github.leggiLista(LISTE[tipo].file);
      } catch (e) {
        console.error(e);
        errore = `Lettura non riuscita: ${e.message}`;
      }
    }
    const pagina = tipo === 'frasi' ? paginaFrasi : paginaRicorrenze;
    invia(risposta, errore ? 502 : 200, pagina({ voci: letto?.voci ?? [], sha: letto?.sha ?? '', errore, messaggio, email, repo: config.github.repo, tema }), undefined, extra);
  }

  // Riceve { sha, voci } (lo sha è quello del file all'apertura della pagina) e risponde JSON.
  // Il commit lo fa solo se qualcosa è cambiato davvero rispetto al repo.
  async function pubblicaLista(richiesta, risposta, tipo) {
    const lista = LISTE[tipo];
    const { sha, voci } = await leggiJson(richiesta);
    if (!config.github.token) return rispondiJson(risposta, 400, { ok: false, errore: 'Manca GITHUB_TOKEN: non posso pubblicare.' });
    try {
      const { voci: vecchie, sha: shaAttuale } = await github.leggiLista(lista.file);
      if (sha !== shaAttuale) return rispondiJson(risposta, 409, { ok: false, errore: CAMBIATO });
      const esito = lista.leggi(voci, vecchie);
      if (esito.errore) return rispondiJson(risposta, 400, { ok: false, errore: esito.errore, riga: esito.riga ?? null });
      const nuove = esito.voci.map((x) => x.valore);
      if (canonica(nuove) === canonica(lista.normalizza(vecchie))) {
        return rispondiJson(risposta, 200, { ok: true, messaggio: 'Niente da pubblicare: il file è già così.' });
      }
      const aggiunte = esito.voci.filter((x) => x.indice === null).length;
      const conteggio = {
        aggiunte,
        tolte: vecchie.length - (esito.voci.length - aggiunte),
        modificate: esito.voci.filter((x) => x.indice !== null && canonica(x.valore) !== canonica(vecchie[x.indice])).length
      };
      await github.scriviLista(lista.file, nuove, sha, lista.messaggio(conteggio));
      rispondiJson(risposta, 200, { ok: true, messaggio: `Pubblicato (+${conteggio.aggiunte}, −${conteggio.tolte}, ~${conteggio.modificate}): tra qualche minuto è nel Calendario.` });
    } catch (errore) {
      if (errore.stato === 409) return rispondiJson(risposta, 409, { ok: false, errore: CAMBIATO });
      console.error(errore);
      rispondiJson(risposta, 502, { ok: false, errore: `Pubblicazione non riuscita: ${errore.message}` });
    }
  }

  async function gestisci(richiesta, risposta) {
    const url = new URL(richiesta.url, 'http://localhost');
    const percorso = url.pathname;
    const metodo = richiesta.method;

    if (metodo === 'GET' && percorso === '/salute') return invia(risposta, 200, 'ok', 'text/plain');

    // Tema: il Calendario lo passa nel link (?tema=dark|light), il cookie lo ricorda; senza, segue il sistema
    const temaNelLink = TEMI.includes(url.searchParams.get('tema')) ? url.searchParams.get('tema') : '';
    const temaNelCookie = /(?:^|;\s*)tema=(dark|light)(?:;|$)/.exec(richiesta.headers.cookie ?? '')?.[1] ?? '';
    const tema = temaNelLink || temaNelCookie;
    const ricordaTema = temaNelLink && temaNelLink !== temaNelCookie
      ? { 'set-cookie': `tema=${temaNelLink}; Path=/; Max-Age=31536000; SameSite=Lax; Secure; HttpOnly` }
      : {};

    if (metodo === 'GET' && /^\/(stile\.css|modulo\.js|font\/[\w-]+\.woff2)$/.test(percorso)) {
      const file = await readFile(new URL(percorso.slice(1), PUBBLICI));
      return invia(risposta, 200, file, TIPI[percorso.slice(percorso.lastIndexOf('.'))], { 'cache-control': 'public, max-age=86400' });
    }

    // Moduli inviati da un'altra origine: rifiutati
    if (metodo === 'POST' && config.accesso !== 'sviluppo' && richiesta.headers.origin !== config.origine) {
      return invia(risposta, 403, paginaErrore('Non permesso', 'Richiesta da un\'altra pagina.', tema));
    }

    if (percorso === '/' && metodo === 'GET') return invia(risposta, 200, paginaModulo({ chiaveTurnstile: config.turnstile.chiave, tema }), undefined, ricordaTema);
    if (percorso === '/' && metodo === 'POST') return proponi(richiesta, risposta, tema);
    if (percorso === '/grazie' && metodo === 'GET') return invia(risposta, 200, paginaGrazie({ tema }), undefined, ricordaTema);

    if (percorso === '/admin' || percorso.startsWith('/admin/')) {
      const email = await chiEntra(richiesta);
      if (!email) return invia(risposta, 403, paginaErrore('Non permesso', 'Questa pagina è solo per chi cura il Calendario.', tema));
      if (percorso === '/admin' && metodo === 'GET') {
        return invia(risposta, 200, paginaAdmin({ proposte: archivio.elenco(), email, repo: config.github.repo, messaggio: url.searchParams.get('m') ?? '', tema }), undefined, ricordaTema);
      }
      const lista = /^\/admin\/(frasi|ricorrenze)$/.exec(percorso);
      if (lista && metodo === 'GET') return mostraLista(risposta, lista[1], { email, messaggio: url.searchParams.get('m') ?? '', tema, extra: ricordaTema });
      if (lista && metodo === 'POST') return pubblicaLista(richiesta, risposta, lista[1]);
      const proposta = /^\/admin\/proposte\/(\d+)$/.exec(percorso);
      if (proposta && metodo === 'POST') return aggiornaProposta(Number(proposta[1]), richiesta, risposta);
      if (percorso === '/admin/pubblica' && metodo === 'POST') return pubblica(risposta);
    }

    invia(risposta, 404, paginaErrore('Non trovata', 'Questa pagina non esiste.', tema));
  }

  const server = http.createServer((richiesta, risposta) => {
    gestisci(richiesta, risposta).catch((errore) => {
      if (!errore.stato) console.error(errore);
      if (!risposta.headersSent) invia(risposta, errore.stato ?? 500, paginaErrore('Errore', 'Qualcosa è andato storto.'));
    });
  });
  server.on('close', () => archivio.chiudi());
  return { server, archivio };
}

// Avvio diretto: node server.mjs
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const config = configurazioneDaAmbiente();
  const { server } = creaServer(config);
  server.listen(config.porta, () => console.log(`suggerimenti in ascolto sulla porta ${config.porta} (accesso: ${config.accesso})`));
  for (const segnale of ['SIGTERM', 'SIGINT']) process.on(segnale, () => server.close(() => process.exit(0)));
}
