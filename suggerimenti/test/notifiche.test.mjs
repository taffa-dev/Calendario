import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { creaNotificatore } from '../notifiche.mjs';
import { creaServer, configurazioneDaAmbiente } from '../server.mjs';

const TOKEN = 'segretissimo-123';
const SENZA_PAUSE = { attese: [0, 0], dormi: async () => {} };
const PROPOSTA = { testo: 'Ciao.', autore: 'X.' };

// fetch finto: risponde con gli esiti in lista (numero = stato HTTP, Error = errore di rete) e registra le chiamate
function fetchFinto(esiti) {
  const chiamate = [];
  const f = async (url, opzioni) => {
    chiamate.push({ url, opzioni, corpo: JSON.parse(opzioni.body) });
    const esito = esiti[Math.min(chiamate.length, esiti.length) - 1];
    if (esito instanceof Error) throw esito;
    return { status: esito };
  };
  f.chiamate = chiamate;
  return f;
}

// Cattura console.error per controllare che il token non compaia mai
async function conLog(fn) {
  const righe = [];
  const originale = console.error;
  console.error = (...a) => righe.push(a.map(String).join(' '));
  try { await fn(); } finally { console.error = originale; }
  return righe;
}

test('notifica: payload e intestazioni come da contratto del bot', async () => {
  const f = fetchFinto([202]);
  const notifica = creaNotificatore({ url: 'http://host.docker.internal:8787/v1/events', token: TOKEN, fetch: f, ...SENZA_PAUSE });
  await notifica({ testo: 'Tutto arrosto.', autore: 'M.G.' });
  assert.equal(f.chiamate.length, 1);
  const { url, opzioni, corpo } = f.chiamate[0];
  assert.equal(url, 'http://host.docker.internal:8787/v1/events');
  assert.equal(opzioni.method, 'POST');
  assert.equal(opzioni.headers.authorization, `Bearer ${TOKEN}`);
  assert.equal(opzioni.headers['content-type'], 'application/json');
  assert.equal(corpo.version, 1);
  assert.match(corpo.event_id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(corpo.type, 'calendario.frase_suggerita');
  assert.equal(corpo.source, 'calendario');
  assert.equal(new Date(corpo.occurred_at).toISOString(), corpo.occurred_at);
  assert.deepEqual(corpo.data, { frase: 'Tutto arrosto.', autore: 'M.G.' });
});

test('notifica: 500 poi 202 riprova con lo stesso event_id; errori di rete, 429 e duplicato (200) idem', async () => {
  let f = fetchFinto([500, 202]);
  await creaNotificatore({ url: 'http://bot', token: TOKEN, fetch: f, ...SENZA_PAUSE })(PROPOSTA);
  assert.equal(f.chiamate.length, 2);
  assert.equal(f.chiamate[0].corpo.event_id, f.chiamate[1].corpo.event_id);

  f = fetchFinto([new Error('ECONNREFUSED'), 429, 200]);
  await creaNotificatore({ url: 'http://bot', token: TOKEN, fetch: f, ...SENZA_PAUSE })(PROPOSTA);
  assert.equal(f.chiamate.length, 3);
  assert.equal(new Set(f.chiamate.map((c) => c.corpo.event_id)).size, 1);

  // Sempre giù: al massimo 3 tentativi, un solo messaggio nel log, nessuna eccezione
  f = fetchFinto([503]);
  const righe = await conLog(() => creaNotificatore({ url: 'http://bot', token: TOKEN, fetch: f, ...SENZA_PAUSE })(PROPOSTA));
  assert.equal(f.chiamate.length, 3);
  assert.equal(righe.length, 1);
});

test('notifica: pause di 1 s e 3 s tra i tentativi', async () => {
  const pause = [];
  await conLog(() => creaNotificatore({ url: 'http://bot', token: TOKEN, fetch: fetchFinto([500]), dormi: async (ms) => { pause.push(ms); } })(PROPOSTA));
  assert.deepEqual(pause, [1000, 3000]);
});

test('notifica: nessun nuovo tentativo su 400 (si logga)', async () => {
  const f = fetchFinto([400]);
  const righe = await conLog(() => creaNotificatore({ url: 'http://bot', token: TOKEN, fetch: f, ...SENZA_PAUSE })(PROPOSTA));
  assert.equal(f.chiamate.length, 1);
  assert.equal(righe.length, 1);
  assert.match(righe[0], /400/);
});

test('notifica: senza url o token non fa nulla; la configurazione legge le due variabili', async () => {
  const f = fetchFinto([202]);
  await creaNotificatore({ url: '', token: TOKEN, fetch: f })(PROPOSTA);
  await creaNotificatore({ url: 'http://bot', token: '', fetch: f })(PROPOSTA);
  await creaNotificatore({ fetch: f })(PROPOSTA);
  assert.equal(f.chiamate.length, 0);
  assert.deepEqual(configurazioneDaAmbiente({}).bot, { url: '', token: '' });
  assert.deepEqual(configurazioneDaAmbiente({ BOT_WEBHOOK_URL: 'http://b', BOT_WEBHOOK_TOKEN: 't' }).bot, { url: 'http://b', token: 't' });
});

test('notifica: il token non compare mai nei log, nemmeno se l\'errore lo contiene', async () => {
  const strano = new Error(`fallito con Bearer ${TOKEN}`);
  for (const esiti of [[500], [400], [strano]]) {
    const righe = await conLog(() => creaNotificatore({ url: 'http://bot', token: TOKEN, fetch: fetchFinto(esiti), ...SENZA_PAUSE })(PROPOSTA));
    assert.ok(righe.length > 0);
    assert.ok(!righe.join('\n').includes(TOKEN));
    assert.ok(!/bearer|authorization/i.test(righe.join('\n')));
  }
  // Un fetch che lancia subito non fa scappare l'eccezione
  const lancia = () => { throw new Error('boom'); };
  await conLog(() => creaNotificatore({ url: 'http://bot', token: TOKEN, fetch: lancia, ...SENZA_PAUSE })(PROPOSTA));
});

// --- Dentro il server: Turnstile finto che accetta tutto, notificatore iniettato ---
let turnstile;
before(async () => {
  turnstile = http.createServer((q, r) => { q.resume(); r.end(JSON.stringify({ success: true })); });
  await new Promise((r) => turnstile.listen(0, r));
});
after(() => turnstile.close());

async function avvia(notificatore) {
  const { server, archivio } = creaServer({
    porta: 0,
    archivio: ':memory:',
    origine: 'https://frase-celebre.example',
    turnstile: { chiave: 'c', segreto: 's', url: `http://127.0.0.1:${turnstile.address().port}/` },
    accesso: 'sviluppo',
    produzione: false,
    access: {},
    amministratori: ['io@example.com'],
    github: { api: 'http://127.0.0.1:1', token: '', repo: 'x/y', ramo: 'master', percorso: 'a', percorsoRicorrenze: 'b' },
    sale: 'sale',
    notificatore
  });
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const invia = (campi) => fetch(base + '/', {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded', origin: 'https://frase-celebre.example' },
    body: new URLSearchParams({ 'cf-turnstile-response': 'buono', ...campi })
  });
  return { archivio, invia, chiudi: () => new Promise((r) => server.close(r)) };
}

test('proponi: avvisa il bot con testo e autore ripuliti', async () => {
  const chiamate = [];
  const s = await avvia(async (p) => { chiamate.push(p); });
  try {
    const r = await s.invia({ testo: '«Tutto arrosto.»', iniziali: 'mg' });
    assert.equal(r.status, 303);
    assert.equal(r.headers.get('location'), '/grazie');
    assert.deepEqual(chiamate, [{ testo: 'Tutto arrosto.', autore: 'M.G.' }]);
  } finally {
    await s.chiudi();
  }
});

test('proponi: risponde /grazie anche se il bot è giù o lento, senza aspettarlo', async () => {
  for (const notificatore of [
    async () => { throw new Error('bot giù'); },
    () => { throw new Error('bot giù (sincrono)'); },
    () => new Promise(() => {}) // non risponde mai
  ]) {
    const s = await avvia(notificatore);
    try {
      const r = await s.invia({ testo: 'Frase buona.', iniziali: 'X' });
      assert.equal(r.status, 303);
      assert.equal(r.headers.get('location'), '/grazie');
      assert.equal(s.archivio.elenco().length, 1);
    } finally {
      await s.chiudi();
    }
  }
});

test('proponi: nessun avviso con il campo trappola o se la proposta è respinta', async () => {
  const chiamate = [];
  const s = await avvia(async (p) => { chiamate.push(p); });
  try {
    assert.equal((await s.invia({ testo: 'Ciao.', iniziali: 'X', sito: 'http://spam' })).status, 303);
    assert.equal((await s.invia({ testo: 'No', iniziali: 'X' })).status, 400); // troppo corta
    assert.equal((await s.invia({ testo: 'Senza iniziali.' })).status, 400);
    assert.equal((await s.invia({ testo: 'Ciao.', iniziali: 'X', 'cf-turnstile-response': '' })).status, 400); // captcha mancante
    assert.equal(chiamate.length, 0);
    assert.equal(s.archivio.elenco().length, 0);
  } finally {
    await s.chiudi();
  }
});
