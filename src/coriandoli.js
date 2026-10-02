// Coriandoli e stelle filanti che esplodono dal basso (compleanni). Canvas a tutto schermo, fisica
// semplice: spinta iniziale verso l'alto, gravità e attrito dell'aria. Si ferma da solo.

const COLORI = ['#ff4d6d', '#ffb703', '#4cc9f0', '#80ed99', '#b388ff', '#ff8fab', '#ffd166', '#f8f9fa'];
const GRAVITA = 1500; // px/s²
const rand = (a, b) => a + Math.random() * (b - a);

function particella(x, y, angolo, forza) {
  const tipo = Math.random();
  return {
    x, y,
    vx: Math.cos(angolo) * forza,
    vy: Math.sin(angolo) * forza,
    forma: tipo < 0.15 ? 'cerchio' : tipo < 0.3 ? 'nastro' : 'foglietto',
    w: rand(6, 11),
    h: rand(10, 18),
    colore: COLORI[Math.floor(Math.random() * COLORI.length)],
    rot: rand(0, Math.PI * 2),
    giro: rand(-9, 9),
    fase: rand(0, Math.PI * 2),
    ribalta: rand(5, 11),
    attrito: rand(1.6, 2.6),
    vita: 0,
    durata: rand(3.2, 4.6)
  };
}

// Un cannone: ventaglio di particelle da (x, fondo) verso l'alto, inclinato di `inclina` radianti
function sparo(x, fondo, altezza, inclina, quante) {
  return Array.from({ length: quante }, () => {
    const angolo = -Math.PI / 2 + inclina + rand(-0.38, 0.38);
    // La forza dipende dall'altezza dello schermo: arrivano verso i due terzi, poi ricadono
    const forza = rand(0.55, 1.15) * Math.sqrt(2 * GRAVITA * altezza * 0.78);
    return particella(x, fondo + 6, angolo, forza);
  });
}

function disegna(ctx, p) {
  const dissolvenza = Math.min(1, (p.durata - p.vita) / 0.7);
  ctx.globalAlpha = Math.max(0, dissolvenza);
  ctx.fillStyle = ctx.strokeStyle = p.colore;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  // Il foglietto si ribalta nell'aria: la larghezza va e viene col coseno
  const ribalta = Math.cos(p.fase + p.vita * p.ribalta);
  if (p.forma === 'cerchio') {
    ctx.beginPath();
    ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.forma === 'nastro') {
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-p.h, 0);
    ctx.quadraticCurveTo(-p.h / 2, 6 * ribalta, 0, 0);
    ctx.quadraticCurveTo(p.h / 2, -6 * ribalta, p.h, 0);
    ctx.stroke();
  } else {
    ctx.scale(1, ribalta);
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
  }
  ctx.restore();
}

// Lancia l'esplosione su `canvas`; restituisce una funzione che la ferma subito
export function esplodi(canvas) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const larg = window.innerWidth;
  const alt = window.innerHeight;
  canvas.width = larg * dpr;
  canvas.height = alt * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const molte = larg > 700;
  const quante = molte ? 70 : 45;
  // Tre cannoni dal bordo basso, a ondate: i due laterali inclinati verso il centro
  const ondate = [
    { dopo: 0, cannoni: [[larg * 0.5, 0, quante * 1.2]] },
    { dopo: 0.18, cannoni: [[larg * 0.12, 0.35, quante], [larg * 0.88, -0.35, quante]] },
    { dopo: 0.5, cannoni: [[larg * 0.3, 0.2, quante * 0.6], [larg * 0.7, -0.2, quante * 0.6]] }
  ];

  let particelle = [];
  let inizio = null;
  let prima = null;
  let frame;
  let fermo = false;

  function passo(t) {
    if (fermo) return;
    inizio ??= t;
    const dt = Math.min(0.033, prima === null ? 0.016 : (t - prima) / 1000);
    prima = t;
    const trascorso = (t - inizio) / 1000;
    while (ondate.length && trascorso >= ondate[0].dopo) {
      for (const [x, inclina, n] of ondate.shift().cannoni) particelle.push(...sparo(x, alt, alt, inclina, Math.round(n)));
    }
    ctx.clearRect(0, 0, larg, alt);
    for (const p of particelle) {
      p.vita += dt;
      const k = Math.exp(-p.attrito * dt);
      p.vx *= k;
      // Cadendo, l'aria le frena: velocità limite
      p.vy = p.vy * k + GRAVITA * dt * (p.vy > 0 ? 0.35 : 1);
      p.x += p.vx * dt + Math.sin(p.fase + p.vita * 3) * 20 * dt;
      p.y += p.vy * dt;
      p.rot += p.giro * dt;
      disegna(ctx, p);
    }
    particelle = particelle.filter((p) => p.vita < p.durata && p.y < alt + 40);
    if (particelle.length || ondate.length) frame = requestAnimationFrame(passo);
    else ctx.clearRect(0, 0, larg, alt);
  }
  frame = requestAnimationFrame(passo);

  return () => {
    fermo = true;
    cancelAnimationFrame(frame);
    ctx.clearRect(0, 0, larg, alt);
  };
}
