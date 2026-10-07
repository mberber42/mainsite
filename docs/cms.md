# Admin/CMS operations

## Architecture

The Phase 3 admin uses a same-origin Express API in the Angular SSR Node server, a local PostgreSQL database, PostgreSQL-backed `express-session`, and persistent local file storage. Supabase and third-party database/auth/storage providers are not part of this implementation.

- Apply explicit, transactionally tracked SQL migrations with `npm run db:migrate`.
- Start the service only with `DATABASE_URL`, a `SESSION_SECRET` of at least 32 bytes, and an absolute `UPLOAD_DIR` on persistent storage. `PORT` defaults to 4000; set `TRUST_PROXY=1` only behind one trusted reverse proxy.
- `/admin/login` is the only unauthenticated admin route. There is no public signup. A one-time `npm run admin:bootstrap` prompts interactively for `CREATE`, email, and a hidden password, storing a salted scrypt hash. Bootstrap is atomic and rejects repeat runs.
- Sessions are stored in PostgreSQL, use eight-hour `HttpOnly`/`SameSite=Strict` cookies and `Secure` in production, rotate at login, and are destroyed at logout. Anonymous `/api/auth/csrf` and `/api/auth/session` requests can create at most 20 persisted sessions per IP per minute; rejected requests do not create sessions. Mutation methods require same-origin checks plus a session CSRF token.
- Admin HTML responses deny framing with `X-Frame-Options: DENY` and `Content-Security-Policy: frame-ancestors 'none'`.
- Admin CRUD is server-authorized. Public endpoints expose only published entries whose scheduled publication time is not in the future. File writes/deletes are admin-only; public reads are limited to files currently used as a published cover or CV.

## Schema and content kinds

`migrations/001_admin_cms.sql` creates `admin_users`, `content_entries`, `contact_messages`, `stored_files`, `site_settings`, and `cms_sessions`. Content kinds are Blog, Lab, Services, FAQs, Testimonials, Social links, Hero, and SEO. CRUD supports bilingual title/summary/body, slug generation/uniqueness, draft/published state and publication time, tags/category, cover metadata, Markdown source, project links, and SEO title/description/OG/canonical values.

## File storage and backups

The API checks the real upload directory, requires owner-only directory permissions (`0700`), and rejects ephemeral roots (`/tmp`, `/var/tmp`, `/dev/shm`, `/run`) during normal runtime. Existing directories with broader permissions are rejected rather than silently adopted. Image uploads accept PNG/JPEG/WebP up to 5 MB; CV uploads accept PDF up to 8 MB. Filenames are random UUIDs, not client filenames. Back up PostgreSQL and the upload volume together so metadata and file bytes remain consistent.

**Deployment risk remains open:** no target host, persistent volume, backup policy, or restore path has been verified. Before deploying, validate durable storage, automated database and file backups, and a successful restore. If either storage persistence or backup/restore cannot be guaranteed, deployment is blocked. The implementation PR itself is not a deployment authorization.

## Isolated tests

The server test harness accepts only `TEST_DATABASE_URL` values whose database name ends in `_test`. Never supply a production database URL. CI creates an isolated PostgreSQL 16 service named `mainsite_test` and runs the same integration suite.

For UI smoke, create a fresh disposable isolated test DB/admin fixture via documented bootstrap, transfer credentials only through an approved concealed input, and verify the real login flow; if secure handoff is unavailable, stop and mark evidence BLOCKED. Never use chat/shell arguments/environment/logs, bypass bootstrap/auth, or count synthetic sessions as login; clean up only that disposable fixture/DB and preserve unrelated test data.
