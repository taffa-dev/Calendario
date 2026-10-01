import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { dataDi, giornoDopo } from '../src/mazzo.js';
import { getFrase, chiaveFrase, fraseVecchioSistema } from '../src/giorno.js';

const radice = new URL('..', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
const frasiVere = JSON.parse(readFileSync(join(radice, 'src/frasi.json'), 'utf8'));

// Copia del progetto (solo src e scripts) in una cartella temporanea, per far girare il generatore
function cartellaDiProva(frasi, programma = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'calendario-'));
  cpSync(join(radice, 'src'), join(dir, 'src'), { recursive: true });
  cpSync(join(radice, 'scripts'), join(dir, 'scripts'), { recursive: true });
  writeFileSync(join(dir, 'package.json'), '{"type":"module"}');
  writeFileSync(join(dir, 'src/frasi.json'), JSON.stringify(frasi));
  writeFileSync(join(dir, 'src/programma.json'), JSON.stringify(programma));
  return {
    genera(oggi) {
      execFileSync(process.execPath, [join(dir, 'scripts/programma.mjs'), `--oggi=${oggi}`]);
      return JSON.parse(readFileSync(join(dir, 'src/programma.json'), 'utf8'));
    },
    frasi(nuove) { writeFileSync(join(dir, 'src/frasi.json'), JSON.stringify(nuove)); }
  };
}

const sposta = (giorno, n) => { const d = dataDi(giorno); d.setDate(d.getDate() + n); return d; };
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

test('il primo giorno del programma è la frase del vecchio sistema', () => {
  const prova = cartellaDiProva(frasiVere);
  const programma = prova.genera('2026-10-01');
  const vecchia = fraseVecchioSistema(frasiVere, dataDi('2026-10-01'));
  assert.equal(getFrase(frasiVere, programma, dataDi('2026-10-01')), vecchia);
  assert.equal(programma['2026-10-01'], chiaveFrase(vecchia));
});

test('oltre il programma il sito calcola le stesse frasi del generatore', () => {
  const prova = cartellaDiProva(frasiVere);
  const corto = prova.genera('2026-10-01');
  // Il sito con il programma corto deve dare gli stessi giorni che il generatore scrive mesi dopo
  const lungo = prova.genera('2027-03-01');
  for (let i = 0; i < 400; i++) {
    const d = sposta('2026-10-01', i);
    const atteso = lungo[iso(d)];
    if (!atteso) continue;
    assert.equal(chiaveFrase(getFrase(frasiVere, corto, d)), atteso, iso(d));
  }
});

test('mazzo: nessuna ripetizione nel giro, distanza minima tra due uscite', () => {
  const prova = cartellaDiProva(frasiVere);
  const programma = prova.genera('2026-10-01');
  const normali = new Set(frasiVere.filter((f) => !f.giorni && !f.date).map(chiaveFrase));
  const uscite = [];
  for (let i = 0; i < 2000; i++) {
    const k = chiaveFrase(getFrase(frasiVere, programma, sposta('2026-10-02', i)));
    if (normali.has(k)) uscite.push(k);
  }
  const n = normali.size;
  for (let giro = 0; giro + n <= uscite.length; giro += n) {
    assert.equal(new Set(uscite.slice(giro, giro + n)).size, n, `giro ${giro / n}`);
  }
  const ultima = new Map();
  let minima = Infinity;
  uscite.forEach((k, i) => { if (ultima.has(k)) minima = Math.min(minima, i - ultima.get(k)); ultima.set(k, i); });
  assert.ok(minima >= Math.floor(n / 3), `distanza minima ${minima}`);
});

test('frasi aggiunte: passato e oggi restano, le nuove escono entro il giro', () => {
  const prova = cartellaDiProva(frasiVere);
  const prima = prova.genera('2026-10-01');
  const nuove = [...frasiVere, { testo: 'Nuova uno.', autore: 'X.' }, { testo: 'Nuova due.', autore: 'Y.' }];
  prova.frasi(nuove);
  const dopo = prova.genera('2026-10-20');
  for (const [g, k] of Object.entries(prima)) if (g <= '2026-10-20' && dopo[g]) assert.equal(dopo[g], k, g);
  const visteDopo = [];
  for (let i = 1; i <= 80; i++) visteDopo.push(getFrase(nuove, dopo, sposta('2026-10-20', i)).testo);
  assert.ok(visteDopo.includes('Nuova uno.') && visteDopo.includes('Nuova due.'));
});

test('speciali: giovedì circa metà, sempre nei giorni senza probabilità', () => {
  const frasi = [...frasiVere, { testo: 'Natale!', autore: 'Z.', date: ['12-25'] }];
  const prova = cartellaDiProva(frasi);
  const programma = prova.genera('2026-10-01');
  let giovedi = 0, speciale = 0;
  for (let i = 0; i < 3650; i++) {
    const d = sposta('2026-10-02', i);
    const f = getFrase(frasi, programma, d);
    if (iso(d).endsWith('12-25')) assert.equal(f.testo, 'Natale!');
    else assert.notEqual(f.testo, 'Natale!');
    if (d.getDay() === 4) { giovedi++; if (f.giorni) speciale++; } else assert.ok(!f.giorni);
  }
  assert.ok(Math.abs(speciale / giovedi - 0.5) < 0.07, `${speciale}/${giovedi}`);
});
