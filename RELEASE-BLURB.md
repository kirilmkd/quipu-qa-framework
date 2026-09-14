Quipu QA Framework — Release Blurb

Short description
- A multi-region Playwright + TypeScript test framework for API and Web layers, using the ParaBank public demo as the target.

What's included
- API and Web test suites under `tests/` covering happy paths, error states, and idempotency/edge-cases.
- Shared utilities in `src/` (`ApiClient`, `regionConfig`, test helpers).
- Per-region configuration under `config/regions/` with `REGION` env var support.
- CI workflow `.github/workflows/ci.yml` to run API and Web jobs independently or together.

How to run (quick)
1. Install deps: `npm ci`
2. Install Playwright browsers: `npx playwright install --with-deps`
3. Run all tests: `npx playwright test`

Notes
- Tests run against the public ParaBank demo. Some destructive/admin APIs are not available on the public instance; see README.md for cleanup caveats.
- For CI or review, prefer a private GitHub repo so reviewers can run CI and see history.

Contact
- For questions or to run against a private sandbox URL, provide the target base URLs and credentials and I can add a CI job to point at that environment.
