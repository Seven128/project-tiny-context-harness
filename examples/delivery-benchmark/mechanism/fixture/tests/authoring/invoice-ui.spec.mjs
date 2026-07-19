// Static Playwright-authoring fixture. The mechanism benchmark measures Contract authoring;
// product execution is handled by the separate context/workflow tasks.
import { test, expect } from "@playwright/test";

test("[ac:paid-invoice-visible] paid invoice is visible", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173");
  await expect(page.getByText("Paid")).toBeVisible();
});
