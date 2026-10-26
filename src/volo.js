// Motore di volo dei pipistrelli (Halloween). IDENTICO in Calendario e in Pills (come mazzo.js e Icona.vue):
// se cambia in uno, va copiato nell'altro. Non dipende da Vue; ciò che è specifico di un sito (fasce,
// dimensioni, popolazione, scala e durata dei voli) passa per la `config` di creaMotore().
//
// Un solo requestAnimationFrame per motore, un solo transform per pipistrello (translate3d + rotate + scale),
// ali interpolate in JS con setAttribute('d') (niente `d: path()` in CSS, che Safari non anima).
// Provini approvati dall'utente: recupero-stagioni/pipistrelli.html e pipistrelli-pills.html.

// ====================================================================================================
// COSTANTI DI TARATURA (approvate dall'utente: non cambiarle senza riprovare)
// I siti possono sovrascriverne alcune con `config.taratura` (Pills: scala, vita dei voli, tetto).
// ====================================================================================================
export const TARATURA = {
  // --- Raffica / planata ---
  BATTITI_MIN: 3, BATTITI_MAX: 6,        // battiti per raffica
  FREQ_MIN: 3, FREQ_MAX: 4,              // Hz del battito (ritmo visivo)
  SALITA_MIN: 6, SALITA_MAX: 10,         // px di quota guadagnati per battito (a scala 1)
  OSCILLAZIONE: 1.5,                     // quanto il corpo cala nella risalita (0 = sale uniforme; >1 = scende davvero)
  PLANATA_MIN: .4, PLANATA_MAX: .8,      // s di planata tra una raffica e l'altra
  CALATA: 55,                            // px/s di discesa in planata
  POSA_PLANATA: .45,                     // ali a mezza posa: 0 = tutte su, 1 = a metà, 2 = tutte giù
  RAMPA: 12,                             // 1/s: rapidità del passaggio raffica <-> planata
  PLANATA_VEL: .88,                      // la velocità orizzontale in planata è questa frazione di quella in raffica

  // --- Traiettoria ---
  VIRATA_MIN: 1, VIRATA_MAX: 3,          // s tra una virata e l'altra
  VEL_MULT_MIN: .7, VEL_MULT_MAX: 1.3,   // nuova velocità a ogni virata (moltiplicatore)
  OMEGA: 2.4, OMEGA_U: 2.8,              // rad/s della molla critica (più alto = virata più secca)
  PROB_U: .2,                            // probabilità di inversione a U a ogni virata, in mezzo allo schermo
  PROB_U_BORDO: .85, MARGINE_U: .15,     // vicino al bordo (frazione di larghezza) quasi sempre si torna indietro
  ONDA1: .22, ONDA2: .14,                // ampiezza delle due onde sulla velocità
  PERIODO1: [3, 4.5], PERIODO2: [5.5, 8],// periodi (s) delle due onde: non multipli
  STERZO: 1.2, STERZO_MAX: 60,           // quanto forte il pipistrello torna alla sua quota (1/s, px/s)
  ESCURSIONE: .75,                       // frazione della fascia in cui vaga
  KICK: [25, 60], KICK_DECAD: 1.4,       // spinta verticale durante la U (px/s) e suo smorzamento
  BANK_MAX: 15, AX_RIF: 120,             // inclinazione massima (gradi) raggiunta a questa accelerazione (px/s²)
  BANK_LISCIA: 6,                        // 1/s: morbidezza dell'inclinazione
  SCHIACCIA: .14,                        // di quanto si stringono le ali alla massima inclinazione

  // --- Profondità ---
  SCALA_MIN: .6, SCALA_MAX: 1.2,
  FG_PROB: .12,                          // probabilità che un evento sia il pipistrello vicino
  FG_SCALA: 2, FG_SFOCA: 3, FG_OPACITA: .35, FG_VEL: 2.2,

  // --- Vita ed eventi ---
  VITA_MIN: 12, VITA_MAX: 24,            // s in volo prima di dirigersi verso un bordo
  USCITA_VEL: 1.35,                      // velocità in uscita
  EVENTO_REALE: [10, 40], EVENTO_PROVA: [4, 14], // s tra un evento e l'altro
  P_DUE: .25,                            // probabilità di due voli insieme
  MAX_PIP: 5,
  DT_MAX: .05,                           // s: tetto al dt (salti dopo una pausa)
  DURATA_VERSO: .8,                      // s per passare da avanti a indietro (stato d'agitazione di Pills)
  VELA_TESTO: .3                         // opacità relativa sopra la zona del testo, se la pagina la indica
};

const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const TAU = Math.PI * 2;

// ====================================================================================================
// Ali: le tre pose chiave (stessa struttura M + 5 curve + Z, così si interpolano numero per numero)
// ====================================================================================================
export const ALI = {
  su: 'M46 28 C40 18 26 8 9 3 C13 9 14 15 12 21 C18 19 24 21 26 27 C30 25 36 27 38 33 C41 30 44 30 46 35 Z',
  meta: 'M46 28 C38 22 20 20 3 24 C9 28 12 32 10 38 C16 34 22 35 24 41 C28 36 35 36 37 42 C40 37 43 36 46 38 Z',
  giu: 'M46 29 C38 31 25 39 13 53 C17 50 20 50 21 55 C24 50 28 49 30 53 C32 48 36 46 38 48 C40 44 43 41 46 40 Z'
};
const tokenizza = (d) => d.match(/[A-Za-z]|-?\d+(?:\.\d+)?/g).map((t) => (/[A-Za-z]/.test(t) ? t : parseFloat(t)));
const POSA_SU = tokenizza(ALI.su), POSA_META = tokenizza(ALI.meta), POSA_GIU = tokenizza(ALI.giu);

// s da 0 (ali su) a 1 (a metà) a 2 (ali giù): interpola i numeri, i comandi restano uguali
export function tracciatoAla(s) {
  s = clamp(s, 0, 2);
  const [P, Q, u] = s <= 1 ? [POSA_SU, POSA_META, s] : [POSA_META, POSA_GIU, s - 1];
  let d = '';
  for (let i = 0; i < P.length; i++) d += typeof P[i] === 'string' ? P[i] + ' ' : lerp(P[i], Q[i], u).toFixed(2) + ' ';
  return d;
}

// Ease-in-out (stessa curva di riavvolgi.js di Pills): t da 0 a 1
export const curvaVerso = (t) => (t < .5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

// ====================================================================================================
// Il motore. config:
//   taratura        sovrascrive alcune costanti di TARATURA (facoltativo)
//   occhi           true: nel pipistrello ci sono due occhi (classe .occhio, colorati dal CSS)
//   continuo        true: popolazione costante (setQuanti), un rimpiazzo quando uno esce; false: voli
//                   sporadici a eventi (ogni EVENTO_REALE secondi)
//   quanti          popolazione iniziale del modo continuo
//   ritmoReale      false: eventi più frequenti (EVENTO_PROVA), utile per provare (default true)
//   larghezzaBase(W, H)   larghezza in px di un pipistrello a scala 1
//   velocita(z, W, H)     px/s orizzontali; z va da 0 (lontano) a 1 (vicino)
//   sfocaturaMax    px di blur dei più lontani
//   opacita(z), opacitaFg()   opacità dell'elemento (si moltiplica a quella dell'svg nel CSS)
//   fascia(b, W, H) -> [alto, basso] e assegnaFascia(b, altri, W, H): se mancano si usano le fasce di setFasce()
//   zonaTesto()     {l, r, t, b} sopra cui il pipistrello si fa più tenue (facoltativo)
// Il contenitore (position: fixed o absolute, pointer-events: none) lo dà avvia().
// I pipistrelli sono <div class="pip"> con dentro un <svg viewBox="0 0 100 60">: stile a carico della pagina
// (fill, opacity, blur: `--sf` sull'svg; la classe .occhio per gli occhi).
// ====================================================================================================
export function creaMotore(cfg = {}) {
  const K = { ...TARATURA, ...cfg.taratura };
  const pipistrelli = [];
  let cont = null, osservatore = null;
  let fasce = [[0, 100]];
  let W = 0, H = 0;
  let tempo = 0;                       // secondi di simulazione (dt già limitato)
  let quanti = cfg.quanti || 0;        // modo continuo: quanti pipistrelli tenere in volo
  let ritmoReale = cfg.ritmoReale !== false;
  let prossimoEvento = 1.5, ripopola = 0;
  let attivo = false, fermo = false, ultimo = 0, giro = 0;
  const timer = new Set();
  // Verso del tempo: 1 avanti, -1 indietro (stato d'agitazione). Passa da uno all'altro in
  // K.DURATA_VERSO secondi con ease-in-out, come impostaVerso() di Pills: la posizione è continua.
  let verso = 1, versoDa = 1, versoA = 1, versoT0 = 0;

  // Fasce predefinite: il pipistrello prende la fascia meno affollata
  const fasciaDi = cfg.fascia || ((b) => fasce[b.fi % fasce.length]);
  const assegnaFascia = cfg.assegnaFascia || ((b, altri) => {
    const n = fasce.length, uso = new Array(n).fill(0);
    altri.forEach((o) => uso[o.fi % n]++);
    b.fi = uso.indexOf(Math.min(...uso));
  });

  // ---------------------------------------------------------------- creazione di un pipistrello
  function elemento(b) {
    const el = document.createElement('div');
    el.className = 'pip';
    el.innerHTML = `<svg viewBox="0 0 100 60"><g class="ali"><path/><path transform="translate(100 0) scale(-1 1)"/></g>
      <ellipse cx="50" cy="32" rx="5" ry="9"/><circle cx="50" cy="22" r="5"/><path d="M45.5 20 L44 11 L49 17 Z M54.5 20 L56 11 L51 17 Z"/>
      ${cfg.occhi ? '<circle class="occhio" cx="48" cy="22" r="1.1"/><circle class="occhio" cx="52" cy="22" r="1.1"/>' : ''}</svg>`;
    b.el = el;
    b.svg = el.firstChild;
    b.gAli = el.querySelector('.ali');
    b.tracciati = el.querySelectorAll('.ali > path');
    cont.append(el);
  }

  const margineDi = (b) => b.w0 * b.sc * .6 + 30;

  function lancia({ dentro = false, fg = false, dir } = {}) {
    if (!cont) return null;
    const z = fg ? 1 : Math.random();                       // 0 lontano .. 1 vicino
    const b = {
      fg, z, sc: fg ? K.FG_SCALA : lerp(K.SCALA_MIN, K.SCALA_MAX, z),
      w0: cfg.larghezzaBase(W, H),
      dir: dir || (Math.random() < .5 ? -1 : 1),
      f: rnd(K.FREQ_MIN, K.FREQ_MAX), p: Math.random(), modo: 'raffica', battiti: 0, tPlanata: 0, wr: 1, salita: 8,
      vx: 0, ax: 0, mult: 1, omega: K.OMEGA, tVirata: rnd(.6, 1.6), ultimaU: -99, ky: 0, bank: 0, vela: 1,
      vita: rnd(K.VITA_MIN, K.VITA_MAX), esce: false, entrato: false, eta: 0, t: rnd(0, 50), sUlt: -9, squash: 1, opUlt: -1,
      onda: [rnd(...K.PERIODO1), rnd(0, TAU), rnd(...K.PERIODO2), rnd(0, TAU)],
      sterzo: [rnd(4, 7), rnd(0, TAU), rnd(9, 15), rnd(0, TAU)]
    };
    b.speed = cfg.velocita(z, W, H) * (fg ? K.FG_VEL : 1);
    entraRaffica(b);
    assegnaFascia(b, pipistrelli, W, H);
    const margine = margineDi(b);
    const [a, c] = fasciaDi(b, W, H);
    b.y = rnd(a, c);
    b.x = dentro ? rnd(.15, .85) * W : (b.dir > 0 ? -margine : W + margine);
    b.vx = b.dir * b.speed * .9;
    if (dentro) b.entrato = true;
    elemento(b);
    b.el.style.width = b.w0 + 'px';
    b.el.style.zIndex = fg ? 200 : Math.round(z * 100);
    b.svg.style.setProperty('--sf', (fg ? K.FG_SFOCA : (1 - z) * cfg.sfocaturaMax).toFixed(2) + 'px');
    pipistrelli.push(b);
    return b;
  }

  // ---------------------------------------------------------------- macchina a stati raffica/planata
  function entraRaffica(b) {
    b.modo = 'raffica';
    b.battiti = Math.round(rnd(K.BATTITI_MIN, K.BATTITI_MAX));
    b.f = rnd(K.FREQ_MIN, K.FREQ_MAX);
    b.salita = rnd(K.SALITA_MIN, K.SALITA_MAX);
    b.p = 0;
  }
  function entraPlanata(b) {
    b.modo = 'planata';
    b.tPlanata = rnd(K.PLANATA_MIN, K.PLANATA_MAX);
    b.p = 0;
  }
  function fineBattito(b) {
    if (--b.battiti <= 0) entraPlanata(b);
  }

  // ---------------------------------------------------------------- un passo di simulazione per pipistrello
  function aggiorna(b, dt) {
    // `da` scorre sempre in avanti (molle, timer, macchina a stati); `ds` segue il verso del tempo (movimento e fase delle ali)
    const da = dt * Math.abs(verso), ds = dt * verso;
    b.eta += da; b.t += da; b.vita -= da;
    const [a, c] = fasciaDi(b, W, H);
    const ampF = clamp((c - a) / 140, .35, 1) * b.sc;       // le bande strette danno escursioni più piccole

    // Macchina a stati. In raffica la fase p avanza (o torna indietro) col verso del tempo.
    if (b.modo === 'raffica') {
      b.p += b.f * ds;
      if (b.p >= 1) { b.p -= 1; fineBattito(b); } else if (b.p < 0) { b.p += 1; fineBattito(b); }
    } else {
      b.tPlanata -= da;
      if (b.tPlanata <= 0) entraRaffica(b);
    }
    b.wr += ((b.modo === 'raffica' ? 1 : 0) - b.wr) * (1 - Math.exp(-da * K.RAMPA));

    // Verticale: salita sul colpo d'ala in giù (sin > 0 per p < .5), si cala nella risalita; in planata lenta discesa.
    const lift = -b.salita * b.f * (1 + K.OSCILLAZIONE * Math.sin(TAU * b.p)) * b.wr * ampF;
    const sink = K.CALATA * (1 - b.wr) * ampF;
    // Sterzo morbido verso una quota che vaga dentro la fascia (sempre in avanti: è una molla, al contrario divergerebbe)
    const mezzo = (a + c) / 2, mezza = (c - a) / 2 * K.ESCURSIONE;
    const yT = mezzo + mezza * (.6 * Math.sin(TAU * b.t / b.sterzo[0] + b.sterzo[1]) + .4 * Math.sin(TAU * b.t / b.sterzo[2] + b.sterzo[3]));
    const sterzo = clamp((yT - b.y) * K.STERZO, -K.STERZO_MAX, K.STERZO_MAX);
    b.ky *= Math.exp(-da * K.KICK_DECAD);
    b.y += (lift + sink + b.ky) * ds + sterzo * da;
    b.y = clamp(b.y, a - 6, c + 6);

    // Virate: ogni 1-3 s nuova velocità, a volte inversione di direzione (curva a U)
    b.tVirata -= da;
    if (b.tVirata <= 0 && b.entrato && !b.esce && !b.fg) {
      b.tVirata = rnd(K.VIRATA_MIN, K.VIRATA_MAX);
      b.mult = rnd(K.VEL_MULT_MIN, K.VEL_MULT_MAX);
      b.omega = K.OMEGA;
      const versoBordo = (b.dir > 0 && b.x > W * (1 - K.MARGINE_U)) || (b.dir < 0 && b.x < W * K.MARGINE_U);
      const centro = b.x > W * .12 && b.x < W * .88 && b.eta - b.ultimaU > 5;
      if (Math.random() < (versoBordo ? K.PROB_U_BORDO : centro ? K.PROB_U : 0)) {
        b.dir *= -1; b.ultimaU = b.eta; b.omega = K.OMEGA_U; b.tVirata = Math.max(b.tVirata, 2.2);
        const su = Math.abs(mezzo - b.y) < 12 ? (Math.random() < .5 ? 1 : -1) : Math.sign(mezzo - b.y);
        b.ky = su * rnd(...K.KICK);                        // la U si disegna anche in verticale
      }
    }
    if (b.vita <= 0 && !b.esce) {                          // fine del volo: verso il bordo più vicino
      b.esce = true; b.dir = b.x < W / 2 ? -1 : 1; b.omega = K.OMEGA;
    }

    // Orizzontale: velocità bersaglio con due onde a periodi non multipli, inseguita da una molla critica
    const onde = b.fg ? 1 : 1 + K.ONDA1 * Math.sin(TAU * b.t / b.onda[0] + b.onda[1]) + K.ONDA2 * Math.sin(TAU * b.t / b.onda[2] + b.onda[3]);
    const vxT = b.dir * b.speed * b.mult * onde * (lerp(K.PLANATA_VEL, 1, b.wr)) * (b.esce ? K.USCITA_VEL : 1);
    b.ax += (b.omega * b.omega * (vxT - b.vx) - 2 * b.omega * b.ax) * da;
    b.vx += b.ax * da;
    b.x += b.vx * ds;

    // Inclinazione in virata, liscia
    const bankT = clamp(b.ax / K.AX_RIF, -1, 1) * K.BANK_MAX;
    b.bank += (bankT - b.bank) * (1 - Math.exp(-dt * K.BANK_LISCIA));
    b.squash = 1 - K.SCHIACCIA * Math.abs(b.bank) / K.BANK_MAX;

    // Velo sul testo (solo se la pagina lo chiede): il pipistrello si fa più tenue sopra la frase
    let velaT = 1;
    const zt = cfg.zonaTesto && cfg.zonaTesto();
    if (zt && b.x > zt.l && b.x < zt.r && b.y > zt.t && b.y < zt.b) velaT = K.VELA_TESTO;
    b.vela += (velaT - b.vela) * (1 - Math.exp(-dt * 5));

    const m = margineDi(b);
    if (b.x > 0 && b.x < W) b.entrato = true;
    b.morto = (b.entrato && (b.x < -m || b.x > W + m)) || (!b.entrato && (b.x < -m * 2.5 || b.x > W + m * 2.5)) || b.eta > 150;
  }

  function disegna(b) {
    // Un solo transform: posizione + inclinazione + scala (profondità)
    b.el.style.transform = `translate3d(${(b.x - b.w0 / 2).toFixed(2)}px,${(b.y - b.w0 * .3).toFixed(2)}px,0) rotate(${b.bank.toFixed(2)}deg) scale(${b.sc.toFixed(3)})`;
    // Ali: s = 1-cos(2πp) va 0→2→0 in un ciclo (su → metà → giù → metà); in planata posa a mezz'ala che respira appena
    const sFlap = 1 - Math.cos(TAU * b.p);
    const sPlan = K.POSA_PLANATA + .06 * Math.sin(TAU * b.t * .9 + b.onda[1]);
    const s = lerp(sPlan, sFlap, b.wr);
    if (Math.abs(s - b.sUlt) > .004) {
      const d = tracciatoAla(s);
      b.tracciati[0].setAttribute('d', d); b.tracciati[1].setAttribute('d', d);
      b.sUlt = s;
    }
    b.gAli.setAttribute('transform', `translate(50 0) scale(${b.squash.toFixed(3)} 1) translate(-50 0)`);
    const op = (b.fg ? cfg.opacitaFg() : cfg.opacita(b.z)) * b.vela;
    if (Math.abs(op - b.opUlt) > .004) { b.el.style.opacity = op.toFixed(3); b.opUlt = op; }
  }

  // ---------------------------------------------------------------- passo globale
  function passo(dt) {
    tempo += dt;
    if (verso !== versoA) {
      const t = Math.min((tempo - versoT0) / K.DURATA_VERSO, 1);
      verso = versoDa + (versoA - versoDa) * curvaVerso(t);
    }
    if (cfg.continuo) {
      const vivi = pipistrelli.filter((b) => !b.esce).length;
      ripopola -= dt;
      if (vivi < quanti && ripopola <= 0) { lancia({ fg: !pipistrelli.some((b) => b.fg) && Math.random() < K.FG_PROB * .5 }); ripopola = rnd(.4, 2); }
      else if (vivi > quanti) { pipistrelli.filter((b) => !b.esce).slice(quanti - vivi).forEach((b) => { b.esce = true; b.dir = b.x < W / 2 ? -1 : 1; }); }
    } else {
      prossimoEvento -= dt;
      if (prossimoEvento <= 0) {
        const [a, c] = ritmoReale ? K.EVENTO_REALE : K.EVENTO_PROVA;
        prossimoEvento = rnd(a, c);
        evento();
      }
    }
    for (const b of pipistrelli) aggiorna(b, dt);
    for (let i = pipistrelli.length - 1; i >= 0; i--) if (pipistrelli[i].morto) { pipistrelli[i].el.remove(); pipistrelli.splice(i, 1); }
    for (const b of pipistrelli) disegna(b);
  }

  // Un volo (a volte due insieme); raramente uno vicino, grande e sfocato che attraversa veloce
  function evento() {
    if (pipistrelli.length >= K.MAX_PIP) return;
    if (Math.random() < K.FG_PROB && !pipistrelli.some((b) => b.fg)) { lancia({ fg: true }); return; }
    const dir = Math.random() < .5 ? -1 : 1;
    lancia({ dir });
    if (Math.random() < K.P_DUE) {
      const id = setTimeout(() => { timer.delete(id); if (attivo && pipistrelli.length < K.MAX_PIP) lancia({ dir }); }, rnd(600, 1500));
      timer.add(id);
    }
  }

  function frame(ora) {
    giro = 0;
    if (!attivo || document.hidden) return;
    const dt = Math.min(K.DT_MAX, Math.max(0, (ora - ultimo) / 1000));   // niente salti dopo una pausa
    ultimo = ora;
    if (!fermo) passo(dt);
    giro = requestAnimationFrame(frame);
  }
  const riparti = () => { cancelAnimationFrame(giro); ultimo = performance.now(); if (attivo) giro = requestAnimationFrame(frame); };

  const misura = () => { W = cont.clientWidth; H = cont.clientHeight; };
  function svuota() { pipistrelli.splice(0).forEach((b) => b.el.remove()); }

  return {
    pipistrelli,
    // Parte: misura il contenitore (e lo segue se cambia) e fa girare il tempo. Si può chiamare di nuovo dopo congela()
    avvia(contenitore) {
      if (contenitore && contenitore !== cont) {
        osservatore?.disconnect();
        cont = contenitore;
        osservatore = new ResizeObserver(misura);
        osservatore.observe(cont);
        misura();
      }
      if (!cont) return;
      if (!attivo) document.addEventListener('visibilitychange', riparti);
      attivo = true; fermo = false; riparti();
    },
    // Movimento ridotto: disegna lo stato attuale e blocca il tempo; i pipistrelli restano fermi dove sono
    congela() { passo(0); fermo = true; },
    // Spegne tutto: animazione, osservatore, ascoltatori, timer, elementi. Dopo ferma() si può rifare avvia(contenitore)
    ferma() {
      attivo = false;
      cancelAnimationFrame(giro); giro = 0;
      document.removeEventListener('visibilitychange', riparti);
      osservatore?.disconnect(); osservatore = null;
      timer.forEach(clearTimeout); timer.clear();
      svuota();
      cont = null;
    },
    svuota,
    lancia, evento,
    // n pipistrelli già in volo in mezzo alla scena (alla partenza)
    iniziale(n) { for (let i = 0; i < n; i++) lancia({ dentro: true }); },
    // Fasce [alto, basso] in px dentro cui volano; i pipistrelli già in volo passano alla fascia con lo stesso indice
    setFasce(nuove) { if (nuove?.length) fasce = nuove; },
    setQuanti(n) { quanti = n; },
    setRitmoReale(v) { ritmoReale = v; prossimoEvento = Math.min(prossimoEvento, rnd(...(v ? K.EVENTO_REALE : K.EVENTO_PROVA))); },
    // Tempo all'indietro (stato d'agitazione): passaggio morbido in DURATA_VERSO secondi
    setIndietro(v) { versoDa = verso; versoA = v ? -1 : 1; versoT0 = tempo; },
    get verso() { return verso; }
  };
}
