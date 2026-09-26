// Shared by the server render and the client-side filter script.
// Counts are written without "de", also from 20 up ("24 profiluri").
export const profilesLabel = (n: number) => (n === 1 ? '1 profil' : `${n} profiluri`);
export const showProfilesLabel = (n: number) => 'Afișează ' + profilesLabel(n);
export const partnersLabel = (n: number) => (n === 1 ? '1 partener' : `${n} parteneri`);
