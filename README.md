# Pigeon Press

A digital newsstand: publishers register, publish magazines (logo / brand,
description, category, frequency) and release editions (title, issue number,
flipbook URL, thumbnail); readers discover the latest editions, save favourites
and read in the built-in reader; admins approve publishers, feature magazines
and tune the design (fonts, logos, splash, backgrounds) from the admin console.

**Moderation model:** only *publishers* are approved. Once a publisher is
approved, their magazines and editions publish instantly — there is no
per-item content queue. Revoking a publisher hides all of their content.

Stack: Next.js 16 · TypeScript · Tailwind CSS 4 · shadcn/ui · Prisma · MySQL · NextAuth.

## How the app flows

| Role | Where | What happens |
|---|---|---|
| Reader | **Discover** | Feed of the latest editions from every approved publisher. Tap an edition for the full-width thumbnail, edition info, previous editions (in the publisher's order) and publisher contact details. |
| Reader | **Magazines** | Catalogue of magazine logos (featured titles first). Tap a logo for brand info, all editions and publisher info. |
| Publisher | **Publish** | "My magazines" shows logo tiles with Editions / Edit / Delete actions. The Editions screen lets you drag thumbnails into the exact order readers see. New editions go live immediately and favouriting readers are notified. |
| Admin | **Admin** | Approvals (publishers only), magazine featuring, categories, design console, legal pages. |

## Development

```bash
bun install
bun run db:push          # create/update the database
bun scripts/seed.ts      # core: settings, legal pages, categories, admin account
bun scripts/seed.ts --demo   # (optional) demo publishers + magazines + editions
bun run dev              # http://localhost:3000
```

The Prisma datasource reads `PIGEON_DATABASE_URL` (see `.env.example`) — the
distinct name prevents accidental clashes with a generic `DATABASE_URL` that
hosting platforms often inject. Copy `.env.example` to `.env` and fill it in.

## Production (Vercel + cPanel MySQL)

See `DEPLOY-GUIDE.md`. Summary:

1. Create a MySQL database in cPanel and enable Remote MySQL.
2. Set `PIGEON_DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` and deploy to Vercel.
3. Push the schema with `bunx prisma db push`, seed with `bun scripts/seed.ts`.
4. CNAME `pac.pigeoncomms.co.za` → Vercel.

## Demo accounts (only after `--demo` seed)

| Role | Email | Password |
|---|---|---|
| Admin | admin@pigeoncomms.co.za | Admin@12345 |
| Publisher (approved) | publisher@pigeoncomms.co.za | Publisher@12345 |
| Publisher (pending) | karoo@pigeoncomms.co.za | Publisher@12345 |
| Reader | reader@pigeoncomms.co.za | Reader@12345 |

On a fresh production database, the very first account registered on the site
automatically becomes the platform administrator.
