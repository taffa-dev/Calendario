@AGENTS.md

## Solo per Claude Code

- **Ruoli dei modelli** (regola dell'utente, 12/10/2026; le sessioni cloud non caricano il CLAUDE.md globale): ricerca, analisi, specifiche e revisione con **Opus**; codice con **Sonnet via sub-agent**, a cui si passa una specifica completa (regole di AGENTS.md + file KB del tema). Una richiesta di analisi o di roadmap non è una richiesta di codice. I sub-agent riportano le cose imparate nel rapporto; le scrive chi li ha lanciati.
- **Fine lavoro**: applica `docs/kb/PROTOCOLLO.md`. La KB (file del tema, `decisioni.md`, `ROADMAP.md`) si aggiorna da sola, senza chiedere, in un commit separato; CLAUDE.md, AGENTS.md e `.claude/` li modifichi solo proponendo il diff all'utente.
- **Commit** solo quando l'utente lo chiede.
- Chiudi il messaggio finale con una riga: `KB: file toccati …`.

## Manutenzione

AGENTS.md < 3 KB, CLAUDE.md < 4 KB (`wc -c`); ogni file KB < ~25 KB (se cresce, dividilo e aggiorna INDICE). Un fatto sta in UN solo file, gli altri lo linkano. Data (gg/mm/aaaa) su ogni decisione e numero di tenuta.
