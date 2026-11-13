# Vietnam Atlas

**Discover More. Experience Vietnam. Plan Together.**

A Vietnam discovery platform and collaborative group trip planner: destination guides, an experience catalogue with honest prices and seasonality, a wishlist and comparison tool, a group workspace with voting and consensus, an itinerary builder with planning alerts, a budget engine, an A–Z travel guide, an optional tech-networking area, and an admin CMS.

It runs on **Next.js on Vercel** with **Postgres on Supabase**. For local work you can point it at Supabase or at a local Postgres in Docker.

---

## Quick start (local)

Requirements: **Node.js 22+** (tested on Node 24), npm, and Docker (for a local Postgres) or a Supabase project.

```bash
npm install
npm run db:local          # starts Postgres 17 in Docker on port 54329 (skip if you use Supabase)
cp .env.example .env.local # then set DATABASE_URL (see the file for the local and Supabase formats)
npm run db:reset          # empties the database, applies migrations, seeds all content
npm run dev               # http://localhost:3000
```

Then:

1. `db:reset` prints the **staff passwords** it generated (also saved to `data/initial-credentials.txt`, readable only by you and never committed). Set `SEED_ADMIN_PASSWORD` / `SEED_EDITOR_PASSWORD` (12+ characters) beforehand to choose your own. There are no default passwords.
2. Sign in at <http://localhost:3000/login> as `admin@atlas.local`. The admin account **owns** the "Vietnam Cousins Trip 2026" workspace.
3. Open **Group Planner → Members** to copy the invite link. The invite code is random (set `DEMO_INVITE_CODE` before seeding to choose one). Share it only with the travellers: anyone holding it can join the trip.
4. Each cousin opens the link and claims their seat. Each browser is a separate guest identity until they register.

**Admin CMS:** `/admin` with `admin@atlas.local` (super admin) or `editor@atlas.local` (content editor).

`db:reset` refuses to touch a non-local database unless you pass `--yes-really-reset`.

---

## Deploying: Supabase + Vercel

1. **Supabase:** in the dashboard open **Connect** and copy two URIs: the **Transaction pooler** (port 6543) for the app and the **Session pooler** (port 5432) for migrations.
2. **Prepare the database** from your machine, with both URIs in `.env.local` as `DATABASE_URL` and `MIGRATION_DATABASE_URL`:
   ```bash
   npm run db:reset -- --yes-really-reset   # first time only: creates every table and seeds the content
   npm run db:migrate                       # later releases: applies new migrations only
   ```
   Migrations enable Row Level Security on every table and revoke Supabase's Data API roles, so only the app's own connection can read or write.
3. **Vercel:** `vercel link`, then set `DATABASE_URL` (transaction pooler), `NEXT_PUBLIC_SITE_URL` (your production URL) and `TRUST_PROXY=1` for Production, and deploy with `vercel deploy --prod`. Put the functions in the region nearest your Supabase project (see `vercel.json`).

Nothing at runtime writes to the filesystem: admin image uploads are stored in Postgres and served (and CDN-cached) by `/media/uploads/[file]`.

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run db:local` | Start a local Postgres 17 in Docker (port 54329) |
| `npm run db:reset` | Empty the database, apply migrations, seed (local databases only, unless `--yes-really-reset`) |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:generate` | Generate a new migration after editing `src/db/schema.ts` |
| `npm run db:seed` | Seed a freshly migrated, empty database |
| `npm run content:check` | Validate the seed content files (slugs, references, months, prices) |
| `npm run media -- sync` | Make `public/media` match the reviewed photo manifest (downloads missing files, deletes unused ones) |
| `npm run media -- audit` | Contact sheets of every photo plus a near-duplicate report, for visual review (`data/media-review/audit`) |
| `npm run media -- candidates` | Gather place-accurate photo candidates (Wikidata and Commons categories) for entities below their photo target; `--search` adds a slower search pass |
| `npm run media -- apply picks.json` | Add reviewed candidate picks to the manifest with full attribution |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | End-to-end tests (Playwright) against a throwaway local database (`atlas_e2e`), port 3100 |
| `npm run typecheck` | TypeScript in strict mode |

---

## What's inside

| Area | Route | Highlights |
|---|---|---|
| Home | `/` | Hero search, regions, popular destinations, adventure types, signature experiences, free and budget picks, month-by-month seasons, travel essentials, group planning |
| Explore | `/explore`, `/explore/[region]` | North / Central / South with climate, map and destinations |
| Destinations | `/destinations`, `/destinations/[slug]` | Filters (region, type, month, budget, adventure), sorting, list/map toggle; detail pages with sections A–J from the spec |
| Experiences | `/experiences`, `/experiences/[slug]` | 432 activities across 26 destinations and 163 attractions; composable URL filters with live counts, INR price buckets, pagination; product-style detail pages |
| Attractions | `/attractions/[slug]` | Opening hours and fees with verification status |
| Map | `/map` | Leaflet + OpenStreetMap: destination, attraction and activity layers, clustering, region/category filters, search, your itinerary route |
| Wishlist | `/wishlist`, `/wishlist/compare` | Tabs, 7 filters, grid/list/compare views, bulk actions, CSV/JSON export; side-by-side comparison with differences highlighted |
| Group planner | `/group`, `/group/[id]`, `/join/[code]` | Invites (link and code), seats, roles, preferences, voting (5 levels, named or anonymous), proxy votes for unjoined seats, comments, consensus, participant-based cost splits |
| My Trip | `/trip` | Day cards with drag-and-drop (mouse, touch and keyboard), calendar, timeline and route views, transport, accommodation, planning alerts, suggested route |
| Budget | `/trip/budget` | INR and VND; budget/balanced/comfortable scenarios; categories, destinations, days, travellers; quotes vs estimates; manual adjustments; emergency reserve |
| Travel guide | `/guide`, `/guide/[section]` | A–J with official requirements vs advice, key facts with status, sources, currency converter, trackable packing and preparation checklists |
| Work & Connect | `/connect` | Communities, coworking and verified events; private networking prep (intro, LinkedIn, contacts, follow-ups) |
| Account | `/account`, `/login`, `/register` | Guest-to-account upgrade, data export (JSON), account deletion |
| Admin | `/admin/*` | Destinations, attractions, activities (draft → publish validation), sources and verification dates, image upload, price history, events, users and roles, feedback, review moderation, audit log, FX and budget settings |

---

## Architecture

- **Next.js 16** (App Router, Server Components, Server Actions), **React 19**, **TypeScript strict**, **Tailwind CSS 4** with design tokens in `src/app/globals.css`.
- **Postgres (Supabase) + Drizzle ORM** through the `postgres` driver, normalised relational schema in `src/db/schema.ts`, migrations in `src/db/migrations`. The app connects through Supabase's transaction pooler with prepared statements off; `src/db/query-helpers.ts` gives queries promise-returning `.get()` / `.all()` / `.run()`.
- **Auth:** scrypt password hashes and opaque session tokens (stored hashed). Visitors get an automatic guest account on their first write. Platform roles are `super_admin`, `content_editor`, `member` and `visitor`; trip roles are `owner`, `editor` and `member`.
- **Leaflet** with OpenStreetMap tiles, **dnd-kit** for drag-and-drop, **lucide-react** icons. Fonts are self-hosted via `@fontsource-variable` (Playfair Display and Inter).

```
src/
  app/              routes, server actions (app/actions/*), route handlers (app/api/*)
  components/       ui/ (design system), catalog/, group/, itinerary/, budget/, map/, admin/, …
  content/          typed seed content (catalogue, guide, networking, demo trip, taxonomy)
  db/               schema, client, migrations, seed
  lib/              pure domain logic: budget-engine, consensus, planning-alerts, activity-filters, money, auth
  services/         data access (catalogue snapshot + search, trips, guide, media, settings)
scripts/            content checker, media fetcher, link checker, e2e reset
tests/unit, tests/e2e
```

**Security:** every trip read and write goes through `assertMember()` on the server, so non-members get a 404. Inputs are validated with Zod. Login, registration, joining, comments and feedback are rate-limited. Uploads are type-, size- and dimension-checked, then re-encoded with sharp. They are stored in Postgres (`media_blobs`) and served by `/media/uploads/[file]` with year-long cache headers. Session cookies are httpOnly. Admin pages don't show trip contents, and other travellers never see email addresses.

---

## Data: what's verified and what's estimated

Accuracy rules from the brief are enforced in the data model: every fact carries a **status** (`verified_official`, `verified_provider`, `estimated`, `community`, `needs_verification`, `temporarily_unavailable`), sources and a verification date. These are shown in the UI and summarised at **/sources**.

- **Destinations, attractions and activities:** researched editorial content. Background facts are cited to the official tourism site (vietnam.travel), Wikipedia/Wikivoyage (labelled *community*) and official operator homepages.
- **Activity prices:** **planning estimates** (indicative VND ranges with a stated basis). They are not quotes. INR is converted with a **manual reference rate** set in Admin → Settings, and the rate's date is shown wherever conversions appear.
- **Opening hours and entrance fees:** shown only where the author was confident. Everything else reads "Not verified" with status *needs verification*.
- **December suitability:** every activity has an explicit December status. Central-coast cave expeditions (Son Doong, Hang En, Tu Lan…), Cham Islands snorkelling and Con Dao turtle experiences are marked as **not operating in December**.
- **Travel guide (visa, driving, SIM, drones, alcohol, emergency):** the key legal facts were checked against official or primary sources in November 2026 by the content team. Each article lists what is verified and what still needs checking. **Important for the demo group:** Phu Quoc's visa exemption covers the island only, so Indian passport holders continuing to the mainland need an e-visa.
- **Events:** only events with an authoritative public listing are included (2 for 12–25 Dec 2026, venue TBD at the time of checking). There are no invented dates.
- **No fabricated ratings or reviews.** Reviews are user-submitted, moderated and labelled as community content.
- **Photography:** 462 openly licensed photographs from Wikimedia Commons (CC BY / BY-SA / CC0 / public domain), stored in `public/media` and credited with author, licence and source link. Every photo was checked by eye against the place or experience it illustrates; 210 automatic matches that were wrong, misleading or poor were rejected and are listed with reasons in `src/content/media-rejects.json`, so they can never be re-added. Replacements come from place-accurate sources first, the place's Wikidata image and its Commons category, and only then from searches scoped to the destination. A perceptual-hash check guarantees no photo appears twice in the collection.
- **No repeated pictures:** an experience without its own photo borrows an unused photo of its attraction or destination, labelled *representative*. A photo is never borrowed twice, and venue-specific experiences never show a different venue; beyond that, cards show a designed placeholder with the experience's category. Destination and attraction pages show only an experience's own photos, because their galleries are already on screen.

`npx tsx scripts/check-links.ts` checks every cited URL and writes `data/link-report.json`. At the last run, 200 of 215 URLs responded normally. The other 15 are Vietnamese government, legal-database and news sites (for example evisa.gov.vn, bqllang.gov.vn, vnexpress.net) that refuse automated clients or serve incomplete TLS chains. They open normally in a browser, and the guide's key ones were checked manually.

---

### Curating photos

Photos are only added after a person has looked at them:

1. `npm run media -- candidates` gathers candidates for anything below its photo target and renders contact sheets in `data/media-review/sheets` (`--search` adds a slower, rate-limited search pass).
2. Review the sheets; write the accurate picks to a JSON file: `[{ "key": "attraction:hue-thien-mu-pagoda", "cids": ["226a"] }]`.
3. `npm run media -- apply picks.json`, then `npm run db:reset` (or upload through Admin → the entity's images).
4. To retire a photo, add its title to `src/content/media-rejects.json` and run `npm run media -- sync`. `npm run media -- audit` renders every photo for a periodic review.

## Security model

- **Access control:** every trip read and write is checked on the server (`assertMember`), every admin page and action checks the role itself (`requireAdminPage` / `requireRole`).
- **Anonymous voting** never sends individual votes to other members, only tallies, your own vote and (for owners/editors) proxy votes for unclaimed seats.
- **Invites never grant ownership.** Released seats lose any special role; trips are owned by the person who created them.
- **Headers:** a Content Security Policy (no third-party scripts; map tiles from tile.openstreetmap.org), `X-Frame-Options: DENY`, `nosniff`, a strict referrer policy and HSTS.
- **Rate limits** live in Postgres, so every server instance shares them: failed logins per account and browser (with a known-device cookie so attackers can't lock you out), joins and comments per user, guest creation per network. `X-Forwarded-For` is only trusted with `TRUST_PROXY=1` (set it on Vercel).
- **Supabase Data API:** Row Level Security is on for every table with no public policies, and the `anon` / `authenticated` roles have no table privileges.
- **Data integrity:** the database enforces real date ranges, non-negative costs, one current price per activity, one vote per member per item and one review per person per experience.

## Known limitations

- **Collaboration** is "live" through polling (about every 8 s), not push. Supabase Realtime could replace `LiveRefresh` later.
- **Catalogue cache:** each server instance caches the published catalogue for up to a minute, so admin edits can take that long to appear everywhere.
- **Map tiles** come from tile.openstreetmap.org.
- **FX rates** are manual (Admin → Settings). There's no live currency API.
- **Guest identities** are tied to one browser's cookie. Create an account (Account → Register) to use the same identity across browsers.
- **Password reset and email verification** aren't implemented (there's no mail service). An admin can change roles or disable accounts.
- **Seeding a remote database** sends about 7,300 statements, so a first `db:reset` against Supabase takes a few minutes.
- **Bookings:** there are no booking integrations, and the app deliberately has no checkout.

## Tests

```bash
npm test             # unit: budget engine, consensus, planning alerts, filters
npm run test:e2e     # end-to-end: the 7 acceptance scenarios + smoke test, desktop and mobile
```
