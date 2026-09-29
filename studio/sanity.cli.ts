import {defineCliConfig} from 'sanity/cli'
import {dataset, projectId} from './env'

export default defineCliConfig({
  api: {projectId, dataset},
  // Hosted Studio: https://nzeb.sanity.studio (npm run deploy)
  deployment: {
    appId: 'n0q859xdlv7jx09zrym8bg5x',
    /**
     * Enable auto-updates for studios.
     * Learn more at https://www.sanity.io/docs/studio/latest-version-of-sanity#k47faf43faf56
     */
    autoUpdates: true,
  },
  // Types for the Astro app one level up; run `npm run typegen` after
  // changing the schema or a query.
  typegen: {
    enabled: true,
    path: '../src/**/*.{ts,tsx,astro}',
    schema: 'schema.json',
    generates: '../sanity.types.ts',
    overloadClientMethods: true,
  },
})
