# Frontend guide

## Architecture

- Use standalone Angular components and keep the root shell small. The root shell owns the skip link, shared header/footer, and one `<main>` containing the router outlet. Public route components live under `src/app/pages/`.
- Define the public route table in `src/app/app.routes.ts` and its Angular SSR/prerender modes in `src/app/app.routes.server.ts`. Keep the home route prerendered and public content routes server-rendered so direct URLs and parameterized detail routes work.
- Keep locale state in the root `LocaleService` Signal. Page copy and replaceable profile/service/blog/Lab content come from typed modules under `src/app/content/`, not duplicated in templates. Use RouterLink for internal navigation so locale selection survives route changes.
- Use semantic `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, and `<footer>` landmarks. Each routed page has one page-level `<h1>` and a logical heading order.

## Styling and design tokens

- Tailwind CSS is installed through the Angular integration documented at [angular.dev/guide/tailwind](https://angular.dev/guide/tailwind).
- Define global colors, type, spacing, radii, shadows, and motion tokens in `src/styles.css`. Shared route-page layouts and responsive styles live in `src/app/pages/pages.css`.
- Dark mode is the default. Maintain readable contrast, responsive layouts, and visible `:focus-visible` styles.
- Disable or shorten non-essential transitions under `@media (prefers-reduced-motion: reduce)`.
- Reusable primitives include `.button`, `.surface-card`, and `.form-field*` label/control/hint/error styles. Contact-form validation remains client-side only; do not submit or persist form values.

## Localization and content

- Support Turkish (`tr`) and English (`en`) across every public route, empty/error state, form message, navigation label, and accessibility name. Localized page copy is centralized in `src/app/content/public-content.ts`; home and shared navigation copy remains in `home-content.ts`.
- Keep language controls keyboard-operable and clearly indicate the active language. `LocaleService` updates the document `lang` attribute; RouterLink navigation does not reset the selected locale.
- Keep profile, service, post, project, CV, and social data explicit and replaceable. Do not invent personal history, client work, results, availability, price/terms, or contact/social URLs. Empty blog/Lab arrays must remain valid and show translated empty states.
- Optional content fields—such as date, category, tags, cover image, reading time, and project links—must be omitted from the UI when absent. Only a verified URL may be rendered as a link.

## Rendering and commands

- Keep `/` prerendered so crawler-visible home copy is in initial HTML. Public content routes and the wildcard 404 use `RenderMode.Server`; preserve the generated server bundle for direct-route requests. Static hosting without the SSR server does not provide these dynamic route responses.
- SSR host validation is enabled. Local development permits `localhost` and `127.0.0.1`; a real deployment hostname must be configured in the server environment through `NG_ALLOWED_HOSTS`. Do not use the wildcard host entry to bypass validation.
- Verify production output with `npm run build`; verify behavior with `npm test`; run `npm run lint` and `npm run format:check` before submitting.
