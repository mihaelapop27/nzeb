import {defineField, defineType} from 'sanity'
import {CaseIcon} from '@sanity/icons/Case'
import {formatWebsite} from '../lib/website'

// Festival-wide partners, shown in the Partners section: the main partner first, then by name.
export const partner = defineType({
  name: 'partner',
  title: 'Partener',
  type: 'document',
  icon: CaseIcon,
  fields: [
    defineField({
      name: 'name',
      title: 'Nume',
      type: 'string',
      description:
        'Nu apare pe site; e textul alternativ al logo-ului, citit de cititoarele de ecran.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'logo',
      title: 'Logo',
      type: 'image',
      description: 'Afișat pe fundal alb; un PNG sau SVG cu fundal transparent arată cel mai bine.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'website',
      title: 'Link',
      // A string, not 'url', so "www.firma.ro" is accepted as typed; the site adds https://.
      type: 'string',
      description: 'Opțional. Se deschide într-un tab nou la click pe logo, ex. www.firma.ro.',
      validation: (rule) =>
        rule.custom((value) =>
          !value || formatWebsite(value) ? true : 'Adresă invalidă — ex. www.firma.ro',
        ),
    }),
    defineField({
      name: 'main',
      title: 'Partener principal',
      type: 'boolean',
      description: 'Afișat primul, pe o casetă mai mare, cu eticheta „Partener principal”.',
      initialValue: false,
      validation: (rule) =>
        rule
          .custom(async (main, context) => {
            if (!main || !context.document) return true
            const id = context.document._id.replace(/^drafts\./, '')
            const other = await context
              .getClient({apiVersion: '2026-09-29'})
              .fetch<string | null>(
                `*[_type == "partner" && main == true && !(_id in [$id, $draft])][0].name`,
                {id, draft: `drafts.${id}`},
              )
            return other ? `„${other}” este deja partener principal.` : true
          })
          .warning(),
    }),
  ],
  orderings: [
    {
      title: 'Principal, apoi nume',
      name: 'mainThenName',
      by: [
        {field: 'main', direction: 'desc'},
        {field: 'name', direction: 'asc'},
      ],
    },
  ],
  preview: {
    select: {title: 'name', website: 'website', main: 'main', media: 'logo'},
    prepare: ({title, website, main, media}) => ({
      title,
      subtitle: main ? 'Partener principal' : website,
      media,
    }),
  },
})
