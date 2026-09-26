// Shared by the server render and the client-side filter script.
export const profilesLabel = (n: number) => (n === 1 ? '1 profil' : n >= 20 ? `${n} de profiluri` : `${n} profiluri`);
// Short form for the filter menu button: no "de", even from 20 up ("Afișează 24 profiluri").
export const showProfilesLabel = (n: number) => 'Afișează ' + (n === 1 ? '1 profil' : `${n} profiluri`);
export const partnersLabel = (n: number) => (n === 1 ? '1 partener' : n >= 20 ? `${n} de parteneri` : `${n} parteneri`);
