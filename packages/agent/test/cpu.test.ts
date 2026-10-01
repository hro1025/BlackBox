import { expect, test } from "bun:test";
import { parserCpuInfo } from "../src/collectors/cpu";

test("3.4 test the parser", async () => {
  const path = `${import.meta.dirname}/../fixtures/stat.txt`;
  const text = await Bun.file(path).text();

  const result = parserCpuInfo(text);

  expect(result.user).toBe(215473);
  expect(result.nice).toBe(116);
  expect(result.system).toBe(81762);
  expect(result.idle).toBe(4265033);
  expect(result.iowait).toBe(78071);
  expect(result.irq).toBe(23578);
  expect(result.softirq).toBe(13729);
  expect(result.steal).toBe(0);
});
