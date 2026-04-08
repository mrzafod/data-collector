import { binanceSymbols, bybitSymbols, exchanges, time } from "./conf";
import { appendCsvFile } from "./files";

type TickerRow = {
  symbol: string;
  lastPrice?: string;
  bid1Price?: string;
  ask1Price?: string;
  markPrice?: string;
};

type BinanceTickerRow = {
  symbol: string;
  lastPrice?: string;
  bidPrice?: string;
  askPrice?: string;
};

type BybitOptionMeta = {
  symbol: string;
  side: "C" | "P";
  strike: string;
  expiryCode: string;
};

type BinanceOptionMeta = {
  symbol: string;
  side: "CALL" | "PUT";
  strikePrice: string;
  expiryDate: number;
  underlying: string;
  status: string;
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

const MONTH_NAMES = Object.fromEntries(
  Object.entries(MONTHS).map(([name, num]) => [num, name])
) as Record<string, string>;

const parseBaseUrls = (): string[] => {
  const envList = process.env.BYBIT_BASE_URLS?.split(",").map((value) => value.trim());
  const single = process.env.BYBIT_BASE_URL?.trim();
  const defaults = ["https://api.bytick.com", "https://api.bybit.com"];

  return Array.from(
    new Set([...(envList ?? []), ...(single ? [single] : []), ...defaults].filter(Boolean))
  );
};

const BYBIT_BASE_URLS = parseBaseUrls();

const fetchJsonText = async (url: string | URL) => {
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
      `Unexpected content type ${contentType || "(missing)"} from ${url}: ${body.slice(0, 120)}`
    );
  }

  return { res, body };
};

const fetchBybitOptionTickers = async (baseCoin: string): Promise<TickerRow[]> => {
  const attempts: string[] = [];

  for (const baseUrl of BYBIT_BASE_URLS) {
    const url = new URL("/v5/market/tickers", baseUrl);
    url.searchParams.set("category", "option");
    url.searchParams.set("baseCoin", baseCoin);

    try {
      const { res, body } = await fetchJsonText(url);
      const json = JSON.parse(body);

      if (!res.ok || json?.retCode !== 0) {
        throw new Error(
          json?.retMsg ??
            `Failed to fetch Bybit tickers for ${baseCoin} from ${baseUrl}`
        );
      }

      return (json?.result?.list ?? []) as TickerRow[];
    } catch (err) {
      attempts.push(
        `${baseUrl}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  throw new Error(
    `Failed to fetch Bybit tickers for ${baseCoin}. Attempts: ${attempts.join(" | ")}`
  );
};

const fetchBinanceExchangeInfo = async (): Promise<BinanceOptionMeta[]> => {
  const { res, body } = await fetchJsonText("https://eapi.binance.com/eapi/v1/exchangeInfo");
  const json = JSON.parse(body);

  if (!res.ok || json?.code) {
    throw new Error(json?.msg ?? "Failed to fetch Binance option exchange info");
  }

  return (json?.optionSymbols ?? []) as BinanceOptionMeta[];
};

const fetchBinanceTickers = async (): Promise<BinanceTickerRow[]> => {
  const { res, body } = await fetchJsonText("https://eapi.binance.com/eapi/v1/ticker");
  const json = JSON.parse(body);

  if (!res.ok || json?.code) {
    throw new Error(json?.msg ?? "Failed to fetch Binance option tickers");
  }

  return json as BinanceTickerRow[];
};

const parseDateCode = (dateCode: string): string => {
  const match = dateCode.match(/^(\d{1,2})([A-Z]{3})(\d{2})$/);

  if (!match) {
    throw new Error(`Unsupported expiration code: ${dateCode}`);
  }

  const day = match[1].padStart(2, "0");
  const month = MONTHS[match[2]];
  const year = `20${match[3]}`;

  if (!month) {
    throw new Error(`Unsupported expiration code: ${dateCode}`);
  }

  return `${year}-${month}-${day}`;
};

const formatDateCode = (dateMs: number): string => {
  const date = new Date(dateMs);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = MONTH_NAMES[String(date.getUTCMonth() + 1).padStart(2, "0")];
  const year = String(date.getUTCFullYear()).slice(-2);

  if (!month) {
    throw new Error(`Unsupported expiration date: ${dateMs}`);
  }

  return `${day}${month}${year}`;
};

const parseBybitSymbol = (symbol: string): BybitOptionMeta => {
  const match = symbol.match(
    /^([A-Z0-9]+)-(\d{1,2}[A-Z]{3}\d{2})-(\d+(?:\.\d+)?)-([CP])(?:-USDT)?$/
  );

  if (!match) {
    throw new Error(`Unsupported Bybit option symbol: ${symbol}`);
  }

  return {
    symbol,
    expiryCode: match[2],
    strike: match[3],
    side: match[4] as "C" | "P",
  };
};

const getBybitPrice = (ticker: TickerRow): number => {
  const price = Number(ticker.lastPrice ?? ticker.markPrice ?? ticker.bid1Price ?? ticker.ask1Price ?? 0);
  return Number.isFinite(price) ? price : 0;
};

const getBinancePrice = (ticker?: BinanceTickerRow): number => {
  const price = Number(ticker?.lastPrice ?? ticker?.bidPrice ?? ticker?.askPrice ?? 0);
  return Number.isFinite(price) ? price : 0;
};

const buildRows = (
  symbolId: string,
  buckets: Array<{
    expiryCode: string;
    strike: string;
    callPrice: number;
    putPrice: number;
  }>
): Array<Array<string | number>> => {
  return buckets
    .sort((a, b) => {
      const dateCompare = parseDateCode(a.expiryCode).localeCompare(parseDateCode(b.expiryCode));
      if (dateCompare !== 0) return dateCompare;
      return Number(a.strike) - Number(b.strike);
    })
    .filter((row) => row.callPrice !== 0 || row.putPrice !== 0)
    .map((row) => [
      symbolId,
      time,
      `${symbolId}-${row.expiryCode}-${row.strike}`,
      parseDateCode(row.expiryCode),
      row.strike,
      row.callPrice,
      row.putPrice,
    ]);
};

const collectBybitSymbol = async (symbolId: string): Promise<Array<Array<string | number>>> => {
  const baseCoin = symbolId.replace(/USDT$/, "");
  const tickers = await fetchBybitOptionTickers(baseCoin);
  const rows = new Map<string, { expiryCode: string; strike: string; callPrice: number; putPrice: number }>();

  for (const ticker of tickers) {
    const parsed = parseBybitSymbol(ticker.symbol);
    const key = `${parsed.expiryCode}:${parsed.strike}`;
    const current = rows.get(key) ?? {
      expiryCode: parsed.expiryCode,
      strike: parsed.strike,
      callPrice: 0,
      putPrice: 0,
    };

    if (parsed.side === "C") {
      current.callPrice = getBybitPrice(ticker);
    } else {
      current.putPrice = getBybitPrice(ticker);
    }

    rows.set(key, current);
  }

  return buildRows(symbolId, [...rows.values()]);
};

const collectBinanceSymbol = async (
  symbolId: string,
  metaRows: BinanceOptionMeta[],
  tickers: BinanceTickerRow[]
): Promise<Array<Array<string | number>>> => {
  const rows = new Map<string, { expiryCode: string; strike: string; callPrice: number; putPrice: number }>();
  const tickerBySymbol = new Map(tickers.map((ticker) => [ticker.symbol, ticker]));

  for (const meta of metaRows) {
    if (meta.underlying !== symbolId || meta.status !== "TRADING") continue;

    const expiryCode = formatDateCode(meta.expiryDate);
    const strike = String(Number(meta.strikePrice));
    const key = `${expiryCode}:${strike}`;
    const current = rows.get(key) ?? {
      expiryCode,
      strike,
      callPrice: 0,
      putPrice: 0,
    };
    const price = getBinancePrice(tickerBySymbol.get(meta.symbol));

    if (meta.side === "CALL") {
      current.callPrice = price;
    } else {
      current.putPrice = price;
    }

    rows.set(key, current);
  }

  return buildRows(symbolId, [...rows.values()]);
};

const appendExchangeSymbol = async (
  exchange: (typeof exchanges)[number],
  symbolId: string,
  rows: Array<Array<string | number>>
) => {
  if (!rows.length) return false;
  await appendCsvFile(`data/opts/${exchange}/${symbolId}.csv`, rows);
  return true;
};

const collectBybitData = async (): Promise<boolean> => {
  let wroteAny = false;

  for (const symbolId of bybitSymbols) {
    try {
      const rows = await collectBybitSymbol(symbolId);
      wroteAny = (await appendExchangeSymbol("bybit", symbolId, rows)) || wroteAny;
    } catch (err) {
      console.error(`Failed to collect Bybit data for ${symbolId}:`, err);
    }
  }

  return wroteAny;
};

const collectBinanceData = async (): Promise<boolean> => {
  let wroteAny = false;

  let metaRows: BinanceOptionMeta[] = [];
  let tickers: BinanceTickerRow[] = [];

  try {
    [metaRows, tickers] = await Promise.all([
      fetchBinanceExchangeInfo(),
      fetchBinanceTickers(),
    ]);
  } catch (err) {
    console.error(
      `Failed to collect Binance option metadata:`,
      err
    );
    return false;
  }

  for (const symbolId of binanceSymbols) {
    try {
      const rows = await collectBinanceSymbol(symbolId, metaRows, tickers);
      wroteAny = (await appendExchangeSymbol("binance", symbolId, rows)) || wroteAny;
    } catch (err) {
      console.error(`Failed to collect Binance data for ${symbolId}:`, err);
    }
  }

  return wroteAny;
};

export const collectOptsData = async (): Promise<void> => {
  const failures: string[] = [];
  let wroteAny = false;

  try {
    wroteAny = (await collectBybitData()) || wroteAny;
  } catch (err) {
    failures.push(`bybit: ${err instanceof Error ? err.message : String(err)}`);
  }

  try {
    wroteAny = (await collectBinanceData()) || wroteAny;
  } catch (err) {
    failures.push(`binance: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (failures.length) {
    console.warn(`Completed with partial failures: ${failures.join(" | ")}`);
  }

  if (!wroteAny) {
    console.warn(
      `No option data collected${failures.length ? `; errors: ${failures.join(" | ")}` : ""}`
    );
  }
};
