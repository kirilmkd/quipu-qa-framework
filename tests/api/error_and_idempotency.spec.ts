import { test, expect } from "@playwright/test";
import { ApiClient } from "../../src/apiClient";
import Ajv from "ajv";
import { uniqueUsername, createTestCustomer, safeDeleteCustomer } from "../../src/testUtils";

test.describe("API Error and Idempotency", () => {
  test("Invalid payload returns 4xx", async () => {
    const client = new ApiClient();
    // Send clearly invalid payload
    let err: any = null;
    try {
      await client.createCustomer({ invalid: "field" });
    } catch (e: any) {
      err = e;
    }

    expect(err).toBeTruthy();
    const status = err?.response?.status;
    expect(status && status >= 400 && status < 500).toBeTruthy();
  });

  test("Idempotency: repeated GET returns same result", async () => {
    const client = new ApiClient();
    const accountId = "12345";
    const r1 = await client.getAccount(accountId);
    expect(r1.status).toBe(200);
    const r2 = await client.getAccount(accountId);
    expect(r2.status).toBe(200);
    // Basic equality check for stable fields
    expect(r1.data.accountId || r1.data.id).toBeTruthy();
    expect(r1.data.accountId || r1.data.id).toEqual(r2.data.accountId || r2.data.id);
  });
});
