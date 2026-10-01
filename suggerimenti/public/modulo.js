// "Anonimo" spunta → le iniziali non servono
const anonimo = document.getElementById('anonimo');
const iniziali = document.getElementById('iniziali');
if (anonimo && iniziali) {
  const aggiorna = () => { iniziali.disabled = anonimo.checked; };
  anonimo.addEventListener('change', aggiorna);
  aggiorna();
}

// Pannello: prima di eliminare o pubblicare si chiede conferma
document.addEventListener('submit', (evento) => {
  const bottone = evento.submitter;
  if (bottone?.value === 'elimina' && !confirm('Eliminare questa proposta?')) evento.preventDefault();
  if (evento.target.classList.contains('pubblica') && !confirm('Pubblicare le frasi approvate nel Calendario?')) evento.preventDefault();
});
