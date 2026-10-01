import { MESI, SPAZIO_ANNO, SPAZIO_MESE, altezzaMese } from './foglio.js';

// "Condividi": un'immagine del foglio di calendario (data, ricorrenze, frase) con i colori del tema
// attivo. Dove si può la si passa al menu di condivisione del sistema, altrimenti si scarica.

const LARGHEZZA = 1080;
const ALTEZZA = 1350;
const FONT = '"Abhaya Libre", serif';
const INDIRIZZO = 'taffa-dev.github.io/Calendario';

// Spaziatura tra le lettere come nella pagina (letter-spacing non c'è in tutti i browser per canvas)
const spaziato = (testo) => [...testo].join(' ');

function aCapo(ctx, testo, larghezza) {
  const righe = [];
  let riga = '';
  for (const parola of testo.split(/\s+/)) {
    const prova = riga ? `${riga} ${parola}` : parola;
    if (riga && ctx.measureText(prova).width > larghezza) {
      righe.push(riga);
      riga = parola;
    } else {
      riga = prova;
    }
  }
  if (riga) righe.push(riga);
  return righe;
}

// Disegna il foglio a partire dall'altezza `alto` e restituisce dove finisce (per centrarlo)
function componi(ctx, colore, { data, frase, ricorrenze }, alto) {
  // Stesse proporzioni e distanze della pagina (giorno 300, anno 96, mese 78, per k), calcolate
  // sull'inchiostro: giorno centrato sull'anno, mese subito sotto la parte più bassa dei due
  const k = 1.5;
  const giorno = String(data.getDate());
  const anno = String(data.getFullYear());
  const mese = MESI[data.getMonth()];
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `800 ${300 * k}px ${FONT}`;
  const g = ctx.measureText(giorno);
  ctx.font = `800 ${96 * k}px ${FONT}`;
  const a = ctx.measureText(anno);
  // L'anno ruotato: la sua lunghezza diventa altezza, salita e discesa diventano larghezza
  const larghezzaAnno = a.actualBoundingBoxAscent + a.actualBoundingBoxDescent;
  const larghezza = g.actualBoundingBoxLeft + g.actualBoundingBoxRight + SPAZIO_ANNO * k + larghezzaAnno;
  const origineGiorno = (LARGHEZZA - larghezza) / 2 + g.actualBoundingBoxLeft;
  const annoSu = alto;
  const annoGiu = alto + a.width;
  const baseGiorno = (annoSu + annoGiu) / 2 + (g.actualBoundingBoxAscent - g.actualBoundingBoxDescent) / 2;

  ctx.fillStyle = colore('--color-1');
  ctx.font = `800 ${300 * k}px ${FONT}`;
  ctx.fillText(giorno, origineGiorno, baseGiorno);

  // Anno in verticale, letto dall'alto in basso (come writing-mode: vertical-lr)
  ctx.save();
  ctx.fillStyle = colore('--color-3');
  ctx.font = `800 ${96 * k}px ${FONT}`;
  const sinistraAnno = origineGiorno + g.actualBoundingBoxRight + SPAZIO_ANNO * k;
  ctx.translate(sinistraAnno + a.actualBoundingBoxDescent, annoSu);
  ctx.rotate(Math.PI / 2);
  ctx.fillText(anno, 0, 0);
  ctx.restore();

  // Mese
  ctx.textAlign = 'center';
  ctx.fillStyle = colore('--color-2');
  ctx.font = `800 ${78 * k}px ${FONT}`;
  const fondo = Math.max(baseGiorno + g.actualBoundingBoxDescent, annoGiu);
  const baseMese = fondo + SPAZIO_MESE * k + altezzaMese(mese) * k;
  ctx.fillText(mese, LARGHEZZA / 2, baseMese);
  const mezzaLinea = Math.max(ctx.measureText(mese).width, larghezza) * 0.65;

  // Ricorrenze sotto il mese, sopra la riga
  let y = baseMese;
  if (ricorrenze.length) {
    ctx.fillStyle = colore('--color-1');
    ctx.font = `700 36px ${FONT}`;
    y += 22;
    for (const nome of ricorrenze) {
      y += 46;
      ctx.fillText(spaziato(nome.toUpperCase()), LARGHEZZA / 2, y);
    }
  }
  const lineaY = y + (ricorrenze.length ? 30 : 78 * k * 0.55);
  ctx.strokeStyle = colore('--color-3');
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(LARGHEZZA / 2 - mezzaLinea, lineaY);
  ctx.lineTo(LARGHEZZA / 2 + mezzaLinea, lineaY);
  ctx.stroke();

  // Frase, rimpicciolita se è lunga
  y = lineaY + 30;
  ctx.fillStyle = colore('--color-3');
  let corpo = 58;
  let righe;
  do {
    ctx.font = `400 ${corpo}px ${FONT}`;
    righe = aCapo(ctx, `«${frase.testo}»`, LARGHEZZA * 0.78);
    corpo -= 4;
  } while (righe.length * corpo * 1.3 > 520 && corpo > 30);
  corpo += 4;
  for (const riga of righe) {
    y += corpo * 1.3;
    ctx.fillText(riga, LARGHEZZA / 2, y);
  }
  ctx.font = `italic 700 ${corpo}px ${FONT}`;
  y += corpo * 1.6;
  ctx.fillText(frase.autore, LARGHEZZA / 2, y);
  return y + corpo * 0.3;
}

async function disegna(contenuto) {
  await Promise.all(['400', '700', '800'].map((peso) => document.fonts.load(`${peso} 100px "Abhaya Libre"`)));
  const stile = getComputedStyle(document.documentElement);
  const colore = (nome) => stile.getPropertyValue(nome).trim();

  const canvas = document.createElement('canvas');
  canvas.width = LARGHEZZA;
  canvas.height = ALTEZZA;
  const ctx = canvas.getContext('2d');

  // Prima una prova per misurare l'altezza, poi il disegno vero centrato (sopra l'indirizzo)
  const altezza = componi(ctx, colore, contenuto, 0);
  ctx.fillStyle = colore('--color-bg');
  ctx.fillRect(0, 0, LARGHEZZA, ALTEZZA);
  componi(ctx, colore, contenuto, Math.max(60, (ALTEZZA - 90 - altezza) / 2));

  ctx.globalAlpha = 0.55;
  ctx.fillStyle = colore('--color-3');
  ctx.font = `400 30px ${FONT}`;
  ctx.fillText(INDIRIZZO, LARGHEZZA / 2, ALTEZZA - 50);

  return new Promise((risolvi) => canvas.toBlob(risolvi, 'image/png'));
}

export async function condividi(contenuto) {
  const { data, frase } = contenuto;
  const nome = `calendario-${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}.png`;
  const immagine = new File([await disegna(contenuto)], nome, { type: 'image/png' });
  const testo = `«${frase.testo}» — ${frase.autore}`;

  if (navigator.canShare?.({ files: [immagine] })) {
    try {
      await navigator.share({ files: [immagine], text: testo });
      return;
    } catch (errore) {
      if (errore.name === 'AbortError') return; // annullata da chi condivide
    }
  }
  const link = document.createElement('a');
  link.href = URL.createObjectURL(immagine);
  link.download = nome;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 10000);
}

// Per le verifiche: solo l'immagine
export const disegnaImmagine = disegna;
