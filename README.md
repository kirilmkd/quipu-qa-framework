# Quipu QA Framework

## Overview

This repository is a multi-region Playwright + TypeScript test framework built for the Quipu QA Challenge. It demonstrates a modular structure where API and Web layers are independently runnable but share configuration and utilities.

Chosen application: ParaBank demo site (web UI + REST API) hosted at https://parabank.parasoft.com/parabank. ParaBank is suitable because it models banking flows; note that it may contain intentional defects or periodic data resets — any such behaviors are called out in test failure contexts.

Key goals covered:
- API and Web layers runnable independently but sharing `src` utilities.
- Region switching via configuration files under `config/regions/*.json` without changing test code.
- Happy path, error state, and schema/edge-case checks (API tests include schema validation via `ajv`).
- At least one Web test reuses an API call for setup/verification.
- CI workflow to run API and Web layers independently or together.

## Repository Layout

- `src/` — shared helpers and clients (e.g., `apiClient.ts`, `regionConfig.ts`).
- `config/regions/*.json` — per-region configuration (base URLs, credentials, locale, currency).
- `tests/api/` — API tests (use `ApiClient`).
- `tests/web/` — Playwright web tests.
- `.github/workflows/ci.yml` — CI workflow with `api-tests` and `web-tests` jobs.

## Prerequisites

- Node.js 18+ installed
- Git

On Windows PowerShell you may need to allow script execution or use `npm.cmd` if you encounter an execution policy error.

## Install dependencies

Install packages and Playwright browsers:

```bash
npm ci
npx playwright install --with-deps
```

If PowerShell blocks `npm`, either run:

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force
npm ci
```

or run the shim:

```powershell
npm.cmd ci
```

## Region configuration

Regions are configured under `config/regions/`. Default region is `us`. To change region at runtime set the `REGION` environment variable.

Linux / macOS:

```bash
REGION=eu npx playwright test
```

PowerShell:

```powershell
$env:REGION = 'eu'
npx playwright test
```

## Running tests locally

Run all tests:

```bash
npx playwright test
```

Run only API tests:

```bash
npx playwright test tests/api --reporter=list
```

Run only Web tests:

```bash
npx playwright test tests/web --reporter=list
```

Run a single test file:

```bash
npx playwright test tests/web/login.spec.ts
```

## Test design notes

- `src/regionConfig.ts` loads region JSON and exports a config object; tests import that to obtain `apiBaseUrl`, `webBaseUrl`, and credentials.
- `ApiClient` encapsulates HTTP calls via `axios` and is reused by both API tests and Web tests for setup/verification.
- API tests use `ajv` for schema validation (see `tests/api/accounts.spec.ts`).
- Web tests are Playwright-based and include at least one test that verifies data produced/validated by the API layer (see `tests/web/login.spec.ts`).

## Tests: what, why, how

This project contains a small suite of API and Web tests. Below is a concise list of the test files, what each verifies, why it's included, and how it performs the check.

- [tests/api/accounts.spec.ts](tests/api/accounts.spec.ts#L1-L40)
	- What: API happy-path for account retrieval (`GET /accounts/:id`) with schema validation.
	- Why: Confirms the API returns expected structure and types for a normal account lookup (happy path).
	- How: Uses `ApiClient.getAccount()` to fetch account data, asserts `status === 200`, validates the response body with `ajv` against a small JSON schema, and checks the `balance` is numeric.

- [tests/api/error_and_idempotency.spec.ts](tests/api/error_and_idempotency.spec.ts#L1-L80)
	- What: Two API checks — invalid payload (expects 4xx) and idempotency for safe reads.
	- Why: Ensures API error handling for bad inputs and that read operations are stable and idempotent.
	- How: Sends a deliberately invalid create request and asserts a 4xx client error; calls `getAccount()` twice and compares stable identifiers to ensure repeated reads return consistent results.

- [tests/api/data_isolation.spec.ts](tests/api/data_isolation.spec.ts#L1-L120)
	- What: Per-test resource creation and cleanup (test data isolation).
	- Why: Demonstrates creation of isolated test data and best-effort cleanup to avoid collisions between tests.
	- How: Calls `createTestCustomer()` (which tries the API first and falls back to a Playwright web registration if needed), verifies existence via API GET when possible or by creating a second unique user, and attempts cleanup with `safeDeleteCustomer()`.

- [tests/web/login.spec.ts](tests/web/login.spec.ts#L1-L60)
	- What: Cross-layer integration — verifies that an account obtained via the API is visible in the web UI.
	- Why: Shows how web tests can reuse API operations for setup/verification (reduces UI flakiness and speeds tests).
	- How: Calls `ApiClient.getAccount()` to inspect data, then uses Playwright to log in and assert the `Accounts Overview` page and the account link are present.

- [tests/web/negative_and_idempotency.spec.ts](tests/web/negative_and_idempotency.spec.ts#L1-L120)
	- What: Web negative test (bad login) and a UI idempotency/edge-case (double-submit transfer).
	- Why: Covers common error paths and validates the UI handles duplicate/rapid actions safely.
	- How: Submits invalid credentials and asserts the displayed login error; for idempotency, logs in, navigates to the transfer form, submits twice quickly, and asserts either a network-level status indicating a duplicate or a DOM indicator of duplicate/success.

Supporting utilities and files used by the tests:

- `src/apiClient.ts` — central HTTP client used by API tests and reused in web tests for setup/verification.
- `src/regionConfig.ts` — loads the region-specific JSON (`config/regions/*.json`) so tests can switch regions by setting the `REGION` env var.
- `src/testUtils.ts` — helper utilities: `uniqueUsername()`, `createTestCustomer()` (API-first, web fallback), `safeDeleteCustomer()` (best-effort deletion).

Run a specific test file with Playwright (example):

```bash
npx playwright test tests/api/accounts.spec.ts
```


## CI (GitHub Actions)

The workflow file is at `.github/workflows/ci.yml` and defines two jobs: `api-tests` and `web-tests`. The workflow runs on `push`, `pull_request`, and can be manually dispatched.

To run selectively via the GitHub UI `Run workflow` button, set the `run` input to `api`, `web`, or `all`.

## Known caveats

- ParaBank is a public demo application; test data may reset and some endpoints are intentionally limited. Tests use assertions that tolerate expected demo behavior where appropriate (schema validation, numeric checks rather than strict business logic values).

### Test data cleanup caveats

- ParaBank (the chosen demo app) does not expose a public admin API to delete customers or accounts. This means tests that create data (customers, accounts, transfers) cannot reliably remove that data via a supported server-side endpoint.
- Some consequences:
	- `safeDeleteCustomer()` attempts an API `DELETE /customers/{id}` and returns true if successful, but for ParaBank that endpoint typically does not exist and the attempt will fail or return 404.
	- The framework includes a web-based registration fallback (`createTestCustomer()` will try the API first, then run a headless Playwright registration flow). The web fallback also cannot delete the account after creation because the UI provides no bulk or admin deletion capability.
	- Over time test-created accounts persist in the public demo instance until the service resets its demo data (which is out of test control). This is expected for public demo apps and not a framework bug.

- Why this happens:
	- Demo/public sites often intentionally limit destructive operations or administrative APIs to prevent misuse. They may also reset or seed data on a schedule rather than exposing deletion endpoints.
	- Security concerns: allowing arbitrary deletion via public endpoints could be abused, so delete/admin APIs are normally restricted to privileged environments.

- How the framework handles it:
	- Best-effort deletion: `safeDeleteCustomer()` calls an API delete if available and otherwise returns false.
	- Isolation by construction: tests create uniquely-named customers using `uniqueUsername()` so created accounts are unlikely to collide with each other or with real users.
	- Tests clean up when possible and otherwise assert properties that don't rely on deletion (e.g., uniqueness, idempotency, or expected error codes).

- Recommended mitigations for real projects or when you control the test environment:
	- Use a dedicated test environment or sandbox where you have admin APIs (or database access) to tear down test data.
	- Ask the application owners for a test-only admin endpoint or a scheduled sandbox reset policy you can trigger from CI.
	- Use short-lived test resources (unique naming, TTLs) and rotate or namespace them to avoid collisions and keep test environments predictable.


## Optional: Mobile design (brief)

To add Android/iOS tests (Appium or WebDriver-based), the framework would:

- Reuse `config/regions/*.json` for region-specific data (server endpoints, credentials, locales).
- Add a `mobile/` test folder with Appium client wrappers that reuse shared utilities (e.g., `ApiClient`) for test data setup.
- Extend CI to spawn device emulators (or use cloud device farms) and run mobile jobs in parallel with API/Web jobs.

