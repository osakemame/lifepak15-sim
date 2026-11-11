// Types de Mise en Situation Professionnelle (MSP) proposés au hub.
// Étape 1 : simple liste de choix. Le contenu des scénarios (constantes, rythmes,
// événements, rampes temporelles) sera défini à l'étape 5, après validation avec vous.

export const MSP_TYPES = [
  { id: 'arret-cardiaque', label: 'Arrêt cardiaque / RCP' },
  { id: 'malaise-rythme', label: 'Malaise / Troubles du rythme' },
  { id: 'traumato-choc', label: 'Traumatologie / Choc' },
  { id: 'pediatrie', label: 'Pédiatrie' },
];

export const mspLabel = (id) => MSP_TYPES.find((t) => t.id === id)?.label ?? 'Non défini';
