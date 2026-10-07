# Mustafa BERBER — Portfolio

A responsive Turkish/English portfolio for Mustafa BERBER, Full Stack Developer. Built with Angular 22 standalone components, Signals for locale state, Tailwind CSS 4, and Angular SSR. Personal history, work claims, links, and contact details are shown only when supplied and verified; missing information remains an explicit placeholder or an empty state.

## Setup and development

Use Node.js 22.12+ or 24.13+ and npm. Install the locked dependencies with:

```bash
npm ci
```

The repository setup script also checks the supported Node version before installing dependencies:

```bash
./scripts/agent-setup.sh
```

Start Angular's SSR-aware development server with:

```bash
npm start
```

Then open `http://localhost:4200/`. The server supports direct URL loads for all application routes.

For SSR host validation, the local build allowlist contains only `localhost` and `127.0.0.1`. When a real deployment hostname is chosen, add it to the server's comma-separated `NG_ALLOWED_HOSTS` environment variable. Do not use `*`; no production domain has been supplied or hard-coded in this phase.

## Public routes

- `/` — bilingual home page
- `/hakkimda` — profile, experience, expertise, CV, and social-link areas
- `/hizmetler` — service cards, working-process placeholders, FAQ empty state, and contact CTA
- `/blog` and `/blog/:slug` — local typed article list and detail
- `/lab` and `/lab/:slug` — local typed project list and detail
- `/iletisim` — accessible client-side validation form; it does not submit
- Any unknown route or missing blog/Lab slug — bilingual 404 state

The shared header and footer route to the public sections. The Turkish/English switcher keeps the current route, updates visible copy, and updates `<html lang>`.

## Content and localization

Content is local, typed, and centrally editable:

- `src/app/content/home-content.ts` holds verified site identity, home-page copy, shared navigation, and existing home preview placeholders.
- `src/app/content/public-content.ts` holds bilingual page copy, profile fields, service/process placeholders, and the typed `BLOG_POSTS` and `LAB_PROJECTS` data sources.
- Add real article records to `BLOG_POSTS` or real project records to `LAB_PROJECTS` in that module. Each uses a stable `slug`, localized title/summary/body fields, and optional category, tags, date, cover, reading-time, or project-link fields. Optional metadata is rendered only when supplied. Empty arrays intentionally produce bilingual empty states.
- `PROFILE_CONTENT` contains the biography placeholder, experience and expertise arrays, CV URL, and social-link slots. `SERVICE_PLACEHOLDERS` and `SERVICE_PROCESS_PLACEHOLDERS` make unverified content visibly replaceable without implying actual services, prices, terms, or availability.

Only replace placeholders with information Mustafa supplies or verifies. A missing CV or social/project URL is not rendered as a working link. `https://portfolio.alanadi.com` remains an illustrative value in `src/app/content/home-content.ts`, not a production origin.

## Contact-form boundary

The contact page checks required name/message fields and email format in the browser. Even when the fields are valid, the confirmation explicitly says the message was **not sent or transmitted**. The form makes no network request and stores no message. Do not add persistence, email delivery, or external integration in this phase.

## Rendering and direct URL behavior

Angular's route table is in `src/app/app.routes.ts`; server render modes are in `src/app/app.routes.server.ts`. The home route (`/`) remains prerendered at build time so its copy is present in the initial HTML. The public content routes and the 404 fallback use Angular server rendering, including parameterized blog/Lab details. As a result, direct links work through the configured Angular SSR server; a static-file-only host without the server bundle will not dynamically render those routes.

Build and run the generated Node server with:

```bash
npm run build
npm run serve:ssr:mainsite
```

The build writes browser and server bundles under `dist/mainsite/`. The home route is emitted as static HTML; server-rendered routes are handled by the generated server rather than individually prerendered. Missing slugs and unknown routes render the accessible 404 state and return HTTP 404 during server rendering.

## Quality checks

```bash
npm ci
npm run lint
npm test
npm run format:check
npm run build
```

Tests cover route families, bilingual content and `<html lang>` updates, locale changes without leaving the current route, empty blog/Lab lists, missing-slug and unknown-route states, accessible form errors, and the no-network/no-persistence contact-form boundary. The interface uses semantic landmarks, one page-level `<h1>`, keyboard-operable links and controls, visible focus styles, responsive layouts, and `prefers-reduced-motion` support.

See [AGENTS.md](AGENTS.md), [docs/frontend.md](docs/frontend.md), and [docs/roadmap.md](docs/roadmap.md) for contributor guidance and phase boundaries. Phase 1 baseline evidence is in [docs/phase-1-baseline.md](docs/phase-1-baseline.md).
