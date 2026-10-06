# Framework references

The following official references informed the Phase 1 framework and rendering choices:

- [Angular v22 release](https://angular.dev/events/v22) confirms Angular v22 as the selected major release.
- [Angular server and hybrid rendering guide](https://angular.dev/guide/ssr) describes the CLI `--ssr` setup and static prerendering. Angular's prerender mode emits static HTML at build time; Phase 1 uses `RenderMode.Prerender` for the root route so crawlers receive the home-page content in the initial HTML.
- [Angular Tailwind guide](https://angular.dev/guide/tailwind) recommends the `ng add tailwindcss` integration. That CLI integration added Tailwind CSS, its PostCSS plugin, `.postcssrc.json`, and the global `@import 'tailwindcss'` entry used by this repository.
