// Exports the published profiles as an A4 PDF, for sending or printing.
//
//   npm run export-pdf [-- profiluri.pdf]            compact list, one profile per row
//   npm run export-pdf -- --cards [carduri.pdf]      cards, four per page: curators on page 1,
//                                                    partners on the last page
//
// Runs on demand, on this machine; the site build doesn't need it. Printed with the Google
// Chrome installed here (playwright-core doesn't download a browser of its own).
import {readFileSync} from 'node:fs'
import path from 'node:path'
import {createImageUrlBuilder, type SanityImageObject, type SanityImageSource} from '@sanity/image-url'
import {chromium} from 'playwright-core'
import {getCliClient} from 'sanity/cli'
import {profilesLabel} from '../../src/data/labels'
import {withDefaultHotspot} from '../../src/lib/photo'
import {CATEGORIES} from '../schemaTypes/person'

const args = process.argv.slice(2)
const cards = args.includes('--cards')
const file = args.find((a) => !a.startsWith('--')) ?? (cards ? 'profiluri-carduri.pdf' : 'profiluri.pdf')
const out = path.resolve(file)

const client = getCliClient({apiVersion: '2026-09-29', perspective: 'published', useCdn: false})
const builder = createImageUrlBuilder(client)

type Partner = {name: string; logo: SanityImageSource; website: string | null; main: boolean}

type Person = {
  name: string
  categories: string[]
  curator: boolean
  city: string | null
  photo: SanityImageObject | null
  phone: string | null
  email: string | null
  website: string | null
}

const {title, people, partners} = await client.fetch<{
  title: string | null
  people: Person[]
  partners: Partner[]
}>(`{
  "title": *[_id == "homePage"][0].title,
  "partners": *[_type == "partner" && defined(logo.asset)]{ name, logo, website, "main": main == true },
  "people": *[_type == "person"]{
    name, "categories": coalesce(categories, [category]), "curator": curator == true, "city": city->name, photo, phone, email, website
  }
}`)
// Sorted here, as on the site: GROQ orders by code point, which would put "Ștefan" after "Z".
people.sort((a, b) => a.name.localeCompare(b.name, 'ro'))
// As on the site: the main partner first, then by name.
partners.sort((a, b) => Number(b.main) - Number(a.main) || a.name.localeCompare(b.name, 'ro'))

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]!)

// "https://www.vasile.ro/" → "vasile.ro"
const bareUrl = (url: string) => url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '')

const logo = readFileSync(new URL('../../src/assets/logo/ardi-logo-lockup.png', import.meta.url))
const year = new Date().getFullYear()
const heading = title ?? 'Arhitecți & Designeri'

// In the schema's order (Arhitect first), whatever order they were ticked in the Studio.
const roles = (categories: string[]) =>
  CATEGORIES.filter((c) => categories.includes(c.value))
    .map((c) => c.title)
    .join(' · ')

const contactLines = (p: Person) =>
  [
    p.phone && `<a href="tel:${p.phone.replace(/[^+0-9]/g, '')}">${esc(p.phone)}</a>`,
    p.email && `<a href="mailto:${esc(p.email)}">${esc(p.email)}</a>`,
    p.website && `<a href="${esc(p.website)}">${esc(bareUrl(p.website))}</a>`,
  ]
    .filter(Boolean)
    .map((line) => `<div>${line}</div>`)
    .join('')

const row = (p: Person) => {
  // Square crop around the Studio hotspot (or a little above the middle), at ~3× the printed size.
  const photo = p.photo
    ? `<img src="${builder.image(withDefaultHotspot(p.photo)).width(168).height(168).fit('crop').auto('format').url()}" alt="">`
    : '<div class="photo"></div>'
  return `<div class="person">
    ${photo}
    <div>
      <div class="name">${esc(p.name)}${p.curator ? '<span class="badge">Curator</span>' : ''}</div>
      <div class="role">${esc(roles(p.categories))}${p.city ? `<span>${esc(p.city)}</span>` : ''}</div>
    </div>
    <div class="contact">${contactLines(p)}</div>
  </div>`
}

const card = (p: Person) => {
  // Crop around the Studio hotspot (or a little above the middle); the box is ~4:3 (88 × 66 mm on a
  // four-per-page card), ~250 dpi.
  const photo = p.photo
    ? `<img src="${builder.image(withDefaultHotspot(p.photo)).width(880).height(660).fit('crop').auto('format').url()}" alt="">`
    : ''
  return `<div class="card">
    <div class="card-photo">${photo}${p.curator ? '<span class="badge">Curator</span>' : ''}</div>
    <div class="card-body">
      <div class="name">${esc(p.name)}</div>
      <div class="card-role"><span>${esc(roles(p.categories))}</span><span>${esc(p.city ?? '')}</span></div>
      <div class="card-contact">${contactLines(p)}</div>
    </div>
  </div>`
}

// Curators all go on page 1, under the title, and aren't repeated among the others, so nobody
// is printed twice; past four, their cards shrink to keep them on that page. Everyone else
// follows, four per page; the partners get the last page to themselves.
const curators = people.filter((p) => p.curator)
const others = people.filter((p) => !p.curator)
const chunk = <T,>(list: T[], size: number) =>
  Array.from({length: Math.ceil(list.length / size)}, (_, i) => list.slice(i * size, i * size + size))

// Grid heights in mm. The printable area is 182 × 267 mm; the title takes ~37 mm of page 1 and a
// section heading ~13 mm.
const ROW = 111
const GAP = 6
const curatorGrid = () => {
  const cols = curators.length <= 4 ? 2 : 3
  const rows = Math.ceil(curators.length / cols)
  const height = Math.min(ROW, (267 - 37 - 13 - GAP * (rows - 1)) / rows)
  return {cols, height}
}

const header = `<header>
    <div>
      <h1>${esc(heading)}</h1>
      <div class="meta">${year}</div>
    </div>
    <img src="data:image/png;base64,${logo.toString('base64')}" alt="ARDI">
  </header>`

const section = (label: string) => `<div class="section"><span>${esc(label)}</span></div>`

const grid = (list: Person[], {cols, height} = {cols: 2, height: ROW}) =>
  `<div class="grid${cols > 2 ? ' small' : ''}" style="grid-template-columns: repeat(${cols}, minmax(0, 1fr)); grid-auto-rows: ${height}mm">${list.map(card).join('')}</div>`

const partnerTile = (p: Partner) => {
  const tag = p.website ? 'a' : 'div'
  const href = p.website ? ` href="${esc(/^https?:\/\//i.test(p.website) ? p.website : `https://${p.website}`)}"` : ''
  const src = builder.image(p.logo).width(p.main ? 1000 : 600).fit('max').auto('format').url()
  return `<${tag}${href} class="partner${p.main ? ' main' : ''}"><img src="${src}" alt="${esc(p.name)}">${
    p.main ? '<span class="badge">Partener principal</span>' : ''
  }</${tag}>`
}
const partnersSection = partners.length
  ? `${section('Parteneri')}<div class="partners">${partners.map(partnerTile).join('')}</div>`
  : ''

const otherPages = chunk(others, 4)
const pages = [
  ...(curators.length ? [`${header}${section('Curatori')}${grid(curators, curatorGrid())}`] : []),
  ...otherPages.map(
    (group, i) =>
      `${curators.length || i ? '' : header}${section('Arhitecți & Designeri')}${grid(group)}`,
  ),
  ...(partnersSection ? [partnersSection] : []),
]
const cardsBody = pages.map((page) => `<section class="page">${page}</section>`).join('\n')

const html = `<!doctype html>
<html lang="ro">
<head>
<meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Hind+Vadodara:wght@400;700&family=Nunito+Sans:wght@900&display=block">
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font: 9.5pt/1.3 'Hind Vadodara', 'Helvetica Neue', sans-serif; color: #000;
    -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  a { color: inherit; text-decoration: none; }
  header { display: flex; justify-content: space-between; align-items: flex-end; gap: 8mm;
    padding-bottom: 5mm; border-bottom: 1.5pt solid #000; }
  header img { height: 11mm; }
  h1 { margin: 0; font: 900 20pt/0.9 'Nunito Sans', sans-serif; letter-spacing: -0.01em; text-transform: uppercase; }
  .meta { margin-top: 2.5mm; color: #8a8582; }
  .person { display: grid; grid-template-columns: 14mm minmax(0, 1fr) 62mm; gap: 5mm; align-items: center;
    padding: 2.2mm 0; border-bottom: 0.5pt solid #cecac8; break-inside: avoid; }
  .person img, .photo { display: block; width: 14mm; height: 14mm; object-fit: cover; background: #e6e6e6; }
  .name { font: 900 12pt/0.95 'Nunito Sans', sans-serif; letter-spacing: -0.01em; text-transform: uppercase; }
  .badge { margin-left: 2.5mm; padding: 0.7mm 1.6mm; background: #3c1dee; color: #fff; font: 700 6.5pt/1 'Hind Vadodara', sans-serif;
    letter-spacing: .14em; vertical-align: 1.5pt; }
  .role { margin-top: 1.5mm; color: #3c1dee; font-size: 7pt; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; }
  .role span { margin-left: 3mm; color: #000; font-size: 9pt; font-weight: 400; letter-spacing: 0; text-transform: none; }
  .contact { font-size: 8.5pt; line-height: 1.4; }
  .contact div { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  /* Cards (--cards): grid sizes are set per grid, see curatorGrid(). */
  .page + .page { break-before: page; }
  .section { margin: 6mm 0 4mm; padding-top: 2.5mm; border-top: 1pt solid #000;
    color: #3c1dee; font-size: 7pt; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; }
  header + .section { border-top: 0; padding-top: 0; }
  .grid { display: grid; gap: 6mm; }
  .card { display: flex; flex-direction: column; min-height: 0; overflow: hidden; border: 0.5pt solid #cecac8; break-inside: avoid; }
  .card-photo { position: relative; flex: 1 1 0; min-height: 0; background: #e6e6e6; }
  .card-photo img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: 50% 40%; }
  .card-photo .badge { position: absolute; top: 0; right: 0; margin: 0; padding: 1.4mm 2.4mm; vertical-align: 0; }
  .card-body { flex: none; padding: 4.5mm 5mm 4mm; }
  .card .name { min-height: 1.9em; font-size: 15pt; }
  .card-role { display: flex; justify-content: space-between; align-items: baseline; gap: 3mm; margin-top: 3mm;
    padding-bottom: 3mm; border-bottom: 0.5pt solid #cecac8; }
  .card-role span:first-child { color: #3c1dee; font-size: 7pt; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; }
  .card-contact { margin-top: 2.5mm; font-size: 8.5pt; line-height: 1.45; }
  .card-contact div { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .small .card-body { padding: 3mm 3.5mm; }
  .small .card .name { font-size: 11pt; }
  .small .card-role { flex-direction: column; gap: 0.8mm; margin-top: 2mm; padding-bottom: 2mm; }
  .small .card-contact { margin-top: 1.5mm; font-size: 7.5pt; }
  .partners { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4mm; margin-top: 14mm; }
  .partner { position: relative; display: grid; place-items: center; aspect-ratio: 5 / 2; border: 0.5pt solid #cecac8; break-inside: avoid; }
  .partner.main { grid-column: span 2; }
  .partner img { position: absolute; inset: 0; margin: auto; width: 72%; height: 60%; object-fit: contain; }
  .partner .badge { position: absolute; top: 0; right: 0; margin: 0; padding: 1.2mm 2mm; vertical-align: 0; }
</style>
</head>
<body>
  ${cards ? cardsBody : `${header}\n  ${people.map(row).join('\n')}`}
</body>
</html>`

const browser = await chromium.launch({channel: 'chrome'})
try {
  const page = await browser.newPage()
  await page.setContent(html, {waitUntil: 'networkidle'})
  await page.evaluate(() => document.fonts.ready)
  await page.pdf({
    path: out,
    format: 'A4',
    margin: {top: '14mm', right: '14mm', bottom: '16mm', left: '14mm'},
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    // Header/footer templates can't use web fonts, hence Helvetica.
    footerTemplate: `<div style="width: 100%; padding: 0 14mm; display: flex; justify-content: space-between;
      font: 7pt Helvetica, sans-serif; color: #8a8582;">
      <span>${esc(heading)} · ${year}</span>
      <span class="pageNumber"></span>
    </div>`,
  })
} finally {
  await browser.close()
}

console.log(`${profilesLabel(people.length)} → ${out}`)
