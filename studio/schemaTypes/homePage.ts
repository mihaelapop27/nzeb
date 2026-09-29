import {defineField, defineType} from 'sanity'
import {HomeIcon} from '@sanity/icons/Home'

// Hero texts of the home page ("Pagina principală" in the Studio). A singleton:
// Studio structure pins it to the document id "homePage", so there is only ever one.
export const homePage = defineType({
  name: 'homePage',
  title: 'Pagina principală',
  type: 'document',
  icon: HomeIcon,
  fields: [
    defineField({
      name: 'eyebrow',
      title: 'Supratitlu',
      type: 'string',
      description: 'Rândul mic de deasupra titlului, ex. „Conferință de Design”.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'title',
      title: 'Titlu',
      type: 'string',
      description:
        'Titlul mare. Un „&” apare automat în italic. În browser și la distribuire, pagina se numește „Titlu — ARDI”.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'subtitle',
      title: 'Subtitlu',
      type: 'text',
      rows: 2,
      description: 'Fraza de sub titlu. Folosită și ca descriere a paginii în Google și la distribuire.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'curatorsIntro',
      title: 'Text curatori',
      type: 'text',
      rows: 2,
      description: 'Fraza de sub eticheta „Curatori”.',
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    prepare: () => ({title: 'Pagina principală'}),
  },
})
