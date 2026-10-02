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
  }
});

// Pannello: prima di eliminare o pubblicare si chiede conferma
document.addEventListener('submit', (evento) => {
  const bottone = evento.submitter;
  if (bottone?.value === 'elimina' && !confirm('Eliminare questa proposta?')) evento.preventDefault();
  if (evento.target.classList.contains('pubblica') && !confirm('Pubblicare le frasi approvate nel Calendario?')) evento.preventDefault();
});
