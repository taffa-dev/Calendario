// "Anonimo" spunta → le iniziali non servono
const anonimo = document.getElementById('anonimo');
const iniziali = document.getElementById('iniziali');
if (anonimo && iniziali) {
  const aggiorna = () => { iniziali.disabled = anonimo.checked; };
  anonimo.addEventListener('change', aggiorna);
  aggiorna();
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
