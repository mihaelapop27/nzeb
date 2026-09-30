// Exports the published profiles as a compact A4 list (PDF), for sending or printing.
//
//   npm run export-pdf [-- profiluri.pdf]
//
// Runs on demand, on this machine; the site build doesn't need it. Printed with the Google
// Chrome installed here (playwright-core doesn't download a browser of its own).
import {readFileSync} from 'node:fs'
import path from 'node:path'
import {createImageUrlBuilder, type SanityImageSource} from '@sanity/image-url'
import {chromium} from 'playwright-core'
import {getCliClient} from 'sanity/cli'
import {profilesLabel} from '../../src/data/labels'

const file = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'profiluri.pdf'
const out = path.resolve(file)

const client = getCliClient({apiVersion: '2026-09-29', perspective: 'published', useCdn: false})
const builder = createImageUrlBuilder(client)

type Person = {
  name: string
  category: string
  curator: boolean
  city: string | null
  photo: SanityImageSource | null
  phone: string | null
  email: string | null
  website: string | null
}

const {title, people} = await client.fetch<{title: string | null; people: Person[]}>(`{
  "title": *[_id == "homePage"][0].title,
  "people": *[_type == "person"]{
    name, category, "curator": curator == true, "city": city->name, photo, phone, email, website
  }
}`)
// Sorted here, as on the site: GROQ orders by code point, which would put "Ștefan" after "Z".
people.sort((a, b) => a.name.localeCompare(b.name, 'ro'))

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]!)

// "https://www.vasile.ro/" → "vasile.ro"
const bareUrl = (url: string) => url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '')

const logo = readFileSync(new URL('../../src/assets/logo/ardi-logo-lockup.png', import.meta.url))
const date = new Date().toLocaleDateString('ro-RO', {day: 'numeric', month: 'long', year: 'numeric'})
const heading = title ?? 'Arhitecți & Designeri'

const row = (p: Person) => {
  // Square crop around the Studio hotspot, at ~3× the printed size.
  const photo = p.photo
    ? `<img src="${builder.image(p.photo).width(168).height(168).fit('crop').auto('format').url()}" alt="">`
    : '<div class="photo"></div>'
  const contact = [
    p.phone && `<a href="tel:${p.phone.replace(/[^+0-9]/g, '')}">${esc(p.phone)}</a>`,
    p.email && `<a href="mailto:${esc(p.email)}">${esc(p.email)}</a>`,
    p.website && `<a href="${esc(p.website)}">${esc(bareUrl(p.website))}</a>`,
  ]
    .filter(Boolean)
    .map((line) => `<div>${line}</div>`)
    .join('')
  return `<div class="person">
    ${photo}
    <div>
      <div class="name">${esc(p.name)}${p.curator ? '<span class="badge">Curator</span>' : ''}</div>
      <div class="role">${esc(p.category)}${p.city ? `<span>${esc(p.city)}</span>` : ''}</div>
    </div>
    <div class="contact">${contact}</div>
  </div>`
}

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
</style>
</head>
<body>
  <header>
    <div>
      <h1>${esc(heading)}</h1>
      <div class="meta">${profilesLabel(people.length)} · ${date}</div>
    </div>
    <img src="data:image/png;base64,${logo.toString('base64')}" alt="ARDI">
  </header>
  ${people.map(row).join('\n')}
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
      <span>${esc(heading)} · ${date}</span>
      <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
    </div>`,
  })
} finally {
  await browser.close()
}

console.log(`${profilesLabel(people.length)} → ${out}`)
