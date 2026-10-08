# Suggerimenti — proposte di frasi per il Calendario

Server Node (nessun framework; SQLite integrato in Node; unica dipendenza `jose`) che gira sul
Raspberry Pi `taffa-pi`, dietro il tunnel Cloudflare condiviso `taffa-dev-tunnel`.

- `https://frase-celebre.taffa-dev.site/` — form pubblico: frase, iniziali o "Anonimo".
  Protezioni: Cloudflare Turnstile, 5 invii l'ora per IP (impronta, mai l'IP in chiaro) e 200 al
  giorno in tutto, campo trappola per i programmi automatici, POST solo dalla stessa origine.
- `https://frase-celebre.taffa-dev.site/admin` — pannello, dietro Cloudflare Access. Il server
  verifica comunque il token firmato di Access (mai l'header con l'email in chiaro) e che l'email
  sia in `ADMIN_EMAIL`: se Access fosse configurato male, il pannello resta chiuso.
  Tre schede in cima: **Proposte · Frasi · Ricorrenze**.
  - *Proposte*: si corregge testo e autore, si aggiungono le regole (giorni, date),
    si approva o si scarta. Niente "Salva": ogni scheda nuova o approvata si salva da sola
    (0,7 s dopo l'ultima digitazione, subito a campo finito; accanto ai bottoni compare
    "Salvato" o l'errore del server, e quel che si sta scrivendo non si perde). Il salvataggio è
    una `fetch` POST con l'intestazione `x-richiesta: fetch` e risposta JSON; i bottoni (Approva,
    Scarta, Ripristina, Elimina) restano moduli normali con redirect. **Pubblica** fa un unico
    commit di `src/frasi.json` nel repo: la GitHub Action ricalcola il programma e ripubblica il
    sito. Le date si scelgono col calendario di sistema, ognuna "ogni anno" (diventa `MM-GG`) o
    "una volta" (`AAAA-MM-GG`; il giorno deve esistere: 30/02 e 31/04 si rifiutano).
  - *Frasi* e *Ricorrenze* (`src/frasi.json`, `src/ricorrenze.json`): si modificano le voci già
    nel repo (modificare, aggiungere, eliminare). Qui **non** c'è salvataggio automatico, perché
    ogni salvataggio sarebbe un commit e farebbe ripartire la Action: le modifiche restano nel
    browser ("Modifiche non pubblicate") e **Pubblica** manda tutta la lista in un solo commit
    (`POST /admin/frasi|ricorrenze`, JSON, fino a 256 KB), scritto con lo `sha` letto all'apertura.
    Se il file è cambiato nel frattempo (409) la pagina lo dice senza perdere le modifiche locali;
    se non è cambiato nulla non fa nessun commit. Le ricorrenze si ordinano per mese-giorno e
    anno. Le frasi **non si riordinano mai** (il mazzo dipende dall'ordine nel file): le esistenti
    restano al loro posto, le nuove vanno in fondo; correggere un refuso cambia la chiave della
    frase (conta come nuova), eliminarne una già programmata va bene (il programma si ricalcola);
    la lista vuota e i duplicati testo+autore si rifiutano. Le righe che non si toccano non si
    ricontrollano (nel file ci sono frasi più corte del minimo).
  Il token `GITHUB_TOKEN` serve per leggere e scrivere i due file; `GITHUB_RICORRENZE` cambia il
  percorso di quello delle ricorrenze (default `src/ricorrenze.json`).
- In ogni pagina pubblica, in alto a sinistra, "‹ Calendario" per tornare indietro. Invia resta
  spento ("Attendi la verifica…") finché Turnstile non ha finito; gli errori di frase e iniziali
  stanno sotto il campo. Colori dei pulsanti con contrasto AA in entrambi i temi (`--pulsante*`).
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

## Notifica Telegram

A ogni nuova proposta il server avvisa il bot "Taffa Pi BOT" (stesso Pi) con una POST webhook
(`notifiche.mjs`): 5 s di timeout, al massimo 3 tentativi (pause di 1 e 3 s, stesso `event_id`
perché il bot scarta i doppioni), mai in attesa per l'utente e mai un errore verso di lui. Non
scatta per il campo trappola né per le proposte respinte. Nel `.env` sul Pi:

```
BOT_WEBHOOK_URL=http://host.docker.internal:8787/v1/events
BOT_WEBHOOK_TOKEN=<lo stesso WEBHOOK_TOKEN del bot>
```

Vuote = nessun avviso. Il compose dà al container `host.docker.internal` (`extra_hosts`). Lato bot:
deve ascoltare sull'IP del gateway Docker (tipicamente `172.17.0.1`; verificare con
`docker network inspect bridge`), con `WEBHOOK_ALLOW_PUBLIC_BIND=true` perché non è un range
loopback/Tailscale, e ufw deve lasciar passare la porta 8787 dalle reti docker
(es. `sudo ufw allow from 172.16.0.0/12 to any port 8787 proto tcp`).

## Dati

`~/calendario-suggerimenti/data/proposte.db` sul Pi. Le frasi pubblicate sono comunque nel repo:
il database conta solo per le proposte in attesa. Copia di sicurezza:
`sqlite3 data/proposte.db ".backup data/copia.db"` (o fermare il container e copiare il file).
