# Phase 4A SEO and accessibility

This phase covers crawler-facing metadata, structured data, sitemap/robots, and public-page accessibility. It does not complete Phase 4 performance or deployment readiness.

## SEO behavior

- `PUBLIC_SITE_URL` must be a clean HTTPS origin in production, without credentials, path, query, or fragment. Production canonical and sitemap URLs use this explicit value; request `Host` and forwarded headers are not trusted as the site origin.
- Local development and test can infer the origin only from a loopback host. Set `PUBLIC_SITE_URL` explicitly for CI and deployments.
- Canonical URLs remove query and fragment components. CMS metadata is localized and takes precedence when present; page copy is the fallback.
- Draft and future-published Blog/Lab records are omitted from `/sitemap.xml`. The sitemap includes public static routes and currently published Blog/Lab detail routes only.
- `/robots.txt` disallows `/admin` and `/api/` and points to the configured sitemap. API responses and admin HTML send `X-Robots-Tag: noindex, nofollow`; not-found pages are also noindex.
- JSON-LD is built only from verified site identity fields and published page content. It is serialized as JSON and escapes HTML-significant characters before insertion.

## Verification

Run `npm run test:seo-a11y` with `TEST_DATABASE_URL` pointing only to a dedicated database whose name ends in `_test`. The runner requires the production build to exist and verifies that the CMS tables are empty before seeding; it refuses to touch any pre-existing rows. It starts the SSR server on loopback, then clears only its own synthetic fixtures and removes the temporary upload directory on exit. The server integration tests also leave their isolated test database empty. The browser audit saves axe reports and Playwright failure evidence under the ignored `test-results/` directory.

The browser checks cover SSR metadata on public route types, localized CMS overrides, canonical URL normalization, BlogPosting JSON-LD safety, robots/sitemap exclusions, public-route axe checks in Turkish and English, keyboard skip navigation, reduced motion, and 320 px reflow. Critical and serious axe violations fail the audit; all reported violations are recorded for review.

## Carried-forward acceptance gates

- Mobile Lighthouse TBT remains a hard acceptance limit of 200 ms and is **NOT MET** on the previously measured Phase 4 candidates. This Phase 4A audit does not weaken, waive, or substitute for that gate; see Issue #15.
- Deployment remains blocked until the target host's persistent upload volume and combined PostgreSQL/file backup-and-restore path are verified.
- Phase 3 real admin UI smoke remains separately blocked as recorded in Issue #13.
