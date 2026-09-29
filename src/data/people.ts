import { getHomePage, getPartners, getPeople, type Person } from '../lib/sanity';

export type { Partner, Person } from '../lib/sanity';

// Everything below is read from Sanity once, when the site is built; publishing in the Studio triggers a rebuild.

/** Hero texts ("Pagina principală" in the Studio). */
export const HOME = await getHomePage();

/** Directory profiles, alphabetical. Filtering happens client-side and never changes the order. */
export const PEOPLE: Person[] = await getPeople();

// Curators are shown with their full directory profile, but never sorted or counted with the directory.
export const CURATORS = PEOPLE.filter((p) => p.curator);

export const CITIES = [...new Set(PEOPLE.map((p) => p.city))].sort((a, b) => a.localeCompare(b, 'ro'));

export const CATEGORIES = [
  { value: 'all', label: 'Toți', longLabel: 'Toți' },
  { value: 'Arhitect', label: 'Arhitect', longLabel: 'Arhitecți' },
  { value: 'Designer de interior', label: 'Designer', longLabel: 'Designeri' },
];

// Profiles show the short role name (e.g. "Designer"), as in the header's role picker.
export const shortCategory = (category: string) => CATEGORIES.find((c) => c.value === category)?.label ?? category;

// Partners are festival-wide, not per city; the main one comes first.
export const PARTNERS = await getPartners();

export const JUMP_LINKS = [
  { label: 'Curatori', id: 'curatori' },
  { label: 'Arhitecți & Designeri', id: 'arhitecti' },
  // The Partners section is left out until at least one partner is published.
  ...(PARTNERS.length > 0 ? [{ label: 'Parteneri', id: 'parteneri' }] : []),
];
