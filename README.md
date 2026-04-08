# Bybit Options Collector

This project fetches Bybit option prices on a schedule and stores the results as semicolon-delimited CSV files under `data/opts/`.

## Output Shape

Each symbol gets its own file, for example `data/opts/SOLUSDT.csv`.

Each row follows this structure:

`SOLUSDT;<update_time>;<contract_name>;<expiration_date>;<contract_price>;<call_price>;<put_price>`

The current collector groups Bybit call and put tickers by expiry and strike, then writes one row per pair.

## How It Runs

- GitHub Actions runs the collector on a schedule.
- The workflow copies the current `data/` tree from the `cdn` branch, refreshes the CSVs, and pushes the updated data back to `cdn`.
- Old `.json` snapshots are removed during the migration, so the repo stays on the CSV format.

## Local Development

```bash
npm ci
npm run build
npm start
```

## Notes

- The collector currently targets these symbols: `BTCUSDT`, `ETHUSDT`, `SOLUSDT`, `XRPUSDT`, and `DOGEUSDT`.
- Bybit option prices come from the public V5 market ticker endpoint.
