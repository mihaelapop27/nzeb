# Studio: Arhitecți & Designeri

Sanity Studio for the site's content. The Astro site one level up reads it at build time
(`src/lib/sanity.ts`), so every publish needs a rebuild. Step 6 automates that.

| In the Studio | On the site |
| --- | --- |
| **Pagina principală**: supratitlu, titlu, subtitlu, text curatori | Hero texts; the title and subtitle also give the page title and description |
| **Arhitecți & Designeri**: one profile per card | Directory cards and list rows; the city filter lists only cities that have a profile |
| **Curatori**: profiles with *Curator* ticked | Curators section, with the Curator badge |
| **Parteneri**: name, logo, link, *Partener principal* | Partners section; hidden, along with its jump link, while there are none |
| **Orașe** | City names picked on each profile |

## One-time setup

1. Create a Sanity project at <https://www.sanity.io/manage> with a public `production` dataset.
2. Copy `.env.example` to `.env` here, and `../.env.example` to `../.env`. Put the project ID in both.
3. Allow the local Studio to sign in and import the original content:
   ```sh
   npm install
   npx sanity cors add http://localhost:3333 --credentials
   npm run seed
   ```
   `npm run seed` only creates what's missing, so it never overwrites edits made in the Studio.
4. Host the Studio: `npm run deploy` publishes it to <https://nzeb.sanity.studio>.
5. In Vercel → Project → Settings → Environment Variables, add `PUBLIC_SANITY_PROJECT_ID` and
   `PUBLIC_SANITY_DATASET` (the site build fails without them).
6. Rebuild on publish: create a deploy hook in Vercel → Project → Settings → Git → Deploy Hooks, then run
   ```sh
   DEPLOY_HOOK_URL='https://api.vercel.com/v1/integrations/deploy/…' \
     npx sanity exec scripts/create-deploy-hook.ts --with-user-token
   ```

## Development

- `npm run dev` starts the Studio at <http://localhost:3333>.
- After changing the schema or a query in `../src/lib/sanity.ts`, run `npm run typegen`
  (regenerates `../sanity.types.ts`) and `npx sanity schemas deploy`.
