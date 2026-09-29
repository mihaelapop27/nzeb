// One-off import of the static site's content into Sanity.
//
//   npm run seed        (= npx sanity exec seed/import.ts --with-user-token)
//
// Safe to re-run: it only creates what is missing (the home page by its fixed
// id, cities and people by name) and never overwrites edits made in the Studio.
// Each photo is uploaded once; Sanity dedupes identical assets by content hash.
import {createReadStream} from 'node:fs'
import path from 'node:path'
import {getCliClient} from 'sanity/cli'
import {cities, homePage, people} from './data'

const client = getCliClient({apiVersion: '2026-09-29'})
const imagesDir = path.join(import.meta.dirname, 'images')

const ref = (id: string) => ({_type: 'reference' as const, _ref: id})

/** The published document of a type whose `name` matches; returns its _id. */
const findByName = (type: string, name: string) =>
  client.fetch<string | null>(
    `*[_type == $type && name == $name && !(_id in path("drafts.**"))][0]._id`,
    {type, name},
  )

const home = await client.createIfNotExists({_id: 'homePage', _type: 'homePage', ...homePage})
console.log(`Pagina principală: ${home._id}`)

const cityIds = new Map<string, string>()
for (const name of cities) {
  const id = (await findByName('city', name)) ?? (await client.create({_type: 'city', name}))._id
  cityIds.set(name, id)
}
console.log(`Orașe: ${cityIds.size}`)

const photoIds = new Map<string, string>()
async function uploadPhoto(file: string): Promise<string> {
  if (!photoIds.has(file)) {
    const asset = await client.assets.upload('image', createReadStream(path.join(imagesDir, file)), {
      filename: file,
    })
    photoIds.set(file, asset._id)
  }
  return photoIds.get(file)!
}

let created = 0
for (const p of people) {
  if (await findByName('person', p.name)) continue
  await client.create({
    _type: 'person',
    name: p.name,
    studio: p.studio,
    category: p.category,
    curator: p.curator,
    city: ref(cityIds.get(p.city)!),
    photo: {_type: 'image', asset: ref(await uploadPhoto(p.photo))},
    ...(p.phone ? {phone: p.phone} : {}),
    email: p.email,
    website: p.website,
  })
  created++
}
console.log(`Profiluri: ${created} create, ${people.length - created} existau deja`)
