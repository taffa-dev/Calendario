// Avviso al bot Telegram "Taffa Pi BOT" (stesso Raspberry Pi) quando arriva una nuova proposta.
// POST {url} con `Authorization: Bearer <token>`; 202 = accettato, 200 = duplicato (va bene).
// 429, 5xx ed errori di rete: si riprova con LO STESSO event_id (il bot scarta i doppioni);
// altri 4xx: non si riprova. Non lancia mai eccezioni e non scrive mai il token nei log.
const TIMEOUT_MS = 5000;
const ATTESE_PREDEFINITE = [1000, 3000]; // pausa prima del 2° e del 3° tentativo
const dorme = (ms) => new Promise((risolvi) => setTimeout(risolvi, ms));

export function creaNotificatore({ url, token, fetch = globalThis.fetch, attese = ATTESE_PREDEFINITE, dormi = dorme } = {}) {
  // Senza configurazione il bot è semplicemente spento
  if (!url || !token) return async () => {};

  return async function notificaProposta({ testo, autore }) {
    try {
      const evento = {
        version: 1,
        event_id: crypto.randomUUID(),
        type: 'calendario.frase_suggerita',
        source: 'calendario',
        occurred_at: new Date().toISOString(),
        data: { frase: testo, autore }
      };
      const corpo = JSON.stringify(evento);
      const tentativi = attese.length + 1;
      for (let n = 1; n <= tentativi; n++) {
        let esito;
        try {
          const risposta = await fetch(url, {
            method: 'POST',
            headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
            body: corpo,
            signal: AbortSignal.timeout(TIMEOUT_MS)
          });
          if (risposta.status === 200 || risposta.status === 202) return;
          // Altri 4xx (429 escluso): richiesta sbagliata, riprovare non serve
          if (risposta.status >= 400 && risposta.status < 500 && risposta.status !== 429) {
            console.error(`Notifica al bot rifiutata (HTTP ${risposta.status}, evento ${evento.event_id}): non si riprova.`);
            return;
          }
          esito = `HTTP ${risposta.status}`;
        } catch (errore) {
          esito = `errore di rete (${errore?.name ?? 'Error'})`;
        }
        if (n === tentativi) {
          console.error(`Notifica al bot non riuscita dopo ${tentativi} tentativi (${esito}, evento ${evento.event_id}).`);
          return;
        }
        await dormi(attese[n - 1]);
      }
    } catch (errore) {
      console.error(`Notifica al bot: errore inatteso (${errore?.name ?? 'Error'}).`);
    }
  };
}
