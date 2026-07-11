import { test, expect } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";

test("real local route action and feedback", async ({ page }) => {
  const value = await readFile(new URL("../src/value.txt", import.meta.url), "utf8").then((item) => item.trim(), () => "missing");
  const server = http.createServer((_request, response) => {
    response.setHeader("content-type", "text/html");
    response.end(`<button id="read">read</button><output id="feedback"></output><script>read.onclick=()=>feedback.textContent=${JSON.stringify(value)}</script>`);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    await page.goto(`http://127.0.0.1:${address.port}/value`);
    await page.locator("#read").click();
    const feedback = await page.locator("#feedback").textContent();
    expect(feedback).not.toBeNull();
    await mkdir(process.env.TY_CONTEXT_ARTIFACT_DIR, { recursive: true });
    await writeFile(path.join(process.env.TY_CONTEXT_ARTIFACT_DIR, "product-result.json"), JSON.stringify({ value: feedback }));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
