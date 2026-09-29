// Creates the Sanity webhook that rebuilds the site on Vercel when content is
// published. Idempotent: skips if a hook with the same name already exists.
//
//   DEPLOY_HOOK_URL='https://api.vercel.com/v1/integrations/deploy/…' \
//     npx sanity exec scripts/create-deploy-hook.ts --with-user-token
//
// Get the URL from Vercel → Project → Settings → Git → Deploy Hooks. Treat it
// as a secret: anyone holding it can trigger builds.
import {getCliClient} from 'sanity/cli'

const url = process.env.DEPLOY_HOOK_URL
if (!url) throw new Error('Set DEPLOY_HOOK_URL to the Vercel deploy hook URL')

// The hooks endpoint has its own API version (same as `sanity hooks` uses).
const client = getCliClient({apiVersion: 'v2025-08-04'})
const {projectId, dataset} = client.config()
const name = 'Vercel deploy (production)'

type Hook = {id: string; name: string; url: string; isEnabled?: boolean}
const existing = await client.request<Hook[]>({url: `/hooks/projects/${projectId}`})
const found = existing.find((h) => h.name === name)
if (found) {
  console.log(`Webhook "${name}" already exists (id ${found.id}); nothing to do.`)
  process.exit(0)
}

const hook = await client.request<Hook>({
  url: `/hooks/projects/${projectId}`,
  method: 'POST',
  body: {
    type: 'document',
    name,
    description: 'Rebuilds the site when content is published.',
    dataset,
    url,
    httpMethod: 'POST',
    apiVersion: 'v2021-03-25',
    includeDrafts: false,
    rule: {
      on: ['create', 'update', 'delete'],
      filter: '_type in ["homePage", "person", "city", "partner"]',
      projection: '{_id, _type}',
    },
  },
})
console.log(`Created webhook "${hook.name}" (id ${hook.id}) → ${hook.url.replace(/\/[^/]+$/, '/…')}`)
