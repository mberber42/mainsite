# Phase 1 baseline

The repository was empty at task start: there were no commits, no remote branches, and zero tracked files. Consequently, there was no existing product build or test command to run. The Angular 22 SSR starter was generated and dependencies were installed before any portfolio-specific product code was added; these results are the recorded baseline for this skeleton.

Environment: Node.js 24.19.0, npm 11.17.0, Angular CLI 22.2.1.

| Command                     | Result                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------ |
| `./scripts/agent-setup.sh`  | Exit 0; dependencies installed; npm audit reported 0 vulnerabilities.                |
| `npm run build`             | Exit 0; production browser and server bundles generated; 1 static route prerendered. |
| `npm test -- --watch=false` | Exit 0; 1 test file passed, 2 tests passed.                                          |

After this baseline, the locale-switch test was written first and confirmed to fail against the unmodified starter (2 expected failures). The implementation then added the tested locale behavior.
