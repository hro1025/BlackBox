import { expect, test } from "bun:test";
import { classifyStartup } from "../src/lifecycle/classify";

test("6.3 marker and same boot id is a clean restart", () => {
  expect(classifyStartup(true, false)).toBe("clean-restart");
});

test("6.3 marker and new boot id is a clean reboot", () => {
  expect(classifyStartup(true, true)).toBe("clean-reboot");
});

test("6.3 no marker and same boot id is an agent crash", () => {
  expect(classifyStartup(false, false)).toBe("agent-crashed");
});

test("6.3 no marker and new boot id is an unclean reboot", () => {
  expect(classifyStartup(false, true)).toBe("unclean-reboot");
});
