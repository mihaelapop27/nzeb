// Imports architects and designers from a form export (CSV: Tally or Google Forms) as profiles.
//
//   npm run import-tally -- ~/Downloads/form.csv [--publish] [--dry-run]
//
// Each submission becomes a draft profile, so nothing reaches the site before an
// editor has reviewed it in the Studio and clicked Publish (which rebuilds the site).
// With --publish, submissions that have every field a card needs (name, categories,
// city, photo) are published straight away; the rest still land as drafts.
// --dry-run prints what would happen without writing anything.
//
// Columns are matched by their question text, so rewording a question keeps working
// as long as it contains the keyword below (e.g. "Add your name" → name). Safe to re-run
// on a newer export: submissions already imported (by Tally submission ID, or by name when
// the export has no such column) are skipped.
import {randomUUID} from 'node:crypto'
import {readFileSync} from 'node:fs'
import path from 'node:path'
import {getCliClient} from 'sanity/cli'
import {formatWebsite} from '../lib/website'
import {CATEGORIES} from '../schemaTypes/person'

const args = process.argv.slice(2)
const file = args.find((a) => !a.startsWith('--'))
const publish = args.includes('--publish')
const dryRun = args.includes('--dry-run')
if (!file) throw new Error('Usage: npm run import-tally -- <export.csv> [--publish] [--dry-run]')

// "raw" sees drafts too, so a submission imported as a draft isn't imported twice.
const client = getCliClient({apiVersion: '2026-09-29', perspective: 'raw'})

// Fields pick their column in this order, each from the columns not taken yet, trying its
// patterns in order: "Email contact studio" goes to email before studio can claim it, and a
// "Telefon contact studio" column wins over a personal "Telefonul tău".
const COLUMNS = {
  submissionId: [/submission id/i],
  email: [/e-?mail/i],
  phone: [/(phone|telefon).*contact|contact.*(phone|telefon)/i, /phone|telefon/i],
  photo: [/photo|foto|poz|imagin/i],
  name: [/name|nume/i],
  studio: [/studio|firm/i],
  category: [/categor|profes|servici|\brole?\b|\brolul\b/i],
  city: [/city|oraș|oras/i],
  website: [/link|site|web/i],
}
type Field = keyof typeof COLUMNS

/** RFC 4180 CSV: quoted fields may contain commas, newlines and doubled quotes. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') cell += text[++i]
      else if (c === '"') quoted = false
      else cell += c
    } else if (c === '"') {
      quoted = true
    } else if (c === ',') {
      row.push(cell)
      cell = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else {
      cell += c
    }
  }
  if (cell || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows.filter((r) => r.some((v) => v.trim()))
}

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s-]+/g, ' ')
    .trim()

/** "40745177722" or "0745 177 722" → "+40 745 177 722"; other numbers keep their digits. */
function formatPhone(raw: string): string | undefined {
  let digits = raw.replace(/\D/g, '')
  if (!digits) return undefined
  if (digits.startsWith('0040')) digits = digits.slice(2)
  if (digits.length === 10 && digits.startsWith('0')) digits = '40' + digits.slice(1)
  if (digits.length === 11 && digits.startsWith('40')) {
    return `+40 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`
  }
  return (raw.trim().startsWith('+') || digits.length > 10 ? '+' : '') + digits
}

/**
 * Matches "arhitect", "arhitectura", "design interior", "Arhitect, Designer"… to schema values;
 * "ambele" / "both" means every category.
 */
function parseCategories(raw: string): string[] {
  const value = fold(raw)
  if (/\b(ambele|amandoua|both)\b/.test(value)) return CATEGORIES.map((c) => c.value)
  return CATEGORIES.map((c) => c.value).filter((c) =>
    c === 'Arhitect' ? /arhitect|architect/.test(value) : /design/.test(value),
  )
}

// Spelling for a city the import has to create, when the form answer lacks diacritics ("Iasi").
const CITY_NAMES = ['București', 'Brașov', 'Cluj-Napoca', 'Constanța', 'Iași', 'Oradea', 'Sibiu', 'Timișoara']

const cityIds = new Map<string, string>()
async function cityRef(name: string) {
  const key = fold(name)
  if (!cityIds.has(key)) {
    const cities = await client.fetch<{_id: string; name: string}[]>(
      `*[_type == "city" && !(_id in path("drafts.**"))]{_id, name}`,
    )
    const found = cities.find((c) => fold(c.name) === key)
    const spelled = CITY_NAMES.find((c) => fold(c) === key) ?? name.trim()
    const id =
      found?._id ??
      (dryRun ? 'new-city' : (await client.create({_type: 'city', name: spelled}))._id)
    if (!found) console.log(`  + oraș nou: ${spelled}`)
    cityIds.set(key, id)
  }
  return {_type: 'reference' as const, _ref: cityIds.get(key)!}
}

/** Google Drive share links ("open?id=…", "/file/d/…/view") → the file itself; others unchanged. */
function downloadUrl(url: string) {
  const id = url.match(/drive\.google\.com\/(?:open\?id=|file\/d\/|uc\?.*id=)([\w-]+)/)?.[1]
  return id ? `https://drive.google.com/uc?export=download&id=${id}` : url
}

async function uploadPhoto(url: string) {
  const res = await fetch(downloadUrl(url))
  if (!res.ok) throw new Error(`photo download failed (${res.status})`)
  // A Drive file that isn't shared publicly answers with a sign-in page, not an error.
  if (!res.headers.get('content-type')?.startsWith('image/')) {
    throw new Error(`not an image (${res.headers.get('content-type')}); is the file public?`)
  }
  // Drive sends the name twice; only the RFC 5987 one (filename*=UTF-8''…) keeps diacritics intact.
  const encoded = res.headers.get('content-disposition')?.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
  const filename = decodeURIComponent(encoded ?? path.basename(new URL(url).pathname))
  const asset = await client.assets.upload('image', Buffer.from(await res.arrayBuffer()), {
    filename,
  })
  return {_type: 'image' as const, asset: {_type: 'reference' as const, _ref: asset._id}}
}

const [header, ...rows] = parseCsv(readFileSync(file, 'utf8'))
const taken = new Set<number>()
const index = Object.fromEntries(
  Object.entries(COLUMNS).map(([field, patterns]) => {
    for (const re of patterns) {
      const i = header.findIndex((h, j) => !taken.has(j) && re.test(h))
      if (i >= 0) {
        taken.add(i)
        return [field, i]
      }
    }
    return [field, -1]
  }),
) as Record<Field, number>
if (index.name < 0) throw new Error(`No name column in ${file} (headers: ${header.join(', ')})`)
console.log(
  `Coloane: ${Object.entries(index)
    .map(([f, i]) => `${f}=${i < 0 ? '—' : `"${header[i]}"`}`)
    .join(', ')}\n`,
)

const counts = {published: 0, drafts: 0, skipped: 0}
for (const row of rows) {
  const get = (field: Field) => (index[field] < 0 ? '' : (row[index[field]] ?? '').trim())
  const name = get('name')
  const submissionId = get('submissionId')
  if (!name) {
    console.log(`– rând fără nume (${submissionId || 'fără ID'}), sărit`)
    counts.skipped++
    continue
  }
  const imported = submissionId
    ? await client.fetch<number>(`count(*[_type == "person" && submissionId == $submissionId])`, {
        submissionId,
      })
    : (await client.fetch<string[]>(`*[_type == "person"].name`)).some((n) => fold(n) === fold(name))
  if (imported) {
    console.log(`– ${name}: importat deja, sărit`)
    counts.skipped++
    continue
  }

  const phone = formatPhone(get('phone'))
  const website = formatWebsite(get('website'))
  const email = get('email').toLowerCase()
  const categories = parseCategories(get('category'))
  const photoUrl = get('photo')
    .match(/https?:\/\/\S+/)?.[0]
    ?.replace(/,$/, '')
  const notes: string[] = []
  if (get('website') && !website) notes.push(`link ignorat: "${get('website')}"`)
  if (get('category') && !categories.length) notes.push(`categorie necunoscută: "${get('category')}"`)

  let photo
  if (photoUrl && !dryRun) {
    try {
      photo = await uploadPhoto(photoUrl)
    } catch (err) {
      notes.push(`fotografie: ${(err as Error).message}`)
    }
  }
  const city = get('city') ? await cityRef(get('city')) : undefined

  const missing = [
    !categories.length && 'categorie',
    !city && 'oraș',
    !(photo || (dryRun && photoUrl)) && 'fotografie',
  ].filter(Boolean)
  const asDraft = !publish || missing.length > 0

  const doc = {
    _id: asDraft ? `drafts.${randomUUID()}` : randomUUID(),
    _type: 'person',
    name,
    curator: false,
    ...(get('studio') ? {studio: get('studio')} : {}),
    ...(categories.length ? {categories} : {}),
    ...(city ? {city} : {}),
    ...(photo ? {photo} : {}),
    ...(phone ? {phone} : {}),
    ...(email ? {email} : {}),
    ...(website ? {website} : {}),
    ...(submissionId ? {submissionId} : {}),
  }
  if (!dryRun) await client.create(doc)

  counts[asDraft ? 'drafts' : 'published']++
  const todo = missing.length ? ` — de completat în Studio: ${missing.join(', ')}` : ''
  console.log(`${asDraft ? '✎ ciornă' : '✔ publicat'}: ${name}${todo}`)
  for (const note of notes) console.log(`    ! ${note}`)
}

console.log(
  `\n${dryRun ? '[dry run, nimic scris] ' : ''}${counts.published} publicate, ${counts.drafts} ciorne, ${counts.skipped} sărite.`,
)
if (counts.drafts && !dryRun) {
  console.log('Ciornele apar pe site după ce le completezi și apeși Publish în Studio.')
}
