import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { creaServer, pulisciIniziali, pulisciTesto, leggiRegole } from '../server.mjs';

// Servizi finti: Turnstile (accetta solo il token "buono"), GitHub (un frasi.json in memoria),
// chiavi pubbliche di Cloudflare Access
const finti = { frasi: [{ testo: 'Assurdo.', autore: 'N.S.' }], sha: 'sha-0', commit: 0, chiavi: null };
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
    } else if (richiesta.url.startsWith('/repos/taffa-dev/Calendario/contents/src/frasi.json')) {
      if (richiesta.method === 'GET') {
        risposta.end(JSON.stringify({ sha: finti.sha, content: Buffer.from(JSON.stringify(finti.frasi)).toString('base64') }));
      } else {
        const { content, sha, message } = JSON.parse(corpo);
        if (sha !== finti.sha) { risposta.statusCode = 409; return risposta.end('conflitto'); }
        finti.testoFile = Buffer.from(content, 'base64').toString('utf8');
        finti.frasi = JSON.parse(finti.testoFile);
        finti.messaggio = message;
        finti.sha = `sha-${++finti.commit}`;
        risposta.end(JSON.stringify({ commit: { sha: `commit-${finti.commit}` } }));
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
    github: { api: indirizzoServizi, token: 'token', repo: 'taffa-dev/Calendario', ramo: 'master', percorso: 'src/frasi.json' },
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
  assert.deepEqual(leggiRegole({ giorni: 'Giovedì', date: '', probabilita: '0,5' }), { regole: { giorni: ['giovedì'], probabilita: 0.5 } });
  assert.deepEqual(leggiRegole({ giorni: '', date: '12-25', probabilita: '' }), { regole: { date: ['12-25'] } });
  assert.ok(leggiRegole({ giorni: 'giovedi', date: '13-01' }).errore);
  assert.ok(leggiRegole({ giorni: 'festa' }).errore);
  assert.ok(leggiRegole({ probabilita: '0.5' }).errore);
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
    await s.invia(`/admin/proposte/${uno}`, { azione: 'approva', testo: 'Facciamo merenda?', autore: 'A.B.', giorni: '', date: '31-12', probabilita: '' }, admin);
    assert.equal(s.archivio.proposta(uno).stato, 'nuova');

    await s.invia(`/admin/proposte/${uno}`, { azione: 'approva', testo: 'Facciamo merenda?', autore: 'A.B.', giorni: 'venerdì', date: '', probabilita: '0.3' }, admin);
    await s.invia(`/admin/proposte/${due}`, { azione: 'approva', testo: 'Assurdo.', autore: 'N.S.', giorni: '', date: '', probabilita: '' }, admin);
    await s.invia(`/admin/proposte/${tre}`, { azione: 'scarta' }, admin);
    assert.equal(s.archivio.proposta(uno).stato, 'approvata');
    assert.equal(s.archivio.proposta(tre).stato, 'scartata');

    // Senza token di Access non si pubblica
    assert.equal((await s.invia('/admin/pubblica', {})).status, 403);

    const r = await s.invia('/admin/pubblica', {}, admin);
    assert.equal(r.status, 303);
    assert.deepEqual(finti.frasi, [
      { testo: 'Assurdo.', autore: 'N.S.' },
      { testo: 'Facciamo merenda?', autore: 'A.B.', giorni: ['venerdì'], probabilita: 0.3 }
    ]);
    assert.equal(finti.testoFile, '[\n  {"testo":"Assurdo.","autore":"N.S."},\n  {"testo":"Facciamo merenda?","autore":"A.B.","giorni":["venerdì"],"probabilita":0.3}\n]\n');
    assert.match(finti.messaggio, /Facciamo merenda\?/);
    assert.equal(s.archivio.proposta(uno).stato, 'pubblicata');
    assert.equal(s.archivio.proposta(uno).commit_sha, `commit-${finti.commit}`);
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
