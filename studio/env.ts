// The Sanity project this Studio edits, from studio/.env (copy .env.example).
// The site reads the same project from PUBLIC_SANITY_* in the root .env.
export const projectId = process.env.SANITY_STUDIO_PROJECT_ID ?? ''
export const dataset = process.env.SANITY_STUDIO_DATASET || 'production'

if (!projectId) {
  throw new Error('Set SANITY_STUDIO_PROJECT_ID in studio/.env (see studio/.env.example)')
}
