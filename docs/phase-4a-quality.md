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

Run `npm run test:seo-a11y` with `TEST_DATABASE_URL` pointing only to a dedicated database whose name ends in `_test`. The runner builds the production artifact using the reserved HTTPS `.invalid` audit origin, verifies that the CMS tables are empty before seeding, and refuses to touch any pre-existing rows. It starts the SSR server on loopback, then clears only its own synthetic fixtures and removes the temporary upload directory on exit. The server integration tests also leave their isolated test database empty. Phase 4 and Phase 4A use separate Playwright configurations and retain their own reports under the ignored `test-results/` directory.

The browser checks cover route metadata from script-disabled initial HTML on the prerendered home, About, Blog, and Lab detail routes; Turkish and English CMS SEO overrides for Blog and Lab; canonical URL normalization; BlogPosting/CreativeWork JSON-LD safety; robots/sitemap exclusions; and public-route axe checks in Turkish and English. Keyboard checks verify the skip link, visible focus on header and form controls, invalid contact fields' `aria-describedby` references to both hint and error text in Turkish and English, and that invalid submission sends no request. Reduced motion and 320 px reflow are also checked. Critical and serious axe violations fail the audit; all reported violations are recorded for review.

The no-JavaScript home assertion records the current prerendered fallback metadata. Request-time CMS SEO overrides cannot enter that build-time HTML, so the home CMS override finding remains open for the owner's prerender-versus-request-time-SSR decision; this fallback test does not count that finding as resolved.

## Carried-forward acceptance gates

- Mobile Lighthouse TBT remains a hard acceptance limit of 200 ms and is **NOT MET**; this Phase 4A audit does not weaken, waive, or substitute for that gate; see Issue #15. A local single-run `npm run test:quality` check during the Phase 4A/main reconciliation measured home mobile TBT 448 ms, Blog mobile 385 ms, and desktop 421 ms (desktop performance 67); these diagnostic values are not a matched acceptance benchmark, but the unchanged hard gate failed.
- CI names the Phase 4A static/SEO/a11y suite `Phase 4A scoped CI` and keeps `Phase 4 performance (hard TBT 200 ms)` as a separate, unchanged job. A passing scoped job permits only the #17 SEO/accessibility review gate; it does not imply overall CI/workflow success while performance remains red.
- Deployment remains blocked until the target host's persistent upload volume and combined PostgreSQL/file backup-and-restore path are verified.
- Phase 3 real admin UI smoke remains separately blocked as recorded in Issue #13.
