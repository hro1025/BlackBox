export type MemoryStats = {
  totalKb: number;
  availableKb: number;
  freeKb: number;
  swapTotalKb: number;
  swapFreeKb: number;
};

export type CpuTimes = {
  user: number;
  nice: number;
  system: number;
  idle: number;
  iowait: number;
  irq: number;
  softirq: number;
  steal: number;
};

export type LoadAvg = {
  load1: number;
  load5: number;
  load15: number;
};

export type NetInterface = {
  name: string;
  bytesIn: number;
  bytesOut: number;
};

export type NetSample = {
  interfaces: NetInterface[];
  sampledAtMs: number;
};

export type ThermalZone = {
  name: string;
  celsius: number;
};
