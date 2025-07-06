import { minBy, pick } from "lodash";
import { symbols } from "./conf";
import { appendDataFile } from "./files";

type SymbolContractData = {
  leverage: number;
  // lastPrice: number;
  // bidPrice: number;
  // askPrice: number;
  // bidIV: number;
  // askIV: number;
  // position: number;
  delta: number;
  theta: number;
  gamma: number;
  vega: number;
  volume: number;
  amount: number;
};

const symbolContractKeys: Array<keyof SymbolContractData> = [
  "leverage",
  // "lastPrice",
  // "bidPrice",
  // "askPrice",
  // "bidIV",
  // "askIV",
  // "position",
  "delta",
  "theta",
  "gamma",
  "vega",
  "volume",
  "amount",
];

type SymbolData = {
  expirationTime: number;
  optionPriceList: Array<{
    expirationPrice: number;
    call: SymbolContractData;
    put: SymbolContractData;
  }>;
};

const getSymbolClosestContractData = async (symbolId: string) => {
  const url = `https://www.binance.com/bapi/eoptions/v1/public/eoptions/exchange/tGroup?contract=${symbolId}`;

  const res = await fetch(url);
  const data = await res.json();
  const arr = (data.data || []) as SymbolData[];

  return minBy(arr, (d) => d.expirationTime);
};

const extractContractData = (data: SymbolContractData) => {
  return pick(data, symbolContractKeys);
};

const collectSymboData = async (symbolId: string) => {
  try {
    const contractData = await getSymbolClosestContractData(symbolId);
    if (!contractData) return;
    const data = contractData.optionPriceList.map((d) => {
      return {
        price: d.expirationPrice,
        call: extractContractData(d.call),
        put: extractContractData(d.put),
      };
    });

    await appendDataFile(`data/opts/${symbolId}.json`, data);
  } catch (error) {
    console.log(error)
  }
};

export const collectOptsData = async () => {
  for (const symbol of symbols) {
    await collectSymboData(symbol.id);
  }
};
