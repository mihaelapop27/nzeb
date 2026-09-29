import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {dataset, projectId} from './env'
import {schemaTypes} from './schemaTypes'
import {SINGLETONS, structure} from './structure'

export default defineConfig({
  name: 'default',
  title: 'Arhitecți & Designeri',

  projectId,
  dataset,

  plugins: [structureTool({structure}), visionTool()],

  schema: {
    types: schemaTypes,
    // Singletons are created through Structure with a fixed id, never via "New document".
    templates: (templates) => templates.filter((t) => !SINGLETONS.includes(t.schemaType)),
  },

  document: {
    // Singletons can't be duplicated or deleted from the Studio.
    actions: (actions, {schemaType}) =>
      SINGLETONS.includes(schemaType)
        ? actions.filter(({action}) => !['duplicate', 'delete', 'unpublish'].includes(action ?? ''))
        : actions,
  },
})
