// Service worker: rende il sito installabile e lo fa aprire anche senza rete.
// Pagina: prima la rete (così gli aggiornamenti arrivano subito), la copia salvata se manca.
// File con l'hash nel nome (assets/): dalla copia salvata, non cambiano mai.
const CACHE = 'calendario-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (evento) => {
  evento.waitUntil((async () => {
    for (const nome of await caches.keys()) if (nome !== CACHE) await caches.delete(nome);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (evento) => {
  const richiesta = evento.request;
  const url = new URL(richiesta.url);
  if (richiesta.method !== 'GET' || url.origin !== location.origin) return;

  if (url.pathname.includes('/assets/')) {
    evento.respondWith((async () => {
      const salvata = await caches.match(richiesta);
      if (salvata) return salvata;
      const risposta = await fetch(richiesta);
      if (risposta.ok) (await caches.open(CACHE)).put(richiesta, risposta.clone());
      return risposta;
    })());
    return;
  }

  evento.respondWith((async () => {
    try {
      const risposta = await fetch(richiesta);
      if (risposta.ok) (await caches.open(CACHE)).put(richiesta, risposta.clone());
      return risposta;
    } catch (errore) {
      return (await caches.match(richiesta)) ?? (await caches.match(new URL('./', self.registration.scope))) ?? Promise.reject(errore);
    }
  })());
});
