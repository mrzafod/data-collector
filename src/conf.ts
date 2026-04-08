import { tfClamp } from "./time";

export const symbols = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
  "XRPUSDT",
  "DOGEUSDT",
] as const;

export const time = tfClamp("1m");
export const minTime = tfClamp("1d", time, -5);
