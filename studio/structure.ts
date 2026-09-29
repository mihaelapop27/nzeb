import type {StructureResolver} from 'sanity/structure'
import {HomeIcon} from '@sanity/icons/Home'
import {StarIcon} from '@sanity/icons/Star'

// Types edited through a fixed-id document rather than a list.
export const SINGLETONS = ['homePage']

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Arhitecți & Designeri')
    .items([
      S.listItem()
        .title('Pagina principală')
        .icon(HomeIcon)
        .child(S.document().schemaType('homePage').documentId('homePage').title('Pagina principală')),
      S.divider(),
      S.documentTypeListItem('person').title('Arhitecți & Designeri'),
      // Same documents as above, narrowed to the ones ticked "Curator".
      S.listItem()
        .title('Curatori')
        .icon(StarIcon)
        .child(
          S.documentTypeList('person')
            .title('Curatori')
            .filter('_type == "person" && curator == true'),
        ),
      S.documentTypeListItem('partner').title('Parteneri'),
      S.documentTypeListItem('city').title('Orașe'),
      S.divider(),
      ...S.documentTypeListItems().filter(
        (item) => !['person', 'partner', 'city', ...SINGLETONS].includes(item.getId() as string),
      ),
    ])
