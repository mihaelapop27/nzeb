import type { ImageMetadata } from 'astro';

const images = import.meta.glob<{ default: ImageMetadata }>('../assets/people/*.png', { eager: true });
const img = (name: string) => images[`../assets/people/${name}.png`].default;

export type Category = 'Arhitect' | 'Designer de interior';

export interface Person {
  id: number;
  name: string;
  studio: string;
  category: Category;
  city: string;
  phone: string;
  img: ImageMetadata;
  website: string;
  email: string;
  mailto: string;
  tel: string;
}

const RAW: [string, string, Category, string, string, string][] = [
  ['Ana Mureșan', 'Atelier Mureșan', 'Arhitect', 'Cluj-Napoca', 'crop-1', '+40 741 220 118'],
  ['Studio Forma', 'Studio Forma', 'Arhitect', 'Cluj-Napoca', 'crop-7', '+40 7XX XXX XXX'],
  ['Radu Ionescu', 'Ionescu & Partners', 'Arhitect', 'București', 'crop-2', '+40 722 314 905'],
  ['Ioana Petrescu', 'Casa Petrescu', 'Designer de interior', 'București', 'crop-3', '+40 730 118 442'],
  ['Mihai Dobre', 'Dobre Arhitectură', 'Arhitect', 'Timișoara', 'crop-4', '+40 745 660 213'],
  ['Elena Vasile', 'Vasile Interiors', 'Designer de interior', 'Iași', 'crop-5', '+40 751 902 377'],
  ['Andrei Popa', 'Popa Studio', 'Arhitect', 'Brașov', 'crop-6', '+40 723 445 019'],
  ['Cristina Lupu', 'Lupu Design', 'Designer de interior', 'Cluj-Napoca', 'crop-7', '+40 740 233 651'],
  ['Bogdan Stan', 'Stan Arhitecți', 'Arhitect', 'Oradea', 'crop-8', '+40 731 508 204'],
  ['Maria Constantin', 'Constantin Atelier', 'Designer de interior', 'Sibiu', 'crop-3', '+40 726 117 380'],
  ['Vlad Munteanu', 'Munteanu Architecture', 'Arhitect', 'București', 'crop-6', '+40 744 809 512'],
  ['Diana Rusu', 'Rusu Interior', 'Designer de interior', 'Timișoara', 'crop-1', '+40 752 344 760'],
  ['Alexandru Nistor', 'Nistor & Co', 'Arhitect', 'Iași', 'crop-4', '+40 721 665 093'],
  ['Laura Marin', 'Marin Spaces', 'Designer de interior', 'Brașov', 'crop-8', '+40 733 271 448'],
  ['Ștefan Ciobanu', 'Ciobanu Arhitectură', 'Arhitect', 'Constanța', 'crop-2', '+40 748 130 926'],
  ['Oana Dumitru', 'Studio Oana', 'Designer de interior', 'București', 'crop-5', '+40 729 574 301'],
  ['Atelier Nord', 'Atelier Nord', 'Arhitect', 'Oradea', 'crop-7', '+40 754 018 637'],
  ['Teodora Balan', 'Balan Interiors', 'Designer de interior', 'Sibiu', 'crop-6', '+40 735 892 174'],
  ['Gabriel Florea', 'Florea Studio', 'Arhitect', 'Timișoara', 'crop-3', '+40 742 406 859'],
  ['Casa Verde', 'Casa Verde', 'Designer de interior', 'Constanța', 'crop-4', '+40 727 751 290'],
  ['Irina Tudor', 'Tudor Arhitectură', 'Arhitect', 'Sibiu', 'crop-1', '+40 746 283 517'],
  ['Paul Enache', 'Enache Design', 'Designer de interior', 'Cluj-Napoca', 'crop-8', '+40 738 619 042'],
  ['Sorina Matei', 'Matei Atelier', 'Arhitect', 'Brașov', 'crop-5', '+40 750 137 468'],
  ['Nicolae Grigore', 'Grigore Interior', 'Designer de interior', 'Iași', 'crop-2', '+40 724 960 385'],
];

const DATA: Person[] = RAW.map(([name, studio, category, city, image, phone], id) => {
  const slug = studio
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
  const email = `hello@${slug}.ro`;
  return {
    id,
    name,
    studio,
    category,
    city,
    phone,
    img: img(image),
    website: `https://${slug}.ro`,
    email,
    mailto: `mailto:${email}`,
    tel: `tel:${phone.replace(/\s/g, '')}`,
  };
});

const byName = (a: Person, b: Person) => a.name.localeCompare(b.name, 'ro');

/** Directory profiles, alphabetical. Filtering happens client-side and never changes the order. */
export const PEOPLE = [...DATA].sort(byName);

// Curators are shown with their full directory profile, but never sorted or counted with the directory.
const CURATOR_NAMES = ['Ana Mureșan', 'Ioana Petrescu', 'Mihai Dobre', 'Elena Vasile', 'Andrei Popa'];
export const CURATORS = CURATOR_NAMES.map((n) => DATA.find((p) => p.name === n)).filter((p): p is Person => !!p);

export const CITIES = [...new Set(DATA.map((p) => p.city))].sort((a, b) => a.localeCompare(b, 'ro'));

export const CATEGORIES = [
  { value: 'all', label: 'Toți', longLabel: 'Toți' },
  { value: 'Arhitect', label: 'Arhitect', longLabel: 'Arhitecți' },
  { value: 'Designer de interior', label: 'Designer', longLabel: 'Designeri de interior' },
];

// Partners are festival-wide, not per city; the first one is the main partner.
export const PARTNERS = [
  { label: 'logo partener principal', main: true },
  { label: 'logo partener 1', main: false },
  { label: 'logo partener 2', main: false },
  { label: 'logo partener 3', main: false },
  { label: 'logo partener 4', main: false },
  { label: 'logo partener 5', main: false },
];

export const JUMP_LINKS = [
  { label: 'Curatori', id: 'curatori' },
  { label: 'Arhitecți & Designeri', id: 'arhitecti' },
  { label: 'Parteneri', id: 'parteneri' },
];
