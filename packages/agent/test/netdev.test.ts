import { expect, test } from "bun:test";
import { parserNetDevInfo } from "../src/collectors/netdev";

test("4.2 Network parser test", async () => {
  const path = `${import.meta.dirname}/../fixtures/netdev.txt`;
  const text = await Bun.file(path).text();

  const result = parserNetDevInfo(text);

  expect(result).toEqual([
    { name: "enp2s0", bytesIn: 0, bytesOut: 0 },
    { name: "wlan0", bytesIn: 440470367, bytesOut: 15061163 },
  ]);
});
