# Frontend guide

## Architecture

- Use standalone Angular components and keep the root shell small. Split the sticky site header, language control, content sections, reusable buttons/cards, and footer into focused components when their responsibilities are distinct.
- Keep locale state in a small injectable service backed by an Angular `signal`. The selected locale should be exposed read-only; all home-page copy and placeholder content should come from one typed source-of-truth module so it can be reviewed and replaced without hunting through templates.
- Use semantic `<header>`, `<nav>`, `<main>`, `<section>`, and `<footer>` landmarks. Provide a single page-level `<h1>` and a logical heading order.
- The current phase implements only `/`. Links to later routes may be clearly marked placeholders; do not fill in the later pages as part of Phase 1.

## Styling and design tokens

- Tailwind CSS is installed through the Angular integration documented at [angular.dev/guide/tailwind](https://angular.dev/guide/tailwind).
- Define global colors, type, spacing, radii, shadows, and motion tokens in `src/styles.css`; reuse component classes instead of copying one-off styling.
- Dark mode is the default. Maintain readable contrast, responsive layouts, and visible `:focus-visible` styles.
- Disable or shorten non-essential transitions under `@media (prefers-reduced-motion: reduce)`.
- Reusable primitives include `.button`, `.surface-card`, and `.form-field*` label/control/hint/error styles. Contact-form behavior and submission remain out of Phase 1.

## Localization

- Support `tr` and `en` on the home page, header, footer, calls to action, placeholder cards, and accessibility labels.
- The language control is a native, keyboard-operable button group or equivalent with the active language clearly indicated. Update the document `lang` attribute when the locale changes.
- Tests should exercise the user-visible switch and verify key content in both languages.

## Content integrity

- Store identity, navigation, calls to action, preview cards, availability label, social labels/URLs, and site URL configuration centrally.
- Use explicit “example / placeholder” labels for any unverified project, post, social profile, or availability details. Do not imply that placeholder links are real accounts.
- The illustrative `portfolio.alanadi.com` value belongs in configuration only, with a comment that it must be replaced before release.

## Rendering and commands

- Keep `/` prerendered so the initial HTML contains the page copy. Angular SSR/SSG setup and development/build commands are documented in the root `README.md`.
- Verify production output with `npm run build`; verify behavior with `npm test`; use `npm run lint` and `npm run format:check` before submitting.
