const { readFile } = require("node:fs/promises");

test("real product value", async () => {
  const value = (await readFile(require("node:path").join(__dirname, "../src/value.txt"), "utf8")).trim();
  expect(value).toBe("good");
});
