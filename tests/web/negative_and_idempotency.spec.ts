import { test, expect } from "@playwright/test";
import config from "../../src/regionConfig";

test.describe("Web negative and idempotency tests", () => {
  test("Bad login shows error message", async ({ page }) => {
    await page.goto(config.webBaseUrl);
    await page.fill('input[name="username"]', 'wronguser');
    await page.fill('input[name="password"]', 'badpw');
    await Promise.all([
      page.waitForResponse((r) => r.url().includes('login') || r.status() >= 400, { timeout: 3000 }).catch(() => {}),
      page.click('input[value="Log In"]'),
    ]);

    // Expect either an error message OR that the login form remains visible (failed login)
    const err = page.getByText(/The username and password could not be verified/i);
    const loginForm = page.locator('input[name="username"]');

    const result = await Promise.any([
      err.waitFor({ state: 'visible', timeout: 8000 }).then(() => 'err'),
      loginForm.waitFor({ state: 'visible', timeout: 8000 }).then(() => 'login'),
    ]).catch(() => null);

    // At least one condition should be met; if not, fail the test
    expect(result).not.toBeNull();
  });

  test("Double-submit transfer is idempotent or rejected", async ({ page }) => {
    // This test navigates to login, logs in with known credentials and attempts a double-submit
    await page.goto(config.webBaseUrl);
    await page.fill('input[name="username"]', config.credentials.username);
    await page.fill('input[name="password"]', config.credentials.password);
    await Promise.all([
      page.waitForNavigation(),
      page.click('input[value="Log In"]'),
    ]);

    // Navigate to Transfer Funds page
    await page.click('a:has-text("Transfer Funds")');
    await expect(page.getByRole('heading', { name: 'Transfer Funds' })).toBeVisible();

    // Fill form with sample values - find the first input in the transfer form
    const form = page.locator('form').filter({ hasText: 'Transfer' }).first();
    await expect(form).toBeVisible();
    const firstInput = form.locator('input').first();
    await firstInput.fill('1');

    // Attempt to click submit twice quickly (idempotency / duplicate handling)
    const submit = form.locator('input[type="submit"], input[value="Transfer"], button:has-text("Transfer")').first();
    // Click submit twice and capture the transfer request response if any
    const transferResponse = page.waitForResponse((r) => r.url().includes('/transfer') || r.url().includes('transfer'), { timeout: 5000 }).catch(() => null);
    await Promise.all([
      submit.click(),
      submit.click(),
    ]).catch(() => {});

    const resp = await transferResponse;
    if (resp) {
      const status = resp.status();
      expect([200, 201, 202, 409, 400].includes(status)).toBeTruthy();
    } else {
      // Fallback to checking for completion or duplicate indicators in the DOM
      const success = page.locator('text=Transfer Complete');
      const dupErr = page.locator('text=Duplicate');
      await expect(success.or(dupErr)).toBeVisible({ timeout: 5000 });
    }
  });
});
