import { readFile } from "node:fs/promises";
import { chunk } from "lodash-es";
import { expect, test } from "vitest";

test("real product value", async () => {
  const value = (await readFile(new URL("../src/value.txt", import.meta.url), "utf8")).trim();
  expect(chunk([value], 1).flat()).toEqual(["good"]);
});
