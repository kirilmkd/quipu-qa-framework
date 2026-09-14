# Quipu QA Framework — Simple Explanation for Reviewers

This file explains what I built, why, and how to run and review it. It's written assuming little or no developer experience.

1) Short summary
- What: A small automated test framework that checks a public demo banking website (ParaBank) both at the web UI level and at the API (backend) level.
- Why: To show you how tests can be structured so they are reusable across regions and layers (API and UI), and to demonstrate test design choices (happy path, error states, idempotency, and data isolation).

2) High-level picture (no code knowledge required)
- The project contains two kinds of tests:
  - API tests: talk directly to the website's backend and check responses.
  - Web tests: use a browser (automated) to click and check things on the website.
- Both sets of tests use the same shared settings (like which region or website to test). That shared setup is what makes it easy to switch regions without changing the tests themselves.

3) What I did (plain list)
- Created code that loads region-specific settings (URLs, username/password). These settings live in `config/regions/`.
- Built an `ApiClient` that sends requests to the website's API for reuse in tests.
- Wrote API tests that:
  - Check a normal account lookup (happy path) and validate response structure.
  - Send an intentionally bad request to confirm the site returns an error (error-state test).
  - Confirm that repeated reads return the same result (idempotency test).
  - Create a temporary test customer and show basic cleanup/verification behavior (isolation test).
- Wrote Web tests that:
  - Log into the website and verify information from the API appears in the UI.
  - Attempt a bad login to verify the UI shows the expected error.
  - Test a double-submit transfer scenario to see how the UI/API handle duplicate actions.
- Made a small helper that tries to create test accounts via the API and, if that fails, attempts to register via the website automatically. It also attempts to delete accounts when a delete endpoint exists (best-effort).
- Added a GitHub Actions workflow so CI can run API tests and Web tests independently or together.

4) Important limitations you should know (non-technical)
- The tests run against the public ParaBank demo site. That site is intended for demos and does not provide admin APIs to delete created test data. That means:
  - When a test registers a new customer, that customer may remain on the demo site indefinitely until the demo service resets data on its own schedule.
  - Cleanup is best-effort: the framework tries to call a delete API, but that endpoint usually does not exist for ParaBank.
  - To avoid problems we create uniquely-named test accounts (so tests don't clash with each other or with real users), and tests are written to tolerate the cleanup limitation.

5) Where things live (simple map)
- `README.md` — project overview and instructions.
- `EXPLANATION_FOR_REVIEWERS.md` — this file.
- `RELEASE-BLURB.md` — short summary for releases.
- `src/` — shared helpers used by tests (API client, region loader, test utilities).
- `config/regions/` — JSON files with region-specific settings (URLs, credentials).
- `tests/api/` — API tests.
- `tests/web/` — Playwright web tests (browser-driven).
- `.github/workflows/ci.yml` — CI jobs run on GitHub Actions.

6) How to run the tests locally (step-by-step, copy/paste)
Note: these are the exact commands tested on Windows PowerShell.

Install dependencies and Playwright browsers (one-time):
```powershell
npm ci
npx playwright install --with-deps
```

Run the full test suite:
```powershell
npx playwright test
```

Run just the API tests:
```powershell
npx playwright test tests/api --reporter=list
```

Run just the Web tests:
```powershell
npx playwright test tests/web --reporter=list
```

If PowerShell blocks `npm`, use the temporary bypass (one-time for the session):
```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force
npm ci
```

7) How reviewers can switch regions
- The project reads settings from `config/regions/`. By default it uses `us`.
- To run tests for another region, set the `REGION` environment variable before running tests. Example (PowerShell):
```powershell
$env:REGION = 'eu'
npx playwright test
```

8) What to check in the repo (quick checklist for reviewers)
- Open the repository on GitHub (you already shared the link). Check `.github/workflows/ci.yml` to see how CI is configured.
- See `tests/` to review what scenarios are covered (happy path, error path, idempotency, isolation, web/API integration).
- If you'd like to run the tests locally, follow the install commands in section 6.

9) If something fails during review — likely causes and remedies (plain)
- Authentication or `npm` blocked by PowerShell: follow the PowerShell bypass command above or run `npm.cmd ci` instead.
- Browser tests (Playwright) need the Playwright browsers installed — re-run `npx playwright install --with-deps`.
- If a test creates data and you see leftover accounts on the demo site: this is expected with the public demo. It is not a test bug — we used unique names to avoid collisions.

10) Next steps (optional additions you might ask for)
- If you can provide a private test environment (sandbox) with admin APIs, I can change the config to point at it and add robust cleanup so nothing persists.
- I can add more negative tests, concurrency tests, or extend CI to run on different schedules or browsers.

If you want, I can also prepare a short 1-page PDF summary you can attach to your submission email.

Thank you — if anything in this file needs rewording or expansion for a non-technical audience, tell me what to emphasize and I'll update it.
