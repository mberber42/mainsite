# Frontend guide

## Architecture

- Use standalone Angular components; keep the root shell small. Public route components live under `src/app/pages/`, and the lazy-loaded admin area under `src/app/admin/`.
- Public routes and SSR/prerender modes are declared in `src/app/app.routes.ts` and `src/app/app.routes.server.ts`. Keep `/` prerendered and content routes server-rendered. The same-origin Node API is integrated before Angular SSR in `src/server.ts`.
- The public content client is `src/app/cms/cms-api.service.ts`. Blog, Lab, services, FAQs, testimonials, social links, hero, CV, and SEO records come from the PostgreSQL API; static content is only a fallback for explicitly maintained Phase 2 data.
- The admin UI calls the same-origin API and never connects directly to PostgreSQL. All authorization is enforced by the server, not by the client-side route guard.
- Keep locale state in the root `LocaleService` Signal. Public page copy remains in typed modules under `src/app/content/`.

## Styling, semantics, and accessibility

- Global design tokens live in `src/styles.css`; shared public page styles are in `src/app/pages/pages.css`, and admin styles are in `src/app/admin/admin.css`.
- Maintain readable contrast, semantic landmarks, a single page-level `<h1>`, keyboard-operable links/controls, visible `:focus-visible` styles, and mobile layouts without horizontal overflow.
- Support `prefers-reduced-motion`. Give form controls explicit labels, error descriptions, status announcements, and disabled/loading states.
- The admin shell hides public navigation/footer and keeps a separate skip-to-main landmark. Use RouterLink for internal navigation.

## Localization, security, and content

- Support Turkish (`tr`) and English (`en`) across public routes, empty/error states, form messages, navigation, and accessibility names. `LocaleService` updates `<html lang>` without changing the URL.
- Do not invent personal history, work claims, service terms, or URLs. Missing CV/social/project links remain absent or explicit placeholders.
- Markdown source is passed through `marked`, then bound through Angular’s normal `[innerHTML]` sanitizer. Never call `bypassSecurityTrustHtml` for CMS content or insert untrusted content into the DOM manually.
- The contact form submits only to same-origin `/api/public/contact`; the API validates and stores the message in PostgreSQL for the admin inbox. Do not send messages to email/third parties in this phase.
- Session cookies, CSRF, API authorization, slug uniqueness, publication timestamps, file type/size checks, and persistent-storage rules belong to the Node API. Frontend guards are a usability layer, not a security boundary.

## Verification

Before submitting, run `npm run lint`, `npm test` (with a dedicated local PostgreSQL database ending `_test`), `npm run format:check`, and `npm run build`. Do not point tests or development work at production data.
