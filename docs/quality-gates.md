# SEO, performance, accessibility, and deployment gates

This document defines repeatable checks for the public site and the deployment prerequisites that must be met before any production release. Passing CI is not a deployment approval.

## Search and social metadata

- Set `PUBLIC_SITE_URL` to the exact HTTPS origin (scheme and host only) in both the build and runtime environments. Do not include credentials, a path, query string, or fragment. A production build without this value must not be treated as release-ready.
- Public pages emit a localized title and description, canonical URL, Open Graph title/description/type/site name/locale/image, and Twitter card/title/description/image. CMS-provided canonical and image URLs are accepted only as HTTP(S) URLs; generated canonicals omit query strings and fragments.
- Blog details emit `BlogPosting` JSON-LD; other public pages emit `WebSite` and verified `Person` graph nodes. Lab details additionally emit `CreativeWork`. JSON-LD is serialized as text and escapes markup-significant characters.
- `/sitemap.xml` contains public static routes and only published, currently available blog/Lab content. Draft, future-dated, admin, and API routes are excluded. `/robots.txt` points to the sitemap and disallows admin/API paths. Admin HTML and API responses use `X-Robots-Tag: noindex, nofollow`; missing routes and missing content use a `noindex` meta tag.
- A configured production `PUBLIC_SITE_URL` must be HTTPS. Development/test requests may derive their origin from the request when no value is configured.

## Performance budgets

Production CI enforces the following budgets:

| Check                          |           Budget |
| ------------------------------ | ---------------: |
| Angular initial bundle warning |           420 kB |
| Angular initial bundle error   |           450 kB |
| Initial JavaScript, gzip       |          145 KiB |
| Initial CSS, gzip              |           16 KiB |
| Initial JavaScript + CSS, gzip |          160 KiB |
| Lighthouse mobile LCP          | 2,500 ms maximum |
| Lighthouse mobile TBT          |   200 ms maximum |
| Lighthouse CLS                 |     0.10 maximum |

The production Express server gzip-compresses text responses, including SSR HTML, static JavaScript/CSS, and CMS JSON when the client advertises gzip support. A gzip estimate from build files does not prove wire compression; verify `Content-Encoding: gzip` on a production JavaScript or CSS response.

Lighthouse runs against the home page on mobile and desktop and the blog index on mobile. Minimum category scores per run are Performance 85, Accessibility 95, Best Practices 90, and SEO 95. These are regression gates, not an assertion that every user's field data will match lab results.

Run `npm run check:performance-budget` after a production build. `npm run test:quality` runs the browser tests and Lighthouse checks. CI retains the axe JSON, Playwright results/screenshots (on failure), and Lighthouse JSON/HTML as run artifacts.

## Accessibility audit

`e2e/accessibility.spec.mjs` runs axe-core against all public route families in Turkish and English, including populated blog/Lab detail views and not-found states, plus admin login, dashboard, content editor, inbox, and files screens using a synthetic account in the isolated test database. Axe checks WCAG 2.0/2.1/2.2 A and AA and best-practice rules. The suite also checks the keyboard skip link, `prefers-reduced-motion`, and 320 px reflow.

The browser suite is an automated audit, not a substitute for assistive-technology user testing or an authenticated smoke test against a production admin account. The Phase 3 issue #13 remains blocked on its separately authorized real-admin UI smoke; no result from this synthetic test changes that status.

## Deployment and restore readiness

Do not deploy until Mustafa has identified and verified the actual target host and a durable file volume, and a coordinated PostgreSQL **and** uploaded-file backup/restore has succeeded in an isolated target-like environment. This phase does not select a host, create infrastructure, migrate production data, or deploy.

Before a future release, document and verify all of the following:

1. `PUBLIC_SITE_URL` is the final HTTPS origin and is supplied at build and runtime.
2. `DATABASE_URL` points to the intended PostgreSQL instance and migrations are applied.
3. `UPLOAD_DIR` resolves to the mounted persistent volume, is owner-only, and is not a temporary filesystem. The application must be able to read/write it after restart.
4. `SESSION_SECRET` is a strong, independently managed secret; configure `TRUST_PROXY=1` only when the verified host's proxy topology requires it.
5. Take a database backup and a file-volume snapshot for the same restore point. Record their checksums and timestamps without exposing credentials or file contents.
6. Restore both artifacts to an isolated staging database and fresh volume. Apply/verify schema migrations; verify that file IDs and keys resolve to the restored bytes, that public image/CV paths work, and that the admin can safely reference restored content.
7. Record the restore result and target details in the deployment issue before asking the owner to decide whether to deploy.

A green CI run only proves the repository checks against the dedicated test database. It does not prove the target host, durable storage, production backups, restore, or deployment.
