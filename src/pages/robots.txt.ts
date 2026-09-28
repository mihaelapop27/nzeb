import type { APIRoute } from 'astro';

// Built from `site` in astro.config.mjs, so the sitemap address follows a domain change.
export const GET: APIRoute = ({ site }) =>
  new Response(`User-agent: *\nAllow: /\n\nSitemap: ${new URL('sitemap-index.xml', site).href}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
