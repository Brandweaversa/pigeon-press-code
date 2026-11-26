# Pigeon Press

A digital newsstand: publishers register, upload magazines (A4 covers + flipbook
links) and submit editions for approval; readers browse, favourite and read in
the built-in reader; admins approve everything and tune the design (fonts,
logos, splash, backgrounds) from the admin console.

Stack: Next.js 16 · TypeScript · Tailwind CSS 4 · shadcn/ui · Prisma · NextAuth.

## Development

```bash
bun install
bun run db:push          # create/update the database
bun scripts/seed.ts      # core: settings, legal pages, categories, admin account
bun scripts/seed.ts --demo   # (optional) demo publishers + magazines
bun run dev              # http://localhost:3000
```

## Production (Vercel + cPanel MySQL)

Follow `DEPLOY-GUIDE.pdf`. Summary:

1. In `prisma/schema.prisma` change `provider = "sqlite"` → `provider = "mysql"`.
2. Point `DATABASE_URL` at your cPanel MySQL database (enable Remote MySQL).
3. Push the schema with `bunx prisma db push`, seed with `bun scripts/seed.ts`.
4. Deploy to Vercel, set `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`.
5. CNAME `pac.pigeoncomms.co.za` → Vercel.

`schema-mysql.sql` is the plain-SQL version of the database (phpMyAdmin import
works as an alternative to `db push`).

## Demo accounts (only after `--demo` seed)

| Role | Email | Password |
|---|---|---|
| Admin | admin@pigeoncomms.co.za | Admin@12345 |
| Publisher (approved) | publisher@pigeoncomms.co.za | Publisher@12345 |
| Publisher (pending) | karoo@pigeoncomms.co.za | Publisher@12345 |
| Reader | reader@pigeoncomms.co.za | Reader@12345 |

On a fresh production database, the very first account registered on the site
automatically becomes the platform administrator.
