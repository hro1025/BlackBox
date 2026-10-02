import { expect, test } from "bun:test";
import { parseLoadAvgInfo } from "../src/collectors/loadavg";

test("4.1 loadavg parser test", async () => {
  const path = `${import.meta.dirname}/../fixtures/loadavg.txt`;
  const text = await Bun.file(path).text();

  const result = parseLoadAvgInfo(text);

  expect(result.load1).toBe(0.38);
  expect(result.load5).toBe(1.31);
  expect(result.load15).toBe(1.58);
});
