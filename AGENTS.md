# Agent guidance

## Before making changes

1. Read this file and the relevant `docs/<area>.md` guide. For frontend work, read `docs/frontend.md`; use `docs/roadmap.md` to preserve phase boundaries.
2. Run `scripts/agent-setup.sh` from the repository root.
3. Record the current build and test baseline before changing product code. If the repository has no runnable project yet, state that baseline explicitly rather than inventing results.
4. At task start and each status update, identify the active worker by name and role, distinguish the worker from the assignee, and include the working branch and PR link when available.

## Project constraints

- This is an Angular 22+ application using standalone components, Signals where state is reactive, and Tailwind CSS.
- The public home page is prerendered with Angular SSR/SSG support. Keep crawler-visible copy in the initial rendered HTML.
- Site identity is Mustafa BERBER, Full Stack Developer, with Turkish (`tr`) and English (`en`) locales.
- Never invent personal history, client work, project outcomes, references, metrics, dates, contact details, or social profiles. Keep replaceable sample content explicit and centralized in the home content data module.
- Treat `portfolio.alanadi.com` as an illustrative example, not a live domain. Do not hard-code it as a production origin.
- Do not implement out-of-scope routes, admin/CMS, form submission, deployment, or full SEO work in Phase 1.

## Quality and accessibility

- Add or update automated tests for behavior changes, especially locale switching.
- Keep keyboard focus visible, use semantic HTML and accessible names, and honor `prefers-reduced-motion`.
- Before opening a PR, run `npm run lint`, `npm test`, `npm run format:check`, and `npm run build`; include actual output and any limitations in the PR description.
- Include desktop and mobile screenshots in both supported languages when a browser is available.
- Do not push to `main`/`release`, merge, or deploy.
