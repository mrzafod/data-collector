import { sortBy, keyBy, union } from "lodash";
import { symbols, time } from "./conf";
import { appendDataFile } from "./files";
import { tfMs } from "./time";

type ContractMetrics = {
  leverage: number;
  bidIV: number;
  askIV: number;
  delta: number;
  theta: number;
  gamma: number;
  vega: number;
  volume: number;
  amount: number;
};

type PriceRow = {
  expirationPrice: number;
  call: ContractMetrics;
  put: ContractMetrics;
};

type ContractSet = {
  expirationTime: number;
  optionPriceList: PriceRow[];
};

type OutputRow = {
  price: number;
  call: ContractMetrics;
  put: ContractMetrics;
  koe: number;
};

const metricKeys: Array<keyof ContractMetrics> = [
  "leverage",
  "bidIV",
  "askIV",
  "delta",
  "theta",
  "gamma",
  "vega",
  "volume",
  "amount",
];

const tf12h = tfMs("1h", 12);

const fetchContracts = async (symbolId: string): Promise<ContractSet[]> => {
  const url = `https://www.binance.com/bapi/eoptions/v1/public/eoptions/exchange/tGroup?contract=${symbolId}`;
  const res = await fetch(url);
  const json = await res.json();
  return (json?.data ?? []) as ContractSet[];
};

const blendMetrics = (
  a: ContractMetrics | undefined,
  b: ContractMetrics | undefined,
  factor: number
): ContractMetrics => {
  return Object.fromEntries(
    metricKeys.map((key) => {
      const aVal = a?.[key] ?? 0;
      const bVal = b?.[key] ?? 0;
      return [key, aVal * factor + bVal * (1 - factor)];
    })
  ) as ContractMetrics;
};

const isZeroMetrics = (m: ContractMetrics): boolean =>
  metricKeys.every((key) => m[key] === 0);

const computeKoe = (now: number, t1: number, t2?: number): number => {
  if (now + tf12h < t1 || !t2) return 1;
  const p = (now + tf12h - t1) / (t2 - t1);
  return 1 - Math.max(0, Math.min(1, p));
};

const blendContracts = (contracts: ContractSet[], now: number): OutputRow[] => {
  const [c1, c2] = sortBy(contracts, (d) => d.expirationTime);
  if (!c1) return [];

  const koe = computeKoe(now, c1.expirationTime, c2?.expirationTime);
  const list1 = keyBy(c1.optionPriceList, (row) => row.expirationPrice);
  const list2 = keyBy(c2?.optionPriceList ?? [], (row) => row.expirationPrice);

  const allPrices = union(Object.keys(list1), Object.keys(list2)).map(Number);

  return allPrices
    .map((price) => {
      const row1 = list1[price];
      const row2 = list2[price];
      const call = blendMetrics(row1?.call, row2?.call, koe);
      const put = blendMetrics(row1?.put, row2?.put, koe);
      return { price, koe, call, put };
    })
    .filter((row) => !isZeroMetrics(row.call) || !isZeroMetrics(row.put));
};

const processSymbol = async (symbolId: string): Promise<void> => {
  try {
    const contracts = await fetchContracts(symbolId);
    const output = blendContracts(contracts, time);
    if (output.length) {
      await appendDataFile(`data/opts/${symbolId}.json`, output);
    }
  } catch (err) {
    console.error(`Failed to collect data for ${symbolId}:`, err);
  }
};

export const collectOptsData = async (): Promise<void> => {
  for (const symbol of symbols) {
    await processSymbol(symbol.id);
  }
};
