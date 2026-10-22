import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

// Archivio delle proposte (SQLite integrato in Node, nessun modulo nativo da compilare).
// Stati: nuova → approvata → pubblicata, oppure scartata. Le regole (giorni, date)
// sono quelle di src/frasi.json, salvate come JSON.

export function apriArchivio(percorso) {
  if (percorso !== ':memory:') mkdirSync(dirname(percorso), { recursive: true });
  const db = new DatabaseSync(percorso);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS proposte (
      id INTEGER PRIMARY KEY,
      testo TEXT NOT NULL,
      autore TEXT NOT NULL,
      regole TEXT NOT NULL DEFAULT '{}',
      stato TEXT NOT NULL DEFAULT 'nuova',
      ricevuta TEXT NOT NULL,
      aggiornata TEXT,
      commit_sha TEXT
    );
    -- Solo per limitare gli invii: impronta dell'IP (mai l'IP in chiaro) e momento
    CREATE TABLE IF NOT EXISTS invii (impronta TEXT NOT NULL, quando INTEGER NOT NULL);
  `);

  const leggi = (riga) => riga && { ...riga, regole: JSON.parse(riga.regole) };
  const ora = () => new Date().toISOString();

  return {
    aggiungi({ testo, autore }) {
      return Number(db.prepare('INSERT INTO proposte (testo, autore, ricevuta) VALUES (?, ?, ?)')
        .run(testo, autore, ora()).lastInsertRowid);
    },
    proposta: (id) => leggi(db.prepare('SELECT * FROM proposte WHERE id = ?').get(id)),
    elenco: () => db.prepare(`SELECT * FROM proposte ORDER BY
      CASE stato WHEN 'nuova' THEN 0 WHEN 'approvata' THEN 1 WHEN 'scartata' THEN 2 ELSE 3 END, id DESC`).all().map(leggi),
    approvate: () => db.prepare("SELECT * FROM proposte WHERE stato = 'approvata' ORDER BY id").all().map(leggi),
    modifica(id, { testo, autore, regole }) {
      db.prepare('UPDATE proposte SET testo = ?, autore = ?, regole = ?, aggiornata = ? WHERE id = ?')
        .run(testo, autore, JSON.stringify(regole), ora(), id);
    },
    cambiaStato(id, stato, commitSha = null) {
      db.prepare('UPDATE proposte SET stato = ?, commit_sha = coalesce(?, commit_sha), aggiornata = ? WHERE id = ?')
        .run(stato, commitSha, ora(), id);
    },
    elimina: (id) => db.prepare('DELETE FROM proposte WHERE id = ?').run(id),

    // Invii nell'ultima ora da questa impronta e nelle ultime 24 ore da chiunque
    contaInvii(impronta, adesso = Date.now()) {
      db.prepare('DELETE FROM invii WHERE quando < ?').run(adesso - 24 * 3600e3);
      return {
        ultimaOra: db.prepare('SELECT count(*) AS n FROM invii WHERE impronta = ? AND quando > ?').get(impronta, adesso - 3600e3).n,
        ultimoGiorno: db.prepare('SELECT count(*) AS n FROM invii').get().n
      };
    },
    registraInvio: (impronta, adesso = Date.now()) => db.prepare('INSERT INTO invii VALUES (?, ?)').run(impronta, adesso),
    chiudi: () => db.close()
  };
}
