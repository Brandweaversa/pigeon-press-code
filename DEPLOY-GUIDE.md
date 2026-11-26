# Deploy guide — Vercel + cPanel MySQL

This guide takes a fresh Pigeon Press checkout to a live site on
`https://pac.pigeoncomms.co.za` (or any domain) using Vercel for hosting and a
cPanel MySQL database.

## 1. Create the database in cPanel

1. Log in to cPanel → **MySQL Databases**.
2. Create a database, e.g. `cpaneluser_pigeon`.
3. Create a user, e.g. `cpaneluser_pigeon`, with a strong password.
4. **Add User To Database** and grant **ALL PRIVILEGES**.
5. cPanel → **Remote MySQL** → add host `%` (or Vercel's IP ranges) so the app
   can connect. Note: without Remote MySQL access, Vercel cannot reach the DB.

## 2. Collect the connection string

Format (all four values come from step 1):

```
mysql://USER:PASSWORD@HOST:3306/DBNAME
```

- `HOST` is your site domain, e.g. `pigeoncomms.co.za` (do not use `localhost`).
- If the password contains special characters (`@ : / # ?`), URL-encode them
  (`@` → `%40`, etc.).

## 3. Push the schema and seed

From your machine, once `.env` contains the connection string:

```bash
bun install
bunx prisma db push        # creates every table
bun scripts/seed.ts        # default settings, legal pages, categories
```

The very first account registered through the website becomes the platform
administrator — register immediately after deploy (see step 5), or seed a known
admin by running `bun scripts/seed.ts` and using the admin credentials it prints.

## 4. Deploy to Vercel

1. Push the repository to GitHub and import it in Vercel.
2. Framework preset: **Next.js** (defaults are fine — the app builds standalone).
3. Environment variables (Project → Settings → Environment Variables):

| Name | Value |
|---|---|
| `PIGEON_DATABASE_URL` | the mysql:// string from step 2 |
| `NEXTAUTH_SECRET` | a long random string — `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://pac.pigeoncomms.co.za` |

4. Deploy, then re-deploy once after adding env vars so they take effect.

## 5. First admin + content

1. Open the site → **Sign in** → **Create account**.
2. The first account created becomes **ADMIN** automatically.
3. Publishers register themselves (Publish tab → register as publisher); approve
   them in Admin → Approvals. Once approved, everything they publish is live.
4. Use Admin → Magazines to star (feature) titles — featured magazines appear
   first in the Magazines catalogue.
5. Use Admin → Design to set the app icon (also used as the browser favicon),
   splash logo (shown alone, no text), header logo and background.

## 6. Point the domain

In cPanel → **Zone Editor** (or your DNS provider):

```
CNAME  pac  →  cname.vercel-dns.com
```

In Vercel → Project → Settings → Domains, add `pac.pigeoncomms.co.za`.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `P1001 can't reach database` | Remote MySQL not enabled, wrong HOST, or firewall. |
| `P2000 value too long` | Re-run `bunx prisma db push` — the schema maps long text columns with `@db.Text`. |
| Login loops / CSRF errors | `NEXTAUTH_URL` must exactly match the public URL (no trailing slash). |
| Favicon does not change | Browsers cache favicons; hard-refresh or wait — the URL is content-addressed per uploaded icon. |
