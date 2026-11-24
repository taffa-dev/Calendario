# Glossario di Calendario

Termini del dominio, usati nel codice e nella KB. Dettagli: `docs/kb/struttura.md`, `docs/kb/scelta-frase.md`.

- **Foglio**: la pagina del calendario con data, mese, anno e frase; si può strappare (gesto del dito, frecce).
- **Frase**: citazione dei colleghi in `src/frasi.json`, uguale per tutti nello stesso giorno; il testo non ha « ».
- **Frase speciale**: frase legata a una ricorrenza o a regole `giorni`/`date`.
- **Mazzo a giri**: ordine di uscita delle frasi; ognuna una volta per giro, casuale ma uguale per tutti. Per questo l'ordine di `frasi.json` conta.
- **Programma**: `src/programma.json`, scritto solo da `npm run programma`.
- **Proposte**: frasi suggerite dai colleghi, raccolte dal server sul Pi in `suggerimenti/` (con pannello `/admin`).
- **Ventaglio**: le icone in alto (tema, condividi, ecc.), condivise con Pills.
- **Pills**: progetto gemello (una frase al giorno con effetti stagionali); mazzo, icone e temi stagionali sono sincronizzati.
