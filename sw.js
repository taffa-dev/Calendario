// L'app installabile è stata tolta: aprire Pills dal Calendario (o viceversa) apriva il browser interno
// dell'app e rompeva l'idea di app. Questo service worker resta solo per chi l'aveva installata:
// cancella le copie salvate, si disattiva e ricarica le pagine aperte dalla rete.
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (evento) => {
  evento.waitUntil((async () => {
    for (const nome of await caches.keys()) await caches.delete(nome);
    await self.registration.unregister();
    for (const cliente of await self.clients.matchAll({ type: 'window' })) cliente.navigate(cliente.url);
  })());
});
