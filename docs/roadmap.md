# Phase roadmap

Only the currently approved task card should be implemented at a time. See the linked issue for phase acceptance evidence.

## Phase 1 — Foundation and bilingual home page

- Establish Angular 22+, standalone components, Tailwind, design tokens, accessibility defaults, and prerendering for `/`.
- Deliver the responsive Turkish/English home page shell with navigation, language switcher, hero, calls to action, placeholders, previews, social slots, and footer.
- Keep unverified personal content explicit and centralized. Baseline evidence: [docs/phase-1-baseline.md](phase-1-baseline.md).

## Phase 2 — Public content routes (issue #10)

- Deliver `/hakkimda`, `/hizmetler`, `/blog`, `/blog/:slug`, `/lab`, `/lab/:slug`, `/iletisim`, and an accessible bilingual 404.
- Preserve truthful placeholders for unverified profile/service information and typed local fallback content for Blog/Lab.
- The Phase 2 contact form performed validation only. Phase 3 supersedes that boundary by sending messages to the same-origin API and persistent admin inbox.
- Preserve home prerendering and server-render public detail routes.

## Phase 3 — Secure Admin/CMS (issue #13)

- Approved architecture: same-origin self-hosted Node API, local PostgreSQL, PostgreSQL-backed server sessions, and persistent local file storage. **No Supabase.**
- Deliver one-time interactive admin bootstrap, server-side auth/CSRF, dashboard, content CRUD, message inbox, file/CV management, public publication integration, Markdown rendering, and SEO metadata.
- CI and local tests use a dedicated `_test` PostgreSQL database. No production data, secrets, merge, or deployment are part of this task.
- Deployment remains blocked until a target host’s persistent volume and database/file backup/restore path are verified; see [docs/cms.md](cms.md).

## Deferred unless separately approved

- Deployment or production data/auth migration, public signup or additional admin roles, multi-tenant access, invitation/SSO, revision history, email notifications, third-party provider integration, and changes to the public hosting origin.
