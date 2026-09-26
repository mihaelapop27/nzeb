// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// Self-hosted at build time. latin-ext is required for Romanian diacritics (ș ț ă â î).
/** @type {[string, ...string[]]} */
const subsets = ['latin', 'latin-ext'];
// Astro's auto-generated fallbacks badly misjudge Merriweather Sans / Hind Vadodara (rendered ~70% too wide),
// so they're disabled; Helvetica Neue is within ~1% for Nunito/Merriweather, Hind gets a tuned fallback in global.css.
const fallbacks = ['Helvetica Neue', 'Helvetica', 'sans-serif'];

export default defineConfig({
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Nunito Sans',
      cssVariable: '--font-nunito-sans',
      weights: [900],
      styles: ['normal', 'italic'],
      subsets,
      fallbacks,
      optimizedFallbacks: false,
    },
    {
      provider: fontProviders.google(),
      name: 'Merriweather Sans',
      cssVariable: '--font-merriweather-sans',
      weights: [600],
      styles: ['normal'],
      subsets,
      fallbacks,
      optimizedFallbacks: false,
    },
    {
      provider: fontProviders.google(),
      name: 'Hind Vadodara',
      cssVariable: '--font-hind-vadodara',
      weights: [400, 700],
      styles: ['normal'],
      subsets,
      fallbacks: ['Hind Vadodara Fallback', ...fallbacks],
      optimizedFallbacks: false,
    },
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
