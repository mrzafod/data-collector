import { tfClamp } from "./time";

export const bybitSymbols = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
  "XRPUSDT",
  "DOGEUSDT",
] as const;

export const binanceSymbols = [
  "BTCUSDT",
  "ETHUSDT",
  "BNBUSDT",
  "SOLUSDT",
  "XRPUSDT",
  "DOGEUSDT",
] as const;

export const exchanges = ["bybit", "binance"] as const;

export const time = tfClamp("1m");
