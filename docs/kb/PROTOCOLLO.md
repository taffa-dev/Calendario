# Protocollo di manutenzione della KB

Scopo: come si tiene viva la documentazione per agenti (CLAUDE.md breve + `docs/kb/`).
Leggere quando: a fine di ogni sviluppo (cosa aggiornare) o quando la KB va potata.
Ultimo aggiornamento: 22/10/2026 (struttura ripresa dagli altri progetti su richiesta dell'utente, 22/10/2026)

## Struttura
- `CLAUDE.md` (radice): sempre caricato, < 6 KB: regole sempre valide, protocollo, indice breve. Niente dettagli.
- `docs/kb/INDICE.md`: tabella file -> "leggerlo quando" -> parole chiave.
- `docs/kb/<tema>.md`: un tema per file, < ~25 KB ciascuno; inizia con scopo, "leggere quando", data.
- `docs/kb/decisioni.md`: decisioni dell'utente in ordine cronologico (data -> decisione -> motivo -> file).
- `ROADMAP.md`: cose da fare. `suggerimenti/LEGGIMI.md`: documento per umani sul server delle proposte (un solo posto, la KB lo linka).

## Quando leggere cosa
Prima di lavorare su un tema: INDICE -> SOLO il file del tema. Non leggere tutta la KB. Se manca il tema, cercalo con Grep in `docs/kb/`.

## Checklist di fine sviluppo (da fare da soli, senza chiedere permesso: deciso dall'utente il 22/10/2026)
1. **File del tema**: aggiungi le cose non ovvie imparate (avvertenze "non fare X perché Y", comandi, difetti noti).
2. **`decisioni.md`**: una riga per ogni decisione dell'utente (data, decisione, motivo, file che la dettaglia).
3. **`ROADMAP.md`**: chiudi le voci fatte (passale in "Fatto" con data), scrivi subito ogni cosa da fare/sistemare trovata lavorando o detta dall'utente "da fare dopo". Cerca prima una voce esistente: niente duplicati.
4. **Conteggi di tenuta** (test, parametri, numeri misurati): aggiorna con la data (gg/mm/aaaa).
5. **Memoria dell'utente** (MEMORY.md): solo preferenze personali durature, mai fatti del progetto.
Chiudi il messaggio finale con una riga: `KB: file toccati …`. I sub-agent riportano le cose imparate nel rapporto; le scrive chi li ha lanciati.

## Potatura
- Un fatto sta in UN solo file; gli altri lo linkano.
- Voce falsa o superata: correggila o cancellala; se resta utile come storico, segnala "[superato da …]".
- Due voci in contraddizione: tieni la più recente (con data).
- File KB oltre ~25 KB: dividilo per sotto-tema e aggiorna INDICE.md. CLAUDE.md resta < 6 KB.
- Togli solo ripetizioni e ciò che si ricava dal codice in due righe; mai numeri, date, decisioni o avvertenze.

## Modello di voce
`- **Titolo** (gg/mm/aaaa): fatto; perché (motivo o incidente); come verificare (comando, file, numero atteso).`
