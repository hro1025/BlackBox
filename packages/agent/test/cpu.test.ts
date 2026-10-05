import { expect, test } from "bun:test";
import { cpuUsagePercent, type CpuTimes } from "@blackbox/shared";
import { parseCpuInfo } from "../src/collectors/cpu";

test("3.4 test the parser", async () => {
  const path = `${import.meta.dirname}/../fixtures/stat.txt`;
  const text = await Bun.file(path).text();

  const result = parseCpuInfo(text);

  expect(result.user).toBe(215473);
  expect(result.nice).toBe(116);
  expect(result.system).toBe(81762);
  expect(result.idle).toBe(4265033);
  expect(result.iowait).toBe(78071);
  expect(result.irq).toBe(23578);
  expect(result.softirq).toBe(13729);
  expect(result.steal).toBe(0);
});

test("3.5 half idle, half busy is 50 percent", () => {
  const previous: CpuTimes = {
    user: 100,
    nice: 0,
    system: 0,
    idle: 100,
    iowait: 0,
    irq: 0,
    softirq: 0,
    steal: 0,
  };
  const current: CpuTimes = {
    user: 150,
    nice: 0,
    system: 0,
    idle: 150,
    iowait: 0,
    irq: 0,
    softirq: 0,
    steal: 0,
  };

  expect(cpuUsagePercent(previous, current)).toBe(50);
});

test("3.5 mostly idle is 25 percent", () => {
  const previous: CpuTimes = {
    user: 100,
    nice: 0,
    system: 0,
    idle: 100,
    iowait: 0,
    irq: 0,
    softirq: 0,
    steal: 0,
  };
  const current: CpuTimes = {
    user: 150,
    nice: 0,
    system: 0,
    idle: 250,
    iowait: 0,
    irq: 0,
    softirq: 0,
    steal: 0,
  };

  expect(cpuUsagePercent(previous, current)).toBe(25);
});
