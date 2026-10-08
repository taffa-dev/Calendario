import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { creaServer, pulisciIniziali, pulisciTesto, leggiRegole, dateDalModulo, leggiFrasiPannello } from '../server.mjs';
import { dataEsiste } from '../liste.mjs';

// Servizi finti: Turnstile (accetta solo il token "buono"), GitHub (frasi.json e ricorrenze.json in memoria,
// ognuno con il suo sha e il conteggio dei commit), chiavi pubbliche di Cloudflare Access
const nuovoFile = (voci, sha) => ({ voci, sha, commit: 0, testoFile: null, messaggio: null });
const finti = { file: {}, chiavi: null };
const FRASI = 'src/frasi.json';
const RICORRENZE = 'src/ricorrenze.json';
const riparti = () => {
  finti.file[FRASI] = nuovoFile([{ testo: 'Assurdo.', autore: 'N.S.' }], 'sha-0');
  finti.file[RICORRENZE] = nuovoFile([], 'sha-r0');
};
riparti();
let servizi;
let indirizzoServizi;

function leggi(richiesta) {
  return new Promise((risolvi) => { let c = ''; richiesta.on('data', (p) => { c += p; }); richiesta.on('end', () => risolvi(c)); });
}

before(async () => {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  finti.privata = privateKey;
  finti.chiavi = { keys: [{ ...(await exportJWK(publicKey)), kid: 'k1', alg: 'RS256' }] };
  servizi = http.createServer(async (richiesta, risposta) => {
    const corpo = await leggi(richiesta);
    if (richiesta.url === '/turnstile') {
      risposta.end(JSON.stringify({ success: new URLSearchParams(corpo).get('response') === 'buono' }));
    } else if (richiesta.url === '/certs') {
      risposta.end(JSON.stringify(finti.chiavi));
    } else if (richiesta.url.startsWith('/repos/taffa-dev/Calendario/contents/')) {
      const nome = richiesta.url.slice('/repos/taffa-dev/Calendario/contents/'.length).split('?')[0];
      const file = finti.file[nome];
      if (!file) { risposta.statusCode = 404; return risposta.end(); }
      if (richiesta.method === 'GET') {
        risposta.end(JSON.stringify({ sha: file.sha, content: Buffer.from(JSON.stringify(file.voci)).toString('base64') }));
      } else {
        const { content, sha, message } = JSON.parse(corpo);
        if (sha !== file.sha) { risposta.statusCode = 409; return risposta.end('conflitto'); }
        file.testoFile = Buffer.from(content, 'base64').toString('utf8');
        file.voci = JSON.parse(file.testoFile);
        file.messaggio = message;
        file.sha = `sha-${nome}-${++file.commit}`;
        risposta.end(JSON.stringify({ commit: { sha: `commit-${file.commit}` } }));
      }
    } else {
      risposta.statusCode = 404;
      risposta.end();
    }
  });
  await new Promise((r) => servizi.listen(0, r));
  indirizzoServizi = `http://127.0.0.1:${servizi.address().port}`;
});

after(() => servizi.close());

async function avvia(extra = {}) {
  const config = {
    porta: 0,
    archivio: ':memory:',
    origine: 'https://frase-celebre.example',
    turnstile: { chiave: 'chiave', segreto: 'segreto', url: `${indirizzoServizi}/turnstile` },
    accesso: 'access',
    produzione: false,
    access: { team: 'team.example', aud: 'aud-123', certificati: `${indirizzoServizi}/certs` },
    amministratori: ['io@example.com'],
    github: { api: indirizzoServizi, token: 'token', repo: 'taffa-dev/Calendario', ramo: 'master', percorso: FRASI, percorsoRicorrenze: RICORRENZE },
    sale: 'sale',
    ...extra
  };
  const { server, archivio } = creaServer(config);
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const invia = (percorso, campi, intestazioni = {}) => fetch(base + percorso, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded', origin: config.origine, ...intestazioni },
    body: new URLSearchParams(campi)
  });
  return { base, archivio, invia, chiudi: () => new Promise((r) => server.close(r)) };
}

const tokenAccess = (email, aud = 'aud-123') => new SignJWT({ email })
  .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
  .setIssuer('https://team.example').setAudience(aud).setIssuedAt().setExpirationTime('5m')
  .sign(finti.privata);

test('pulizia: iniziali, virgolette, regole', () => {
  assert.equal(pulisciIniziali('mg'), 'M.G.');
  assert.equal(pulisciIniziali(' m. g. '), 'M.G.');
  assert.equal(pulisciIniziali('A.D.G.'), 'A.D.G.');
  assert.equal(pulisciTesto('  «Che   fastidio.»  '), 'Che fastidio.');
  assert.deepEqual(leggiRegole({ giorni: 'Giovedì', date: '' }), { regole: { giorni: ['giovedì'] } });
  assert.deepEqual(leggiRegole({ giorni: '', date: '12-25' }), { regole: { date: ['12-25'] } });
  assert.ok(leggiRegole({ giorni: 'giovedi', date: '13-01' }).errore);
  assert.ok(leggiRegole({ giorni: 'festa' }).errore);
  // Selettori di data: ogni anno → MM-GG, solo quell'anno → AAAA-MM-GG, vuote e doppie via
  assert.equal(dateDalModulo(['2026-12-25', '', '2026-10-31', '2027-12-25'], ['anno', 'anno', 'una', 'anno']), '12-25, 2026-10-31');
  assert.equal(dateDalModulo('', 'anno'), '');
});

test('tema: dal link del Calendario, poi dal cookie; senza, quello del sistema', async () => {
  const s = await avvia();
  try {
    let r = await fetch(s.base + '/');
    assert.doesNotMatch(await r.text(), /color-theme=/);
    assert.equal(r.headers.get('set-cookie'), null);
    r = await fetch(s.base + '/?tema=dark');
    assert.match(await r.text(), /<html lang="it" color-theme="dark">/);
    assert.match(r.headers.get('set-cookie'), /^tema=dark;/);
    r = await fetch(s.base + '/grazie', { headers: { cookie: 'tema=dark' } });
    assert.match(await r.text(), /color-theme="dark"/);
    r = await fetch(s.base + '/?tema=<script>', { headers: { cookie: 'tema=light' } });
    assert.match(await r.text(), /color-theme="light"/);
  } finally {
    await s.chiudi();
  }
});

test('form: proposta salvata, anonimo, trappola, captcha, limiti', async () => {
  const s = await avvia();
  try {
    assert.equal((await fetch(s.base + '/')).status, 200);

    let r = await s.invia('/', { testo: '«Tutto arrosto.»', iniziali: 'mg', 'cf-turnstile-response': 'buono' });
    assert.equal(r.status, 303);
    assert.equal(r.headers.get('location'), '/grazie');
    r = await s.invia('/', { testo: 'Che fastidio.', anonimo: 'on', 'cf-turnstile-response': 'buono' });
    assert.equal(r.status, 303);
    assert.deepEqual(s.archivio.elenco().map((p) => [p.testo, p.autore, p.stato]).sort(), [['Che fastidio.', 'Anonimo', 'nuova'], ['Tutto arrosto.', 'M.G.', 'nuova']]);

    // Captcha sbagliato, iniziali mancanti, trappola riempita: niente di salvato
    assert.equal((await s.invia('/', { testo: 'Ciao.', iniziali: 'X', 'cf-turnstile-response': 'cattivo' })).status, 400);
    assert.equal((await s.invia('/', { testo: 'Ciao.', 'cf-turnstile-response': 'buono' })).status, 400);
    assert.equal((await s.invia('/', { testo: 'Ciao.', iniziali: 'X', sito: 'http://spam', 'cf-turnstile-response': 'buono' })).status, 303);
    assert.equal(s.archivio.elenco().length, 2);

    // Da un'altra origine: rifiutato
    assert.equal((await s.invia('/', { testo: 'Ciao.', iniziali: 'X', 'cf-turnstile-response': 'buono' }, { origin: 'https://cattivo.example' })).status, 403);

    // Al massimo 5 invii l'ora dallo stesso IP (due già fatti)
    for (let i = 0; i < 3; i++) await s.invia('/', { testo: `Frase ${i}.`, iniziali: 'X', 'cf-turnstile-response': 'buono' });
    assert.equal((await s.invia('/', { testo: 'Una di troppo.', iniziali: 'X', 'cf-turnstile-response': 'buono' })).status, 429);
    // Un altro IP (dal tunnel) può ancora
    assert.equal((await s.invia('/', { testo: 'Altro IP.', iniziali: 'X', 'cf-turnstile-response': 'buono' }, { 'cf-connecting-ip': '10.0.0.9' })).status, 303);
  } finally {
    await s.chiudi();
  }
});

test('pannello: solo con un token di Access valido e un indirizzo ammesso', async () => {
  const s = await avvia();
  try {
    assert.equal((await fetch(s.base + '/admin')).status, 403);
    assert.equal((await fetch(s.base + '/admin', { headers: { 'cf-access-authenticated-user-email': 'io@example.com' } })).status, 403);
    assert.equal((await fetch(s.base + '/admin', { headers: { 'cf-access-jwt-assertion': await tokenAccess('altro@example.com') } })).status, 403);
    assert.equal((await fetch(s.base + '/admin', { headers: { 'cf-access-jwt-assertion': await tokenAccess('io@example.com', 'altra-app') } })).status, 403);
    assert.equal((await fetch(s.base + '/admin', { headers: { 'cf-access-jwt-assertion': await tokenAccess('IO@example.com') } })).status, 200);
    assert.equal((await fetch(s.base + '/admin', { headers: { cookie: `CF_Authorization=${await tokenAccess('io@example.com')}` } })).status, 200);
  } finally {
    await s.chiudi();
  }
});

test('pannello: correggi, approva, pubblica con un commit di frasi.json', async () => {
  const s = await avvia();
  const admin = { 'cf-access-jwt-assertion': await tokenAccess('io@example.com') };
  try {
    const uno = s.archivio.aggiungi({ testo: 'Facciamo merenda.', autore: 'X' });
    const due = s.archivio.aggiungi({ testo: 'Assurdo.', autore: 'N.S.' }); // c'è già nel file
    const tre = s.archivio.aggiungi({ testo: 'Spam.', autore: 'Y' });

    // Data sbagliata: non si salva
    await s.invia(`/admin/proposte/${uno}`, { azione: 'approva', testo: 'Facciamo merenda?', autore: 'A.B.', giorni: '', date: '31-12' }, admin);
    assert.equal(s.archivio.proposta(uno).stato, 'nuova');

    await s.invia(`/admin/proposte/${uno}`, { azione: 'approva', testo: 'Facciamo merenda?', autore: 'A.B.', giorni: 'venerdì', date: '' }, admin);
    await s.invia(`/admin/proposte/${due}`, { azione: 'approva', testo: 'Assurdo.', autore: 'N.S.', giorni: '', date: '' }, admin);
    await s.invia(`/admin/proposte/${tre}`, { azione: 'scarta' }, admin);
    assert.equal(s.archivio.proposta(uno).stato, 'approvata');

    // Date dai selettori del pannello (campi ripetuti); la pagina le rimostra nei selettori
    await s.invia(`/admin/proposte/${tre}`, [['azione', 'ripristina']], admin);
    await s.invia(`/admin/proposte/${tre}`, [['azione', 'salva'], ['testo', 'Spam.'], ['autore', 'Y'],
      ['data', '2026-12-25'], ['ripeti', 'anno'], ['data', '2026-10-31'], ['ripeti', 'una'], ['data', ''], ['ripeti', 'anno']], admin);
    assert.deepEqual(s.archivio.proposta(tre).regole, { date: ['12-25', '2026-10-31'] });
    const pannello = await (await fetch(s.base + '/admin', { headers: admin })).text();
    assert.match(pannello, /type="date" name="data" value="\d{4}-12-25"/);
    assert.match(pannello, /type="date" name="data" value="2026-10-31"/);
    await s.invia(`/admin/proposte/${tre}`, { azione: 'scarta' }, admin);
    assert.equal(s.archivio.proposta(tre).stato, 'scartata');

    // Senza token di Access non si pubblica
    assert.equal((await s.invia('/admin/pubblica', {})).status, 403);

    const r = await s.invia('/admin/pubblica', {}, admin);
    assert.equal(r.status, 303);
    assert.deepEqual(finti.file[FRASI].voci, [
      { testo: 'Assurdo.', autore: 'N.S.' },
      { testo: 'Facciamo merenda?', autore: 'A.B.', giorni: ['venerdì'] }
    ]);
    assert.equal(finti.file[FRASI].testoFile, '[\n  {"testo":"Assurdo.","autore":"N.S."},\n  {"testo":"Facciamo merenda?","autore":"A.B.","giorni":["venerdì"]}\n]\n');
    assert.match(finti.file[FRASI].messaggio, /Facciamo merenda\?/);
    assert.equal(s.archivio.proposta(uno).stato, 'pubblicata');
    assert.equal(s.archivio.proposta(uno).commit_sha, `commit-${finti.file[FRASI].commit}`);
    assert.equal(s.archivio.proposta(due).stato, 'pubblicata');

    // Pubblicate: non si modificano più
    await s.invia(`/admin/proposte/${uno}`, { azione: 'salva', testo: 'Cambiata', autore: 'Z' }, admin);
    assert.equal(s.archivio.proposta(uno).testo, 'Facciamo merenda?');
  } finally {
    await s.chiudi();
  }
});

test('ACCESSO=sviluppo rifiutato in produzione', () => {
  assert.throws(() => creaServer({ accesso: 'sviluppo', produzione: true }), /non è ammesso in produzione/);
});

// --- Salvataggio automatico e pagine Frasi / Ricorrenze ---
const adminToken = async () => ({ 'cf-access-jwt-assertion': await tokenAccess('io@example.com') });

// POST JSON come lo fa il pannello (pagine Frasi e Ricorrenze)
const inviaJson = (s, percorso, corpo, intestazioni = {}) => fetch(s.base + percorso, {
  method: 'POST',
  headers: { 'content-type': 'application/json', origin: 'https://frase-celebre.example', 'x-richiesta': 'fetch', ...intestazioni },
  body: JSON.stringify(corpo)
});

test('date: il giorno deve esistere nel mese', () => {
  assert.ok(dataEsiste('02-29'));
  assert.ok(dataEsiste('2028-02-29'));
  assert.ok(!dataEsiste('2026-02-29'));
  assert.ok(!dataEsiste('02-30'));
  assert.ok(!dataEsiste('04-31'));
  assert.ok(!dataEsiste('13-01'));
  assert.ok(leggiRegole({ date: '04-31' }).errore);
  assert.deepEqual(leggiRegole({ date: '02-29' }), { regole: { date: ['02-29'] } });
});

test('proposte: salvataggio automatico via fetch, risposta JSON; senza intestazione resta il redirect', async () => {
  const s = await avvia();
  const admin = await adminToken();
  try {
    const id = s.archivio.aggiungi({ testo: 'Facciamo merenda.', autore: 'X' });
    const pagina = await (await fetch(s.base + '/admin', { headers: admin })).text();
    assert.match(pagina, /data-autosalva/);
    assert.doesNotMatch(pagina, /value="salva"/);

    const salva = (campi) => s.invia(`/admin/proposte/${id}`, { azione: 'salva', ...campi }, { ...admin, 'x-richiesta': 'fetch' });
    let r = await salva({ testo: 'Facciamo merenda?', autore: 'A.B.', giorni: 'venerdì' });
    assert.equal(r.status, 200);
    assert.match(r.headers.get('content-type'), /json/);
    assert.deepEqual(await r.json(), { ok: true });
    assert.deepEqual(s.archivio.proposta(id).regole, { giorni: ['venerdì'] });

    // Input non valido: errore col messaggio del server, e quel che era salvato resta
    r = await salva({ testo: 'Altro testo', autore: 'A.B.', giorni: 'festa' });
    assert.equal(r.status, 400);
    const { ok, errore } = await r.json();
    assert.equal(ok, false);
    assert.match(errore, /Giorno non valido: festa/);
    r = await salva({ testo: '  ', autore: 'A.B.' });
    assert.equal(r.status, 400);
    assert.equal((await r.json()).errore, 'Servono frase e autore.');
    assert.equal(s.archivio.proposta(id).testo, 'Facciamo merenda?');
    assert.equal(s.archivio.proposta(id).stato, 'nuova');

    // Le date dai selettori funzionano come prima
    r = await s.invia(`/admin/proposte/${id}`, [['azione', 'salva'], ['testo', 'Facciamo merenda?'], ['autore', 'A.B.'], ['data', '2026-12-25'], ['ripeti', 'anno']], { ...admin, 'x-richiesta': 'fetch' });
    assert.equal(r.status, 200);
    assert.deepEqual(s.archivio.proposta(id).regole, { date: ['12-25'] });

    // Proposta che non c'è
    r = await s.invia('/admin/proposte/9999', { azione: 'salva', testo: 'x', autore: 'y' }, { ...admin, 'x-richiesta': 'fetch' });
    assert.equal(r.status, 404);

    // Senza l'intestazione: il vecchio redirect (anche con errore)
    r = await s.invia(`/admin/proposte/${id}`, { azione: 'approva', testo: 'Facciamo merenda?', autore: 'A.B.' }, admin);
    assert.equal(r.status, 303);
    assert.equal(s.archivio.proposta(id).stato, 'approvata');
    r = await s.invia(`/admin/proposte/${id}`, { azione: 'salva', testo: 'x', autore: '' }, admin);
    assert.equal(r.status, 303);
    assert.match(r.headers.get('location'), /Servono/);

    // Da un'altra origine: rifiutato
    assert.equal((await s.invia(`/admin/proposte/${id}`, { azione: 'salva', testo: 'Ciao', autore: 'Z' }, { ...admin, origin: 'https://cattivo.example' })).status, 403);
  } finally {
    await s.chiudi();
  }
});

test('Frasi e Ricorrenze: solo per chi entra in /admin, e solo dalla stessa origine', async () => {
  const s = await avvia();
  try {
    for (const p of ['/admin/frasi', '/admin/ricorrenze']) {
      assert.equal((await fetch(s.base + p)).status, 403);
      assert.equal((await inviaJson(s, p, { sha: 'x', voci: [] })).status, 403);
    }
    const admin = await adminToken();
    for (const p of ['/admin/frasi', '/admin/ricorrenze']) {
      assert.equal((await inviaJson(s, p, { sha: 'x', voci: [] }, { ...admin, origin: 'https://cattivo.example' })).status, 403);
    }
    // Non JSON: rifiutato
    const r = await fetch(s.base + '/admin/ricorrenze', { method: 'POST', headers: { ...admin, origin: 'https://frase-celebre.example', 'content-type': 'text/plain' }, body: '{}' });
    assert.equal(r.status, 415);
    // Senza GITHUB_TOKEN: messaggio chiaro, niente commit
    const senza = await avvia({ github: { api: indirizzoServizi, token: '', repo: 'taffa-dev/Calendario', ramo: 'master', percorso: FRASI, percorsoRicorrenze: RICORRENZE } });
    try {
      const rr = await inviaJson(senza, '/admin/ricorrenze', { sha: 'x', voci: [] }, admin);
      assert.equal(rr.status, 400);
      assert.match((await rr.json()).errore, /GITHUB_TOKEN/);
      assert.match(await (await fetch(senza.base + '/admin/frasi', { headers: admin })).text(), /GITHUB_TOKEN/);
    } finally {
      await senza.chiudi();
    }
  } finally {
    await s.chiudi();
  }
});

test('Frasi e Ricorrenze: le pagine mostrano le voci del repo, con le schede', async () => {
  riparti();
  finti.file[FRASI].voci = [{ testo: 'Assurdo.', autore: 'N.S.' }, { testo: 'Giovedì <b>.', autore: 'M.M.', giorni: ['giovedì'], date: ['12-25'] }];
  finti.file[RICORRENZE].voci = [{ data: '12-25', nome: 'Natale di casa' }, { data: '2026-03-02', nome: 'Compleanno di M.G.' }];
  const s = await avvia();
  const admin = await adminToken();
  try {
    const frasi = await (await fetch(s.base + '/admin/frasi', { headers: admin })).text();
    assert.match(frasi, /<title>Frasi<\/title>/);
    assert.match(frasi, /<h1>Frasi<\/h1>/);
    assert.match(frasi, /aria-current="page">Frasi</);
    assert.match(frasi, />Assurdo\.<\/textarea>/);
    assert.match(frasi, /Giovedì &lt;b&gt;\./);
    assert.match(frasi, /data-indice="1"/);
    assert.match(frasi, /data-sha="sha-0"/);
    assert.match(frasi, /conta come nuova/);
    assert.match(frasi, /type="date" name="data" value="\d{4}-12-25"/);

    const ric = await (await fetch(s.base + '/admin/ricorrenze', { headers: admin })).text();
    assert.match(ric, /<title>Ricorrenze<\/title>/);
    assert.match(ric, /aria-current="page">Ricorrenze</);
    assert.match(ric, /data-sha="sha-r0"/);
    // Ordinate per mese e giorno: marzo prima di dicembre, ma gli indici restano quelli del file
    assert.ok(ric.indexOf('Compleanno di M.G.') < ric.indexOf('Natale di casa'));
    assert.match(ric, /data-indice="1"[^>]*>\s*<input name="nome"[^>]*value="Compleanno di M\.G\."/);
    assert.match(ric, /type="date" name="data" value="2026-03-02"/);

    const proposte = await (await fetch(s.base + '/admin', { headers: admin })).text();
    assert.match(proposte, /href="\/admin\/frasi"/);
    assert.match(proposte, /href="\/admin\/ricorrenze"/);
    assert.match(proposte, /aria-current="page">Proposte</);
  } finally {
    await s.chiudi();
  }
});

test('Ricorrenze: Pubblica fa un solo commit, ordinato, con validazione e conflitto', async () => {
  riparti();
  finti.file[RICORRENZE].voci = [{ data: '12-25', nome: 'Natale di casa' }, { data: '2026-03-02', nome: 'Compleanno di M.G.' }, { data: '06-10', nome: 'Da togliere' }];
  const s = await avvia();
  const admin = await adminToken();
  const file = finti.file[RICORRENZE];
  const pubblica = (voci, sha = file.sha) => inviaJson(s, '/admin/ricorrenze', { sha, voci }, admin);
  try {
    // Nessuna modifica (anche solo di ordine): nessun commit
    let r = await pubblica([
      { indice: 1, nome: 'Compleanno di M.G.', data: '2026-03-02', ripeti: 'una' },
      { indice: 2, nome: 'Da togliere', data: '2026-06-10', ripeti: 'anno' },
      { indice: 0, nome: 'Natale di casa', data: '2026-12-25', ripeti: 'anno' }
    ]);
    assert.equal(r.status, 200);
    assert.match((await r.json()).messaggio, /Niente da pubblicare/);
    assert.equal(file.commit, 0);

    // Errori: la riga sbagliata è indicata, niente commit
    const buona = { nome: 'Festa', data: '2026-05-01', ripeti: 'anno' };
    for (const [voce, atteso] of [
      [{ ...buona, nome: '   ' }, /manca il nome/],
      [{ ...buona, nome: 'x'.repeat(61) }, /più lungo di 60/],
      [{ ...buona, data: '' }, /manca la data/],
      [{ ...buona, data: '2026-04-31' }, /data non valida/],
      [{ ...buona, data: '2026-02-30', ripeti: 'una' }, /data non valida/],
      [{ ...buona, data: 'ieri', ripeti: 'una' }, /data non valida/],
      [{ ...buona, indice: 7 }, /ricarica/]
    ]) {
      r = await pubblica([{ indice: 0, nome: 'Natale di casa', data: '2026-12-25', ripeti: 'anno' }, voce]);
      const dati = await r.json();
      assert.equal(r.status, 400, JSON.stringify(voce));
      assert.equal(dati.ok, false);
      assert.match(dati.errore, atteso);
      assert.equal(dati.riga, 1);
    }
    r = await pubblica([buona, { ...buona, data: '2027-05-01' }, { ...buona }]);
    assert.equal(r.status, 400);
    assert.match((await r.json()).errore, /già una ricorrenza uguale/);
    assert.equal(file.commit, 0);

    // Una aggiunta (il 29/2 è ammesso ogni anno), una tolta, una modificata: un commit solo, in ordine di calendario
    r = await pubblica([
      { indice: 0, nome: 'Natale di casa', data: '2026-12-25', ripeti: 'anno' },
      { indice: 1, nome: 'Compleanno di M.G.', data: '2026-03-03', ripeti: 'una' },
      { indice: null, nome: '  Bisestile  ', data: '2028-02-29', ripeti: 'anno' }
    ]);
    assert.equal(r.status, 200);
    assert.match((await r.json()).messaggio, /\+1, −1, ~1/);
    assert.equal(file.commit, 1);
    assert.equal(file.messaggio, 'Aggiorna le ricorrenze (+1, −1, ~1)');
    assert.equal(file.testoFile, '[\n  {"data":"02-29","nome":"Bisestile"},\n  {"data":"2026-03-03","nome":"Compleanno di M.G."},\n  {"data":"12-25","nome":"Natale di casa"}\n]\n');

    // Con lo sha vecchio il file è cambiato nel frattempo: 409, niente commit
    r = await pubblica([{ nome: 'Nuova', data: '2026-05-01', ripeti: 'una' }], 'sha-r0');
    assert.equal(r.status, 409);
    assert.match((await r.json()).errore, /ricarica la pagina/);
    assert.equal(file.commit, 1);

    // Anche se il file cambia tra la lettura e la scrittura (GitHub risponde 409)
    const cambia = finti.file[RICORRENZE];
    const shaVecchio = cambia.sha;
    const letture = fetch;
    globalThis.fetch = async (url, opzioni) => {
      if (opzioni?.method === 'PUT') cambia.sha = 'sha-altrove';
      return letture(url, opzioni);
    };
    try {
      r = await pubblica([{ nome: 'Nuova', data: '2026-05-01', ripeti: 'una' }], shaVecchio);
    } finally {
      globalThis.fetch = letture;
    }
    assert.equal(r.status, 409);
    assert.equal(file.commit, 1);

    // Svuotare l'elenco è lecito per le ricorrenze: il file diventa []
    cambia.sha = 'sha-1x';
    r = await pubblica([], 'sha-1x');
    assert.equal(r.status, 200);
    assert.equal(file.testoFile, '[]\n');
  } finally {
    await s.chiudi();
  }
});

test('Frasi: Pubblica modifica, aggiunge, toglie in un solo commit e non riordina', async () => {
  riparti();
  finti.file[FRASI].voci = [
    { testo: 'Prima.', autore: 'A.A.' },
    { testo: 'Seconda.', autore: 'B.B.' },
    { testo: 'Terza.', autore: 'C.C.', giorni: ['giovedì'] },
    { testo: 'Quarta «tra virgolette»', autore: 'D.D.' }
  ];
  const s = await avvia();
  const admin = await adminToken();
  const file = finti.file[FRASI];
  const pubblica = (voci, sha = file.sha) => inviaJson(s, '/admin/frasi', { sha, voci }, admin);
  const f = (indice, testo, autore, extra = {}) => ({ indice, testo, autore, giorni: '', data: [''], ripeti: ['anno'], ...extra });
  const invariate = () => [
    f(0, 'Prima.', 'A.A.'), f(1, 'Seconda.', 'B.B.'),
    f(2, 'Terza.', 'C.C.', { giorni: 'giovedì' }),
    f(3, 'Quarta «tra virgolette»', 'D.D.')
  ];
  try {
    // Nessuna modifica: nessun commit (anche se il testo ha virgolette che il form ripulirebbe)
    let r = await pubblica(invariate());
    assert.equal(r.status, 200);
    assert.match((await r.json()).messaggio, /Niente da pubblicare/);
    assert.equal(file.commit, 0);

    // Lista vuota, duplicati, testo corto, autore mancante, regole sbagliate, indici strani
    r = await pubblica([]);
    assert.equal(r.status, 400);
    assert.match((await r.json()).errore, /vuota/);
    for (const [voci, atteso, riga] of [
      [[...invariate(), f(null, 'Prima.', 'A.A.')], /già una frase uguale/, 4],
      [[...invariate().slice(0, 3), f(3, 'Ok', 'D.D.')], /tra 3 e 300/, 3],
      [[f(0, 'Prima.', '  ')], /manca l'autore/, 0],
      [[f(0, 'Prima.', 'x'.repeat(41))], /più lungo di 40/, 0],
      [[f(0, 'Prima.', 'A.A.', { giorni: 'festa' })], /Giorno non valido/, 0],
      [[f(0, 'Prima.', 'A.A.', { data: ['2026-02-30'], ripeti: ['una'] })], /Data non valida/, 0],
      [[f(0, 'Prima.', 'A.A.'), f(0, 'Seconda.', 'B.B.')], /ricarica/, 1],
      [[f(9, 'Prima.', 'A.A.')], /ricarica/, 0]
    ]) {
      r = await pubblica(voci);
      const dati = await r.json();
      assert.equal(r.status, 400, atteso.source);
      assert.match(dati.errore, atteso);
      assert.equal(dati.riga, riga, atteso.source);
    }
    assert.equal(file.commit, 0);

    // Modifica la seconda (refuso), toglie la terza, aggiunge due nuove (in cima nel browser: l'ultima creata prima)
    r = await pubblica([
      f(null, 'Creata per seconda.', 'N.N.', { giorni: 'venerdì', data: ['2026-12-25'], ripeti: ['anno'] }),
      f(null, '«Creata per prima.»', 'M.M.'),
      f(0, 'Prima.', 'A.A.'),
      f(1, 'Seconda, corretta.', 'B.B.'),
      f(3, 'Quarta «tra virgolette»', 'D.D.')
    ]);
    assert.equal(r.status, 200);
    assert.equal(file.commit, 1);
    assert.equal(file.messaggio, 'Aggiorna le frasi (+2, −1, ~1)');
    assert.equal(file.testoFile, [
      '[',
      '  {"testo":"Prima.","autore":"A.A."},',
      '  {"testo":"Seconda, corretta.","autore":"B.B."},',
      '  {"testo":"Quarta «tra virgolette»","autore":"D.D."},',
      '  {"testo":"Creata per prima.","autore":"M.M."},',
      '  {"testo":"Creata per seconda.","autore":"N.N.","giorni":["venerdì"],"date":["12-25"]}',
      ']', ''
    ].join('\n'));

    // Sha vecchio: 409 e niente commit
    r = await pubblica(invariate(), 'sha-0');
    assert.equal(r.status, 409);
    assert.equal(file.commit, 1);

    // Pubblicare le frasi non tocca le proposte nel database
    assert.equal(s.archivio.elenco().length, 0);
  } finally {
    await s.chiudi();
  }
});

test('Frasi: una frase già nel file non si ricontrolla se non si tocca (ce ne sono di più corte del minimo)', () => {
  const vecchie = [{ testo: '☕?', autore: 'X' }];
  assert.deepEqual(leggiFrasiPannello([{ indice: 0, testo: '☕?', autore: 'X', data: [''], ripeti: ['anno'] }], vecchie).voci, [{ indice: 0, valore: vecchie[0] }]);
  assert.ok(leggiFrasiPannello([{ indice: 0, testo: '☕!', autore: 'X' }], vecchie).errore);
});
