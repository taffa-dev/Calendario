// Server delle proposte di frasi per Calendario (gira sul Raspberry Pi, dietro il tunnel Cloudflare).
// /        form pubblico (Turnstile, limiti di invio, trappola per i programmi automatici)
// /admin   pannello: si verificano, correggono, approvano e pubblicano le frasi (dietro Cloudflare Access)
// La pubblicazione è un commit di src/frasi.json nel repo di Calendario: la GitHub Action fa il resto.
import http from 'node:http';
import { createHash, randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { apriArchivio } from './db.mjs';
import { verificaTurnstile, creaVerificaAccess, creaGitHub } from './esterni.mjs';
import { paginaModulo, paginaGrazie, paginaAdmin, paginaErrore } from './pagine.mjs';

const PUBBLICI = new URL('./public/', import.meta.url);
const TIPI = { '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.woff2': 'font/woff2' };
const INVII_ORA = 5;
const INVII_GIORNO = 200;
const GIORNI_SETTIMANA = ['lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato', 'domenica'];

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
      percorso: 'src/frasi.json'
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
    const sbagliate = d.filter((x) => !/^(\d{4}-)?(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(x));
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
  const vaiA = (risposta, dove) => {
    risposta.writeHead(303, { location: dove, ...sicurezza });
    risposta.end();
  };

  async function leggiCorpo(richiesta) {
    let corpo = '';
    for await (const pezzo of richiesta) {
      corpo += pezzo;
      if (corpo.length > 16_384) throw Object.assign(new Error('troppo grande'), { stato: 413 });
    }
    return Object.fromEntries(new URLSearchParams(corpo));
  }

  async function proponi(richiesta, risposta) {
    const campi = await leggiCorpo(richiesta);
    const valori = { testo: campi.testo, iniziali: campi.iniziali, anonimo: Boolean(campi.anonimo) };
    const errore = (testo, stato = 400) => invia(risposta, stato, paginaModulo({ chiaveTurnstile: config.turnstile.chiave, errore: testo, valori }));

    // Trappola riempita: si finge che sia andata bene, senza salvare nulla
    if (campi.sito) return vaiA(risposta, '/grazie');

    const testo = pulisciTesto(campi.testo);
    if (testo.length < 3 || testo.length > 300) return errore('La frase deve essere tra 3 e 300 caratteri.');
    const autore = valori.anonimo ? 'Anonimo' : pulisciIniziali(campi.iniziali);
    if (!autore) return errore('Scrivi le iniziali di chi l\'ha detta, oppure spunta "Anonimo".');
    if (autore.length > 12 || !/^[\p{L}.' ]+$/u.test(autore)) return errore('Le iniziali possono contenere solo lettere e punti.');

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
    const proposta = archivio.proposta(id);
    if (!proposta) return vaiA(risposta, '/admin?m=' + encodeURIComponent('Proposta non trovata.'));
    const campi = await leggiCorpo(richiesta);
    const azione = campi.azione;
    if (['salva', 'approva'].includes(azione)) {
      if (proposta.stato === 'pubblicata') return vaiA(risposta, '/admin');
      const { regole, errore } = leggiRegole(campi);
      const testo = pulisciTesto(campi.testo);
      const autore = spazi(campi.autore);
      if (errore) return vaiA(risposta, '/admin?m=' + encodeURIComponent(errore));
      if (testo.length < 3 || !autore) return vaiA(risposta, '/admin?m=' + encodeURIComponent('Servono frase e autore.'));
      archivio.modifica(id, { testo, autore, regole });
      if (azione === 'approva') archivio.cambiaStato(id, 'approvata');
    } else if (azione === 'scarta' && proposta.stato !== 'pubblicata') {
      archivio.cambiaStato(id, 'scartata');
    } else if (azione === 'ripristina' && proposta.stato !== 'pubblicata') {
      archivio.cambiaStato(id, 'nuova');
    } else if (azione === 'elimina' && proposta.stato === 'scartata') {
      archivio.elimina(id);
    }
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

  async function gestisci(richiesta, risposta) {
    const url = new URL(richiesta.url, 'http://localhost');
    const percorso = url.pathname;
    const metodo = richiesta.method;

    if (metodo === 'GET' && percorso === '/salute') return invia(risposta, 200, 'ok', 'text/plain');

    if (metodo === 'GET' && /^\/(stile\.css|modulo\.js|font\/[\w-]+\.woff2)$/.test(percorso)) {
      const file = await readFile(new URL(percorso.slice(1), PUBBLICI));
      return invia(risposta, 200, file, TIPI[percorso.slice(percorso.lastIndexOf('.'))], { 'cache-control': 'public, max-age=86400' });
    }

    // Moduli inviati da un'altra origine: rifiutati
    if (metodo === 'POST' && config.accesso !== 'sviluppo' && richiesta.headers.origin !== config.origine) {
      return invia(risposta, 403, paginaErrore('Non permesso', 'Richiesta da un\'altra pagina.'));
    }

    if (percorso === '/' && metodo === 'GET') return invia(risposta, 200, paginaModulo({ chiaveTurnstile: config.turnstile.chiave }));
    if (percorso === '/' && metodo === 'POST') return proponi(richiesta, risposta);
    if (percorso === '/grazie' && metodo === 'GET') return invia(risposta, 200, paginaGrazie());

    if (percorso === '/admin' || percorso.startsWith('/admin/')) {
      const email = await chiEntra(richiesta);
      if (!email) return invia(risposta, 403, paginaErrore('Non permesso', 'Questa pagina è solo per chi cura il Calendario.'));
      if (percorso === '/admin' && metodo === 'GET') {
        return invia(risposta, 200, paginaAdmin({ proposte: archivio.elenco(), email, repo: config.github.repo, messaggio: url.searchParams.get('m') ?? '' }));
      }
      const proposta = /^\/admin\/proposte\/(\d+)$/.exec(percorso);
      if (proposta && metodo === 'POST') return aggiornaProposta(Number(proposta[1]), richiesta, risposta);
      if (percorso === '/admin/pubblica' && metodo === 'POST') return pubblica(risposta);
    }

    invia(risposta, 404, paginaErrore('Non trovata', 'Questa pagina non esiste.'));
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
