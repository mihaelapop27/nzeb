import {defineField, defineType} from 'sanity'
import {UserIcon} from '@sanity/icons/User'

// The site's filters and short labels ("Designer") are keyed on these values.
export const CATEGORIES = [
  {title: 'Arhitect', value: 'Arhitect'},
  {title: 'Designer de interior', value: 'Designer de interior'},
]

// One card in the directory; ticking "Curator" also shows it in the Curators section.
export const person = defineType({
  name: 'person',
  title: 'Profil',
  type: 'document',
  icon: UserIcon,
  fields: [
    defineField({
      name: 'name',
      title: 'Nume',
      type: 'string',
      description: 'Numele persoanei sau al studioului, cum apare pe card.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'studio',
      title: 'Studio',
      type: 'string',
      description: 'Numele biroului. Nu apare pe card, dar căutarea îl găsește.',
    }),
    defineField({
      name: 'categories',
      title: 'Categorii',
      type: 'array',
      of: [{type: 'string'}],
      description:
        'Bifează ambele dacă face și arhitectură, și design interior: apare la ambele filtre. Pe card apare forma scurtă: „Arhitect”, „Designer”.',
      options: {list: CATEGORIES, layout: 'grid'},
      validation: (rule) => rule.required().min(1).unique(),
    }),
    defineField({
      name: 'curator',
      title: 'Curator',
      type: 'boolean',
      description:
        'Apare și în secțiunea Curatori, cu eticheta „Curator”, pe lângă lista de profiluri.',
      initialValue: false,
    }),
    defineField({
      name: 'city',
      title: 'Oraș',
      type: 'reference',
      to: [{type: 'city'}],
      description: 'Filtrul de orașe arată doar orașele care au cel puțin un profil.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'photo',
      title: 'Fotografie',
      type: 'image',
      options: {hotspot: true},
      description: 'Decupată pătrat pe site. Folosește hotspot-ul ca fața să rămână în cadru.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'phone',
      title: 'Telefon',
      type: 'string',
      description: 'Scris cum trebuie să apară, ex. „+40 741 220 118”.',
      validation: (rule) =>
        rule.regex(/^\+?[0-9 ().-]+$/, {name: 'telefon'}).error('Doar cifre, spații și + ( ) . -'),
    }),
    defineField({
      name: 'email',
      title: 'Email',
      type: 'string',
      validation: (rule) => rule.email(),
    }),
    defineField({
      name: 'website',
      title: 'Site',
      type: 'url',
      validation: (rule) => rule.uri({scheme: ['http', 'https']}),
    }),
    // Set by scripts/import-tally.ts, so re-importing a newer export only adds new submissions.
    defineField({
      name: 'submissionId',
      title: 'ID înscriere Tally',
      type: 'string',
      readOnly: true,
      hidden: true,
    }),
  ],
  orderings: [{title: 'Nume', name: 'name', by: [{field: 'name', direction: 'asc'}]}],
  preview: {
    select: {
      title: 'name',
      categories: 'categories',
      city: 'city.name',
      curator: 'curator',
      media: 'photo',
    },
    prepare: ({title, categories, city, curator, media}) => ({
      title,
      subtitle: [...(categories ?? []), city, curator && 'Curator'].filter(Boolean).join(' · '),
      media,
    }),
  },
})
