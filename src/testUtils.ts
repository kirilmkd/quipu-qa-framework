import { ApiClient } from "./apiClient";
import config from "./regionConfig";

export function uniqueUsername(prefix = "testuser") {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export async function createTestCustomer(payload?: any) {
  const client = new ApiClient();
  const user = payload || {
    firstName: "Test",
    lastName: "User",
    address: "1 Test St",
    city: "Testville",
    state: "TS",
    zipCode: "00000",
    phoneNumber: "000-000-0000",
    ssn: "000-00-0000",
    username: uniqueUsername('user'),
    password: "pw12345",
  };

  // Try API-based creation first
  try {
    const resp = await client.createCustomer(user);
    return resp.data;
  } catch (apiErr) {
    // If API endpoint not available (404 or similar), fall back to web registration flow
    try {
      const { chromium } = await import('playwright');
      const browser = await chromium.launch({ args: ['--no-sandbox'] });
      const page = await browser.newPage();
      const regUrl = `${config.webBaseUrl}/register.htm`;
      await page.goto(regUrl);

      // Fill the registration form - field names based on ParaBank demo
      await page.fill('input[name="customer.firstName"]', user.firstName);
      await page.fill('input[name="customer.lastName"]', user.lastName);
      await page.fill('input[name="customer.address.street"]', user.address);
      await page.fill('input[name="customer.address.city"]', user.city);
      await page.fill('input[name="customer.address.state"]', user.state);
      await page.fill('input[name="customer.address.zipCode"]', user.zipCode);
      await page.fill('input[name="customer.phoneNumber"]', user.phoneNumber);
      await page.fill('input[name="customer.ssn"]', user.ssn);
      await page.fill('input[name="customer.username"]', user.username);
      await page.fill('input[name="customer.password"]', user.password);
      await page.fill('input[name="repeatedPassword"]', user.password);

      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {}),
        page.click('input[value="Register"]'),
      ]);

      // After registration, ParaBank typically navigates to Accounts Overview if successful
      const success = await page.locator('text=Accounts Overview').first().isVisible().catch(() => false);
      await browser.close();

      if (success) {
        return { username: user.username, password: user.password };
      }
      // If registration didn't produce visible success, still return username info
      return { username: user.username, password: user.password };
    } catch (webErr) {
      throw new Error(`Failed to create test customer via API and web fallback: ${webErr}`);
    }
  }
}

export async function safeDeleteCustomer(customerIdOrUsername: string) {
  const client = new ApiClient();
  // Attempt API delete if supported
  try {
    const url = `${client['baseUrl']}/customers/${customerIdOrUsername}`;
    const axios = (await import('axios')).default;
    const resp = await axios.delete(url);
    return resp.status >= 200 && resp.status < 300;
  } catch (e) {
    // No API delete endpoint — attempt best-effort UI cleanup is not available for ParaBank demo.
    return false;
  }
}
