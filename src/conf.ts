import { tfClamp } from "./time";

export const symbols: Array<{ id: string; tick: number }> = [
  { id: "BTCUSDT", tick: 500 },
  { id: "ETHUSDT", tick: 25 },
  { id: "BNBUSDT", tick: 10 },
  { id: "SOLUSDT", tick: 2 },
  { id: "XRPUSDT", tick: 0.5 },
  { id: "DOGEUSDT", tick: 0.002 },
];

export const time = tfClamp("1m");
export const minTime = tfClamp("1d", time, -5);
