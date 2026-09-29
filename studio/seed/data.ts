// The site's content from before Sanity, imported once by seed/import.ts.
// Edit content in the Studio, not here.

export const homePage = {
  eyebrow: 'Conferință de Design',
  title: 'Arhitecți & Designeri',
  subtitle: 'Oamenii care dau formă spațiilor în care ne adunăm.',
  curatorsIntro: 'Oamenii care întrețin și verifică informațiile publicate pe acest site.',
}

export type Category = 'Arhitect' | 'Designer de interior'

export interface SeedPerson {
  name: string
  studio: string
  category: Category
  city: string
  /** File in seed/images/. */
  photo: string
  phone?: string
  email: string
  website: string
  curator: boolean
}

const CURATORS = ['Ana Mureșan', 'Ioana Petrescu', 'Mihai Dobre', 'Elena Vasile', 'Andrei Popa']

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
]

// The static site made up each studio's site and email from its name.
export const people: SeedPerson[] = RAW.map(([name, studio, category, city, photo, phone]) => {
  const slug = studio
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '')
  return {
    name,
    studio,
    category,
    city,
    photo: `${photo}.png`,
    // "+40 7XX XXX XXX" was a placeholder, which the Studio's phone validation would reject.
    ...(phone.includes('X') ? {} : {phone}),
    email: `hello@${slug}.ro`,
    website: `https://${slug}.ro`,
    curator: CURATORS.includes(name),
  }
})

export const cities = [...new Set(people.map((p) => p.city))]
