# Phase roadmap

This repository starts empty, so phases are separate implementation increments. Only the current approved task card should be implemented at a time.

## Phase 1 — Foundation and bilingual home page

- Establish Angular 22+, standalone components, Tailwind, design tokens, accessibility defaults, and prerendering for `/`.
- Deliver the responsive Turkish/English home page shell: header and language switcher, hero and calls to action, availability placeholder, navigation cards, project/post previews, social placeholders, and footer.
- Keep unverified personal content explicitly marked and centralized. This is the scope of the current task card.

## Phase 2 — Public content routes (issue #10)

- Deliver `/hakkimda`, `/hizmetler`, `/blog`, `/blog/:slug`, `/lab`, `/lab/:slug`, `/iletisim`, and an accessible bilingual 404 state as one coherent phase.
- Keep profile and service details centrally editable and explicitly placeholder-only until verified. Blog and Lab use typed local data sources and translated empty states; no CMS or remote content service is introduced.
- The contact form performs accessible client-side validation only. Sending, network requests, persistence, and notifications remain out of scope.
- Preserve home-page prerendering and server-render the public content routes and 404 fallback for direct URL access.

## Deferred unless separately approved

Admin/authentication, CMS or CRUD, API/database, contact-form submission, spam handling/notifications, full SEO metadata/sitemap/robots/JSON-LD, performance-budget hardening, deployment, and a separate portfolio subdomain are outside the Phase 1 task card.
