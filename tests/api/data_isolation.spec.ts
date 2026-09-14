import { test, expect } from "@playwright/test";
import { createTestCustomer, safeDeleteCustomer } from "../../src/testUtils";
import { ApiClient } from "../../src/apiClient";

test("Create per-test customer and cleanup (isolation)", async () => {
  const client = new ApiClient();

  // Create a test customer (API first, web fallback)
  const created = await createTestCustomer();
  expect(created).toBeTruthy();

  // Determine id or username
  const id = created.customerId || created.id || created.customer?.id;
  const username = created.username || created.userName || created.customer?.username;

  // Verify existence: prefer API GET by id, otherwise attempt web login
  if (id) {
    const axios = (await import('axios')).default;
    const url = `${client['baseUrl']}/customers/${id}`;
    let ok = false;
    try {
      const resp = await axios.get(url);
      ok = resp.status === 200;
    } catch (e) {
      ok = false;
    }
    expect(ok).toBeTruthy();
  } else if (username) {
    // Verify isolation by creating a second test customer and ensuring usernames are unique
    const second = await createTestCustomer();
    const username2 = second.username || second.userName || second.customer?.username;
    expect(username2).toBeTruthy();
    expect(username2).not.toEqual(username);
    // Attempt cleanup for the second user as well
    await safeDeleteCustomer(String(username2)).catch(() => false);
  } else {
    // Cannot verify existence; fail the test
    throw new Error('Unable to determine created customer id or username for verification');
  }

  // Attempt cleanup
  const ident = id ? String(id) : String(username);
  const deleted = await safeDeleteCustomer(ident).catch(() => false);

  if (deleted && id) {
    // Verify deletion: GET should now fail
    const axios = (await import('axios')).default;
    const url = `${client['baseUrl']}/customers/${id}`;
    let ok = false;
    try {
      await axios.get(url);
      ok = false;
    } catch (e: any) {
      const status = e?.response?.status;
      ok = status === 404 || status === 400 || !!status;
    }
    expect(ok).toBeTruthy();
  } else {
    // If delete isn't supported, at least ensure username is unique pattern
    if (username) expect(username).toMatch(/testuser-|user-/i);
  }
});
