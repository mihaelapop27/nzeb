import {defineField, defineType} from 'sanity'
import {PinIcon} from '@sanity/icons/Pin'

// Picked from each profile, so every card spells the city the same way.
export const city = defineType({
  name: 'city',
  title: 'Oraș',
  type: 'document',
  icon: PinIcon,
  fields: [
    defineField({
      name: 'name',
      title: 'Nume',
      type: 'string',
      description: 'Cu diacritice, ex. „Brașov”.',
      validation: (rule) => rule.required(),
    }),
  ],
  orderings: [{title: 'Nume', name: 'name', by: [{field: 'name', direction: 'asc'}]}],
  preview: {
    select: {title: 'name'},
  },
})
