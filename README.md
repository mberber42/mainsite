# Mustafa BERBER — Portfolio

A responsive Turkish/English portfolio foundation for Mustafa BERBER, Full Stack Developer. Built with Angular 22 standalone components, Signals for locale state, and Tailwind CSS 4. The home page is intentionally limited to verified identity details and clearly marked content placeholders; no work history, project results, contact details, or social accounts are invented.

## Setup and development

Use Node.js 22.12+ or 24.13+ and npm. From the repository root, install dependencies with:

```bash
./scripts/agent-setup.sh
```

Start the local development server with Angular’s SSR-aware dev server:

```bash
npm start
```

Then open `http://localhost:4200/`.

## Rendering choice

The home page uses **static site generation (SSG) / prerendering** through Angular’s integrated SSR tooling. The root route is rendered at build time, so the initial HTML already contains the home-page copy for crawlers and users who load the page without waiting for client-side rendering. Angular also emits its server bundle as part of the configured server output; the current Phase 1 public route is prerendered.

Build for production with:

```bash
npm run build
```

The static browser output and server bundle are written under `dist/mainsite/`. To run the generated Node server after building:

```bash
npm run serve:ssr:mainsite
```

The domain value `https://portfolio.alanadi.com` is stored only as an illustrative, replaceable value in `src/app/content/home-content.ts`; it is not treated as a real production domain.

## Quality checks

```bash
npm test
npm run lint
npm run format:check
npm run build
```

Tests run with Vitest through Angular CLI. The locale test switches between Turkish and English and checks both visible home-page copy and the document’s `lang` attribute. ESLint checks TypeScript and Angular templates; Prettier provides the format check.

## Content and styling

All Phase 1 home-page copy, preview cards, and social profile slots are in `src/app/content/home-content.ts`. Replace placeholder entries there only with content Mustafa has supplied or verified. Social profiles are non-clickable until real URLs are added. Navigation cards point to routes reserved for Phase 2; their destination pages are not implemented in this phase.

Design tokens and reusable shared styles for buttons, cards, future form fields (`.form-field*`), spacing, focus treatment, and responsive layout live in `src/styles.css`. The locale state is managed by `src/app/i18n/locale.service.ts` with an Angular Signal; selecting a language updates the page copy and `<html lang>`. Reduced-motion preferences are respected.

See [AGENTS.md](AGENTS.md), [docs/frontend.md](docs/frontend.md), and [docs/roadmap.md](docs/roadmap.md) for contributor guidance and phase boundaries. The initial empty-repository baseline is recorded in [docs/phase-1-baseline.md](docs/phase-1-baseline.md).
