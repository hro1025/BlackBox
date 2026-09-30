import { expect, test } from "bun:test";
import { parseMemoryInfo } from "./memory";

test("2.4 first test", async () => {
  const path = `${import.meta.dirname}/../../fixtures/meminfo.txt`;
  const text = await Bun.file(path).text();

  const result = parseMemoryInfo(text);

  expect(result.totalKb).toBe(7915908);
  expect(result.freeKb).toBe(1239744);
  expect(result.availableKb).toBe(3083072);
});

test("2.5 missing-field test", async () => {
  const path = `${import.meta.dirname}/../../fixtures/meminfo-missing.txt`;
  const text = await Bun.file(path).text();

  expect(() => parseMemoryInfo(text)).toThrow("MemAvailable");
});

test("2.6 edge case should parse", async () => {
  const path = `${import.meta.dirname}/../../fixtures/meminfo-no-newline.txt`;
  const text = await Bun.file(path).text();

  const result = parseMemoryInfo(text);

  expect(result.totalKb).toBe(7915908);
});

test("2.6 edge case should throw", () => {
  expect(() => parseMemoryInfo("")).toThrow("MemTotal");
});
