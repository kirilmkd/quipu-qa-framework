import { test, expect } from "@playwright/test";
import Ajv from "ajv";
import { ApiClient } from "../../src/apiClient";

const ajv = new Ajv();

test("API Happy Path - Get Account", async () => {
  const client = new ApiClient();
  const response = await client.getAccount("12345");
  expect(response.status).toBe(200);

  const schema = {
    type: "object",
    properties: {
      balance: { type: "number" }
    },
    required: ["balance"],
  };

  const validate = ajv.compile(schema);
  const valid = validate(response.data);
  expect(valid, `Schema errors: ${JSON.stringify(validate.errors)}`).toBeTruthy();
  expect(Number.isFinite(response.data.balance)).toBeTruthy();
});
