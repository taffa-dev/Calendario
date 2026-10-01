# Suggerimenti — proposte di frasi per il Calendario

Server Node (nessun framework; SQLite integrato in Node; unica dipendenza `jose`) che gira sul
Raspberry Pi `taffa-pi`, dietro il tunnel Cloudflare condiviso `taffa-dev-tunnel`.

- `https://frase-celebre.taffa-dev.site/` — form pubblico: frase, iniziali o "Anonimo".
  Protezioni: Cloudflare Turnstile, 5 invii l'ora per IP (impronta, mai l'IP in chiaro) e 200 al
  giorno in tutto, campo trappola per i programmi automatici, POST solo dalla stessa origine.
- `https://frase-celebre.taffa-dev.site/admin` — pannello, dietro Cloudflare Access. Il server
  verifica comunque il token firmato di Access (mai l'header con l'email in chiaro) e che l'email
  sia in `ADMIN_EMAIL`: se Access fosse configurato male, il pannello resta chiuso.
  Si corregge testo e autore, si aggiungono le regole (giorni, date, probabilità), si approva o
  si scarta. **Pubblica** fa un unico commit di `src/frasi.json` nel repo: la GitHub Action
  ricalcola il programma e ripubblica il sito. Le date si scelgono col calendario di sistema,
  ognuna "ogni anno" (diventa `MM-GG`) o "una volta" (`AAAA-MM-GG`).
- Tema: quello del Calendario, che lo passa nel link (`?tema=dark|light`); il cookie `tema` lo
  ricorda (anche per il pannello). Senza, segue il sistema.

## Sviluppo

```bash
cd suggerimenti
npm install
npm test
# Pannello senza Access (solo in locale; con NODE_ENV=production il server si rifiuta di partire)
ACCESSO=sviluppo ADMIN_EMAIL=io@example.com TURNSTILE_SITEKEY=1x00000000000000000000AA \
  TURNSTILE_SECRET=1x0000000000000000000000000000000AA PORT=3200 npm run dev
```

Le chiavi `1x000…AA` sono quelle di prova di Turnstile (passa sempre). Senza `GITHUB_TOKEN`
"Pubblica" dice che manca il token e non tocca nulla.

## Messa in funzione (una volta)

1. **Immagine**: la costruisce la Action `.github/workflows/suggerimenti.yml` a ogni push che
   tocca `suggerimenti/` (`ghcr.io/taffa-dev/calendario-suggerimenti:latest`, linux/arm64).
   Il pacchetto nasce privato: il Pi è già loggato su `ghcr.io` (vedi Library Project).
2. **Turnstile**: dashboard Cloudflare → Turnstile → *Add widget*, dominio
   `frase-celebre.taffa-dev.site`, modalità *Managed*. Sitekey e secret nel `.env`.
3. **Tunnel**: Zero Trust → Networks → Tunnels → `taffa-dev-tunnel` → *Public hostname*:
   `frase-celebre.taffa-dev.site` → `HTTP` → `calendario-suggerimenti:3000`.
4. **Access**: Zero Trust → Access → Applications → *Self-hosted*, dominio
   `frase-celebre.taffa-dev.site`, percorso `admin` (copre anche `/admin/...`), solo login
   Google, policy *Allow* con la propria email. L'**AUD tag** (Overview dell'applicazione) va in
   `CF_ACCESS_AUD`. La radice `/` resta pubblica.
5. **GitHub**: token *fine-grained* solo sul repo `taffa-dev/Calendario`, permesso
   *Contents: Read and write*. Va in `GITHUB_TOKEN`. I commit fatti con questo token avviano la
   Action che ripubblica il sito (quelli fatti col token interno delle Action no).
6. **Pi**:
   ```bash
   # Dal PC: solo compose ed .env, niente sorgenti
   ssh taffa-pi 'mkdir -p ~/calendario-suggerimenti/data'
   scp suggerimenti/docker-compose.yml suggerimenti/.env taffa-pi:calendario-suggerimenti/
   ssh taffa-pi 'cd ~/calendario-suggerimenti && docker compose --env-file .env pull && docker compose --env-file .env up -d'
   ssh taffa-pi 'curl -s 127.0.0.1:3200/salute'
   ```
   Aggiornare dopo un push: le ultime due righe. Il nome del progetto compose è esplicito
   (`calendario-suggerimenti`): mai `docker compose down` dalla cartella di un altro stack.

## Dati

`~/calendario-suggerimenti/data/proposte.db` sul Pi. Le frasi pubblicate sono comunque nel repo:
il database conta solo per le proposte in attesa. Copia di sicurezza:
`sqlite3 data/proposte.db ".backup data/copia.db"` (o fermare il container e copiare il file).
