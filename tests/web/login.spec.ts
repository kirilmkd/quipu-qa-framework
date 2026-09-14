import { test, expect } from "@playwright/test";
import config from "../../src/regionConfig";
import { ApiClient } from "../../src/apiClient";

test("Web + API integration: account appears in UI", async ({ page }) => {
	const client = new ApiClient();
	const accountId = "12345";

	// Verify via API first
	const apiResp = await client.getAccount(accountId);
	expect(apiResp.status).toBe(200);
	expect(apiResp.data).toBeTruthy();

	// Open web UI and login
	await page.goto(config.webBaseUrl);
	await page.fill('input[name="username"]', config.credentials.username);
	await page.fill('input[name="password"]', config.credentials.password);
	await Promise.all([
		page.waitForNavigation(),
		page.click('input[value="Log In"]'),
	]);

	// Ensure accounts overview loads (use explicit role to avoid ambiguity)
	await expect(page.getByRole('heading', { name: 'Accounts Overview' })).toBeVisible();

	// Verify the account id from API is present in the UI
	const acctLink = page.locator(`a:has-text("${accountId}")`);
	await expect(acctLink).toBeVisible();
});
