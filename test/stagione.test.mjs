import { test } from 'node:test';
import assert from 'node:assert/strict';

// stagione.js importa tema.js (e quindi Vue), che toccano document subito: qui basta uno finto
const finto = () => ({ content: {}, style: {}, setAttribute() { }, appendChild() { } });
globalThis.document = { documentElement: { getAttribute: () => null }, createElement: finto, createElementNS: finto };
const { stagioneDi } = await import('../src/stagione.js');

const giorno = (a, m, g, ore = 12) => new Date(a, m - 1, g, ore);

test('Halloween: tutta la settimana lunedì - domenica del 31 ottobre', () => {
  // 2026: il 31 è un sabato, la settimana va da lunedì 26/10 a domenica 1/11
  assert.equal(stagioneDi(giorno(2026, 10, 26, 0)), 'halloween');
  assert.equal(stagioneDi(giorno(2026, 10, 31)), 'halloween');
  assert.equal(stagioneDi(giorno(2026, 11, 1, 23)), 'halloween');
  assert.equal(stagioneDi(giorno(2026, 10, 25, 23)), null);
  assert.equal(stagioneDi(giorno(2026, 11, 2, 0)), null);
});

test('Halloween: altri anni (31 di domenica, 31 di martedì, settimana a cavallo del mese)', () => {
  assert.equal(stagioneDi(giorno(2027, 10, 25)), 'halloween');
  assert.equal(stagioneDi(giorno(2027, 10, 24)), null);
  assert.equal(stagioneDi(giorno(2027, 11, 1)), null);
  assert.equal(stagioneDi(giorno(2028, 10, 29)), null);
  assert.equal(stagioneDi(giorno(2028, 10, 30)), 'halloween');
  assert.equal(stagioneDi(giorno(2028, 11, 5)), 'halloween');
  assert.equal(stagioneDi(giorno(2028, 11, 6)), null);
});

test('Pasqua invariata, altri giorni senza stagione', () => {
  // Pasqua 2027: domenica 28/03; da lunedì 22/03 a Pasquetta 29/03
  assert.equal(stagioneDi(giorno(2027, 3, 22)), 'pasqua');
  assert.equal(stagioneDi(giorno(2027, 3, 29)), 'pasqua');
  assert.equal(stagioneDi(giorno(2027, 3, 21)), null);
  assert.equal(stagioneDi(giorno(2027, 3, 30)), null);
  assert.equal(stagioneDi(giorno(2026, 12, 7)), null);
});

test('Natale: dal 8 dicembre al 6 gennaio compresi, a cavallo d anno', () => {
  assert.equal(stagioneDi(giorno(2026, 12, 8, 0)), 'natale');
  assert.equal(stagioneDi(giorno(2026, 12, 25)), 'natale');
  assert.equal(stagioneDi(giorno(2026, 12, 31, 23)), 'natale');
  assert.equal(stagioneDi(giorno(2027, 1, 1, 0)), 'natale');
  assert.equal(stagioneDi(giorno(2027, 1, 6, 23)), 'natale');
  assert.equal(stagioneDi(giorno(2026, 12, 7, 23)), null);
  assert.equal(stagioneDi(giorno(2027, 1, 7, 0)), null);
});
