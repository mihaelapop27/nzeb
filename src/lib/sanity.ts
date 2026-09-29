// All reads from Sanity go through here, once, at build time. Queries are typed by Sanity TypeGen
// (see studio/sanity.cli.ts → ../sanity.types.ts); run `npm run typegen` in studio/ after changing a query or the schema.
import { createClient } from '@sanity/client';
import { defineQuery } from 'groq';
import { createImageUrlBuilder, type SanityImageSource } from '@sanity/image-url';

const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID;
if (!projectId) throw new Error('Set PUBLIC_SANITY_PROJECT_ID in .env (see .env.example) or in the Vercel project settings.');

const sanityClient = createClient({
  projectId,
  dataset: import.meta.env.PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2026-09-29',
  // Static build: always read fresh published content at build time.
  useCdn: false,
});

export const HOME_PAGE_QUERY = defineQuery(`*[_type == "homePage" && _id == "homePage"][0]{ eyebrow, title, subtitle, curatorsIntro }`);

// Sorted on our side: GROQ orders by code point, which would put "Ștefan" after "Z".
export const PEOPLE_QUERY = defineQuery(`*[_type == "person"]{
  _id, name, studio, category, "curator": curator == true, "city": city->name, photo, phone, email, website
}`);

export const PARTNERS_QUERY = defineQuery(`*[_type == "partner"]{ _id, name, logo, website, "main": main == true }`);

type WithRequired<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };

/** Narrows fields the Studio validates as required; fails the build loudly if one is missing. */
function required<T, K extends keyof T>(doc: T, keys: K[], what: string): WithRequired<T, K> {
  for (const key of keys) {
    if (doc[key] == null) throw new Error(`Sanity ${what} is missing required field "${String(key)}"`);
  }
  return doc as WithRequired<T, K>;
}

export async function getHomePage() {
  const home = await sanityClient.fetch(HOME_PAGE_QUERY);
  if (!home) throw new Error('No "homePage" document in Sanity — publish it in the Studio under Pagina principală.');
  return required(home, ['eyebrow', 'title', 'subtitle', 'curatorsIntro'], 'homePage');
}

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'ro');

/** Every profile, alphabetical, with its mailto:/tel: links ready for the templates. */
export async function getPeople() {
  const people = await sanityClient.fetch(PEOPLE_QUERY);
  return people
    .map((doc) => {
      const p = required(doc, ['name', 'category', 'city'], `person ${doc._id}`);
      return {
        ...p,
        studio: p.studio ?? '',
        mailto: p.email ? `mailto:${p.email}` : null,
        tel: p.phone ? `tel:${p.phone.replace(/[^+0-9]/g, '')}` : null,
      };
    })
    .sort(byName);
}

/** The main partner first, then the rest by name. */
export async function getPartners() {
  const partners = await sanityClient.fetch(PARTNERS_QUERY);
  return partners
    .map((p) => required(p, ['name', 'logo'], `partner ${p._id}`))
    .sort((a, b) => Number(b.main) - Number(a.main) || byName(a, b));
}

export type Person = Awaited<ReturnType<typeof getPeople>>[number];
export type Partner = Awaited<ReturnType<typeof getPartners>>[number];

const builder = createImageUrlBuilder(sanityClient);

/** Image URL builder; honours the hotspot/crop set in the Studio. */
export const urlFor = (source: SanityImageSource) => builder.image(source).auto('format');

/** A square crop around the Studio hotspot at each of `widths`, as `src` (the largest) and `srcset`. */
export function squareImage(source: SanityImageSource, widths: number[]) {
  const at = (w: number) => urlFor(source).width(w).height(w).fit('crop').url();
  return { src: at(Math.max(...widths)), srcset: widths.map((w) => `${at(w)} ${w}w`).join(', ') };
}
