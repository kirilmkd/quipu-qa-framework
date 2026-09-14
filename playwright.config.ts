// playwright.config.ts
import { defineConfig } from "@playwright/test";
import config from "./src/regionConfig";

export default defineConfig({
  testDir: "./tests",
  use: {
    baseURL: config.webBaseUrl,   // region-specific web URL
    headless: true,
  },
  reporter: [["html", { outputFolder: "playwright-report" }]],
});
