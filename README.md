# Options Collector

This project fetches option prices on a schedule and stores them as append-only semicolon-delimited CSV files under `data/opts/`.

## Output Shape

Each exchange gets its own folder, and each symbol gets its own file:

- `data/opts/bybit/SOLUSDT.csv`
- `data/opts/binance/SOLUSDT.csv`

Each row follows this structure:

`SOLUSDT;<update_time>;<contract_name>;<expiration_date>;<contract_price>;<call_price>;<put_price>`

The collector groups call and put contracts by expiry and strike, then appends one row per pair.

## How It Runs

- GitHub Actions runs the collector on a schedule.
- The workflow copies the current `data/` tree from the `cdn` branch when it exists, refreshes the CSVs, and pushes the updated data back to `cdn`.
- The CSV writer appends new rows directly, so it does not reread the existing file before writing.

## Local Development

```bash
npm ci
npm run build
npm start
```

## Notes

- Bybit currently targets `BTCUSDT`, `ETHUSDT`, `SOLUSDT`, `XRPUSDT`, and `DOGEUSDT`.
- Binance currently targets `BTCUSDT`, `ETHUSDT`, `BNBUSDT`, `SOLUSDT`, `XRPUSDT`, and `DOGEUSDT`.
