// Imports architects and designers from a Tally form export (CSV) as profiles.
//
//   npm run import-tally -- ~/Downloads/form.csv [--publish] [--dry-run]
//
// Each submission becomes a draft profile, so nothing reaches the site before an
// editor has reviewed it in the Studio and clicked Publish (which rebuilds the site).
// With --publish, submissions that have every field a card needs (name, category,
// city, photo) are published straight away; the rest still land as drafts.
// --dry-run prints what would happen without writing anything.
//
// Columns are matched by their question text, so rewording a question keeps working
// as long as it contains the keyword below (e.g. "Add your name" → name). Safe to re-run
// on a newer export: submissions already imported (by Tally submission ID) are skipped.
import {randomUUID} from 'node:crypto'
import {readFileSync} from 'node:fs'
import path from 'node:path'
import {getCliClient} from 'sanity/cli'
import {CATEGORIES} from '../schemaTypes/person'

const args = process.argv.slice(2)
const file = args.find((a) => !a.startsWith('--'))
const publish = args.includes('--publish')
const dryRun = args.includes('--dry-run')
if (!file) throw new Error('Usage: npm run import-tally -- <export.csv> [--publish] [--dry-run]')

// "raw" sees drafts too, so a submission imported as a draft isn't imported twice.
const client = getCliClient({apiVersion: '2026-09-29', perspective: 'raw'})

const COLUMNS = {
  submissionId: /submission id/i,
  name: /name|nume/i,
  studio: /studio|birou|firm/i,
  category: /categor|profes|\brole?\b|\brolul\b/i,
  city: /city|oraș|oras/i,
  phone: /phone|telefon/i,
  email: /e-?mail/i,
  website: /link|site|web/i,
  photo: /photo|foto|poz|imagin/i,
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

/** "vasile.ro" → "https://vasile.ro"; undefined when it isn't a usable address. */
function formatWebsite(raw: string): string | undefined {
  const value = raw.trim()
  if (!value) return undefined
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`)
    return url.hostname.includes('.') ? url.href.replace(/\/$/, '') : undefined
  } catch {
    return undefined
  }
}

/** Matches "arhitect", "Architect", "designer de interior", "Designer"… to a schema value. */
function parseCategory(raw: string): string | undefined {
  const value = fold(raw)
  if (!value) return undefined
  if (/arhitect|architect/.test(value)) return 'Arhitect'
  if (/design/.test(value)) return 'Designer de interior'
  return CATEGORIES.find((c) => fold(c.value) === value)?.value
}

const cityIds = new Map<string, string>()
async function cityRef(name: string) {
  const key = fold(name)
  if (!cityIds.has(key)) {
    const cities = await client.fetch<{_id: string; name: string}[]>(
      `*[_type == "city" && !(_id in path("drafts.**"))]{_id, name}`,
    )
    const found = cities.find((c) => fold(c.name) === key)
    const id =
      found?._id ??
      (dryRun ? 'new-city' : (await client.create({_type: 'city', name: name.trim()}))._id)
    if (!found) console.log(`  + oraș nou: ${name.trim()}`)
    cityIds.set(key, id)
  }
  return {_type: 'reference' as const, _ref: cityIds.get(key)!}
}

async function uploadPhoto(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`photo download failed (${res.status})`)
  const filename = decodeURIComponent(path.basename(new URL(url).pathname))
  const asset = await client.assets.upload('image', Buffer.from(await res.arrayBuffer()), {
    filename,
  })
  return {_type: 'image' as const, asset: {_type: 'reference' as const, _ref: asset._id}}
}

const [header, ...rows] = parseCsv(readFileSync(file, 'utf8'))
const index = Object.fromEntries(
  Object.entries(COLUMNS).map(([field, re]) => [field, header.findIndex((h) => re.test(h))]),
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
  if (
    submissionId &&
    (await client.fetch(`count(*[_type == "person" && submissionId == $submissionId])`, {
      submissionId,
    }))
  ) {
    console.log(`– ${name}: importat deja, sărit`)
    counts.skipped++
    continue
  }

  const phone = formatPhone(get('phone'))
  const website = formatWebsite(get('website'))
  const email = get('email')
  const category = parseCategory(get('category'))
  const photoUrl = get('photo')
    .match(/https?:\/\/\S+/)?.[0]
    ?.replace(/,$/, '')
  const notes: string[] = []
  if (get('website') && !website) notes.push(`link ignorat: "${get('website')}"`)
  if (get('category') && !category) notes.push(`categorie necunoscută: "${get('category')}"`)

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
    !category && 'categorie',
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
    ...(category ? {category} : {}),
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
