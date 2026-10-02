import { expect, test } from "bun:test";
import { parseTempCelsius } from "../src/collectors/thermal";

test("4.4 temp text converts to celsius", () => {
  const result = parseTempCelsius("45000\n");

  expect(result).toBe(45);
});

test("4.4 empty temp should throw", () => {
  expect(() => parseTempCelsius("")).toThrow("Malformed temp value");
});
