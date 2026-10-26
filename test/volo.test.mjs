import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALI, TARATURA, curvaVerso, tracciatoAla } from '../src/volo.js';

// Numeri di un tracciato (senza i comandi M, C, Z)
const numeri = (d) => d.match(/-?\d+(?:\.\d+)?/g).map(Number);

test('ali: le pose chiave tornano identiche agli estremi e a metà', () => {
  assert.deepEqual(numeri(tracciatoAla(0)), numeri(ALI.su));
  assert.deepEqual(numeri(tracciatoAla(1)), numeri(ALI.meta));
  assert.deepEqual(numeri(tracciatoAla(2)), numeri(ALI.giu));
});

test('ali: fuori da 0..2 si resta sulla posa estrema; in mezzo si interpola', () => {
  assert.equal(tracciatoAla(-3), tracciatoAla(0));
  assert.equal(tracciatoAla(9), tracciatoAla(2));
  const su = numeri(ALI.su), meta = numeri(ALI.meta), mezzo = numeri(tracciatoAla(.5));
  mezzo.forEach((n, i) => assert.ok(Math.abs(n - (su[i] + meta[i]) / 2) <= .006));
});

test('ali: stessa struttura di comandi (M + 5 curve + Z) in ogni posa', () => {
  const comandi = (d) => d.replace(/[^A-Za-z]/g, '');
  assert.equal(comandi(tracciatoAla(.3)), 'MCCCCCZ');
  assert.equal(comandi(tracciatoAla(1.7)), 'MCCCCCZ');
});

test('verso del tempo: curva ease-in-out da 0 a 1, simmetrica e crescente', () => {
  assert.equal(curvaVerso(0), 0);
  assert.equal(curvaVerso(1), 1);
  assert.equal(curvaVerso(.5), .5);
  let prima = -1;
  for (let t = 0; t <= 1; t += .05) { const v = curvaVerso(t); assert.ok(v >= prima); prima = v; }
  assert.ok(Math.abs(curvaVerso(.25) + curvaVerso(.75) - 1) < 1e-12);
});

test('taratura: intervalli coerenti', () => {
  for (const [a, b] of [[TARATURA.BATTITI_MIN, TARATURA.BATTITI_MAX], [TARATURA.SCALA_MIN, TARATURA.SCALA_MAX], [TARATURA.VITA_MIN, TARATURA.VITA_MAX], TARATURA.EVENTO_REALE]) assert.ok(a < b);
});
