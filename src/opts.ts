import { symbols, time } from "./conf";
import { appendCsvFile } from "./files";

type TickerRow = {
  symbol: string;
  lastPrice?: string;
  bid1Price?: string;
  ask1Price?: string;
  markPrice?: string;
};

const MONTHS: Record<string, string> = {
  JAN: "01",
  FEB: "02",
  MAR: "03",
  APR: "04",
  MAY: "05",
  JUN: "06",
  JUL: "07",
  AUG: "08",
  SEP: "09",
  OCT: "10",
  NOV: "11",
  DEC: "12",
};

const BYBIT_BASE_URLS = Array.from(
  new Set([
    process.env.BYBIT_BASE_URL,
    "https://api.bybit.com",
    "https://api.bytick.com",
  ].filter((value): value is string => Boolean(value)))
);

const fetchOptionTickers = async (baseCoin: string): Promise<TickerRow[]> => {
  let lastError: unknown;

  for (const baseUrl of BYBIT_BASE_URLS) {
    const url = new URL("/v5/market/tickers", baseUrl);
    url.searchParams.set("category", "option");
    url.searchParams.set("baseCoin", baseCoin);

    try {
      const res = await fetch(url, {
        headers: {
          accept: "application/json",
          "user-agent": "data-collector/1.0",
        },
      });
      const body = await res.text();
      const contentType = res.headers.get("content-type") ?? "";

      if (!contentType.includes("json")) {
        throw new Error(
          `Unexpected content type ${contentType || "(missing)"} from ${baseUrl}: ${body.slice(0, 120)}`
        );
      }

      const json = JSON.parse(body);

      if (!res.ok || json?.retCode !== 0) {
        throw new Error(
          json?.retMsg ??
            `Failed to fetch Bybit tickers for ${baseCoin} from ${baseUrl}`
        );
      }

      return (json?.result?.list ?? []) as TickerRow[];
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Failed to fetch Bybit tickers for ${baseCoin}`);
};

const parseExpirationDate = (expirationCode: string): string => {
  const match = expirationCode.match(/^(\d{1,2})([A-Z]{3})(\d{2})$/);

  if (!match) {
    throw new Error(`Unsupported expiration code: ${expirationCode}`);
  }

  const day = match[1].padStart(2, "0");
  const month = MONTHS[match[2]];
  const year = `20${match[3]}`;

  if (!month) {
    throw new Error(`Unsupported expiration code: ${expirationCode}`);
  }

  return `${year}-${month}-${day}`;
};

const parseOptionSymbol = (symbol: string) => {
  const match = symbol.match(
    /^([A-Z0-9]+)-(\d{1,2}[A-Z]{3}\d{2})-(\d+(?:\.\d+)?)-([CP])(?:-USDT)?$/
  );

  if (!match) {
    throw new Error(`Unsupported Bybit option symbol: ${symbol}`);
  }

  return {
    expirationCode: match[2],
    strike: match[3],
    side: match[4] as "C" | "P",
  };
};

const getPrice = (ticker: TickerRow): number => {
  const price = Number(ticker.lastPrice ?? ticker.markPrice ?? ticker.bid1Price ?? ticker.ask1Price ?? 0);
  return Number.isFinite(price) ? price : 0;
};

const buildRows = (
  symbolId: string,
  tickers: TickerRow[]
): Array<Array<string | number>> => {
  type PairRow = {
    expirationCode: string;
    strike: string;
    callPrice: number;
    putPrice: number;
  };

  const rows = new Map<string, PairRow>();

  for (const ticker of tickers) {
    const parsed = parseOptionSymbol(ticker.symbol);
    const key = `${parsed.expirationCode}:${parsed.strike}`;
    const current = rows.get(key) ?? {
      expirationCode: parsed.expirationCode,
      strike: parsed.strike,
      callPrice: 0,
      putPrice: 0,
    };

    if (parsed.side === "C") {
      current.callPrice = getPrice(ticker);
    } else {
      current.putPrice = getPrice(ticker);
    }

    rows.set(key, current);
  }

  return [...rows.values()]
    .sort((a, b) => {
      const expirationCompare = parseExpirationDate(
        a.expirationCode
      ).localeCompare(parseExpirationDate(b.expirationCode));
      if (expirationCompare !== 0) return expirationCompare;
      return Number(a.strike) - Number(b.strike);
    })
    .filter((row) => row.callPrice !== 0 || row.putPrice !== 0)
    .map((row) => {
      const expirationDate = parseExpirationDate(row.expirationCode);
      const contractName = `${symbolId}-${row.expirationCode}-${row.strike}`;

      return [
        symbolId,
        time,
        contractName,
        expirationDate,
        row.strike,
        row.callPrice,
        row.putPrice,
      ];
    });
};

const processSymbol = async (symbolId: string): Promise<void> => {
  try {
    const baseCoin = symbolId.replace(/USDT$/, "");
    const tickers = await fetchOptionTickers(baseCoin);
    const output = buildRows(symbolId, tickers);
    if (output.length) {
      await appendCsvFile(`data/opts/${symbolId}.csv`, output);
    }
  } catch (err) {
    console.error(`Failed to collect data for ${symbolId}:`, err);
    throw err;
  }
};

export const collectOptsData = async (): Promise<void> => {
  const failures: Array<{ symbol: string; error: unknown }> = [];

  for (const symbol of symbols) {
    try {
      await processSymbol(symbol);
    } catch (error) {
      failures.push({ symbol, error });
    }
  }

  if (failures.length) {
    throw new Error(
      `Failed to collect data for ${failures.length} symbol(s): ${failures
        .map(({ symbol, error }) => `${symbol} (${error instanceof Error ? error.message : String(error)})`)
        .join(", ")}`
    );
  }
};
