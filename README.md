# Mustafa BERBER — Portfolio

A responsive Turkish/English portfolio for Mustafa BERBER, Full Stack Developer. Built with Angular 22 standalone components, Signals, Tailwind CSS 4, Angular SSR, and a same-origin Express API backed by local PostgreSQL. The CMS uses server-side sessions and persistent local file storage; **Supabase is not used**.

## Public site

- `/` — bilingual home page and editable hero/SEO fields
- `/hakkimda` — profile areas, current CV, social links, and published testimonials
- `/hizmetler` — published service cards, working-process placeholders, published FAQs, and contact CTA
- `/blog` and `/blog/:slug` — published articles only, with Markdown, covers, tags, reading time, and SEO metadata
- `/lab` and `/lab/:slug` — published projects only, with Markdown, covers, tags, and external links
- `/iletisim` — accessible form that stores submitted messages in the admin inbox
- `/admin/login` and `/admin` — the single-account admin CMS; public signup does not exist
- Unknown routes and missing Blog/Lab slugs render a bilingual 404

Unverified biography, work history, service terms, and external profiles remain placeholders rather than invented claims. The illustrative `https://portfolio.alanadi.com` value is not a production origin.

## Local development and PostgreSQL

Use Node.js 22.12+ or 24.13+ and npm. Install the locked dependencies:

```bash
./scripts/agent-setup.sh
npm ci
```

Create a **dedicated local development database** (never point development or tests at production data), then configure the runtime environment in your process supervisor or local shell:

```bash
export DATABASE_URL='postgresql://<local-user>:<local-password>@127.0.0.1:5432/<local-database>'
export SESSION_SECRET="$(node -e "process.stdout.write(require('node:crypto').randomBytes(48).toString('base64url'))")"
export UPLOAD_DIR="$HOME/.local/share/mainsite/uploads"
export PORT=4000
# Set to 1 only when the app is behind exactly one trusted reverse proxy.
export TRUST_PROXY=0
```

`SESSION_SECRET` must be at least 32 bytes. Keep it in the host’s secret/environment mechanism; do not commit it, put it in client configuration, or paste it into logs. `UPLOAD_DIR` must be an absolute path on storage that survives process/container restarts. `/tmp`, `/var/tmp`, `/dev/shm`, and `/run` are rejected for normal runtime.

Apply the schema, create the single administrator interactively, and start the SSR server:

```bash
npm run db:migrate
npm run admin:bootstrap
npm run build
npm run serve:ssr:mainsite
```

`admin:bootstrap` asks for the exact confirmation word and email, then accepts the password without echoing it. Passwords are never read from environment variables or command-line arguments. Only a salted scrypt hash is stored. The first-admin operation is atomic and permanently refuses repeat runs; it does not create additional accounts. Keep your administrator access details in your own credential manager.

For Angular dev-server work, `npm start` serves the frontend on `http://localhost:4200/`; to exercise actual API/CMS behavior, use the built Node SSR server above with PostgreSQL and persistent storage configured. SSR host validation permits only `localhost` and `127.0.0.1` locally. Configure `NG_ALLOWED_HOSTS` with explicit production hostnames; do not use `*`.

## Data and security model

- `migrations/001_admin_cms.sql` creates the admin, CMS content, contact inbox, local file metadata, site settings, and PostgreSQL session tables. Run the explicit `db:migrate` command before serving; the web server does not silently modify the schema.
- `src/server/cms-api.mjs` serves the API and admin HTML paths on the same origin. Sessions are stored in PostgreSQL, use `HttpOnly`/`SameSite=Strict` cookies (and `Secure` in production), rotate on login, and are destroyed on logout. Unsafe methods require same-origin validation and a session CSRF token. Login and public contact submissions have rate limits.
- Public content endpoints return only `published` records whose publication time has arrived. Drafts and future-dated entries are withheld from both public pages and public APIs. Markdown is rendered through Angular’s sanitizing `[innerHTML]` binding; raw CMS HTML is not trusted.
- Only PNG/JPEG/WebP cover images and PDF CVs are accepted, with separate 5 MB/8 MB limits. Storage filenames are server-generated UUIDs. Uploads and file management require an admin session; a file is public only while referenced as a published cover or the current CV.
- Secrets remain server-only. There is no public signup, external auth/database provider, email integration, or production-data migration in this phase.

## Tests and quality gates

Integration tests require an **isolated local PostgreSQL database whose name ends in `_test`**; the test runner rejects other database names. Example:

```bash
export TEST_DATABASE_URL='postgresql://<local-user>:<local-password>@127.0.0.1:5432/mainsite_test'
npm run lint
npm test
npm run format:check
npm run build
```

The unit suite checks bilingual routes, accessibility-oriented contact validation, contact POST behavior, and static fallback rendering. The PostgreSQL suite exercises bootstrap/hash verification, sessions/CSRF, role protection, dashboard counts/order, every content kind’s CRUD/publication rules, contact message creation and inbox mutations, safe file types/size limits, public cover/CV access, and durable file storage. GitHub Actions provisions its own isolated PostgreSQL 16 service and runs the same lint/test/format/build gates.

## Storage and deployment risk

This implementation requires a persistent local filesystem path and PostgreSQL. The deployment target has **not** been selected or verified; before deployment, confirm a durable volume, scheduled database/file backups, and a tested restore procedure. If the host cannot provide persistent storage and backups, deployment is blocked. This PR does not deploy or merge.

See [AGENTS.md](AGENTS.md), [docs/frontend.md](docs/frontend.md), [docs/cms.md](docs/cms.md), [docs/roadmap.md](docs/roadmap.md), and [docs/phase-1-baseline.md](docs/phase-1-baseline.md).
