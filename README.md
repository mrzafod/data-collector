# Binance Options Aggregator

This is a public module of a larger microservices trading intelligence platform. It collects and aggregates data from Binance Options markets to support quantitative trading strategies and decision-making.

## What It Does

- Fetches live and historical data from Binance Options.
- Runs aggregation pipelines (IV curves, volume spreads, strikes, etc.) using **GitHub Actions** on a schedule.
- Caches processed data in **GitHub Artifacts** for fast retrieval.
- Publishes data snapshots via HTTP for use in frontend dashboards or downstream services.
- Includes a dedicated frontend for data visualization built with **Observable notebooks** using [Plot](https://observablehq.com/@observablehq/plot) and **D3.js**.

## How It Works

- GitHub Actions automate the entire aggregation pipeline.
- Output is stored in GitHub Artifacts and published to a static `cdn` branch (e.g. via GitHub Pages).
- The frontend consumes this data and presents insights like IV surfaces, OI skews, strike distribution, etc.

## Frontend (Observable)

The frontend dashboard is powered by Observable notebooks:
- Written in Observable JavaScript.
- Uses `Plot` and `D3` to create interactive, dynamic visualizations.
- Connects directly to the latest aggregated data via CDN.

> Want to explore the live dashboards? Coming soon as a public Observable notebook!

## Use Cases

- Researching volatility behavior on Binance Options.
- Detecting market anomalies in implied volatility curves.
- Feeding aggregated features into your trading bots or ML models.

## Data Access

- Data is available via the GitHub Pages CDN (check `cdn/data` in this repo).
- For performance and cost reasons, only aggregated public data is published.
- Want deeper data or private aggregations? Reach out!

## Get in Touch

If you're interested in:
- Custom/private aggregations
- Collaborating on trading models
- Using this pipeline in your stack

Drop me a message on Telegram: [@mrzafod](https://t.me/mrzafod)

## License

MIT — free to use, modify, and build on. Attribution appreciated.

---

_This project is a small window into a broader system of real-time and historical analytics for algorithmic trading._ 💡
