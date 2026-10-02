// "Anonimo" spunta → le iniziali non servono
const anonimo = document.getElementById('anonimo');
const iniziali = document.getElementById('iniziali');
if (anonimo && iniziali) {
  const aggiorna = () => { iniziali.disabled = anonimo.checked; };
  anonimo.addEventListener('change', aggiorna);
  aggiorna();
}

// Caratteri usati della frase (il limite lo impone già maxlength)
const testo = document.getElementById('testo');
const conta = document.getElementById('conta');
if (testo && conta) {
  const aggiorna = () => {
    const usati = [...testo.value].length;
    conta.textContent = usati ? `${usati} / ${testo.maxLength}` : `Fino a ${testo.maxLength} caratteri`;
    conta.classList.toggle('al-limite', usati >= testo.maxLength * 0.9);
  };
  testo.addEventListener('input', aggiorna);
  aggiorna();
}

// Invia si accende quando la verifica anti-robot è passata (Turnstile chiama queste funzioni per nome).
// Se Turnstile non si carica o si guasta, Invia si riaccende: sarà il server a spiegare cosa non va.
const invia = document.getElementById('invia');
if (invia && document.querySelector('.cf-turnstile')) {
  const pronto = () => document.querySelector('[name="cf-turnstile-response"]')?.value;
  const accendi = (acceso) => {
    invia.disabled = !acceso;
    invia.textContent = acceso ? 'Invia' : 'Attendi la verifica…';
  };
  window.verificaPassata = () => accendi(true);
  window.verificaScaduta = () => accendi(false);
  window.verificaGuasta = () => accendi(true);
  accendi(Boolean(pronto()));
  setTimeout(() => { if (!window.turnstile) accendi(true); }, 8000);
}

// Pannello: una riga di data in più (copia vuota dell'ultima) o in meno (l'ultima rimasta si svuota soltanto)
document.addEventListener('click', (evento) => {
  const date = evento.target.closest('.date');
  if (!date) return;
  if (evento.target.matches('.aggiungi')) {
    const righe = date.querySelectorAll('.data');
    const nuova = righe[righe.length - 1].cloneNode(true);
    nuova.querySelector('input').value = '';
    nuova.querySelector('select').value = 'anno';
    righe[righe.length - 1].after(nuova);
    nuova.querySelector('input').focus();
  } else if (evento.target.matches('.togli')) {
    const riga = evento.target.closest('.data');
    if (date.querySelectorAll('.data').length > 1) riga.remove();
    else riga.querySelector('input').value = '';
    date.dispatchEvent(new Event('change', { bubbles: true })); // il salvataggio e le modifiche se ne accorgono
  }
});

// Pannello: prima di eliminare o pubblicare si chiede conferma
document.addEventListener('submit', (evento) => {
  const bottone = evento.submitter;
  if (bottone?.value === 'elimina' && !confirm('Eliminare questa proposta?')) evento.preventDefault();
  if (evento.target.classList.contains('pubblica') && !confirm('Pubblicare le frasi approvate nel Calendario?')) evento.preventDefault();
});

// Pannello, proposte: la scheda si salva da sola (0,7s dopo l'ultima digitazione, subito a campo finito).
// Una richiesta alla volta per scheda: se si scrive nel frattempo, ne parte un'altra con tutto il contenuto.
const nonSalvate = new Set(); // schede con un salvataggio in attesa, in corso o fallito
for (const modulo of document.querySelectorAll('form[data-autosalva]')) {
  const stato = modulo.querySelector('.salvataggio');
  let timer = null;
  let inCorso = false;
  let daRifare = false;

  const mostra = (testo, errore = false) => {
    stato.textContent = testo;
    stato.classList.toggle('in-errore', errore);
  };

  async function salva() {
    clearTimeout(timer);
    if (inCorso) { daRifare = true; return; }
    inCorso = true;
    mostra('Salvataggio…');
    const campi = new URLSearchParams(new FormData(modulo));
    campi.set('azione', 'salva');
    let esito;
    try {
      const risposta = await fetch(modulo.action, { method: 'POST', headers: { 'x-richiesta': 'fetch' }, body: campi });
      esito = await risposta.json();
    } catch {
      esito = { ok: false, errore: 'Non salvato: connessione assente o risposta non valida.' };
    }
    inCorso = false;
    if (daRifare) { daRifare = false; return salva(); }
    if (esito.ok) { nonSalvate.delete(modulo); mostra('Salvato'); }
    else mostra(esito.errore || 'Non salvato.', true);
  }

  const programma = (subito) => {
    nonSalvate.add(modulo);
    clearTimeout(timer);
    mostra('Modifiche non salvate…');
    if (subito) salva();
    else timer = setTimeout(salva, 700);
  };
  modulo.addEventListener('input', () => programma(false));
  modulo.addEventListener('change', () => programma(true));
  // Approva, Scarta…: il modulo parte comunque con tutti i campi, il salvataggio in sospeso non serve più
  modulo.addEventListener('submit', () => { clearTimeout(timer); nonSalvate.delete(modulo); });
}

window.addEventListener('beforeunload', (evento) => {
  if (nonSalvate.size) { evento.preventDefault(); evento.returnValue = ''; }
});

// Pannello, Frasi e Ricorrenze: si modifica in locale e "Pubblica" manda tutta la lista (un commit)
const editor = document.querySelector('form.editor');
if (editor) {
  const tipo = editor.dataset.tipo;
  const elenco = editor.querySelector('.elenco');
  const modello = document.getElementById('modello-voce');
  const esito = document.getElementById('esito');
  const contatore = document.getElementById('contatore');
  const modifiche = document.getElementById('modifiche');
  const pubblica = document.getElementById('pubblica-lista');
  const filtro = document.getElementById('filtro');
  let inCorso = false;
  let pubblicata = false; // dopo la pubblicazione la pagina si ricarica: niente avviso

  const righe = () => [...elenco.querySelectorAll('.voce')];
  const valori = (riga, nome) => [...riga.querySelectorAll(`[name="${nome}"]`)].map((x) => x.value);
  const leggiVoce = (riga) => {
    const voce = { indice: riga.dataset.indice === undefined ? null : Number(riga.dataset.indice) };
    if (tipo === 'ricorrenze') return { ...voce, nome: valori(riga, 'nome')[0], data: valori(riga, 'data')[0], ripeti: valori(riga, 'ripeti')[0] };
    return {
      ...voce,
      testo: valori(riga, 'testo')[0], autore: valori(riga, 'autore')[0],
      giorni: valori(riga, 'giorni')[0], probabilita: valori(riga, 'probabilita')[0],
      data: valori(riga, 'data'), ripeti: valori(riga, 'ripeti')
    };
  };
  const iniziale = JSON.stringify(righe().map(leggiVoce));
  const sporco = () => JSON.stringify(righe().map(leggiVoce)) !== iniziale;

  const senzaAccenti = (testo) => testo.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const applicaFiltro = () => {
    const cerca = senzaAccenti(filtro?.value.trim() ?? '');
    for (const riga of righe()) {
      riga.hidden = Boolean(cerca) && !senzaAccenti(`${valori(riga, 'testo')[0]} ${valori(riga, 'autore')[0]}`).includes(cerca);
    }
  };

  const mostra = (testo, errore = false) => {
    esito.textContent = testo;
    esito.className = testo ? (errore ? 'avviso in-errore' : 'avviso') : '';
  };

  const aggiorna = () => {
    const tutte = righe();
    const visibili = tutte.filter((r) => !r.hidden).length;
    const nome = tipo === 'frasi' ? 'frasi' : 'ricorrenze';
    contatore.textContent = visibili === tutte.length ? `${tutte.length} ${nome}` : `${visibili} di ${tutte.length} ${nome}`;
    const cambiato = sporco();
    modifiche.textContent = cambiato ? 'Modifiche non pubblicate' : 'Nessuna modifica';
    modifiche.classList.toggle('da-pubblicare', cambiato);
    pubblica.disabled = !cambiato || inCorso;
  };

  const togliSegni = () => {
    for (const riga of elenco.querySelectorAll('.voce-errata')) {
      riga.classList.remove('voce-errata');
      for (const campo of riga.querySelectorAll('[aria-invalid]')) campo.removeAttribute('aria-invalid');
    }
  };
  const segna = (riga) => {
    if (filtro?.value) { filtro.value = ''; applicaFiltro(); aggiorna(); }
    riga.classList.add('voce-errata');
    const campo = riga.querySelector('input, textarea');
    campo.setAttribute('aria-invalid', 'true');
    riga.scrollIntoView({ block: 'center' });
    campo.focus({ preventScroll: true });
  };

  editor.addEventListener('input', (evento) => {
    if (evento.target === filtro) applicaFiltro();
    else togliSegni();
    aggiorna();
  });
  editor.addEventListener('change', () => { togliSegni(); aggiorna(); });
  // Invio in un campo non pubblica per sbaglio
  editor.addEventListener('keydown', (evento) => {
    if (evento.key === 'Enter' && evento.target.matches('input')) evento.preventDefault();
  });

  editor.addEventListener('click', (evento) => {
    if (evento.target.closest('.aggiungi-voce')) {
      const nuova = modello.content.firstElementChild.cloneNode(true);
      if (tipo === 'frasi') {
        if (filtro) { filtro.value = ''; applicaFiltro(); }
        elenco.prepend(nuova); // le nuove in cima
      } else {
        elenco.append(nuova);
      }
      nuova.querySelector('input, textarea').focus();
      aggiorna();
    } else if (evento.target.closest('.elimina-voce')) {
      const riga = evento.target.closest('.voce');
      if (tipo === 'frasi' && !confirm('Eliminare questa frase?')) return;
      riga.remove();
      aggiorna();
      editor.querySelector('.aggiungi-voce').focus();
    }
  });

  editor.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    if (inCorso || !sporco() || !confirm(editor.dataset.conferma)) return;
    inCorso = true;
    togliSegni();
    mostra('Pubblicazione in corso…');
    aggiorna();
    const inviate = righe();
    let risultato;
    try {
      const risposta = await fetch(editor.action, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-richiesta': 'fetch' },
        body: JSON.stringify({ sha: editor.dataset.sha, voci: inviate.map(leggiVoce) })
      });
      risultato = await risposta.json();
    } catch {
      risultato = { ok: false, errore: 'Non pubblicato: connessione assente o risposta non valida. Le modifiche sono ancora qui.' };
    }
    inCorso = false;
    if (risultato.ok) {
      pubblicata = true;
      location.href = `${editor.action}?m=${encodeURIComponent(risultato.messaggio)}`;
      return;
    }
    mostra(risultato.errore || 'Non pubblicato.', true);
    if (Number.isInteger(risultato.riga) && inviate[risultato.riga]) segna(inviate[risultato.riga]);
    aggiorna();
  });

  window.addEventListener('beforeunload', (evento) => {
    if (!pubblicata && sporco()) { evento.preventDefault(); evento.returnValue = ''; }
  });
  aggiorna();
}
