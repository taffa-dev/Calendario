// Movimenti del foglio (Web Animations), come un blocco di fogli a strappo: andando avanti il foglio
// sopra si strappa e cade, tornando indietro quello di prima risale e si riattacca. Il dito guida lo
// strappo; al rilascio finisce o torna a posto. Ispirati a "Designing Fluid Interfaces" (Apple, WWDC
// 2018) e ai calendari a strappo in 3D. Con "riduci movimento" restano solo dissolvenze.

const ridotto = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Durate: il passaggio tra due giorni, e lo strappo del giorno nuovo, più lento e dopo una pausa
export const DURATA_PASSO = 850;
// Il foglio che risale e si riattacca va più piano di quello che cade: si posa, non scatta
export const DURATA_RITORNO = 1100;
export const ATTESA_STRAPPO = 600;
export const DURATA_STRAPPO = 1200;
// Fino a qui (frazione della durata) il foglio si solleva ancora attaccato; poi cade
export const STACCO = 0.3;

// Resistenza oltre il bordo, come lo scorrimento di iOS (costante 0.55)
export function elastico(dx, larghezza) {
  return Math.sign(dx) * (1 - 1 / ((Math.abs(dx) * 0.55) / larghezza + 1)) * larghezza;
}

// Il foglio tirato dove non c'è un giorno si sposta appena e si inclina
export const spostato = (dx) => `translateX(${dx}px) rotate(${dx * 0.01}deg)`;

// Curva che parte alla velocità del dito (px/ms), così al rilascio non c'è uno scalino
function curva(velocita, distanza, durata) {
  const pendenza = Math.min(4, Math.max(0, (velocita * durata) / Math.max(1, Math.abs(distanza))));
  return `cubic-bezier(0.25, ${0.25 * pendenza}, 0.3, 1)`;
}

// Lasciato a metà, torna al suo posto
export function torna(el, dx, velocita) {
  const verso = -Math.sign(dx) * velocita;
  const durata = ridotto() ? 150 : 400;
  el.style.transform = '';
  return el.animate({ transform: [spostato(dx), 'none'] }, { duration: durata, easing: curva(verso, dx, durata) });
}

// Lato di sopra strappato per la carta larga e alta così: un cammino casuale (ogni dente segue il
// precedente, come la carta che si strappa lungo le fibre) entro i primi 9px, più un tremolio fine
function bordoStrappato(larghezza, altezza) {
  const punti = [];
  let y = 4;
  for (let x = 0; x < larghezza; x += 3 + Math.random() * 5) {
    y = Math.min(9, Math.max(0, y + (Math.random() - 0.5) * 3.5));
    punti.push(`${x.toFixed(1)}px ${(y + Math.random()).toFixed(1)}px`);
  }
  punti.push(`${larghezza}px ${y.toFixed(1)}px`, `${larghezza}px ${altezza}px`, `0 ${altezza}px`);
  return `polygon(${punti.join(', ')})`;
}

// La carta del foglio (`.carta`, del colore della pagina) avvolge l'inchiostro con un margine e ha
// il bordo di sopra strappato. Restituisce i suoi angoli in alto, attorno a cui ruota il foglio.
function preparaCarta(el) {
  const box = el.getBoundingClientRect();
  // La data è larga quanto l'inchiostro; della frase, larga quanto il foglio, conta il testo
  const testo = (nodo) => {
    const intervallo = document.createRange();
    intervallo.selectNodeContents(nodo);
    return intervallo.getBoundingClientRect();
  };
  const parti = [el.querySelector('.data').getBoundingClientRect(), ...[...el.querySelector('.frase').children].map(testo)];
  const margine = 24;
  const sinistra = Math.min(...parti.map((r) => r.left)) - box.left - margine;
  const sopra = Math.min(...parti.map((r) => r.top)) - box.top - margine;
  const destra = Math.max(...parti.map((r) => r.right)) - box.left + margine;
  const sotto = Math.max(...parti.map((r) => r.bottom)) - box.top + margine;
  Object.assign(el.querySelector('.carta').style, {
    left: `${sinistra}px`, top: `${sopra}px`, width: `${destra - sinistra}px`, height: `${sotto - sopra}px`,
    clipPath: bordoStrappato(destra - sinistra, sotto - sopra)
  });
  return { sinistra, destra, sopra };
}

// Lo strappo. `lato` 1: si stacca dall'angolo in alto a destra, ruota su quello di sinistra e cade
// verso destra; -1 allo specchio. `indietro`: lo stesso movimento al contrario, il foglio risale e si
// riattacca. Restituisce le animazioni (la prima è quella che dura di più), da fermare e far
// scorrere col dito.
export function strappa(el, { lato = 1, attesa = 0, durata = DURATA_PASSO, indietro = false } = {}) {
  const tempi = { duration: durata, delay: attesa, fill: 'both', direction: indietro ? 'reverse' : 'normal' };
  if (ridotto()) return [el.animate({ opacity: [1, 1, 0], offset: [0, STACCO, 1] }, tempi)];
  const { sinistra, destra, sopra } = preparaCarta(el);
  el.style.transformOrigin = `${lato > 0 ? sinistra : destra}px ${sopra}px`;
  // Ombra solo da staccato: un filo lungo il bordo, una stretta di contatto e una diffusa
  const contenitore = el.querySelector('.ombra-carta');
  const stile = getComputedStyle(contenitore);
  const ombra = stile.getPropertyValue('--ombra-foglio').trim(), bordo = stile.getPropertyValue('--bordo-foglio').trim();
  const sollevato = `drop-shadow(0 0 0.5px ${bordo}) drop-shadow(0 3px 3px ${bordo}) drop-shadow(0 16px 20px ${ombra})`;
  const appoggiato = 'drop-shadow(0 0 0 transparent) drop-shadow(0 0 0 transparent) drop-shadow(0 0 0 transparent)';
  // Un foglio vero non ruota solo sul piano: il fondo si solleva verso chi guarda (rotateX attorno
  // al bordo di sopra). Resta opaco quasi fino in fondo, così sotto si vede solo ciò che è scoperto.
  return [
    el.animate([
      { transform: 'perspective(1400px) translate(0, 0) rotateX(0deg) rotate(0deg)', easing: 'cubic-bezier(0.3, 0, 0.2, 1)' },
      { transform: `perspective(1400px) translate(0, 0) rotateX(12deg) rotate(${lato * 5}deg)`, offset: STACCO, easing: 'cubic-bezier(0.55, 0, 0.9, 0.55)' },
      { transform: `perspective(1400px) translate(${lato * 4}vw, 80vh) rotateX(28deg) rotate(${lato * 16}deg)` }
    ], tempi),
    el.animate({ opacity: [1, 1, 0], offset: [0, 0.75, 1] }, tempi),
    contenitore.animate({ filter: [appoggiato, sollevato, sollevato], offset: [0, STACCO, 1] }, tempi)
  ];
}

// Il foglio che resta sotto: compare mentre quello sopra si stacca, o svanisce mentre l'altro si
// riappoggia (dove è più largo della carta che lo copre si vedrebbe)
export const compare = (el) => el.animate({ opacity: [0, 1] }, { duration: 300, delay: 120, fill: 'backwards' });
export const scompare = (el, durata) => el.animate({ opacity: [1, 1, 0], offset: [0, 0.5, 1] }, { duration: durata, fill: 'forwards' });

// Animazioni ferme a un punto (in ms), per lo strappo guidato dal dito
export function porta(animazioni, tempo) {
  animazioni.forEach((a) => {
    a.pause();
    a.currentTime = tempo;
  });
}
// Lasciate dal dito: finiscono (verso 1) o tornano all'inizio (-1) e si annullano
export function riprendi(animazioni, verso) {
  animazioni.forEach((a) => {
    a.playbackRate = verso;
    a.play();
  });
  if (verso < 0) animazioni[0].onfinish = () => animazioni.forEach((a) => a.cancel());
  return animazioni[0];
}
