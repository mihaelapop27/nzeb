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

## Import din formularul Tally

Formular Tally → Google Sheet → CSV → `npm run import-tally` → Sanity → site.

1. **Formularul** ([tally.so/r/J95RqY](https://tally.so/r/J95RqY)): 7 întrebări, toate obligatorii.
   Fiecare conține cuvântul-cheie după care scriptul găsește coloana:

   | Întrebarea | Cuvânt-cheie | Pe card |
   | --- | --- | --- |
   | Add your studio name | name, nume | titlul |
   | Add a phone number | phone, telefon | telefonul |
   | Add email | email | butonul „Email” |
   | Add site | link, site | butonul „Site” |
   | Add Photo (imagine, max. 10 MB) | photo, foto | fotografia, decupată pătrat |
   | What is the city: București, Brașov, Cluj-Napoca, Constanța, Iași, Oradea, Sibiu, Timișoara | city, oraș | orașul și filtrul de orașe |
   | Add your role: Arhitect / Designer de interior | role, rol | eticheta de rol și filtrul |

   Curatorii se bifează în Studio, nu în formular.
2. **Google Sheets**: în Tally, Integrations → Google Sheets → Connect. Nu șterge coloana
   *Submission ID*: după ea, scriptul sare peste înscrierile deja importate.
3. **Verificare**: șterge din foaie spam-ul și testele. Foaia rămâne privată (telefoane, link-uri la poze).
4. **CSV**: File → Download → Comma-separated values. Importă-l în aceeași zi.
5. **Import**, din `studio/` (o dată: `npm install` și `npx sanity login`):

   ```sh
   npm run import-tally -- ~/Downloads/"Nume fișier.csv" --dry-run   # doar verificare
   npm run import-tally -- ~/Downloads/"Nume fișier.csv" --publish   # import
   ```

   `✔ publicat` = e pe site · `✎ ciornă` = de completat în Studio · `– sărit` = importat deja.
   Fără `--publish`, totul intră ca ciornă.
6. **Studio** (<https://nzeb.sanity.studio>): completează ciornele și apasă Publish. Tot aici bifezi
   Curator, potrivești decupajul fotografiei și faci corecturi.
7. **Site**: se reconstruiește singur la fiecare Publish, în 1–2 minute.

## Export PDF

Lista profilurilor publicate, pe A4: fotografie, nume, rol, oraș, telefon, email și site (linkuri
care se pot da click). Curatorii au eticheta Curator. Din `studio/` (o dată: `npm install` și
`npx sanity login`):

```sh
npm run export-pdf                            # → studio/profiluri.pdf
npm run export-pdf -- ~/Desktop/lista.pdf     # alt fișier
```

Tipărește cu Google Chrome instalat pe calculator. Nu face parte din build-ul site-ului.

## Development

- `npm run dev` starts the Studio at <http://localhost:3333>.
- After changing the schema or a query in `../src/lib/sanity.ts`, run `npm run typegen`
  (regenerates `../sanity.types.ts`) and `npx sanity schemas deploy`.
